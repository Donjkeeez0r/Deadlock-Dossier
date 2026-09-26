import clsx from 'clsx'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Hero, ItemCategory, ItemRecommendation } from '../../api/types'
import { Button, ButtonLink } from '../../components/Button'
import { HeroPicker } from '../../components/HeroPicker'
import { HeroPortrait } from '../../components/HeroPortrait'
import { ItemTooltip } from '../../components/ItemTooltip'
import { ItemIcon, Souls } from '../../components/ItemTile'
import { CATEGORY_TEXT } from '../../lib/categories'
import { Modal } from '../../components/Modal'
import { PageHeading, Panel } from '../../components/Panel'
import { ErrorState, Skeleton, StateMessage } from '../../components/States'
import { WinrateGauge } from '../../components/WinrateGauge'
import { useHeroes, useHeroMap, useItemMap, useItemRecommendations, useLane, useSynergy } from '../../hooks/queries'
import { draftStore, MAX_ITEMS, useDraft } from '../../lib/draft'
import { CATEGORY_LABEL, formatPercent, matchesLabel } from '../../lib/format'
import { parseId } from '../../lib/params'

type Side = 'my' | 'enemy'

function HeroSlot({ side, hero, onPick }: { side: Side; hero: Hero | undefined; onPick: () => void }) {
  const label = side === 'my' ? 'Ваш герой' : 'Враг'
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={hero ? `${label}: ${hero.name}. Сменить героя` : `${label}: выбрать героя`}
      className={clsx(
        'group frame block w-full text-left [--cut:14px]',
        side === 'my' ? '[--frame-line:var(--color-soul)]' : '[--frame-line:var(--color-loss)]',
        !hero && 'frame-quiet',
      )}
    >
      <div className="relative m-[5px] overflow-hidden [clip-path:polygon(10px_0,calc(100%-10px)_0,100%_10px,100%_calc(100%-10px),calc(100%-10px)_100%,10px_100%,0_calc(100%-10px),0_10px)]">
        {hero ? (
          <HeroPortrait
            hero={hero}
            variant="card"
            eager
            className={clsx('w-full transition-[filter] duration-300 group-hover:brightness-110', side === 'enemy' && '-scale-x-100')}
          />
        ) : (
          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-3 bg-surface-2 text-parchment-muted transition-colors group-hover:text-parchment">
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true" className="text-brass">
              <path d="M22 2 42 22 22 42 2 22Z" fill="none" stroke="currentColor" />
              <path d="M22 14v16M14 22h16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="font-serif text-xl italic">Выбрать героя</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent px-3 pt-12 pb-3 text-center">
          <span className={clsx('block text-sm font-semibold', side === 'my' ? 'text-soul' : 'text-loss')}>{label}</span>
          {hero && <span className="poster mt-1 block truncate text-[clamp(1.4rem,4vw,2.4rem)] font-bold text-parchment">{hero.name}</span>}
        </div>
      </div>
    </button>
  )
}

function LaneBlock({ my, enemy }: { my: Hero; enemy: Hero }) {
  const { data, isPending, isError, error, refetch } = useLane(my.id, enemy.id)
  if (isPending) return <Skeleton className="mx-auto aspect-[20/17] w-full max-w-[300px] rounded-full" />
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  const noData = data.matches === 0
  return (
    <div>
      <WinrateGauge
        size="lg"
        value={noData ? null : data.winRate}
        label={`${my.name} на линии`}
        caption={noData ? 'Таких дуэлей в выборке нет' : `по ${matchesLabel(data.matches)}`}
      />
      {!noData && (
        <p className="mt-4 text-center font-serif text-lg text-parchment-muted italic">
          {data.winRate >= 52
            ? 'Линия в вашу пользу — можно давить.'
            : data.winRate <= 48
              ? 'Тяжёлая линия: играйте от фарма и ждите помощи.'
              : 'Ровная линия — решит игра, а не пик.'}
        </p>
      )}
    </div>
  )
}

function SynergyBlock({ my }: { my: Hero }) {
  const { data, isPending, isError, error, refetch } = useSynergy(my.id)
  const heroes = useHeroMap()
  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    )
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (data.length === 0) return <StateMessage title="Союзников не нашлось">Для {my.name} пока мало совместных матчей.</StateMessage>

  return (
    <ul className="flex flex-col gap-2">
      {data.map((ally) => {
        const hero = heroes.get(ally.heroId)
        return (
          <li key={ally.heroId} className="flex items-center gap-3 border-b border-brass/10 pb-2 last:border-0">
            {hero ? <HeroPortrait hero={hero} className="cut-sm size-11" /> : <div className="size-11 bg-surface-3" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-parchment">{hero?.name ?? `Герой #${ally.heroId}`}</p>
              <p className="nums text-sm text-parchment-muted">{matchesLabel(ally.matches)}</p>
            </div>
            <span className={clsx('nums font-display text-2xl font-bold', ally.winRate >= 50 ? 'text-win' : 'text-loss')}>
              {formatPercent(ally.winRate)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

const CATEGORY_ORDER: (ItemCategory | 'other')[] = ['weapon', 'vitality', 'spirit', 'other']

function RecommendationRow({ rec, myHeroId }: { rec: ItemRecommendation; myHeroId: number }) {
  const draft = useDraft()
  const items = useItemMap()
  const inBuild = draft.itemIds.includes(rec.itemId)
  const full = draft.itemIds.length >= MAX_ITEMS
  // Предмета нет в магазине — оценка сборки с ним упадёт на сервере.
  const unknown = !items.has(rec.itemId)
  const otherHero = draft.heroId !== null && draft.heroId !== myHeroId
  const tier = items.get(rec.itemId)?.tier ?? null

  function add() {
    if (draft.heroId === null) draftStore.setHero(myHeroId)
    draftStore.addItem(rec.itemId)
  }

  return (
    <li className="grid grid-cols-[3.25rem_1fr] items-center gap-x-3 gap-y-2.5 bg-surface-2/60 p-2.5">
      <ItemTooltip itemId={rec.itemId} focusLabel={unknown ? undefined : rec.name} className="w-13">
        <ItemIcon name={rec.name} imageUrl={rec.imageUrl} category={rec.category} tier={tier} className="w-full" />
      </ItemTooltip>
      <div className="min-w-0">
        <p className="truncate font-semibold text-parchment">{rec.name}</p>
        <p className="nums mt-0.5 flex flex-wrap gap-x-4 text-sm text-parchment-muted">
          <Souls value={rec.cost} className="text-soul" />
          <span>≈ {rec.avgBuyMin} мин</span>
          <span className={rec.winRate >= 50 ? 'text-win' : 'text-loss'}>{formatPercent(rec.winRate)} побед</span>
        </p>
      </div>
      <Button
        variant={inBuild ? 'ghost' : 'soul'}
        size="sm"
        disabled={inBuild || full || unknown || otherHero}
        onClick={add}
        className="col-span-2"
        aria-label={inBuild ? `${rec.name} уже в сборке` : `Добавить ${rec.name} в сборку`}
      >
        {inBuild ? 'В сборке' : unknown ? 'Нет в магазине' : full ? 'Сборка заполнена' : 'Добавить в сборку'}
      </Button>
    </li>
  )
}

function ItemsBlock({ my, enemy }: { my: Hero; enemy: Hero }) {
  const { data, isPending, isError, error, refetch } = useItemRecommendations(my.id, enemy.id)
  const draft = useDraft()
  const heroes = useHeroMap()
  const draftHero = draft.heroId !== null && draft.heroId !== my.id ? heroes.get(draft.heroId) : undefined

  if (isPending) {
    return (
      <div className="grid gap-2 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem]" />
        ))}
      </div>
    )
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (data.length === 0) {
    return <StateMessage title="Рекомендаций нет">Для этой пары героев ещё не собрано данных о покупках.</StateMessage>
  }

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    list: data.filter((r) => (r.category ?? 'other') === category),
  })).filter((g) => g.list.length > 0)

  return (
    <div className="flex flex-col gap-6">
      {draft.heroId !== null && draft.heroId !== my.id && (
        <div className="flex flex-col gap-3 bg-brass/10 p-4 shadow-[inset_0_0_0_1px_rgb(201_162_90/0.4)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-parchment">
            В конструкторе собирается сборка для {draftHero?.name ?? 'другого героя'}. Чтобы добавлять предметы для {my.name}, начните новую сборку.
          </p>
          <Button variant="ghost" size="sm" onClick={() => draftStore.replace({ heroId: my.id, itemIds: [] })}>
            Начать сборку для {my.name}
          </Button>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        {groups.map(({ category, list }) => (
          <section key={category} aria-label={category === 'other' ? 'Прочее' : CATEGORY_LABEL[category]}>
            <h3
              className={clsx(
                'poster mb-3 flex items-center gap-2 text-lg font-bold',
                category === 'other' ? 'text-parchment-muted' : CATEGORY_TEXT[category],
              )}
            >
              <span aria-hidden="true" className="size-2.5 rotate-45 bg-current" />
              {category === 'other' ? 'Прочее' : CATEGORY_LABEL[category]}
            </h3>
            <ul className="flex flex-col gap-2">
              {list.map((rec) => (
                <RecommendationRow key={rec.itemId} rec={rec} myHeroId={my.id} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="flex flex-col items-start gap-3 border-t border-brass/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-parchment-muted" aria-live="polite">
          В сборке {draft.itemIds.length} из {MAX_ITEMS} предметов.
        </p>
        <ButtonLink to="/builder" variant="ghost">
          Открыть конструктор
        </ButtonLink>
      </div>
    </div>
  )
}

export function MatchupPage() {
  const [params, setParams] = useSearchParams()
  const heroes = useHeroMap()
  const heroesQuery = useHeroes()
  const [picking, setPicking] = useState<Side | null>(null)

  const myId = parseId(params.get('my'))
  const rawEnemyId = parseId(params.get('enemy'))
  // Один и тот же герой с обеих сторон — не матчап; такой соперник игнорируется.
  const enemyId = rawEnemyId === myId ? null : rawEnemyId
  const my = myId !== null ? heroes.get(myId) : undefined
  const enemy = enemyId !== null ? heroes.get(enemyId) : undefined

  function update(next: { my?: number | null; enemy?: number | null }) {
    const merged = { my: myId, enemy: enemyId, ...next }
    const search = new URLSearchParams()
    if (merged.my !== null) search.set('my', String(merged.my))
    if (merged.enemy !== null) search.set('enemy', String(merged.enemy))
    setParams(search, { replace: true })
  }

  return (
    <div>
      <PageHeading title="Матчап на линии" lead="Выберите своего героя и соперника — разберём дуэль по свежим матчам." />

      <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
        <HeroSlot side="my" hero={my} onPick={() => setPicking('my')} />
        <div className="flex flex-col items-center gap-3">
          <span
            className="font-serif text-[clamp(2.4rem,8vw,4.5rem)] leading-none font-semibold text-brass-light italic [text-shadow:0_0_30px_rgb(201_162_90/0.45)]"
            aria-hidden="true"
          >
            vs
          </span>
          <button
            type="button"
            onClick={() => update({ my: enemyId, enemy: myId })}
            disabled={myId === null && enemyId === null}
            className="flex size-10 items-center justify-center text-parchment-muted transition-colors hover:text-brass-light disabled:opacity-30"
            aria-label="Поменять героев местами"
            title="Поменять местами"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
              <path d="M3 7h15l-4-4M19 15H4l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
        <HeroSlot side="enemy" hero={enemy} onPick={() => setPicking('enemy')} />
      </div>

      <Modal
        open={picking !== null}
        onClose={() => setPicking(null)}
        title={picking === 'enemy' ? 'Герой соперника' : 'Ваш герой'}
        wide
      >
        <HeroPicker
          autoFocus
          selectedId={picking === 'enemy' ? enemyId : myId}
          disabledIds={[(picking === 'enemy' ? myId : enemyId) ?? -1]}
          onSelect={(hero) => {
            update(picking === 'enemy' ? { enemy: hero.id } : { my: hero.id })
            setPicking(null)
          }}
        />
      </Modal>

      {heroesQuery.isError ? (
        <ErrorState className="mt-10" error={heroesQuery.error} onRetry={() => void heroesQuery.refetch()} />
      ) : heroesQuery.isPending && (myId !== null || enemyId !== null) ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : my && enemy ? (
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel title="Линия">
            <LaneBlock my={my} enemy={enemy} />
          </Panel>
          <Panel title={`Союзники для ${my.name}`} aside="лучший винрейт в паре">
            <SynergyBlock my={my} />
          </Panel>
          <Panel title={`Предметы против ${enemy.name}`} className="lg:col-span-2">
            <ItemsBlock my={my} enemy={enemy} />
          </Panel>
        </div>
      ) : (
        <p className="mt-10 text-center font-serif text-xl text-parchment-muted italic">
          {my || enemy ? 'Осталось выбрать второго героя.' : 'Нажмите на слот, чтобы выбрать героя.'}
        </p>
      )}
    </div>
  )
}
