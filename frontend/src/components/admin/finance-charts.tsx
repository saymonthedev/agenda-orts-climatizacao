'use client';

import type { FinanceMonthPoint } from '@orts/backend/contracts';
import { Table2, BarChart3 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { capitalize } from '@/lib/format';
import { formatBRL, formatCompactBRL, formatSignedBRL, monthLabel, monthShort } from '@/lib/money';

/** Escala "redonda" para o eixo: até 4 linhas, valores limpos em reais. */
function niceScale(maxCents: number) {
  const max = Math.max(maxCents / 100, 1);
  const steps = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10_000, 20_000, 25_000, 50_000, 100_000, 200_000, 500_000];
  const step = steps.find((s) => max / s <= 4) ?? 1_000_000;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step * 100);
  return { topCents: top * 100, ticks };
}

/**
 * Entradas × saídas por mês (colunas agrupadas). Legenda sempre visível; valores no toque/foco
 * de cada mês e numa tabela alternativa. No celular mostra os últimos 6 meses.
 */
export function CashflowChart({ months, selected, onSelect }: { months: FinanceMonthPoint[]; selected: string; onSelect: (month: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const titleId = useId();
  const { topCents, ticks } = useMemo(() => niceScale(Math.max(...months.flatMap((m) => [m.incomeCents, m.expenseCents]))), [months]);
  const pct = (cents: number) => (cents / topCents) * 100;
  const active = hover ?? months.findIndex((m) => m.month === selected);
  const current = months[active];

  return (
    <section aria-labelledby={titleId} className="rounded-lg border border-line bg-paper p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={titleId} className="text-[16px] font-semibold text-ink">
            Entradas e saídas por mês
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">Valores pagos e recebidos. Toque em um mês para ver o detalhe.</p>
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong px-3 text-[13px] font-semibold text-ink-soft hover:border-ink-soft hover:text-ink"
          aria-pressed={asTable}
        >
          {asTable ? <BarChart3 className="size-4" aria-hidden="true" /> : <Table2 className="size-4" aria-hidden="true" />}
          {asTable ? 'Ver gráfico' : 'Ver tabela'}
        </button>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft" aria-label="Legenda">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-fin-in" /> Entradas
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-fin-out" /> Saídas
        </li>
      </ul>

      {asTable ? (
        <div className="scrollbar-thin mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela de entradas e saídas por mês">
          <table className="w-full min-w-[420px] text-[14px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-subtle">
                <th className="py-2 pr-3 font-semibold">Mês</th>
                <th className="py-2 pr-3 text-right font-semibold">Entradas</th>
                <th className="py-2 pr-3 text-right font-semibold">Saídas</th>
                <th className="py-2 text-right font-semibold">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((m) => (
                <tr key={m.month} className={cn('border-b border-line/70', m.month === selected && 'bg-steel-100/60')}>
                  <td className="py-2 pr-3">{capitalize(monthLabel(m.month))}</td>
                  <td className="tabular py-2 pr-3 text-right">{formatBRL(m.incomeCents)}</td>
                  <td className="tabular py-2 pr-3 text-right">{formatBRL(m.expenseCents)}</td>
                  <td className="tabular py-2 text-right font-semibold">{formatSignedBRL(m.incomeCents - m.expenseCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative mt-3">
          {/* leitura do mês em foco (toque, mouse ou teclado) */}
          <div className="mb-3 flex min-h-[44px] flex-wrap items-end gap-x-5 gap-y-1" aria-live="polite">
            {current && (
              <>
                <p className="w-full text-[12px] font-semibold uppercase tracking-[0.1em] text-subtle">{capitalize(monthLabel(current.month))}</p>
                <p className="flex items-center gap-1.5 text-[13px] text-muted">
                  <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-fin-in" />
                  <span className="tabular font-semibold text-ink">{formatBRL(current.incomeCents)}</span> entradas
                </p>
                <p className="flex items-center gap-1.5 text-[13px] text-muted">
                  <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-fin-out" />
                  <span className="tabular font-semibold text-ink">{formatBRL(current.expenseCents)}</span> saídas
                </p>
                <p className="text-[13px] text-muted">
                  <span className="tabular font-semibold text-ink">{formatSignedBRL(current.incomeCents - current.expenseCents)}</span> resultado
                </p>
              </>
            )}
          </div>

          <div className="relative h-[190px] pl-12">
            {/* eixo e linhas de grade (recessivas) */}
            {ticks.map((t) => (
              <div key={t} className="pointer-events-none absolute inset-x-0" style={{ bottom: `${pct(t)}%` }} aria-hidden="true">
                <span className="tabular absolute -top-2 left-0 w-11 text-right text-[11px] leading-none text-subtle">{formatCompactBRL(t)}</span>
                <span className="absolute left-12 right-0 top-0 h-px bg-line" />
              </div>
            ))}
            <ol className="relative flex h-full items-end justify-between gap-1">
              {months.map((m, i) => {
                const isSelected = m.month === selected;
                return (
                  <li key={m.month} className={cn('flex h-full flex-1 justify-center', i < months.length - 6 && 'hidden sm:flex')}>
                    <button
                      type="button"
                      onClick={() => onSelect(m.month)}
                      onPointerEnter={() => setHover(i)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      aria-label={`${capitalize(monthLabel(m.month))}: entradas ${formatBRL(m.incomeCents)}, saídas ${formatBRL(m.expenseCents)}`}
                      aria-pressed={isSelected}
                      className={cn('group flex h-full w-full max-w-[56px] items-end justify-center gap-[2px] rounded-md px-1 outline-offset-2', (hover === i || isSelected) && 'bg-steel-100/70')}
                    >
                      <span className="block w-full max-w-[18px] rounded-t-[4px] bg-fin-in transition-[height] duration-500" style={{ height: `${pct(m.incomeCents)}%` }} />
                      <span className="block w-full max-w-[18px] rounded-t-[4px] bg-fin-out transition-[height] duration-500" style={{ height: `${pct(m.expenseCents)}%` }} />
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <ol className="mt-2 flex justify-between gap-1 pl-12" aria-hidden="true">
            {months.map((m, i) => (
              <li key={m.month} className={cn('flex-1 text-center text-[11px] capitalize', m.month === selected ? 'font-semibold text-ink' : 'text-subtle', i < months.length - 6 && 'hidden sm:block')}>
                {monthShort(m.month)}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

/**
 * Barras horizontais ordenadas (uma série, uma cor): comparar as partes de um total.
 * O título nomeia a série; os valores ficam escritos em cada linha.
 */
export function RankedBars({
  title,
  description,
  items,
  tone,
  empty,
}: {
  title: string;
  description?: string;
  items: { label: string; amountCents: number; detail?: string }[];
  tone: 'in' | 'out';
  empty: string;
}) {
  const titleId = useId();
  const total = items.reduce((s, i) => s + i.amountCents, 0);
  const max = Math.max(...items.map((i) => i.amountCents), 1);
  return (
    <section aria-labelledby={titleId} className="rounded-lg border border-line bg-paper p-4 sm:p-6">
      <h2 id={titleId} className="text-[16px] font-semibold text-ink">
        {title}
      </h2>
      {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      {items.length === 0 ? (
        <p className="mt-6 rounded-md bg-porcelain px-4 py-6 text-center text-[14px] text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3.5">
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 text-ink-soft">
                  {item.label}
                  {item.detail && <span className="text-[12px] text-subtle"> · {item.detail}</span>}
                </span>
                <span className="tabular shrink-0 font-semibold text-ink">{formatBRL(item.amountCents)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-2.5 flex-1">
                  <span className={cn('block h-full rounded-r-[4px]', tone === 'in' ? 'bg-fin-in' : 'bg-fin-out')} style={{ width: `${Math.max((item.amountCents / max) * 100, 1.5)}%` }} />
                </span>
                <span className="tabular w-10 shrink-0 text-right text-[12px] text-subtle">{Math.round((item.amountCents / total) * 100)}%</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
