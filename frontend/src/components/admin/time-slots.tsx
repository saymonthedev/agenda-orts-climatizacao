'use client';

import type { AvailabilityDTO, AvailabilitySlot } from '@orts/backend/contracts';
import { Clock3 } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { minutesOf } from '@/lib/format';

const STATE_LABEL: Record<AvailabilitySlot['state'], string> = {
  available: 'livre',
  busy: 'ocupado',
  break: 'na pausa configurada',
  past: 'já passou (dá para registrar um serviço feito)',
  too_soon: 'abaixo da antecedência mínima',
  after_hours: 'fora do expediente',
};

export const isWarningState = (state?: AvailabilitySlot['state']) => state === 'break' || state === 'after_hours' || state === 'too_soon';

const groupOf = (time: string) => {
  const m = minutesOf(time);
  return m < 12 * 60 ? 'Manhã' : m < 18 * 60 ? 'Tarde' : 'Noite';
};

/**
 * Grade de horários com a situação de cada um (livre, ocupado, pausa, fora do expediente).
 * Os que já passaram continuam selecionáveis, para registrar serviços já feitos.
 */
export function TimeSlots({
  availability,
  loading,
  value,
  onChange,
  keepTime,
  error,
}: {
  availability?: AvailabilityDTO;
  loading: boolean;
  value: string;
  onChange: (time: string) => void;
  /** Horário atual do atendimento em edição (sempre selecionável). */
  keepTime?: string;
  error?: string;
}) {
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  if (loading && !availability) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    );
  }
  if (!availability) return null;

  const slots = availability.slots;
  const onGrid = slots.some((s) => s.time === value);
  const hasPast = slots.some((s) => s.state === 'past');
  const groups = ['Manhã', 'Tarde', 'Noite']
    .map((g) => ({ name: g, slots: slots.filter((s) => groupOf(s.time) === g) }))
    .filter((g) => g.slots.length);

  const applyCustom = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 4);
    const masked = d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
    setCustomValue(masked);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(masked)) onChange(masked);
  };

  return (
    <div className="flex flex-col gap-4" role="group" aria-label="Horário de início">
      {!availability.open && (
        <p className="rounded-md border border-status-pending/30 bg-status-pending-bg px-3.5 py-2.5 text-[13px] leading-snug text-status-pending-fg">
          Não há expediente neste dia. Você ainda pode registrar um encaixe.
        </p>
      )}
      {groups.map((group) => (
        <div key={group.name}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">{group.name}</p>
          <div className="grid grid-cols-4 gap-2 min-[430px]:grid-cols-5 sm:grid-cols-6">
            {group.slots.map((slot) => {
              const selected = value === slot.time;
              const isKept = keepTime === slot.time;
              const disabled = !isKept && slot.state === 'busy';
              const warn = isWarningState(slot.state);
              const past = slot.state === 'past';
              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={`${slot.time}, ${isKept ? 'horário atual' : STATE_LABEL[slot.state]}`}
                  title={slot.state === 'available' ? `${slot.time} – ${slot.endTime}` : STATE_LABEL[slot.state]}
                  onClick={() => {
                    setCustom(false);
                    onChange(slot.time);
                  }}
                  className={cn(
                    'tabular relative h-11 rounded-md border text-[14px] font-semibold transition-colors',
                    selected
                      ? 'border-navy-900 bg-navy-900 text-porcelain'
                      : disabled
                        ? 'cursor-not-allowed border-transparent bg-ink/[0.04] text-subtle/70 line-through decoration-1'
                        : warn
                          ? 'border-dashed border-status-pending/50 bg-paper text-ink-soft hover:border-status-pending'
                          : past
                            ? 'border-line bg-ink/[0.025] text-muted hover:border-navy-700 hover:text-ink'
                            : 'border-line-strong bg-paper text-ink hover:border-navy-700',
                  )}
                >
                  {slot.time}
                  {warn && !selected && <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-status-pending" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm border border-line-strong bg-paper" /> Livre
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-ink/10" /> Ocupado
        </span>
        {hasPast && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-3 rounded-sm border border-line bg-ink/[0.05]" /> Já passou
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm border border-dashed border-status-pending" /> Fora do expediente, pausa ou em cima da hora
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setCustom((v) => !v)}
          aria-expanded={custom}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold transition-colors',
            custom || (value && !onGrid) ? 'border-navy-900 text-ink' : 'border-line-strong text-ink-soft hover:border-navy-700',
          )}
        >
          <Clock3 className="size-4" aria-hidden="true" /> Outro horário{value && !onGrid ? `: ${value}` : ''}
        </button>
        {custom && (
          <input
            aria-label="Outro horário (HH:MM)"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:MM"
            value={customValue}
            onChange={(e) => applyCustom(e.target.value)}
            className="tabular h-10 w-24 rounded-md border border-line-strong bg-paper px-3 text-[15px] outline-none focus:border-navy-700 focus:shadow-[0_0_0_3px_rgb(191_159_99/0.28)]"
          />
        )}
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
