import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTRIES } from '../../library/content';
import { PHOTOS } from '../content';
import { BAND, chartCounts, chartNodes, PROOF, QUOTE } from './content';
import { renderV3Body } from './render';
import { quoteWords, stopAt } from './sections/quote';

// S6 to S8 as the build renders them (docs/design/home-v3/brief.md § 4, § 5), held to copy.md, to
// Connor's decisions (conflicts.md: D2 Spring's quote pending, D3 the 38% and 95% cleared, D4 "12
// seats", D6 real headshots) and to the brief's rule that every skill name links to its live page.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const COPY = read('../../../../../docs/design/home-v3/copy.md');

const parse = (html: string) => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
const prod = parse(renderV3Body({ preview: false }));
const preview = parse(renderV3Body({ preview: true }));
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

/** The Library record whose page a link points at. */
const entryAt = (href: string | null) => ENTRIES.find((e) => e.href === href);

describe('S6, off your plate', () => {
  const s = prod.querySelector('section.band');

  it('says copy.md’s words, in order, on the forest band in both themes', () => {
    expectInOrder(s, copyLines('S6 Off your plate'));
    expect([s?.getAttribute('data-theme'), s?.classList.contains('inverse')]).toEqual(['forest', false]);
  });

  it('keeps the proof line with "Try 5 Skills Free", and that group in no reveal', () => {
    const cta = s?.querySelector<HTMLAnchorElement>('.band-cta a');
    expect([text(cta), cta?.getAttribute('href')]).toEqual([BAND.cta.label, BAND.cta.href]);
    expect(text(s?.querySelector('.band-cta .proof-line'))).toBe('Built inside The Utah Life Real Estate Group 100 agents, 700+ homes a year');
    expect(s?.querySelector('.band-cta')?.closest('.rv, .rv-wait, .fade-1, .fade-2, .fade-3')).toBeNull();
  });

  it('links each job’s skill to its Library page, the name being the page’s own title', () => {
    const links = [...s!.querySelectorAll<HTMLAnchorElement>('.band-by')];
    expect(links.map((a) => [text(a), entryAt(a.getAttribute('href'))?.title])).toEqual(BAND.rows.map(([, skill]) => [skill, skill]));
  });

  it('starts settled: every job struck, its skill showing (what a phone, reduced motion or no script shows)', () => {
    expect(s?.querySelector('.band-plate')?.classList.contains('is-in')).toBe(true);
  });
});

describe('S7, the proof', () => {
  const s = prod.querySelector('section.prf');
  const p = preview.querySelector('section.prf');

  it('says copy.md’s words, in order, “12 seats” and all (D4), in a preview', () => {
    expectInOrder(p, copyLines('S7 Proof: org chart'));
    expect([s?.id, s?.classList.contains('inverse'), s?.getAttribute('data-theme')]).toEqual(['proof', true, null]);
  });

  it('holds back “the real EOS chart” sentence until Spring approves it (C8): marked in a preview, gone in production', () => {
    const claim = p?.querySelector('.prf-intro [data-pending]');
    expect([claim?.getAttribute('data-pending'), text(claim)]).toEqual(['spring-approval', PROOF.introClaim]);
    expect(text(s?.querySelector('.prf-intro'))).toBe(PROOF.intro);
    expect(text(s)).not.toContain('real EOS chart');
  });

  it('prints the 38% and 95% final, with no marker (D3), counting up only from below the fold', () => {
    expect([...s!.querySelectorAll('.pst-num')].map(text)).toEqual(['38%', '95%', 'Daily']);
    expect([...s!.querySelectorAll('[data-v3-count]')].map((n) => [text(n), n.getAttribute('data-v3-count')])).toEqual([
      ['38', '38'],
      ['95', '95'],
    ]);
    expect(s?.querySelector('.pst [data-pending]')).toBeNull();
    // The drawings say the same figures: last year's bar is this year's over 1.38, and 1 cell in 20 is human.
    expect(s?.querySelector<HTMLElement>('.pst-bar')?.getAttribute('style')).toContain('--w:0.725');
    expect(s?.querySelectorAll('.pst-cells i.is-human')).toHaveLength(1);
  });

  it('counts the chart, never types it: 12 seats, 29 skills, 26 of them in the Library', () => {
    expect(chartCounts()).toEqual({ seats: 12, skills: 29, inLibrary: 26 });
    expect(s?.querySelectorAll('.oc-card')).toHaveLength(chartNodes().length);
    expect([...s!.querySelectorAll('.oc-count strong')].map(text)).toEqual(['12', '29']);
  });

  it('links every skill with a Library page to it, and marks the three built for our team, in the legend’s words', () => {
    const chips = [...s!.querySelectorAll('.oc-chip')];
    expect(chips).toHaveLength(chartNodes().flatMap((n) => n.skills).length);
    for (const a of s!.querySelectorAll<HTMLAnchorElement>('a.oc-chip')) expect(entryAt(a.getAttribute('href')), text(a)).toBeDefined();
    const own = [...s!.querySelectorAll('.oc-chip.is-own')];
    expect(own.map((c) => c.tagName.toLowerCase())).toEqual(['span', 'span', 'span']);
    expect(own.map((c) => text(c.querySelector('span:not(.sr-only)')))).toEqual(['Daily Sisu reports', 'Morning Debrief', 'Team activity reports']);
    for (const c of own) expect(text(c.querySelector('.sr-only'))).toBe(`, ${PROOF.legend.own}`);
  });

  it('starts settled on “People and AI”, every skill showing, and says which side is pressed', () => {
    expect([...s!.querySelector('.oc')!.classList]).toEqual(expect.arrayContaining(['is-in', 'is-ai']));
    expect([...s!.querySelectorAll('.oc-bar button')].map((b) => [text(b), b.getAttribute('aria-pressed')])).toEqual([
      [PROOF.people, 'false'],
      [PROOF.peopleAndAi, 'true'],
    ]);
    expect(s?.querySelector('.oc-bar .seg-toggle')?.getAttribute('aria-label')).toBe(PROOF.toggleLabel);
  });
});

describe('S8, in Spring’s words (pending `spring-approval`, D2)', () => {
  const q = preview.querySelector('section.qt');

  it('is in a preview only, marked; production leaves the whole section out and invents nothing in its place', () => {
    expect(q?.getAttribute('data-pending')).toBe('spring-approval');
    expect(prod.querySelector('section.qt')).toBeNull();
    expect(text(prod.querySelector('main'))).not.toContain('Sisu data');
  });

  it('says copy.md’s words, in order, with her real headshot in place of the “SB” initials (D6)', () => {
    expectInOrder(
      q,
      copyLines('S8 In Spring’s words').filter((l) => l !== 'SB'),
    );
    const img = q?.querySelector<HTMLImageElement>('.qt-face img');
    expect([img?.getAttribute('src'), img?.getAttribute('alt')]).toEqual([PHOTOS.spring.src, '']);
    expect(text(q?.querySelector('.qt-face'))).toBe('');
  });

  it('splits the quote into its words exactly, marks 95% and 38%, and lights each step at its word', () => {
    expect([...q!.querySelectorAll('.qt-w')].map(text).join(' ')).toBe(QUOTE.text);
    expect([...q!.querySelectorAll('.qt-w.is-key')].map(text)).toEqual(['95%', '38%']);
    expect(q?.getAttribute('style')).toContain(`--n:${quoteWords().length}`);
    expect([...q!.querySelectorAll<HTMLElement>('.qt-stop')].map((li) => li.style.getPropertyValue('--at'))).toEqual(
      QUOTE.stops.map((st) => stopAt(st.at).toFixed(4)),
    );
    expect(() => stopAt('nowhere')).toThrow(/not in Spring/);
  });

  it('works out “26 of 29 are in the Library” from the chart, and links to the Library', () => {
    expect(text(q?.querySelector('.qt-foot-k'))).toBe('26 of 29 are in the Library');
    expect(q?.querySelector('.qt-foot a')?.getAttribute('href')).toBe(QUOTE.library.href);
  });
});

describe('the stylesheet, for S6 to S8', () => {
  const css = read('./v3.css');

  it('lights S8’s words and steps by colour, never by fading them (a word not lit yet stays AA)', () => {
    const block = css.slice(css.indexOf('/* --- S8'), css.indexOf('/* --- S6 to S8 on tablets'));
    expect(block).toMatch(/\.aiw \.qt-w \{[^}]*color: color-mix\(in srgb, var\(--ink\) calc\(var\(--lit\) \* 100%\), var\(--ink-muted\)\)/);
    expect(/\.aiw \.qt-w \{[^}]*opacity/.test(block)).toBe(false);
    expect(/\.aiw \.qt-stop \{[^}]*opacity/.test(block)).toBe(false);
  });

  it('settles S6 and S7 in the markup: their hidden states only follow a class the script takes away', () => {
    for (const sel of ['.aiw .band-by {', '.aiw .oc-card {']) expect(css, sel).toContain(sel);
    expect(css).toMatch(/\.aiw \.band-plate\.is-in \.band-by \{\s*opacity: 1;/);
    expect(css).toMatch(/\.aiw \.oc\.is-in \.oc-card \{\s*opacity: 1;/);
  });
});
