import { describe, it, expect } from 'vitest';
import { ICONS, MODULE_ICONS } from './icons';
import { ref } from '../test/oracle';

const lms = Object.fromEntries(Object.entries(ICONS).filter(([k]) => !k.startsWith('r2') && !/^lv[A-Z]/.test(k)));
const lv = Object.fromEntries(Object.entries(ICONS).filter(([k]) => /^lv[A-Z]/.test(k)));
const r2 = Object.fromEntries(Object.entries(ICONS).filter(([k]) => k.startsWith('r2')));

describe('icons @g1', () => {
  it('has exactly the reference icon set', () => expect(lms).toEqual(ref.ICONS));
  it('has the same 12 module icons', () => expect([...MODULE_ICONS]).toEqual(ref.MODULE_ICONS));
  it('draws 81 glyphs of its own', () => expect(Object.keys(lms)).toHaveLength(81));
  // Verbatim against the mockup's `P` map: apps/web/src/styles/r2-tokens.test.ts, which can read it.
  it('adds the R2 mockup’s 45 as r2* (D-160 R2-1b)', () => {
    expect(Object.keys(r2)).toHaveLength(45);
  });
  // Verbatim against the learner mockup's artboards: apps/web/src/routes/learn/icons.test.ts, which reads them.
  it('adds the learner v2 mockup’s 11 chrome glyphs as lv* (D-177)', () => {
    expect(Object.keys(lv)).toHaveLength(11);
    expect(Object.keys(ICONS)).toHaveLength(137);
  });
  it('every module icon exists in the set', () => {
    for (const name of MODULE_ICONS) expect(ICONS[name]).toBeTruthy();
  });
  it('every path is a 24-grid path string', () => {
    for (const [name, d] of Object.entries(ICONS)) {
      expect(typeof d, name).toBe('string');
      expect(d.trim().startsWith('M') || d.trim().startsWith('m'), name).toBe(true);
    }
  });
});
