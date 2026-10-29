import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, AuthenticatedUser } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(SupabaseAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async getProjects(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.getProjects(user.id);
  }

  @Post()
  async createProject(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title: string;
      description?: string;
      color?: string;
      targetDate?: string;
    },
  ) {
    return this.projectsService.createProject(user.id, body);
  }

  @Patch(':id')
  async updateProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      color?: string;
      status?: string;
      targetDate?: string;
    },
  ) {
    return this.projectsService.updateProject(user.id, id, body);
  }

  @Delete(':id')
  async deleteProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.deleteProject(user.id, id);
  }
}

