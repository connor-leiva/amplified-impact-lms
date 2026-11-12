// Homepage v3's one script: a same-origin module file, never inlined, so the CSP's `script-src 'self'`
// admits it. It only adds to a page that already reads in full without it: every figure is printed,
// every buy button, seat and proof line is shown, and the badge's first tab is the one that shows.
//
// The kit's `init()` (`./kit.ts`, its own functions, copied), but for one thing: the theme switch. `/`
// stays dark (conflict C16), so the switch stays hidden and no saved theme is applied.

import { initBadges } from './badges';
import { initCountUps } from './count';
import { initEnter } from './enter';
import { initInView, initPhoneMenu, initPrograms, initScrollExit, initScrolled } from './kit';

export function init(): void {
  document.documentElement.classList.add('aiw-js');
  const page = document.querySelector<HTMLElement>('.aiw');
  if (!page) return;
  const header = page.querySelector<HTMLElement>('.hdr');
  if (header) {
    initScrolled(header);
    const programs = header.querySelector<HTMLDetailsElement>('details.hdr-programs');
    if (programs) initPrograms(header, programs);
    const phone = header.querySelector<HTMLDetailsElement>('details.hdr-mobile');
    if (phone) initPhoneMenu(header, phone);
  }
  initScrollExit(page);
  initInView(page);
  initCountUps(page);
  initEnter(page);
  const badges = page.querySelector<HTMLElement>('[data-badges]');
  if (badges) initBadges(badges);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
