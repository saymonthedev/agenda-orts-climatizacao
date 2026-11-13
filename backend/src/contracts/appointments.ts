import { z } from 'zod';
import { isoDateSchema, normalizePhone, optionalPhoneSchema, optionalText, timeSchema } from './common';
import type { ServiceColor } from './services';

export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

/** Status que ocupam a agenda (impedem conflitos). */
export const ACTIVE_STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed'];

const statusSchema = z.enum(APPOINTMENT_STATUSES, { error: 'Status inválido.' });

/** Um atendimento pode começar num dia e terminar em outro (até 14 dias). */
export const MAX_APPOINTMENT_MINUTES = 14 * 24 * 60;

/** Na edição: campo ausente não muda; campo vazio apaga. */
const clearableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

const clearablePhone = z
  .string()
  .trim()
  .max(30)
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v ? normalizePhone(v) : null))
  .refine((d) => d == null || d.length === 10 || d.length === 11, 'Telefone inválido. Use DDD + número.');

/**
 * Só nome, serviço, data e horário são obrigatórios: telefone, endereço, bairro e cidade
 * podem ficar em branco quando o cliente ainda não mandou tudo (dá para completar depois).
 */
const baseFields = {
  clientName: z
    .string({ error: 'Informe o nome do cliente.' })
    .trim()
    .min(2, 'Informe o nome do cliente.')
    .max(120, 'Use no máximo 120 caracteres.'),
  clientPhone: optionalPhoneSchema,
  serviceTypeId: z.uuid('Selecione o tipo de serviço.'),
  date: isoDateSchema,
  startTime: timeSchema,
  durationMinutes: z
    .number({ error: 'Informe a duração.' })
    .int()
    .min(15, 'Duração mínima de 15 minutos.')
    .max(MAX_APPOINTMENT_MINUTES, 'Duração máxima de 14 dias.'),
  address: optionalText(200),
  neighborhood: optionalText(80),
  city: optionalText(80),
  notes: optionalText(2000),
};

export const appointmentCreateSchema = z.object({
  ...baseFields,
  city: baseFields.city.default('Jaraguá do Sul'),
  status: statusSchema.default('pending'),
  /** Confirma o registro fora do expediente/antecedência configurados (encaixe). */
  allowOutsideHours: z.boolean().default(false),
});

export const appointmentUpdateSchema = z.object({
  clientName: baseFields.clientName.optional(),
  clientPhone: clearablePhone,
  serviceTypeId: baseFields.serviceTypeId.optional(),
  date: baseFields.date.optional(),
  startTime: baseFields.startTime.optional(),
  durationMinutes: baseFields.durationMinutes.optional(),
  address: clearableText(200),
  neighborhood: clearableText(80),
  city: clearableText(80),
  notes: clearableText(2000),
  status: statusSchema.optional(),
  allowOutsideHours: z.boolean().optional(),
});

export const statusUpdateSchema = z.object({ status: statusSchema });

export const appointmentListQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []))
    .pipe(z.array(statusSchema)),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  order: z.enum(['asc', 'desc']).default('asc'),
});

export type AppointmentCreateInput = z.input<typeof appointmentCreateSchema>;
export type AppointmentUpdateInput = z.input<typeof appointmentUpdateSchema>;
export type AppointmentListQuery = z.input<typeof appointmentListQuerySchema>;

export type AppointmentDTO = {
  id: string;
  clientName: string;
  /** Telefone, endereço, bairro e cidade: null quando ainda não foram informados. */
  clientPhone: string | null;
  serviceType: { id: string; name: string; color: ServiceColor };
  startsAt: string;
  endsAt: string;
  /** Data/horários no fuso da empresa */
  date: string;
  startTime: string;
  /** Data do término (igual a `date` quando termina no mesmo dia) */
  endDate: string;
  endTime: string;
  durationMinutes: number;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  notes: string | null;
  status: AppointmentStatus;
  outsideBusinessHours: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
};

/** Motivos de violação das regras de agenda (configurações). */
export type ScheduleViolationCode = 'CLOSED_DAY' | 'OUTSIDE_HOURS' | 'OVERLAPS_BREAK' | 'TOO_SOON';

export type ScheduleViolation = { code: ScheduleViolationCode; message: string };

export type ConflictSummary = {
  id: string;
  clientName: string;
  startTime: string;
  endTime: string;
  date: string;
};

const shiftDate = (date: string, days: number): string => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

type DatedAppointment = Pick<AppointmentDTO, 'date' | 'endDate' | 'endTime'>;

/** Último dia ocupado pelo atendimento (terminar exatamente à meia-noite conta como o dia anterior). */
export function lastDateOf(a: DatedAppointment): string {
  return a.endTime === '00:00' && a.endDate > a.date ? shiftDate(a.endDate, -1) : a.endDate;
}

/** O atendimento ocupa mais de um dia de calendário. */
export const isMultiDay = (a: DatedAppointment): boolean => lastDateOf(a) !== a.date;

/** O atendimento ocupa a data informada (inclusive dias intermediários). */
export const coversDate = (a: DatedAppointment, date: string): boolean => a.date <= date && lastDateOf(a) >= date;

/** Todos os dias ocupados, do início ao término. */
export function datesOf(a: DatedAppointment): string[] {
  const last = lastDateOf(a);
  const out: string[] = [];
  for (let d = a.date; d <= last && out.length < 32; d = shiftDate(d, 1)) out.push(d);
  return out;
}
