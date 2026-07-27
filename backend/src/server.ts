/* eslint-disable no-console */
import type { Server } from "http";

import app from "./app";
import { envVars } from "./app/config/env";
import { connectDatabase, disconnectDatabase } from "./app/config/prisma";

let server: Server | undefined;

const startServer = async (): Promise<void> => {
  await connectDatabase();
  console.log("Database connected");

  server = app.listen(Number(envVars.PORT), () => {
    console.log(
      `Server listening on port ${envVars.PORT} in ${envVars.NODE_ENV} mode`,
    );
  });
};

const shutdown = async (reason: string, error?: unknown): Promise<void> => {
  console.error(`Shutting down: ${reason}`);
  if (error) console.error(error);

  if (server) {
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(1));
    });
    return;
  }

  await disconnectDatabase();
  process.exit(1);
};

process.on("unhandledRejection", (error) => {
  void shutdown("unhandled promise rejection", error);
});

process.on("uncaughtException", (error) => {
  void shutdown("uncaught exception", error);
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM received");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT received");
});

void (async () => {
  try {
    await startServer();
  } catch (error) {
    await shutdown("failed to start", error);
  }
})();
