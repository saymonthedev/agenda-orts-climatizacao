import { eq } from 'drizzle-orm';
import type { PublicProfileDTO, SettingsDTO } from '../../contracts/settings';
import { settingsInputSchema } from '../../contracts/settings';
import type { Database } from '../../database/client';
import { scheduleSettings, type SettingsRow } from '../../database/schema';
import type { ScheduleRules } from '../../domain/scheduling';
import type { z } from 'zod';

type SettingsParsed = z.output<typeof settingsInputSchema>;

const DEFAULT_ROW = {
  id: 1,
  weeklyHours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    enabled: weekday >= 1 && weekday <= 6,
    start: '08:00',
    end: weekday === 6 ? '12:00' : '18:00',
  })),
  breaks: [{ start: '12:00', end: '13:30', label: 'Almoço' }],
  businessAddress: 'Vila Nova, Jaraguá do Sul - SC',
  confirmationTemplate:
    'Olá, {cliente}! Aqui é da {empresa}. Confirmando seu atendimento de {servico} em {data}, às {horario}, no endereço {endereco}.',
};

/** Lê a linha única de configurações (cria com valores padrão se ainda não existir). */
export async function getSettingsRow(db: Database): Promise<SettingsRow> {
  const [row] = await db.select().from(scheduleSettings).where(eq(scheduleSettings.id, 1)).limit(1);
  if (row) return row;
  const [created] = await db.insert(scheduleSettings).values(DEFAULT_ROW).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(scheduleSettings).where(eq(scheduleSettings.id, 1)).limit(1);
  if (!again) throw new Error('Configurações da agenda indisponíveis.');
  return again;
}

export function toSettingsDTO(row: SettingsRow): SettingsDTO {
  return {
    timezone: row.timezone,
    weeklyHours: [...row.weeklyHours].sort((a, b) => a.weekday - b.weekday),
    breaks: row.breaks,
    defaultDurationMinutes: row.defaultDurationMinutes,
    bufferMinutes: row.bufferMinutes,
    minAdvanceMinutes: row.minAdvanceMinutes,
    slotIntervalMinutes: row.slotIntervalMinutes,
    businessName: row.businessName,
    businessPhone: row.businessPhone,
    businessWhatsapp: row.businessWhatsapp,
    businessEmail: row.businessEmail,
    businessAddress: row.businessAddress,
    serviceArea: row.serviceArea,
    instagramUrl: row.instagramUrl,
    showHoursOnSite: row.showHoursOnSite,
    confirmationTemplate: row.confirmationTemplate,
    meiAnnualLimitCents: row.meiAnnualLimitCents,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPublicProfile(row: SettingsRow): PublicProfileDTO {
  return {
    businessName: row.businessName,
    whatsapp: row.businessWhatsapp,
    phone: row.businessPhone,
    email: row.businessEmail,
    address: row.businessAddress,
    serviceArea: row.serviceArea,
    instagramUrl: row.instagramUrl,
    hours: row.showHoursOnSite
      ? [...row.weeklyHours]
          .filter((d) => d.enabled)
          .sort((a, b) => a.weekday - b.weekday)
          .map(({ weekday, start, end }) => ({ weekday, start, end }))
      : null,
  };
}

export function toRules(row: SettingsRow): ScheduleRules {
  return {
    timezone: row.timezone,
    weeklyHours: row.weeklyHours,
    breaks: row.breaks,
    bufferMinutes: row.bufferMinutes,
    minAdvanceMinutes: row.minAdvanceMinutes,
    slotIntervalMinutes: row.slotIntervalMinutes,
    defaultDurationMinutes: row.defaultDurationMinutes,
  };
}

export async function getScheduleRules(db: Database): Promise<ScheduleRules> {
  return toRules(await getSettingsRow(db));
}

export async function updateSettings(db: Database, input: SettingsParsed): Promise<SettingsDTO> {
  await getSettingsRow(db);
  const [row] = await db
    .update(scheduleSettings)
    .set({
      weeklyHours: [...input.weeklyHours].sort((a, b) => a.weekday - b.weekday),
      breaks: [...input.breaks].sort((a, b) => a.start.localeCompare(b.start)),
      defaultDurationMinutes: input.defaultDurationMinutes,
      bufferMinutes: input.bufferMinutes,
      minAdvanceMinutes: input.minAdvanceMinutes,
      slotIntervalMinutes: input.slotIntervalMinutes,
      businessName: input.businessName,
      businessPhone: input.businessPhone,
      businessWhatsapp: input.businessWhatsapp,
      businessEmail: input.businessEmail,
      businessAddress: input.businessAddress,
      serviceArea: input.serviceArea,
      instagramUrl: input.instagramUrl,
      showHoursOnSite: input.showHoursOnSite,
      confirmationTemplate: input.confirmationTemplate,
      ...(input.meiAnnualLimitCents !== undefined ? { meiAnnualLimitCents: input.meiAnnualLimitCents } : {}),
      updatedAt: new Date(),
    })
    .where(eq(scheduleSettings.id, 1))
    .returning();
  if (!row) throw new Error('Falha ao salvar as configurações.');
  return toSettingsDTO(row);
}
