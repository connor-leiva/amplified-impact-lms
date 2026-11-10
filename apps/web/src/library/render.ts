// /library's markup, as one string, from `content.ts`. DECISIONS.md D-050.
//
// Built like the other public pages (D-028, D-039): one self-contained response, drawn at build time.
// Every card is a real link in the markup, newest first, so with no script the whole library shows and
// works. `main.ts` adds the filter pills, the search and the sort, all `hidden data-js-only` here: a
// control that does nothing is worse than none. It reads what it filters from each card's `data-`
// attributes, so no copy from `content.ts` ends up in the inlined script.
//
// Every string goes through `esc()`; nothing here runs in the browser.

import signatureReversedSvg from '../assets/brand/amplified-impact-signature-reversed.svg?raw';
import { esc, logo } from '../ai101/render';
import { GUIDES, inSkillLibrary, SHARED } from '../guides/content';
import { ENTRIES, LIBRARY, TOOLS, TOPICS, type Entry } from './content';

/** The <head> lines that come from `content.ts`: the title and the link-preview metadata. */
export function renderLibraryHead(): string {
  const { title, description, url, siteName } = LIBRARY.meta;
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
 * The catalog, newest first: the order with no script, and "Newest first" with one. A card with no
 * page yet goes last, so the first thing a visitor sees is always something they can open.
 */
const newestFirst = (): Entry[] =>
  [...ENTRIES].sort((a, b) => Number(a.href === null) - Number(b.href === null) || b.added.localeCompare(a.added));

/** The keys some entry uses, in the label table's own order: a pill nothing uses never shows. */
function inUse<K extends string>(labels: Readonly<Record<K, string>>, used: (e: Entry) => readonly string[]): K[] {
  return (Object.keys(labels) as K[]).filter((key) => ENTRIES.some((e) => used(e).includes(key)));
}

/** One row of pills. "All" is pressed to start; `main.ts` keeps exactly one pressed in each row. */
function pills<K extends string>(
  name: string,
  heading: string,
  labels: Readonly<Record<K, string>>,
  keys: K[],
): string {
  const chip = (value: string, label: string, pressed: boolean) =>
    `<button type="button" class="chip" data-filter="${esc(name)}" data-value="${esc(value)}" aria-pressed="${pressed}">${esc(label)}</button>`;
  return (
    `<div class="filter" role="group" aria-labelledby="filter-${esc(name)}">` +
    `<p class="filter-label" id="filter-${esc(name)}">${esc(heading)}</p>` +
    `<div class="chips">${chip('', LIBRARY.filters.all, true)}${keys.map((k) => chip(k, labels[k], false)).join('')}</div>` +
    `</div>`
  );
}

function controls(): string {
  const f = LIBRARY.filters;
  return [
    `<section class="controls" aria-label="${esc(f.label)}" hidden data-js-only>`,
    pills(
      'tool',
      f.tool,
      TOOLS,
      inUse(TOOLS, (e) => e.tools),
    ),
    pills(
      'topic',
      f.topic,
      TOPICS,
      inUse(TOPICS, (e) => e.topics),
    ),
    `<div class="finder"><label class="filter-label" for="library-search">${esc(f.search)}</label>` +
      `<input id="library-search" type="search" placeholder="${esc(f.searchPlaceholder)}" autocomplete="off" enterkeyhint="search"></div>`,
    `</section>`,
  ].join('\n');
}

/** Whether a card's page is a paid skill's, in the Skill Library rather than a download (D-082). */
function paid(entry: Entry): boolean {
  const guide = entry.href === null ? undefined : GUIDES[entry.href.replace(/^\//, '')];
  return guide !== undefined && inSkillLibrary(guide);
}

/**
 * One card. A live one is one big link; one that is not up yet is the same card with no link and
 * "Coming soon" where the arrow goes. The tags say what it is, which apps it works in and, for a paid
 * skill, that it is in the Skill Library.
 */
function card(entry: Entry): string {
  // "Claude Skill" already names its app, so the card does not say Claude twice.
  const tags = [
    entry.kind,
    ...entry.tools.map((t) => TOOLS[t]).filter((label) => !entry.kind.includes(label)),
    ...(paid(entry) ? [LIBRARY.paid] : []),
  ];
  // The title first in the markup, so a screen reader names the link by it, not by the tags two cards
  // share. The CSS draws the tags above it.
  const inner =
    `<h3 class="item-title">${esc(entry.title)}</h3>` +
    `<ul class="item-tags" role="list">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` +
    `<p class="item-desc">${esc(entry.description)}</p>`;
  const attrs =
    ` data-item data-added="${esc(entry.added)}" data-tools="${esc(entry.tools.join(' '))}"` +
    ` data-topics="${esc(entry.topics.join(' '))}" data-words="${esc([...entry.topics.map((t) => TOPICS[t]), entry.keywords].join(' '))}"`;
  if (entry.href === null) {
    return `<li class="item item-soon"${attrs}><div class="item-body">${inner}<p class="item-soon-tag">${esc(LIBRARY.soon)}</p></div></li>`;
  }
  return (
    `<li class="item"${attrs}><a class="item-body" href="${esc(entry.href)}">${inner}` +
    `<span class="item-arrow" aria-hidden="true">&rarr;</span></a></li>`
  );
}

function footer(): string {
  const f = SHARED.footer;
  const links = f.links
    .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.link)}</a>`)
    .join('<span aria-hidden="true"> · </span>');
  return `<footer class="foot"><p>${esc(f.byline)}</p><p class="foot-links">${links}</p></footer>`;
}

/** Everything inside <body>. */
export function renderLibraryBody(): string {
  const entries = newestFirst();
  return [
    `<header class="hero">`,
    logo(signatureReversedSvg, LIBRARY.logoAlt, 'logo'),
    `<p class="eyebrow">${esc(LIBRARY.eyebrow)}</p>`,
    `<h1>${esc(LIBRARY.title)}</h1>`,
    `<p class="lede">${esc(LIBRARY.lede)}</p>`,
    `</header>`,
    `<main class="page">`,
    controls(),
    `<h2 class="visually-hidden">${esc(LIBRARY.listHeading)}</h2>`,
    // The sort sits with the count, just above what it sorts, so it costs a phone no row of its own.
    `<div class="list-head">`,
    `<p class="count" id="library-count" role="status" aria-live="polite">${esc(LIBRARY.count(entries.length))}</p>`,
    `<div class="sorter" hidden data-js-only><label class="filter-label" for="library-sort">${esc(LIBRARY.filters.sort)}</label>` +
      `<select id="library-sort"><option value="newest">${esc(LIBRARY.filters.newest)}</option><option value="oldest">${esc(LIBRARY.filters.oldest)}</option></select></div>`,
    `</div>`,
    `<ul class="items" id="library-items" role="list">`,
    ...entries.map(card),
    `</ul>`,
    `<div class="empty" id="library-empty" hidden><p>${esc(LIBRARY.empty)}</p>` +
      `<button type="button" class="clear" id="library-clear">${esc(LIBRARY.clear)}</button></div>`,
    `</main>`,
    footer(),
  ].join('\n');
}
