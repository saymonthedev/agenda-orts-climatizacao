import type { z } from 'zod';
import type {
  AppointmentDTO,
  AppointmentStatus,
  ConflictSummary,
  appointmentCreateSchema,
  appointmentListQuerySchema,
  appointmentUpdateSchema,
} from '../../contracts/appointments';
import type { AvailabilityDTO, availabilityQuerySchema } from '../../contracts/availability';
import type { Paginated } from '../../contracts/common';
import type { Database } from '../../database/client';
import { buildDaySlots, checkScheduleRules, findConflicts, formatDuration, type ScheduleRules, type TimeRange } from '../../domain/scheduling';
import { addMinutes, dayBounds, diffMinutes, zonedInstant, zonedParts } from '../../domain/time';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../../http/errors';
import { getService } from '../services/services.service';
import { getScheduleRules } from '../settings/settings.service';
import {
  deleteAppointmentRow,
  findActiveInWindow,
  findAppointmentRow,
  insertAppointmentRow,
  listAppointmentRows,
  updateAppointmentRow,
  type AppointmentWithService,
} from './appointments.repository';

type CreateInput = z.output<typeof appointmentCreateSchema>;
type UpdateInput = Partial<z.output<typeof appointmentUpdateSchema>>;
type ListQuery = z.output<typeof appointmentListQuerySchema>;
type AvailabilityQuery = z.output<typeof availabilityQuerySchema>;

const HISTORICAL: AppointmentStatus[] = ['completed', 'cancelled'];

export function toAppointmentDTO(row: AppointmentWithService, timeZone: string): AppointmentDTO {
  const a = row.appointment;
  const start = zonedParts(a.startsAt, timeZone);
  const end = zonedParts(a.endsAt, timeZone);
  return {
    id: a.id,
    clientName: a.clientName,
    clientPhone: a.clientPhone,
    serviceType: { id: row.service.id, name: row.service.name, color: row.service.color },
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    date: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    durationMinutes: diffMinutes(a.endsAt, a.startsAt),
    address: a.address,
    neighborhood: a.neighborhood,
    city: a.city,
    notes: a.notes,
    status: a.status,
    outsideBusinessHours: a.outsideBusinessHours,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    completedAt: a.completedAt?.toISOString() ?? null,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
  };
}

async function requireActiveService(db: Database, serviceTypeId: string, allowInactiveId?: string) {
  const service = await getService(db, serviceTypeId);
  if (!service || (!service.active && service.id !== allowInactiveId)) {
    throw new ValidationError('Selecione um tipo de serviço válido.', { serviceTypeId: 'Selecione um tipo de serviço válido.' });
  }
  return service;
}

/** Aplica as regras configuráveis da agenda. Encaixes exigem confirmação explícita. */
function enforceScheduleRules(range: TimeRange, rules: ScheduleRules, opts: { allowOutside: boolean; status: AppointmentStatus; now: Date }) {
  let violations = checkScheduleRules(range, rules, opts.now);
  if (HISTORICAL.includes(opts.status)) {
    // registros históricos (concluídos/cancelados) podem estar no passado
    violations = violations.filter((v) => v.code !== 'IN_PAST' && v.code !== 'TOO_SOON');
  }
  if (violations.length && !opts.allowOutside) {
    throw new BusinessRuleError('OUTSIDE_SCHEDULE', violations[0]!.message, { violations });
  }
  return violations;
}

async function assertNoConflict(db: Database, range: TimeRange, rules: ScheduleRules, excludeId?: string) {
  const buffer = rules.bufferMinutes;
  const candidates = await findActiveInWindow(db, addMinutes(range.start, -buffer), addMinutes(range.end, buffer), excludeId);
  const booked = candidates.map((c) => ({
    id: c.appointment.id,
    startsAt: c.appointment.startsAt,
    endsAt: c.appointment.endsAt,
    status: c.appointment.status,
    row: c,
  }));
  const conflicts = findConflicts(range, booked, buffer, excludeId);
  if (!conflicts.length) return;

  const summaries: ConflictSummary[] = conflicts.map((c) => {
    const dto = toAppointmentDTO(c.row, rules.timezone);
    return { id: dto.id, clientName: dto.clientName, date: dto.date, startTime: dto.startTime, endTime: dto.endTime };
  });
  const first = summaries[0]!;
  const directOverlap = findConflicts(range, conflicts, 0, excludeId).length > 0;
  const message = directOverlap
    ? `Conflito com o atendimento de ${first.clientName} (${first.startTime}–${first.endTime}).`
    : `Respeite o intervalo de ${formatDuration(buffer)} entre atendimentos: ${first.clientName} (${first.startTime}–${first.endTime}).`;
  throw new ConflictError(message, { conflicts: summaries }, 'SCHEDULE_CONFLICT');
}

export async function listAppointments(db: Database, query: ListQuery): Promise<Paginated<AppointmentDTO>> {
  const rules = await getScheduleRules(db);
  const tz = rules.timezone;
  const { rows, total } = await listAppointmentRows(db, {
    start: query.from ? dayBounds(query.from, tz).start : undefined,
    end: query.to ? dayBounds(query.to, tz).end : undefined,
    statuses: query.status,
    search: query.search,
    order: query.order,
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  });
  return { items: rows.map((r) => toAppointmentDTO(r, tz)), total, page: query.page, pageSize: query.pageSize };
}

export async function getAppointment(db: Database, id: string): Promise<AppointmentDTO> {
  const rules = await getScheduleRules(db);
  const row = await findAppointmentRow(db, id);
  if (!row) throw new NotFoundError('Atendimento não encontrado.');
  return toAppointmentDTO(row, rules.timezone);
}

export async function createAppointment(db: Database, input: CreateInput, now: Date = new Date()): Promise<AppointmentDTO> {
  const rules = await getScheduleRules(db);
  await requireActiveService(db, input.serviceTypeId);

  const start = zonedInstant(input.date, input.startTime, rules.timezone);
  const range = { start, end: addMinutes(start, input.durationMinutes) };
  const violations = enforceScheduleRules(range, rules, { allowOutside: input.allowOutsideHours, status: input.status, now });
  if (input.status !== 'cancelled') await assertNoConflict(db, range, rules);

  const id = await insertAppointmentRow(db, {
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    serviceTypeId: input.serviceTypeId,
    startsAt: range.start,
    endsAt: range.end,
    address: input.address,
    neighborhood: input.neighborhood,
    city: input.city,
    notes: input.notes,
    status: input.status,
    outsideBusinessHours: violations.length > 0,
    completedAt: input.status === 'completed' ? now : null,
    cancelledAt: input.status === 'cancelled' ? now : null,
  });
  return getAppointment(db, id);
}

export async function updateAppointment(db: Database, id: string, input: UpdateInput, now: Date = new Date()): Promise<AppointmentDTO> {
  const rules = await getScheduleRules(db);
  const current = await findAppointmentRow(db, id);
  if (!current) throw new NotFoundError('Atendimento não encontrado.');
  const a = current.appointment;
  const tz = rules.timezone;

  const currentStart = zonedParts(a.startsAt, tz);
  const currentDuration = diffMinutes(a.endsAt, a.startsAt);
  const date = input.date ?? currentStart.date;
  const startTime = input.startTime ?? currentStart.time;
  const duration = input.durationMinutes ?? currentDuration;
  const status = input.status ?? a.status;
  const timeChanged = date !== currentStart.date || startTime !== currentStart.time || duration !== currentDuration;

  if (input.serviceTypeId && input.serviceTypeId !== a.serviceTypeId) {
    await requireActiveService(db, input.serviceTypeId);
  }

  let range: TimeRange = { start: a.startsAt, end: a.endsAt };
  let outside = a.outsideBusinessHours;
  if (timeChanged) {
    const start = zonedInstant(date, startTime, tz);
    range = { start, end: addMinutes(start, duration) };
    const violations = enforceScheduleRules(range, rules, { allowOutside: input.allowOutsideHours ?? false, status, now });
    outside = violations.length > 0;
  }

  const reactivating = a.status === 'cancelled' && status !== 'cancelled';
  if (status !== 'cancelled' && (timeChanged || reactivating)) {
    await assertNoConflict(db, range, rules, id);
  }

  await updateAppointmentRow(db, id, {
    clientName: input.clientName,
    clientPhone: input.clientPhone,
    serviceTypeId: input.serviceTypeId,
    address: input.address,
    neighborhood: input.neighborhood,
    city: input.city,
    notes: input.notes === undefined ? undefined : input.notes,
    startsAt: range.start,
    endsAt: range.end,
    status,
    outsideBusinessHours: outside,
    completedAt: status === 'completed' ? (a.completedAt ?? now) : null,
    cancelledAt: status === 'cancelled' ? (a.cancelledAt ?? now) : null,
    updatedAt: now,
  });
  return getAppointment(db, id);
}

export async function changeAppointmentStatus(db: Database, id: string, status: AppointmentStatus, now: Date = new Date()) {
  return updateAppointment(db, id, { status }, now);
}

export async function deleteAppointment(db: Database, id: string): Promise<void> {
  const deleted = await deleteAppointmentRow(db, id);
  if (!deleted) throw new NotFoundError('Atendimento não encontrado.');
}

export async function getAvailability(db: Database, query: AvailabilityQuery, now: Date = new Date()): Promise<AvailabilityDTO> {
  const rules = await getScheduleRules(db);
  const duration = query.durationMinutes ?? rules.defaultDurationMinutes;
  const { start, end } = dayBounds(query.date, rules.timezone);
  const rows = await findActiveInWindow(
    db,
    addMinutes(start, -rules.bufferMinutes),
    addMinutes(end, rules.bufferMinutes),
    query.excludeId,
  );
  const booked = rows.map((r) => ({
    id: r.appointment.id,
    startsAt: r.appointment.startsAt,
    endsAt: r.appointment.endsAt,
    status: r.appointment.status,
  }));
  const day = buildDaySlots({ date: query.date, durationMinutes: duration, rules, booked, now, excludeId: query.excludeId });
  return {
    date: query.date,
    open: day.open,
    hours: day.hours,
    breaks: day.open ? rules.breaks.map((b) => ({ start: b.start, end: b.end, label: b.label })) : [],
    durationMinutes: duration,
    bufferMinutes: rules.bufferMinutes,
    slots: day.slots,
  };
}
