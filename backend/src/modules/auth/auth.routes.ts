import { Hono } from 'hono';
import { changePasswordSchema, loginSchema } from '../../contracts/auth';
import { clearSessionCookie, readSessionToken, writeSessionCookie } from '../../http/cookies';
import { requireAuth } from '../../http/middleware/require-auth';
import type { AppEnv } from '../../http/types';
import { parseJson } from '../../http/validate';
import { changePassword, login } from './auth.service';
import { invalidateSession } from './session.service';

function clientIp(headers: (name: string) => string | undefined): string {
  const forwarded = headers('x-vercel-forwarded-for') ?? headers('x-forwarded-for') ?? headers('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || 'desconhecido';
}

export const authRoutes = new Hono<AppEnv>()
  .post('/login', async (c) => {
    const input = await parseJson(c, loginSchema);
    const result = await login(c.var.db, input, {
      ip: clientIp((n) => c.req.header(n)),
      userAgent: c.req.header('user-agent'),
    });
    writeSessionCookie(c, result.token, result.expiresAt);
    return c.json({ user: result.user });
  })
  .post('/logout', async (c) => {
    await invalidateSession(c.var.db, readSessionToken(c));
    clearSessionCookie(c);
    return c.json({ ok: true });
  })
  .get('/me', requireAuth, (c) => c.json({ user: c.var.user }))
  .post('/password', requireAuth, async (c) => {
    const input = await parseJson(c, changePasswordSchema);
    await changePassword(c.var.db, c.var.user.id, c.var.sessionId, input);
    return c.json({ ok: true });
  });
