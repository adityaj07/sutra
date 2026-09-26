import type { paths } from "./generated";

/**
 * Handwritten aliases into the GENERATED OpenAPI contract
 * (`lib/api/generated.ts` — do not edit that file; regenerate with
 * `bun run api:generate` from apps/native while the backend is running).
 *
 * These are the only backend shapes native consumes. Runtime validation
 * still lives in `auth-schemas.ts` (zod mirrors); the `Equals` assertions
 * there fail compilation if the mirrors drift from these aliases.
 */

/** POST /v1/auth/refresh-token — native JSON-body transport request. */
export type RefreshRequestBody = NonNullable<
  paths["/v1/auth/refresh-token"]["post"]["requestBody"]
>["content"]["application/json"];

/** POST /v1/auth/refresh-token — 200 response. */
export type RefreshResponseBody =
  paths["/v1/auth/refresh-token"]["post"]["responses"][200]["content"]["application/json"];

/** GET /v1/auth/me — 200 response. */
export type MeResponseBody =
  paths["/v1/auth/me"]["get"]["responses"][200]["content"]["application/json"];

/** Session user as consumed by native. */
export type SessionUser = MeResponseBody["payload"]["user"];

/** POST /v1/auth/logout — 200 response. */
export type LogoutResponseBody =
  paths["/v1/auth/logout"]["post"]["responses"][200]["content"]["application/json"];

/** GET /v1/oauth/{provider} — 200 response (future OAuth UI). */
export type OAuthStartResponseBody =
  paths["/v1/oauth/{provider}"]["get"]["responses"][200]["content"]["application/json"];

/**
 * Backend `{ message, errors? }` error envelope. Every route shares
 * `errorResponseSchemas` (packages/shared/src/error-schemas.ts); the
 * 400 shape below is representative of all of them.
 */
export type ApiErrorBody =
  paths["/v1/auth/me"]["get"]["responses"][400]["content"]["application/json"];
