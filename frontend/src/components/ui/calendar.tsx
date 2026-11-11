'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { addDays, addMonths, capitalize, daysInMonth, formatLongDate, formatMonthYear, startOfMonth, todayISO, weekdayOf } from '@/lib/format';

const WEEK_HEADERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const WEEK_NAMES = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

type CalendarProps = {
  value: string | null;
  onChange: (date: string) => void;
  /** Quantidade de atendimentos por dia (exibe marcadores). */
  markers?: Record<string, number>;
  min?: string;
  className?: string;
  autoFocus?: boolean;
};

/** Grade mensal (segunda a domingo) com navegação completa por teclado. */
export function Calendar({ value, onChange, markers, min, className, autoFocus }: CalendarProps) {
  const today = todayISO();
  const [month, setMonth] = useState(startOfMonth(value ?? today));
  const [focused, setFocused] = useState(value ?? today);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(Boolean(autoFocus));

  useEffect(() => {
    if (value) {
      setMonth(startOfMonth(value));
      setFocused(value);
    }
  }, [value]);

  const days = useMemo(() => {
    const first = startOfMonth(month);
    const lead = (weekdayOf(first) + 6) % 7; // segunda = 0
    const start = addDays(first, -lead);
    const total = Math.ceil((lead + daysInMonth(month)) / 7) * 7;
    return Array.from({ length: total }, (_, i) => addDays(start, i));
  }, [month]);

  useEffect(() => {
    if (!shouldFocus.current) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`);
    el?.focus();
  }, [focused, month]);

  const moveFocus = (date: string) => {
    shouldFocus.current = true;
    setFocused(date);
    if (date.slice(0, 7) !== month.slice(0, 7)) setMonth(startOfMonth(date));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1).slice(0, 8) + focused.slice(8),
      PageDown: () => addMonths(focused, 1).slice(0, 8) + focused.slice(8),
      Home: () => addDays(focused, -((weekdayOf(focused) + 6) % 7)),
      End: () => addDays(focused, 6 - ((weekdayOf(focused) + 6) % 7)),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      let next = fn();
      // corrige dias inexistentes (ex.: 31 -> mês com 30 dias)
      const dim = daysInMonth(next.slice(0, 8) + '01');
      if (Number(next.slice(8)) > dim) next = next.slice(0, 8) + String(dim).padStart(2, '0');
      if (!Number.isNaN(Date.parse(next))) moveFocus(next);
    }
  };

  const weeks = Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7));

  return (
    <div className={cn('w-full select-none', className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          className="inline-flex size-10 items-center justify-center rounded-md text-ink-soft hover:bg-ink/[0.06]"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <p className="text-[15px] font-semibold text-ink" aria-live="polite">
          {capitalize(formatMonthYear(month))}
        </p>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          className="inline-flex size-10 items-center justify-center rounded-md text-ink-soft hover:bg-ink/[0.06]"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div role="grid" aria-label={capitalize(formatMonthYear(month))} ref={gridRef} onKeyDown={onKeyDown}>
        <div role="row" className="grid grid-cols-7">
          {WEEK_HEADERS.map((d, i) => (
            <span key={i} role="columnheader" aria-label={WEEK_NAMES[i]} className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-subtle">
              {d}
            </span>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div role="row" key={wi} className="grid grid-cols-7">
            {week.map((date) => {
              const outside = date.slice(0, 7) !== month.slice(0, 7);
              const selected = date === value;
              const isToday = date === today;
              const disabled = Boolean(min && date < min);
              const count = markers?.[date] ?? 0;
              return (
                <div role="gridcell" key={date} aria-selected={selected} className="flex justify-center p-0.5">
                  <button
                    type="button"
                    data-date={date}
                    tabIndex={date === focused ? 0 : -1}
                    disabled={disabled}
                    aria-current={isToday ? 'date' : undefined}
                    aria-label={`${capitalize(formatLongDate(date))}${count ? `, ${count} atendimento${count > 1 ? 's' : ''}` : ''}`}
                    onClick={() => {
                      setFocused(date);
                      onChange(date);
                    }}
                    className={cn(
                      'tabular relative flex size-10 flex-col items-center justify-center rounded-md text-[14px] transition-colors',
                      outside ? 'text-subtle' : 'text-ink',
                      !selected && 'hover:bg-champagne-100',
                      isToday && !selected && 'font-bold text-champagne-700 ring-1 ring-inset ring-champagne-400',
                      selected && 'bg-navy-900 font-semibold text-porcelain',
                      disabled && 'pointer-events-none opacity-35',
                    )}
                  >
                    {Number(date.slice(8))}
                    {count > 0 && (
                      <span aria-hidden="true" className={cn('absolute bottom-1.5 h-1 w-1 rounded-full', selected ? 'bg-champagne-400' : 'bg-steel-500')} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
