import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // GET - List all closure plans
    if (req.method === 'GET') {
      const closures = await prisma.closurePlan.findMany({
        include: {
          floor: {
            include: {
              site: { include: { region: true } },
              zones: true,
            },
          },
          allocations: {
            include: {
              targetZone: {
                include: {
                  floor: { include: { site: true } },
                },
              },
            },
          },
        },
        orderBy: { closureDate: 'asc' },
      });

      const formatted = closures.map((cp) => ({
        id: cp.id,
        floorId: cp.floorId,
        siteId: cp.floor.site.id,
        siteName: cp.floor.site.name,
        siteCode: cp.floor.site.code,
        floorName: cp.floor.name,
        zoneNames: cp.floor.zones.map(z => z.name).join(', '),
        zoneCount: cp.floor.zones.length,
        regionCode: cp.floor.site.region.code,
        regionName: cp.floor.site.region.name,
        closureDate: cp.closureDate.toISOString().split('T')[0],
        yearMonth: cp.yearMonth,
        seatsAffected: cp.seatsAffected,
        status: cp.status,
        allocations: cp.allocations.map((a) => ({
          id: a.id,
          targetSiteId: a.targetZone.floor.site.id,
          targetSiteName: a.targetZone.floor.site.name,
          targetZoneId: a.targetZoneId,
          allocatedSeats: a.allocatedSeats,
          isManual: a.isManual,
        })),
        totalAllocated: cp.allocations.reduce((sum, a) => sum + a.allocatedSeats, 0),
        unseatedStaff: cp.seatsAffected - cp.allocations.reduce((sum, a) => sum + a.allocatedSeats, 0),
      }));

      return res.status(200).json({ success: true, data: formatted });
    }

    // POST - Create new closure plan (floor level)
    if (req.method === 'POST') {
      const { floorId, closureDate, seatsAffected } = req.body;

      if (!floorId || !closureDate) {
        return res.status(400).json({ success: false, error: 'floorId and closureDate required' });
      }

      const floor = await prisma.floor.findUnique({
        where: { id: floorId },
        include: {
          site: true,
          zones: {
            include: {
              projectAssignments: {
                orderBy: { yearMonth: 'desc' },
              },
            },
          },
        },
      });

      if (!floor) {
        return res.status(404).json({ success: false, error: 'Floor not found' });
      }

      const date = new Date(closureDate);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      let calculatedSeats = 0;
      for (const zone of floor.zones) {
        const latestAssignments = zone.projectAssignments.filter(pa => pa.yearMonth === yearMonth);
        calculatedSeats += latestAssignments.reduce((sum, pa) => sum + pa.seats, 0);
      }

      const seats = seatsAffected || calculatedSeats;

      const closure = await prisma.closurePlan.create({
        data: {
          id: `cp_${floor.site.code}${floor.code}`,
          floorId,
          closureDate: date,
          yearMonth,
          seatsAffected: seats,
          status: 'PLANNED',
        },
      });

      return res.status(201).json({ success: true, data: closure });
    }

    // DELETE - Remove closure plan
    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      if (!id) {
        return res.status(400).json({ success: false, error: 'id required' });
      }

      await prisma.closurePlan.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
