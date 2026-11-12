import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FOUNDING } from '../../site/offers-content';
import { renderHomeBody } from '../render';
import { resetMotionQueries } from './motion';
import { initOfferCard } from './offer-card';
import { initPlans } from './plans';
import { initTabs } from './tabs';

// The script on the page the build renders: the real homepage markup in jsdom, /api/offer stubbed, and
// the plan cards, the tabs and the offer plan driven as a visitor would.

const CARTS = ['cohort-full', 'cohort-two-pay', 'insiders-year', 'insiders-monthly', 'agents-upto15', 'agents-16to40'];

const offer = (over: Record<string, unknown> = {}, state: (id: string) => string = () => 'link') => ({
  open: true,
  founding: { open: true, closesAt: '2026-12-01T06:59:00.000Z' },
  seats: { total: 15, sold: 3, left: 12 },
  carts: CARTS.map((id) => ({ id, state: state(id), paymentLink: `https://buy.stripe.com/${id}` })),
  ...over,
});

const respond = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response);
const settle = async () => {
  for (let i = 0; i < 4; i += 1) await new Promise((r) => setTimeout(r, 0));
};
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const insiders = () => $('.plan[data-card="insiders"]');

beforeEach(() => {
  document.body.innerHTML = renderHomeBody();
  // Reduced motion, so nothing waits on a frame.
  window.matchMedia = ((q: string) => ({
    matches: q.includes('reduce'),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  resetMotionQueries();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function start(body: unknown, ok = true) {
  vi.stubGlobal('fetch', respond(body, ok));
  initPlans($('[data-plans]'));
  await settle();
}

describe('Four ways in, live', () => {
  it('asks /api/offer once, and shows the Accelerator’s seats in /pricing’s words', async () => {
    await start(offer());
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/api/offer');
    expect($('[data-seats]').hidden).toBe(false);
    expect($('[data-seat-label]').textContent).toBe(`12${FOUNDING.seatsOf}15${FOUNDING.seatsAfter}`);
    expect(document.querySelectorAll('.seatbar span.is-sold')).toHaveLength(3);
  });

  it('at 15 sold: /pricing’s “All … founding seats are taken.”', async () => {
    await start(
      offer({ seats: { total: 15, sold: 15, left: 0 } }, (id) => (id.startsWith('cohort') ? 'soldout' : 'link')),
    );
    expect($('[data-seat-label]').textContent).toBe(FOUNDING.soldout);
  });

  it('keeps Get Amplified Insiders while its cart sells, still linking to /pricing#insiders', async () => {
    await start(offer());
    expect(insiders().dataset.state).toBe('link');
    expect(insiders().querySelector('.act-link .cta')!.getAttribute('href')).toBe('/pricing#insiders');
  });

  it('swaps Get Amplified Insiders for “Opens soon.” when the API says the cart doesn’t sell', async () => {
    await start(offer({ open: false }));
    expect(insiders().dataset.state).toBe('soon');
  });

  it('leaves the button, and hides the seats, when the API can’t be reached: the live page’s link stands', async () => {
    await start({}, false);
    expect(insiders().hasAttribute('data-state')).toBe(false);
    expect($('[data-seats]').hidden).toBe(true);
    expect($('[data-plans]').dataset.founding).toBe('open');
  });

  it('after founding closes: the API’s word switches the Accelerator to its next-cohort price', async () => {
    await start(
      offer({ founding: { open: false, closesAt: '2026-12-01T06:59:00.000Z' } }, (id) =>
        id.startsWith('cohort') ? 'closed' : 'link',
      ),
    );
    expect($('[data-plans]').dataset.founding).toBe('closed');
  });

  it('never changes a card’s link: every href is the markup’s', async () => {
    const before = [...document.querySelectorAll('.plan a')].map((a) => a.getAttribute('href'));
    await start(offer());
    expect([...document.querySelectorAll('.plan a')].map((a) => a.getAttribute('href'))).toEqual(before);
    expect(before).toEqual(['/team-build', '/agents', '/teams', '/pricing#insiders']);
  });
});

describe('the Library’s tabs', () => {
  it('follow the ARIA tabs pattern', () => {
    initTabs($('[data-tabs]'));
    const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    tabs[0]!.focus();
    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement).toBe(tabs[3]);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false', 'true']);
    expect(tabs.map((t) => t.tabIndex)).toEqual([-1, -1, -1, 0]);
    expect($('#hp-panel-4').hidden).toBe(false);
    expect($('#hp-panel-1').hidden).toBe(true);
    tabs[1]!.click();
    expect($('#hp-panel-2').hidden).toBe(false);
  });
});

describe('the offer plan', () => {
  it('starts ticked as the live sheet is, and is ready once the settlement date is checked too', () => {
    initOfferCard($('[data-offer]'));
    const boxes = [...document.querySelectorAll<HTMLInputElement>('.term-input')];
    expect(boxes.map((b) => b.checked)).toEqual([true, true, true, true, false]);
    expect($('[data-offer-progress]').style.transform).toBe('scaleX(0.8)');
    expect($('[data-offer]').classList.contains('is-ready')).toBe(false);
    boxes[4]!.click();
    expect($('[data-offer-progress]').style.transform).toBe('scaleX(1)');
    expect($('[data-offer]').classList.contains('is-ready')).toBe(true);
  });
});
