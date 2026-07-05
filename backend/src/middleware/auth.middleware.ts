import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';

export type UserRole = 'user' | 'admin';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: UserRole;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  if (!env.jwtSecret) {
    return res.status(500).json({ error: 'JWT is not configured' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as {
      userId: string;
      username: string;
      role?: UserRole;
    };
    req.user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role === 'admin' ? 'admin' : 'user',
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/** Sets req.user when token is valid; continues without user when missing/invalid */
export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ') || !env.jwtSecret) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as {
      userId: string;
      username: string;
      role?: UserRole;
    };
    req.user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role === 'admin' ? 'admin' : 'user',
    };
  } catch {
    // ignore invalid token for optional auth
  }

  next();
};

/** Requires authenticate first; verifies admin role from DB */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true },
    });

    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.user.role = 'admin';
    next();
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
