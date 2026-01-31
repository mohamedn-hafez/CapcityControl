const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('Data for Site .xlsx');

let sql = `-- ZoneOccupancy Import Script
-- Generated from Excel Fact_Occupancy sheet

-- First, ensure all Queues exist
DELETE FROM "Queue";
`;

// Insert Queues
const queues = XLSX.utils.sheet_to_json(wb.Sheets['Dim_Queue']);
queues.forEach(q => {
  const code = q['Business Unit Code'];
  const name = q['Queue'].replace(/'/g, "''");
  sql += `INSERT INTO "Queue" (id, code, name, "createdAt", "updatedAt") VALUES ('queue_${code}', '${code}', '${name}', NOW(), NOW());\n`;
});

sql += `\n-- Insert Projects (with site mapping)\nDELETE FROM "Project";\n`;

// Insert Projects
const projects = XLSX.utils.sheet_to_json(wb.Sheets['Dim_Project']);
projects.forEach(p => {
  const code = p['Project code'];
  const siteCode = p['Site Code'];
  const projectSiteCode = p['Project Site code'] || '';
  sql += `INSERT INTO "Project" (id, code, name, "projectSiteCode", "siteId", "createdAt", "updatedAt") VALUES ('proj_${code}', '${code}', NULL, '${projectSiteCode}', 'site_${siteCode}', NOW(), NOW());\n`;
});

sql += `\n-- Insert ZoneOccupancy data\nDELETE FROM "ZoneOccupancy";\n`;

// Insert ZoneOccupancy - only rows with valid project and BU
const occupancy = XLSX.utils.sheet_to_json(wb.Sheets['Fact_Occupancy']);
let inserted = 0;
let skipped = 0;

occupancy.forEach((row, idx) => {
  const zoneCode = row['Site Floor Zone Code'];
  const projectCode = row['Project code'];
  const buCode = row['Business Unit Code'];
  const seats = row['Seats'] || 0;
  const month = row['Month'];
  const year = row['Year'];

  // Skip rows without project or BU
  if (!projectCode || !buCode || !zoneCode) {
    skipped++;
    return;
  }

  // Convert month name to number
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
                     Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const monthNum = monthMap[month] || '01';
  const yearMonth = `${year}-${monthNum}`;

  sql += `INSERT INTO "ZoneOccupancy" (id, "zoneId", "projectId", "queueId", "yearMonth", seats, "createdAt", "updatedAt") VALUES ('zocc_${idx}', 'zone_${zoneCode}', 'proj_${projectCode}', 'queue_${buCode}', '${yearMonth}', ${seats}, NOW(), NOW()) ON CONFLICT DO NOTHING;\n`;
  inserted++;
});

console.log(`Generated SQL with ${inserted} ZoneOccupancy rows (${skipped} skipped)`);

fs.writeFileSync('prisma/seed-occupancy.sql', sql);
console.log('Written to prisma/seed-occupancy.sql');
