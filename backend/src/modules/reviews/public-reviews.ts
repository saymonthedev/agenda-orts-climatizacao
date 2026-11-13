import type { PublicReviewDTO } from '../../contracts/reviews';
import { getDb } from '../../database/client';
import { logger } from '../../lib/logger';
import { listPublicReviews } from './reviews.service';

/**
 * Avaliações cadastradas no painel para o site institucional.
 * Nunca lança erro: sem banco disponível, o site é gerado sem elas.
 */
export async function getPublicReviews(): Promise<PublicReviewDTO[]> {
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
  if (!process.env.DATABASE_URL && isBuild) return [];
  try {
    return await listPublicReviews(await getDb());
  } catch (err) {
    logger.warn('Avaliações do site indisponíveis', { err });
    return [];
  }
}
