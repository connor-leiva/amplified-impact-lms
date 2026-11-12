// S16, the close (`section.close`, forest in both themes): "Make your first hire today." (brief § 4,
// S16). The kit's close, as the mockup draws it, with the proof line beside "Get 5 Free Skills" (rule):
// the group with the buttons never fades in.

import { esc } from '../../../ai101/render';
import { ripple } from '../../../kit/icons';
import { button, proofLine } from '../../../kit/parts';
import { FREE_SKILLS_HREF } from '../../../site/content';
import { CLOSE } from '../content';

export function close(): string {
  const c = CLOSE;
  return [
    `<section class="sec close" data-theme="forest" aria-labelledby="close-title">`,
    `<div class="close-ripple" aria-hidden="true">${ripple(1180, { quiet: true })}</div>`,
    `<div class="wrap close-grid">`,
    `<div class="close-copy"><h2 id="close-title" class="close-title">${esc(c.title)}</h2><p class="lead">${esc(c.lead)}</p>`,
    `<div class="close-cta cta-group"><div class="actions">${button(c.free, FREE_SKILLS_HREF, { size: 'lg' })}${button(c.programs.label, c.programs.href, {
      variant: 'link',
    })}</div>${proofLine()}</div>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('');
}
