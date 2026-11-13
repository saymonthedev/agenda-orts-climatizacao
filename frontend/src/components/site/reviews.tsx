import { ArrowUpRight, Star } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ReviewsSection, SiteReview } from '@/lib/site-reviews';

const MAX_CARDS = 6;

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

/** Iniciais do primeiro e do último nome ("Gabriel Leite Medeiros" → "GM"). */
function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const picked = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return picked.map((p) => p?.[0]?.toUpperCase()).join('');
}

/** Comentários curtos ganham destaque; os longos ficam confortáveis de ler. */
function quoteSize(text: string) {
  if (text.length <= 70) return 'text-[1.65rem] leading-[1.2] sm:text-[1.8rem]';
  if (text.length <= 170) return 'text-[1.4rem] leading-[1.28]';
  return 'text-[1.2rem] leading-[1.4]';
}

/** Colunas conforme a quantidade, sem deixar um cartão sozinho numa linha. */
function gridColumns(count: number) {
  if (count === 1) return 'max-w-3xl';
  if (count === 2 || count === 4) return 'sm:grid-cols-2';
  return 'sm:grid-cols-2 lg:grid-cols-3';
}

function ReviewCard({ review, index, featured }: { review: SiteReview; index: number; featured?: boolean }) {
  return (
    <li data-reveal style={{ ['--reveal-delay' as string]: `${index * 90}ms` }} className={cn('flex', featured && 'lg:col-span-2')}>
      <figure className="flex w-full flex-col border border-line bg-porcelain p-7 sm:p-8">
        <span aria-hidden="true" className="serif-accent block h-8 select-none text-[4.5rem] leading-[0.95] text-champagne-500">
          “
        </span>
        <blockquote className="mt-4 flex-1">
          <p className={cn('serif-accent text-pretty text-ink', quoteSize(review.text))}>{review.text}</p>
        </blockquote>
        <figcaption className="mt-8 flex items-center gap-3.5 border-t border-line pt-5">
          {review.authorPhoto ? (
            // foto do autor servida pelo Google (atribuição obrigatória)
            <img src={review.authorPhoto} alt="" width={44} height={44} loading="lazy" referrerPolicy="no-referrer" className="size-11 shrink-0 rounded-full bg-steel-100 object-cover" />
          ) : (
            <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-navy-900 text-[13px] font-semibold tracking-wide text-champagne-300">
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
            <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
              <Stars value={review.rating} size="size-3.5" />
              <span>{review.when ? `Google · ${review.when}` : 'Avaliação no Google'}</span>
            </p>
          </div>
        </figcaption>
      </figure>
    </li>
  );
}

/** Avaliações do Perfil da Empresa no Google: nota e total do Google, comentários do Google e do painel. */
export function Reviews({ data }: { data: ReviewsSection | null }) {
  if (!data) return null;
  const shown = data.reviews.slice(0, MAX_CARDS);
  const hasCards = shown.length > 0;
  const perfect = data.rating !== null && data.rating >= 4.95;

  return (
    <section id="avaliacoes" className="scroll-mt-16 border-t border-line bg-paper py-20 sm:py-24 lg:scroll-mt-20 lg:py-28" aria-labelledby="avaliacoes-titulo">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div className="lg:col-span-7" data-reveal>
            <p className="eyebrow flex items-center gap-3 text-steel-600">
              <span aria-hidden="true" className="h-px w-8 bg-steel-500/60" />
              Avaliações
            </p>
            <h2 id="avaliacoes-titulo" className="display mt-6 text-[2.2rem] leading-[1.05] sm:text-5xl">
              Quem chamou, <span className="serif-accent text-steel-500">recomenda.</span>
            </h2>
            {data.rating !== null && (
              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
                {perfect ? 'Nota máxima no Google' : `Nota ${fmtRating(data.rating)} no Google`}, dada por quem já foi atendido.
              </p>
            )}
          </div>

          <div className="lg:col-span-5 lg:justify-self-end" data-reveal style={{ ['--reveal-delay' as string]: '120ms' }}>
            {data.rating !== null && (
              <div className="flex items-center gap-5">
                <span className="serif-accent tabular text-[4.5rem] leading-[0.8] text-ink sm:text-[5.5rem]">{fmtRating(data.rating)}</span>
                <div>
                  <Stars value={data.rating} size="size-5" label={`Nota ${fmtRating(data.rating)} de 5`} />
                  <p className="mt-2 text-[14px] text-muted">
                    {data.total} {data.total === 1 ? 'avaliação' : 'avaliações'} no{' '}
                    <span className="font-medium text-ink-soft">Google Maps</span>
                  </p>
                </div>
              </div>
            )}
            <div className="mt-7 flex flex-col gap-2.5 min-[420px]:flex-row">
              <a
                href={data.writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-navy-900 px-5 text-[15px] font-semibold text-porcelain transition-colors hover:bg-navy-800"
              >
                <Star className="size-4 fill-champagne-400 text-champagne-400" aria-hidden="true" /> Avaliar a ORTS
              </a>
              <a
                href={data.reviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-line-strong px-5 text-[15px] font-semibold text-ink transition-colors hover:border-ink-soft"
              >
                Ver no Google <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {hasCards && (
          <ul className={cn('mt-14 grid grid-cols-1 gap-5 lg:mt-16', gridColumns(shown.length))} aria-label="Comentários de clientes">
            {shown.map((r, i) => (
              // com 5 comentários, o primeiro ganha destaque e as linhas fecham certinho
              <ReviewCard key={r.id} review={r} index={i} featured={shown.length === 5 && i === 0} />
            ))}
          </ul>
        )}

        <p className="mt-8 text-[14px] leading-relaxed text-muted" data-reveal>
          Já foi atendido pela ORTS? Sua avaliação no Google ajuda outros clientes a escolher.
        </p>
      </div>
    </section>
  );
}
