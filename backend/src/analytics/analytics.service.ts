import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { DeadlockApiClient } from '../deadlock-api/deadlock-api.client';
import { PrismaService } from '../prisma/prisma.service';
import { IItemStat } from './analytics.interface';
import { pickPopularBuild } from './popular-build';
import { Item } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private deadlockApiClient: DeadlockApiClient,
    private prismaService: PrismaService,
  ) {}

  async getCounters(enemyHeroId: number) {
    const cacheKey = `counters:${enemyHeroId}`;

    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const rawData = await this.deadlockApiClient.getHeroesCounters(enemyHeroId);

    // Внешний API игнорирует enemy_hero_id и отдаёт все пары героев,
    // поэтому оставляем только строки против нужного врага и сводим их по герою.
    const byHero = new Map<
      number,
      {
        wins: number;
        matches: number;
        kills: number;
        assists: number;
        deaths: number;
      }
    >();
    for (const stat of rawData) {
      if (stat.enemy_hero_id !== enemyHeroId || stat.hero_id === enemyHeroId) {
        continue;
      }
      const acc = byHero.get(stat.hero_id) ?? {
        wins: 0,
        matches: 0,
        kills: 0,
        assists: 0,
        deaths: 0,
      };
      acc.wins += stat.wins;
      acc.matches += stat.matches_played;
      acc.kills += stat.kills;
      acc.assists += stat.assists;
      acc.deaths += stat.deaths;
      byHero.set(stat.hero_id, acc);
    }

    const processedData = [...byHero.entries()]
      .filter(([, stat]) => stat.matches >= 100)
      .map(([heroId, stat]) => {
        const winrate = (stat.wins / stat.matches) * 100;
        return {
          hero_id: heroId,
          win_rate: Number(winrate.toFixed(2)),
          matches: stat.matches,
          kda_ratio: (stat.kills + stat.assists) / Math.max(1, stat.deaths),
        };
      })
      .sort((a, b) => b.win_rate - a.win_rate)
      .slice(0, 5);

    await this.cacheManager.set(cacheKey, processedData);
    return processedData;
  }

  async getSynergy(heroId: number) {
    const cacheKey = `synergy:${heroId}`;

    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const rawData = await this.deadlockApiClient.getHeroesSynergy(heroId);

    // Внешний API игнорирует hero_id1 и отдаёт все пары: берём только пары
    // с нашим героем (он может стоять на любой позиции) и сводим по союзнику.
    const byAlly = new Map<number, { wins: number; matches: number }>();
    for (const stat of rawData) {
      if (stat.hero_id1 !== heroId && stat.hero_id2 !== heroId) continue;
      const allyId = stat.hero_id1 === heroId ? stat.hero_id2 : stat.hero_id1;
      if (allyId === heroId) continue;
      const acc = byAlly.get(allyId) ?? { wins: 0, matches: 0 };
      acc.wins += stat.wins;
      acc.matches += stat.matches_played;
      byAlly.set(allyId, acc);
    }

    const processedData = [...byAlly.entries()]
      .filter(([, stat]) => stat.matches >= 100)
      .map(([allyId, stat]) => {
        const winrate = (stat.wins / stat.matches) * 100;
        return {
          ally_hero_id: allyId,
          winrate: Number(winrate.toFixed(2)),
          matches: stat.matches,
        };
      })
      .sort((a, b) => b.winrate - a.winrate)
      .slice(0, 5);

    await this.cacheManager.set(cacheKey, processedData);
    return processedData;
  }

  async getLaneMatchup(myHeroId: number, enemyHeroId: number) {
    const cacheKey = `lane:${myHeroId}:${enemyHeroId}`;

    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const rawData = await this.deadlockApiClient.getLaneMatchupStats(
      myHeroId,
      enemyHeroId,
    );
    //console.log('rawData length:', rawData.length);

    const relevantStats = rawData.filter(
      (stat) =>
        stat.hero_ids.includes(myHeroId) &&
        stat.enemy_hero_ids.includes(enemyHeroId),
    );
    //console.log('relevantStats length:', relevantStats.length);

    let totalWins = 0;
    let totalMatches = 0;

    for (const stat of relevantStats) {
      totalWins += stat.wins;
      totalMatches += stat.matches_played;
    }

    const winrate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

    const processedData = {
      my_hero_id: myHeroId,
      enemy_hero_id: enemyHeroId,
      winrate: Number(winrate.toFixed(2)),
      matches: totalMatches,
    };

    await this.cacheManager.set(cacheKey, processedData);
    return processedData;
  }

  async getRecommendedItems(myHeroId: number, enemyHeroId: number) {
    const cacheKey = `items:${myHeroId}:vs:${enemyHeroId}`;

    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      return cached;
    }

    const rawData = await this.deadlockApiClient.getTargetedItemStats(
      myHeroId,
      enemyHeroId,
    );

    const statsProcessed = rawData
      .map((stat) => {
        const winrate = (stat.wins / Math.max(1, stat.matches)) * 100;

        return {
          item_id: stat.item_id,
          win_rate: winrate,
          avg_buy_min: Math.floor(stat.avg_buy_time_s / 60),
        };
      })
      .sort((a, b) => b.win_rate - a.win_rate)
      .slice(0, 10);

    const itemIds = statsProcessed.map((stat) => stat.item_id);
    const dbItems = await this.prismaService.item.findMany({
      where: { id: { in: itemIds } },
    });

    const data = statsProcessed.map((stat) => {
      const itemInfo = dbItems.find(
        (dbItem) => dbItem.id === BigInt(stat.item_id),
      );

      return {
        item_id: stat.item_id,
        name: itemInfo?.name || 'Unknown',
        cost: itemInfo?.cost || 0,
        category: itemInfo?.category || 'Unknown',
        image_url: itemInfo?.imageUrl || null,
        win_rate: Number(stat.win_rate).toFixed(2),
        avg_buy_min: stat.avg_buy_min,
      };
    });

    await this.cacheManager.set(cacheKey, data);
    return data;
  }

  async evaluateBuild(heroId: number, itemIds: number[]) {
    const dbItems = await this.prismaService.item.findMany({
      where: { id: { in: itemIds } },
    });

    if (dbItems.length !== itemIds.length) {
      throw new NotFoundException(
        'Один или несколько предметов не найдено в базе',
      );
    }

    const totalCost = dbItems.reduce((acc, item) => acc + item.cost, 0);

    const heroStats = await this.getHeroItemStats(heroId);

    let buildMatches = 0;
    let buildWins = 0;
    let avgBuyTime = 0;
    let foundStatsCount = 0;

    for (const dbItem of dbItems) {
      const stat = heroStats.find((s) => BigInt(s.item_id) === dbItem.id);

      if (stat) {
        buildMatches += stat.matches;
        buildWins += stat.wins;
        avgBuyTime += stat.avg_buy_time_s;
        foundStatsCount++;
      }
    }

    // Без статистики возвращаем null, а не 0: «0% побед» — это ложный вывод.
    const avgWinrate =
      buildMatches > 0 ? (buildWins / buildMatches) * 100 : null;

    const avgBuyMin =
      foundStatsCount > 0
        ? Math.floor(avgBuyTime / foundStatsCount / 60)
        : null;

    const badges = this.generateBadges(
      totalCost,
      avgWinrate,
      avgBuyMin,
      dbItems,
    );

    return {
      heroId,
      totalCost,
      buildWinrate: avgWinrate === null ? null : Number(avgWinrate.toFixed(2)),
      avgBuyMin,
      // По скольким предметам сборки нашлась статистика героя.
      itemsWithStats: foundStatsCount,
      badges,
      // findMany не сохраняет порядок из IN — возвращаем предметы в порядке сборки.
      items: itemIds
        .map((id) => dbItems.find((item) => item.id === BigInt(id))!)
        .map((item) => ({
          id: item.id,
          name: item.name,
          cost: item.cost,
          imageUrl: item.imageUrl,
        })),
    };
  }

  /** 12 самых покупаемых предметов героя в порядке покупки. */
  async getPopularBuild(heroId: number) {
    // Неизвестный id не должен уходить во внешний API и плодить ключи в Redis.
    const hero = await this.prismaService.hero.findUnique({
      where: { id: heroId },
      select: { id: true },
    });
    if (!hero) {
      throw new NotFoundException('Герой не найден');
    }

    const [heroStats, shopItems] = await Promise.all([
      this.getHeroItemStats(heroId),
      this.prismaService.item.findMany({ select: { id: true } }),
    ]);

    const itemIds = pickPopularBuild(
      heroStats,
      new Set(shopItems.map((item) => item.id)),
    );

    if (itemIds.length === 0) {
      throw new NotFoundException('Мало статистики по этому герою');
    }

    return { heroId, itemIds };
  }

  // Статистика предметов героя общая для оценки сборки и популярной сборки.
  private async getHeroItemStats(heroId: number): Promise<IItemStat[]> {
    const cacheKey = `stats:hero:${heroId}:items`;
    const cached = await this.cacheManager.get<IItemStat[]>(cacheKey);
    if (cached) return cached;

    const heroStats = await this.deadlockApiClient.getHeroItemStats(heroId);
    await this.cacheManager.set(cacheKey, heroStats);
    return heroStats;
  }

  private generateBadges(
    cost: number,
    winrate: number | null,
    buyMin: number | null,
    items: Item[],
  ) {
    const badges: string[] = [];

    // Бейджи по винрейту имеют смысл только при наличии статистики.
    if (winrate !== null) {
      if (winrate > 53 && cost <= 8000) {
        badges.push('Темповый билд (дешево/эффективно)');
      } else if (winrate > 55 && cost > 15000) {
        badges.push('Лейт машина (дорого/надежно)');
      } else if (winrate < 48 && cost > 12000) {
        badges.push('Оверпрайс (мало импакта)');
      }
    }

    const hasSustain = items.some(
      (item) => item.category === 'vitality' || item.name.includes('Lifesteal'),
    );

    if (!hasSustain) {
      badges.push('Нет выживаемости');
    }

    if (winrate !== null && winrate > 58) {
      badges.push('Скрытая имба');
    }

    return badges.length > 0 ? badges : ['Стандартная сборка'];
  }
}
