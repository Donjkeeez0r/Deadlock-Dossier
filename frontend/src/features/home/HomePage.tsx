import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import type { Hero } from '../../api/types'
import { HeroPortrait } from '../../components/HeroPortrait'
import { HeroesEmpty } from '../../components/HeroPicker'
import { Rule } from '../../components/Panel'
import { ErrorState, Skeleton } from '../../components/States'
import { useHeroes } from '../../hooks/queries'

const ENTRIES = [
  {
    to: '/counter',
    title: 'Контрпик',
    text: 'Выберите героя соперника — покажем, кто обыгрывает его чаще всех.',
    glyph: 'M24 4 44 24 24 44 4 24Z M14 24h20 M24 14v20',
  },
  {
    to: '/matchup',
    title: 'Матчап на линии',
    text: 'Ваш герой против врага: винрейт на линии, союзники и предметы на эту дуэль.',
    glyph: 'M6 10 22 24 6 38 M42 10 26 24 42 38',
  },
  {
    to: '/builder',
    title: 'Конструктор сборки',
    text: 'Соберите до двенадцати предметов, получите оценку по матчам и поделитесь ссылкой.',
    glyph: 'M8 8h14v14H8Z M26 8h14v14H26Z M8 26h14v14H8Z M26 26h14v14H26Z',
  },
]

// Трое героев на афише: стабильный выбор, чтобы главная не «прыгала» между визитами.
const FEATURED = ['Lady Geist', 'Abrams', 'Seven']

function pickFeatured(heroes: Hero[]): Hero[] {
  const byName = heroes.filter((h) => FEATURED.includes(h.name) && h.cardUrl)
  return byName.length === 3 ? FEATURED.map((n) => byName.find((h) => h.name === n)!) : heroes.filter((h) => h.cardUrl).slice(0, 3)
}

function Sunburst() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-[42%] rounded-full opacity-70 [mask-image:radial-gradient(circle,black_20%,transparent_65%)]"
      style={{
        background:
          'repeating-conic-gradient(from 0deg, rgb(201 162 90 / 0.28) 0deg 2deg, transparent 2deg 12deg)',
      }}
    />
  )
}

function HeroPosters({ heroes }: { heroes: Hero[] }) {
  const reduced = useReducedMotion()
  const layout = [
    { rotate: -8, x: '-58%', z: 1 },
    { rotate: 0, x: '0%', z: 2 },
    { rotate: 8, x: '58%', z: 1 },
  ]
  return (
    <div className="relative mx-auto flex aspect-[5/4] w-full max-w-[520px] items-end justify-center">
      <Sunburst />
      {heroes.map((hero, i) => {
        const pos = layout[i]!
        return (
          <motion.div
            key={hero.id}
            className="absolute bottom-[4%] w-[42%]"
            style={{ zIndex: pos.z }}
            initial={reduced ? false : { opacity: 0, y: 40, rotate: 0, x: '0%' }}
            animate={{ opacity: 1, y: i === 1 ? -12 : 0, rotate: pos.rotate, x: pos.x }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="frame [--cut:12px] [--frame-line:var(--color-brass)]">
              <div className="m-[5px] overflow-hidden [clip-path:polygon(9px_0,calc(100%-9px)_0,100%_9px,100%_calc(100%-9px),calc(100%-9px)_100%,9px_100%,0_calc(100%-9px),0_9px)]">
                <HeroPortrait hero={hero} variant="card" eager className="w-full" />
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function HeroPostersSkeleton() {
  return (
    <div className="relative mx-auto flex aspect-[5/4] w-full max-w-[520px] items-end justify-center">
      <Sunburst />
      <Skeleton className="mb-[6%] aspect-[3/4] w-[42%]" />
    </div>
  )
}

function HeroGrid() {
  const { data: heroes, isPending, isError, error, refetch } = useHeroes()

  if (isPending) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4]" />
        ))}
      </div>
    )
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (heroes.length === 0) return <HeroesEmpty />

  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {heroes.map((hero) => (
        <li key={hero.id}>
          <Link
            to={`/matchup?my=${hero.id}`}
            className="group cut relative block overflow-hidden bg-surface-2 shadow-[inset_0_0_0_1px_rgb(201_162_90/0.25)] transition-shadow duration-300 [--cut:10px] hover:shadow-[inset_0_0_0_2px_var(--color-brass-light),0_0_28px_rgb(95_224_192/0.22)] focus-visible:shadow-[inset_0_0_0_2px_var(--color-brass-light)]"
          >
            <HeroPortrait
              hero={hero}
              variant="card"
              className="w-full transition-[transform,filter] duration-500 ease-[var(--ease-brass)] group-hover:scale-[1.04] group-hover:brightness-110"
            />
            {/* Виньетка афиши */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,transparent_45%,rgb(14_12_10/0.75))]"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/80 to-transparent px-2 pt-10 pb-2.5 text-center">
              <span className="poster block truncate text-lg font-bold text-parchment sm:text-xl">{hero.name}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function HomePage() {
  const { data: heroes } = useHeroes()
  const featured = heroes ? pickFeatured(heroes) : []

  return (
    <div className="flex flex-col gap-14 sm:gap-20">
      <section className="grid items-center gap-10 overflow-x-clip lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:overflow-visible">
        <div className="relative z-10 max-w-xl">
          <h1 className="poster text-[clamp(3.4rem,11vw,7.5rem)] leading-[0.86] font-bold text-parchment">
            Досье
            <span className="mt-5 block text-[0.4em] leading-[1.05] tracking-[0.1em] text-brass-light">
              на каждого в лобби
            </span>
          </h1>
          <p className="mt-6 max-w-md font-serif text-2xl leading-snug text-parchment-muted italic sm:text-[1.7rem]">
            Статистика сотен тысяч матчей Deadlock: кого брать против врага, как пройдёт линия и что купить.
          </p>
        </div>
        {featured.length === 3 ? <HeroPosters heroes={featured} /> : <HeroPostersSkeleton />}
      </section>

      <nav aria-label="Инструменты" className="grid gap-4 md:grid-cols-3">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className="group frame block transition-[filter] duration-300 [--frame-fill:var(--color-surface)] hover:[--frame-fill:var(--color-surface-2)] hover:[--frame-line:var(--color-brass-light)]"
          >
            <div className="flex h-full gap-5 p-6 sm:p-7">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                aria-hidden="true"
                className="shrink-0 text-brass transition-colors group-hover:text-soul"
              >
                <path d={entry.glyph} fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <div>
                <h2 className="poster text-3xl font-bold text-parchment">{entry.title}</h2>
                <p className="mt-2 text-parchment-muted">{entry.text}</p>
              </div>
            </div>
          </Link>
        ))}
      </nav>

      <section aria-labelledby="roster-title">
        <Rule className="mb-6" />
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 id="roster-title" className="poster text-4xl font-bold text-parchment sm:text-5xl">
            Герои
          </h2>
          <p className="font-serif text-xl text-parchment-muted italic">Выберите героя, чтобы разобрать его матчап</p>
        </div>
        <HeroGrid />
      </section>
    </div>
  )
}
