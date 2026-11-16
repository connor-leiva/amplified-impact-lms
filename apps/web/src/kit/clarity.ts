// The Clarity Call (DECISIONS.md D-161): a quiet card near the foot of the www pages that sell, for a
// visitor who isn't ready to buy. "Still deciding? Talk it through with Connor." and one button to his
// free 15-minute call, booked on GoHighLevel's own page in a new tab.
//
// ONE COMPONENT, EVERY PAGE THAT CARRIES IT: the homepage, /pricing and /team-build (the kit's pages),
// /offer and /forum (one page), and every skill page (`layout: 'skill'` in `../guides/render.ts`).
// Never /agreement, /offer/welcome, checkout, the LMS or the admin console. `clarity.test.ts` holds
// the list.
//
// WHERE: between the page's <main> and its footer, so after the last buy block and the page's own
// close, as an <aside> (a complementary landmark): it stands apart from the page's story and is not
// part of it, so nothing in any page's <main>, its pay buttons included, moves or changes.
//
// A PLAIN LINK. A real <a href> to the booking page, `target="_blank" rel="noopener"`: no GHL script,
// iframe, embed or API call. A click sends `clarity_call_click` (GA4) and `ClarityCallClick` (Meta)
// through `/analytics.js`, which reads `data-ai-event`; nothing else on the page knows about it.
//
// ITS LOOK is `./clarity.css`, imported by each host's stylesheet. The card reads the host page's own
// tokens (the kit's on a kit page, so it follows the light and dark switch), so it is the page's quiet
// panel and outlined button, never a second Pay button. `host` picks the page's column class, so the
// card lines up with everything above it.
//
// NO SCRIPT NEEDED. Every string goes through `esc()`; nothing here runs in the browser.

import { esc } from '../ai101/render';
import { CLARITY_CALL } from './content';

/** The kinds of page that carry the card: the kit's pages, the offer page, a skill page. */
export type ClarityHost = 'kit' | 'offer' | 'skill';

/** Each host's own column: the kit's `.wrap`, the offer page's `.inner`, a skill page's `.sk-wrap`. */
const COLUMN: Readonly<Record<ClarityHost, string>> = { kit: 'wrap', offer: 'inner', skill: 'sk-wrap' };

/** The card's heading id: one card a page, so one id. */
export const CLARITY_TITLE_ID = 'clarity-call-title';

/** The Clarity Call card, for a page of kind `host`: an <aside> to sit between </main> and the footer. */
export function clarityCall(host: ClarityHost): string {
  const c = CLARITY_CALL;
  // One fact a line on screen (the stylesheet); the dots part them where there is no stylesheet.
  const details = c.details
    .map((d) => `<span class="cc-fact">${esc(d)}</span>`)
    .join('<span class="cc-sep" aria-hidden="true">&nbsp;·</span> ');
  return [
    `<aside class="cc" data-host="${host}" data-clarity-call aria-labelledby="${CLARITY_TITLE_ID}">`,
    `<div class="${COLUMN[host]}">`,
    `<div class="cc-card">`,
    `<div class="cc-copy">`,
    `<p class="cc-eyebrow">${esc(c.eyebrow)}</p>`,
    `<h2 id="${CLARITY_TITLE_ID}" class="cc-title">${esc(c.heading)}</h2>`,
    `<p class="cc-body">${esc(c.body)}</p>`,
    `</div>`,
    `<div class="cc-act">`,
    `<a class="cc-btn" href="${esc(c.href)}" target="_blank" rel="noopener" data-ai-event="${esc(c.event)}">${esc(c.button)}</a>`,
    `<p class="cc-fine">${details}</p>`,
    `</div>`,
    `</div>`,
    `</div>`,
    `</aside>`,
  ].join('');
}
