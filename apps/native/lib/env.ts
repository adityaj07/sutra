import { ENV } from "@/src/env";

/**
 * Reader for the Varlock-managed native environment.
 *
 * Source of truth is the Varlock environment (`apps/native/src/env.ts`,
 * generated from `.env.schema`, wired via `@varlock/expo-integration` in
 * babel/metro config). `process.env` is read as a fallback so the same code
 * works outside the Expo runtime (bun tests, plain scripts).
 *
 * One reader for the whole app: consumers must not invent their own
 * `process.env` access, or the "which env won?" question comes back.
 * `@sutra/env/native` is intentionally NOT used — it has no consumers and
 * would be a second competing system.
 */

/** Environment keys the native app is allowed to read. */
export type NativeEnvKey = "NODE_ENV" | "EXPO_PUBLIC_SERVER_URL";

/** Returns the value, or `undefined` when unset/empty in both sources. */
export function readEnv(name: NativeEnvKey): string | undefined {
  try {
    // Property access on the Varlock proxy throws outside the Expo runtime
    // ("ENV not initialized"); the import itself is side-effect free.
    const value = ENV?.[name];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  } catch {
    // Fall through to process.env (tests, non-Expo runtimes).
  }

  const fallback = process.env[name];
  return typeof fallback === "string" && fallback.length > 0
    ? fallback
    : undefined;
}
