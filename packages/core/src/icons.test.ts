import { describe, it, expect } from 'vitest';
import { ICONS, MODULE_ICONS } from './icons';
import { ref } from '../test/oracle';

describe('icons @g1', () => {
  it('has exactly the reference icon set', () => expect(ICONS).toEqual(ref.ICONS));
  it('has the same 12 module icons', () => expect([...MODULE_ICONS]).toEqual(ref.MODULE_ICONS));
  it('draws 81 glyphs', () => expect(Object.keys(ICONS)).toHaveLength(81));
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
