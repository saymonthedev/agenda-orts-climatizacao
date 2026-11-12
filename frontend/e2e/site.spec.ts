import { expect, test } from '@playwright/test';
import { noHorizontalOverflow } from './helpers';

test.describe('site institucional', () => {
  test('apresenta a empresa, serviços e SEO básico', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ORTS Climatização/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ar-condicionado');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Jaraguá do Sul/);
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute('content', /opengraph-image/);
    const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
    const nodes: { '@type': string; name?: string; alternateName?: string[] }[] = jsonLd['@graph'] ?? [jsonLd];
    expect(nodes.find((n) => n['@type'] === 'HVACBusiness')?.name).toBe('ORTS Climatização');
    // nome do site nos resultados do Google, com as variações usadas nas buscas
    expect(nodes.find((n) => n['@type'] === 'WebSite')?.alternateName).toContain('ORTS Climatização Jaraguá do Sul');
    await expect(page.getByText('Vila Nova, Jaraguá do Sul - SC').first()).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('mostra as avaliações do Google com atribuição e links', async ({ page }) => {
    await page.goto('/');
    const section = page.getByRole('region', { name: /Quem chamou, recomenda/ });
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('img', { name: 'Nota 5,0 de 5' })).toBeVisible();
    await expect(section.getByText('4 avaliações')).toBeVisible();
    await expect(section.getByText('Google Maps')).toBeVisible();
    await expect(section.getByRole('list', { name: 'Avaliações de clientes' }).getByRole('listitem')).toHaveCount(3);
    for (const name of ['Ver no Google', 'Avaliar a ORTS']) {
      const link = section.getByRole('link', { name });
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
    await noHorizontalOverflow(page);
  });

  test('layout sem estouro em larguras de 320 a 1440 px', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((el) => ((el as HTMLElement).dataset.visible = 'true')));
    for (const width of [320, 360, 375, 390, 412, 430, 450, 480, 540, 600, 768, 820, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await noHorizontalOverflow(page);
    }
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
    await page.getByRole('button', { name: /ampliar foto/i }).first().click();
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
