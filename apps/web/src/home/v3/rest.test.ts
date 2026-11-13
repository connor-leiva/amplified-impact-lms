import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COHORT_SEATS, DEFAULT_FOUNDING_CLOSES_AT, HELP_EMAIL, MEMBERSHIP_NAME, PLAN_NAMES } from '@ai/core/offer';
import { ENTRIES, FREE_FIVE, TOOLS } from '../../library/content';
import { CARD_STATES, OFFERS } from '../../offer/content';
import { FREE_SKILLS_HREF } from '../../site/content';
import { PHOTOS } from '../content';
import { ART, programLogo, type ProgramKey } from '../program-logo';
import { PRICES, usd } from '../prices';
import { hoursMath } from './client/hours';
import { FAVORITES, HOURS, PROGRAMS, QUESTIONS } from './content';
import { renderV3Body } from './render';
import { CARD_LOGO_TYPE } from './sections/programs';

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

/**
 * copy.md's live seat line ("18 days left · 15 of 15 founding seats left"): the script fills in the days
 * and the API the seats. With no script the line says the deadline's day and the cap (below).
 */
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

  it('gives the Team Plan’s dates in /pricing’s words (D7): only the starter path and the 5 free skills on December 14', () => {
    const { best, dates } = PROGRAMS.cards.team;
    expect(text(prod.querySelector('#p-team .pg-best'))).toBe(`${best} ${dates}`);
    expect(prod.querySelector('#p-team .pg-best [data-pending]')).toBeNull();
    // Each half is /pricing's own: its December bonus line, and its first weekly training.
    const [weekly, bonus] = OFFERS.agents.starts;
    expect(bonus).toContain('your agents get the starter path and the 5 free skills on December 14');
    expect(dates.toLowerCase()).toContain('your agents get the starter path and the 5 free skills on december 14');
    expect(weekly).toContain('the week of January 4');
    expect(dates).toMatch(/live classes start the week of January 4\.$/);
    // Not the mockup's "Skills open December 14": the rest of the skills don't.
    expect(text(prod.body)).not.toContain('Skills open December 14');
  });
});

describe('S11’s program logos: Connor’s (`programLogo()`), as PR #73 put them on the homepage’s cards', () => {
  const pg = sec(prod, 'pg')!;
  const LOGOS: [ProgramKey, string][] = [
    ['accelerator', PLAN_NAMES.cohort],
    ['insiders', MEMBERSHIP_NAME],
    ['team-plan', PLAN_NAMES.agents],
    ['agent-plan', PLAN_NAMES.agent_plan],
  ];
  const svgOf = (html: string) => parse(html).querySelector('svg')!.outerHTML;

  it('heads each card with its stacked lockup, the offer’s exact name only for screen readers, and no icon or typed name', () => {
    const heads = [...pg.querySelectorAll('.pg-card h3.pg-name')];
    expect(heads.map((h) => [h.querySelector('.pg-logo')?.getAttribute('data-program'), text(h.querySelector('.sr-only'))])).toEqual(LOGOS);
    heads.forEach((h, i) => {
      const key = LOGOS[i]![0];
      expect([...h.children].map((e) => e.className)).toEqual(['sr-only', 'pg-logo']);
      expect(h.querySelector('.pg-logo')!.innerHTML).toBe(svgOf(programLogo(key, { variant: 'stacked', size: CARD_LOGO_TYPE, title: '' })));
      expect(h.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      // Each card is still named by its heading, which says the offer's name.
      expect(pg.querySelector(`[aria-labelledby="${h.id}"]`)?.classList.contains('pg-card')).toBe(true);
    });
    // 28px type, at least the 24px floor asked for (the README's floor for lockups is 18px).
    expect(CARD_LOGO_TYPE).toBeGreaterThanOrEqual(24);
    expect(pg.querySelectorAll('.pg-ic, svg.ic')).toHaveLength(0);
    // The kit's four brand icons are gone from the page's sprite with them.
    expect(prod.querySelectorAll('symbol#v3-sessions, symbol#v3-resource-vault, symbol#v3-team-hub, symbol#v3-ai-employee')).toHaveLength(0);
  });

  it('marks each jump with its symbol, beside the short name it already types', () => {
    const jumps = [...pg.querySelectorAll('.pg-jump')];
    expect(jumps.map((j) => [j.querySelector('.pg-jump-ic svg')?.getAttribute('viewBox'), text(j.querySelector('.pg-jump-n'))])).toEqual(
      LOGOS.map(([key]) => ['0 0 48 48', PROGRAMS.cards[({ accelerator: 'accelerator', insiders: 'insiders', 'team-plan': 'team', 'agent-plan': 'agent' } as const)[key]].short]),
    );
    jumps.forEach((j, i) => {
      expect(j.querySelector('.pg-jump-ic')!.innerHTML).toBe(svgOf(programLogo(LOGOS[i]![0], { variant: 'symbol', title: '' })));
      expect(j.querySelector('.pg-jump-ic svg')?.getAttribute('aria-hidden')).toBe('true');
    });
    expect(ART.accelerator.symbol.ink.length).toBeGreaterThan(0);
  });
});

describe('the live offer (S11, S12)', () => {
  it('carries the founding deadline, and starts on "open", as the live homepage does', () => {
    for (const cls of ['pg', 'wed']) {
      const s = sec(prod, cls)!;
      expect([s.getAttribute('data-acc'), s.getAttribute('data-closes-at')]).toEqual(['open', DEFAULT_FOUNDING_CLOSES_AT]);
    }
  });

  it('shows the seat meter and its line from the start, saying only what it knows: the deadline’s day and the written cap', () => {
    for (const cls of ['pg', 'wed']) {
      const block = sec(prod, cls)!.querySelector('[data-v3-seats]')!;
      expect(block.closest('[hidden]'), cls).toBeNull();
      expect(block.getAttribute('data-when')).toBe('acc-open');
      expect(block.querySelectorAll('.seatm-s')).toHaveLength(COHORT_SEATS);
      const meter = block.querySelector('.seatm')!;
      expect([meter.getAttribute('data-left'), meter.getAttribute('aria-label'), meter.getAttribute('data-said')]).toEqual([
        String(COHORT_SEATS),
        `${COHORT_SEATS} of ${COHORT_SEATS} founding seats`,
        '{left} of {total} seats left',
      ]);
      // "Nov 30" as the Accelerator's own line prints it ("… Ends Nov 30."); the cap, never a count.
      expect(text(block.querySelector('.status'))).toBe(`Ends Nov 30 · ${COHORT_SEATS} of ${COHORT_SEATS} founding seats`);
      expect(block.querySelector('[data-v3-seats-word]')?.getAttribute('data-said')).toBe(PROGRAMS.seatsWord);
    }
    expect(text(sec(prod, 'pg')!.querySelector('#p-accelerator'))).toContain('Ends Nov 30.');
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

/**
 * S11's and S12's program buttons in the state the page starts on, "open", each to its page (D1). The
 * sold-out and closed states' waiting-list buttons are the only ones that start hidden.
 */
const OPEN_CTAS: Record<'pg' | 'wed', [string, string][]> = {
  pg: [
    ['Claim a Founding Seat', '/team-build'],
    ['Or 2 payments of $3,750', '/team-build'],
    ['Join Insiders', '/insiders'],
    ['Train My Team', '/teams'],
    ['Over 40 agents? Let’s talk', `mailto:${HELP_EMAIL}`],
    ['Start the Agent Plan', '/agents'],
  ],
  wed: [
    ['Claim a Founding Seat', '/team-build'],
    ['See the Accelerator', '/team-build'],
  ],
};

/** What keeps `el` from showing, in the markup: `hidden`, `inert`, `aria-hidden`, a reveal class or an inline style. */
function heldBack(el: Element): string[] {
  const out: string[] = [];
  for (let e: Element | null = el; e; e = e.parentElement) {
    const name = `${e.tagName.toLowerCase()}.${(e.getAttribute('class') ?? '').trim().replace(/\s+/g, '.')}`;
    for (const attr of ['hidden', 'inert']) if (e.hasAttribute(attr)) out.push(`${name} is ${attr}`);
    if (e.getAttribute('aria-hidden') === 'true') out.push(`${name} is aria-hidden`);
    if (/(^|\s)(rv|rv-wait|fade-\d)(\s|$)/.test(e.getAttribute('class') ?? '')) out.push(`${name} is a reveal`);
    if (/opacity|visibility|display/.test(e.getAttribute('style') ?? '')) out.push(`${name} is styled out`);
  }
  return out;
}

describe('no buy, seat or proof element starts hidden (S11, S12): the page with no script', () => {
  it.each(['pg', 'wed'] as const)('section.%s: the seat meter, its seats left, every proof line and every program button show', (cls) => {
    const s = sec(prod, cls)!;
    const meters = [...s.querySelectorAll('.seatm')];
    const left = [...s.querySelectorAll('[data-left]')];
    const proofs = [...s.querySelectorAll('.proof-line')];
    expect([meters.length, left.length, proofs.length]).toEqual([1, 1, cls === 'pg' ? 4 : 1]);
    for (const el of [...meters, ...left, ...proofs]) expect(heldBack(el), `${el.className} "${text(el).slice(0, 30)}"`).toEqual([]);
    expect(left[0]!.getAttribute('data-left')).toBe(String(COHORT_SEATS));
    // Every program button of the "open" state shows; only the other states' waiting lists are held back.
    const ctas = [...s.querySelectorAll('.cta-group a')];
    expect(ctas.filter((a) => !heldBack(a).length).map((a) => [text(a), a.getAttribute('href')])).toEqual(OPEN_CTAS[cls]);
    for (const a of ctas.filter((x) => heldBack(x).length)) expect(a.closest('[data-when]')?.getAttribute('data-when')).toMatch(/^(acc|team)-(soldout|closed)/);
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
