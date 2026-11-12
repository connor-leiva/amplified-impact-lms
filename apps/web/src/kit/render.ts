// The kit's header and footer, as strings: the mockup's SiteHeader and SiteFooter with the live site's
// words and links (`../site/content.ts`, the one copy every www page reads).
//
// THE HOMEPAGE KEEPS ITS OWN. It renders `../site/render.ts`'s header and footer, restyled in
// `home.css`, and is left exactly as it is; these are for the pages built on the kit.
//
// NO SCRIPT NEEDED. Programs opens its panel as a <details>, and so does the phone menu's button; a link
// inside goes to its page. `client/main.ts` adds what only a script can: the header turning solid as
// you scroll, hover to open, Escape and a click outside to close, the theme switch (hidden until then,
// since it can't work without it), the page held still behind the phone menu.

import signatureSvg from '../assets/brand/amplified-impact-signature.svg?raw';
import { esc, logo } from '../ai101/render';
import { HOME } from '../home/content';
import { HELP_EMAIL, PROGRAMS, SITE } from '../site/content';
import { KIT, KIT_PROGRAMS } from './content';
import { brandIcon, glyph, ripple, themeGlyph } from './icons';

type NavLink = { label: string; href: string };

const COMPARE = SITE.nav.links[0].menu.at(-1)!;
const TOP: readonly NavLink[] = SITE.nav.links.slice(1);

/** The skip link: off screen until a keyboard reaches it. */
export const kitSkip = (): string => `<a class="skip" href="#main">${esc(SITE.skip)}</a>`;

/** The signature, drawn for the eye only (the header's carries the name). */
const signatureDecor = (): string =>
  signatureSvg
    .trim()
    .replace(/\swidth="[^"]*"\s+height="[^"]*"/, '')
    .replace('<svg ', '<svg class="sig" aria-hidden="true" focusable="false" ');

/** Where the footer's ripple starts: the signature's ring and dot, as a share of its box. */
function tittle(): { left: number; top: number } {
  const vb = /viewBox="([^"]+)"/.exec(signatureSvg)?.[1]?.split(/\s+/).map(Number);
  const ring = [...signatureSvg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)].at(-1);
  if (!vb || vb.length !== 4 || !ring)
    throw new Error('The signature has no viewBox or no ring. Fix src/kit/render.ts.');
  const [x, y, w, h] = vb as [number, number, number, number];
  const pct = (n: number) => Math.round(n * 10000) / 100;
  return { left: pct((Number(ring[1]) - x) / w), top: pct((Number(ring[2]) - y) / h) };
}

/**
 * The header: the signature (home), Programs and its panel, The Library, Free Resources, About, then
 * the theme switch, Log In and Get 5 Free Skills; under 1080px, the menu button and its panel instead.
 * `current` is the page's own path. A top-level link wins: on /library that's The Library, not the
 * menu's program that links there. Programs is marked when the page is one of its links.
 */
export function kitHeader(current: string): string {
  const n = SITE.nav;
  const top = new Set(TOP.map((l) => l.href));
  const here = (href: string) => href === current;
  const inMenu = (href: string) => here(href) && !top.has(href);
  const mark = (on: boolean) => (on ? ' aria-current="page"' : '');
  const menuHere = KIT_PROGRAMS.some((p) => inMenu(p.href)) || inMenu(COMPARE.href);

  const cards = KIT_PROGRAMS.map(
    (p, i) =>
      `<a class="pm-card" href="${esc(p.href)}" style="--pi:${i}"${mark(inMenu(p.href))}><span class="pm-ic">${brandIcon(p.icon, 22)}</span><span class="pm-name">${esc(
        p.label,
      )}</span><span class="pm-who">${esc(p.who)}</span></a>`,
  ).join('');
  const all = `<a class="pm-card pm-all" href="${esc(COMPARE.href)}" style="--pi:${KIT_PROGRAMS.length}"${mark(inMenu(COMPARE.href))}><span class="pm-name">${esc(
    COMPARE.label,
  )}</span><span class="pm-go">${glyph('arrow', 20)}</span></a>`;

  const programs = [
    `<details class="hdr-programs">`,
    `<summary class="hdr-link hdr-trigger${menuHere ? ' is-current' : ''}">${esc(n.links[0].label)}${glyph('chevron', 16)}</summary>`,
    `<div class="pm"><div class="wrap pm-grid">${cards}${all}</div></div>`,
    `</details>`,
  ].join('');

  const phone = [
    `<details class="hdr-mobile">`,
    `<summary class="icon-btn menu-btn" aria-label="${esc(KIT.menuOpen)}" data-label-open="${esc(KIT.menuOpen)}" data-label-close="${esc(KIT.menuClose)}">${glyph(
      'menu',
      22,
      'gl-menu',
    )}${glyph('close', 22, 'gl-close')}</summary>`,
    `<div class="menu"><div class="wrap menu-in">`,
    `<p class="mono menu-label">${esc(n.links[0].label)}</p>`,
    `<ul class="menu-programs" role="list">${KIT_PROGRAMS.map(
      (p, i) =>
        `<li style="--mi:${i}"><a class="menu-program" href="${esc(p.href)}"${mark(inMenu(p.href))}>${brandIcon(p.icon, 22)}<span>${esc(p.label)}</span></a></li>`,
    ).join(
      '',
    )}<li style="--mi:${KIT_PROGRAMS.length}"><a class="menu-program" href="${esc(COMPARE.href)}"${mark(inMenu(COMPARE.href))}>${glyph('arrow', 22)}<span>${esc(
      COMPARE.label,
    )}</span></a></li></ul>`,
    `<nav class="menu-nav" aria-label="${esc(KIT.menuNav)}"><ul role="list">${[...TOP, n.login]
      .map(
        (l, i) =>
          `<li style="--mi:${KIT_PROGRAMS.length + 1 + i}"><a href="${esc(l.href)}"${mark(here(l.href))}>${esc(l.label)}</a></li>`,
      )
      .join('')}</ul></nav>`,
    `<a class="btn btn-primary btn-lg menu-cta" href="${esc(n.cta.href)}">${esc(n.cta.label)}</a>`,
    `</div></div>`,
    `</details>`,
  ].join('');

  return [
    `<header class="hdr">`,
    `<div class="wrap hdr-in">`,
    `<a class="hdr-logo" href="/" data-brand-slot="signature">${logo(signatureSvg, SITE.logoAlt, 'sig')}</a>`,
    `<nav class="hdr-nav" aria-label="${esc(n.label)}">${programs}${TOP.map(
      (l) => `<a class="hdr-link" href="${esc(l.href)}"${mark(here(l.href))}>${esc(l.label)}</a>`,
    ).join('')}</nav>`,
    `<div class="hdr-actions">`,
    `<button type="button" class="icon-btn theme-btn" hidden aria-label="${esc(KIT.themeTo.light)}" title="${esc(KIT.themeTo.light)}" data-label-light="${esc(
      KIT.themeTo.light,
    )}" data-label-dark="${esc(KIT.themeTo.dark)}">${themeGlyph()}</button>`,
    `<a class="hdr-link hdr-login" href="${esc(n.login.href)}">${esc(n.login.label)}</a>`,
    `<a class="btn btn-secondary btn-sm hdr-cta" href="${esc(n.cta.href)}">${esc(n.cta.label)}</a>`,
    phone,
    `</div>`,
    `</div>`,
    `</header>`,
  ].join('\n');
}

/**
 * The footer: the tagline and "Questions? Write to support@…", the Programs, Site and Legal columns
 * (the live footer's links, in its order), the signature drawn large with the ripple starting from its
 * ring and dot, and the byline beside the proof's place.
 */
export function kitFooter(): string {
  const f = SITE.footer;
  const col = (id: string, label: string, links: readonly NavLink[]) =>
    `<nav class="foot-col" aria-labelledby="foot-${id}"><p class="mono foot-h" id="foot-${id}">${esc(label)}</p><ul role="list">${links
      .map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`)
      .join('')}</ul></nav>`;
  const t = tittle();
  return [
    `<footer class="sec foot">`,
    `<div class="wrap">`,
    `<div class="foot-top">`,
    `<div class="foot-brand"><p class="foot-line">${esc(f.tagline)}</p><p class="foot-contact">${esc(f.contactBefore)}<a class="foot-mail" href="mailto:${esc(
      HELP_EMAIL,
    )}">${esc(HELP_EMAIL)}</a>${esc(f.contactAfter)}</p></div>`,
    `<div class="foot-cols">`,
    col('programs', f.programsLabel, PROGRAMS),
    col('site', f.siteLabel, [{ label: 'Home', href: '/' }, ...SITE.nav.links, SITE.nav.login]),
    col('legal', f.legalLabel, f.legal),
    `</div>`,
    `</div>`,
    `<div class="foot-mark">`,
    `<div class="foot-ripple" style="left:${t.left}%;top:${t.top}%" aria-hidden="true">${ripple(1000, { center: false })}</div>`,
    signatureDecor(),
    `</div>`,
    `<div class="foot-bottom"><span>${esc(f.byline)}</span><span>${esc(HOME.proof.label)}</span></div>`,
    `</div>`,
    `</footer>`,
  ].join('\n');
}
