import { z } from 'zod';
import { optionalText } from './common';

/** Tons disponíveis para identificar serviços na agenda (mapeados para tokens da identidade visual). */
export const SERVICE_COLORS = ['slate', 'teal', 'champagne', 'sage', 'clay', 'navy'] as const;
export type ServiceColor = (typeof SERVICE_COLORS)[number];

export const serviceInputSchema = z.object({
  name: z.string({ error: 'Informe o nome do serviço.' }).trim().min(2, 'Informe o nome do serviço.').max(80),
  description: optionalText(200),
  durationMinutes: z
    .number({ error: 'Informe a duração.' })
    .int()
    .min(15, 'Duração mínima de 15 minutos.')
    .max(720, 'Duração máxima de 12 horas.'),
  color: z.enum(SERVICE_COLORS).default('slate'),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const serviceUpdateSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome do serviço.').max(80),
    description: optionalText(200),
    durationMinutes: z.number().int().min(15, 'Duração mínima de 15 minutos.').max(720, 'Duração máxima de 12 horas.'),
    color: z.enum(SERVICE_COLORS),
    active: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
  })
  .partial();

export type ServiceInput = z.input<typeof serviceInputSchema>;
export type ServiceUpdateInput = z.input<typeof serviceUpdateSchema>;

export type ServiceTypeDTO = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  color: ServiceColor;
  active: boolean;
  sortOrder: number;
};
