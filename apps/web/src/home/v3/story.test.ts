import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIT } from '../../kit/content';
import { HOW, MONDAY, SKILL } from './content';
import { renderV3Body } from './render';

// S3 to S5 as the build renders them (docs/design/home-v3/brief.md § 4, § 5), held to copy.md and, for
// S5's second and third panels (which copy.md read while hidden), to the handoff's own markup.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const COPY = read('../../../../../docs/design/home-v3/copy.md');
const HANDOFF = read('../../../../../docs/design/home-v3/handoff/home-v3.html');

const parse = (html: string) => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
const prod = parse(renderV3Body({ preview: false }));
const $ = (sel: string) => prod.querySelector(sel);
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

function copyLines(heading: string): string[] {
  const at = COPY.indexOf(`## ${heading}`);
  expect(at, heading).toBeGreaterThan(-1);
  return /```\n([\s\S]*?)\n```/.exec(COPY.slice(at))![1]!.split('\n').filter(Boolean);
}

/** Every line, in order, in `el`'s text: whitespace ignored, and case for copy.md's ALL-CAPS mono lines. */
function expectInOrder(el: Element | null, lines: string[]) {
  const squash = (s: string) => s.replace(/\s+/g, '');
  const page = squash(el?.textContent ?? '').toLowerCase();
  let at = 0;
  for (const line of lines) {
    const i = page.indexOf(squash(line).toLowerCase(), at);
    expect(i, `"${line}" is missing, or out of order`).toBeGreaterThan(-1);
    at = i + squash(line).length;
  }
}

/** A section's text nodes, in order, with its drawings left out. */
function textNodes(el: Element): string[] {
  const out: string[] = [];
  const walk = (n: Node) => {
    if (n.nodeType === 3) {
      const t = (n.textContent ?? '').trim();
      if (t) out.push(t);
    } else if (n.nodeType === 1 && (n as Element).tagName.toLowerCase() !== 'svg') n.childNodes.forEach(walk);
  };
  walk(el);
  return out;
}

describe('the order of the page', () => {
  it('runs all sixteen in the mockup’s order, in production and in a preview alike (nothing waits any more)', () => {
    const all = ['hh', 'vid', 'wsk', 'mon', 'how', 'band', 'prf', 'qt', 'hrs', 'fh', 'pg', 'wed', 'fav', 'fd', 'faq', 'close'];
    expect([...prod.querySelectorAll('main > section')].map((s) => s.classList[1])).toEqual(all);
    expect([...parse(renderV3Body({ preview: true })).querySelectorAll('main > section')].map((s) => s.classList[1])).toEqual(all);
  });

  it('carries no Stripe link and no buy button anywhere (Connor’s D1)', () => {
    for (const preview of [false, true]) expect(renderV3Body({ preview })).not.toMatch(/buy\.stripe\.com/);
  });

  it('swaps the mockup’s light bands with the page’s theme (`.inverse`), and lets S5 follow the page (D8)', () => {
    expect([$('section.wsk'), $('section.mon')].map((s) => [s?.classList.contains('inverse'), s?.getAttribute('data-theme')])).toEqual([
      [true, null],
      [true, null],
    ]);
    expect([$('section.how')?.classList.contains('inverse'), $('section.how')?.getAttribute('data-theme')]).toEqual([false, null]);
  });
});

describe('S3, what a skill is', () => {
  const s = $('section.wsk');

  it('says copy.md’s words, in order, with the AI’s reply showing (the settled state)', () => {
    expectInOrder(s, copyLines('S3 What a skill is'));
    expect($('.cvs-thread')?.getAttribute('data-beat')).toBe('2');
    expect(s?.id).toBe('skills');
  });

  it('prints 12 and 1 final, and tags the chat’s 12 “Made-up example” (C15)', () => {
    expect([...s!.querySelectorAll('.cvs-n')].map((n) => [text(n), n.getAttribute('data-v3-count')])).toEqual([
      ['12', '12'],
      ['1', '1'],
    ]);
    expect(text($('.cvs-chat .cvs-foot .ex-tag'))).toBe(KIT.example);
    expect(text($('.cvs-chat .cvs-foot .cvs-k'))).toContain(SKILL.chat.countLabel);
    expect($('.cvs-days')?.getAttribute('aria-label')).toBe(SKILL.skill.weekLabel);
  });
});

describe('S4, picture your Monday', () => {
  const s = $('section.mon');

  it('says copy.md’s words, in order', () => {
    expectInOrder(s, copyLines('S4 Picture your Monday'));
  });

  it('starts static and settled on “With Skills”: what a phone, reduced motion or no script shows', () => {
    expect([s?.classList.contains('is-static'), s?.classList.contains('is-pinned'), s?.getAttribute('style')]).toEqual([true, false, '--m:1']);
    expect([...s!.querySelectorAll('.seg-toggle button')].map((b) => [text(b), b.getAttribute('aria-pressed')])).toEqual([
      [MONDAY.without, 'false'],
      [MONDAY.withSkills, 'true'],
    ]);
    expect(s?.querySelector('.seg-toggle')?.getAttribute('aria-label')).toBe(MONDAY.toggleLabel);
    expect([...s!.querySelectorAll('.mon-p.is-on')].map((p) => p.getAttribute('data-side'))).toEqual(['with', 'with']);
  });

  it('draws the timelines for the eye only; the two paragraphs under each say it', () => {
    for (const stage of s!.querySelectorAll('.mon-stage')) expect(stage.getAttribute('aria-hidden')).toBe('true');
    expect([...s!.querySelectorAll('.mon-p')].map(text)).toEqual(
      MONDAY.columns.flatMap((c) => [`${MONDAY.withoutK} ${c.without}`, `${MONDAY.withK} ${c.withSkills}`]),
    );
  });
});

describe('S5, how it works', () => {
  const s = $('section.how');

  it('says copy.md’s words, in order, and every word of the handoff’s own S5, panels two and three included', () => {
    expectInOrder(s, copyLines('S5 How it works'));
    const at = HANDOFF.indexOf('id="v3-static-how"');
    const theirs = textNodes(parse(HANDOFF.slice(HANDOFF.indexOf('<section', at), HANDOFF.indexOf('</section>', at) + 10)).body);
    // Ours adds two things: the kit's "Made-up example" on panels two and three, and the email's words
    // once more, for screen readers (the typed copy is the eye's).
    const ours = textNodes(s!).filter((t, i, all) => !(t === KIT.example) && !(t === HOW.yes.body && all.indexOf(t) !== i));
    expect(ours).toEqual(theirs);
  });

  it('starts static: step one current, panel one showing, every part settled, the email typed in full', () => {
    expect([s?.classList.contains('is-static'), s?.classList.contains('is-pinned')]).toEqual([true, false]);
    expect([...s!.querySelectorAll('.how-step')].map((b) => [b.classList.contains('is-active'), b.getAttribute('aria-current')])).toEqual([
      [true, 'step'],
      [false, null],
      [false, null],
    ]);
    expect([...s!.querySelectorAll('.how-panel')].map((p) => p.classList.contains('is-on'))).toEqual([true, false, false]);
    expect(text(s?.querySelector('[data-type]'))).toBe(HOW.yes.body);
    expect(text(s?.querySelector('.mail-body .sr-only'))).toBe(HOW.yes.body);
    expect(s?.querySelector('[data-type]')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('tags every panel as an illustration: the mockup’s own tag on the first, the kit’s on the other two', () => {
    expect([...s!.querySelectorAll('.how-panel')].map((p) => text(p.querySelector('.how-bar .ex-tag')))).toEqual([
      HOW.setup.example,
      KIT.example,
      KIT.example,
    ]);
  });
});

describe('the stylesheet, for S3 to S5', () => {
  const css = read('./v3.css');

  it('pins only behind `is-pinned`, and keeps every word at 16px or more', () => {
    expect(css).toMatch(/\.aiw \.mon\.is-pinned \{\s*height: 280vh;/);
    expect(css).toMatch(/\.aiw \.how\.is-pinned \{\s*height: 340vh;/);
    expect(css).toMatch(/@property --m \{/);
    expect(Math.min(...[...css.matchAll(/font-size: (\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])))).toBeGreaterThanOrEqual(16);
  });

  it('quiets what isn’t current by colour, never by fading its words (they stay AA)', () => {
    expect(/\.aiw \.mon-p \{[^}]*opacity/.test(css)).toBe(false);
    expect(/\.aiw \.how-step \{[^}]*opacity/.test(css)).toBe(false);
  });

  it('stacks S5’s panels in one grid cell, pinned or static, so the box grows with the tallest (none spills at 16px)', () => {
    const panel = /\.aiw \.how-panel \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(panel).toMatch(/grid-area: 1 \/ 1;/);
    expect(panel).not.toMatch(/position: absolute/);
    expect(/\.aiw \.how-panels \{([^}]*)\}/.exec(css)?.[1]).toMatch(/display: grid;/);
  });

  it('never lets S5’s panel outgrow a phone: a track that can shrink, and a tag that wraps (the 390 clip)', () => {
    // The browser check is compliance/tests/e2e/home-v3.spec.ts; these hold the two causes.
    expect(/\.aiw \.how-panels \{([^}]*)\}/.exec(css)?.[1]).toMatch(/grid-template-columns: minmax\(0, 1fr\);/);
    expect(/\.aiw \.how-panel \{([^}]*)\}/.exec(css)?.[1]).toMatch(/min-width: 0;/);
    expect(/\.aiw \.how-bar \.ex-tag \{([^}]*)\}/.exec(css)?.[1]).toMatch(/white-space: normal;/);
  });

  it('keeps S4’s chip checks on a phone, as the mockup does; only under 360 do they give way to the 16px words', () => {
    const hides = [...css.matchAll(/@media \(max-width: (\d+)px\) \{((?:[^{}]*\{[^}]*\})*)[^{}]*\}/g)]
      .filter((m) => /\.aiw \.mon-b-ok \{[^}]*display: none/.test(m[2]!))
      .map((m) => Number(m[1]));
    expect(hides).toEqual([359]);
    expect(/\.aiw \.mon-b-ok \{[^}]*display: none/.test(css.slice(0, css.indexOf('@media')))).toBe(false);
  });

  it('sets S5’s step numbers on the accent, not the signal green: no ink reaches AA on the light theme’s signal', () => {
    for (const sel of ['.aiw .how-step.is-active .how-n', '.aiw .brief-n']) {
      const rule = new RegExp(`${sel.replace(/[.]/g, '\\.')} \\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      expect(rule, sel).toMatch(/background: var\(--accent\);/);
      expect(rule, sel).not.toMatch(/var\(--signal\)/);
    }
  });
});
