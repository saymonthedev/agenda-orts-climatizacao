import { z } from 'zod';
import { minutesFromTime, optionalPhoneSchema, optionalText, timeSchema } from './common';

export const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const;
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const SLOT_INTERVALS = [10, 15, 20, 30, 45, 60] as const;

export const dayHoursSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    start: timeSchema,
    end: timeSchema,
  })
  .refine((d) => !d.enabled || minutesFromTime(d.start) < minutesFromTime(d.end), {
    message: 'O horário de início deve ser antes do término.',
    path: ['end'],
  });

export const breakSchema = z
  .object({
    start: timeSchema,
    end: timeSchema,
    label: z.string().trim().max(40).default('Pausa'),
  })
  .refine((b) => minutesFromTime(b.start) < minutesFromTime(b.end), {
    message: 'A pausa deve terminar depois de começar.',
    path: ['end'],
  });

export const settingsInputSchema = z.object({
  weeklyHours: z
    .array(dayHoursSchema)
    .length(7)
    .refine((days) => new Set(days.map((d) => d.weekday)).size === 7, 'Informe os sete dias da semana.'),
  breaks: z.array(breakSchema).max(6, 'Cadastre no máximo 6 pausas.'),
  defaultDurationMinutes: z.number().int().min(15).max(720),
  bufferMinutes: z.number().int().min(0).max(240),
  minAdvanceMinutes: z.number().int().min(0).max(10080),
  slotIntervalMinutes: z
    .number()
    .int()
    .refine((v) => (SLOT_INTERVALS as readonly number[]).includes(v), 'Intervalo inválido.'),
  businessName: z.string().trim().min(2, 'Informe o nome da empresa.').max(80),
  businessPhone: optionalPhoneSchema,
  businessWhatsapp: optionalPhoneSchema,
  businessEmail: z
    .string()
    .trim()
    .max(160)
    .nullish()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, 'E-mail inválido.'),
  businessAddress: optionalText(200),
  serviceArea: optionalText(200),
  instagramUrl: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(v), 'Informe o link completo do perfil (https://instagram.com/...).'),
  showHoursOnSite: z.boolean().default(false),
  confirmationTemplate: z
    .string()
    .trim()
    .min(10, 'Escreva uma mensagem de confirmação.')
    .max(800, 'Use no máximo 800 caracteres.'),
});

export type DayHours = z.infer<typeof dayHoursSchema>;
export type BreakWindow = z.infer<typeof breakSchema>;
export type SettingsInput = z.input<typeof settingsInputSchema>;

export type SettingsDTO = z.infer<typeof settingsInputSchema> & {
  timezone: string;
  updatedAt: string;
};

/** Dados comerciais exibidos no site público (preenchidos pelo proprietário no painel). */
export type PublicProfileDTO = {
  businessName: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  serviceArea: string | null;
  instagramUrl: string | null;
  hours: { weekday: number; start: string; end: string }[] | null;
};

/** Variáveis aceitas no modelo de mensagem de confirmação. */
export const TEMPLATE_VARIABLES = ['{cliente}', '{servico}', '{data}', '{horario}', '{endereco}', '{empresa}'] as const;
