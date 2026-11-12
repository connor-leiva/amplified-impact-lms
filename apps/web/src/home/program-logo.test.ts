import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { MEMBERSHIP_NAME, PLAN_NAMES } from '@ai/core/offer';
import { CARD_NAMES } from '../site/offers';
import { ART, PROGRAMS, programLogo, type ProgramKey } from './program-logo';

// Connor's program logos, ported from his `ProgramLogo.tsx` to the www pages' string pattern. The port
// was checked against the original React component (renderToStaticMarkup) for every program, variant and
// title case before it landed: the same elements and attributes. These tests keep it that way.

const svg = (markup: string) =>
  new DOMParser().parseFromString(`<body>${markup}</body>`, 'text/html').body.firstElementChild!;
const keys = PROGRAMS.map((p) => p.key);

describe('the artwork', () => {
  it('is Connor’s, unedited: the paths, view boxes and transforms hash to the shipped file’s', () => {
    // sha256 of JSON.stringify(ART) as generated from ProgramLogo.tsx (Nov 11, 2026). A change here means
    // the artwork changed: regenerate from the logo source instead of editing a path by hand.
    expect(createHash('sha256').update(JSON.stringify(ART)).digest('hex')).toBe(
      '8350950bca3d1a92216106a1cf31f90fc0a1c8e01ba645d65487373cbe3bfe4c',
    );
  });

  it('pins each variant on its own: the symbols (and tiles, the same marks), the horizontal lockups and the stacked ones', () => {
    // sha256 of JSON.stringify of the four programs' artwork for one variant, in menu order, as ported
    // byte for byte from ProgramLogo.tsx (re-checked against it on Nov 12, 2026 for the homepage's cards,
    // which use the stacked lockups). A change here means that variant's artwork changed.
    const pin = (variant: 'symbol' | 'tile' | 'lockup' | 'stacked') =>
      createHash('sha256')
        .update(JSON.stringify(keys.map((k) => ART[k][variant])))
        .digest('hex');
    expect(pin('symbol')).toBe('8429b5e53b8e44bc006caf8a64f720bb09dd558de2fbf3be669161853b7a4683');
    expect(pin('tile')).toBe('8429b5e53b8e44bc006caf8a64f720bb09dd558de2fbf3be669161853b7a4683');
    expect(pin('lockup')).toBe('1b7b65062f7e2b20b0e3cca08217cc5ec4c998275e80d39b5f5685680e5ed158');
    expect(pin('stacked')).toBe('43c49677d6253f08c5e85584c656e10fc963aa7284af2b8f602ce30cae9edb3f');
  });

  it('draws every stacked lockup the same height at a given type size, and the horizontal ones too', () => {
    for (const variant of ['stacked', 'lockup'] as const) {
      const heights = keys.map((k) => svg(programLogo(k, { variant, size: 24 })).getAttribute('height'));
      expect(new Set(heights).size, variant).toBe(1);
    }
    expect(svg(programLogo('accelerator', { variant: 'stacked', size: 24 })).getAttribute('height')).toBe('45.15');
  });

  it('names each program exactly as the live offer does, in menu order', () => {
    expect(PROGRAMS.map((p) => [p.key, p.name])).toEqual([
      ['accelerator', PLAN_NAMES.cohort],
      ['team-plan', PLAN_NAMES.agents],
      ['agent-plan', CARD_NAMES.agentPlan],
      ['insiders', MEMBERSHIP_NAME],
    ]);
    for (const k of keys) expect(ART[k].name).toBe(PROGRAMS.find((p) => p.key === k)!.name);
  });
});

describe('programLogo()', () => {
  it('draws a 24px symbol by default: ink in currentColor, the signal in var(--signal)', () => {
    const el = svg(programLogo('team-plan'));
    expect([el.getAttribute('viewBox'), el.getAttribute('width'), el.getAttribute('height')]).toEqual([
      '0 0 48 48',
      '24',
      '24',
    ]);
    const [ink, signal] = [...el.querySelectorAll('path')];
    expect(ink!.getAttribute('fill')).toBe('currentColor');
    expect(signal!.getAttribute('style')).toBe('fill:var(--signal, currentColor)');
    expect(el.getAttribute('style')).toBe('display:block;flex:none');
  });

  it('names itself by default, takes another name, and hides itself when the name is written beside it', () => {
    for (const k of keys) {
      const named = svg(programLogo(k));
      expect(
        [named.getAttribute('role'), named.getAttribute('aria-label'), named.hasAttribute('aria-hidden')],
        k,
      ).toEqual(['img', ART[k].name, false]);
      const hidden = svg(programLogo(k, { title: '' }));
      expect(
        [hidden.hasAttribute('role'), hidden.hasAttribute('aria-label'), hidden.getAttribute('aria-hidden')],
        k,
      ).toEqual([false, false, 'true']);
    }
    expect(svg(programLogo('insiders', { title: 'Insiders "key" & lock' })).getAttribute('aria-label')).toBe(
      'Insiders "key" & lock',
    );
  });

  it('sizes lockups by their type size, and keeps tiles in their own colours', () => {
    const lockup = svg(programLogo('accelerator', { variant: 'lockup', size: 28 }));
    expect([lockup.getAttribute('width'), lockup.getAttribute('height')]).toEqual(['323.29', '31.51']);
    expect(lockup.querySelectorAll('path')).toHaveLength(3);
    const stacked = svg(programLogo('insiders', { variant: 'stacked' }));
    expect(stacked.querySelectorAll('path')).toHaveLength(4);
    const tile = svg(programLogo('agent-plan', { variant: 'tile' }));
    expect([...tile.querySelectorAll('path')].map((p) => p.getAttribute('fill'))).toEqual([
      '#1f4d40',
      '#f5f5f2',
      '#6fd3a5',
    ]);
  });

  it('escapes what it is given', () => {
    const el = programLogo('accelerator' as ProgramKey, { className: 'a"b', style: 'color:red"><x', title: '<b>' });
    expect(el).not.toMatch(/<b>|"><x/);
    expect(svg(el).getAttribute('class')).toBe('a"b');
  });
});
