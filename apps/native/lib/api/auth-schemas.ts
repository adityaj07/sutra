import { z } from "zod";
import type {
  ApiErrorBody,
  LogoutResponseBody,
  MeResponseBody,
  RefreshResponseBody,
} from "@/lib/api/api-contract";

/**
 * Runtime validation mirrors of the backend auth response envelopes.
 *
 * The backend is the source of truth (Hono `createRoute` + Zod + OpenAPI).
 * Server route modules cannot be imported into `apps/native` — they depend
 * on node-only packages (`@sutra/db`, `drizzle-orm`, `pg`, Hono server
 * bindings) — so native keeps minimal hand-written Zod schemas for runtime
 * validation of the endpoints it consumes. Compile-time TYPES come from the
 * generated contract (`api-contract.ts`, backed by `generated.ts`).
 *
 * The `Equals` assertions below fail compilation if a mirror drifts from
 * the generated contract (e.g. after `bun run api:generate` picks up a
 * backend change) — update the mirror, never the generated file.
 *
 * Backend sources:
 * - refresh: apps/server/src/modules/auth/handlers/post-refresh-token.handler.ts
 * - me:      apps/server/src/modules/auth/handlers/get-me.handler.ts
 * - logout:  apps/server/src/modules/auth/handlers/get-logout.handler.ts
 * - errors:  packages/shared/src/error-schemas.ts
 */

/** Backend `{ message, errors? }` error envelope (errorResponseSchemas). */
export const errorEnvelopeSchema = z.object({
  message: z.string(),
  errors: z.record(z.string(), z.string()).optional(),
});

/**
 * POST /v1/auth/refresh-token — native (JSON-body) transport.
 * `refreshToken`/`refreshTokenExpiresAt` are optional server-side because
 * cookie transport omits them; native MUST receive them, enforced at the
 * call site, not here.
 */
export const refreshResponseSchema = z.object({
  message: z.string(),
  payload: z.object({
    accessToken: z.string().min(1),
    accessTokenExpiresAt: z.string(),
    refreshToken: z.string().min(1).optional(),
    refreshTokenExpiresAt: z.string().optional(),
  }),
});

/**
 * GET /v1/auth/me.
 * `role` mirrors backend `UserRole` (packages/db); kept as literals here
 * because `@sutra/db` is node-only and cannot be imported into native.
 */
export const meResponseSchema = z.object({
  message: z.string(),
  payload: z.object({
    user: z.object({
      email: z.string(),
      firstName: z.string(),
      lastName: z.string().nullable(),
      role: z.enum(["admin", "user"]),
      avatar: z.string().nullable(),
    }),
  }),
});

/** POST /v1/auth/logout. */
export const logoutResponseSchema = z.object({
  message: z.string(),
});

/**
 * Token pair handed to native (OAuth callback or refresh). A native-side
 * intake concept rather than a backend response shape, so it stays local.
 */
export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessTokenExpiresAt: z.string().optional(),
});

export type TokenPair = z.infer<typeof tokenPairSchema>;

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type AssertExact<T extends true> = T;

// Compile-time only (no runtime call): fails if a mirror drifts from the
// generated contract, e.g. after regeneration picks up a backend change.
type _ErrorContractCheck = AssertExact<
  Equals<z.infer<typeof errorEnvelopeSchema>, ApiErrorBody>
>;
type _RefreshContractCheck = AssertExact<
  Equals<z.infer<typeof refreshResponseSchema>, RefreshResponseBody>
>;
type _MeContractCheck = AssertExact<
  Equals<z.infer<typeof meResponseSchema>, MeResponseBody>
>;
type _LogoutContractCheck = AssertExact<
  Equals<z.infer<typeof logoutResponseSchema>, LogoutResponseBody>
>;
