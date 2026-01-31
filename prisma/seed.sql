-- =====================================================
-- CAPACITY PLANNER DATABASE SEED SCRIPT
-- Run this in Neon SQL Console
-- =====================================================

-- Clear existing data (in correct order due to foreign keys)
DELETE FROM "Allocation";
DELETE FROM "ClosurePlan";
DELETE FROM "MonthlyCapacity";
DELETE FROM "Project";
DELETE FROM "Queue";
DELETE FROM "Zone";
DELETE FROM "Floor";
DELETE FROM "Site";
DELETE FROM "Region";
DELETE FROM "DatePeriod";

-- =====================================================
-- REGIONS
-- =====================================================
INSERT INTO "Region" (id, code, name, country, "createdAt", "updatedAt") VALUES
  ('reg_riyadh', 'RIYADH', 'Riyadh', 'Saudi Arabia', NOW(), NOW()),
  ('reg_eastern', 'EASTERN', 'Eastern Province', 'Saudi Arabia', NOW(), NOW()),
  ('reg_uae', 'UAE', 'United Arab Emirates', 'UAE', NOW(), NOW()),
  ('reg_europe', 'EUROPE', 'Europe', 'Poland', NOW(), NOW());

-- =====================================================
-- DATE PERIODS (2026)
-- =====================================================
INSERT INTO "DatePeriod" (id, "yearMonth", year, month, "monthName", quarter) VALUES
  ('dp_2026_01', '2026-01', 2026, 1, 'Jan', 'Q1'),
  ('dp_2026_02', '2026-02', 2026, 2, 'Feb', 'Q1'),
  ('dp_2026_03', '2026-03', 2026, 3, 'Mar', 'Q1'),
  ('dp_2026_04', '2026-04', 2026, 4, 'Apr', 'Q2'),
  ('dp_2026_05', '2026-05', 2026, 5, 'May', 'Q2'),
  ('dp_2026_06', '2026-06', 2026, 6, 'Jun', 'Q2'),
  ('dp_2026_07', '2026-07', 2026, 7, 'Jul', 'Q3'),
  ('dp_2026_08', '2026-08', 2026, 8, 'Aug', 'Q3'),
  ('dp_2026_09', '2026-09', 2026, 9, 'Sep', 'Q3'),
  ('dp_2026_10', '2026-10', 2026, 10, 'Oct', 'Q4'),
  ('dp_2026_11', '2026-11', 2026, 11, 'Nov', 'Q4'),
  ('dp_2026_12', '2026-12', 2026, 12, 'Dec', 'Q4');

-- =====================================================
-- SITES
-- =====================================================
INSERT INTO "Site" (id, code, name, "regionId", status, "createdAt", "updatedAt") VALUES
  ('site_S1', 'S1', 'ABS', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S2', 'S2', 'Crystal Plaza', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S3', 'S3', 'Dammam', 'reg_eastern', 'ACTIVE', NOW(), NOW()),
  ('site_S4', 'S4', 'HUR', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S5', 'S5', 'MP1', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S6', 'S6', 'MP3', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S7', 'S7', 'MTZ', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S8', 'S8', 'New HUR', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S9', 'S9', 'Palm', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S10', 'S10', 'RHQ', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S11', 'S11', 'RYD', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S12', 'S12', 'Smart', 'reg_riyadh', 'ACTIVE', NOW(), NOW()),
  ('site_S13', 'S13', 'UAE', 'reg_uae', 'ACTIVE', NOW(), NOW()),
  ('site_S14', 'S14', 'Warsaw', 'reg_europe', 'ACTIVE', NOW(), NOW());

-- =====================================================
-- FLOORS
-- =====================================================
INSERT INTO "Floor" (id, code, name, "siteId", "createdAt", "updatedAt") VALUES
  -- ABS (S1)
  ('floor_S1F01', 'F01', '11', 'site_S1', NOW(), NOW()),
  ('floor_S1F02', 'F02', '12', 'site_S1', NOW(), NOW()),
  ('floor_S1F03', 'F03', '18', 'site_S1', NOW(), NOW()),
  ('floor_S1F04', 'F04', '19', 'site_S1', NOW(), NOW()),
  -- Crystal Plaza (S2)
  ('floor_S2F05', 'F05', '3rd', 'site_S2', NOW(), NOW()),
  ('floor_S2F06', 'F06', '4th', 'site_S2', NOW(), NOW()),
  ('floor_S2F11', 'F11', '5th', 'site_S2', NOW(), NOW()),
  ('floor_S2F12', 'F12', '6th', 'site_S2', NOW(), NOW()),
  ('floor_S2F17', 'F17', '7th', 'site_S2', NOW(), NOW()),
  ('floor_S2F18', 'F18', 'Recruitment', 'site_S2', NOW(), NOW()),
  -- Dammam (S3)
  ('floor_S3F19', 'F19', '1st', 'site_S3', NOW(), NOW()),
  -- HUR (S4)
  ('floor_S4F21', 'F21', '1st', 'site_S4', NOW(), NOW()),
  ('floor_S4F22', 'F22', '2nd', 'site_S4', NOW(), NOW()),
  ('floor_S4F23', 'F23', '3rd', 'site_S4', NOW(), NOW()),
  -- MP1 (S5)
  ('floor_S5F24', 'F24', '1st', 'site_S5', NOW(), NOW()),
  ('floor_S5F26', 'F26', '2nd', 'site_S5', NOW(), NOW()),
  ('floor_S5F28', 'F28', 'G', 'site_S5', NOW(), NOW()),
  -- MP3 (S6)
  ('floor_S6F29', 'F29', '1st', 'site_S6', NOW(), NOW()),
  ('floor_S6F31', 'F31', '4th', 'site_S6', NOW(), NOW()),
  ('floor_S6F33', 'F33', 'G', 'site_S6', NOW(), NOW()),
  -- MTZ (S7)
  ('floor_S7F35', 'F35', '1st', 'site_S7', NOW(), NOW()),
  ('floor_S7F37', 'F37', '2nd', 'site_S7', NOW(), NOW()),
  ('floor_S7F40', 'F40', '3rd', 'site_S7', NOW(), NOW()),
  -- New HUR (S8)
  ('floor_S8F43', 'F43', '1st', 'site_S8', NOW(), NOW()),
  ('floor_S8F44', 'F44', '2nd', 'site_S8', NOW(), NOW()),
  ('floor_S8F45', 'F45', '3rd', 'site_S8', NOW(), NOW()),
  ('floor_S8F46', 'F46', '4th', 'site_S8', NOW(), NOW()),
  -- Palm (S9)
  ('floor_S9F47', 'F47', '2nd', 'site_S9', NOW(), NOW()),
  -- RHQ (S10)
  ('floor_S10F51', 'F51', '1st', 'site_S10', NOW(), NOW()),
  ('floor_S10F52', 'F52', '2nd', 'site_S10', NOW(), NOW()),
  ('floor_S10F53', 'F53', '3rd', 'site_S10', NOW(), NOW()),
  ('floor_S10F54', 'F54', '4th', 'site_S10', NOW(), NOW()),
  ('floor_S10F55', 'F55', '5th', 'site_S10', NOW(), NOW()),
  ('floor_S10F56', 'F56', 'Basement', 'site_S10', NOW(), NOW()),
  ('floor_S10F57', 'F57', 'G', 'site_S10', NOW(), NOW()),
  -- RYD (S11)
  ('floor_S11F58', 'F58', '1st', 'site_S11', NOW(), NOW()),
  -- Smart (S12)
  ('floor_S12F59', 'F59', 'All', 'site_S12', NOW(), NOW()),
  -- UAE (S13)
  ('floor_S13F60', 'F60', '1st', 'site_S13', NOW(), NOW()),
  -- Warsaw (S14)
  ('floor_S14F61', 'F61', '1st', 'site_S14', NOW(), NOW());

-- =====================================================
-- ZONES
-- =====================================================
INSERT INTO "Zone" (id, code, name, "siteFloorZoneCode", "floorId", "createdAt", "updatedAt") VALUES
  -- ABS
  ('zone_S1F01Z01', 'Z01', 'A', 'S1F01Z01', 'floor_S1F01', NOW(), NOW()),
  ('zone_S1F02Z02', 'Z02', 'A', 'S1F02Z02', 'floor_S1F02', NOW(), NOW()),
  ('zone_S1F03Z03', 'Z03', 'A', 'S1F03Z03', 'floor_S1F03', NOW(), NOW()),
  ('zone_S1F04Z04', 'Z04', 'A', 'S1F04Z04', 'floor_S1F04', NOW(), NOW()),
  -- Crystal Plaza 4th floor zones
  ('zone_S2F06Z06', 'Z06', '1', 'S2F06Z06', 'floor_S2F06', NOW(), NOW()),
  ('zone_S2F06Z07', 'Z07', '2', 'S2F06Z07', 'floor_S2F06', NOW(), NOW()),
  ('zone_S2F06Z08', 'Z08', '3', 'S2F06Z08', 'floor_S2F06', NOW(), NOW()),
  ('zone_S2F06Z09', 'Z09', '4', 'S2F06Z09', 'floor_S2F06', NOW(), NOW()),
  ('zone_S2F06Z10', 'Z10', '5', 'S2F06Z10', 'floor_S2F06', NOW(), NOW()),
  -- Crystal Plaza 6th floor zones
  ('zone_S2F12Z12', 'Z12', '1', 'S2F12Z12', 'floor_S2F12', NOW(), NOW()),
  ('zone_S2F12Z13', 'Z13', '2', 'S2F12Z13', 'floor_S2F12', NOW(), NOW()),
  ('zone_S2F12Z14', 'Z14', '3', 'S2F12Z14', 'floor_S2F12', NOW(), NOW()),
  ('zone_S2F12Z15', 'Z15', '4', 'S2F12Z15', 'floor_S2F12', NOW(), NOW()),
  ('zone_S2F12Z16', 'Z16', '5', 'S2F12Z16', 'floor_S2F12', NOW(), NOW()),
  -- Dammam
  ('zone_S3F19Z19', 'Z19', 'A', 'S3F19Z19', 'floor_S3F19', NOW(), NOW()),
  ('zone_S3F19Z20', 'Z20', 'B', 'S3F19Z20', 'floor_S3F19', NOW(), NOW()),
  -- HUR
  ('zone_S4F21Z21', 'Z21', 'A', 'S4F21Z21', 'floor_S4F21', NOW(), NOW()),
  ('zone_S4F22Z22', 'Z22', 'A', 'S4F22Z22', 'floor_S4F22', NOW(), NOW()),
  ('zone_S4F23Z23', 'Z23', 'A', 'S4F23Z23', 'floor_S4F23', NOW(), NOW()),
  -- MP1
  ('zone_S5F24Z24', 'Z24', 'A', 'S5F24Z24', 'floor_S5F24', NOW(), NOW()),
  ('zone_S5F24Z25', 'Z25', 'B', 'S5F24Z25', 'floor_S5F24', NOW(), NOW()),
  ('zone_S5F26Z26', 'Z26', 'A', 'S5F26Z26', 'floor_S5F26', NOW(), NOW()),
  ('zone_S5F26Z27', 'Z27', 'B', 'S5F26Z27', 'floor_S5F26', NOW(), NOW()),
  ('zone_S5F28Z28', 'Z28', 'A', 'S5F28Z28', 'floor_S5F28', NOW(), NOW()),
  -- MP3
  ('zone_S6F29Z29', 'Z29', 'A', 'S6F29Z29', 'floor_S6F29', NOW(), NOW()),
  ('zone_S6F29Z30', 'Z30', 'B', 'S6F29Z30', 'floor_S6F29', NOW(), NOW()),
  ('zone_S6F31Z31', 'Z31', 'A', 'S6F31Z31', 'floor_S6F31', NOW(), NOW()),
  ('zone_S6F31Z32', 'Z32', 'B', 'S6F31Z32', 'floor_S6F31', NOW(), NOW()),
  ('zone_S6F33Z33', 'Z33', 'A', 'S6F33Z33', 'floor_S6F33', NOW(), NOW()),
  ('zone_S6F33Z34', 'Z34', 'B', 'S6F33Z34', 'floor_S6F33', NOW(), NOW()),
  -- MTZ
  ('zone_S7F35Z35', 'Z35', 'B', 'S7F35Z35', 'floor_S7F35', NOW(), NOW()),
  ('zone_S7F35Z36', 'Z36', 'C', 'S7F35Z36', 'floor_S7F35', NOW(), NOW()),
  ('zone_S7F37Z37', 'Z37', 'A', 'S7F37Z37', 'floor_S7F37', NOW(), NOW()),
  ('zone_S7F37Z38', 'Z38', 'B', 'S7F37Z38', 'floor_S7F37', NOW(), NOW()),
  ('zone_S7F37Z39', 'Z39', 'C', 'S7F37Z39', 'floor_S7F37', NOW(), NOW()),
  ('zone_S7F40Z40', 'Z40', 'A', 'S7F40Z40', 'floor_S7F40', NOW(), NOW()),
  ('zone_S7F40Z41', 'Z41', 'B', 'S7F40Z41', 'floor_S7F40', NOW(), NOW()),
  ('zone_S7F40Z42', 'Z42', 'C', 'S7F40Z42', 'floor_S7F40', NOW(), NOW()),
  -- New HUR
  ('zone_S8F43Z43', 'Z43', 'A', 'S8F43Z43', 'floor_S8F43', NOW(), NOW()),
  ('zone_S8F44Z44', 'Z44', 'A', 'S8F44Z44', 'floor_S8F44', NOW(), NOW()),
  ('zone_S8F45Z45', 'Z45', 'A', 'S8F45Z45', 'floor_S8F45', NOW(), NOW()),
  ('zone_S8F46Z46', 'Z46', 'A', 'S8F46Z46', 'floor_S8F46', NOW(), NOW()),
  -- Palm
  ('zone_S9F47Z47', 'Z47', 'A', 'S9F47Z47', 'floor_S9F47', NOW(), NOW()),
  ('zone_S9F47Z48', 'Z48', 'B1', 'S9F47Z48', 'floor_S9F47', NOW(), NOW()),
  ('zone_S9F47Z49', 'Z49', 'B2', 'S9F47Z49', 'floor_S9F47', NOW(), NOW()),
  ('zone_S9F47Z50', 'Z50', 'C', 'S9F47Z50', 'floor_S9F47', NOW(), NOW()),
  -- RHQ
  ('zone_S10F51Z51', 'Z51', 'A', 'S10F51Z51', 'floor_S10F51', NOW(), NOW()),
  ('zone_S10F52Z52', 'Z52', 'A', 'S10F52Z52', 'floor_S10F52', NOW(), NOW()),
  ('zone_S10F53Z53', 'Z53', 'A', 'S10F53Z53', 'floor_S10F53', NOW(), NOW()),
  ('zone_S10F54Z54', 'Z54', 'A', 'S10F54Z54', 'floor_S10F54', NOW(), NOW()),
  ('zone_S10F55Z55', 'Z55', 'A', 'S10F55Z55', 'floor_S10F55', NOW(), NOW()),
  ('zone_S10F56Z56', 'Z56', 'A', 'S10F56Z56', 'floor_S10F56', NOW(), NOW()),
  ('zone_S10F57Z57', 'Z57', 'A', 'S10F57Z57', 'floor_S10F57', NOW(), NOW()),
  -- RYD
  ('zone_S11F58Z58', 'Z58', 'A', 'S11F58Z58', 'floor_S11F58', NOW(), NOW()),
  -- Smart
  ('zone_S12F59Z59', 'Z59', 'A', 'S12F59Z59', 'floor_S12F59', NOW(), NOW()),
  -- UAE
  ('zone_S13F60Z60', 'Z60', 'A', 'S13F60Z60', 'floor_S13F60', NOW(), NOW()),
  -- Warsaw
  ('zone_S14F61Z61', 'Z61', 'A', 'S14F61Z61', 'floor_S14F61', NOW(), NOW());

-- =====================================================
-- QUEUES (Business Units)
-- =====================================================
INSERT INTO "Queue" (id, code, name, "createdAt", "updatedAt") VALUES
  ('queue_BU1', 'BU1', 'Gulf', NOW(), NOW()),
  ('queue_BU2', 'BU2', 'Hosting', NOW(), NOW()),
  ('queue_BU3', 'BU3', 'Hosting - HRO', NOW(), NOW()),
  ('queue_BU4', 'BU4', 'Hosting/New', NOW(), NOW()),
  ('queue_BU5', 'BU5', 'OffShore', NOW(), NOW()),
  ('queue_BU6', 'BU6', 'OffShore - SF', NOW(), NOW()),
  ('queue_BU7', 'BU7', 'Offshore/new', NOW(), NOW()),
  ('queue_BU8', 'BU8', 'OnShore', NOW(), NOW()),
  ('queue_BU9', 'BU9', 'OnShore - SF', NOW(), NOW()),
  ('queue_BU10', 'BU10', 'Onshore/New', NOW(), NOW()),
  ('queue_BU11', 'BU11', 'RCX-SF', NOW(), NOW());

-- =====================================================
-- CLOSURE PLANS (from Excel Fact_ClosurePlan)
-- =====================================================
INSERT INTO "ClosurePlan" (id, "zoneId", "closureDate", "yearMonth", "seatsAffected", status, "createdAt", "updatedAt") VALUES
  -- ABS Closure - April 2026
  ('cp_S1F02Z02', 'zone_S1F02Z02', '2026-04-01', '2026-04', 95, 'PLANNED', NOW(), NOW()),
  ('cp_S1F03Z03', 'zone_S1F03Z03', '2026-04-01', '2026-04', 155, 'PLANNED', NOW(), NOW()),
  ('cp_S1F04Z04', 'zone_S1F04Z04', '2026-04-01', '2026-04', 203, 'PLANNED', NOW(), NOW()),
  -- MP1 Closure - June 2026
  ('cp_S5F24Z24', 'zone_S5F24Z24', '2026-06-30', '2026-06', 113, 'PLANNED', NOW(), NOW()),
  ('cp_S5F24Z25', 'zone_S5F24Z25', '2026-06-30', '2026-06', 117, 'PLANNED', NOW(), NOW()),
  ('cp_S5F26Z26', 'zone_S5F26Z26', '2026-06-30', '2026-06', 136, 'PLANNED', NOW(), NOW()),
  ('cp_S5F26Z27', 'zone_S5F26Z27', '2026-06-30', '2026-06', 117, 'PLANNED', NOW(), NOW());

-- =====================================================
-- MONTHLY CAPACITY - Sample data for January 2026
-- (Add more months as needed)
-- =====================================================
INSERT INTO "MonthlyCapacity" (id, "zoneId", year, month, "yearMonth", capacity, "occupiedSeats", unallocated, "createdAt", "updatedAt") VALUES
  -- ABS - January
  ('mc_S1F02Z02_2026-01', 'zone_S1F02Z02', 2026, 1, '2026-01', 95, 0, 95, NOW(), NOW()),
  ('mc_S1F03Z03_2026-01', 'zone_S1F03Z03', 2026, 1, '2026-01', 169, 155, 14, NOW(), NOW()),
  ('mc_S1F04Z04_2026-01', 'zone_S1F04Z04', 2026, 1, '2026-01', 255, 203, 52, NOW(), NOW()),
  -- Crystal Plaza 4th floor - January
  ('mc_S2F06Z06_2026-01', 'zone_S2F06Z06', 2026, 1, '2026-01', 140, 35, 105, NOW(), NOW()),
  ('mc_S2F06Z07_2026-01', 'zone_S2F06Z07', 2026, 1, '2026-01', 309, 209, 100, NOW(), NOW()),
  ('mc_S2F06Z08_2026-01', 'zone_S2F06Z08', 2026, 1, '2026-01', 240, 193, 47, NOW(), NOW()),
  ('mc_S2F06Z09_2026-01', 'zone_S2F06Z09', 2026, 1, '2026-01', 78, 66, 12, NOW(), NOW()),
  ('mc_S2F06Z10_2026-01', 'zone_S2F06Z10', 2026, 1, '2026-01', 36, 36, 0, NOW(), NOW()),
  -- Crystal Plaza 6th floor - January
  ('mc_S2F12Z12_2026-01', 'zone_S2F12Z12', 2026, 1, '2026-01', 147, 0, 147, NOW(), NOW()),
  ('mc_S2F12Z13_2026-01', 'zone_S2F12Z13', 2026, 1, '2026-01', 86, 50, 36, NOW(), NOW()),
  ('mc_S2F12Z14_2026-01', 'zone_S2F12Z14', 2026, 1, '2026-01', 268, 240, 28, NOW(), NOW()),
  ('mc_S2F12Z15_2026-01', 'zone_S2F12Z15', 2026, 1, '2026-01', 190, 170, 20, NOW(), NOW()),
  ('mc_S2F12Z16_2026-01', 'zone_S2F12Z16', 2026, 1, '2026-01', 45, 41, 4, NOW(), NOW()),
  -- Dammam - January
  ('mc_S3F19Z19_2026-01', 'zone_S3F19Z19', 2026, 1, '2026-01', 166, 159, 7, NOW(), NOW()),
  ('mc_S3F19Z20_2026-01', 'zone_S3F19Z20', 2026, 1, '2026-01', 92, 92, 0, NOW(), NOW()),
  -- HUR - January
  ('mc_S4F21Z21_2026-01', 'zone_S4F21Z21', 2026, 1, '2026-01', 212, 162, 50, NOW(), NOW()),
  ('mc_S4F22Z22_2026-01', 'zone_S4F22Z22', 2026, 1, '2026-01', 156, 156, 0, NOW(), NOW()),
  ('mc_S4F23Z23_2026-01', 'zone_S4F23Z23', 2026, 1, '2026-01', 132, 132, 0, NOW(), NOW()),
  -- MP1 - January
  ('mc_S5F24Z24_2026-01', 'zone_S5F24Z24', 2026, 1, '2026-01', 113, 113, 0, NOW(), NOW()),
  ('mc_S5F24Z25_2026-01', 'zone_S5F24Z25', 2026, 1, '2026-01', 117, 117, 0, NOW(), NOW()),
  ('mc_S5F26Z26_2026-01', 'zone_S5F26Z26', 2026, 1, '2026-01', 136, 0, 136, NOW(), NOW()),
  ('mc_S5F26Z27_2026-01', 'zone_S5F26Z27', 2026, 1, '2026-01', 117, 117, 0, NOW(), NOW()),
  ('mc_S5F28Z28_2026-01', 'zone_S5F28Z28', 2026, 1, '2026-01', 129, 84, 45, NOW(), NOW()),
  -- MP3 - January
  ('mc_S6F29Z29_2026-01', 'zone_S6F29Z29', 2026, 1, '2026-01', 113, 113, 0, NOW(), NOW()),
  ('mc_S6F31Z31_2026-01', 'zone_S6F31Z31', 2026, 1, '2026-01', 110, 110, 0, NOW(), NOW()),
  ('mc_S6F31Z32_2026-01', 'zone_S6F31Z32', 2026, 1, '2026-01', 110, 110, 0, NOW(), NOW()),
  ('mc_S6F33Z33_2026-01', 'zone_S6F33Z33', 2026, 1, '2026-01', 98, 0, 98, NOW(), NOW()),
  ('mc_S6F33Z34_2026-01', 'zone_S6F33Z34', 2026, 1, '2026-01', 100, 0, 100, NOW(), NOW()),
  -- MTZ - January
  ('mc_S7F35Z35_2026-01', 'zone_S7F35Z35', 2026, 1, '2026-01', 84, 84, 0, NOW(), NOW()),
  ('mc_S7F35Z36_2026-01', 'zone_S7F35Z36', 2026, 1, '2026-01', 63, 0, 63, NOW(), NOW()),
  ('mc_S7F37Z37_2026-01', 'zone_S7F37Z37', 2026, 1, '2026-01', 85, 82, 3, NOW(), NOW()),
  ('mc_S7F37Z38_2026-01', 'zone_S7F37Z38', 2026, 1, '2026-01', 95, 95, 0, NOW(), NOW()),
  ('mc_S7F37Z39_2026-01', 'zone_S7F37Z39', 2026, 1, '2026-01', 66, 65, 1, NOW(), NOW()),
  ('mc_S7F40Z40_2026-01', 'zone_S7F40Z40', 2026, 1, '2026-01', 95, 95, 0, NOW(), NOW()),
  ('mc_S7F40Z41_2026-01', 'zone_S7F40Z41', 2026, 1, '2026-01', 115, 73, 42, NOW(), NOW()),
  ('mc_S7F40Z42_2026-01', 'zone_S7F40Z42', 2026, 1, '2026-01', 65, 53, 12, NOW(), NOW()),
  -- New HUR - January
  ('mc_S8F43Z43_2026-01', 'zone_S8F43Z43', 2026, 1, '2026-01', 100, 0, 100, NOW(), NOW()),
  ('mc_S8F44Z44_2026-01', 'zone_S8F44Z44', 2026, 1, '2026-01', 100, 0, 100, NOW(), NOW()),
  ('mc_S8F45Z45_2026-01', 'zone_S8F45Z45', 2026, 1, '2026-01', 100, 95, 5, NOW(), NOW()),
  ('mc_S8F46Z46_2026-01', 'zone_S8F46Z46', 2026, 1, '2026-01', 46, 40, 6, NOW(), NOW()),
  -- Palm - January
  ('mc_S9F47Z47_2026-01', 'zone_S9F47Z47', 2026, 1, '2026-01', 162, 162, 0, NOW(), NOW()),
  ('mc_S9F47Z48_2026-01', 'zone_S9F47Z48', 2026, 1, '2026-01', 52, 52, 0, NOW(), NOW()),
  ('mc_S9F47Z49_2026-01', 'zone_S9F47Z49', 2026, 1, '2026-01', 138, 138, 0, NOW(), NOW()),
  ('mc_S9F47Z50_2026-01', 'zone_S9F47Z50', 2026, 1, '2026-01', 71, 0, 71, NOW(), NOW()),
  -- RHQ - January
  ('mc_S10F51Z51_2026-01', 'zone_S10F51Z51', 2026, 1, '2026-01', 303, 303, 0, NOW(), NOW()),
  ('mc_S10F52Z52_2026-01', 'zone_S10F52Z52', 2026, 1, '2026-01', 331, 331, 0, NOW(), NOW()),
  ('mc_S10F53Z53_2026-01', 'zone_S10F53Z53', 2026, 1, '2026-01', 463, 463, 0, NOW(), NOW()),
  ('mc_S10F54Z54_2026-01', 'zone_S10F54Z54', 2026, 1, '2026-01', 482, 482, 0, NOW(), NOW()),
  ('mc_S10F55Z55_2026-01', 'zone_S10F55Z55', 2026, 1, '2026-01', 452, 452, 0, NOW(), NOW()),
  ('mc_S10F56Z56_2026-01', 'zone_S10F56Z56', 2026, 1, '2026-01', 29, 2, 27, NOW(), NOW()),
  ('mc_S10F57Z57_2026-01', 'zone_S10F57Z57', 2026, 1, '2026-01', 42, 42, 0, NOW(), NOW()),
  -- RYD - January
  ('mc_S11F58Z58_2026-01', 'zone_S11F58Z58', 2026, 1, '2026-01', 132, 128, 4, NOW(), NOW()),
  -- Smart - January
  ('mc_S12F59Z59_2026-01', 'zone_S12F59Z59', 2026, 1, '2026-01', 1502, 1502, 0, NOW(), NOW()),
  -- UAE - January
  ('mc_S13F60Z60_2026-01', 'zone_S13F60Z60', 2026, 1, '2026-01', 86, 63, 23, NOW(), NOW()),
  -- Warsaw - January
  ('mc_S14F61Z61_2026-01', 'zone_S14F61Z61', 2026, 1, '2026-01', 70, 0, 70, NOW(), NOW());

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the data was inserted correctly:

-- SELECT COUNT(*) as regions FROM "Region";
-- SELECT COUNT(*) as sites FROM "Site";
-- SELECT COUNT(*) as floors FROM "Floor";
-- SELECT COUNT(*) as zones FROM "Zone";
-- SELECT COUNT(*) as capacity_records FROM "MonthlyCapacity";
-- SELECT COUNT(*) as closure_plans FROM "ClosurePlan";

-- View sites by region:
-- SELECT r.name as region, s.name as site, s.status
-- FROM "Site" s JOIN "Region" r ON s."regionId" = r.id
-- ORDER BY r.name, s.name;

-- View closure summary:
-- SELECT s.name as site, f.name as floor, z.name as zone,
--        cp."closureDate", cp."seatsAffected"
-- FROM "ClosurePlan" cp
-- JOIN "Zone" z ON cp."zoneId" = z.id
-- JOIN "Floor" f ON z."floorId" = f.id
-- JOIN "Site" s ON f."siteId" = s.id
-- ORDER BY cp."closureDate";
