import { PrismaClient } from "@prisma/client";

// Next.js dev mode reloads modules on every file change, which would create
// a fresh PrismaClient (and a fresh DB connection) each time without this
// global-caching trick. Standard Prisma + Next.js pattern.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
