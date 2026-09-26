export interface IHeroCounterStat {
  assists: number;
  creeps: number;
  deaths: number;
  denies: number;
  enemy_creeps: number;
  enemy_deaths: number;
  enemy_denies: number;
  enemy_hero_id: number;
  enemy_kills: number;
  enemy_last_hits: number;
  enemy_networth: number;
  enemy_obj_damage: number;
  hero_id: number;
  kills: number;
  last_hits: number;
  matches_played: number;
  networth: number;
  obj_damage: number;
  wins: number;
}

export interface IHeroSynergyStat {
  assists1: number;
  assists2: number;
  creeps1: number;
  creeps2: number;
  deaths1: number;
  deaths2: number;
  denies1: number;
  denies2: number;
  hero_id1: number;
  hero_id2: number;
  kills1: number;
  kills2: number;
  last_hits1: number;
  last_hits2: number;
  matches_played: number;
  networth1: number;
  networth2: number;
  obj_damage1: number;
  obj_damage2: number;
  wins: number;
}

export interface IItemStat {
  avg_buy_time_relative: number;
  avg_buy_time_s: number;
  avg_sell_time_relative: number;
  avg_sell_time_s: number;
  bucket: number;
  item_id: number;
  losses: number;
  matches: number;
  players: number;
  wins: number;
}
