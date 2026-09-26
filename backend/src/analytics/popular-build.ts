import type { IItemStat } from './analytics.interface';

export const POPULAR_BUILD_SIZE = 12;
const MIN_ITEMS = 2;

/**
 * Популярная сборка героя: самые покупаемые предметы магазина в порядке покупки.
 * Возвращает id предметов; меньше двух — пустой массив (собрать нечего).
 */
export function pickPopularBuild(
  stats: IItemStat[],
  shopItemIds: Set<bigint>,
): number[] {
  const seen = new Set<number>();
  const picked = [...stats]
    .filter((s) => shopItemIds.has(BigInt(s.item_id)))
    .sort((a, b) => b.matches - a.matches)
    .filter((s) => !seen.has(s.item_id) && seen.add(s.item_id))
    .slice(0, POPULAR_BUILD_SIZE)
    .sort((a, b) => a.avg_buy_time_s - b.avg_buy_time_s)
    .map((s) => s.item_id);

  return picked.length >= MIN_ITEMS ? picked : [];
}
