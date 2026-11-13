/**
 * Regras de agenda (funções puras, sem acesso a banco).
 * Usadas pelo serviço de agendamentos e cobertas por testes unitários.
 */
import type { AppointmentStatus, ScheduleViolation } from '../contracts/appointments';
import type { AvailabilitySlot, SlotState } from '../contracts/availability';
import { minutesFromTime, timeFromMinutes } from '../contracts/common';
import type { BreakWindow, DayHours } from '../contracts/settings';
import { addDaysToDate, addMinutes, weekdayOfDate, zonedInstant, zonedParts } from './time';

export type ScheduleRules = {
  timezone: string;
  weeklyHours: DayHours[];
  breaks: BreakWindow[];
  bufferMinutes: number;
  minAdvanceMinutes: number;
  slotIntervalMinutes: number;
  defaultDurationMinutes: number;
};

export type TimeRange = { start: Date; end: Date };

export type BookedRange = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
};

const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;

export function hoursForDate(date: string, rules: Pick<ScheduleRules, 'weeklyHours'>): DayHours | null {
  const weekday = weekdayOfDate(date);
  const day = rules.weeklyHours.find((d) => d.weekday === weekday);
  return day && day.enabled ? day : null;
}

/**
 * Verifica o intervalo contra expediente, pausas e antecedência mínima.
 * Retorna a lista de violações (vazia = dentro das regras).
 * Horários que já passaram são permitidos: servem para registrar serviços já feitos.
 */
export function checkScheduleRules(range: TimeRange, rules: ScheduleRules, now: Date = new Date()): ScheduleViolation[] {
  const violations: ScheduleViolation[] = [];
  const start = zonedParts(range.start, rules.timezone);
  const end = zonedParts(range.end, rules.timezone);

  // terminar exatamente à meia-noite seguinte ainda conta como o mesmo dia
  const endsAtMidnight = end.minutes === 0 && end.date !== start.date;
  const endMinutes = endsAtMidnight ? 24 * 60 : end.minutes;
  const lastDate = endsAtMidnight ? addDaysToDate(end.date, -1) : end.date;

  // a antecedência mínima só vale para o futuro
  if (range.start.getTime() >= now.getTime() && range.start.getTime() < addMinutes(now, rules.minAdvanceMinutes).getTime()) {
    violations.push({
      code: 'TOO_SOON',
      message: `A antecedência mínima configurada é de ${formatDuration(rules.minAdvanceMinutes)}.`,
    });
  }

  if (lastDate !== start.date) return [...violations, ...checkMultiDay(start, lastDate, endMinutes, rules)];

  const day = hoursForDate(start.date, rules);
  if (!day) {
    violations.push({ code: 'CLOSED_DAY', message: 'Não há atendimento neste dia da semana.' });
    return violations;
  }

  const open = minutesFromTime(day.start);
  const close = minutesFromTime(day.end);
  if (start.minutes < open || endMinutes > close) {
    violations.push({
      code: 'OUTSIDE_HOURS',
      message: `Fora do horário de atendimento (${day.start} às ${day.end}).`,
    });
  }

  const hitBreak = rules.breaks.find((b) =>
    rangesOverlap(start.minutes, endMinutes, minutesFromTime(b.start), minutesFromTime(b.end)),
  );
  if (hitBreak) {
    violations.push({
      code: 'OVERLAPS_BREAK',
      message: `Coincide com a pausa "${hitBreak.label}" (${hitBreak.start} às ${hitBreak.end}).`,
    });
  }

  return violations;
}

/**
 * Atendimento de vários dias: começa dentro do expediente do primeiro dia e termina dentro
 * do expediente do último. As noites e as pausas no meio fazem parte do serviço.
 */
function checkMultiDay(start: { date: string; minutes: number }, lastDate: string, endMinutes: number, rules: ScheduleRules): ScheduleViolation[] {
  const violations: ScheduleViolation[] = [];
  const first = hoursForDate(start.date, rules);
  const last = hoursForDate(lastDate, rules);
  if (!first) violations.push({ code: 'CLOSED_DAY', message: 'Não há atendimento no dia de início.' });
  else if (start.minutes < minutesFromTime(first.start) || start.minutes >= minutesFromTime(first.end)) {
    violations.push({ code: 'OUTSIDE_HOURS', message: `O início está fora do horário de atendimento (${first.start} às ${first.end}).` });
  }
  if (!last) violations.push({ code: 'CLOSED_DAY', message: 'Não há atendimento no dia do término.' });
  else if (endMinutes <= minutesFromTime(last.start) || endMinutes > minutesFromTime(last.end)) {
    violations.push({ code: 'OUTSIDE_HOURS', message: `O término está fora do horário de atendimento (${last.start} às ${last.end}).` });
  }
  return violations;
}

/**
 * Atendimentos que conflitam com o intervalo, considerando o intervalo
 * mínimo entre atendimentos (deslocamento). Cancelados não ocupam a agenda.
 */
export function findConflicts<T extends BookedRange>(range: TimeRange, booked: T[], bufferMinutes: number, excludeId?: string): T[] {
  const s = range.start.getTime();
  const e = range.end.getTime();
  const buffer = bufferMinutes * 60000;
  return booked.filter(
    (b) =>
      b.id !== excludeId &&
      b.status !== 'cancelled' &&
      rangesOverlap(s - buffer, e + buffer, b.startsAt.getTime(), b.endsAt.getTime()),
  );
}

/**
 * Monta os horários do dia para o seletor de horário, indicando a situação
 * de cada um (livre, ocupado, pausa, passado...).
 */
export function buildDaySlots(params: {
  date: string;
  durationMinutes: number;
  rules: ScheduleRules;
  booked: BookedRange[];
  now?: Date;
  excludeId?: string;
}): { open: boolean; hours: { start: string; end: string } | null; slots: AvailabilitySlot[] } {
  const { date, durationMinutes, rules, booked, excludeId } = params;
  const now = params.now ?? new Date();
  const day = hoursForDate(date, rules);
  const step = rules.slotIntervalMinutes;

  // Mesmo em dias fechados exibimos uma grade (para encaixes), marcada como fora do expediente.
  const open = day ? minutesFromTime(day.start) : 7 * 60;
  const close = day ? minutesFromTime(day.end) : 19 * 60;
  const gridStart = Math.max(0, Math.min(open, 7 * 60));
  const gridEnd = Math.min(24 * 60, Math.max(close, 19 * 60));

  const slots: AvailabilitySlot[] = [];
  for (let m = gridStart; m + 15 <= gridEnd; m += step) {
    const startTime = timeFromMinutes(m);
    const endMinutes = m + durationMinutes;
    const start = zonedInstant(date, startTime, rules.timezone);
    const end = addMinutes(start, durationMinutes);
    // horários que já passaram continuam selecionáveis (registro de serviço já feito)
    let state: SlotState = 'available';
    if (findConflicts({ start, end }, booked, rules.bufferMinutes, excludeId).length > 0) state = 'busy';
    else if (!day || m < open || endMinutes > close) state = 'after_hours';
    else if (rules.breaks.some((b) => rangesOverlap(m, endMinutes, minutesFromTime(b.start), minutesFromTime(b.end))))
      state = 'break';
    else if (start.getTime() < now.getTime()) state = 'past';
    else if (start.getTime() < addMinutes(now, rules.minAdvanceMinutes).getTime()) state = 'too_soon';
    slots.push({ time: startTime, endTime: timeFromMinutes(Math.min(endMinutes, 24 * 60 - 1)), state });
  }

  return { open: Boolean(day), hours: day ? { start: day.start, end: day.end } : null, slots };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 24 && m === 0 && h % 24 === 0) {
    const d = h / 24;
    return d === 1 ? '1 dia' : `${d} dias`;
  }
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}
