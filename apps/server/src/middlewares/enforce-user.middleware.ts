import type { AppBindings } from "@/types";
import { StatusCodes } from "@sutra/config";
import { SessionStatus } from "@sutra/db";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const enforceUserMiddleware: MiddlewareHandler<AppBindings> = async (
  c,
  next,
) => {
  if (
    !c.var.user ||
    !c.var.session ||
    c.var.session.status !== SessionStatus.ACTIVE ||
    c.var.session.revokedAt ||
    c.var.session.deletedAt ||
    c.var.session.expiresAt < new Date()
  ) {
    throw new HTTPException(StatusCodes.HTTP_401_UNAUTHORIZED, {
      res: c.json(
        { message: "Authentication required" },
        StatusCodes.HTTP_401_UNAUTHORIZED,
      ),
    });
  }

  await next();
};
