import type { MiddlewareHandler } from 'hono';
import { UnauthorizedError } from '../errors';
import { clearSessionCookie, readSessionToken, writeSessionCookie } from '../cookies';
import type { AppEnv } from '../types';
import { validateSession } from '../../modules/auth/session.service';

/** Exige sessão válida. Toda rota administrativa passa por aqui no backend. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = readSessionToken(c);
  const session = await validateSession(c.var.db, token);
  if (!session) {
    if (token) clearSessionCookie(c);
    throw new UnauthorizedError();
  }
  if (session.renewed && token) writeSessionCookie(c, token, session.expiresAt);
  c.set('user', session.user);
  c.set('sessionId', session.sessionId);
  await next();
};
