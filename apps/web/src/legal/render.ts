// /terms and /privacy, as strings, from `content.ts`. The same approach as /ai101 (DECISIONS.md
// D-028): ONE self-contained HTML response per page, rendered at build time by `vite-plugin.ts` and
// poured into `apps/web/terms.html` and `apps/web/privacy.html`. Nothing here runs in the browser,
// and the pages carry no script at all.
//
// ESCAPING. Every string from `content.ts` goes through `esc()`, so the only tags on the page are the
// ones this file writes. `render.test.ts` proves it with a copy of the content that has markup in
// every string.
//
// PLACEHOLDERS. Each `[bracketed placeholder]` in the copy is wrapped in a <mark>, so a reviewer can
// see at a glance what is still unknown. Escaped FIRST, then wrapped: `esc()` never touches a
// bracket, so the pattern matches the same spans either way.
//
// Deliberately independent of `src/ai101/render.ts`: that file is /ai101's, and these pages must not
// change when it does. The few lines that look alike (`esc`, the placeholder <mark>) are copied
// rather than shared for that reason.

// The brand package's signature drawing, byte for byte (`scripts/reference-tokens.mjs --check` holds
// the copy in `assets/brand/` to `design-reference/brand/`). Inlined, so the logo costs no request.
import signature from '../assets/brand/amplified-impact-signature.svg?raw';
import {
  CHROME,
  DRAFT,
  EFFECTIVE,
  LEGAL_VERSION,
  PRIVACY,
  TERMS,
  type Block,
  type Inline,
  type LegalDoc,
  type Section,
} from './content';

/** The two pages, by the name of their HTML entry (`terms.html`, `privacy.html`). */
export const LEGAL_PAGES = { terms: TERMS, privacy: PRIVACY } as const;
export type LegalPageName = keyof typeof LEGAL_PAGES;

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Text and attribute-value escaping. Quotes too, so one function is safe in both positions. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** Escaped text with every `[bracketed placeholder]` highlighted. For text positions only. */
export function highlight(value: string): string {
  return esc(value).replace(/\[[^\]\n]*\]/g, (span) => `<mark class="placeholder">${span}</mark>`);
}

/** One run of inline copy. Links on these pages are all same-site, so they open in this tab. */
export function inline(segments: string | readonly Inline[]): string {
  if (typeof segments === 'string') return highlight(segments);
  return segments
    .map((seg) => {
      if (typeof seg === 'string') return highlight(seg);
      if ('strong' in seg) return `<strong>${highlight(seg.strong)}</strong>`;
      return `<a href="${esc(seg.href)}">${highlight(seg.link)}</a>`;
    })
    .join('');
}

function block(b: Block): string {
  if ('p' in b) return `<p>${inline(b.p)}</p>`;
  if ('ul' in b) return `<ul>${b.ul.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`;
  // The waitlist form's own words, quoted so a reader sees exactly what they agreed to.
  return (
    `<figure class="quote"><figcaption>${highlight(b.label)}</figcaption>` +
    `<blockquote><p>${highlight(b.quote)}</p></blockquote></figure>`
  );
}

/** A section. Its <h2> names the region, so a screen reader's landmark list reads the outline. */
function section(s: Section): string {
  const headingId = `${s.id}-heading`;
  return [
    `<section id="${esc(s.id)}" aria-labelledby="${esc(headingId)}">`,
    `<h2 id="${esc(headingId)}">${highlight(s.heading)}</h2>`,
    ...s.blocks.map(block),
    `</section>`,
  ].join('\n');
}

/** The table of contents: one link per section, in order. */
function toc(doc: LegalDoc): string {
  const items = doc.sections.map((s) => `<li><a href="#${esc(s.id)}">${highlight(s.heading)}</a></li>`).join('');
  return (
    `<nav class="toc" aria-labelledby="toc-title">` +
    `<p class="toc-title" id="toc-title">${esc(CHROME.tocLabel)}</p><ol>${items}</ol></nav>`
  );
}

/**
 * The signature logo, linking to the workshop page. The drawing is hidden from assistive tech and
 * the link carries the name instead; `focusable="false"` keeps old Edge from tabbing into the SVG.
 */
export function brandLogo(): string {
  if (!signature.startsWith('<svg ')) throw new Error('amplified-impact-signature.svg does not start with <svg.');
  const svg = signature.replace(/^<svg /, '<svg class="brand-logo" aria-hidden="true" focusable="false" ');
  return `<a class="brand" href="/ai101" aria-label="${esc(CHROME.logoLabel)}" data-brand-slot="signature">${svg}</a>`;
}

/** The footer: the two legal pages and the workshop page, with the current page marked. */
function footer(doc: LegalDoc): string {
  const links = CHROME.footerLinks
    .map(({ label, href }) => {
      const current = href === doc.path ? ' aria-current="page"' : '';
      return `<li><a href="${esc(href)}"${current}>${esc(label)}</a></li>`;
    })
    .join('');
  return [
    `<footer class="site-foot">`,
    `<div class="inner">`,
    `<nav aria-label="${esc(CHROME.footerLabel)}"><ul class="foot-links" role="list">${links}</ul></nav>`,
    `<p>${highlight(CHROME.footerContact)}</p>`,
    `</div>`,
    `</footer>`,
  ].join('\n');
}

/** The <head> lines for one page. While `draft`, search engines are asked not to index it. */
export function renderLegalHead(doc: LegalDoc, draft: boolean = DRAFT): string {
  return [
    `<title>${esc(doc.title)}</title>`,
    `<meta name="description" content="${esc(doc.description)}" />`,
    ...(draft ? [`<meta name="robots" content="noindex" />`] : []),
  ].join('\n    ');
}

/** Everything inside <body> for one page. */
export function renderLegalBody(doc: LegalDoc, draft: boolean = DRAFT): string {
  const head = [
    `<header class="doc-head">`,
    // Plain `esc`, not `highlight`: the note mentions "[brackets]" to explain them, and is not one.
    ...(draft ? [`<p class="draft" role="note">${esc(CHROME.draft)}</p>`] : []),
    `<h1 id="doc-title">${highlight(doc.heading)}</h1>`,
    `<p class="meta">${esc(CHROME.effective)} <time datetime="${esc(EFFECTIVE.iso)}">${esc(EFFECTIVE.label)}</time>` +
      `<span class="sep" aria-hidden="true"> · </span>` +
      `<span class="version">${esc(CHROME.version)} ${esc(LEGAL_VERSION)}</span></p>`,
    `<p class="lede">${inline(doc.intro)}</p>`,
    `</header>`,
  ].join('\n');

  return [
    `<header class="site-head"><div class="inner">${brandLogo()}</div></header>`,
    `<main class="page">`,
    `<article class="doc" aria-labelledby="doc-title">`,
    head,
    toc(doc),
    ...doc.sections.map(section),
    `</article>`,
    `</main>`,
    footer(doc),
  ].join('\n');
}

/** What `vite-plugin.ts` asks for: one page's head and body, by its entry name. */
export function renderLegal(name: LegalPageName): { head: string; body: string } {
  const doc = LEGAL_PAGES[name];
  return { head: renderLegalHead(doc), body: renderLegalBody(doc) };
}
