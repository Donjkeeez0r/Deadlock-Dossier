import clsx from 'clsx'
import { useState } from 'react'
import type { Hero } from '../api/types'
import { initials } from '../lib/format'

type HeroPortraitProps = {
  hero: Pick<Hero, 'name' | 'imageUrl' | 'cardUrl'>
  /** icon — квадратная иконка, card — вертикальная афиша. */
  variant?: 'icon' | 'card'
  className?: string
  eager?: boolean
}

/** Изображение героя с фолбэком «инициалы на латунной плашке». */
export function HeroPortrait({ hero, variant = 'icon', className, eager }: HeroPortraitProps) {
  const src = variant === 'card' ? (hero.cardUrl ?? hero.imageUrl) : (hero.imageUrl ?? hero.cardUrl)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const broken = !src || failedSrc === src

  if (broken) {
    return (
      <div
        role="img"
        aria-label={hero.name}
        className={clsx(
          'flex items-center justify-center bg-gradient-to-br from-brass-dark via-surface-3 to-surface-2 font-display font-bold text-brass-light',
          variant === 'card' ? 'aspect-[3/4] text-5xl' : 'aspect-square text-lg',
          className,
        )}
      >
        {initials(hero.name)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={hero.name}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={clsx(
        'bg-surface-2 object-cover',
        variant === 'card' ? 'aspect-[3/4] object-top' : 'aspect-square',
        className,
      )}
    />
  )
}
