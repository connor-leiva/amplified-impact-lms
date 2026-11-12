// Homepage v3's one script: a same-origin module file, never inlined, so the CSP's `script-src 'self'`
// admits it. It only adds to a page that already reads in full without it: every figure is printed,
// every buy button, seat and proof line is shown, and the badge's first tab is the one that shows.
//
// The kit's `init()` (`./kit.ts`, its own functions, copied), theme switch included: Connor's D8 gives
// `/` a working light/dark switch, the kit's own. Dark (the mockup's look) until someone picks light,
// and a theme picked on any kit page carries here, and back.

import { initBadges } from './badges';
import { initCountUps } from './count';
import { initEnter } from './enter';
import { initInView, initPhoneMenu, initPrograms, initScrollExit, initScrolled, initTheme } from './kit';
import { initChat, initHow, initMonday } from './pinned';
import { initArrival, initOrgChart, initQuote } from './proof';

export function init(): void {
  document.documentElement.classList.add('aiw-js');
  const page = document.querySelector<HTMLElement>('.aiw');
  if (!page) return;
  initTheme(page);
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
  const chat = page.querySelector<HTMLElement>('[data-chat]');
  if (chat) initChat(chat);
  const mon = page.querySelector<HTMLElement>('[data-pin="mon"]');
  if (mon) initMonday(mon);
  const how = page.querySelector<HTMLElement>('[data-pin="how"]');
  if (how) initHow(how);
  for (const el of page.querySelectorAll<HTMLElement>('[data-band], [data-pst]')) initArrival(el);
  const chart = page.querySelector<HTMLElement>('[data-oc]');
  if (chart) initOrgChart(chart);
  const quote = page.querySelector<HTMLElement>('[data-qt]');
  if (quote) initQuote(quote);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
