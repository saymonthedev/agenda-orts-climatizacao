import { beforeAll, describe, expect, it } from 'vitest';
import { addDaysToDate, todayIn } from '../src/domain/time';
import { financeSummary } from '../src/modules/finance/finance.service';
import { futureWeekday, json, setupTestApp } from './helpers';

let t: Awaited<ReturnType<typeof setupTestApp>>;
let cookie: string;
type Category = { id: string; kind: 'income' | 'expense'; name: string; archived: boolean; entriesCount: number };
let categories: Category[];
const cat = (kind: 'income' | 'expense', name: string) => categories.find((c) => c.kind === kind && c.name === name)!;

const MONTH = '2026-03';
const TODAY = todayIn('America/Sao_Paulo');

const post = (path: string, body: unknown) => t.request(path, { method: 'POST', cookie, json: body });
const patch = (path: string, body: unknown) => t.request(path, { method: 'PATCH', cookie, json: body });
const del = (path: string) => t.request(path, { method: 'DELETE', cookie });
const get = (path: string) => t.request(path, { cookie });

beforeAll(async () => {
  t = await setupTestApp();
  cookie = (await t.login()).cookie;
  categories = (await json(await get('/finance/categories'))).categories;
});

describe('financeiro: acesso e categorias', () => {
  it('exige login', async () => {
    for (const path of ['/finance/summary', '/finance/entries', '/finance/categories', '/finance/export?from=2026-01-01&to=2026-01-31']) {
      expect((await t.request(path)).status).toBe(401);
    }
  });

  it('vem com as categorias padrão de entrada e saída', () => {
    expect(categories.filter((c) => c.kind === 'income').map((c) => c.name)).toEqual(['Serviços', 'Venda de peças e equipamentos', 'Outras entradas']);
    expect(categories.filter((c) => c.kind === 'expense')).toHaveLength(10);
    expect(cat('expense', 'Impostos e taxas (DAS)')).toBeTruthy();
  });

  it('cria categoria e recusa nome repetido no mesmo tipo', async () => {
    const res = await post('/finance/categories', { kind: 'expense', name: 'Aluguel' });
    expect(res.status).toBe(201);
    expect((await json(res)).category).toMatchObject({ kind: 'expense', name: 'Aluguel', entriesCount: 0 });
    expect((await post('/finance/categories', { kind: 'expense', name: 'aluguel' })).status).toBe(409);
    // mesmo nome em outro tipo é permitido
    expect((await post('/finance/categories', { kind: 'income', name: 'Aluguel' })).status).toBe(201);
  });
});

describe('financeiro: lançamentos', () => {
  it('valida valor, descrição e o tipo da categoria', async () => {
    const zero = await post('/finance/entries', { kind: 'expense', description: 'Gás', amountCents: 0, categoryId: cat('expense', 'Materiais e peças').id, date: `${MONTH}-05` });
    expect(zero.status).toBe(422);
    expect((await json(zero)).error.details.fields.amountCents).toBeTruthy();

    const wrongKind = await post('/finance/entries', { kind: 'income', description: 'Serviço', amountCents: 10000, categoryId: cat('expense', 'Materiais e peças').id, date: `${MONTH}-05` });
    expect(wrongKind.status).toBe(422);
    expect((await json(wrongKind)).error.details.fields.categoryId).toMatch(/entrada/);
  });

  it('registra entradas e saídas, filtra, edita e exclui', async () => {
    const material = await post('/finance/entries', {
      kind: 'expense',
      description: 'Tubo de cobre e isolamento',
      amountCents: 15_000,
      categoryId: cat('expense', 'Materiais e peças').id,
      date: `${MONTH}-04`,
      paymentMethod: 'pix',
    });
    expect(material.status).toBe(201);
    const entry = (await json(material)).entry;
    expect(entry).toMatchObject({ kind: 'expense', status: 'paid', amountCents: 15_000, overdue: false, category: { name: 'Materiais e peças' } });

    await post('/finance/entries', { kind: 'expense', description: 'Gasolina', amountCents: 8_000, categoryId: cat('expense', 'Combustível e deslocamento').id, date: `${MONTH}-10`, paymentMethod: 'debit_card' });
    await post('/finance/entries', { kind: 'income', description: 'Venda de controle remoto', amountCents: 12_000, categoryId: cat('income', 'Venda de peças e equipamentos').id, date: `${MONTH}-12`, paymentMethod: 'cash' });
    // pendente vencido (data passada) e pendente futuro
    await post('/finance/entries', { kind: 'income', description: 'Instalação a receber', amountCents: 50_000, categoryId: cat('income', 'Serviços').id, date: addDaysToDate(TODAY, -3), status: 'pending' });
    await post('/finance/entries', { kind: 'expense', description: 'DAS do mês', amountCents: 7_590, categoryId: cat('expense', 'Impostos e taxas (DAS)').id, date: addDaysToDate(TODAY, 5), status: 'pending' });

    const month = await json(await get(`/finance/entries?from=${MONTH}-01&to=${MONTH}-31`));
    expect(month.total).toBe(3);
    expect(month.totals).toMatchObject({ incomePaidCents: 12_000, expensePaidCents: 23_000 });
    expect(month.items[0].date >= month.items[1].date).toBe(true); // mais recentes primeiro

    const overdue = await json(await get('/finance/entries?status=overdue'));
    expect(overdue.items.map((i: { description: string }) => i.description)).toEqual(['Instalação a receber']);
    expect(overdue.items[0].overdue).toBe(true);

    const search = await json(await get('/finance/entries?q=cobre'));
    expect(search.total).toBe(1);

    const edited = await json(await patch(`/finance/entries/${entry.id}`, { description: 'Tubo de cobre 1/4', amountCents: 16_500 }));
    expect(edited.entry).toMatchObject({ description: 'Tubo de cobre 1/4', amountCents: 16_500, status: 'paid' });

    // trocar o tipo exige categoria do novo tipo
    expect((await patch(`/finance/entries/${entry.id}`, { kind: 'income' })).status).toBe(422);

    expect((await del(`/finance/entries/${entry.id}`)).status).toBe(200);
    expect((await get(`/finance/entries/${entry.id}`)).status).toBe(404);
    expect((await del(`/finance/entries/${entry.id}`)).status).toBe(404);
  });

  it('marca um pendente como recebido', async () => {
    const created = (await json(await post('/finance/entries', { kind: 'income', description: 'Higienização a receber', amountCents: 20_000, categoryId: cat('income', 'Serviços').id, date: addDaysToDate(TODAY, 2), status: 'pending' }))).entry;
    const paid = (await json(await patch(`/finance/entries/${created.id}`, { status: 'paid', date: TODAY, paymentMethod: 'pix' }))).entry;
    expect(paid).toMatchObject({ status: 'paid', date: TODAY, paymentMethod: 'pix', overdue: false });
  });
});

describe('financeiro: vínculo com atendimentos', () => {
  it('liga o pagamento ao atendimento e mantém o lançamento se o atendimento for excluído', async () => {
    const services = (await json(await get('/services'))).services as Array<{ id: string; name: string }>;
    const higienizacao = services.find((s) => s.name.startsWith('Higienização'))!;
    const appt = (
      await json(
        await post('/appointments', {
          clientName: 'Cliente Financeiro',
          clientPhone: '(47) 99999-0001',
          serviceTypeId: higienizacao.id,
          date: futureWeekday(3),
          startTime: '09:00',
          durationMinutes: 90,
          address: 'Rua A, 1',
          neighborhood: 'Centro',
        }),
      )
    ).appointment;

    const res = await post('/finance/entries', {
      kind: 'income',
      description: 'Higienização · Cliente Financeiro',
      amountCents: 25_000,
      categoryId: cat('income', 'Serviços').id,
      date: `${MONTH}-20`,
      paymentMethod: 'credit_card',
      appointmentId: appt.id,
    });
    expect(res.status).toBe(201);
    const entry = (await json(res)).entry;
    expect(entry.appointment).toMatchObject({ id: appt.id, clientName: 'Cliente Financeiro', serviceName: higienizacao.name, startTime: '09:00' });

    const linked = await json(await get(`/finance/entries?appointmentId=${appt.id}`));
    expect(linked.total).toBe(1);

    // resumo do mês: receita por serviço usa o nome do serviço; ticket médio pelos atendimentos
    const summary = (await json(await get(`/finance/summary?month=${MONTH}`))).summary;
    expect(summary.incomeByService[0]).toMatchObject({ name: higienizacao.name, amountCents: 25_000, count: 1 });
    expect(summary.averageTicketCents).toBe(25_000);
    expect(summary.paidAppointments).toBe(1);

    expect((await post('/finance/entries', { kind: 'income', description: 'x', amountCents: 100, categoryId: cat('income', 'Serviços').id, date: TODAY, appointmentId: '00000000-0000-4000-8000-000000000000' })).status).toBe(422);

    expect((await del(`/appointments/${appt.id}`)).status).toBe(200);
    const after = (await json(await get(`/finance/entries/${entry.id}`))).entry;
    expect(after.appointment).toBeNull();
    expect(after.amountCents).toBe(25_000);
  });
});

describe('financeiro: resumo, MEI e exportação', () => {
  it('soma o mês, compara com o anterior e monta as séries', async () => {
    await post('/finance/entries', { kind: 'income', description: 'Serviço de fevereiro', amountCents: 30_000, categoryId: cat('income', 'Serviços').id, date: '2026-02-15', paymentMethod: 'pix' });
    const s = (await json(await get(`/finance/summary?month=${MONTH}`))).summary;
    expect(s.month).toBe(MONTH);
    expect(s.income.paidCents).toBe(12_000 + 25_000);
    expect(s.expense.paidCents).toBe(8_000);
    expect(s.resultCents).toBe(37_000 - 8_000);
    expect(s.income.previousPaidCents).toBe(30_000);
    expect(s.income.overdueCount).toBe(1);
    expect(s.income.overdueCents).toBe(50_000);
    expect(s.expense.pendingCents).toBe(7_590);
    expect(s.months).toHaveLength(12);
    expect(s.months.at(-1)).toEqual({ month: MONTH, incomeCents: 37_000, expenseCents: 8_000 });
    expect(s.months.at(-2)).toEqual({ month: '2026-02', incomeCents: 30_000, expenseCents: 0 });
    expect(s.expensesByCategory).toEqual([{ categoryId: cat('expense', 'Combustível e deslocamento').id, name: 'Combustível e deslocamento', amountCents: 8_000 }]);
    expect(s.incomeByMethod.map((m: { method: string }) => m.method)).toEqual(['credit_card', 'cash']);
    expect(s.upcoming.map((u: { description: string }) => u.description)).toContain('DAS do mês');
    expect(s.mei).toBeNull();
  });

  it('acompanha o limite do MEI quando ligado nas configurações', async () => {
    const settings = (await json(await get('/settings'))).settings;
    expect(settings.meiAnnualLimitCents).toBeNull();
    const on = await t.request('/settings', { method: 'PUT', cookie, json: { ...settings, meiAnnualLimitCents: 8_100_000 } });
    expect(on.status).toBe(200);
    // salvar sem o campo não desliga o acompanhamento
    const { meiAnnualLimitCents: _omit, ...withoutField } = (await json(on)).settings;
    expect((await json(await t.request('/settings', { method: 'PUT', cookie, json: withoutField }))).settings.meiAnnualLimitCents).toBe(8_100_000);

    const s = (await json(await get(`/finance/summary?month=${MONTH}`))).summary;
    expect(s.mei).toMatchObject({ year: 2026, limitCents: 8_100_000 });
    expect(s.mei.incomeCents).toBeGreaterThanOrEqual(67_000);
    expect(s.mei.projectedCents).toBeGreaterThanOrEqual(s.mei.incomeCents);

    expect((await t.request('/settings', { method: 'PUT', cookie, json: { ...settings, meiAnnualLimitCents: 50 } })).status).toBe(422);
  });

  it('exporta CSV no padrão do Excel brasileiro', async () => {
    const res = await get(`/finance/export?from=${MONTH}-01&to=${MONTH}-31`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('financeiro-orts-2026-03-01-a-2026-03-31.csv');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM: o Excel reconhece os acentos
    const lines = new TextDecoder().decode(bytes).trim().split('\r\n');
    expect(lines[0]).toBe('Data;Tipo;Descrição;Categoria;Valor (R$);Situação;Forma de pagamento;Atendimento;Observações');
    expect(lines).toContain('10/03/2026;Saída;Gasolina;Combustível e deslocamento;-80,00;Pago;Cartão de débito;;');
    expect((await get(`/finance/export?from=${MONTH}-31&to=${MONTH}-01`)).status).toBe(422);
  });

  it('arquiva a categoria com lançamentos em vez de apagar', async () => {
    const fuel = cat('expense', 'Combustível e deslocamento');
    expect(await json(await del(`/finance/categories/${fuel.id}`))).toEqual({ deleted: false, archived: true });
    const res = await post('/finance/entries', { kind: 'expense', description: 'Gasolina', amountCents: 5_000, categoryId: fuel.id, date: TODAY });
    expect(res.status).toBe(422);
    expect((await json(res)).error.details.fields.categoryId).toMatch(/arquivada/);

    const empty = cat('expense', 'Divulgação');
    expect(await json(await del(`/finance/categories/${empty.id}`))).toEqual({ deleted: true, archived: false });
    const list = (await json(await get('/finance/categories'))).categories as Category[];
    expect(list.find((c) => c.id === empty.id)).toBeUndefined();
    expect(list.find((c) => c.id === fuel.id)).toMatchObject({ archived: true, entriesCount: 1 });
  });

  it('guarda o preço sugerido dos serviços', async () => {
    const services = (await json(await get('/services'))).services as Array<{ id: string; priceCents: number | null }>;
    expect(services[0]!.priceCents).toBeNull();
    const updated = (await json(await patch(`/services/${services[0]!.id}`, { priceCents: 35_000 }))).service;
    expect(updated.priceCents).toBe(35_000);
    expect((await patch(`/services/${services[0]!.id}`, { priceCents: -1 })).status).toBe(422);
  });

  it('no mês em andamento compara com o mesmo período do mês anterior', async () => {
    const parts = cat('expense', 'Materiais e peças').id;
    for (const [date, amountCents] of [['2025-05-04', 2_000], ['2025-05-28', 9_000], ['2025-06-03', 1_500]] as const) {
      expect((await post('/finance/entries', { kind: 'expense', description: `Peças ${date}`, amountCents, categoryId: parts, date, paymentMethod: 'pix' })).status).toBe(201);
    }
    // 10 de junho: maio entra só até o dia 10; o resultado de maio continua sendo o do mês inteiro
    const partial = await financeSummary(t.db, '2025-06', new Date('2025-06-10T15:00:00Z'));
    expect(partial.previousThroughDay).toBe(10);
    expect(partial.expense.paidCents).toBe(1_500);
    expect(partial.expense.previousPaidCents).toBe(2_000);
    expect(partial.previousResultCents).toBe(-11_000);
    // mês já fechado: compara com o mês anterior inteiro
    const closed = await financeSummary(t.db, '2025-06', new Date('2025-07-02T15:00:00Z'));
    expect(closed.previousThroughDay).toBeNull();
    expect(closed.expense.previousPaidCents).toBe(11_000);
    // 31 de março: fevereiro tem só 28 dias
    expect((await financeSummary(t.db, '2025-03', new Date('2025-03-31T15:00:00Z'))).previousThroughDay).toBe(28);
  });
});
