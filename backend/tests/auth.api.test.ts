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
    const res = await t.request('/auth/register', { method: 'POST', json: { username: 'invasor', password: '123456' } });
    expect([401, 404]).toContain(res.status);
  });

  it('rejeita credenciais inválidas sem revelar se o usuário existe', async () => {
    const wrongPass = await t.login(ADMIN.username, 'senha-errada', '10.0.0.50');
    const wrongUser = await t.login('nao.existe', 'qualquer', '10.0.0.51');
    expect(wrongPass.res.status).toBe(401);
    expect(wrongUser.res.status).toBe(401);
    expect((await json(wrongPass.res)).error.message).toBe((await json(wrongUser.res)).error.message);
    expect(wrongPass.cookie).toBe('');
  });

  it('valida o formato dos dados de login', async () => {
    const res = await t.request('/auth/login', { method: 'POST', json: { username: 'a', password: '' } });
    expect(res.status).toBe(422);
  });

  it('autentica, mantém sessão em cookie HttpOnly e encerra no logout', async () => {
    const { res, cookie } = await t.login();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect((await json(res)).user.username).toBe(ADMIN.username);

    const me = await t.request('/auth/me', { cookie });
    expect(me.status).toBe(200);

    const out = await t.request('/auth/logout', { method: 'POST', cookie });
    expect(out.status).toBe(200);
    const after = await t.request('/auth/me', { cookie });
    expect(after.status).toBe(401);
  });

  it('aceita usuário com maiúsculas e espaços', async () => {
    const { res } = await t.login(`  ${ADMIN.username.toUpperCase()} `, ADMIN.password, '10.0.0.60');
    expect(res.status).toBe(200);
  });

  it('troca a senha exigindo a senha atual e encerra as outras sessões', async () => {
    const a = await t.login(ADMIN.username, ADMIN.password, '10.2.0.1');
    const b = await t.login(ADMIN.username, ADMIN.password, '10.2.0.2');
    const wrong = await t.request('/auth/password', { method: 'POST', cookie: a.cookie, json: { currentPassword: 'x', newPassword: 'NovaSenha1' } });
    expect(wrong.status).toBe(422);
    const short = await t.request('/auth/password', { method: 'POST', cookie: a.cookie, json: { currentPassword: ADMIN.password, newPassword: '123' } });
    expect(short.status).toBe(422);
    const ok = await t.request('/auth/password', { method: 'POST', cookie: a.cookie, json: { currentPassword: ADMIN.password, newPassword: 'NovaSenha1' } });
    expect(ok.status).toBe(200);
    expect((await t.request('/auth/me', { cookie: a.cookie })).status).toBe(200);
    expect((await t.request('/auth/me', { cookie: b.cookie })).status).toBe(401);
    expect((await t.login(ADMIN.username, 'NovaSenha1', '10.2.0.3')).res.status).toBe(200);
    // restaura para os próximos testes
    await t.request('/auth/password', { method: 'POST', cookie: a.cookie, json: { currentPassword: 'NovaSenha1', newPassword: ADMIN.password } });
  });

  it('recusa requisições de outra origem (CSRF)', async () => {
    const res = await t.request('/auth/login', {
      method: 'POST',
      json: { username: ADMIN.username, password: ADMIN.password },
      headers: { origin: 'https://site-malicioso.example' },
    });
    expect(res.status).toBe(403);
  });

  it('recusa corpo que não seja JSON em métodos de escrita', async () => {
    const res = await t.request('/auth/login', {
      method: 'POST',
      body: 'username=a&password=b',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.status).toBe(415);
  });

  it('responde sem cache e com cabeçalhos de segurança', async () => {
    const res = await t.request('/health');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
  it('limita tentativas de força bruta', async () => {
    let last: Response | undefined;
    for (let i = 0; i < 9; i++) last = (await t.login(ADMIN.username, `errada-${i}`, `10.1.0.${i}`)).res;
    expect(last?.status).toBe(429);
    expect(last?.headers.get('retry-after')).toBeTruthy();
    // mesmo com a senha certa, o usuário fica bloqueado temporariamente
    const blocked = await t.login(ADMIN.username, ADMIN.password, '10.1.0.99');
    expect(blocked.res.status).toBe(429);
  });
});
