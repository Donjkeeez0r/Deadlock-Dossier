import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DeadlockApiClient } from './deadlock-api.client';

@Module({
  imports: [HttpModule],
  providers: [DeadlockApiClient],
  exports: [DeadlockApiClient],
})
export class DeadlockApiModule {}
