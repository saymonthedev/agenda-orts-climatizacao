import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { getDb, type Database } from './database/client';
import { errorHandler } from './http/error-handler';
import { noStore } from './http/middleware/no-store';
import { requestGuard } from './http/middleware/request-guard';
import { requireAuth } from './http/middleware/require-auth';
import type { AppEnv, AppHooks } from './http/types';
import { appointmentsRoutes, availabilityRoutes } from './modules/appointments/appointments.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { financeRoutes } from './modules/finance/finance.routes';
import { siteReviewsRoutes } from './modules/reviews/reviews.routes';
import { servicesRoutes } from './modules/services/services.routes';
import { settingsRoutes } from './modules/settings/settings.routes';

export type CreateAppOptions = {
  /** Banco a ser usado (testes injetam um PGlite em memória). */
  db?: Database | (() => Promise<Database>);
  /** Prefixo das rotas. Padrão: /api */
  basePath?: string;
  /** Integrações com quem hospeda a API (ex.: revalidação do Next.js). */
  hooks?: AppHooks;
};

/**
 * Monta a API HTTP do sistema de agendamentos.
 * Pode ser servida de forma independente (src/server.ts) ou montada
 * no Next.js (frontend/src/app/api/[[...route]]/route.ts).
 */
export function createApp(options: CreateAppOptions = {}) {
  const resolveDb = async (): Promise<Database> => {
    if (!options.db) return getDb();
    return typeof options.db === 'function' ? options.db() : options.db;
  };

  const app = new Hono<AppEnv>().basePath(options.basePath ?? '/api');

  app.use('*', requestId({ headerName: 'X-Request-Id' }));
  app.use('*', noStore);
  app.use('*', requestGuard);
  // Verificação de saúde não depende do banco.
  app.get('/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));
  app.use('*', async (c, next) => {
    c.set('db', await resolveDb());
    c.set('hooks', options.hooks ?? {});
    await next();
  });

  app.route('/auth', authRoutes);

  // Rotas privadas: a sessão é validada no backend em toda requisição.
  const privateRoutes = {
    '/appointments': appointmentsRoutes,
    '/availability': availabilityRoutes,
    '/dashboard': dashboardRoutes,
    '/finance': financeRoutes,
    '/services': servicesRoutes,
    '/settings': settingsRoutes,
    '/site-reviews': siteReviewsRoutes,
  } as const;
  for (const [prefix, routes] of Object.entries(privateRoutes)) {
    app.use(prefix, requireAuth);
    app.use(`${prefix}/*`, requireAuth);
    app.route(prefix, routes);
  }

  app.notFound((c) => c.json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } }, 404));
  app.onError(errorHandler);

  return app;
}

export type App = ReturnType<typeof createApp>;
