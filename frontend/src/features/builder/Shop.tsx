import clsx from 'clsx'
import { useId, useState } from 'react'
import type { Item, ItemCategory } from '../../api/types'
import { ItemIcon, Souls } from '../../components/ItemTile'
import { ItemTooltip } from '../../components/ItemTooltip'
import { ErrorState, Skeleton, StateMessage } from '../../components/States'
import { useItems } from '../../hooks/queries'
import { draftStore, MAX_ITEMS, useDraft } from '../../lib/draft'
import { CATEGORY_LABEL, roman } from '../../lib/format'

const CATEGORIES: ItemCategory[] = ['weapon', 'vitality', 'spirit']

const TAB_ACTIVE: Record<ItemCategory, string> = {
  weapon: 'bg-weapon/15 text-weapon shadow-[inset_0_-3px_0_var(--color-weapon)]',
  vitality: 'bg-vitality/15 text-vitality shadow-[inset_0_-3px_0_var(--color-vitality)]',
  spirit: 'bg-spirit/15 text-spirit shadow-[inset_0_-3px_0_var(--color-spirit)]',
}

function ShopItem({ item, inBuild, full }: { item: Item; inBuild: boolean; full: boolean }) {
  const blocked = !inBuild && full
  return (
    <li>
      <ItemTooltip itemId={item.id} className="h-full">
        <button
          type="button"
          onClick={() => (inBuild ? draftStore.removeItem(item.id) : draftStore.addItem(item.id))}
          disabled={blocked}
          aria-pressed={inBuild}
          title={blocked ? `В сборке уже ${MAX_ITEMS} предметов` : undefined}
          className={clsx(
            'group flex w-full flex-col items-center gap-1.5 p-1.5 text-center transition-[background-color,box-shadow,opacity]',
            inBuild
              ? 'bg-soul/10 shadow-[inset_0_0_0_1px_var(--color-soul)]'
              : 'hover:bg-surface-3 hover:shadow-[inset_0_0_0_1px_rgb(201_162_90/0.45)]',
            blocked && 'cursor-not-allowed opacity-40',
          )}
        >
          <ItemIcon name={item.name} imageUrl={item.imageUrl} category={item.category} tier={item.tier} className="w-full max-w-16" />
          <span className="line-clamp-2 min-h-[2.4em] text-[0.78rem] leading-tight text-parchment">{item.name}</span>
          <Souls value={item.cost} className="text-xs text-soul" />
          {inBuild && <span className="sr-only">(в сборке, нажмите, чтобы убрать)</span>}
        </button>
      </ItemTooltip>
    </li>
  )
}

export function Shop() {
  const { data: items, isPending, isError, error, refetch } = useItems()
  const draft = useDraft()
  const [category, setCategory] = useState<ItemCategory>('weapon')
  const [tier, setTier] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const baseId = useId()

  const tiers = [...new Set((items ?? []).map((i) => i.tier).filter((t): t is number => t !== null))].sort((a, b) => a - b)
  const needle = query.trim().toLowerCase()
  // Поиск ищет по всем категориям — так быстрее найти предмет, не зная его цвета.
  const visible = (items ?? []).filter(
    (item) =>
      (needle ? item.name.toLowerCase().includes(needle) : item.category === category) &&
      (tier === null || item.tier === tier),
  )
  const byTier = [...new Set(visible.map((i) => i.tier))].map((t) => ({
    tier: t,
    list: visible.filter((i) => i.tier === t),
  }))
  const full = draft.itemIds.length >= MAX_ITEMS

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Категории предметов" className="grid grid-cols-3 border-b border-brass/20">
        {CATEGORIES.map((c) => {
          const active = !needle && c === category
          return (
            <button
              key={c}
              type="button"
              role="tab"
              id={`${baseId}-tab-${c}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel`}
              onClick={() => {
                setCategory(c)
                setQuery('')
              }}
              className={clsx(
                'poster h-11 text-base font-bold tracking-[0.1em] transition-colors',
                active ? TAB_ACTIVE[c] : 'text-parchment-muted hover:text-parchment',
              )}
            >
              {CATEGORY_LABEL[c]}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor={`${baseId}-search`}>
          Поиск предмета
        </label>
        <input
          id={`${baseId}-search`}
          type="search"
          autoComplete="off"
          placeholder="Поиск по всем предметам…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="cut h-10 min-w-0 flex-1 bg-surface-2 px-3.5 text-parchment shadow-[inset_0_0_0_1px_rgb(201_162_90/0.35)] placeholder:text-parchment-muted/70 [--cut:7px] focus:shadow-[inset_0_0_0_1px_var(--color-brass-light)] focus:outline-none"
        />
        <div role="group" aria-label="Фильтр по тиру" className="flex gap-1">
          {[null, ...tiers].map((t) => (
            <button
              key={t ?? 'all'}
              type="button"
              aria-pressed={tier === t}
              onClick={() => setTier(t)}
              className={clsx(
                'h-10 min-w-10 px-2.5 font-serif text-lg font-semibold transition-colors',
                tier === t ? 'bg-brass text-ink' : 'bg-surface-2 text-parchment-muted hover:text-parchment',
              )}
            >
              {t === null ? <span className="font-sans text-sm">Все</span> : roman(t)}
              {t !== null && <span className="sr-only">-й тир</span>}
            </button>
          ))}
        </div>
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${category}`}>
        {isPending ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
            {Array.from({ length: 15 }, (_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : items.length === 0 ? (
          <StateMessage title="Данные загружаются с серверов Deadlock">
            Магазин ещё синхронизируется. Обновите страницу через минуту.
          </StateMessage>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-parchment-muted">Ничего не нашлось. Сбросьте фильтр тира или измените запрос.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {byTier.map(({ tier: t, list }) => (
              <section key={t ?? 'none'} aria-label={t ? `Тир ${roman(t)}` : 'Без тира'}>
                <h3 className="mb-2 flex items-baseline gap-3 font-serif text-xl font-semibold text-brass-light">
                  {t ? `Тир ${roman(t)}` : 'Без тира'}
                  {needle && (
                    <span className="font-sans text-sm font-normal text-parchment-muted">
                      {[...new Set(list.map((i) => i.category))]
                        .map((c) => (c ? CATEGORY_LABEL[c] : ''))
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  )}
                </h3>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
                  {list.map((item) => (
                    <ShopItem key={item.id} item={item} inBuild={draft.itemIds.includes(item.id)} full={full} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      {!needle && (
        <p className="text-sm text-parchment-muted">
          Нажмите на предмет, чтобы добавить его в сборку, и ещё раз — чтобы убрать.
        </p>
      )}
    </div>
  )
}
