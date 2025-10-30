// Lazy, resilient Prisma client import to avoid build-time failures when
// @prisma/client hasn't been generated yet in certain CI environments.
// Falls back to null; callers must handle missing client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PrismaClientCtor: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@prisma/client");
  PrismaClientCtor = mod.PrismaClient || (mod.default && mod.default.PrismaClient) || null;
} catch {
  PrismaClientCtor = null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { prisma?: any };

export const prisma = (() => {
  if (!PrismaClientCtor) return null;
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  // eslint-disable-next-line new-cap
  const client = new PrismaClientCtor({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
})();


