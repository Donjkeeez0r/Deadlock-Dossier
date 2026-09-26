import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeadlockApiClient } from '../deadlock-api/deadlock-api.client';
import { Prisma } from '@prisma/client';
import { buildItemTooltip } from './item-tooltip';

// В обычном магазине Deadlock четыре тира. Тир 5 — легендарные предметы режима
// Street Brawl: они помечены shopable, но цена у них заглушка 9999, а картинки
// лежат в images/items/brawl/. Отдельного признака режима API не отдаёт.
const MAX_SHOP_TIER = 4;

@Processor('assets-sync')
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deadlockApi: DeadlockApiClient,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Начало обработки задачи: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case 'sync-heroes':
        await this.handleSyncHeroes();
        break;
      case 'sync-items':
        await this.handleSyncItems();
        break;
      default:
        this.logger.warn(`Неизвестная задача: ${job.name}`);
    }
  }

  private async handleSyncHeroes() {
    const heroes = await this.deadlockApi.getHeroes();
    for (const hero of heroes) {
      const data = {
        name: hero.name,
        imageUrl:
          hero.images?.icon_image_small_webp ?? hero.images?.icon_image_small,
        cardUrl:
          hero.images?.icon_hero_card_webp ?? hero.images?.icon_hero_card,
        isPlayable:
          hero.player_selectable === true &&
          !hero.disabled &&
          !hero.in_development,
      };

      await this.prisma.hero.upsert({
        where: { id: hero.id },
        update: data,
        create: { id: hero.id, ...data },
      });
    }

    // upsert не убирает героев, пропавших из API, — удаляем их отдельно.
    // Пустой ответ считаем сбоем API и ничего не трогаем.
    if (heroes.length > 0) {
      const { count } = await this.prisma.hero.deleteMany({
        where: { id: { notIn: heroes.map((hero) => hero.id) } },
      });
      if (count > 0) {
        this.logger.log(`Удалено героев, пропавших из API: ${count}`);
      }
    }
    this.logger.log('✅ Герои синхронизированы');
  }

  private async handleSyncItems() {
    const items = (await this.deadlockApi.getItems()).filter(
      (item) =>
        item.shopable && item.item_tier >= 1 && item.item_tier <= MAX_SHOP_TIER,
    );

    const localized = await this.loadRussianTooltips();

    for (const item of items) {
      // Без русской выгрузки старые подсказки не трогаем.
      const ru = localized.get(item.id) ?? {};
      try {
        await this.prisma.item.upsert({
          where: { id: item.id },
          update: {
            name: item.name,
            cost: item.cost ?? 0,
            tier: item.item_tier,
            category: item.item_slot_type,
            imageUrl: item.shop_image ?? item.image,
            ...ru,
          },
          create: {
            id: item.id,
            name: item.name,
            cost: item.cost ?? 0,
            tier: item.item_tier,
            category: item.item_slot_type,
            imageUrl: item.shop_image ?? item.image,
            ...ru,
          },
        });
      } catch (error) {
        this.logger.error(
          `Ошибка при сохранении предмета ${item.id} (${item.name}): ${error}`,
        );
      }
    }

    // upsert не убирает предметы, пропавшие из магазина, — удаляем их отдельно.
    // Пустой ответ считаем сбоем API и ничего не трогаем.
    if (items.length > 0) {
      const { count } = await this.prisma.item.deleteMany({
        where: { id: { notIn: items.map((item) => item.id) } },
      });
      if (count > 0) {
        this.logger.log(`Удалено предметов вне магазина: ${count}`);
      }
    }
    this.logger.log('✅ Предметы синхронизированы');
  }

  /** Русские названия и тултипы по id. Сбой API не валит синк — вернётся пустая карта. */
  private async loadRussianTooltips() {
    const result = new Map<
      number,
      { nameRu: string; tooltip: Prisma.InputJsonValue }
    >();
    let raws: Awaited<ReturnType<DeadlockApiClient['getItemsRussian']>>;
    try {
      raws = await this.deadlockApi.getItemsRussian();
    } catch (error) {
      this.logger.warn(
        `Русские тултипы не загружены, оставляем прежние: ${error}`,
      );
      return result;
    }

    // Сбой разбора одного предмета не должен лишать подсказок остальные.
    for (const raw of raws) {
      try {
        const tooltip = buildItemTooltip(raw);
        result.set(raw.id, {
          nameRu: tooltip.nameRu,
          tooltip,
        });
      } catch (error) {
        this.logger.warn(
          `Не удалось разобрать подсказку предмета ${raw.id} (${raw.name}): ${error}`,
        );
      }
    }
    return result;
  }
}
