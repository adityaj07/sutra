import { readEnv } from "@/lib/env";
import type { ApiPath } from "@sutra/api-types";
import { ApiError, REQUEST_ID_HEADER } from "@/lib/api/errors";

export { REQUEST_ID_HEADER };

/**
 * Single source of truth for the API base URL.
 *
 * Read through the shared Varlock-backed environment reader (`@/lib/env`), so
 * the Expo runtime and `bun test` resolve configuration the same way.
 */

/** Returns the normalized base URL (no trailing slash). Throws ApiError when unset. */
export function getBaseUrl(envOverride?: string): string {
  const raw = envOverride ?? readEnv("EXPO_PUBLIC_SERVER_URL");

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

/**
 * Refresh-transport path. Never sent through the 401 → refresh interceptor.
 * `satisfies ApiPath` keeps the literal type (so it still matches the
 * transport's `path` parameter) while failing compilation if the backend ever
 * renames or removes the route — which would silently disable the guard.
 */
export const REFRESH_PATH = "/v1/auth/refresh-token" satisfies ApiPath;
