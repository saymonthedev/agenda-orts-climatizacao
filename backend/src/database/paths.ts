import fs from 'node:fs';
import path from 'node:path';

/**
 * Localiza a pasta do pacote backend, independentemente de quem executa
 * (scripts do backend, servidor standalone ou o Next.js em frontend/).
 */
export function resolveBackendDir(): string {
  const candidates = [
    process.env.ORTS_BACKEND_DIR,
    process.cwd(),
    path.resolve(process.cwd(), '../backend'),
    path.resolve(process.cwd(), 'backend'),
  ].filter((p): p is string => Boolean(p));
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'migrations', 'meta', '_journal.json'))) return dir;
  }
  throw new Error('Não foi possível localizar a pasta backend/migrations.');
}

export const resolveMigrationsDir = () => path.join(resolveBackendDir(), 'migrations');
