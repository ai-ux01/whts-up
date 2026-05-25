import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole, WorkspaceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, SignupDto } from './dto/auth.dto';
import { JwtPayload } from '../common/types';
import { slugifyWorkspaceName } from '../common/utils/slug';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const slug = slugifyWorkspaceName(dto.workspaceName);

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.workspaceName,
        slug,
        businessName: dto.workspaceName,
        aiSystemPrompt: this.defaultAiPrompt(dto.workspaceName),
        users: {
          create: {
            email: dto.email,
            passwordHash,
            name: dto.name,
            role: UserRole.ADMIN,
          },
        },
      },
      include: { users: true },
    });

    const user = workspace.users[0];
    return this.buildAuthResponse(user);
  }

  /** Client portal: workspace ADMIN / AGENT only */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { workspace: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Platform admins must sign in at /admin/login',
      );
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.workspaceId || !user.workspace) {
      throw new ForbiddenException('No workspace assigned');
    }

    if (user.workspace.status === WorkspaceStatus.SUSPENDED) {
      throw new ForbiddenException('This workspace has been suspended');
    }

    return this.buildAuthResponse(user);
  }

  /** Platform portal: SUPER_ADMIN only */
  async adminLogin(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Use the client login at /login');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { workspace: true },
      });
      if (!user) throw new UnauthorizedException();

      if (user.role === UserRole.SUPER_ADMIN) {
        return this.buildAuthResponse(user);
      }

      if (!user.workspaceId || user.workspace?.status === WorkspaceStatus.SUSPENDED) {
        throw new UnauthorizedException('Workspace unavailable');
      }

      return this.buildAuthResponse(user);
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    workspaceId: string | null;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const workspace = user.workspaceId
      ? await this.prisma.workspace.findUnique({
          where: { id: user.workspaceId },
        })
      : null;

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId,
        workspaceName: workspace?.name ?? null,
        workspaceSlug: workspace?.slug ?? null,
        portal: user.role === UserRole.SUPER_ADMIN ? 'platform' : 'client',
      },
    };
  }

  private defaultAiPrompt(businessName: string) {
    return `You are a friendly sales assistant for ${businessName}, an Indian business. Reply naturally in Hindi, English, or Hinglish based on the customer's language. Answer FAQs, qualify leads (budget, timeline, need), and always end with a clear next step or CTA. Keep replies concise (2-4 sentences). Be polite and use "Sir/Ma'am" when appropriate.`;
  }
}
