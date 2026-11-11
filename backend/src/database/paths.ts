import fs from 'node:fs';
import os from 'node:os';
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

/**
 * Pasta de dados do PGlite (desenvolvimento local). Fica fora do repositório para
 * não disparar o recarregamento automático do servidor de desenvolvimento.
 * Caminhos relativos são resolvidos em ~/.orts-agenda/.
 */
export function resolvePgliteDir(configured: string): string {
  return path.isAbsolute(configured) ? configured : path.join(os.homedir(), '.orts-agenda', configured);
}
