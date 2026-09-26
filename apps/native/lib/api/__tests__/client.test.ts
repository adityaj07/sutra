import { describe, expect, test } from "bun:test";
import { z } from "zod";

// NOTE: no module mocks here. @/storage/secure loads expo-secure-store via
// dynamic import only, so importing the client graph under bun never touches
// native modules; all storage/network access below is injected per call.

import { apiRequest } from "@/lib/api/client";
import { REFRESH_PATH as REFRESH_PATH_FOR_TESTS } from "@/lib/api/config";
import { ApiError, isApiError } from "@/lib/api/errors";
import { RefreshError } from "@/lib/api/refresh-coordinator";

const BASE = "https://api.test";

const dataSchema = z.object({ hello: z.string() });

type FetchImpl = (
  url: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** bun's `rejects` has no predicate matcher; unwrap manually instead. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected promise to reject, but it resolved");
}

describe("apiRequest", () => {
  test("sends Bearer token and validates the payload", async () => {
    const seen: { auth?: string } = {};
    const fetchImpl: FetchImpl = async (_url, init) => {
      seen.auth = (init?.headers as Record<string, string>).Authorization;
      return json({ hello: "world" });
    };

    const data = await apiRequest("/v1/auth/me", {
      schema: dataSchema,
      baseUrlOverride: BASE,
      fetchImpl,
      getAccessToken: async () => "A1",
      refresher: async () => {
        throw new Error("must not refresh");
      },
    });

    expect(data).toEqual({ hello: "world" });
    expect(seen.auth).toBe("Bearer A1");
  });

  test("401 → refresh → retry once with the new token", async () => {
    const authHeaders: (string | undefined)[] = [];
    let calls = 0;
    const fetchImpl: FetchImpl = async (_url, init) => {
      calls += 1;
      authHeaders.push((init?.headers as Record<string, string>).Authorization);
      return calls === 1
        ? json({ message: "Authentication required." }, 401)
        : json({ hello: "retried" });
    };

    let refreshCalls = 0;
    const data = await apiRequest("/v1/auth/me", {
      schema: dataSchema,
      baseUrlOverride: BASE,
      fetchImpl,
      getAccessToken: async () => "A1",
      refresher: async () => {
        refreshCalls += 1;
        return "A2";
      },
      notifyAuthInvalid: () => {
        throw new Error("must not invalidate");
      },
    });

    expect(data).toEqual({ hello: "retried" });
    expect(refreshCalls).toBe(1);
    expect(authHeaders).toEqual(["Bearer A1", "Bearer A2"]);
  });

  test("Scenario 5: retry 401s fail without a second refresh", async () => {
    const fetchImpl: FetchImpl = async () =>
      json({ message: "Authentication required." }, 401);

    let refreshCalls = 0;
    const attempt = apiRequest("/v1/auth/me", {
      schema: dataSchema,
      baseUrlOverride: BASE,
      fetchImpl,
      getAccessToken: async () => "A1",
      refresher: async () => {
        refreshCalls += 1;
        return "A2";
      },
      notifyAuthInvalid: () => {},
    });

    const failure = await rejectionOf(attempt);
    expect(isApiError(failure) && failure.status === 401).toBe(true);
    expect(refreshCalls).toBe(1);
  });

  test("403 never triggers refresh", async () => {
    const fetchImpl: FetchImpl = async () => json({ message: "Forbidden" }, 403);

    let refreshCalls = 0;
    const failure = await rejectionOf(
      apiRequest("/v1/auth/me", {
        baseUrlOverride: BASE,
        fetchImpl,
        getAccessToken: async () => "A1",
        refresher: async () => {
          refreshCalls += 1;
          return "A2";
        },
      }),
    );
    expect(isApiError(failure) && failure.status === 403).toBe(true);
    expect(refreshCalls).toBe(0);
  });

  test("Scenario 4: the refresh endpoint never refreshes itself", async () => {
    const fetchImpl: FetchImpl = async () =>
      json({ message: "Session expired. Please re-authenticate." }, 401);

    let refreshCalls = 0;
    const failure = await rejectionOf(
      apiRequest(REFRESH_PATH_FOR_TESTS, {
        method: "POST",
        body: { refreshToken: "R1" },
        auth: false,
        baseUrlOverride: BASE,
        fetchImpl,
        refresher: async () => {
          refreshCalls += 1;
          return "A2";
        },
        notifyAuthInvalid: () => {},
      }),
    );
    expect(isApiError(failure) && failure.status === 401).toBe(true);
    expect(refreshCalls).toBe(0);
  });

  test("concurrent 401s share one refresh (single-flight integration)", async () => {
    const gate = deferred<string>();
    let refreshCalls = 0;
    let requestCount = 0;

    const fetchImpl: FetchImpl = async (_url, init) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      requestCount += 1;
      if (auth === "Bearer A2") {
        return json({ hello: "ok" });
      }
      return json({ message: "Authentication required." }, 401);
    };

    // One shared flight behind the three requests (in production this is
    // the refresh coordinator's shared promise; the client only awaits it).
    let shared: Promise<string> | null = null;
    const make = () =>
      apiRequest("/v1/auth/me", {
        schema: dataSchema,
        baseUrlOverride: BASE,
        fetchImpl,
        getAccessToken: async () => "A1",
        refresher: () => {
          if (!shared) {
            refreshCalls += 1;
            shared = gate.promise;
          }
          return shared;
        },
        notifyAuthInvalid: () => {},
      });

    const [a, b, c] = [make(), make(), make()];
    await Bun.sleep(10);
    expect(refreshCalls).toBe(1);

    gate.resolve("A2");
    await expect(a).resolves.toEqual({ hello: "ok" });
    await expect(b).resolves.toEqual({ hello: "ok" });
    await expect(c).resolves.toEqual({ hello: "ok" });
    expect(refreshCalls).toBe(1);
    // 3 initial + 3 retried requests, but a single refresh.
    expect(requestCount).toBe(6);
  });

  test("transient refresh failure propagates without invalidating", async () => {
    const fetchImpl: FetchImpl = async () =>
      json({ message: "Authentication required." }, 401);

    const networkError = new ApiError({
      message: "Network request failed",
      code: "network-error",
    });
    let invalidated = false;

    const failure = await rejectionOf(
      apiRequest("/v1/auth/me", {
        baseUrlOverride: BASE,
        fetchImpl,
        getAccessToken: async () => "A1",
        refresher: async () => {
          throw new RefreshError("transient", "refresh failed", networkError);
        },
        notifyAuthInvalid: () => {
          invalidated = true;
        },
      }),
    );
    expect(failure).toBe(networkError);
    expect(invalidated).toBe(false);
  });

  test("session-ending refresh notifies and throws the original 401", async () => {
    const fetchImpl: FetchImpl = async () =>
      json({ message: "Authentication required." }, 401);

    let invalidated = false;
    const failure = await rejectionOf(
      apiRequest("/v1/auth/me", {
        baseUrlOverride: BASE,
        fetchImpl,
        getAccessToken: async () => "A1",
        refresher: async () => {
          throw new RefreshError("session-invalid", "dead");
        },
        notifyAuthInvalid: () => {
          invalidated = true;
        },
      }),
    );
    expect(isApiError(failure) && failure.status === 401).toBe(true);
    expect(invalidated).toBe(true);
  });

  test("timeout aborts hung requests", async () => {
    const fetchImpl: FetchImpl = (_url, init) =>
      new Promise((_resolve, reject) => {
        const onAbort = () =>
          reject(new DOMException("aborted", "AbortError"));
        if (init?.signal?.aborted) {
          onAbort();
          return;
        }
        init?.signal?.addEventListener("abort", onAbort, { once: true });
      });

    const failure = await rejectionOf(
      apiRequest("/v1/auth/me", {
        baseUrlOverride: BASE,
        fetchImpl,
        timeoutMs: 20,
        getAccessToken: async () => "A1",
      }),
    );
    expect(isApiError(failure) && failure.isTimeout).toBe(true);
  });

  test("caller cancellation surfaces as cancelled", async () => {
    const controller = new AbortController();
    const fetchImpl: FetchImpl = (_url, init) =>
      new Promise((_resolve, reject) => {
        const onAbort = () =>
          reject(new DOMException("aborted", "AbortError"));
        if (init?.signal?.aborted) {
          onAbort();
          return;
        }
        init?.signal?.addEventListener("abort", onAbort, { once: true });
      });

    const attempt = apiRequest("/v1/auth/me", {
      baseUrlOverride: BASE,
      fetchImpl,
      timeoutMs: 5000,
      signal: controller.signal,
      getAccessToken: async () => "A1",
    });
    controller.abort();

    const failure = await rejectionOf(attempt);
    expect(isApiError(failure) && failure.isCancelled).toBe(true);
  });

  test("missing base URL fails fast", async () => {
    const failure = await rejectionOf(
      apiRequest("/v1/auth/me", {
        baseUrlOverride: "",
        fetchImpl: async () => json({}),
        getAccessToken: async () => null,
      }),
    );
    expect(isApiError(failure) && failure.code === "missing-base-url").toBe(
      true,
    );
  });
});
