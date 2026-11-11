import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIES = ['__Host-orts_session', 'orts_session'];

/**
 * Redireciona visitantes sem sessão para o login do painel.
 * É apenas uma camada de experiência: a proteção real está no backend,
 * que valida a sessão em toda requisição de dados.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();

  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = pathname === '/admin' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
