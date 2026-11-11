import type { MiddlewareHandler } from 'hono';

/** Dados da agenda são privados: nunca devem ser armazenados em cache. */
export const noStore: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store, max-age=0');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'same-origin');
  c.header('X-Robots-Tag', 'noindex, nofollow');
};
