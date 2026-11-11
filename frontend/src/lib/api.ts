import type { ApiErrorBody } from '@orts/backend/contracts';

/** Erro de API com código estável e detalhes (campos inválidos, conflitos...). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get fields(): Record<string, string> {
    const d = this.details as { fields?: Record<string, string> } | undefined;
    return d?.fields ?? {};
  }
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal };

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Verifique a internet e tente novamente.');
  }

  if (response.ok) return (await response.json()) as T;

  let payload: ApiErrorBody | null = null;
  try {
    payload = (await response.json()) as ApiErrorBody;
  } catch {
    /* corpo vazio */
  }
  const error = new ApiError(
    response.status,
    payload?.error.code ?? 'HTTP_ERROR',
    payload?.error.message ?? 'Não foi possível concluir a operação.',
    payload?.error.details,
  );
  if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/password')) onUnauthorized?.();
  throw error;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ?? {} }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function query(params: Record<string, string | number | undefined | null | false>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== false && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}
