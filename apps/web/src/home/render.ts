// www's homepage, `/` on the marketing host, as strings, from `content.ts` (DECISIONS.md D-102,
// rewritten in D-107 to Spring's homepage outline).
//
// Built once by `vite-plugin.ts` into `dist/home.html`, its stylesheet inlined by `ai101Inline()`, and
// served by `apps/api/src/routes/marketing.ts` at `/` on MARKETING_HOST only. NO SCRIPT: nothing to
// hash under § 9.4's CSP, nothing to fail in an in-app browser. Every request it makes is to this
// site: the photos and the font files.
//
// The header, the footer and the share tags are the site's own (`../site/render.ts`), so every www
// page has the same nav. The Library's counts, names and free tags come from the Library
// (`../library/content.ts`), so this page cannot drift from it. Every string goes through `esc()`.

import { esc } from '../ai101/render';
import { ENTRIES, type Entry } from '../library/content';
import { paid } from '../library/render';
import { freeTag, lockTag, siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { FREE_SKILLS_HREF } from '../site/content';
import { meetSection, photoTag } from '../site/people';
import { HOME, PHOTOS } from './content';

/** The library's live cards: the ones with a page. */
export const liveEntries = (): Entry[] => ENTRIES.filter((e) => e.href !== null);

/** The library card for a page, by its slug. A build error when there is none, so a link never names a missing page. */
export function entryFor(slug: string): Entry {
  const entry = ENTRIES.find((e) => e.href === `/${slug}`);
  if (!entry) throw new Error(`The homepage names /${slug}, but no library card links to it. Fix src/home/content.ts.`);
  return entry;
}

export function renderHomeHead(): string {
  const p = PHOTOS.spring;
  return siteHead({ ...HOME.meta, image: { src: p.src, width: p.width, height: p.height, alt: p.alt } });
}

const photo = photoTag;

/** The contract checkbox: ticked for what the AI does, empty for what the person owns. Drawn only. */
const box = (done: boolean) => `<span class="box${done ? ' on' : ''}" aria-hidden="true"></span>`;

function hero(): string {
  const h = HOME.hero;
  return [
    `<section class="hero" aria-labelledby="hero-title">`,
    `<div class="wrap hero-in">`,
    `<div class="hero-text">`,
    `<h1 id="hero-title">${esc(h.title)}</h1>`,
    `<p class="lede">${esc(h.lede)}</p>`,
    `<div class="actions">`,
    `<a class="btn btn-primary" href="${esc(h.primary.href)}">${esc(h.primary.label)}</a>`,
    `<a class="btn btn-secondary" href="${esc(h.secondary.href)}">${esc(h.secondary.label)}</a>`,
    `</div>`,
    `</div>`,
    // Spring and Connor, side by side: their own photos, named.
    `<div class="hero-photos">`,
    `<figure class="person">${photo(PHOTOS.spring, 'person-photo', true)}<figcaption>${esc(PHOTOS.spring.alt)}</figcaption></figure>`,
    `<figure class="person">${photo(PHOTOS.connor, 'person-photo', true)}<figcaption>${esc(PHOTOS.connor.alt)}</figcaption></figure>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function proof(): string {
  const p = HOME.proof;
  return `<section class="proof" aria-label="${esc(p.label)}"><div class="wrap proof-in"><p class="proof-label">${esc(p.label)}</p><p class="proof-figure">${esc(p.figure)}</p></div></section>`;
}

function shift(): string {
  const s = HOME.shift;
  const col = (c: { title: string; items: readonly string[] }, cls: string) =>
    `<div class="shift-col ${cls}"><h3>${esc(c.title)}</h3><ul role="list">${c.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
  return [
    `<section class="section shift" aria-labelledby="shift-title">`,
    `<div class="wrap">`,
    `<h2 id="shift-title">${esc(s.heading)}</h2>`,
    `<div class="shift-cols">${col(s.before, 'before')}${col(s.after, 'after')}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function ways(): string {
  const w = HOME.ways;
  const cards = w.cards
    .map((c, i) =>
      [
        `<li class="card way">`,
        `<h3 id="way-${i + 1}">${esc(c.name)}</h3>`,
        `<p class="way-for">${esc(c.forWho)}</p>`,
        `<p class="figure"><span class="amount">${esc(c.amount)}</span> <span class="unit">${esc(c.unit)}</span></p>`,
        `<p class="way-line">${esc(c.line)}</p>`,
        `<a class="btn btn-secondary way-btn" href="${esc(c.button.href)}" aria-describedby="way-${i + 1}">${esc(c.button.label)}</a>`,
        `</li>`,
      ].join(''),
    )
    .join('');
  return [
    `<section class="section ways" id="programs" aria-labelledby="ways-title">`,
    `<div class="wrap">`,
    `<h2 id="ways-title">${esc(w.heading)}</h2>`,
    `<p class="section-lede">${esc(w.lede)}</p>`,
    `<ul class="way-grid" role="list">${cards}</ul>`,
    `<p class="ways-every">${esc(w.every)}</p>`,
    `<p class="ways-free">${esc(w.notReadyBefore)}<a class="text-link" href="${esc(FREE_SKILLS_HREF)}">${esc(w.notReadyLink)}</a></p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** One row of the Library by who it is for: each skill a link to its page, tagged free or locked. */
function row(r: (typeof HOME.library.rows)[number], i: number): string {
  const items = r.slugs
    .map((slug) => {
      const e = entryFor(slug);
      const tag = paid(e) ? lockTag(HOME.library.locked) : freeTag(HOME.library.free);
      return `<li><a href="${esc(e.href ?? '/library')}">${esc(e.title)}</a> ${tag}</li>`;
    })
    .join('');
  return `<li class="row card"><h3 id="row-${i + 1}">${esc(r.heading)}</h3><ul class="row-list" role="list">${items}</ul><p class="row-meta">${esc(HOME.library.count(r.slugs.length))}</p></li>`;
}

function library(): string {
  const l = HOME.library;
  const n = liveEntries().length;
  return [
    `<section class="section library" aria-labelledby="library-title">`,
    `<div class="wrap">`,
    `<h2 id="library-title">${esc(l.heading)}</h2>`,
    `<p class="section-lede">${esc(l.body(n))}</p>`,
    `<ul class="rows" role="list">${l.rows.map(row).join('')}</ul>`,
    `<p class="section-more"><a class="btn btn-secondary" href="/library">${esc(l.all(n))}</a></p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Offer Strategy's practice output, as a sheet of paper. */
function sheet(): string {
  const s = HOME.sheet;
  const terms = s.terms
    .map((t, i) => `<div class="term"><dt>${box(t.done)}${esc(t.term)}</dt><dd${i === 0 ? ' class="lead"' : ''}>${esc(t.value)}</dd></div>`)
    .join('');
  return [
    `<figure class="sheet" aria-label="${esc(s.label)}">`,
    `<p class="sheet-meta">${esc(s.meta)}</p>`,
    `<p class="sheet-title">${esc(s.title)}</p>`,
    `<p class="sheet-rec">${esc(s.recommendation)}</p>`,
    `<dl class="sheet-terms">${terms}</dl>`,
    `<p class="sheet-initials"><span class="initials" aria-hidden="true"></span>${esc(s.initials)}</p>`,
    `</figure>`,
  ].join('\n');
}

function trust(): string {
  const t = HOME.trust;
  const items = t.items.map((it) => `<li>${box(it.done)}<strong>${esc(it.label)}</strong><span>${esc(it.body)}</span></li>`).join('');
  return [
    `<section class="section trust" aria-labelledby="trust-title">`,
    `<div class="wrap trust-in">`,
    `<div>`,
    `<h2 id="trust-title">${esc(t.heading)}</h2>`,
    `<ul class="role-list" role="list">${items}</ul>`,
    `</div>`,
    sheet(),
    `</div>`,
    `</section>`,
  ].join('\n');
}

function free(): string {
  const f = HOME.free;
  const col = (c: (typeof f.columns)[number]) =>
    `<div class="card free-col"><h3>${esc(c.heading)}</h3><ul role="list">${c.slugs
      .map((slug) => {
        const e = entryFor(slug);
        return `<li><a href="${esc(e.href!)}">${esc(e.title)}</a><span>${esc(e.description)}</span></li>`;
      })
      .join('')}</ul></div>`;
  return [
    `<section class="section free" aria-labelledby="free-title">`,
    `<div class="wrap">`,
    `<h2 id="free-title">${esc(f.heading)}</h2>`,
    `<p class="section-lede">${esc(f.lede)}</p>`,
    `<div class="free-cols">${f.columns.map(col).join('')}</div>`,
    `<p class="section-more"><a class="text-link" href="${esc(f.all.href)}">${esc(f.all.label)}</a></p>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function end(): string {
  const e = HOME.end;
  return [
    `<section class="section end" aria-labelledby="end-title">`,
    `<div class="wrap end-in">`,
    `<h2 id="end-title">${esc(e.heading)}</h2>`,
    `<p class="section-lede">${esc(e.body)}</p>`,
    `<div class="actions">`,
    `<a class="btn btn-primary" href="${esc(e.primary.href)}">${esc(e.primary.label)}</a>`,
    `<a class="btn btn-secondary" href="${esc(e.secondary.href)}">${esc(e.secondary.label)}</a>`,
    `</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Everything inside <body>: Spring's nine sections, in her order. */
export function renderHomeBody(): string {
  return [
    skipLink(),
    siteHeader('/'),
    `<main id="main" tabindex="-1">`,
    hero(),
    proof(),
    shift(),
    ways(),
    library(),
    trust(),
    free(),
    meetSection(),
    end(),
    `</main>`,
    siteFooter(),
  ].join('\n');
}
