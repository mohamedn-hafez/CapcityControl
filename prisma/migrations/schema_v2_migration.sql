-- Schema V2 Migration Script
-- Run this AFTER backing up your database!
-- This script migrates from the old schema to the new schema

-- ============================================================
-- STEP 1: Create Client table from unique projectSiteCode values
-- ============================================================

-- Create Client table
CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- Create unique index on Client.code
CREATE UNIQUE INDEX IF NOT EXISTS "Client_code_key" ON "Client"("code");

-- Populate Client table from unique projectSiteCode values in Project
INSERT INTO "Client" ("id", "code", "name", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    "projectSiteCode",
    "projectSiteCode" || ' Client',
    NOW(),
    NOW()
FROM "Project"
WHERE "projectSiteCode" IS NOT NULL
GROUP BY "projectSiteCode"
ON CONFLICT ("code") DO NOTHING;

-- ============================================================
-- STEP 2: Add clientId to Project and migrate data
-- ============================================================

-- Add clientId column to Project (nullable first)
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- Create index on clientId
CREATE INDEX IF NOT EXISTS "Project_clientId_idx" ON "Project"("clientId");

-- Populate clientId from projectSiteCode
UPDATE "Project" p
SET "clientId" = c."id"
FROM "Client" c
WHERE p."projectSiteCode" = c."code";

-- For any projects without projectSiteCode, create a default client
INSERT INTO "Client" ("id", "code", "name", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'DEFAULT',
    'Default Client',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Client" WHERE "code" = 'DEFAULT')
AND EXISTS (SELECT 1 FROM "Project" WHERE "clientId" IS NULL);

-- Update remaining null clientIds
UPDATE "Project"
SET "clientId" = (SELECT "id" FROM "Client" WHERE "code" = 'DEFAULT')
WHERE "clientId" IS NULL;

-- Add foreign key constraint
ALTER TABLE "Project"
ADD CONSTRAINT "Project_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old columns from Project (siteId, projectSiteCode)
-- First drop the foreign key if it exists
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_siteId_fkey";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "siteId";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "projectSiteCode";

-- ============================================================
-- STEP 3: Rename MonthlyCapacity to ZoneCapacity
-- ============================================================

-- Rename table
ALTER TABLE IF EXISTS "MonthlyCapacity" RENAME TO "ZoneCapacity";

-- Rename indexes
ALTER INDEX IF EXISTS "MonthlyCapacity_pkey" RENAME TO "ZoneCapacity_pkey";
ALTER INDEX IF EXISTS "MonthlyCapacity_zoneId_yearMonth_key" RENAME TO "ZoneCapacity_zoneId_yearMonth_key";
ALTER INDEX IF EXISTS "MonthlyCapacity_yearMonth_idx" RENAME TO "ZoneCapacity_yearMonth_idx";
ALTER INDEX IF EXISTS "MonthlyCapacity_zoneId_idx" RENAME TO "ZoneCapacity_zoneId_idx";

-- Rename foreign key constraint
ALTER TABLE "ZoneCapacity" DROP CONSTRAINT IF EXISTS "MonthlyCapacity_zoneId_fkey";
ALTER TABLE "ZoneCapacity"
ADD CONSTRAINT "ZoneCapacity_zoneId_fkey"
FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop computed columns (occupiedSeats, unallocated, year, month)
ALTER TABLE "ZoneCapacity" DROP COLUMN IF EXISTS "occupiedSeats";
ALTER TABLE "ZoneCapacity" DROP COLUMN IF EXISTS "unallocated";
ALTER TABLE "ZoneCapacity" DROP COLUMN IF EXISTS "year";
ALTER TABLE "ZoneCapacity" DROP COLUMN IF EXISTS "month";

-- ============================================================
-- STEP 4: Rename ZoneOccupancy to ProjectAssignment
-- ============================================================

-- Rename table
ALTER TABLE IF EXISTS "ZoneOccupancy" RENAME TO "ProjectAssignment";

-- Rename indexes
ALTER INDEX IF EXISTS "ZoneOccupancy_pkey" RENAME TO "ProjectAssignment_pkey";
ALTER INDEX IF EXISTS "ZoneOccupancy_zoneId_projectId_yearMonth_key" RENAME TO "ProjectAssignment_zoneId_projectId_yearMonth_key";
ALTER INDEX IF EXISTS "ZoneOccupancy_zoneId_idx" RENAME TO "ProjectAssignment_zoneId_idx";
ALTER INDEX IF EXISTS "ZoneOccupancy_projectId_idx" RENAME TO "ProjectAssignment_projectId_idx";
ALTER INDEX IF EXISTS "ZoneOccupancy_queueId_idx" RENAME TO "ProjectAssignment_queueId_idx";
ALTER INDEX IF EXISTS "ZoneOccupancy_yearMonth_idx" RENAME TO "ProjectAssignment_yearMonth_idx";

-- Rename foreign key constraints
ALTER TABLE "ProjectAssignment" DROP CONSTRAINT IF EXISTS "ZoneOccupancy_zoneId_fkey";
ALTER TABLE "ProjectAssignment" DROP CONSTRAINT IF EXISTS "ZoneOccupancy_projectId_fkey";
ALTER TABLE "ProjectAssignment" DROP CONSTRAINT IF EXISTS "ZoneOccupancy_queueId_fkey";

ALTER TABLE "ProjectAssignment"
ADD CONSTRAINT "ProjectAssignment_zoneId_fkey"
FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectAssignment"
ADD CONSTRAINT "ProjectAssignment_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectAssignment"
ADD CONSTRAINT "ProjectAssignment_queueId_fkey"
FOREIGN KEY ("queueId") REFERENCES "Queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- STEP 5: Migrate ClosurePlan from zoneId to floorId
-- ============================================================

-- Add floorId column (nullable first)
ALTER TABLE "ClosurePlan" ADD COLUMN IF NOT EXISTS "floorId" TEXT;

-- Create index on floorId
CREATE INDEX IF NOT EXISTS "ClosurePlan_floorId_idx" ON "ClosurePlan"("floorId");

-- Populate floorId from zone's floor
UPDATE "ClosurePlan" cp
SET "floorId" = z."floorId"
FROM "Zone" z
WHERE cp."zoneId" = z."id";

-- Add foreign key constraint for floorId
ALTER TABLE "ClosurePlan"
ADD CONSTRAINT "ClosurePlan_floorId_fkey"
FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old zoneId column and its constraints
ALTER TABLE "ClosurePlan" DROP CONSTRAINT IF EXISTS "ClosurePlan_zoneId_fkey";
DROP INDEX IF EXISTS "ClosurePlan_zoneId_idx";
ALTER TABLE "ClosurePlan" DROP COLUMN IF EXISTS "zoneId";

-- ============================================================
-- STEP 6: Update Zone relations (remove old relations)
-- ============================================================

-- Drop old relations from Zone if they exist
-- (monthlyCapacities and zoneOccupancies are now zoneCapacities and projectAssignments)
-- These are handled by the table renames above

-- ============================================================
-- STEP 7: Clean up - remove closurePlans relation from Zone
-- ============================================================

-- The closurePlans relation is now on Floor, not Zone
-- No SQL needed - this is handled by the schema change

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify Client table has data
-- SELECT COUNT(*) as client_count FROM "Client";

-- Verify all Projects have clientId
-- SELECT COUNT(*) as projects_without_client FROM "Project" WHERE "clientId" IS NULL;

-- Verify ZoneCapacity table exists and has data
-- SELECT COUNT(*) as capacity_count FROM "ZoneCapacity";

-- Verify ProjectAssignment table exists and has data
-- SELECT COUNT(*) as assignment_count FROM "ProjectAssignment";

-- Verify ClosurePlan has floorId
-- SELECT COUNT(*) as closures_without_floor FROM "ClosurePlan" WHERE "floorId" IS NULL;

COMMIT;
