import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';
import { TaskStatus } from '@assistant/shared';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getProjects(userId: string) {
    if (!this.prisma.isConnected) {
      return [];
    }

    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: {
        tasks: {
          select: { id: true, status: true, deadline: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        userId: p.userId,
        title: p.title,
        description: p.description,
        color: p.color,
        status: p.status,
        targetDate: p.targetDate ? p.targetDate.toISOString() : null,
        tasksCount: totalTasks,
        completedTasksCount: completedTasks,
        progressPercent,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }

  async createProject(
    userId: string,
    data: {
      title: string;
      description?: string;
      color?: string;
      targetDate?: string;
    },
  ) {
    if (!this.prisma.isConnected) {
      return {
        id: 'mock-proj-id',
        userId,
        title: data.title,
        color: data.color || '#142B4A',
        status: 'ACTIVE',
        tasksCount: 0,
        completedTasksCount: 0,
        progressPercent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const project = await this.prisma.project.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        color: data.color || '#142B4A',
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      },
    });

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return {
      ...project,
      tasksCount: 0,
      completedTasksCount: 0,
      progressPercent: 0,
      targetDate: project.targetDate ? project.targetDate.toISOString() : null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async updateProject(
    userId: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      color?: string;
      status?: string;
      targetDate?: string;
    },
  ) {
    if (!this.prisma.isConnected) {
      return { id, userId, ...data };
    }

    const existing = await this.prisma.project.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        color: data.color,
        status: data.status,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    });

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return updated;
  }

  async deleteProject(userId: string, id: string) {
    if (!this.prisma.isConnected) {
      return { success: true };
    }

    const existing = await this.prisma.project.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Project not found');
    }

    // Unlink tasks before deleting project
    await this.prisma.task.updateMany({
      where: { projectId: id, userId },
      data: { projectId: null },
    });

    await this.prisma.project.delete({
      where: { id },
    });

    await this.redis.invalidatePattern(`dashboard:${userId}:*`);
    return { success: true };
  }
}

