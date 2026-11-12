import { chromium } from '@playwright/test';

/**
 * Aquece o servidor de desenvolvimento (compilação sob demanda) antes dos testes,
 * para que o tempo de compilação não conte nos limites de cada teste.
 */
export default async function warmup() {
  const base = 'http://localhost:3100';
  const pages = ['/', '/admin/login', '/admin', '/admin/agenda', '/admin/atendimentos', '/admin/financeiro', '/admin/configuracoes', '/robots.txt', '/sitemap.xml'];
  for (const path of pages) await fetch(base + path, { redirect: 'manual' }).catch(() => undefined);
  await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ username: 'aquecimento', password: 'x' }),
  }).catch(() => undefined);

  // Logo depois de uma mudança no código, o Turbopack ainda termina de compilar os pacotes
  // do navegador e recarrega a página algumas vezes ("HMR hash mismatch"). Abre as páginas
  // num navegador de verdade e espera esses recarregamentos pararem antes dos testes.
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const path of ['/', '/admin/login']) await settle(page, base + path);
  } finally {
    await browser.close();
  }
}

async function settle(page: import('@playwright/test').Page, url: string, quietMs = 3_000, maxMs = 90_000) {
  let lastLoad = Date.now();
  const onLoad = () => (lastLoad = Date.now());
  page.on('load', onLoad);
  try {
    await page.goto(url, { waitUntil: 'load' }).catch(() => undefined);
    const start = Date.now();
    while (Date.now() - lastLoad < quietMs && Date.now() - start < maxMs) await page.waitForTimeout(250);
  } finally {
    page.off('load', onLoad);
  }
}
