import Image from 'next/image';
import { differentiators, images } from '@/content/site';

export function About() {
  return (
    <section id="sobre" className="relative scroll-mt-16 bg-porcelain py-20 sm:py-24 lg:scroll-mt-20 lg:py-32">
      <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start" data-reveal>
          <p className="eyebrow flex items-center gap-3 text-steel-600">
            <span aria-hidden="true" className="h-px w-8 bg-steel-500/60" />
            Sobre a ORTS
          </p>
          <h2 className="display mt-6 text-[2.2rem] leading-[1.05] sm:text-5xl lg:text-[3.35rem]">
            Climatização feita por quem cuida de <span className="serif-accent text-champagne-600">cada detalhe.</span>
          </h2>
          <div className="mt-8 max-w-[36rem] space-y-5 text-[17px] leading-relaxed text-ink-soft">
            <p>
              A ORTS Climatização atende em Jaraguá do Sul com instalação, higienização e manutenção de ar-condicionado.
            </p>
            <p>
              O trabalho começa antes de o equipamento ligar, na escolha do ponto certo, no cuidado com a parede e no
              acabamento da tubulação, e continua depois, com orientações de uso e a indicação da próxima manutenção.
            </p>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <figure className="relative" data-reveal>
            <div className="relative aspect-[4/3] overflow-hidden bg-line [clip-path:polygon(0_0,82%_0,100%_14%,100%_100%,0_100%)]">
              <Image
                src={images.splitInterno.src}
                alt={images.splitInterno.alt}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover object-[50%_30%]"
              />
            </div>
            <figcaption className="mt-3 flex items-center gap-3 text-[13px] text-muted">
              <span aria-hidden="true" className="h-px w-6 bg-line-strong" />
              Split instalado sobre janela, com acabamento limpo
            </figcaption>
          </figure>

          <dl className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
            {differentiators.map((item, i) => (
              <div key={item.title} className="border-t border-line-strong pt-5" data-reveal style={{ ['--reveal-delay' as string]: `${i * 70}ms` }}>
                <dt className="flex items-baseline gap-3 text-[17px] font-semibold text-ink">
                  <span className="serif-accent text-base text-champagne-700">{String(i + 1).padStart(2, '0')}</span>
                  {item.title}
                </dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-muted">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
