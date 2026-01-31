import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const yearMonth = req.query.yearMonth as string;
      const where = yearMonth ? { yearMonth } : {};

      const capacities = await prisma.zoneCapacity.findMany({
        where,
        include: {
          zone: {
            include: {
              floor: { include: { site: true } },
            },
          },
        },
        orderBy: [{ yearMonth: 'asc' }, { zoneId: 'asc' }],
      });
      return res.status(200).json({ success: true, data: capacities });
    }

    if (req.method === 'POST') {
      const { zoneId, yearMonth, capacity } = req.body;

      // Upsert - update if exists, create if not
      const zoneCapacity = await prisma.zoneCapacity.upsert({
        where: {
          zoneId_yearMonth: { zoneId, yearMonth },
        },
        update: { capacity },
        create: {
          zoneId,
          yearMonth,
          capacity,
        },
      });
      return res.status(201).json({ success: true, data: zoneCapacity });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      await prisma.zoneCapacity.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
