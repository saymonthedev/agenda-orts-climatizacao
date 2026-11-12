import { ArrowUpRight, Star } from 'lucide-react';
import type { GoogleReview, GoogleReviews } from '@/lib/google-reviews';
import { cn } from '@/lib/cn';

const fmtRating = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Stars({ value, size = 'size-4', label }: { value: number; size?: string; label?: string }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${rounded} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden="true" className={cn(size, i < rounded ? 'fill-champagne-500 text-champagne-500' : 'fill-transparent text-line-strong')} />
      ))}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function ReviewCard({ review, index }: { review: GoogleReview; index: number }) {
  return (
    <li
      data-reveal
      style={{ ['--reveal-delay' as string]: `${index * 80}ms` }}
      className="flex flex-col rounded-xl border border-line bg-paper p-6 shadow-[0_1px_2px_rgb(15_24_40/0.04)] sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <Stars value={review.rating} />
        {review.relativeTime && <span className="text-[13px] text-subtle">{review.relativeTime}</span>}
      </div>
      {review.text ? (
        <blockquote className="mt-4 flex-1">
          <p className="line-clamp-6 text-[15px] leading-relaxed text-ink-soft">“{review.text}”</p>
        </blockquote>
      ) : (
        <p className="mt-4 flex-1 text-[15px] leading-relaxed text-muted">Avaliou o atendimento com {review.rating} {review.rating === 1 ? 'estrela' : 'estrelas'}.</p>
      )}
      <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
        {review.authorPhoto ? (
          // foto do autor servida pelo Google (atribuição obrigatória)
          <img src={review.authorPhoto} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" className="size-10 shrink-0 rounded-full bg-steel-100 object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-steel-100 text-[13px] font-semibold text-steel-700">
            {initials(review.author)}
          </span>
        )}
        <div className="min-w-0">
          {review.authorUrl ? (
            <a href={review.authorUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[15px] font-semibold text-ink underline-offset-4 hover:underline">
              {review.author}
            </a>
          ) : (
            <p className="truncate text-[15px] font-semibold text-ink">{review.author}</p>
          )}
          {review.url ? (
            <a href={review.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline">
              Ver avaliação no Google
            </a>
          ) : (
            <p className="text-[13px] text-muted">Avaliação no Google</p>
          )}
        </div>
      </div>
    </li>
  );
}

/** Nota, total, atribuição e botões (Ver no Google / Avaliar). */
function Summary({ data, wide }: { data: GoogleReviews; wide: boolean }) {
  return (
    <div className={cn('rounded-xl border border-line bg-porcelain p-6 sm:p-7', wide && 'lg:p-9')}>
      {data.rating !== null && (
        <div className="flex items-end gap-4">
          <span className={cn('display leading-none tracking-[-0.04em] text-ink tabular', wide ? 'text-[4rem] lg:text-[5.25rem]' : 'text-[4rem]')}>{fmtRating(data.rating)}</span>
          <div className="pb-1.5">
            <Stars value={data.rating} size={wide ? 'size-6' : 'size-5'} label={`Nota ${fmtRating(data.rating)} de 5`} />
            <p className="mt-1 text-[14px] text-muted">
              {data.total} {data.total === 1 ? 'avaliação' : 'avaliações'} no Google
            </p>
          </div>
        </div>
      )}
      <p className="mt-5 text-[13px] text-muted">
        Avaliações publicadas no <span className="font-medium text-ink-soft">Google Maps</span>
      </p>
      <div className={cn('mt-6 grid gap-2.5 sm:grid-cols-2', !wide && 'lg:grid-cols-1')}>
        <a
          href={data.reviewsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-navy-900 px-5 text-[15px] font-semibold text-porcelain transition-colors hover:bg-navy-800"
        >
          Ver no Google <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
        <a
          href={data.writeReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-line-strong px-5 text-[15px] font-semibold text-ink transition-colors hover:border-ink-soft"
        >
          Avaliar a ORTS
        </a>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-muted">Já foi atendido pela ORTS? Sua avaliação ajuda outros clientes.</p>
    </div>
  );
}

/** Avaliações do Perfil da Empresa no Google (some quando não há dados). */
export function Reviews({ data }: { data: GoogleReviews | null }) {
  if (!data) return null;
  const shown = data.reviews.slice(0, 4);
  const hasCards = shown.length > 0;
  const heading = (
    <>
      <p className="eyebrow flex items-center gap-3 text-steel-600">
        <span aria-hidden="true" className="h-px w-8 bg-steel-500/60" />
        Avaliações
      </p>
      <h2 id="avaliacoes-titulo" className="display mt-6 text-[2.2rem] leading-[1.05] sm:text-5xl">
        Quem chamou, <span className="serif-accent text-steel-500">recomenda.</span>
      </h2>
    </>
  );

  return (
    <section id="avaliacoes" className="scroll-mt-16 border-t border-line bg-paper py-20 sm:py-24 lg:scroll-mt-20 lg:py-28" aria-labelledby="avaliacoes-titulo">
      <div className="container-page">
        {hasCards ? (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4 lg:self-start lg:sticky lg:top-28" data-reveal>
              {heading}
              <div className="mt-10">
                <Summary data={data} wide={false} />
              </div>
            </div>
            <ul className={cn('grid grid-cols-1 gap-5 lg:col-span-8', shown.length > 1 && 'sm:grid-cols-2')} aria-label="Avaliações de clientes">
              {shown.map((r, i) => (
                <ReviewCard key={`${r.author}-${i}`} review={r} index={i} />
              ))}
            </ul>
          </div>
        ) : (
          // ainda sem comentários escritos: título e nota lado a lado
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
            <div className="lg:col-span-6" data-reveal>
              {heading}
              {data.rating !== null && (
                <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
                  {data.rating >= 4.95 ? 'Nota máxima no Google' : `Nota ${fmtRating(data.rating)} no Google`}, dada por quem já foi atendido.
                </p>
              )}
            </div>
            <div className="lg:col-span-6" data-reveal style={{ ['--reveal-delay' as string]: '120ms' }}>
              <Summary data={data} wide />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
