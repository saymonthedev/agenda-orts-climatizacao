import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIES = ['__Host-orts_session', 'orts_session'];

/**
 * Redireciona visitantes sem sessão para o login do painel.
 * É apenas uma camada de experiência: a proteção real está no backend,
 * que valida a sessão em toda requisição de dados.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));

  if (pathname === '/admin/login') {
    // Já conectado: segue para o painel (um cookie inválido é removido pelo backend no 401).
    if (!hasSession) return NextResponse.next();
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get('next');
    url.pathname = next && next.startsWith('/admin') && !next.startsWith('//') ? next.split('?')[0]! : '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (hasSession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = pathname === '/admin' ? '' : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
