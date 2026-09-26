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
import { apiLog, apiWarn } from "@/lib/api/log";
import { refreshAccessToken } from "@/lib/api/auth-refresh";
import {
  isRefreshError,
  type RefreshError,
} from "@/lib/api/refresh-coordinator";
import { newRequestId } from "@/lib/api/request-id";
import { sessionStore } from "@/lib/auth/session-store";

/**
 * Low-level native API transport over `fetch`. Knows HTTP + auth/session
 * concerns only — no domain logic (channels, messages, organizations, ...).
 *
 * Authenticated flow: `Authorization: Bearer <access-token>` (never cookies).
 * On 401 (and only 401): single-flight refresh, then exactly one retry.
 * 403/404/429/5xx never trigger refresh. The refresh endpoint itself never
 * passes through this interceptor.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Minimal structural type satisfied by any Zod object schema. */
export interface ResponseSchema<T> {
  safeParse: (data: unknown) =>
    | { success: true; data: T }
    | { success: false; error: unknown };
}

export interface ApiRequestOptions<T> {
  method?: HttpMethod;
  /** JSON-serializable body (methods other than GET). */
  body?: unknown;
  /** Validates the success payload; inferred type flows to the caller. */
  schema?: ResponseSchema<T>;
  /** Default true. False for the refresh transport and public endpoints. */
  auth?: boolean;
  timeoutMs?: number;
  /** Caller cancellation (unmount, navigation away). Never retried. */
  signal?: AbortSignal;
  // Test seams (production call sites omit all of these):
  baseUrlOverride?: string;
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  refresher?: () => Promise<string>;
  notifyAuthInvalid?: () => void;
}

type AuthInvalidHandler = () => void;

let authInvalidHandler: AuthInvalidHandler = () => {
  void sessionStore.clear();
};

/**
 * Registered by the session provider so background 401s (e.g. refresh
 * rejected while the app is foregrounded) transition lifecycle state, not
 * just storage. Defaults to clearing SecureStore.
 */
export function registerAuthInvalidHandler(handler: AuthInvalidHandler): void {
  authInvalidHandler = handler;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  return error instanceof Error && error.name === "AbortError";
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions<T> = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    schema,
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: callerSignal,
    baseUrlOverride,
    fetchImpl = fetch,
    getAccessToken = () => sessionStore.getAccessToken(),
    refresher = refreshAccessToken,
    notifyAuthInvalid = authInvalidHandler,
  } = options;

  const baseUrl = getBaseUrl(baseUrlOverride);
  const requestId = newRequestId();
  apiLog(`${method} ${path}`);

  const doFetch = async (accessToken: string | null): Promise<Response> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      [REQUEST_ID_HEADER]: requestId,
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const controller = new AbortController();
    let timedOut = false;
    const onCallerAbort = () => controller.abort();
    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort();
      } else {
        callerSignal.addEventListener("abort", onCallerAbort, { once: true });
      }
    }
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      return await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error) && !timedOut && callerSignal?.aborted) {
        throw apiErrorFromFetchFailure({ error, timedOut: false, requestId });
      }
      throw apiErrorFromFetchFailure({ error, timedOut, requestId });
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    }
  };

  const readSuccess = async (response: Response): Promise<T> => {
    const responseRequestId =
      response.headers.get(REQUEST_ID_HEADER) ?? requestId;

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new ApiError({
        message: "Invalid response from server",
        code: "invalid-response",
        status: response.status,
        requestId: responseRequestId,
      });
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (error) {
      throw new ApiError({
        message: "Invalid response from server",
        code: "invalid-response",
        status: response.status,
        requestId: responseRequestId,
        cause: error,
      });
    }

    if (schema) {
      const parsed = schema.safeParse(json);
      if (!parsed.success) {
        apiWarn(`response validation failed for ${method} ${path}`);
        throw new ApiError({
          message: "Invalid response from server",
          code: "invalid-response",
          status: response.status,
          requestId: responseRequestId,
        });
      }
      return parsed.data;
    }

    return json as T;
  };

  const fail = async (response: Response): Promise<never> => {
    const responseRequestId =
      response.headers.get(REQUEST_ID_HEADER) ?? requestId;
    const error = await apiErrorFromResponse({
      response,
      requestId: responseRequestId,
    });
    apiLog(`${method} ${path} → ${error.status}`);
    throw error;
  };

  // Initial attempt.
  const token = auth ? await getAccessToken() : null;
  const response = await doFetch(token);

  if (response.ok) {
    apiLog(`${method} ${path} → ${response.status}`);
    return readSuccess(response);
  }

  const error = await apiErrorFromResponse({
    response,
    requestId: response.headers.get(REQUEST_ID_HEADER) ?? requestId,
  });
  apiLog(`${method} ${path} → ${error.status}`);

  // Bounded auth recovery: exactly one refresh + one retry, 401 only, never
  // for the refresh transport itself.
  if (error.isAuthError && auth && path !== REFRESH_PATH) {
    let refreshedToken: string;
    try {
      refreshedToken = await refresher();
    } catch (refreshFailure) {
      if (isRefreshError(refreshFailure)) {
        const failure = refreshFailure as RefreshError;
        if (failure.isSessionEnding) {
          notifyAuthInvalid();
          throw error;
        }
        if (failure.causeError) {
          throw failure.causeError;
        }
      }
      throw error;
    }

    const retry = await doFetch(refreshedToken);
    if (retry.ok) {
      apiLog(`${method} ${path} → ${retry.status} (after refresh)`);
      return readSuccess(retry);
    }
    // Retry also 401 (or anything else): fail. Never refresh twice.
    return fail(retry);
  }

  throw error;
}

/** Convenience wrappers sharing `apiRequest` semantics. */
export function apiGet<T>(
  path: string,
  options?: Omit<ApiRequestOptions<T>, "method" | "body">,
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "GET" });
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions<T>, "method" | "body">,
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "POST", body });
}
