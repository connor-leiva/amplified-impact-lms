// A free guide's landing page, as strings, from its content. DECISIONS.md D-038, D-039 and D-045.
//
// Built like /ai101 (D-028): ONE self-contained HTML response per guide, the shared stylesheet and
// the shared script inlined at build time by `vite-plugin.ts`, so the only other requests are the font
// files and, once the visitor has opted in, the PDF. Visitors arrive from a ManyChat DM, which means
// Instagram's in-app browser on a phone: the page has to be fast and work there.
//
// THE GATE. The opt-in form and the download are both in the markup. The download starts hidden and
// shows when the visitor has opted in: with the script, once the API has stored the sign-up (and on
// every later visit from that device); without it, through the API's 303 to `#download`, which the
// CSS shows with `:target`. It is a soft gate, as lead magnets are: the PDF is a plain file.
//
// A SKILL (D-045). A download with `setup` is not done once it is saved: the unlocked card holds its
// steps instead of one button, the download among them, and on a phone a line to finish on a computer
// with a button that sends the page there. Words to say to Claude are buttons that copy them.
//
// A PAID SKILL (D-082). Its page keeps the hero and the sample. The Skill Library card takes the
// opt-in card's place, with no form and no setup, so no link to a ZIP is in the markup at all; the
// buttons that led back up to the opt-in go to the plans instead.
//
// Every string goes through `esc()`; nothing here runs in the browser.

import signatureReversedSvg from '../assets/brand/amplified-impact-signature-reversed.svg?raw';
import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import {
  GUIDES,
  inSkillLibrary,
  SHARED,
  SITE,
  type GrokLane,
  type Guide,
  type Handoff,
  type Inline,
  type OtherApp,
  type SampleBlock,
  type Section,
  type SetupStep,
} from './content';
import { UI } from './ui';

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text and attribute-value escaping. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** One run of inline copy. Links open in a new tab, so the form stays, unless marked `sameTab`. */
function inline(segments: readonly Inline[]): string {
  return segments
    .map((seg) => {
      if (typeof seg === 'string') return esc(seg);
      if ('strong' in seg) return `<strong>${esc(seg.strong)}</strong>`;
      const target = seg.sameTab ? '' : ' target="_blank" rel="noopener"';
      return `<a href="${esc(seg.href)}"${target}>${esc(seg.link)}</a>`;
    })
    .join('');
}

/** A brand logo, inlined (no request), sized by the CSS, with an accessible name. */
function logo(svg: string, alt: string, className: string): string {
  return svg
    .trim()
    .replace(/\swidth="[^"]*"\s+height="[^"]*"/, '')
    .replace('<svg ', `<svg class="${esc(className)}" role="img" aria-label="${esc(alt)}" focusable="false" `);
}

/** Off-screen, `aria-hidden`, never tabbed to: only a form-filling bot reads it. */
const HONEYPOT_LABEL = 'Leave this field empty';

/** The guide for a slug, or a build error naming it. */
export function guideFor(slug: string): Guide {
  const guide = GUIDES[slug];
  if (!guide) throw new Error(`No guide has the slug "${slug}". Add it to GUIDES in src/guides/content.ts.`);
  return guide;
}

/** The <head> lines that come from the guide's content. */
export function renderGuideHead(guide: Guide): string {
  const { title, description } = guide.meta;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(`${SITE.origin}/${guide.slug}`)}" />`,
    `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join('\n    ');
}

function hero(guide: Guide): string {
  const h = guide.hero;
  const steps = h.steps
    .map(
      (s) =>
        `<li><span class="step-n">${esc(s.n)}</span><strong>${esc(s.title)}</strong><span class="step-body">${esc(s.body)}</span></li>`,
    )
    .join('');
  return [
    `<header class="hero">`,
    `<div class="wrap">`,
    logo(signatureReversedSvg, SHARED.logoAlt, 'logo'),
    `<p class="eyebrow">${esc(h.eyebrow)}</p>`,
    `<h1>${esc(h.title)}</h1>`,
    `<p class="lede">${esc(h.lede)}</p>`,
    `<ol class="steps" role="list">${steps}</ol>`,
    `</div>`,
    `</header>`,
  ].join('\n');
}

/** A labelled input and its error line (empty until `main.ts` fills it). */
function field(name: 'firstName' | 'email', label: string, attrs: string): string {
  const id = `guide-${name}`;
  return (
    `<div class="field"><label for="${id}">${esc(label)}</label>` +
    `<input id="${id}" name="${name}" ${attrs}>` +
    `<p class="field-error" id="${name}-error"></p></div>`
  );
}

/** "Download Here", saved under the guide's own name, and the in-app browser line that goes with it. */
function downloadButton(guide: Guide): string {
  const d = guide.download;
  return [
    `<a class="btn btn-primary" href="${esc(d.href)}" download="${esc(d.filename)}" data-download>${esc(SHARED.downloadButton)}</a>`,
    `<p class="in-app" hidden data-in-app>${esc(d.inApp ?? SHARED.inApp)}</p>`,
  ].join('\n');
}

/**
 * Words to say to Claude, as a button that copies them (`main.ts`, which reads `data-toast`). Named
 * "Copy: <the words>", so a screen reader never hears a button called "Edit this into a Reel". With no
 * script the words are still there to read and select.
 */
function copyChip(words: string, toast: string = SHARED.copy.copied): string {
  return (
    `<button type="button" class="chip" data-copy data-toast="${esc(toast)}">` +
    `<span class="visually-hidden">${esc(SHARED.copy.tag)}: </span><span data-copy-text>${esc(words)}</span>` +
    `<span class="chip-tag" aria-hidden="true">${esc(SHARED.copy.tag)}</span></button>`
  );
}

/**
 * Longer words to paste (a Project's instructions, D-052): the copy chip's button and script, drawn
 * as a block that keeps its line breaks. The words are the button's text, so a screen reader hears
 * what it copies.
 */
function copyBlock(words: string, toast: string = SHARED.copy.copied): string {
  return (
    `<button type="button" class="chip chip-block" data-copy data-toast="${esc(toast)}">` +
    `<span class="visually-hidden">${esc(SHARED.copy.tag)}: </span><span class="chip-block-text" data-copy-text>${esc(words)}</span>` +
    `<span class="chip-tag" aria-hidden="true">${esc(SHARED.copy.tag)}</span></button>`
  );
}

/**
 * On a phone or tablet, the line to finish on a computer. Shown by the CSS on a touch screen only. The button is
 * a `mailto:` with the page's address; `main.ts` opens the share sheet instead where there is one,
 * with what `data-share-*` names.
 */
function handoff(h: Handoff): string {
  return [
    `<div class="handoff">`,
    `<p>${esc(h.body)}</p>`,
    `<a class="btn btn-outline" href="${esc(h.href)}" data-share data-share-title="${esc(h.share.title)}" data-share-url="${esc(h.share.url)}">${esc(h.label)}</a>`,
    `</div>`,
  ].join('\n');
}

/**
 * A setup step's button: the download itself, another file saved under its own name (D-052), or a
 * page in the app, in a new tab.
 */
function setupAction(guide: Guide, action: SetupStep['action']): string {
  if (action === undefined) return '';
  // A paid page's file (D-101): the step stays, and its button goes to the Skill Library, where the
  // file is. The page links no ZIP.
  if (inSkillLibrary(guide) && (action === 'download' || action.download !== undefined)) {
    const get = SHARED.skillLibrary.get;
    return `<a class="btn btn-outline" href="${esc(get.href)}" target="_blank" rel="noopener">${esc(get.label)}</a>`;
  }
  if (action === 'download') return downloadButton(guide);
  if (action.download !== undefined) {
    return `<a class="btn btn-outline" href="${esc(action.href)}" download="${esc(action.download)}">${esc(action.label)}</a>`;
  }
  return `<a class="btn btn-outline" href="${esc(action.href)}" target="_blank" rel="noopener">${esc(action.label)}</a>`;
}

type App = keyof typeof SHARED.copyOpen;
/** A lane of the app switch: an app a button can open, or Grok Bot, which none can (D-108). */
type Lane = App | 'grok';

/**
 * "Copy & Open Claude" (or ChatGPT) under a step's words (D-070). A real link, so with JavaScript off
 * it still opens the app; with it, `main.ts` copies the step's words first and shows `data-toast`.
 */
function copyOpen(app: App): string {
  const o = SHARED.copyOpen[app];
  return `<a class="btn btn-primary copy-open" href="${esc(o.href)}" target="_blank" rel="noopener" data-copy-open data-toast="${esc(o.toast)}">${esc(o.label)}</a>`;
}

/**
 * What to do with the download once it is saved, in the unlocked card (D-045). Numbered, every step
 * showing, with no script; with it, `main.ts` shows one step at a time with Back and Next and
 * remembers the visitor's place under `data-guided-key` (D-070). A step with words to say gets the
 * copy chip and a "Copy & Open" for its app.
 */
function setup(guide: Guide, steps: readonly SetupStep[], app: Lane = 'claude'): string {
  // A Grok Bot template's steps (D-100), and a skill's Grok Bot lane (D-108), happen in Grok Bot, which
  // no button can open: the words are copied, with a toast that names Grok Bot, and nothing says Claude.
  const grok = app === 'grok' || guide.grok !== undefined;
  const toast = grok ? SHARED.copy.copiedGrok : SHARED.copy.copied;
  const opens = (a: Lane) => (grok || a === 'grok' ? '' : copyOpen(a));
  const items = steps
    .map((s, i) =>
      [
        `<li class="setup-step" data-step="${i + 1}">`,
        `<span class="setup-n" aria-hidden="true">${i + 1}</span>`,
        `<div class="setup-body">`,
        `<h3 tabindex="-1">${esc(s.title)}</h3>`,
        `<p>${inline(s.body)}</p>`,
        // A template's file is an extra to its copy (D-100), so it comes after the words to paste.
        grok ? '' : setupAction(guide, s.action),
        // Short words: the chip, then the button. A long block (a Project's instructions, the Task Sync
        // prompt) runs screens long on a phone, so its button comes first, under the instruction.
        s.copy ? copyChip(s.copy, toast) + opens(app) : '',
        s.copyBlock ? opens(app) + copyBlock(s.copyBlock, toast) : '',
        grok ? setupAction(guide, s.action) : '',
        s.note ? `<p class="setup-note">${inline(s.note)}</p>` : '',
        `</div>`,
        `</li>`,
      ]
        .filter(Boolean)
        .join(''),
    )
    .join('\n');
  const g = SHARED.guided;
  const progress = `<p class="guided-progress" data-guided-progress="${esc(g.progress)}" hidden></p>`;
  return [
    `<div class="guided" data-guided data-guided-key="${esc(`${guide.unlockKey}-step-${grok ? 'grok' : app}`)}">`,
    // A skill page names the checklist, with the step count beside it (D-071).
    guide.layout === 'skill'
      ? `<div class="guided-head"><p class="guided-title">${esc(SHARED.skill.setupTitle)}</p>${progress}</div>`
      : progress,
    `<ol class="setup" role="list">\n${items}\n</ol>`,
    `<div class="guided-nav" data-guided-nav hidden>`,
    `<button type="button" class="btn btn-outline" data-guided-back>${esc(g.back)}</button>`,
    `<button type="button" class="btn btn-primary" data-guided-next>${esc(g.next)}</button>`,
    `<button type="button" class="btn btn-outline" data-guided-restart hidden>${esc(g.startOver)}</button>`,
    `</div>`,
    `</div>`,
  ].join('\n');
}

/**
 * A skill that also works in ChatGPT (D-052): which app, then that app's steps. Two radio buttons and
 * CSS (`skills.css`), no script, so it works with JavaScript off and in Safari 13: the inputs come
 * before the step lists as their siblings, and `:checked ~` shows one list. Claude is checked to
 * start. With no CSS at all, every list shows, each under its heading. A skill with a Grok Bot lane
 * (D-108) has three buttons, Grok Bot first and checked to start.
 */
function appSetups(guide: Guide, claude: readonly SetupStep[], other: OtherApp, grok?: GrokLane): string {
  const lanes: ReadonlyArray<{ id: Lane; label: string; steps: readonly SetupStep[] }> = [
    ...(grok ? [{ id: 'grok' as const, label: grok.label, steps: grok.setup }] : []),
    { id: 'claude', label: other.claude, steps: claude },
    { id: 'chatgpt', label: other.chatgpt, steps: other.setup },
  ];
  return [
    `<div class="apps">`,
    `<p class="apps-q" id="apps-q">${esc(other.question)}</p>`,
    ...lanes.map(
      (l, i) =>
        `<input class="app-radio" type="radio" name="app" id="app-${l.id}" value="${l.id}"${i === 0 ? ' checked' : ''} aria-describedby="apps-q">`,
    ),
    `<div class="app-switch${lanes.length > 2 ? ' app-switch-3' : ''}">${lanes.map((l) => `<label for="app-${l.id}">${esc(l.label)}</label>`).join('')}</div>`,
    ...lanes.flatMap((l) => [
      `<div class="app-setup app-setup-${l.id}">`,
      `<h3 class="app-heading">${esc(`In ${l.label}`)}</h3>`,
      setup(guide, l.steps, l.id),
      `</div>`,
    ]),
    `</div>`,
  ].join('\n');
}

/**
 * A skill's steps, as the free page draws them once unlocked: the app switch when it also works in
 * ChatGPT, else the one list.
 */
function setupSteps(guide: Guide): string {
  const d = guide.download;
  if (d.setup && d.chatgpt) return appSetups(guide, d.setup, d.chatgpt, d.grok);
  return d.setup ? setup(guide, d.setup) : '';
}

/**
 * A paid skill's card (D-082), where the opt-in was: where the skill is now, the plans, and the
 * platform's sign-in for people who already bought one. Under it, the same guided setup as the free
 * page (D-101), with every file a button to the Skill Library (`setupAction`), so the page links no
 * ZIP. No form and no `data-unlock-key`, so the sign-up script leaves it alone. It wears the opt-in
 * card's classes (`optin`, `locked`, `form`, `legal`) to sit and look the same: guides.css and
 * skills.css are inlined into the free skill's page too, which stays as it was.
 */
function libraryCard(guide: Guide): string {
  const l = SHARED.skillLibrary;
  const how = setupSteps(guide);
  return [
    `<section id="${esc(l.anchor)}" class="card optin" aria-labelledby="library-heading" data-skill-library>`,
    `<div class="locked">`,
    `<h2 id="library-heading">${esc(l.heading)}</h2>`,
    `<p>${esc(l.body)}</p>`,
    `<div class="form">`,
    `<a class="btn btn-primary" href="${esc(l.plans.href)}">${esc(l.plans.label)}</a>`,
    `<p class="legal">${esc(l.signIn.lead)} <a href="${esc(l.signIn.href)}">${esc(l.signIn.label)}</a></p>`,
    `</div>`,
    `</div>`,
    how ? `<div class="library-setup">\n${how}\n</div>` : '',
    `</section>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * The button under "What you need": back up to the opt-in, or, for a paid skill, to the plans
 * (D-082).
 */
function needCta(guide: Guide, className: string): string {
  if (inSkillLibrary(guide)) {
    const plans = SHARED.skillLibrary.plans;
    return `<a class="${esc(className)}" href="${esc(plans.href)}">${esc(plans.label)}</a>`;
  }
  return `<a class="${esc(className)}" href="#${esc(guide.optIn.anchor)}">${esc(guide.optIn.button)}</a>`;
}

/**
 * The opt-in and, in the same card, the download it unlocks. A paid skill's page has the Skill
 * Library card instead.
 *
 * Without JavaScript the form is a plain POST (native `required` and `type=email` validation; no
 * `novalidate` in the markup, `main.ts` sets it once it validates instead), and the API answers 303 to
 * `#download` or `#guide-error`, which `:target` shows. With it, `main.ts` posts JSON, sets
 * `data-state="unlocked"` on the card, and remembers that under the card's `data-unlock-key`.
 */
function optIn(guide: Guide): string {
  if (inSkillLibrary(guide)) return libraryCard(guide);
  const o = guide.optIn;
  const d = guide.download;
  const form = [
    `<form id="guide-form" class="form" method="post" action="/api/${esc(guide.slug)}">`,
    field('firstName', SHARED.fields.firstName, 'type="text" required autocomplete="given-name" maxlength="80"'),
    field('email', SHARED.fields.email, 'type="email" required autocomplete="email" maxlength="254" inputmode="email"'),
    `<div class="field-website" aria-hidden="true"><label for="guide-website">${esc(HONEYPOT_LABEL)}</label>` +
      `<input id="guide-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>`,
    `<p class="form-error" id="guide-error" role="alert">${esc(UI.errors.generic)}</p>`,
    `<button type="submit" class="btn btn-primary">${esc(o.button)}</button>`,
    `<p class="legal">${inline(SHARED.legal)}</p>`,
    `</form>`,
  ].join('\n');
  const unlocked = [
    `<div id="download" class="unlocked" tabindex="-1">`,
    `<h2 id="download-heading">${esc(d.heading)}</h2>`,
    `<p>${esc(d.body)}</p>`,
    d.handoff ? handoff(d.handoff) : '',
    setupSteps(guide) || downloadButton(guide),
    `</div>`,
  ]
    .filter(Boolean)
    .join('\n');
  return [
    `<section id="${esc(o.anchor)}" class="card optin" aria-labelledby="optin-heading" data-unlock-key="${esc(guide.unlockKey)}">`,
    `<div class="locked">`,
    `<h2 id="optin-heading">${esc(o.heading)}</h2>`,
    `<p>${esc(o.body)}</p>`,
    form,
    `</div>`,
    unlocked,
    `</section>`,
  ].join('\n');
}

/** Each section's heading id comes from its position, so two of a kind never collide. */
function section(guide: Guide, s: Section, i: number): string {
  const id = `s${i + 1}-heading`;
  switch (s.kind) {
    case 'example': {
      const rows = s.task.rows
        .map((r) => `<div class="row"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`)
        .join('');
      return [
        `<section class="example" aria-labelledby="${id}">`,
        `<p class="eyebrow eyebrow-dark">${esc(s.eyebrow)}</p>`,
        `<h2 id="${id}">${esc(s.heading)}</h2>`,
        `<p class="lede-dark">${esc(s.body)}</p>`,
        `<figure class="quote"><blockquote>${esc(s.quote)}</blockquote><figcaption>${esc(s.quoteSource)}</figcaption></figure>`,
        `<div class="card task"><p class="task-title">${esc(s.task.title)}</p><dl>${rows}</dl></div>`,
        `</section>`,
      ].join('\n');
    }
    case 'report': {
      // A real table, read as one by a screen reader. Under 640px the CSS lays each row out as a
      // small card, where the "hrs/wk" and "AI-ready:" words stand in for the hidden headers.
      const rows = s.rows
        .map(
          (r) =>
            `<tr><th scope="row" class="cat">${esc(r.category)}</th>` +
            `<td class="hrs">${esc(r.hours)}<span class="unit"> hrs/wk</span></td>` +
            `<td class="ev">${esc(r.evidence)}</td>` +
            `<td class="tag-cell"><span class="tag tag-${esc(r.tag.toLowerCase())}">${esc(r.tag)}</span></td>` +
            `<td class="ready"><span class="ready-label">AI-ready: </span>${esc(r.ready)}</td></tr>`,
        )
        .join('');
      return [
        `<section class="report" aria-labelledby="${id}">`,
        `<p class="eyebrow eyebrow-dark">${esc(s.eyebrow)}</p>`,
        `<h2 id="${id}">${esc(s.heading)}</h2>`,
        `<p class="lede-dark">${esc(s.body)}</p>`,
        `<div class="card report-card">`,
        `<div class="report-head"><p class="report-title" id="${id}-table">${esc(s.title)}</p><p class="note">${esc(s.note)}</p></div>`,
        `<table class="report-table" aria-labelledby="${id}-table">`,
        `<thead><tr><th scope="col">Category</th><th scope="col">Est. hrs/wk</th><th scope="col">Evidence</th><th scope="col">Tag</th><th scope="col">AI-ready</th></tr></thead>`,
        `<tbody>${rows}</tbody>`,
        `</table>`,
        `<p class="verdict"><strong>${esc(s.verdict.lead)}</strong> ${esc(s.verdict.body)}</p>`,
        `</div>`,
        `</section>`,
      ].join('\n');
    }
    case 'list': {
      const items = s.items
        .map((it) => `<li><strong>${esc(it.title)}</strong><span>${esc(it.body)}</span></li>`)
        .join('');
      return [
        `<section class="inside" aria-labelledby="${id}">`,
        `<h2 id="${id}">${esc(s.heading)}</h2>`,
        `<ul class="list" role="list">${items}</ul>`,
        `</section>`,
      ].join('\n');
    }
    case 'tiles': {
      const items = s.items
        .map(
          (it) =>
            `<li class="card">` +
            (it.label ? `<span class="tile-label">${esc(it.label)}</span>` : '') +
            `<strong>${esc(it.title)}</strong><span>${esc(it.body)}</span>` +
            (it.tag ? `<span class="tile-tag">${esc(it.tag)}</span>` : '') +
            `</li>`,
        )
        .join('');
      const note = s.note ? `<p class="note">${esc(s.note)}</p>` : '';
      return [
        `<section class="need" aria-labelledby="${id}">`,
        `<div class="need-head"><h2 id="${id}">${esc(s.heading)}</h2>${note}</div>`,
        `<ul class="tiles${s.columns === 2 ? ' tiles-2' : ''}" role="list">${items}</ul>`,
        s.cta ? needCta(guide, 'btn btn-outline') : '',
        `</section>`,
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'compare': {
      // Plain <video>s: controls, inline on iOS, and nothing fetched but the poster until one is
      // played, so the page stays one fast response in Instagram's browser. The figure's caption
      // names each one.
      const clips = s.clips
        .map((c) =>
          [
            `<figure class="clip">`,
            `<video controls playsinline preload="none" poster="${esc(c.poster)}" width="${c.width}" height="${c.height}">`,
            `<source src="${esc(c.src)}" type="video/mp4">`,
            `</video>`,
            `<figcaption><span class="clip-label">${esc(c.label)} · ${esc(c.length)}</span> ${esc(c.caption)}</figcaption>`,
            `</figure>`,
          ].join(''),
        )
        .join('\n');
      return [
        `<section class="compare" aria-labelledby="${id}">`,
        `<p class="eyebrow eyebrow-dark">${esc(s.eyebrow)}</p>`,
        `<h2 id="${id}">${esc(s.heading)}</h2>`,
        `<p class="lede-dark">${esc(s.body)}</p>`,
        `<div class="compare-grid">${clips}</div>`,
        `</section>`,
      ].join('\n');
    }
    case 'prompts': {
      const groups = s.groups
        .map(
          (g) =>
            `<h3 class="group-label">${esc(g.label)}</h3>` +
            `<ul class="chips" role="list">${g.items.map((w) => `<li>${copyChip(w)}</li>`).join('')}</ul>`,
        )
        .join('\n');
      return [
        `<section class="prompts" aria-labelledby="${id}">`,
        `<h2 id="${id}">${esc(s.heading)}</h2>`,
        `<p class="lede-dark">${esc(s.body)}</p>`,
        groups,
        `</section>`,
      ].join('\n');
    }
    case 'faq': {
      // <details>, so every answer opens with no script.
      const items = s.items
        .map((it) => `<details class="faq-item"><summary>${esc(it.q)}</summary><p>${inline(it.a)}</p></details>`)
        .join('');
      return [
        `<section class="faq" aria-labelledby="${id}">`,
        `<h2 id="${id}">${esc(s.heading)}</h2>`,
        `<div class="faq-list">${items}</div>`,
        `</section>`,
      ].join('\n');
    }
    case 'note':
      return `<p class="crosslink">${inline(s.body)}</p>`;
    case 'sample':
      return [
        `<section class="sample" aria-labelledby="${id}">`,
        `<p class="eyebrow eyebrow-dark">${esc(s.eyebrow)}</p>`,
        `<h2 id="${id}">${esc(s.heading)}</h2>`,
        `<p class="lede-dark">${esc(s.body)}</p>`,
        `<article class="card sample-doc" aria-labelledby="${id}-title">`,
        `<div class="sample-head"><p class="sample-title" id="${id}-title">${esc(s.title)}</p><p class="note">${esc(s.note)}</p></div>`,
        ...s.blocks.map((b, j) => sampleBlock(b, `${id}-t${j + 1}`)),
        `</article>`,
        `</section>`,
      ].join('\n');
  }
}

/**
 * One piece of a sample. A table sits in a region that scrolls sideways on a phone; the region is
 * focusable, named by the table's caption, so a keyboard can scroll it too.
 */
function sampleBlock(b: SampleBlock, id: string): string {
  if ('h' in b) return `<h3 class="sample-h">${esc(b.h)}</h3>`;
  if ('p' in b) return `<p class="sample-p">${inline(b.p)}</p>`;
  if ('items' in b) return `<ul class="sample-list">${b.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>`;
  if ('table' in b) {
    const t = b.table;
    const head = t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
    const rows = t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
    return (
      `<div class="sample-table${t.head.length > 3 ? ' sample-table-wide' : ''}" role="region" tabindex="0" aria-labelledby="${id}">` +
      `<table><caption id="${id}">${esc(t.caption)}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`
    );
  }
  return (
    `<div class="sample-email"><p class="sample-subject"><span class="sample-subject-label">Subject: </span>${esc(b.email.subject)}</p>` +
    b.email.body.map((para) => `<p>${esc(para)}</p>`).join('') +
    `</div>`
  );
}

function footer(extraClass = ''): string {
  const f = SHARED.footer;
  const links = f.links
    .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.link)}</a>`)
    .join('<span aria-hidden="true"> · </span>');
  return [
    `<footer class="foot${extraClass ? ` ${esc(extraClass)}` : ''}">`,
    logo(signatureSvg, SHARED.logoAlt, 'logo logo-foot'),
    `<p>${esc(f.byline)}</p>`,
    `<p class="foot-links">${links}</p>`,
    `</footer>`,
  ].join('\n');
}

/** Whether anything on the page copies, and so needs the toast that says it did. A paid page draws its setup too (D-101). */
const copies = (guide: Guide) =>
  guide.sections.some((s) => s.kind === 'prompts') ||
  [...(guide.download.setup ?? []), ...(guide.download.chatgpt?.setup ?? []), ...(guide.download.grok?.setup ?? [])].some(
    (s) => s.copy !== undefined || s.copyBlock !== undefined,
  );

/** Everything inside <body>. */
export function renderGuideBody(guide: Guide): string {
  if (guide.layout === 'skill') return skillBody(guide);
  return [
    hero(guide),
    `<main class="page">`,
    optIn(guide),
    ...guide.sections.map((s, i) => section(guide, s, i)),
    `</main>`,
    footer(),
    // One polite live region, drawn as a toast: "Copied", or how to copy by hand when that failed.
    copies(guide) ? `<p id="guide-live" class="toast" role="status" aria-live="polite"></p>` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// --- A skill page in the library's look (D-071) ------------------------------------------------------
//
// The same content, the same opt-in and the same setup, laid out as the combined design the owner
// approved: a white top bar with the breadcrumb back to the library; a hero on the paper ground with
// the one eyebrow, the title, the lede and three facts as pills; the skill's own output beside the
// opt-in as a sheet of paper; and below, each section as a band. Every id, data attribute and class
// that `main.ts` and the gate's CSS read is unchanged, so the opt-in, the unlock, the copy buttons and
// the guided setup work as before. All of it styled in `skills.css` under `.sk`.

/** The top bar: the logo, then "The Library / <the skill>". */
function skillTop(guide: Guide): string {
  const lib = SHARED.skill.library;
  return [
    `<header class="sk-top">`,
    `<div class="sk-wrap sk-top-in">`,
    logo(signatureSvg, SHARED.logoAlt, 'sk-logo'),
    `<nav class="sk-crumbs" aria-label="Breadcrumb"><ol role="list">`,
    `<li><a href="${esc(lib.href)}">${esc(lib.label)}</a></li>`,
    `<li aria-current="page"><span class="sk-crumb-sep" aria-hidden="true">/</span>${esc(guide.hero.title)}</li>`,
    `</ol></nav>`,
    `</div>`,
    `</header>`,
  ].join('\n');
}

/** The hero's words: the page's one eyebrow, the title, the lede and the facts. */
function skillIntro(guide: Guide): string {
  const h = guide.hero;
  const facts = (guide.facts ?? []).map((f) => `<li>${esc(f)}</li>`).join('');
  return [
    `<div class="sk-intro">`,
    `<p class="eyebrow">${esc(h.eyebrow)}</p>`,
    `<h1>${esc(h.title)}</h1>`,
    `<p class="sk-lede">${esc(h.lede)}</p>`,
    facts ? `<ul class="sk-facts" role="list">${facts}</ul>` : '',
    `</div>`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** A sample's blocks, with its "Bottom line" and the paragraph under it drawn as the answer that reads first. */
function skillSampleBlocks(blocks: readonly SampleBlock[], id: string): string {
  const out: string[] = [];
  for (let j = 0; j < blocks.length; j++) {
    const b = blocks[j];
    const next = blocks[j + 1];
    if (b && 'h' in b && /^bottom line\b/i.test(b.h) && next && 'p' in next) {
      out.push(`<div class="sample-bottom">${sampleBlock(b, `${id}-t${j + 1}`)}${sampleBlock(next, `${id}-t${j + 2}`)}</div>`);
      j++;
      continue;
    }
    if (b) out.push(sampleBlock(b, `${id}-t${j + 1}`));
  }
  return out.join('\n');
}

/**
 * The sample, as a sheet of paper beside the opt-in. Its heading and line of context are for a screen
 * reader; the sheet says what it is. With the script, the sheet starts as its first screen with
 * "See the Full Example" (`main.ts`); without it, all of it shows.
 */
function skillSample(s: Extract<Section, { kind: 'sample' }>, i: number): string {
  const id = `s${i + 1}-heading`;
  const docId = `${id}-doc`;
  return [
    `<section class="sample sk-sample" aria-labelledby="${id}" data-peekable>`,
    `<h2 id="${id}" class="visually-hidden">${esc(s.heading)}</h2>`,
    `<p class="visually-hidden">${esc(s.body)}</p>`,
    `<div class="sk-sheet">`,
    `<article class="sample-doc" id="${docId}" aria-labelledby="${id}-title">`,
    `<div class="sample-head"><p class="note">${esc(s.note)}</p><p class="sample-title" id="${id}-title">${esc(s.title)}</p></div>`,
    skillSampleBlocks(s.blocks, id),
    `</article>`,
    `<button type="button" class="sk-more" data-sample-more aria-controls="${docId}" aria-expanded="true" data-less="${esc(SHARED.skill.sampleLess)}" hidden>${esc(SHARED.skill.sampleMore)}</button>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/**
 * One band below the hero: a full-width ground and the page's column inside it. A section named by its
 * heading, or, when what it holds names itself (the two columns of a pair), a plain box.
 */
function band(kind: string, id: string | null, inner: string): string {
  const tag = id ? 'section' : 'div';
  const label = id ? ` aria-labelledby="${id}"` : '';
  return [`<${tag} class="sk-band sk-band-${kind}"${label}>`, `<div class="sk-wrap">`, inner, `</div>`, `</${tag}>`].join('\n');
}

/** A band's heading and the line under it. */
function bandHead(id: string, heading: string, sub?: string): string {
  return (
    `<div class="sk-head"><h2 id="${id}">${esc(heading)}</h2>` + (sub ? `<p class="sk-sub">${esc(sub)}</p>` : '') + `</div>`
  );
}

/** "What to say": the words, each copied with a tap. Its heading's id is given, so two columns can share a band. */
function skillPrompts(s: Extract<Section, { kind: 'prompts' }>, id: string): string {
  const groups = s.groups
    .map(
      (g) =>
        `<h3 class="sk-group">${esc(g.label)}</h3>` +
        `<ul class="chips" role="list">${g.items.map((w) => `<li>${copyChip(w)}</li>`).join('')}</ul>`,
    )
    .join('\n');
  return [`<section class="sk-col prompts" aria-labelledby="${id}">`, bandHead(id, s.heading, s.body), groups, `</section>`].join('\n');
}

function skillFaq(s: Extract<Section, { kind: 'faq' }>, id: string): string {
  const items = s.items
    .map((it) => `<details class="faq-item"><summary>${esc(it.q)}</summary><p>${inline(it.a)}</p></details>`)
    .join('');
  return [`<section class="sk-col faq" aria-labelledby="${id}">`, bandHead(id, s.heading), `<div class="faq-list">${items}</div>`, `</section>`].join('\n');
}

/** One section below the hero, as its band. */
function skillSection(guide: Guide, s: Section, i: number): string {
  const id = `s${i + 1}-heading`;
  switch (s.kind) {
    case 'list': {
      const items = s.items.map((it) => `<li><strong>${esc(it.title)}</strong><span>${esc(it.body)}</span></li>`).join('');
      return band('list', id, [bandHead(id, s.heading), `<ul class="sk-list" role="list">${items}</ul>`].join('\n'));
    }
    case 'tiles': {
      // Who does what (Run, Draft, Own): open columns on a white band, the last, what stays the
      // person's, marked in green. Every other row of tiles ("What you need", the Reel Editor's two
      // looks) is cards, each with its small label when it has one.
      const roles = s.items.map((it) => it.label ?? '').join() === 'Run,Draft,Own';
      const items = s.items
        .map(
          (it) =>
            `<li>` +
            (it.label ? `<span class="${roles ? 'sk-role' : 'sk-label'}">${esc(it.label)}</span>` : '') +
            `<strong>${esc(it.title)}</strong><span class="sk-body">${esc(it.body)}</span>` +
            (it.tag ? `<span class="sk-tag">${esc(it.tag)}</span>` : '') +
            `</li>`,
        )
        .join('');
      const list = roles
        ? `<ul class="sk-roles" role="list">${items}</ul>`
        : `<ul class="sk-cards${s.columns === 2 ? ' sk-cards-2' : ''}" role="list">${items}</ul>`;
      const cta = s.cta ? needCta(guide, 'btn btn-primary sk-cta') : '';
      return band(roles ? 'roles' : 'cards', id, [bandHead(id, s.heading, s.note), list, cta].filter(Boolean).join('\n'));
    }
    case 'prompts':
      return band('pair', null, skillPrompts(s, id));
    case 'faq':
      return band('pair', null, skillFaq(s, id));
    case 'note':
      return band('note', null, `<p class="crosslink">${inline(s.body)}</p>`);
    case 'sample':
    case 'compare':
    case 'example':
    case 'report':
      // A second picture after the hero's (none today): the guide's own markup, in a band.
      return band('other', null, section(guide, s, i));
  }
}

/** The sections below the hero, with "What to say" and the questions after it side by side. */
function skillSections(guide: Guide, skip: number): string {
  const out: string[] = [];
  const secs = guide.sections;
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    if (!s || i === skip) continue;
    const next = secs[i + 1];
    if (s.kind === 'prompts' && next?.kind === 'faq') {
      out.push(band('pair', null, `<div class="sk-pair">${skillPrompts(s, `s${i + 1}-heading`)}\n${skillFaq(next, `s${i + 2}-heading`)}</div>`));
      i++;
      continue;
    }
    out.push(skillSection(guide, s, i));
  }
  return out.join('\n');
}

/**
 * The Reel Editor's before and after, beside the opt-in: the raw take and the Reel, side by side, as
 * the guide draws them (plain videos, nothing fetched but the poster until one plays). Its heading and
 * line of context are for a screen reader; each clip's caption says what it is.
 */
function skillCompare(s: Extract<Section, { kind: 'compare' }>, i: number): string {
  const id = `s${i + 1}-heading`;
  const clips = s.clips
    .map((c) =>
      [
        `<figure class="clip">`,
        `<video controls playsinline preload="none" poster="${esc(c.poster)}" width="${c.width}" height="${c.height}">`,
        `<source src="${esc(c.src)}" type="video/mp4">`,
        `</video>`,
        `<figcaption><span class="clip-label">${esc(c.label)} · ${esc(c.length)}</span> ${esc(c.caption)}</figcaption>`,
        `</figure>`,
      ].join(''),
    )
    .join('\n');
  return [
    `<section class="compare sk-show sk-compare" aria-labelledby="${id}">`,
    `<h2 id="${id}" class="visually-hidden">${esc(s.heading)}</h2>`,
    `<p class="visually-hidden">${esc(s.body)}</p>`,
    `<div class="compare-grid">${clips}</div>`,
    `</section>`,
  ].join('\n');
}

/**
 * The Task Sync Starter Kit's example, beside the opt-in, as a sheet of paper: its heading as the
 * sheet's title, the sentence said in the meeting, and the task it becomes in green.
 */
function skillExample(s: Extract<Section, { kind: 'example' }>, i: number): string {
  const id = `s${i + 1}-heading`;
  const rows = s.task.rows.map((r) => `<div class="row"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('');
  return [
    `<section class="example sk-show sk-example" aria-labelledby="${id}">`,
    `<div class="sk-sheet">`,
    `<div class="sample-doc">`,
    `<h2 id="${id}" class="sample-title">${esc(s.heading)}</h2>`,
    `<p class="visually-hidden">${esc(s.body)}</p>`,
    `<figure class="quote"><blockquote>${esc(s.quote)}</blockquote><figcaption>${esc(s.quoteSource)}</figcaption></figure>`,
    `<div class="task sk-task"><p class="task-title">${esc(s.task.title)}</p><dl>${rows}</dl></div>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The picture beside the opt-in: the first sample, before and after, or example on the page. */
function skillShowcase(s: Section | undefined, i: number): string {
  if (s?.kind === 'sample') return skillSample(s, i);
  if (s?.kind === 'compare') return skillCompare(s, i);
  if (s?.kind === 'example') return skillExample(s, i);
  return '';
}

/** A page's <body> in the library's look. */
function skillBody(guide: Guide): string {
  const at = guide.sections.findIndex((s) => s.kind === 'sample' || s.kind === 'compare' || s.kind === 'example');
  return [
    skillTop(guide),
    `<main class="sk">`,
    `<div class="sk-hero sk-wrap">`,
    skillIntro(guide),
    optIn(guide),
    skillShowcase(guide.sections[at], at),
    `</div>`,
    skillSections(guide, at),
    `</main>`,
    footer('sk-foot'),
    copies(guide) ? `<p id="guide-live" class="toast" role="status" aria-live="polite"></p>` : '',
    // On a phone, a way to the sign-up from anywhere on the page: shown by `main.ts` while the card is
    // out of view and the skill is not yet unlocked. A paid skill has no sign-up, and the script shows
    // the bar only beside one.
    inSkillLibrary(guide)
      ? ''
      : `<div class="sk-bar" data-sk-bar hidden><a class="btn btn-primary" href="#${esc(guide.optIn.anchor)}">${esc(guide.bar ?? SHARED.skill.bar)}</a></div>`,
  ]
    .filter(Boolean)
    .join('\n');
}
