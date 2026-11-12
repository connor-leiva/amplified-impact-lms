import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COHORT_SEATS, DEFAULT_FOUNDING_CLOSES_AT, HELP_EMAIL } from '@ai/core/offer';
import { ENTRIES, FREE_FIVE, TOOLS } from '../../library/content';
import { CARD_STATES } from '../../offer/content';
import { FREE_SKILLS_HREF } from '../../site/content';
import { PHOTOS } from '../content';
import { PRICES, usd } from '../prices';
import { hoursMath } from './client/hours';
import { FAVORITES, HOURS, PROGRAMS, QUESTIONS } from './content';
import { renderV3Body } from './render';

// S9 to S16 as the build renders them (docs/design/home-v3/brief.md § 4, § 5, § 6), held to copy.md,
// to /pricing's own sources for every price, date and seat, and to Connor's decisions (conflicts.md:
// D1 no Stripe buttons, D6 real photos, D7 the Team Plan's December 14 line pending).

const HERE = dirname(fileURLToPath(import.meta.url));
const COPY = readFileSync(resolve(HERE, '../../../../../docs/design/home-v3/copy.md'), 'utf8');

const parse = (html: string) => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
const prod = parse(renderV3Body({ preview: false }));
const preview = parse(renderV3Body({ preview: true }));
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const sec = (doc: Document, cls: string) => doc.querySelector(`main > section.${cls}`);

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

/** copy.md's live seat line ("18 days left · 15 of 15 founding seats left"): the API fills it (below). */
const SEAT_LINE = /days left · \d+ of \d+ founding seats left/;

describe('every section, word for word', () => {
  it.each([
    ['hrs', 'S9 Hours calculator', [] as RegExp[]],
    ['fh', 'S10 Five free skills', []],
    ['pg', 'S11 Programs', [SEAT_LINE]],
    // The mockup's ring reads 0, frozen before it counted: ours is settled at 8 (below).
    ['wed', 'S12 Accelerator timeline', [SEAT_LINE, /^0$/]],
    ['fav', 'S13 Library favorites', []],
    // Real photos, not the mockup's initials (D6).
    ['fd', 'S14 Founders', [/^(CL|SB)$/]],
    // The numbers are the kit's CSS counters, not words in the page.
    ['faq', 'S15 FAQ', [/^\d\d$/]],
    ['close', 'S16 Closing CTA', []],
  ])('%s says copy.md’s %s, in order', (cls, heading, skip) => {
    expectInOrder(
      sec(preview, cls),
      copyLines(heading).filter((l) => !skip.some((r) => r.test(l))),
    );
  });

  it('answers all eight questions, in copy.md’s words, with "Compare Every Program" under the seventh', () => {
    const answers = [...sec(prod, 'faq')!.querySelectorAll('.faq-a')].map((a) => [...a.querySelectorAll('p')].map(text));
    expect(answers).toEqual(QUESTIONS.items.map((q) => [...q.a, ...('link' in q ? [q.link.label] : [])]));
    const notes = COPY.slice(COPY.indexOf('**Answers'));
    for (const q of QUESTIONS.items) expect(notes).toContain(q.a[0]!);
    expect(sec(prod, 'faq')?.querySelector('.faq-a a')?.getAttribute('href')).toBe('/pricing');
  });
});

describe('the rules for buttons, prices and proof (brief § 6, Connor’s D1)', () => {
  it('sends every program button to its program’s page, never to Stripe', () => {
    for (const doc of [prod, preview]) {
      const hrefs = [...doc.querySelectorAll('.pg-cta a, .wed-cta a, .pg-more')].map((a) => a.getAttribute('href'));
      expect(new Set(hrefs)).toEqual(new Set(['/team-build', '/insiders', '/teams', '/agents', `mailto:${HELP_EMAIL}`]));
      expect(doc.body.innerHTML).not.toMatch(/buy\.stripe\.com/);
    }
  });

  it('puts the proof line beside every program button and every free button, in no reveal', () => {
    for (const doc of [prod, preview]) {
      const groups = [...doc.querySelectorAll('.pg-cta, .wed-cta, .hrs-cta, .fh-cta, .close-cta')];
      expect(groups).toHaveLength(4 + 1 + 1 + 1 + 1);
      for (const g of groups) {
        expect(text(g.querySelector(':scope > .proof-line')), g.className).toBe('Built inside The Utah Life Real Estate Group 100 agents, 700+ homes a year');
        expect(g.closest('.rv, .rv-wait, [hidden]'), g.className).toBeNull();
      }
    }
  });

  it('prints every price from /pricing’s own figures, in the mockup’s sentences', () => {
    const pg = sec(prod, 'pg')!;
    const shown = (id: string) => [...pg.querySelectorAll(`#${id} .price-big`)].map(text);
    expect(shown('p-accelerator')).toEqual([usd(PRICES.accelerator.founding), CARD_STATES.closedAmount]);
    expect(shown('p-insiders')).toEqual([usd(PRICES.insiders.yearly), usd(PRICES.insiders.monthly)]);
    expect(shown('p-team')).toEqual(PRICES.teamPlan.today.map(usd));
    expect(shown('p-agent')).toEqual([usd(PRICES.agentPlan.monthly), usd(PRICES.agentPlan.yearly)]);
    // copy.md's "Toggle states" note: the second side of each switch.
    expect(text(pg.querySelector('#p-team [data-v3-alt="1"] .price-after'))).toBe('For 16 to 40 agents. Then $797 a month, from April 4, 2027.');
    expect(text(pg.querySelector('#p-accelerator [data-when="acc-open"].price-after'))).toBe(
      'For an owner and an ops lead, or 2 payments of $3,750. Then $9,997. Ends Nov 30.',
    );
  });

  it('shows the first side of each switch and says so; the second waits for its button', () => {
    for (const id of ['p-insiders', 'p-team', 'p-agent']) {
      const card = sec(prod, 'pg')!.querySelector(`#${id}`)!;
      expect([...card.querySelectorAll('[data-v3-switch] button')].map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
      expect([...card.querySelectorAll('[data-v3-alt]')].map((a) => a.hasAttribute('hidden'))).toEqual([false, true]);
    }
  });

  it('holds back the Team Plan’s "Skills open December 14…" (D7): marked in a preview, gone in production', () => {
    const p = preview.querySelector('#p-team .pg-best [data-pending]');
    expect([p?.getAttribute('data-pending'), text(p)]).toEqual(['team-plan-dec14', PROGRAMS.cards.team.bestDec14]);
    expect(text(prod.querySelector('#p-team .pg-best'))).toBe(PROGRAMS.cards.team.best);
    expect(text(prod.body)).not.toContain('December 14');
  });
});

describe('the live offer (S11, S12)', () => {
  it('carries the founding deadline, and starts on "open", as the live homepage does', () => {
    for (const cls of ['pg', 'wed']) {
      const s = sec(prod, cls)!;
      expect([s.getAttribute('data-acc'), s.getAttribute('data-closes-at')]).toEqual(['open', DEFAULT_FOUNDING_CLOSES_AT]);
    }
  });

  it('keeps the seats and days left waiting, hidden, until the API counts them: nothing it can’t know yet', () => {
    for (const cls of ['pg', 'wed']) {
      const block = sec(prod, cls)!.querySelector('[data-v3-seats]')!;
      expect(block.hasAttribute('hidden')).toBe(true);
      expect(block.querySelectorAll('.seatm-s')).toHaveLength(COHORT_SEATS);
      expect(block.querySelector('.seatm')?.getAttribute('data-said')).toBe('{left} of {total} seats left');
      expect(text(block.querySelector('.status'))).toBe(`· ${COHORT_SEATS} of ${COHORT_SEATS} ${PROGRAMS.seatsWord}`);
    }
  });

  it('has /pricing’s sold-out and closed words ready, hidden, with the waiting list to the program’s page', () => {
    const pg = sec(prod, 'pg')!;
    expect(text(pg.querySelector('[data-when="acc-soldout"].price-after'))).toBe(CARD_STATES.soldout);
    expect(text(pg.querySelector('[data-when="acc-closed"] .price-after'))).toMatch(new RegExp(`^${CARD_STATES.closedBefore}November 30`));
    // A part shows at load exactly when it belongs to the state the page starts on, "open".
    for (const el of pg.querySelectorAll<HTMLElement>('[data-when]')) {
      expect(el.hasAttribute('hidden'), el.dataset.when).toBe(!el.dataset.when!.split(' ').some((w) => w.endsWith('-open')));
    }
    expect([...pg.querySelectorAll('[data-when="acc-soldout acc-closed"] a')].map((a) => [text(a), a.getAttribute('href')])).toEqual([
      [CARD_STATES.waitlist, '/team-build'],
    ]);
  });
});

describe('S9, the hours calculator', () => {
  it('prints the defaults’ results, worked out by the brief’s arithmetic: 11.5, 575, 14.4, $143,750', () => {
    const s = sec(prod, 'hrs')!;
    const r = hoursMath(
      HOURS.rows.map(([, , n]) => n),
      HOURS.rate,
    );
    expect(r).toMatchObject({ week: '11.5', year: '575', weeks: '14.4', dollars: '$143,750' });
    expect(['week', 'year', 'weeks', 'dollars'].map((k) => text(s.querySelector(`[data-v3-out="${k}"]`)))).toEqual(['11.5', '575', '14.4', '$143,750']);
    expect(s.querySelectorAll('.hrs-cells i')).toHaveLength(50);
    expect(s.querySelectorAll('input[type="range"]')).toHaveLength(7);
    for (const input of s.querySelectorAll('input')) expect(s.querySelector(`label[for="${input.id}"]`), input.id).not.toBeNull();
  });
});

describe('S10, S13, S14: the Library and the people', () => {
  it('lists the free five in the Library’s order, each to its page, with the tools its record names', () => {
    const rows = [...sec(prod, 'fh')!.querySelectorAll<HTMLAnchorElement>('.fh-row')];
    expect(rows.map((a) => a.getAttribute('href'))).toEqual(FREE_FIVE.map((s) => `/${s}`));
    expect(rows.map((a) => [...a.querySelectorAll('.fh-tool')].map(text))).toEqual(
      FREE_FIVE.map((s) => ENTRIES.find((e) => e.href === `/${s}`)!.tools.map((t) => TOOLS[t])),
    );
    expect(sec(prod, 'fh')?.querySelector('.fh-cta a')?.getAttribute('href')).toBe(FREE_SKILLS_HREF);
  });

  it('counts the Library (58) and links each favorite to its page, by its own title', () => {
    const s = sec(prod, 'fav')!;
    expect(text(s.querySelector('.fav-num'))).toBe(String(ENTRIES.length));
    const links = [...s.querySelectorAll<HTMLAnchorElement>('.fav-item')];
    expect(links).toHaveLength(FAVORITES.columns.reduce((sum, c) => sum + c.items.length, 0));
    for (const a of links) expect(text(a.querySelector('.fav-name')), a.href).toBe(ENTRIES.find((e) => e.href === a.getAttribute('href'))?.title);
  });

  it('shows the founders’ real photos, never the mockup’s initials (D6)', () => {
    const s = sec(prod, 'fd')!;
    expect([...s.querySelectorAll('.fd-portrait img')].map((i) => i.getAttribute('src'))).toEqual([PHOTOS.connor.src, PHOTOS.spring.src]);
    expect(s.querySelector('.portrait-initials')).toBeNull();
  });
});

describe('S12, S15, S16', () => {
  it('settles the ring on 8 of 8 with every week lit: never a part (brief § 5, C15)', () => {
    const s = sec(prod, 'wed')!;
    expect(text(s.querySelector('[data-v3-built]'))).toBe('8');
    expect(s.querySelector('.wed-ring-fg')?.getAttribute('style')).toBe('--k:1');
    expect([...s.querySelectorAll('.wed-row')].every((r) => r.classList.contains('is-on'))).toBe(true);
  });

  it('opens one question at a time, natively: every <details> shares a name, the first open', () => {
    const d = [...sec(prod, 'faq')!.querySelectorAll('details')];
    expect(d).toHaveLength(8);
    expect(new Set(d.map((x) => x.getAttribute('name')))).toEqual(new Set(['v3-questions']));
    expect(d.map((x) => x.hasAttribute('open'))).toEqual([true, ...Array(7).fill(false)]);
  });

  it('swaps the light bands with the page (S10, S12, S15) and keeps the close and the results panel forest', () => {
    expect(['fh', 'wed', 'faq'].map((c) => sec(prod, c)?.classList.contains('inverse'))).toEqual([true, true, true]);
    expect([sec(prod, 'close')?.getAttribute('data-theme'), prod.querySelector('.hrs-out')?.getAttribute('data-theme')]).toEqual(['forest', 'forest']);
    expect(prod.querySelector('#p-accelerator')?.getAttribute('data-theme')).toBe('forest');
  });
});
