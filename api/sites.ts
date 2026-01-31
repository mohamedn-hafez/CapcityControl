import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const sites = await prisma.site.findMany({
        include: {
          region: true,
          floors: {
            include: {
              zones: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return res.status(200).json({ success: true, data: sites });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
