import { Module } from '@nestjs/common';
import { SchedulingEngineService } from './scheduling-engine.service';

@Module({
  providers: [SchedulingEngineService],
  exports: [SchedulingEngineService],
})
export class SchedulingModule {}

