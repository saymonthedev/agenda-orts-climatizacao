import { beforeAll, describe, expect, it } from 'vitest';
import { ADMIN, json, setupTestApp } from './helpers';

let t: Awaited<ReturnType<typeof setupTestApp>>;
beforeAll(async () => {
  t = await setupTestApp();
});

describe('autenticação', () => {
  it('bloqueia rotas privadas sem sessão', async () => {
    for (const path of ['/appointments', '/dashboard', '/settings', '/services', '/availability?date=2030-01-07', '/auth/me']) {
      const res = await t.request(path);
      expect(res.status, path).toBe(401);
    }
  });

  it('não existe rota pública de cadastro', async () => {
    const res = await t.request('/auth/register', { method: 'POST', json: { email: 'x@y.com', password: '123' } });
    expect([401, 404]).toContain(res.status);
  });

  it('rejeita credenciais inválidas sem revelar se o e-mail existe', async () => {
    const wrongPass = await t.login(ADMIN.email, 'senha-errada', '10.0.0.50');
    const wrongEmail = await t.login('naoexiste@orts.test', 'qualquer', '10.0.0.51');
    expect(wrongPass.res.status).toBe(401);
    expect(wrongEmail.res.status).toBe(401);
    expect((await json(wrongPass.res)).error.message).toBe((await json(wrongEmail.res)).error.message);
    expect(wrongPass.cookie).toBe('');
  });

  it('valida o formato dos dados de login', async () => {
    const res = await t.request('/auth/login', { method: 'POST', json: { email: 'invalido', password: '' } });
    expect(res.status).toBe(422);
  });

  it('autentica, mantém sessão em cookie HttpOnly e encerra no logout', async () => {
    const { res, cookie } = await t.login();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect((await json(res)).user.email).toBe(ADMIN.email);

    const me = await t.request('/auth/me', { cookie });
    expect(me.status).toBe(200);

    const out = await t.request('/auth/logout', { method: 'POST', cookie });
    expect(out.status).toBe(200);
    const after = await t.request('/auth/me', { cookie });
    expect(after.status).toBe(401);
  });

  it('aceita e-mail com maiúsculas e espaços', async () => {
    const { res } = await t.login(`  ${ADMIN.email.toUpperCase()} `, ADMIN.password, '10.0.0.60');
    expect(res.status).toBe(200);
  });

  it('limita tentativas de força bruta', async () => {
    let last: Response | undefined;
    for (let i = 0; i < 9; i++) last = (await t.login(ADMIN.email, `errada-${i}`, `10.1.0.${i}`)).res;
    expect(last?.status).toBe(429);
    expect(last?.headers.get('retry-after')).toBeTruthy();
    // mesmo com a senha certa, o e-mail fica bloqueado temporariamente
    const blocked = await t.login(ADMIN.email, ADMIN.password, '10.1.0.99');
    expect(blocked.res.status).toBe(429);
  });

  it('recusa requisições de outra origem (CSRF)', async () => {
    const res = await t.request('/auth/login', {
      method: 'POST',
      json: { email: ADMIN.email, password: ADMIN.password },
      headers: { origin: 'https://site-malicioso.example' },
    });
    expect(res.status).toBe(403);
  });

  it('recusa corpo que não seja JSON em métodos de escrita', async () => {
    const res = await t.request('/auth/login', {
      method: 'POST',
      body: 'email=a&password=b',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status).toBe(415);
  });

  it('responde sem cache e com cabeçalhos de segurança', async () => {
    const res = await t.request('/health');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
