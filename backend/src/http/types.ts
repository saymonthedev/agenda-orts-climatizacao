import type { SessionUser } from '../contracts/auth';
import type { Database } from '../database/client';

export type AppHooks = {
  /** Chamado após alterações que afetam o site público (ex.: revalidar páginas estáticas). */
  onPublicProfileChanged?: () => void | Promise<void>;
};

export type AppVariables = {
  db: Database;
  hooks: AppHooks;
  requestId: string;
  user: SessionUser;
  sessionId: string;
};

export type AppEnv = { Variables: AppVariables };
