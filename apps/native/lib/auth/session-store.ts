import { SESSION_KEYS } from "@/lib/constants";
import { secureStorage } from "@/storage/secure";

/**
 * Dumb persistence for session credentials. SecureStore only.
 *
 * Responsibilities: read/write/delete tokens. It MUST NOT make network
 * requests, refresh tokens, touch navigation, or call TanStack Query.
 * Refresh orchestration lives in `lib/api/auth-refresh.ts`; lifecycle in
 * `lib/auth/session.tsx`.
 *
 * Write atomicity: SecureStore exposes independent key operations, so a
 * multi-key update cannot be transactional. `setTokens` writes SEQUENTIALLY,
 * refresh-first, because the failure modes are asymmetric:
 * - refresh written, access not  → client holds new refresh + stale access.
 *   Next request 401s, refresh with the new token succeeds. Recoverable.
 * - access written, refresh not  → client holds new access + ROTATED-OUT
 *   refresh. The next refresh presents a dead token, the backend detects
 *   reuse and may revoke the session. Catastrophic.
 * A failed write therefore always leaves the refresh credential as the
 * freshest value. SecureStore failures are device-level (keystore errors)
 * and surface as thrown errors; bootstrap re-validates via `GET /me`.
 */

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: string;
}

let generation = 0;

export const sessionStore = {
  getAccessToken: () => secureStorage.get(SESSION_KEYS.accessToken),

  getRefreshToken: () => secureStorage.get(SESSION_KEYS.refreshToken),

  getAccessTokenExpiresAt: () =>
    secureStorage.get(SESSION_KEYS.accessTokenExpiresAt),

  getTokens: async (): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> => {
    const [accessToken, refreshToken] = await Promise.all([
      secureStorage.get(SESSION_KEYS.accessToken),
      secureStorage.get(SESSION_KEYS.refreshToken),
    ]);
    return { accessToken, refreshToken };
  },

  setAccessToken: (token: string) =>
    secureStorage.set(SESSION_KEYS.accessToken, token),

  setRefreshToken: (token: string) =>
    secureStorage.set(SESSION_KEYS.refreshToken, token),

  /** Sequential, refresh-first write (see atomicity note above). */
  setTokens: async (tokens: TokenSet): Promise<void> => {
    await secureStorage.set(SESSION_KEYS.refreshToken, tokens.refreshToken);
    await secureStorage.set(SESSION_KEYS.accessToken, tokens.accessToken);
    if (tokens.accessTokenExpiresAt !== undefined) {
      await secureStorage.set(
        SESSION_KEYS.accessTokenExpiresAt,
        tokens.accessTokenExpiresAt,
      );
    }
  },

  removeAccessToken: () => secureStorage.remove(SESSION_KEYS.accessToken),

  /**
   * Clears all session material and bumps the generation counter so
   * in-flight refreshes can detect they were superseded (logout race).
   */
  clear: async (): Promise<void> => {
    generation += 1;
    await Promise.all([
      secureStorage.remove(SESSION_KEYS.accessToken),
      secureStorage.remove(SESSION_KEYS.refreshToken),
      secureStorage.remove(SESSION_KEYS.accessTokenExpiresAt),
    ]);
  },

  /** Monotonic counter bumped by every `clear()`. See `auth-refresh.ts`. */
  getGeneration: () => generation,
};
