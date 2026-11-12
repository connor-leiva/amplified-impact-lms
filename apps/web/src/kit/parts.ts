// The kit's pieces, as strings: the mockup's primitives (Eyebrow, Button, Words, CheckList, Status,
// SeatMeter, ExampleTag) and its shared sections (BuiltInside, Founders, Faq, CloseCta), each rendered
// from the words a page gives it. The kit has no words of its own beyond the ones listed in
// `./content.ts`: every string here comes from the caller, from live content, through `esc()`.
//
// NO SCRIPT NEEDED. The questions are <details>, the seat meter is drawn from the seats the API writes
// per request, and the proof's figures are the settled numbers; `client/main.ts` only animates them.

import { COHORT_SEATS } from '@ai/core/offer';
import { esc } from '../ai101/render';
import { HOME, PHOTOS } from '../home/content';
import { splitProof } from '../home/sections/proof';
import { entryFor } from '../home/library-data';
import { FREE_FIVE } from '../library/content';
import { photoTag } from '../site/people';
import { KIT } from './content';
import { brandIcon, glyph, ringDot, ripple, type BrandIconName } from './icons';

export { esc };

/** "01", "02": the mono indexes beside list rows. */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * The mono label over a heading. `mark` puts the ring and dot before it and quiets its colour; `icon`
 * puts a brand icon there instead. `id` names it, for a section labelled by its eyebrow.
 */
export function eyebrow(
  text: string,
  { mark = false, icon, cls = '', id }: { mark?: boolean; icon?: BrandIconName; cls?: string; id?: string } = {},
): string {
  const classes = ['eb', mark ? 'eb-mark' : '', icon ? 'eb-icon' : '', cls].filter(Boolean).join(' ');
  return `<p class="${classes}"${id ? ` id="${esc(id)}"` : ''}>${mark ? ringDot(22) : ''}${icon ? brandIcon(icon, 20) : ''}<span>${esc(text)}</span></p>`;
}

export type ButtonVariant = 'primary' | 'secondary' | 'link';
export type ButtonSize = 'lg' | 'md' | 'sm';

/**
 * A link styled as the kit's buttons. `href` is used as given (a `%%token%%` the API fills, or a path),
 * escaped. `attrs` is extra markup the caller has already escaped.
 */
export function button(
  label: string,
  href: string,
  {
    variant = 'primary',
    size = 'lg',
    cls = '',
    attrs = '',
  }: { variant?: ButtonVariant; size?: ButtonSize; cls?: string; attrs?: string } = {},
): string {
  const classes = ['btn', `btn-${variant}`, variant === 'link' ? '' : `btn-${size}`, cls].filter(Boolean).join(' ');
  return `<a class="${classes}" href="${esc(href)}"${attrs ? ` ${attrs}` : ''}>${esc(label)}</a>`;
}

/** A headline line split into words, so each rises into place on load (CSS; not under reduced motion). */
export function words(text: string, start = 0): string {
  return text
    .split(' ')
    .map((word, i) => `<span class="w"><span style="--wi:${start + i}">${esc(word)}</span></span>`)
    .join(' ');
}

/** A list with a check (or a dash, for what isn't included) in front of each line. */
export function checks(
  items: readonly string[],
  { mark = 'check', cls = '' }: { mark?: 'check' | 'dash'; cls?: string } = {},
): string {
  return `<ul class="checks checks-${mark}${cls ? ` ${cls}` : ''}" role="list">${items
    .map((item) => `<li><span class="checks-mark">${glyph(mark, 14)}</span><span>${esc(item)}</span></li>`)
    .join('')}</ul>`;
}

export type StatusTone = 'live' | 'muted' | 'closed';

/** A small status line; `live` pulses its dot. `html` is markup the caller has already escaped (it may hold tokens). */
export const status = (html: string, { tone = 'live', cls = '' }: { tone?: StatusTone; cls?: string } = {}): string =>
  `<p class="status status-${tone}${cls ? ` ${cls}` : ''}"><span class="status-dot" aria-hidden="true"></span><span>${html}</span></p>`;

/**
 * The Accelerator's founding seats, one mark each: a ring with a dot is open, a filled circle is taken.
 * `left` is what the API writes per request (`%%seats-left%%`); the stylesheet draws the taken ones
 * from it, so the meter is right with no script. Its words are the caller's, for screen readers.
 */
export function seatMeter(left: string, label: string, cls = ''): string {
  const seats = Array.from({ length: COHORT_SEATS }, (_, i) => `<span class="seatm-s" style="--si:${i}"></span>`).join(
    '',
  );
  return `<div class="seatm${cls ? ` ${cls}` : ''}" data-left="${esc(left)}" role="img" aria-label="${label}">${seats}</div>`;
}

/** Marks an illustration that uses made-up numbers (the brief: never next to a price or a buy button). */
export const exTag = (): string => `<span class="mono ex-tag">${esc(KIT.example)}</span>`;

/**
 * The proof, next to every buy button: "Built inside The Utah Life Real Estate Group" and "100 agents,
 * 700+ homes a year", the homepage's own words (`HOME.proof`), on light and dark sections alike.
 */
export const proofLine = (): string =>
  `<p class="proof-line"><span>${esc(HOME.proof.label)}</span> <strong>${esc(HOME.proof.figure)}</strong></p>`;

/**
 * Built inside: the mockup's proof section. The place's name and the two figures are `HOME.proof`'s,
 * split as the homepage splits them (`splitProof`); the eyebrow and the sentence are the page's own
 * live words (/team-build's `PROOF`, for one). The figures count up as they arrive (the script), and a
 * screen reader reads the settled one.
 */
export function proofSection({ heading, body }: { heading: string; body: string }): string {
  const p = splitProof();
  const stats = p.stats
    .map((s, i) => {
      const n = `${s.value.toLocaleString('en-US')}${s.plus ? '+' : ''}`;
      return `<p class="proof-stat rv" style="--d:${(i + 1) * 100}ms"><span class="proof-num" aria-hidden="true"><span class="tnum" data-count="${s.value}">${s.value.toLocaleString(
        'en-US',
      )}</span>${s.plus ? '+' : ''}</span><span class="proof-label"><span class="sr-only">${n} </span>${esc(s.label)}</span></p>`;
    })
    .join('');
  return [
    `<section class="sec proof" aria-labelledby="proof-title">`,
    `<div class="wrap proof-grid">`,
    `<div class="proof-where rv">${eyebrow(heading, { mark: true })}<h2 id="proof-title" class="proof-name">${esc(p.name)}</h2><p class="proof-text">${esc(body)}</p></div>`,
    stats,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/**
 * Founders: Spring and Connor, their real photos and their words (`HOME.meet`, `PHOTOS`), in the
 * mockup's layout (a 4:5 portrait beside each bio). Never initials.
 */
export function founders(): string {
  const m = HOME.meet;
  const people = m.people
    .map(
      (p, i) =>
        `<li class="founder rv" style="--d:${i * 120}ms"><div class="portrait">${photoTag(PHOTOS[p.photo], 'portrait-img')}</div><div class="founder-copy"><h3 class="founder-name">${esc(
          p.name,
        )}</h3><p class="mono founder-role">${esc(p.role)}</p><p class="founder-bio">${esc(p.body)}</p></div></li>`,
    )
    .join('');
  return [
    `<section class="sec founders" aria-labelledby="founders-title">`,
    `<div class="wrap">`,
    `<div class="founders-head rv"><h2 id="founders-title" class="h-section">${esc(m.heading)}</h2></div>`,
    `<ul class="founders-grid" role="list">${people}</ul>`,
    `<div class="founders-foot rv">${button(m.more.label, m.more.href, { variant: 'link' })}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** One question: its words, the answer's paragraphs, and an optional link under them. */
export interface KitFaq {
  q: string;
  a: readonly string[];
  link?: { label: string; href: string };
}

/**
 * Questions: the mockup's numbered accordion, as a list of <details> (they open and close with no
 * script). The first is open, as in the mockup. `aside` is markup the caller has already escaped.
 */
export function faq(
  items: readonly KitFaq[],
  { title, id = 'questions', aside = '' }: { title: string; id?: string; aside?: string },
): string {
  const list = items
    .map(
      (f, i) =>
        `<li class="faq-item"><details${i === 0 ? ' open' : ''}><summary class="faq-q"><span class="mono faq-idx" aria-hidden="true">${pad2(
          i + 1,
        )}</span><span class="faq-qt">${esc(f.q)}</span><span class="faq-pm" aria-hidden="true"></span></summary><div class="faq-a">${f.a
          .map((a) => `<p>${esc(a)}</p>`)
          .join(
            '',
          )}${f.link ? `<p><a class="inline-link" href="${esc(f.link.href)}">${esc(f.link.label)}</a></p>` : ''}</div></details></li>`,
    )
    .join('');
  return [
    `<section id="${esc(id)}" class="sec faq" aria-labelledby="${esc(id)}-title">`,
    `<div class="wrap faq-grid">`,
    `<div class="faq-head rv"><h2 id="${esc(id)}-title" class="h-section">${esc(title)}</h2>${aside ? `<div class="faq-aside">${aside}</div>` : ''}</div>`,
    `<ul class="faq-list rv" style="--d:100ms" role="list">${list}</ul>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/**
 * The five free skills, by their Library cards (`FREE_FIVE`, in the Library's order): each one's title
 * and page, so a list here can never name a skill two ways. `heading` is the caller's live words.
 */
export function freeSkills(heading?: string): string {
  const items = FREE_FIVE.map((slug, i) => {
    const e = entryFor(slug);
    return `<li><a class="free-item" href="${esc(e.href!)}"><span class="mono free-idx" aria-hidden="true">${pad2(i + 1)}</span><span class="free-name">${esc(
      e.title,
    )}</span>${glyph('arrow', 18, 'free-arrow')}</a></li>`;
  }).join('');
  return `<div class="free rv" style="--d:140ms">${heading ? `<p class="mono free-h">${esc(heading)}</p>` : ''}<ul class="free-list" role="list">${items}</ul></div>`;
}

/**
 * The closing call to action over the quiet ripple, with the five free skills beside it. `actions` is
 * markup the caller built from `button()`; `free` is the free list's heading, or false for none.
 */
export function closeCta({
  eyebrowText,
  title,
  lead,
  actions,
  free = false,
}: {
  eyebrowText?: string;
  title: string;
  lead?: string;
  actions?: string;
  free?: string | boolean;
}): string {
  return [
    `<section class="sec close" aria-labelledby="close-title">`,
    `<div class="close-ripple" aria-hidden="true">${ripple(1180, { quiet: true })}</div>`,
    `<div class="wrap close-grid">`,
    `<div class="close-copy rv">${eyebrowText ? eyebrow(eyebrowText) : ''}<h2 id="close-title" class="close-title">${esc(title)}</h2>${
      lead ? `<p class="lead">${esc(lead)}</p>` : ''
    }${actions ? `<div class="actions">${actions}</div>` : ''}</div>`,
    ...(free === false ? [] : [freeSkills(typeof free === 'string' ? free : undefined)]),
    `</div>`,
    `</section>`,
  ].join('\n');
}
