/**
 * The app's clock.
 *
 * In fixture mode it runs from a pinned demo instant plus however long the page has been open, so
 * the prototype's timeline (Week 0 / Week 2 / After Cohort) behaves the same way here. Under
 * Playwright's fixed time `Date.now()` never advances, so `clock.now()` equals PHASE_NOW exactly —
 * the condition the goldens were captured in.
 *
 * In http mode it is simply the real clock.
 */
let base = 0;
let boot = 0;
let demo = false;

export const clock = {
  useReal() {
    demo = false;
  },
  useDemo(phaseNow: number) {
    demo = true;
    base = phaseNow;
    boot = Date.now();
  },
  /** Restart the demo offset, e.g. after switching timeline phase. */
  rebase(phaseNow: number) {
    if (demo) {
      base = phaseNow;
      boot = Date.now();
    }
  },
  now: () => (demo ? base + (Date.now() - boot) : Date.now()),
  get isDemo() {
    return demo;
  },
};
