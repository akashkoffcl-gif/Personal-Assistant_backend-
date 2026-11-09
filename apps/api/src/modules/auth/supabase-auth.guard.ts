import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  Optional,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../common/prisma.service';
import { RedisService } from '../../common/redis.service';

export interface AuthenticatedUser {
  id: string; // Maps to Supabase Auth User ID (sub)
  email: string;
  role: string;
  timezone: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  public static readonly DEFAULT_TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;

    let userId: string | null = null;
    let email: string = 'user@assistant.local';
    let role: string = 'authenticated';
    let timezone: string = request.headers['x-user-timezone'] || 'UTC';

    // 1. Bearer Token Verification
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (!jwtSecret) {
        this.logger.error('SUPABASE_JWT_SECRET is not configured on the server.');
        throw new UnauthorizedException('Authentication service misconfigured.');
      }

      try {
        // Cryptographically verify signature, algorithm, audience, and expiration
        const verified = jwt.verify(token, jwtSecret, {
          algorithms: ['HS256'],
        }) as jwt.JwtPayload;

        if (!verified.sub) {
          throw new UnauthorizedException('JWT token missing subject (sub) claim.');
        }

        // Validate Audience: Supabase Auth standard audience is 'authenticated'
        if (verified.aud && verified.aud !== 'authenticated') {
          throw new UnauthorizedException(`Invalid token audience: ${verified.aud}`);
        }

        // Validate Issuer: Supabase standard issuer is 'supabase' or ends with supabase project URL
        if (verified.iss && verified.iss !== 'supabase' && !verified.iss.includes('supabase')) {
          throw new UnauthorizedException(`Invalid token issuer: ${verified.iss}`);
        }

        userId = verified.sub;
        email = verified.email || (verified.user_metadata?.email) || email;
        role = verified.role || role;
      } catch (err: any) {
        if (err instanceof UnauthorizedException) {
          throw err;
        }
        if (err instanceof jwt.TokenExpiredError) {
          throw new UnauthorizedException('Authentication token has expired.');
        } else if (err instanceof jwt.JsonWebTokenError) {
          throw new UnauthorizedException(`Cryptographic token validation failed: ${err.message}`);
        }
        throw new UnauthorizedException('Invalid authentication credentials.');
      }
    } else {
      // 2. Unauthenticated check
      // In development / testing environments, allow test scripts passing explicit x-user-id header
      if (!isProduction && request.headers['x-user-id']) {
        userId = request.headers['x-user-id'];
        email = request.headers['x-user-email'] || email;
      } else {
        throw new UnauthorizedException('Authorization Bearer token is required.');
      }
    }

    const user: AuthenticatedUser = {
      id: userId,
      email,
      role,
      timezone,
    };

    // 3. User Identity Mapping & Profile Lifecycle Synchronization
    // Ensure application profile exists in PostgreSQL (cached with Redis to prevent query thrashing)
    const userCacheKey = `user:synced:${user.id}`;
    const isSynced = this.redis ? await this.redis.get(userCacheKey) : false;
    if (!isSynced && this.prisma.isConnected) {
      try {
        await this.prisma.user.upsert({
          where: { id: user.id },
          update: {
            email: user.email,
          },
          create: {
            id: user.id,
            email: user.email,
            timezone: user.timezone,
            settings: {
              create: {},
            },
          },
        });
        if (this.redis) {
          await this.redis.set(userCacheKey, '1', 3600);
        }
      } catch (err: any) {
        this.logger.debug(`Could not ensure user record: ${err?.message}`);
      }
    }

    request.user = user;
    return true;
  }
}
