'use client';

import { AlertTriangle } from 'lucide-react';
import { AlertDialog as A } from 'radix-ui';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { buttonClasses } from './button';

type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
};

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Confirmações com modal próprio (substitui window.confirm). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOptions(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <A.Root open={options !== null} onOpenChange={(open) => !open && close(false)}>
        <A.Portal>
          <A.Overlay className="fixed inset-0 z-[85] bg-navy-950/55 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
          <A.Content className="fixed inset-x-4 top-1/2 z-[86] mx-auto max-w-[420px] -translate-y-1/2 rounded-xl bg-paper p-6 shadow-pop outline-none data-[state=open]:animate-pop-in data-[state=closed]:animate-pop-out">
            <div className="flex gap-4">
              {options?.tone === 'danger' && (
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <A.Title className="text-lg font-semibold leading-snug text-ink">{options?.title}</A.Title>
                <A.Description asChild={typeof options?.description !== 'string'} className="mt-1.5 text-[15px] leading-relaxed text-muted">
                  {typeof options?.description === 'string' ? options.description : <div>{options?.description}</div>}
                </A.Description>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <A.Cancel className={buttonClasses('secondary', 'md')}>{options?.cancelLabel ?? 'Cancelar'}</A.Cancel>
              <A.Action className={buttonClasses(options?.tone === 'danger' ? 'danger' : 'dark', 'md')} onClick={() => close(true)}>
                {options?.confirmLabel ?? 'Confirmar'}
              </A.Action>
            </div>
          </A.Content>
        </A.Portal>
      </A.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>.');
  return ctx;
}
