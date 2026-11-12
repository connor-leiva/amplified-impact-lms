// /library's markup, as one string, from `content.ts`. DECISIONS.md D-050.
//
// Built like the other public pages (D-028, D-039): one self-contained response, drawn at build time.
// Every card is a real link in the markup, newest first, so with no script the whole library shows and
// works. `main.ts` adds the filter pills, the search and the sort, all `hidden data-js-only` here: a
// control that does nothing is worse than none. It reads what it filters from each card's `data-`
// attributes, so no copy from `content.ts` ends up in the inlined script.
//
// Every string goes through `esc()`; nothing here runs in the browser.

import { esc } from '../ai101/render';
import { GUIDES, inSkillLibrary } from '../guides/content';
import { GROK_COLLECTIONS, GROK_TEMPLATES } from '@ai/core/grok-templates';
import { SKILL_CATALOG } from '@ai/core/skills';
import { icon } from '../site/render';
import { SITE } from '../site/content';
import { eyebrow, headline, button, pad2 } from '../kit/parts';
import { kitFooter, kitHeader, kitSkip } from '../kit/render';
import { ENTRIES, FREE_FIVE, GENERAL_TRACK, GUIDE_WHO, LEAD, LIBRARY, TOOLS, TOPICS, TRACKS, WHO, type Entry, type Lead, type Track, type Who } from './content';

/**
 * A card's lead (`LEAD` in `content.ts`), first under its title and tags, before the description: the
 * problem, what it does for you, and who it's for. Classes are `<prefix>-lead`, `-problem`, `-outcome`
 * and `-for`, so each page styles it in its own look. `span` for a card drawn of spans (a `<p>` cannot
 * sit in one), else a `div` of paragraphs. Also /free's cards (`../free/render.ts`).
 */
export function cardLead(lead: Lead, prefix: string, inline = false): string {
  const box = inline ? 'span' : 'div';
  const line = inline ? 'span' : 'p';
  const who = lead.forRole
    ? `<${line} class="${prefix}-for"><span class="${prefix}-for-k">${esc(LEAD.forRole)}:</span> ${esc(lead.forRole)}</${line}>`
    : '';
  return (
    `<${box} class="${prefix}-lead">` +
    `<${line} class="${prefix}-problem">${esc(lead.problem)}</${line}>` +
    `<${line} class="${prefix}-outcome">${esc(lead.outcome)}</${line}>` +
    who +
    `</${box}>`
  );
}

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
    // Spring's two filters (D-115): Real Estate or General, and Agents or Team Owners.
    pills('track', f.track, TRACKS, inUse(TRACKS, (e) => [trackOf(e)])),
    pills('who', f.who, WHO, inUse(WHO, (e) => whoOf(e))),
    `<div class="finder"><label class="filter-label" for="library-search">${esc(f.search)}</label>` +
      `<input id="library-search" type="search" placeholder="${esc(f.searchPlaceholder)}" autocomplete="off" enterkeyhint="search"></div>`,
    `</section>`,
  ].join('\n');
}

/** A card's page, without its slash: the key the free five, the tracks and the catalogs use. */
const slugOf = (entry: Entry): string => (entry.href ?? '').replace(/^\//, '');

/** One of the free five, a free guide or kit, or locked (D-115). */
export function access(entry: Entry): 'free' | 'resource' | 'locked' {
  if (paid(entry)) return 'locked';
  return FREE_FIVE.includes(slugOf(entry)) ? 'free' : 'resource';
}

/** Spring's Track: General for the free five and the general skills she names, else Real Estate. */
export const trackOf = (entry: Entry): Track => (GENERAL_TRACK.includes(slugOf(entry)) ? 'general' : 'real-estate');

/** Spring's Who, from the skill's or template's set in its catalog, or a guide's own (`GUIDE_WHO`). */
export function whoOf(entry: Entry): readonly Who[] {
  const slug = slugOf(entry);
  const sets = SKILL_CATALOG.find((s) => s.id === slug || s.page === slug)?.sets ?? GROK_TEMPLATES.find((t) => t.id === slug)?.sets;
  if (sets === 'agent') return ['agents'];
  if (sets === 'owner_ops') return ['owners'];
  if (sets === 'both') return ['agents', 'owners'];
  return GUIDE_WHO[slug] ?? ['agents', 'owners'];
}

/** Whether a card's page is a paid skill's, locked behind a plan rather than a download (D-082). */
export function paid(entry: Entry): boolean {
  const guide = entry.href === null ? undefined : GUIDES[entry.href.replace(/^\//, '')];
  return guide !== undefined && inSkillLibrary(guide);
}

/**
 * One card. A live one is one big link; one that is not up yet is the same card with no link and
 * "Coming soon" where the arrow goes. The tags say what it is, which apps it works in, who it is for
 * when one group above all (D-100), and whether it is free or locked (D-115); a locked card has a
 * lock where the arrow goes.
 * `level` is its title's heading level: 3 in the main list, 4 on the Grok Bot shelf, under a collection.
 */
function card(entry: Entry, level: 3 | 4 = 3): string {
  // "Claude Skill" already names its app, and "Grok Bot" is its own, so a card does not say it twice.
  const tags = [
    entry.kind,
    ...entry.tools.map((t) => TOOLS[t]).filter((label) => !entry.kind.includes(label)),
    ...(entry.audience ? [entry.audience] : []),
  ];
  const a = access(entry);
  // The title first in the markup, so a screen reader names the link by it, not by the tags two cards
  // share. The CSS draws the tags above it.
  const inner =
    `<h${level} class="item-title">${esc(entry.title)}</h${level}>` +
    `<ul class="item-tags" role="list">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}` +
    // Free, Free Resource or Locked, in words: the lock in the arrow's place never says it alone.
    `<li class="item-access item-${a}">${a === 'locked' ? icon('lock') : ''}${esc(LIBRARY.access[a])}</li></ul>` +
    // The lead first (`LEAD`): the problem it fixes and what it does for you, before how it works.
    cardLead(entry, 'item') +
    `<p class="item-desc">${esc(entry.description)}</p>`;
  const attrs =
    ` data-item data-added="${esc(entry.added)}" data-tools="${esc(entry.tools.join(' '))}"` +
    ` data-topics="${esc(entry.topics.join(' '))}" data-track="${esc(trackOf(entry))}" data-who="${esc(whoOf(entry).join(' '))}"` +
    ` data-access="${a}" data-words="${esc([...entry.topics.map((t) => TOPICS[t]), entry.keywords].join(' '))}"`;
  if (entry.href === null) {
    return `<li class="item item-soon"${attrs}><div class="item-body">${inner}<p class="item-soon-tag">${esc(LIBRARY.soon)}</p></div></li>`;
  }
  return (
    `<li class="item"${attrs}><a class="item-body" href="${esc(entry.href)}">${inner}` +
    (a === 'locked' ? `<span class="item-arrow item-lock" aria-hidden="true">${icon('lock')}</span>` : `<span class="item-arrow" aria-hidden="true">&rarr;</span>`) +
    `</a></li>`
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

/**
 * The free five, first (D-115): what "Get 5 Free Skills" (`/library?show=free`) lands on. The mockup's
 * cards on the other theme: each one's number, kind, title, its card's description and tools, and
 * "Free", all the Library's own words.
 */
function freeFive(): string {
  const f = LIBRARY.free;
  const cards = FREE_FIVE.map((slug, i) => {
    const e = ENTRIES.find((x) => x.href === `/${slug}`);
    if (!e) throw new Error(`The free five name /${slug}, but no Library card links to it. Fix src/library/content.ts.`);
    const tools = e.tools.map((t) => `<li>${esc(TOOLS[t])}</li>`).join('');
    return `<li><a class="free-card" href="${esc(e.href!)}"><span class="free-n" aria-hidden="true">${pad2(i + 1)}</span><span class="free-title">${esc(e.title)}</span><span class="item-access item-free">${esc(
      LIBRARY.access.free,
    )}</span><span class="mono free-kind">${esc(e.kind)}</span>${cardLead(e, 'free', true)}<span class="free-desc">${esc(e.description)}</span><ul class="free-tools" role="list">${tools}</ul></a></li>`;
  }).join('');
  return [
    `<section class="sec free-five inverse" id="free" aria-labelledby="free-title">`,
    `<div class="wrap">`,
    `<div class="free-head"><h2 id="free-title" class="h-section">${esc(f.heading)}</h2><p class="free-body">${esc(f.body)}</p></div>`,
    `<ol class="free-list" role="list">${cards}</ol>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The mockup's grid of the Library's cards beside the hero, one tile each, the free ones lit. A drawing. */
function tiles(): string {
  const all = [...newestFirst(ENTRIES.filter((e) => e.collection === undefined)), ...newestFirst(ENTRIES.filter((e) => e.collection !== undefined))];
  const free = new Set(FREE_FIVE.map((s) => `/${s}`));
  const sorted = [...all.filter((e) => free.has(e.href ?? '')), ...all.filter((e) => !free.has(e.href ?? ''))];
  return `<div class="lb-tiles" aria-hidden="true">${sorted
    .map((e, i) => `<span class="lb-tile${free.has(e.href ?? '') ? ' is-free' : ''}${e.collection ? ' is-grok' : ''}" style="--ti:${i}"></span>`)
    .join('')}</div>`;
}

/** Everything inside <body>. */
export function renderLibraryBody(): string {
  // The main list holds everything that is not on the Grok Bot shelf; the count is of both.
  const entries = newestFirst(ENTRIES.filter((e) => e.collection === undefined));
  return [
    kitSkip(),
    // The kit's header, with Spring's nav (D-107), above the mockup's hero.
    kitHeader('/library'),
    `<main class="page" id="main" tabindex="-1">`,
    `<section class="sec lb-hero hero" aria-labelledby="library-title" data-scroll="exit">`,
    `<div class="wrap lb-hero-grid">`,
    `<div class="lb-hero-copy">`,
    eyebrow(LIBRARY.eyebrow, { icon: 'modules', cls: 'eyebrow' }),
    `<h1 id="library-title" class="h-hero lb-title">${headline(LIBRARY.title)}</h1>`,
    `<p class="lead lede fade-1">${esc(LIBRARY.lede)}</p>`,
    `<div class="actions fade-2">${button(SITE.nav.cta.label, '#free')}</div>`,
    `</div>`,
    `<div class="lb-hero-art">${tiles()}</div>`,
    `</div>`,
    `</section>`,
    freeFive(),
    `<section class="sec lb-all" aria-labelledby="library-list-title">`,
    `<div class="wrap">`,
    `<h2 class="h-section lb-all-title" id="library-list-title">${esc(LIBRARY.listHeading)}</h2>`,
    controls(),
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
    `</div>`,
    `</section>`,
    `</main>`,
    kitFooter(),
  ].join('\n');
}
