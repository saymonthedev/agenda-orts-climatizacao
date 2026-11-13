'use client';

import type { AppointmentDTO } from '@orts/backend/contracts';
import { isMultiDay } from '@orts/backend/contracts';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDayMonth, formatDurationLabel } from '@/lib/format';
import { placeOf } from '@/lib/messages';
import { SERVICE_COLOR, StatusBadge } from './status';

/** Cartão de atendimento para listas (celular e resultados de busca). */
export function AppointmentCard({ a, onOpen, showDate, day }: { a: AppointmentDTO; onOpen: () => void; showDate?: string; day?: string }) {
  const cancelled = a.status === 'cancelled';
  // num dia de continuação (começou antes), o horário de início não é deste dia
  const continued = Boolean(day && day > a.date);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-stretch gap-3 rounded-lg border border-line bg-paper p-3.5 text-left transition-colors hover:border-steel-400 sm:p-4',
        cancelled && 'opacity-70',
      )}
    >
      <span className={cn('w-1 shrink-0 rounded-full', SERVICE_COLOR[a.serviceType.color])} aria-hidden="true" />
      <span className="flex w-14 shrink-0 flex-col">
        {continued ? (
          <span className="text-[12px] font-semibold uppercase leading-tight tracking-wide text-steel-600">cont.</span>
        ) : (
          <span className="tabular text-[16px] font-semibold leading-tight text-ink">{a.startTime}</span>
        )}
        {isMultiDay(a) ? (
          <span className="tabular text-[12px] leading-tight text-subtle">
            até {formatDayMonth(a.endDate)}
            <br />
            {a.endTime}
          </span>
        ) : (
          <span className="tabular text-[12px] text-subtle">{a.endTime}</span>
        )}
        {showDate && <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-steel-600">{showDate}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn('truncate text-[15px] font-semibold text-ink', cancelled && 'line-through')}>{a.clientName}</span>
          <StatusBadge status={a.status} size="sm" />
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">
          {a.serviceType.name} · {formatDurationLabel(a.durationMinutes)}
        </span>
        <span className="mt-1 flex items-center gap-1 truncate text-[13px] text-ink-soft">
          <MapPin className="size-3.5 shrink-0 text-subtle" aria-hidden="true" />
          <span className={cn('truncate', !placeOf(a) && 'text-subtle')}>{placeOf(a) || 'Endereço a confirmar'}</span>
        </span>
      </span>
    </button>
  );
}
