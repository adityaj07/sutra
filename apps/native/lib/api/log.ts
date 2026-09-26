/**
 * Redacted development diagnostics. Production-safe by construction:
 * logs carry method + path + status/requestId only — never tokens, headers,
 * bodies, or SecureStore contents.
 */
const isDev =
  typeof process.env.NODE_ENV === "string"
    ? process.env.NODE_ENV !== "production"
    : true;

export function apiLog(message: string): void {
  if (isDev) {
    console.debug(`[api] ${message}`);
  }
}

export function apiWarn(message: string): void {
  if (isDev) {
    console.warn(`[api] ${message}`);
  }
}
