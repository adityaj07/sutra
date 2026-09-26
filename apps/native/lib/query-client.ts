import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";

/**
 * Shared QueryClient singleton.
 *
 * Conservative production defaults only; no domain-specific tuning yet.
 * - Query retries skip non-retryable API errors (401/403/404/400 — the API
 *   client already performs the single bounded 401 → refresh → retry, and
 *   query-level retries must not re-trigger it).
 * - Mutations never auto-retry (message sends get explicit UI retry).
 * - No cache persistence yet (tokens must never enter the cache; product
 *   has no offline requirement at this stage).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.isNonRetryable) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
