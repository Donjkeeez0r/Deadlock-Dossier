import clsx from 'clsx'
import type { ReactNode } from 'react'

type PanelProps = {
  title?: ReactNode
  aside?: ReactNode
  quiet?: boolean
  className?: string
  bodyClassName?: string
  children: ReactNode
}

/** Панель в рамке ар-деко с необязательной «табличкой»-заголовком. */
export function Panel({ title, aside, quiet, className, bodyClassName, children }: PanelProps) {
  return (
    <section className={clsx('frame', quiet && 'frame-quiet', className)}>
      {title && (
        <header className="flex items-baseline justify-between gap-4 border-b border-brass/20 px-5 pt-4 pb-3 sm:px-6">
          <h2 className="poster text-xl font-bold text-brass-light sm:text-2xl">{title}</h2>
          {aside && <div className="text-sm text-parchment-muted">{aside}</div>}
        </header>
      )}
      <div className={clsx('p-5 sm:p-6', bodyClassName)}>{children}</div>
    </section>
  )
}

/** Ромб на двойной линии — разделитель разделов. */
export function Rule({ className }: { className?: string }) {
  return (
    <div className={clsx('rule', className)} aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-brass">
        <path d="M7 0 14 7 7 14 0 7Z" fill="none" stroke="currentColor" />
        <path d="M7 4 10 7 7 10 4 7Z" fill="currentColor" />
      </svg>
    </div>
  )
}

/** Заголовок страницы: афишная строка + антиква-подзаголовок. */
export function PageHeading({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h1 className="poster text-5xl font-bold text-parchment sm:text-6xl">{title}</h1>
        {lead && <p className="mt-3 font-serif text-xl text-parchment-muted italic sm:text-2xl">{lead}</p>}
      </div>
      {children}
    </div>
  )
}
