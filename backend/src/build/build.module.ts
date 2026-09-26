import { Module } from '@nestjs/common';
import { BuildService } from './build.service';
import { BuildController } from './build.controller';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [BuildController],
  imports: [AnalyticsModule, AuthModule],
  providers: [BuildService],
})
export class BuildModule {}
