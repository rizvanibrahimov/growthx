import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    // Check if administrator
    const admin = await prisma.admin.findUnique({ where: { email } });
    if (admin) {
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        res.status(401).json({ success: false, error: 'Invalid password' });
        return;
      }
      const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ success: true, data: { token, role: 'admin', name: admin.name } });
      return;
    }

    // Check if investor user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'User account not found' });
      return;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ success: false, error: 'Your account has been suspended. Please contact your manager.' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid password' });
      return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, data: { token, role: 'user', name: user.fullName } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Authentication service error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !password || !fullName) {
      res.status(400).json({ success: false, error: 'Email, password, and full name are required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, phone: phone || null, status: 'ACTIVE' },
    });

    res.json({ success: true, data: { id: user.id, email: user.email, fullName: user.fullName } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

export default router;
