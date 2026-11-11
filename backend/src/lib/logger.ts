import { getEnv } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

type Fields = Record<string, unknown>;

function serializeError(err: unknown): Fields {
  if (err instanceof Error) {
    return { errorName: err.name, errorMessage: err.message, stack: err.stack };
  }
  return { error: String(err) };
}

function write(level: Level, message: string, fields: Fields = {}) {
  let threshold: Level = 'info';
  try {
    threshold = getEnv().LOG_LEVEL;
  } catch {
    /* ambiente inválido: mantém o padrão */
  }
  if (order[level] < order[threshold]) return;
  const { err, ...rest } = fields;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...rest,
    ...(err !== undefined ? serializeError(err) : {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Logger estruturado em JSON. Nunca registre senhas, tokens ou corpos de requisição. */
export const logger = {
  debug: (msg: string, fields?: Fields) => write('debug', msg, fields),
  info: (msg: string, fields?: Fields) => write('info', msg, fields),
  warn: (msg: string, fields?: Fields) => write('warn', msg, fields),
  error: (msg: string, fields?: Fields) => write('error', msg, fields),
};
