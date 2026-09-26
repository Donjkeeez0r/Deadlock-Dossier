import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import {
  DeadlockHero,
  DeadlockItem,
  ILaneMatchupStat,
} from './assets.interface';
import {
  IHeroCounterStat,
  IHeroSynergyStat,
  IItemStat,
} from '../analytics/analytics.interface';
import type { RawTooltipItem } from '../sync/item-tooltip';

@Injectable()
export class DeadlockApiClient {
  private readonly logger = new Logger(DeadlockApiClient.name);
  private readonly API_URL = 'https://api.deadlock-api.com/v1';

  constructor(private readonly httpService: HttpService) {}

  getHeroes() {
    return this.get<DeadlockHero[]>('/assets/heroes');
  }

  getItems() {
    return this.get<DeadlockItem[]>('/assets/items/by-type/upgrade');
  }

  /** Те же предметы с русскими названиями и тултипами. */
  getItemsRussian() {
    return this.get<(RawTooltipItem & { id: number })[]>(
      '/assets/items/by-type/upgrade?language=russian',
    );
  }

  getHeroesCounters(enemyHeroId: number) {
    return this.get<IHeroCounterStat[]>(
      `/analytics/hero-counter-stats?enemy_hero_id=${enemyHeroId}`,
    );
  }

  getHeroesSynergy(heroId: number) {
    return this.get<IHeroSynergyStat[]>(
      `/analytics/hero-synergy-stats?hero_id1=${heroId}`,
    );
  }

  getLaneMatchupStats(heroId: number, enemyHeroId: number) {
    return this.get<ILaneMatchupStat[]>(
      `/analytics/lane-matchup-stats?hero_ids=${heroId}&enemy_hero_id=${enemyHeroId}`,
    );
  }

  getTargetedItemStats(myHeroId: number, enemyHeroId: number, minMatches = 20) {
    return this.get<IItemStat[]>(
      `/analytics/item-stats?hero_ids=${myHeroId}&enemy_hero_ids=${enemyHeroId}&min_matches=${minMatches}`,
    );
  }

  getHeroItemStats(myHeroId: number) {
    return this.get<IItemStat[]>(
      `/analytics/item-stats?hero_ids=${myHeroId}&min_matches=50`,
    );
  }

  private async get<T>(path: string): Promise<T> {
    const request = this.httpService.get<T>(`${this.API_URL}${path}`).pipe(
      catchError((error: AxiosError) => {
        this.logger.error(
          `Ошибка запроса к Deadlock API (${path}): ${error.message}`,
        );
        throw new ServiceUnavailableException('Deadlock API недоступен');
      }),
    );

    const response = await firstValueFrom(request);
    return response.data;
  }
}
