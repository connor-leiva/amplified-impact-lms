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
import { GROK_COLLECTIONS } from '@ai/core/grok-templates';
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
const newestFirst = (entries: readonly Entry[] = ENTRIES): Entry[] =>
  [...entries].sort((a, b) => Number(a.href === null) - Number(b.href === null) || b.added.localeCompare(a.added));

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
 * "Coming soon" where the arrow goes. The tags say what it is, which apps it works in, who it is for
 * when one group above all (D-100) and, for a paid skill or template, that it is in the Skill Library.
 * `level` is its title's heading level: 3 in the main list, 4 on the Grok Bot shelf, under a collection.
 */
function card(entry: Entry, level: 3 | 4 = 3): string {
  // "Claude Skill" already names its app, and "Grok Bot" is its own, so a card does not say it twice.
  const tags = [
    entry.kind,
    ...entry.tools.map((t) => TOOLS[t]).filter((label) => !entry.kind.includes(label)),
    ...(entry.audience ? [entry.audience] : []),
    ...(paid(entry) ? [LIBRARY.paid] : []),
  ];
  // The title first in the markup, so a screen reader names the link by it, not by the tags two cards
  // share. The CSS draws the tags above it.
  const inner =
    `<h${level} class="item-title">${esc(entry.title)}</h${level}>` +
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

/**
 * The Grok Bot shelf (D-100), under the main list: one section, its two collections each a heading,
 * a line and their own list of cards, newest first like the main list. The script filters, sorts and
 * counts these cards with the rest, and hides a collection, or the whole shelf, that has none left.
 */
function grokShelf(): string {
  const g = LIBRARY.grok;
  const collections = GROK_COLLECTIONS.map((c) => {
    const entries = newestFirst(ENTRIES.filter((e) => e.collection === c));
    if (!entries.length) return '';
    const head = g.collections[c];
    return [
      `<section class="collection" aria-labelledby="collection-${esc(c)}" data-collection="${esc(c)}">`,
      `<h3 class="collection-title" id="collection-${esc(c)}">${esc(head.heading)}</h3>`,
      `<p class="collection-body">${esc(head.body)}</p>`,
      `<ul class="items" role="list" data-list>`,
      ...entries.map((e) => card(e, 4)),
      `</ul>`,
      `</section>`,
    ].join('\n');
  }).filter(Boolean);
  if (!collections.length) return '';
  return [
    `<section class="shelf" aria-labelledby="shelf-grok" data-shelf>`,
    `<h2 class="shelf-title" id="shelf-grok">${esc(g.heading)}</h2>`,
    `<p class="shelf-body">${esc(g.body)}</p>`,
    ...collections,
    `</section>`,
  ].join('\n');
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
  // The main list holds everything that is not on the Grok Bot shelf; the count is of both.
  const entries = newestFirst(ENTRIES.filter((e) => e.collection === undefined));
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
    `<p class="count" id="library-count" role="status" aria-live="polite">${esc(LIBRARY.count(ENTRIES.length))}</p>`,
    `<div class="sorter" hidden data-js-only><label class="filter-label" for="library-sort">${esc(LIBRARY.filters.sort)}</label>` +
      `<select id="library-sort"><option value="newest">${esc(LIBRARY.filters.newest)}</option><option value="oldest">${esc(LIBRARY.filters.oldest)}</option></select></div>`,
    `</div>`,
    `<ul class="items" id="library-items" role="list" data-list>`,
    ...entries.map((e) => card(e)),
    `</ul>`,
    grokShelf(),
    `<div class="empty" id="library-empty" hidden><p>${esc(LIBRARY.empty)}</p>` +
      `<button type="button" class="clear" id="library-clear">${esc(LIBRARY.clear)}</button></div>`,
    // The general note (D-101), after every list, so no filter ever hides it.
    `<p class="library-note">${esc(LIBRARY.note)}</p>`,
    `</main>`,
    footer(),
  ].join('\n');
}
