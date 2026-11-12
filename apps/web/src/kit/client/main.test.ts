import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KIT } from '../content';
import { proofLine, seatMeter } from '../parts';
import { kitFooter, kitHeader } from '../render';
import { holdsBuying, init, initInView, initPhoneMenu, initPrograms, initSizer, initTheme, savedTheme } from './main';

// The kit's script on the kit's own markup, in jsdom: what it adds to a page that already works without
// it, and nothing it takes away.

const mount = () => {
  document.body.className = 'aiw';
  document.body.dataset.theme = 'dark';
  document.body.innerHTML = `${kitHeader('/pricing')}<main id="main">${seatMeter('12', 'Seats')}</main>${kitFooter()}`;
  return document.body;
};
const media = (hover = false, reduce = false) =>
  vi.fn((q: string) => ({
    matches: (q.includes('hover') && hover) || (q.includes('reduced-motion') && reduce),
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = media() as unknown as typeof window.matchMedia;
});
afterEach(() => {
  document.documentElement.className = '';
  document.documentElement.style.overflow = '';
  vi.restoreAllMocks();
});

describe('the theme switch', () => {
  it('shows itself, named for the theme it turns on, and switches and remembers the theme', () => {
    const page = mount();
    initTheme(page);
    const btn = page.querySelector<HTMLButtonElement>('.theme-btn')!;
    expect(btn.hidden).toBe(false);
    expect(btn.getAttribute('aria-label')).toBe(KIT.themeTo.light);
    btn.click();
    expect(page.dataset.theme).toBe('light');
    expect(btn.getAttribute('aria-label')).toBe(KIT.themeTo.dark);
    expect(savedTheme()).toBe('light');
    btn.click();
    expect(page.dataset.theme).toBe('dark');
    expect(savedTheme()).toBe('dark');
  });

  it('opens on the theme this browser chose last time', () => {
    window.localStorage.setItem('aiw-theme', 'light');
    const page = mount();
    initTheme(page);
    expect(page.dataset.theme).toBe('light');
    expect(page.querySelector('.theme-btn')?.getAttribute('aria-label')).toBe(KIT.themeTo.dark);
  });

  it('ignores anything else saved under its name', () => {
    window.localStorage.setItem('aiw-theme', 'sepia');
    const page = mount();
    initTheme(page);
    expect(page.dataset.theme).toBe('dark');
  });
});

describe('the Programs menu', () => {
  it('shuts on Escape and gives focus back to Programs', () => {
    const page = mount();
    const header = page.querySelector<HTMLElement>('.hdr')!;
    const menu = header.querySelector<HTMLDetailsElement>('details.hdr-programs')!;
    window.matchMedia = media(false, true) as unknown as typeof window.matchMedia;
    initPrograms(header, menu);
    menu.open = true;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(menu.querySelector('summary'));
  });

  it('shuts on a click outside the header, and when a link inside is followed', () => {
    const page = mount();
    const header = page.querySelector<HTMLElement>('.hdr')!;
    const menu = header.querySelector<HTMLDetailsElement>('details.hdr-programs')!;
    window.matchMedia = media(false, true) as unknown as typeof window.matchMedia;
    initPrograms(header, menu);
    menu.open = true;
    page.querySelector('main')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(menu.open).toBe(false);
    menu.open = true;
    page.addEventListener('click', (e) => e.preventDefault());
    menu
      .querySelector<HTMLAnchorElement>('.pm-card')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(menu.open).toBe(false);
  });

  it('opens on hover where there is a mouse', () => {
    vi.useFakeTimers();
    const page = mount();
    const header = page.querySelector<HTMLElement>('.hdr')!;
    const menu = header.querySelector<HTMLDetailsElement>('details.hdr-programs')!;
    window.matchMedia = media(true) as unknown as typeof window.matchMedia;
    initPrograms(header, menu);
    menu.querySelector('summary')!.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(100);
    expect(menu.open).toBe(true);
    vi.useRealTimers();
  });
});

describe('the phone menu', () => {
  it('names its button by what it does, holds the page still while open, and shuts on Escape', () => {
    const page = mount();
    const header = page.querySelector<HTMLElement>('.hdr')!;
    const menu = header.querySelector<HTMLDetailsElement>('details.hdr-mobile')!;
    initPhoneMenu(header, menu);
    const btn = menu.querySelector('summary')!;
    menu.open = true;
    menu.dispatchEvent(new Event('toggle'));
    expect(btn.getAttribute('aria-label')).toBe(KIT.menuClose);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(header.classList.contains('is-open')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    menu.dispatchEvent(new Event('toggle'));
    expect(menu.open).toBe(false);
    expect(btn.getAttribute('aria-label')).toBe(KIT.menuOpen);
    expect(document.documentElement.style.overflow).toBe('');
  });
});

describe('the size slider', () => {
  it('shows itself, counts the seats, shows the fitting size’s price and marks its card, never touching a link', () => {
    document.body.className = 'aiw';
    document.body.innerHTML = [
      '<div data-sizer hidden><input type="range" min="1" max="41" value="12"><output></output>',
      '<span class="seat"></span><span class="seat"></span><span class="seat"></span><span class="seat seat-more"></span>',
      '<div data-tier="size-15" data-max="15">A</div><div data-tier="size-40" data-max="40" hidden>B</div><div data-tier="size-more" data-max="41" hidden>C</div></div>',
      '<ol><li id="size-15"><a href="%%link:agents-upto15%%">Buy</a></li><li id="size-40"><a href="%%link:agents-16to40%%">Buy</a></li><li id="size-more"><a href="%%team-call%%">Talk</a></li></ol>',
    ].join('');
    const sizer = document.querySelector<HTMLElement>('[data-sizer]')!;
    const input = sizer.querySelector<HTMLInputElement>('input')!;
    const hrefs = () => [...document.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    const before = hrefs();
    initSizer(sizer, document);
    expect(sizer.hidden).toBe(false);
    expect(sizer.querySelector('output')?.textContent).toBe('12');
    const shown = () => [...sizer.querySelectorAll<HTMLElement>('[data-max]')].filter((p) => !p.hidden).map((p) => p.dataset.tier);
    expect(shown()).toEqual(['size-15']);
    expect(document.getElementById('size-15')?.classList.contains('is-on')).toBe(true);
    input.value = '25';
    input.dispatchEvent(new Event('input'));
    expect(shown()).toEqual(['size-40']);
    expect(document.getElementById('size-40')?.classList.contains('is-on')).toBe(true);
    expect(document.getElementById('size-15')?.classList.contains('is-on')).toBe(false);
    input.value = '41';
    input.dispatchEvent(new Event('input'));
    expect(sizer.querySelector('output')?.textContent).toBe('40+');
    expect(shown()).toEqual(['size-more']);
    expect(hrefs()).toEqual(before);
  });
});

describe('what moves as you scroll', () => {
  it('shows everything at once where motion is reduced: no block held back, no figure reset', () => {
    window.matchMedia = media(false, true) as unknown as typeof window.matchMedia;
    const page = mount();
    initInView(page);
    expect(page.querySelector('.seatm')?.classList.contains('is-in')).toBe(true);
    expect(page.querySelector('.foot-mark')?.classList.contains('is-in')).toBe(true);
    expect(page.querySelectorAll('.rv-wait').length).toBe(0);
  });

  it('never holds back a buy button, a payment link, a seat counter or the proof line below the fold', () => {
    // A scrolling browser: IntersectionObserver exists, and everything here sits below the fold.
    const observed: Element[] = [];
    class FakeObserver {
      observe(el: Element) {
        observed.push(el);
      }
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 5000 } as DOMRect);
    document.body.className = 'aiw';
    document.body.innerHTML = [
      `<main id="main">`,
      `<li class="card plan rv" data-state="link"><div class="plan-actions"><div class="act-link"><a class="btn btn-primary" href="https://buy.stripe.com/test_year">Buy</a><a class="text-link more" href="https://buy.stripe.com/test_month">Or pay monthly</a>${proofLine()}</div></div></li>`,
      `<div class="rv proof-only">${proofLine()}</div>`,
      `<div class="rv seats">${seatMeter('12', 'Seats')}</div>`,
      `<div class="rv link-only"><a href="https://buy.stripe.com/test_link">Pay</a></div>`,
      `<div class="rv plain"><h2>Questions</h2></div>`,
      `</main>`,
    ].join('');
    initInView(document.body);
    const held = [...document.querySelectorAll('.rv-wait')];
    // The plain heading is held back, as before: the guard is narrow.
    expect(held.map((el) => el.className)).toEqual(['rv plain rv-wait']);
    for (const sel of ['a[href*="buy.stripe.com"]', '.proof-line', '.seatm', '.plan-actions']) {
      for (const el of document.querySelectorAll(sel)) expect(el.closest('.rv-wait'), sel).toBeNull();
    }
    expect(holdsBuying(document.querySelector('.plain')!)).toBe(false);
    expect(holdsBuying(document.querySelector('.card')!)).toBe(true);
    vi.unstubAllGlobals();
  });

  it('draws the seat counter’s marks from the start, and the CSS backs the rule up', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../kit.css'), 'utf8');
    expect(css).not.toMatch(/\.seatm:not\(\.is-in\) \.seatm-s/);
    expect(css).toMatch(/\.aiw \.rv-wait:has\(\.proof-line, \.plan-actions, \.seatm/);
    expect(css).toMatch(/\.aiw :is\(\.fade-1, \.fade-2, \.fade-3\):has\(\.proof-line, \.plan-actions, \.seatm/);
  });

  it('marks the page as scripted, and leaves a page without the kit alone', () => {
    document.body.className = '';
    document.body.innerHTML = '<p>Not a kit page.</p>';
    init();
    expect(document.documentElement.classList.contains('aiw-js')).toBe(true);
    expect(document.body.innerHTML).toBe('<p>Not a kit page.</p>');
  });
});
