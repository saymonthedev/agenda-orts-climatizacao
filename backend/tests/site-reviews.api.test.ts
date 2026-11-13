import { beforeAll, describe, expect, it } from 'vitest';
import { listPublicReviews } from '../src/modules/reviews/reviews.service';
import { json, setupTestApp } from './helpers';

let t: Awaited<ReturnType<typeof setupTestApp>>;
let cookie: string;
let revalidations = 0;

beforeAll(async () => {
  t = await setupTestApp({ hooks: { onPublicProfileChanged: () => void revalidations++ } });
  cookie = (await t.login()).cookie;
});

const create = (body: Record<string, unknown>) => t.request('/site-reviews', { method: 'POST', cookie, json: body });

describe('avaliações do site', () => {
  it('cadastra, edita, oculta e exclui, regenerando o site a cada mudança', async () => {
    const res = await create({ author: 'Cliente Exemplo', rating: 5, text: 'Ótimo atendimento e serviço.', month: '2026-04' });
    expect(res.status).toBe(201);
    const { review } = await json(res);
    expect(review).toMatchObject({ author: 'Cliente Exemplo', rating: 5, month: '2026-04', visible: true });
    expect(revalidations).toBe(1);

    await create({ author: 'Outra Pessoa', rating: 4, text: 'Resolveu meu problema.', month: '2026-06' });
    const list = (await json(await t.request('/site-reviews', { cookie }))).reviews;
    expect(list.map((r: { author: string }) => r.author)).toEqual(['Outra Pessoa', 'Cliente Exemplo']); // mais recentes primeiro

    const upd = await t.request(`/site-reviews/${review.id}`, { method: 'PATCH', cookie, json: { visible: false, text: 'Atendimento e serviço de qualidade.' } });
    expect((await json(upd)).review).toMatchObject({ visible: false, text: 'Atendimento e serviço de qualidade.' });

    const del = await t.request(`/site-reviews/${review.id}`, { method: 'DELETE', cookie });
    expect(del.status).toBe(200);
    expect((await t.request(`/site-reviews/${review.id}`, { method: 'DELETE', cookie })).status).toBe(404);
    expect(revalidations).toBe(4);
  });

  it('valida os campos com mensagens em português', async () => {
    const res = await create({ author: 'A', rating: 6, text: '', month: '2026-13' });
    expect(res.status).toBe(422);
    expect((await json(res)).error.details.fields).toMatchObject({
      author: 'Informe o nome de quem avaliou.',
      rating: 'Escolha a nota.',
      text: 'Cole o comentário da avaliação.',
      month: 'Informe quando foi a avaliação.',
    });
  });

  it('o site recebe só as avaliações visíveis', async () => {
    const hidden = await json(await create({ author: 'Oculta', rating: 5, text: 'Não deve aparecer.', month: '2026-01' }));
    await t.request(`/site-reviews/${hidden.review.id}`, { method: 'PATCH', cookie, json: { visible: false } });
    const publicReviews = await listPublicReviews(t.db);
    expect(publicReviews.map((r) => r.author)).toContain('Outra Pessoa');
    expect(publicReviews.map((r) => r.author)).not.toContain('Oculta');
    expect(Object.keys(publicReviews[0]!).sort()).toEqual(['author', 'id', 'month', 'rating', 'text']);
  });
});
