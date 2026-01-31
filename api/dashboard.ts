import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const { yearMonth } = req.query;

      if (!yearMonth || typeof yearMonth !== 'string') {
        return res.status(400).json({ success: false, error: 'yearMonth parameter required' });
      }

      // Get all sites with floors, zones, and capacities
      const sites = await prisma.site.findMany({
        include: {
          region: true,
          floors: {
            include: {
              zones: {
                include: {
                  zoneCapacities: { where: { yearMonth } },
                  projectAssignments: { where: { yearMonth } },
                },
              },
              closurePlans: { where: { status: 'PLANNED' } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Get closures this month (floor level)
      const closuresThisMonth = await prisma.closurePlan.findMany({
        where: { yearMonth },
        include: {
          floor: {
            include: {
              site: true,
              zones: true,
            },
          },
        },
      });

      // Transform to dashboard format
      const dashboardSites = sites.map((site) => {
        let siteTotalCapacity = 0;
        let siteTotalOccupied = 0;

        const floors = site.floors.map((floor) => {
          let floorTotalCapacity = 0;
          let floorTotalOccupied = 0;

          // Check if this floor is closed
          const floorClosurePlan = floor.closurePlans.find((cp) => cp.yearMonth <= yearMonth);
          const isFloorClosed = !!floorClosurePlan;

          const zones = floor.zones.map((zone) => {
            const capacityRecord = zone.zoneCapacities[0];
            const zoneCapacity = capacityRecord?.capacity || 0;

            // Calculate occupied from ProjectAssignment
            const zoneOccupied = isFloorClosed ? 0 : zone.projectAssignments.reduce((sum, pa) => sum + pa.seats, 0);
            const zoneAvailable = isFloorClosed ? 0 : Math.max(0, zoneCapacity - zoneOccupied);
            const utilization = zoneCapacity > 0 ? (zoneOccupied / zoneCapacity) * 100 : 0;

            floorTotalCapacity += isFloorClosed ? 0 : zoneCapacity;
            floorTotalOccupied += zoneOccupied;

            return {
              zoneId: zone.id,
              zoneCode: zone.code,
              zoneName: zone.name,
              siteFloorZoneCode: zone.siteFloorZoneCode,
              capacity: zoneCapacity,
              occupied: zoneOccupied,
              available: zoneAvailable,
              utilizationPercent: Math.round(utilization * 10) / 10,
              riskStatus: getRiskStatus(utilization, isFloorClosed),
              isClosing: isFloorClosed,
              closureDate: floorClosurePlan?.closureDate?.toISOString().split('T')[0],
            };
          });

          siteTotalCapacity += floorTotalCapacity;
          siteTotalOccupied += floorTotalOccupied;

          const floorUtilization = floorTotalCapacity > 0 ? (floorTotalOccupied / floorTotalCapacity) * 100 : 0;

          return {
            floorId: floor.id,
            floorCode: floor.code,
            floorName: floor.name,
            totalCapacity: floorTotalCapacity,
            totalOccupied: floorTotalOccupied,
            totalAvailable: floorTotalCapacity - floorTotalOccupied,
            utilizationPercent: Math.round(floorUtilization * 10) / 10,
            riskStatus: getRiskStatus(floorUtilization, isFloorClosed),
            isClosing: isFloorClosed,
            zones,
          };
        });

        const siteUtilization = siteTotalCapacity > 0 ? (siteTotalOccupied / siteTotalCapacity) * 100 : 0;

        return {
          siteId: site.id,
          siteCode: site.code,
          siteName: site.name,
          regionCode: site.region.code,
          regionName: site.region.name,
          status: site.status,
          totalCapacity: siteTotalCapacity,
          totalOccupied: siteTotalOccupied,
          totalAvailable: siteTotalCapacity - siteTotalOccupied,
          utilizationPercent: Math.round(siteUtilization * 10) / 10,
          riskStatus: getRiskStatus(siteUtilization),
          floors,
        };
      });

      const totalCapacity = dashboardSites.reduce((sum, s) => sum + s.totalCapacity, 0);
      const totalOccupied = dashboardSites.reduce((sum, s) => sum + s.totalOccupied, 0);

      const [year, month] = yearMonth.split('-').map(Number);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      return res.status(200).json({
        success: true,
        data: {
          yearMonth,
          year,
          month,
          monthName: monthNames[month - 1],
          sites: dashboardSites,
          totalCapacity,
          totalOccupied,
          totalAvailable: totalCapacity - totalOccupied,
          closuresThisMonth: closuresThisMonth.map((cp) => ({
            id: cp.id,
            floorId: cp.floorId,
            siteName: cp.floor.site.name,
            floorName: cp.floor.name,
            zoneName: cp.floor.zones.map(z => z.name).join(', '),
            closureDate: cp.closureDate.toISOString().split('T')[0],
            yearMonth: cp.yearMonth,
            seatsAffected: cp.seatsAffected,
            status: cp.status,
          })),
        },
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function getRiskStatus(utilization: number, isClosed: boolean = false): string {
  if (isClosed) return 'CLOSED';
  if (utilization > 100) return 'OVERFLOW';
  if (utilization >= 95) return 'RISK';
  if (utilization >= 85) return 'WARNING';
  return 'OK';
}
