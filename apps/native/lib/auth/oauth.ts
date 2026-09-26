/**
 * OAuth entry points (foundation only — no UI in this task).
 *
 * Backend contract: `GET /v1/oauth/{provider}?redirect=false` returns
 * `{ message, payload: { link } }`; the client opens `link` in a system
 * browser, the provider redirects back to the app, the client exchanges the
 * callback via the backend, and the resulting token pair is handed to
 * `establishSession()` in `lib/auth/session.tsx` (which stores + validates).
 * `redirect=true` (backend default) is the web cookie flow — native MUST
 * pass `redirect=false` to receive the JSON token pair.
 *
 * Only providers registered in the backend factory
 * (`apps/server/src/modules/auth/providers/index.ts`) work; today that is
 * Google alone.
 */

export const OAUTH_PROVIDERS = ["google"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/** Authorize URL on the API (opened in a system browser by future UI). */
export function getOAuthStartPath(provider: OAuthProvider): string {
  return `/v1/oauth/${provider}?redirect=false`;
}
