import clsx from 'clsx'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useId, useState } from 'react'
import { formatDecimal } from '../lib/format'

// Латунный манометр винрейта. Реальные винрейты почти всегда лежат в 30–70%,
// поэтому шкала растянута на этот диапазон — иначе стрелка вечно стоит посередине.

const MIN = 30
const MAX = 70
const SWEEP = 240 // градусов, от -120 до +120 относительно вертикали
const CX = 100
const CY = 100
const R = 78

function angleFor(value: number): number {
  const t = (Math.min(Math.max(value, MIN), MAX) - MIN) / (MAX - MIN)
  return -SWEEP / 2 + SWEEP * t
}

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) }
}

function arcPath(fromDeg: number, toDeg: number, radius: number) {
  const a = polar(fromDeg, radius)
  const b = polar(toDeg, radius)
  const large = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`
}

const TICKS = Array.from({ length: (MAX - MIN) / 2.5 + 1 }, (_, i) => MIN + i * 2.5)

type WinrateGaugeProps = {
  /** null — данных нет, стрелка лежит на упоре. */
  value: number | null
  label: string
  caption?: string
  size?: 'md' | 'lg'
  className?: string
}

export function WinrateGauge({ value, label, caption, size = 'md', className }: WinrateGaugeProps) {
  const id = useId()
  const reduced = useReducedMotion()
  const shown = useMotionValue(MIN)
  // Угол стрелки уходит в SVG-атрибут rotate(угол cx cy) с явным центром:
  // CSS transform-origin на <g> ненадёжен, а MotionValue в атрибут transform motion не пробрасывает.
  const [angle, setAngle] = useState(() => angleFor(MIN))
  useMotionValueEvent(shown, 'change', (v) => setAngle(angleFor(v)))
  const readout = useTransform(shown, (v) => `${formatDecimal(v, 1)}%`)

  useEffect(() => {
    if (value === null) {
      shown.set(MIN)
      return
    }
    if (reduced) {
      shown.set(value)
      return
    }
    const controls = animate(shown, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [value, reduced, shown])

  const tone = value === null ? 'text-parchment-muted' : value >= 50 ? 'text-win' : 'text-loss'

  return (
    <figure className={clsx('flex flex-col items-center', className)}>
      <svg
        viewBox="0 0 200 170"
        className={clsx('w-full', size === 'lg' ? 'max-w-[300px]' : 'max-w-[220px]')}
        role="img"
        aria-label={value === null ? `${label}: нет данных` : `${label}: ${formatDecimal(value, 1)}%`}
      >
        <defs>
          <linearGradient id={`${id}-scale`} gradientUnits="userSpaceOnUse" x1="22" y1="0" x2="178" y2="0">
            <stop offset="0" stopColor="var(--color-loss)" />
            <stop offset="0.5" stopColor="var(--color-brass)" />
            <stop offset="1" stopColor="var(--color-win)" />
          </linearGradient>
          <radialGradient id={`${id}-face`} cx="50%" cy="45%" r="60%">
            <stop offset="0" stopColor="var(--color-surface-3)" />
            <stop offset="1" stopColor="var(--color-ink)" />
          </radialGradient>
          <linearGradient id={`${id}-bezel`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--color-brass-light)" />
            <stop offset="0.5" stopColor="var(--color-brass)" />
            <stop offset="1" stopColor="var(--color-brass-dark)" />
          </linearGradient>
        </defs>

        {/* Корпус */}
        <circle cx={CX} cy={CY} r="96" fill={`url(#${id}-bezel)`} />
        <circle cx={CX} cy={CY} r="92" fill={`url(#${id}-face)`} />
        <circle cx={CX} cy={CY} r="88" fill="none" stroke="var(--color-brass-dark)" strokeWidth="0.6" />

        {/* Цветная шкала */}
        <path
          d={arcPath(-SWEEP / 2, SWEEP / 2, R - 8)}
          fill="none"
          stroke={`url(#${id}-scale)`}
          strokeWidth="5"
          opacity="0.85"
        />

        {/* Деления */}
        {TICKS.map((t) => {
          const major = t % 10 === 0
          const a = angleFor(t)
          const p1 = polar(a, R)
          const p2 = polar(a, major ? R - 16 : R - 12)
          return (
            <line
              key={t}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={t === 50 ? 'var(--color-brass-light)' : 'var(--color-parchment-muted)'}
              strokeWidth={major ? 1.6 : 0.8}
            />
          )
        })}
        {[30, 40, 50, 60, 70].map((t) => {
          const p = polar(angleFor(t), R - 26)
          return (
            <text
              key={t}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={t === 50 ? 'var(--color-brass-light)' : 'var(--color-parchment-muted)'}
              fontFamily="var(--font-display)"
              fontWeight="700"
              fontSize="10"
            >
              {t}
            </text>
          )
        })}

        {/* Стрелка */}
        <g transform={`rotate(${angle} ${CX} ${CY})`}>
          <path
            d={`M ${CX - 3} ${CY + 14} L ${CX} ${CY - R + 6} L ${CX + 3} ${CY + 14} Z`}
            fill={value === null ? 'var(--color-parchment-muted)' : 'var(--color-soul)'}
            style={{ filter: value === null ? undefined : 'drop-shadow(0 0 4px rgb(95 224 192 / 0.8))' }}
          />
        </g>
        <circle cx={CX} cy={CY} r="8" fill={`url(#${id}-bezel)`} />
        <circle cx={CX} cy={CY} r="3" fill="var(--color-ink)" />

        {/* Показание */}
        <motion.text
          x={CX}
          y={CY + 46}
          textAnchor="middle"
          className={clsx('nums', tone)}
          fill="currentColor"
          fontFamily="var(--font-display)"
          fontWeight="800"
          fontSize="26"
        >
          {value === null ? '—' : readout}
        </motion.text>
      </svg>
      <figcaption className="mt-1 text-center">
        <span className="poster block text-lg font-bold text-brass-light">{label}</span>
        {caption && <span className="mt-0.5 block text-sm text-parchment-muted">{caption}</span>}
      </figcaption>
    </figure>
  )
}
