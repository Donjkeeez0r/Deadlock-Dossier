import { request } from './client'
import type {
  BuildEvaluation,
  CounterPick,
  Hero,
  Item,
  ItemCategory,
  ItemRecommendation,
  ItemTooltipData,
  LaneStats,
  MyBuild,
  SavedBuild,
  SynergyPick,
} from './types'

// --- Сырые ответы бэкенда ---------------------------------------------------

type RawHero = {
  id: number
  name: string
  imageUrl: string | null
  cardUrl: string | null
}

type RawItem = {
  id: number
  name: string
  cost: number
  tier: number | null
  category: string | null
  imageUrl: string | null
}

type RawCounter = { hero_id: number; win_rate: number; matches: number; kda_ratio: number }
type RawSynergy = { ally_hero_id: number; winrate: number; matches: number }
type RawLane = { my_hero_id: number; enemy_hero_id: number; winrate: number; matches: number }
type RawRecommendation = {
  item_id: number
  name: string
  cost: number
  category: string
  image_url: string | null
  win_rate: string
  avg_buy_min: number
}

// --- Нормализация -----------------------------------------------------------

function toCategory(value: string | null | undefined): ItemCategory | null {
  return value === 'weapon' || value === 'vitality' || value === 'spirit' ? value : null
}

/**
 * Страховка от повторов в ответах аналитики: оставляем первую запись —
 * списки приходят уже отсортированными по винрейту.
 */
function uniqueBy<T, K>(list: T[], key: (item: T) => K): T[] {
  const seen = new Set<K>()
  return list.filter((item) => {
    const k = key(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

// --- Ассеты -----------------------------------------------------------------

export async function fetchHeroes(): Promise<Hero[]> {
  const raw = await request<RawHero[]>('/assets/heroes')
  return raw.map(({ id, name, imageUrl, cardUrl }) => ({ id, name, imageUrl, cardUrl }))
}

export async function fetchItems(): Promise<Item[]> {
  const raw = await request<RawItem[]>('/assets/items')
  return raw.map((item) => ({
    id: item.id,
    name: item.name,
    cost: item.cost,
    tier: item.tier,
    category: toCategory(item.category),
    imageUrl: item.imageUrl,
  }))
}

/** Подсказки всех предметов магазина: id → данные. */
export function fetchItemTooltips(): Promise<Record<string, ItemTooltipData>> {
  return request<Record<string, ItemTooltipData>>('/assets/items/tooltips')
}

// --- Аналитика --------------------------------------------------------------

export async function fetchCounters(enemyHeroId: number, signal?: AbortSignal): Promise<CounterPick[]> {
  const raw = await request<RawCounter[]>('/analytics/counters', { query: { enemyHeroId }, signal })
  return uniqueBy(raw, (r) => r.hero_id).map((r) => ({
    heroId: r.hero_id,
    winRate: r.win_rate,
    matches: r.matches,
    kda: r.kda_ratio,
  }))
}

export async function fetchSynergy(heroId: number, signal?: AbortSignal): Promise<SynergyPick[]> {
  const raw = await request<RawSynergy[]>('/analytics/synergy', { query: { heroId }, signal })
  return uniqueBy(raw, (r) => r.ally_hero_id).map((r) => ({
    heroId: r.ally_hero_id,
    winRate: r.winrate,
    matches: r.matches,
  }))
}

export async function fetchLane(myHeroId: number, enemyHeroId: number, signal?: AbortSignal): Promise<LaneStats> {
  const r = await request<RawLane>('/analytics/lane', { query: { myHeroId, enemyHeroId }, signal })
  return { myHeroId: r.my_hero_id, enemyHeroId: r.enemy_hero_id, winRate: r.winrate, matches: r.matches }
}

export async function fetchItemRecommendations(
  myHeroId: number,
  enemyHeroId: number,
  signal?: AbortSignal,
): Promise<ItemRecommendation[]> {
  const raw = await request<RawRecommendation[]>('/analytics/items/recommendations', {
    query: { myHeroId, enemyHeroId },
    signal,
  })
  return uniqueBy(raw, (r) => r.item_id).map((r) => ({
    itemId: r.item_id,
    name: r.name,
    cost: r.cost,
    category: toCategory(r.category),
    imageUrl: r.image_url,
    winRate: Number(r.win_rate),
    avgBuyMin: r.avg_buy_min,
  }))
}

export function compareBuild(heroId: number, itemIds: number[]): Promise<BuildEvaluation> {
  return request<BuildEvaluation>('/analytics/compare', { method: 'POST', body: { heroId, itemIds } })
}

/** 12 самых покупаемых предметов героя в порядке покупки. */
export function fetchPopularBuild(heroId: number, signal?: AbortSignal): Promise<{ heroId: number; itemIds: number[] }> {
  return request('/analytics/popular-build', { query: { heroId }, signal })
}

// --- Сборки -----------------------------------------------------------------

/** owned — сборка записана в аккаунт вошедшего пользователя. */
export type SaveBuildResult = { shareId: string; owned: boolean }

export function saveBuild(name: string, heroId: number, itemIds: number[]): Promise<SaveBuildResult> {
  return request<SaveBuildResult>('/api/builds', { method: 'POST', body: { name, heroId, itemIds } })
}

export function fetchMyBuilds(signal?: AbortSignal): Promise<MyBuild[]> {
  return request<MyBuild[]>('/api/builds/mine', { signal })
}

export function renameBuild(shareId: string, name: string): Promise<{ id: string; name: string }> {
  return request(`/api/builds/${encodeURIComponent(shareId)}`, { method: 'PATCH', body: { name } })
}

export function deleteBuild(shareId: string): Promise<void> {
  return request<void>(`/api/builds/${encodeURIComponent(shareId)}`, { method: 'DELETE' })
}

export function fetchBuild(shareId: string, signal?: AbortSignal): Promise<SavedBuild> {
  return request<SavedBuild>(`/api/builds/${encodeURIComponent(shareId)}`, { signal })
}

// --- Авторизация ------------------------------------------------------------

export function login(email: string, password: string): Promise<{ access_token: string }> {
  return request('/auth/login', { method: 'POST', body: { email, password } })
}

export function register(email: string, password: string): Promise<{ access_token: string }> {
  return request('/auth/register', { method: 'POST', body: { email, password } })
}
