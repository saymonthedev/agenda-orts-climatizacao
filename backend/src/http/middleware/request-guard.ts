import type { MiddlewareHandler } from 'hono';
import { getEnv } from '../../config/env';
import { AppError } from '../errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Proteção contra CSRF e requisições indevidas em métodos que alteram dados:
 * - Sec-Fetch-Site precisa indicar a mesma origem (quando enviado pelo navegador);
 * - Origin, quando presente, precisa ser a própria origem do site;
 * - corpo apenas em JSON (formulários de outros sites não conseguem enviar JSON sem CORS).
 */
export const requestGuard: MiddlewareHandler = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();

  const fetchSite = c.req.header('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    throw new AppError(403, 'FORBIDDEN_ORIGIN', 'Origem da requisição não permitida.');
  }

  const origin = c.req.header('origin');
  if (origin) {
    const allowed = new Set<string>([new URL(c.req.url).origin]);
    const configured = getEnv().APP_ORIGIN;
    if (configured) allowed.add(configured);
    const forwardedHost = c.req.header('x-forwarded-host');
    if (forwardedHost) {
      const proto = c.req.header('x-forwarded-proto') ?? 'https';
      allowed.add(`${proto}://${forwardedHost}`);
    }
    if (!allowed.has(origin)) {
      throw new AppError(403, 'FORBIDDEN_ORIGIN', 'Origem da requisição não permitida.');
    }
  }

  // Formulários HTML sempre enviam Content-Type (urlencoded, multipart ou text/plain).
  const contentType = (c.req.header('content-type') ?? '').toLowerCase();
  const length = Number(c.req.header('content-length') ?? '0');
  const hasBody = length > 0 || Boolean(c.req.header('transfer-encoding'));
  if ((contentType || hasBody) && !contentType.startsWith('application/json')) {
    throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envie os dados em JSON.');
  }

  return next();
};
