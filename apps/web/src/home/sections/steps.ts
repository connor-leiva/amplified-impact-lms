// "How every skill works": Run, Draft and Own, each with its picture. On the light ground.
//
// The three rows are buttons that show their picture. On a wide screen with motion allowed the script
// pins the section and scrolling walks the three (and types the draft email); everywhere else it is
// static and a tap switches the picture. The pictures are illustrations, hidden from screen readers:
// the rows' own words say what each step is.

import { PAGE } from '../content';
import { ringDot, roleIcon } from '../icons';
import { esc, eyebrow } from '../parts';

const row = (label: string, value: string, cls = '', o = 0) =>
  `<div class="calc-row q${cls ? ` ${cls}` : ''}" style="--o:${o}"><span>${esc(label)}</span><span class="tnum">${esc(value)}</span></div>`;

function runPanel(): string {
  const r = PAGE.steps.run;
  const deadlines = r.deadlines
    .map(
      (d, i) =>
        `<div class="dl-row q" style="--o:${(0.44 + i * 0.12).toFixed(2)}"><span>${esc(d.label)}</span><span class="tnum">${esc(d.value)}</span></div>`,
    )
    .join('');
  return [
    `<div class="panel is-on" data-panel="0">`,
    `<div class="panel-bar"><span class="mono panel-tag">${esc(r.tag)}</span><span class="mono panel-meta">${esc(r.meta)}</span></div>`,
    `<div class="calc">${r.rows.map((x, i) => row(x.label, x.value, '', i * 0.12)).join('')}${row(r.total.label, r.total.value, 'calc-total', 0.24)}</div>`,
    `<p class="mono panel-sub q" style="--o:0.36">${esc(r.sub)}</p>`,
    `<div class="dl">${deadlines}</div>`,
    `</div>`,
  ].join('');
}

function draftPanel(): string {
  const d = PAGE.steps.draft;
  const line = (x: { label: string; value: string }) =>
    `<div class="mail-row"><span class="mono">${esc(x.label)}</span><span>${esc(x.value)}</span></div>`;
  return [
    `<div class="panel" data-panel="1">`,
    `<div class="panel-bar"><span class="mono panel-tag">${esc(d.tag)}</span><span class="mono chip">${esc(d.chip)}</span></div>`,
    `<div class="mail">${line(d.to)}${line(d.subject)}<p class="mail-body"><span data-type>${esc(d.body)}</span><span class="caret"></span></p></div>`,
    `</div>`,
  ].join('');
}

function ownPanel(): string {
  const o = PAGE.steps.own;
  const rows = o.rows
    .map(
      (r, i) => `<li class="own-row q" style="--o:${(i * 0.12).toFixed(2)}">${ringDot(18)}<span>${esc(r)}</span></li>`,
    )
    .join('');
  return [
    `<div class="panel" data-panel="2">`,
    `<div class="panel-bar"><span class="mono panel-tag">${esc(o.tag)}</span><span class="mono panel-meta">${esc(o.meta)}</span></div>`,
    `<ul class="own" role="list">${rows}</ul>`,
    `<div class="own-foot q" style="--o:0.55"><span class="send"><span class="send-a">${esc(o.send)}</span><span class="send-b">${esc(o.send)}</span></span><span class="mono">${esc(o.note)}</span></div>`,
    `</div>`,
  ].join('');
}

export function steps(): string {
  const s = PAGE.steps;
  const items = s.items
    .map(
      (it, i) =>
        `<li><button type="button" class="dcs-step${i === 0 ? ' is-active' : ''}" data-step="${i}"${i === 0 ? ' aria-current="step"' : ''}><span class="dcs-ic">${roleIcon(
          it.icon,
          24,
        )}</span><span class="dcs-txt"><span class="dcs-name">${esc(it.label)}</span><span class="dcs-text">${esc(it.text)}</span></span></button></li>`,
    )
    .join('');
  const segs = s.items.map((it, i) => `<span class="seg" style="--i:${i}"><span></span></span>`).join('');
  return [
    `<section class="sec dcs is-static" data-theme="light" data-pin="steps" aria-labelledby="dcs-title">`,
    `<div class="dcs-stick">`,
    `<div class="wrap dcs-grid">`,
    `<div class="dcs-copy">${eyebrow(s.eyebrow, { mark: true })}<h2 id="dcs-title" class="h-section">${esc(s.heading)}</h2><ol class="dcs-steps" role="list">${items}</ol></div>`,
    `<div class="dcs-stage" aria-hidden="true"><div class="dcs-progress">${segs}</div><div class="dcs-panels">${runPanel()}${draftPanel()}${ownPanel()}</div></div>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
