import { logger, type LogFields } from "@/lib/log";

/**
 * API logging adapter: decides what counts as an API event, which level it
 * deserves, and which contract fields describe it. Formatting, gating, and the
 * safe-field boundary belong to `@/lib/log`.
 *
 * Nothing here may receive a token, header, body, `ApiError`, or server
 * message — only the allow-listed `LogFields` primitives.
 */

/** Level + event for a completed request attempt. */
const RESULT_EVENTS = {
  started: { level: "debug", event: "request.started" },
  success: { level: "debug", event: "request.completed" },
  "http-error": { level: "debug", event: "request.failed" },
  "success-after-refresh": {
    level: "debug",
    event: "request.completed_after_refresh",
  },
  "error-after-refresh": {
    level: "debug",
    event: "request.failed_after_refresh",
  },
} as const satisfies Record<
  string,
  { level: "debug" | "info" | "warn" | "error"; event: string }
>;

/** How a single request attempt ended. */
export type ApiRequestOutcome = keyof typeof RESULT_EVENTS;

export interface ApiRequestLog extends LogFields {
  method: string;
  path: string;
  outcome: ApiRequestOutcome;
}

/**
 * One line per request attempt (start, success, HTTP failure, post-refresh
 * retry). Deliberately `debug`: a 4xx/5xx the transport already handles — a
 * 401 absorbed by the refresh flow, a 429 — is expected traffic, not a
 * production incident. Escalating it belongs to event policy, not here.
 */
export function logApiRequest(request: ApiRequestLog): void {
  const { level, event } = RESULT_EVENTS[request.outcome];
  logger[level]("api", event, { ...request, outcome: request.outcome });
}

/**
 * Debug-level API/session event. The message is a short, already-redacted
 * literal — never server text, a token, or an interpolated identifier; pass
 * identifiers as fields instead.
 */
export function apiLog(message: string, fields?: LogFields): void {
  logger.debug("api", message, fields);
}

/**
 * Warning-level API event. Reserved for things that indicate a real problem
 * in a release build — today, a response that violated the contract mirror.
 */
export function apiWarn(message: string, fields?: LogFields): void {
  logger.warn("api", message, fields);
}
