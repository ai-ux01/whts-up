import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugifyWorkspaceName } from '../common/utils/slug';
import { CreateClientWorkspaceDto } from './dto/create-client-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import {
  generateDummyData,
  getRandomMarketingData,
  VERTICAL_CONFIGS,
} from './utils/dummy-data-generator';


@Injectable()
export class PlatformService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async listWorkspaces() {
    const workspaces = await this.prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            conversations: true,
            leads: true,
            campaigns: true,
          },
        },
        users: {
          where: { role: UserRole.ADMIN },
          take: 1,
          select: { email: true, name: true },
        },
      },
    });

    const webhookBase =
      this.config.get<string>('PUBLIC_WEBHOOK_BASE_URL')?.trim() || null;

    return workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      status: w.status,
      businessName: w.businessName,
      whatsappConnected: !!(
        w.whatsappPhoneNumberId && w.whatsappAccessToken
      ),
      marketingConnected: [
        !!(w.whatsappPhoneNumberId && w.whatsappAccessToken),
        !!w.metaAdsAccountId,
        !!w.googleAdsCustomerId,
        !!w.metaPageId,
      ].filter(Boolean).length,
      createdAt: w.createdAt,
      counts: w._count,
      adminUser: w.users[0] ?? null,
      clientLoginUrl: '/login',
      businessType: w.businessType,
      webhookUrl: webhookBase
        ? `${webhookBase}/api/v1/whatsapp/webhook`
        : null,
    }));
  }

  async getWorkspace(id: string) {
    const w = await this.prisma.workspace.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            conversations: true,
            leads: true,
            campaigns: true,
            contacts: true,
          },
        },
      },
    });
    if (!w) throw new NotFoundException('Workspace not found');
    return w;
  }

  async createClientWorkspace(dto: CreateClientWorkspaceDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existing) {
      throw new ConflictException('Admin email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
    const slug = slugifyWorkspaceName(dto.workspaceName);
    const verifyToken =
      this.config.get<string>('WHATSAPP_VERIFY_TOKEN')?.trim() ||
      `verify-${slug}`;

    let aiEnabled = false;
    let aiSystemPrompt: string | null = null;
    let instagramUsername: string | null = null;
    let marketingData = {};

    if (dto.businessType && VERTICAL_CONFIGS[dto.businessType]) {
      const config = VERTICAL_CONFIGS[dto.businessType];
      aiEnabled = true;
      aiSystemPrompt = config.aiSystemPrompt;
      instagramUsername = config.instagramUsername;
      marketingData = getRandomMarketingData(dto.businessType);
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.workspaceName,
        slug,
        businessName: dto.businessName || dto.workspaceName,
        businessType: dto.businessType || null,
        webhookVerifyToken: verifyToken,
        aiEnabled,
        aiSystemPrompt,
        instagramUsername,
        ...marketingData,
        users: {
          create: {
            email: dto.adminEmail,
            passwordHash,
            name: dto.adminName,
            role: UserRole.ADMIN,
          },
        },
      },
      include: { users: true },
    });

    if (dto.businessType && VERTICAL_CONFIGS[dto.businessType]) {
      await generateDummyData(this.prisma, workspace.id, dto.businessType);
    }

    const webhookBase =
      this.config.get<string>('PUBLIC_WEBHOOK_BASE_URL')?.trim() || null;

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        status: workspace.status,
        webhookVerifyToken: workspace.webhookVerifyToken,
      },
      admin: {
        email: workspace.users[0].email,
        name: workspace.users[0].name,
      },
      clientLoginUrl: '/login',
      webhookUrl: webhookBase
        ? `${webhookBase}/api/v1/whatsapp/webhook`
        : null,
    };
  }

  async updateWorkspace(id: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    return this.prisma.workspace.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
      },
    });
  }
}
