import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_STATES } from '../../../offer/content';
import { renderV3Body } from '../render';
import { hoursMath, readRate, initHours } from './hours';
import { init } from './main';
import { accState, initOffer, initSwitches, type OfferFacts } from './offer';
import { initTimeline } from './proof';

// S9 to S16's script, in jsdom (brief § 4, § 5): the live offer read as the live homepage reads it,
// the switches, the calculator and the ring.

const HERE = dirname(fileURLToPath(import.meta.url));
const source = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

/** A function or interface as written, from its doc comment to its end. */
function block(src: string, name: string): string {
  const start = src.search(new RegExp(`(/\\*\\*(?:(?!\\*/)[\\s\\S])*?\\*/\\n)?export (function|interface) ${name}\\b`));
  expect(start, name).toBeGreaterThanOrEqual(0);
  return src.slice(start, src.indexOf('\n}\n', start) + 3);
}

const media = ({ wide = true, reduce = false } = {}) =>
  ((q: string) => ({
    matches: (q.includes('981px') && wide) || (q.includes('reduced-motion') && reduce),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;

const mount = () => {
  document.body.className = 'aiw';
  document.body.innerHTML = renderV3Body({ preview: false });
  return document.body;
};
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const shown = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => !el.closest('[hidden]'));
const said = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
/** The seat lines that show, in S11 then S12. */
const lines = () => shown('[data-v3-seats] .status').map(said);
const settle = () => new Promise((r) => setTimeout(r, 0));
/** /api/offer answers with `facts`, or with an error for null. */
const answer = (facts: OfferFacts | null) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: facts !== null, json: () => Promise.resolve(facts) })),
  );

/** What keeps `el` from showing: `hidden`, `inert`, `aria-hidden`, a reveal class or an inline style (as `../rest.test.ts`). */
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

const FACTS = (over: Partial<{ open: boolean; founding: boolean; left: number }> = {}): OfferFacts => ({
  open: over.open ?? true,
  founding: { open: over.founding ?? true, closesAt: '2026-11-30T23:59:00-07:00' },
  seats: { total: 15, sold: 15 - (over.left ?? 12), left: over.left ?? 12 },
  carts: [],
});

beforeEach(() => {
  window.matchMedia = media();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the live homepage’s reader, copied', () => {
  it('is the live homepage’s, character for character (a shared module would be a shared chunk)', () => {
    const theirs = source('../../client/offer-state.ts');
    const ours = source('./offer.ts');
    for (const name of ['OfferCart', 'OfferFacts', 'readFacts', 'seatsView', 'foundingOpen']) expect(block(ours, name), name).toBe(block(theirs, name));
    const isRecord = (src: string) => src.split('\n').find((l) => l.startsWith('const isRecord = '));
    expect(isRecord(ours)).toBe(isRecord(theirs));
  });

  it('decides the Accelerator: closed once founding is, sold out at 15, open otherwise; the deadline when the API can’t say', () => {
    const before = Date.parse('2026-11-20T12:00:00Z');
    const after = Date.parse('2026-12-02T12:00:00Z');
    const closes = '2026-11-30T23:59:00-07:00';
    expect(accState(FACTS(), closes, before)).toBe('open');
    expect(accState(FACTS({ left: 0 }), closes, before)).toBe('soldout');
    expect(accState(FACTS({ founding: false }), closes, before)).toBe('closed');
    expect([accState(null, closes, before), accState(null, closes, after)]).toEqual(['open', 'closed']);
  });
});

describe('the live offer on the page (S11, S12)', () => {

  it('says the days left at once, from the deadline in the page, and the seats left once the API counts them', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse('2026-11-12T20:00:00Z'));
    mount();
    answer(FACTS({ left: 12 }));
    initOffer(document.body);
    // Before the answer: shown, with the days left and the written cap.
    expect(lines()).toEqual(['18 days left · 15 of 15 founding seats', '18 days left · 15 of 15 founding seats']);
    await settle();
    await settle();
    expect(lines()).toEqual(['18 days left · 12 of 15 founding seats left', '18 days left · 12 of 15 founding seats left']);
    expect([...document.querySelectorAll('.seatm')].map((m) => [m.getAttribute('data-left'), m.getAttribute('aria-label')])).toEqual([
      ['12', '12 of 15 seats left'],
      ['12', '12 of 15 seats left'],
    ]);
  });

  it('once the seats are sold, says /pricing’s words and offers the waiting list, still to /team-build', async () => {
    mount();
    answer(FACTS({ left: 0 }));
    initOffer(document.body);
    await settle();
    await settle();
    expect($('section.pg').dataset.acc).toBe('soldout');
    expect(shown('#p-accelerator .price-after').map((p) => p.textContent)).toEqual([CARD_STATES.soldout]);
    expect(shown('#p-accelerator .pg-cta a').map((a) => [a.textContent, a.getAttribute('href')])).toEqual([[CARD_STATES.waitlist, '/team-build']]);
    expect(shown('[data-v3-seats]')).toHaveLength(0);
    // The proof line stays beside whatever button shows.
    expect(shown('#p-accelerator .pg-cta .proof-line')).toHaveLength(1);
  });

  it('after the deadline, with no answer from the API, stops quoting founding prices', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse('2026-12-02T12:00:00Z'));
    mount();
    answer(null);
    initOffer(document.body);
    await settle();
    expect([$('section.pg').dataset.acc, $('section.pg').dataset.team]).toEqual(['closed', 'closed']);
    expect(shown('#p-accelerator .price-big').map((p) => p.textContent)).toEqual([CARD_STATES.closedAmount]);
    expect(shown('#p-team .pg-cta a').map((a) => a.textContent)).toEqual([CARD_STATES.waitlist]);
    expect(shown('section.wed .status-closed')).toHaveLength(1);
  });
});

describe('no buy, seat or proof element is hidden on load, with the script, while the API says nothing (S11, S12)', () => {
  it.each([
    ['never answers', () => new Promise<Response>(() => undefined)],
    ['fails', () => Promise.reject(new TypeError('Failed to fetch'))],
    ['answers 503', () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as Response)],
  ])('when /api/offer %s: the meter, its line, the proof lines and every program button stay shown', async (_, reply) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.parse('2026-11-12T20:00:00Z'));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal('fetch', vi.fn(reply));
    mount();
    // The whole script, as the page runs it (wide screen, motion allowed: every arrival armed).
    init();
    await settle();
    await settle();
    for (const cls of ['pg', 'wed']) {
      const s = $(`section.${cls}`);
      expect(s.dataset.acc, cls).toBe('open');
      const parts = [...s.querySelectorAll('.seatm, [data-left], .proof-line')];
      expect(parts.length, cls).toBe(cls === 'pg' ? 5 : 2);
      for (const el of parts) expect(heldBack(el), `${cls} ${el.className}`).toEqual([]);
      const ctas = [...s.querySelectorAll('.cta-group a')].filter((a) => !heldBack(a).length).map(said);
      expect(ctas, cls).toEqual(
        cls === 'pg'
          ? ['Claim a Founding Seat', 'Or 2 payments of $3,750', 'Join Insiders', 'Train My Team', 'Over 40 agents? Let’s talk', 'Start the Agent Plan']
          : ['Claim a Founding Seat', 'See the Accelerator'],
      );
      expect(s.querySelector('.seatm')?.getAttribute('data-left'), cls).toBe('15');
    }
    // The days left from the deadline written into the page; the seats are the written cap, not a count.
    expect(lines()).toEqual(['18 days left · 15 of 15 founding seats', '18 days left · 15 of 15 founding seats']);
  });

  it('the API’s count changes only the numbers and the last word: the meter and line were already showing', async () => {
    mount();
    answer(FACTS({ left: 9 }));
    const before = shown('[data-v3-seats]');
    initOffer(document.body);
    await settle();
    await settle();
    expect(shown('[data-v3-seats]')).toEqual(before);
    expect(before).toHaveLength(2);
    expect(lines().map((l) => l.replace(/^.* · /, ''))).toEqual(['9 of 15 founding seats left', '9 of 15 founding seats left']);
  });
});

describe('S11’s switches', () => {
  it('show the price for the side pressed, and say which is pressed; the button stays on the program’s page', () => {
    mount();
    initSwitches(document.body);
    $<HTMLButtonElement>('#p-insiders [data-v3-opt="1"]').click();
    expect(shown('#p-insiders .price-big').map((p) => p.textContent)).toEqual(['$169']);
    expect([...document.querySelectorAll('#p-insiders [data-v3-opt]')].map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    $<HTMLButtonElement>('#p-team [data-v3-opt="1"]').click();
    expect(shown('#p-team .price-big').map((p) => p.textContent)).toEqual(['$2,391']);
    expect($('#p-team .pg-cta a').getAttribute('href')).toBe('/teams');
  });
});

describe('S9, the calculator', () => {
  it('works the brief’s arithmetic, and reads a typed rate as a number from 0 to the cap', () => {
    expect(hoursMath([20, 20, 20, 20, 20, 20, 20], 100)).toMatchObject({ week: '70', year: '3,500', weeks: '87.5', dollars: '$350,000' });
    expect(hoursMath([0, 0, 0, 0, 0, 0, 0], 250).cells.every((c) => c === 0)).toBe(true);
    expect([readRate('$1,250', 100000), readRate('abc', 100000), readRate('999999', 100000)]).toEqual([1250, 0, 100000]);
  });

  it('recounts as you slide or type, in the page’s words, and says it to a screen reader', () => {
    mount();
    const s = $('[data-v3-hours]');
    initHours(s);
    const first = s.querySelector<HTMLInputElement>('input[type="range"]')!;
    first.value = '10';
    first.dispatchEvent(new Event('input'));
    expect([first.getAttribute('aria-valuetext'), first.closest('.hrs-row')?.querySelector('[data-v3-hrs-val]')?.textContent]).toEqual([
      '10 hours a week',
      '10 hrs a week',
    ]);
    const rate = s.querySelector<HTMLInputElement>('[data-v3-rate]')!;
    rate.value = '100';
    rate.dispatchEvent(new Event('input'));
    expect(['week', 'year', 'weeks', 'dollars'].map((k) => s.querySelector(`[data-v3-out="${k}"]`)?.textContent)).toEqual(['14.5', '725', '18.1', '$72,500']);
    expect(s.querySelector('[data-v3-said]')?.textContent).toBe('14.5 hours back every week, 725 a year, worth $72,500.');
    expect(s.querySelector('[data-v3-cells]')?.getAttribute('aria-label')).toBe('18.1 of 50 work weeks back');
  });
});

describe('S12’s ring', () => {
  it('counts the hires in from 0 to 7, week by week, as it arrives, and ends on 7', () => {
    vi.useFakeTimers();
    const seen: IntersectionObserverCallback[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          seen.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
    mount();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect);
    const sec = $('[data-v3-wed]');
    initTimeline(sec);
    expect(sec.querySelector('[data-v3-built]')?.textContent).toBe('0');
    seen.forEach((cb) => cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    vi.advanceTimersByTime(160 * 4);
    expect(Number(sec.querySelector('[data-v3-built]')?.textContent)).toBeGreaterThan(0);
    vi.advanceTimersByTime(160 * 10);
    expect(sec.querySelector('[data-v3-built]')?.textContent).toBe('7');
    expect([...sec.querySelectorAll('.wed-row')].every((r) => r.classList.contains('is-on'))).toBe(true);
  });

  it('stays at 7 of 7 on a phone or under reduced motion', () => {
    for (const m of [{ wide: false }, { reduce: true }]) {
      window.matchMedia = media(m);
      mount();
      initTimeline($('[data-v3-wed]'));
      expect($('[data-v3-built]').textContent).toBe('7');
    }
  });
});
