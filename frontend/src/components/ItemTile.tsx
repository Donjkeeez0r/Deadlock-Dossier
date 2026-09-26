import clsx from 'clsx'
import { useState } from 'react'
import type { ItemCategory } from '../api/types'
import { CATEGORY_BG } from '../lib/categories'
import { roman } from '../lib/format'

type ItemIconProps = {
  name: string
  imageUrl: string | null
  category: ItemCategory | null
  tier?: number | null
  className?: string
}

/** Иконка предмета на цветной подложке категории, с тиром римской цифрой. */
export function ItemIcon({ name, imageUrl, category, tier, className }: ItemIconProps) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={clsx(
        'cut-sm relative flex aspect-square shrink-0 items-center justify-center overflow-hidden [--cut:5px]',
        category ? CATEGORY_BG[category] : 'bg-surface-3',
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/45" aria-hidden="true" />
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="relative w-[64%]"
        />
      ) : (
        <span className="relative font-display text-lg font-bold text-ink/80" aria-hidden="true">
          {name.slice(0, 2)}
        </span>
      )}
      {tier ? (
        <span className="absolute top-0.5 right-1 font-serif text-[0.7rem] leading-none font-semibold text-ink/85">
          {roman(tier)}
        </span>
      ) : null}
    </div>
  )
}

/** Цена в душах: число с бирюзовым ромбом-«душой». */
export function Souls({ value, className }: { value: number; className?: string }) {
  return (
    <span className={clsx('nums inline-flex items-center gap-1', className)}>
      <svg width="9" height="11" viewBox="0 0 9 11" aria-hidden="true" className="text-soul">
        <path d="M4.5 0 9 5.5 4.5 11 0 5.5Z" fill="currentColor" />
      </svg>
      {value.toLocaleString('ru-RU')}
      <span className="sr-only">душ</span>
    </span>
  )
}
