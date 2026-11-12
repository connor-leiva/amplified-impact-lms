// S12, the Accelerator's eight Wednesdays (`section.wed`): the weeks, a ring counting the builds, and
// the founding offer (brief § 4, S12; § 5).
//
// THE DATES ARE /team-build's (`WEEKS`), shortened as the mockup writes them ("Wednesday, December 2"
// is "Dec 2"); the names and lines are the mockup's; the price and date after the 90 days are the
// offer's own (`PRICES`, `INSIDERS_FIRST_CHARGE_AT`).
//
// THE RING NEVER RESTS ON A PART (brief § 5, C15): settled in the markup at 8 of 8 with every week lit,
// which is what a phone, reduced motion or no script shows. On a wide screen with motion allowed, a
// section arriving from below counts its builds up from 0 to 8 once, week by week, and ends on 8.
//
// THE OFFER: "Claim a Founding Seat" goes to /team-build (Connor's D1), the proof line beside it; the
// seat meter and its line show from the start, and the sold-out and closed states are /pricing's
// (`./offer.ts`).
//
// The light band the mockup draws is `.inverse`, so it swaps with the page's theme (D8).

import { INSIDERS_FIRST_CHARGE_AT, longDate } from '@ai/core/offer';
import { esc } from '../../../ai101/render';
import { button } from '../../../kit/parts';
import { WEEKS } from '../../../team-build/content';
import { PRICES, usd } from '../../prices';
import { TIMELINE } from '../content';
import { ringDot } from '../icons';
import { closedLine, ctaGroup, offerAttrs, seatBlock, soldoutLine, waitlistButton } from './offer';

const MONTHS: Record<string, string> = {
  January: 'Jan',
  February: 'Feb',
  March: 'Mar',
  April: 'Apr',
  May: 'May',
  June: 'Jun',
  July: 'Jul',
  August: 'Aug',
  September: 'Sep',
  October: 'Oct',
  November: 'Nov',
  December: 'Dec',
};

/** /team-build's date for a week, as the mockup writes it: "Wednesday, December 2" is "Dec 2". */
export function weekDate(n: number): string {
  const item = WEEKS.items.find((w) => w.n === n);
  if (!item) throw new Error(`/team-build has no week ${n}`);
  return item.date.replace(/^[A-Z][a-z]+day, /, '').replace(new RegExp(`\\b(${Object.keys(MONTHS).join('|')})\\b`), (m) => MONTHS[m]!);
}

const row = (wk: string, date: string, name: string, text: string, attrs: string) =>
  `<li class="wed-row is-on"${attrs}><span class="mono wed-wk">${esc(wk)}</span><span class="mono wed-date">${esc(date)}</span><span class="wed-body"><span class="wed-name">${esc(
    name,
  )}</span><span class="wed-text">${esc(text)}</span></span><span class="wed-mark" aria-hidden="true">${ringDot(18)}</span></li>`;

export function timeline(): string {
  const t = TIMELINE;
  const href = t.more.href;
  const weeks = t.weeks.map((w) => row(t.weekLabel(w.n), weekDate(w.n), w.name, w.text, ` data-wk="${w.n}"`));
  // The break falls between weeks 3 and 4.
  weeks.splice(
    4,
    0,
    `<li class="wed-brk"><span class="mono wed-wk">${esc(t.pause.label)}</span><span class="mono wed-date">${esc(t.pause.date)}</span><span class="wed-brk-t">${esc(
      t.pause.text,
    )}</span></li>`,
  );
  const afterText = t.after.text(usd(PRICES.insiders.monthly), longDate(INSIDERS_FIRST_CHARGE_AT));
  weeks.push(row(t.after.label, t.after.date, t.after.name, afterText, ` data-wk="${t.builds + 1}"`).replace('wed-row is-on', 'wed-row is-on is-after'));
  return [
    `<section class="sec wed inverse" aria-labelledby="wed-title" ${offerAttrs()} data-v3-wed>`,
    `<div class="wrap wed-grid">`,
    `<div class="wed-side">`,
    // The date never splits from its day ("Starts Dec / 2"): a no-break space inside it.
    `<p class="eb eb-mark">${ringDot(22)}<span>${esc(t.eyebrow(weekDate(1).replace(' ', '\u00a0')))}</span></p>`,
    `<h2 id="wed-title" class="h-section">${esc(t.title)}</h2>`,
    `<p class="intro">${esc(t.intro)}</p>`,
    `<div class="wed-meter" aria-hidden="true"><svg class="wed-ring" viewBox="0 0 120 120"><circle class="wed-ring-bg" cx="60" cy="60" r="52"/><circle class="wed-ring-fg" cx="60" cy="60" r="52" pathLength="1" style="--k:1"/></svg><span class="wed-ring-in"><span class="wed-ring-n tnum" data-v3-built>${
      t.builds
    }</span><span class="mono">${esc(t.built)}</span></span></div>`,
    `<div class="wed-offer">`,
    seatBlock('wed-seats'),
    `<p class="status status-closed" data-when="acc-soldout" hidden><span class="status-dot" aria-hidden="true"></span><span>${esc(soldoutLine())}</span></p>`,
    `<p class="status status-closed" data-when="acc-closed" hidden><span class="status-dot" aria-hidden="true"></span><span>${esc(closedLine())}</span></p>`,
    ctaGroup('wed-cta', [
      { when: 'acc-open', html: `${button(t.cta, href, { size: 'lg' })}${button(t.more.label, href, { variant: 'link' })}` },
      { when: 'acc-soldout acc-closed', hidden: true, html: `${waitlistButton(href)}${button(t.more.label, href, { variant: 'link' })}` },
    ]),
    `</div>`,
    `</div>`,
    `<div class="wed-main">`,
    `<ol class="wed-list" role="list">${weeks.join('')}</ol>`,
    `<ul class="wed-meta" role="list">${t.meta.map((m) => `<li class="mono">${esc(m)}</li>`).join('')}</ul>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('');
}
