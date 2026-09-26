import { readEnv } from "@/lib/env";

/**
 * Native logger: levels, environment gating, scope, formatting, and the
 * console sink. Nothing domain-specific lives here.
 *
 * Layering:
 *   call sites (API, session, …) → domain adapters → logger → console
 *
 * Output is one greppable line per event, with no timestamp (Metro/device logs
 * already carry one) and no JSON blobs:
 *
 *   [api] warn request.invalid method=GET path=/v1/auth/me status=200
 *
 * ## Safe-field boundary
 *
 * `LogFields` is a closed, primitive-only set. There is no
 * `Record<string, unknown>` escape hatch and no recursive serialization, so a
 * caller cannot hand the logger an access token, a header map, a request or
 * response body, an `ApiError`, or any raw `Error`/`cause` — those types are
 * not assignable, and unknown keys are dropped again at runtime.
 *
 * Server-controlled text (backend `message`, validation `errors`) is
 * deliberately NOT a field: `packages/shared/src/error-handler.ts` echoes
 * `err.message` into the response envelope, so it can carry internal detail.
 * Log the classification (`code`, `status`) and the `requestId` instead, and
 * let support correlate with the server.
 */

/** Severity, ordered from most to least chatty. */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * The only values that may be attached to a log event. All primitives; all
 * non-sensitive by construction.
 */
export interface LogFields {
  /** HTTP method, e.g. `GET`. */
  method?: string;
  /** Contract path literal, e.g. `/v1/auth/me`. Never a full URL. */
  path?: string;
  /** HTTP status code. */
  status?: number;
  /** Client-side duration in milliseconds. */
  durationMs?: number;
  /** Correlation ID: generated per request, echoed from `X-Request-Id`. */
  requestId?: string;
  /** Caller-defined short classification, e.g. `http-error`. */
  outcome?: string;
  /** Stable error/classification code, e.g. `network-error`. */
  code?: string;
  /** Small numeric measurement, e.g. a batch size. */
  count?: number;
}

/** Field emission order — fixed so output stays deterministic. */
const FIELD_ORDER = [
  "method",
  "path",
  "status",
  "durationMs",
  "requestId",
  "outcome",
  "code",
  "count",
] as const satisfies readonly (keyof LogFields)[];

/** Expected primitive per field; anything else is dropped. */
const FIELD_TYPES = {
  method: "string",
  path: "string",
  status: "number",
  durationMs: "number",
  requestId: "string",
  outcome: "string",
  code: "string",
  count: "number",
} as const satisfies Record<keyof LogFields, "string" | "number">;

const CONSOLE_METHOD = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
} as const satisfies Record<LogLevel, "debug" | "info" | "warn" | "error">;

/** Levels that are noise in a release build. */
const DEV_ONLY_LEVELS = new Set<LogLevel>(["debug", "info"]);

/**
 * `debug`/`info` are development/test only; `warn`/`error` are always
 * emitted, so contract drift and auth failures stay visible in release builds.
 *
 * Read lazily per call: the Varlock proxy is only initialized inside the Expo
 * runtime, and a module-load snapshot would both throw under `bun test` and
 * go stale if the environment changed. Unknown/absent `NODE_ENV` counts as
 * non-production, matching the pre-logger behavior.
 */
function isProduction(): boolean {
  return readEnv("NODE_ENV") === "production";
}

/** Renders the allow-listed fields; unknown keys and non-primitives dropped. */
function formatFields(fields: LogFields | undefined): string {
  if (!fields) {
    return "";
  }

  let line = "";
  for (const key of FIELD_ORDER) {
    const value: unknown = fields[key];
    if (typeof value !== FIELD_TYPES[key]) {
      continue;
    }
    // Primitives only, so interpolation is safe: no [object Object], no JSON.
    line += ` ${key}=${value as string | number}`;
  }
  return line;
}

function write(
  level: LogLevel,
  scope: string,
  event: string,
  fields?: LogFields,
): void {
  if (DEV_ONLY_LEVELS.has(level) && isProduction()) {
    return;
  }
  console[CONSOLE_METHOD[level]](
    `[${scope}] ${level} ${event}${formatFields(fields)}`,
  );
}

/**
 * Structured logger. `scope` groups a subsystem (`api`, `session`, …) and
 * `event` names what happened (`request.completed`, `response.invalid`, …).
 *
 * Call sites pass domain facts; formatting, gating, and the safe-field
 * boundary stay here.
 */
export const logger = {
  debug: (scope: string, event: string, fields?: LogFields): void =>
    write("debug", scope, event, fields),
  info: (scope: string, event: string, fields?: LogFields): void =>
    write("info", scope, event, fields),
  warn: (scope: string, event: string, fields?: LogFields): void =>
    write("warn", scope, event, fields),
  error: (scope: string, event: string, fields?: LogFields): void =>
    write("error", scope, event, fields),
};
