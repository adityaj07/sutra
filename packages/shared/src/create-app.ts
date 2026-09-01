import { OpenAPIHono } from "@hono/zod-openapi";
import { StatusCodes } from "@sutra/config";
import type { Env } from "hono";
import { requestId } from "hono/request-id";
import { errorHandler, notFoundHandler } from "./error-handler";

export function createRouter<E extends Env = Env>() {
  return new OpenAPIHono<E>({
    strict: false, // we treat "/hello" and "/hello/" equal
    defaultHook: (result, c) => {
      if (!result.success) {
        const errors: Record<string, string> = {};

        result.error.issues.forEach((issue) => {
          const path = issue.path.join(".") || "unknown";
          errors[path] = issue.message;
        });

        return c.json(
          {
            message: "Validation failed",
            errors,
          },
          StatusCodes.HTTP_400_BAD_REQUEST,
        );
      }
    },
  });
}

export function createApp<E extends Env = Env>() {
  const app = createRouter<E>();
  app.use(requestId());

  // Global Error handler
  app.onError(errorHandler);

  // 404 handler for undefined routes
  app.notFound(notFoundHandler);

  return app;
}
