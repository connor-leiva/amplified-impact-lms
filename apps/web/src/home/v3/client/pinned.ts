// S4 (Monday) and S5 (How it works): their two layouts (brief § 5).
//
// PINNED on a wide screen (981px and up, the mockup's breakpoint) with motion allowed: the section is
// tall (CSS), its stage sticky, and its state follows how far you've scrolled through it.
// STATIC everywhere else, and when either condition changes: normal height, the settled state, and the
// controls switch the scene in place. The markup is already the static layout, so with no script, a
// narrow screen or reduced motion nothing here changes how the page reads. Nothing here ever holds the
// page: the scroll is the page's own, and every control is an ordinary button.

import { reducedMotion } from './kit';

const WIDE = '(min-width: 981px)';

/** Whether a scene may pin right now: a wide screen, with motion allowed. */
export const pinnable = (): boolean =>
  typeof window.matchMedia === 'function' && window.matchMedia(WIDE).matches && !reducedMotion();

/** How far through its pinned run a section is, 0 at its top to 1 where its stage lets go. */
export function progressOf(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  const run = r.height - window.innerHeight;
  return run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
}

/** S4: how far the morning has handed itself off (`--m`), from 20% to 80% of the run. */
export const mondayHandOff = (p: number): number => Math.min(1, Math.max(0, (p - 0.2) / 0.6));

/** S5: the step a point of the run is in (a third each), and how far that step has played (`--q`). */
export function howStep(p: number): { step: number; q: number } {
  const x = Math.min(2.9999, Math.max(0, p * 3));
  const step = Math.floor(x);
  return { step, q: Math.min(1, (x - step) / 0.8) };
}

/** The window's scroll position that puts a section's run at `p`. */
function scrollFor(el: HTMLElement, p: number): number {
  const r = el.getBoundingClientRect();
  return window.scrollY + r.top + Math.max(0, r.height - window.innerHeight) * p;
}

/** Runs `layout` now and whenever the screen's width or the motion setting changes; `update` once a frame on scroll. */
export function watch(layout: () => void, update: () => void): void {
  let frame = 0;
  const later = () => {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
  };
  window.addEventListener('scroll', later, { passive: true });
  window.addEventListener('resize', later);
  if (typeof window.matchMedia === 'function') {
    for (const q of [WIDE, '(prefers-reduced-motion: reduce)']) {
      const list = window.matchMedia(q);
      if (typeof list.addEventListener === 'function') list.addEventListener('change', layout);
    }
  }
  layout();
}

const jump = (top: number) => window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });

/** S4: "Without Skills" / "With Skills", by scroll when pinned (flipping at halfway), by the toggle when static. */
export function initMonday(sec: HTMLElement): void {
  const buttons = [...sec.querySelectorAll<HTMLButtonElement>('.seg-toggle button')];
  const sides = [...sec.querySelectorAll<HTMLElement>('.mon-p')];
  let pinned = false;
  const side = (withSkills: boolean) => {
    for (const b of buttons) b.setAttribute('aria-pressed', String((b.dataset.side === 'with') === withSkills));
    for (const s of sides) s.classList.toggle('is-on', (s.dataset.side === 'with') === withSkills);
  };
  const update = () => {
    if (!pinned) return;
    const p = progressOf(sec);
    const m = mondayHandOff(p);
    sec.style.setProperty('--p', p.toFixed(4));
    sec.style.setProperty('--m', m.toFixed(4));
    side(m >= 0.5);
  };
  const layout = () => {
    pinned = pinnable();
    sec.classList.toggle('is-pinned', pinned);
    sec.classList.toggle('is-static', !pinned);
    if (pinned) return update();
    // Static keeps whichever side is pressed, settled.
    sec.style.removeProperty('--p');
    const withSkills = buttons.find((b) => b.dataset.side === 'with')?.getAttribute('aria-pressed') !== 'false';
    sec.style.setProperty('--m', withSkills ? '1' : '0');
    side(withSkills);
  };
  for (const b of buttons) {
    b.addEventListener('click', () => {
      const withSkills = b.dataset.side === 'with';
      if (pinned) return jump(scrollFor(sec, withSkills ? 0.9 : 0));
      sec.style.setProperty('--m', withSkills ? '1' : '0');
      side(withSkills);
    });
  }
  watch(layout, update);
}

/** S5: the three steps, a third of the scroll each when pinned (the email typing itself), by the steps when static. */
export function initHow(sec: HTMLElement): void {
  const steps = [...sec.querySelectorAll<HTMLButtonElement>('.how-step')];
  const panels = [...sec.querySelectorAll<HTMLElement>('.how-panel')];
  const typed = sec.querySelector<HTMLElement>('[data-type]');
  const email = typed?.textContent ?? '';
  let pinned = false;
  const show = (i: number) => {
    steps.forEach((s, k) => {
      s.classList.toggle('is-active', k === i);
      if (k === i) s.setAttribute('aria-current', 'step');
      else s.removeAttribute('aria-current');
    });
    panels.forEach((p, k) => p.classList.toggle('is-on', k === i));
  };
  const current = () => Math.max(0, steps.findIndex((s) => s.classList.contains('is-active')));
  const update = () => {
    if (!pinned) return;
    const p = progressOf(sec);
    const { step, q } = howStep(p);
    sec.style.setProperty('--p', p.toFixed(4));
    sec.style.setProperty('--q', q.toFixed(4));
    show(step);
    // The email types itself through step three's first 70%, then the yes lands.
    if (typed) typed.textContent = step < 2 ? '' : email.slice(0, Math.round(email.length * Math.min(1, q / 0.7)));
  };
  const layout = () => {
    pinned = pinnable();
    sec.classList.toggle('is-pinned', pinned);
    sec.classList.toggle('is-static', !pinned);
    if (pinned) return update();
    sec.style.removeProperty('--p');
    sec.style.removeProperty('--q');
    if (typed) typed.textContent = email;
    show(current());
  };
  steps.forEach((s, i) => {
    s.addEventListener('click', () => {
      if (pinned) return jump(scrollFor(sec, (i + 0.9) / 3));
      show(i);
    });
  });
  watch(layout, update);
}

/** S3: the chat plays its two beats once as it arrives (your message, then the reply), with motion allowed. */
export function initChat(root: HTMLElement): void {
  const thread = root.querySelector<HTMLElement>('.cvs-thread');
  if (!thread || reducedMotion() || !('IntersectionObserver' in window)) return;
  if (root.getBoundingClientRect().top < window.innerHeight) return;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      thread.dataset.beat = '1';
      window.setTimeout(() => (thread.dataset.beat = '2'), 900);
    },
    { threshold: 0.4 },
  );
  io.observe(root);
}
