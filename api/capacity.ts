import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    // GET - Get capacity for a zone
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

    // PUT - Update capacity (upsert)
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
