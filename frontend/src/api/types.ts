// Типы, с которыми работают компоненты. Ответы бэкенда приводятся к ним
// в endpoints.ts — снаружи API-слоя snake_case и строковых чисел нет.

export type ItemCategory = 'weapon' | 'vitality' | 'spirit'

export type Hero = {
  id: number
  name: string
  imageUrl: string | null
  cardUrl: string | null
}

export type Item = {
  id: number
  name: string
  cost: number
  tier: number | null
  category: ItemCategory | null
  imageUrl: string | null
}

// Подсказка предмета — нормализованные на бэкенде данные (backend/src/sync/item-tooltip.ts), без HTML.
export type TooltipSegment = { text: string; highlight?: true }
export type TooltipParagraph = { segments: TooltipSegment[]; note?: true }
export type TooltipStat = { label: string; value: string; important?: true; negative?: true }
export type TooltipSection = {
  kind: 'innate' | 'passive' | 'active'
  paragraphs: TooltipParagraph[]
  stats: TooltipStat[]
  effects: string[]
  cooldown?: string
  duration?: string
}
export type ItemTooltipData = { nameRu: string; sections: TooltipSection[] }

export type CounterPick = {
  heroId: number
  winRate: number
  matches: number
  kda: number
}

export type SynergyPick = {
  heroId: number
  winRate: number
  matches: number
}

export type LaneStats = {
  myHeroId: number
  enemyHeroId: number
  winRate: number
  matches: number
}

export type ItemRecommendation = {
  itemId: number
  name: string
  cost: number
  category: ItemCategory | null
  imageUrl: string | null
  winRate: number
  avgBuyMin: number
}

export type BuildEvaluation = {
  heroId: number
  totalCost: number
  /** null — ни по одному предмету сборки нет статистики. */
  buildWinrate: number | null
  avgBuyMin: number | null
  /** Сколько предметов сборки нашлось в статистике героя. */
  itemsWithStats: number
  badges: string[]
  items: { id: number; name: string; cost: number; imageUrl: string | null }[]
}

export type SavedBuild = {
  id: string
  name: string
  createdAt: string
  /** Сборка принадлежит вошедшему пользователю — можно переименовать и удалить. */
  isOwner: boolean
  evaluation: BuildEvaluation
}

/** Строка списка «Мои сборки» — без оценки, она считается при открытии. */
export type MyBuild = {
  id: string
  name: string
  heroId: number
  itemIds: number[]
  createdAt: string
}
