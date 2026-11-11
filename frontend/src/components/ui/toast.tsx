'use client';

import { AlertTriangle, CircleCheck, Info, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';
type ToastItem = { id: number; tone: ToastTone; title: string; description?: string; action?: { label: string; onClick: () => void } };

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(tone: ToastTone, title: string, options: { description?: string; action?: ToastItem['action']; duration?: number } = {}) {
  const id = ++seq;
  items = [...items.slice(-2), { id, tone, title, description: options.description, action: options.action }];
  emit();
  window.setTimeout(() => dismiss(id), options.duration ?? (tone === 'error' ? 7000 : 4500));
  return id;
}

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

/** Notificações próprias do sistema (sem alert() nativo). */
export const toast = {
  success: (title: string, o?: Parameters<typeof push>[2]) => push('success', title, o),
  error: (title: string, o?: Parameters<typeof push>[2]) => push('error', title, o),
  info: (title: string, o?: Parameters<typeof push>[2]) => push('info', title, o),
};

const icons = { success: CircleCheck, error: AlertTriangle, info: Info };
const tones = {
  success: 'text-status-completed',
  error: 'text-danger',
  info: 'text-steel-500',
};

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items,
    () => items,
  );
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end"
    >
      {list.map((t) => {
        const Icon = icons[t.tone];
        return (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-[420px] animate-pop-in items-start gap-3 rounded-lg border border-white/10 bg-navy-900 p-4 pr-3 text-porcelain shadow-pop"
          >
            <Icon className={cn('mt-0.5 size-5 shrink-0', tones[t.tone], t.tone !== 'error' && 'text-champagne-400')} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold leading-snug">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] leading-snug text-porcelain/70">{t.description}</p>}
              {t.action && (
                <button
                  type="button"
                  className="mt-2 text-[13px] font-semibold text-champagne-400 underline-offset-4 hover:underline"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="-m-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-porcelain/60 hover:bg-white/10 hover:text-porcelain" aria-label="Fechar notificação">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
