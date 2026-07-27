import "dotenv/config";

import path from "node:path";

import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * `dotenv/config` is imported first on purpose: once a Prisma config file
 * exists, the CLI stops auto-loading `.env` itself, so DATABASE_URL would be
 * undefined during `migrate` / `seed` without this line.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
