import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { MobilePushService } from './mobile-push.service';
import { NotificationCapabilityService } from './notification-capability.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [MobileController],
  providers: [MobileService, MobilePushService, NotificationCapabilityService, PrismaService],
  exports: [MobileService, MobilePushService, NotificationCapabilityService],
})
export class MobileModule {}

