import { refreshResponseSchema } from "@/lib/api/auth-schemas";
import type { RefreshRequestBody } from "@/lib/api/api-contract";
import {
  DEFAULT_TIMEOUT_MS,
  REFRESH_PATH,
  REQUEST_ID_HEADER,
  getBaseUrl,
} from "@/lib/api/config";
import {
  ApiError,
  apiErrorFromFetchFailure,
  apiErrorFromResponse,
} from "@/lib/api/errors";
import { apiWarn } from "@/lib/api/log";
import {
  createRefreshCoordinator,
  type RefreshTransportResult,
} from "@/lib/api/refresh-coordinator";
import { newRequestId } from "@/lib/api/request-id";
import { sessionStore } from "@/lib/auth/session-store";

/**
 * Production refresh transport + single-flight singleton.
 *
 * Raw `fetch` against POST /v1/auth/refresh-token with the JSON-body
 * (native) transport — deliberately NOT routed through the authenticated
 * API client: no Bearer header, no 401 → refresh handling, so the refresh
 * endpoint can never recursively trigger itself (§14).
 */

// Replaces the earlier working-tree draft, which cleared the session on any
// non-OK status (including 5xx), duplicated the response type by hand, and
// had no timeout. Kept: the shared-Promise single-flight shape.

async function executeRefresh(
  refreshToken: string,
): Promise<RefreshTransportResult> {
  const baseUrl = getBaseUrl();
  const requestId = newRequestId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  // Native JSON-body transport, shaped by the generated contract.
  const requestBody: RefreshRequestBody = { refreshToken };

  try {
    const response = await fetch(`${baseUrl}${REFRESH_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        [REQUEST_ID_HEADER]: requestId,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const responseRequestId =
      response.headers.get(REQUEST_ID_HEADER) ?? requestId;

    if (!response.ok) {
      throw await apiErrorFromResponse({
        response,
        requestId: responseRequestId,
      });
    }

    let json: unknown = null;
    try {
      json = await response.json();
    } catch (error) {
      throw new ApiError({
        message: "Invalid refresh response",
        code: "invalid-response",
        requestId: responseRequestId,
        cause: error,
      });
    }

    const parsed = refreshResponseSchema.safeParse(json);
    if (!parsed.success) {
      apiWarn("refresh.response.invalid", { requestId: responseRequestId });
      throw new ApiError({
        message: "Invalid refresh response",
        code: "invalid-response",
        requestId: responseRequestId,
      });
    }

    const { accessToken, refreshToken: nextRefreshToken, accessTokenExpiresAt } =
      parsed.data.payload;

    if (!nextRefreshToken) {
      // Cookie-transport shape (pair omitted); unusable for native.
      throw new ApiError({
        message: "Invalid refresh response",
        code: "invalid-response",
        requestId: responseRequestId,
      });
    }

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      accessTokenExpiresAt,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw apiErrorFromFetchFailure({
      error,
      timedOut: controller.signal.aborted,
      requestId,
    });
  } finally {
    clearTimeout(timer);
  }
}

const coordinator = createRefreshCoordinator({
  loadRefreshToken: () => sessionStore.getRefreshToken(),
  currentRefreshToken: () => sessionStore.getRefreshToken(),
  persistTokens: (tokens) => sessionStore.setTokens(tokens),
  clearSession: () => sessionStore.clear(),
  getGeneration: () => sessionStore.getGeneration(),
  executeRefresh,
});

/**
 * Single-flight refresh. Concurrent callers share one network request;
 * exactly one rotation per 401 wave, so backend reuse detection can never
 * be tripped by our own concurrency.
 */
export const refreshAccessToken: () => Promise<string> =
  coordinator.refreshAccessToken;
