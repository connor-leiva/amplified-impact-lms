// AI 101, free: the guide's two parts, and the way in.

import { PAGE } from '../content';
import { ripple } from '../icons';
import { cta, esc, eyebrow } from '../parts';

export function start(): string {
  const s = PAGE.start;
  const parts = s.parts
    .map(
      (p) =>
        `<li class="part"><span class="mono part-idx">${esc(p.index)}</span><span class="part-title">${esc(p.title)}</span><span class="part-text">${esc(p.text)}</span></li>`,
    )
    .join('');
  return [
    `<section class="sec start" aria-labelledby="start-title">`,
    `<div class="start-ripple" aria-hidden="true">${ripple(1180, { quiet: true })}</div>`,
    `<div class="wrap start-grid">`,
    `<div class="start-copy rv">`,
    eyebrow(s.eyebrow),
    `<h2 id="start-title" class="start-title">${esc(s.heading)}</h2>`,
    `<p class="lead">${esc(s.lead)}</p>`,
    `<div class="actions">${cta(s.primary.label, s.primary.href, { cls: 'cta-lg' })}${cta(s.secondary.label, s.secondary.href, { variant: 'link' })}</div>`,
    `</div>`,
    `<ol class="parts rv" style="--d:140ms" role="list">${parts}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
