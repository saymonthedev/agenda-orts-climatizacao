import { describe, expect, it } from 'vitest';
import type { DayHours } from '../src/contracts/settings';
import { buildDaySlots, checkScheduleRules, findConflicts, type ScheduleRules } from '../src/domain/scheduling';
import { addDaysToDate, dayBounds, startOfWeekMonday, weekdayOfDate, zonedInstant, zonedParts } from '../src/domain/time';

const TZ = 'America/Sao_Paulo';
const weeklyHours: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  enabled: weekday >= 1 && weekday <= 6,
  start: '08:00',
  end: weekday === 6 ? '12:00' : '18:00',
}));
const rules: ScheduleRules = {
  timezone: TZ,
  weeklyHours,
  breaks: [{ start: '12:00', end: '13:30', label: 'Almoço' }],
  bufferMinutes: 30,
  minAdvanceMinutes: 60,
  slotIntervalMinutes: 30,
  defaultDurationMinutes: 90,
};

// Segunda-feira, 2030-01-07
const MONDAY = '2030-01-07';
const NOW = zonedInstant('2030-01-06', '10:00', TZ); // domingo anterior
const range = (date: string, start: string, minutes: number) => {
  const s = zonedInstant(date, start, TZ);
  return { start: s, end: new Date(s.getTime() + minutes * 60000) };
};
const codes = (r: { start: Date; end: Date }, now = NOW, rr = rules) => checkScheduleRules(r, rr, now).map((v) => v.code);

describe('fuso horário', () => {
  it('converte data/hora local de Jaraguá do Sul para UTC (-03:00)', () => {
    expect(zonedInstant(MONDAY, '08:00', TZ).toISOString()).toBe('2030-01-07T11:00:00.000Z');
    expect(zonedParts(new Date('2030-01-07T11:00:00.000Z'), TZ)).toMatchObject({ date: MONDAY, time: '08:00', weekday: 1 });
  });

  it('calcula limites do dia e semanas', () => {
    const { start, end } = dayBounds(MONDAY, TZ);
    expect(end.getTime() - start.getTime()).toBe(24 * 3600 * 1000);
    expect(weekdayOfDate(MONDAY)).toBe(1);
    expect(startOfWeekMonday('2030-01-13')).toBe(MONDAY); // domingo -> segunda anterior
    expect(addDaysToDate('2030-01-31', 1)).toBe('2030-02-01');
  });
});

describe('regras de expediente', () => {
  it('aceita atendimento dentro do horário', () => {
    expect(codes(range(MONDAY, '08:00', 90))).toEqual([]);
    expect(codes(range(MONDAY, '16:30', 90))).toEqual([]);
  });

  it('rejeita dia sem atendimento', () => {
    expect(codes(range('2030-01-13', '09:00', 60))).toContain('CLOSED_DAY');
  });

  it('rejeita horário antes da abertura ou após o fechamento', () => {
    expect(codes(range(MONDAY, '07:30', 60))).toContain('OUTSIDE_HOURS');
    expect(codes(range(MONDAY, '17:00', 90))).toContain('OUTSIDE_HOURS');
    expect(codes(range('2030-01-12', '11:00', 90))).toContain('OUTSIDE_HOURS'); // sábado até 12h
  });

  it('rejeita sobreposição com a pausa configurada', () => {
    expect(codes(range(MONDAY, '11:00', 90))).toContain('OVERLAPS_BREAK');
    expect(codes(range(MONDAY, '13:30', 60))).toEqual([]);
  });

  it('respeita antecedência mínima e horários passados', () => {
    const now = zonedInstant(MONDAY, '09:30', TZ);
    expect(codes(range(MONDAY, '08:00', 60), now)).toContain('IN_PAST');
    expect(codes(range(MONDAY, '10:00', 60), now)).toContain('TOO_SOON');
    expect(codes(range(MONDAY, '10:30', 60), now)).toEqual([]);
  });

  it('aceita atendimento que termina em outro dia dentro do expediente', () => {
    expect(codes(range(MONDAY, '14:00', 21 * 60))).toEqual([]); // segunda 14h → terça 11h
    expect(codes(range(MONDAY, '08:00', 2 * 24 * 60 + 10 * 60))).toEqual([]); // segunda 8h → quarta 18h
    // pausas no meio de um serviço de vários dias fazem parte dele
    expect(codes(range(MONDAY, '11:00', 25 * 60 + 30))).toEqual([]); // segunda 11h → terça 12h30
    // domingo fechado no meio não importa: sábado 10h → segunda 10h
    expect(codes(range('2030-01-12', '10:00', 48 * 60))).toEqual([]);
  });

  it('exige início e término dentro do expediente nos atendimentos de vários dias', () => {
    expect(codes(range(MONDAY, '23:00', 120))).toContain('OUTSIDE_HOURS'); // começa à noite
    expect(codes(range(MONDAY, '14:00', 29 * 60))).toContain('OUTSIDE_HOURS'); // termina terça 19h
    expect(codes(range('2030-01-11', '16:00', 44 * 60))).toContain('CLOSED_DAY'); // termina no domingo
    expect(codes(range(MONDAY, '22:00', 120))).toContain('OUTSIDE_HOURS'); // termina à meia-noite
  });
});

describe('conflitos', () => {
  const booked = [
    { id: 'a', status: 'confirmed' as const, ...(() => { const r = range(MONDAY, '09:00', 60); return { startsAt: r.start, endsAt: r.end }; })() },
    { id: 'b', status: 'cancelled' as const, ...(() => { const r = range(MONDAY, '14:00', 60); return { startsAt: r.start, endsAt: r.end }; })() },
  ];

  it('detecta sobreposição direta', () => {
    expect(findConflicts(range(MONDAY, '09:30', 60), booked, 0).map((b) => b.id)).toEqual(['a']);
  });

  it('considera o intervalo de deslocamento entre atendimentos', () => {
    expect(findConflicts(range(MONDAY, '10:00', 60), booked, 0)).toHaveLength(0);
    expect(findConflicts(range(MONDAY, '10:00', 60), booked, 30).map((b) => b.id)).toEqual(['a']);
    expect(findConflicts(range(MONDAY, '10:30', 60), booked, 30)).toHaveLength(0);
  });

  it('ignora cancelados e o próprio atendimento em edição', () => {
    expect(findConflicts(range(MONDAY, '14:00', 60), booked, 30)).toHaveLength(0);
    expect(findConflicts(range(MONDAY, '09:00', 60), booked, 30, 'a')).toHaveLength(0);
  });
});

describe('grade de horários', () => {
  it('marca ocupados, pausas e fora do expediente', () => {
    const r = range(MONDAY, '09:00', 60);
    const { open, slots } = buildDaySlots({
      date: MONDAY,
      durationMinutes: 60,
      rules,
      booked: [{ id: 'a', status: 'confirmed', startsAt: r.start, endsAt: r.end }],
      now: NOW,
    });
    const state = (t: string) => slots.find((s) => s.time === t)?.state;
    expect(open).toBe(true);
    expect(state('07:30')).toBe('after_hours');
    expect(state('08:00')).toBe('busy'); // termina 09:00 e precisa de 30 min de deslocamento
    expect(state('09:30')).toBe('busy');
    expect(state('10:30')).toBe('available');
    expect(state('11:30')).toBe('break');
    expect(state('17:30')).toBe('after_hours');
  });
});
