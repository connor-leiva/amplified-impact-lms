// S7, the proof (`section.prf`, #proof): "We didn’t read about this. We run on it." Three tiles and The
// Utah Life Real Estate Group's org chart, with a People / People and AI toggle (brief § 4, S7; § 5).
//
// WHAT IS SETTLED IN THE MARKUP: the tiles drawn (`is-in`) and their figures final (38 and 95 count up
// only when they arrive from below the fold); the chart drawn (`is-in`) on "People and AI" (`is-ai`),
// every skill showing. That is what a phone, reduced motion or no script shows. On a wide screen with
// motion allowed, a chart that starts below the fold draws itself as it arrives, and the toggle plugs
// the skills in and out with the counter following (`client/proof.ts`); elsewhere it swaps at once.
//
// WORDS AND FIGURES. The 38% and 95% are cleared (Connor's D3). The intro's first sentence, "This is the
// real EOS chart…", is Spring's, approved (C8, D2: cleared 4:41 PM MT Nov 12). The chart's counts are worked out from the chart (`chartCounts`): 12 seats (D4), 29 skills. Every skill
// with a Library page links to it (from the Library's record); the three built for our team don't, and
// say so to a screen reader in the legend's words.
//
// The light band the mockup draws is `.inverse`, so it swaps with the page's theme (D8).

import { esc } from '../../../ai101/render';
import { chartCounts, PROOF, type ChartNode } from '../content';
import { ringDot } from '../icons';
import { skillHref } from '../library';

function tiles(): string {
  const { production: p, finance: f, daily: d } = PROOF.stats;
  // The bars are this year against last year's, at 38% more: last year is 1 / 1.38 of this one.
  const last = (1 / (1 + p.figure / 100)).toFixed(3);
  // Twenty cells, a twentieth each: the human share is the 5% the label names.
  const cells = Array.from({ length: 20 }, (_, k) => `<i${k >= 20 - Math.round((20 * (100 - f.figure)) / 100) ? ' class="is-human"' : ''} style="--k:${k}"></i>`).join('');
  const days = d.days.map((day, k) => `<span class="pst-day" style="--k:${k}"><i></i><span class="mono">${esc(day)}</span></span>`).join('');
  return [
    `<ul class="pst is-in" role="list" data-pst>`,
    `<li class="pst-item"><span class="pst-num"><span class="tnum" data-v3-count="${p.figure}">${p.figure}</span>%</span><span class="pst-label">${esc(
      p.label,
    )}</span><span class="pst-viz pst-bars" aria-hidden="true"><span class="pst-bar" style="--w:${last};--b:0"><span class="mono">${esc(
      p.lastYear,
    )}</span><i></i></span><span class="pst-bar is-now" style="--w:1;--b:1"><span class="mono">${esc(p.thisYear)}</span><i></i></span></span></li>`,
    `<li class="pst-item"><span class="pst-num"><span class="tnum" data-v3-count="${f.figure}">${f.figure}</span>%</span><span class="pst-label">${esc(
      f.label,
    )}</span><span class="pst-viz pst-split" aria-hidden="true"><span class="pst-cells">${cells}</span><span class="pst-split-k"><span class="mono">${esc(
      f.ai,
    )}</span><span class="mono">${esc(f.human)}</span></span></span></li>`,
    `<li class="pst-item"><span class="pst-num">${esc(d.figure)}</span><span class="pst-label">${esc(d.label)}</span><span class="pst-viz pst-days" aria-hidden="true">${days}</span></li>`,
    `</ul>`,
  ].join('');
}

function node(n: ChartNode, row: number, at: { ci: number }, top = false): string {
  const chips = n.skills
    .map((s) => {
      const i = at.ci++;
      const inside = `${ringDot(14)}<span>${esc(s.name)}</span>`;
      return s.slug
        ? `<li><a class="oc-chip" href="${esc(skillHref(s.slug))}" style="--ci:${i}">${inside}</a></li>`
        : `<li><span class="oc-chip is-own" style="--ci:${i}">${inside}<span class="sr-only">, ${esc(PROOF.legend.own)}</span></span></li>`;
    })
    .join('');
  const ai = n.skills.length
    ? `<div class="oc-ai"><div class="oc-ai-in">${n.aiLabel ? `<p class="mono oc-ai-k">${esc(n.aiLabel)}</p>` : ''}<ul class="oc-chips" role="list">${chips}</ul></div></div>`
    : '';
  return `<div class="oc-node${top ? ' oc-node-top' : ''}" style="--row:${row}"><div class="oc-card"><span class="mono oc-kicker"><span class="oc-person" aria-hidden="true"></span>${esc(
    n.kicker,
  )}</span><span class="oc-name">${esc(n.name)}</span></div>${ai}</div>`;
}

function chart(): string {
  const c = PROOF;
  const counts = chartCounts();
  const at = { ci: 0 };
  const top = (c.chart.top as readonly ChartNode[])
    .map((n, i) => `${node(n, i, at, true)}<span class="oc-v" aria-hidden="true" style="--row:${i + 0.5}"></span>`)
    .join('');
  const seats = c.chart.seats
    .map(
      (s) =>
        `<li class="oc-col">${node(s.seat as ChartNode, 2, at)}<ul class="oc-people" role="list">${(s.people as readonly ChartNode[])
          .map((p, i) => `<li class="oc-pl" style="--row:${3 + i}">${node(p, 3 + i, at)}</li>`)
          .join('')}</ul></li>`,
    )
    .join('');
  return [
    `<div class="oc is-in is-ai" data-oc>`,
    `<div class="oc-bar">`,
    `<div class="seg-toggle" role="group" aria-label="${esc(c.toggleLabel)}"><button type="button" aria-pressed="false" data-oc-mode="people">${esc(
      c.people,
    )}</button><button type="button" aria-pressed="true" data-oc-mode="ai">${esc(c.peopleAndAi)}</button></div>`,
    `<p class="oc-count"><span class="oc-count-i"><strong class="tnum">${counts.seats}</strong><span>${esc(c.seats)}</span></span><span class="oc-count-i is-skills"><strong class="tnum" data-oc-skills="${
      counts.skills
    }">${counts.skills}</strong><span>${esc(c.skills)}</span></span></p>`,
    `<ul class="oc-legend" role="list" aria-label="${esc(c.legendLabel)}"><li><span class="oc-person" aria-hidden="true"></span>${esc(
      c.legend.person,
    )}</li><li>${ringDot(14)}${esc(c.legend.library)}</li><li><span class="oc-own-mark" aria-hidden="true"></span>${esc(c.legend.own)}</li></ul>`,
    `</div>`,
    `<div class="oc-tree">${top}<ul class="oc-seats" role="list">${seats}</ul></div>`,
    `</div>`,
  ].join('');
}

export function proof(): string {
  const c = PROOF;
  return [
    `<section id="proof" class="sec prf inverse" aria-labelledby="prf-title">`,
    `<div class="wrap">`,
    `<div class="prf-head">`,
    `<div class="rv prf-copy"><p class="eb eb-mark">${ringDot(22)}<span>${esc(c.eyebrow)}</span></p><h2 id="prf-title" class="h-section">${esc(
      c.title,
    )}</h2></div>`,
    `<p class="rv intro prf-intro">${esc(c.introClaim)} ${esc(c.intro)}</p>`,
    `</div>`,
    tiles(),
    chart(),
    `</div>`,
    `</section>`,
  ].join('');
}
