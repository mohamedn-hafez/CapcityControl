import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

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

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user (not approved and not verified by default)
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          name: name || null,
          isApproved: false,
          emailVerified: false,
          verificationToken,
          verificationTokenExpiry,
        },
      });

      // Send verification email
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.BASE_URL || 'http://localhost:3000';
      const verifyUrl = `${baseUrl}/api/auth?action=verify&token=${verificationToken}`;

      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'CapacityPulse <noreply@resend.dev>',
          to: email,
          subject: 'Verify your CapacityPulse account',
          html: `
            <h2>Welcome to CapacityPulse!</h2>
            <p>Hi ${name || username},</p>
            <p>Please verify your email address by clicking the link below:</p>
            <p><a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verifyUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>After verifying your email, an administrator will need to approve your account before you can sign in.</p>
            <p>Best regards,<br>The CapacityPulse Team</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail registration if email fails, but log it
      }

      // Return success but indicate email verification needed
      return res.status(201).json({
        success: true,
        data: {
          pendingApproval: true,
          pendingVerification: true,
          message: 'Account created. Please check your email to verify your account.',
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
          },
        },
      });
    }

    // GET /api/auth?action=verify&token=xxx
    if (req.method === 'GET' && action === 'verify') {
      const token = req.query.token as string;

      if (!token) {
        return res.status(400).json({ success: false, error: 'Verification token is required' });
      }

      // Find user with this token
      const user = await prisma.user.findUnique({
        where: { verificationToken: token },
      });

      if (!user) {
        // Redirect to login page with error
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.BASE_URL || 'http://localhost:3000';
        return res.redirect(`${baseUrl}?verified=invalid`);
      }

      // Check if token expired
      if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.BASE_URL || 'http://localhost:3000';
        return res.redirect(`${baseUrl}?verified=expired`);
      }

      // Mark email as verified and clear token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });

      // Redirect to login page with success
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.BASE_URL || 'http://localhost:3000';
      return res.redirect(`${baseUrl}?verified=success`);
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

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({
          success: false,
          error: 'Please verify your email address before signing in. Check your inbox for the verification link.',
          pendingVerification: true,
        });
      }

      // Check if user is approved
      if (!user.isApproved) {
        return res.status(403).json({
          success: false,
          error: 'Your account is pending approval. Please wait for an admin to approve your account.',
          pendingApproval: true,
        });
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

    // GET /api/auth?action=users (admin only - list all users)
    if (req.method === 'GET' && action === 'users') {
      const payload = verifyToken(req.headers.authorization);
      if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Check if user is admin
      const adminUser = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!adminUser || adminUser.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          isApproved: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: users });
    }

    // POST /api/auth?action=approve (admin only - approve a user)
    if (req.method === 'POST' && action === 'approve') {
      const payload = verifyToken(req.headers.authorization);
      if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Check if user is admin
      const adminUser = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!adminUser || adminUser.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      const { userId, approved } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId is required' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { isApproved: approved !== false },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          role: true,
          isApproved: true,
        },
      });

      return res.status(200).json({ success: true, data: user });
    }

    // DELETE /api/auth?action=delete&userId=xxx (admin only - delete a user)
    if (req.method === 'DELETE' && action === 'delete') {
      const payload = verifyToken(req.headers.authorization);
      if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      // Check if user is admin
      const adminUser = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!adminUser || adminUser.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ success: false, error: 'userId is required' });
      }

      // Prevent deleting yourself
      if (userId === payload.userId) {
        return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
      }

      await prisma.user.delete({ where: { id: userId } });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error: any) {
    console.error('Auth API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
