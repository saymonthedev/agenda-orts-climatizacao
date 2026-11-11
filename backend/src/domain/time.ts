import { TZDate } from '@date-fns/tz';

/** Fuso padrão da empresa (Jaraguá do Sul/SC). */
export const BUSINESS_TIMEZONE = 'America/Sao_Paulo';

const pad = (n: number) => String(n).padStart(2, '0');

/** Converte data + horário locais (no fuso informado) em um instante absoluto. */
export function zonedInstant(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(new TZDate(y, m - 1, d, hh, mm, 0, 0, timeZone).getTime());
}

export type ZonedParts = {
  date: string;
  time: string;
  weekday: number;
  minutes: number;
};

/** Decompõe um instante nas partes locais do fuso informado. */
export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const z = new TZDate(instant.getTime(), timeZone);
  const hours = z.getHours();
  const minutes = z.getMinutes();
  return {
    date: `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`,
    time: `${pad(hours)}:${pad(minutes)}`,
    weekday: z.getDay(),
    minutes: hours * 60 + minutes,
  };
}

/** Soma dias a uma data de calendário (AAAA-MM-DD). */
export function addDaysToDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Dia da semana (0 = domingo) de uma data de calendário. */
export function weekdayOfDate(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Intervalo [início, fim) de um dia de calendário no fuso informado. */
export function dayBounds(date: string, timeZone: string): { start: Date; end: Date } {
  return {
    start: zonedInstant(date, '00:00', timeZone),
    end: zonedInstant(addDaysToDate(date, 1), '00:00', timeZone),
  };
}

/** Data de hoje no fuso informado. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return zonedParts(now, timeZone).date;
}

/** Segunda-feira da semana da data informada. */
export function startOfWeekMonday(date: string): string {
  const wd = weekdayOfDate(date);
  const diff = wd === 0 ? -6 : 1 - wd;
  return addDaysToDate(date, diff);
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: string): string {
  const [y, m] = date.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${date.slice(0, 7)}-${pad(last)}`;
}

export function diffMinutes(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}
