import { ApiError } from "@/lib/api/errors";
import type { TokenSet } from "@/lib/auth/session-store";
import type { RefreshResponseBody } from "@/lib/api/api-contract";

/**
 * Single-flight refresh coordinator.
 *
 * The backend rotates refresh tokens and treats reuse as compromise
 * (revokes the session). Concurrent 401s must therefore share ONE refresh
 * request. This module is deliberately free of native imports so the
 * concurrency semantics are unit-testable; `auth-refresh.ts` wires the
 * production dependencies (SecureStore, fetch transport).
 */

/**
 * What a completed refresh yields, derived from the generated contract:
 * `POST /v1/auth/refresh-token` marks `refreshToken` optional because the
 * cookie transport omits it, but native's JSON transport needs it — so the
 * optionality is resolved here instead of being re-declared by hand.
 */
export interface RefreshTransportResult extends Pick<
  RefreshResponseBody["payload"],
  "accessToken"
> {
  refreshToken: string;
  /** Optional client-side: the coordinator persists whatever arrived. */
  accessTokenExpiresAt?: RefreshResponseBody["payload"]["accessTokenExpiresAt"];
}

export type RefreshFailureKind =
  | "no-token"
  | "session-invalid"
  | "superseded"
  | "transient";

/**
 * Refresh failure. `session-invalid` / `no-token` / `superseded` mean the
 * client must end up unauthenticated; `transient` (network, timeout, 5xx,
 * malformed body, storage failure) must NOT destroy the local session —
 * the error propagates and the caller retries later.
 */
export class RefreshError extends Error {
  readonly kind: RefreshFailureKind;
  readonly causeError?: ApiError;

  constructor(kind: RefreshFailureKind, message: string, causeError?: ApiError) {
    super(message);
    this.name = "RefreshError";
    this.kind = kind;
    this.causeError = causeError;
  }

  /** True when the local session must be treated as unauthenticated. */
  get isSessionEnding(): boolean {
    return this.kind !== "transient";
  }
}

export interface RefreshCoordinatorDeps {
  loadRefreshToken: () => Promise<string | null>;
  /** Re-read after the network call to detect a concurrent clear/login. */
  currentRefreshToken: () => Promise<string | null>;
  persistTokens: (tokens: TokenSet) => Promise<void>;
  clearSession: () => Promise<void>;
  getGeneration: () => number;
  /**
   * Raw refresh transport. Throws ApiError. MUST NOT go through the
   * authenticated client (no Bearer header, no 401→refresh handling).
   */
  executeRefresh: (refreshToken: string) => Promise<RefreshTransportResult>;
}

export function isRefreshError(error: unknown): error is RefreshError {
  return error instanceof RefreshError;
}

export function createRefreshCoordinator(deps: RefreshCoordinatorDeps) {
  let inFlight: Promise<string> | null = null;

  async function performRefresh(): Promise<string> {
    const usedToken = await deps.loadRefreshToken();

    if (!usedToken) {
      await deps.clearSession();
      throw new RefreshError("no-token", "No refresh token stored");
    }

    const startGeneration = deps.getGeneration();

    let result: RefreshTransportResult;
    try {
      result = await deps.executeRefresh(usedToken);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Authoritative: the session is dead (expired/revoked/reused).
        await deps.clearSession();
        throw new RefreshError(
          "session-invalid",
          "Session is no longer valid",
          error,
        );
      }
      // Network failure, timeout, 5xx, malformed body, unexpected throws:
      // keep the local session.
      throw new RefreshError(
        "transient",
        error instanceof Error ? error.message : "Refresh failed",
        error instanceof ApiError ? error : undefined,
      );
    }

    if (!result.accessToken || !result.refreshToken) {
      // Native JSON transport must include the rotated pair; its absence
      // means contract drift (or a cookie-transport shape). Fail closed.
      await deps.clearSession();
      throw new RefreshError(
        "session-invalid",
        "Refresh response omitted the token pair",
      );
    }

    // Logout/login race (Scenario 6): a clear() during the network call —
    // or a newer rotation — supersedes this result. Discard it so stale
    // credentials can never resurrect or clobber the current session.
    if (deps.getGeneration() !== startGeneration) {
      throw new RefreshError("superseded", "Session changed during refresh");
    }
    const current = await deps.currentRefreshToken();
    if (current !== usedToken) {
      throw new RefreshError("superseded", "Refresh token changed during refresh");
    }

    try {
      await deps.persistTokens({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accessTokenExpiresAt: result.accessTokenExpiresAt,
      });
    } catch (error) {
      // Rotation already happened server-side; the store write failed at the
      // device level. Propagate without clearing — bootstrap re-validates.
      throw new RefreshError(
        "transient",
        "Failed to persist rotated tokens",
        error instanceof ApiError ? error : undefined,
      );
    }

    return result.accessToken;
  }

  /**
   * Returns the in-flight refresh when one exists; otherwise starts it.
   * Every concurrent caller awaits the same Promise — exactly one refresh
   * request ever hits the network per 401 wave.
   */
  function refreshAccessToken(): Promise<string> {
    if (inFlight) {
      return inFlight;
    }
    inFlight = performRefresh();
    const current = inFlight;
    void current.then(
      () => {
        if (inFlight === current) {
          inFlight = null;
        }
      },
      () => {
        if (inFlight === current) {
          inFlight = null;
        }
      },
    );
    return current;
  }

  return { refreshAccessToken };
}
