import { desc, eq } from 'drizzle-orm';
import type { z } from 'zod';
import type { PublicReviewDTO, SiteReviewDTO, siteReviewInputSchema, siteReviewUpdateSchema } from '../../contracts/reviews';
import type { Database } from '../../database/client';
import { siteReviews, type SiteReviewRow } from '../../database/schema';
import { NotFoundError } from '../../http/errors';

/** Máximo exibido no site. */
const PUBLIC_LIMIT = 12;

export function toSiteReviewDTO(row: SiteReviewRow): SiteReviewDTO {
  return {
    id: row.id,
    author: row.author,
    rating: row.rating,
    text: row.text,
    month: row.month,
    visible: row.visible,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Mais recentes primeiro. */
const newestFirst = [desc(siteReviews.month), desc(siteReviews.createdAt)] as const;

export async function listSiteReviews(db: Database): Promise<SiteReviewDTO[]> {
  const rows = await db.select().from(siteReviews).orderBy(...newestFirst);
  return rows.map(toSiteReviewDTO);
}

export async function listPublicReviews(db: Database): Promise<PublicReviewDTO[]> {
  const rows = await db
    .select()
    .from(siteReviews)
    .where(eq(siteReviews.visible, true))
    .orderBy(...newestFirst)
    .limit(PUBLIC_LIMIT);
  return rows.map(({ id, author, rating, text, month }) => ({ id, author, rating, text, month }));
}

export async function createSiteReview(db: Database, input: z.output<typeof siteReviewInputSchema>): Promise<SiteReviewDTO> {
  const [row] = await db.insert(siteReviews).values(input).returning();
  if (!row) throw new Error('Falha ao salvar a avaliação.');
  return toSiteReviewDTO(row);
}

export async function updateSiteReview(db: Database, id: string, input: z.output<typeof siteReviewUpdateSchema>): Promise<SiteReviewDTO> {
  const [row] = await db
    .update(siteReviews)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(siteReviews.id, id))
    .returning();
  if (!row) throw new NotFoundError('Avaliação não encontrada.');
  return toSiteReviewDTO(row);
}

export async function deleteSiteReview(db: Database, id: string): Promise<void> {
  const rows = await db.delete(siteReviews).where(eq(siteReviews.id, id)).returning({ id: siteReviews.id });
  if (!rows.length) throw new NotFoundError('Avaliação não encontrada.');
}
