import { expect, type Page } from '@playwright/test';

export const ADMIN = { username: 'teste.e2e', password: 'SenhaDeTeste#2026' };

export async function login(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Usuário').fill(ADMIN.username);
  await page.getByLabel('Senha', { exact: true }).fill(ADMIN.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Próximo dia útil (seg–sex) a pelo menos `ahead` dias, no fuso de Jaraguá do Sul. */
export function futureWeekday(ahead = 7): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, d] = fmt.format(new Date()).split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + ahead, 12));
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Dia útil (seg–sex) mais recente a pelo menos `ago` dias atrás, no fuso de Jaraguá do Sul. */
export function pastWeekday(ago = 2): string {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, d] = fmt.format(new Date()).split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d - ago, 12));
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Nenhum elemento visível pode passar da tela nem invadir a margem interna do
 * contêiner da página (o overflow-x: clip do body esconderia a rolagem, mas o
 * conteúdo ficaria torto). Rolagens horizontais intencionais são ignoradas.
 */
export async function noHorizontalOverflow(page: Page) {
  const offenders = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const inScroller = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.position === 'fixed') return true;
      }
      return false;
    };
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'absolute' || cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
      if (el.closest('[aria-hidden="true"], .sr-only')) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      const box = el.closest('.container-page');
      let limit = vw;
      if (box && box !== el) limit = box.getBoundingClientRect().right - parseFloat(getComputedStyle(box).paddingRight);
      if ((r.right > limit + 0.5 || r.left < -0.5) && !inScroller(el)) {
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} [${Math.round(r.left)}–${Math.round(r.right)} / ${Math.round(limit)}]`);
        if (out.length > 4) break;
      }
    }
    return out;
  });
  expect(offenders, `elementos fora da área útil em ${page.viewportSize()?.width}px`).toEqual([]);
}

/** Abre o seletor de data do formulário e escolhe o dia. */
export async function pickDate(page: Page, date: string) {
  await page.getByRole('dialog').getByLabel('Data', { exact: true }).click();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  for (let i = 0; i < 3; i++) {
    const cell = page.locator(`[data-date="${date}"]`);
    if (await cell.count()) {
      await cell.click();
      return;
    }
    await page.getByRole('button', { name: date < today ? 'Mês anterior' : 'Próximo mês' }).click();
  }
  throw new Error(`Data ${date} não encontrada no calendário`);
}
