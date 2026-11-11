import { describe, expect, it } from 'vitest';
import { createPgliteDb, migratePglite } from '../src/database/client';
import { users } from '../src/database/schema';
import { verifyPassword } from '../src/lib/crypto';
import { displayNameFromUsername, ensureBootstrapAdmin } from '../src/modules/auth/bootstrap';

describe('conta administrativa inicial', () => {
  it('cria a conta a partir das variáveis de ambiente apenas se não houver usuários', async () => {
    const db = await createPgliteDb();
    await migratePglite(db);
    const env = { ADMIN_USERNAME: 'Rafael.Souza', ADMIN_PASSWORD: 'Segredo@1' } as NodeJS.ProcessEnv;

    expect(await ensureBootstrapAdmin(db, {} as NodeJS.ProcessEnv)).toBe('skipped');
    expect(await ensureBootstrapAdmin(db, env)).toBe('created');
    expect(await ensureBootstrapAdmin(db, { ...env, ADMIN_PASSWORD: 'OutraSenha9' })).toBe('exists');

    const all = await db.select().from(users);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ username: 'rafael.souza', name: 'Rafael Souza' });
    expect(await verifyPassword('Segredo@1', all[0]!.passwordHash)).toBe(true);
    expect(all[0]!.passwordHash).not.toContain('Segredo');
  });

  it('ignora valores inválidos', async () => {
    const db = await createPgliteDb();
    await migratePglite(db);
    expect(await ensureBootstrapAdmin(db, { ADMIN_USERNAME: 'x y', ADMIN_PASSWORD: 'Segredo@1' } as NodeJS.ProcessEnv)).toBe('skipped');
    expect(await ensureBootstrapAdmin(db, { ADMIN_USERNAME: 'ok.user', ADMIN_PASSWORD: '123' } as NodeJS.ProcessEnv)).toBe('skipped');
  });

  it('gera nome de exibição a partir do usuário', () => {
    expect(displayNameFromUsername('rafael.souza')).toBe('Rafael Souza');
  });
});
