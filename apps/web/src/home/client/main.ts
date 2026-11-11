// The homepage's one script (see `../render.ts`): a same-origin module file, never inlined, so the CSP's
// `script-src 'self'` admits it. It only adds to a page that already reads in full without it.

import { initOfferCard } from './offer-card';
import { canPin, reducedMotion } from './motion';
import { initPlans } from './plans';
import { initCountUp, initReveal } from './reveal';
import { initScroll, setPinned } from './scroll';
import { initSteps } from './steps';
import { initTabs } from './tabs';
import { initTeamCalc } from './team';

function init(): void {
  const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector);

  const card = $('[data-offer]');
  if (card) initOfferCard(card);

  const tabs = $('[data-tabs]');
  if (tabs) initTabs(tabs);

  const plansSection = $('[data-plans]');
  const plans = plansSection ? initPlans(plansSection) : null;
  const calc = $('[data-calc]');
  if (calc) initTeamCalc(calc, (n) => plans?.setAgents(n));

  // The two pinned sections, in whichever form fits the screen now.
  const compare = $('[data-pin="compare"]');
  const stepsSection = $('[data-pin="steps"]');
  const steps = stepsSection ? initSteps(stepsSection) : null;
  const form = () => {
    for (const el of [compare, stepsSection]) if (el) setPinned(el, canPin());
    steps?.reset();
  };
  form();

  const motion = () => !reducedMotion();
  const trackers = [
    ...[$('[data-scroll="exit"]')].filter(Boolean).map((el) => ({ el: el!, mode: 'exit' as const, enabled: motion })),
    ...(compare ? [{ el: compare, mode: 'pin' as const, enabled: canPin }] : []),
    ...(stepsSection && steps
      ? [{ el: stepsSection, mode: 'pin' as const, enabled: canPin, onProgress: steps.onProgress }]
      : []),
    ...[$('[data-scroll="through"]')]
      .filter(Boolean)
      .map((el) => ({ el: el!, mode: 'through' as const, enabled: motion })),
  ];
  initScroll(trackers, form);

  initReveal(document);
  initCountUp(document);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
