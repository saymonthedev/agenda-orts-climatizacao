import { Hono } from 'hono';
import { z } from 'zod';
import {
  financeCategoryInputSchema,
  financeCategoryUpdateSchema,
  financeEntryInputSchema,
  financeEntryUpdateSchema,
  financeExportQuerySchema,
  financeListQuerySchema,
  financeSummaryQuerySchema,
} from '../../contracts/finance';
import { ValidationError } from '../../http/errors';
import type { AppEnv } from '../../http/types';
import { parseJson, parseParam, parseQuery } from '../../http/validate';
import {
  createCategory,
  createEntry,
  deleteCategory,
  deleteEntry,
  exportEntriesCsv,
  financeSummary,
  getEntry,
  listCategories,
  listEntries,
  updateCategory,
  updateEntry,
} from './finance.service';

const idSchema = z.uuid('Identificador inválido.');

export const financeRoutes = new Hono<AppEnv>()
  .get('/categories', async (c) => c.json({ categories: await listCategories(c.var.db) }))
  .post('/categories', async (c) => {
    const input = await parseJson(c, financeCategoryInputSchema);
    return c.json({ category: await createCategory(c.var.db, input) }, 201);
  })
  .patch('/categories/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    const input = await parseJson(c, financeCategoryUpdateSchema);
    return c.json({ category: await updateCategory(c.var.db, id, input) });
  })
  .delete('/categories/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    return c.json(await deleteCategory(c.var.db, id));
  })

  .get('/entries', async (c) => c.json(await listEntries(c.var.db, parseQuery(c, financeListQuerySchema))))
  .get('/entries/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    return c.json({ entry: await getEntry(c.var.db, id) });
  })
  .post('/entries', async (c) => {
    const input = await parseJson(c, financeEntryInputSchema);
    return c.json({ entry: await createEntry(c.var.db, input) }, 201);
  })
  .patch('/entries/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    const input = await parseJson(c, financeEntryUpdateSchema);
    return c.json({ entry: await updateEntry(c.var.db, id, input) });
  })
  .delete('/entries/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    await deleteEntry(c.var.db, id);
    return c.json({ ok: true });
  })

  .get('/summary', async (c) => {
    const { month } = parseQuery(c, financeSummaryQuerySchema);
    return c.json({ summary: await financeSummary(c.var.db, month) });
  })
  .get('/export', async (c) => {
    const { from, to } = parseQuery(c, financeExportQuerySchema);
    if (from > to) throw new ValidationError('Período inválido.', { from: 'A data inicial deve ser antes da final.' });
    const csv = await exportEntriesCsv(c.var.db, from, to);
    return c.body(csv, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="financeiro-orts-${from}-a-${to}.csv"`,
    });
  });
