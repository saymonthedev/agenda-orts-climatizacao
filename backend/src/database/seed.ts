/**
 * Dados de demonstração para desenvolvimento local (nunca em produção).
 *   npm run db:seed
 */
import '../config/load-env';
import { getEnv } from '../config/env';
import { addDaysToDate, todayIn } from '../domain/time';
import { createAppointment } from '../modules/appointments/appointments.service';
import { listServices } from '../modules/services/services.service';
import { getScheduleRules } from '../modules/settings/settings.service';
import { getDb } from './client';
import { eq } from 'drizzle-orm';
import { appointments, financeCategories, financeEntries, scheduleSettings, serviceTypes } from './schema';

async function main() {
  const env = getEnv();
  if (env.NODE_ENV === 'production' || (env.DATABASE_URL && !process.argv.includes('--force'))) {
    throw new Error('Seed de demonstração é apenas para o banco local. Use --force para um banco de testes.');
  }
  const db = await getDb();
  const rules = await getScheduleRules(db);
  const services = await listServices(db);
  const byName = (part: string) => services.find((s) => s.name.toLowerCase().includes(part))!;
  const today = todayIn(rules.timezone);

  await db.delete(financeEntries);
  await db.delete(appointments);

  const plan: Array<[number, string, string, string, string, string, string, 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'in_progress']> = [
    [-2, '08:30', 'Mariana Krause', '47991230001', 'instala', 'Rua Reinoldo Rau, 410', 'Centro', 'completed'],
    [-1, '14:00', 'Condomínio Vila Nova', '47991230002', 'preventiva', 'Rua Walter Marquardt, 1200', 'Vila Nova', 'completed'],
    [0, '08:00', 'Paulo Schmitt', '47991230003', 'higieniza', 'Rua João Planinscheck, 88', 'Nova Brasília', 'confirmed'],
    [0, '14:00', 'Ana Beatriz Lemke', '47991230004', 'corretiva', 'Rua Bernardo Dornbusch, 52', 'Baependi', 'pending'],
    [0, '16:30', 'Clínica Bem Viver', '47991230005', 'visita', 'Av. Mal. Deodoro da Fonseca, 900', 'Centro', 'confirmed'],
    [1, '09:00', 'Rafael Moretti', '47991230006', 'instala', 'Rua Ângelo Rubini, 300', 'Barra do Rio Cerro', 'confirmed'],
    [1, '15:00', 'Juliana Piske', '47991230007', 'higieniza', 'Rua José Theodoro Ribeiro, 1500', 'Ilha da Figueira', 'pending'],
    [2, '08:00', 'Escritório Contábil Rau', '47991230008', 'preventiva', 'Rua Expedicionário Gumercindo da Silva, 77', 'Rau', 'pending'],
    [3, '13:30', 'Thiago Weiss', '47991230009', 'corretiva', 'Rua Joinville, 2100', 'Vila Lalau', 'cancelled'],
    [4, '10:00', 'Fernanda Rosa', '47991230010', 'higieniza', 'Rua Max Wilhelm, 640', 'Baependi', 'confirmed'],
    [6, '08:30', 'Loja Tecidos Jaraguá', '47991230011', 'instala', 'Rua Presidente Epitácio Pessoa, 210', 'Centro', 'pending'],
  ];

  let created = 0;
  const seeded: { id: string; client: string; service: string; date: string; status: string }[] = [];
  for (const [offset, time, client, phone, service, address, neighborhood, status] of plan) {
    try {
      const appt = await createAppointment(db, {
        clientName: client,
        clientPhone: phone,
        serviceTypeId: byName(service).id,
        date: addDaysToDate(today, offset),
        startTime: time,
        durationMinutes: byName(service).durationMinutes,
        address,
        neighborhood,
        city: 'Jaraguá do Sul',
        notes: null,
        status,
        allowOutsideHours: true,
      });
      seeded.push({ id: appt.id, client, service: byName(service).name, date: addDaysToDate(today, offset), status });
      created++;
    } catch (err) {
      console.warn(`Ignorado (${client}): ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Seed concluído: ${created} atendimentos de demonstração.`);

  // ---------- financeiro de demonstração (dados fictícios) ----------
  const prices: Record<string, number> = { instala: 65_000, higieniza: 18_000, preventiva: 22_000, corretiva: 28_000, visita: 8_000 };
  for (const [part, price] of Object.entries(prices)) {
    await db.update(serviceTypes).set({ priceCents: price }).where(eq(serviceTypes.id, byName(part).id));
  }
  await db.update(scheduleSettings).set({ meiAnnualLimitCents: 8_100_000 }).where(eq(scheduleSettings.id, 1));

  const cats = await db.select().from(financeCategories);
  const cat = (kind: 'income' | 'expense', name: string) => cats.find((c) => c.kind === kind && c.name === name)!.id;
  const monthDay = (monthsAgo: number, day: number) => {
    const [y, m] = today.split('-').map(Number) as [number, number];
    const d = new Date(Date.UTC(y, m - 1 - monthsAgo, day));
    return d.toISOString().slice(0, 10);
  };
  const entries: (typeof financeEntries.$inferInsert)[] = [];
  const serviceMix: [string, string, number][] = [
    ['instala', 'Instalação', 65_000],
    ['higieniza', 'Higienização', 18_000],
    ['preventiva', 'Manutenção preventiva', 22_000],
    ['corretiva', 'Manutenção corretiva', 28_000],
  ];
  const methods = ['pix', 'pix', 'credit_card', 'cash', 'debit_card', 'pix'] as const;
  // meses anteriores: entradas por serviço e saídas típicas
  for (let ago = 7; ago >= 1; ago--) {
    const jobs = 6 + ((ago * 3) % 5);
    for (let i = 0; i < jobs; i++) {
      const [, label, amount] = serviceMix[(i + ago) % serviceMix.length]!;
      entries.push({ kind: 'income', description: `${label} · cliente ${i + 1}`, amountCents: amount + ((i * 1_500) % 4_000), categoryId: cat('income', 'Serviços'), date: monthDay(ago, 2 + i * 3), status: 'paid', paymentMethod: methods[(i + ago) % methods.length] });
    }
    if (ago % 2 === 0) entries.push({ kind: 'income', description: 'Venda de suporte e controle', amountCents: 9_000, categoryId: cat('income', 'Venda de peças e equipamentos'), date: monthDay(ago, 18), status: 'paid', paymentMethod: 'cash' });
    entries.push(
      { kind: 'expense', description: 'Tubos, isolamento e conexões', amountCents: 38_000 + ago * 2_500, categoryId: cat('expense', 'Materiais e peças'), date: monthDay(ago, 5), status: 'paid', paymentMethod: 'pix' },
      { kind: 'expense', description: 'Combustível', amountCents: 42_000 + (ago % 3) * 6_000, categoryId: cat('expense', 'Combustível e deslocamento'), date: monthDay(ago, 12), status: 'paid', paymentMethod: 'debit_card' },
      { kind: 'expense', description: 'DAS (MEI)', amountCents: 7_590, categoryId: cat('expense', 'Impostos e taxas (DAS)'), date: monthDay(ago, 20), status: 'paid', paymentMethod: 'pix' },
      { kind: 'expense', description: 'Plano de celular e internet', amountCents: 12_990, categoryId: cat('expense', 'Telefone e internet'), date: monthDay(ago, 10), status: 'paid', paymentMethod: 'credit_card' },
    );
    if (ago % 3 === 1) entries.push({ kind: 'expense', description: 'Troca de óleo e pneus', amountCents: 64_000, categoryId: cat('expense', 'Manutenção do veículo'), date: monthDay(ago, 22), status: 'paid', paymentMethod: 'credit_card' });
    if (ago === 4) entries.push({ kind: 'expense', description: 'Bomba de vácuo', amountCents: 89_000, categoryId: cat('expense', 'Ferramentas e equipamentos'), date: monthDay(ago, 9), status: 'paid', paymentMethod: 'credit_card' });
  }
  // mês atual: pagamentos dos atendimentos já feitos (os concluídos e os de hoje)
  for (const a of seeded.filter((x) => x.date <= today && x.status !== 'cancelled')) {
    const part = Object.keys(prices).find((k) => a.service.toLowerCase().includes(k))!;
    entries.push({ kind: 'income', description: `${a.service} · ${a.client}`, amountCents: prices[part]!, categoryId: cat('income', 'Serviços'), date: a.date, status: a.status === 'completed' ? 'paid' : 'pending', paymentMethod: 'pix', appointmentId: a.id });
  }
  entries.push(
    { kind: 'income', description: 'Instalação · Condomínio Vila Nova (2ª parcela)', amountCents: 45_000, categoryId: cat('income', 'Serviços'), date: addDaysToDate(today, -4), status: 'pending', paymentMethod: 'boleto' },
    { kind: 'expense', description: 'Gás refrigerante R-410A', amountCents: 54_000, categoryId: cat('expense', 'Materiais e peças'), date: addDaysToDate(today, -1), status: 'paid', paymentMethod: 'pix' },
    { kind: 'expense', description: 'Combustível', amountCents: 21_000, categoryId: cat('expense', 'Combustível e deslocamento'), date: addDaysToDate(today, -2), status: 'paid', paymentMethod: 'debit_card' },
    { kind: 'expense', description: 'DAS (MEI)', amountCents: 7_590, categoryId: cat('expense', 'Impostos e taxas (DAS)'), date: addDaysToDate(today, 6), status: 'pending', paymentMethod: null },
  );
  await db.insert(financeEntries).values(entries);
  console.log(`Seed do financeiro: ${entries.length} lançamentos de demonstração.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
