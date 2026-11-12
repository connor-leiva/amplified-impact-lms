// /about, as strings (DECISIONS.md D-117): the v2 mockup's AboutPage, built on the kit (`../kit/`), with
// the live page's words: Spring and Connor by their own photos and the brief's bios, word for word, the
// Utah Life story, and why we built this. Built once by `../site/vite-plugin.ts` into `dist/about.html`.
//
// NO TOKEN: the page is the same for everyone. The kit's script only animates. Left out on purpose (the
// brief): the mockup's "How we work", its initials, and every stat the live page doesn't say.

import { esc } from '../ai101/render';
import { HOME } from '../home/content';
import { FREE_SKILLS_HREF } from '../site/content';
import { photoTag } from '../site/people';
import { siteHead } from '../site/render';
import { ripple } from '../kit/icons';
import { button, closeCta, eyebrow, headline, pad2, proofSection } from '../kit/parts';
import { kitFooter, kitHeader, kitSkip } from '../kit/render';
import { ABOUT_END, ABOUT_HERO, ABOUT_META, ABOUT_PHOTOS, BIOS, STORY, V2_RINGS, WHY } from './content';

export function renderAboutHead(): string {
  return siteHead(ABOUT_META);
}

type Who = 'spring' | 'connor';
const PEOPLE: readonly Who[] = ['spring', 'connor'];

/** The page's two buttons: the hero's and the close's, the live page's words. */
const actions = () =>
  `${button(ABOUT_END.primary, FREE_SKILLS_HREF)}${button(ABOUT_END.secondary, '/pricing', { variant: 'link' })}`;

/** The hero: the live words beside the mockup's pair of portraits, each captioned with its live role. */
function hero(): string {
  const h = ABOUT_HERO;
  const figs = PEOPLE.map(
    (k, i) =>
      `<figure class="ab-fig ab-fig-${i + 1}"><div class="portrait">${photoTag(ABOUT_PHOTOS[k], 'portrait-img', true)}</div><figcaption><span class="ab-cap-name">${esc(
        BIOS[k].name,
      )}</span><span class="mono ab-cap-role">${esc(BIOS[k].role)}</span></figcaption></figure>`,
  ).join('');
  return [
    `<section class="sec ab-hero about-hero" aria-labelledby="about-title" data-scroll="exit">`,
    `<div class="ab-ripple" aria-hidden="true">${ripple(900, { intro: true, center: false })}</div>`,
    `<div class="wrap ab-hero-grid">`,
    `<div class="ab-hero-copy">`,
    eyebrow(h.eyebrow, { mark: true, cls: 'eyebrow' }),
    `<h1 id="about-title" class="h-hero ab-title">${headline(h.title)}</h1>`,
    `<p class="lead section-lede fade-1">${esc(h.lede)}</p>`,
    `<div class="actions fade-2">${actions()}</div>`,
    `</div>`,
    `<div class="ab-pair">${figs}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** The first sentence of a paragraph, and the rest: the same words, set as the mockup's title and line. */
export function splitLead(p: string): readonly [string, string] {
  const m = /^(.+?[.?])\s+(.+)$/.exec(p);
  return m ? [m[1]!, m[2]!] : [p, ''];
}

/** The mockup's rings, center out: one per `V2_RINGS` label, in the 760-unit box. */
const RING_R = [40, 118, 196, 274, 352] as const;

function rings(): string {
  const circles = RING_R.slice(1)
    .map(
      (r, i, all) =>
        `<circle class="sr-ghost" cx="380" cy="380" r="${r}"/><circle class="sr-ring${i === all.length - 1 ? ' is-out' : ''}" style="--ri:${i}" cx="380" cy="380" r="${r}" pathLength="1" transform="rotate(-90 380 380)"/>`,
    )
    .join('');
  const labels = V2_RINGS.map((label, i) => {
    // Each label sits on its ring at the top, where the ring starts to draw; the center's sits under it.
    const top = i === 0 ? 50 + ((RING_R[0] + 14) / 760) * 100 : 50 - (RING_R[i]! / 760) * 100;
    return `<span class="sr-label${i === 0 ? ' is-center' : ''}" style="top:${top.toFixed(2)}%;--ri:${i}"><span class="mono">${esc(label)}</span></span>`;
  }).join('');
  return `<div class="sr" data-in aria-hidden="true"><svg class="sr-svg" viewBox="0 0 760 760"><circle class="sr-outer" cx="380" cy="380" r="374"/>${circles}<circle class="sr-center" cx="380" cy="380" r="${RING_R[0]}"/><circle class="sr-dot" cx="380" cy="380" r="13"/></svg>${labels}</div>`;
}

/** Why we built this: the live paragraphs, numbered, beside the mockup's rings drawing outward. */
function why(): string {
  const items = WHY.body
    .map((p, i) => {
      const [t, b] = splitLead(p);
      return `<li><p class="mono story-k" aria-hidden="true">${pad2(i + 1)}</p><p class="story-p"><span class="story-t">${esc(t)}</span>${b ? ` <span class="story-b">${esc(b)}</span>` : ''}</p></li>`;
    })
    .join('');
  return [
    `<section class="sec story why" aria-labelledby="why-title">`,
    `<div class="wrap story-grid">`,
    `<div class="story-copy rv"><h2 id="why-title" class="h-section story-title">${esc(WHY.heading)}</h2><ol class="story-list" role="list">${items}</ol></div>`,
    `<div class="story-art">${rings()}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

/** Meet Spring and Connor (the homepage's heading), on the other theme: each photo, name, role and bio. */
function people(): string {
  const cards = PEOPLE.map(
    (k, i) =>
      `<article class="person bio rv" style="--d:${i * 120}ms" aria-labelledby="bio-${k}"><div class="portrait person-photo">${photoTag(ABOUT_PHOTOS[k], 'portrait-img')}</div><div class="person-body bio-text"><h3 id="bio-${k}" class="person-name">${esc(
        BIOS[k].name,
      )}</h3><p class="mono person-role bio-role">${esc(BIOS[k].role)}</p><p class="person-bio">${esc(BIOS[k].body)}</p></div></article>`,
  ).join('');
  return [
    `<section id="founders" class="sec people inverse" aria-labelledby="people-title">`,
    `<div class="wrap">`,
    `<div class="people-head rv"><h2 id="people-title" class="h-section">${esc(HOME.meet.heading)}</h2></div>`,
    `<div class="people-grid">${cards}</div>`,
    `</div>`,
    `</section>`,
  ].join('\n');
}

export function renderAboutBody(): string {
  return [
    kitSkip(),
    kitHeader('/about'),
    `<main id="main" tabindex="-1">`,
    hero(),
    // The Utah Life story, as the kit's proof section: its live heading, the group, its numbers and words.
    proofSection({ heading: STORY.heading, body: STORY.body.join(' ') }),
    why(),
    people(),
    closeCta({ title: ABOUT_END.heading, actions: actions(), free: true, cls: 'about-end' }),
    `</main>`,
    kitFooter(),
  ].join('\n');
}

/** The names `../site/vite-plugin.ts` builds every site page from. */
export const renderHead = renderAboutHead;
export const renderBody = renderAboutBody;
