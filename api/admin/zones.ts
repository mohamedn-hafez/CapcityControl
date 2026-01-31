import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const zones = await prisma.zone.findMany({
        include: { floor: { include: { site: true } } },
        orderBy: [{ floorId: 'asc' }, { name: 'asc' }],
      });
      return res.status(200).json({ success: true, data: zones });
    }

    if (req.method === 'POST') {
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
      return res.status(201).json({ success: true, data: zone });
    }

    if (req.method === 'PUT') {
      const { id, code, name, siteFloorZoneCode, floorId } = req.body;
      const zone = await prisma.zone.update({
        where: { id },
        data: { code, name, siteFloorZoneCode, floorId },
      });
      return res.status(200).json({ success: true, data: zone });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      await prisma.zone.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
