import crypto from "crypto";

/**
 * Computes the SHA-256 hex digest of a Sūtra refresh JWT for storage in
 * `sessions.refreshTokenHash`.
 *
 * Deterministic and unsalted: the JWT already carries CSPRNG entropy through
 * its signature and `jti`, and rotation-time comparison must be deterministic.
 * Never store or log the raw refresh token; persist only this hash.
 */
export function hashRefreshToken(refreshToken: string): string {
  return crypto.createHash("sha256").update(refreshToken, "utf8").digest("hex");
}
