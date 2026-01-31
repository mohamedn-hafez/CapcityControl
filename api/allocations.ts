import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

function getRiskStatus(utilization: number, isClosed: boolean = false): string {
  if (isClosed) return 'CLOSED';
  if (utilization > 100) return 'OVERFLOW';
  if (utilization >= 95) return 'RISK';
  if (utilization >= 85) return 'WARNING';
  return 'OK';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const closurePlanId = req.query.closurePlanId as string;
      if (!closurePlanId) {
        return res.status(400).json({ success: false, error: 'closurePlanId required' });
      }

      // ClosurePlan is now at floor level
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

      // Get occupancy breakdown from ALL zones in the closing floor
      const occupancyBreakdown: {
        projectCode: string;
        clientCode: string;
        businessUnit: string;
        businessUnitCode: string;
        seats: number;
      }[] = [];

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

      // Group by Business Unit
      type ProjectInfo = { projectCode: string; seats: number };
      type ClientInfo = { client: string; totalSeats: number; projects: ProjectInfo[] };
      type BUInfo = { businessUnit: string; totalSeats: number; clients: ClientInfo[]; projects: { projectCode: string; client: string; seats: number }[] };

      const byBusinessUnit = occupancyBreakdown.reduce((acc, item) => {
        const bu = item.businessUnit;
        const client = item.clientCode;

        if (!acc[bu]) {
          acc[bu] = { businessUnit: bu, totalSeats: 0, clients: [], projects: [] };
        }
        acc[bu].totalSeats += item.seats;

        let clientEntry = acc[bu].clients.find((c) => c.client === client);
        if (!clientEntry) {
          clientEntry = { client, totalSeats: 0, projects: [] };
          acc[bu].clients.push(clientEntry);
        }
        clientEntry.totalSeats += item.seats;
        clientEntry.projects.push({ projectCode: item.projectCode, seats: item.seats });

        acc[bu].projects.push({ projectCode: item.projectCode, client, seats: item.seats });

        return acc;
      }, {} as Record<string, BUInfo>);

      Object.values(byBusinessUnit).forEach((bu) => {
        bu.clients.sort((a, b) => b.totalSeats - a.totalSeats);
        bu.clients.forEach((client) => {
          client.projects.sort((a, b) => b.seats - a.seats);
        });
      });

      // HARD CONSTRAINT: Only get sites in SAME REGION
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

        const floorBreakdown: {
          floorId: string;
          floorName: string;
          zones: {
            zoneId: string;
            zoneName: string;
            capacity: number;
            occupied: number;
            available: number;
          }[];
          totalCapacity: number;
          totalOccupied: number;
          totalAvailable: number;
        }[] = [];

        for (const floor of site.floors) {
          if (floor.closurePlans.length > 0) continue;

          let floorCapacity = 0;
          let floorOccupied = 0;
          const zones: typeof floorBreakdown[0]['zones'] = [];

          for (const zone of floor.zones) {
            const capacity = zone.zoneCapacities[0];
            if (capacity) {
              const occupied = zone.projectAssignments.reduce((sum, pa) => sum + pa.seats, 0);
              const zoneAvailable = Math.max(0, capacity.capacity - occupied);
              totalCapacity += capacity.capacity;
              totalOccupied += occupied;
              floorCapacity += capacity.capacity;
              floorOccupied += occupied;

              if (zoneAvailable > 0) {
                zones.push({
                  zoneId: zone.id,
                  zoneName: zone.name,
                  capacity: capacity.capacity,
                  occupied: occupied,
                  available: zoneAvailable,
                });
              }
            }
          }

          if (zones.length > 0) {
            floorBreakdown.push({
              floorId: floor.id,
              floorName: floor.name,
              zones: zones.sort((a, b) => b.available - a.available),
              totalCapacity: floorCapacity,
              totalOccupied: floorOccupied,
              totalAvailable: floorCapacity - floorOccupied,
            });
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
          openingDate: site.openingDate?.toISOString().split('T')[0],
          totalCapacity,
          totalOccupied,
          availableCapacity: Math.max(0, available),
          currentUtilization: Math.round(utilization * 10) / 10,
          floorBreakdown: floorBreakdown.sort((a, b) => b.totalAvailable - a.totalAvailable),
        };
      });

      siteCapacities.sort((a, b) => b.availableCapacity - a.availableCapacity);

      // Allocation strategy
      const siteRemainingCapacity = new Map<string, number>();
      const siteAllocations = new Map<string, { seats: number; projects: string[]; businessUnits: string[] }>();

      for (const site of siteCapacities) {
        siteRemainingCapacity.set(site.siteId, site.availableCapacity);
        siteAllocations.set(site.siteId, { seats: 0, projects: [], businessUnits: [] });
      }

      const allocatedProjects: string[] = [];
      const unseatedProjects: { projectCode: string; seats: number; businessUnit: string }[] = [];

      const sortedBUs = Object.values(byBusinessUnit).sort((a, b) => b.totalSeats - a.totalSeats);

      for (const bu of sortedBUs) {
        let buAllocated = false;

        for (const site of siteCapacities) {
          const remaining = siteRemainingCapacity.get(site.siteId) || 0;
          if (remaining >= bu.totalSeats) {
            siteRemainingCapacity.set(site.siteId, remaining - bu.totalSeats);
            const alloc = siteAllocations.get(site.siteId)!;
            alloc.seats += bu.totalSeats;
            alloc.businessUnits.push(bu.businessUnit);
            for (const proj of bu.projects) {
              alloc.projects.push(proj.projectCode);
              allocatedProjects.push(proj.projectCode);
            }
            buAllocated = true;
            break;
          }
        }

        if (!buAllocated) {
          const buProjects = [...bu.projects].sort((a, b) => b.seats - a.seats);

          for (const project of buProjects) {
            let projectAllocated = false;

            for (const site of siteCapacities) {
              const remaining = siteRemainingCapacity.get(site.siteId) || 0;
              if (remaining >= project.seats) {
                siteRemainingCapacity.set(site.siteId, remaining - project.seats);
                const alloc = siteAllocations.get(site.siteId)!;
                alloc.seats += project.seats;
                alloc.projects.push(project.projectCode);
                if (!alloc.businessUnits.includes(bu.businessUnit)) {
                  alloc.businessUnits.push(bu.businessUnit);
                }
                allocatedProjects.push(project.projectCode);
                projectAllocated = true;
                break;
              }
            }

            if (!projectAllocated) {
              unseatedProjects.push({
                projectCode: project.projectCode,
                seats: project.seats,
                businessUnit: bu.businessUnit,
              });
            }
          }
        }
      }

      const totalAllocatedSeats = Array.from(siteAllocations.values()).reduce((sum, a) => sum + a.seats, 0);
      const totalUnseatedSeats = unseatedProjects.reduce((sum, p) => sum + p.seats, 0);

      const recommendations = siteCapacities
        .filter((s) => s.availableCapacity > 0)
        .map((site) => {
          const alloc = siteAllocations.get(site.siteId) || { seats: 0, projects: [], businessUnits: [] };
          const newOccupied = site.totalOccupied + alloc.seats;
          const newUtilization = site.totalCapacity > 0 ? (newOccupied / site.totalCapacity) * 100 : 0;

          return {
            targetSiteId: site.siteId,
            targetSiteName: site.siteName,
            targetSiteCode: site.siteCode,
            targetRegion: site.regionName,
            availableCapacity: site.availableCapacity,
            recommendedAllocation: alloc.seats,
            allocatedProjects: alloc.projects,
            allocatedBusinessUnits: alloc.businessUnits,
            newUtilization: Math.round(newUtilization * 10) / 10,
            riskStatus: getRiskStatus(newUtilization),
            isEditable: true,
            floorBreakdown: site.floorBreakdown,
          };
        });

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
          byBusinessUnit: Object.values(byBusinessUnit),
          recommendations,
          allocatedProjects,
          unseatedProjects,
          totalAllocated: totalAllocatedSeats,
          unseatedStaff: totalUnseatedSeats,
        },
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
