import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { APPOINTMENT_STATUSES } from '../contracts/appointments';
import type { ServiceColor } from '../contracts/services';
import type { BreakWindow, DayHours } from '../contracts/settings';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const appointmentStatusEnum = pgEnum('appointment_status', APPOINTMENT_STATUSES);

/** Usuários do painel (inicialmente apenas o proprietário). Sem cadastro público. */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('users_email_unique').on(sql`lower(${t.email})`)],
);

/** Sessões persistentes. O id é o SHA-256 do token (o token em si nunca é salvo). */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
);

/** Tentativas de login com falha (limitação de força bruta). Chaves são hashes. */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_attempts_key_time_idx').on(t.key, t.attemptedAt)],
);

/** Tipos de serviço com duração padrão (configuráveis pelo proprietário). */
export const serviceTypes = pgTable(
  'service_types',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    durationMinutes: integer('duration_minutes').notNull(),
    color: text('color').$type<ServiceColor>().notNull().default('slate'),
    active: boolean('active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('service_types_name_unique').on(sql`lower(${t.name})`),
    check('service_types_duration_check', sql`${t.durationMinutes} between 15 and 720`),
  ],
);

/**
 * Agendamentos. A ausência de sobreposição entre atendimentos ativos é garantida
 * também no banco por uma EXCLUDE constraint (ver migration 0001).
 */
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientName: text('client_name').notNull(),
    clientPhone: text('client_phone').notNull(),
    serviceTypeId: uuid('service_type_id')
      .notNull()
      .references(() => serviceTypes.id, { onDelete: 'restrict' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    address: text('address').notNull(),
    neighborhood: text('neighborhood').notNull(),
    city: text('city').notNull().default('Jaraguá do Sul'),
    notes: text('notes'),
    status: appointmentStatusEnum('status').notNull().default('pending'),
    outsideBusinessHours: boolean('outside_business_hours').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('appointments_starts_at_idx').on(t.startsAt),
    index('appointments_status_starts_idx').on(t.status, t.startsAt),
    index('appointments_service_type_idx').on(t.serviceTypeId),
    check('appointments_time_check', sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

/** Configurações da agenda e dados comerciais (linha única, id = 1). */
export const scheduleSettings = pgTable(
  'schedule_settings',
  {
    id: smallint('id').primaryKey().default(1),
    timezone: text('timezone').notNull().default('America/Sao_Paulo'),
    weeklyHours: jsonb('weekly_hours').$type<DayHours[]>().notNull(),
    breaks: jsonb('breaks').$type<BreakWindow[]>().notNull().default([]),
    defaultDurationMinutes: integer('default_duration_minutes').notNull().default(90),
    bufferMinutes: integer('buffer_minutes').notNull().default(30),
    minAdvanceMinutes: integer('min_advance_minutes').notNull().default(60),
    slotIntervalMinutes: integer('slot_interval_minutes').notNull().default(30),
    businessName: text('business_name').notNull().default('ORTS Climatização'),
    businessPhone: text('business_phone'),
    businessWhatsapp: text('business_whatsapp'),
    businessEmail: text('business_email'),
    businessAddress: text('business_address'),
    serviceArea: text('service_area'),
    confirmationTemplate: text('confirmation_template').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('schedule_settings_singleton', sql`${t.id} = 1`)],
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type ServiceTypeRow = typeof serviceTypes.$inferSelect;
export type AppointmentRow = typeof appointments.$inferSelect;
export type SettingsRow = typeof scheduleSettings.$inferSelect;
