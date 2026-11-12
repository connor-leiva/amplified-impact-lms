// "The AI drafts. You check, then send.": the live homepage's Run, Draft and Own, beside Offer
// Strategy's made-up offer plan, drawn as the reference's tap-to-check card. On the bone ground.
//
// Every word is `HOME.trust`'s and `HOME.sheet`'s. The card's terms are real checkboxes, ticked as the
// live sheet ticks them (the AI's four, not the settlement date); tapping one ticks it, with or without
// the script. The script only adds the drafting intro and the progress bar, and says nothing.

import { HOME } from '../content';
import { glyph, roleIcon, type RoleIconName } from '../icons';
import { esc } from '../parts';

/** Run, Draft and Own's drawings, in the live order. */
const STEP_ICONS: readonly RoleIconName[] = ['analytics', 'ai-employee', 'checklist'];

/** The sheet's recommendation with its first price set in bold, as the reference draws it. Words unchanged. */
const recommendation = (text: string) => esc(text).replace(/\$[\d,]+/, (m) => `<strong>${m}</strong>`);

/** "Buyer’s initials. Your buyer decides." → its label and its line, split at the first full stop. */
function initials(text: string): [string, string] {
  const i = text.indexOf('. ');
  return i < 0 ? [text, ''] : [text.slice(0, i + 1), text.slice(i + 2)];
}

export function offerCard(): string {
  const s = HOME.sheet;
  const terms = s.terms
    .map(
      (t) =>
        `<li class="term-li is-in"><label class="term"><input class="term-input" type="checkbox"${t.done ? ' checked' : ''} /><span class="term-label">${esc(
          t.term,
        )}</span><span class="term-value tnum">${esc(t.value)}</span><span class="term-box" aria-hidden="true">${glyph('check', 14)}</span></label></li>`,
    )
    .join('');
  const [label, line] = initials(s.initials);
  return [
    `<figure class="offer" aria-label="${esc(s.label)}" data-offer>`,
    `<p class="mono offer-kicker">${esc(s.meta)}</p>`,
    `<p class="offer-addr">${esc(s.title)}</p>`,
    `<p class="offer-rec">${recommendation(s.recommendation)}</p>`,
    `<ul class="offer-terms" role="list">${terms}</ul>`,
    `<div class="offer-progress" aria-hidden="true"><span data-offer-progress></span></div>`,
    `<div class="offer-sign"><span class="initials" aria-hidden="true">${glyph('check', 18)}</span><p class="offer-sign-text"><span class="mono">${esc(
      label,
    )}</span> <span>${esc(line)}</span></p></div>`,
    `</figure>`,
  ].join('');
}

export function trust(): string {
  const t = HOME.trust;
  const steps = t.items
    .map(
      (it, i) =>
        `<li class="dcs-step${it.done ? ' is-done' : ''}"><span class="dcs-ic">${roleIcon(STEP_ICONS[i] ?? 'checklist', 24)}</span><span class="dcs-txt"><strong class="dcs-name">${esc(
          it.label,
        )}</strong><span class="dcs-text">${esc(it.body)}</span></span></li>`,
    )
    .join('');
  return [
    `<section class="sec dcs" data-theme="light" aria-labelledby="trust-title">`,
    `<div class="wrap dcs-grid">`,
    `<div class="dcs-copy rv"><h2 id="trust-title" class="h-section">${esc(t.heading)}</h2><ol class="dcs-steps" role="list">${steps}</ol></div>`,
    `<div class="dcs-stage rv" style="--d:120ms">${offerCard()}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}
