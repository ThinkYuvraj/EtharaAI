import type { Request, Response, NextFunction } from 'express';

import type { UserRole } from '../models/User.js';
import { verifyAuthToken } from '../lib/jwt.js';

export type AuthUser = {
  userId: string;
  role: UserRole;
  email: string;
  name?: string;
};

export interface AuthedRequest extends Request {
  authUser?: AuthUser;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });
  const token = header.slice('Bearer '.length);

  try {
    const payload = verifyAuthToken(token);
    req.authUser = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser) return res.status(401).json({ message: 'Not authenticated' });
  if (req.authUser.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  return next();
}

