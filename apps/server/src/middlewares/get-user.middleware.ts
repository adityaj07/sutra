import type { AppBindings } from "@/types";
import { StatusCodes } from "@sutra/config";
import { UsersService } from "@sutra/db";
import { SessionService } from "@sutra/db/services/session.service";
import { env } from "@sutra/env/server";
import { logger, verifyJwt } from "@sutra/shared";
import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

// Extract user from the access token and attach to the context
export const getUserMiddleware: MiddlewareHandler<AppBindings> = async (
  c,
  next,
) => {
  try {
    const authHeader = c.req.header("Authorization");
    const bearerToken = authHeader?.replace("Bearer ", "").trim();

    const accessToken =
      getCookie(c, "access_token") ||
      (bearerToken && bearerToken !== "Bearer" ? bearerToken : null);

    if (accessToken) {
      // verify access token
      const decodedToken = verifyJwt<{ userId: string; sessionId: string }>(
        accessToken,
        env.JWT_SECRET,
      );

      // if decoded token is invalid, throw error
      if (!decodedToken || !decodedToken.userId || !decodedToken.sessionId) {
        throw new HTTPException(StatusCodes.HTTP_401_UNAUTHORIZED, {
          message: "Invalid access token",
          res: c.json(
            { message: "Invalid access token" },
            StatusCodes.HTTP_401_UNAUTHORIZED,
          ),
        });
      }

      // check session if its valid and not revoked or expired
      const session = await SessionService.findById(decodedToken.sessionId);

      // get user details from the userId from the session
      const user = await UsersService.findById(decodedToken.userId);

      // attach the user to the context
      if (user) {
        c.set("user", user);
      }

      if (session) {
        c.set("session", session);
      }
    }

    return next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    logger.error("Error in getUserMiddleware:", {
      action: "getUserMiddleware",
      error: error,
      module: "users",
    });

    return c.json(
      { message: "Internal Server Error" },
      StatusCodes.HTTP_500_INTERNAL_SERVER_ERROR,
    );
  }
};
