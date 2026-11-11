import type { AppointmentStatus, ServiceColor } from '@orts/backend/contracts';
import { STATUS_LABELS } from '@orts/backend/contracts';
import { Ban, CheckCheck, CircleDashed, CircleDot, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export const STATUS_META: Record<AppointmentStatus, { label: string; icon: LucideIcon; pill: string; dot: string; block: string }> = {
  pending: {
    label: STATUS_LABELS.pending,
    icon: CircleDashed,
    pill: 'bg-status-pending-bg text-status-pending-fg',
    dot: 'bg-status-pending',
    block: 'bg-status-pending-bg/80',
  },
  confirmed: {
    label: STATUS_LABELS.confirmed,
    icon: CircleDot,
    pill: 'bg-status-confirmed-bg text-status-confirmed-fg',
    dot: 'bg-status-confirmed',
    block: 'bg-status-confirmed-bg/80',
  },
  in_progress: {
    label: STATUS_LABELS.in_progress,
    icon: Wrench,
    pill: 'bg-status-progress-bg text-status-progress-fg',
    dot: 'bg-status-progress',
    block: 'bg-status-progress-bg/85',
  },
  completed: {
    label: STATUS_LABELS.completed,
    icon: CheckCheck,
    pill: 'bg-status-completed-bg text-status-completed-fg',
    dot: 'bg-status-completed',
    block: 'bg-status-completed-bg/80',
  },
  cancelled: {
    label: STATUS_LABELS.cancelled,
    icon: Ban,
    pill: 'bg-status-cancelled-bg text-status-cancelled-fg',
    dot: 'bg-status-cancelled',
    block: 'bg-status-cancelled-bg/60',
  },
};

export const SERVICE_COLOR: Record<ServiceColor, string> = {
  slate: 'bg-svc-slate',
  teal: 'bg-svc-teal',
  champagne: 'bg-svc-champagne',
  sage: 'bg-svc-sage',
  clay: 'bg-svc-clay',
  navy: 'bg-svc-navy',
};

export const SERVICE_BORDER: Record<ServiceColor, string> = {
  slate: 'border-svc-slate',
  teal: 'border-svc-teal',
  champagne: 'border-svc-champagne',
  sage: 'border-svc-sage',
  clay: 'border-svc-clay',
  navy: 'border-svc-navy',
};

export const SERVICE_COLOR_LABEL: Record<ServiceColor, string> = {
  slate: 'Ardósia',
  teal: 'Petróleo',
  champagne: 'Champanhe',
  sage: 'Sálvia',
  clay: 'Terracota',
  navy: 'Marinho',
};

export function StatusBadge({ status, className, size = 'md' }: { status: AppointmentStatus; className?: string; size?: 'sm' | 'md' }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full font-semibold',
        size === 'md' ? 'h-7 px-2.5 text-[12px]' : 'h-6 px-2 text-[11px]',
        meta.pill,
        className,
      )}
    >
      <Icon className={size === 'md' ? 'size-3.5' : 'size-3'} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function ServiceDot({ color, className }: { color: ServiceColor; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2.5 shrink-0 rounded-[3px]', SERVICE_COLOR[color], className)} />;
}
