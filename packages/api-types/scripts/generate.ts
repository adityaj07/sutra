/**
 * Regenerates `src/generated.ts` — the TypeScript view of the backend
 * OpenAPI contract.
 *
 * Pipeline (single command, offline, no running backend):
 *
 *   apps/server Zod route schemas (`createRoute`)
 *     → Hono OpenAPI document (`GET /docs-json`, built in-process)
 *       → openapi-typescript
 *         → packages/api-types/src/generated.ts
 *
 * The backend is the source of truth: nothing here describes the API, it only
 * transpiles what the server already publishes. `src/generated.ts` is an
 * artifact — never edit it, never hand-maintain a mirror of a server shape.
 *
 * Usage (from the repo root, or anywhere):
 *   bun run api:generate
 */
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const dumpScript = join(repoRoot, "apps/server/scripts/dump-openapi.ts");
const outputPath = join(packageRoot, "src/generated.ts");

const GENERATOR = "openapi-typescript";

function header(): string {
  return (
    `/**\n` +
    ` * AUTO-GENERATED — DO NOT EDIT.\n` +
    ` *\n` +
    ` * TypeScript types for the Sūtra backend OpenAPI contract, produced from\n` +
    ` * the document the server serves at GET /docs-json (Hono +\n` +
    ` * @hono/zod-openapi route schemas in apps/server).\n` +
    ` *\n` +
    ` * Regenerate from the repo root:  bun run api:generate\n` +
    ` * Generator: ${GENERATOR} (types only — no runtime code, no dependencies).\n` +
    ` */\n\n`
  );
}

/** Builds the OpenAPI document by mounting the server app in-process. */
function dumpOpenApiDocument(target: string): void {
  const result = spawnSync(process.execPath, [dumpScript, target], {
    cwd: repoRoot,
    stdio: ["ignore", "inherit", "inherit"],
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `[api:generate] ${dumpScript} exited with code ${result.status}. ` +
        `Does apps/server/.env exist (server env is validated on import)?`,
    );
  }
}

async function main(): Promise<void> {
  const specPath = join(tmpdir(), `sutra-openapi-${process.pid}.json`);

  try {
    dumpOpenApiDocument(specPath);
    const document: unknown = JSON.parse(await Bun.file(specPath).text());
    // openapi-typescript v7 returns TypeScript AST nodes; serialize them.
    const output = astToString(await openapiTS(document as never));
    await Bun.write(outputPath, header() + output);
    console.log(
      `[api:generate] Wrote ${outputPath} from the backend OpenAPI document.`,
    );
  } finally {
    await Bun.file(specPath)
      .delete()
      .catch(() => {});
  }
}

await main();
