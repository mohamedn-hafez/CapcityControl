import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getRiskStatus(utilization: number, isClosed: boolean = false): string {
  if (isClosed) return 'CLOSED';
  if (utilization > 100) return 'OVERFLOW';
  if (utilization >= 95) return 'RISK';
  if (utilization >= 85) return 'WARNING';
  return 'OK';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const closurePlanId = req.query.closurePlanId as string;
      if (!closurePlanId) {
        return res.status(400).json({ success: false, error: 'closurePlanId required' });
      }

      const closurePlan = await prisma.closurePlan.findUnique({
        where: { id: closurePlanId },
        include: {
          floor: {
            include: {
              site: { include: { region: true } },
              zones: {
                include: {
                  projectAssignments: {
                    include: {
                      project: { include: { client: true } },
                      queue: true,
                    },
                  },
                },
              },
            },
          },
          allocations: true,
        },
      });

      if (!closurePlan) {
        return res.status(404).json({ success: false, error: 'Closure plan not found' });
      }

      const sourceRegionId = closurePlan.floor.site.regionId;
      const sourceSiteId = closurePlan.floor.site.id;

      const occupancyBreakdown: any[] = [];

      for (const zone of closurePlan.floor.zones) {
        const zoneAssignments = zone.projectAssignments.filter(
          (pa) => pa.yearMonth === closurePlan.yearMonth && pa.seats > 0
        );
        for (const pa of zoneAssignments) {
          occupancyBreakdown.push({
            projectCode: pa.project.code,
            clientCode: pa.project.client.code,
            businessUnit: pa.queue.name,
            businessUnitCode: pa.queue.code,
            seats: pa.seats,
          });
        }
      }

      occupancyBreakdown.sort((a, b) => b.seats - a.seats);

      const sites = await prisma.site.findMany({
        where: {
          status: 'ACTIVE',
          id: { not: sourceSiteId },
          regionId: sourceRegionId,
        },
        include: {
          region: true,
          floors: {
            include: {
              zones: {
                include: {
                  zoneCapacities: { where: { yearMonth: closurePlan.yearMonth } },
                  projectAssignments: { where: { yearMonth: closurePlan.yearMonth } },
                },
              },
              closurePlans: { where: { yearMonth: { lte: closurePlan.yearMonth }, status: 'PLANNED' } },
            },
          },
        },
        orderBy: [{ openingDate: 'desc' }, { name: 'asc' }],
      });

      const siteCapacities = sites.map((site) => {
        let totalCapacity = 0;
        let totalOccupied = 0;

        for (const floor of site.floors) {
          if (floor.closurePlans.length > 0) continue;
          for (const zone of floor.zones) {
            const capacity = zone.zoneCapacities[0];
            if (capacity) {
              const occupied = zone.projectAssignments.reduce((sum, pa) => sum + pa.seats, 0);
              totalCapacity += capacity.capacity;
              totalOccupied += occupied;
            }
          }
        }

        const available = totalCapacity - totalOccupied;
        const utilization = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

        return {
          siteId: site.id,
          siteName: site.name,
          siteCode: site.code,
          regionName: site.region.name,
          totalCapacity,
          totalOccupied,
          availableCapacity: Math.max(0, available),
          currentUtilization: Math.round(utilization * 10) / 10,
        };
      });

      siteCapacities.sort((a, b) => b.availableCapacity - a.availableCapacity);

      const recommendations = siteCapacities
        .filter((s) => s.availableCapacity > 0)
        .map((site) => ({
          targetSiteId: site.siteId,
          targetSiteName: site.siteName,
          targetSiteCode: site.siteCode,
          targetRegion: site.regionName,
          availableCapacity: site.availableCapacity,
          recommendedAllocation: 0,
          newUtilization: site.currentUtilization,
          riskStatus: getRiskStatus(site.currentUtilization),
          isEditable: true,
        }));

      return res.status(200).json({
        success: true,
        data: {
          closurePlan: {
            id: closurePlan.id,
            siteName: closurePlan.floor.site.name,
            floorName: closurePlan.floor.name,
            zoneNames: closurePlan.floor.zones.map(z => z.name).join(', '),
            closureDate: closurePlan.closureDate.toISOString().split('T')[0],
            seatsAffected: closurePlan.seatsAffected,
            regionCode: closurePlan.floor.site.region.code,
            regionName: closurePlan.floor.site.region.name,
          },
          occupancyBreakdown,
          recommendations,
          totalAllocated: 0,
          unseatedStaff: closurePlan.seatsAffected,
        },
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
