import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { proofLine } from '../../site/offers';
import { renderHomeBody } from '../render';
import { resetMotionQueries } from './motion';
import { holdsBuying, initReveal } from './reveal';

// Ampy's rule on the homepage, as the v2 kit's own test holds it (`../../kit/client/main.test.ts`): in a
// scrolling browser, with everything below the fold, the reveal never holds back a card's button, the
// proof line, the seat counter, the plan actions or a payment link. Everything else still rises in.

/** A scrolling browser: IntersectionObserver exists, and nothing ever comes into view. */
class FakeObserver {
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  resetMotionQueries();
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const BUYING = ['.plan', '.plan .cta', '.proof-line', '.plan-actions', '[data-seats]', 'a[href*="buy.stripe.com"]'];

describe('the reveal never holds back buying (Ampy’s rule)', () => {
  it('leaves the four plan cards, their buttons, proof lines and seats in place on the page the build renders', () => {
    document.body.innerHTML = renderHomeBody();
    initReveal(document);
    expect(document.querySelectorAll('.plan')).toHaveLength(4);
    expect(document.querySelectorAll('.plan .cta').length).toBeGreaterThanOrEqual(4);
    for (const sel of BUYING) {
      for (const el of document.querySelectorAll(sel)) expect(el.closest('.rv-wait'), `${sel}: ${el.outerHTML.slice(0, 80)}`).toBeNull();
    }
    // The guard is narrow: the section's heading and the note under the cards still rise in.
    expect(document.querySelector('.plans-head')?.classList.contains('rv-wait')).toBe(true);
    expect(document.querySelector('.plans-free')?.classList.contains('rv-wait')).toBe(true);
  });

  it('skips any reveal that wraps one by mistake, and still holds back the rest', () => {
    document.body.innerHTML = [
      `<main id="main">`,
      `<div class="rv proof-only">${proofLine()}</div>`,
      `<div class="rv actions"><div class="plan-actions"><div class="act-always"><a class="cta" href="/agents">See</a>${proofLine()}</div></div></div>`,
      `<div class="rv seats"><div class="seat-block" data-seats data-left="{left}" hidden></div></div>`,
      `<div class="rv link-only"><a href="https://buy.stripe.com/test_link">Pay</a></div>`,
      `<div class="rv plain"><h2>Questions</h2></div>`,
      `</main>`,
    ].join('');
    initReveal(document);
    expect([...document.querySelectorAll('.rv-wait')].map((el) => el.className)).toEqual(['rv plain rv-wait']);
    expect(holdsBuying(document.querySelector('.plain')!)).toBe(false);
    expect(holdsBuying(document.querySelector('.link-only')!)).toBe(true);
  });

  it('is backed up by the stylesheet, in case a page ever wraps one', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../home.css'), 'utf8');
    expect(css).toMatch(/\.hp \.rv-wait:has\(\.proof-line, \.plan-actions, \.act-link, \.act-always, \.seatm, \[data-seats\], \[data-left\], a\[href\*='buy\.stripe\.com'\]\) \{\s*opacity: 1;\s*transform: none;/);
  });
});
