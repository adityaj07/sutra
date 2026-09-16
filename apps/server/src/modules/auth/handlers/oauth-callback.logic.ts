import type { AppBindings } from "@/types";
import type { AccountProvider } from "@sutra/db";
import { env } from "@sutra/env/server";
import type { Context } from "hono";
import { oauthProviderFactory } from "../providers";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "@sutra/config";
import { logger, signJwt, verifyJwt } from "@sutra/shared";
import { OAuthService } from "../services/oauth.service";
import { OAUTH_SESSION_TICKET_PURPOSE } from "./get-oauth-session-establish.handler";

function getApiOrigin(): string {
  return new URL(env.GOOGLE_REDIRECT_URI).origin;
}

export interface OauthCallbackParams {
  provider: AccountProvider;
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
  // Apple form_post: first-time user JSON string
  user?: string;
  // Apple form_post: id_token may be included in callback body
  id_token?: string;
}

// Shared OAuth callback processing for GET(query) and POST (form_post) callbacks.
export async function processOauthCallback(
  c: Context<AppBindings>,
  params: OauthCallbackParams,
): Promise<Response> {
  const { provider, code, state, error, error_description, user, id_token } =
    params;

  if (!oauthProviderFactory.hasProvider(provider)) {
    throw new HTTPException(StatusCodes.HTTP_400_BAD_REQUEST, {
      message: "OAuth provider not supported",
      res: c.json(
        {
          message: `OAuth provider "${provider}" is not supported`,
        },
        StatusCodes.HTTP_400_BAD_REQUEST,
      ),
    });
  }

  if (error) {
    logger.error(`OAuth error received from ${provider}`, {
      module: "auth",
      action: "oauth:callback:error",
      provider,
      error,
      error_description,
      state,
    });

    throw new HTTPException(StatusCodes.HTTP_400_BAD_REQUEST, {
      message: "OAuth authorization failed",
      res: c.json(
        {
          message: "OAuth authorization failed",
          error: error_description || error,
        },
        StatusCodes.HTTP_400_BAD_REQUEST,
      ),
    });
  }

  if (!code) {
    logger.error(`OAuth callback missing authorization code for ${provider}`, {
      module: "auth",
      action: "oauth:callback:missing_code",
      provider,
      state,
    });

    throw new HTTPException(StatusCodes.HTTP_400_BAD_REQUEST, {
      message: "Authorization code is required",
      res: c.json(
        {
          message: "Authorization code is required",
        },
        StatusCodes.HTTP_400_BAD_REQUEST,
      ),
    });
  }

  if (!state) {
    logger.error(`OAuth callback missing state parameter for ${provider}`, {
      module: "auth",
      action: "oauth:callback:missing_state",
      provider,
    });

    throw new HTTPException(StatusCodes.HTTP_400_BAD_REQUEST, {
      message: "State parameter is required for security",
      res: c.json(
        {
          message: "State parameter is required for security",
        },
        StatusCodes.HTTP_400_BAD_REQUEST,
      ),
    });
  }

  const decodedState = verifyJwt(state, env.JWT_SECRET, {
    algorithms: ["HS256"],
  }) as {
    state: string;
    redirect: "true" | "false";
  };

  if (!decodedState.state) {
    logger.error("Invalid state token structure", {
      module: "auth",
      action: "oauth:callback:invalid_state_structure",
      provider,
    });

    throw new HTTPException(StatusCodes.HTTP_400_BAD_REQUEST, {
      message: "Invalid state parameter",
      res: c.json(
        {
          message: "Invalid state parameter",
        },
        StatusCodes.HTTP_400_BAD_REQUEST,
      ),
    });
  }

  try {
    const result = await OAuthService.handleCallback(provider, code, {
      callbackData: {
        user,
        idToken: id_token,
      },
    });

    const {
      user: authUser,
      session,
      accessToken: serverAccessToken,
      refreshToken: serverRefreshToken,
    } = result;

    logger.audit(`User authenticated via ${provider} OAuth`, {
      module: "auth",
      action: "oauth:authentication:success",
      provider,
      userId: authUser?.id,
      email: authUser?.email,
      sessionId: session?.id,
    });

    if (decodedState.redirect === "false") {
      return c.json({
        message: "Logged in successfully",
        payload: {
          accessToken: serverAccessToken,
          refreshToken: serverRefreshToken,
        },
      });
    }

    const sessionTicket = signJwt(
      {
        accessToken: serverAccessToken,
        refreshToken: serverRefreshToken,
        purpose: OAUTH_SESSION_TICKET_PURPOSE,
      },
      env.JWT_SECRET,
      { expiresIn: "60s" },
    );

    const establishUrl = new URL("/v1/oauth/session/establish", getApiOrigin());
    establishUrl.searchParams.set("ticket", sessionTicket);
    establishUrl.searchParams.set("next", env.FRONTEND_URL);

    return c.redirect(establishUrl.toString());
  } catch (err: unknown) {
    if (err instanceof HTTPException) {
      throw err;
    }

    logger.error(`Unexpected error during OAuth callback for ${provider}`, {
      module: "auth",
      action: "oauth:callback:error",
      provider,
      error: err,
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
}
