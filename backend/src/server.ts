/**
 * Servidor standalone do backend (desenvolvimento ou hospedagem separada).
 *   npm run dev:backend  ->  http://localhost:4000/api/health
 */
import { serve } from '@hono/node-server';
import { createApp } from './app';
import { logger } from './lib/logger';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`API ORTS ouvindo em http://localhost:${info.port}/api`);
});
