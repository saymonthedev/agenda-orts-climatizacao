import { eq, lt } from 'drizzle-orm';
import type { SessionUser } from '../../contracts/auth';
import { getEnv, isProduction } from '../../config/env';
import type { Database } from '../../database/client';
import { sessions, users } from '../../database/schema';
import { randomToken, sha256 } from '../../lib/crypto';

/** Em produção usa o prefixo __Host- (exige Secure, Path=/ e nenhum Domain). */
export const sessionCookieName = () => (isProduction() ? '__Host-orts_session' : 'orts_session');

export const sessionTtlMs = () => getEnv().SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export async function createSession(db: Database, userId: string, userAgent?: string | null) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + sessionTtlMs());
  await db.insert(sessions).values({
    id: sha256(token),
    userId,
    expiresAt,
    userAgent: userAgent ? userAgent.slice(0, 300) : null,
  });
  return { token, expiresAt };
}

export type ValidatedSession = {
  user: SessionUser;
  sessionId: string;
  expiresAt: Date;
  renewed: boolean;
};

/** Valida o token do cookie. Renova a expiração quando passar da metade do prazo. */
export async function validateSession(db: Database, token: string | undefined | null): Promise<ValidatedSession | null> {
  if (!token || token.length < 32 || token.length > 128) return null;
  const id = sha256(token);
  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }

  let expiresAt = row.expiresAt;
  let renewed = false;
  if (row.expiresAt.getTime() - now < sessionTtlMs() / 2) {
    expiresAt = new Date(now + sessionTtlMs());
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    renewed = true;
  }

  return {
    user: { id: row.userId, name: row.name, email: row.email },
    sessionId: id,
    expiresAt,
    renewed,
  };
}

export async function invalidateSession(db: Database, token: string | undefined | null) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

export async function purgeExpiredSessions(db: Database) {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
