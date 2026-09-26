import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { BuildEvaluation } from '../../api/types'
import { Souls } from '../../components/ItemTile'
import { WinrateGauge } from '../../components/WinrateGauge'

// Бейджи бэкенд отдаёт готовыми русскими строками; окраску подбираем по смыслу.
function badgeTone(badge: string): string {
  const b = badge.toLowerCase()
  if (b.includes('нет выживаемости') || b.includes('оверпрайс')) return 'text-loss shadow-[inset_0_0_0_1px_rgb(209_73_63/0.6)] bg-loss/10'
  if (b.includes('имба')) return 'text-soul shadow-[inset_0_0_0_1px_rgb(95_224_192/0.6)] bg-soul/10'
  if (b.includes('стандарт')) return 'text-parchment-muted shadow-[inset_0_0_0_1px_rgb(168_157_136/0.5)]'
  return 'text-brass-light shadow-[inset_0_0_0_1px_rgb(201_162_90/0.6)] bg-brass/10'
}

export function Badges({ badges }: { badges: string[] }) {
  if (badges.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Оценка сборки">
      {badges.map((badge) => (
        <li key={badge} className={clsx('cut-sm px-3 py-1.5 text-sm font-semibold', badgeTone(badge))}>
          {badge}
        </li>
      ))}
    </ul>
  )
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-l border-brass/30 pl-4">
      <dt className="text-sm text-parchment-muted">{label}</dt>
      <dd className="nums mt-0.5 font-display text-3xl font-bold text-parchment">{children}</dd>
    </div>
  )
}

/** Результат оценки: манометр, цифры и бейджи. */
export function EvaluationView({ evaluation, className }: { evaluation: BuildEvaluation; className?: string }) {
  const total = evaluation.items.length
  const withStats = evaluation.itemsWithStats
  const caption =
    evaluation.buildWinrate === null
      ? 'Матчей с этими предметами не нашлось'
      : withStats < total
        ? `статистика есть по ${withStats} из ${total} предметов`
        : 'в матчах с этими предметами'
  return (
    <div className={clsx('grid items-center gap-6 sm:grid-cols-[minmax(0,15rem)_1fr]', className)}>
      <WinrateGauge value={evaluation.buildWinrate} label="Винрейт сборки" caption={caption} />
      <div className="@container flex flex-col gap-5">
        {/* В узкой колонке конструктора пятизначная цена не помещается рядом с минутами. */}
        <dl className="grid gap-4 @[19rem]:grid-cols-2">
          <Metric label="Стоимость">
            <Souls value={evaluation.totalCost} className="[&>svg]:size-3.5" />
          </Metric>
          <Metric label="Средняя покупка">
            {evaluation.avgBuyMin ?? '—'}
            {evaluation.avgBuyMin !== null && (
              <span className="ml-1 font-sans text-base font-normal text-parchment-muted">мин</span>
            )}
          </Metric>
        </dl>
        <Badges badges={evaluation.badges} />
      </div>
    </div>
  )
}
