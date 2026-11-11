import { eq, sql } from 'drizzle-orm';
import type { ChangePasswordInput, LoginInput, SessionUser } from '../../contracts/auth';
import type { Database } from '../../database/client';
import { users } from '../../database/schema';
import { UnauthorizedError, ValidationError } from '../../http/errors';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../lib/crypto';
import { logger } from '../../lib/logger';
import { assertLoginAllowed, clearFailures, ipKey, purgeOldAttempts, registerFailure, userKey } from './rate-limit';
import { createSession, invalidateOtherSessions, purgeExpiredSessions } from './session.service';

const INVALID = 'Usuário ou senha incorretos.';

export async function findUserByUsername(db: Database, username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = ${username.toLowerCase()}`)
    .limit(1);
  return user ?? null;
}

export async function login(
  db: Database,
  input: LoginInput,
  meta: { ip: string; userAgent?: string | null },
): Promise<{ user: SessionUser; token: string; expiresAt: Date }> {
  const keys = { ip: ipKey(meta.ip), user: userKey(input.username) };
  await assertLoginAllowed(db, keys);

  const user = await findUserByUsername(db, input.username);
  if (!user) {
    await verifyAgainstDummy(input.password);
    await registerFailure(db, keys);
    logger.warn('Tentativa de login com usuário inexistente');
    throw new UnauthorizedError(INVALID);
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    await registerFailure(db, keys);
    logger.warn('Tentativa de login com senha incorreta', { userId: user.id });
    throw new UnauthorizedError(INVALID);
  }

  await clearFailures(db, keys);
  const session = await createSession(db, user.id, meta.userAgent);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  // limpeza oportunista
  await Promise.all([purgeExpiredSessions(db), purgeOldAttempts(db)]).catch((err) =>
    logger.warn('Falha na limpeza de sessões/tentativas', { err }),
  );

  return {
    user: { id: user.id, name: user.name, username: user.username },
    token: session.token,
    expiresAt: session.expiresAt,
  };
}

/** Troca a senha do usuário logado e encerra as outras sessões abertas. */
export async function changePassword(db: Database, userId: string, sessionId: string, input: ChangePasswordInput) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new UnauthorizedError();
  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) throw new ValidationError('A senha atual está incorreta.', { currentPassword: 'A senha atual está incorreta.' });
  const passwordHash = await hashPassword(input.newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  await invalidateOtherSessions(db, userId, sessionId);
}
