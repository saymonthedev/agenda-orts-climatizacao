/**
 * Aplica as migrations versionadas em backend/migrations.
 *
 *   npm run db:migrate            -> aplica no banco do DATABASE_URL (ou no PGlite local)
 *   npm run db:migrate:deploy     -> usado no build da Vercel: só roda em produção
 *                                    (ou com RUN_MIGRATIONS=true) e ignora se não houver DATABASE_URL
 */
import '../config/load-env';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { getEnv } from '../config/env';
import { ensureBootstrapAdmin } from '../modules/auth/bootstrap';
import { createPgliteDb, migratePglite, type Database } from './client';
import * as schema from './schema';
import { resolveMigrationsDir, resolvePgliteDir } from './paths';

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
    // Migrations preferem a conexão direta (sem pooler) quando a integração Neon/Vercel a fornece.
    const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED || env.DATABASE_URL });
    try {
      await migrate(drizzle({ client: pool }), { migrationsFolder: resolveMigrationsDir() });
      console.log('[migrate] Migrations aplicadas no PostgreSQL (Neon).');
    } finally {
      await pool.end();
    }
    const db = drizzleHttp({ client: neon(env.DATABASE_URL), schema }) as unknown as Database;
    await reportBootstrap(await ensureBootstrapAdmin(db));
    return;
  }

  const dataDir = resolvePgliteDir(env.PGLITE_DATA_DIR);
  const db = await createPgliteDb(dataDir);
  await migratePglite(db);
  console.log(`[migrate] Migrations aplicadas no PGlite local (${dataDir}).`);
  await reportBootstrap(await ensureBootstrapAdmin(db));
}

async function reportBootstrap(result: 'created' | 'exists' | 'skipped') {
  if (result === 'created') console.log('[migrate] Conta administrativa inicial criada a partir de ADMIN_USERNAME.');
  if (result === 'skipped') console.log('[migrate] ADMIN_USERNAME/ADMIN_PASSWORD não definidos: nenhuma conta criada automaticamente.');
}

main()
  // O PGlite local mantém o processo vivo: encerra explicitamente ao terminar.
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate] Falha ao aplicar migrations:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
