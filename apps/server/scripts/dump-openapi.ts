/**
 * Writes the backend OpenAPI document to a JSON file.
 *
 * The document is produced by the SAME `app` instance the server serves
 * (`GET /docs-json`), mounted in-process via `app.request()` — no database
 * connection, no listening socket, no running dev server, so the contract can
 * be regenerated on any machine, offline and deterministically.
 *
 * Usage:
 *   bun run apps/server/scripts/dump-openapi.ts <output-file.json>
 *
 * The JSON goes to the file (never stdout) because the app's request logger
 * writes to stdout; progress messages go to stderr. Consumed by
 * `packages/api-types` (`bun run api:generate`) to generate the TypeScript
 * contract types.
 */
import { config as loadEnv } from "dotenv";

// Server env (`@sutra/env/server`) validates on import, so the workspace
// `.env` files must be loaded before `../src/app` is evaluated — hence the
// dynamic import below.
const serverRoot = new URL("../", import.meta.url);
loadEnv({ path: new URL(".env", serverRoot), quiet: true });
loadEnv({
  path: new URL(".env.local", serverRoot),
  override: true,
  quiet: true,
});

const outputPath = process.argv[2];

if (!outputPath) {
  console.error("usage: dump-openapi.ts <output-file.json>");
  process.exit(1);
}

const { app } = await import("../src/app");

const response = await app.request("/docs-json");

if (!response.ok) {
  console.error(
    `[dump-openapi] /docs-json returned HTTP ${response.status}. ` +
      `Is the OpenAPI document still registered in src/app.ts?`,
  );
  process.exit(1);
}

await Bun.write(
  outputPath,
  `${JSON.stringify(await response.json(), null, 2)}\n`,
);
console.error(`[dump-openapi] Wrote ${outputPath}`);
