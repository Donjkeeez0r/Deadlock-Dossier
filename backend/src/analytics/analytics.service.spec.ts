import { AnalyticsService } from './analytics.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { DeadlockApiClient } from '../deadlock-api/deadlock-api.client';
import type { Cache } from 'cache-manager';

// Эти модули тянут ESM-зависимости (@nestjs/config, @nestjs/cache-manager), которые jest не грузит.
jest.mock('@nestjs/cache-manager', () => ({ CACHE_MANAGER: 'CACHE_MANAGER' }));
jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../deadlock-api/deadlock-api.client', () => ({
  DeadlockApiClient: class {},
}));

describe('AnalyticsService.evaluateBuild', () => {
  it('возвращает предметы в порядке сборки, а не в порядке базы', async () => {
    const dbItems = [3n, 1n, 2n].map((id) => ({
      id,
      name: `Item ${id}`,
      cost: 800,
      category: 'weapon',
      imageUrl: null,
    }));
    const service = new AnalyticsService(
      { get: jest.fn().mockResolvedValue([]) } as unknown as Cache,
      {} as DeadlockApiClient,
      {
        item: { findMany: jest.fn().mockResolvedValue(dbItems) },
      } as unknown as PrismaService,
    );

    const result = await service.evaluateBuild(1, [2, 3, 1]);

    expect(result.items.map((item) => Number(item.id))).toEqual([2, 3, 1]);
  });
});

describe('AnalyticsService.getPopularBuild', () => {
  it('неизвестный герой — 404 без запроса к внешнему API', async () => {
    const getHeroItemStats = jest.fn();
    const service = new AnalyticsService(
      { get: jest.fn().mockResolvedValue(undefined) } as unknown as Cache,
      { getHeroItemStats } as unknown as DeadlockApiClient,
      {
        hero: { findUnique: jest.fn().mockResolvedValue(null) },
        item: { findMany: jest.fn().mockResolvedValue([]) },
      } as unknown as PrismaService,
    );

    await expect(service.getPopularBuild(424242)).rejects.toThrow(
      'Герой не найден',
    );
    expect(getHeroItemStats).not.toHaveBeenCalled();
  });
});
