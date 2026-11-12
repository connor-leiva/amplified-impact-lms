import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderV3Body } from '../render';
import { initBadges } from './badges';
import { COUNT_MS, initCountUps } from './count';
import { init } from './main';

// v3's script on the page the build renders, in jsdom: what it adds, and what it never takes away.

type Media = { wide?: boolean; reduce?: boolean };
const media = ({ wide = true, reduce = false }: Media = {}) =>
  ((q: string) => ({
    matches: (q.includes('981px') && wide) || (q.includes('1081px') && wide) || (q.includes('reduced-motion') && reduce),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;

const mount = () => {
  document.body.className = 'aiw';
  document.body.dataset.theme = 'dark';
  document.body.innerHTML = renderV3Body({ preview: false });
  return document.body;
};
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const shown = () => [...document.querySelectorAll<HTMLElement>('.bdg')].filter((b) => !b.hidden).map((b) => b.dataset.badge);
const pressed = () => [...document.querySelectorAll('.bdg-tab')].map((t) => t.getAttribute('aria-pressed'));

class NoObserver {
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = media();
  vi.stubGlobal('IntersectionObserver', NoObserver);
});
afterEach(() => {
  document.documentElement.className = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the page with the script', () => {
  it('is dark until someone picks light: the switch shows, named for the theme it turns on (D8)', () => {
    const page = mount();
    init();
    expect(document.documentElement.classList.contains('aiw-js')).toBe(true);
    expect(page.dataset.theme).toBe('dark');
    const btn = $<HTMLButtonElement>('.theme-btn');
    expect([btn.hidden, btn.getAttribute('aria-label')]).toEqual([false, btn.dataset.labelLight]);
  });

  it('switches to light and back, keeps the choice on this browser, and takes a choice made on any kit page', () => {
    const page = mount();
    init();
    const btn = $<HTMLButtonElement>('.theme-btn');
    btn.click();
    expect([page.dataset.theme, window.localStorage.getItem('aiw-theme'), btn.getAttribute('aria-label')]).toEqual([
      'light',
      'light',
      btn.dataset.labelDark,
    ]);
    btn.click();
    expect([page.dataset.theme, window.localStorage.getItem('aiw-theme')]).toEqual(['dark', 'dark']);
    // A theme saved on /pricing (the same key) is the homepage's too.
    window.localStorage.setItem('aiw-theme', 'light');
    const again = mount();
    init();
    expect(again.dataset.theme).toBe('light');
  });

  it('holds back nothing that buys or proves: the hero’s buttons, proof line and figures stay as printed', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect);
    mount();
    init();
    for (const sel of ['.hh-cta', '.proof-line', '.hh-stats']) expect($(sel).closest('.rv-wait'), sel).toBeNull();
    expect([...document.querySelectorAll('.hh-num')].map((n) => n.textContent)).toEqual(['100', '700+', '58']);
  });
});

describe('the hero’s badge', () => {
  it('switches badges when a tab is pressed, and says which is pressed', () => {
    mount();
    initBadges($('[data-badges]'));
    expect([shown(), pressed()]).toEqual([['owners'], ['true', 'false', 'false']]);
    $<HTMLButtonElement>('[data-badge-tab="ops"]').click();
    expect([shown(), pressed()]).toEqual([['ops'], ['false', 'false', 'true']]);
  });

  it('takes turns on a wide screen with motion allowed, the fill bar under the pressed tab, and stops once a tab is pressed', () => {
    mount();
    initBadges($('[data-badges]'));
    const fill = () => document.querySelector('.bdg-tab-fill');
    expect(fill()?.closest('.bdg-tab')?.getAttribute('data-badge-tab')).toBe('owners');
    fill()!.dispatchEvent(new Event('animationend'));
    expect(shown()).toEqual(['agents']);
    expect(fill()?.closest('.bdg-tab')?.getAttribute('data-badge-tab')).toBe('agents');
    $<HTMLButtonElement>('[data-badge-tab="owners"]').click();
    expect([shown(), fill()]).toEqual([['owners'], null]);
  });

  it('never takes turns under reduced motion or below 981px; the tabs still work', () => {
    for (const m of [{ reduce: true }, { wide: false }]) {
      window.matchMedia = media(m);
      mount();
      initBadges($('[data-badges]'));
      expect(document.querySelector('.bdg-tab-fill')).toBeNull();
      $<HTMLButtonElement>('[data-badge-tab="agents"]').click();
      expect(shown()).toEqual(['agents']);
    }
  });
});

describe('count-ups', () => {
  it('leave a figure on screen at load, or under reduced motion, exactly as printed', () => {
    mount();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 10 } as DOMRect);
    initCountUps(document);
    window.matchMedia = media({ reduce: true });
    initCountUps(document);
    expect([...document.querySelectorAll('.hh-num')].map((n) => n.textContent)).toEqual(['100', '700+', '58']);
  });

  it('count a figure that arrives from below up to the printed one, and end on it exactly', async () => {
    mount();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect);
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
    let now = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb((now += COUNT_MS / 3)), 0));
    initCountUps(document);
    // The hero's three, and S3's 12 and 1.
    expect(seen).toHaveLength(document.querySelectorAll('[data-v3-count]').length);
    expect(seen.length).toBe(5);
    for (const cb of seen) cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    await new Promise((r) => setTimeout(r, 50));
    expect([...document.querySelectorAll('.hh-num')].map((n) => n.textContent)).toEqual(['100', '700+', '58']);
    expect([...document.querySelectorAll('.cvs-n')].map((n) => n.textContent)).toEqual(['12', '1']);
  });
});
