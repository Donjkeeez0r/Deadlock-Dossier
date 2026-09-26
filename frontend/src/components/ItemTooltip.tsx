import clsx from 'clsx'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { ItemCategory, ItemTooltipData, TooltipParagraph, TooltipSection } from '../api/types'
import { useItemMap, useItemTooltips } from '../hooks/queries'
import { CATEGORY_TEXT } from '../lib/categories'
import { roman } from '../lib/format'
import { Souls } from './ItemTile'
import { Skeleton } from './States'

const OPEN_DELAY = 250
const GAP = 10
const MARGIN = 8

const SECTION_TITLE: Record<TooltipSection['kind'], string> = {
  innate: 'Бонусы',
  passive: 'Пассивно',
  active: 'Активно',
}

const CATEGORY_LINE: Record<ItemCategory, string> = {
  weapon: 'bg-weapon',
  vitality: 'bg-vitality',
  spirit: 'bg-spirit',
}

function Paragraph({ paragraph }: { paragraph: TooltipParagraph }) {
  return (
    <p className={paragraph.note ? 'text-[0.8rem] leading-snug text-parchment-muted italic' : 'leading-snug text-parchment'}>
      {paragraph.segments.map((segment, i) =>
        segment.highlight ? (
          <strong key={i} className="font-semibold text-brass-light">
            {segment.text}
          </strong>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </p>
  )
}

function Section({ section, category }: { section: TooltipSection; category: ItemCategory | null }) {
  const accent = category ? CATEGORY_TEXT[category] : 'text-brass-light'
  const important = section.stats.filter((s) => s.important)
  const regular = section.stats.filter((s) => !s.important)

  return (
    <section className="flex flex-col gap-2.5 border-t border-brass/20 px-4 py-3">
      <header className="flex items-center justify-between gap-3">
        <h3 className="poster text-[0.8rem] font-bold tracking-[0.16em] text-brass">{SECTION_TITLE[section.kind]}</h3>
        {(section.cooldown || section.duration) && (
          <p className="nums flex gap-3 text-xs text-parchment-muted">
            {section.duration && <span>Длит. {section.duration}</span>}
            {section.cooldown && <span>Перезарядка {section.cooldown}</span>}
          </p>
        )}
      </header>

      {section.paragraphs.map((paragraph, i) => (
        <Paragraph key={i} paragraph={paragraph} />
      ))}

      {section.effects.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {section.effects.map((effect) => (
            <li key={effect} className="bg-surface-3 px-2 py-0.5 text-xs font-semibold text-parchment">
              {effect}
            </li>
          ))}
        </ul>
      )}

      {important.length > 0 && (
        <dl className="grid grid-cols-2 gap-1.5">
          {important.map((stat) => (
            // Значение крупно сверху, подпись снизу; в разметке dt идёт первым.
            <div key={stat.label + stat.value} className="flex flex-col-reverse bg-surface-2 px-2.5 py-1.5">
              <dt className="mt-1 text-xs leading-tight text-parchment-muted">{stat.label}</dt>
              <dd className={clsx('nums font-display text-lg leading-none font-bold', stat.negative ? 'text-loss' : accent)}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {regular.length > 0 && (
        <dl className="flex flex-col gap-1 text-sm">
          {regular.map((stat) => (
            <div key={stat.label + stat.value} className="flex items-baseline justify-between gap-4">
              <dt className="text-parchment-muted">{stat.label}</dt>
              <dd className={clsx('nums shrink-0 font-semibold', stat.negative ? 'text-loss' : 'text-parchment')}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

function TooltipBody({ itemId, data, loading }: { itemId: number; data: ItemTooltipData | undefined; loading: boolean }) {
  const item = useItemMap().get(itemId)
  const category = item?.category ?? null

  return (
    <>
      <div className={clsx('h-1', category ? CATEGORY_LINE[category] : 'bg-brass')} aria-hidden="true" />
      <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-3">
        <div className="min-w-0">
          <p className="font-serif text-2xl leading-tight text-parchment">{data?.nameRu ?? item?.name}</p>
          {data && item && data.nameRu !== item.name && (
            <p className="mt-0.5 text-xs tracking-wide text-parchment-muted">{item.name}</p>
          )}
        </div>
        {item && (
          <div className="flex shrink-0 flex-col items-end gap-1 pt-1">
            <Souls value={item.cost} className="text-sm text-soul" />
            {item.tier && <span className="font-serif text-sm text-brass">Тир {roman(item.tier)}</span>}
          </div>
        )}
      </header>
      {loading ? (
        <div className="flex flex-col gap-2 border-t border-brass/20 px-4 py-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : (
        data?.sections.map((section, i) => <Section key={i} section={section} category={category} />)
      )}
    </>
  )
}

type Position = { top: number; left: number }

/**
 * Подсказка предмета для мыши и клавиатуры. На тач-экранах не открывается:
 * там тап по предмету — это действие (добавить в сборку), а наведения нет.
 */
export function ItemTooltip({
  itemId,
  children,
  className,
  focusLabel,
}: {
  itemId: number
  children: ReactNode
  className?: string
  /**
   * Если внутри нет кнопки или ссылки — сделать саму обёртку фокусируемой картинкой с этим именем,
   * чтобы подсказку можно было открыть с клавиатуры.
   */
  focusLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<Position | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const id = useId()

  const { data, isPending, isError } = useItemTooltips(open)
  const tooltip = data?.[String(itemId)]
  // Загрузилось, а подсказки нет (предмет вне магазина) или запрос упал — ничего не показываем.
  const visible = open && !isError && (isPending || !!tooltip)

  function show() {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(true), OPEN_DELAY)
  }

  function hide() {
    clearTimeout(timer.current)
    setOpen(false)
    setPosition(null)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  // Описание ставим на тот элемент, который получает фокус: на обёртке его не прочитает скринридер.
  useEffect(() => {
    const anchor = anchorRef.current
    if (!visible || !anchor) return
    const target = focusLabel ? anchor : (anchor.querySelector<HTMLElement>('button, a[href], [tabindex]') ?? anchor)
    target.setAttribute('aria-describedby', id)
    return () => target.removeAttribute('aria-describedby')
  }, [visible, id, focusLabel])

  useEffect(() => {
    if (!open) return
    const close = () => {
      setOpen(false)
      setPosition(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    // Позиция считается один раз при открытии — при прокрутке проще закрыть, чем догонять.
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  // Справа от предмета, если влезает, иначе слева; по вертикали — вровень с верхом, но в пределах экрана.
  useLayoutEffect(() => {
    if (!visible) return
    const anchor = anchorRef.current?.getBoundingClientRect()
    const box = tooltipRef.current?.getBoundingClientRect()
    if (!anchor || !box) return
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = anchor.right + GAP
    if (left + box.width > vw - MARGIN) left = anchor.left - GAP - box.width
    left = Math.min(Math.max(left, MARGIN), vw - box.width - MARGIN)

    const top = Math.min(Math.max(anchor.top, MARGIN), Math.max(vh - box.height - MARGIN, MARGIN))
    setPosition((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
  }, [visible, tooltip, isPending])

  return (
    <div
      ref={anchorRef}
      className={className}
      {...(focusLabel ? { tabIndex: 0, role: 'img', 'aria-label': focusLabel } : {})}
      onPointerEnter={(e: PointerEvent) => e.pointerType === 'mouse' && show()}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={(e: FocusEvent) => e.target.matches(':focus-visible') && show()}
      onBlur={hide}
    >
      {children}
      {visible &&
        createPortal(
          // Тень на обёртке: clip-path рамки срезал бы её.
          <div
            ref={tooltipRef}
            id={id}
            role="tooltip"
            style={{ top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }}
            className="pointer-events-none fixed z-50 w-[22rem] max-w-[calc(100vw-1rem)] drop-shadow-[0_16px_32px_rgb(0_0_0/0.7)]"
          >
            <div className="frame max-h-[calc(100dvh-1rem)] overflow-hidden text-sm">
              <TooltipBody itemId={itemId} data={tooltip} loading={isPending} />
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
