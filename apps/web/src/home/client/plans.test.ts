import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHomeBody } from '../render';
import { initPlans } from './plans';
import { initTeamCalc } from './team';
import { initTabs } from './tabs';
import { initOfferCard } from './offer-card';
import { resetMotionQueries } from './motion';

// The script on the page the build renders: the real homepage markup in jsdom, /api/offer stubbed, and
// the plan cards, the calculator, the tabs and the offer plan driven as a visitor would.

const LINKS: Record<string, string> = {
  'cohort-full': 'https://buy.stripe.com/cohort_full',
  'cohort-two-pay': 'https://buy.stripe.com/cohort_two',
  'insiders-year': 'https://buy.stripe.com/ins_year',
  'insiders-monthly': 'https://buy.stripe.com/ins_month',
  'agents-upto15': 'https://buy.stripe.com/team15',
  'agents-16to40': 'https://buy.stripe.com/team40',
};

const offer = (over: Record<string, unknown> = {}, state: (id: string) => string = () => 'link') => ({
  open: true,
  founding: { open: true, closesAt: '2026-12-01T06:59:00.000Z' },
  seats: { total: 15, sold: 3, left: 12 },
  carts: Object.keys(LINKS).map((id) => ({ id, state: state(id), paymentLink: LINKS[id] })),
  ...over,
});

const respond = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response);
const settle = () => new Promise((r) => setTimeout(r, 0));
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const card = (name: string) => $(`.plan[data-card="${name}"]`);
const buy = (name: string) => card(name).querySelector('[data-buy]')!.getAttribute('href');

beforeEach(() => {
  document.body.innerHTML = renderHomeBody();
  // Reduced motion, so every count lands at once.
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
  const plans = initPlans($('[data-plans]'));
  initTeamCalc($('[data-calc]'), (n) => plans.setAgents(n));
  await settle();
  await settle();
  return plans;
}

describe('the plan cards, live', () => {
  it('asks /api/offer once, same-origin, and gives each buy button its cart’s Payment Link', async () => {
    await start(offer());
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/api/offer');
    expect([buy('accelerator'), buy('teamPlan'), buy('insiders')]).toEqual([
      LINKS['cohort-full'],
      LINKS['agents-upto15'],
      LINKS['insiders-year'],
    ]);
    expect(card('accelerator').querySelector('[data-buy-more]')!.getAttribute('href')).toBe(LINKS['cohort-two-pay']);
    expect(['accelerator', 'teamPlan', 'insiders'].map((c) => card(c).dataset.state)).toEqual(['link', 'link', 'link']);
  });

  it('shows the Accelerator’s seats as /api/offer counts them', async () => {
    await start(offer());
    expect($('[data-seats]').hidden).toBe(false);
    expect($('[data-seat-label]').textContent).toBe('12 of 15 founding seats left');
    expect(document.querySelectorAll('.seatbar span.is-sold')).toHaveLength(3);
  });

  it('at 15 sold: the reference’s “taken” and the waitlist, no buy button', async () => {
    await start(
      offer({ seats: { total: 15, sold: 15, left: 0 } }, (id) => (id.startsWith('cohort') ? 'soldout' : 'link')),
    );
    expect($('[data-seat-label]').textContent).toBe('15 of 15 founding seats taken');
    expect(card('accelerator').dataset.state).toBe('soldout');
    expect(buy('accelerator')).toBeNull();
  });

  it('after founding closes: $9,997, the deadline from /api/offer, the waitlist on the Accelerator and the Team Plan', async () => {
    await start(
      offer({ founding: { open: false, closesAt: '2026-12-01T06:59:00.000Z' } }, (id) =>
        id.startsWith('cohort') || id.startsWith('agents') ? 'closed' : 'link',
      ),
    );
    expect($('[data-plans]').dataset.founding).toBe('closed');
    expect([card('accelerator').dataset.state, card('teamPlan').dataset.state, card('insiders').dataset.state]).toEqual(
      ['closed', 'closed', 'link'],
    );
    expect(card('accelerator').querySelector('[data-deadline]')!.textContent).toBe(
      'Monday, November 30 at 11:59 PM Mountain',
    );
  });

  it('while the offer is off, or the API can’t be reached: no buy button anywhere', async () => {
    await start(offer({ open: false }));
    expect([buy('accelerator'), buy('teamPlan'), buy('insiders')]).toEqual([null, null, null]);
    expect(card('insiders').dataset.state).toBe('soon');

    document.body.innerHTML = renderHomeBody();
    await start({}, false);
    expect(['accelerator', 'teamPlan', 'insiders'].map((c) => card(c).dataset.state)).toEqual([
      'unknown',
      'unknown',
      'unknown',
    ]);
    expect([buy('accelerator'), buy('teamPlan'), buy('insiders')]).toEqual([null, null, null]);
    expect($('[data-seats]').hidden).toBe(true);
  });

  it('Insiders’ switch changes the price and the Payment Link together', async () => {
    await start(offer());
    [...card('insiders').querySelectorAll<HTMLButtonElement>('[data-toggle] button')][1]!.click();
    expect(card('insiders').querySelector('.price[data-price]')!.textContent).toBe('$197');
    expect(card('insiders').querySelector('.price-after[data-after]')!.textContent).toBe('Three-month minimum.');
    expect(buy('insiders')).toBe(LINKS['insiders-monthly']);
  });

  it('the calculator sets the Team Plan card’s tier, price and Payment Link', async () => {
    await start(offer());
    const input = $<HTMLInputElement>('#hp-agents');
    input.value = '16';
    input.dispatchEvent(new Event('input'));
    expect($('[data-calc-price]').textContent).toBe('$2,391');
    expect($('[data-calc-tier]').textContent).toBe('16 to 40 agents');
    expect($('[data-calc-extra]').hidden).toBe(false);
    expect(input.getAttribute('aria-valuetext')).toBe('16, 16 to 40 agents, $2,391 today for 3 months');
    expect(card('teamPlan').querySelector('[data-tier-label]')!.textContent).toBe('16 to 40 agents');
    expect(card('teamPlan').querySelector('.price-after[data-after]')!.textContent).toBe(
      'Then $797 a month from April 4, 2027.',
    );
    expect(buy('teamPlan')).toBe(LINKS['agents-16to40']);
    input.value = '15';
    input.dispatchEvent(new Event('input'));
    expect(buy('teamPlan')).toBe(LINKS['agents-upto15']);
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
    expect($('#hp-panel-content').hidden).toBe(false);
    expect($('#hp-panel-buyers').hidden).toBe(true);
    tabs[1]!.click();
    expect($('#hp-panel-listing').hidden).toBe(false);
  });
});

describe('the offer plan', () => {
  it('counts the ticked terms and signs off when all five are', () => {
    initOfferCard($('[data-offer]'));
    const boxes = [...document.querySelectorAll<HTMLInputElement>('.term-input')];
    boxes[0]!.click();
    boxes[1]!.click();
    expect($('[data-offer-hint]').textContent).toBe('2 of 5 checked');
    for (const b of boxes.slice(2)) b.click();
    expect([
      $('[data-offer-hint]').textContent,
      $('[data-offer-status]').textContent,
      $('[data-offer-sign]').textContent,
    ]).toEqual(['Every term checked.', 'Checked by you', 'Ready for your buyer.']);
    expect($('[data-offer]').classList.contains('is-ready')).toBe(true);
  });
});
