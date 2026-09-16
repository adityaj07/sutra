import { randomUUID } from "crypto";
import {
  AccountsService,
  db,
  AccountProvider,
  SessionStatus,
  UsersService,
  type DBTransaction,
} from "@sutra/db";
import { SessionService } from "@sutra/db";
import { env } from "@sutra/env/server";
import {
  encrypt,
  hashRefreshToken,
  logger,
  signSutraToken,
  type OAuthProvider,
} from "@sutra/shared";
import { oauthProviderFactory } from "../providers";

export interface OAuthCallbackResult {
  user: Awaited<ReturnType<typeof UsersService.create>>;
  session: Awaited<ReturnType<typeof SessionService.create>>;
  /** Sūtra access JWT minted for this session (1h, `type: "access"`). */
  accessToken: string;
  /**
   * Sūtra refresh JWT minted for this session (90d, `type: "refresh"`).
   * Only `SHA-256(refreshToken)` is persisted (`sessions.refreshTokenHash`);
   * the raw token is returned to the caller for delivery to the client.
   */
  refreshToken: string;
}

type OAuthUserInfoPayload = {
  id: string;
  email: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

function capitalizeNamePart(part: string) {
  if (!part) {
    return part;
  }

  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

function namesFromEmailLocalPart(
  email: string,
): { firstName: string; lastName: string } | null {
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) {
    return null;
  }

  const parts = localPart.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  return {
    firstName: capitalizeNamePart(parts[0]!),
    lastName: parts.slice(1).map(capitalizeNamePart).join(" "),
  };
}

function isPlaceholderName(
  firstName: string | undefined,
  email: string,
): boolean {
  if (!firstName || firstName === "User") {
    return true;
  }

  const emailLocalPart = email.split("@")[0]?.toLowerCase();
  return emailLocalPart ? firstName.toLowerCase() === emailLocalPart : false;
}

// Resolves display names from OAuth user info, preserving existing DB values when providers omit name on repeat sign-ins, for eg, Apple after the first authorization
function resolveOAuthNameFields(
  userInfo: OAuthUserInfoPayload,
  existingUser?: {
    firstName: string;
    lastName: string | null;
  } | null,
) {
  const givenName = userInfo.given_name?.trim();
  const familyName = userInfo.family_name?.trim();
  const fullName = userInfo.name?.trim();

  let firstName = givenName || fullName?.split(/\s+/)[0];
  let lastName =
    familyName ??
    (fullName?.includes(" ")
      ? fullName.split(/\s+/).slice(1).join(" ")
      : undefined);

  if (
    !firstName &&
    existingUser?.firstName &&
    !isPlaceholderName(existingUser.firstName, userInfo.email)
  ) {
    firstName = existingUser.firstName;
  }

  if (lastName === undefined && existingUser?.lastName != null) {
    lastName = existingUser.lastName;
  }

  if (!firstName || isPlaceholderName(firstName, userInfo.email)) {
    const fromEmail = namesFromEmailLocalPart(userInfo.email);
    if (fromEmail) {
      firstName = fromEmail.firstName;
      if (!lastName) {
        lastName = fromEmail.lastName;
      }
    }
  }

  if (!firstName) {
    firstName = "User";
  }

  return {
    firstName,
    lastName: lastName ?? "",
  };
}

// Execute OAuth callback txn logic
async function executeOAuthCallbackTransaction(
  provider: AccountProvider,
  tokenResponse: {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
    scope?: string;
  },
  userInfo: OAuthUserInfoPayload,
  oauthProvider: OAuthProvider,
  tx: DBTransaction,
): Promise<OAuthCallbackResult> {
  const existingAccount = await AccountsService.findByProviderAccountId(
    provider,
    userInfo.id,
    { tx },
  );

  const existingUser = existingAccount
    ? await UsersService.findById(existingAccount.userId, { tx })
    : await UsersService.findByEmail(userInfo.email, { tx });

  const { firstName, lastName } = resolveOAuthNameFields(
    userInfo,
    existingUser,
  );

  let user = existingUser;

  if (user) {
    user = await UsersService.updateById(
      user.id,
      {
        firstName,
        lastName,
        avatar: userInfo.picture || null,
      },
      { tx },
    );
  } else {
    user = await UsersService.create(
      {
        email: userInfo.email,
        firstName,
        lastName,
        avatar: userInfo.picture || null,
      },
      { tx },
    );
  }

  if (!user) {
    throw new Error("Failed to upsert user during OAuth callback");
  }

  // Encrypt tokens
  const {
    data: encryptedAccessToken,
    iv: accessTokenIv,
    tag: accessTokenTag,
  } = encrypt(tokenResponse.access_token, env.ENCRYPTION_KEY);

  const {
    data: encryptedRefreshToken,
    iv: refreshTokenIv,
    tag: refreshTokenTag,
  } = encrypt(tokenResponse.refresh_token, env.ENCRYPTION_KEY);

  // Calculate token expirations
  const accessTokenExpiresIn = tokenResponse.expires_in || 3600; // Default 1 hour
  const accessTokenExpiresAt = new Date(
    Date.now() + accessTokenExpiresIn * 1000,
  );
  const refreshTokenExpiresIn =
    tokenResponse.refresh_token_expires_in ?? 90 * 24 * 60 * 60;

  const refreshTokenExpiresAt = new Date(
    Date.now() + refreshTokenExpiresIn * 1000,
  );
  const sessionExpiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1000); // 90 days

  const accountPayload = {
    userId: user.id,
    provider,
    providerAccountId: userInfo.id,
    providerScope:
      tokenResponse.scope || oauthProvider.getDefaultScopes().join(" "),
    providerAccessToken: encryptedAccessToken,
    providerAccessTokenIv: accessTokenIv,
    providerAccessTokenTag: accessTokenTag,
    providerAccessTokenExpiresAt: accessTokenExpiresAt,
    providerRefreshToken: encryptedRefreshToken,
    providerRefreshTokenIv: refreshTokenIv,
    providerRefreshTokenTag: refreshTokenTag,
    providerRefreshTokenExpiresAt: refreshTokenExpiresAt,
  };

  const account = existingAccount
    ? await AccountsService.updateById(existingAccount.id, accountPayload, {
        tx,
      })
    : await AccountsService.create(accountPayload, { tx });

  if (!account) {
    throw new Error("Failed to create or update account during OAuth callback");
  }

  // Mint the Sūtra token pair inside the transaction so the refresh-token
  // hash can be stored atomically with the session. The session id is
  // pre-generated here so it matches the `sessionId` claim in both JWTs.
  const sessionId = randomUUID();

  const accessToken = signSutraToken(
    { userId: user.id, sessionId, type: "access" },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  const refreshToken = signSutraToken(
    { userId: user.id, sessionId, type: "refresh" },
    env.JWT_SECRET,
    { expiresIn: "90d" },
  );

  const session = await SessionService.create(
    {
      id: sessionId,
      userId: user.id,
      accountId: account.id,
      status: SessionStatus.ACTIVE,
      expiresAt: sessionExpiresAt,
      lastAccessedAt: new Date(),
      refreshTokenHash: hashRefreshToken(refreshToken),
      metadata: {},
    },
    { tx },
  );

  return { user, session, accessToken, refreshToken };
}

export namespace OAuthService {
  /**
   * Handle OAuth callback flow
   * @param provider - The OAuth provider (e.g., AccountProvider.GOOGLE)
   * @param code - Authorization code from OAuth provider
   * @param options - Optional database transaction
   * @returns User and session created/updated, plus the minted Sūtra tokens
   */
  export async function handleCallback(
    provider: AccountProvider,
    code: string,
    options?: {
      tx?: DBTransaction;
      /** Provider-specific callback payload (e.g. Apple form_post body fields) */
      callbackData?: { user?: string; idToken?: string };
    },
  ): Promise<OAuthCallbackResult> {
    const oauthProvider = oauthProviderFactory.getProvider(provider);

    if (oauthProvider.setCallbackData) {
      oauthProvider.setCallbackData(options?.callbackData ?? {});
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await oauthProvider.exchangeCodeForToken(code);

      if (!tokenResponse.access_token) {
        throw new Error("Token response missing access_token");
      }

      if (!tokenResponse.refresh_token) {
        logger.warn(
          `OAuth provider ${provider} response missing refresh token`,
          {
            module: "auth",
            action: "oauth:callback:missing_refresh_token",
            provider,
          },
        );
        throw new Error("Refresh token is required for session creation");
      }

      // get user info using access token
      let userInfo = await oauthProvider.getUserInfo(
        tokenResponse.access_token,
      );

      // validate required id field
      if (!userInfo.id) {
        throw new Error("User info missing required field (id)");
      }

      // we can assert the refresh token here, coz at this point we know it exists
      const tokenResponseWithRefreshToken = {
        ...tokenResponse,
        refresh_token: tokenResponse.refresh_token,
      };

      const runCallback = async (tx: DBTransaction) => {
        // apple (and similar providers) may omit email on repeated sign-ins
        if (!userInfo.email) {
          const existingAccount = await AccountsService.findByProviderAccountId(
            provider,
            userInfo.id,
            { tx },
          );

          const existingUser = existingAccount
            ? await UsersService.findById(existingAccount.userId, { tx })
            : undefined;

          if (!existingUser?.email) {
            throw new Error("User info missing required fields (id, email)");
          }

          userInfo = { ...userInfo, email: existingUser.email };
        }

        return executeOAuthCallbackTransaction(
          provider,
          tokenResponseWithRefreshToken,
          userInfo,
          oauthProvider,
          tx,
        );
      };

      // Use transaction if provided, otherwise start a new one
      if (options?.tx) {
        return await runCallback(options.tx);
      }

      return await db.transaction(async (tx) => {
        const result = await runCallback(tx);

        return result;
      });
    } catch (err) {
      logger.error(`Error handling OAuth callback for provider ${provider}`, {
        module: "auth",
        action: "oauth:callback:error",
        provider,
        error: err as Error,
      });
      throw err;
    }
  }

  /**
   * Generate OAuth authorization URL
   * @param provider - The OAuth provider
   * @param state - CSRF protection state token
   * @returns Authorization URL
   */
  export function getAuthorizationUrl(
    provider: AccountProvider,
    state: string,
  ): string {
    const oauthProvider = oauthProviderFactory.getProvider(provider);
    return oauthProvider.getAuthorizationUrl(state);
  }
}
