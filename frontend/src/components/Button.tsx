import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'

type Variant = 'brass' | 'ghost' | 'soul' | 'danger'
type Size = 'md' | 'lg' | 'sm'

const base =
  'cut relative inline-flex items-center justify-center gap-2 font-display font-bold uppercase tracking-[0.12em] transition-[background-color,color,box-shadow,filter] duration-200 disabled:cursor-not-allowed disabled:opacity-45 select-none'

const variants: Record<Variant, string> = {
  brass:
    'bg-gradient-to-b from-brass-light via-brass to-brass-dark text-ink hover:brightness-110 active:brightness-95 enabled:hover:shadow-[0_0_24px_rgb(201_162_90/0.35)]',
  ghost:
    'bg-surface-2 text-brass-light shadow-[inset_0_0_0_1px_rgb(201_162_90/0.45)] hover:bg-surface-3 hover:text-parchment',
  soul: 'bg-soul/10 text-soul shadow-[inset_0_0_0_1px_rgb(95_224_192/0.5)] hover:bg-soul/20 hover:shadow-[inset_0_0_0_1px_rgb(95_224_192/0.8),0_0_18px_rgb(95_224_192/0.25)]',
  danger: 'bg-loss/15 text-loss shadow-[inset_0_0_0_1px_rgb(209_73_63/0.6)] hover:bg-loss/25 hover:text-parchment',
}

const sizes: Record<Size, string> = {
  sm: 'cut-sm h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-base [--cut:9px]',
  lg: 'h-14 px-7 text-lg [--cut:12px]',
}

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode }

export function Button({
  variant = 'brass',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={clsx(base, variants[variant], sizes[size], className)} {...rest} />
}

export function ButtonLink({ variant = 'brass', size = 'md', className, ...rest }: Common & LinkProps) {
  return <Link className={clsx(base, variants[variant], sizes[size], className)} {...rest} />
}
