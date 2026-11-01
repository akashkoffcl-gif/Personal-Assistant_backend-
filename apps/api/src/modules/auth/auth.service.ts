import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    if (!this.prisma.isConnected) {
      return {
        id: userId,
        email: 'user@assistant.local',
        fullName: 'Personal Assistant User',
        timezone: 'UTC',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User profile for ID ${userId} not found.`);
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      timezone: user.timezone,
      createdAt: user.createdAt,
      settings: user.settings,
    };
  }

  async updateProfile(userId: string, data: { fullName?: string; timezone?: string }) {
    if (!this.prisma.isConnected) {
      return { id: userId, ...data };
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      },
      include: {
        settings: true,
      },
    });
  }
}

