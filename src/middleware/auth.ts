import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
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
    (req as any).user = { id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
