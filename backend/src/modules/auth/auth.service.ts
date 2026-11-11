import { eq, sql } from 'drizzle-orm';
import type { LoginInput, SessionUser } from '../../contracts/auth';
import type { Database } from '../../database/client';
import { users } from '../../database/schema';
import { UnauthorizedError } from '../../http/errors';
import { verifyAgainstDummy, verifyPassword } from '../../lib/crypto';
import { logger } from '../../lib/logger';
import { assertLoginAllowed, clearFailures, emailKey, ipKey, purgeOldAttempts, registerFailure } from './rate-limit';
import { createSession, purgeExpiredSessions } from './session.service';

const INVALID = 'E-mail ou senha incorretos.';

export async function login(
  db: Database,
  input: LoginInput,
  meta: { ip: string; userAgent?: string | null },
): Promise<{ user: SessionUser; token: string; expiresAt: Date }> {
  const keys = { ip: ipKey(meta.ip), email: emailKey(input.email) };
  await assertLoginAllowed(db, keys);

  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${input.email.toLowerCase()}`)
    .limit(1);

  if (!user) {
    await verifyAgainstDummy(input.password);
    await registerFailure(db, keys);
    logger.warn('Tentativa de login com e-mail inexistente');
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
    user: { id: user.id, name: user.name, email: user.email },
    token: session.token,
    expiresAt: session.expiresAt,
  };
}
