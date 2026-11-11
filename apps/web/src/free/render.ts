// /free, Free Resources, as strings (DECISIONS.md D-116), from `content.ts` and each resource's own
// Library card (`../library/content.ts`). Built once by `../site/vite-plugin.ts` into `dist/free.html`,
// its stylesheet inlined, and served on www. No script, no token: every link is in the markup.

import { esc } from '../ai101/render';
import { ENTRIES, type Entry } from '../library/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { AI101_SIGNUP, COLUMNS, FREE_HERO, FREE_META, OPEN_LABEL, SKILLS } from './content';

/** A resource's Library card, by its page: a build error when there is none. */
export function resource(slug: string): Entry {
  const e = ENTRIES.find((x) => x.href === `/${slug}`);
  if (!e) throw new Error(`/free names /${slug}, but no Library card links to it. Fix src/free/content.ts.`);
  return e;
}

export function renderFreeHead(): string {
  return siteHead(FREE_META);
}

function column(c: (typeof COLUMNS)[number], i: number): string {
  const items = c.slugs
    .map((slug) => {
      const e = resource(slug);
      return `<li class="card res"><h3><a href="${esc(e.href!)}">${esc(e.title)}</a></h3><p>${esc(e.description)}</p><p class="res-open" aria-hidden="true">${esc(OPEN_LABEL)} &rarr;</p></li>`;
    })
    .join('');
  // AI 101's registration goes with the agents' column (Spring's plan).
  const signup =
    i === 0
      ? `<li class="card res res-ext"><h3><a href="${esc(AI101_SIGNUP.href)}" rel="noopener">${esc(AI101_SIGNUP.label)}</a></h3><p>${esc(AI101_SIGNUP.body)}</p><p class="res-open" aria-hidden="true">ai.springb.co &rarr;</p></li>`
      : '';
  return `<section class="free-col" aria-labelledby="col-${i}"><h2 id="col-${i}">${esc(c.heading)}</h2><ul class="res-list" role="list">${items}${signup}</ul></section>`;
}

export function renderFreeBody(): string {
  const h = FREE_HERO;
  return [
    skipLink(),
    siteHeader('/free'),
    `<main id="main" tabindex="-1">`,
    `<section class="free-hero" aria-labelledby="free-title"><div class="wrap">`,
    `<p class="eyebrow">${esc(h.eyebrow)}</p>`,
    `<h1 id="free-title">${esc(h.title)}</h1>`,
    `<p class="section-lede">${esc(h.lede)}</p>`,
    `</div></section>`,
    `<div class="wrap free-cols">${COLUMNS.map(column).join('')}</div>`,
    `<section class="section free-skills" aria-labelledby="skills-title"><div class="wrap">`,
    `<h2 id="skills-title">${esc(SKILLS.heading)}</h2>`,
    `<p class="section-lede">${esc(SKILLS.body)}</p>`,
    `<p class="free-actions"><a class="btn btn-primary" href="${esc(FREE_SKILLS_HREF)}">${esc(SKILLS.button)}</a> <a class="btn btn-secondary" href="/pricing">${esc(SKILLS.more)}</a></p>`,
    `</div></section>`,
    `</main>`,
    siteFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderFreeHead;
export const renderBody = renderFreeBody;
