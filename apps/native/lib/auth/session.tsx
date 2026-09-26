import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiGet, apiPost, registerAuthInvalidHandler } from "@/lib/api/client";
import {
  logoutResponseSchema,
  meResponseSchema,
  type TokenPair,
} from "@/lib/api/auth-schemas";
import type { SessionUser } from "@/lib/api/api-contract";
import { apiLog } from "@/lib/api/log";
import { queryClient } from "@/lib/query-client";
import { sessionStore } from "@/lib/auth/session-store";

/**
 * Session lifecycle coordinator (auth state only — not server state).
 *
 * Owns: bootstrap (`GET /v1/auth/me`), `loading|authenticated|unauthenticated`
 * status, current user, logout, and OAuth-completion intake. Tokens stay in
 * SecureStore; domain data stays in TanStack Query; this context holds only
 * status + user so re-renders are cheap.
 *
 * Bootstrap failure semantics: 401 → tokens cleared by the API client,
 * unauthenticated. Network/5xx → unauthenticated with tokens RETAINED
 * (nothing proved the session dead); the next sign-in/bootstrap retries.
 */

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  /** Best-effort server logout; local session always cleared. */
  signOut: () => Promise<void>;
  /** Re-fetch the current user. Throws on failure. */
  refreshUser: () => Promise<void>;
  /**
   * Intake for a freshly acquired token pair (future OAuth callback).
   * Stores the pair, validates via `/me`, transitions to authenticated.
   */
  establishSession: (tokens: TokenPair) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);

  const markUnauthenticated = useCallback(() => {
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // Background invalidation (refresh rejected while running): clear queries
  // so no authenticated data survives the session.
  useEffect(() => {
    registerAuthInvalidHandler(() => {
      queryClient.clear();
      markUnauthenticated();
    });
  }, [markUnauthenticated]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { accessToken, refreshToken } = await sessionStore.getTokens();

      if (!accessToken && !refreshToken) {
        if (!cancelled) {
          markUnauthenticated();
        }
        return;
      }

      try {
        const me = await apiGet("/v1/auth/me", {
          schema: meResponseSchema,
        });
        if (!cancelled) {
          setUser(me.payload.user);
          setStatus("authenticated");
          apiLog("session.bootstrap.authenticated");
        }
      } catch {
        // 401: client already cleared + notified (idempotent here).
        // Transient: tokens retained, retry happens on next launch/sign-in.
        if (!cancelled) {
          markUnauthenticated();
          apiLog("session.bootstrap.unauthenticated");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [markUnauthenticated]);

  const signOut = useCallback(async () => {
    // Server logout is best-effort: a dead network must not trap the user
    // in a locally authenticated state. Local clear always runs.
    try {
      await apiPost("/v1/auth/logout", undefined, {
        schema: logoutResponseSchema,
      });
    } catch {
      apiLog("signout.server_logout_failed");
    }
    await sessionStore.clear();
    queryClient.clear();
    markUnauthenticated();
  }, [markUnauthenticated]);

  const refreshUser = useCallback(async () => {
    const me = await apiGet("/v1/auth/me", {
      schema: meResponseSchema,
    });
    setUser(me.payload.user);
    setStatus("authenticated");
  }, []);

  const establishSession = useCallback(
    async (tokens: TokenPair) => {
      await sessionStore.setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      });
      try {
        const me = await apiGet("/v1/auth/me", {
          schema: meResponseSchema,
        });
        setUser(me.payload.user);
        setStatus("authenticated");
      } catch (error) {
        await sessionStore.clear();
        markUnauthenticated();
        throw error;
      }
    },
    [markUnauthenticated],
  );

  const value = useMemo<SessionContextValue>(
    () => ({ status, user, signOut, refreshUser, establishSession }),
    [status, user, signOut, refreshUser, establishSession],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return session;
}
