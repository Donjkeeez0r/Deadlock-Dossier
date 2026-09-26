import clsx from 'clsx'
import { useState } from 'react'
import type { BuildEvaluation } from '../../api/types'
import { errorMessage } from '../../api/client'
import { Button, ButtonLink } from '../../components/Button'
import { HeroPicker } from '../../components/HeroPicker'
import { HeroPortrait } from '../../components/HeroPortrait'
import { ItemTooltip } from '../../components/ItemTooltip'
import { ItemIcon, Souls } from '../../components/ItemTile'
import { Modal } from '../../components/Modal'
import { PageHeading, Panel } from '../../components/Panel'
import { ErrorState, StateMessage } from '../../components/States'
import { useCompareBuild, useHeroMap, useItemMap, useLoadPopularBuild } from '../../hooks/queries'
import { compareUrl } from '../../lib/compareSource'
import { draftStore, MAX_ITEMS, MIN_ITEMS, useDraft, type Draft } from '../../lib/draft'
import { plural } from '../../lib/format'
import { EvaluationView } from './EvaluationView'
import { SaveBuildDialog } from './SaveBuildDialog'
import { Shop } from './Shop'

function signature(heroId: number | null, itemIds: number[]): string {
  return `${heroId}:${[...itemIds].sort((a, b) => a - b).join(',')}`
}

/** Почему сборку пока нельзя оценить — или null, если можно. */
function draftProblem(draft: Draft): string | null {
  if (draft.heroId === null) return 'Выберите героя'
  const missing = MIN_ITEMS - draft.itemIds.length
  if (missing > 0) return `Добавьте ещё ${missing} ${plural(missing, 'предмет', 'предмета', 'предметов')} — минимум ${MIN_ITEMS}`
  return null
}

function BuildSlots() {
  const draft = useDraft()
  const items = useItemMap()
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label={`Предметы сборки, ${draft.itemIds.length} из ${MAX_ITEMS}`}>
      {Array.from({ length: MAX_ITEMS }, (_, index) => {
        const id = draft.itemIds[index]
        const item = id !== undefined ? items.get(id) : undefined
        if (id === undefined) {
          return (
            <li
              key={`empty-${index}`}
              onDragOver={(e) => dragFrom !== null && e.preventDefault()}
              onDrop={() => {
                if (dragFrom !== null) draftStore.moveItem(dragFrom, draft.itemIds.length - 1)
                setDragFrom(null)
              }}
              className="flex aspect-[4/5] items-center justify-center border border-dashed border-brass/30 text-brass-dark"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M9 1 17 9 9 17 1 9Z" fill="none" stroke="currentColor" />
              </svg>
              <span className="sr-only">Пустой слот</span>
            </li>
          )
        }
        const name = item?.name ?? `Предмет #${id}`
        return (
          <li
            key={id}
            draggable
            onDragStart={() => setDragFrom(index)}
            onDragEnd={() => setDragFrom(null)}
            onDragOver={(e) => dragFrom !== null && e.preventDefault()}
            onDrop={() => {
              if (dragFrom !== null && dragFrom !== index) draftStore.moveItem(dragFrom, index)
              setDragFrom(null)
            }}
            className={clsx(dragFrom === index && 'opacity-40')}
          >
            <ItemTooltip itemId={id}>
              <button
                type="button"
                onClick={() => draftStore.removeItem(id)}
                aria-label={`Убрать ${name} из сборки`}
                className="group relative flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 bg-surface-2 p-2 text-center shadow-[inset_0_0_0_1px_rgb(201_162_90/0.3)] transition-shadow hover:shadow-[inset_0_0_0_1px_var(--color-loss)]"
              >
                <ItemIcon name={name} imageUrl={item?.imageUrl ?? null} category={item?.category ?? null} tier={item?.tier} className="w-[58%]" />
                <span className="line-clamp-2 text-[0.78rem] leading-tight text-parchment">{name}</span>
                {item && <Souls value={item.cost} className="text-xs text-soul" />}
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-1.5 text-sm text-loss opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  ✕
                </span>
              </button>
            </ItemTooltip>
          </li>
        )
      })}
    </ol>
  )
}

export function BuilderPage() {
  const draft = useDraft()
  const heroes = useHeroMap()
  const items = useItemMap()
  const hero = draft.heroId !== null ? heroes.get(draft.heroId) : undefined
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmPopular, setConfirmPopular] = useState(false)
  const popular = useLoadPopularBuild()
  const [tab, setTab] = useState<'shop' | 'build'>('shop')
  const compare = useCompareBuild()
  // Последняя успешная оценка живёт отдельно от мутации, чтобы панель не пропадала при переоценке.
  const [result, setResult] = useState<{ sig: string; data: BuildEvaluation } | null>(null)

  const problem = draftProblem(draft)
  const current = signature(draft.heroId, draft.itemIds)
  const stale = result !== null && result.sig !== current
  const total = draft.itemIds.reduce((sum, id) => sum + (items.get(id)?.cost ?? 0), 0)

  function evaluateWith(heroId: number, itemIds: number[]) {
    const sig = signature(heroId, itemIds)
    compare.mutate({ heroId, itemIds }, { onSuccess: (data) => setResult({ sig, data }) })
  }

  function evaluate() {
    if (problem || draft.heroId === null) return
    evaluateWith(draft.heroId, draft.itemIds)
  }

  function loadPopular() {
    setConfirmPopular(false)
    if (draft.heroId === null) return
    // Пока идёт запрос, можно сменить героя или добавить предметы — тогда ответ уже не нужен.
    const snapshot = draftStore.get()
    popular.mutate(draft.heroId, {
      onSuccess: ({ heroId, itemIds }) => {
        if (draftStore.get() !== snapshot) return
        draftStore.replace({ heroId, itemIds })
        // Популярную сборку сразу оцениваем — ради этого её и берут.
        evaluateWith(heroId, itemIds)
      },
    })
  }

  function askPopular() {
    if (draft.itemIds.length > 0) setConfirmPopular(true)
    else loadPopular()
  }

  return (
    <div>
      <PageHeading title="Конструктор" lead="Соберите от двух до двенадцати предметов и проверьте, как такая сборка играет в реальных матчах." />

      <div role="group" aria-label="Режим конструктора" className="mb-4 grid grid-cols-2 gap-1 lg:hidden">
        {(['shop', 'build'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={clsx(
              'poster h-11 text-base font-bold tracking-[0.1em]',
              tab === t ? 'bg-brass text-ink' : 'bg-surface-2 text-parchment-muted',
            )}
          >
            {t === 'shop' ? 'Магазин' : `Сборка ${draft.itemIds.length}/${MAX_ITEMS}`}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <Panel title="Магазин" quiet className={clsx(tab !== 'shop' && 'hidden lg:block')}>
          <Shop />
        </Panel>

        <div className={clsx('flex flex-col gap-6 lg:sticky lg:top-24', tab !== 'build' && 'hidden lg:flex')}>
          <Panel title="Сборка" aside={<Souls value={total} className="text-base text-soul" />}>
            <div className="flex flex-col gap-5">
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="group flex items-center gap-4 bg-surface-2 p-2 pr-4 text-left shadow-[inset_0_0_0_1px_rgb(201_162_90/0.3)] hover:shadow-[inset_0_0_0_1px_var(--color-brass-light)]"
              >
                {hero ? (
                  <HeroPortrait hero={hero} className="cut-sm size-16" />
                ) : (
                  <div className="flex size-16 items-center justify-center bg-surface-3 text-brass" aria-hidden="true">
                    <svg width="26" height="26" viewBox="0 0 26 26">
                      <path d="M13 1 25 13 13 25 1 13Z M13 8v10M8 13h10" fill="none" stroke="currentColor" />
                    </svg>
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-parchment-muted">Герой</span>
                  <span className="poster block truncate text-2xl font-bold text-parchment">
                    {hero?.name ?? 'Не выбран'}
                  </span>
                </span>
                <span className="text-sm font-semibold text-brass-light group-hover:text-parchment">
                  {hero ? 'Сменить' : 'Выбрать'}
                </span>
              </button>

              <div className="flex flex-col gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={askPopular}
                  disabled={draft.heroId === null || popular.isPending}
                  title={draft.heroId === null ? 'Сначала выберите героя' : undefined}
                >
                  {popular.isPending ? 'Собираем…' : 'Популярная сборка'}
                </Button>
                {popular.isError && (
                  <p role="alert" className="text-center text-sm text-loss">
                    {errorMessage(popular.error)}
                  </p>
                )}
              </div>

              <BuildSlots />
              <p className="text-sm text-parchment-muted">
                Нажмите на предмет, чтобы убрать его. Перетаскивайте, чтобы поменять порядок.
              </p>

              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={evaluate} disabled={problem !== null || compare.isPending} aria-describedby={problem ? 'build-problem' : undefined}>
                  {compare.isPending ? 'Оцениваем…' : 'Оценить сборку'}
                </Button>
                {problem && (
                  <p id="build-problem" className="text-center text-sm text-brass-light" aria-live="polite">
                    {problem}
                  </p>
                )}
                {draft.itemIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      draftStore.clearItems()
                      compare.reset()
                      setResult(null)
                    }}
                    className="self-center text-sm text-parchment-muted underline-offset-4 hover:text-parchment hover:underline"
                  >
                    Убрать все предметы
                  </button>
                )}
              </div>
            </div>
          </Panel>

          {(result || compare.isError) && (
            <Panel title="Оценка" aside={stale ? 'сборка изменилась' : undefined}>
              {compare.isError ? (
                <ErrorState error={compare.error} onRetry={problem ? undefined : evaluate} />
              ) : result ? (
                <div className={clsx('flex flex-col gap-6 transition-opacity', (stale || compare.isPending) && 'opacity-50')}>
                  <EvaluationView evaluation={result.data} />
                  {stale ? (
                    <StateMessage title="Сборка изменилась" className="py-2">
                      Оцените её заново, чтобы сохранить и поделиться.
                    </StateMessage>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button variant="soul" size="lg" onClick={() => setSaving(true)}>
                        Сохранить и поделиться
                      </Button>
                      {draft.heroId !== null && (
                        <ButtonLink
                          variant="ghost"
                          to={compareUrl({ kind: 'custom', heroId: draft.heroId, itemIds: draft.itemIds })}
                        >
                          Сравнить с другой
                        </ButtonLink>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </Panel>
          )}
        </div>
      </div>

      <Modal open={picking} onClose={() => setPicking(false)} title="Герой сборки" wide>
        <HeroPicker
          autoFocus
          selectedId={draft.heroId}
          onSelect={(h) => {
            draftStore.setHero(h.id)
            popular.reset()
            setPicking(false)
          }}
        />
      </Modal>

      <Modal open={confirmPopular} onClose={() => setConfirmPopular(false)} title="Заменить сборку?">
        <div className="flex flex-col gap-4">
          <p className="text-parchment-muted">
            В сборке уже {draft.itemIds.length} {plural(draft.itemIds.length, 'предмет', 'предмета', 'предметов')}. Популярная
            сборка {hero ? `для ${hero.name} ` : ''}заменит их.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button onClick={loadPopular} className="sm:flex-1">
              Заменить
            </Button>
            <Button variant="ghost" onClick={() => setConfirmPopular(false)} className="sm:flex-1" data-autofocus>
              Отмена
            </Button>
          </div>
        </div>
      </Modal>

      {saving && draft.heroId !== null && (
        <SaveBuildDialog
          key={draft.heroId}
          open
          onClose={() => setSaving(false)}
          heroId={draft.heroId}
          itemIds={draft.itemIds}
          defaultName={hero ? `${hero.name}: моя сборка` : ''}
        />
      )}
    </div>
  )
}
