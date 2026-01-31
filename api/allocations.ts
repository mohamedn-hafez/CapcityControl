import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    // GET - Get allocation recommendations for a closure plan
    if (req.method === 'GET') {
      const { closurePlanId } = req.query;

      if (!closurePlanId || typeof closurePlanId !== 'string') {
        return res.status(400).json({ success: false, error: 'closurePlanId required' });
      }

      // Get the closure plan details
      const closurePlan = await prisma.closurePlan.findUnique({
        where: { id: closurePlanId },
        include: {
          zone: {
            include: {
              floor: {
                include: {
                  site: {
                    include: { region: true },
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

      const sourceRegionId = closurePlan.zone.floor.site.regionId;
      const sourceSiteId = closurePlan.zone.floor.site.id;

      // Get all active sites with their available capacity
      const sites = await prisma.site.findMany({
        where: {
          status: 'ACTIVE',
          id: { not: sourceSiteId }, // Exclude the closing site
        },
        include: {
          region: true,
          floors: {
            include: {
              zones: {
                include: {
                  monthlyCapacities: {
                    where: { yearMonth: closurePlan.yearMonth },
                  },
                  closurePlans: {
                    where: {
                      yearMonth: { lte: closurePlan.yearMonth },
                      status: 'PLANNED',
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { openingDate: 'desc' }, // Newest sites first
          { name: 'asc' },
        ],
      });

      // Calculate available capacity per site
      const siteCapacities = sites.map((site) => {
        let totalCapacity = 0;
        let totalOccupied = 0;

        for (const floor of site.floors) {
          for (const zone of floor.zones) {
            // Skip zones that are closing
            if (zone.closurePlans.length > 0) continue;

            const capacity = zone.monthlyCapacities[0];
            if (capacity) {
              totalCapacity += capacity.capacity;
              totalOccupied += capacity.occupiedSeats;
            }
          }
        }

        const available = totalCapacity - totalOccupied;
        const utilization = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

        return {
          siteId: site.id,
          siteName: site.name,
          siteCode: site.code,
          regionId: site.regionId,
          regionCode: site.region.code,
          regionName: site.region.name,
          isSameRegion: site.regionId === sourceRegionId,
          openingDate: site.openingDate?.toISOString().split('T')[0],
          totalCapacity,
          totalOccupied,
          availableCapacity: Math.max(0, available),
          currentUtilization: Math.round(utilization * 10) / 10,
        };
      });

      // Sort: same region first, then by opening date (newest first), then by available capacity
      siteCapacities.sort((a, b) => {
        // Same region first
        if (a.isSameRegion && !b.isSameRegion) return -1;
        if (!a.isSameRegion && b.isSameRegion) return 1;

        // Then by opening date (newest first)
        if (a.openingDate && b.openingDate) {
          return b.openingDate.localeCompare(a.openingDate);
        }
        if (a.openingDate) return -1;
        if (b.openingDate) return 1;

        // Then by available capacity
        return b.availableCapacity - a.availableCapacity;
      });

      // Auto-allocate displaced staff
      let remainingToAllocate = closurePlan.seatsAffected;
      const recommendations = siteCapacities
        .filter((s) => s.availableCapacity > 0)
        .map((site) => {
          const toAllocate = Math.min(remainingToAllocate, site.availableCapacity);
          remainingToAllocate -= toAllocate;

          const newOccupied = site.totalOccupied + toAllocate;
          const newUtilization = site.totalCapacity > 0
            ? (newOccupied / site.totalCapacity) * 100
            : 0;

          return {
            targetSiteId: site.siteId,
            targetSiteName: site.siteName,
            targetSiteCode: site.siteCode,
            targetRegion: site.regionName,
            isSameRegion: site.isSameRegion,
            availableCapacity: site.availableCapacity,
            recommendedAllocation: toAllocate,
            newUtilization: Math.round(newUtilization * 10) / 10,
            riskStatus: getRiskStatus(newUtilization),
            isEditable: true,
          };
        });

      return res.status(200).json({
        success: true,
        data: {
          closurePlan: {
            id: closurePlan.id,
            siteName: closurePlan.zone.floor.site.name,
            floorName: closurePlan.zone.floor.name,
            zoneName: closurePlan.zone.name,
            closureDate: closurePlan.closureDate.toISOString().split('T')[0],
            seatsAffected: closurePlan.seatsAffected,
            regionCode: closurePlan.zone.floor.site.region.code,
          },
          recommendations,
          totalAllocated: closurePlan.seatsAffected - remainingToAllocate,
          unseatedStaff: remainingToAllocate,
        },
      });
    }

    // POST - Save allocations
    if (req.method === 'POST') {
      const { closurePlanId, allocations } = req.body;

      if (!closurePlanId || !allocations) {
        return res.status(400).json({ success: false, error: 'closurePlanId and allocations required' });
      }

      // Get the closure plan
      const closurePlan = await prisma.closurePlan.findUnique({
        where: { id: closurePlanId },
      });

      if (!closurePlan) {
        return res.status(404).json({ success: false, error: 'Closure plan not found' });
      }

      // Delete existing allocations
      await prisma.allocation.deleteMany({
        where: { closurePlanId },
      });

      // Create new allocations
      const createdAllocations = [];
      for (const alloc of allocations) {
        if (alloc.allocatedSeats > 0) {
          // Find a zone in the target site to allocate to
          const targetSite = await prisma.site.findUnique({
            where: { id: alloc.targetSiteId },
            include: {
              floors: {
                include: {
                  zones: {
                    take: 1, // Just get first zone for simplicity
                  },
                },
              },
            },
          });

          if (targetSite && targetSite.floors[0]?.zones[0]) {
            const targetZoneId = targetSite.floors[0].zones[0].id;

            const created = await prisma.allocation.create({
              data: {
                closurePlanId,
                sourceZoneId: closurePlan.zoneId,
                targetZoneId,
                allocatedSeats: alloc.allocatedSeats,
                allocationDate: closurePlan.closureDate,
                isManual: alloc.isManual ?? false,
              },
            });
            createdAllocations.push(created);
          }
        }
      }

      return res.status(201).json({ success: true, data: createdAllocations });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

function getRiskStatus(utilization: number): string {
  if (utilization > 100) return 'OVERFLOW';
  if (utilization >= 95) return 'RISK';
  if (utilization >= 85) return 'WARNING';
  return 'OK';
}
