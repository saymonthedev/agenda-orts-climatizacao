import { defineConfig } from 'drizzle-kit';

/**
 * Configuração do drizzle-kit (geração de migrations a partir do schema).
 * As migrations são aplicadas por `npm run db:migrate` (src/database/migrate.ts).
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './migrations',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/orts',
  },
});
