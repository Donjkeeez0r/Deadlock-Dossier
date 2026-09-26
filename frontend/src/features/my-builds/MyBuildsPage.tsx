import { useState } from 'react'
import { Link } from 'react-router'
import type { MyBuild } from '../../api/types'
import { Button, ButtonLink } from '../../components/Button'
import { compareUrl } from '../../lib/compareSource'
import { HeroPortrait } from '../../components/HeroPortrait'
import { ItemIcon } from '../../components/ItemTile'
import { ItemTooltip } from '../../components/ItemTooltip'
import { PageHeading } from '../../components/Panel'
import { ErrorState, Skeleton, StateMessage } from '../../components/States'
import { useHeroMap, useItemMap, useMyBuilds } from '../../hooks/queries'
import { useSession } from '../../lib/auth'
import { formatDate, plural } from '../../lib/format'
import { DeleteBuildDialog, RenameBuildDialog } from './BuildDialogs'

type Dialog = { kind: 'rename' | 'delete'; build: MyBuild } | null

function BuildCard({ build, onRename, onDelete }: { build: MyBuild; onRename: () => void; onDelete: () => void }) {
  const hero = useHeroMap().get(build.heroId)
  const items = useItemMap()

  return (
    <li className="frame frame-quiet flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
      <Link to={`/build/${build.id}`} className="group flex min-w-0 flex-1 items-center gap-4">
        {hero ? (
          <HeroPortrait hero={hero} className="size-16 shrink-0 sm:size-20" />
        ) : (
          <div className="size-16 shrink-0 bg-surface-3 sm:size-20" aria-hidden="true" />
        )}
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="font-serif text-2xl leading-tight break-words text-parchment group-hover:text-brass-light">
            {build.name}
          </h2>
          <p className="text-sm text-parchment-muted">
            {hero?.name ?? 'Герой недоступен'} · {formatDate(build.createdAt)}
          </p>
          <ul className="flex flex-wrap gap-1" aria-label={`${build.itemIds.length} ${plural(build.itemIds.length, 'предмет', 'предмета', 'предметов')}`}>
            {build.itemIds.map((id) => {
              const item = items.get(id)
              return (
                <li key={id}>
                  <ItemTooltip itemId={id}>
                    <ItemIcon
                      name={item?.name ?? '?'}
                      imageUrl={item?.imageUrl ?? null}
                      category={item?.category ?? null}
                      className="size-8"
                    />
                  </ItemTooltip>
                </li>
              )
            })}
          </ul>
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
        <ButtonLink variant="ghost" size="sm" to={compareUrl({ kind: 'saved', shareId: build.id })} className="col-span-2" aria-label={`Сравнить «${build.name}»`}>
          Сравнить
        </ButtonLink>
        <Button variant="ghost" size="sm" onClick={onRename} aria-label={`Переименовать «${build.name}»`}>
          Переименовать
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} aria-label={`Удалить «${build.name}»`}>
          Удалить
        </Button>
      </div>
    </li>
  )
}

function BuildList() {
  const { data, isPending, isError, error, refetch } = useMyBuilds()
  const [dialog, setDialog] = useState<Dialog>(null)

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    )
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (data.length === 0) {
    return (
      <StateMessage
        title="Сборок пока нет"
        action={
          <ButtonLink to="/builder" variant="ghost">
            Собрать первую
          </ButtonLink>
        }
      >
        Соберите предметы в конструкторе и нажмите «Сохранить» — сборка появится здесь.
      </StateMessage>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-4">
        {data.map((build) => (
          <BuildCard
            key={build.id}
            build={build}
            onRename={() => setDialog({ kind: 'rename', build })}
            onDelete={() => setDialog({ kind: 'delete', build })}
          />
        ))}
      </ul>
      {dialog?.kind === 'rename' && (
        <RenameBuildDialog key={dialog.build.id} build={dialog.build} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteBuildDialog key={dialog.build.id} build={dialog.build} onClose={() => setDialog(null)} />
      )}
    </>
  )
}

export function MyBuildsPage() {
  const session = useSession()

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeading title="Мои сборки" lead="Всё, что вы сохранили, пока были в аккаунте." />
      {session ? (
        <BuildList />
      ) : (
        <StateMessage
          title="Войдите, чтобы видеть свои сборки"
          action={
            <ButtonLink to="/login" state={{ from: '/my-builds' }}>
              Войти
            </ButtonLink>
          }
        >
          Сборки, сохранённые после входа, собираются здесь: их можно переименовать и удалить.
        </StateMessage>
      )}
    </div>
  )
}
