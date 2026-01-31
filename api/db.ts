import { PrismaClient } from '../generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neon } from '@neondatabase/serverless';

// Create a singleton Prisma client for serverless
let prisma: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const sql = neon(connectionString);
    const adapter = new PrismaNeon(sql);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export default getDb;
