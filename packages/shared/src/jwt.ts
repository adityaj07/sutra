import crypto from "crypto";
import * as jwt from "jsonwebtoken";

// Signs a Jwt
export function signJwt(
  payload: jwt.JwtPayload,
  jwtSecret: string,
  options?: jwt.SignOptions,
) {
  return jwt.sign(payload, jwtSecret, { ...options, algorithm: "HS256" });
}

// Verifies a Jwt
export function verifyJwt<T = jwt.JwtPayload>(
  token: string,
  jwtSecret: string,
  options?: jwt.VerifyOptions,
): T | null {
  return jwt.verify(token, jwtSecret, {
    ...options,
    algorithms: ["HS256"],
  }) as T;
}

// Sūtra application session token type: distinguishes tokens used for API
// authentication ("access", short-lived) from tokens used to obtain new
// token pairs ("refresh", long-lived, rotating). Unrelated JWTs (OAuth
// state, OAuth session ticket) do not use these claims.
export type SutraTokenType = "access" | "refresh";

export interface SutraTokenClaims extends jwt.JwtPayload {
  userId: string;
  sessionId: string;
  type: SutraTokenType;
  jti: string;
}

// Signs a Sūtra auth token, always assigning a fresh cryptographically
// secure jti (UUIDv4 from the OS CSPRNG). Callers must not reuse jti values.
export function signSutraToken(
  params: { userId: string; sessionId: string; type: SutraTokenType },
  jwtSecret: string,
  options?: jwt.SignOptions,
) {
  const payload: SutraTokenClaims = { ...params, jti: crypto.randomUUID() };
  return signJwt(payload, jwtSecret, options);
}

// Verifies a Sūtra auth token: signature/expiration errors throw (same as
// verifyJwt); a well-formed JWT with missing fields or a mismatched `type`
// returns null so callers can fail closed with a 401.
export function verifySutraToken(
  token: string,
  jwtSecret: string,
  expectedType?: SutraTokenType,
  options?: jwt.VerifyOptions,
): SutraTokenClaims | null {
  const decoded = verifyJwt<SutraTokenClaims>(token, jwtSecret, options);

  if (
    !decoded ||
    typeof decoded !== "object" ||
    !decoded.userId ||
    !decoded.sessionId ||
    !decoded.jti ||
    (expectedType !== undefined && decoded.type !== expectedType)
  ) {
    return null;
  }

  return decoded;
}
