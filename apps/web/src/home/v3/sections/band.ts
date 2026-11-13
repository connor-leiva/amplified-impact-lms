// S6, "Off your plate" (`section.band`, forest in both themes): one skill per job; add a few and get
// your week back (brief § 4, S6; § 5).
//
// THE LIST IS SETTLED IN THE MARKUP (`is-in`): every job struck, its tick on, its skill's name showing,
// which is what a phone, reduced motion or no script shows (brief § 5: "all struck"). On a wide screen
// with motion allowed, a band that starts below the fold is reset and strikes its jobs one by one as it
// arrives (`client/proof.ts`).
//
// Each skill's name links to its page, from the Library's record (brief § 4). "Try 5 Skills Free" is a
// free button, so the proof line sits with it (rule), and that group never fades in: the mockup holds
// it back until it scrolls in (C2); here it is simply there.

import { esc } from '../../../ai101/render';
import { ripple } from '../../../kit/icons';
import { button, proofLine } from '../../../kit/parts';
import { BAND } from '../content';
import { glyph } from '../icons';
import { skillHref } from '../library';

export function band(): string {
  const b = BAND;
  const rows = b.rows
    .map(
      ([job, skill, slug], i) =>
        `<li class="band-row" style="--i:${i}"><span class="band-tick" aria-hidden="true">${glyph('check', 14)}</span><span class="band-job">${esc(
          job,
        )}</span><a class="mono band-by" href="${esc(skillHref(slug))}">${esc(skill)}</a></li>`,
    )
    .join('');
  return [
    `<section class="sec band" data-theme="forest" aria-labelledby="band-title">`,
    `<div class="band-ripple" aria-hidden="true">${ripple(980, { quiet: true })}</div>`,
    `<div class="wrap band-grid">`,
    `<div class="band-copy">`,
    `<h2 id="band-title" class="band-title">${esc(b.title)}</h2>`,
    `<p class="band-sub">${esc(b.sub)}</p>`,
    `<div class="band-cta"><div class="actions">${button(b.cta.label, b.cta.href, { size: 'lg' })}</div>${proofLine()}</div>`,
    `</div>`,
    `<div class="band-plate is-in" data-band>`,
    `<p class="mono band-plate-h">${esc(b.plate)}</p>`,
    `<ul role="list">${rows}</ul>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('');
}
