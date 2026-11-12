// The homepage's one script (see `../render.ts`): a same-origin module file, never inlined, so the CSP's
// `script-src 'self'` admits it. It only adds to a page that already reads in full without it.

import { initHeader } from './header';
import { canPin, reducedMotion } from './motion';
import { initOfferCard } from './offer-card';
import { initPlans } from './plans';
import { initCountUp, initReveal } from './reveal';
import { initScroll, setPinned } from './scroll';
import { initTabs } from './tabs';

function init(): void {
  const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);

  // The kit's header (Logo 1, Programs, the phone menu), with the kit's own behaviour.
  initHeader(document);

  const card = $('[data-offer]');
  if (card) initOfferCard(card);

  const tabs = $('[data-tabs]');
  if (tabs) initTabs(tabs);

  const plans = $('[data-plans]');
  if (plans) initPlans(plans);

  // "Use AI as a tool…" pins on a wide screen with motion allowed, and is static everywhere else.
  const compare = $('[data-pin="compare"]');
  const form = () => {
    if (compare) setPinned(compare, canPin());
  };
  form();

  const motion = () => !reducedMotion();
  const hero = $('[data-scroll="exit"]');
  const library = $('[data-scroll="through"]');
  initScroll(
    [
      ...(hero ? [{ el: hero, mode: 'exit' as const, enabled: motion }] : []),
      ...(compare ? [{ el: compare, mode: 'pin' as const, enabled: canPin }] : []),
      ...(library ? [{ el: library, mode: 'through' as const, enabled: motion }] : []),
    ],
    form,
  );

  initReveal(document);
  initCountUp(document);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
