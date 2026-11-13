import type { PublicReviewDTO } from '@orts/backend/contracts';
import { SITE } from '@/content/site';
import { relativeMonth } from './format';
import type { GoogleReviews } from './google-reviews';

export type SiteReview = {
  id: string;
  author: string;
  authorUrl: string | null;
  authorPhoto: string | null;
  rating: number;
  text: string;
  /** "há 7 meses" */
  when: string;
};

export type ReviewsSection = {
  /** Nota e total do Google (null quando o Google não respondeu). */
  rating: number | null;
  total: number;
  reviewsUrl: string;
  writeReviewUrl: string;
  /** Só avaliações com comentário. */
  reviews: SiteReview[];
};

const sameName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Junta a nota do Google com os comentários: os que a API do Google mandar (se mandar)
 * e os cadastrados no painel, sem repetir a mesma pessoa.
 */
export function buildReviewsSection(google: GoogleReviews | null, panel: PublicReviewDTO[], today?: string): ReviewsSection | null {
  const fromGoogle: SiteReview[] = (google?.reviews ?? [])
    .filter((r) => r.text)
    .map((r, i) => ({ id: `google-${i}`, author: r.author, authorUrl: r.authorUrl, authorPhoto: r.authorPhoto, rating: r.rating, text: r.text, when: r.relativeTime }));
  const seen = new Set(fromGoogle.map((r) => sameName(r.author)));
  const fromPanel: SiteReview[] = panel
    .filter((r) => !seen.has(sameName(r.author)))
    .map((r) => ({ id: r.id, author: r.author, authorUrl: null, authorPhoto: null, rating: r.rating, text: r.text, when: relativeMonth(r.month, today) }));

  const reviews = [...fromGoogle, ...fromPanel];
  if (!google && !reviews.length) return null;
  const place = encodeURIComponent(SITE.googlePlaceId);
  return {
    rating: google?.rating ?? null,
    total: google?.total ?? 0,
    reviewsUrl: google?.reviewsUrl ?? `https://www.google.com/maps/place/?q=place_id:${place}`,
    writeReviewUrl: google?.writeReviewUrl ?? `https://search.google.com/local/writereview?placeid=${place}`,
    reviews,
  };
}
