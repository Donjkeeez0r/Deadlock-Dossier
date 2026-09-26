import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import type { SavedBuild } from '../../api/types'
import { Button, ButtonLink } from '../../components/Button'
import { compareUrl } from '../../lib/compareSource'
import { HeroPortrait } from '../../components/HeroPortrait'
import { ItemIcon, Souls } from '../../components/ItemTile'
import { ItemTooltip } from '../../components/ItemTooltip'
import { Panel, Rule } from '../../components/Panel'
import { ErrorState, Skeleton, StateMessage } from '../../components/States'
import { useBuild, useHeroes, useHeroMap, useItemMap, useRemoveDeletedBuild } from '../../hooks/queries'
import { draftStore } from '../../lib/draft'
import { formatDate } from '../../lib/format'
import { EvaluationView } from '../builder/EvaluationView'
import { DeleteBuildDialog, RenameBuildDialog } from '../my-builds/BuildDialogs'

function BuildNotFound() {
  return (
    <div className="mx-auto max-w-xl py-10">
      <StateMessage
        title="Такой сборки нет"
        action={
          <ButtonLink to="/builder" variant="ghost">
            Собрать свою
          </ButtonLink>
        }
      >
        Возможно, в ссылке опечатка или сборку не сохранили. Проверьте адрес у того, кто её прислал.
      </StateMessage>
    </div>
  )
}

/** Место портрета, когда героя сборки больше нет в игре (или список героев не загрузился). */
function HeroPlaceholder({ title, text }: { title: string; text: string }) {
  return (
    <div className="frame frame-quiet [--cut:16px]">
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-4 px-6 text-center">
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className="text-brass-dark">
          <path d="M28 2 54 28 28 54 2 28Z" fill="none" stroke="currentColor" />
          <path d="M28 12 44 28 28 44 12 28Z" fill="none" stroke="currentColor" opacity="0.6" />
          <path d="M20 20 36 36M36 20 20 36" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <p className="font-serif text-2xl text-parchment">{title}</p>
        <p className="text-sm text-parchment-muted">{text}</p>
      </div>
    </div>
  )
}

function BuildView({ build }: { build: SavedBuild }) {
  const heroes = useHeroMap()
  const heroesQuery = useHeroes()
  const items = useItemMap()
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<'rename' | 'delete' | null>(null)
  const removeDeletedBuild = useRemoveDeletedBuild()
  const { evaluation } = build
  const hero = heroes.get(evaluation.heroId)
  // Список героев загружен, а героя сборки в нём нет — его убрали из игры.
  const heroGone = heroesQuery.isSuccess && !hero

  function openInBuilder() {
    // Недоступного героя в конструктор не переносим: иначе оценка пойдёт по герою, которого нельзя выбрать.
    draftStore.replace({ heroId: heroGone ? null : evaluation.heroId, itemIds: evaluation.items.map((i) => i.id) })
    void navigate('/builder')
  }

  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-10">
      <div className="mx-auto w-full max-w-[20rem]">
        {hero ? (
          <div className="frame [--cut:16px] [--frame-line:var(--color-brass)]">
            <div className="relative m-[5px] overflow-hidden [clip-path:polygon(11px_0,calc(100%-11px)_0,100%_11px,100%_calc(100%-11px),calc(100%-11px)_100%,11px_100%,0_calc(100%-11px),0_11px)]">
              <HeroPortrait hero={hero} variant="card" eager className="w-full" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent px-4 pt-16 pb-4 text-center">
                <span className="poster block text-4xl font-bold text-parchment">{hero.name}</span>
              </div>
            </div>
          </div>
        ) : heroGone ? (
          <HeroPlaceholder
            title="Герой больше не доступен"
            text="Этого героя убрали из игры. Предметы и оценка сборки сохранились."
          />
        ) : heroesQuery.isError ? (
          <HeroPlaceholder title="Героя не удалось загрузить" text="Обновите страницу, чтобы попробовать ещё раз." />
        ) : (
          <Skeleton className="aspect-[3/4]" />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <header>
          <p className="text-parchment-muted">Сборка от {formatDate(build.createdAt)}</p>
          <h1 className="poster mt-2 text-[clamp(2.4rem,6vw,4rem)] font-bold break-words text-parchment">{build.name}</h1>
          {build.isOwner && (
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDialog('rename')}>
                Переименовать
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDialog('delete')}>
                Удалить
              </Button>
            </div>
          )}
        </header>

        <Panel title="Предметы" aside={<Souls value={evaluation.totalCost} className="text-base text-soul" />} quiet>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {evaluation.items.map((item) => {
              const full = items.get(item.id)
              return (
                <li key={item.id} className="flex flex-col items-center gap-1.5 text-center">
                  <ItemTooltip itemId={item.id} focusLabel={item.name} className="w-full max-w-20">
                    <ItemIcon
                      name={item.name}
                      imageUrl={item.imageUrl}
                      category={full?.category ?? null}
                      tier={full?.tier}
                      className="w-full"
                    />
                  </ItemTooltip>
                  <span className="line-clamp-2 text-sm leading-tight text-parchment">{item.name}</span>
                  <Souls value={item.cost} className="text-xs text-soul" />
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Оценка">
          <EvaluationView evaluation={evaluation} />
        </Panel>

        <Rule />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={openInBuilder} className="shrink-0">
            Открыть в конструкторе
          </Button>
          <ButtonLink size="lg" variant="ghost" to={compareUrl({ kind: 'saved', shareId: build.id })} className="shrink-0">
            Сравнить
          </ButtonLink>
          <p className="self-center text-sm text-parchment-muted">
            {heroGone
              ? 'Текущая незаконченная сборка будет заменена этой. Героя нужно будет выбрать заново.'
              : 'Текущая незаконченная сборка будет заменена этой.'}
          </p>
        </div>
      </div>

      {dialog === 'rename' && <RenameBuildDialog build={build} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && (
        <DeleteBuildDialog
          build={build}
          onClose={() => setDialog(null)}
          onDeleted={() => void Promise.resolve(navigate('/my-builds', { replace: true })).then(() => removeDeletedBuild(build.id))}
        />
      )}
    </article>
  )
}

export function BuildViewPage() {
  const { shareId = '' } = useParams()
  const { data, isPending, isError, error, refetch } = useBuild(shareId)

  if (isPending) {
    return (
      <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        <Skeleton className="mx-auto aspect-[3/4] w-full max-w-[20rem]" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }
  // Невалидный uuid бэкенд тоже может вернуть как 400/404 — для пользователя это одно и то же.
  if (isError && error instanceof ApiError && (error.status === 404 || error.status === 400)) return <BuildNotFound />
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  return <BuildView build={data} />
}
