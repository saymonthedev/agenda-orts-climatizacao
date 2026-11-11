import { Hono } from 'hono';
import { z } from 'zod';
import {
  appointmentCreateSchema,
  appointmentListQuerySchema,
  appointmentUpdateSchema,
  statusUpdateSchema,
} from '../../contracts/appointments';
import { availabilityQuerySchema } from '../../contracts/availability';
import type { AppEnv } from '../../http/types';
import { parseJson, parseParam, parseQuery } from '../../http/validate';
import {
  changeAppointmentStatus,
  createAppointment,
  deleteAppointment,
  getAppointment,
  getAvailability,
  listAppointments,
  updateAppointment,
} from './appointments.service';

const idSchema = z.uuid('Identificador inválido.');

export const appointmentsRoutes = new Hono<AppEnv>()
  .get('/', async (c) => {
    const query = parseQuery(c, appointmentListQuerySchema);
    return c.json(await listAppointments(c.var.db, query));
  })
  .post('/', async (c) => {
    const input = await parseJson(c, appointmentCreateSchema);
    return c.json({ appointment: await createAppointment(c.var.db, input) }, 201);
  })
  .get('/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    return c.json({ appointment: await getAppointment(c.var.db, id) });
  })
  .patch('/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    const input = await parseJson(c, appointmentUpdateSchema);
    return c.json({ appointment: await updateAppointment(c.var.db, id, input) });
  })
  .patch('/:id/status', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    const { status } = await parseJson(c, statusUpdateSchema);
    return c.json({ appointment: await changeAppointmentStatus(c.var.db, id, status) });
  })
  .delete('/:id', async (c) => {
    const id = parseParam(idSchema, c.req.param('id'));
    await deleteAppointment(c.var.db, id);
    return c.json({ ok: true });
  });

export const availabilityRoutes = new Hono<AppEnv>().get('/', async (c) => {
  const query = parseQuery(c, availabilityQuerySchema);
  return c.json({ availability: await getAvailability(c.var.db, query) });
});
