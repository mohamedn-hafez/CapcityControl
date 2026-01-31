import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const sites = await prisma.site.findMany({
        include: { region: true },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json({ success: true, data: sites });
    }

    if (req.method === 'POST') {
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
      return res.status(201).json({ success: true, data: site });
    }

    if (req.method === 'PUT') {
      const { id, code, name, regionId, status, openingDate, closingDate } = req.body;
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
      return res.status(200).json({ success: true, data: site });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      await prisma.site.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
