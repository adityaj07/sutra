import { closeDB, connectDB, initializeDB } from "@sutra/db";
import { env } from "@sutra/env/server";
import { logger } from "@sutra/shared";
import { serve, type ServerType } from "@hono/node-server";
import { app } from "./app";

// Initialize db with config
initializeDB({
  connectionString: env.DATABASE_URL,
  ssl:
    env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

let server: ServerType;

async function start() {
  try {
    await connectDB();
    server = serve({
      fetch: app.fetch,
      port: +env.PORT,
    });

    logger.info(`Server running on port ${env.PORT}`, {
      module: "system",
      action: "startup",
    });
  } catch (error) {
    logger.error("Failed to start server", {
      module: "system",
      action: "startup",
      error: error as Error,
    });
    process.exit(1);
  }
}

void start();

// Stop Server
async function stop() {
  const shutdownTimeout = setTimeout(() => {
    logger.error("Shutdown timeout reached, forcing exit", {
      module: "system",
      action: "shutdown",
    });
    process.exit(1);
  }, 10000);

  try {
    // Clear resources
    await closeDB();
    // await closeRedis()
  } catch (error) {
    logger.error("Failed to close DB", {
      module: "db",
      action: "shutdown",
      error: error as Error,
    });
  }

  // Close server after resources
  server.close((err) => {
    if (err) {
      logger.error("Force closed server", {
        module: "system",
        action: "shutdown",
        error: err,
      });
    } else {
      logger.info("Server closed", {
        module: "system",
        action: "shutdown",
      });
    }
    clearTimeout(shutdownTimeout);
    process.exit(0);
  });
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
