import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';

import type { UserRole } from '../models/User.js';

export type AuthTokenPayload = JwtPayload & {
  sub: string;
  role: UserRole;
  email: string;
  name?: string;
};

function getJwtSecret() {
  return process.env.JWT_SECRET ?? 'dev-secret-change-me';
}

export function signAuthToken(params: { userId: string; role: UserRole; email: string; name?: string }) {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];

  return jwt.sign(
    {
      sub: params.userId,
      role: params.role,
      email: params.email,
      name: params.name,
    },
    getJwtSecret(),
    { expiresIn },
  );
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const payload = jwt.verify(token, getJwtSecret());

  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    (payload.role !== 'admin' && payload.role !== 'member')
  ) {
    throw new Error('Invalid token payload');
  }

  return payload as AuthTokenPayload;
}
