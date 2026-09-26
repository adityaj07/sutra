/**
 * Regenerates the native OpenAPI contract types from the backend.
 *
 * Source of truth: the live backend `GET /docs-json` document
 * (Hono + @hono/zod-openapi registry, served by `apps/server`).
 * No static JSON artifact is committed — fetching the served document
 * guarantees the generated types match exactly what the server exposes.
 *
 * Usage:
 *   1. Start the backend:  bun run dev:server   (from the repo root)
 *   2. Regenerate:         bun --filter native api:generate   (from the repo root)
 *      (or `bun run api:generate` from apps/native)
 *
 * The server URL resolves from `SUTRA_SERVER_URL`, then
 * `EXPO_PUBLIC_SERVER_URL`, then `http://localhost:3000`.
 *
 * Output: `lib/api/generated.ts` (gitignored, never hand-edited).
 * openapi-typescript emits pure compile-time types — zero runtime
 * dependencies are added by this workflow.
 */
import openapiTS, { astToString } from "openapi-typescript";

const GENERATED_PATH = new URL("../lib/api/generated.ts", import.meta.url);

const SERVER_BASE = (
  process.env.SUTRA_SERVER_URL ??
  process.env.EXPO_PUBLIC_SERVER_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");

function header(): string {
  return (
    `/**\n` +
    ` * AUTO-GENERATED — DO NOT EDIT MANUALLY.\n` +
    ` *\n` +
    ` * Generated from the backend OpenAPI contract (${SERVER_BASE}/docs-json).\n` +
    ` * Regenerate with: bun --filter native api:generate (repo root) or\n` +
    ` * bun run api:generate (apps/native), with the backend running\n` +
    ` * (bun run dev:server from the repo root).\n` +
    ` * Generator: openapi-typescript (types only, no runtime code).\n` +
    ` */\n\n`
  );
}

async function main(): Promise<void> {
  const docsUrl = `${SERVER_BASE}/docs-json`;

  let document: unknown;
  try {
    const response = await fetch(docsUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    document = (await response.json()) as unknown;
  } catch (error) {
    console.error(
      `[api:generate] Could not fetch ${docsUrl}. ` +
        `Start the backend first: bun run dev:server (repo root).`,
    );
    throw error;
  }

  // openapi-typescript v7 returns TypeScript AST nodes; serialize them.
  const output = astToString(await openapiTS(document as never));
  await Bun.write(GENERATED_PATH, header() + output);
  console.log(
    `[api:generate] Wrote ${new URL(GENERATED_PATH).pathname} from ${docsUrl}`,
  );
}

await main();
