/** Valores em reais (sempre guardados em centavos inteiros). */

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PLAIN = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "R$ 1.234,56" (com espaço comum, para não quebrar layouts que medem texto). */
export const formatBRL = (cents: number) => BRL.format(cents / 100).replace(/ /g, ' ');

/** "+ R$ 120,00" / "− R$ 80,00". */
export const formatSignedBRL = (cents: number) => `${cents < 0 ? '−' : '+'} ${formatBRL(Math.abs(cents))}`;

/** Versão curta para eixos e chips: "R$ 850", "R$ 2 mil", "R$ 1,5 mil". */
export function formatCompactBRL(cents: number): string {
  const reais = cents / 100;
  const sign = reais < 0 ? '−' : '';
  const abs = Math.abs(reais);
  if (abs >= 1000) return `${sign}R$ ${(abs / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `${sign}R$ ${Math.round(abs).toLocaleString('pt-BR')}`;
}

/** Texto do campo de valor: "1.234,56" (vazio quando não há valor). */
export const formatMoneyInput = (cents: number | null | undefined) => (cents == null ? '' : PLAIN.format(cents / 100));

/** Converte o que foi digitado em centavos, como nos apps de banco: os dígitos entram pela direita. */
export function digitsToCents(text: string, maxCents = 100_000_000): number | null {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return null;
  return Math.min(Number(digits.slice(0, 12)), maxCents);
}

/** Mês atual no formato AAAA-MM. */
export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

/** Desloca um mês (AAAA-MM) por n meses. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "novembro de 2026". */
export const monthLabel = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} de ${month.slice(0, 4)}`;
/** "nov". */
export const monthShort = (month: string) => MONTHS_SHORT[Number(month.slice(5, 7)) - 1] ?? '';
/** Primeiro e último dia do mês (AAAA-MM-DD). */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
}
