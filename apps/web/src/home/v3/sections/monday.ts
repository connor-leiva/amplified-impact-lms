// S4, "Picture your Monday." (`section.mon`): the same Monday morning without skills and with them, for a
// team owner and for an agent (brief § 4, S4; § 5).
//
// ONE MARKUP, TWO LAYOUTS (the mockup's `is-pinned` / `is-static`). The markup is the static layout,
// settled on "With Skills" (`--m: 1`): what a phone, reduced motion or no script shows. On a wide
// screen with motion allowed the script (`client/pinned.ts`) makes it `is-pinned`: 280vh tall, the
// stage sticky, the morning handing itself off as you scroll (`--p`, `--m`), "Without" and "With"
// flipping at halfway, and the toggle jumping to either. Static, the toggle switches it in place.
//
// The timelines are a picture of the same words (`aria-hidden`); the two paragraphs under each say it.
// The band the mockup draws light is `.inverse`, so it swaps with the page's theme (Connor's D8).

import { esc } from '../../../ai101/render';
import { MONDAY, type MondayColumn } from '../content';
import { glyph, ringDot } from '../icons';

function column(c: MondayColumn): string {
  const m = MONDAY;
  const hours = m.hours.map((h, i) => `<span class="mon-hr" style="--h:${i}"><span class="mono">${esc(h)}</span></span>`).join('');
  const tasks = c.tasks
    .map(
      (t, k) =>
        `<div class="mon-b" style="--s:${t.start};--d:${t.hours};--k:${k}"><span class="mon-b-busy"><span class="mono mon-b-t">${esc(
          t.time,
        )}</span><span class="mon-b-l">${esc(t.label)}</span><span class="mon-b-s">${esc(t.sub)}</span></span><span class="mon-b-done"><span class="mon-b-ok">${glyph(
          'check',
          12,
        )}</span><span>${esc(t.done)}</span></span></div>`,
    )
    .join('');
  return [
    `<div class="mon-col">`,
    `<div class="mon-col-head"><p class="mono mon-who">${esc(c.who)}</p><p class="mono mon-lane-k" aria-hidden="true">${esc(m.lane)}</p></div>`,
    `<div class="mon-stage" aria-hidden="true">`,
    `<div class="mon-lane"><span class="mon-slot"></span><span class="mon-slot"></span><span class="mon-slot"></span></div>`,
    `<div class="mon-grid">${hours}</div>`,
    `<div class="mon-open"><span class="mon-open-top">${ringDot(14)}<span class="mono">${esc(m.allYours)}</span></span><span class="mon-open-l">${esc(
      c.open,
    )}</span><span class="mon-open-s">${esc(c.openLine)}</span></div>`,
    tasks,
    `</div>`,
    `<div class="mon-say"><p class="mon-p" data-side="without"><span class="mono mon-p-k">${esc(m.withoutK)}</span> ${esc(
      c.without,
    )}</p><p class="mon-p is-on" data-side="with"><span class="mono mon-p-k">${esc(m.withK)}</span> ${esc(c.withSkills)}</p></div>`,
    `</div>`,
  ].join('');
}

export function monday(): string {
  const m = MONDAY;
  return [
    `<section class="sec mon is-static inverse" aria-labelledby="mon-title" style="--m:1" data-pin="mon">`,
    `<div class="mon-stick"><div class="wrap mon-in">`,
    `<div class="mon-head"><div class="mon-title"><p class="eb eb-mark">${ringDot(22)}<span>${esc(m.eyebrow)}</span></p><h2 id="mon-title" class="h-section">${esc(
      m.title,
    )}</h2></div>`,
    `<div class="mon-toggle"><div class="seg-toggle" role="group" aria-label="${esc(m.toggleLabel)}"><button type="button" aria-pressed="false" data-side="without">${esc(
      m.without,
    )}</button><button type="button" aria-pressed="true" data-side="with">${esc(m.withSkills)}</button></div><p class="mono mon-hint">${esc(m.hint)}</p></div>`,
    `</div>`,
    `<div class="mon-cols">${(m.columns as readonly MondayColumn[]).map(column).join('')}</div>`,
    `</div></div>`,
    `</section>`,
  ].join('');
}
