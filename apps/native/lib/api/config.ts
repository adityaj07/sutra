import { ENV } from "@/src/env";
import { ApiError, REQUEST_ID_HEADER } from "@/lib/api/errors";

export { REQUEST_ID_HEADER };

/**
 * Single source of truth for the API base URL.
 *
 * Source of truth is the Varlock-managed environment (`apps/native/src/env.ts`,
 * generated from `.env.schema`, wired via `@varlock/expo-integration` in
 * babel/metro config). `process.env` is read as a fallback so logic stays
 * testable outside the Expo runtime. `@sutra/env/native` is intentionally
 * NOT used — it has no consumers and would be a second competing system.
 */

function readEnvVar(name: "EXPO_PUBLIC_SERVER_URL"): string | undefined {
  try {
    // Property access on the Varlock proxy throws outside the Expo runtime
    // ("ENV not initialized"); the import itself is side-effect free.
    const value = ENV?.[name];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  } catch {
    // Fall through to process.env (tests, non-Expo runtimes).
  }

  const fallback = process.env[name];
  return typeof fallback === "string" && fallback.length > 0
    ? fallback
    : undefined;
}

/** Returns the normalized base URL (no trailing slash). Throws ApiError when unset. */
export function getBaseUrl(envOverride?: string): string {
  const raw = envOverride ?? readEnvVar("EXPO_PUBLIC_SERVER_URL");

  if (!raw) {
    throw new ApiError({
      message: "API base URL is not configured (EXPO_PUBLIC_SERVER_URL)",
      code: "missing-base-url",
    });
  }

  return raw.replace(/\/+$/, "");
}

/** Default per-request timeout. Conservative; no background refresh timers. */
export const DEFAULT_TIMEOUT_MS = 15_000;

/** Refresh-transport path. Never sent through the 401 → refresh interceptor. */
export const REFRESH_PATH = "/v1/auth/refresh-token";
