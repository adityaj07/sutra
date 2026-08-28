import type { AppRouteHandler } from "@/types";
import { createRoute, z } from "@hono/zod-openapi";
import { SessionProvider } from "@sutra/db";
import {
  errorResponseSchemas,
  generateStateToken,
  signJwt,
} from "@sutra/shared";
import { oauthProviderFactory } from "../providers";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "@sutra/config";
import { env } from "@sutra/env/server";
import { OAuthService } from "../services/oauth.service";

export const getOAuthProviderRoute = createRoute({
  method: "get",
  path: "/v1/oauth/{provider}",
  tags: ["OAuth"],
  summary: "Initiate OAuth authentication",
  description:
    "Generates and returns an OAuth authorization URL for the specified provider",
  request: {
    params: z.object({
      provider: z
        .nativeEnum(SessionProvider, {
          message: "Invalid OAuth provider",
        })
        .openapi({
          description: "The OAuth provider to use (e.g., google, github)",
          example: SessionProvider.GOOGLE,
          param: {
            in: "path",
            name: "provider",
          },
        }),
    }),
    query: z.object({
      redirect: z
        .string()
        .optional()
        .default("true")
        .openapi({
          description:
            "Wether to redirect to frontend app after OAuth authorization URL is generated",
          enum: ["true", "false"],
          example: "false",
          param: {
            in: "query",
            name: "redirect",
          },
        }),
    }),
  },
  responses: {
    200: {
      description: "OAuth authorization URL generated successfully",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string().openapi({
              example: "google OAuth link generated successfully",
            }),
            payload: z.object({
              link: z.string().url().openapi({
                description: "OAuth authorization URL to redirect the user to",
                example: "https://accounts.google.com/o/oauth2/v2/auth?...",
              }),
            }),
          }),
        },
      },
    },
    ...errorResponseSchemas,
  },
});

export type GetOAuthProviderRoute = typeof getOAuthProviderRoute;

export const getOAuthHandler: AppRouteHandler<GetOAuthProviderRoute> = (c) => {
  const { provider } = c.req.valid("param");
  const { redirect } = c.req.valid("query");

  // Check if provider is registered
  if (!oauthProviderFactory.hasProvider(provider)) {
    throw new HTTPException(StatusCodes.HTTP_400_BAD_REQUEST, {
      message: "OAuth provider not supported",
      res: c.json({
        message: `OAuth provider "${provider}" is not supported`,
        supportedProviders: oauthProviderFactory.getRegisteredProviders(),
      }),
    });
  }

  // generate state token for CSRF protection
  const stateToken = generateStateToken();

  // Sign the state token with JWT to enable server-side validation
  const signedState = signJwt(
    {
      state: stateToken,
      redirect: redirect,
    },
    env.JWT_SECRET,
    {
      expiresIn: "10m", // state should expire after 10 minjtes
    },
  );

  // get the authorization url from the oauth service
  const authorizationUrl = OAuthService.getAuthorizationUrl(
    provider,
    signedState,
  );

  return c.json({
    message: `${provider} OAuth link generated successfully`,
    payload: {
      link: authorizationUrl,
      // Note: The state is in the OAuth URL. The provider will return it in the callback.
    },
  });
};
