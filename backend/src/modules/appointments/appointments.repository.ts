import { and, asc, count, desc, eq, gt, gte, ilike, inArray, lt, ne, or, type SQL } from 'drizzle-orm';
import type { AppointmentStatus } from '../../contracts/appointments';
import type { ServiceColor } from '../../contracts/services';
import type { Database } from '../../database/client';
import { appointments, serviceTypes, type AppointmentRow } from '../../database/schema';

export type AppointmentWithService = {
  appointment: AppointmentRow;
  service: { id: string; name: string; color: ServiceColor };
};

const selection = {
  appointment: appointments,
  service: { id: serviceTypes.id, name: serviceTypes.name, color: serviceTypes.color },
};

const baseQuery = (db: Database) =>
  db.select(selection).from(appointments).innerJoin(serviceTypes, eq(serviceTypes.id, appointments.serviceTypeId));

/** Escapa curingas do LIKE para que a busca trate o texto literalmente. */
export const escapeLike = (value: string) => value.replace(/[\\%_]/g, (m) => `\\${m}`);

export type ListFilters = {
  start?: Date;
  end?: Date;
  statuses?: AppointmentStatus[];
  search?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

function buildConditions(filters: ListFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = [];
  // sobreposição com o período: inclui atendimentos de vários dias que começaram antes
  if (filters.start) conditions.push(gt(appointments.endsAt, filters.start));
  if (filters.end) conditions.push(lt(appointments.startsAt, filters.end));
  if (filters.statuses?.length) conditions.push(inArray(appointments.status, filters.statuses));
  const term = filters.search?.trim();
  if (term) {
    const like = `%${escapeLike(term)}%`;
    const digits = term.replace(/\D/g, '');
    conditions.push(
      or(
        ilike(appointments.clientName, like),
        ilike(appointments.address, like),
        ilike(appointments.neighborhood, like),
        ilike(serviceTypes.name, like),
        digits.length >= 3 ? ilike(appointments.clientPhone, `%${escapeLike(digits)}%`) : undefined,
      ),
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listAppointmentRows(db: Database, filters: ListFilters) {
  const where = buildConditions(filters);
  const orderBy = filters.order === 'desc' ? desc(appointments.startsAt) : asc(appointments.startsAt);
  const rowsQuery = baseQuery(db).where(where).orderBy(orderBy, asc(appointments.createdAt));
  const rows = await (filters.limit !== undefined
    ? rowsQuery.limit(filters.limit).offset(filters.offset ?? 0)
    : rowsQuery);
  const [totalRow] = await db
    .select({ total: count() })
    .from(appointments)
    .innerJoin(serviceTypes, eq(serviceTypes.id, appointments.serviceTypeId))
    .where(where);
  return { rows: rows as AppointmentWithService[], total: Number(totalRow?.total ?? 0) };
}

export async function findAppointmentRow(db: Database, id: string): Promise<AppointmentWithService | null> {
  const [row] = await baseQuery(db).where(eq(appointments.id, id)).limit(1);
  return (row as AppointmentWithService | undefined) ?? null;
}

/** Atendimentos ativos que tocam a janela informada (para checagem de conflito/disponibilidade). */
export async function findActiveInWindow(db: Database, start: Date, end: Date, excludeId?: string) {
  const rows = await baseQuery(db).where(
    and(
      ne(appointments.status, 'cancelled'),
      lt(appointments.startsAt, end),
      gt(appointments.endsAt, start),
      excludeId ? ne(appointments.id, excludeId) : undefined,
    ),
  );
  return rows as AppointmentWithService[];
}

export async function findNextActive(db: Database, now: Date) {
  const [row] = await baseQuery(db)
    .where(and(inArray(appointments.status, ['pending', 'confirmed', 'in_progress']), gt(appointments.endsAt, now)))
    .orderBy(asc(appointments.startsAt))
    .limit(1);
  return (row as AppointmentWithService | undefined) ?? null;
}

export async function findPendingFrom(db: Database, now: Date, limit: number) {
  const where = and(eq(appointments.status, 'pending'), gte(appointments.startsAt, now));
  const rows = await baseQuery(db).where(where).orderBy(asc(appointments.startsAt)).limit(limit);
  const [totalRow] = await db.select({ total: count() }).from(appointments).where(where);
  return { rows: rows as AppointmentWithService[], total: Number(totalRow?.total ?? 0) };
}

export async function insertAppointmentRow(db: Database, values: typeof appointments.$inferInsert) {
  const [row] = await db.insert(appointments).values(values).returning({ id: appointments.id });
  if (!row) throw new Error('Falha ao registrar o atendimento.');
  return row.id;
}

export async function updateAppointmentRow(db: Database, id: string, values: Partial<typeof appointments.$inferInsert>) {
  const [row] = await db.update(appointments).set(values).where(eq(appointments.id, id)).returning({ id: appointments.id });
  return row?.id ?? null;
}

export async function deleteAppointmentRow(db: Database, id: string) {
  const [row] = await db.delete(appointments).where(eq(appointments.id, id)).returning({ id: appointments.id });
  return row?.id ?? null;
}
