import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const { yearMonth } = req.query;

      if (!yearMonth || typeof yearMonth !== 'string') {
        return res.status(400).json({ success: false, error: 'yearMonth parameter required' });
      }

      // Get all sites with their regions
      const sites = await prisma.site.findMany({
        include: {
          region: true,
          floors: {
            include: {
              zones: {
                include: {
                  monthlyCapacities: {
                    where: { yearMonth },
                  },
                  closurePlans: {
                    where: { status: 'PLANNED' },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Get closures for this month
      const closuresThisMonth = await prisma.closurePlan.findMany({
        where: { yearMonth },
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

      // Transform data into dashboard format
      const dashboardSites = sites.map((site) => {
        let siteTotalCapacity = 0;
        let siteTotalOccupied = 0;

        const floors = site.floors.map((floor) => {
          let floorTotalCapacity = 0;
          let floorTotalOccupied = 0;

          const zones = floor.zones.map((zone) => {
            const capacity = zone.monthlyCapacities[0];
            const closurePlan = zone.closurePlans.find(
              (cp) => cp.yearMonth <= yearMonth
            );
            const isClosed = !!closurePlan && closurePlan.yearMonth <= yearMonth;

            const zoneCapacity = capacity?.capacity || 0;
            const zoneOccupied = isClosed ? 0 : (capacity?.occupiedSeats || 0);
            const zoneAvailable = isClosed ? 0 : (zoneCapacity - zoneOccupied);
            const utilization = zoneCapacity > 0 ? (zoneOccupied / zoneCapacity) * 100 : 0;

            floorTotalCapacity += isClosed ? 0 : zoneCapacity;
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
              riskStatus: getRiskStatus(utilization, isClosed),
              isClosing: !!closurePlan,
              closureDate: closurePlan?.closureDate?.toISOString().split('T')[0],
            };
          });

          siteTotalCapacity += floorTotalCapacity;
          siteTotalOccupied += floorTotalOccupied;

          const floorUtilization = floorTotalCapacity > 0
            ? (floorTotalOccupied / floorTotalCapacity) * 100
            : 0;

          return {
            floorId: floor.id,
            floorCode: floor.code,
            floorName: floor.name,
            totalCapacity: floorTotalCapacity,
            totalOccupied: floorTotalOccupied,
            totalAvailable: floorTotalCapacity - floorTotalOccupied,
            utilizationPercent: Math.round(floorUtilization * 10) / 10,
            riskStatus: getRiskStatus(floorUtilization),
            zones,
          };
        });

        const siteUtilization = siteTotalCapacity > 0
          ? (siteTotalOccupied / siteTotalCapacity) * 100
          : 0;

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

      // Calculate totals
      const totalCapacity = dashboardSites.reduce((sum, s) => sum + s.totalCapacity, 0);
      const totalOccupied = dashboardSites.reduce((sum, s) => sum + s.totalOccupied, 0);

      const [year, month] = yearMonth.split('-').map(Number);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const dashboardData = {
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
          zoneId: cp.zoneId,
          siteName: cp.zone.floor.site.name,
          floorName: cp.zone.floor.name,
          zoneName: cp.zone.name,
          closureDate: cp.closureDate.toISOString().split('T')[0],
          yearMonth: cp.yearMonth,
          seatsAffected: cp.seatsAffected,
          status: cp.status,
        })),
      };

      return res.status(200).json({ success: true, data: dashboardData });
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
