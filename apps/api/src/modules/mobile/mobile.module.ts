import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { MobilePushService } from './mobile-push.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [MobileController],
  providers: [MobileService, MobilePushService, PrismaService],
  exports: [MobileService, MobilePushService],
})
export class MobileModule {}

