import { and, asc, desc, eq, gte, ilike, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import type { z } from 'zod';
import {
  FINANCE_KIND_LABELS,
  FINANCE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type FinanceCategoryDTO,
  type FinanceEntryDTO,
  type FinanceKind,
  type FinanceListDTO,
  type FinanceSummaryDTO,
  type PaymentMethod,
  type financeCategoryInputSchema,
  type financeCategoryUpdateSchema,
  type financeEntryInputSchema,
  type financeEntryUpdateSchema,
  type financeListQuerySchema,
} from '../../contracts/finance';
import type { Database } from '../../database/client';
import { appointments, financeCategories, financeEntries, serviceTypes } from '../../database/schema';
import { addDaysToDate, BUSINESS_TIMEZONE, endOfMonth, todayIn, zonedParts } from '../../domain/time';
import { NotFoundError, ValidationError } from '../../http/errors';
import { getSettingsRow } from '../settings/settings.service';

type EntryInput = z.output<typeof financeEntryInputSchema>;
type EntryUpdate = z.output<typeof financeEntryUpdateSchema>;
type ListQuery = z.output<typeof financeListQuerySchema>;

const money = (column: SQL | typeof financeEntries.amountCents) => sql<number>`coalesce(sum(${column}), 0)::float8`;

/** Desloca um mês (AAAA-MM) por n meses. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ---------- categorias ----------

export async function listCategories(db: Database): Promise<FinanceCategoryDTO[]> {
  const rows = await db
    .select({
      id: financeCategories.id,
      kind: financeCategories.kind,
      name: financeCategories.name,
      archived: financeCategories.archived,
      sortOrder: financeCategories.sortOrder,
      entriesCount: sql<number>`count(${financeEntries.id})::int`,
    })
    .from(financeCategories)
    .leftJoin(financeEntries, eq(financeEntries.categoryId, financeCategories.id))
    .groupBy(financeCategories.id)
    .orderBy(asc(financeCategories.kind), asc(financeCategories.sortOrder), asc(financeCategories.name));
  return rows.map((r) => ({ ...r, entriesCount: Number(r.entriesCount) }));
}

async function getCategory(db: Database, id: string) {
  const [row] = await db.select().from(financeCategories).where(eq(financeCategories.id, id)).limit(1);
  return row ?? null;
}

export async function createCategory(db: Database, input: z.output<typeof financeCategoryInputSchema>): Promise<FinanceCategoryDTO> {
  const [last] = await db
    .select({ max: sql<number>`coalesce(max(${financeCategories.sortOrder}), -1)::int` })
    .from(financeCategories)
    .where(eq(financeCategories.kind, input.kind));
  const [row] = await db
    .insert(financeCategories)
    .values({ kind: input.kind, name: input.name, sortOrder: Number(last?.max ?? -1) + 1 })
    .returning();
  if (!row) throw new Error('Falha ao criar a categoria.');
  return { id: row.id, kind: row.kind, name: row.name, archived: row.archived, sortOrder: row.sortOrder, entriesCount: 0 };
}

export async function updateCategory(db: Database, id: string, input: z.output<typeof financeCategoryUpdateSchema>): Promise<FinanceCategoryDTO> {
  const [row] = await db
    .update(financeCategories)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(financeCategories.id, id))
    .returning();
  if (!row) throw new NotFoundError('Categoria não encontrada.');
  const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(financeEntries).where(eq(financeEntries.categoryId, id));
  return { id: row.id, kind: row.kind, name: row.name, archived: row.archived, sortOrder: row.sortOrder, entriesCount: Number(count?.n ?? 0) };
}

/** Exclui a categoria; se ela já tiver lançamentos, arquiva (some das opções, o histórico fica). */
export async function deleteCategory(db: Database, id: string): Promise<{ deleted: boolean; archived: boolean }> {
  const category = await getCategory(db, id);
  if (!category) throw new NotFoundError('Categoria não encontrada.');
  const [count] = await db.select({ n: sql<number>`count(*)::int` }).from(financeEntries).where(eq(financeEntries.categoryId, id));
  if (Number(count?.n ?? 0) > 0) {
    await db.update(financeCategories).set({ archived: true, updatedAt: new Date() }).where(eq(financeCategories.id, id));
    return { deleted: false, archived: true };
  }
  await db.delete(financeCategories).where(eq(financeCategories.id, id));
  return { deleted: true, archived: false };
}

// ---------- lançamentos ----------

const entrySelection = {
  entry: financeEntries,
  categoryName: financeCategories.name,
  appointmentClient: appointments.clientName,
  appointmentStartsAt: appointments.startsAt,
  serviceName: serviceTypes.name,
};

type EntryJoinRow = {
  entry: typeof financeEntries.$inferSelect;
  categoryName: string | null;
  appointmentClient: string | null;
  appointmentStartsAt: Date | null;
  serviceName: string | null;
};

function toEntryDTO(r: EntryJoinRow, today: string): FinanceEntryDTO {
  const e = r.entry;
  const starts = r.appointmentStartsAt ? zonedParts(r.appointmentStartsAt, BUSINESS_TIMEZONE) : null;
  return {
    id: e.id,
    kind: e.kind,
    description: e.description,
    amountCents: e.amountCents,
    category: { id: e.categoryId, name: r.categoryName ?? '' },
    date: e.date,
    status: e.status,
    overdue: e.status === 'pending' && e.date < today,
    paymentMethod: e.paymentMethod,
    appointment:
      e.appointmentId && starts
        ? { id: e.appointmentId, clientName: r.appointmentClient ?? '', date: starts.date, startTime: starts.time, serviceName: r.serviceName ?? '' }
        : null,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
  };
}

function baseEntryQuery(db: Database) {
  return db
    .select(entrySelection)
    .from(financeEntries)
    .innerJoin(financeCategories, eq(financeCategories.id, financeEntries.categoryId))
    .leftJoin(appointments, eq(appointments.id, financeEntries.appointmentId))
    .leftJoin(serviceTypes, eq(serviceTypes.id, appointments.serviceTypeId));
}

export async function getEntry(db: Database, id: string, now = new Date()): Promise<FinanceEntryDTO> {
  const [row] = await baseEntryQuery(db).where(eq(financeEntries.id, id)).limit(1);
  if (!row) throw new NotFoundError('Lançamento não encontrado.');
  return toEntryDTO(row, todayIn(BUSINESS_TIMEZONE, now));
}

function listConditions(q: ListQuery, today: string): SQL[] {
  const where: SQL[] = [];
  if (q.from) where.push(gte(financeEntries.date, q.from));
  if (q.to) where.push(lte(financeEntries.date, q.to));
  if (q.kind) where.push(eq(financeEntries.kind, q.kind));
  if (q.status === 'paid') where.push(eq(financeEntries.status, 'paid'));
  if (q.status === 'pending') where.push(eq(financeEntries.status, 'pending'));
  if (q.status === 'overdue') where.push(and(eq(financeEntries.status, 'pending'), lt(financeEntries.date, today))!);
  if (q.categoryId) where.push(eq(financeEntries.categoryId, q.categoryId));
  if (q.appointmentId) where.push(eq(financeEntries.appointmentId, q.appointmentId));
  if (q.q) {
    const term = `%${q.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(financeEntries.description, term), ilike(financeEntries.notes, term), ilike(financeCategories.name, term), ilike(appointments.clientName, term))!);
  }
  return where;
}

export async function listEntries(db: Database, q: ListQuery, now = new Date()): Promise<FinanceListDTO> {
  const today = todayIn(BUSINESS_TIMEZONE, now);
  const where = and(...listConditions(q, today));
  const rows = await baseEntryQuery(db)
    .where(where)
    .orderBy(desc(financeEntries.date), desc(financeEntries.createdAt))
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);
  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      incomePaid: money(sql`case when ${financeEntries.kind} = 'income' and ${financeEntries.status} = 'paid' then ${financeEntries.amountCents} end`),
      expensePaid: money(sql`case when ${financeEntries.kind} = 'expense' and ${financeEntries.status} = 'paid' then ${financeEntries.amountCents} end`),
      incomePending: money(sql`case when ${financeEntries.kind} = 'income' and ${financeEntries.status} = 'pending' then ${financeEntries.amountCents} end`),
      expensePending: money(sql`case when ${financeEntries.kind} = 'expense' and ${financeEntries.status} = 'pending' then ${financeEntries.amountCents} end`),
    })
    .from(financeEntries)
    .innerJoin(financeCategories, eq(financeCategories.id, financeEntries.categoryId))
    .leftJoin(appointments, eq(appointments.id, financeEntries.appointmentId))
    .where(where);
  return {
    items: rows.map((r) => toEntryDTO(r, today)),
    total: Number(totals?.total ?? 0),
    page: q.page,
    pageSize: q.pageSize,
    totals: {
      incomePaidCents: Number(totals?.incomePaid ?? 0),
      expensePaidCents: Number(totals?.expensePaid ?? 0),
      incomePendingCents: Number(totals?.incomePending ?? 0),
      expensePendingCents: Number(totals?.expensePending ?? 0),
    },
  };
}

/** A categoria precisa existir, estar ativa e ser do mesmo tipo do lançamento. */
async function assertCategory(db: Database, categoryId: string, kind: FinanceKind, allowArchivedId?: string) {
  const category = await getCategory(db, categoryId);
  if (!category) throw new ValidationError('Categoria não encontrada.', { categoryId: 'Escolha uma categoria da lista.' });
  if (category.kind !== kind) {
    throw new ValidationError('A categoria não combina com o tipo do lançamento.', {
      categoryId: `Escolha uma categoria de ${kind === 'income' ? 'entrada' : 'saída'}.`,
    });
  }
  if (category.archived && category.id !== allowArchivedId) {
    throw new ValidationError('Categoria arquivada.', { categoryId: 'Essa categoria foi arquivada. Escolha outra.' });
  }
}

async function assertAppointment(db: Database, appointmentId: string | null | undefined) {
  if (!appointmentId) return;
  const [row] = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  if (!row) throw new ValidationError('Atendimento não encontrado.', { appointmentId: 'O atendimento vinculado não existe mais.' });
}

export async function createEntry(db: Database, input: EntryInput, now = new Date()): Promise<FinanceEntryDTO> {
  await assertCategory(db, input.categoryId, input.kind);
  await assertAppointment(db, input.appointmentId);
  const [row] = await db.insert(financeEntries).values(input).returning({ id: financeEntries.id });
  if (!row) throw new Error('Falha ao registrar o lançamento.');
  return getEntry(db, row.id, now);
}

export async function updateEntry(db: Database, id: string, input: EntryUpdate, now = new Date()): Promise<FinanceEntryDTO> {
  const [current] = await db.select().from(financeEntries).where(eq(financeEntries.id, id)).limit(1);
  if (!current) throw new NotFoundError('Lançamento não encontrado.');
  const kind = input.kind ?? current.kind;
  const categoryId = input.categoryId ?? current.categoryId;
  if (input.kind !== undefined || input.categoryId !== undefined) await assertCategory(db, categoryId, kind, current.categoryId);
  if (input.appointmentId !== undefined) await assertAppointment(db, input.appointmentId);
  await db
    .update(financeEntries)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(financeEntries.id, id));
  return getEntry(db, id, now);
}

export async function deleteEntry(db: Database, id: string): Promise<void> {
  const deleted = await db.delete(financeEntries).where(eq(financeEntries.id, id)).returning({ id: financeEntries.id });
  if (!deleted.length) throw new NotFoundError('Lançamento não encontrado.');
}

// ---------- resumo ----------

export async function financeSummary(db: Database, month: string | undefined, now = new Date()): Promise<FinanceSummaryDTO> {
  const today = todayIn(BUSINESS_TIMEZONE, now);
  const current = month ?? today.slice(0, 7);
  const start = `${current}-01`;
  const end = endOfMonth(start);
  const prev = shiftMonth(current, -1);
  const prevStart = `${prev}-01`;
  const prevEnd = endOfMonth(prevStart);
  // Mês em andamento: a variação compara com o mesmo período do mês anterior (dia 1 até o dia de hoje).
  const isCurrentMonth = current === today.slice(0, 7);
  const previousThroughDay = isCurrentMonth ? Math.min(Number(today.slice(8, 10)), Number(prevEnd.slice(8, 10))) : null;
  const prevCompareEnd = previousThroughDay ? `${prev}-${String(previousThroughDay).padStart(2, '0')}` : prevEnd;
  const paid = eq(financeEntries.status, 'paid');
  const inMonth = and(gte(financeEntries.date, start), lte(financeEntries.date, end));

  const sumWhere = async (where: SQL | undefined) => {
    const [r] = await db
      .select({
        income: money(sql`case when ${financeEntries.kind} = 'income' then ${financeEntries.amountCents} end`),
        expense: money(sql`case when ${financeEntries.kind} = 'expense' then ${financeEntries.amountCents} end`),
        incomeCount: sql<number>`count(*) filter (where ${financeEntries.kind} = 'income')::int`,
        expenseCount: sql<number>`count(*) filter (where ${financeEntries.kind} = 'expense')::int`,
      })
      .from(financeEntries)
      .where(where);
    return {
      income: Number(r?.income ?? 0),
      expense: Number(r?.expense ?? 0),
      incomeCount: Number(r?.incomeCount ?? 0),
      expenseCount: Number(r?.expenseCount ?? 0),
    };
  };

  const [monthPaid, prevPaid, prevSamePeriod, pending, overdue] = await Promise.all([
    sumWhere(and(paid, inMonth)),
    sumWhere(and(paid, gte(financeEntries.date, prevStart), lte(financeEntries.date, prevEnd))),
    previousThroughDay ? sumWhere(and(paid, gte(financeEntries.date, prevStart), lte(financeEntries.date, prevCompareEnd))) : null,
    sumWhere(eq(financeEntries.status, 'pending')),
    sumWhere(and(eq(financeEntries.status, 'pending'), lt(financeEntries.date, today))),
  ]);

  // série de 12 meses (pagos), do mais antigo ao mês escolhido
  const firstMonth = shiftMonth(current, -11);
  const seriesRows = await db
    .select({
      month: sql<string>`to_char(${financeEntries.date}, 'YYYY-MM')`,
      kind: financeEntries.kind,
      total: money(financeEntries.amountCents),
    })
    .from(financeEntries)
    .where(and(paid, gte(financeEntries.date, `${firstMonth}-01`), lte(financeEntries.date, end)))
    .groupBy(sql`to_char(${financeEntries.date}, 'YYYY-MM')`, financeEntries.kind);
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = shiftMonth(firstMonth, i);
    const of = (kind: FinanceKind) => Number(seriesRows.find((r) => r.month === m && r.kind === kind)?.total ?? 0);
    return { month: m, incomeCents: of('income'), expenseCents: of('expense') };
  });

  const byCategory = await db
    .select({ categoryId: financeCategories.id, name: financeCategories.name, amount: money(financeEntries.amountCents) })
    .from(financeEntries)
    .innerJoin(financeCategories, eq(financeCategories.id, financeEntries.categoryId))
    .where(and(paid, inMonth, eq(financeEntries.kind, 'expense')))
    .groupBy(financeCategories.id, financeCategories.name);

  // receita por serviço: atendimentos pelo tipo de serviço; o restante pela categoria
  const groupName = sql<string>`coalesce(${serviceTypes.name}, ${financeCategories.name})`;
  const byService = await db
    .select({ name: groupName, amount: money(financeEntries.amountCents), count: sql<number>`count(*)::int` })
    .from(financeEntries)
    .innerJoin(financeCategories, eq(financeCategories.id, financeEntries.categoryId))
    .leftJoin(appointments, eq(appointments.id, financeEntries.appointmentId))
    .leftJoin(serviceTypes, eq(serviceTypes.id, appointments.serviceTypeId))
    .where(and(paid, inMonth, eq(financeEntries.kind, 'income')))
    .groupBy(groupName);

  const byMethod = await db
    .select({ method: financeEntries.paymentMethod, amount: money(financeEntries.amountCents) })
    .from(financeEntries)
    .where(and(paid, inMonth, eq(financeEntries.kind, 'income')))
    .groupBy(financeEntries.paymentMethod);

  const [ticket] = await db
    .select({
      amount: money(financeEntries.amountCents),
      visits: sql<number>`count(distinct ${financeEntries.appointmentId})::int`,
    })
    .from(financeEntries)
    .where(and(paid, inMonth, eq(financeEntries.kind, 'income'), sql`${financeEntries.appointmentId} is not null`));
  const visits = Number(ticket?.visits ?? 0);

  const settings = await getSettingsRow(db);
  let mei: FinanceSummaryDTO['mei'] = null;
  if (settings.meiAnnualLimitCents) {
    const year = Number(current.slice(0, 4));
    const [y] = await db
      .select({ income: money(financeEntries.amountCents) })
      .from(financeEntries)
      .where(and(paid, eq(financeEntries.kind, 'income'), gte(financeEntries.date, `${year}-01-01`), lte(financeEntries.date, `${year}-12-31`)));
    const income = Number(y?.income ?? 0);
    const currentYear = Number(today.slice(0, 4));
    let projected = income;
    if (year === currentYear) {
      const dayOfYear = Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${year}-01-01T12:00:00Z`)) / 86_400_000) + 1;
      const daysInYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
      projected = Math.round((income / dayOfYear) * daysInYear);
    }
    mei = { year, limitCents: settings.meiAnnualLimitCents, incomeCents: income, projectedCents: projected };
  }

  const upcomingRows = await baseEntryQuery(db)
    .where(and(eq(financeEntries.status, 'pending'), lte(financeEntries.date, addDaysToDate(today, 7))))
    .orderBy(asc(financeEntries.date), asc(financeEntries.createdAt))
    .limit(8);

  return {
    month: current,
    income: {
      paidCents: monthPaid.income,
      pendingCents: pending.income,
      overdueCents: overdue.income,
      overdueCount: overdue.incomeCount,
      previousPaidCents: (prevSamePeriod ?? prevPaid).income,
    },
    expense: {
      paidCents: monthPaid.expense,
      pendingCents: pending.expense,
      overdueCents: overdue.expense,
      overdueCount: overdue.expenseCount,
      previousPaidCents: (prevSamePeriod ?? prevPaid).expense,
    },
    resultCents: monthPaid.income - monthPaid.expense,
    previousThroughDay,
    previousResultCents: prevPaid.income - prevPaid.expense,
    averageTicketCents: visits ? Math.round(Number(ticket?.amount ?? 0) / visits) : null,
    paidAppointments: visits,
    months,
    expensesByCategory: byCategory
      .map((r) => ({ categoryId: r.categoryId, name: r.name, amountCents: Number(r.amount) }))
      .sort((a, b) => b.amountCents - a.amountCents),
    incomeByService: byService.map((r) => ({ name: r.name, amountCents: Number(r.amount), count: Number(r.count) })).sort((a, b) => b.amountCents - a.amountCents),
    incomeByMethod: byMethod
      .map((r) => ({ method: (r.method ?? 'unknown') as PaymentMethod | 'unknown', amountCents: Number(r.amount) }))
      .sort((a, b) => b.amountCents - a.amountCents),
    mei,
    upcoming: upcomingRows.map((r) => toEntryDTO(r, today)),
  };
}

// ---------- exportação ----------

const csvCell = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const brl = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');
const brDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** CSV no padrão do Excel brasileiro (separador ";" e vírgula decimal), com BOM para acentos. */
export async function exportEntriesCsv(db: Database, from: string, to: string, now = new Date()): Promise<string> {
  const today = todayIn(BUSINESS_TIMEZONE, now);
  const rows = await baseEntryQuery(db)
    .where(and(gte(financeEntries.date, from), lte(financeEntries.date, to)))
    .orderBy(asc(financeEntries.date), asc(financeEntries.createdAt));
  const header = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)', 'Situação', 'Forma de pagamento', 'Atendimento', 'Observações'];
  const lines = rows.map((r) => {
    const e = toEntryDTO(r, today);
    const signed = e.kind === 'expense' ? -e.amountCents : e.amountCents;
    return [
      brDate(e.date),
      FINANCE_KIND_LABELS[e.kind],
      e.description,
      e.category.name,
      brl(signed),
      `${FINANCE_STATUS_LABELS[e.kind][e.status]}${e.overdue ? ' (vencido)' : ''}`,
      e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : '',
      e.appointment ? `${e.appointment.clientName} · ${brDate(e.appointment.date)} ${e.appointment.startTime}` : '',
      e.notes ?? '',
    ]
      .map((v) => csvCell(String(v)))
      .join(';');
  });
  return `﻿${[header.join(';'), ...lines].join('\r\n')}\r\n`;
}
