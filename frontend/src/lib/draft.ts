import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from './storage'

// Незаконченная сборка: общая для конструктора и матчапа («Добавить в сборку»).

export const MAX_ITEMS = 12
export const MIN_ITEMS = 2

const STORAGE_KEY = 'dossier.draft'

export type Draft = { heroId: number | null; itemIds: number[] }

function sanitize(value: Draft | null): Draft {
  const heroId = value && Number.isInteger(value.heroId) && value.heroId! > 0 ? value.heroId : null
  const itemIds = Array.isArray(value?.itemIds)
    ? [...new Set(value.itemIds.filter((id) => Number.isInteger(id) && id > 0))].slice(0, MAX_ITEMS)
    : []
  return { heroId, itemIds }
}

let draft: Draft = sanitize(readJson<Draft>(STORAGE_KEY))
const listeners = new Set<() => void>()

function set(next: Draft) {
  draft = next
  writeJson(STORAGE_KEY, draft)
  for (const listener of listeners) listener()
}

export type AddResult = 'added' | 'duplicate' | 'full'

export const draftStore = {
  get: () => draft,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  setHero(heroId: number | null) {
    set({ ...draft, heroId })
  },
  addItem(itemId: number): AddResult {
    if (draft.itemIds.includes(itemId)) return 'duplicate'
    if (draft.itemIds.length >= MAX_ITEMS) return 'full'
    set({ ...draft, itemIds: [...draft.itemIds, itemId] })
    return 'added'
  },
  removeItem(itemId: number) {
    set({ ...draft, itemIds: draft.itemIds.filter((id) => id !== itemId) })
  },
  moveItem(from: number, to: number) {
    const itemIds = [...draft.itemIds]
    const [moved] = itemIds.splice(from, 1)
    if (moved === undefined) return
    itemIds.splice(Math.min(to, itemIds.length), 0, moved)
    set({ ...draft, itemIds })
  },
  replace(next: Draft) {
    set(sanitize(next))
  },
  clearItems() {
    set({ ...draft, itemIds: [] })
  },
}

// Сборка, изменённая в соседней вкладке, подтягивается и сюда.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return
  draft = sanitize(readJson<Draft>(STORAGE_KEY))
  for (const listener of listeners) listener()
})

export function useDraft(): Draft {
  return useSyncExternalStore(draftStore.subscribe, draftStore.get)
}
