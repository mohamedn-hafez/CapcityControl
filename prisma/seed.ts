import { PrismaClient } from "../generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neon, neonConfig } from "@neondatabase/serverless";
import XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envLines = envContent.split("\n");
for (const line of envLines) {
  // Skip comments and empty lines
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith("#")) continue;

  const eqIndex = trimmedLine.indexOf("=");
  if (eqIndex > 0) {
    const key = trimmedLine.substring(0, eqIndex).trim();
    const value = trimmedLine.substring(eqIndex + 1).trim();
    process.env[key] = value;
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL not found in environment");
}

console.log("Connecting to database...");
console.log("Connection string starts with:", connectionString.substring(0, 30) + "...");

// Neon HTTP driver (for serverless environments)
neonConfig.fetchConnectionCache = true;
const sql = neon(connectionString);
const adapter = new PrismaNeon(sql);
const prisma = new PrismaClient({ adapter });

// Geographic regions mapping based on site names
const SITE_REGIONS: Record<string, string> = {
  ABS: "RIYADH",
  "Crystal Plaza": "RIYADH",
  HUR: "RIYADH",
  "New HUR": "RIYADH",
  MP1: "RIYADH",
  MP3: "RIYADH",
  MTZ: "RIYADH",
  Palm: "RIYADH",
  RHQ: "RIYADH",
  RYD: "RIYADH",
  Smart: "RIYADH",
  Dammam: "EASTERN",
  UAE: "UAE",
  Warsaw: "EUROPE",
};

// Month name to number mapping
const MONTH_MAP: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

async function main() {
  console.log("Starting database seed...");

  // Read Excel file
  const excelPath = path.join(process.cwd(), "Data for Site .xlsx");
  const workbook = XLSX.readFile(excelPath);

  // Parse sheets
  const dimSite = XLSX.utils.sheet_to_json(workbook.Sheets["Dim_Site"]) as any[];
  const dimFloor = XLSX.utils.sheet_to_json(workbook.Sheets["Dim_Floor"]) as any[];
  const dimDate = XLSX.utils.sheet_to_json(workbook.Sheets["Dim_Date"]) as any[];
  const dimQueue = XLSX.utils.sheet_to_json(workbook.Sheets["Dim_Queue"]) as any[];
  const dimProject = XLSX.utils.sheet_to_json(workbook.Sheets["Dim_Project"]) as any[];
  const factCapacity = XLSX.utils.sheet_to_json(workbook.Sheets["Fact_Capacity"]) as any[];
  const factClosurePlan = XLSX.utils.sheet_to_json(workbook.Sheets["Fact_ClosurePlan"]) as any[];

  console.log(`Loaded: ${dimSite.length} sites, ${dimFloor.length} floors, ${factCapacity.length} capacity records`);

  // Clear existing data
  console.log("Clearing existing data...");
  await prisma.allocation.deleteMany();
  await prisma.closurePlan.deleteMany();
  await prisma.monthlyCapacity.deleteMany();
  await prisma.project.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.site.deleteMany();
  await prisma.region.deleteMany();
  await prisma.datePeriod.deleteMany();

  // 1. Create Regions
  console.log("Creating regions...");
  const regions = await Promise.all([
    prisma.region.create({
      data: { code: "RIYADH", name: "Riyadh", country: "Saudi Arabia" },
    }),
    prisma.region.create({
      data: { code: "EASTERN", name: "Eastern Province", country: "Saudi Arabia" },
    }),
    prisma.region.create({
      data: { code: "UAE", name: "United Arab Emirates", country: "UAE" },
    }),
    prisma.region.create({
      data: { code: "EUROPE", name: "Europe", country: "Poland" },
    }),
  ]);
  const regionMap = new Map(regions.map((r) => [r.code, r.id]));

  // 2. Create Date Periods
  console.log("Creating date periods...");
  for (const d of dimDate) {
    const monthNum = d["Month"] || MONTH_MAP[d["Month "]];
    const yearMonth = `${d.Year}-${String(monthNum).padStart(2, "0")}`;
    await prisma.datePeriod.create({
      data: {
        yearMonth,
        year: d.Year,
        month: monthNum,
        monthName: d["Month "] || Object.keys(MONTH_MAP)[monthNum - 1],
        quarter: d.Quarter,
      },
    });
  }

  // 3. Create Sites
  console.log("Creating sites...");
  const siteMap = new Map<string, string>();
  for (const s of dimSite) {
    const siteName = s.Site;
    const regionCode = SITE_REGIONS[siteName] || "RIYADH";
    const regionId = regionMap.get(regionCode)!;

    const site = await prisma.site.create({
      data: {
        code: s["Site Code"],
        name: siteName,
        regionId,
        status: "ACTIVE",
      },
    });
    siteMap.set(s["Site Code"], site.id);
  }

  // 4. Create Queues
  console.log("Creating queues...");
  for (const q of dimQueue) {
    await prisma.queue.create({
      data: {
        code: q.Code,
        name: q.Queue,
      },
    });
  }

  // 5. Create Projects
  console.log("Creating projects...");
  for (const p of dimProject) {
    const siteId = siteMap.get(p["Site Code"]);
    if (siteId) {
      await prisma.project.create({
        data: {
          code: p["Project code"],
          projectSiteCode: p["Project Site code"],
          siteId,
        },
      });
    }
  }

  // 6. Create Floors and Zones (from Dim_Floor)
  console.log("Creating floors and zones...");
  const floorMap = new Map<string, string>();
  const zoneMap = new Map<string, string>();

  // Group floors by site and floor name
  const floorGroups = new Map<string, any[]>();
  for (const f of dimFloor) {
    const key = `${f["Site Code"]}_${f.Floor}`;
    if (!floorGroups.has(key)) {
      floorGroups.set(key, []);
    }
    floorGroups.get(key)!.push(f);
  }

  for (const [key, zones] of floorGroups) {
    const firstZone = zones[0];
    const siteId = siteMap.get(firstZone["Site Code"]);
    if (!siteId) continue;

    // Create floor
    const floor = await prisma.floor.create({
      data: {
        code: firstZone["Floor Code"],
        name: String(firstZone.Floor).trim(),
        siteId,
      },
    });
    floorMap.set(firstZone["Site Floor Code"], floor.id);

    // Create zones for this floor
    for (const z of zones) {
      const zone = await prisma.zone.create({
        data: {
          code: z["Zone Code"],
          name: String(z.Zone).trim(),
          siteFloorZoneCode: z["Site Floor Zone Code"],
          floorId: floor.id,
        },
      });
      zoneMap.set(z["Site Floor Zone Code"], zone.id);
    }
  }

  // 7. Create Monthly Capacity records
  console.log("Creating monthly capacity records...");
  let capacityCount = 0;
  for (const c of factCapacity) {
    const zoneCode = c["Site Floor Zone Code"];
    const zoneId = zoneMap.get(zoneCode);
    if (!zoneId) {
      console.log(`Skipping capacity for unknown zone: ${zoneCode}`);
      continue;
    }

    const monthNum = MONTH_MAP[c.Month];
    if (!monthNum || !c.Year) continue;

    const yearMonth = `${Math.floor(c.Year)}-${String(monthNum).padStart(2, "0")}`;
    const capacity = c.Capcity || c.Capacity || 0;
    const occupied = c["Occupied seats"] || 0;

    try {
      await prisma.monthlyCapacity.create({
        data: {
          zoneId,
          year: Math.floor(c.Year),
          month: monthNum,
          yearMonth,
          capacity: Math.floor(capacity),
          occupiedSeats: Math.floor(occupied),
          unallocated: Math.floor(capacity) - Math.floor(occupied),
        },
      });
      capacityCount++;
    } catch (e: any) {
      // Skip duplicates
      if (!e.message.includes("Unique constraint")) {
        console.log(`Error creating capacity for ${zoneCode} ${yearMonth}:`, e.message);
      }
    }
  }
  console.log(`Created ${capacityCount} capacity records`);

  // 8. Create Closure Plans
  console.log("Creating closure plans...");
  for (const cp of factClosurePlan) {
    const zoneCode = cp["Site Floor Zone Code"];
    const zoneId = zoneMap.get(zoneCode);
    if (!zoneId) {
      console.log(`Skipping closure plan for unknown zone: ${zoneCode}`);
      continue;
    }

    const monthNum = MONTH_MAP[cp.Month];
    if (!monthNum || !cp.Year) continue;

    const yearMonth = `${Math.floor(cp.Year)}-${String(monthNum).padStart(2, "0")}`;
    const closureDate = new Date(cp.ClosureDate);

    await prisma.closurePlan.create({
      data: {
        zoneId,
        closureDate,
        yearMonth,
        seatsAffected: cp.SeatsAffected || 0,
        status: "PLANNED",
      },
    });
  }

  console.log("Seed completed successfully!");

  // Print summary
  const summary = await prisma.$transaction([
    prisma.region.count(),
    prisma.site.count(),
    prisma.floor.count(),
    prisma.zone.count(),
    prisma.monthlyCapacity.count(),
    prisma.closurePlan.count(),
  ]);

  console.log("\n=== Database Summary ===");
  console.log(`Regions: ${summary[0]}`);
  console.log(`Sites: ${summary[1]}`);
  console.log(`Floors: ${summary[2]}`);
  console.log(`Zones: ${summary[3]}`);
  console.log(`Monthly Capacity Records: ${summary[4]}`);
  console.log(`Closure Plans: ${summary[5]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
