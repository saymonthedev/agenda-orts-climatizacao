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

export async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'a página não deve ter rolagem horizontal').toBeLessThanOrEqual(0);
}

/** Abre o seletor de data do formulário e escolhe o dia. */
export async function pickDate(page: Page, date: string) {
  await page.getByRole('dialog').getByLabel('Data', { exact: true }).click();
  for (let i = 0; i < 3; i++) {
    const cell = page.locator(`[data-date="${date}"]`);
    if (await cell.count()) {
      await cell.click();
      return;
    }
    await page.getByRole('button', { name: 'Próximo mês' }).click();
  }
  throw new Error(`Data ${date} não encontrada no calendário`);
}
