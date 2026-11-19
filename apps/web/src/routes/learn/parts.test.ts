// D-189: a step table's columns keep a floor, so a narrow one cannot shrink to nothing.
import { describe, expect, it } from 'vitest';
import { columnTemplate } from './parts';

describe('a step table’s columns (D-189)', () => {
  it('gives each column a 7rem floor, as wide as its longest cell asks', () => {
    expect(columnTemplate(['Where', 'What you do', 'Done'], [['A', 'B', 'C']], 3)).toBe('minmax(7rem, 5fr) minmax(7rem, 11fr) minmax(7rem, 4fr)');
  });

  it('keeps a caller’s own floor, which the skill sample tables still use', () => {
    expect(columnTemplate(['Where'], [['A']], 1, '0')).toBe('minmax(0, 5fr)');
  });
});
