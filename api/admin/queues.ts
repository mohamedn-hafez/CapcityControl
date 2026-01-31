import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const prisma = getDb();

  try {
    if (req.method === 'GET') {
      const queues = await prisma.queue.findMany({ orderBy: { name: 'asc' } });
      return res.status(200).json({ success: true, data: queues });
    }

    if (req.method === 'POST') {
      const { code, name } = req.body;
      const queue = await prisma.queue.create({
        data: { id: `queue_${code}`, code, name },
      });
      return res.status(201).json({ success: true, data: queue });
    }

    if (req.method === 'PUT') {
      const { id, code, name } = req.body;
      const queue = await prisma.queue.update({
        where: { id },
        data: { code, name },
      });
      return res.status(200).json({ success: true, data: queue });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id as string;
      await prisma.queue.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
