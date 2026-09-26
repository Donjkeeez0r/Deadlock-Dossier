import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  compareBuild,
  deleteBuild,
  fetchBuild,
  fetchCounters,
  fetchHeroes,
  fetchItemRecommendations,
  fetchItems,
  fetchItemTooltips,
  fetchLane,
  fetchMyBuilds,
  fetchPopularBuild,
  fetchSynergy,
  renameBuild,
  saveBuild,
} from '../api/endpoints'
import type { BuildEvaluation, Hero, Item } from '../api/types'
import type { CompareSource } from '../lib/compareSource'
import { useSession } from '../lib/auth'

// Справочники не меняются в течение сессии.
const STATIC = { staleTime: Infinity, gcTime: Infinity } as const

export function useHeroes() {
  return useQuery({ queryKey: ['heroes'], queryFn: fetchHeroes, ...STATIC })
}

export function useItems() {
  return useQuery({ queryKey: ['items'], queryFn: fetchItems, ...STATIC })
}

/** Подсказки грузятся одним куском при первом наведении; дальше берутся из кэша. */
export function useItemTooltips(enabled: boolean) {
  return useQuery({ queryKey: ['item-tooltips'], queryFn: fetchItemTooltips, enabled, ...STATIC })
}

export function useHeroMap(): Map<number, Hero> {
  const { data } = useHeroes()
  return new Map((data ?? []).map((hero) => [hero.id, hero]))
}

export function useItemMap(): Map<number, Item> {
  const { data } = useItems()
  return new Map((data ?? []).map((item) => [item.id, item]))
}

export function useCounters(enemyHeroId: number | null) {
  return useQuery({
    queryKey: ['counters', enemyHeroId],
    queryFn: ({ signal }) => fetchCounters(enemyHeroId!, signal),
    enabled: enemyHeroId !== null,
  })
}

export function useSynergy(heroId: number | null) {
  return useQuery({
    queryKey: ['synergy', heroId],
    queryFn: ({ signal }) => fetchSynergy(heroId!, signal),
    enabled: heroId !== null,
  })
}

export function useLane(myHeroId: number | null, enemyHeroId: number | null) {
  return useQuery({
    queryKey: ['lane', myHeroId, enemyHeroId],
    queryFn: ({ signal }) => fetchLane(myHeroId!, enemyHeroId!, signal),
    enabled: myHeroId !== null && enemyHeroId !== null,
  })
}

export function useItemRecommendations(myHeroId: number | null, enemyHeroId: number | null) {
  return useQuery({
    queryKey: ['item-recommendations', myHeroId, enemyHeroId],
    queryFn: ({ signal }) => fetchItemRecommendations(myHeroId!, enemyHeroId!, signal),
    enabled: myHeroId !== null && enemyHeroId !== null,
  })
}

const popularBuildQuery = (heroId: number) => ({
  queryKey: ['popular-build', heroId],
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchPopularBuild(heroId, signal),
})

/** Загружает популярную сборку по требованию (кнопка в конструкторе), кэш общий со сравнением. */
export function useLoadPopularBuild() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (heroId: number) => queryClient.fetchQuery(popularBuildQuery(heroId)) })
}

export type CompareSide = { name: string; evaluation: BuildEvaluation; savedId?: string }

/** Оценка одной стороны сравнения — из сохранённой сборки, популярной или произвольного состава. */
export function useCompareSide(source: CompareSource | null) {
  const email = useSession()?.email ?? null
  const shareId = source?.kind === 'saved' ? source.shareId : ''
  const heroId = source && source.kind !== 'saved' ? source.heroId : null

  const saved = useQuery({
    queryKey: buildsKeys.one(shareId, email),
    queryFn: ({ signal }) => fetchBuild(shareId, signal),
    enabled: source?.kind === 'saved',
    staleTime: Infinity,
  })
  const popular = useQuery({
    ...popularBuildQuery(heroId ?? 0),
    enabled: source?.kind === 'popular',
  })
  const itemIds = source?.kind === 'custom' ? source.itemIds : source?.kind === 'popular' ? popular.data?.itemIds : undefined
  const evaluated = useQuery({
    queryKey: ['evaluation', heroId, itemIds?.join(',')],
    queryFn: () => compareBuild(heroId!, itemIds!),
    enabled: heroId !== null && itemIds !== undefined,
  })

  if (!source) return null
  if (source.kind === 'saved') {
    return {
      isPending: saved.isPending,
      error: saved.error,
      refetch: saved.refetch,
      data: saved.data
        ? ({ name: saved.data.name, evaluation: saved.data.evaluation, savedId: saved.data.id } satisfies CompareSide)
        : undefined,
    }
  }
  const failed = popular.error ?? evaluated.error
  return {
    isPending: !failed && evaluated.isPending,
    error: failed,
    refetch: () => void (popular.error ? popular.refetch() : evaluated.refetch()),
    data: evaluated.data
      ? ({ name: source.kind === 'popular' ? 'Популярная сборка' : 'Сборка из конструктора', evaluation: evaluated.data } satisfies CompareSide)
      : undefined,
  }
}

export function useCompareBuild() {
  return useMutation({
    mutationFn: ({ heroId, itemIds }: { heroId: number; itemIds: number[] }) => compareBuild(heroId, itemIds),
  })
}

// Ключи сборок включают email: ответ зависит от того, кто спрашивает (isOwner, список «Моих сборок»).
const buildsKeys = {
  all: ['builds'] as const,
  mine: (email: string | null) => ['builds', 'mine', email] as const,
  one: (shareId: string, email: string | null) => ['builds', 'one', shareId, email] as const,
}

export function useSaveBuild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, heroId, itemIds }: { name: string; heroId: number; itemIds: number[] }) =>
      saveBuild(name, heroId, itemIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['builds', 'mine'] }),
  })
}

export function useBuild(shareId: string) {
  const email = useSession()?.email ?? null
  return useQuery({
    queryKey: buildsKeys.one(shareId, email),
    queryFn: ({ signal }) => fetchBuild(shareId, signal),
    staleTime: Infinity,
  })
}

export function useMyBuilds() {
  const email = useSession()?.email ?? null
  return useQuery({
    queryKey: buildsKeys.mine(email),
    queryFn: ({ signal }) => fetchMyBuilds(signal),
    enabled: email !== null,
  })
}

export function useRenameBuild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ shareId, name }: { shareId: string; name: string }) => renameBuild(shareId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: buildsKeys.all }),
  })
}

export function useDeleteBuild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (shareId: string) => deleteBuild(shareId),
    onSuccess: (_, shareId) => {
      // Открытую страницу удалённой сборки не трогаем — она ответила бы 404 под окном, пока идёт переход;
      // её кэш убирает сама страница после ухода (removeDeletedBuild). Неактивные записи удаляем сразу.
      queryClient.removeQueries({ queryKey: ['builds', 'one', shareId], type: 'inactive' })
      return queryClient.invalidateQueries({ queryKey: ['builds', 'mine'] })
    },
  })
}

/** Убирает из кэша удалённую сборку, когда её страница уже закрыта. */
export function useRemoveDeletedBuild() {
  const queryClient = useQueryClient()
  return (shareId: string) => queryClient.removeQueries({ queryKey: ['builds', 'one', shareId] })
}
