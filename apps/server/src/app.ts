import { env } from "@sutra/env/server";
import {
  configureOpenAPI,
  createApp,
  globalRateLimiter,
  requestLogger,
} from "@sutra/shared";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { createRoute, z } from "@hono/zod-openapi";
import { getUserMiddleware } from "./middlewares/get-user.middleware";
import authRoutes from "./modules/auth/auth.routes";
import { userRoutes } from "./modules/users/user.routes";
import type { AppBindings, AppRouteHandler } from "./types";

/**
 * HTTP application (Hono) with every route and middleware registered.
 *
 * Split from `index.ts` so tooling can mount the app without a database or a
 * listening socket — notably `scripts/dump-openapi.ts`, which builds the
 * OpenAPI document for client type generation. Database initialization and
 * `serve()` stay in `index.ts`.
 */

const app = createApp<AppBindings>();

// CORS config
const allowedOrigins =
  env.CORS_ORIGIN === "*"
    ? "*"
    : env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 86400,
  }),
);

app.use(secureHeaders());

// Apply request logging middleware
app.use(requestLogger());

app.use(globalRateLimiter);

app.use(getUserMiddleware);

const getHealthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check endpoint",
  description: "Returns the health status of the server",
  responses: {
    200: {
      description: "Server is healthy",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().openapi({
              example: "Server is up and running!!",
            }),
          }),
        },
      },
    },
  },
});

type GetHealthRoute = typeof getHealthRoute;

const healthHandler: AppRouteHandler<GetHealthRoute> = (c) => {
  return c.json({
    message: "Server is up and running!!",
  });
};

app.openapi(getHealthRoute, healthHandler);

const routes = [authRoutes, userRoutes] as const;

routes.forEach((route) => {
  app.route("/", route);
});

configureOpenAPI(app, {
  title: "Sutra API",
  version: "1.0.0",
});

export { app };
export type ServerApp = typeof app;
