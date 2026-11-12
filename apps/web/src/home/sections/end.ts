// The close: the live homepage's last section (`HOME.end`), "Start with 5 free skills.", in the
// reference's big closing type over the quiet ripple.

import { HOME } from '../content';
import { ripple } from '../icons';
import { cta, esc } from '../parts';

export function end(): string {
  const e = HOME.end;
  return [
    `<section class="sec end" aria-labelledby="end-title">`,
    `<div class="end-ripple" aria-hidden="true">${ripple(1180, { quiet: true })}</div>`,
    `<div class="wrap"><div class="end-in rv">`,
    `<h2 id="end-title" class="start-title">${esc(e.heading)}</h2>`,
    `<p class="lead">${esc(e.body)}</p>`,
    `<div class="actions">${cta(e.primary.label, e.primary.href, { cls: 'cta-lg' })}${cta(e.secondary.label, e.secondary.href, { variant: 'link' })}</div>`,
    `</div></div>`,
    `</section>`,
  ].join('\n');
}
