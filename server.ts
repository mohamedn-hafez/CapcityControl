import express from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env
const envPath = resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

// Use pg Pool with Prisma adapter
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());

// Helper: Calculate occupied seats for a zone in a given month from ProjectAssignment
async function getZoneOccupiedSeats(zoneId: string, yearMonth: string): Promise<number> {
  const result = await prisma.projectAssignment.aggregate({
    where: { zoneId, yearMonth },
    _sum: { seats: true },
  });
  return result._sum.seats || 0;
}

// ============ DASHBOARD ============
app.get('/api/dashboard', async (req, res) => {
  try {
    const yearMonth = req.query.yearMonth as string;
    if (!yearMonth) {
      return res.status(400).json({ success: false, error: 'yearMonth required' });
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

    // Get closures this month (now at floor level)
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

    res.json({
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
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CLOSURES ============
app.get('/api/closures', async (req, res) => {
  try {
    // Closures are now at floor level
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

    res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Closures error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create closure (now at floor level)
app.post('/api/closures', async (req, res) => {
  try {
    const { floorId, closureDate, seatsAffected } = req.body;

    if (!floorId || !closureDate) {
      return res.status(400).json({ success: false, error: 'floorId and closureDate required' });
    }

    // Get floor with zones to calculate seats affected if not provided
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

    // Calculate yearMonth from closureDate
    const date = new Date(closureDate);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Calculate seats affected from all zones in the floor
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

    res.json({ success: true, data: closure });
  } catch (error: any) {
    console.error('Create closure error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete closure
app.delete('/api/closures', async (req, res) => {
  try {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ success: false, error: 'id required' });
    }

    await prisma.closurePlan.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete closure error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ALLOCATIONS ============

// Helper: Get available capacity for a region in a specific month
async function getRegionCapacityForMonth(regionId: string, sourceSiteId: string, yearMonth: string): Promise<number> {
  const sites = await prisma.site.findMany({
    where: {
      status: 'ACTIVE',
      id: { not: sourceSiteId },
      regionId: regionId,
    },
    include: {
      floors: {
        include: {
          zones: {
            include: {
              zoneCapacities: { where: { yearMonth } },
              projectAssignments: { where: { yearMonth } },
            },
          },
          closurePlans: { where: { yearMonth: { lte: yearMonth }, status: 'PLANNED' } },
        },
      },
    },
  });

  let totalAvailable = 0;
  for (const site of sites) {
    for (const floor of site.floors) {
      if (floor.closurePlans.length > 0) continue; // Skip closed floors
      for (const zone of floor.zones) {
        const capacity = zone.zoneCapacities[0];
        if (capacity) {
          const occupied = zone.projectAssignments.reduce((sum, pa) => sum + pa.seats, 0);
          totalAvailable += Math.max(0, capacity.capacity - occupied);
        }
      }
    }
  }
  return totalAvailable;
}

// Helper: Find recommended closure month with stable capacity through December
async function findStableClosureMonth(
  regionId: string,
  sourceSiteId: string,
  seatsNeeded: number,
  startYearMonth: string
): Promise<{
  hasCapacity: boolean;
  suggestedClosureMonth: string | null;
  suggestedMonthName: string | null;
  capacityAvailable: number;
  stableThrough: string | null;
  reason: string;
} | null> {
  const [startYear, startMonth] = startYearMonth.split('-').map(Number);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Check current month capacity first
  const currentCapacity = await getRegionCapacityForMonth(regionId, sourceSiteId, startYearMonth);

  if (currentCapacity >= seatsNeeded) {
    // Check if capacity is stable through December
    let stableThrough = startYearMonth;
    let isStableThroughDecember = true;

    for (let month = startMonth + 1; month <= 12; month++) {
      const yearMonth = `${startYear}-${String(month).padStart(2, '0')}`;
      const monthCapacity = await getRegionCapacityForMonth(regionId, sourceSiteId, yearMonth);

      if (monthCapacity >= seatsNeeded) {
        stableThrough = yearMonth;
      } else {
        isStableThroughDecember = false;
        break;
      }
    }

    return {
      hasCapacity: true,
      suggestedClosureMonth: null,
      suggestedMonthName: null,
      capacityAvailable: currentCapacity,
      stableThrough: isStableThroughDecember ? `${startYear}-12` : stableThrough,
      reason: isStableThroughDecember
        ? 'Capacity available and stable through year-end'
        : `Capacity available but may need reallocation after ${monthNames[parseInt(stableThrough.split('-')[1]) - 1]}`,
    };
  }

  // No capacity in current month - scan future months
  for (let month = startMonth + 1; month <= 12; month++) {
    const yearMonth = `${startYear}-${String(month).padStart(2, '0')}`;
    const monthCapacity = await getRegionCapacityForMonth(regionId, sourceSiteId, yearMonth);

    if (monthCapacity >= seatsNeeded) {
      // Check if capacity remains stable through December
      let stableThrough = yearMonth;
      let isStableThroughDecember = true;

      for (let futureMonth = month + 1; futureMonth <= 12; futureMonth++) {
        const futureYearMonth = `${startYear}-${String(futureMonth).padStart(2, '0')}`;
        const futureCapacity = await getRegionCapacityForMonth(regionId, sourceSiteId, futureYearMonth);

        if (futureCapacity >= seatsNeeded) {
          stableThrough = futureYearMonth;
        } else {
          isStableThroughDecember = false;
          break;
        }
      }

      // Only suggest this month if it's stable through December
      if (isStableThroughDecember) {
        return {
          hasCapacity: false,
          suggestedClosureMonth: yearMonth,
          suggestedMonthName: `${monthNames[month - 1]} ${startYear}`,
          capacityAvailable: monthCapacity,
          stableThrough: `${startYear}-12`,
          reason: `No capacity in ${monthNames[startMonth - 1]}. Recommend closing in ${monthNames[month - 1]} (stable through December)`,
        };
      }
    }
  }

  // No stable month found through year end
  return {
    hasCapacity: false,
    suggestedClosureMonth: null,
    suggestedMonthName: null,
    capacityAvailable: 0,
    stableThrough: null,
    reason: `No month with stable capacity through December found. Consider adding new capacity or phased closure.`,
  };
}

app.get('/api/allocations', async (req, res) => {
  try {
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
                // Get occupancy breakdown for all zones in closing floor
                projectAssignments: {
                  where: { yearMonth: { not: undefined } }, // Will filter by yearMonth below
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

    // Sort by seats descending
    occupancyBreakdown.sort((a, b) => b.seats - a.seats);

    // Group by Business Unit → Client → Project hierarchy
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

      // Find or create client within BU
      let clientEntry = acc[bu].clients.find((c) => c.client === client);
      if (!clientEntry) {
        clientEntry = { client, totalSeats: 0, projects: [] };
        acc[bu].clients.push(clientEntry);
      }
      clientEntry.totalSeats += item.seats;
      clientEntry.projects.push({ projectCode: item.projectCode, seats: item.seats });

      // Also keep flat projects list for backward compatibility
      acc[bu].projects.push({ projectCode: item.projectCode, client, seats: item.seats });

      return acc;
    }, {} as Record<string, BUInfo>);

    // Sort clients within each BU by total seats (descending)
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

      // Collect floor/zone breakdown
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
        // Skip closed floors
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

    // Sort by available capacity (highest first)
    siteCapacities.sort((a, b) => b.availableCapacity - a.availableCapacity);

    // Track remaining capacity per site and allocations
    const siteRemainingCapacity = new Map<string, number>();
    const siteAllocations = new Map<string, { seats: number; projects: string[]; businessUnits: string[] }>();

    for (const site of siteCapacities) {
      siteRemainingCapacity.set(site.siteId, site.availableCapacity);
      siteAllocations.set(site.siteId, { seats: 0, projects: [], businessUnits: [] });
    }

    // ALLOCATION STRATEGY
    const allocatedProjects: string[] = [];
    const unseatedProjects: { projectCode: string; seats: number; businessUnit: string }[] = [];

    // Sort BUs by total seats (largest first)
    const sortedBUs = Object.values(byBusinessUnit).sort((a, b) => b.totalSeats - a.totalSeats);

    for (const bu of sortedBUs) {
      // Try to find a site that can fit the ENTIRE BU
      let buAllocated = false;

      for (const site of siteCapacities) {
        const remaining = siteRemainingCapacity.get(site.siteId) || 0;
        if (remaining >= bu.totalSeats) {
          // Allocate entire BU to this site
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
        // BU doesn't fit anywhere as a whole - allocate projects individually
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

    // Build recommendations
    const totalAllocatedSeats = Array.from(siteAllocations.values()).reduce((sum, a) => sum + a.seats, 0);
    const totalUnseatedSeats = unseatedProjects.reduce((sum, p) => sum + p.seats, 0);

    // Smart Date Recommendation
    let dateRecommendation = null;
    dateRecommendation = await findStableClosureMonth(
      sourceRegionId,
      sourceSiteId,
      closurePlan.seatsAffected,
      closurePlan.yearMonth
    );

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

    res.json({
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
        dateRecommendation,
      },
    });
  } catch (error: any) {
    console.error('Allocations error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ SITES ============
app.get('/api/sites', async (req, res) => {
  try {
    const sites = await prisma.site.findMany({
      include: {
        region: true,
        floors: {
          include: { zones: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: sites });
  } catch (error: any) {
    console.error('Sites error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function getRiskStatus(utilization: number, isClosed: boolean = false): string {
  if (isClosed) return 'CLOSED';
  if (utilization > 100) return 'OVERFLOW';
  if (utilization >= 95) return 'RISK';
  if (utilization >= 85) return 'WARNING';
  return 'OK';
}

// ============ ADMIN API - REGIONS ============
app.get('/api/admin/regions', async (req, res) => {
  try {
    const regions = await prisma.region.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: regions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/regions', async (req, res) => {
  try {
    const { code, name, country } = req.body;
    const region = await prisma.region.create({
      data: { id: `reg_${code}`, code, name, country: country || '' },
    });
    res.json({ success: true, data: region });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/regions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, country } = req.body;
    const region = await prisma.region.update({
      where: { id },
      data: { code, name, country },
    });
    res.json({ success: true, data: region });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/regions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.region.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN API - SITES ============
app.get('/api/admin/sites', async (req, res) => {
  try {
    const sites = await prisma.site.findMany({
      include: { region: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: sites });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/sites', async (req, res) => {
  try {
    const { code, name, regionId, status, openingDate, closingDate } = req.body;
    const site = await prisma.site.create({
      data: {
        id: `site_${code}`,
        code,
        name,
        regionId,
        status: status || 'ACTIVE',
        openingDate: openingDate ? new Date(openingDate) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
      },
    });
    res.json({ success: true, data: site });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/sites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, regionId, status, openingDate, closingDate } = req.body;
    const site = await prisma.site.update({
      where: { id },
      data: {
        code,
        name,
        regionId,
        status,
        openingDate: openingDate ? new Date(openingDate) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
      },
    });
    res.json({ success: true, data: site });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/sites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.site.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN API - FLOORS ============
app.get('/api/admin/floors', async (req, res) => {
  try {
    const floors = await prisma.floor.findMany({
      include: { site: true },
      orderBy: [{ siteId: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: floors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/floors', async (req, res) => {
  try {
    const { code, name, siteId } = req.body;
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) return res.status(404).json({ success: false, error: 'Site not found' });

    const floor = await prisma.floor.create({
      data: {
        id: `floor_${site.code}${code}`,
        code,
        name,
        siteId,
      },
    });
    res.json({ success: true, data: floor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/floors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, siteId } = req.body;
    const floor = await prisma.floor.update({
      where: { id },
      data: { code, name, siteId },
    });
    res.json({ success: true, data: floor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/floors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.floor.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN API - ZONES ============
app.get('/api/admin/zones', async (req, res) => {
  try {
    const zones = await prisma.zone.findMany({
      include: { floor: { include: { site: true } } },
      orderBy: [{ floorId: 'asc' }, { name: 'asc' }],
    });
    res.json({ success: true, data: zones });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/zones', async (req, res) => {
  try {
    const { code, name, siteFloorZoneCode, floorId } = req.body;
    const zone = await prisma.zone.create({
      data: {
        id: `zone_${siteFloorZoneCode}`,
        code,
        name,
        siteFloorZoneCode,
        floorId,
      },
    });
    res.json({ success: true, data: zone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, siteFloorZoneCode, floorId } = req.body;
    const zone = await prisma.zone.update({
      where: { id },
      data: { code, name, siteFloorZoneCode, floorId },
    });
    res.json({ success: true, data: zone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.zone.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN API - CLIENTS (NEW) ============
app.get('/api/admin/clients', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: { projects: true },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, data: clients });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/clients', async (req, res) => {
  try {
    const { code, name } = req.body;
    const client = await prisma.client.create({
      data: {
        id: `client_${code}`,
        code,
        name: name || null,
      },
    });
    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name } = req.body;
    const client = await prisma.client.update({
      where: { id },
      data: { code, name },
    });
    res.json({ success: true, data: client });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN API - PROJECTS (Updated to use Client) ============
app.get('/api/admin/projects', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: { client: true },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/projects', async (req, res) => {
  try {
    const { code, name, clientId } = req.body;
    const project = await prisma.project.create({
      data: {
        id: `proj_${code}`,
        code,
        name: name || null,
        clientId,
      },
    });
    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, clientId } = req.body;
    const project = await prisma.project.update({
      where: { id },
      data: { code, name, clientId },
    });
    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN API - QUEUES (Business Units) ============
app.get('/api/admin/queues', async (req, res) => {
  try {
    const queues = await prisma.queue.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: queues });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/queues', async (req, res) => {
  try {
    const { code, name } = req.body;
    const queue = await prisma.queue.create({
      data: { id: `queue_${code}`, code, name },
    });
    res.json({ success: true, data: queue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/queues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name } = req.body;
    const queue = await prisma.queue.update({
      where: { id },
      data: { code, name },
    });
    res.json({ success: true, data: queue });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/queues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.queue.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN API - ZONE CAPACITY (Fact Table) ============
app.get('/api/admin/zone-capacity', async (req, res) => {
  try {
    const yearMonth = req.query.yearMonth as string;
    const where = yearMonth ? { yearMonth } : {};

    const capacities = await prisma.zoneCapacity.findMany({
      where,
      include: {
        zone: {
          include: {
            floor: { include: { site: true } },
          },
        },
      },
      orderBy: [{ yearMonth: 'asc' }, { zoneId: 'asc' }],
    });
    res.json({ success: true, data: capacities });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/zone-capacity', async (req, res) => {
  try {
    const { zoneId, yearMonth, capacity } = req.body;

    // Upsert - update if exists, create if not
    const zoneCapacity = await prisma.zoneCapacity.upsert({
      where: {
        zoneId_yearMonth: { zoneId, yearMonth },
      },
      update: { capacity },
      create: {
        zoneId,
        yearMonth,
        capacity,
      },
    });
    res.json({ success: true, data: zoneCapacity });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/zone-capacity/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.zoneCapacity.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN API - PROJECT ASSIGNMENT (Fact Table) ============
app.get('/api/admin/project-assignments', async (req, res) => {
  try {
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
    res.json({ success: true, data: assignments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/project-assignments', async (req, res) => {
  try {
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
    res.json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/project-assignments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.projectAssignment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ADMIN API - COPY MONTH DATA ============
app.post('/api/admin/copy-month-data', async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: {
        sourceMonth,
        targetMonth,
        capacitiesCopied,
        assignmentsCopied,
      },
    });
  } catch (error: any) {
    console.error('Copy month data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  GET /api/dashboard?yearMonth=2026-01');
  console.log('  GET /api/closures');
  console.log('  GET /api/allocations?closurePlanId=xxx');
  console.log('  GET /api/sites');
  console.log('  GET /api/admin/clients');
  console.log('  GET /api/admin/zone-capacity');
  console.log('  GET /api/admin/project-assignments');
  console.log('  POST /api/admin/copy-month-data');
});
