import { createApp, type CreateAppOptions } from '../src/app';
import { createPgliteDb, migratePglite, type Database } from '../src/database/client';
import { users } from '../src/database/schema';
import { addDaysToDate, todayIn, weekdayOfDate } from '../src/domain/time';
import { hashPassword } from '../src/lib/crypto';

export const ADMIN = { username: 'dono.orts', password: 'Teste@2026', name: 'Proprietário' };
export const ORIGIN = 'http://localhost';

export async function setupTestApp(options: Pick<CreateAppOptions, 'hooks'> = {}) {
  const db: Database = await createPgliteDb();
  await migratePglite(db);
  await db.insert(users).values({ name: ADMIN.name, username: ADMIN.username, passwordHash: await hashPassword(ADMIN.password) });
  const app = createApp({ db, ...options });

  const request = (path: string, init: RequestInit & { cookie?: string; json?: unknown } = {}) => {
    const headers = new Headers(init.headers);
    if (!headers.has('origin')) headers.set('origin', ORIGIN);
    if (init.cookie) headers.set('cookie', init.cookie);
    let body = init.body;
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json');
      body = JSON.stringify(init.json);
    }
    return app.request(`/api${path}`, { ...init, headers, body });
  };

  const login = async (username = ADMIN.username, password = ADMIN.password, ip = '10.0.0.1') => {
    const res = await request('/auth/login', { method: 'POST', json: { username, password }, headers: { 'x-forwarded-for': ip } });
    const setCookie = res.headers.get('set-cookie') ?? '';
    const cookie = setCookie.split(';')[0] ?? '';
    return { res, cookie };
  };

  return { db, app, request, login };
}

/** Próxima data (a pelo menos 7 dias de hoje) que cai no dia da semana informado. */
export function futureWeekday(weekday: number, minDaysAhead = 7): string {
  let date = addDaysToDate(todayIn('America/Sao_Paulo'), minDaysAhead);
  while (weekdayOfDate(date) !== weekday) date = addDaysToDate(date, 1);
  return date;
}

export async function json<T = any>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
