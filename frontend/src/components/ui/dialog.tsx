'use client';

import { X } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** "auto": modal centralizado no desktop e painel inferior no celular. */
  variant?: 'auto' | 'drawer';
  hideHeader?: boolean;
  className?: string;
  onOpenAutoFocus?: (event: Event) => void;
};

const widths = { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[560px]', lg: 'sm:max-w-[720px]' };

/** Modal próprio do sistema (substitui alert/confirm nativos). */
export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md', variant = 'auto', hideHeader, className, onOpenAutoFocus }: DialogProps) {
  const drawer = variant === 'drawer';
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-navy-950/55 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <D.Content
          onOpenAutoFocus={onOpenAutoFocus}
          aria-describedby={description ? undefined : undefined}
          className={cn(
            'fixed z-[70] flex flex-col bg-paper text-ink shadow-pop outline-none',
            // celular: painel inferior
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
            drawer
              ? 'sm:inset-y-0 sm:left-auto sm:right-0 sm:h-dvh sm:max-h-none sm:w-[min(480px,100vw)] sm:rounded-none sm:border-l sm:border-line sm:data-[state=open]:animate-drawer-in sm:data-[state=closed]:animate-drawer-out'
              : cn(
                  'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-48px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:max-h-[88dvh]',
                  'sm:data-[state=open]:animate-pop-in sm:data-[state=closed]:animate-pop-out',
                  widths[size],
                ),
            className,
          )}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
          <div className={cn('flex shrink-0 items-start justify-between gap-4 px-5 pb-3 pt-4 sm:px-7 sm:pt-6', hideHeader && 'sr-only')}>
            <div className="min-w-0">
              <D.Title className="text-lg font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-xl">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1.5 text-sm leading-relaxed text-muted">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{typeof title === 'string' ? title : 'Janela'}</D.Description>
              )}
            </div>
            <D.Close
              className="-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
              aria-label="Fechar"
            >
              <X className="size-5" aria-hidden="true" />
            </D.Close>
          </div>
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-7 sm:pb-6">{children}</div>
          {footer && (
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-paper px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-7">
              {footer}
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
