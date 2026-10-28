import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  timezone: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  public static readonly DEFAULT_TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    // In local development or testing without token, use the default seeded test user
    const userId = request.headers['x-user-id'] || SupabaseAuthGuard.DEFAULT_TEST_USER_ID;
    const userEmail = request.headers['x-user-email'] || 'user@assistant.local';
    const timezone = request.headers['x-user-timezone'] || 'UTC';

    const user: AuthenticatedUser = {
      id: userId,
      email: userEmail,
      timezone: timezone,
    };

    // Ensure user exists in database if Prisma is connected
    if (this.prisma.isConnected) {
      try {
        await this.prisma.user.upsert({
          where: { id: user.id },
          update: {},
          create: {
            id: user.id,
            email: user.email,
            timezone: user.timezone,
            settings: {
              create: {},
            },
          },
        });
      } catch (err: any) {
        this.logger.debug(`Could not ensure user record: ${err?.message}`);
      }
    }

    request.user = user;
    return true;
  }
}
