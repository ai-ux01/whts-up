import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  workspaceId: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  workspaceId: string | null;
  name: string;
}
