import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderV3Body } from '../render';
import { initArrival, initOrgChart, initQuote, passOf } from './proof';

// S6 to S8's script, in jsdom (brief § 5): settled unless a wide screen with motion allowed; the org
// chart's toggle working everywhere, hiding what it hides from the keyboard too.

const media = ({ wide = true, reduce = false } = {}) =>
  ((q: string) => ({
    matches: (q.includes('981px') && wide) || (q.includes('reduced-motion') && reduce),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;

const mount = () => {
  document.body.className = 'aiw';
  document.body.innerHTML = renderV3Body({ preview: true });
};
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const pressed = () => [...document.querySelectorAll('.oc-bar button')].map((b) => b.getAttribute('aria-pressed'));
const below = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000, height: 800 } as DOMRect);

let arrive: IntersectionObserverCallback[] = [];
beforeEach(() => {
  arrive = [];
  window.matchMedia = media();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        arrive.push(cb);
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
const arrived = () => arrive.forEach((cb) => cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

describe('arrivals (S6’s plate, S7’s tiles and chart)', () => {
  it('reset a block below the fold on a wide screen with motion allowed, and draw it as it arrives', () => {
    mount();
    below();
    for (const sel of ['[data-band]', '[data-pst]']) initArrival($(sel));
    initOrgChart($('[data-oc]'));
    const drawn = () => ['[data-band]', '[data-pst]', '[data-oc]'].map((s) => $(s).classList.contains('is-in'));
    expect(drawn()).toEqual([false, false, false]);
    arrived();
    expect(drawn()).toEqual([true, true, true]);
  });

  it('leave everything settled on a phone, under reduced motion, or for a block already on screen', () => {
    for (const [m, top] of [[{ wide: false }, 5000], [{ reduce: true }, 5000], [{}, 10]] as const) {
      window.matchMedia = media(m);
      mount();
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top, height: 800 } as DOMRect);
      initArrival($('[data-band]'));
      initOrgChart($('[data-oc]'));
      expect([$('[data-band]').classList.contains('is-in'), $('[data-oc]').classList.contains('is-in')]).toEqual([true, true]);
      vi.restoreAllMocks();
    }
  });
});

describe('S7’s toggle', () => {
  it('on a phone, swaps at once: “People” closes the skills, out of the keyboard’s reach, and the counter reads 0', () => {
    window.matchMedia = media({ wide: false });
    mount();
    const oc = $('[data-oc]');
    initOrgChart(oc);
    $<HTMLButtonElement>('[data-oc-mode="people"]').click();
    expect([oc.classList.contains('is-ai'), pressed(), $('[data-oc-skills]').textContent]).toEqual([false, ['true', 'false'], '0']);
    const groups = [...oc.querySelectorAll<HTMLElement>('.oc-ai')];
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((g) => g.inert && g.getAttribute('aria-hidden') === 'true')).toBe(true);
    $<HTMLButtonElement>('[data-oc-mode="ai"]').click();
    expect([oc.classList.contains('is-ai'), oc.classList.contains('is-plugging'), pressed(), $('[data-oc-skills]').textContent]).toEqual([
      true,
      false,
      ['false', 'true'],
      '29',
    ]);
    expect(groups.some((g) => g.inert || g.hasAttribute('aria-hidden'))).toBe(false);
  });

  it('on a wide screen with motion allowed, plugs the skills back in and counts up to the chart’s 29, ending on it', async () => {
    mount();
    const oc = $('[data-oc]');
    initOrgChart(oc);
    $<HTMLButtonElement>('[data-oc-mode="people"]').click();
    $<HTMLButtonElement>('[data-oc-mode="ai"]').click();
    expect(oc.classList.contains('is-plugging')).toBe(true);
    await new Promise((r) => setTimeout(r, 600));
    expect($('[data-oc-skills]').textContent).toBe('29');
  });
});

describe('S8’s highlight', () => {
  it('follows the scroll on a wide screen with motion allowed', () => {
    mount();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 0, height: window.innerHeight } as DOMRect);
    const qt = $('[data-qt]');
    initQuote(qt);
    expect(qt.style.getPropertyValue('--p')).toBe(passOf(qt).toFixed(4));
    expect(passOf(qt)).toBe(0.5);
  });

  it('leaves every word lit (no --p) on a phone or under reduced motion', () => {
    for (const m of [{ wide: false }, { reduce: true }]) {
      window.matchMedia = media(m);
      mount();
      const qt = $('[data-qt]');
      initQuote(qt);
      expect(qt.style.getPropertyValue('--p')).toBe('');
    }
  });
});
