// The pieces every www page shares, as strings (DECISIONS.md D-107): the skip link, the header with
// the main nav and the Get 5 Free Skills button, the footer, and the head's share tags.
//
// No script anywhere: on a phone the nav wraps onto a second row under the logo and the button, and
// Programs opens its menu as a <details>, by a tap, a click or the keyboard. Every string goes through
// `esc()`. Each page imports `site.css` from its own
// stylesheet, so the build inlines one stylesheet per page.

import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import { ICONS } from '@ai/core/icons';
import type { IconName } from '@ai/core/icons';
import { esc, logo } from '../ai101/render';
import { HELP_EMAIL, PROGRAMS, SITE } from './content';

/** A page's head lines: title, description, canonical address and the Open Graph and Twitter tags. */
export interface PageMeta {
  title: string;
  description: string;
  /** The page's path on www, e.g. `/pricing`. */
  path: string;
  /** The share image, a path on www, with its size and what it shows. */
  image?: { src: string; width: number; height: number; alt: string };
}

const absolute = (path: string) => new URL(path, SITE.url).toString();

export function siteHead(m: PageMeta): string {
  const url = absolute(m.path);
  return [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
    ...(m.image
      ? [
          `<meta property="og:image" content="${esc(absolute(m.image.src))}" />`,
          `<meta property="og:image:width" content="${m.image.width}" />`,
          `<meta property="og:image:height" content="${m.image.height}" />`,
          `<meta property="og:image:alt" content="${esc(m.image.alt)}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
        ]
      : [`<meta name="twitter:card" content="summary" />`]),
  ].join('\n    ');
}

/** The skip link: off screen until a keyboard reaches it. */
export const skipLink = (): string => `<a class="skip" href="#main">${esc(SITE.skip)}</a>`;

type NavLink = { label: string; href: string };
type NavItem = NavLink & { menu?: readonly NavLink[] };

/**
 * The header: the logo (home), the main nav and the Get 5 Free Skills button. `current` is the page's
 * own path; its link carries `aria-current="page"`, once. A top-level link wins: on /library that's
 * The Library, not the menu's Amplified Insiders. When the page is in the Programs menu, its link is
 * marked and so is the menu's summary (`data-current`), so the nav shows where you are while closed.
 */
export function siteHeader(current: string): string {
  const n = SITE.nav;
  const items: readonly NavItem[] = n.links;
  const top = new Set(items.filter((l) => !l.menu).map((l) => l.href));
  const here = (href: string) => href === current;
  const a = (l: NavLink, mark: boolean) => `<a href="${esc(l.href)}"${mark ? ' aria-current="page"' : ''}>${esc(l.label)}</a>`;
  const item = (l: NavItem) => {
    if (!l.menu) return `<li>${a(l, here(l.href))}</li>`;
    const marked = (m: NavLink) => here(m.href) && !top.has(m.href);
    return [
      `<li class="site-menu">`,
      `<details${l.menu.some(marked) ? ' data-current' : ''}>`,
      `<summary>${esc(l.label)}${icon('chevD')}</summary>`,
      `<ul class="site-menu-list" role="list">${l.menu.map((m) => `<li>${a(m, marked(m))}</li>`).join('')}</ul>`,
      `</details>`,
      `</li>`,
    ].join('');
  };
  return [
    `<header class="site-top">`,
    `<div class="wrap site-top-in">`,
    `<a class="site-brand" href="/" data-brand-slot="signature"${current === '/' ? ' aria-current="page"' : ''}>${logo(signatureSvg, SITE.logoAlt, 'site-logo')}</a>`,
    `<nav class="site-nav" aria-label="${esc(n.label)}"><ul role="list">${items.map(item).join('')}</ul></nav>`,
    `<a class="btn btn-primary btn-sm site-cta" href="${esc(n.cta.href)}">${esc(n.cta.label)}</a>`,
    `</div>`,
    `</header>`,
  ].join('\n');
}

/** "Questions? Write to support@amplifiedimpact.io." with the address as a link. */
export const contactLine = (cls = 'site-contact'): string =>
  `<p class="${cls}">${esc(SITE.footer.contactBefore)}<a href="mailto:${esc(HELP_EMAIL)}">${esc(HELP_EMAIL)}</a>${esc(SITE.footer.contactAfter)}</p>`;

export function siteFooter(): string {
  const f = SITE.footer;
  const list = (items: readonly { label: string; href: string }[]) =>
    `<ul role="list">${items.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul>`;
  return [
    `<footer class="site-foot">`,
    `<div class="wrap site-foot-in">`,
    `<div class="site-foot-about">`,
    `<p class="site-foot-name">${esc(f.byline)}</p>`,
    `<p>${esc(f.tagline)}</p>`,
    contactLine(),
    `</div>`,
    `<nav aria-label="${esc(f.programsLabel)}">${list(PROGRAMS)}</nav>`,
    `<nav aria-label="${esc(f.siteLabel)}">${list([{ label: 'Home', href: '/' }, ...SITE.nav.links])}</nav>`,
    `<nav aria-label="${esc(f.legalLabel)}">${list(f.legal)}</nav>`,
    `</div>`,
    `</footer>`,
  ].join('\n');
}

/** An icon from the house set (`ICONS` in @ai/core), drawn as the set says: 24 by 24, stroked. Decorative. */
export const icon = (name: IconName): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${ICONS[name]}"/></svg>`;

/** The tags the Library shows: "Free" for the five free skills, a lock and "Locked" for the rest. Text, never colour alone. */
export const freeTag = (label = 'Free'): string => `<span class="tag tag-free">${esc(label)}</span>`;
export const lockTag = (label = 'Locked'): string => `<span class="tag tag-lock">${icon('lock')}${esc(label)}</span>`;
