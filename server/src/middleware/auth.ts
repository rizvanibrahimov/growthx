import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: 'admin' | 'user' };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Token gerekli' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ success: false, error: 'Geçersiz token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin yetkisi gerekli' });
    return;
  }
  next();
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'user') {
    res.status(403).json({ success: false, error: 'Kullanıcı yetkisi gerekli' });
    return;
  }
  next();
}
