'use client';

import type { AppointmentDTO } from '@orts/backend/contracts';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDurationLabel } from '@/lib/format';
import { SERVICE_COLOR, StatusBadge } from './status';

/** Cartão de atendimento para listas (celular e resultados de busca). */
export function AppointmentCard({ a, onOpen, showDate }: { a: AppointmentDTO; onOpen: () => void; showDate?: string }) {
  const cancelled = a.status === 'cancelled';
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
        <span className="tabular text-[16px] font-semibold leading-tight text-ink">{a.startTime}</span>
        <span className="tabular text-[12px] text-subtle">{a.endTime}</span>
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
          <span className="truncate">
            {a.address} · {a.neighborhood}
          </span>
        </span>
      </span>
    </button>
  );
}
