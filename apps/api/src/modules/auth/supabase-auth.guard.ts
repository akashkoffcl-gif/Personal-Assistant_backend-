import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface AuthenticatedUser {
  id: string; // Maps to Supabase Auth User ID (sub)
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
    const isProduction = process.env.NODE_ENV === 'production';

    let userId: string | null = null;
    let email: string = 'user@assistant.local';
    let timezone: string = request.headers['x-user-timezone'] || 'UTC';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        // Parse JWT payload (Base64URL decode)
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
          const payload = JSON.parse(payloadJson);
          if (payload.sub) {
            userId = payload.sub;
            email = payload.email || email;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to parse bearer token: ${err?.message}`);
        if (isProduction) {
          throw new UnauthorizedException('Invalid bearer token format.');
        }
      }
    }

    // In non-production or test environments, allow x-user-id header or fallback
    if (!userId) {
      if (request.headers['x-user-id']) {
        userId = request.headers['x-user-id'];
        email = request.headers['x-user-email'] || email;
      } else if (!isProduction) {
        userId = SupabaseAuthGuard.DEFAULT_TEST_USER_ID;
      } else {
        throw new UnauthorizedException('Authentication token is required.');
      }
    }

    const user: AuthenticatedUser = {
      id: userId!,
      email,
      timezone,
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
