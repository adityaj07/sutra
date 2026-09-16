import crypto from "crypto";
import {
  db,
  SessionService,
  SessionStatus,
  type DBTransaction,
} from "@sutra/db";
import { env } from "@sutra/env/server";
import {
  hashRefreshToken,
  logger,
  signSutraToken,
  verifySutraToken,
} from "@sutra/shared";

export interface SutraRefreshResult {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export type SutraRefreshFailureReason =
  | "invalid_token"
  | "expired_token"
  | "wrong_token_type"
  | "session_not_found"
  | "session_revoked"
  | "session_expired"
  | "hash_missing"
  | "reuse_detected";

// Domain error for Sūtra refresh failures. The HTTP handler maps `reason`
// to a status code; messages are safe to expose to clients.
export class SutraRefreshError extends Error {
  readonly reason: SutraRefreshFailureReason;

  constructor(reason: SutraRefreshFailureReason, message: string) {
    super(message);
    this.name = "SutraRefreshError";
    this.reason = reason;
  }
}

// Constant-time hash comparison. Length mismatch is a mismatch, not an error.
function hashesEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export namespace SutraRefreshService {
  /**
   * Rotates a Sūtra session's token pair using the current refresh JWT.
   *
   * The refresh token itself is the credential: its signature, `type`, and
   * stored hash are verified, then the hash is atomically replaced so the
   * presented token becomes invalid. Presenting any other token for the same
   * session afterwards is treated as reuse and revokes the session.
   * @param refreshToken - The currently valid Sūtra refresh JWT
   * @param options - Optional database transaction
   * @returns New access and refresh JWTs with their expirations
   */
  export async function refresh(
    refreshToken: string,
    options?: {
      tx?: DBTransaction;
    },
  ): Promise<SutraRefreshResult> {
    // Verify signature and expiration; malformed claims fail closed here.
    let sessionId: string;
    let userId: string;

    try {
      const claims = verifySutraToken(refreshToken, env.JWT_SECRET);

      if (!claims) {
        throw new SutraRefreshError("invalid_token", "Invalid refresh token.");
      }

      if (claims.type !== "refresh") {
        throw new SutraRefreshError(
          "wrong_token_type",
          claims.type === undefined
            ? "Invalid refresh token."
            : "Token is not a refresh token.",
        );
      }

      sessionId = claims.sessionId;
      userId = claims.userId;
    } catch (err) {
      if (err instanceof SutraRefreshError) {
        throw err;
      }

      if (err instanceof Error && err.name === "TokenExpiredError") {
        throw new SutraRefreshError(
          "expired_token",
          "Refresh token expired. Please re-authenticate.",
        );
      }

      throw new SutraRefreshError("invalid_token", "Invalid refresh token.");
    }

    // NOTE: reuse handling deliberately happens OUTSIDE the read/rotate
    // transaction below. Throwing inside `db.transaction` rolls the whole
    // transaction back, which would silently undo the revocation. So
    // runRefresh reports reuse as data, and refresh() revokes afterwards.
    type RefreshOutcome =
      { type: "rotated"; result: SutraRefreshResult } | { type: "reuse" };

    const runRefresh = async (tx: DBTransaction): Promise<RefreshOutcome> => {
      const session = await SessionService.findById(sessionId, { tx });

      if (!session || session.deletedAt) {
        throw new SutraRefreshError("session_not_found", "Session not found.");
      }

      if (session.userId !== userId) {
        throw new SutraRefreshError("invalid_token", "Invalid refresh token.");
      }

      // Inactive (revoked or otherwise non-active) sessions cannot refresh.
      if (
        session.status !== SessionStatus.ACTIVE ||
        session.revokedAt !== null
      ) {
        throw new SutraRefreshError(
          "session_revoked",
          "Session revoked. Please re-authenticate.",
        );
      }

      if (session.expiresAt <= new Date()) {
        throw new SutraRefreshError(
          "session_expired",
          "Session expired. Please re-authenticate.",
        );
      }

      if (!session.refreshTokenHash) {
        throw new SutraRefreshError(
          "hash_missing",
          "Session has no refresh credential. Please re-authenticate.",
        );
      }

      const suppliedHash = hashRefreshToken(refreshToken);

      if (!hashesEqual(suppliedHash, session.refreshTokenHash)) {
        return { type: "reuse" };
      }

      const accessToken = signSutraToken(
        { userId, sessionId, type: "access" },
        env.JWT_SECRET,
        { expiresIn: "1h" },
      );

      const nextRefreshToken = signSutraToken(
        { userId, sessionId, type: "refresh" },
        env.JWT_SECRET,
        { expiresIn: "90d" },
      );

      // Atomic oldHash -> newHash replacement. Zero affected rows means the
      // credential changed underneath us (concurrent refresh): treat as reuse.
      const rotated = await SessionService.rotateRefreshTokenHash(
        session.id,
        session.refreshTokenHash,
        hashRefreshToken(nextRefreshToken),
        { tx },
      );

      if (!rotated) {
        return { type: "reuse" };
      }

      logger.audit("Sutra refresh token rotated", {
        module: "auth",
        action: "refresh:success",
        sessionId: session.id,
        userId,
      });

      return {
        type: "rotated",
        result: {
          accessToken,
          refreshToken: nextRefreshToken,
          accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
          refreshTokenExpiresAt: session.expiresAt,
        },
      };
    };

    // Use transaction if provided, otherwise start a new one
    const outcome = options?.tx
      ? await runRefresh(options.tx)
      : await db.transaction(async (tx) => {
          const result = await runRefresh(tx);

          return result;
        });

    if (outcome.type === "reuse") {
      // Revoke outside the read/rotate transaction so the revocation is
      // never rolled back. Reuses the caller's transaction when one was
      // passed (it commits with the caller); otherwise autocommits.
      await revokeForReuse(sessionId, options?.tx);

      throw new SutraRefreshError(
        "reuse_detected",
        "Session revoked. Please re-authenticate.",
      );
    }

    return outcome.result;
  }

  /**
   * Revokes a session after refresh-token reuse is detected, clearing its
   * stored hash so no further refresh is possible.
   */
  async function revokeForReuse(sessionId: string, tx?: DBTransaction) {
    await SessionService.updateById(
      sessionId,
      {
        status: SessionStatus.REVOKED,
        revokedAt: new Date(),
        refreshTokenHash: null,
      },
      tx ? { tx } : undefined,
    );

    logger.warn("Refresh token reuse detected, session revoked", {
      module: "auth",
      action: "refresh:reuse_detected",
      sessionId,
    });
  }
}
