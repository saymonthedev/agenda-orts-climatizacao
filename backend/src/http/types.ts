import type { SessionUser } from '../contracts/auth';
import type { Database } from '../database/client';

export type AppVariables = {
  db: Database;
  requestId: string;
  user: SessionUser;
  sessionId: string;
};

export type AppEnv = { Variables: AppVariables };
