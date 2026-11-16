// @vitest-environment node
//
// D-160 R2-1b: the Admin redesign R2 tokens (styles/r2.css) are the signed-off mockup's, verbatim,
// scoped to the admin shell, and hold the phone floor by construction.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ICONS } from '@ai/core';

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');
const R2 = read('./r2.css');
const JSX = read('../../../../design-reference/admin-redesign-r2/AdminRedesign.jsx');

/** `--name: value` pairs inside the first rule whose selector is exactly `sel`. */
function vars(css: string, sel: string): Map<string, string> {
  const at = css.indexOf(`${sel}{`) >= 0 ? css.indexOf(`${sel}{`) : css.indexOf(`${sel} {`);
  if (at < 0) throw new Error(`no ${sel}`);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  return new Map(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)].map((m) => [m[1]!, m[2]!.trim().replace(/\s+/g, ' ')]),
  );
}

/** The block of a media query in r2.css. */
const media = (query: string): string => {
  const at = R2.indexOf(`@media ${query}`);
  if (at < 0) throw new Error(`no @media ${query}`);
  return R2.slice(at, R2.indexOf('}\n}', at) + 3);
};

const MOCK = JSX.slice(JSX.indexOf('const CSS = `'), JSX.indexOf('`;', JSX.indexOf('const CSS = `')));
const base = vars(R2, '[data-r2-shell]');
const laptop = vars(media('(min-width: 768px) and (max-width: 1199px)'), '[data-r2-shell]');
const phone = vars(media('(max-width: 767px)'), '[data-r2-shell]');
const px = (v: string | undefined) => Number.parseFloat(v ?? 'NaN');

describe('the R2 tokens (D-160 R2-1b)', () => {
  it('copies every `.ax` variable of the mockup verbatim, as --r2-*', () => {
    const ax = vars(MOCK, '.ax');
    expect(ax.size).toBeGreaterThan(30);
    for (const [k, v] of ax) expect(base.get(`--r2-${k.slice(2)}`)?.toLowerCase(), k).toBe(v.toLowerCase());
    for (const [k, v] of vars(MOCK, '.ax.lap')) expect(laptop.get(`--r2-${k.slice(2)}`), `lap ${k}`).toBe(v);
    for (const [k, v] of vars(MOCK, '.ax.ph')) expect(phone.get(`--r2-${k.slice(2)}`), `ph ${k}`).toBe(v);
  });

  it('carries the mockup’s raw colours and exact shadows as named tokens', () => {
    const hexes = new Set(
      [...MOCK.replace(/\.mk[^}]*}|\.arx\{[^}]*}/g, '').matchAll(/#[0-9A-Fa-f]{3,6}\b/g)].map((m) =>
        m[0].toLowerCase(),
      ),
    );
    const ours = new Set([...base.values()].map((v) => v.toLowerCase()));
    for (const h of hexes) expect(ours.has(h) || h === '#fff', h).toBe(true);
    expect(base.get('--r2-sh-card')).toBe('0 1px 2px rgba(21, 33, 29, 0.03)');
    expect(base.get('--r2-sh-pop')).toBe('0 8px 24px rgba(21, 33, 29, 0.1), 0 1px 2px rgba(21, 33, 29, 0.06)');
    expect(base.get('--r2-sh-toast')).toBe('0 8px 24px rgba(21, 33, 29, 0.2)');
    expect(base.get('--r2-sh-modal')).toBe('0 24px 64px rgba(21, 33, 29, 0.22)');
    expect(base.get('--r2-scrim')).toBe('rgba(21, 33, 29, 0.38)');
  });

  it('holds the phone floor by construction: type ≥ 16px, controls ≥ 44px, primaries ≥ 48px', () => {
    const type = [...base.keys()].filter((k) => /^--r2-(t|m|mo|sh|h|fs-\d+)$/.test(k));
    expect(type.length).toBe(8);
    for (const k of type) {
      if (px(base.get(k)) < 16) expect(px(phone.get(k)), k).toBeGreaterThanOrEqual(16);
    }
    expect(px(phone.get('--r2-c'))).toBeGreaterThanOrEqual(44);
    expect(px(phone.get('--r2-cp'))).toBeGreaterThanOrEqual(48);
    expect(px(phone.get('--r2-ng'))).toBeGreaterThanOrEqual(44);
  });

  it('is scoped to the admin shell, and the learner stylesheets do not know it', () => {
    expect(R2).not.toMatch(/:root/);
    expect(R2).not.toMatch(/^\s*(html|body)\b/m);
    for (const f of ['./tokens.css', './lms.css', './global.css'])
      expect(read(f), f).not.toMatch(/--r2-|data-r2-shell/);
  });

  it('carries the mockup’s icons verbatim, as r2* in ICONS', () => {
    const body = /const P = \{([\s\S]*?)\n\};/.exec(JSX)![1]!;
    const p = [...body.matchAll(/(\w+): '([^']*)'/g)].map((m) => [`r2${m[1]![0]!.toUpperCase()}${m[1]!.slice(1)}`, m[2]!] as const);
    expect(p).toHaveLength(45);
    for (const [name, d] of p) expect((ICONS as Record<string, string>)[name], name).toBe(d);
    expect(Object.keys(ICONS).filter((k) => k.startsWith('r2'))).toHaveLength(45);
  });
});
