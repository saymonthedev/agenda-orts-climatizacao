'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import { useCallback, useEffect, useRef } from 'react';
import { gallery } from '@/content/site';

export function Lightbox({ index, onIndexChange }: { index: number | null; onIndexChange: (i: number | null) => void }) {
  const open = index !== null;
  const item = index !== null ? gallery[index] : null;
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      onIndexChange((index + delta + gallery.length) % gallery.length);
    },
    [index, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  return (
    <D.Root open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[60] bg-navy-950/95 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <D.Content
          className="on-dark fixed inset-0 z-[70] flex flex-col text-porcelain outline-none data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
          onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            const start = touchX.current;
            const end = e.changedTouches[0]?.clientX;
            if (start !== null && end !== undefined && Math.abs(end - start) > 50) go(end < start ? 1 : -1);
            touchX.current = null;
          }}
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
            <span className="tabular text-sm text-porcelain/70" aria-live="polite">
              {index !== null ? `${index + 1} / ${gallery.length}` : ''}
            </span>
            <D.Close className="-mr-2 inline-flex size-11 items-center justify-center rounded-md hover:bg-white/10" aria-label="Fechar">
              <X className="size-6" aria-hidden="true" />
            </D.Close>
          </div>
          <div className="relative min-h-0 flex-1 px-2 sm:px-20">
            {item && (
              <Image key={item.src} src={item.src} alt={item.alt} fill sizes="100vw" quality={85} className="animate-fade-in object-contain" />
            )}
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-navy-950/40 backdrop-blur hover:bg-white/10 sm:inline-flex"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-navy-950/40 backdrop-blur hover:bg-white/10 sm:inline-flex"
              aria-label="Próxima foto"
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="min-w-0">
              <D.Title className="text-[15px] font-medium leading-snug sm:text-base">{item?.caption}</D.Title>
              <D.Description className="eyebrow mt-1 text-[10px] text-champagne-400">{item?.tag}</D.Description>
            </div>
            <div className="flex shrink-0 gap-2 sm:hidden">
              <button type="button" onClick={() => go(-1)} className="inline-flex size-11 items-center justify-center rounded-full border border-white/20" aria-label="Foto anterior">
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => go(1)} className="inline-flex size-11 items-center justify-center rounded-full border border-white/20" aria-label="Próxima foto">
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
