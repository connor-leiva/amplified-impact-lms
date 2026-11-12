// S5, "How it works" (`section.how`, following the page's theme): give it the work, it does the job, you
// say yes (brief § 4, S5; § 5).
//
// ONE MARKUP, TWO LAYOUTS (the mockup's `is-pinned` / `is-static`). The markup is the static layout:
// step one active, every reveal settled (`--q: 1`), the email typed in full. On a wide screen with motion
// allowed the script (`client/pinned.ts`) makes it `is-pinned`: 340vh tall, the stage sticky, a step per
// third of the scroll, each panel's parts arriving as you go (`--q`), the email typing itself in step
// three, "Not sent" turning to "Approved by you". Static, the steps switch the panel in place. With no
// script at all, every panel shows, one under another.
//
// ILLUSTRATIONS: every panel has made-up names (Pretend Poppy, Maple Court, Jess), so every panel shows a
// "Made-up example" tag: the mockup's own on the first, the kit's on the other two (brief § 6.3).
// The email's words are in the markup once for screen readers; the typed copy is only for the eye.

import { esc } from '../../../ai101/render';
import { exTag, pad2 } from '../../../kit/parts';
import { HOW } from '../content';
import { ringDot } from '../icons';

/** A part that arrives as its panel plays (`--q` past `o`, the mockup's offsets), with its own class. */
const q = (cls: string, o: number) => `class="${cls} q" style="--o:${o}"`;

function steps(): string {
  return `<ol class="how-steps">${HOW.steps
    .map(
      (s, i) =>
        `<li><button type="button" class="how-step${i === 0 ? ' is-active' : ''}" data-step="${i}"${i === 0 ? ' aria-current="step"' : ''}><span class="mono how-n">${pad2(
          i + 1,
        )}</span><span class="how-txt"><span class="how-name">${esc(s.name)}</span><span class="how-text">${esc(s.text)}</span></span></button></li>`,
    )
    .join('')}</ol>`;
}

function setup(): string {
  const s = HOW.setup;
  const LINES = [
    [0.3, '0s'],
    [0.38, '0.35s'],
    [0.46, '0.7s'],
  ] as const;
  const inputs = s.inputs
    .map(
      ([k, v], i) =>
        `<li class="how-in q" style="--o:${i * 0.12}"><span class="how-in-k">${esc(k)}</span><span class="mono how-in-v">${esc(
          v,
        )}</span><span class="how-line" aria-hidden="true" style="--o:${LINES[i]![0]};--fd:${LINES[i]![1]}"><i></i></span></li>`,
    )
    .join('');
  return [
    `<div class="how-panel is-on" data-panel="0">`,
    `<div class="how-bar"><span class="mono how-tag">${esc(s.tag)}</span><span class="mono ex-tag">${esc(s.example)}</span></div>`,
    `<div class="how-wire"><ul class="how-ins" role="list">${inputs}</ul><span class="how-bus" aria-hidden="true"><i></i></span>`,
    `<div ${q('how-core', 0.6)}><span class="how-core-mark">${ringDot(22)}</span><span class="how-core-name">${esc(
      s.core,
    )}</span><span class="mono how-core-k">${esc(s.coreK)}</span></div></div>`,
    `<p ${q('how-note', 0.75)}>${esc(s.note)}</p>`,
    `</div>`,
  ].join('');
}

function brief(): string {
  const b = HOW.brief;
  const needs = b.needsList
    .map((t, i) => `<li ${q('brief-li', [0.08, 0.15, 0.22][i]!)}><span class="brief-box" aria-hidden="true"></span>${esc(t)}</li>`)
    .join('');
  const stuck = b.stuckList
    .map(
      ([name, why], i) =>
        `<li ${q('brief-li', [0.4, 0.47][i]!)}><span class="brief-flag" aria-hidden="true"></span><strong>${esc(
          name,
        )}</strong><span class="brief-why">${esc(why)}</span></li>`,
    )
    .join('');
  return [
    `<div class="how-panel" data-panel="1">`,
    `<div class="how-bar"><span class="mono how-tag">${esc(b.tag)}</span><span class="mono how-meta">${esc(b.meta)}</span>${exTag()}</div>`,
    `<div class="brief">`,
    `<div class="brief-sec"><p ${q('brief-h', 0)}><span>${esc(b.needs)}</span><span class="mono brief-n">${
      b.needsList.length
    }</span></p><ul role="list">${needs}</ul></div>`,
    `<div class="brief-sec"><p ${q('brief-h', 0.32)}><span>${esc(b.stuck)}</span><span class="mono brief-n">${
      b.stuckList.length
    }</span></p><ul role="list">${stuck}</ul></div>`,
    `<div ${q('brief-row', 0.58)}><span>${esc(b.owners)}</span><span class="brief-meter" aria-hidden="true"><i></i></span><span class="mono tnum brief-of">${esc(
      b.ownersOf,
    )}</span></div>`,
    `<div ${q('brief-row', 0.7)}><span>${esc(b.replies)}</span><span class="mono brief-chip">${esc(b.repliesChip)}</span></div>`,
    `</div>`,
    `</div>`,
  ].join('');
}

function yes(): string {
  const y = HOW.yes;
  return [
    `<div class="how-panel" data-panel="2">`,
    `<div class="how-bar"><span class="mono how-tag">${esc(y.tag)}</span><span class="mono how-state"><span class="how-state-a">${esc(
      y.notSent,
    )}</span><span class="how-state-b">${esc(y.approved)}</span></span>${exTag()}</div>`,
    `<div class="mail"><div class="mail-row"><span class="mono">${esc(y.to)}</span><span>${esc(y.toWho)}</span></div><div class="mail-row"><span class="mono">${esc(
      y.subject,
    )}</span><span>${esc(y.subjectLine)}</span></div>`,
    `<p class="mail-body"><span class="sr-only">${esc(y.body)}</span><span class="mail-typed" aria-hidden="true" data-type>${esc(
      y.body,
    )}</span><span class="caret" aria-hidden="true"></span></p></div>`,
    `<div class="how-send"><span class="send" aria-hidden="true"><span class="send-a">${esc(y.send)}</span><span class="send-b">${esc(
      y.send,
    )}</span></span><span class="mono how-send-k">${esc(y.sendK)}</span></div>`,
    `<div class="how-own"><p class="mono how-own-h">${esc(y.owns)}</p><ul role="list">${y.ownsList
      .map((o) => `<li>${ringDot(14)}${esc(o)}</li>`)
      .join('')}</ul></div>`,
    `</div>`,
  ].join('');
}

export function howItWorks(): string {
  const h = HOW;
  return [
    `<section class="sec how is-static" aria-labelledby="how-title" data-pin="how">`,
    `<div class="how-stick"><div class="wrap how-grid">`,
    `<div class="how-copy"><p class="eb eb-mark">${ringDot(22)}<span>${esc(h.eyebrow)}</span></p><h2 id="how-title" class="h-section">${esc(
      h.title,
    )}</h2>${steps()}</div>`,
    `<div class="how-stage"><div class="how-progress" aria-hidden="true">${[0, 1, 2]
      .map((i) => `<span class="how-seg" style="--i:${i}"><span></span></span>`)
      .join('')}</div><div class="how-panels">${setup()}${brief()}${yes()}</div></div>`,
    `</div></div>`,
    `</section>`,
  ].join('');
}
