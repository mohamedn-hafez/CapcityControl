import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client for serverless
let prisma: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export default getDb;
