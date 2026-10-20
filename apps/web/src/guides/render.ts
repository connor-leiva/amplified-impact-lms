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
// Every string goes through `esc()`; nothing here runs in the browser.

import signatureReversedSvg from '../assets/brand/amplified-impact-signature-reversed.svg?raw';
import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import { GUIDES, SHARED, SITE, type Guide, type Handoff, type Inline, type Section, type SetupStep } from './content';
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
function copyChip(words: string): string {
  return (
    `<button type="button" class="chip" data-copy data-toast="${esc(SHARED.copy.copied)}">` +
    `<span class="visually-hidden">${esc(SHARED.copy.tag)}: </span><span data-copy-text>${esc(words)}</span>` +
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

/** A setup step's button: the download itself, or a page in Claude, in a new tab. */
function setupAction(guide: Guide, action: SetupStep['action']): string {
  if (action === undefined) return '';
  if (action === 'download') return downloadButton(guide);
  return `<a class="btn btn-outline" href="${esc(action.href)}" target="_blank" rel="noopener">${esc(action.label)}</a>`;
}

/** What to do with the download once it is saved, numbered, in the unlocked card (D-045). */
function setup(guide: Guide, steps: readonly SetupStep[]): string {
  const items = steps
    .map((s, i) =>
      [
        `<li class="setup-step">`,
        `<span class="setup-n" aria-hidden="true">${i + 1}</span>`,
        `<div class="setup-body">`,
        `<h3>${esc(s.title)}</h3>`,
        `<p>${inline(s.body)}</p>`,
        setupAction(guide, s.action),
        s.copy ? copyChip(s.copy) : '',
        s.note ? `<p class="setup-note">${inline(s.note)}</p>` : '',
        `</div>`,
        `</li>`,
      ]
        .filter(Boolean)
        .join(''),
    )
    .join('\n');
  return `<ol class="setup" role="list">\n${items}\n</ol>`;
}

/**
 * The opt-in and, in the same card, the download it unlocks.
 *
 * Without JavaScript the form is a plain POST (native `required` and `type=email` validation; no
 * `novalidate` in the markup, `main.ts` sets it once it validates instead), and the API answers 303 to
 * `#download` or `#guide-error`, which `:target` shows. With it, `main.ts` posts JSON, sets
 * `data-state="unlocked"` on the card, and remembers that under the card's `data-unlock-key`.
 */
function optIn(guide: Guide): string {
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
    d.setup ? setup(guide, d.setup) : downloadButton(guide),
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
        s.cta ? `<a class="btn btn-outline" href="#${esc(guide.optIn.anchor)}">${esc(guide.optIn.button)}</a>` : '',
        `</section>`,
      ]
        .filter(Boolean)
        .join('\n');
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
  }
}

function footer(): string {
  const f = SHARED.footer;
  const links = f.links
    .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.link)}</a>`)
    .join('<span aria-hidden="true"> · </span>');
  return [
    `<footer class="foot">`,
    logo(signatureSvg, SHARED.logoAlt, 'logo logo-foot'),
    `<p>${esc(f.byline)}</p>`,
    `<p class="foot-links">${links}</p>`,
    `</footer>`,
  ].join('\n');
}

/** Whether anything on the page copies, and so needs the toast that says it did. */
const copies = (guide: Guide) =>
  guide.sections.some((s) => s.kind === 'prompts') || (guide.download.setup ?? []).some((s) => s.copy !== undefined);

/** Everything inside <body>. */
export function renderGuideBody(guide: Guide): string {
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
