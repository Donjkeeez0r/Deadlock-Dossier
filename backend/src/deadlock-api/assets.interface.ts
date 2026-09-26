// ГЕРОИ (HEROES)
export interface HeroImages {
  icon_image_small?: string;
  icon_image_small_webp?: string;
  icon_hero_card?: string;
  icon_hero_card_webp?: string;
  minimap_image?: string;
  minimap_image_webp?: string;
  hero_card_critical?: string;
  hero_card_critical_webp?: string;
}

export interface HeroAbility {
  id: number;
  name: string;
  class_name?: string;
  slot?: number;
  description?: string;
  image?: string;
  cooldown?: number;
}

export interface DeadlockHero {
  id: number;
  name: string;
  class_name: string;
  description?: string;
  images?: HeroImages;
  abilities?: HeroAbility[];
  complexity?: number;
  starting_stats?: Record<string, number | string>;
  player_selectable?: boolean;
  disabled?: boolean;
  in_development?: boolean;
}

// ПРЕДМЕТЫ (ITEMS)
export type ItemSlotType = 'weapon' | 'vitality' | 'spirit';
export type ItemActivation = 'passive' | 'active' | 'instant';

export interface ItemDescription {
  active?: string | null;
  desc?: string | null;
  passive?: string | null;
  quip?: string | null;
  t1_desc?: string | null;
  t2_desc?: string | null;
  t3_desc?: string | null;
  t4_desc?: string | null;
}

export interface DeadlockItem {
  id: number;
  name: string;
  class_name: string;
  item_slot_type: ItemSlotType;
  item_tier: number;
  cost: number;
  shopable: boolean;
  is_active_item: boolean;
  activation?: ItemActivation;
  image?: string;
  shop_image?: string;
  description?: ItemDescription;
}

// Lane matchup
export interface ILaneMatchupStat {
  assigned_lane: number;
  enemy_hero_ids: number[];
  hero_ids: number[];
  matches_played: number;
  net_worth_diff: number;
  sample_matches: number;
  sample_time_s: number;
  stats: Record<string, number | string>;
  wins: number;
}
