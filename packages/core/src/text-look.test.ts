import { describe, expect, it } from 'vitest';
import { cleanLook, textRuns, toggleRange } from './text-look';
import type { GlossarySpan } from './glossary';

const term: GlossarySpan[] = [
  { kind: 'text', text: 'Your ' },
  { kind: 'term', text: 'operator', id: 'operator' },
  { kind: 'text', text: ' reads it Wednesday.' },
];

describe('text look', () => {
  it('leaves a paragraph with no styling empty', () => {
    expect(cleanLook(undefined, 'Hello')).toBeUndefined();
    expect(cleanLook({}, 'Hello')).toBeUndefined();
    expect(cleanLook({ color: 'nope', size: 14, highlight: [{ start: 3, end: 1 }] }, 'Hello')).toBeUndefined();
  });

  it('keeps a brand swatch, a custom color, a font and a size, and clamps a highlight to the text', () => {
    expect(cleanLook({ color: 'forest', font: 'mono', size: 20, highlight: [{ start: 2, end: 99 }, { start: 0, end: 3 }] }, 'Hello')).toEqual({
      color: 'forest',
      font: 'mono',
      size: 20,
      highlight: [{ start: 0, end: 5 }],
    });
    expect(cleanLook({ color: '#1F4D40' }, 'Hello')?.color).toBe('#1f4d40');
  });

  it('toggles a selection on and back off', () => {
    const on = toggleRange([], 2, 6, 10);
    expect(on).toEqual([{ start: 2, end: 6 }]);
    expect(toggleRange(on, 2, 6, 10)).toEqual([]);
    expect(toggleRange(on, 3, 5, 10)).toEqual([{ start: 2, end: 3 }, { start: 5, end: 6 }]);
    expect(toggleRange(on, 4, 8, 10)).toEqual([{ start: 2, end: 8 }]);
  });

  it('keeps a glossary term inside a highlight', () => {
    const runs = textRuns('Your operator reads it Wednesday.', term, [{ start: 5, end: 13 }]);
    expect(runs).toEqual([
      { text: 'Your ', highlight: false },
      { text: 'operator', highlight: true, termId: 'operator' },
      { text: ' reads it Wednesday.', highlight: false },
    ]);
  });
});
