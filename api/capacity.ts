import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

neonConfig.useSecureWebSocket = true;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const { zoneId, yearMonth } = req.query;

      const where: any = {};
      if (zoneId) where.zoneId = zoneId;
      if (yearMonth) where.yearMonth = yearMonth;

      const capacities = await prisma.zoneCapacity.findMany({
        where,
        include: {
          zone: {
            include: {
              floor: {
                include: {
                  site: true,
                },
              },
            },
          },
        },
        orderBy: [{ yearMonth: 'asc' }],
      });

      return res.status(200).json({ success: true, data: capacities });
    }

    if (req.method === 'PUT') {
      const { zoneId, yearMonth, capacity } = req.body;

      if (!zoneId || !yearMonth) {
        return res.status(400).json({ success: false, error: 'zoneId and yearMonth required' });
      }

      const zoneCapacity = await prisma.zoneCapacity.upsert({
        where: {
          zoneId_yearMonth: { zoneId, yearMonth },
        },
        update: { capacity },
        create: {
          zoneId,
          yearMonth,
          capacity: capacity ?? 0,
        },
      });

      return res.status(200).json({ success: true, data: zoneCapacity });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
