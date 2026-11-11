import type { Context } from 'hono';
import type { z } from 'zod';
import { ValidationError } from './errors';

/** Converte issues do Zod em { campo: mensagem } (primeira mensagem por campo). */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = zodFieldErrors(result.error);
    const first = Object.values(fields)[0];
    throw new ValidationError(first ?? 'Dados inválidos.', fields);
  }
  return result.data;
}

export async function parseJson<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new ValidationError('Corpo da requisição inválido.');
  }
  return parse(schema, body);
}

export function parseQuery<S extends z.ZodType>(c: Context, schema: S): z.output<S> {
  return parse(schema, c.req.query());
}

export function parseParam<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  return parse(schema, value);
}
