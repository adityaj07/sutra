import type { AppBindings } from "@/types";
import { authRateLimiter, createRouter } from "@sutra/shared";
import {
  getOAuthHandler,
  getOAuthProviderRoute,
} from "./handlers/get-oauth.handler";
import {
  getOauthCallbackHandler,
  getOAuthCallbackRoute,
} from "./handlers/get-oauth-callback.handler";
import {
  postOauthAppleCallbackHandler,
  postOauthAppleCallbackRoute,
} from "./handlers/post-oauth-apple-callback.handler";
import {
  getOauthSessionEstablishHandler,
  getOauthSessionEstablishRoute,
} from "./handlers/get-oauth-session-establish.handler";
import {
  postRefreshTokenHandler,
  postRefreshTokenRoute,
} from "./handlers/post-refresh-token.handler";
import { getMeHandler, getMeRoute } from "./handlers/get-me.handler";
import {
  getLogoutHandler,
  getLogoutRoute,
} from "./handlers/get-logout.handler";

const authRoutes = createRouter<AppBindings>();

// Apply auth-specific rate limiting
authRoutes.use(authRateLimiter);

// Register routes - each handler defines its own OpenAPI schema
authRoutes.openapi(getOAuthProviderRoute, getOAuthHandler);
authRoutes.openapi(getOAuthCallbackRoute, getOauthCallbackHandler);
authRoutes.openapi(postOauthAppleCallbackRoute, postOauthAppleCallbackHandler);
authRoutes.openapi(
  getOauthSessionEstablishRoute,
  getOauthSessionEstablishHandler,
);
authRoutes.openapi(postRefreshTokenRoute, postRefreshTokenHandler);
authRoutes.openapi(getMeRoute, getMeHandler);
authRoutes.openapi(getLogoutRoute, getLogoutHandler);

export default authRoutes;
