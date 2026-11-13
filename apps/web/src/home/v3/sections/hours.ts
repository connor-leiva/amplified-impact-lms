// S9, the hours calculator (`section.hrs`): "How many hours could AI give you back?" (brief § 4, S9).
//
// Seven sliders (0 to 20 hours a week) and what an hour is worth (up to $100,000). The results are
// printed for the defaults (`hoursMath`), so the page reads right with no script; the script recounts
// as you slide or type and says the result to a screen reader. The words it writes travel in the
// markup as templates (`data-per-week`, `data-said`).
//
// "Start Getting Them Back, Free" is a free button: the proof line sits beside it (rule), and the
// panel that holds them never fades in. The results panel is forest, as in the mockup.

import { esc } from '../../../ai101/render';
import { button, proofLine } from '../../../kit/parts';
import { hoursMath } from '../client/hours';
import { HOURS } from '../content';
import { ringDot } from '../icons';

export function hours(): string {
  const h = HOURS;
  const r = hoursMath(
    h.rows.map(([, , n]) => n),
    h.rate,
  );
  const rows = h.rows
    .map(
      ([key, label, n]) =>
        `<div class="hrs-row"><label for="hrs-${key}" class="hrs-label">${esc(label)}</label><span class="mono hrs-val tnum" data-v3-hrs-val>${esc(
          h.perWeek(n),
        )}</span><input id="hrs-${key}" class="range" type="range" min="0" max="${h.max}" step="1" value="${n}" aria-valuetext="${esc(
          h.perWeekSaid(n),
        )}" style="--fill:${(n / h.max) * 100}%"></div>`,
    )
    .join('');
  const cells = r.cells.map((f) => `<i style="--f:${+f.toFixed(3)}"></i>`).join('');
  const said = h.said('{week}', '{year}', '{dollars}');
  return [
    `<section class="sec hrs" aria-labelledby="hrs-title" data-v3-hours data-per-week="${esc(h.perWeek('{n}'))}" data-per-week-said="${esc(h.perWeekSaid('{n}'))}">`,
    `<div class="wrap">`,
    `<div class="hrs-head"><div class="rv hrs-copy"><p class="eb eb-mark">${ringDot(22)}<span>${esc(h.eyebrow)}</span></p><h2 id="hrs-title" class="h-section">${esc(
      h.title,
    )}</h2></div><p class="rv intro">${esc(h.intro)}</p></div>`,
    `<div class="hrs-grid">`,
    `<div class="hrs-in">${rows}<div class="hrs-rate"><label for="hrs-rate" class="hrs-label">${esc(
      h.rateLabel,
    )}</label><span class="hrs-money"><span aria-hidden="true">$</span><input id="hrs-rate" type="text" inputmode="decimal" autocomplete="off" aria-describedby="hrs-rate-k" value="${
      h.rate
    }" data-v3-rate data-max="${h.rateMax}"><span id="hrs-rate-k" class="mono">${esc(h.rateUnit)}</span></span></div></div>`,
    `<div class="hrs-out" data-theme="forest">`,
    `<p class="mono hrs-out-k">${esc(h.out)}</p>`,
    `<p class="hrs-big"><span class="hrs-big-n tnum" data-v3-out="week">${r.week}</span><span class="hrs-big-k">${esc(h.bigK)}</span></p>`,
    `<dl class="hrs-dl"><div><dt>${esc(h.year)}</dt><dd class="tnum" data-v3-out="year">${r.year}</dd></div><div><dt>${esc(
      h.weeks,
    )}</dt><dd class="tnum" data-v3-out="weeks">${r.weeks}</dd></div><div><dt>${esc(h.dollars)}</dt><dd class="tnum" data-v3-out="dollars">${r.dollars}</dd></div></dl>`,
    `<div class="hrs-year"><span class="hrs-cells" role="img" aria-label="${esc(h.cellsSaid(r.weeks))}" data-v3-cells data-said="${esc(
      h.cellsSaid('{weeks}'),
    )}">${cells}</span><span class="mono hrs-year-k">${esc(h.yearK)}</span></div>`,
    `<p class="sr-only" aria-live="polite" data-v3-said data-said="${esc(said)}">${esc(h.said(r.week, r.year, r.dollars))}</p>`,
    `<div class="hrs-cta cta-group"><div class="actions">${button(h.cta.label, h.cta.href, { size: 'lg' })}</div>${proofLine()}</div>`,
    `<p class="hrs-note">${esc(h.note)}</p>`,
    `</div>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('');
}
