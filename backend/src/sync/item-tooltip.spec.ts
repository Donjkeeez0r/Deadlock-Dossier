import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildItemTooltip,
  formatStatValue,
  parseLocString,
  type RawTooltipItem,
} from './item-tooltip';

// Реальные предметы из /assets/items/by-type/upgrade?language=russian (свойства урезаны до используемых).
const items = JSON.parse(
  readFileSync(join(__dirname, '__fixtures__/items-ru.json'), 'utf8'),
) as Record<string, RawTooltipItem>;

describe('formatStatValue', () => {
  it('{s:sign} ставит плюс у положительных и минус у отрицательных', () => {
    expect(
      formatStatValue({ value: '8', prefix: '{s:sign}', postfix: '%' }),
    ).toBe('+8%');
    expect(
      formatStatValue({ value: '-8', prefix: '{s:sign}', postfix: '%' }),
    ).toBe('−8%');
  });

  it('явный префикс сохраняется', () => {
    expect(formatStatValue({ value: '32', prefix: '-', postfix: '%' })).toBe(
      '−32%',
    );
  });

  it('убирает суффикс метров и пишет дроби через запятую', () => {
    expect(formatStatValue({ value: '0.75m', postfix: ' м' })).toBe('0,75 м');
    expect(formatStatValue({ value: '4m', postfix: ' м/с' })).toBe('4 м/с');
  });

  it('числа приходят и строкой, и числом', () => {
    expect(formatStatValue({ value: 16.0, postfix: ' с.' })).toBe('16 с.');
  });

  it('пустые и нулевые значения скрываются', () => {
    expect(formatStatValue({ value: undefined })).toBeNull();
    expect(formatStatValue({ value: '0', postfix: ' с.' })).toBeNull();
    expect(formatStatValue({ value: 'abc' })).toBeNull();
  });
});

describe('parseLocString', () => {
  it('выделяет highlight, режет SVG и незакрытые panel', () => {
    const text =
      'Вы получите <svg width="1"><path d="M1"/></svg>\n<span class="inline-attribute-label Heal" style="color: #0F9;">лечение</span> и бонусы к <panel class="InlineAttributeIcon MoveSpeed" replacechar="_"><span class="InlineAttributeName MoveSpeed">скорости</span>.';
    expect(parseLocString(text, {})).toEqual([
      {
        segments: [
          { text: 'Вы получите ' },
          { text: 'лечение', highlight: true },
          { text: ' и бонусы к ' },
          { text: 'скорости', highlight: true },
          { text: '.' },
        ],
      },
    ]);
  });

  it('diminish становится примечанием, <br> делит абзацы', () => {
    const text =
      'Атака <span class="highlight">лечит</span>. <span class="diminish"><br><br>Лечение от существ эффективно на 30%.</span>';
    expect(parseLocString(text, {})).toEqual([
      {
        segments: [
          { text: 'Атака ' },
          { text: 'лечит', highlight: true },
          { text: '.' },
        ],
      },
      {
        segments: [{ text: 'Лечение от существ эффективно на 30%.' }],
        note: true,
      },
    ]);
  });

  it('подставляет {s::Prop} из свойств', () => {
    expect(
      parseLocString('Снижается на {s::Reduction}%.', {
        Reduction: { value: '30' },
      }),
    ).toEqual([{ segments: [{ text: 'Снижается на 30%.' }] }]);
  });

  it('числовые сущности, одинарные кавычки и одиночный «<» в тексте', () => {
    expect(
      parseLocString(
        "Урон &#8212; <span class='highlight'>больше</span>, если здоровье < 50% &#x2014; иначе нет.",
        {},
      ),
    ).toEqual([
      {
        segments: [
          { text: 'Урон — ' },
          { text: 'больше', highlight: true },
          { text: ', если здоровье < 50% — иначе нет.' },
        ],
      },
    ]);
  });

  it('пустой текст — без абзацев', () => {
    expect(parseLocString('', {})).toEqual([]);
    expect(parseLocString(undefined, {})).toEqual([]);
  });
});

describe('buildItemTooltip', () => {
  it('пассивный предмет: врождённые характеристики и пассивка', () => {
    const tooltip = buildItemTooltip(items.passive);
    expect(tooltip.nameRu).toBe('Вскрывающие патроны');
    expect(tooltip.sections.map((s) => s.kind)).toEqual(['innate', 'passive']);
    expect(tooltip.sections[0].stats).toContainEqual({
      label: 'Урон от оружия',
      value: '+8%',
    });
    const passive = tooltip.sections[1];
    expect(passive.paragraphs[0].segments).toContainEqual({
      text: 'урон от оружия',
      highlight: true,
    });
    expect(passive.stats).toContainEqual({
      label: 'Урон от оружия',
      value: '+25%',
      important: true,
    });
  });

  it('перезарядка и длительность — отдельно от характеристик', () => {
    const passive = buildItemTooltip(items.fervor).sections[1];
    expect(passive.cooldown).toBe('16 с.');
    expect(passive.duration).toBe('10 с.');
    expect(passive.stats.map((s) => s.label)).not.toContain('Перезарядка');
    expect(passive.stats).toContainEqual({
      label: 'Скорость передвижения',
      value: '4 м/с',
      important: true,
    });
  });

  it('активный предмет получает секцию active', () => {
    const tooltip = buildItemTooltip(items.active);
    const active = tooltip.sections.find((s) => s.kind === 'active');
    expect(active?.cooldown).toBe('270 с.');
  });

  it('секция без типа считается пассивной', () => {
    const tooltip = buildItemTooltip(items.untyped);
    expect(tooltip.sections.some((s) => s.kind === 'passive')).toBe(true);
  });

  it('эффекты статуса берутся из important_properties_with_icon', () => {
    const active = buildItemTooltip(items.status).sections.find(
      (s) => s.kind === 'active',
    );
    expect(active?.effects).toContain('Безмолвие');
    expect(active?.stats.map((s) => s.label)).not.toContain('StatusEffectEMP');
  });

  it('свойства без значения пропускаются, отрицательные со знаком минус', () => {
    const active = buildItemTooltip(items.rusty).sections.find(
      (s) => s.kind === 'active',
    );
    expect(active?.stats.map((s) => s.label)).not.toContain('Урон');
    expect(active?.stats).toContainEqual({
      label: 'Скорострельность',
      value: '−32%',
      important: true,
    });
  });

  it('перезарядка без подписи, секция только с длительностью, дубли свойств', () => {
    const tooltip = buildItemTooltip({
      name: 'Тест',
      properties: {
        AbilityCooldown: { value: '12', css_class: 'cooldown', postfix: ' с.' },
        AbilityDuration: { value: '3', css_class: 'duration', postfix: ' с.' },
        Bonus: { value: '5', label: 'Бонус', prefix: '{s:sign}' },
      },
      tooltip_sections: [
        {
          section_type: 'active',
          section_attributes: [
            {
              properties: ['AbilityCooldown', 'Bonus'],
              important_properties: ['Bonus'],
            },
          ],
        },
        {
          section_type: 'passive',
          section_attributes: [{ properties: ['AbilityDuration'] }],
        },
      ],
    });
    expect(tooltip.sections[0].cooldown).toBe('12 с.');
    expect(tooltip.sections[0].stats).toEqual([
      { label: 'Бонус', value: '+5', important: true },
    ]);
    expect(tooltip.sections[1]).toMatchObject({
      kind: 'passive',
      duration: '3 с.',
    });
  });

  it('ни в одном тексте не остаётся разметки и заготовок', () => {
    for (const item of Object.values(items)) {
      const json = JSON.stringify(buildItemTooltip(item));
      expect(json).not.toMatch(/<|>|\{s:|&\w+;/);
    }
  });
});
