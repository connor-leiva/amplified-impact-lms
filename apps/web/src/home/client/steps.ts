// "How every skill works": which of Run, Draft and Own is showing, and the draft email typing itself.
//
// Pinned (a wide screen, motion allowed), the section's scroll progress picks the step: the first third
// is Run, the second Draft (the email types as you go), the last Own; `--q` is the progress within the
// step, which brings each row of the picture in. Tapping a step scrolls to it. Static (everywhere else),
// a tap simply shows that step's picture, and the email is written out in full.

import { canPin, reducedMotion, unit } from './motion';

export interface Steps {
  /** The section's scroll progress, while pinned. */
  onProgress: (p: number) => void;
  /** After the section changes form. */
  reset: () => void;
}

export function initSteps(section: HTMLElement): Steps {
  const buttons = [...section.querySelectorAll<HTMLButtonElement>('.dcs-step')];
  const panels = [...section.querySelectorAll<HTMLElement>('.panel')];
  const typed = section.querySelector<HTMLElement>('[data-type]');
  const body = typed?.textContent ?? '';
  let active = 0;
  let shown = body.length;

  const type = (n: number) => {
    if (!typed || n === shown) return;
    shown = n;
    typed.textContent = body.slice(0, n);
  };

  const show = (i: number) => {
    active = i;
    buttons.forEach((b, j) => {
      b.classList.toggle('is-active', j === i);
      b.classList.toggle('is-done', j < i);
      if (j === i) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    panels.forEach((p, j) => p.classList.toggle('is-on', j === i));
  };

  const onProgress = (p: number) => {
    const step = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
    if (step !== active) show(step);
    const q = unit(p * 3 - step);
    section.style.setProperty('--q', q.toFixed(4));
    type(step === 0 ? 0 : step === 2 ? body.length : Math.round(unit(q * 1.35) * body.length));
  };

  buttons.forEach((b, i) =>
    b.addEventListener('click', () => {
      if (!canPin()) {
        show(i);
        return;
      }
      // Scroll to the middle of that step's third of the section.
      const top = window.scrollY + section.getBoundingClientRect().top;
      const travel = section.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + travel * ((i + 0.6) / 3), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }),
  );

  const reset = () => {
    if (!canPin()) {
      section.style.removeProperty('--q');
      type(body.length);
    }
  };
  reset();
  return { onProgress, reset };
}
