// /ai101's markup, as one string, from `content.ts` and `ICONS`. DECISIONS.md D-028.
//
// WHY A STRING RENDERER AND NOT A REACT ROUTE
// ------------------------------------------------------------------------------------------------
// The page is opened from a QR code on conference Wi-Fi, by a room of people behind one venue NAT,
// and the spec's acceptance list includes "usable with JavaScript disabled". So the whole page is
// ONE self-contained HTML response: every word of it in the initial bytes, an inline <style>, and
// one small inline <script> for the copy buttons, the checklist and the form. The SPA's bundle is
// ~350 KB of JS before it renders a word, and as a separate request per file it would also spend the
// shared per-IP rate limit (`@fastify/rate-limit`, 100/min) that a whole session room shares.
//
// `vite-plugin.ts` calls these functions at build time (and per request in `pnpm dev`) and pours the
// result into `apps/web/ai101.html`. Nothing here runs in the browser.
//
// ESCAPING
// Every string from `content.ts` goes through `esc()`, the ones that are plain today included: the
// prompts are still being edited, and a `<` typed into one must arrive on the page as a `<`, not as
// a tag. `render.test.ts` proves it by rendering a copy of `PAGE` with markup in every string.
//
// THE <pre> CONTRACT
// The copy button copies `pre[data-prompt-text].textContent`, so that text IS the prompt: the
// template adds nothing inside the <pre> — no leading newline (the HTML parser silently drops one
// after `<pre>`), no indentation, and placeholder <mark>s that add no characters of their own.
// `render.test.ts` parses the output and compares the text to `content.ts` exactly.

// The `icons` subpath rather than the barrel: rendering a page of text should not evaluate all of
// `@ai/core` (seeds, mutations, immer) just to read two SVG paths.
import { ICONS, type IconName } from '@ai/core/icons';
import { PAGE, UI, type Prompt } from './content';

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text and attribute-value escaping. Quotes too, so one function is safe in both positions. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/**
 * `<Icon>` as a string: the same 24 viewBox, fill none, stroke currentColor, stroke-width 1.8 (unless
 * a call site asks otherwise, as `<Icon strokeWidth>` does), round caps and joins, and hidden from
 * assistive tech because every icon on this page sits next to a text label that says the same thing.
 *
 * Presentation attributes rather than `<Icon>`'s inline `style`: they render identically, and a page
 * with no `style=""` attributes keeps working under a CSP that later drops `'unsafe-inline'`.
 */
export function icon(name: IconName, opts: { size?: number; strokeWidth?: number; className?: string } = {}): string {
  const { size = 16, strokeWidth = 1.8, className } = opts;
  const cls = className ? ` class="${esc(className)}"` : '';
  return (
    `<svg${cls} viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" ` +
    `stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${ICONS[name]}"/></svg>`
  );
}

/**
 * A prompt's text with each `[bracketed placeholder]` wrapped in a <mark>. Escaped FIRST, then
 * wrapped: `esc()` never touches a bracket, so the pattern matches the same spans either way, and the
 * brackets stay inside the mark — they are part of what the visitor copies and fills in.
 */
export function highlightPlaceholders(text: string): string {
  return esc(text).replace(/\[[^\]\n]*\]/g, (span) => `<mark class="placeholder">${span}</mark>`);
}

/**
 * The honeypot's label. The one string on the page that is not in `content.ts`, because no person
 * ever sees it: the field is off-screen and `aria-hidden`, so only a form-filling bot reads it.
 */
const HONEYPOT_LABEL = 'Leave this field empty';

/** The <head> lines that come from `content.ts`: the title and the link-preview metadata. */
export function renderAi101Head(): string {
  const { title, description, url, siteName } = PAGE.meta;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(siteName)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join('\n    ');
}

/**
 * A numbered list drawn with the 24px step circles. `role="list"` is not redundant here: WebKit
 * drops list semantics from a list styled `list-style: none`, which this one is so the circles can
 * replace the markers, and VoiceOver would then stop saying "1 of 5".
 */
const numbered = (items: readonly string[]) =>
  `<ol class="steps" role="list">${items.map((item) => `<li><span>${esc(item)}</span></li>`).join('')}</ol>`;

/** A titled sub-block inside a section card: an <h3> and whatever it heads. */
const block = (id: string, heading: string, body: string) =>
  `<div class="block">\n<h3 id="${esc(id)}">${esc(heading)}</h3>\n${body}\n</div>`;

/** A section card. The <h2> names the landmark, so a screen reader's region list reads the page. */
function section(anchor: string, heading: string, body: string[], className = 'card'): string {
  const headingId = `${anchor}-heading`;
  return [
    `<section id="${esc(anchor)}" class="${className}" aria-labelledby="${esc(headingId)}">`,
    `<h2 id="${esc(headingId)}">${esc(heading)}</h2>`,
    ...body,
    `</section>`,
  ].join('\n');
}

/**
 * One prompt: its label, the copy button and the text.
 *
 * The button's visible label is exactly "Copy prompt" (and "Copied" for two seconds after a copy,
 * which `main.ts` swaps in `[data-copy-label]`). Two buttons with that one name would be ambiguous in
 * a screen reader's button list, so `aria-describedby` points at the <h3>: "Copy prompt, Voice
 * profile prompt". Both icons are always in the markup; `[data-copied]` decides which one shows.
 */
function promptBlock(prompt: Prompt, anchor: string): string {
  const id = `${anchor}-prompt`;
  const labelId = `${id}-label`;
  return [
    `<div class="prompt" id="${esc(id)}" data-prompt="${esc(prompt.id)}">`,
    `<div class="prompt-head">`,
    `<h3 id="${esc(labelId)}">${esc(prompt.label)}</h3>`,
    `<button type="button" class="copy" data-copy aria-describedby="${esc(labelId)}">` +
      icon('copy', { className: 'icon-copy' }) +
      icon('check', { className: 'icon-check' }) +
      `<span data-copy-label>${esc(UI.copy)}</span></button>`,
    `</div>`,
    // Nothing between the tags but the prompt. See THE <pre> CONTRACT at the top of this file.
    `<pre data-prompt-text>${highlightPlaceholders(prompt.text)}</pre>`,
    `</div>`,
  ].join('\n');
}

/**
 * The three-layer table. A real <table> with column and row headers, and with each role spelled out:
 * under 640px the CSS restyles it into one stacked card per row (three columns of sentences cannot
 * fit 375px without a horizontal scroll), and browsers drop a table's semantics as soon as its
 * `display` changes. The explicit roles keep it a table to assistive tech at every width.
 *
 * `data-label` carries the column name for the stacked layout's per-cell caption, which the CSS
 * draws with `content: attr(data-label) / ""` — empty alt text, so the caption is not read twice
 * next to the column header the table already announces.
 */
function layersTable(): string {
  const { columns, rows } = PAGE.carouselCreator.layers;
  const head = columns.map((c) => `<th scope="col" role="columnheader">${esc(c)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr role="row">` +
        row
          .map((cell, i) =>
            i === 0
              ? `<th scope="row" role="rowheader">${esc(cell)}</th>`
              : `<td role="cell" data-label="${esc(columns[i] ?? '')}">${esc(cell)}</td>`,
          )
          .join('') +
        `</tr>`,
    )
    .join('\n');
  return [
    `<table class="layers" role="table">`,
    `<thead role="rowgroup"><tr role="row">${head}</tr></thead>`,
    `<tbody role="rowgroup">`,
    body,
    `</tbody>`,
    `</table>`,
  ].join('\n');
}

/**
 * The setup checklist. Native checkboxes, so it works with JavaScript off; `main.ts` only adds the
 * persistence (`localStorage['ai101-checklist']`, keyed by `data-check-id`). The real input sits
 * transparent over the drawn `.box`, which is what makes the box itself the tap target.
 */
function checklist(labelledBy: string): string {
  const items = PAGE.carouselCreator.checklist.map(
    ({ id, text }) =>
      `<li><label><input type="checkbox" name="ai101-check" value="${esc(id)}" data-check-id="${esc(id)}"> ` +
      `<span class="box" aria-hidden="true">${icon('check', { size: 13, strokeWidth: 3 })}</span> ` +
      `<span>${esc(text)}</span></label></li>`,
  );
  return `<ul class="checklist" role="list" aria-labelledby="${esc(labelledBy)}">\n${items.join('\n')}\n</ul>`;
}

/**
 * The sprint's four weeks as tiles. The colon is visually hidden (each tile draws the week above
 * its pillar) but kept in the text, so a screen reader — and `textContent` — reads "Week 1: Market".
 */
function sprintWeeks(): string {
  const items = PAGE.sprint.weeks.map(
    ({ week, pillar }) =>
      `<li><span class="week">${esc(week)}<span class="visually-hidden">:</span></span> ` +
      `<span class="pillar">${esc(pillar)}</span></li>`,
  );
  return `<ul class="weeks" role="list">\n${items.join('\n')}\n</ul>`;
}

/** A labelled input plus its (empty until `main.ts` fills it) error line. */
function field(name: 'firstName' | 'email' | 'brokerage', label: string, attrs: string, optional?: string): string {
  const id = `waitlist-${name}`;
  const marker = optional ? ` <span class="optional">${esc(optional)}</span>` : '';
  return [
    `<div class="field">`,
    `<label for="${id}">${esc(label)}${marker}</label>`,
    `<input id="${id}" name="${name}" ${attrs}>`,
    `<p class="field-error" id="${name}-error"></p>`,
    `</div>`,
  ].join('\n');
}

/**
 * The December waitlist.
 *
 * Without JavaScript this is a plain form POST: native `required`/`type=email` validation (there is
 * deliberately no `novalidate` in the markup — `main.ts` sets `noValidate` at runtime, once it is
 * there to validate instead), then the API answers 303 to `/ai101#waitlist-joined` or
 * `/ai101#waitlist-error`, and `:target` in the CSS shows the matching line. That is why the
 * form-level error carries its text in the markup: on that path nothing else could put it there.
 *
 * The honeypot is off-screen rather than `display: none`, which form-filling bots know to skip, and
 * `aria-hidden` with `tabindex="-1"` so no person, sighted or not, ever lands in it.
 */
function waitlist(): string {
  const w = PAGE.waitlist;
  const form = [
    `<form id="waitlist-form" class="form" method="post" action="/api/ai101/waitlist">`,
    field('firstName', w.fields.firstName.label, 'type="text" required autocomplete="given-name" maxlength="80"'),
    field(
      'email',
      w.fields.email.label,
      'type="email" required autocomplete="email" maxlength="254" inputmode="email"',
    ),
    field(
      'brokerage',
      w.fields.brokerage.label,
      'type="text" autocomplete="organization" maxlength="120"',
      w.fields.brokerage.optional,
    ),
    `<div class="field-website" aria-hidden="true">`,
    `<label for="waitlist-website">${esc(HONEYPOT_LABEL)}</label>`,
    `<input id="waitlist-website" name="website" type="text" tabindex="-1" autocomplete="off">`,
    `</div>`,
    `<p class="form-error" id="waitlist-error" role="alert">${esc(UI.errors.generic)}</p>`,
    `<button type="submit" class="submit">${esc(w.button)}</button>`,
    `<p class="consent">${esc(w.consent)}</p>`,
    `</form>`,
  ].join('\n');
  const joined =
    `<p id="waitlist-joined" class="success" tabindex="-1">` +
    `${icon('checkCircle', { size: 18 })}<span>${esc(w.success)}</span></p>`;
  return section(w.anchor, w.heading, [`<p>${esc(w.body)}</p>`, form, joined], 'card waitlist');
}

/** Everything inside <body>, in the spec's section order. */
export function renderAi101Body(): string {
  const { header, voiceProfile: vp, carouselCreator: cc, ownership, sprint } = PAGE;

  const jump = header.jumpLinks
    .map(({ label, target }) => `<a href="#${esc(target)}">${esc(label)}</a>`)
    .join('<span class="sep" aria-hidden="true"> · </span>');

  const hero = [
    `<header class="hero">`,
    `<p class="eyebrow">${esc(header.eyebrow)}</p>`,
    `<h1>${esc(header.title)}</h1>`,
    `<p class="subhead">${esc(header.subhead)}</p>`,
    `<nav class="jump" aria-label="${esc(header.jumpLinksLabel)}">${jump}</nav>`,
    `</header>`,
  ].join('\n');

  const checklistId = `${cc.anchor}-checklist`;

  return [
    `<main class="page">`,
    hero,
    section(vp.anchor, vp.heading, [
      `<p class="lede">${esc(vp.intro)}</p>`,
      numbered(vp.steps),
      promptBlock(vp.prompt, vp.anchor),
    ]),
    section(cc.anchor, cc.heading, [
      `<p class="lede">${esc(cc.intro)}</p>`,
      layersTable(),
      block(checklistId, cc.checklistHeading, checklist(checklistId)),
      promptBlock(cc.prompt, cc.anchor),
      block(`${cc.anchor}-week`, cc.weekHeading, numbered(cc.week)),
    ]),
    section(ownership.anchor, ownership.heading, [
      `<p class="lede">${esc(ownership.intro)}</p>`,
      numbered(ownership.items),
    ]),
    section(sprint.anchor, sprint.heading, [
      `<p class="lede">${esc(sprint.intro)}</p>`,
      sprintWeeks(),
      `<p>${esc(sprint.outro)}</p>`,
    ]),
    waitlist(),
    // The one polite live region: "Voice profile prompt copied". Empty in the markup; `main.ts`
    // clears and refills it so a second copy of the same prompt is announced again.
    `<p id="ai101-live" class="visually-hidden" aria-live="polite"></p>`,
    `</main>`,
  ].join('\n');
}
