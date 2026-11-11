'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { Dialog as D } from 'radix-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gallery } from '@/content/site';
import { cn } from '@/lib/cn';

/** Composição editorial: cada item define seu espaço no grid de 12 colunas. */
const layout = [
  'col-span-2 aspect-[4/3] lg:col-span-7 lg:row-span-2 lg:aspect-auto lg:min-h-[540px]',
  'col-span-2 aspect-[4/5] sm:aspect-[16/11] lg:col-span-5 lg:row-span-2 lg:aspect-auto',
  'col-span-1 aspect-square sm:aspect-[4/3] lg:col-span-6 lg:aspect-[16/10]',
  'col-span-1 aspect-square sm:aspect-[4/3] lg:col-span-6 lg:aspect-[16/10]',
  'col-span-2 aspect-[16/9] lg:col-span-7',
  'col-span-2 aspect-[16/9] lg:col-span-5 lg:aspect-auto',
];

export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <section id="trabalhos" className="scroll-mt-16 bg-porcelain py-20 sm:py-24 lg:scroll-mt-20 lg:py-32">
      <div className="container-page">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end" data-reveal>
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-3 text-steel-600">
              <span aria-hidden="true" className="h-px w-8 bg-steel-500/60" />
              Trabalhos realizados
            </p>
            <h2 className="display mt-6 text-[2.2rem] leading-[1.05] sm:text-5xl lg:text-[3.35rem]">
              O cuidado aparece <span className="serif-accent text-champagne-600">no detalhe.</span>
            </h2>
          </div>
          <p className="max-w-md text-[17px] leading-relaxed text-muted lg:col-span-4 lg:col-start-9">
            Registros reais de instalações e higienizações feitas pela ORTS. Toque em uma foto para ampliar.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-16 lg:grid-cols-12 lg:gap-5">
          {gallery.map((item, i) => (
            <li key={item.src} className={cn('relative', layout[i])} data-reveal style={{ ['--reveal-delay' as string]: `${(i % 3) * 70}ms` }}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="group absolute inset-0 overflow-hidden bg-line text-left outline-offset-4"
                aria-label={`Ampliar foto: ${item.caption}`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes={i < 2 || i > 3 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 45vw, 50vw'}
                  className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.035]"
                />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/0 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="absolute left-3 top-3 rounded-full bg-paper/92 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink backdrop-blur-sm sm:left-4 sm:top-4">
                  {item.tag}
                </span>
                <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 text-porcelain sm:inset-x-4 sm:bottom-4">
                  <span className="max-w-[26rem] text-[13px] font-medium leading-snug max-sm:line-clamp-2 sm:text-[15px]">{item.caption}</span>
                  <Expand aria-hidden="true" className="hidden size-4 shrink-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <Lightbox index={index} onIndexChange={setIndex} />
    </section>
  );
}

function Lightbox({ index, onIndexChange }: { index: number | null; onIndexChange: (i: number | null) => void }) {
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
