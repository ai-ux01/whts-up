import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

/** Blocks platform super admins from client workspace APIs. */
@Injectable()
export class ClientUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user || user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Use the client app login for workspace access');
    }
    if (!user.workspaceId) {
      throw new ForbiddenException('No workspace assigned');
    }
    return true;
  }
}
