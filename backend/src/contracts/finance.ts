import { z } from 'zod';
import { isoDateSchema, optionalText } from './common';

export const FINANCE_KINDS = ['income', 'expense'] as const;
export type FinanceKind = (typeof FINANCE_KINDS)[number];

export const FINANCE_STATUSES = ['paid', 'pending'] as const;
export type FinanceStatus = (typeof FINANCE_STATUSES)[number];

export const PAYMENT_METHODS = ['pix', 'cash', 'debit_card', 'credit_card', 'bank_transfer', 'boleto', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const FINANCE_KIND_LABELS: Record<FinanceKind, string> = { income: 'Entrada', expense: 'Saída' };

/** Rótulo da situação conforme o tipo: "Recebido / A receber" ou "Pago / A pagar". */
export const FINANCE_STATUS_LABELS: Record<FinanceKind, Record<FinanceStatus, string>> = {
  income: { paid: 'Recebido', pending: 'A receber' },
  expense: { paid: 'Pago', pending: 'A pagar' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  debit_card: 'Cartão de débito',
  credit_card: 'Cartão de crédito',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
  other: 'Outro',
};

/** Limite de faturamento do MEI vigente em 2026 (LC 123/2006); muda para R$ 110 mil em 2027 (LC 238/2026). */
export const MEI_DEFAULT_LIMIT_CENTS = 8_100_000;

/** Maior valor aceito em um lançamento: R$ 1.000.000,00. */
export const MAX_AMOUNT_CENTS = 100_000_000;

const amountCentsSchema = z
  .number({ error: 'Informe o valor.' })
  .int('Valor inválido.')
  .positive('Informe um valor maior que zero.')
  .max(MAX_AMOUNT_CENTS, 'Valor acima do permitido.');

const descriptionSchema = z.string({ error: 'Descreva o lançamento.' }).trim().min(2, 'Descreva o lançamento.').max(120, 'Use no máximo 120 caracteres.');

export const financeEntryInputSchema = z.object({
  kind: z.enum(FINANCE_KINDS, { error: 'Escolha entrada ou saída.' }),
  description: descriptionSchema,
  amountCents: amountCentsSchema,
  categoryId: z.uuid('Escolha a categoria.'),
  date: isoDateSchema,
  status: z.enum(FINANCE_STATUSES).default('paid'),
  paymentMethod: z.enum(PAYMENT_METHODS).nullish().transform((v) => v ?? null),
  appointmentId: z.uuid('Atendimento inválido.').nullish().transform((v) => v ?? null),
  notes: optionalText(500),
});

/** Atualização parcial: só os campos enviados mudam (sem valores padrão). */
export const financeEntryUpdateSchema = z
  .object({
    kind: z.enum(FINANCE_KINDS),
    description: descriptionSchema,
    amountCents: amountCentsSchema,
    categoryId: z.uuid('Escolha a categoria.'),
    date: isoDateSchema,
    status: z.enum(FINANCE_STATUSES),
    paymentMethod: z.enum(PAYMENT_METHODS).nullable(),
    appointmentId: z.uuid('Atendimento inválido.').nullable(),
    notes: optionalText(500),
  })
  .partial();

export const financeListQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  kind: z.enum(FINANCE_KINDS).optional(),
  status: z.enum(['paid', 'pending', 'overdue']).optional(),
  categoryId: z.uuid().optional(),
  appointmentId: z.uuid().optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
});

export const financeMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido (use AAAA-MM).');
export const financeSummaryQuerySchema = z.object({ month: financeMonthSchema.optional() });
export const financeExportQuerySchema = z.object({ from: isoDateSchema, to: isoDateSchema });

export const financeCategoryInputSchema = z.object({
  kind: z.enum(FINANCE_KINDS),
  name: z.string({ error: 'Informe o nome da categoria.' }).trim().min(2, 'Informe o nome da categoria.').max(60),
});

export const financeCategoryUpdateSchema = z
  .object({
    name: z.string().trim().min(2, 'Informe o nome da categoria.').max(60),
    archived: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
  })
  .partial();

export type FinanceEntryInput = z.input<typeof financeEntryInputSchema>;
export type FinanceEntryUpdateInput = z.input<typeof financeEntryUpdateSchema>;
export type FinanceListQuery = z.input<typeof financeListQuerySchema>;
export type FinanceCategoryInput = z.input<typeof financeCategoryInputSchema>;
export type FinanceCategoryUpdateInput = z.input<typeof financeCategoryUpdateSchema>;

export type FinanceCategoryDTO = {
  id: string;
  kind: FinanceKind;
  name: string;
  archived: boolean;
  sortOrder: number;
  entriesCount: number;
};

export type FinanceEntryDTO = {
  id: string;
  kind: FinanceKind;
  description: string;
  amountCents: number;
  category: { id: string; name: string };
  date: string;
  status: FinanceStatus;
  /** Pendente com data anterior a hoje. */
  overdue: boolean;
  paymentMethod: PaymentMethod | null;
  appointment: { id: string; clientName: string; date: string; startTime: string; serviceName: string } | null;
  notes: string | null;
  createdAt: string;
};

export type FinanceListDTO = {
  items: FinanceEntryDTO[];
  total: number;
  page: number;
  pageSize: number;
  totals: { incomePaidCents: number; expensePaidCents: number; incomePendingCents: number; expensePendingCents: number };
};

export type FinanceMonthPoint = { month: string; incomeCents: number; expenseCents: number };

export type FinanceSummaryDTO = {
  month: string;
  income: { paidCents: number; pendingCents: number; overdueCents: number; overdueCount: number; previousPaidCents: number };
  expense: { paidCents: number; pendingCents: number; overdueCents: number; overdueCount: number; previousPaidCents: number };
  resultCents: number;
  /**
   * Mês em andamento: as variações (previousPaidCents) comparam com o mês anterior só até este dia.
   * Nulo quando a comparação é com o mês anterior inteiro.
   */
  previousThroughDay: number | null;
  /** Resultado do mês anterior inteiro. */
  previousResultCents: number;
  /** Média recebida por atendimento no mês (entradas pagas vinculadas a atendimentos). */
  averageTicketCents: number | null;
  paidAppointments: number;
  /** Últimos 12 meses, do mais antigo ao mês escolhido. */
  months: FinanceMonthPoint[];
  expensesByCategory: { categoryId: string; name: string; amountCents: number }[];
  incomeByService: { name: string; amountCents: number; count: number }[];
  incomeByMethod: { method: PaymentMethod | 'unknown'; amountCents: number }[];
  /** Acompanhamento do limite anual do MEI; nulo quando desligado nas configurações. */
  mei: { year: number; limitCents: number; incomeCents: number; projectedCents: number } | null;
  /** Pendências vencidas ou que vencem nos próximos 7 dias (até 8). */
  upcoming: FinanceEntryDTO[];
};
