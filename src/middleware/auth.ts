import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

interface JwtPayload {
  id: string;
  role?: string;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    const decoded = jwt.verify(token, secretKey) as JwtPayload;

    // Delivery partner token has role='delivery'
    if (decoded.role === 'delivery') {
      const partner = await prisma.deliveryPartner.findUnique({ where: { id: decoded.id } });
      if (!partner) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      req.user = { id: decoded.id, isAdmin: false, isDeliveryPartner: true };
      return next();
    }

    // Regular user token
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminEmails = process.env.ADMIN_EMAILS?.length
      ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
      : [];
    const isAdmin = adminEmails.includes(user.email.toLowerCase());

    req.user = { id: decoded.id, isAdmin, isDeliveryPartner: false };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
