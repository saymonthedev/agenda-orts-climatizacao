import { expect, test } from '@playwright/test';
import { ADMIN, futureWeekday, login, noHorizontalOverflow, pickDate } from './helpers';

test.describe.configure({ mode: 'serial' });

test.describe('painel administrativo', () => {
  test('recusa credenciais inválidas', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Usuário').fill(ADMIN.username);
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Usuário ou senha incorretos' })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('fluxo completo de um atendimento', async ({ page }, info) => {
    const date = futureWeekday(info.project.name === 'celular' ? 9 : 7);
    const client = `Cliente ${info.project.name}`;
    await login(page);
    await noHorizontalOverflow(page);

    // criar
    await page.getByRole('button', { name: 'Novo agendamento' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome do cliente').fill(client);
    await dialog.getByLabel('Telefone / WhatsApp').fill('47999887766');
    await expect(dialog.getByLabel('Telefone / WhatsApp')).toHaveValue('(47) 99988-7766');
    await dialog.getByLabel('Tipo de serviço').click();
    await page.getByRole('option', { name: /Higienização/ }).click();
    await pickDate(page, date);
    await dialog.getByRole('button', { name: /^09:00, livre/ }).click();
    await dialog.getByLabel('Endereço').fill('Rua Reinoldo Rau, 100');
    await dialog.getByLabel('Bairro').fill('Centro');
    await page.getByRole('button', { name: 'Agendar atendimento' }).click();
    await expect(page.getByText('Atendimento agendado.')).toBeVisible();

    // detalhes abrem após salvar; confirmar status
    const details = page.getByRole('dialog');
    await expect(details).toContainText(client);
    await details.getByRole('radio', { name: 'Confirmado' }).click();
    await expect(page.getByText('Status alterado para "Confirmado".')).toBeVisible();
    await expect(details.getByRole('radio', { name: 'Confirmado' })).toHaveAttribute('aria-checked', 'true');

    // editar observações
    await details.getByRole('button', { name: 'Editar' }).click();
    const edit = page.getByRole('dialog');
    await edit.getByLabel(/Observações/).fill('Levar escada de 3 metros');
    // edição salva sozinha
    await expect(edit.getByRole('status').filter({ hasText: 'Alterações salvas' })).toBeVisible();
    await edit.getByRole('button', { name: 'Concluir' }).click();
    // volta para os detalhes (a janela de edição ainda pode estar animando a saída)
    await expect(page.getByRole('dialog', { name: client })).toContainText('Levar escada de 3 metros');
    await page.keyboard.press('Escape');

    // conflito: mesmo horário
    await page.getByRole('button', { name: 'Novo agendamento' }).first().click();
    const second = page.getByRole('dialog');
    await second.getByLabel('Nome do cliente').fill('Outro cliente');
    await second.getByLabel('Telefone / WhatsApp').fill('47911112222');
    await second.getByLabel('Tipo de serviço').click();
    await page.getByRole('option', { name: /Higienização/ }).click();
    await pickDate(page, date);
    // o horário ocupado aparece bloqueado na grade
    await expect(second.getByRole('button', { name: /^09:00, ocupado/ })).toBeDisabled();
    await second.getByRole('button', { name: /Outro horário/ }).click();
    await second.getByLabel('Outro horário (HH:MM)').fill('0930');
    await second.getByLabel('Endereço').fill('Rua B, 20');
    await second.getByLabel('Bairro').fill('Vila Nova');
    await page.getByRole('button', { name: 'Agendar atendimento' }).click();
    await expect(second.getByRole('alert').filter({ hasText: 'Conflito' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // agenda (dia) mostra o atendimento
    await page.goto(`/admin/agenda?view=day&date=${date}`);
    await expect(page.getByRole('button', { name: new RegExp(`09:00 às 10:30, ${client}`) })).toBeVisible();
    await noHorizontalOverflow(page);
    for (const view of ['week', 'month']) {
      await page.goto(`/admin/agenda?view=${view}&date=${date}`);
      await expect(page.getByText(client).first()).toBeVisible();
      await noHorizontalOverflow(page);
    }

    // busca e filtro
    await page.goto('/admin/atendimentos');
    await page.getByLabel('Pesquisar atendimentos').fill(client);
    await expect(page.getByText(client).first()).toBeVisible();
    await page.getByRole('button', { name: 'Cancelado', exact: true }).click();
    await expect(page.getByText('Nenhum atendimento encontrado')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelado', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmado', exact: true }).click();
    await page.getByText(client).first().click();

    // excluir com confirmação personalizada
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText('Excluir este atendimento?');
    await confirm.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText('Atendimento excluído.')).toBeVisible();
  });

  test('configurações alteram as regras da agenda', async ({ page }) => {
    await login(page);
    await page.goto('/admin/configuracoes');
    await page.getByRole('tab', { name: 'Regras' }).click();
    const trigger = page.getByLabel('Intervalo entre atendimentos');
    const target = (await trigger.textContent())?.includes('15 min') ? '45 min' : '15 min';
    await trigger.click();
    await page.getByRole('option', { name: target }).click();
    // salvamento automático, sem botão de salvar
    await expect(page.getByRole('status').filter({ hasText: 'Alterações salvas' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toHaveCount(0);
    await page.reload();
    await page.getByRole('tab', { name: 'Regras' }).click();
    await expect(page.getByLabel('Intervalo entre atendimentos')).toContainText(target);
    await noHorizontalOverflow(page);
  });

  test('remover pausa pede confirmação e salva sozinho', async ({ page }) => {
    await login(page);
    await page.goto('/admin/configuracoes');
    const pauses = page.getByLabel('Nome da pausa');
    await expect(pauses.first()).toBeVisible(); // espera os ajustes carregarem antes de contar
    const before = await pauses.count();
    await page.getByRole('button', { name: 'Adicionar pausa' }).click();
    await expect(pauses).toHaveCount(before + 1);
    await expect(page.getByRole('status').filter({ hasText: 'Alterações salvas' })).toBeVisible();
    await noHorizontalOverflow(page);

    // cancelar mantém a pausa
    await page.getByRole('button', { name: /Remover pausa/ }).last().click();
    const ask = page.getByRole('alertdialog');
    await expect(ask).toContainText('Remover a pausa');
    await ask.getByRole('button', { name: 'Cancelar' }).click();
    await expect(pauses).toHaveCount(before + 1);

    // confirmar remove e salva
    await page.getByRole('button', { name: /Remover pausa/ }).last().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click();
    await expect(pauses).toHaveCount(before);
    await expect(page.getByRole('status').filter({ hasText: 'Alterações salvas' })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Nome da pausa')).toHaveCount(before);
  });

  test('financeiro: lançar, editar com salvamento automático e excluir com confirmação', async ({ page }, info) => {
    const desc = `Peças ${info.project.name}`;
    await login(page);
    // navegação principal: barra inferior no celular, lateral no computador
    await page.getByRole('link', { name: 'Financeiro', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeVisible();
    await noHorizontalOverflow(page);

    // nova saída (valor digitado da direita para a esquerda)
    await page.getByRole('button', { name: 'Nova saída' }).click();
    const create = page.getByRole('dialog', { name: 'Novo lançamento' });
    await create.getByLabel('Valor').fill('12345');
    await expect(create.getByLabel('Valor')).toHaveValue('123,45');
    await create.getByLabel('Descrição').fill(desc);
    await create.getByRole('button', { name: 'Adicionar' }).click();
    await expect(page.getByText('Saída registrada.')).toBeVisible();
    const row = page.getByRole('button', { name: new RegExp(`^${desc}`) });
    await expect(row).toContainText('R$ 123,45');
    await expect(page.getByText('Saídas do mês').locator('..')).toContainText('R$ 123,45');

    // edição salva sozinha
    await row.click();
    const edit = page.getByRole('dialog', { name: 'Editar lançamento' });
    await edit.getByLabel('Descrição').fill(`${desc} trocadas`);
    await expect(edit.getByRole('status').filter({ hasText: 'Alterações salvas' })).toBeVisible();
    await edit.getByRole('button', { name: 'Concluir' }).click();
    const renamed = page.getByRole('button', { name: new RegExp(`^${desc} trocadas`) });
    await expect(renamed).toBeVisible();
    await noHorizontalOverflow(page);

    // excluir: cancelar mantém, confirmar remove
    await renamed.click();
    await page.getByRole('dialog', { name: 'Editar lançamento' }).getByRole('button', { name: 'Excluir lançamento' }).click();
    const ask = page.getByRole('alertdialog');
    await expect(ask).toContainText('Excluir este lançamento?');
    await ask.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog', { name: 'Editar lançamento' })).toBeVisible();
    await page.getByRole('dialog', { name: 'Editar lançamento' }).getByRole('button', { name: 'Excluir lançamento' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByText('Lançamento excluído.')).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(`^${desc}`) })).toHaveCount(0);
  });

  test('ajustes do financeiro: limite do MEI e categorias', async ({ page }, info) => {
    await login(page);
    await page.goto('/admin/configuracoes?aba=financeiro');
    const mei = page.getByRole('switch', { name: /Acompanhar o limite anual do MEI/ });
    await expect(mei).toBeVisible();
    const wasOn = (await mei.getAttribute('aria-checked')) === 'true';
    await mei.click();
    await expect(page.getByRole('status').filter({ hasText: 'Alterações salvas' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('switch', { name: /Acompanhar o limite anual do MEI/ })).toHaveAttribute('aria-checked', wasOn ? 'false' : 'true');

    // nova categoria; excluir pede confirmação
    const name = `Aluguel ${info.project.name}`;
    await page.getByLabel('Nova categoria de saída').fill(name);
    await page.getByLabel('Nova categoria de saída').press('Enter');
    await expect(page.getByLabel(`Nome da categoria ${name}`)).toHaveValue(name);
    await noHorizontalOverflow(page);
    await page.getByRole('button', { name: `Excluir categoria ${name}` }).click();
    const ask = page.getByRole('alertdialog');
    await expect(ask).toContainText(`Excluir a categoria “${name}”?`);
    await ask.getByRole('button', { name: 'Excluir' }).click();
    await expect(page.getByLabel(`Nome da categoria ${name}`)).toHaveCount(0);
  });

  test('logout encerra a sessão', async ({ page }) => {
    await login(page);
    await page.goto('/admin');
    const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024;
    if (isDesktop) await page.getByRole('button', { name: 'Sair do painel' }).click();
    else {
      await page.getByRole('button', { name: 'Menu da conta' }).click();
      await page.getByRole('menuitem', { name: 'Sair' }).click();
    }
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
