import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

dotenv.config({
  path: "../../apps/server/.env.local",
  override: true,
});

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
    ssl:
      process.env.NODE_ENV === "development"
        ? false
        : { rejectUnauthorized: false },
  },
  casing: "snake_case",
});
