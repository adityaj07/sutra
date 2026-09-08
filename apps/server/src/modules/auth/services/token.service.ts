import { AccountsService, SessionStatus, type DBTransaction } from "@sutra/db";
import { SessionService } from "@sutra/db";
import { env } from "@sutra/env/server";
import { decrypt, encrypt, logger } from "@sutra/shared";
import { oauthProviderFactory } from "../providers";

export interface TokenRefreshResult {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
}

export namespace TokenService {
  /**
   * Check if access token is expired or about to expire (within 5 minutes)
   * @param session - Session object with token expiration
   * @returns true if token is expired or expiring soon
   */
  export function isAccessTokenExpired(session: {
    providerAccessTokenExpiresAt: Date;
  }): boolean {
    const now = new Date();
    const expiresAt = new Date(session.providerAccessTokenExpiresAt);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer

    return expiresAt <= fiveMinutesFromNow;
  }

  /**
   * Check if refresh token is expired
   * @param account - account object with refresh token expiration (can be null too if the provider didn't provide one)
   * @returns true if refresh token is expired
   */
  export function isRefreshTokenExpired(account: {
    providerRefreshTokenExpiresAt: Date | null;
  }): boolean {
    if (!account.providerRefreshTokenExpiresAt) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(account.providerRefreshTokenExpiresAt);

    return expiresAt <= now;
  }

  /**
   * Refresh access token using refresh token
   * @param sessionId - Session ID
   * @param options - Optional database transaction
   * @returns New access token and expiration
   */
  export async function refreshAccessToken(
    sessionId: string,
    options?: {
      tx?: DBTransaction;
    },
  ): Promise<TokenRefreshResult> {
    const session = await SessionService.findById(sessionId, options);

    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new Error("Session is not active");
    }

    const account = await AccountsService.findById(session.accountId, options);

    if (!account) {
      throw new Error("Account not found");
    }

    // Check if refresh token is expired
    if (isRefreshTokenExpired(account)) {
      // Mark session as expired
      await SessionService.updateById(
        sessionId,
        { status: SessionStatus.EXPIRED },
        options,
      );

      logger.warn("Refresh token expired, session marked as expired", {
        module: "auth",
        action: "token:refresh:expired",
        sessionId,
      });

      throw new Error("Refresh token expired. Please re-authenticate.");
    }

    try {
      if (
        !account.providerRefreshToken ||
        !account.providerRefreshTokenIv ||
        !account.providerRefreshTokenTag
      ) {
        throw new Error("Account is missing refresh token credentials");
      }

      // decrypt the refresh token
      const refreshToken = decrypt(
        account.providerRefreshToken,
        account.providerRefreshTokenIv,
        account.providerRefreshTokenTag,
        env.ENCRYPTION_KEY,
      );

      // Get the oauth provider
      const oauthProvider = oauthProviderFactory.getProvider(account.provider);

      // refresh access token
      const tokenResponse =
        await oauthProvider.refreshAccessToken(refreshToken);

      if (!tokenResponse.access_token) {
        throw new Error("Token refresh response missing access_token");
      }

      // encrypt new access token
      const {
        data: encryptedAccessToken,
        iv: accessTokenIv,
        tag: accessTokenTag,
      } = encrypt(tokenResponse.access_token, env.ENCRYPTION_KEY);

      // Calculate new expiration
      const accessTokenExpiresIn = tokenResponse.expires_in || 3600; // Defaults to 1 hour
      const accessTokenExpiresAt = new Date(
        Date.now() + accessTokenExpiresIn * 1000,
      );

      // build update payload
      const updatePayload: Parameters<typeof AccountsService.updateById>[1] = {
        providerAccessToken: encryptedAccessToken,
        providerAccessTokenIv: accessTokenIv,
        providerAccessTokenTag: accessTokenTag,
        providerAccessTokenExpiresAt: accessTokenExpiresAt,
        // update the scope too if provided
        ...(tokenResponse.scope && {
          providerScope: tokenResponse.scope,
        }),
      };

      // update the refresh token if provider returned a new one here
      if (tokenResponse.refresh_token) {
        const {
          data: encryptedRefreshToken,
          iv: refreshTokenIv,
          tag: refreshTokenTag,
        } = encrypt(tokenResponse.refresh_token, env.ENCRYPTION_KEY);

        // const refreshTokenExpiresAt = new Date(
        //   Date.now() + (tokenResponse.expires_in || 90 * 24 * 60 * 60) * 1000,
        // );

        updatePayload.providerRefreshToken = encryptedRefreshToken;
        updatePayload.providerRefreshTokenIv = refreshTokenIv;
        updatePayload.providerRefreshTokenTag = refreshTokenTag;
        // updatePayload.providerRefreshTokenExpiresAt = refreshTokenExpiresAt;

        if (tokenResponse.refresh_token_expires_in != null) {
          updatePayload.providerRefreshTokenExpiresAt = new Date(
            Date.now() + tokenResponse.refresh_token_expires_in * 1000,
          );
        }
      }

      // update account with new access token
      await AccountsService.updateById(account.id, updatePayload, options);

      await SessionService.updateById(
        sessionId,
        {
          lastAccessedAt: new Date(),
        },
        options,
      );

      logger.audit("Access token refreshed successfully", {
        module: "auth",
        action: "token:refresh:success",
        sessionId,
      });

      return {
        accessToken: tokenResponse.access_token,
        accessTokenExpiresAt,
        refreshToken: tokenResponse.refresh_token,
        // refreshTokenExpiresAt: tokenResponse.refresh_token
        //   ? new Date(
        //       Date.now() +
        //         (tokenResponse.expires_in || 90 * 24 * 60 * 60) * 1000,
        //     )
        //   : undefined,
        refreshTokenExpiresAt:
          tokenResponse.refresh_token_expires_in != null
            ? new Date(
                Date.now() + tokenResponse.refresh_token_expires_in * 1000,
              )
            : undefined,
      };
    } catch (err) {
      logger.error("Error refreshing access token", {
        module: "auth",
        action: "token:refresh:error",
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });

      // Mark session as revoked if refresh failed
      await SessionService.updateById(
        sessionId,
        {
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
        },
        options,
      );

      throw err;
    }
  }
}
