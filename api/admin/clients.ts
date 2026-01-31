import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const clients = await prisma.client.findMany({
        include: { projects: true },
        orderBy: { code: 'asc' },
      });
      return res.status(200).json({ success: true, data: clients });
    }

    if (req.method === 'POST') {
      const { code, name } = req.body;
      const client = await prisma.client.create({
        data: {
          id: `client_${code}`,
          code,
          name: name || null,
        },
      });
      return res.status(201).json({ success: true, data: client });
    }

    if (req.method === 'PUT') {
      const { id, code, name } = req.body;
      const client = await prisma.client.update({
        where: { id },
        data: { code, name },
      });
      return res.status(200).json({ success: true, data: client });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      await prisma.client.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
