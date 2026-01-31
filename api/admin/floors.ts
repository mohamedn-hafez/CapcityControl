import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const floors = await prisma.floor.findMany({
        include: { site: true },
        orderBy: [{ siteId: 'asc' }, { name: 'asc' }],
      });
      return res.status(200).json({ success: true, data: floors });
    }

    if (req.method === 'POST') {
      const { code, name, siteId } = req.body;
      const site = await prisma.site.findUnique({ where: { id: siteId } });
      if (!site) {
        return res.status(404).json({ success: false, error: 'Site not found' });
      }

      const floor = await prisma.floor.create({
        data: {
          id: `floor_${site.code}${code}`,
          code,
          name,
          siteId,
        },
      });
      return res.status(201).json({ success: true, data: floor });
    }

    if (req.method === 'PUT') {
      const { id, code, name, siteId } = req.body;
      const floor = await prisma.floor.update({
        where: { id },
        data: { code, name, siteId },
      });
      return res.status(200).json({ success: true, data: floor });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      await prisma.floor.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
