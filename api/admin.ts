import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

neonConfig.useSecureWebSocket = true;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = req.query.resource as string;

  if (!resource) {
    return res.status(400).json({ success: false, error: 'resource query param required' });
  }

  try {
    switch (resource) {
      case 'regions':
        return handleRegions(req, res);
      case 'sites':
        return handleSites(req, res);
      case 'floors':
        return handleFloors(req, res);
      case 'zones':
        return handleZones(req, res);
      case 'clients':
        return handleClients(req, res);
      case 'projects':
        return handleProjects(req, res);
      case 'queues':
        return handleQueues(req, res);
      case 'zone-capacity':
        return handleZoneCapacity(req, res);
      case 'project-assignments':
        return handleProjectAssignments(req, res);
      case 'copy-month-data':
        return handleCopyMonthData(req, res);
      default:
        return res.status(400).json({ success: false, error: `Unknown resource: ${resource}` });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function handleRegions(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const regions = await prisma.region.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json({ success: true, data: regions });
  }
  if (req.method === 'POST') {
    const { code, name, country } = req.body;
    const region = await prisma.region.create({
      data: { id: `reg_${code}`, code, name, country: country || '' },
    });
    return res.status(201).json({ success: true, data: region });
  }
  if (req.method === 'PUT') {
    const { id, code, name, country } = req.body;
    const region = await prisma.region.update({ where: { id }, data: { code, name, country } });
    return res.status(200).json({ success: true, data: region });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    await prisma.region.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleSites(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const sites = await prisma.site.findMany({ include: { region: true }, orderBy: { name: 'asc' } });
    return res.status(200).json({ success: true, data: sites });
  }
  if (req.method === 'POST') {
    const { code, name, regionId, status, openingDate, closingDate } = req.body;
    const site = await prisma.site.create({
      data: {
        id: `site_${code}`, code, name, regionId,
        status: status || 'ACTIVE',
        openingDate: openingDate ? new Date(openingDate) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
      },
    });
    return res.status(201).json({ success: true, data: site });
  }
  if (req.method === 'PUT') {
    const { id, code, name, regionId, status, openingDate, closingDate } = req.body;
    const site = await prisma.site.update({
      where: { id },
      data: {
        code, name, regionId, status,
        openingDate: openingDate ? new Date(openingDate) : null,
        closingDate: closingDate ? new Date(closingDate) : null,
      },
    });
    return res.status(200).json({ success: true, data: site });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    await prisma.site.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleFloors(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const floors = await prisma.floor.findMany({ include: { site: true }, orderBy: [{ siteId: 'asc' }, { name: 'asc' }] });
    return res.status(200).json({ success: true, data: floors });
  }
  if (req.method === 'POST') {
    const { code, name, siteId } = req.body;
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) return res.status(404).json({ success: false, error: 'Site not found' });
    const floor = await prisma.floor.create({ data: { id: `floor_${site.code}${code}`, code, name, siteId } });
    return res.status(201).json({ success: true, data: floor });
  }
  if (req.method === 'PUT') {
    const { id, code, name, siteId } = req.body;
    const floor = await prisma.floor.update({ where: { id }, data: { code, name, siteId } });
    return res.status(200).json({ success: true, data: floor });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    await prisma.floor.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleZones(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const zones = await prisma.zone.findMany({ include: { floor: { include: { site: true } } }, orderBy: [{ floorId: 'asc' }, { name: 'asc' }] });
    return res.status(200).json({ success: true, data: zones });
  }
  if (req.method === 'POST') {
    const { code, name, siteFloorZoneCode, floorId } = req.body;
    const zone = await prisma.zone.create({ data: { id: `zone_${siteFloorZoneCode}`, code, name, siteFloorZoneCode, floorId } });
    return res.status(201).json({ success: true, data: zone });
  }
  if (req.method === 'PUT') {
    const { id, code, name, siteFloorZoneCode, floorId } = req.body;
    const zone = await prisma.zone.update({ where: { id }, data: { code, name, siteFloorZoneCode, floorId } });
    return res.status(200).json({ success: true, data: zone });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    await prisma.zone.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleClients(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const clients = await prisma.client.findMany({ include: { projects: true }, orderBy: { code: 'asc' } });
    return res.status(200).json({ success: true, data: clients });
  }
  if (req.method === 'POST') {
    const { code, name } = req.body;
    const client = await prisma.client.create({ data: { id: `client_${code}`, code, name: name || null } });
    return res.status(201).json({ success: true, data: client });
  }
  if (req.method === 'PUT') {
    const { id, code, name } = req.body;
    const client = await prisma.client.update({ where: { id }, data: { code, name } });
    return res.status(200).json({ success: true, data: client });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    await prisma.client.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleProjects(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const projects = await prisma.project.findMany({ include: { client: true }, orderBy: { code: 'asc' } });
    return res.status(200).json({ success: true, data: projects });
  }
  if (req.method === 'POST') {
    const { code, name, clientId } = req.body;
    const project = await prisma.project.create({ data: { id: `proj_${code}`, code, name: name || null, clientId } });
    return res.status(201).json({ success: true, data: project });
  }
  if (req.method === 'PUT') {
    const { id, code, name, clientId } = req.body;
    const project = await prisma.project.update({ where: { id }, data: { code, name, clientId } });
    return res.status(200).json({ success: true, data: project });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    await prisma.project.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleQueues(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const queues = await prisma.queue.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json({ success: true, data: queues });
  }
  if (req.method === 'POST') {
    const { code, name } = req.body;
    const queue = await prisma.queue.create({ data: { id: `queue_${code}`, code, name } });
    return res.status(201).json({ success: true, data: queue });
  }
  if (req.method === 'PUT') {
    const { id, code, name } = req.body;
    const queue = await prisma.queue.update({ where: { id }, data: { code, name } });
    return res.status(200).json({ success: true, data: queue });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    await prisma.queue.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleZoneCapacity(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const yearMonth = req.query.yearMonth as string;
    const where = yearMonth ? { yearMonth } : {};
    const capacities = await prisma.zoneCapacity.findMany({
      where,
      include: { zone: { include: { floor: { include: { site: true } } } } },
      orderBy: [{ yearMonth: 'asc' }, { zoneId: 'asc' }],
    });
    return res.status(200).json({ success: true, data: capacities });
  }
  if (req.method === 'POST') {
    const { zoneId, yearMonth, capacity } = req.body;
    const zoneCapacity = await prisma.zoneCapacity.upsert({
      where: { zoneId_yearMonth: { zoneId, yearMonth } },
      update: { capacity },
      create: { zoneId, yearMonth, capacity },
    });
    return res.status(201).json({ success: true, data: zoneCapacity });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    await prisma.zoneCapacity.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleProjectAssignments(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const yearMonth = req.query.yearMonth as string;
    const where = yearMonth ? { yearMonth } : {};
    const assignments = await prisma.projectAssignment.findMany({
      where,
      include: {
        zone: { include: { floor: { include: { site: true } } } },
        project: { include: { client: true } },
        queue: true,
      },
      orderBy: [{ yearMonth: 'asc' }, { zoneId: 'asc' }],
    });
    return res.status(200).json({ success: true, data: assignments });
  }
  if (req.method === 'POST') {
    const { projectId, zoneId, queueId, yearMonth, seats } = req.body;
    const assignment = await prisma.projectAssignment.upsert({
      where: { zoneId_projectId_yearMonth: { zoneId, projectId, yearMonth } },
      update: { seats, queueId },
      create: { projectId, zoneId, queueId, yearMonth, seats },
    });
    return res.status(201).json({ success: true, data: assignment });
  }
  if (req.method === 'DELETE') {
    const id = req.query.id as string;
    await prisma.projectAssignment.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleCopyMonthData(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { sourceMonth, targetMonth, copyCapacity = true, copyAssignments = true } = req.body;

  if (!sourceMonth || !targetMonth) {
    return res.status(400).json({ success: false, error: 'sourceMonth and targetMonth required' });
  }

  let capacitiesCopied = 0;
  let assignmentsCopied = 0;

  if (copyCapacity) {
    const sourceCapacities = await prisma.zoneCapacity.findMany({ where: { yearMonth: sourceMonth } });
    for (const cap of sourceCapacities) {
      await prisma.zoneCapacity.upsert({
        where: { zoneId_yearMonth: { zoneId: cap.zoneId, yearMonth: targetMonth } },
        update: { capacity: cap.capacity },
        create: { zoneId: cap.zoneId, yearMonth: targetMonth, capacity: cap.capacity },
      });
      capacitiesCopied++;
    }
  }

  if (copyAssignments) {
    const sourceAssignments = await prisma.projectAssignment.findMany({ where: { yearMonth: sourceMonth } });
    for (const assign of sourceAssignments) {
      await prisma.projectAssignment.upsert({
        where: { zoneId_projectId_yearMonth: { zoneId: assign.zoneId, projectId: assign.projectId, yearMonth: targetMonth } },
        update: { seats: assign.seats, queueId: assign.queueId },
        create: { projectId: assign.projectId, zoneId: assign.zoneId, queueId: assign.queueId, yearMonth: targetMonth, seats: assign.seats },
      });
      assignmentsCopied++;
    }
  }

  return res.status(200).json({ success: true, data: { sourceMonth, targetMonth, capacitiesCopied, assignmentsCopied } });
}
