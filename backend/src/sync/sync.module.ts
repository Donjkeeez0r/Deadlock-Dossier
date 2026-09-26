import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { BullModule } from '@nestjs/bullmq';
import { SyncProcessor } from './sync.processor';
import { DeadlockApiModule } from '../deadlock-api/deadlock-api.module';

@Module({
  controllers: [SyncController],
  imports: [
    BullModule.registerQueue({
      name: 'assets-sync',
    }),
    DeadlockApiModule,
  ],
  providers: [SyncService, SyncProcessor],
})
export class SyncModule {}
