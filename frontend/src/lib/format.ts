const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V']

export function roman(tier: number | null): string {
  return tier && ROMAN[tier] ? ROMAN[tier] : '—'
}

const intFormat = new Intl.NumberFormat('ru-RU')

export function formatInt(value: number): string {
  return intFormat.format(Math.round(value))
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`
}

export function formatDecimal(value: number, digits = 2): string {
  return value.toFixed(digits).replace('.', ',')
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date)
}

/** «1 матч», «3 матча», «12 матчей». */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export function matchesLabel(n: number): string {
  return `${formatInt(n)} ${plural(n, 'матч', 'матча', 'матчей')}`
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s&]/gu, '').split(/\s+/).filter((p) => p && p !== '&')
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export const CATEGORY_LABEL = { weapon: 'Оружие', vitality: 'Живучесть', spirit: 'Дух' } as const
