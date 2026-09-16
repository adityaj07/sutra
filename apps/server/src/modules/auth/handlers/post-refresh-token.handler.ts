import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "@sutra/config";
import { env } from "@sutra/env/server";
import { errorResponseSchemas, logger } from "@sutra/shared";
import { getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import {
  SutraRefreshError,
  SutraRefreshService,
} from "../services/refresh-token.service";
import type { AppRouteHandler } from "@/types";

const REFRESH_COOKIE_NAME = "refresh_token";
const ACCESS_COOKIE_NAME = "access_token";

export const postRefreshTokenRoute = createRoute({
  method: "post",
  path: "/v1/auth/refresh-token",
  tags: ["Auth"],
  summary: "Refresh Sūtra session tokens",
  description:
    "Rotates the Sūtra token pair using the current refresh JWT. Web clients send the HttpOnly refresh cookie (rotated cookies are set in the response); React Native clients send { refreshToken } in the JSON body (the new pair is returned in the JSON payload).",
  request: {
    body: {
      required: false,
      content: {
        "application/json": {
          schema: z
            .object({
              refreshToken: z.string().optional().openapi({
                description:
                  "Current Sūtra refresh JWT (React Native transport; not needed when the refresh cookie is sent)",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              }),
            })
            .openapi({
              description:
                "Optional JSON body. Not required when the refresh cookie is present.",
            }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Token pair rotated successfully",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().openapi({
              example: "Token refreshed successfully",
            }),
            payload: z.object({
              accessToken: z.string().openapi({
                description: "New Sūtra access JWT (1h)",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              }),
              accessTokenExpiresAt: z.string().datetime().openapi({
                description: "Access token expiration timestamp",
                example: "2025-12-22T12:00:00.000Z",
              }),
              refreshToken: z.string().optional().openapi({
                description:
                  "New Sūtra refresh JWT. Returned for JSON-body (native) transport; omitted for cookie transport where it is set as an HttpOnly cookie instead.",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              }),
              refreshTokenExpiresAt: z.string().datetime().optional().openapi({
                description: "Refresh token expiration timestamp",
                example: "2026-03-22T12:00:00.000Z",
              }),
            }),
          }),
        },
      },
    },
    ...errorResponseSchemas,
  },
});

export type PostRefreshTokenRoute = typeof postRefreshTokenRoute;

export const postRefreshTokenHandler: AppRouteHandler<
  PostRefreshTokenRoute
> = async (c) => {
  // The refresh JWT itself is the credential: HttpOnly cookie (web) or JSON
  // body (native). A session ID is an identifier, never a credential.
  const cookieRefreshToken = getCookie(c, REFRESH_COOKIE_NAME);

  let bodyRefreshToken: string | undefined;

  try {
    const body = c.req.valid("json") as { refreshToken?: unknown } | undefined;

    if (
      typeof body?.refreshToken === "string" &&
      body.refreshToken.length > 0
    ) {
      bodyRefreshToken = body.refreshToken;
    }
  } catch {
    // No usable JSON body; fall through to the cookie credential.
  }

  const refreshToken = cookieRefreshToken || bodyRefreshToken;
  const usedCookieTransport = Boolean(cookieRefreshToken);

  if (!refreshToken) {
    throw new HTTPException(StatusCodes.HTTP_401_UNAUTHORIZED, {
      message: "Authentication required.",
      res: c.json(
        {
          message: "Authentication required.",
        },
        StatusCodes.HTTP_401_UNAUTHORIZED,
      ),
    });
  }

  try {
    const result = await SutraRefreshService.refresh(refreshToken);

    if (usedCookieTransport) {
      setCookie(c, REFRESH_COOKIE_NAME, result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 90 * 24 * 60 * 60,
      });

      setCookie(c, ACCESS_COOKIE_NAME, result.accessToken, {
        httpOnly: false,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });
    }

    logger.audit("Sutra tokens refreshed via endpoint", {
      module: "auth",
      action: "token:refresh:success",
    });

    return c.json({
      message: "Token refreshed successfully",
      payload: {
        accessToken: result.accessToken,
        accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
        // Cookie transport already received the new refresh JWT as an
        // HttpOnly cookie; keep it out of JS-readable response bodies.
        ...(usedCookieTransport
          ? {}
          : {
              refreshToken: result.refreshToken,
              refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
            }),
      },
    });
  } catch (err) {
    if (err instanceof SutraRefreshError) {
      throw new HTTPException(StatusCodes.HTTP_401_UNAUTHORIZED, {
        message: refreshErrorMessage(err),
        res: c.json(
          {
            message: refreshErrorMessage(err),
          },
          StatusCodes.HTTP_401_UNAUTHORIZED,
        ),
      });
    }

    if (err instanceof HTTPException) {
      throw err;
    }

    logger.error("Error refreshing Sutra tokens", {
      module: "auth",
      action: "token:refresh:error",
      error: err instanceof Error ? err.message : String(err),
    });

    throw new HTTPException(StatusCodes.HTTP_500_INTERNAL_SERVER_ERROR, {
      message: "Internal Server Error",
      res: c.json(
        {
          message: "Internal Server Error",
        },
        StatusCodes.HTTP_500_INTERNAL_SERVER_ERROR,
      ),
    });
  }
};

// Token problems describe the presented credential (which the presenter can
// decode anyway). Session-state failures share one oracle-free message so
// the endpoint never reveals whether a session exists, was revoked, expired,
// predates refresh hashes, or detected reuse.
function refreshErrorMessage(err: SutraRefreshError): string {
  switch (err.reason) {
    case "invalid_token":
      return "Invalid refresh token.";
    case "expired_token":
      return "Refresh token expired. Please re-authenticate.";
    case "wrong_token_type":
      return "Token is not a refresh token.";
    default:
      return "Session expired. Please re-authenticate.";
  }
}
