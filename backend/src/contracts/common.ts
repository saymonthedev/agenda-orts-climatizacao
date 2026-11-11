import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Data de calendário no formato AAAA-MM-DD (sem fuso). */
export const isoDateSchema = z
  .string({ error: 'Informe a data.' })
  .regex(ISO_DATE, 'Data inválida.')
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number) as [number, number, number];
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, 'Data inválida.');

/** Horário HH:mm (24h). */
export const timeSchema = z.string({ error: 'Informe o horário.' }).regex(HH_MM, 'Horário inválido.');

/** Normaliza telefone brasileiro para apenas dígitos (DDD + número). */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits;
}

export const phoneSchema = z
  .string({ error: 'Informe o telefone.' })
  .trim()
  .transform(normalizePhone)
  .refine((d) => d.length === 10 || d.length === 11, 'Telefone inválido. Use DDD + número.');

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(30)
  .nullish()
  .transform((v) => (v ? normalizePhone(v) : null))
  .refine((d) => d === null || d.length === 10 || d.length === 11, 'Telefone inválido. Use DDD + número.');

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .nullish()
    .transform((v) => (v ? v : null));

/** Formata dígitos de telefone para exibição: (47) 99999-9999. */
export function formatPhone(digits: string | null | undefined): string {
  if (!digits) return '';
  const d = digits.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export const minutesFromTime = (t: string): number => {
  const [h, m] = t.split(':').map(Number) as [number, number];
  return h * 60 + m;
};

export const timeFromMinutes = (total: number): string => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Corpo padrão de erro devolvido pela API. */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
