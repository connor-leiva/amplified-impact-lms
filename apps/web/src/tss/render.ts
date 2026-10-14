// /task-sync-starter's markup, as one string, from `content.ts`. DECISIONS.md D-038.
//
// Built like /ai101 (D-028): ONE self-contained HTML response, its stylesheet and its small script
// inlined at build time by `vite-plugin.ts`, so the only other requests are the font files and, once
// the visitor has opted in, the PDF. Visitors arrive from a ManyChat DM, which means Instagram's
// in-app browser on a phone: the page has to be fast and work there.
//
// THE GATE. The opt-in form and the download are both in the markup. The download starts hidden and
// shows when the visitor has opted in: with the script, once the API has stored the sign-up (and on
// every later visit from that device); without it, through the API's 303 to `#download`, which the
// CSS shows with `:target`. It is a soft gate, as lead magnets are: the PDF is a plain file.
//
// Every string from `content.ts` goes through `esc()`; nothing here runs in the browser.

import signatureReversedSvg from '../assets/brand/amplified-impact-signature-reversed.svg?raw';
import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import { PAGE, UI, type Inline } from './content';

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text and attribute-value escaping. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** One run of inline copy. Links are this site's own pages, opened in a new tab so the form stays. */
function inline(segments: readonly Inline[]): string {
  return segments
    .map((seg) => {
      if (typeof seg === 'string') return esc(seg);
      if ('strong' in seg) return `<strong>${esc(seg.strong)}</strong>`;
      return `<a href="${esc(seg.href)}" target="_blank" rel="noopener">${esc(seg.link)}</a>`;
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

/** The <head> lines that come from `content.ts`. */
export function renderTssHead(): string {
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

function hero(): string {
  const h = PAGE.hero;
  const steps = h.steps
    .map(
      (s) =>
        `<li><span class="step-n">${esc(s.n)}</span><strong>${esc(s.title)}</strong><span class="step-body">${esc(s.body)}</span></li>`,
    )
    .join('');
  return [
    `<header class="hero">`,
    `<div class="wrap">`,
    logo(signatureReversedSvg, h.logoAlt, 'logo'),
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
  const id = `tss-${name}`;
  return (
    `<div class="field"><label for="${id}">${esc(label)}</label>` +
    `<input id="${id}" name="${name}" ${attrs}>` +
    `<p class="field-error" id="${name}-error"></p></div>`
  );
}

/**
 * The opt-in and, in the same card, the download it unlocks.
 *
 * Without JavaScript the form is a plain POST (native `required` and `type=email` validation; no
 * `novalidate` in the markup, `main.ts` sets it once it validates instead), and the API answers 303 to
 * `#download` or `#tss-error`, which `:target` shows. With it, `main.ts` posts JSON and sets
 * `data-state="unlocked"` on the card.
 */
function optIn(): string {
  const o = PAGE.optIn;
  const d = PAGE.download;
  const form = [
    `<form id="tss-form" class="form" method="post" action="/api/task-sync-starter">`,
    field('firstName', o.fields.firstName, 'type="text" required autocomplete="given-name" maxlength="80"'),
    field('email', o.fields.email, 'type="email" required autocomplete="email" maxlength="254" inputmode="email"'),
    `<div class="field-website" aria-hidden="true"><label for="tss-website">${esc(HONEYPOT_LABEL)}</label>` +
      `<input id="tss-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>`,
    `<p class="form-error" id="tss-error" role="alert">${esc(UI.errors.generic)}</p>`,
    `<button type="submit" class="btn btn-primary">${esc(o.button)}</button>`,
    `<p class="legal">${inline(o.legal)}</p>`,
    `</form>`,
  ].join('\n');
  const unlocked = [
    `<div id="${esc(d.anchor)}" class="unlocked" tabindex="-1">`,
    `<h2 id="download-heading">${esc(d.heading)}</h2>`,
    `<p>${esc(d.body)}</p>`,
    `<a class="btn btn-primary" href="${esc(d.href)}" download="${esc(d.filename)}" data-download>${esc(d.button)}</a>`,
    `<p class="in-app" hidden data-in-app>${esc(d.inApp)}</p>`,
    `</div>`,
  ].join('\n');
  return [
    `<section id="${esc(o.anchor)}" class="card optin" aria-labelledby="optin-heading">`,
    `<div class="locked">`,
    `<h2 id="optin-heading">${esc(o.heading)}</h2>`,
    `<p>${esc(o.body)}</p>`,
    form,
    `</div>`,
    unlocked,
    `</section>`,
  ].join('\n');
}

function example(): string {
  const e = PAGE.example;
  const rows = e.task.rows
    .map((r) => `<div class="row"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`)
    .join('');
  return [
    `<section class="example" aria-labelledby="example-heading">`,
    `<p class="eyebrow eyebrow-dark">${esc(e.eyebrow)}</p>`,
    `<h2 id="example-heading">${esc(e.heading)}</h2>`,
    `<p class="lede-dark">${esc(e.body)}</p>`,
    `<figure class="quote"><blockquote>${esc(e.quote)}</blockquote><figcaption>${esc(e.quoteSource)}</figcaption></figure>`,
    `<div class="card task"><p class="task-title">${esc(e.task.title)}</p><dl>${rows}</dl></div>`,
    `</section>`,
  ].join('\n');
}

function inside(): string {
  const i = PAGE.inside;
  const items = i.items.map((it) => `<li><strong>${esc(it.title)}</strong><span>${esc(it.body)}</span></li>`).join('');
  return [
    `<section class="inside" aria-labelledby="inside-heading">`,
    `<h2 id="inside-heading">${esc(i.heading)}</h2>`,
    `<ul class="list" role="list">${items}</ul>`,
    `</section>`,
  ].join('\n');
}

function need(): string {
  const n = PAGE.need;
  const items = n.items
    .map((it) => `<li class="card"><strong>${esc(it.title)}</strong><span>${esc(it.body)}</span></li>`)
    .join('');
  return [
    `<section class="need" aria-labelledby="need-heading">`,
    `<div class="need-head"><h2 id="need-heading">${esc(n.heading)}</h2><p class="note">${esc(n.note)}</p></div>`,
    `<ul class="tiles" role="list">${items}</ul>`,
    `<a class="btn btn-outline" href="#${esc(PAGE.optIn.anchor)}">${esc(PAGE.optIn.button)}</a>`,
    `</section>`,
  ].join('\n');
}

function footer(): string {
  const f = PAGE.footer;
  const links = f.links
    .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.link)}</a>`)
    .join('<span aria-hidden="true"> · </span>');
  return [
    `<footer class="foot">`,
    logo(signatureSvg, PAGE.hero.logoAlt, 'logo logo-foot'),
    `<p>${esc(f.byline)}</p>`,
    `<p class="foot-links">${links}</p>`,
    `</footer>`,
  ].join('\n');
}

/** Everything inside <body>. */
export function renderTssBody(): string {
  return [hero(), `<main class="page">`, optIn(), example(), inside(), need(), `</main>`, footer()].join('\n');
}
