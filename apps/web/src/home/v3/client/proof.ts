// S6 to S8's motion (brief § 5). Every one of them is settled in the markup, and stays so on a phone,
// under reduced motion or with no script: S6's jobs all struck, S7's tiles and chart drawn on "People
// and AI", S8's words all lit. On a wide screen with motion allowed (`pinnable()`):
//   - S6, S7's tiles and S7's chart, when they start below the fold, are reset and play as they
//     arrive (the stylesheet's own delays: strike by strike, bar by bar, box by box);
//   - S7's toggle plugs the skills in (counting up to the chart's total) and out; elsewhere it swaps
//     at once. Either way the skills it hides are out of reach (`inert`), so a hidden link takes no Tab;
//   - S8's words light up one by one as the section scrolls through (`--p`).
// The toggle works everywhere; it is the one control here.

import { COUNT_MS } from './count';
import { pinnable, watch } from './pinned';

/** Calls `go` once, when `el` is `threshold` of the way into view. */
function onArrival(el: Element, go: () => void, threshold: number): void {
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      go();
    },
    { threshold },
  );
  io.observe(el);
}

/** Whether `el` plays its arrival: a wide screen, motion allowed, and `el` still below the fold. */
const plays = (el: Element): boolean =>
  pinnable() && 'IntersectionObserver' in window && el.getBoundingClientRect().top >= window.innerHeight;

/** S6's plate and S7's tiles: reset, then drawn (`is-in`) as they arrive. */
export function initArrival(el: HTMLElement, threshold = 0.35): void {
  if (!plays(el)) return;
  el.classList.remove('is-in');
  onArrival(el, () => el.classList.add('is-in'), threshold);
}

/** S7's org chart: its arrival, and the People / People and AI toggle with the skill counter. */
export function initOrgChart(oc: HTMLElement): void {
  const buttons = [...oc.querySelectorAll<HTMLButtonElement>('[data-oc-mode]')];
  const counter = oc.querySelector<HTMLElement>('[data-oc-skills]');
  const total = Number(counter?.dataset.ocSkills ?? 0);
  const groups = [...oc.querySelectorAll<HTMLElement>('.oc-ai')];
  let frame = 0;
  const count = (animate: boolean) => {
    if (!counter) return;
    cancelAnimationFrame(frame);
    if (!animate) {
      counter.textContent = String(total);
      return;
    }
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const k = Math.min(1, (t - start) / COUNT_MS);
      counter.textContent = String(k < 1 ? Math.round(total * (1 - Math.pow(1 - k, 3))) : total);
      if (k < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };
  const show = (ai: boolean) => {
    const animate = ai && pinnable();
    oc.classList.toggle('is-ai', ai);
    oc.classList.toggle('is-plugging', animate);
    for (const b of buttons) b.setAttribute('aria-pressed', String((b.dataset.ocMode === 'ai') === ai));
    for (const g of groups) {
      g.inert = !ai;
      if (ai) g.removeAttribute('aria-hidden');
      else g.setAttribute('aria-hidden', 'true');
    }
    if (ai) count(animate);
    else if (counter) {
      cancelAnimationFrame(frame);
      counter.textContent = '0';
    }
  };
  for (const b of buttons) b.addEventListener('click', () => show(b.dataset.ocMode === 'ai'));
  if (!plays(oc)) return;
  oc.classList.remove('is-in');
  onArrival(
    oc,
    () => {
      oc.classList.add('is-in', 'is-plugging');
    },
    0.15,
  );
}

/** How far `el` has scrolled through the screen: 0 as its top comes up from below, 1 as its bottom leaves the top. */
export function passOf(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  return Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
}

/** S8: the words light up as the section scrolls through, on a wide screen with motion allowed; all lit otherwise. */
export function initQuote(sec: HTMLElement): void {
  let live = false;
  watch(
    () => {
      live = pinnable();
      if (live) sec.style.setProperty('--p', passOf(sec).toFixed(4));
      else sec.style.removeProperty('--p');
    },
    () => {
      if (live) sec.style.setProperty('--p', passOf(sec).toFixed(4));
    },
  );
}
