// @vitest-environment node
//
// D-177: the learner v2 mockup's chrome glyphs are in ICONS as `lv*`, their path data verbatim from the
// artboards (docs/design/learner-v2). The lock's two paths (body and shackle) are one entry.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ICONS } from '@ai/core';

const DIR = fileURLToPath(new URL('../../../../../docs/design/learner-v2/', import.meta.url));
const paths = new Set(
  readdirSync(DIR)
    .filter((f) => f.endsWith('.html'))
    .flatMap((f) => {
      const html = readFileSync(DIR + f, 'utf8');
      return [...html.slice(html.indexOf('<body')).matchAll(/<path[^>]* d="([^"]+)"/g)].map((m) => m[1]!);
    }),
);

describe('the learner v2 glyphs (D-177)', () => {
  const lv = Object.entries(ICONS).filter(([k]) => /^lv[A-Z]/.test(k));

  it('has the mockup’s eleven', () => {
    expect(lv.map(([k]) => k)).toEqual(['lvHome', 'lvGrid', 'lvLock', 'lvHelp', 'lvLive', 'lvCalAdd', 'lvArrow', 'lvVideo', 'lvInvite', 'lvCopy', 'lvInfo']);
  });

  it('draws each one exactly as the artboards do', () => {
    for (const [name, d] of lv) {
      if (name === 'lvLock') {
        expect(paths.has('M6 11h12v9H6z'), 'lock body').toBe(true);
        expect(paths.has('M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11'), 'lock shackle').toBe(true);
        expect(d).toBe('M6 11h12v9H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11');
      } else expect(paths.has(d), name).toBe(true);
    }
  });
});
