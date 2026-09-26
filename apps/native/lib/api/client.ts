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
import { apiWarn, logApiRequest } from "@/lib/api/log";
import { refreshAccessToken } from "@/lib/api/auth-refresh";
import {
  isRefreshError,
  type RefreshError,
} from "@/lib/api/refresh-coordinator";
import { newRequestId } from "@/lib/api/request-id";
import { sessionStore } from "@/lib/auth/session-store";
import type {
  ApiGetMethod,
  ApiMethod,
  ApiPath,
  ApiPostMethod,
  ApiRequestBody,
  ApiResponse,
} from "@sutra/api-types";

/**
 * Low-level native API transport over `fetch`. Knows HTTP + auth/session
 * concerns only — no domain logic (channels, messages, organizations, ...).
 *
 * Request/response typing comes from the generated backend contract
 * (`@sutra/api-types`): the path fixes the allowed methods, the method fixes
 * the JSON request body, and the documented 2xx JSON body is the default
 * result type. Passing a `schema` overrides the result type with the validated
 * one (what every call site does today). Prefer `apiGet`/`apiPost`, which infer
 * the method for you.
 *
 * Authenticated flow: `Authorization: Bearer <access-token>` (never cookies).
 * On 401 (and only 401): single-flight refresh, then exactly one retry.
 * 403/404/429/5xx never trigger refresh. The refresh endpoint itself never
 * passes through this interceptor.
 */

/** Minimal structural type satisfied by any Zod object schema. */
export interface ResponseSchema<T> {
  safeParse: (data: unknown) =>
    | { success: true; data: T }
    | { success: false; error: unknown };
}

export interface ApiRequestOptions<
  T,
  P extends ApiPath = ApiPath,
  M extends ApiMethod<P> = ApiMethod<P>,
> {
  method?: Uppercase<M>;
  /** JSON-serializable body, shaped by the contract for `P` + `M`. */
  body?: ApiRequestBody<P, M>;
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

export async function apiRequest<
  P extends ApiPath,
  M extends ApiMethod<P>,
  T = ApiResponse<P, M>,
>(path: P, options: ApiRequestOptions<T, P, M> = {}): Promise<T> {
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
  logApiRequest({ method, path, outcome: "started", requestId });

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
        apiWarn("response.invalid", {
          method,
          path,
          status: response.status,
          requestId: responseRequestId,
        });
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
    logApiRequest({
      method,
      path,
      outcome: "error-after-refresh",
      status: error.status ?? undefined,
      requestId,
    });
    throw error;
  };

  // Initial attempt.
  const token = auth ? await getAccessToken() : null;
  const response = await doFetch(token);

  if (response.ok) {
    logApiRequest({
      method,
      path,
      outcome: "success",
      status: response.status,
      requestId,
    });
    return readSuccess(response);
  }

  const error = await apiErrorFromResponse({
    response,
    requestId: response.headers.get(REQUEST_ID_HEADER) ?? requestId,
  });
  logApiRequest({
    method,
    path,
    outcome: "http-error",
    status: error.status ?? undefined,
    requestId,
  });

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
      logApiRequest({
        method,
        path,
        outcome: "success-after-refresh",
        status: retry.status,
        requestId,
      });
      return readSuccess(retry);
    }
    // Retry also 401 (or anything else): fail. Never refresh twice.
    return fail(retry);
  }

  throw error;
}

/** Convenience wrappers sharing `apiRequest` semantics. */
export function apiGet<P extends ApiPath, T = ApiResponse<P, ApiGetMethod<P>>>(
  path: P,
  options?: Omit<ApiRequestOptions<T, P, ApiGetMethod<P>>, "method" | "body">,
): Promise<T> {
  return apiRequest<P, ApiGetMethod<P>, T>(path, {
    ...options,
    method: "GET" as Uppercase<ApiGetMethod<P>>,
  });
}

export function apiPost<
  P extends ApiPath,
  T = ApiResponse<P, ApiPostMethod<P>>,
>(
  path: P,
  body?: ApiRequestBody<P, ApiPostMethod<P>>,
  options?: Omit<ApiRequestOptions<T, P, ApiPostMethod<P>>, "method" | "body">,
): Promise<T> {
  return apiRequest<P, ApiPostMethod<P>, T>(path, {
    ...options,
    method: "POST" as Uppercase<ApiPostMethod<P>>,
    body,
  });
}
