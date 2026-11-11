import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeonHttp } from 'drizzle-orm/neon-http';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { getEnv } from '../config/env';
import { logger } from '../lib/logger';
import { resolveBackendDir, resolveMigrationsDir } from './paths';
import * as schema from './schema';

export type Schema = typeof schema;
export type Database = PgDatabase<PgQueryResultHKT, Schema>;

const globalForDb = globalThis as unknown as { __ortsDb?: Promise<Database> };

/**
 * Conexão única por processo.
 * - Produção: Neon PostgreSQL via driver HTTP serverless (DATABASE_URL).
 * - Desenvolvimento sem DATABASE_URL: PGlite (PostgreSQL embutido), com migrations automáticas.
 */
export function getDb(): Promise<Database> {
  if (!globalForDb.__ortsDb) {
    globalForDb.__ortsDb = createDb().catch((err) => {
      globalForDb.__ortsDb = undefined;
      throw err;
    });
  }
  return globalForDb.__ortsDb;
}

async function createDb(): Promise<Database> {
  const env = getEnv();
  if (env.DATABASE_URL) {
    const client = neon(env.DATABASE_URL);
    return drizzleNeonHttp({ client, schema }) as unknown as Database;
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL não configurada no ambiente de produção.');
  }
  const dataDir = path.resolve(resolveBackendDir(), env.PGLITE_DATA_DIR);
  logger.info('Usando PGlite local para desenvolvimento', { dataDir });
  const db = await createPgliteDb(dataDir);
  await migratePglite(db);
  return db;
}

/** Cria um banco PGlite (em disco ou em memória quando `dataDir` não é informado). */
export async function createPgliteDb(dataDir?: string): Promise<Database> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  return drizzle({ client, schema }) as unknown as Database;
}

export async function migratePglite(db: Database): Promise<void> {
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  await migrate(db as never, { migrationsFolder: resolveMigrationsDir() });
}
