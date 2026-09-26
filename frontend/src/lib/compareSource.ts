// Сторона сравнения в адресе /compare?a=…&b=…:
//   <uuid>                — сохранённая сборка;
//   p:<heroId>            — популярная сборка героя (считается при открытии по текущей статистике);
//   <heroId>:<id>,<id>,…  — произвольный состав, например черновик конструктора.
// Модуль без импортов — его можно проверять прямо в Node.

export type CompareSource =
  | { kind: 'saved'; shareId: string }
  | { kind: 'popular'; heroId: number }
  | { kind: 'custom'; heroId: number; itemIds: number[] }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// id героев и предметов — uint32, то есть не длиннее 10 цифр.
const POSITIVE_INT = /^[1-9]\d{0,9}$/
const MIN_ITEMS = 2
const MAX_ITEMS = 12

export function parseCompareSource(raw: string | null): CompareSource | null {
  if (!raw) return null
  const value = raw.trim()
  if (UUID.test(value)) return { kind: 'saved', shareId: value.toLowerCase() }

  const popular = /^p:(\d+)$/.exec(value)
  if (popular && POSITIVE_INT.test(popular[1])) return { kind: 'popular', heroId: Number(popular[1]) }

  const custom = /^(\d+):([\d,]+)$/.exec(value)
  if (!custom || !POSITIVE_INT.test(custom[1])) return null
  const parts = custom[2].split(',')
  if (!parts.every((p) => POSITIVE_INT.test(p))) return null
  const itemIds = parts.map(Number)
  if (new Set(itemIds).size !== itemIds.length) return null
  if (itemIds.length < MIN_ITEMS || itemIds.length > MAX_ITEMS) return null
  return { kind: 'custom', heroId: Number(custom[1]), itemIds }
}

export function encodeCompareSource(source: CompareSource): string {
  switch (source.kind) {
    case 'saved':
      return source.shareId
    case 'popular':
      return `p:${source.heroId}`
    case 'custom':
      return `${source.heroId}:${source.itemIds.join(',')}`
  }
}

/** id сборки из вставленной ссылки «…/build/<uuid>» или из голого uuid. */
export function shareIdFromInput(input: string): string | null {
  const value = input.trim()
  const fromUrl = /\/build\/([0-9a-f-]{36})(?:[/?#]|$)/i.exec(value)?.[1]
  const candidate = fromUrl ?? value
  return UUID.test(candidate) ? candidate.toLowerCase() : null
}

/** Адрес страницы сравнения; пустая сторона в адрес не попадает. */
export function compareUrl(a: CompareSource | null, b: CompareSource | null = null): string {
  const params = new URLSearchParams()
  if (a) params.set('a', encodeCompareSource(a))
  if (b) params.set('b', encodeCompareSource(b))
  const query = params.toString()
  return query ? `/compare?${query}` : '/compare'
}
