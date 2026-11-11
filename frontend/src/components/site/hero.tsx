import Image from 'next/image';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { images, services } from '@/content/site';
import { Airflow } from './airflow';
import { RequestButton } from './request-button';

export function Hero() {
  return (
    <section id="inicio" className="on-dark relative isolate overflow-hidden bg-navy-900 text-porcelain">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_60%_at_82%_6%,rgb(212_193_156/0.22),transparent_70%),radial-gradient(50%_55%_at_0%_100%,rgb(63_101_120/0.45),transparent_72%)]"
      />

      <div className="container-page grid gap-12 pb-14 pt-28 sm:pt-32 lg:min-h-[min(100svh,960px)] lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-20 lg:pt-28">
        <div className="lg:col-span-6 xl:col-span-6">
          <p className="eyebrow flex items-center gap-3 text-champagne-400">
            <span aria-hidden="true" className="h-px w-8 bg-champagne-400/70" />
            Climatização em Jaraguá do Sul · SC
          </p>
          <h1 className="display mt-6 text-[2.55rem] leading-[1.02] min-[390px]:text-[2.8rem] sm:text-6xl lg:text-[4.1rem] xl:text-[4.75rem]">
            Ar-condicionado instalado e cuidado com <span className="serif-accent text-champagne-400">precisão.</span>
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-porcelain/75 sm:text-lg">
            Instalação, higienização e manutenção preventiva em Jaraguá do Sul, com horário marcado, acabamento limpo e
            atendimento direto pelo WhatsApp.
          </p>
          <div className="mt-9 flex flex-col gap-3 min-[430px]:flex-row">
            <RequestButton size="lg">Solicitar atendimento</RequestButton>
            <Button asChild variant="outline-light" size="lg">
              <a href="#servicos">
                Conhecer serviços <ArrowDown className="size-4" aria-hidden="true" />
              </a>
            </Button>
          </div>

          <ul className="mt-12 grid max-w-[34rem] grid-cols-3 border-t border-white/12" aria-label="Serviços">
            {services.map((s) => (
              <li key={s.id} className="border-r border-white/12 pr-3 pt-4 last:border-r-0 [&:not(:first-child)]:pl-3 sm:[&:not(:first-child)]:pl-5">
                <a href="#servicos" className="group block">
                  <span className="serif-accent text-sm text-champagne-400">{s.number}</span>
                  <span className="mt-1 block text-[13px] font-semibold leading-snug text-porcelain/85 transition-colors group-hover:text-porcelain sm:text-sm">
                    {s.short}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <figure className="relative lg:col-span-6 lg:col-start-7 lg:self-stretch lg:py-4">
          <div className="relative h-[min(78vw,460px)] overflow-hidden [clip-path:polygon(0_15%,32%_0,100%_0,100%_100%,0_100%)] sm:h-[480px] lg:h-full lg:min-h-[560px]">
            <Image
              src={images.condensadora.src}
              alt={images.condensadora.alt}
              fill
              priority
              sizes="(min-width: 1024px) 46vw, 100vw"
              quality={75}
              className="object-cover object-[62%_42%]"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950/75 via-navy-950/5 to-transparent" />
          </div>
          <figcaption className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 sm:inset-x-6 sm:bottom-6">
            <span className="max-w-[15rem] border-l-2 border-champagne-400 pl-3 text-[13px] leading-snug text-porcelain/90">
              <span className="eyebrow block text-[10px] text-champagne-400">Trabalho realizado</span>
              Condensadora instalada com tubulação protegida
            </span>
          </figcaption>
          <Airflow className="absolute -left-14 top-[38%] hidden w-44 text-champagne-400/70 lg:block" />
        </figure>
      </div>
    </section>
  );
}
