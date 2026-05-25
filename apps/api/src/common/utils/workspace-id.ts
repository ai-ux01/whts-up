import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../types';

export function requireWorkspaceId(user: AuthUser): string {
  if (!user.workspaceId) {
    throw new ForbiddenException('Workspace context required');
  }
  return user.workspaceId;
}
