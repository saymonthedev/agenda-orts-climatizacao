/**
 * Aplica as migrations versionadas em backend/migrations.
 *
 *   npm run db:migrate            -> aplica no banco do DATABASE_URL (ou no PGlite local)
 *   npm run db:migrate:deploy     -> usado no build da Vercel: só roda em produção
 *                                    (ou com RUN_MIGRATIONS=true) e ignora se não houver DATABASE_URL
 */
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { getEnv } from '../config/env';
import { createPgliteDb, migratePglite } from './client';
import { resolveBackendDir, resolveMigrationsDir } from './paths';
import path from 'node:path';

async function main() {
  const deploy = process.argv.includes('--deploy');
  const env = getEnv();

  if (deploy) {
    const vercelEnv = process.env.VERCEL_ENV;
    const allowed = vercelEnv === 'production' || process.env.RUN_MIGRATIONS === 'true' || !vercelEnv;
    if (!env.DATABASE_URL) {
      console.warn('[migrate] DATABASE_URL ausente: migrations ignoradas neste build.');
      return;
    }
    if (!allowed) {
      console.log(`[migrate] Ambiente "${vercelEnv}": migrations ignoradas (defina RUN_MIGRATIONS=true para aplicar).`);
      return;
    }
  }

  if (env.DATABASE_URL) {
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    try {
      await migrate(drizzle({ client: pool }), { migrationsFolder: resolveMigrationsDir() });
      console.log('[migrate] Migrations aplicadas no PostgreSQL (Neon).');
    } finally {
      await pool.end();
    }
    return;
  }

  const dataDir = path.resolve(resolveBackendDir(), env.PGLITE_DATA_DIR);
  const db = await createPgliteDb(dataDir);
  await migratePglite(db);
  console.log(`[migrate] Migrations aplicadas no PGlite local (${dataDir}).`);
}

main().catch((err) => {
  console.error('[migrate] Falha ao aplicar migrations:', err instanceof Error ? err.message : err);
  process.exit(1);
});
