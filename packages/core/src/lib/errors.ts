export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "unprocessable"
  | "service_unavailable"
  | "internal";

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  unprocessable: 422,
  service_unavailable: 503,
  internal: 500,
};

export class HttpError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly attributes?: Record<string, string[]>;

  constructor(code: ErrorCode, message: string, attributes?: Record<string, string[]>) {
    super(message);
    this.name = "HttpError";
    this.code = code;
    this.status = STATUS[code];
    this.attributes = attributes;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized") {
    super("unauthorized", message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden") {
    super("forbidden", message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found") {
    super("not_found", message);
  }
}

export class UnprocessableError extends HttpError {
  constructor(message = "Unprocessable entity", attributes?: Record<string, string[]>) {
    super("unprocessable", message, attributes);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message = "Service unavailable") {
    super("service_unavailable", message);
  }
}

export interface ErrorBody {
  error: string;
  attributes?: Record<string, string[]>;
}

export function toErrorBody(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof HttpError) {
    const body: ErrorBody = { error: err.message };
    if (err.attributes) body.attributes = err.attributes;
    return { status: err.status, body };
  }
  return { status: 500, body: { error: "Internal server error" } };
}
