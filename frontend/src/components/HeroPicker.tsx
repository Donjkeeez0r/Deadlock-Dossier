import clsx from 'clsx'
import { useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Hero } from '../api/types'
import { useHeroes } from '../hooks/queries'
import { HeroPortrait } from './HeroPortrait'
import { ErrorState, Skeleton, StateMessage } from './States'

type HeroPickerProps = {
  selectedId?: number | null
  onSelect: (hero: Hero) => void
  /** Герои, которых выбрать нельзя (например, уже выбранный соперник). */
  disabledIds?: number[]
  autoFocus?: boolean
  className?: string
}

export function HeroesEmpty() {
  return (
    <StateMessage title="Данные загружаются с серверов Deadlock">
      Список героев ещё синхронизируется. Обновите страницу через минуту.
    </StateMessage>
  )
}

/** Сетка иконок героев с поиском по имени и навигацией стрелками. */
export function HeroPicker({ selectedId, onSelect, disabledIds = [], autoFocus, className }: HeroPickerProps) {
  const { data: heroes, isPending, isError, error, refetch } = useHeroes()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const searchId = useId()

  const needle = query.trim().toLowerCase()
  const visible = (heroes ?? []).filter((h) => h.name.toLowerCase().includes(needle))
  const current = Math.min(activeIndex, Math.max(visible.length - 1, 0))

  function focusCell(index: number) {
    setActiveIndex(index)
    const cell = gridRef.current?.querySelectorAll<HTMLButtonElement>('[data-hero-cell]')[index]
    cell?.focus()
  }

  function columns(): number {
    const grid = gridRef.current
    if (!grid) return 1
    return getComputedStyle(grid).gridTemplateColumns.split(' ').length
  }

  function choose(hero: Hero) {
    if (disabledIds.includes(hero.id)) return
    onSelect(hero)
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const cols = columns()
    const last = visible.length - 1
    const moves: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      ArrowDown: current + cols,
      ArrowUp: current - cols,
      Home: 0,
      End: last,
    }
    const next = moves[event.key]
    if (next === undefined) return
    event.preventDefault()
    if (event.key === 'ArrowUp' && next < 0) {
      document.getElementById(searchId)?.focus()
      return
    }
    focusCell(Math.min(Math.max(next, 0), last))
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && visible.length > 0) {
      event.preventDefault()
      focusCell(0)
    } else if (event.key === 'Enter' && needle) {
      const first = visible.find((h) => !disabledIds.includes(h.id))
      if (first) {
        event.preventDefault()
        choose(first)
      }
    }
  }

  return (
    <div className={clsx('flex flex-col gap-4', className)}>
      <label htmlFor={searchId} className="sr-only">
        Поиск героя по имени
      </label>
      <div className="cut relative bg-brass/40 p-px [--cut:8px]">
        <input
          id={searchId}
          type="search"
          autoComplete="off"
          data-autofocus={autoFocus || undefined}
          placeholder="Найти героя…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={onSearchKeyDown}
          className="cut block h-11 w-full bg-surface-2 px-4 text-parchment placeholder:text-parchment-muted/70 focus:outline-none [--cut:8px]"
        />
      </div>

      {isPending ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
          {Array.from({ length: 18 }, (_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : heroes.length === 0 ? (
        <HeroesEmpty />
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-parchment-muted">Героя с именем «{query.trim()}» нет. Проверьте написание.</p>
      ) : (
        <div
          ref={gridRef}
          role="listbox"
          aria-label="Герои"
          onKeyDown={onGridKeyDown}
          className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2"
        >
          {visible.map((hero, index) => {
            const selected = hero.id === selectedId
            const disabled = disabledIds.includes(hero.id)
            return (
              <button
                key={hero.id}
                type="button"
                data-hero-cell
                role="option"
                aria-selected={selected}
                aria-disabled={disabled}
                tabIndex={index === current ? 0 : -1}
                onFocus={() => setActiveIndex(index)}
                onClick={() => choose(hero)}
                className={clsx(
                  'group cut-sm relative flex flex-col overflow-hidden bg-surface-2 text-left transition-[box-shadow,filter] [--cut:7px]',
                  selected
                    ? 'shadow-[inset_0_0_0_2px_var(--color-soul),0_0_16px_rgb(95_224_192/0.3)]'
                    : 'shadow-[inset_0_0_0_1px_rgb(201_162_90/0.25)] hover:shadow-[inset_0_0_0_1px_var(--color-brass-light)]',
                  disabled && 'cursor-not-allowed opacity-35 grayscale',
                )}
              >
                <HeroPortrait hero={hero} className="w-full transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink via-ink/85 to-transparent px-1.5 pt-4 pb-1 text-center text-[0.72rem] leading-tight font-medium text-parchment">
                  {hero.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
