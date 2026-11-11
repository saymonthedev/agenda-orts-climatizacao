import { count } from 'drizzle-orm';
import { PASSWORD_MIN_LENGTH, usernameSchema } from '../../contracts/auth';
import type { Database } from '../../database/client';
import { users } from '../../database/schema';
import { hashPassword } from '../../lib/crypto';
import { logger } from '../../lib/logger';

/** "rafael.souza" -> "Rafael Souza" */
export function displayNameFromUsername(username: string): string {
  return username
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Configuração inicial segura: cria a conta administrativa a partir das variáveis
 * de ambiente ADMIN_USERNAME / ADMIN_PASSWORD (e ADMIN_NAME opcional) — somente
 * quando ainda não existe nenhum usuário. A senha nunca fica no repositório.
 */
export async function ensureBootstrapAdmin(db: Database, env: NodeJS.ProcessEnv = process.env): Promise<'created' | 'exists' | 'skipped'> {
  const rawUsername = env.ADMIN_USERNAME?.trim();
  const password = env.ADMIN_PASSWORD;
  if (!rawUsername || !password) return 'skipped';

  const parsed = usernameSchema.safeParse(rawUsername);
  if (!parsed.success) {
    logger.warn('ADMIN_USERNAME inválido; conta inicial não criada');
    return 'skipped';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    logger.warn(`ADMIN_PASSWORD precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres; conta inicial não criada`);
    return 'skipped';
  }

  const [row] = await db.select({ total: count() }).from(users);
  if (Number(row?.total ?? 0) > 0) return 'exists';

  const username = parsed.data;
  await db
    .insert(users)
    .values({
      name: env.ADMIN_NAME?.trim() || displayNameFromUsername(username),
      username,
      passwordHash: await hashPassword(password),
    })
    .onConflictDoNothing();
  logger.info('Conta administrativa inicial criada', { username });
  return 'created';
}
