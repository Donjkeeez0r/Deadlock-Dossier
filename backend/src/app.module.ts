import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { DeadlockApiModule } from './deadlock-api/deadlock-api.module';
import { BullModule } from '@nestjs/bullmq';
import { SyncModule } from './sync/sync.module';
import { AssetsModule } from './assets/assets.module';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { BuildModule } from './build/build.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        stores: [createKeyv(configService.getOrThrow<string>('REDIS_URL'))],
        ttl: 7200 * 1000,
      }),
    }),
    DeadlockApiModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: { url: configService.getOrThrow<string>('REDIS_URL') },
      }),
    }),
    SyncModule,
    AssetsModule,
    AnalyticsModule,
    AuthModule,
    BuildModule,
  ],
  controllers: [],
  providers: [AppService],
})
export class AppModule {}
