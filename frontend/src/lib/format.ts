/** Formata dígitos de telefone para exibição: (47) 99999-9999. */
export function formatPhone(digits: string | null | undefined): string {
  if (!digits) return '';
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

const TZ = 'America/Sao_Paulo';

const toDate = (date: string) => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, 12));
};

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...options });

/** "terça-feira, 11 de novembro" */
export const formatLongDate = (date: string) => fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(toDate(date));
/** "11 de nov." */
export const formatShortDate = (date: string) => fmt({ day: 'numeric', month: 'short' }).format(toDate(date));
/** "11/11/2026" */
export const formatNumericDate = (date: string) => fmt({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(toDate(date));
/** "ter" */
/** "13/11" */
export const formatDayMonth = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
export const formatWeekdayShort = (date: string) => fmt({ weekday: 'short' }).format(toDate(date)).replace('.', '');
/** "novembro de 2026" */
export const formatMonthYear = (date: string) => fmt({ month: 'long', year: 'numeric' }).format(toDate(date));

/** Tempo desde um mês (AAAA-MM), como o Google mostra: "há 7 meses", "há 1 ano". */
export function relativeMonth(month: string, today: string = todayISO()): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const [ty, tm] = today.split('-').map(Number) as [number, number];
  const months = (ty - y) * 12 + (tm - m);
  if (months <= 0) return 'este mês';
  if (months < 12) return months === 1 ? 'há 1 mês' : `há ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'há 1 ano' : `há ${years} anos`;
}

export const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** "08:00" -> "8h", "08:30" -> "8h30" */
export function formatHour(time: string): string {
  const [h, m] = time.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
}

export function formatDurationLabel(minutes: number): string {
  if (minutes >= 24 * 60) {
    const days = Math.floor(minutes / (24 * 60));
    const rest = minutes % (24 * 60);
    return `${days} ${days === 1 ? 'dia' : 'dias'}${rest ? ` e ${formatDurationLabel(rest)}` : ''}`;
  }
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Data de hoje (AAAA-MM-DD) no fuso da empresa. */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parts;
}

/** Minutos desde a meia-noite (fuso da empresa). */
export function nowMinutes(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  const [h, m] = parts.split(':').map(Number) as [number, number];
  return h * 60 + m;
}

export function addDays(date: string, days: number): string {
  const d = toDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return toDate(date).getUTCDay();
}

export function startOfWeek(date: string): string {
  const wd = weekdayOf(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function daysInMonth(date: string): number {
  const [y, m] = date.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addMonths(date: string, months: number): string {
  const [y, m] = date.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  return d.toISOString().slice(0, 10);
}

export const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return h * 60 + m;
};

export const timeOf = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
