export const NAV_THEME = {
  light: {
    background: "#fffaf8",
    border: "#e5dcd8",
    card: "#ffffff",
    notification: "#ef1d43",
    primary: "#ef1d43",
    text: "#211b1b",
  },

  dark: {
    background: "#171514",
    border: "#3b3431",
    card: "#211e1d",
    notification: "#ff536b",
    primary: "#ff536b",
    text: "#f8f3f1",
  },
};

/**
 * Centralized SecureStore keys for session credentials.
 * Do not scatter string literals elsewhere — always import from here.
 * Tokens live ONLY in SecureStore (never MMKV, AsyncStorage, query cache).
 */
export const SESSION_KEYS = {
  accessToken: "sutra.access-token",
  refreshToken: "sutra.refresh-token",
  /** Non-sensitive ISO expiry of the access token (backend `accessTokenExpiresAt`). */
  accessTokenExpiresAt: "sutra.access-token-expires-at",
} as const;
