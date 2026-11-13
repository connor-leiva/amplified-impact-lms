import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOW } from '../content';
import { renderV3Body } from '../render';
import { howStep, initHow, initMonday, mondayHandOff, pinnable } from './pinned';

// S4 and S5's two layouts, in jsdom (brief § 5): pinned on a wide screen with motion allowed, static
// everywhere else; and the progress each one's state follows.

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
};
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
/** Puts a section's run at `p`: 3000px tall, its top scrolled `p` of the way through. */
const at = (p: number) =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: -(3000 - window.innerHeight) * p, height: 3000 } as DOMRect);

beforeEach(() => {
  window.matchMedia = media();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the progress', () => {
  it('pins only on a wide screen with motion allowed', () => {
    expect(pinnable()).toBe(true);
    window.matchMedia = media({ wide: false });
    expect(pinnable()).toBe(false);
    window.matchMedia = media({ reduce: true });
    expect(pinnable()).toBe(false);
  });

  it('hands Monday off between 20% and 80% of the run, and flips sides at halfway', () => {
    expect([0, 0.2, 0.5, 0.8, 1].map(mondayHandOff)).toEqual([0, 0, 0.5, 1, 1]);
  });

  it('gives S5 a third of the run per step, each step settling before the next', () => {
    expect(howStep(0)).toEqual({ step: 0, q: 0 });
    expect(howStep(0.3).step).toBe(0);
    expect(howStep(0.3).q).toBe(1);
    expect(howStep(0.5).step).toBe(1);
    expect(howStep(1)).toEqual({ step: 2, q: 1 });
  });
});

describe('S4, Monday', () => {
  it('static, the toggle switches the morning in place, and says which side is pressed', () => {
    window.matchMedia = media({ wide: false });
    mount();
    const sec = $('[data-pin="mon"]');
    initMonday(sec);
    expect([sec.classList.contains('is-static'), sec.style.getPropertyValue('--m')]).toEqual([true, '1']);
    $<HTMLButtonElement>('[data-pin="mon"] button[data-side="without"]').click();
    expect(sec.style.getPropertyValue('--m')).toBe('0');
    expect([...sec.querySelectorAll('.seg-toggle button')].map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect([...sec.querySelectorAll('.mon-p.is-on')].map((p) => p.getAttribute('data-side'))).toEqual(['without', 'without']);
  });

  it('pinned, the scroll hands the morning off, “Without” before halfway and “With” after; the toggle jumps there', () => {
    mount();
    const sec = $('[data-pin="mon"]');
    at(0.1);
    initMonday(sec);
    expect([sec.classList.contains('is-pinned'), sec.classList.contains('is-static'), sec.style.getPropertyValue('--m')]).toEqual([true, false, '0.0000']);
    expect([...sec.querySelectorAll('.seg-toggle button')].map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    vi.restoreAllMocks();
    at(0.9);
    window.dispatchEvent(new Event('scroll'));
    return new Promise<void>((done) =>
      setTimeout(() => {
        expect(sec.style.getPropertyValue('--m')).toBe('1.0000');
        expect([...sec.querySelectorAll('.seg-toggle button')].map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
        $<HTMLButtonElement>('[data-pin="mon"] button[data-side="without"]').click();
        expect(window.scrollTo).toHaveBeenCalled();
        done();
      }, 5),
    );
  });
});

describe('S5, how it works', () => {
  it('static, the steps switch the panel in place, and the email stays typed in full', () => {
    window.matchMedia = media({ reduce: true });
    mount();
    const sec = $('[data-pin="how"]');
    initHow(sec);
    $<HTMLButtonElement>('[data-pin="how"] .how-step[data-step="2"]').click();
    expect([...sec.querySelectorAll('.how-panel')].map((p) => p.classList.contains('is-on'))).toEqual([false, false, true]);
    expect([...sec.querySelectorAll('.how-step')].map((b) => b.getAttribute('aria-current'))).toEqual([null, null, 'step']);
    expect($('[data-type]').textContent).toBe(HOW.yes.body);
  });

  it('pinned, a third of the run per step, the email typing itself in step three; screen readers always have it whole', () => {
    mount();
    const sec = $('[data-pin="how"]');
    at(0.5);
    initHow(sec);
    expect([...sec.querySelectorAll('.how-panel')].map((p) => p.classList.contains('is-on'))).toEqual([false, true, false]);
    expect($('[data-type]').textContent).toBe('');
    vi.restoreAllMocks();
    at(0.7);
    window.dispatchEvent(new Event('scroll'));
    return new Promise<void>((done) =>
      setTimeout(() => {
        const typed = $('[data-type]').textContent ?? '';
        expect([...sec.querySelectorAll('.how-step')].map((b) => b.getAttribute('aria-current'))).toEqual([null, null, 'step']);
        expect(typed.length).toBeGreaterThan(0);
        expect(typed.length).toBeLessThan(HOW.yes.body.length);
        expect(HOW.yes.body.startsWith(typed)).toBe(true);
        expect($('.mail-body .sr-only').textContent).toBe(HOW.yes.body);
        done();
      }, 5),
    );
  });
});
