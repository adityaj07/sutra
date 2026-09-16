import { enforceUserMiddleware } from "@/middlewares/enforce-user.middleware";
import type { AppRouteHandler } from "@/types";
import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "@sutra/config";
import { SessionStatus } from "@sutra/db";
import { SessionService } from "@sutra/db";
import { env } from "@sutra/env/server";
import { errorResponseSchemas, logger } from "@sutra/shared";
import { deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

export const getLogoutRoute = createRoute({
  method: "post",
  path: "/v1/auth/logout",
  tags: ["Auth"],
  summary: "Logout user",
  description:
    "Revokes the currently authenticated Sūtra session and clears the web session cookies. Only the current session is revoked; other sessions are unaffected.",
  middleware: [enforceUserMiddleware],
  responses: {
    200: {
      description: "User logged out successfully",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    ...errorResponseSchemas,
  },
});

export type GetLogoutRoute = typeof getLogoutRoute;

export const getLogoutHandler: AppRouteHandler<GetLogoutRoute> = async (c) => {
  // The authenticated session is the authority. No request-body sessionId is
  // accepted, so a client can only ever revoke its own current session.
  const session = c.get("session");
  const user = c.get("user");

  if (!session || !user) {
    throw new HTTPException(StatusCodes.HTTP_401_UNAUTHORIZED, {
      message: "No active session found",
    });
  }

  try {
    await SessionService.updateById(session.id, {
      status: SessionStatus.REVOKED,
      revokedAt: new Date(),
      refreshTokenHash: null,
    });

    // Mirror the establishment attributes so browsers match and remove the
    // cookies. Secure only in production so deletion is honored over
    // plain-HTTP development origins.
    const cookieOptions = {
      path: "/",
      secure: env.NODE_ENV === "production",
      sameSite: "lax" as const,
    };

    deleteCookie(c, "access_token", cookieOptions);
    deleteCookie(c, "refresh_token", cookieOptions);

    logger.audit("User logged out", {
      module: "auth",
      action: "logout",
      userId: user.id,
      sessionId: session.id,
    });

    return c.json(
      { message: "User logged out successfully" },
      StatusCodes.HTTP_200_OK,
    );
  } catch (err) {
    logger.error("Error logging out user", {
      action: "logout",
      module: "auth",
      error: err,
      userId: user.id,
    });

    throw new HTTPException(StatusCodes.HTTP_500_INTERNAL_SERVER_ERROR, {
      message: "An unexpected error occurred while logging out the user",
    });
  }
};
