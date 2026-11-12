'use client';

import Image from 'next/image';
import { ArrowRight, Check } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { useState } from 'react';
import { services } from '@/content/site';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/cn';
import { RequestButton } from './request-button';

export function Services() {
  const [active, setActive] = useState(services[0]!.id);
  const desktop = useMediaQuery('(min-width: 1024px)');

  return (
    <section id="servicos" className="on-dark relative isolate scroll-mt-16 overflow-hidden bg-navy-950 py-20 text-porcelain sm:py-24 lg:scroll-mt-20 lg:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_100%_100%,rgb(87_119_128/0.35),transparent_70%)]" />
      <div className="container-page">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-end" data-reveal>
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-3 text-champagne-400">
              <span aria-hidden="true" className="h-px w-8 bg-champagne-400/70" />
              Serviços
            </p>
            <h2 className="display mt-6 text-[2.2rem] leading-[1.05] sm:text-5xl lg:text-[3.35rem]">
              Do primeiro furo na parede à <span className="serif-accent text-champagne-400">revisão periódica.</span>
            </h2>
          </div>
          <p className="max-w-md text-[17px] leading-relaxed text-porcelain/70 lg:col-span-4 lg:col-start-9">
            Cada serviço é executado com o mesmo cuidado: ambiente protegido, acabamento limpo e orientação clara no final.
          </p>
        </div>

        <Tabs.Root
          value={active}
          onValueChange={setActive}
          orientation={desktop ? 'vertical' : 'horizontal'}
          activationMode="manual"
          className="mt-12 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-12 lg:gap-10"
        >
          <Tabs.List
            aria-label="Serviços da ORTS"
            className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:col-span-5 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-t lg:border-white/12"
          >
            {services.map((s) => (
              <Tabs.Trigger
                key={s.id}
                value={s.id}
                className={cn(
                  'group relative flex shrink-0 items-center gap-3 rounded-full border border-white/15 px-4 py-2.5 text-left text-[14px] font-semibold text-porcelain/70 transition-colors',
                  'data-[state=active]:border-champagne-400 data-[state=active]:bg-champagne-400 data-[state=active]:text-navy-950',
                  'lg:rounded-none lg:border-0 lg:border-b lg:border-white/12 lg:bg-transparent lg:px-0 lg:py-7 lg:text-[1.65rem] lg:font-semibold lg:leading-tight lg:tracking-[-0.02em] lg:[font-stretch:94%]',
                  'lg:data-[state=active]:border-white/12 lg:data-[state=active]:bg-transparent lg:data-[state=active]:text-porcelain lg:hover:text-porcelain',
                )}
              >
                <span className="serif-accent text-sm text-current opacity-80 lg:w-10 lg:text-lg lg:text-champagne-400 lg:opacity-100">{s.number}</span>
                <span className="lg:flex-1">{s.title}</span>
                <ArrowRight
                  aria-hidden="true"
                  className="hidden size-5 -translate-x-2 text-champagne-400 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-60 group-data-[state=active]:translate-x-0 group-data-[state=active]:opacity-100 lg:block"
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-[-1px] left-0 hidden h-px w-0 bg-champagne-400 transition-[width] duration-500 ease-out group-data-[state=active]:w-full lg:block"
                />
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="lg:col-span-7">
            {services.map((s) => (
              <Tabs.Content key={s.id} value={s.id} className="outline-none data-[state=active]:animate-fade-in" tabIndex={-1}>
                <div className="relative aspect-[16/10] overflow-hidden bg-navy-800 [clip-path:polygon(0_0,100%_0,100%_86%,90%_100%,0_100%)]">
                  <Image
                    src={s.image.src}
                    alt={s.image.alt}
                    fill
                    sizes="(min-width: 1024px) 52vw, 100vw"
                    className={cn('object-cover', s.id === 'instalacao' && 'object-[50%_78%]')}
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/50 to-transparent" />
                </div>
                <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-[-0.015em] text-porcelain">{s.title}</h3>
                    <p className="mt-3 text-[16px] leading-relaxed text-porcelain/70">{s.summary}</p>
                    <RequestButton serviceId={s.id} className="mt-6">
                      Agendar {s.short.toLowerCase()}
                    </RequestButton>
                  </div>
                  <div>
                    <p className="eyebrow text-[11px] text-porcelain/50">O que inclui</p>
                    <ul className="mt-4 space-y-3">
                      {s.includes.map((item) => (
                        <li key={item} className="flex gap-3 text-[15px] leading-snug text-porcelain/85">
                          <Check className="mt-0.5 size-4 shrink-0 text-champagne-400" aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Tabs.Content>
            ))}
          </div>
        </Tabs.Root>
      </div>
    </section>
  );
}
