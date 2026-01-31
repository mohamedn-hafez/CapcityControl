import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'POST') {
      const { sourceMonth, targetMonth, copyCapacity = true, copyAssignments = true } = req.body;

      if (!sourceMonth || !targetMonth) {
        return res.status(400).json({ success: false, error: 'sourceMonth and targetMonth required' });
      }

      let capacitiesCopied = 0;
      let assignmentsCopied = 0;

      if (copyCapacity) {
        const sourceCapacities = await prisma.zoneCapacity.findMany({
          where: { yearMonth: sourceMonth },
        });

        for (const cap of sourceCapacities) {
          await prisma.zoneCapacity.upsert({
            where: {
              zoneId_yearMonth: { zoneId: cap.zoneId, yearMonth: targetMonth },
            },
            update: { capacity: cap.capacity },
            create: {
              zoneId: cap.zoneId,
              yearMonth: targetMonth,
              capacity: cap.capacity,
            },
          });
          capacitiesCopied++;
        }
      }

      if (copyAssignments) {
        const sourceAssignments = await prisma.projectAssignment.findMany({
          where: { yearMonth: sourceMonth },
        });

        for (const assign of sourceAssignments) {
          await prisma.projectAssignment.upsert({
            where: {
              zoneId_projectId_yearMonth: {
                zoneId: assign.zoneId,
                projectId: assign.projectId,
                yearMonth: targetMonth,
              },
            },
            update: { seats: assign.seats, queueId: assign.queueId },
            create: {
              projectId: assign.projectId,
              zoneId: assign.zoneId,
              queueId: assign.queueId,
              yearMonth: targetMonth,
              seats: assign.seats,
            },
          });
          assignmentsCopied++;
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          sourceMonth,
          targetMonth,
          capacitiesCopied,
          assignmentsCopied,
        },
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
