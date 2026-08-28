import { closeDB, connectDB, initializeDB } from "@sutra/db";
import { env } from "@sutra/env/server";
import {
  configureOpenAPI,
  createApp,
  globalRateLimiter,
  logger,
  requestLogger,
} from "@sutra/shared";
import { cors } from "hono/cors";
import type { AppBindings, AppRouteHandler } from "./types";
import { secureHeaders } from "hono/secure-headers";
import { createRoute, z } from "@hono/zod-openapi";
import { serve, type ServerType } from "@hono/node-server";

// Initialize db with config
initializeDB({
  connectionString: env.DATABASE_URL,
  ssl:
    env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

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

// app.use(getUserMiddleware);

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

// const routes = [authroutes, userRouter] as const;

// routes.forEach((route) => {
//   app.route("/", route);
// });

configureOpenAPI(app, {
  title: "Sutra API",
  version: "1.0.0",
});

let server: ServerType;

async function start() {
  try {
    await connectDB();
    server = serve({
      fetch: app.fetch,
      port: +env.PORT,
    });

    logger.info(`Server running on port ${env.PORT}`, {
      module: "system",
      action: "startup",
    });
  } catch (error) {
    logger.error("Failed to start server", {
      module: "system",
      action: "startup",
      error: error as Error,
    });
    process.exit(1);
  }
}

void start();

// Stop Server
async function stop() {
  const shutdownTimeout = setTimeout(() => {
    logger.error("Shutdown timeout reached, forcing exit", {
      module: "system",
      action: "shutdown",
    });
    process.exit(1);
  }, 10000);

  try {
    // Clear resources
    await closeDB();
    // await closeRedis()
  } catch (error) {
    logger.error("Failed to close DB", {
      module: "db",
      action: "shutdown",
      error: error as Error,
    });
  }

  // Close server after resources
  server.close((err) => {
    if (err) {
      logger.error("Force closed server", {
        module: "system",
        action: "shutdown",
        error: err,
      });
    } else {
      logger.info("Server closed", {
        module: "system",
        action: "shutdown",
      });
    }
    clearTimeout(shutdownTimeout);
    process.exit(0);
  });
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
