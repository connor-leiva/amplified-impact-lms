// /ai101's markup, as one string, from `content.ts`. DECISIONS.md D-028, D-032 and D-034.
//
// WHY A STRING RENDERER AND NOT A REACT ROUTE
// ------------------------------------------------------------------------------------------------
// The page is opened from a QR code on conference Wi-Fi, by a room of people behind one venue NAT,
// and the spec's acceptance list includes "usable with JavaScript disabled". So the whole page is
// ONE self-contained HTML response: every word of it in the initial bytes, an inline <style>, and
// one small inline <script>. The SPA's bundle is ~350 KB of JS before it renders a word, and as a
// separate request per file it would also spend the shared per-IP rate limit (`@fastify/rate-limit`,
// 100/min) that a whole session room shares.
//
// `vite-plugin.ts` calls these functions at build time (and per request in `pnpm dev`) and pours the
// result into `apps/web/ai101.html`. Nothing here runs in the browser.
//
// A STEP-THROUGH, PROGRESSIVELY (D-034)
// Every screen is a <section data-screen> in the markup, in order, each carrying its own header
// label, count and Next label as data attributes. Without JavaScript they all show, one after the
// other: a long page that still reads top to bottom, with links that work. `main.ts` turns the same
// markup into the design's one-screen-at-a-time flow: it shows the progress header and the Back /
// Next footer (both `hidden` here) and hides every screen but the current one.
//
// ESCAPING
// Every string from `content.ts` goes through `esc()`. `render.test.ts` proves it by rendering a
// copy of `PAGE` with markup in every string.
//
// THE <pre> CONTRACT
// Copying reads `pre[data-prompt-text].textContent`, so that text IS the prompt: the template adds
// nothing inside the <pre> (no leading newline, which the parser drops, no indentation), and the
// placeholder <mark>s add no characters of their own.

import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import signatureReversedSvg from '../assets/brand/amplified-impact-signature-reversed.svg?raw';
import { PAGE, UI, type CopyOpen, type FillField, type Inline, type LinkButton, type Prompt } from './content';

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text and attribute-value escaping. Quotes too, so one function is safe in both positions. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/**
 * A prompt's text with each `[bracketed placeholder]` wrapped in a <mark>. Escaped FIRST, then
 * wrapped: `esc()` never touches a bracket, so the pattern matches the same spans either way, and the
 * brackets stay inside the mark. They are part of what the visitor copies and fills in.
 */
export function highlightPlaceholders(text: string): string {
  return esc(text).replace(/\[[^\]\n]*\]/g, (span) => `<mark class="placeholder">${span}</mark>`);
}

/** Every link that leaves the site opens in a new tab, and gives the new page no handle on this one. */
const NEW_TAB = 'target="_blank" rel="noopener"';

/**
 * One run of inline copy (`content.ts`'s `Inline`). Every string is escaped here, so the only tags on
 * the page are the ones this function writes, never one that came from the copy.
 */
export function inline(segments: readonly Inline[]): string {
  return segments
    .map((seg) => {
      if (typeof seg === 'string') return esc(seg);
      if ('strong' in seg) return `<strong>${esc(seg.strong)}</strong>`;
      return `<a href="${esc(seg.href)}"${seg.sameTab ? '' : ` ${NEW_TAB}`}>${esc(seg.link)}</a>`;
    })
    .join('');
}

/**
 * A brand logo, inlined: no request (the page promised none beyond its fonts). The files are the
 * brand's own (`design-reference/brand`, held byte-identical by `scripts/reference-tokens.mjs`); here
 * they lose their fixed size, so the CSS sizes them, and gain an accessible name.
 */
function logo(svg: string, alt: string, className: string): string {
  return svg
    .trim()
    .replace(/\swidth="[^"]*"\s+height="[^"]*"/, '')
    .replace('<svg ', `<svg class="${esc(className)}" role="img" aria-label="${esc(alt)}" focusable="false" `);
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

// --- Building blocks ------------------------------------------------------------------------------

/** A link drawn as a button: `primary` (filled forest) or `outline`. */
function linkButton(button: LinkButton, kind: 'primary' | 'outline', extra = ''): string {
  return `<a class="btn btn-${kind}" href="${esc(button.href)}" ${NEW_TAB}${extra}>${esc(button.label)}</a>`;
}

/**
 * A "Copy & Open" button. A real `<a>`, so with JavaScript off it is still a link that opens the app;
 * with it, `main.ts` copies the prompt in `data-copy-open`'s block first and shows `data-toast`.
 * Described by its prompt's (visually hidden) label: two of them are "Copy & Open Claude".
 */
function copyOpenButton(open: CopyOpen, promptBlockId: string): string {
  return (
    `<a class="btn btn-primary" href="${esc(open.href)}" ${NEW_TAB} data-copy-open="${esc(promptBlockId)}" ` +
    `aria-describedby="${esc(promptBlockId)}-label" data-app="${esc(open.app)}" data-toast="${esc(open.toast)}">` +
    `<span data-copy-label>${esc(open.label)}</span></a>`
  );
}

/**
 * A prompt, collapsed under "See the full prompt" as the design has it. The block's id is the anchor
 * a link can point at; its label is visually hidden (it names the prompt for the buttons that copy
 * it). See THE <pre> CONTRACT above.
 */
function promptBlock(prompt: Prompt, id: string, summary: string): string {
  return [
    `<div class="prompt" id="${esc(id)}" data-prompt="${esc(prompt.id)}">`,
    `<p class="visually-hidden" id="${esc(id)}-label">${esc(prompt.label)}</p>`,
    `<details class="card disclosure">`,
    `<summary>${esc(summary)}</summary>`,
    `<pre data-prompt-text>${highlightPlaceholders(prompt.text)}</pre>`,
    `</details>`,
    `</div>`,
  ].join('\n');
}

/** A white card. */
const card = (inner: string, extra = '') => `<div class="card${extra ? ` ${extra}` : ''}">${inner}</div>`;

/**
 * A callout with a colored dot: `tip` (green) or `warn` (terracotta). The words are one <span>, so
 * bold runs inside them stay in the sentence instead of becoming columns of the flex row.
 */
const callout = (inner: string, tone: 'tip' | 'warn', strong = false) =>
  `<p class="callout callout-${tone}${strong ? ' callout-strong' : ''}"><span>${inner}</span></p>`;

/** A card of numbered steps, the numbers in mono: "Then, in the new chat: 1 Paste. 2 … 3 Send." */
function stepsCard(heading: string | null, steps: readonly (readonly Inline[])[]): string {
  // One <span> per step, for the same reason as `callout`'s.
  const items = steps.map((s) => `<li><span>${inline(s)}</span></li>`).join('');
  const head = heading ? `<p class="card-title">${esc(heading)}</p>` : '';
  return card(`${head}<ol class="numbered" role="list">${items}</ol>`);
}

/** Steps in forest circles: "Today you'll build two things" and "How a week works". */
const circled = (items: string[]) => `<ol class="circled" role="list">${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;

/**
 * Fields that fill a prompt's placeholders as they are typed. `hidden data-js-only`: without the
 * script nothing would read them, and a field that does nothing is worse than none.
 */
function fillFields(fields: readonly FillField[]): string {
  const rows = fields.map((f) => {
    const id = `field-${f.name}`;
    const hint = f.hint ? ` <span class="field-hint">${esc(f.hint)}</span>` : '';
    const control =
      f.rows !== undefined
        ? `<textarea id="${id}" name="${esc(f.name)}" rows="${f.rows}" placeholder="${esc(f.placeholder)}" data-field="${esc(f.name)}"></textarea>`
        : `<input id="${id}" name="${esc(f.name)}" type="text" placeholder="${esc(f.placeholder)}" autocomplete="off" data-field="${esc(f.name)}">`;
    return `<div class="field"><label for="${id}">${esc(f.label)}${hint}</label>${control}</div>`;
  });
  return `<div class="fields" hidden data-js-only>${rows.join('')}</div>`;
}

/**
 * One screen. `data-stage`, `data-count` and `data-next` carry what the header and footer show while
 * it is current, so the script needs nothing from `content.ts`. The heading takes focus when the
 * screen is entered (`tabindex="-1"`), which is what a screen reader then reads.
 */
function screen(index: number, body: string[], className = ''): string {
  const s = PAGE.screens[index]!;
  const attrs =
    ` data-screen="${index}" data-stage="${esc(s.stage)}"` +
    (s.count ? ` data-count="${esc(s.count)}"` : '') +
    (s.next ? ` data-next="${esc(s.next)}"` : '');
  const cls = `screen${className ? ` ${className}` : ''}`;
  return [`<section id="${esc(s.anchor)}" class="${cls}" aria-labelledby="${esc(s.anchor)}-heading"${attrs}>`, ...body, `</section>`].join(
    '\n',
  );
}

const h2 = (anchor: string, text: string) => `<h2 id="${esc(anchor)}-heading" tabindex="-1">${esc(text)}</h2>`;
const anchorOf = (index: number) => PAGE.screens[index]!.anchor;

// --- The screens ----------------------------------------------------------------------------------

function welcome(): string {
  const w = PAGE.welcome;
  const apps = w.getApp.apps
    .map(
      ({ label, href }) =>
        `<a class="btn btn-outline" href="${esc(href.web)}" ${NEW_TAB} data-ios="${esc(href.ios)}" ` +
        `data-android="${esc(href.android)}" data-get-app>${esc(label)}</a>`,
    )
    .join('');
  return screen(0, [
    logo(signatureSvg, w.logoAlt, 'logo'),
    `<p class="eyebrow">${esc(w.eyebrow)}</p>`,
    `<h1 id="${anchorOf(0)}-heading" tabindex="-1">${esc(w.title)}</h1>`,
    `<p class="lede">${esc(w.intro)}</p>`,
    card(
      `<p class="card-title card-title-lg">${esc(w.getApp.heading)}</p><p class="muted">${esc(w.getApp.body)}</p><div class="row">${apps}</div>`,
      'card-roomy',
    ),
    `<div class="builds"><p class="builds-lead">${esc(w.buildsLead)}</p>` +
      circled(w.builds.map((b) => `<span><strong>${esc(b.name)}</strong>${esc(b.detail)}</span>`)) +
      `</div>`,
    `<a class="skip" href="${esc(w.skip.href)}">${esc(w.skip.label)}</a>`,
  ]);
}

function samples(): string {
  const s = PAGE.samples;
  return screen(1, [
    h2(anchorOf(1), s.heading),
    `<p class="lede">${esc(s.intro)}</p>`,
    `<ul class="tiles" role="list">${s.items.map((i) => `<li class="card tile">${esc(i)}</li>`).join('')}</ul>`,
    callout(esc(s.tip), 'tip'),
  ]);
}

function voiceCopy(): string {
  const v = PAGE.voiceCopy;
  const id = `${PAGE.screens[1]!.anchor}-prompt`; // "voice-profile-prompt", the anchor the slides use
  return screen(2, [
    h2(anchorOf(2), v.heading),
    fillFields(v.fields),
    `<div class="stack">${v.open.map((o) => copyOpenButton(o, id)).join('')}</div>`,
    stepsCard(v.thenHeading, v.then),
    promptBlock(PAGE.voicePrompt, id, v.showPrompt),
    `<p class="note">${esc(v.note)}</p>`,
  ]);
}

/**
 * Save it: a Claude / ChatGPT switch over two panels. Without the script both panels show, each
 * under its app's name; with it, the switch (hidden until then) shows one.
 */
function save(): string {
  const s = PAGE.save;
  const panel = (key: 'claude' | 'chatgpt') => {
    const p = s[key];
    return (
      `<div class="card pick-panel" data-pick-panel="${key}">` +
      `<h3 class="pick-title">${esc(p.tab)}</h3>` +
      `<ol class="numbered" role="list">${p.steps.map((st) => `<li><span>${inline(st)}</span></li>`).join('')}</ol>` +
      linkButton(p.button, 'primary') +
      `<p class="small muted">${esc(p.note)}</p></div>`
    );
  };
  const pick = (key: 'claude' | 'chatgpt', pressed: boolean) =>
    `<button type="button" data-pick="${key}" aria-pressed="${pressed}">${esc(s[key].tab)}</button>`;
  return screen(3, [
    h2(anchorOf(3), s.heading),
    `<p class="lede">${esc(s.intro)}</p>`,
    `<div class="picker" role="group" aria-label="${esc(s.pickLabel)}" hidden data-js-only>${pick('claude', true)}${pick('chatgpt', false)}</div>`,
    panel('claude'),
    panel('chatgpt'),
  ]);
}

function test(): string {
  const t = PAGE.test;
  return screen(4, [
    h2(anchorOf(4), t.heading),
    `<p class="lede">${esc(t.intro)}</p>`,
    `<div class="pair">` +
      `<div class="card pair-card"><span class="pair-label">${esc(t.before.label)}</span><strong>${esc(t.before.text)}</strong></div>` +
      `<div class="card pair-card pair-after"><span class="pair-label">${esc(t.after.label)}</span><strong>${esc(t.after.text)}</strong></div>` +
      `</div>`,
    callout(esc(t.done), 'tip', true),
    card(
      `<p class="card-title card-title-lg">${esc(t.phone.heading)}</p><p class="muted">${esc(t.phone.body)}</p>` +
        // A share sheet with JavaScript (main.ts), an email to yourself without it.
        `<a class="btn btn-outline" href="${esc(t.phone.button.href)}" data-share>${esc(t.phone.button.label)}</a>`,
      'card-accent',
    ),
  ]);
}

function step2(): string {
  const s = PAGE.step2;
  return screen(5, [
    h2(anchorOf(5), s.heading),
    `<p class="lede">${esc(s.intro)}</p>`,
    `<ul class="tiles" role="list">${s.layers
      .map((l) => `<li class="card tile"><strong>${esc(l.title)}</strong><span class="muted">${esc(l.body)}</span></li>`)
      .join('')}</ul>`,
    callout(esc(s.warning), 'warn', true),
  ]);
}

function brand(): string {
  const b = PAGE.brand;
  const id = `${PAGE.screens[5]!.anchor}-brand-prompt`; // "carousel-creator-brand-prompt" (D-032)
  return screen(6, [
    h2(anchorOf(6), b.heading),
    copyOpenButton(b.open, id),
    stepsCard(b.thenHeading, b.then),
    `<p class="muted">${esc(b.tip)}</p>`,
    promptBlock(PAGE.brandPrompt, id, b.showPrompt),
    callout(inline(b.lastClick), 'warn'),
    linkButton(b.check, 'outline'),
    `<p class="small muted">${inline(b.capabilities)}</p>`,
  ]);
}

function about(): string {
  const a = PAGE.about;
  return screen(7, [h2(anchorOf(7), a.heading), `<p class="lede">${esc(a.intro)}</p>`, fillFields(a.fields)]);
}

function project(): string {
  const p = PAGE.project;
  const id = `${PAGE.screens[5]!.anchor}-prompt`; // "carousel-creator-prompt", the anchor the slides use
  return screen(8, [
    h2(anchorOf(8), p.heading),
    copyOpenButton(p.open, id),
    stepsCard(p.thenHeading, p.then),
    promptBlock(PAGE.carouselPrompt, id, p.showPrompt),
  ]);
}

/** The starter ideas: each one copies its own words (`data-copy-chip`). */
function firstIdea(): string {
  const f = PAGE.firstIdea;
  const chips = f.starters
    .map(
      (s) =>
        `<li><button type="button" class="starter" data-copy-chip data-toast="${esc(f.toast)}">` +
        `<span data-copy-label>${esc(s)}</span><span class="starter-tag" aria-hidden="true">${esc(f.chipTag)}</span></button></li>`,
    )
    .join('');
  return screen(9, [
    h2(anchorOf(9), f.heading),
    `<p class="lede">${esc(f.intro)}</p>`,
    `<ul class="starters" role="list">${chips}</ul>`,
    callout(esc(f.done), 'tip', true),
  ]);
}

function week(): string {
  const { week: w, ownership: o, sprint: s } = PAGE;
  const weeks = s.weeks
    .map(
      ({ week: wk, pillar }) =>
        `<li class="card week"><span class="week-label">${esc(wk)}<span class="visually-hidden">:</span></span> ` +
        `<span class="week-pillar">${esc(pillar)}</span></li>`,
    )
    .join('');
  return screen(10, [
    h2(anchorOf(10), w.heading),
    circled(w.steps.map((st) => `<span>${esc(st)}</span>`)),
    `<div class="card own" id="${esc(o.anchor)}">` +
      `<h3 class="card-title card-title-lg">${esc(o.heading)}</h3><p class="muted small">${esc(o.intro)}</p>` +
      `<ul class="dotted" role="list">${o.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`,
    `<div class="sprint" id="${esc(s.anchor)}">` +
      `<h3 class="card-title card-title-lg">${esc(s.heading)}</h3><p class="muted">${esc(s.body)}</p>` +
      `<ul class="weeks" role="list">${weeks}</ul>` +
      // The .ics stays in this tab, where iOS offers "Add to Calendar".
      `<div class="row"><a class="btn btn-outline" href="${esc(s.calendar.apple.href)}">${esc(s.calendar.apple.label)}</a>` +
      linkButton(s.calendar.google, 'outline') +
      `</div></div>`,
  ]);
}

/** A waitlist input with a visually hidden label (the design shows the placeholder) and its error line. */
function waitlistField(name: 'firstName' | 'email' | 'phone' | 'brokerage', placeholder: string, attrs: string): string {
  const id = `waitlist-${name}`;
  return (
    `<div class="wl-field"><label class="visually-hidden" for="${id}">${esc(placeholder)}</label>` +
    `<input id="${id}" name="${name}" placeholder="${esc(placeholder)}" ${attrs}>` +
    `<p class="field-error" id="${name}-error"></p></div>`
  );
}

/**
 * The December waitlist, on the design's dark card.
 *
 * Without JavaScript this is a plain form POST: native `required`/`type=email` validation (there is
 * deliberately no `novalidate` in the markup; `main.ts` sets `noValidate` at runtime, once it is
 * there to validate instead), then the API answers 303 to `/ai101#waitlist-joined` or
 * `/ai101#waitlist-error`, and `:target` in the CSS shows the matching line. That is why the
 * form-level error carries its text in the markup.
 *
 * The SMS box is unchecked and optional, and its label is the consent itself, stored word for word
 * by the API (D-034). The honeypot is off-screen rather than `display: none`, which form-filling
 * bots know to skip, and `aria-hidden` with `tabindex="-1"` so no person ever lands in it.
 */
function waitlist(): string {
  const w = PAGE.waitlist;
  const f = w.fields;
  const form = [
    `<form id="waitlist-form" class="wl-form" method="post" action="/api/ai101/waitlist">`,
    waitlistField('firstName', f.firstName, 'type="text" required autocomplete="given-name" maxlength="80"'),
    waitlistField('email', f.email, 'type="email" required autocomplete="email" maxlength="254" inputmode="email"'),
    waitlistField('phone', f.phone, 'type="tel" autocomplete="tel" maxlength="24" inputmode="tel"'),
    waitlistField('brokerage', f.brokerage, 'type="text" autocomplete="organization" maxlength="120"'),
    `<div class="wl-sms"><input id="waitlist-sms" name="smsConsent" type="checkbox" value="on">` +
      `<label for="waitlist-sms">${esc(w.sms)}</label></div>`,
    `<div class="field-website" aria-hidden="true">`,
    `<label for="waitlist-website">${esc(HONEYPOT_LABEL)}</label>`,
    `<input id="waitlist-website" name="website" type="text" tabindex="-1" autocomplete="off">`,
    `</div>`,
    `<p class="form-error" id="waitlist-error" role="alert">${esc(UI.errors.generic)}</p>`,
    `<button type="submit" class="btn btn-cream">${esc(w.button)}</button>`,
    `<p class="wl-legal">${inline(w.legal)}</p>`,
    `</form>`,
  ].join('\n');
  return screen(
    11,
    [
      logo(signatureReversedSvg, w.logoAlt, 'logo logo-reversed'),
      `<p class="eyebrow eyebrow-mint">${esc(w.eyebrow)}</p>`,
      h2(anchorOf(11), w.heading),
      `<p class="wl-body">${esc(w.body)}</p>`,
      `<p id="waitlist-joined" class="wl-success" tabindex="-1">${esc(w.success)}</p>`,
      form,
    ],
    'waitlist',
  );
}

// --- The page ---------------------------------------------------------------------------------------

/**
 * The sticky progress header. Filled and shown by `main.ts` once the step-through is running
 * (`data-steps-chrome`), never before: without it there is no "current" screen to report.
 */
function stepsHeader(): string {
  const first = PAGE.screens[0]!;
  return [
    `<header class="steps-head" hidden data-steps-chrome>`,
    `<div class="steps-head-inner">`,
    `<div class="steps-head-row"><p class="stage" data-stage-label>${esc(first.stage)}</p><p class="count" data-count-label></p></div>`,
    `<div class="bar" aria-hidden="true"><div class="bar-fill" data-bar></div></div>`,
    `</div>`,
    `</header>`,
  ].join('\n');
}

/** The fixed footer: Back, the big green Next (its label is the screen's), and Start Over on the last. */
function stepsNav(): string {
  const n = PAGE.nav;
  const first = PAGE.screens[0]!;
  return [
    `<nav class="steps-nav" aria-label="${esc(n.label)}" hidden data-steps-chrome>`,
    `<div class="steps-nav-inner">`,
    `<button type="button" class="nav-back" data-back hidden>${esc(n.back)}</button>`,
    `<button type="button" class="nav-next" data-next><span data-next-label>${esc(first.next ?? '')}</span></button>`,
    `<button type="button" class="nav-restart" data-restart hidden>${esc(n.restart)}</button>`,
    `</div>`,
    `</nav>`,
  ].join('\n');
}

/** Everything inside <body>: the header, every screen in order, the footer, and the toast. */
export function renderAi101Body(): string {
  return [
    stepsHeader(),
    `<main class="page" data-steps>`,
    welcome(),
    samples(),
    voiceCopy(),
    save(),
    test(),
    step2(),
    brand(),
    about(),
    project(),
    firstIdea(),
    week(),
    waitlist(),
    `</main>`,
    stepsNav(),
    // The one polite live region, drawn as the design's toast: "Copied. Paste it into the new
    // ChatGPT chat." Empty in the markup; `main.ts` clears and refills it so a second copy of the
    // same prompt is announced again, and empties it when the toast's time is up.
    `<p id="ai101-live" class="toast" role="status" aria-live="polite"></p>`,
  ].join('\n');
}
