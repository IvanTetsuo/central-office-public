import { AdminRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  sessionId: string;
  role: AdminRole;
  type: 'access' | 'refresh';
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  sessionId: string;
};