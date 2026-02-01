import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
}

export function verifyToken(authHeader: string | undefined): JwtPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string;

  try {
    // POST /api/auth?action=register
    if (req.method === 'POST' && action === 'register') {
      const { email, username, password, name } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({ success: false, error: 'Email, username, and password are required' });
      }

      // Check if email or username already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        const field = existingUser.email === email ? 'Email' : 'Username';
        return res.status(400).json({ success: false, error: `${field} already exists` });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          name: name || null,
        },
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
          },
        },
      });
    }

    // POST /api/auth?action=login
    if (req.method === 'POST' && action === 'login') {
      const { identifier, password } = req.body; // identifier can be email or username

      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: 'Email/username and password are required' });
      }

      // Find user by email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { username: identifier }],
        },
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            role: user.role,
          },
        },
      });
    }

    // GET /api/auth?action=me
    if (req.method === 'GET' && action === 'me') {
      const payload = verifyToken(req.headers.authorization);

      if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
        },
      });

      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      return res.status(200).json({ success: true, data: { user } });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error: any) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
