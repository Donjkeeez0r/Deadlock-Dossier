import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { DeadlockApiModule } from '../deadlock-api/deadlock-api.module';

@Module({
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
  imports: [DeadlockApiModule],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
