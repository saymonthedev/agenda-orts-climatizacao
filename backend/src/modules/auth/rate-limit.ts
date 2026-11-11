import { and, count, eq, gt, inArray, lt } from 'drizzle-orm';
import type { Database } from '../../database/client';
import { loginAttempts } from '../../database/schema';
import { RateLimitError } from '../../http/errors';
import { sha256 } from '../../lib/crypto';

const WINDOW_MINUTES = 15;
const LIMITS = { ip: 20, email: 8 } as const;

export const ipKey = (ip: string) => `ip:${sha256(ip)}`;
export const emailKey = (email: string) => `email:${sha256(email.toLowerCase())}`;

async function failuresFor(db: Database, key: string, since: Date) {
  const [row] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.key, key), gt(loginAttempts.attemptedAt, since)));
  return Number(row?.total ?? 0);
}

/** Bloqueia temporariamente após muitas tentativas com falha (por IP e por e-mail). */
export async function assertLoginAllowed(db: Database, keys: { ip: string; email: string }) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const [byIp, byEmail] = await Promise.all([failuresFor(db, keys.ip, since), failuresFor(db, keys.email, since)]);
  if (byIp >= LIMITS.ip || byEmail >= LIMITS.email) {
    throw new RateLimitError(
      `Muitas tentativas de acesso. Aguarde ${WINDOW_MINUTES} minutos e tente novamente.`,
      WINDOW_MINUTES * 60,
    );
  }
}

export async function registerFailure(db: Database, keys: { ip: string; email: string }) {
  await db.insert(loginAttempts).values([{ key: keys.ip }, { key: keys.email }]);
}

export async function clearFailures(db: Database, keys: { ip: string; email: string }) {
  await db.delete(loginAttempts).where(inArray(loginAttempts.key, [keys.email, keys.ip]));
}

export async function purgeOldAttempts(db: Database) {
  await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, new Date(Date.now() - 24 * 60 * 60_000)));
}
