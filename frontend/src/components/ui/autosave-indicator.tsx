'use client';

import { Check, CircleAlert, CloudCheck, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AutosaveStatus } from '@/hooks/use-autosave';
import { cn } from '@/lib/cn';

const TEXT: Record<AutosaveStatus, string> = {
  idle: 'Salvamento automático',
  pending: 'Salvando…',
  saving: 'Salvando…',
  saved: 'Alterações salvas',
  invalid: 'Corrija o campo destacado para salvar',
  error: 'Não foi possível salvar',
};

type Props = {
  status: AutosaveStatus;
  message?: string | null;
  onRetry?: () => void;
  /** "floating": selo fixo acima da barra inferior; "inline": dentro de um rodapé. */
  variant?: 'floating' | 'inline';
  className?: string;
};

/** Situação do salvamento automático, anunciada também para leitores de tela. */
export function AutosaveIndicator({ status, message, onRetry, variant = 'inline', className }: Props) {
  const problem = status === 'error' || status === 'invalid';
  const busy = status === 'pending' || status === 'saving';
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (status !== 'saved') return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2200);
    return () => clearTimeout(t);
  }, [status]);

  const text = problem && message ? `${TEXT[status]}: ${message}` : TEXT[status];
  const icon = busy ? (
    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
  ) : problem ? (
    <CircleAlert className="size-4" aria-hidden="true" />
  ) : status === 'saved' ? (
    <Check className="size-4" aria-hidden="true" />
  ) : (
    <CloudCheck className="size-4" aria-hidden="true" />
  );

  if (variant === 'floating') {
    const visible = busy || problem || (status === 'saved' && showSaved);
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:bottom-6',
          className,
        )}
      >
        <div
          className={cn(
            'flex max-w-full items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-pop transition-all duration-300',
            problem ? 'pointer-events-auto bg-danger text-paper' : 'bg-navy-900 text-porcelain',
            visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          {icon}
          <span className="truncate">{text}</span>
          {status === 'error' && onRetry && (
            <button type="button" onClick={onRetry} className="ml-1 shrink-0 rounded-full bg-paper/20 px-2.5 py-1 text-[12px] font-semibold hover:bg-paper/30">
              Tentar de novo
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn('flex min-w-0 items-center gap-1.5 text-[13px] font-medium', problem ? 'text-danger' : status === 'saved' ? 'text-status-completed-fg' : 'text-muted', className)}
    >
      {icon}
      <span className="min-w-0 truncate">{text}</span>
      {status === 'error' && onRetry && (
        <button type="button" onClick={onRetry} className="ml-1 shrink-0 font-semibold underline underline-offset-4">
          Tentar de novo
        </button>
      )}
    </p>
  );
}
