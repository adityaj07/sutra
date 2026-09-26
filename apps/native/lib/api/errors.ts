import { errorEnvelopeSchema } from "@/lib/api/auth-schemas";

/** Response header set by server `requestId()` middleware; echoed for support. */
export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Client-side normalized API error.
 *
 * Mirrors the backend `{ message, errors? }` envelope
 * (packages/shared/src/error-schemas.ts) and adds transport-level
 * classification so callers can distinguish auth failures (401 → refresh),
 * authorization failures (403 → never refresh), rate limits, server errors,
 * network failures, timeouts, and cancellations.
 *
 * Never carries tokens, headers, cookies, or request bodies.
 */
export type ApiErrorCode =
  | "missing-base-url"
  | "network-error"
  | "timeout"
  | "cancelled"
  | "invalid-response"
  | `http-${number}`;

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** HTTP status when the server responded, else null (transport failure). */
  readonly status: number | null;
  /** Server-provided message (backend `message` field) or transport message. */
  readonly serverMessage: string;
  /** Backend `errors` map for 400 validation failures. */
  readonly validationErrors?: Record<string, string>;
  /** Echo of the server `X-Request-Id` response header, if present. */
  readonly requestId?: string;

  constructor(options: {
    message: string;
    code: ApiErrorCode;
    status?: number | null;
    serverMessage?: string;
    validationErrors?: Record<string, string>;
    requestId?: string;
    cause?: unknown;
  }) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status ?? null;
    this.serverMessage = options.serverMessage ?? options.message;
    this.validationErrors = options.validationErrors;
    this.requestId = options.requestId;
  }

  /** True for HTTP 401 — the only status that may trigger a token refresh. */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isNetworkError(): boolean {
    return this.code === "network-error";
  }

  get isTimeout(): boolean {
    return this.code === "timeout";
  }

  get isCancelled(): boolean {
    return this.code === "cancelled";
  }

  /** True when retrying is unsafe or pointless (auth/permissions/client). */
  get isNonRetryable(): boolean {
    return (
      this.status === 401 ||
      this.status === 403 ||
      this.status === 404 ||
      this.status === 400
    );
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Build an ApiError from a non-2xx HTTP response.
 * Reads the backend `{ message, errors? }` envelope when the body is JSON;
 * falls back to status text when it is not. Never includes bodies/headers.
 */
export async function apiErrorFromResponse(options: {
  response: Response;
  requestId?: string;
}): Promise<ApiError> {
  const { response } = options;
  const status = response.status;
  const requestId = response.headers.get(REQUEST_ID_HEADER) ?? options.requestId;

  let serverMessage: string | undefined;
  let validationErrors: Record<string, string> | undefined;

  const bodyText = await response.text().catch(() => "");
  if (bodyText) {
    try {
      const parsed: unknown = JSON.parse(bodyText);
      const envelope = errorEnvelopeSchema.safeParse(parsed);
      if (envelope.success) {
        serverMessage = envelope.data.message;
        validationErrors = envelope.data.errors;
      }
    } catch {
      // Non-JSON error body (proxy HTML, empty, etc.) — use status fallback.
    }
  }

  const fallback = `Request failed with status ${status}`;
  const message = serverMessage ?? fallback;

  return new ApiError({
    message,
    code: `http-${status}`,
    status,
    serverMessage,
    validationErrors,
    requestId,
  });
}

/** Classify a `fetch()` rejection into an ApiError (network/timeout/cancel). */
export function apiErrorFromFetchFailure(options: {
  error: unknown;
  timedOut: boolean;
  requestId?: string;
}): ApiError {
  const { error, timedOut, requestId } = options;

  if (timedOut) {
    return new ApiError({
      message: "Request timed out",
      code: "timeout",
      requestId,
      cause: error,
    });
  }

  if (
    error instanceof DOMException
      ? error.name === "AbortError"
      : error instanceof Error && error.name === "AbortError"
  ) {
    return new ApiError({
      message: "Request was cancelled",
      code: "cancelled",
      requestId,
      cause: error,
    });
  }

  return new ApiError({
    message: "Network request failed",
    code: "network-error",
    requestId,
    cause: error,
  });
}
