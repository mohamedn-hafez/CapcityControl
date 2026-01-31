import { PrismaClient } from '@prisma/client';
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

    // Use neon() for HTTP-based queries (no WebSocket needed)
    const sql = neon(connectionString);
    const adapter = new PrismaNeon(sql as any);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export default getDb;
