import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService implements OnModuleInit {
  constructor(
    @InjectQueue('assets-sync') private readonly syncQueue: Queue,
    private prismaService: PrismaService,
  ) {}

  async onModuleInit() {
    const heroesCount = await this.prismaService.hero.count();

    if (heroesCount === 0) {
      await this.triggerSync();
    }
    await this.setupRecurringSync();
  }

  async setupRecurringSync() {
    await this.syncQueue.upsertJobScheduler(
      'sync-heroes',
      {
        pattern: '0 4 * * *',
      },
      {
        opts: {
          removeOnComplete: true,
        },
      },
    );
    await this.syncQueue.upsertJobScheduler(
      'sync-items',
      {
        pattern: '10 4 * * *',
      },
      {
        opts: {
          removeOnComplete: true,
        },
      },
    );
  }

  async triggerSync() {
    await this.syncQueue.add('sync-heroes', {});
    await this.syncQueue.add('sync-items', {});

    return {
      status: 'Задачи добавлены в очередь',
    };
  }
}
