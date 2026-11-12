'use client';

import type { FinanceEntryDTO, FinanceSummaryDTO } from '@orts/backend/contracts';
import { FINANCE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@orts/backend/contracts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, Minus, Plus, Search, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TextField } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { useFinanceEntries, useFinanceSummary, useSaveFinanceEntry } from '@/hooks/admin/queries';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { capitalize, formatLongDate, todayISO } from '@/lib/format';
import { formatBRL, formatCompactBRL, formatSignedBRL, monthLabel, monthOf, monthRange, shiftMonth } from '@/lib/money';
import { useAdminUI } from './admin-ui';
import { CashflowChart, RankedBars } from './finance-charts';
import { PageHeader } from './shell';

export function FinanceScreen() {
  const today = todayISO();
  const [month, setMonth] = useState(monthOf(today));
  const summary = useFinanceSummary(month);
  const { openEntry } = useAdminUI();

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Entradas, saídas e o que falta receber, mês a mês."
        actions={
          <>
            <Button variant="secondary" onClick={() => openEntry({ defaults: { kind: 'expense' } })}>
              <Minus className="size-4" aria-hidden="true" /> Nova saída
            </Button>
            <Button variant="dark" onClick={() => openEntry({ defaults: { kind: 'income' } })}>
              <Plus className="size-4" aria-hidden="true" /> Nova entrada
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-5 px-4 pb-12 sm:px-6 lg:px-10">
        <MonthSwitcher month={month} onChange={setMonth} isCurrent={month === monthOf(today)} />
        {summary.data ? (
          <SummaryBlocks summary={summary.data} onSelectMonth={setMonth} />
        ) : (
          <div className="grid gap-4">
            <Skeleton className="h-28" />
            <Skeleton className="h-64" />
          </div>
        )}
        <EntriesSection month={month} />
      </div>
    </>
  );
}

function MonthSwitcher({ month, onChange, isCurrent }: { month: string; onChange: (m: string) => void; isCurrent: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="icon-sm" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mês anterior">
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>
      <p className="min-w-[11rem] text-center text-[16px] font-semibold text-ink" aria-live="polite">
        {capitalize(monthLabel(month))}
      </p>
      <Button variant="secondary" size="icon-sm" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Próximo mês">
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={() => onChange(monthOf(todayISO()))}>
          Mês atual
        </Button>
      )}
    </div>
  );
}

function delta(current: number, previous: number) {
  if (!previous) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct, up: pct >= 0 };
}

function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  const d = delta(current, previous);
  if (!d) return <p className="mt-1 text-[12px] text-subtle">Sem base para comparar</p>;
  const Icon = d.up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[12px] text-muted">
      <span className="flex items-center gap-1">
        <Icon className="size-3.5" aria-hidden="true" />
        <span className="tabular font-semibold text-ink-soft">{`${d.up ? '+' : ''}${d.pct}%`}</span>
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </p>
  );
}

function Tile({ label, dot, value, children }: { label: string; dot?: 'in' | 'out'; value: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <p className="flex items-center gap-2 text-[13px] font-medium text-muted">
        {dot && <span aria-hidden="true" className={cn('size-2.5 rounded-full', dot === 'in' ? 'bg-fin-in' : 'bg-fin-out')} />}
        {label}
      </p>
      <p className="tabular mt-2 text-[1.35rem] font-semibold leading-none tracking-[-0.01em] text-ink">{value}</p>
      {children}
    </div>
  );
}

function SummaryBlocks({ summary: s, onSelectMonth }: { summary: FinanceSummaryDTO; onSelectMonth: (m: string) => void }) {
  const name = monthLabel(s.month).split(' ')[0];
  const prevMonth = shiftMonth(s.month, -1);
  const prevName = monthLabel(prevMonth).split(' ')[0] ?? '';
  const compareLabel = s.previousThroughDay ? `vs 1 a ${s.previousThroughDay} de ${prevName.slice(0, 3)}.` : `vs ${prevName}`;
  const prevClosed = prevMonth < monthOf(todayISO());
  const overdue = s.income.overdueCount + s.expense.overdueCount;
  const negative = s.resultCents < 0;

  return (
    <>
      {overdue > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-status-pending/35 bg-status-pending-bg px-4 py-3 text-[14px] text-status-pending-fg">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Contas vencidas: </span>
            {s.income.overdueCount > 0 && `${s.income.overdueCount} a receber (${formatBRL(s.income.overdueCents)})`}
            {s.income.overdueCount > 0 && s.expense.overdueCount > 0 && ' · '}
            {s.expense.overdueCount > 0 && `${s.expense.overdueCount} a pagar (${formatBRL(s.expense.overdueCents)})`}. Veja em “Vencimentos” abaixo.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="col-span-2 rounded-lg bg-navy-900 p-5 text-porcelain on-dark lg:col-span-2 lg:row-span-2 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-[13px] font-medium text-porcelain/75">Resultado de {name}</p>
            <p className="tabular mt-2 text-[2.1rem] font-semibold leading-none tracking-[-0.02em]">{formatSignedBRL(s.resultCents)}</p>
            <p className="mt-2 text-[13px] text-porcelain/75">Entradas menos saídas pagas no mês.</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
            {negative ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-cancelled-bg px-2.5 py-1 font-semibold text-status-cancelled-fg">
                <ArrowDownRight className="size-3.5" aria-hidden="true" /> Mês no vermelho
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-completed-bg px-2.5 py-1 font-semibold text-status-completed-fg">
                <ArrowUpRight className="size-3.5" aria-hidden="true" /> Mês no azul
              </span>
            )}
            <span className="text-porcelain/75">
              {capitalize(prevName)} {prevClosed ? 'fechou em' : 'até agora:'} <span className="tabular font-semibold text-porcelain">{formatSignedBRL(s.previousResultCents)}</span>
            </span>
          </div>
        </div>
        <Tile label="Entradas do mês" dot="in" value={formatBRL(s.income.paidCents)}>
          <Delta current={s.income.paidCents} previous={s.income.previousPaidCents} label={compareLabel} />
        </Tile>
        <Tile label="Saídas do mês" dot="out" value={formatBRL(s.expense.paidCents)}>
          <Delta current={s.expense.paidCents} previous={s.expense.previousPaidCents} label={compareLabel} />
        </Tile>
        <Tile label="A receber" value={formatBRL(s.income.pendingCents)}>
          <p className={cn('mt-1 flex items-center gap-1 text-[12px]', s.income.overdueCount ? 'font-semibold text-status-pending-fg' : 'text-subtle')}>
            {s.income.overdueCount > 0 && <AlertTriangle className="size-3.5" aria-hidden="true" />}
            {s.income.overdueCount > 0 ? `${s.income.overdueCount} vencido${s.income.overdueCount > 1 ? 's' : ''}` : 'Nada vencido'}
          </p>
        </Tile>
        <Tile label="A pagar" value={formatBRL(s.expense.pendingCents)}>
          <p className={cn('mt-1 flex items-center gap-1 text-[12px]', s.expense.overdueCount ? 'font-semibold text-status-pending-fg' : 'text-subtle')}>
            {s.expense.overdueCount > 0 && <AlertTriangle className="size-3.5" aria-hidden="true" />}
            {s.expense.overdueCount > 0 ? `${s.expense.overdueCount} vencido${s.expense.overdueCount > 1 ? 's' : ''}` : 'Nada vencido'}
          </p>
        </Tile>
        <div className="col-span-2 rounded-lg border border-line bg-paper p-4 lg:col-span-4">
          <p className="text-[13px] font-medium text-muted">Média por atendimento em {name}</p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-ink">
            <span className="tabular text-[1.35rem] font-semibold leading-none">{s.averageTicketCents != null ? formatBRL(s.averageTicketCents) : '—'}</span>
            <span className="text-[13px] text-muted">
              {s.paidAppointments ? `${s.paidAppointments} atendimento${s.paidAppointments > 1 ? 's' : ''} com pagamento registrado` : 'Registre pagamentos nos atendimentos para ver a média'}
            </span>
          </p>
        </div>
      </div>

      <CashflowChart months={s.months} selected={s.month} onSelect={onSelectMonth} />

      <div className="grid gap-5 lg:grid-cols-2">
        <RankedBars
          title={`Saídas por categoria em ${name}`}
          description="Para onde foi o dinheiro no mês."
          tone="out"
          items={s.expensesByCategory.map((c) => ({ label: c.name, amountCents: c.amountCents }))}
          empty="Nenhuma saída paga neste mês."
        />
        <RankedBars
          title={`Entradas por serviço em ${name}`}
          description="De onde veio o dinheiro no mês."
          tone="in"
          items={s.incomeByService.map((c) => ({ label: c.name, amountCents: c.amountCents, detail: `${c.count} atendimento${c.count > 1 ? 's' : ''}` }))}
          empty="Nenhuma entrada recebida neste mês."
        />
        <RankedBars
          title="Formas de recebimento"
          description="Como os clientes pagaram no mês."
          tone="in"
          items={s.incomeByMethod.map((m) => ({ label: m.method === 'unknown' ? 'Não informada' : PAYMENT_METHOD_LABELS[m.method], amountCents: m.amountCents }))}
          empty="Nenhum recebimento neste mês."
        />
        <MeiCard mei={s.mei} />
      </div>

      <Upcoming items={s.upcoming} />
    </>
  );
}

function MeiCard({ mei }: { mei: FinanceSummaryDTO['mei'] }) {
  if (!mei) {
    return (
      <section className="flex flex-col justify-center rounded-lg border border-dashed border-line-strong bg-paper p-5">
        <h2 className="text-[16px] font-semibold text-ink">Limite do MEI</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          Se a empresa for MEI, ligue o acompanhamento para ver quanto já faturou no ano e quanto ainda pode faturar.
        </p>
        <Link href="/admin/configuracoes?aba=financeiro" className="mt-3 self-start text-[14px] font-semibold text-steel-600 underline underline-offset-4 hover:text-ink">
          Ligar em Ajustes → Financeiro
        </Link>
      </section>
    );
  }
  const pct = Math.min((mei.incomeCents / mei.limitCents) * 100, 100);
  const left = mei.limitCents - mei.incomeCents;
  const over = mei.incomeCents > mei.limitCents;
  const risk = !over && mei.projectedCents > mei.limitCents;
  return (
    <section className="rounded-lg border border-line bg-paper p-4 sm:p-6" aria-labelledby="mei-title">
      <h2 id="mei-title" className="text-[16px] font-semibold text-ink">
        Limite do MEI em {mei.year}
      </h2>
      <p className="mt-1 text-[13px] text-muted">Faturamento recebido no ano, comparado ao limite anual.</p>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
        <span className="tabular text-[1.35rem] font-semibold text-ink">{formatBRL(mei.incomeCents)}</span>
        <span className="text-[13px] text-muted">de {formatBRL(mei.limitCents)}</span>
      </p>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-fin-in/15"
        role="meter"
        aria-label="Uso do limite anual do MEI"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-valuetext={`${Math.round(pct)}% do limite`}
      >
        <div className="h-full rounded-r-[4px] bg-fin-in transition-[width] duration-700" style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <p className="tabular mt-1.5 text-right text-[12px] text-subtle">{Math.round((mei.incomeCents / mei.limitCents) * 100)}% do limite</p>
      {over ? (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-status-cancelled-bg px-3 py-2 text-[13px] font-semibold text-status-cancelled-fg">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Limite ultrapassado em {formatBRL(-left)}. Converse com seu contador.
        </p>
      ) : (
        <>
          <p className="mt-3 text-[14px] text-ink-soft">
            Ainda pode faturar <span className="tabular font-semibold text-ink">{formatBRL(left)}</span> em {mei.year}.
          </p>
          {mei.projectedCents > mei.incomeCents && (
            <p className={cn('mt-1 flex items-start gap-1.5 text-[13px]', risk ? 'font-semibold text-status-pending-fg' : 'text-muted')}>
              {risk && <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />}
              <span>
                No ritmo atual, o ano fecha em cerca de <span className="tabular whitespace-nowrap">{formatCompactBRL(mei.projectedCents)}</span>
                {risk ? ', acima do limite. Converse com seu contador.' : '.'}
              </span>
            </p>
          )}
        </>
      )}
    </section>
  );
}

function dueLabel(date: string, today: string) {
  if (date === today) return 'Vence hoje';
  const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  if (days < 0) return `Venceu há ${-days} dia${-days > 1 ? 's' : ''}`;
  return days === 1 ? 'Vence amanhã' : `Vence em ${days} dias`;
}

function Upcoming({ items }: { items: FinanceEntryDTO[] }) {
  const save = useSaveFinanceEntry();
  const { openEntry } = useAdminUI();
  const today = todayISO();
  if (!items.length) return null;

  async function settle(e: FinanceEntryDTO) {
    try {
      await save.mutateAsync({ id: e.id, input: { status: 'paid', date: today } });
      toast.success(e.kind === 'income' ? 'Recebimento registrado.' : 'Pagamento registrado.', { description: `${e.description} · ${formatBRL(e.amountCents)}` });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível atualizar.');
    }
  }

  return (
    <section className="rounded-lg border border-line bg-paper" aria-labelledby="due-title">
      <div className="border-b border-line px-4 py-4 sm:px-6">
        <h2 id="due-title" className="text-[16px] font-semibold text-ink">
          Vencimentos
        </h2>
        <p className="mt-0.5 text-[13px] text-muted">Contas vencidas e as que vencem nos próximos 7 dias.</p>
      </div>
      <ul className="divide-y divide-line">
        {items.map((e) => (
          <li key={e.id} className="flex items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
            <span aria-hidden="true" className={cn('mt-[7px] size-2.5 shrink-0 rounded-full sm:mt-0', e.kind === 'income' ? 'bg-fin-in' : 'bg-fin-out')} />
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <button type="button" onClick={() => openEntry({ entry: e })} className="min-w-0 flex-1 text-left">
                <span className="block text-[15px] font-semibold leading-snug text-ink sm:truncate">{e.description}</span>
                <span className={cn('mt-0.5 flex items-center gap-1 text-[13px]', e.overdue ? 'font-semibold text-status-pending-fg' : 'text-muted')}>
                  {e.overdue && <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />}
                  {dueLabel(e.date, today)} · {FINANCE_STATUS_LABELS[e.kind].pending}
                </span>
              </button>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="tabular text-[15px] font-semibold text-ink">{formatSignedBRL(e.kind === 'income' ? e.amountCents : -e.amountCents)}</span>
                <Button variant="secondary" size="sm" onClick={() => void settle(e)} disabled={save.isPending}>
                  {e.kind === 'income' ? 'Recebi' : 'Paguei'}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

type KindFilter = 'all' | 'income' | 'expense';
type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue';

function EntriesSection({ month }: { month: string }) {
  const { openEntry } = useAdminUI();
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');
  const range = monthRange(month);
  const entries = useFinanceEntries({
    ...range,
    kind: kind === 'all' ? undefined : kind,
    status: status === 'all' ? undefined : status,
    q: q.trim() || undefined,
    pageSize: 300,
  });
  const name = monthLabel(month).split(' ')[0];
  const groups = groupByDate(entries.data?.items ?? []);
  const exportHref = `/api/finance/export?from=${range.from}&to=${range.to}`;

  return (
    <section className="rounded-lg border border-line bg-paper" aria-labelledby="entries-title">
      <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="entries-title" className="text-[16px] font-semibold text-ink">
              Lançamentos de {name}
            </h2>
            {entries.data && (
              <p className="tabular mt-0.5 text-[13px] text-muted">
                {entries.data.total} lançamento{entries.data.total === 1 ? '' : 's'} · entradas {formatBRL(entries.data.totals.incomePaidCents)} · saídas{' '}
                {formatBRL(entries.data.totals.expensePaidCents)}
              </p>
            )}
          </div>
          <a href={exportHref} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong px-3 text-[13px] font-semibold text-ink-soft hover:border-ink-soft hover:text-ink" download>
            <Download className="size-4" aria-hidden="true" /> Exportar planilha
          </a>
        </div>
        <div className="grid gap-3 sm:grid-cols-[auto_200px_1fr]">
          <Segmented
            label="Tipo"
            hideLabel
            size="sm"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'income', label: 'Entradas' },
              { value: 'expense', label: 'Saídas' },
            ]}
          />
          <Select
            label="Situação"
            hideLabel
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'Todas as situações' },
              { value: 'paid', label: 'Pagos e recebidos' },
              { value: 'pending', label: 'Pendentes' },
              { value: 'overdue', label: 'Vencidos' },
            ]}
          />
          <TextField label="Buscar lançamentos" hideLabel icon={<Search />} placeholder="Buscar lançamento" value={q} onChange={(e) => setQ(e.target.value)} className="h-9" />
        </div>
      </div>

      {entries.isLoading ? (
        <div className="p-4 sm:p-6">
          <Skeleton className="h-40" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Wallet />}
          title={kind === 'all' && status === 'all' && !q ? `Nenhum lançamento em ${name}` : 'Nada encontrado com esses filtros'}
          description="Registre entradas e saídas, ou o pagamento direto nos detalhes de um atendimento."
          action={
            <Button variant="dark" onClick={() => openEntry({ defaults: { kind: 'income' } })}>
              <Plus className="size-4" aria-hidden="true" /> Nova entrada
            </Button>
          }
        />
      ) : (
        <div>
          {groups.map(([date, items]) => (
            <div key={date}>
              <p className="sticky top-0 z-[1] bg-porcelain/95 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-subtle backdrop-blur sm:px-6">
                {capitalize(formatLongDate(date))}
              </p>
              <ul className="divide-y divide-line">
                {items.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => openEntry({ entry: e })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-steel-100/50 sm:px-6">
                      <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', e.kind === 'income' ? 'bg-fin-in' : 'bg-fin-out')} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{e.description}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {entryMeta(e)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="tabular text-[15px] font-semibold text-ink">{formatSignedBRL(e.kind === 'income' ? e.amountCents : -e.amountCents)}</span>
                        {e.status === 'pending' && (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              e.overdue ? 'bg-status-pending-bg text-status-pending-fg' : 'bg-steel-100 text-steel-700',
                            )}
                          >
                            {e.overdue && <AlertTriangle className="size-3" aria-hidden="true" />}
                            {e.overdue ? 'Vencido' : FINANCE_STATUS_LABELS[e.kind].pending}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function entryMeta(e: FinanceEntryDTO) {
  const client = e.appointment?.clientName;
  return [e.category.name, e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : null, client && !e.description.includes(client) ? client : null]
    .filter(Boolean)
    .join(' · ');
}

function groupByDate(items: FinanceEntryDTO[]): [string, FinanceEntryDTO[]][] {
  const map = new Map<string, FinanceEntryDTO[]>();
  for (const e of items) map.set(e.date, [...(map.get(e.date) ?? []), e]);
  return [...map.entries()];
}

