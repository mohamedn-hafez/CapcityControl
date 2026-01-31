import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
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
      const region = await prisma.region.update({
        where: { id },
        data: { code, name, country },
      });
      return res.status(200).json({ success: true, data: region });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      await prisma.region.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
