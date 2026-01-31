import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    // GET - Get capacity for a zone
    if (req.method === 'GET') {
      const { zoneId, yearMonth } = req.query;

      const where: any = {};
      if (zoneId) where.zoneId = zoneId;
      if (yearMonth) where.yearMonth = yearMonth;

      const capacities = await prisma.monthlyCapacity.findMany({
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

    // PUT - Update capacity
    if (req.method === 'PUT') {
      const { zoneId, yearMonth, capacity, occupiedSeats } = req.body;

      if (!zoneId || !yearMonth) {
        return res.status(400).json({ success: false, error: 'zoneId and yearMonth required' });
      }

      // Check if record exists
      const existing = await prisma.monthlyCapacity.findUnique({
        where: {
          zoneId_yearMonth: { zoneId, yearMonth },
        },
      });

      const [year, month] = yearMonth.split('-').map(Number);

      if (existing) {
        // Update existing
        const updated = await prisma.monthlyCapacity.update({
          where: { id: existing.id },
          data: {
            capacity: capacity ?? existing.capacity,
            occupiedSeats: occupiedSeats ?? existing.occupiedSeats,
            unallocated: (capacity ?? existing.capacity) - (occupiedSeats ?? existing.occupiedSeats),
          },
        });
        return res.status(200).json({ success: true, data: updated });
      } else {
        // Create new
        const created = await prisma.monthlyCapacity.create({
          data: {
            zoneId,
            year,
            month,
            yearMonth,
            capacity: capacity ?? 0,
            occupiedSeats: occupiedSeats ?? 0,
            unallocated: (capacity ?? 0) - (occupiedSeats ?? 0),
          },
        });
        return res.status(201).json({ success: true, data: created });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
