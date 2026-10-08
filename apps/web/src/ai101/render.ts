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
import { PAGE, UI, type ChecklistItem, type CopyOpen, type Inline, type Prompt, type Step } from './content';

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

/** Every link that leaves the site opens in a new tab, and gives the new page no handle on this one. */
const NEW_TAB = 'target="_blank" rel="noopener"';

/**
 * One run of inline copy (`content.ts`'s `Inline`). Every string is escaped here, so the only tags on
 * the page are the ones this function writes — never one that came from the copy.
 *
 * A `{ button, phone }` renders BOTH and lets the CSS choose: `.desktop-only` and `.phone-only` switch
 * on a coarse pointer or a narrow viewport, which needs no JavaScript and cannot flash.
 */
export function inline(segments: readonly Inline[]): string {
  return segments
    .map((seg) => {
      if (typeof seg === 'string') return esc(seg);
      if ('strong' in seg) return `<strong>${esc(seg.strong)}</strong>`;
      if ('link' in seg) return `<a href="${esc(seg.href)}" ${NEW_TAB}>${esc(seg.link)}</a>`;
      const button = `<a class="action" href="${esc(seg.href)}" ${NEW_TAB}>${esc(seg.button)}</a>`;
      if (!seg.phone) return button;
      return `<span class="desktop-only">${button}</span><span class="phone-only">${esc(seg.phone)}</span>`;
    })
    .join('');
}

/**
 * A "Copy & open" link. A real `<a>`, so with JavaScript off it is still a link that opens the app;
 * with it, `main.ts` copies the prompt in `data-copy-open`'s block first. `data-app` names the app
 * for the two-tap fallback's "Copied. Open {app}".
 */
function copyOpenLink(open: CopyOpen, promptBlockId: string): string {
  return (
    `<a class="action" href="${esc(open.href)}" ${NEW_TAB} data-copy-open="${esc(promptBlockId)}" ` +
    `data-app="${esc(open.app)}"><span data-copy-label>${esc(open.label)}</span></a>`
  );
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
const numbered = (items: readonly Step[]) =>
  `<ol class="steps" role="list">${items.map((item) => `<li>${stepBody(item)}</li>`).join('')}</ol>`;

/** A step's content: its text, or its lead line and a bulleted list of the options under it. */
function stepBody(item: Step): string {
  if (typeof item === 'string') return `<span>${esc(item)}</span>`;
  const options = item.options.map((option) => `<li>${inline(option)}</li>`).join('');
  return `<div class="step-rich"><span>${esc(item.lead)}</span><ul class="options">${options}</ul></div>`;
}

/** A titled sub-block inside a section card: an <h3> and whatever it heads. */
const block = (id: string, heading: string, body: string) =>
  `<div class="block">\n<h3 id="${esc(id)}">${esc(heading)}</h3>\n${body}\n</div>`;

/**
 * A section card. The <h2> names the landmark, so a screen reader's region list reads the page. A
 * badge ("Phone or laptop · Free") sits above the heading, at the top of the card.
 */
function section(anchor: string, heading: string, body: string[], className = 'card', badge?: string): string {
  const headingId = `${anchor}-heading`;
  return [
    `<section id="${esc(anchor)}" class="${className}" aria-labelledby="${esc(headingId)}">`,
    ...(badge ? [`<p class="badge">${esc(badge)}</p>`] : []),
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
function promptBlock(prompt: Prompt, anchor: string, open: readonly CopyOpen[] = [], hint?: string): string {
  const id = `${anchor}-prompt`;
  const labelId = `${id}-label`;
  const copy =
    `<button type="button" class="copy" data-copy aria-describedby="${esc(labelId)}">` +
    icon('copy', { className: 'icon-copy' }) +
    icon('check', { className: 'icon-check' }) +
    `<span data-copy-label>${esc(UI.copy)}</span></button>`;
  // With Copy & open links the buttons get a row of their own under the label, which stacks on a
  // phone; without, "Copy prompt" sits beside the label as it always has.
  const actions = open.length
    ? [`<div class="actions">${copy}${open.map((o) => copyOpenLink(o, id)).join('')}</div>`]
    : [copy];
  return [
    `<div class="prompt" id="${esc(id)}" data-prompt="${esc(prompt.id)}">`,
    `<div class="prompt-head${open.length ? ' stacked' : ''}">`,
    `<h3 id="${esc(labelId)}">${esc(prompt.label)}</h3>`,
    ...actions,
    `</div>`,
    ...(hint ? [`<p class="hint">${esc(hint)}</p>`] : []),
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
          .map((cell, i) => {
            const content = typeof cell === 'string' ? esc(cell) : inline(cell);
            return i === 0
              ? `<th scope="row" role="rowheader">${content}</th>`
              : `<td role="cell" data-label="${esc(columns[i] ?? '')}">${content}</td>`;
          })
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
  const cc = PAGE.carouselCreator;
  const promptId = `${cc.anchor}-prompt`;
  const items = cc.checklist.map((item: ChecklistItem) => {
    const { id, title, detail } = item;
    const label =
      `<label><input type="checkbox" name="ai101-check" value="${esc(id)}" data-check-id="${esc(id)}"> ` +
      `<span class="box" aria-hidden="true">${icon('check', { size: 13, strokeWidth: 3 })}</span> ` +
      `<span>${inline(title)}</span></label>`;
    // The detail sits OUTSIDE the <label>: a link or button inside one would also become part of the
    // checkbox's accessible name, and the whole paragraph would be read as the box's label.
    const parts: string[] = [];
    if (id === 'create-project') parts.push(copyOpenLink(cc.projectOpen, promptId));
    if (detail) parts.push(inline(detail));
    const body = parts.length ? `<div class="check-detail">${parts.join('')}</div>` : '';
    const starters = id === 'first-idea' ? startersBlock() : '';
    return `<li>${label}${body}${starters}</li>`;
  });
  return `<ul class="checklist" role="list" aria-labelledby="${esc(labelledBy)}">\n${items.join('\n')}\n</ul>`;
}

/**
 * The tap-to-copy starter ideas under the checklist's last item. Each chip copies its own text. The
 * hint says "Tap one to copy it", which is only true with JavaScript, so it is `hidden` until
 * `main.ts` has wired the chips; the chips themselves stay readable either way.
 */
function startersBlock(): string {
  const { starters, startersHint } = PAGE.carouselCreator;
  const chips = starters
    .map((s) => `<li><button type="button" class="chip" data-copy-chip><span data-copy-label>${esc(s)}</span></button></li>`)
    .join('');
  return `<div class="check-detail starters"><ul class="chips" role="list">${chips}</ul><p class="hint" data-js-only hidden>${esc(startersHint)}</p></div>`;
}

/**
 * "About you": optional fields that `main.ts` writes into the Carousel Creator instructions' last
 * line as they are typed. `hidden` in the markup and shown by `main.ts`, because without JavaScript
 * the fields would do nothing at all. Field names are scoped by `data-about-field`; the ids carry an
 * `about-` prefix so none collides with the waitlist's.
 */
function aboutYou(anchor: string): string {
  const a = PAGE.carouselCreator.aboutYou;
  const headingId = `${anchor}-about-heading`;
  const fields = a.fields.map((f) => {
    const id = `about-${f.name}`;
    const placeholder = 'placeholder' in f && f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
    const control =
      f.kind === 'textarea'
        ? `<textarea id="${id}" name="${esc(f.name)}" rows="${f.rows}"${placeholder} data-about-field="${esc(f.name)}"></textarea>`
        : `<input id="${id}" name="${esc(f.name)}" type="text"${placeholder} autocomplete="off" data-about-field="${esc(f.name)}">`;
    return `<div class="field">\n<label for="${id}">${esc(f.label)}</label>\n${control}\n</div>`;
  });
  return [
    `<div class="about" id="${esc(anchor)}-about" role="group" aria-labelledby="${esc(headingId)}" data-about hidden>`,
    `<div class="about-head"><h3 id="${esc(headingId)}">${esc(a.heading)}</h3>` +
      `<button type="button" class="text-button" data-about-clear>${esc(a.clear)}</button></div>`,
    `<p class="hint">${esc(a.intro)}</p>`,
    ...fields,
    `</div>`,
  ].join('\n');
}

/** "Before we start": the two app links, with each platform's store link for `main.ts` to swap in. */
function getApp(): string {
  const { lead, apps } = PAGE.getApp;
  const links = apps
    .map(
      ({ label, href }) =>
        `<a class="action" href="${esc(href.web)}" ${NEW_TAB} data-ios="${esc(href.ios)}" ` +
        `data-android="${esc(href.android)}" data-get-app>${esc(label)}</a>`,
    )
    .join('');
  return `<div class="get-app">\n<p><strong>${esc(lead)}</strong></p>\n<div class="actions">${links}</div>\n</div>`;
}

/** The sprint's two calendar links. The .ics stays in this tab, where iOS offers "Add to Calendar". */
function calendarLinks(): string {
  const { lead, apple, google } = PAGE.sprint.calendar;
  return (
    `<div class="calendar"><p>${esc(lead)}</p><div class="actions">` +
    `<a class="action" href="${esc(apple.href)}">${esc(apple.label)}</a>` +
    `<a class="action" href="${esc(google.href)}" ${NEW_TAB}>${esc(google.label)}</a>` +
    `</div></div>`
  );
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
    getApp(),
    section(
      vp.anchor,
      vp.heading,
      [
        `<p class="lede">${esc(vp.intro)}</p>`,
        numbered(vp.steps),
        promptBlock(vp.prompt, vp.anchor, vp.promptOpen, vp.promptHint),
      ],
      'card',
      vp.badge,
    ),
    section(
      cc.anchor,
      cc.heading,
      [
        `<p class="lede">${esc(cc.intro)}</p>`,
        // A share sheet with JavaScript (main.ts), an email to yourself without it.
        `<p class="send"><a class="action" href="${esc(cc.sendToLaptop.href)}" data-share>${esc(cc.sendToLaptop.label)}</a></p>`,
        layersTable(),
        block(checklistId, cc.checklistHeading, checklist(checklistId)),
        aboutYou(cc.anchor),
        promptBlock(cc.prompt, cc.anchor),
        block(`${cc.anchor}-week`, cc.weekHeading, numbered(cc.week)),
      ],
      'card',
      cc.badge,
    ),
    section(ownership.anchor, ownership.heading, [
      `<p class="lede">${esc(ownership.intro)}</p>`,
      numbered(ownership.items),
    ]),
    section(sprint.anchor, sprint.heading, [
      `<p class="lede">${esc(sprint.intro)}</p>`,
      sprintWeeks(),
      `<p>${esc(sprint.outro)}</p>`,
      calendarLinks(),
    ]),
    waitlist(),
    // The one polite live region: "Copied to clipboard." Empty in the markup; `main.ts`
    // clears and refills it so a second copy of the same prompt is announced again.
    `<p id="ai101-live" class="visually-hidden" aria-live="polite"></p>`,
    `</main>`,
  ].join('\n');
}
