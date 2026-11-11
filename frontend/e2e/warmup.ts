/**
 * Aquece o servidor de desenvolvimento (compilação sob demanda) antes dos testes,
 * para que o tempo de compilação não conte nos limites de cada teste.
 */
export default async function warmup() {
  const base = 'http://localhost:3100';
  const pages = ['/', '/admin/login', '/admin', '/admin/agenda', '/admin/atendimentos', '/admin/configuracoes', '/robots.txt', '/sitemap.xml'];
  for (const path of pages) await fetch(base + path, { redirect: 'manual' }).catch(() => undefined);
  await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ username: 'aquecimento', password: 'x' }),
  }).catch(() => undefined);
}
