import { PrismaClient } from '../generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig, Pool } from '@neondatabase/serverless';

// Required for Neon serverless
neonConfig.useSecureWebSocket = true;

// Create a singleton Prisma client for serverless
let prisma: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool as any);
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export default getDb;
