import type { AppBindings } from "@/types";
import { StatusCodes } from "@sutra/config";
import { SessionStatus, SessionService, UsersService } from "@sutra/db";
import { env } from "@sutra/env/server";
import { logger, verifySutraToken } from "@sutra/shared";
import type { MiddlewareHandler } from "hono";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

function unauthorized(c: Context): HTTPException {
  return new HTTPException(StatusCodes.HTTP_401_UNAUTHORIZED, {
    message: "Authentication required.",
    res: c.json(
      { message: "Authentication required." },
      StatusCodes.HTTP_401_UNAUTHORIZED,
    ),
  });
}

// Extract user from the access token and attach to the context
export const getUserMiddleware: MiddlewareHandler<AppBindings> = async (
  c,
  next,
) => {
  try {
    const authHeader = c.req.header("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;

    const accessToken =
      getCookie(c, "access_token") || (bearerToken ? bearerToken : null);

    // No credential presented: continue anonymously. Protected routes reject
    // via enforceUserMiddleware; public routes stay accessible.
    if (!accessToken) {
      return next();
    }

    // Verify signature, expiration, and Sūtra claims. Throws on malformed,
    // mis-signed, or expired JWTs; returns null for refresh/legacy tokens
    // or tokens missing required claims. Either way the request is
    // unauthenticated — never a 500.
    let claims;

    try {
      claims = verifySutraToken(accessToken, env.JWT_SECRET, "access");
    } catch {
      throw unauthorized(c);
    }

    if (!claims) {
      throw unauthorized(c);
    }

    // The session row is the server-side source of truth. A cryptographically
    // valid access JWT alone authenticates nothing.
    const session = await SessionService.findById(claims.sessionId);

    if (
      !session ||
      session.deletedAt !== null ||
      session.status !== SessionStatus.ACTIVE ||
      session.revokedAt !== null ||
      session.expiresAt <= new Date() ||
      session.userId !== claims.userId
    ) {
      throw unauthorized(c);
    }

    // Deliberately no refreshTokenHash check here: that field belongs to
    // refresh-token rotation, not access authentication.

    const user = await UsersService.findById(session.userId);

    if (!user || user.deletedAt !== null) {
      throw unauthorized(c);
    }

    c.set("user", user);
    c.set("session", session);

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
