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
