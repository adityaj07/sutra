import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    // CORS
    CORS_ORIGIN: z
      .string()
      .optional()
      .default("*")
      .describe("Comma-separated list of allowed origins or * for all"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.string().optional().default("8000"),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .optional()
      .default("info"),

    // OAuth - Google
    GOOGLE_CLIENT_ID: z.string({ message: "GOOGLE_CLIENT_ID is required" }),
    GOOGLE_CLIENT_SECRET: z.string({
      message: "GOOGLE_CLIENT_SECRET is required",
    }),
    GOOGLE_REDIRECT_URI: z.string({
      message: "GOOGLE_REDIRECT_URI is required",
    }),

    JWT_SECRET: z.string({ message: "JWT_SECRET is required" }).min(32, {
      message: "JWT_SECRET must be at least 32 characters long for security",
    }),

    ENCRYPTION_KEY: z.string({ message: "ENCRYPTION_KEY is required" }).refine(
      (val) => {
        // AES-256-GCM requires a 32-byte (256-bit) key
        // Hex encoded means 64 characters (32 bytes * 2)
        return /^[0-9a-fA-F]{64}$/.test(val);
      },
      {
        message:
          "ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes for AES-256)",
      },
    ),

    FRONTEND_URL: z
      .url({ message: "FRONTEND_URL must be a valid URL" })
      .optional()
      .default("http://localhost:3000"),

    // Docker Services (optional, with defaults)
    POSTGRES_PORT: z.string().optional().default("5432"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
