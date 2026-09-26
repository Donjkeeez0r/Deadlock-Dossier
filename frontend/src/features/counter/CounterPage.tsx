import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import { Link, useSearchParams } from 'react-router'
import type { Hero } from '../../api/types'
import { HeroPicker } from '../../components/HeroPicker'
import { HeroPortrait } from '../../components/HeroPortrait'
import { PageHeading, Panel } from '../../components/Panel'
import { ErrorState, Skeleton, StateMessage } from '../../components/States'
import { useCounters, useHeroes, useHeroMap } from '../../hooks/queries'
import { formatDecimal, formatPercent, matchesLabel } from '../../lib/format'
import { parseId } from '../../lib/params'

function CounterList({ enemy }: { enemy: Hero }) {
  const { data, isPending, isError, error, refetch } = useCounters(enemy.id)
  const heroes = useHeroMap()
  const reduced = useReducedMotion()

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (data.length === 0) {
    return (
      <StateMessage title="Статистики пока нет">
        Против {enemy.name} ещё не набралось матчей для надёжного вывода. Выберите другого героя.
      </StateMessage>
    )
  }

  return (
    <ol className="flex flex-col gap-3">
      {data.map((pick, index) => {
        const hero = heroes.get(pick.heroId)
        const name = hero?.name ?? `Герой #${pick.heroId}`
        return (
          <motion.li
            key={pick.heroId}
            initial={reduced ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to={`/matchup?my=${pick.heroId}&enemy=${enemy.id}`}
              className="group cut grid grid-cols-[auto_1fr_auto] items-center gap-4 bg-surface-2 p-3 pr-5 shadow-[inset_0_0_0_1px_rgb(201_162_90/0.2)] transition-shadow [--cut:10px] hover:shadow-[inset_0_0_0_1px_var(--color-brass-light),0_0_22px_rgb(95_224_192/0.15)] sm:grid-cols-[2.5rem_auto_1fr_auto]"
              aria-label={`${index + 1}. ${name}: винрейт ${formatPercent(pick.winRate)} — открыть матчап`}
            >
              <span className="hidden text-center font-serif text-3xl font-semibold text-brass-dark sm:block" aria-hidden="true">
                {index + 1}
              </span>
              {hero ? (
                <HeroPortrait hero={hero} className="cut-sm size-16 sm:size-[4.5rem]" />
              ) : (
                <div className="size-16 bg-surface-3" />
              )}
              <div className="min-w-0">
                <p className="poster truncate text-2xl font-bold text-parchment">{name}</p>
                <p className="nums mt-1 flex flex-wrap gap-x-4 text-sm text-parchment-muted">
                  <span>KDA {formatDecimal(pick.kda)}</span>
                  <span>{matchesLabel(pick.matches)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className={clsx('nums font-display text-3xl font-bold', pick.winRate >= 50 ? 'text-win' : 'text-loss')}>
                  {formatPercent(pick.winRate)}
                </p>
                <p className="text-xs text-parchment-muted">побед</p>
              </div>
            </Link>
          </motion.li>
        )
      })}
    </ol>
  )
}

export function CounterPage() {
  const [params, setParams] = useSearchParams()
  const heroes = useHeroMap()
  const heroesQuery = useHeroes()
  const enemyId = parseId(params.get('enemy'))
  const enemy = enemyId !== null ? heroes.get(enemyId) : undefined

  return (
    <div>
      <PageHeading
        title="Контрпик"
        lead="Против кого играете? Покажем пятёрку героев, которые выигрывают у него чаще всех."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <Panel title="Вражеский герой" quiet>
          <HeroPicker
            selectedId={enemyId}
            onSelect={(hero) => setParams({ enemy: String(hero.id) }, { replace: true })}
          />
        </Panel>

        <Panel
          title={enemy ? `Против ${enemy.name}` : 'Лучшие ответы'}
          aside={enemy ? 'нажмите, чтобы открыть матчап' : undefined}
          className="lg:sticky lg:top-24"
        >
          {heroesQuery.isPending && enemyId !== null ? (
            <Skeleton className="h-64" />
          ) : enemy ? (
            <CounterList enemy={enemy} />
          ) : (
            <StateMessage title="Выберите героя соперника">
              Слева — все герои. Можно начать вводить имя и нажать Enter.
            </StateMessage>
          )}
        </Panel>
      </div>
    </div>
  )
}
