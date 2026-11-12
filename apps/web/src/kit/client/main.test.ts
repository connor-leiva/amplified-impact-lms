import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KIT } from '../content';
import { seatMeter } from '../parts';
import { kitFooter, kitHeader } from '../render';
import { init, initInView, initPhoneMenu, initPrograms, initTheme, savedTheme } from './main';

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

describe('what moves as you scroll', () => {
  it('shows everything at once where motion is reduced: no block held back, no figure reset', () => {
    window.matchMedia = media(false, true) as unknown as typeof window.matchMedia;
    const page = mount();
    initInView(page);
    expect(page.querySelector('.seatm')?.classList.contains('is-in')).toBe(true);
    expect(page.querySelector('.foot-mark')?.classList.contains('is-in')).toBe(true);
    expect(page.querySelectorAll('.rv-wait').length).toBe(0);
  });

  it('marks the page as scripted, and leaves a page without the kit alone', () => {
    document.body.className = '';
    document.body.innerHTML = '<p>Not a kit page.</p>';
    init();
    expect(document.documentElement.classList.contains('aiw-js')).toBe(true);
    expect(document.body.innerHTML).toBe('<p>Not a kit page.</p>');
  });
});
