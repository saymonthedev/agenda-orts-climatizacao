import type { AppointmentDTO, AppointmentStatus } from '../../contracts/appointments';
import { APPOINTMENT_STATUSES, coversDate, lastDateOf } from '../../contracts/appointments';
import type { DashboardDTO, StatusCounts } from '../../contracts/dashboard';
import type { Database } from '../../database/client';
import { addDaysToDate, dayBounds, endOfMonth, startOfMonth, startOfWeekMonday, todayIn } from '../../domain/time';
import { findNextActive, findPendingFrom, listAppointmentRows } from '../appointments/appointments.repository';
import { toAppointmentDTO } from '../appointments/appointments.service';
import { getScheduleRules } from '../settings/settings.service';

const emptyCounts = (): StatusCounts =>
  Object.fromEntries(APPOINTMENT_STATUSES.map((s) => [s, 0])) as Record<AppointmentStatus, number>;

const minDate = (a: string, b: string) => (a < b ? a : b);
const maxDate = (a: string, b: string) => (a > b ? a : b);

/** Resumo do painel: hoje, próximo atendimento, pendências, semana e mês. */
export async function getDashboard(db: Database, now: Date = new Date()): Promise<DashboardDTO> {
  const rules = await getScheduleRules(db);
  const tz = rules.timezone;
  const today = todayIn(tz, now);
  const weekStart = startOfWeekMonday(today);
  const weekEnd = addDaysToDate(weekStart, 6);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const [range, next, pending] = await Promise.all([
    listAppointmentRows(db, {
      start: dayBounds(minDate(weekStart, monthStart), tz).start,
      end: dayBounds(maxDate(weekEnd, monthEnd), tz).end,
      order: 'asc',
    }),
    findNextActive(db, now),
    findPendingFrom(db, now, 6),
  ]);

  const items: AppointmentDTO[] = range.rows.map((r) => toAppointmentDTO(r, tz));

  // atendimentos de vários dias contam em todos os dias que ocupam
  const todayItems = items.filter((a) => coversDate(a, today));
  const byStatus = emptyCounts();
  for (const a of todayItems) byStatus[a.status] += 1;

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysToDate(weekStart, i);
    const dayItems = items.filter((a) => coversDate(a, date));
    return {
      date,
      total: dayItems.filter((a) => a.status !== 'cancelled').length,
      completed: dayItems.filter((a) => a.status === 'completed').length,
      cancelled: dayItems.filter((a) => a.status === 'cancelled').length,
    };
  });

  const weekItems = items.filter((a) => a.date <= weekEnd && lastDateOf(a) >= weekStart);
  const monthItems = items.filter((a) => a.date >= monthStart && a.date <= monthEnd);
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: tz }).format(now);

  return {
    generatedAt: now.toISOString(),
    today: {
      date: today,
      total: todayItems.filter((a) => a.status !== 'cancelled').length,
      byStatus,
      appointments: todayItems,
    },
    next: next ? toAppointmentDTO(next, tz) : null,
    pendingConfirmation: { total: pending.total, items: pending.rows.map((r) => toAppointmentDTO(r, tz)) },
    week: {
      start: weekStart,
      end: weekEnd,
      // cada atendimento conta uma vez na semana, mesmo ocupando vários dias
      total: weekItems.filter((a) => a.status !== 'cancelled').length,
      completed: weekItems.filter((a) => a.status === 'completed').length,
      cancelled: weekItems.filter((a) => a.status === 'cancelled').length,
      days,
    },
    month: {
      label: monthLabel,
      total: monthItems.filter((a) => a.status !== 'cancelled').length,
      completed: monthItems.filter((a) => a.status === 'completed').length,
      cancelled: monthItems.filter((a) => a.status === 'cancelled').length,
    },
  };
}
