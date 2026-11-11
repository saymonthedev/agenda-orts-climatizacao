import { z } from 'zod';
import { isoDateSchema, optionalText, phoneSchema, timeSchema } from './common';
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

const baseFields = {
  clientName: z
    .string({ error: 'Informe o nome do cliente.' })
    .trim()
    .min(2, 'Informe o nome do cliente.')
    .max(120, 'Use no máximo 120 caracteres.'),
  clientPhone: phoneSchema,
  serviceTypeId: z.uuid('Selecione o tipo de serviço.'),
  date: isoDateSchema,
  startTime: timeSchema,
  durationMinutes: z
    .number({ error: 'Informe a duração.' })
    .int()
    .min(15, 'Duração mínima de 15 minutos.')
    .max(720, 'Duração máxima de 12 horas.'),
  address: z.string({ error: 'Informe o endereço.' }).trim().min(3, 'Informe o endereço.').max(200),
  neighborhood: z.string({ error: 'Informe o bairro.' }).trim().min(2, 'Informe o bairro.').max(80),
  city: z.string().trim().min(2, 'Informe a cidade.').max(80),
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
  clientPhone: baseFields.clientPhone.optional(),
  serviceTypeId: baseFields.serviceTypeId.optional(),
  date: baseFields.date.optional(),
  startTime: baseFields.startTime.optional(),
  durationMinutes: baseFields.durationMinutes.optional(),
  address: baseFields.address.optional(),
  neighborhood: baseFields.neighborhood.optional(),
  city: baseFields.city.optional(),
  notes: z
    .string()
    .trim()
    .max(2000, 'Use no máximo 2000 caracteres.')
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null)),
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
  clientPhone: string;
  serviceType: { id: string; name: string; color: ServiceColor };
  startsAt: string;
  endsAt: string;
  /** Data/horários no fuso da empresa */
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  address: string;
  neighborhood: string;
  city: string;
  notes: string | null;
  status: AppointmentStatus;
  outsideBusinessHours: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
};

/** Motivos de violação das regras de agenda (configurações). */
export type ScheduleViolationCode = 'CLOSED_DAY' | 'OUTSIDE_HOURS' | 'OVERLAPS_BREAK' | 'IN_PAST' | 'TOO_SOON' | 'CROSSES_MIDNIGHT';

export type ScheduleViolation = { code: ScheduleViolationCode; message: string };

export type ConflictSummary = {
  id: string;
  clientName: string;
  startTime: string;
  endTime: string;
  date: string;
};
