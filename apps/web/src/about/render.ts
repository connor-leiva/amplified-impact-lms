// /about, as strings (DECISIONS.md D-117), from `content.ts`, the homepage's proof line and the site's
// header and footer. Built once by `../site/vite-plugin.ts` into `dist/about.html`, its stylesheet
// inlined, and served on www. No script, no token.

import { esc } from '../ai101/render';
import { HOME } from '../home/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { photoTag } from '../site/people';
import { siteFooter, siteHead, siteHeader, skipLink } from '../site/render';
import { ABOUT_END, ABOUT_HERO, ABOUT_META, ABOUT_PHOTOS, BIOS, STORY, WHY } from './content';

export function renderAboutHead(): string {
  const p = ABOUT_PHOTOS.spring;
  return siteHead({ ...ABOUT_META, image: { src: p.src, width: p.width, height: p.height, alt: p.alt } });
}

function person(key: 'spring' | 'connor', eager: boolean): string {
  const b = BIOS[key];
  return [
    `<article class="bio" aria-labelledby="bio-${key}">`,
    photoTag(ABOUT_PHOTOS[key], 'bio-photo', eager),
    `<div class="bio-text">`,
    `<h2 id="bio-${key}">${esc(b.name)}</h2>`,
    `<p class="bio-role">${esc(b.role)}</p>`,
    `<p>${esc(b.body)}</p>`,
    `</div>`,
    `</article>`,
  ].join('');
}

const paras = (list: readonly string[]) => list.map((p) => `<p>${esc(p)}</p>`).join('');

export function renderAboutBody(): string {
  const h = ABOUT_HERO;
  const proof = HOME.proof;
  return [
    skipLink(),
    siteHeader('/about'),
    `<main id="main" tabindex="-1">`,
    `<section class="about-hero" aria-labelledby="about-title"><div class="wrap">`,
    `<p class="eyebrow">${esc(h.eyebrow)}</p>`,
    `<h1 id="about-title">${esc(h.title)}</h1>`,
    `<p class="section-lede">${esc(h.lede)}</p>`,
    `</div></section>`,
    // Spring first: she is the face (Spring's plan). Then Connor, co-founder.
    `<div class="wrap bios">${person('spring', true)}${person('connor', false)}</div>`,
    `<section class="section story" data-theme="light" aria-labelledby="story-title"><div class="wrap two-col">`,
    `<div><h2 id="story-title">${esc(STORY.heading)}</h2>`,
    `<p class="about-proof"><span>${esc(proof.label)}</span> <strong>${esc(proof.figure)}</strong></p></div>`,
    `<div class="prose">${paras(STORY.body)}</div>`,
    `</div></section>`,
    `<section class="section why" data-theme="light" aria-labelledby="why-title"><div class="wrap two-col">`,
    `<h2 id="why-title">${esc(WHY.heading)}</h2>`,
    `<div class="prose">${paras(WHY.body)}</div>`,
    `</div></section>`,
    `<section class="section about-end" aria-labelledby="end-title"><div class="wrap">`,
    `<h2 id="end-title">${esc(ABOUT_END.heading)}</h2>`,
    `<p class="about-actions"><a class="btn btn-primary" href="${esc(FREE_SKILLS_HREF)}">${esc(ABOUT_END.primary)}</a> <a class="btn btn-secondary" href="/pricing">${esc(ABOUT_END.secondary)}</a></p>`,
    `</div></section>`,
    `</main>`,
    siteFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderAboutHead;
export const renderBody = renderAboutBody;
