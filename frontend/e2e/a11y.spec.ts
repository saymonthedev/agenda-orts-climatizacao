import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { login } from './helpers';

/** Falha em violações graves ou críticas (WCAG 2.1 A/AA). */
async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('iframe')
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const summary = serious.map((v) => `${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}`);
  expect(summary, `${label}\n${summary.join('\n')}`).toEqual([]);
}

test.describe('acessibilidade (axe)', () => {
  test('site institucional', async ({ page }) => {
    // sem animações de entrada: o axe mede o contraste do estado final, não do meio da transição
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((el) => ((el as HTMLElement).dataset.visible = 'true')));
    await audit(page, 'landing');
  });

  test('login e telas do painel', async ({ page }) => {
    await page.goto('/admin/login');
    await audit(page, 'login');
    await login(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await audit(page, 'painel');
    for (const path of [
      '/admin/agenda?view=week',
      '/admin/agenda?view=month',
      '/admin/agenda?view=day',
      '/admin/atendimentos',
      '/admin/financeiro',
      '/admin/configuracoes?aba=financeiro',
      '/admin/configuracoes?aba=avaliacoes',
    ]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await audit(page, path);
    }
    await page.getByRole('button', { name: /Novo agendamento/ }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await audit(page, 'formulário');
    await page.keyboard.press('Escape');
    await page.goto('/admin/financeiro');
    await page.getByRole('button', { name: 'Nova entrada' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Novo lançamento' })).toBeVisible();
    await audit(page, 'lançamento');
    await page.goto('/admin/configuracoes?aba=avaliacoes');
    await page.getByRole('button', { name: 'Nova avaliação' }).click();
    await expect(page.getByRole('dialog', { name: 'Nova avaliação' })).toBeVisible();
    await audit(page, 'nova avaliação');
  });
});
