import { Hono } from 'hono';
import { z } from 'zod';
import { siteReviewInputSchema, siteReviewUpdateSchema } from '../../contracts/reviews';
import type { AppEnv } from '../../http/types';
import { parseJson, parseParam } from '../../http/validate';
import { createSiteReview, deleteSiteReview, listSiteReviews, updateSiteReview } from './reviews.service';

const idSchema = z.uuid('Identificador inválido.');

/** Avaliações exibidas no site. Toda alteração regenera a página pública. */
export const siteReviewsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ reviews: await listSiteReviews(c.var.db) }))
  .post('/', async (c) => {
    const input = await parseJson(c, siteReviewInputSchema);
    const review = await createSiteReview(c.var.db, input);
    await c.var.hooks.onPublicProfileChanged?.();
    return c.json({ review }, 201);
  })
  .patch('/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    const input = await parseJson(c, siteReviewUpdateSchema);
    const review = await updateSiteReview(c.var.db, id, input);
    await c.var.hooks.onPublicProfileChanged?.();
    return c.json({ review });
  })
  .delete('/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    await deleteSiteReview(c.var.db, id);
    await c.var.hooks.onPublicProfileChanged?.();
    return c.json({ ok: true });
  });
