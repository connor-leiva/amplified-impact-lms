// The hero's AI-employee badge (brief § 4 S1, § 5): three tabs, Owners, Agents and Ops, each showing its
// own badge. Without the script the Owners badge shows and the other two wait, hidden, in the markup.
//
// TAKING TURNS. On a wide screen (981px and up, the mockup's breakpoint) with motion allowed, the tabs
// take turns on their own: a fill bar runs under the pressed tab (the stylesheet's `bdg-fill`, the
// mockup's timing) and the next badge shows when it ends. Never under reduced motion or below 981px:
// there the tabs only switch when pressed. Pressing any tab stops the turns for good (WCAG 2.2.2), and
// pointing at or focusing inside the badge pauses them (CSS), as does the hero leaving the screen.

import { reducedMotion } from './kit';

const WIDE = '(min-width: 981px)';

const wide = (): boolean => typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches;

export function initBadges(root: HTMLElement): void {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-badge-tab]')];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-badge]')];
  if (!tabs.length || !cards.length) return;
  let stopped = false;
  const turns = () => !stopped && wide() && !reducedMotion();
  const current = () => tabs.find((t) => t.getAttribute('aria-pressed') === 'true') ?? tabs[0]!;

  const show = (tab: HTMLButtonElement) => {
    const key = tab.dataset.badgeTab;
    for (const t of tabs) t.setAttribute('aria-pressed', String(t === tab));
    for (const card of cards) card.hidden = card.dataset.badge !== key;
    root.querySelector('.bdg-tab-fill')?.remove();
    if (!turns()) return;
    const fill = document.createElement('span');
    fill.className = 'bdg-tab-fill';
    fill.addEventListener('animationend', () => show(tabs[(tabs.indexOf(tab) + 1) % tabs.length]!), { once: true });
    tab.querySelector('.bdg-tab-track')?.append(fill);
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      stopped = true;
      show(tab);
    });
  }

  // A screen that narrows, or motion turned off, stops the turns where they are; widening starts them.
  if (typeof window.matchMedia === 'function') {
    for (const q of [WIDE, '(prefers-reduced-motion: reduce)']) {
      const list = window.matchMedia(q);
      if (typeof list.addEventListener === 'function') list.addEventListener('change', () => show(current()));
    }
  }

  // Off screen, the turns wait: the next badge shows only once someone can see it.
  if ('IntersectionObserver' in window) {
    const wrap = root.querySelector('.bdg-wrap') ?? root;
    new IntersectionObserver((entries) => {
      for (const e of entries) wrap.classList.toggle('is-paused', !e.isIntersecting);
    }).observe(root);
  }

  show(current());
}
