import { WEEKDAY_LABELS } from '@orts/backend/contracts';
import { formatHour } from './format';

type Hours = { weekday: number; start: string; end: string };

/** Agrupa dias consecutivos com o mesmo horário: "Segunda a sexta · 8h às 18h". */
export function groupHours(hours: Hours[]): { days: string; time: string }[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const sorted = [...hours].sort((a, b) => order.indexOf(a.weekday) - order.indexOf(b.weekday));
  const groups: { days: number[]; start: string; end: string }[] = [];
  for (const h of sorted) {
    const last = groups[groups.length - 1];
    const prevDay = last?.days[last.days.length - 1];
    const consecutive = prevDay !== undefined && order.indexOf(h.weekday) === order.indexOf(prevDay) + 1;
    if (last && consecutive && last.start === h.start && last.end === h.end) last.days.push(h.weekday);
    else groups.push({ days: [h.weekday], start: h.start, end: h.end });
  }
  return groups.map((g) => {
    const first = WEEKDAY_LABELS[g.days[0]!]!;
    const lastDay = WEEKDAY_LABELS[g.days[g.days.length - 1]!]!;
    const days =
      g.days.length === 1 ? first : g.days.length === 2 ? `${first} e ${lastDay.toLowerCase()}` : `${first} a ${lastDay.toLowerCase()}`;
    return { days, time: `${formatHour(g.start)} às ${formatHour(g.end)}` };
  });
}
