import { pickPopularBuild } from './popular-build';
import type { IItemStat } from './analytics.interface';

function stat(item_id: number, matches: number, buyMin: number): IItemStat {
  return {
    item_id,
    matches,
    wins: Math.round(matches / 2),
    losses: Math.round(matches / 2),
    players: matches,
    bucket: 0,
    avg_buy_time_s: buyMin * 60,
    avg_buy_time_relative: 0,
    avg_sell_time_s: 0,
    avg_sell_time_relative: 0,
  };
}

describe('pickPopularBuild', () => {
  it('берёт 12 самых покупаемых и сортирует по времени покупки', () => {
    const stats = Array.from({ length: 20 }, (_, i) =>
      // Чем больше i, тем популярнее предмет и тем раньше его покупают.
      stat(i + 1, 1000 + i * 10, 40 - i),
    );
    const shop = new Set(stats.map((s) => BigInt(s.item_id)));

    const result = pickPopularBuild(stats, shop);

    expect(result).toHaveLength(12);
    // Топ-12 по матчам — id 9..20; по времени покупки первым идёт самый ранний (id 20).
    expect(result).toEqual([20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9]);
  });

  it('пропускает предметы не из магазина', () => {
    const stats = [stat(1, 5000, 5), stat(2, 4000, 10), stat(3, 3000, 15)];
    const shop = new Set([1n, 3n]);

    expect(pickPopularBuild(stats, shop)).toEqual([1, 3]);
  });

  it('меньше двух предметов — пустой результат', () => {
    expect(pickPopularBuild([stat(1, 10, 1)], new Set([1n]))).toEqual([]);
    expect(pickPopularBuild([], new Set())).toEqual([]);
  });

  it('повторяющиеся строки одного предмета не дублируют его', () => {
    const stats = [stat(1, 500, 5), stat(1, 400, 6), stat(2, 300, 7)];
    expect(pickPopularBuild(stats, new Set([1n, 2n]))).toEqual([1, 2]);
  });
});
