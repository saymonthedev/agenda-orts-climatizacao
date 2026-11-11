import { Hono } from 'hono';
import { z } from 'zod';
import { serviceInputSchema, serviceUpdateSchema } from '../../contracts/services';
import type { AppEnv } from '../../http/types';
import { parseJson, parseParam } from '../../http/validate';
import { createService, listServices, updateService } from './services.service';

const idSchema = z.uuid('Identificador inválido.');

export const servicesRoutes = new Hono<AppEnv>()
  .get('/', async (c) => c.json({ services: await listServices(c.var.db) }))
  .post('/', async (c) => {
    const input = await parseJson(c, serviceInputSchema);
    return c.json({ service: await createService(c.var.db, input) }, 201);
  })
  .patch('/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    const input = await parseJson(c, serviceUpdateSchema);
    return c.json({ service: await updateService(c.var.db, id, input) });
  });
