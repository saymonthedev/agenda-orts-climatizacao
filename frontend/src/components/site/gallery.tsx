'use client';

import Image from 'next/image';
import { Expand } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { gallery } from '@/content/site';
import { cn } from '@/lib/cn';

const Lightbox = dynamic(() => import('./lightbox').then((m) => m.Lightbox), { ssr: false });

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
  // mantém o lightbox montado após a primeira abertura (animação de saída e retorno de foco)
  const [opened, setOpened] = useState(false);
  const open = (i: number) => {
    setOpened(true);
    setIndex(i);
  };

  return (
    <section id="trabalhos" className="scroll-mt-16 bg-porcelain py-20 sm:py-24 lg:scroll-mt-20 lg:py-32">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end" data-reveal>
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-3 text-steel-600">
              <span aria-hidden="true" className="h-px w-8 bg-steel-500/60" />
              Trabalhos realizados
            </p>
            <h2 className="display mt-6 text-[2.2rem] leading-[1.05] sm:text-5xl lg:text-[3.35rem]">
              O cuidado aparece <span className="serif-accent text-steel-500">no detalhe.</span>
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
                onClick={() => open(i)}
                className="group absolute inset-0 overflow-hidden bg-line text-left outline-offset-4"
              >
                <Image
                  src={item.src}
                  alt=""
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
                  <span className="sr-only"> — ampliar foto</span>
                  <Expand aria-hidden="true" className="hidden size-4 shrink-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {opened && <Lightbox index={index} onIndexChange={setIndex} />}
    </section>
  );
}
