import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const yearMonth = req.query.yearMonth as string;
      const where = yearMonth ? { yearMonth } : {};

      const assignments = await prisma.projectAssignment.findMany({
        where,
        include: {
          zone: {
            include: {
              floor: { include: { site: true } },
            },
          },
          project: { include: { client: true } },
          queue: true,
        },
        orderBy: [{ yearMonth: 'asc' }, { zoneId: 'asc' }],
      });
      return res.status(200).json({ success: true, data: assignments });
    }

    if (req.method === 'POST') {
      const { projectId, zoneId, queueId, yearMonth, seats } = req.body;

      // Upsert - update if exists, create if not
      const assignment = await prisma.projectAssignment.upsert({
        where: {
          zoneId_projectId_yearMonth: { zoneId, projectId, yearMonth },
        },
        update: { seats, queueId },
        create: {
          projectId,
          zoneId,
          queueId,
          yearMonth,
          seats,
        },
      });
      return res.status(201).json({ success: true, data: assignment });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      await prisma.projectAssignment.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
