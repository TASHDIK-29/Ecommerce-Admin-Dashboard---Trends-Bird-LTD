import { PrismaClient } from "@prisma/client";

import { isDevelopment } from "./env";

/**
 * A single PrismaClient for the whole process.
 *
 * In development `tsx watch` re-executes modules on every save, so the client
 * is cached on `globalThis` to avoid exhausting the Postgres connection pool
 * with a new client per reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ["warn", "error"] : ["error"],
  });

if (isDevelopment) {
  globalForPrisma.prisma = prisma;
}

export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
