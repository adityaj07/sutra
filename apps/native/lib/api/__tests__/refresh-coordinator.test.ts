import { describe, expect, test } from "bun:test";
import { ApiError } from "@/lib/api/errors";
import {
  createRefreshCoordinator,
  isRefreshError,
  type RefreshCoordinatorDeps,
  type RefreshTransportResult,
} from "@/lib/api/refresh-coordinator";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface Harness {
  coordinator: ReturnType<typeof createRefreshCoordinator>;
  calls: { execute: number; persist: number; clear: number };
  storedRefresh: string | null;
  generation: number;
  pendingExecute: ReturnType<typeof deferred<RefreshTransportResult>> | null;
  failNextExecuteWith?: unknown;
  succeedNextWith?: RefreshTransportResult;
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

function createHarness(initialRefresh: string | null = "R1"): Harness {
  const h = {} as Harness;
  h.calls = { execute: 0, persist: 0, clear: 0 };
  h.storedRefresh = initialRefresh;
  h.generation = 0;
  h.pendingExecute = null;

  const deps: RefreshCoordinatorDeps = {
    loadRefreshToken: async () => h.storedRefresh,
    currentRefreshToken: async () => h.storedRefresh,
    persistTokens: async (tokens) => {
      h.calls.persist += 1;
      h.storedRefresh = tokens.refreshToken;
    },
    clearSession: async () => {
      h.calls.clear += 1;
      h.generation += 1;
      h.storedRefresh = null;
    },
    getGeneration: () => h.generation,
    executeRefresh: async (refreshToken: string) => {
      h.calls.execute += 1;
      if (refreshToken !== h.storedRefresh) {
        throw new Error("transport used a stale token");
      }
      if (h.failNextExecuteWith) {
        const failure = h.failNextExecuteWith;
        h.failNextExecuteWith = undefined;
        throw failure;
      }
      if (h.succeedNextWith) {
        const result = h.succeedNextWith;
        h.succeedNextWith = undefined;
        return result;
      }
      if (h.pendingExecute) {
        return h.pendingExecute.promise;
      }
      return {
        accessToken: "A2",
        refreshToken: "R2",
        accessTokenExpiresAt: new Date().toISOString(),
      };
    },
  };

  h.coordinator = createRefreshCoordinator(deps);
  return h;
}

const unauthorized = () =>
  new ApiError({ message: "Session expired.", code: "http-401", status: 401 });

describe("refresh coordinator", () => {
  test("Scenario 1: concurrent 401s share exactly one refresh", async () => {
    const h = createHarness();
    h.pendingExecute = deferred<RefreshTransportResult>();

    const a = h.coordinator.refreshAccessToken();
    const b = h.coordinator.refreshAccessToken();
    const c = h.coordinator.refreshAccessToken();

    // Let the first caller reach the transport before settling the gate.
    await Bun.sleep(1);
    expect(h.calls.execute).toBe(1);

    h.pendingExecute.resolve({
      accessToken: "A2",
      refreshToken: "R2",
    });
    h.pendingExecute = null;

    await expect(a).resolves.toBe("A2");
    await expect(b).resolves.toBe("A2");
    await expect(c).resolves.toBe("A2");
    expect(h.calls.execute).toBe(1);
    expect(h.calls.persist).toBe(1);
    expect(h.storedRefresh).toBe("R2");
  });

  test("Scenario 2: invalid refresh clears the session once", async () => {
    const h = createHarness();
    h.failNextExecuteWith = unauthorized();

    const attempt = h.coordinator.refreshAccessToken();
    const failure = await rejectionOf(attempt);
    expect(isRefreshError(failure) && failure.kind === "session-invalid").toBe(
      true,
    );
    expect(h.calls.clear).toBe(1);
    expect(h.storedRefresh).toBeNull();

    // A subsequent caller finds no token and fails without a new request.
    const second = await rejectionOf(h.coordinator.refreshAccessToken());
    expect(isRefreshError(second) && second.kind === "no-token").toBe(true);
    expect(h.calls.execute).toBe(1);
  });

  test("Scenario 3: revoked refresh fails all waiters with one request", async () => {
    const h = createHarness();
    h.pendingExecute = deferred<RefreshTransportResult>();

    const waiters = [
      h.coordinator.refreshAccessToken(),
      h.coordinator.refreshAccessToken(),
    ];
    await Bun.sleep(1);
    expect(h.calls.execute).toBe(1);

    h.pendingExecute.reject(unauthorized());
    h.pendingExecute = null;

    for (const w of waiters) {
      const failure = await rejectionOf(w);
      expect(
        isRefreshError(failure) && failure.kind === "session-invalid",
      ).toBe(true);
    }
    expect(h.calls.execute).toBe(1);
    expect(h.calls.clear).toBe(1);
  });

  test("network failure during refresh keeps the session (transient)", async () => {
    const h = createHarness();
    h.failNextExecuteWith = new ApiError({
      message: "Network request failed",
      code: "network-error",
    });

    const failure = await rejectionOf(h.coordinator.refreshAccessToken());
    expect(isRefreshError(failure) && failure.kind === "transient").toBe(true);
    expect(h.calls.clear).toBe(0);
    expect(h.storedRefresh).toBe("R1");
  });

  test("5xx during refresh keeps the session (transient)", async () => {
    const h = createHarness();
    h.failNextExecuteWith = new ApiError({
      message: "Internal Server Error",
      code: "http-500",
      status: 500,
    });

    const failure = await rejectionOf(h.coordinator.refreshAccessToken());
    expect(isRefreshError(failure) && failure.kind === "transient").toBe(true);
    expect(h.calls.clear).toBe(0);
  });

  test("Scenario 6: logout mid-refresh discards the stale success", async () => {
    const h = createHarness();
    h.pendingExecute = deferred<RefreshTransportResult>();

    const attempt = h.coordinator.refreshAccessToken();

    // Let the refresh reach the transport, then logout wins the race
    // (clear() bumps generation and wipes the stored token).
    await Bun.sleep(1);
    h.generation += 1;
    h.storedRefresh = null;

    h.pendingExecute.resolve({ accessToken: "A2", refreshToken: "R2" });
    h.pendingExecute = null;

    const superseded = await rejectionOf(attempt);
    expect(
      isRefreshError(superseded) && superseded.kind === "superseded",
    ).toBe(true);
    expect(h.calls.persist).toBe(0);
    expect(h.storedRefresh).toBeNull();
  });

  test("missing rotated pair fails closed", async () => {
    const h = createHarness();
    h.succeedNextWith = { accessToken: "A2", refreshToken: "" };

    const failure = await rejectionOf(h.coordinator.refreshAccessToken());
    expect(isRefreshError(failure) && failure.kind === "session-invalid").toBe(
      true,
    );
    expect(h.calls.clear).toBe(1);
  });

  test("no stored token fails without a network request", async () => {
    const h = createHarness(null);

    const failure = await rejectionOf(h.coordinator.refreshAccessToken());
    expect(isRefreshError(failure) && failure.kind === "no-token").toBe(true);
    expect(h.calls.execute).toBe(0);
  });
});
