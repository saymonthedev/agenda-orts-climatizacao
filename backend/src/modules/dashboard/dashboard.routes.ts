import { Hono } from 'hono';
import type { AppEnv } from '../../http/types';
import { getDashboard } from './dashboard.service';

export const dashboardRoutes = new Hono<AppEnv>().get('/', async (c) => c.json({ dashboard: await getDashboard(c.var.db) }));
