import type { ApiRequestBody, ApiResponse } from "@sutra/api-types";

/**
 * The backend shapes native consumes, as aliases into the GENERATED contract.
 *
 * Source of truth: `@sutra/api-types` (`src/generated.ts`), produced from the
 * document the server serves at `GET /docs-json`. Regenerate with
 * `bun run api:generate` from the repo root; never hand-write a server shape
 * here.
 *
 * These aliases only *select* endpoints from the contract — they add no
 * structure of their own, so a backend change surfaces as a compile error at
 * the call site. Runtime validation still lives in `auth-schemas.ts` (Zod
 * mirrors); the `Equals` assertions there fail compilation if a mirror drifts.
 */

/** POST /v1/auth/refresh-token — native JSON-body transport request. */
export type RefreshRequestBody = ApiRequestBody<
  "/v1/auth/refresh-token",
  "post"
>;

/** POST /v1/auth/refresh-token — 200 response. */
export type RefreshResponseBody = ApiResponse<
  "/v1/auth/refresh-token",
  "post",
  200
>;

/** GET /v1/auth/me — 200 response. */
export type MeResponseBody = ApiResponse<"/v1/auth/me", "get", 200>;

/** Session user as consumed by native. */
export type SessionUser = MeResponseBody["payload"]["user"];

/** POST /v1/auth/logout — 200 response. */
export type LogoutResponseBody = ApiResponse<"/v1/auth/logout", "post", 200>;

/**
 * Backend `{ message, errors? }` error envelope. Every route shares
 * `errorResponseSchemas` (packages/shared/src/error-schemas.ts); the
 * 400 shape below is representative of all of them.
 */
export type ApiErrorBody = ApiResponse<"/v1/auth/me", "get", 400>;
