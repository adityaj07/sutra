import type { operations, paths } from "./generated";

/**
 * `@sutra/api-types` — the client-side TypeScript view of the Sūtra backend
 * contract.
 *
 * TYPES ONLY. Every module here is erased at compile time, so importing this
 * package adds nothing to a client bundle and can never pull Hono, Zod, the
 * database, or server env code into an app.
 *
 * `src/generated.ts` is produced by `bun run api:generate` (repo root) from the
 * document the backend serves at `GET /docs-json`. Do not hand-edit it and do
 * not hand-write a mirror of a server shape: the backend is the source of
 * truth, these types are the artifact.
 */
export type { operations, paths };

/** Every path published by the backend contract. */
export type ApiPath = keyof paths;

/** Lower-cased HTTP methods, e.g. `"get" | "post"`. */
type HttpMethods =
  "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace";

/** The HTTP methods a given path actually supports. */
export type ApiMethod<P extends ApiPath> = Extract<keyof paths[P], HttpMethods>;

/** The generated operation object for `P` + `M`. */
export type ApiOperation<P extends ApiPath, M extends ApiMethod<P>> =
  paths[P] extends Record<M, infer Op> ? Op : never;

/** HTTP status keys as they appear in the document (numeric literals). */
type StatusKey = number | `${number}`;

/** Status codes the operation documents. */
export type ApiStatus<P extends ApiPath, M extends ApiMethod<P>> =
  ApiOperation<P, M> extends { responses: infer Responses }
    ? Extract<keyof Responses, StatusKey>
    : never;

/** JSON request body of the operation, or `never` when it takes no body. */
export type ApiRequestBody<P extends ApiPath, M extends ApiMethod<P>> =
  NonNullable<
    ApiOperation<P, M> extends { requestBody?: infer Body } ? Body : never
  > extends {
    content: { "application/json": infer Json };
  }
    ? Json
    : never;

/**
 * JSON response body for a documented status code, or `never` if the operation
 * does not document that status (or does not answer it as JSON).
 */
export type ApiResponse<
  P extends ApiPath,
  M extends ApiMethod<P>,
  S extends ApiStatus<P, M> | 200 = 200,
> =
  ApiOperation<P, M> extends { responses: infer Responses }
    ? Responses extends Record<
        S,
        { content: { "application/json": infer Json } }
      >
      ? Json
      : never
    : never;

/**
 * Method type arguments for request helpers.
 *
 * A generic path cannot prove `"get"` is one of its methods, so these are the
 * `Extract<...>` forms that satisfy `ApiMethod<P>` as a default/instantiation
 * while collapsing to `never` for paths that do not support the verb — which
 * surfaces as a compile error at the call site.
 */
export type ApiGetMethod<P extends ApiPath> = Extract<ApiMethod<P>, "get">;
export type ApiPostMethod<P extends ApiPath> = Extract<ApiMethod<P>, "post">;
