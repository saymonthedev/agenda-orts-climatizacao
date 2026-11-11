import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { isProduction } from '../config/env';
import { sessionCookieName } from '../modules/auth/session.service';

export function readSessionToken(c: Context) {
  return getCookie(c, sessionCookieName());
}

export function writeSessionCookie(c: Context, token: string, expiresAt: Date) {
  setCookie(c, sessionCookieName(), token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'Lax',
    path: '/',
    expires: expiresAt,
    maxAge: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, sessionCookieName(), { path: '/', secure: isProduction() });
}
