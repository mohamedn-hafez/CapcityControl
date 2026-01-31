import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    // GET - List all closure plans
    if (req.method === 'GET') {
      const closures = await prisma.closurePlan.findMany({
        include: {
          zone: {
            include: {
              floor: {
                include: {
                  site: {
                    include: {
                      region: true,
                    },
                  },
                },
              },
            },
          },
          allocations: {
            include: {
              targetZone: {
                include: {
                  floor: {
                    include: {
                      site: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { closureDate: 'asc' },
      });

      const formattedClosures = closures.map((cp) => ({
        id: cp.id,
        zoneId: cp.zoneId,
        siteId: cp.zone.floor.site.id,
        siteName: cp.zone.floor.site.name,
        siteCode: cp.zone.floor.site.code,
        floorId: cp.zone.floor.id,
        floorName: cp.zone.floor.name,
        zoneName: cp.zone.name,
        siteFloorZoneCode: cp.zone.siteFloorZoneCode,
        regionCode: cp.zone.floor.site.region.code,
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

      return res.status(200).json({ success: true, data: formattedClosures });
    }

    // POST - Create new closure plan
    if (req.method === 'POST') {
      const { zoneId, closureDate, seatsAffected } = req.body;

      if (!zoneId || !closureDate) {
        return res.status(400).json({ success: false, error: 'zoneId and closureDate are required' });
      }

      // Get zone details to calculate affected seats if not provided
      const zone = await prisma.zone.findUnique({
        where: { id: zoneId },
        include: {
          monthlyCapacities: {
            orderBy: { yearMonth: 'desc' },
            take: 1,
          },
        },
      });

      if (!zone) {
        return res.status(404).json({ success: false, error: 'Zone not found' });
      }

      const affectedSeats = seatsAffected ?? zone.monthlyCapacities[0]?.occupiedSeats ?? 0;
      const dateObj = new Date(closureDate);
      const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

      const closurePlan = await prisma.closurePlan.create({
        data: {
          zoneId,
          closureDate: dateObj,
          yearMonth,
          seatsAffected: affectedSeats,
          status: 'PLANNED',
        },
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
      });

      return res.status(201).json({ success: true, data: closurePlan });
    }

    // DELETE - Remove closure plan
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'Closure plan ID required' });
      }

      await prisma.closurePlan.delete({
        where: { id },
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
