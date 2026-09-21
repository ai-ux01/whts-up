import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Blocks platform super admins from client workspace APIs, and resolves the
 * ACTIVE workspace for multi-business users.
 *
 * If an `X-Workspace-Id` header is present and the user is a member of that
 * workspace, it becomes the active workspace for this request (overriding
 * user.workspaceId). This is the single choke point that makes every existing
 * `requireWorkspaceId(user)` call multi-business aware without controller changes.
 */
@Injectable()
export class ClientUserGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Use the client app login for workspace access');
    }

    const headerRaw = req.headers['x-workspace-id'];
    const requested = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;

    if (requested && requested !== user.workspaceId) {
      const membership = await this.prisma.workspaceMembership.findUnique({
        where: {
          userId_workspaceId: { userId: user.id, workspaceId: requested },
        },
      });
      if (!membership) {
        throw new ForbiddenException('You do not have access to this workspace');
      }
      user.workspaceId = requested; // active workspace for this request
    }

    if (!user.workspaceId) {
      throw new ForbiddenException('No workspace assigned');
    }
    return true;
  }
}
