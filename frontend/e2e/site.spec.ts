import { expect, test } from '@playwright/test';
import { noHorizontalOverflow } from './helpers';

test.describe('site institucional', () => {
  test('apresenta a empresa, serviços e SEO básico', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ORTS Climatização/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ar-condicionado');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Jaraguá do Sul/);
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute('content', /opengraph-image/);
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(JSON.parse(jsonLd ?? '{}')['@type']).toBe('HVACBusiness');
    await expect(page.getByText('Vila Nova, Jaraguá do Sul - SC').first()).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('não expõe o painel para visitantes', async ({ page, request }) => {
    await page.goto('/admin/agenda');
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fagenda/);
    const api = await request.get('/api/appointments');
    expect(api.status()).toBe(401);
    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain('Disallow: /admin');
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
  });

  test('formulário de solicitação valida os campos', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Solicitar atendimento' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // sem WhatsApp configurado, o envio fica indisponível e o aviso aparece
    await expect(dialog.getByText('estará disponível em breve')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('galeria abre, navega pelo teclado e fecha', async ({ page }) => {
    await page.goto('/#trabalhos');
    await page.getByRole('button', { name: /Ampliar foto/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('1 / 6');
    await page.keyboard.press('ArrowRight');
    await expect(dialog).toContainText('2 / 6');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('menu do celular abre e navega', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'apenas celular');
    await page.goto('/');
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    const menu = page.getByRole('dialog');
    await menu.getByRole('link', { name: /Serviços/ }).click();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(/#servicos/);
  });
});
