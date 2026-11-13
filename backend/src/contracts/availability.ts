import { z } from 'zod';
import { isoDateSchema } from './common';

export const availabilityQuerySchema = z.object({
  date: isoDateSchema,
  durationMinutes: z.coerce.number().int().min(15).max(14 * 24 * 60).optional(),
  excludeId: z.uuid().optional(),
});

export type SlotState = 'available' | 'busy' | 'break' | 'past' | 'too_soon' | 'after_hours';

export type AvailabilitySlot = {
  time: string;
  endTime: string;
  state: SlotState;
};

export type AvailabilityDTO = {
  date: string;
  open: boolean;
  hours: { start: string; end: string } | null;
  breaks: { start: string; end: string; label: string }[];
  durationMinutes: number;
  bufferMinutes: number;
  slots: AvailabilitySlot[];
};
