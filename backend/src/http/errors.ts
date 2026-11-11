import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorDetails = Record<string, unknown> | unknown[] | undefined;

/** Erro de aplicação com status HTTP e código estável para o frontend. */
export class AppError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos.', fields?: Record<string, string>) {
    super(422, 'VALIDATION_ERROR', message, fields ? { fields } : undefined);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Sessão expirada. Entre novamente.') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado.') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Registro não encontrado.') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails, code = 'CONFLICT') {
    super(409, code, message, details);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details?: ErrorDetails) {
    super(422, code, message, details);
    this.name = 'BusinessRuleError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfterSeconds: number) {
    super(429, 'RATE_LIMITED', message, { retryAfterSeconds });
    this.name = 'RateLimitError';
  }
}
