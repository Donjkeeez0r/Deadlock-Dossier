// Превращает сырой тултип предмета из deadlock-api в компактные данные без HTML.
// Тексты приходят с разметкой игрового клиента (span/panel/svg, <br>, {s:...}),
// фронт получает только фрагменты текста с пометкой «выделено» — чужой HTML он не вставляет.

export type RawProperty = {
  value?: string | number | null;
  label?: string | null;
  prefix?: string | null;
  postfix?: string | null;
  css_class?: string | null;
  negative_attribute?: boolean | null;
};

type RawSectionAttribute = {
  loc_string?: string | null;
  properties?: string[] | null;
  elevated_properties?: string[] | null;
  important_properties?: string[] | null;
  important_properties_with_icon?:
    { name: string; localized_name?: string | null }[] | null;
};

export type RawTooltipItem = {
  name: string;
  tooltip_sections?:
    | { section_type?: string; section_attributes?: RawSectionAttribute[] }[]
    | null;
  properties?: Record<string, RawProperty> | null;
};

export type TooltipSegment = { text: string; highlight?: true };
export type TooltipParagraph = { segments: TooltipSegment[]; note?: true };
export type TooltipStat = {
  label: string;
  value: string;
  important?: true;
  negative?: true;
};
export type TooltipSection = {
  kind: 'innate' | 'passive' | 'active';
  paragraphs: TooltipParagraph[];
  stats: TooltipStat[];
  /** Накладываемые эффекты статуса: «Безмолвие», «Оглушение». */
  effects: string[];
  cooldown?: string;
  duration?: string;
};
export type ItemTooltip = { nameRu: string; sections: TooltipSection[] };

const MINUS = '−';

function parseNumber(value: RawProperty['value']): number | null {
  if (value === null || value === undefined) return null;
  // Суффикс «m» — значение уже в метрах (единицы в postfix).
  const raw =
    typeof value === 'number' ? String(value) : value.replace(/m$/, '');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;
  return Number(raw);
}

function formatNumber(n: number): string {
  // 16.0 → «16», 0.75 → «0,75».
  return String(Math.abs(n)).replace('.', ',');
}

/** Значение характеристики со знаком и единицами; null — показывать нечего. */
export function formatStatValue(property: RawProperty): string | null {
  const n = parseNumber(property.value);
  if (n === null || n === 0) return null;

  const prefix = property.prefix ?? '';
  let sign = '';
  if (prefix === '{s:sign}') sign = n > 0 ? '+' : MINUS;
  else if (prefix === '-' || n < 0) sign = MINUS;
  else if (prefix === '+') sign = '+';

  return `${sign}${formatNumber(n)}${property.postfix ?? ''}`;
}

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
};

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(parseInt(code, 16)),
    )
    .replace(/&(nbsp|amp|lt|gt|quot);/g, (m) => ENTITIES[m]);
}

/** Значение атрибута class в любых кавычках. */
function classOf(tag: string): string {
  return /class\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2] ?? '';
}

function isHighlight(tag: string): boolean {
  return /highlight|inline-attribute-label|InlineAttributeName/.test(
    classOf(tag),
  );
}

/** Разбирает loc_string на абзацы из простых фрагментов. */
export function parseLocString(
  input: string | null | undefined,
  properties: Record<string, RawProperty>,
): TooltipParagraph[] {
  if (!input) return [];

  const text = input
    // Иконки-SVG целиком, вместе с содержимым.
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    // {s::Prop} — значение свойства прямо в тексте.
    .replace(/\{s::?(\w+)\}/g, (_, name: string) => {
      const n = parseNumber(properties[name]?.value);
      return n === null ? '' : formatNumber(n);
    });

  const paragraphs: TooltipParagraph[] = [];
  let current: TooltipParagraph = { segments: [] };
  // Стек открытых span: для каждого — выделяет ли он текст и примечание ли это.
  const stack: { highlight: boolean; note: boolean }[] = [];
  const inNote = () => stack.some((s) => s.note);
  const inHighlight = () => stack.some((s) => s.highlight);

  const flush = () => {
    const segments = current.segments
      .map((s) => ({ ...s, text: s.text.replace(/\s+/g, ' ') }))
      .filter((s) => s.text !== '');
    if (segments.length > 0) {
      // Пробелы по краям абзаца не нужны.
      segments[0].text = segments[0].text.trimStart();
      const last = segments[segments.length - 1];
      last.text = last.text.trimEnd();
      const cleaned = segments.filter((s) => s.text !== '');
      if (cleaned.length > 0) {
        paragraphs.push(
          current.note
            ? { segments: cleaned, note: true }
            : { segments: cleaned },
        );
      }
    }
    current = inNote() ? { segments: [], note: true } : { segments: [] };
  };

  const pushText = (raw: string) => {
    const value = decode(raw);
    if (!value) return;
    const highlight = inHighlight();
    const prev = current.segments[current.segments.length - 1];
    if (prev && !!prev.highlight === highlight) prev.text += value;
    else
      current.segments.push(
        highlight ? { text: value, highlight: true } : { text: value },
      );
  };

  // Тегом считается только «<имя…>» или «</имя>»: одиночный «<» в тексте («< 50%») остаётся текстом.
  for (const token of text.split(/(<\/?[a-z][^<>]*>)/i)) {
    if (!/^<\/?[a-z]/i.test(token)) {
      pushText(token);
      continue;
    }
    const tag = token.toLowerCase();
    if (/^<br\s*\/?>$/.test(tag)) {
      flush();
    } else if (tag.startsWith('<span')) {
      const note = /diminish/.test(classOf(token));
      if (note) flush();
      stack.push({ highlight: isHighlight(token), note });
      if (note) current.note = true;
    } else if (tag === '</span>') {
      const closed = stack.pop();
      if (closed?.note) flush();
    }
    // <panel>, <img> и прочие теги просто выбрасываются.
  }
  flush();

  return paragraphs;
}

const SECTION_KINDS = new Set(['innate', 'passive', 'active']);

export function buildItemTooltip(item: RawTooltipItem): ItemTooltip {
  const properties = item.properties ?? {};
  const sections: TooltipSection[] = [];

  for (const raw of item.tooltip_sections ?? []) {
    const kind = SECTION_KINDS.has(raw.section_type ?? '')
      ? (raw.section_type as TooltipSection['kind'])
      : // Секция без типа — описание пассивного эффекта.
        'passive';
    const section: TooltipSection = {
      kind,
      paragraphs: [],
      stats: [],
      effects: [],
    };
    const seen = new Set<string>();

    for (const attr of raw.section_attributes ?? []) {
      section.paragraphs.push(...parseLocString(attr.loc_string, properties));

      for (const effect of attr.important_properties_with_icon ?? []) {
        const name = effect.localized_name;
        if (name && !section.effects.includes(name)) section.effects.push(name);
      }

      const lists: [string[] | null | undefined, boolean][] = [
        [attr.important_properties, true],
        [attr.elevated_properties, true],
        [attr.properties, false],
      ];
      for (const [names, important] of lists) {
        for (const name of names ?? []) {
          // Свойство бывает сразу в important_properties и properties — берём первое (важное).
          if (seen.has(name)) continue;
          seen.add(name);
          const property = properties[name];
          if (!property) continue;
          const value = formatStatValue(property);
          if (value === null) continue;

          // Перезарядке и длительности подпись не нужна — у них своё место в заголовке секции.
          if (property.css_class === 'cooldown') section.cooldown = value;
          else if (property.css_class === 'duration') section.duration = value;
          else if (property.label) {
            const stat: TooltipStat = { label: property.label, value };
            if (important) stat.important = true;
            if (property.negative_attribute) stat.negative = true;
            section.stats.push(stat);
          }
        }
      }
    }

    const empty =
      section.paragraphs.length === 0 &&
      section.stats.length === 0 &&
      section.effects.length === 0 &&
      !section.cooldown &&
      !section.duration;
    if (!empty) sections.push(section);
  }

  return { nameRu: item.name, sections };
}
