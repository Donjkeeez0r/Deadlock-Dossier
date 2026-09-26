import clsx from 'clsx'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import type { BuildEvaluation } from '../../api/types'
import { Button } from '../../components/Button'
import { HeroPicker } from '../../components/HeroPicker'
import { HeroPortrait } from '../../components/HeroPortrait'
import { ItemIcon, Souls } from '../../components/ItemTile'
import { ItemTooltip } from '../../components/ItemTooltip'
import { Modal } from '../../components/Modal'
import { PageHeading, Panel } from '../../components/Panel'
import { ErrorState, Skeleton, StateMessage } from '../../components/States'
import { TextField } from '../../components/TextField'
import { WinrateGauge } from '../../components/WinrateGauge'
import { useCompareSide, useHeroes, useHeroMap, useItemMap, useMyBuilds, type CompareSide } from '../../hooks/queries'
import { useSession } from '../../lib/auth'
import {
  encodeCompareSource,
  parseCompareSource,
  shareIdFromInput,
  type CompareSource,
} from '../../lib/compareSource'
import { draftStore, MIN_ITEMS, useDraft } from '../../lib/draft'
import { formatDecimal, plural } from '../../lib/format'
import { Badges } from '../builder/EvaluationView'

type SideKey = 'a' | 'b'
const SIDE_LABEL: Record<SideKey, string> = { a: 'Сборка A', b: 'Сборка B' }

// --- Выбор сборки для пустой стороны ------------------------------------------

function PickerOption({ title, text, children }: { title: string; text?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-brass/15 pt-4 first:border-t-0 first:pt-0">
      <p className="font-semibold text-parchment">{title}</p>
      {text && <p className="text-sm text-parchment-muted">{text}</p>}
      {children}
    </div>
  )
}

function MyBuildsOption({ onPick }: { onPick: (source: CompareSource) => void }) {
  const session = useSession()
  const location = useLocation()
  const { data, isPending, isError } = useMyBuilds()
  const heroes = useHeroMap()

  if (!session) {
    return (
      <PickerOption
        title="Из моих сборок"
        text={
          <>
            <Link
              to="/login"
              state={{ from: location.pathname + location.search }}
              className="text-brass-light underline-offset-4 hover:text-parchment hover:underline"
            >
              Войдите
            </Link>
            , чтобы выбрать из сохранённых.
          </>
        }
      >
        {null}
      </PickerOption>
    )
  }
  return (
    <PickerOption title="Из моих сборок">
      {isPending ? (
        <Skeleton className="h-10" />
      ) : isError ? (
        <p className="text-sm text-loss">Не удалось загрузить ваши сборки</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-parchment-muted">Сохранённых сборок пока нет.</p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
          {data.map((build) => (
            <li key={build.id}>
              <button
                type="button"
                onClick={() => onPick({ kind: 'saved', shareId: build.id })}
                className="flex w-full items-center justify-between gap-3 bg-surface-2 px-3 py-2 text-left hover:bg-surface-3"
              >
                <span className="min-w-0 truncate text-parchment">{build.name}</span>
                <span className="shrink-0 text-xs text-parchment-muted">{heroes.get(build.heroId)?.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PickerOption>
  )
}

function LinkOption({ onPick }: { onPick: (source: CompareSource) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const shareId = shareIdFromInput(value)
    if (!shareId) {
      setError('Вставьте ссылку вида …/build/…')
      return
    }
    onPick({ kind: 'saved', shareId })
  }

  return (
    <PickerOption title="По ссылке">
      <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <TextField
          label="Ссылка на сборку"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          error={error}
          placeholder="https://…/build/…"
          className="min-w-0 flex-1 [&_label]:sr-only"
        />
        <Button type="submit" variant="ghost" className="shrink-0">
          Добавить
        </Button>
      </form>
    </PickerOption>
  )
}

function SourcePicker({ onPick }: { onPick: (source: CompareSource) => void }) {
  const draft = useDraft()
  const [picking, setPicking] = useState(false)
  const draftReady = draft.heroId !== null && draft.itemIds.length >= MIN_ITEMS

  return (
    <div className="flex flex-col gap-4">
      <PickerOption
        title="Из конструктора"
        text={draftReady ? `Текущая сборка: ${draft.itemIds.length} ${plural(draft.itemIds.length, 'предмет', 'предмета', 'предметов')}.` : 'В конструкторе нужен герой и хотя бы два предмета.'}
      >
        <Button
          variant="ghost"
          size="sm"
          disabled={!draftReady}
          onClick={() => draft.heroId !== null && onPick({ kind: 'custom', heroId: draft.heroId, itemIds: draft.itemIds })}
        >
          Взять текущую
        </Button>
      </PickerOption>
      <MyBuildsOption onPick={onPick} />
      <LinkOption onPick={onPick} />
      <PickerOption title="Популярная для героя" text="12 самых покупаемых предметов героя в порядке покупки.">
        <Button variant="ghost" size="sm" onClick={() => setPicking(true)}>
          Выбрать героя
        </Button>
      </PickerOption>

      <Modal open={picking} onClose={() => setPicking(false)} title="Популярная сборка героя" wide>
        <HeroPicker
          autoFocus
          onSelect={(hero) => {
            setPicking(false)
            onPick({ kind: 'popular', heroId: hero.id })
          }}
        />
      </Modal>
    </div>
  )
}

// --- Заполненная сторона -----------------------------------------------------

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-l border-brass/30 pl-3">
      <dt className="text-sm text-parchment-muted">{label}</dt>
      <dd className="nums mt-0.5 font-display text-2xl font-bold text-parchment">{children}</dd>
    </div>
  )
}

function SideView({
  side,
  source,
  otherItemIds,
}: {
  side: CompareSide
  source: CompareSource
  otherItemIds: Set<number> | null
}) {
  const { evaluation } = side
  const hero = useHeroMap().get(evaluation.heroId)
  const heroesLoaded = useHeroes().isSuccess
  const items = useItemMap()
  const navigate = useNavigate()

  function openInBuilder() {
    // Как на странице сборки: героя, которого убрали из игры, в конструктор не переносим.
    const heroGone = heroesLoaded && !hero
    draftStore.replace({ heroId: heroGone ? null : evaluation.heroId, itemIds: evaluation.items.map((item) => item.id) })
    void navigate('/builder')
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {hero && <HeroPortrait hero={hero} className="cut-sm size-14 shrink-0" />}
        <div className="min-w-0">
          <p className="font-serif text-2xl leading-tight break-words text-parchment">{side.name}</p>
          <p className="text-sm text-parchment-muted">{hero?.name ?? 'Герой недоступен'}</p>
        </div>
      </div>

      <WinrateGauge
        value={evaluation.buildWinrate}
        label="Винрейт сборки"
        caption={evaluation.buildWinrate === null ? 'Матчей с этими предметами не нашлось' : undefined}
        className="mx-auto w-full max-w-[15rem]"
      />

      <dl className="grid grid-cols-2 gap-3">
        <Metric label="Стоимость">
          <Souls value={evaluation.totalCost} className="[&>svg]:size-3" />
        </Metric>
        <Metric label="Средняя покупка">
          {evaluation.avgBuyMin ?? '—'}
          {evaluation.avgBuyMin !== null && <span className="ml-1 font-sans text-sm font-normal text-parchment-muted">мин</span>}
        </Metric>
      </dl>

      <Badges badges={evaluation.badges} />

      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="Предметы">
        {evaluation.items.map((item) => {
          const full = items.get(item.id)
          const shared = otherItemIds?.has(item.id) ?? false
          return (
            <li key={item.id} className={clsx('flex flex-col items-center gap-1 text-center', shared && 'opacity-45')}>
              <ItemTooltip itemId={item.id} focusLabel={item.name} className="w-full max-w-14">
                <ItemIcon
                  name={item.name}
                  imageUrl={item.imageUrl}
                  category={full?.category ?? null}
                  tier={full?.tier}
                  className={clsx('w-full', otherItemIds && !shared && 'shadow-[0_0_0_2px_var(--color-soul)]')}
                />
              </ItemTooltip>
              <span className="line-clamp-2 text-[0.7rem] leading-tight text-parchment">{item.name}</span>
              {otherItemIds && <span className="sr-only">{shared ? 'есть в обеих сборках' : 'только в этой сборке'}</span>}
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {source.kind === 'saved' && (
          <Link
            to={`/build/${source.shareId}`}
            className="font-semibold text-brass-light underline-offset-4 hover:text-parchment hover:underline"
          >
            Открыть сборку
          </Link>
        )}
        <button
          type="button"
          onClick={openInBuilder}
          className="font-semibold text-brass-light underline-offset-4 hover:text-parchment hover:underline"
        >
          Открыть в конструкторе
        </button>
      </div>
    </div>
  )
}

function Side({
  sideKey,
  source,
  broken,
  query,
  otherItemIds,
  onChange,
}: {
  sideKey: SideKey
  source: CompareSource | null
  broken: boolean
  query: ReturnType<typeof useCompareSide>
  otherItemIds: Set<number> | null
  onChange: (source: CompareSource | null) => void
}) {
  let body: ReactNode
  if (!source || !query) {
    body = (
      <>
        {broken && (
          <p role="alert" className="mb-4 text-sm text-loss">
            Ссылка на эту сборку повреждена — выберите её заново.
          </p>
        )}
        <SourcePicker onPick={onChange} />
      </>
    )
  } else if (query.isPending) {
    body = (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-14" />
        <Skeleton className="mx-auto aspect-[2/1] w-full max-w-[15rem]" />
        <Skeleton className="h-24" />
      </div>
    )
  } else if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400)) {
    // 404/400 не лечатся повтором: объясняем, что не так, и предлагаем «Заменить».
    const [title, text] =
      source.kind === 'saved'
        ? ['Такой сборки нет', 'Её удалили или в ссылке опечатка.']
        : source.kind === 'popular' && query.error.status === 404
          ? ['Мало статистики по этому герою', 'Выберите другого героя или другую сборку.']
          : ['Сборку не удалось открыть', 'В ссылке предметы или герой, которых нет в игре. Выберите сборку заново.']
    body = <StateMessage title={title}>{text}</StateMessage>
  } else if (query.error || !query.data) {
    body = <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  } else {
    body = <SideView side={query.data} source={source} otherItemIds={otherItemIds} />
  }

  return (
    <Panel
      title={SIDE_LABEL[sideKey]}
      aside={
        source && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="font-semibold text-brass-light underline-offset-4 hover:text-parchment hover:underline"
          >
            Заменить
          </button>
        )
      }
      className="min-w-0"
    >
      {body}
    </Panel>
  )
}

// --- Сводка разницы ----------------------------------------------------------

function signed(value: number, digits = 0): string {
  const abs = digits ? formatDecimal(Math.abs(value), digits) : Math.abs(value).toLocaleString('ru-RU')
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${abs}`
}

function Summary({ a, b }: { a: BuildEvaluation; b: BuildEvaluation }) {
  const rows: { label: string; text: string; better: 'a' | 'b' | null }[] = []

  if (a.buildWinrate !== null && b.buildWinrate !== null) {
    // Считаем по округлённым до десятых — как их показывают манометры, иначе «51,0 и 52,1» дают «−1,2».
    const round = (v: number) => Math.round(v * 10) / 10
    const diff = round(round(b.buildWinrate) - round(a.buildWinrate))
    rows.push({
      label: 'Винрейт',
      text: Math.abs(diff) < 0.05 ? 'одинаковый' : `у B ${signed(diff, 1)}% побед`,
      better: Math.abs(diff) < 0.05 ? null : diff > 0 ? 'b' : 'a',
    })
  } else {
    rows.push({ label: 'Винрейт', text: 'не сравнить — у одной из сборок нет статистики', better: null })
  }

  const cost = b.totalCost - a.totalCost
  rows.push({
    label: 'Стоимость',
    text: cost === 0 ? 'одинаковая' : `B ${cost > 0 ? 'дороже' : 'дешевле'} на ${Math.abs(cost).toLocaleString('ru-RU')} душ`,
    better: null,
  })

  if (a.avgBuyMin !== null && b.avgBuyMin !== null) {
    const buy = b.avgBuyMin - a.avgBuyMin
    rows.push({
      label: 'Средняя покупка',
      text: buy === 0 ? 'в одно время' : `B собирается на ${Math.abs(buy)} мин ${buy > 0 ? 'позже' : 'раньше'}`,
      better: null,
    })
  }

  const aIds = new Set(a.items.map((i) => i.id))
  const common = b.items.filter((i) => aIds.has(i.id)).length
  rows.push({
    label: 'Предметы',
    text: `${common} общих · ${a.items.length - common} только в A · ${b.items.length - common} только в B`,
    better: null,
  })

  return (
    <Panel title="Разница" quiet className="mb-6">
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-sm text-parchment-muted">{row.label}</dt>
            <dd className={clsx('font-semibold', row.better ? 'text-win' : 'text-parchment')}>
              {row.text}
              {row.better && <span className="ml-2 text-sm font-normal text-parchment-muted">лучше {row.better.toUpperCase()}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

// --- Страница ----------------------------------------------------------------

export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const rawA = params.get('a')
  const rawB = params.get('b')
  const a = parseCompareSource(rawA)
  const b = parseCompareSource(rawB)
  const sideA = useCompareSide(a)
  const sideB = useCompareSide(b)

  function update(next: { a: CompareSource | null; b: CompareSource | null }) {
    const search = new URLSearchParams()
    if (next.a) search.set('a', encodeCompareSource(next.a))
    if (next.b) search.set('b', encodeCompareSource(next.b))
    setParams(search, { replace: true })
  }

  const dataA = sideA?.data?.evaluation
  const dataB = sideB?.data?.evaluation
  const idsA = dataA ? new Set(dataA.items.map((i) => i.id)) : null
  const idsB = dataB ? new Set(dataB.items.map((i) => i.id)) : null

  return (
    <div>
      <PageHeading title="Сравнение" lead="Две сборки рядом: винрейт, стоимость и чем отличаются предметы.">
        <Button variant="ghost" size="sm" onClick={() => update({ a: b, b: a })} disabled={!a && !b}>
          Поменять местами
        </Button>
      </PageHeading>

      {dataA && dataB && <Summary a={dataA} b={dataB} />}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Side
          sideKey="a"
          source={a}
          broken={!!rawA && !a}
          query={sideA}
          otherItemIds={idsB}
          onChange={(source) => update({ a: source, b })}
        />
        <Side
          sideKey="b"
          source={b}
          broken={!!rawB && !b}
          query={sideB}
          otherItemIds={idsA}
          onChange={(source) => update({ a, b: source })}
        />
      </div>
    </div>
  )
}
