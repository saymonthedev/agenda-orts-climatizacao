import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { AppError } from './errors';
import { zodFieldErrors } from './validate';

type PgLikeError = { code?: string; constraint?: string; constraint_name?: string; cause?: unknown };

/** Extrai o código SQLSTATE do PostgreSQL (o Drizzle pode encapsular o erro original em `cause`). */
export function pgErrorCode(err: unknown): { code?: string; constraint?: string } {
  let current: unknown = err;
  for (let depth = 0; depth < 4 && current; depth++) {
    const e = current as PgLikeError;
    if (typeof e.code === 'string' && /^[0-9A-Z]{5}$/.test(e.code)) {
      return { code: e.code, constraint: e.constraint ?? e.constraint_name };
    }
    current = e.cause;
  }
  return {};
}

export function errorHandler(err: Error, c: Context) {
  const requestId = (c.get('requestId') as string | undefined) ?? undefined;

  if (err instanceof AppError) {
    if (err.status === 429) c.header('Retry-After', String((err.details as { retryAfterSeconds?: number })?.retryAfterSeconds ?? 60));
    return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos.', details: { fields: zodFieldErrors(err) } } }, 422);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'HTTP_ERROR', message: err.message || 'Requisição inválida.' } }, err.status);
  }

  const pg = pgErrorCode(err);
  if (pg.code === '23P01') {
    return c.json(
      { error: { code: 'SCHEDULE_CONFLICT', message: 'Já existe um atendimento neste horário.' } },
      409,
    );
  }
  if (pg.code === '23505') {
    return c.json({ error: { code: 'DUPLICATE', message: 'Já existe um registro com esses dados.' } }, 409);
  }
  if (pg.code === '23503') {
    return c.json({ error: { code: 'IN_USE', message: 'Registro relacionado a outros dados.' } }, 409);
  }

  logger.error('Erro não tratado na API', { err, requestId, path: c.req.path, method: c.req.method });
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Não foi possível concluir a operação. Tente novamente.', details: { requestId } } },
    500,
  );
}
