// www's homepage, `/` on the marketing host, as strings, from `content.ts` (DECISIONS.md D-102).
//
// Built once by `vite-plugin.ts` into `dist/home.html`, its stylesheet inlined by `ai101Inline()`, and
// served by `apps/api/src/routes/marketing.ts` at `/` on MARKETING_HOST only. It replaces the "under
// construction" placeholder (D-029), and like it carries NO SCRIPT: nothing to hash under § 9.4's CSP,
// nothing to fail in an in-app browser. Every request it makes is to this site: the font files, which
// /library already loads, and the one hero photo.
//
// Counts and names come from the library (`../library/content.ts`) and the Team Plan from /offer
// (`../offer/content.ts`, `@ai/core/offer`), so this page cannot drift from either. Every string goes
// through `esc()`.

import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import { PLAN_NAMES } from '@ai/core/offer';
import { esc, logo } from '../ai101/render';
import { ENTRIES, type Entry } from '../library/content';
import { paid } from '../library/render';
import { CARDS_COPY } from '../offer/content';
import { HERO_PHOTO, HOME } from './content';

/** The library's live cards: the ones with a page. */
export const liveEntries = (): Entry[] => ENTRIES.filter((e) => e.href !== null);

/** The library card for a page, by its slug. A build error when there is none, so a row never names a missing page. */
export function entryFor(slug: string): Entry {
  const entry = ENTRIES.find((e) => e.href === `/${slug}`);
  if (!entry) throw new Error(`The homepage names /${slug}, but no library card links to it. Fix HOME.skills.rows in src/home/content.ts.`);
  return entry;
}

const absolute = (path: string) => new URL(path, HOME.meta.url).toString();

/** The <head> lines that come from the page's content. */
export function renderHomeHead(): string {
  const { title, description, url, siteName, imageAlt } = HOME.meta;
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(siteName)}" />`,
    `<meta property="og:image" content="${esc(absolute(HERO_PHOTO.src))}" />`,
    `<meta property="og:image:width" content="${HERO_PHOTO.width}" />`,
    `<meta property="og:image:height" content="${HERO_PHOTO.height}" />`,
    `<meta property="og:image:alt" content="${esc(HERO_PHOTO.alt || imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ');
}

/** The contract checkbox (the page's one signature): ticked for what is done, empty for what is the agent's. Drawn only. */
const box = (done: boolean) => `<span class="box${done ? ' on' : ''}" aria-hidden="true"></span>`;

function top(): string {
  const n = HOME.nav;
  return [
    `<header class="top">`,
    `<div class="wrap top-in">`,
    `<a class="brand" href="/" data-brand-slot="signature">${logo(signatureSvg, HOME.logoAlt, 'brand-logo')}</a>`,
    `<nav class="nav" aria-label="${esc(n.label)}"><ul role="list">`,
    ...n.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`),
    `</ul></nav>`,
    `<a class="btn btn-primary btn-sm top-cta" href="${esc(n.cta.href)}">${esc(n.cta.label)}</a>`,
    `</div>`,
    `</header>`,
  ].join('\n');
}

/** Offer Strategy's practice output, as a sheet of paper rising from the hero's bottom edge. */
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

/**
 * The hero, split: the words on the left, the photo on the right, the sheet rising over the photo's
 * bottom edge. The photo never sits behind the words, so a real photo cannot cost them their contrast.
 */
function hero(): string {
  const h = HOME.hero;
  const p = HERO_PHOTO;
  return [
    `<section class="hero" aria-labelledby="hero-title">`,
    `<div class="hero-panel">`,
    `<div class="hero-text">`,
    `<h1 id="hero-title">${esc(h.title)}</h1>`,
    `<p class="lede">${esc(h.lede)}</p>`,
    `<div class="actions">`,
    `<a class="btn btn-primary" href="${esc(h.primary.href)}">${esc(h.primary.label)}</a>`,
    `<a class="btn btn-secondary" href="${esc(h.secondary.href)}">${esc(h.secondary.label)}</a>`,
    `</div>`,
    `</div>`,
    `<div class="hero-photo"><img src="${esc(p.src)}" alt="${esc(p.alt)}" width="${p.width}" height="${p.height}" decoding="async" fetchpriority="high" /></div>`,
    `</div>`,
    sheet(),
    `</section>`,
  ].join('\n');
}

/** One row of the library by who it is for: each skill a link to its page, a free one tagged. */
function row(r: (typeof HOME.skills.rows)[number], i: number): string {
  const links = r.slugs
    .map((slug) => {
      const e = entryFor(slug);
      const link = `<a href="${esc(e.href ?? '/library')}">${esc(e.title)}</a>`;
      if (paid(e)) return link;
      // The name and its tag in one unbreakable piece, so the tag never starts a line on its own.
      return `<span class="with-tag">${link} <span class="free">${esc(HOME.skills.free)}</span></span>`;
    })
    .join(', ');
  return [
    `<li class="row">`,
    `<h3 id="row-${i + 1}">${esc(r.heading)}</h3>`,
    `<p class="row-list">${links}</p>`,
    `<p class="row-meta">${esc(HOME.skills.count(r.slugs.length))}</p>`,
    `</li>`,
  ].join('');
}

function skills(): string {
  const s = HOME.skills;
  const n = liveEntries().length;
  return [
    `<section class="skills" aria-labelledby="skills-title">`,
    `<div class="wrap skills-in">`,
    `<div class="skills-intro">`,
    `<h2 id="skills-title">${esc(s.heading)}</h2>`,
    `<p>${esc(s.body(n))}</p>`,
    `<p class="small">${esc(s.note)}</p>`,
    `<a class="btn btn-secondary" href="/library">${esc(s.all(n))}</a>`,
    `</div>`,
    `<ul class="rows" role="list">${s.rows.map(row).join('')}</ul>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function roles(): string {
  const r = HOME.roles;
  const t = HOME.team;
  const plan = CARDS_COPY.agents;
  const items = r.items
    .map((it) => `<li>${box(it.done)}<strong>${esc(it.label)}</strong><span>${esc(it.body)}</span></li>`)
    .join('');
  return [
    `<section class="roles" aria-labelledby="roles-title">`,
    `<div class="wrap roles-in">`,
    `<div>`,
    `<h2 id="roles-title">${esc(r.heading)}</h2>`,
    `<ul class="role-list" role="list">${items}</ul>`,
    `</div>`,
    `<section class="card team" id="${esc(t.id)}" aria-labelledby="team-title">`,
    `<p class="label">${esc(t.label)}</p>`,
    `<h3 id="team-title">${esc(PLAN_NAMES.agents)}</h3>`,
    `<p>${esc(plan.forWho)}</p>`,
    `<ul class="team-lines" role="list">${plan.lines
      .slice(0, t.lines)
      .map((l) => `<li>${esc(l)}</li>`)
      .join('')}</ul>`,
    `<div class="team-actions">`,
    `<a class="btn btn-secondary" href="${esc(t.button.href)}">${esc(t.button.label)}</a>`,
    `<a class="text-link" href="${esc(t.all.href)}">${esc(t.all.label)}</a>`,
    `</div>`,
    `</section>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

function footer(): string {
  const f = HOME.footer;
  const links = f.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('');
  return [
    `<footer class="foot">`,
    `<div class="wrap foot-in">`,
    `<p>${esc(f.byline)}</p>`,
    `<nav aria-label="${esc(f.label)}"><ul role="list">${links}</ul></nav>`,
    `</div>`,
    `</footer>`,
  ].join('\n');
}

/** Everything inside <body>. */
export function renderHomeBody(): string {
  return [
    `<a class="skip" href="#main">${esc(HOME.skip)}</a>`,
    top(),
    `<main id="main" tabindex="-1">`,
    hero(),
    skills(),
    roles(),
    `</main>`,
    footer(),
  ].join('\n');
}
