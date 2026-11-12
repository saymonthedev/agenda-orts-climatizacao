import { processSteps } from '@/content/site';
import { RequestButton } from './request-button';

export function Process() {
  return (
    <section id="como-funciona" className="relative scroll-mt-16 overflow-hidden bg-paper py-20 sm:py-24 lg:scroll-mt-20 lg:py-28">
      <div className="container-page">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" data-reveal>
          <div>
            <p className="eyebrow flex items-center gap-3 text-steel-600">
              <span aria-hidden="true" className="h-px w-8 bg-steel-500/60" />
              Como funciona
            </p>
            <h2 className="display mt-6 max-w-2xl text-[2.2rem] leading-[1.05] sm:text-5xl">
              Do primeiro contato ao <span className="serif-accent text-steel-500">ar funcionando.</span>
            </h2>
          </div>
        </div>

        <ol className="mt-14 grid grid-cols-1 border-t border-line-strong sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((step, i) => (
            <li
              key={step.title}
              data-reveal
              style={{ ['--reveal-delay' as string]: `${i * 80}ms` }}
              className="relative border-b border-line py-8 sm:pr-8 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:px-8 lg:first:pl-0 lg:[&:not(:last-child)]:border-r"
            >
              <span aria-hidden="true" className="absolute -top-[5px] left-0 size-2.5 rounded-full border-2 border-paper bg-steel-500 lg:left-8 lg:first:left-0" />
              <span className="serif-accent block text-[2.6rem] leading-none text-steel-500">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-5 text-xl font-semibold tracking-[-0.01em] text-ink">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col items-start gap-5 border border-line bg-porcelain p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8" data-reveal>
          <p className="max-w-xl text-lg font-medium leading-snug text-ink">
            Precisa instalar, limpar ou revisar um aparelho? Envie a solicitação e combine o melhor horário.
          </p>
          <RequestButton variant="dark" size="lg" className="w-full sm:w-auto">
            Solicitar atendimento
          </RequestButton>
        </div>
      </div>
    </section>
  );
}
