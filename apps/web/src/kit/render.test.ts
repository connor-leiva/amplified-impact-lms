import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COHORT_SEATS, MEMBERSHIP_NAME, PLAN_NAMES } from '@ai/core/offer';
import { HOME, PHOTOS } from '../home/content';
import { entryFor } from '../home/library-data';
import { FREE_FIVE } from '../library/content';
import { OFFERS } from '../offer/content';
import { HELP_EMAIL, PROGRAMS, SITE } from '../site/content';
import { AGENT_PLAN } from '../site/offers-content';
import { siteFooter } from '../site/render';
import { KIT, KIT_PROGRAMS } from './content';
import { checks, closeCta, exTag, faq, founders, proofLine, proofSection, seatMeter, status } from './parts';
import { kitFooter, kitHeader, kitSkip } from './render';

// The v2 kit (the Claude Design mockup's SiteKit, ported): its header and footer carry the live site's
// words and links, its pieces render only what they're given, and its stylesheet keeps the homepage's
// palette, the self-hosted fonts and Spring's 16px floor.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const parse = (html: string) =>
  new DOMParser().parseFromString(`<!doctype html><body class="aiw" data-theme="dark">${html}</body>`, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const links = (root: ParentNode, selector: string) =>
  [...root.querySelectorAll(selector)].map((a) => [text(a), a.getAttribute('href')]);

const LIVE_PROGRAMS = PROGRAMS.map((p) => [p.label, p.href]);
const LOGIN = 'https://learn.amplifiedimpact.io/login';

describe('the kit header', () => {
  const doc = parse(kitHeader('/about'));
  const nav = doc.querySelector('nav.hdr-nav')!;

  it('has the live nav, in its order: Programs, The Library, Free Resources, About, then Log In and Get 5 Free Skills', () => {
    expect(nav.getAttribute('aria-label')).toBe(SITE.nav.label);
    expect(text(nav.querySelector('summary'))).toBe('Programs');
    expect(links(nav, ':scope > a')).toEqual([
      ['The Library', '/library'],
      ['Free Resources', '/free'],
      ['About', '/about'],
    ]);
    // Log In after About and before the button, in source order too.
    expect([...doc.querySelectorAll('.hdr-nav > a, .hdr-actions > a')].map(text)).toEqual([
      'The Library',
      'Free Resources',
      'About',
      'Log In',
      'Get 5 Free Skills',
    ]);
    expect(links(doc, '.hdr-actions > a')).toEqual([
      ['Log In', LOGIN],
      ['Get 5 Free Skills', '/library?show=free'],
    ]);
  });

  it('opens Programs as a <details>, the four programs in the live order by exact name, then Compare All Programs', () => {
    const panel = nav.querySelector('details.hdr-programs .pm')!;
    expect(links(panel, '.pm-card').map(([, href], i) => [text(panel.querySelectorAll('.pm-name')[i]), href])).toEqual([
      ...LIVE_PROGRAMS,
      ['Compare All Programs', '/pricing'],
    ]);
    expect([...panel.querySelectorAll('.pm-name')].slice(0, 4).map(text)).toEqual([
      PLAN_NAMES.cohort,
      PLAN_NAMES.agents,
      PLAN_NAMES.agent_plan,
      MEMBERSHIP_NAME,
    ]);
    // Who each is for, in /pricing's own words, and never a price (the brief: no prices in the menu).
    expect([...panel.querySelectorAll('.pm-who')].map(text)).toEqual([
      OFFERS.cohort.forWho,
      OFFERS.agents.forWho,
      AGENT_PLAN.forWho,
      OFFERS.membership.forWho,
    ]);
    expect(text(doc.querySelector('header'))).not.toMatch(/\$|founding price|a month|a year/i);
    expect(KIT_PROGRAMS.map((p) => p.href)).toEqual(PROGRAMS.map((p) => p.href));
  });

  it('has the same links in the phone menu, behind a <details> button', () => {
    const menu = doc.querySelector('details.hdr-mobile')!;
    const btn = menu.querySelector('summary.menu-btn')!;
    expect(btn.getAttribute('aria-label')).toBe(KIT.menuOpen);
    expect(btn.getAttribute('data-label-close')).toBe(KIT.menuClose);
    expect(links(menu, '.menu-program')).toEqual([...LIVE_PROGRAMS, ['Compare All Programs', '/pricing']]);
    expect(menu.querySelector('nav')?.getAttribute('aria-label')).toBe(KIT.menuNav);
    expect(links(menu, 'nav a')).toEqual([
      ['The Library', '/library'],
      ['Free Resources', '/free'],
      ['About', '/about'],
      ['Log In', LOGIN],
    ]);
    expect(links(menu, 'a.menu-cta')).toEqual([['Get 5 Free Skills', '/library?show=free']]);
  });

  it('keeps the theme switch hidden until the script can work it, named by the theme it turns on', () => {
    const btn = doc.querySelector<HTMLButtonElement>('button.theme-btn')!;
    expect(btn.hidden).toBe(true);
    expect(btn.type).toBe('button');
    expect([btn.getAttribute('aria-label'), btn.dataset.labelLight, btn.dataset.labelDark]).toEqual([
      KIT.themeTo.light,
      KIT.themeTo.light,
      KIT.themeTo.dark,
    ]);
  });

  it('marks where you are once: a top-level link wins, and Programs shows when the page is in its menu', () => {
    const about = parse(kitHeader('/about'));
    expect([...about.querySelectorAll('.hdr-nav [aria-current="page"]')].map(text)).toEqual(['About']);
    expect(about.querySelector('.hdr-trigger.is-current')).toBeNull();
    const pricing = parse(kitHeader('/pricing'));
    expect(pricing.querySelector('.hdr-trigger.is-current')).not.toBeNull();
    expect(text(pricing.querySelector('nav[aria-label="Main"] details[data-current] summary'))).toBe('Programs');
    expect([...pricing.querySelectorAll('.pm [aria-current="page"] .pm-name')].map(text)).toEqual([
      'Compare All Programs',
    ]);
    const teams = parse(kitHeader('/teams'));
    expect([...teams.querySelectorAll('.pm [aria-current="page"] .pm-name')].map(text)).toEqual([PLAN_NAMES.agents]);
    // On /library, The Library is marked, not a program that links there.
    const library = parse(kitHeader('/library'));
    expect([...library.querySelectorAll('.hdr-nav [aria-current="page"]')].map(text)).toEqual(['The Library']);
    expect(library.querySelectorAll('.pm [aria-current]').length).toBe(0);
  });

  it('carries the brand slot once, Logo 1 named for screen readers, and no inline handler or absolute www link', () => {
    expect(doc.querySelectorAll('[data-brand-slot]').length).toBe(1);
    const slot = doc.querySelector('[data-brand-slot]')!;
    expect([slot.getAttribute('href'), slot.getAttribute('data-brand-slot')]).toEqual(['/', 'logo-1']);
    const logo = slot.querySelector('svg.wm')!;
    expect([logo.getAttribute('role'), logo.getAttribute('aria-label')]).toEqual(['img', 'Amplified Impact']);
    expect(SITE.logoAlt).toBe('Amplified Impact');
    // Logo 1: one path for the letters, and the ring and dot over the second i. Not the signature.
    expect([...logo.children].map((c) => c.getAttribute('class'))).toEqual(['wm-letters', 'wm-ring', 'wm-dot']);
    expect(kitHeader('/about') + kitFooter()).not.toMatch(/class="sig"/);
    const html = kitHeader('/about') + kitFooter() + kitSkip();
    expect(html).not.toMatch(/\son[a-z]+=/i);
    expect(html).not.toMatch(/amplifiedimpact\.io\/(?!login)/);
    expect(html).not.toMatch(/<script|<style/i);
  });
});

describe('the kit footer', () => {
  const doc = parse(kitFooter());
  const live = parse(siteFooter());

  it('has the live footer’s three columns, link for link, and the live contact line', () => {
    // Each column named as the live footer names it, and headed the same for the eye.
    expect(
      [...doc.querySelectorAll('nav.foot-col')].map((n) => [
        n.getAttribute('aria-label'),
        text(n.querySelector('.foot-h')),
      ]),
    ).toEqual([
      ['Programs', 'Programs'],
      ['Site', 'Site'],
      ['Legal', 'Legal'],
    ]);
    const cols = [...doc.querySelectorAll('nav.foot-col')].map((n) => links(n, 'a'));
    expect(cols).toEqual([...live.querySelectorAll('nav')].map((n) => links(n, 'a')));
    expect(text(doc.querySelector('.foot-contact'))).toBe(
      `${SITE.footer.contactBefore}${HELP_EMAIL}${SITE.footer.contactAfter}`,
    );
    expect(doc.querySelector('.foot-mail')?.getAttribute('href')).toBe(`mailto:${HELP_EMAIL}`);
    expect(text(doc.querySelector('.foot-line'))).toBe(SITE.footer.tagline);
  });

  it('ends with the byline and the proof’s place, and draws Logo 1 for the eye only', () => {
    expect([...doc.querySelectorAll('.foot-bottom span')].map(text)).toEqual([SITE.footer.byline, HOME.proof.label]);
    expect(doc.querySelector('.foot-mark svg.wm')?.getAttribute('aria-hidden')).toBe('true');
    expect(doc.querySelector('.foot-ripple')?.getAttribute('aria-hidden')).toBe('true');
    // The ripple starts at Logo 1's ring and dot.
    expect(doc.querySelector<HTMLElement>('.foot-ripple')!.getAttribute('style')).toMatch(
      /^left:\d+(\.\d+)?%;top:\d+(\.\d+)?%$/,
    );
  });
});

describe('the kit’s pieces', () => {
  it('puts the proof line in the homepage’s words', () => {
    expect(text(parse(proofLine()).querySelector('.proof-line'))).toBe(`${HOME.proof.label} ${HOME.proof.figure}`);
  });

  it('builds the proof section from HOME.proof and the page’s own sentence, with settled figures', () => {
    const doc = parse(proofSection({ heading: 'Built inside our own business', body: 'A sentence.' }));
    expect(text(doc.querySelector('#proof-title'))).toBe('The Utah Life Real Estate Group');
    expect(text(doc.querySelector('.proof-text'))).toBe('A sentence.');
    expect([...doc.querySelectorAll('.proof-label')].map(text)).toEqual(['100 agents', '700+ homes a year']);
    expect([...doc.querySelectorAll('[data-count]')].map((e) => text(e))).toEqual(['100', '700']);
  });

  it('shows Spring and Connor with their real photos and the homepage’s words, never initials', () => {
    const doc = parse(founders());
    expect([...doc.querySelectorAll('.founder img')].map((i) => i.getAttribute('src'))).toEqual([
      PHOTOS.spring.src,
      PHOTOS.connor.src,
    ]);
    expect([...doc.querySelectorAll('.founder-name')].map(text)).toEqual(HOME.meet.people.map((p) => p.name));
    expect([...doc.querySelectorAll('.founder-role')].map(text)).toEqual(HOME.meet.people.map((p) => p.role));
    expect([...doc.querySelectorAll('.founder-bio')].map(text)).toEqual(HOME.meet.people.map((p) => p.body));
    expect(links(doc, '.founders-foot a')).toEqual([[HOME.meet.more.label, HOME.meet.more.href]]);
  });

  it('renders questions as <details>, numbered, the first open, links kept', () => {
    const doc = parse(
      faq(
        [
          { q: 'One?', a: ['Yes.'], link: { label: 'Join the Waitlist', href: '/offer#waitlist' } },
          { q: 'Two?', a: ['No.', 'Really.'] },
        ],
        { title: 'Questions' },
      ),
    );
    const items = [...doc.querySelectorAll('.faq-item details')];
    expect(items.map((d) => d.hasAttribute('open'))).toEqual([true, false]);
    expect(items.map((d) => text(d.querySelector('.faq-qt')))).toEqual(['One?', 'Two?']);
    // Numbered by a CSS counter, so each summary says its question alone.
    expect([...doc.querySelectorAll('.faq summary')].map(text)).toEqual(['One?', 'Two?']);
    expect(read('./kit.css')).toContain('content: counter(aiw-faq, decimal-leading-zero);');
    expect(links(doc, '.faq-a a')).toEqual([['Join the Waitlist', '/offer#waitlist']]);
    expect(doc.querySelector('section')?.getAttribute('aria-labelledby')).toBe('questions-title');
  });

  it('lists the five free skills by their Library cards, in the Library’s order', () => {
    const doc = parse(closeCta({ title: 'Start with 5 free skills.', free: true }));
    expect(links(doc, '.free-item').map(([, href]) => href)).toEqual(FREE_FIVE.map((s) => `/${s}`));
    expect([...doc.querySelectorAll('.free-name')].map(text)).toEqual(FREE_FIVE.map((s) => entryFor(s).title));
    expect(doc.querySelector('.free-h')).toBeNull();
    expect(parse(closeCta({ title: 'T' })).querySelector('.free')).toBeNull();
  });

  it('never holds back the close’s copy when it carries buttons, a buy link or the proof line', () => {
    const buy = `<a class="btn btn-primary" href="%%link:cohort-full%%">Reserve My Seat</a>${proofLine()}`;
    const withActions = parse(closeCta({ title: 'T', actions: buy }));
    expect(withActions.querySelector('.close-copy')?.classList.contains('rv')).toBe(false);
    for (const el of withActions.querySelectorAll('.actions a, .proof-line')) expect(el.closest('.rv')).toBeNull();
    // With nothing to press, the copy still rises in.
    expect(
      parse(closeCta({ title: 'T' }))
        .querySelector('.close-copy')
        ?.classList.contains('rv'),
    ).toBe(true);
    // The counting figures are their own section, never holding a button.
    const proof = parse(proofSection({ heading: 'H', body: 'B' }));
    expect(proof.querySelectorAll('a, button, .proof-line').length).toBe(0);
  });

  it('draws one seat per Accelerator seat, from the count the API writes', () => {
    const doc = parse(seatMeter('%%seats-left%%', 'Seats left'));
    const m = doc.querySelector('.seatm')!;
    expect(m.querySelectorAll('.seatm-s').length).toBe(COHORT_SEATS);
    expect(m.getAttribute('data-left')).toBe('%%seats-left%%');
    expect([m.getAttribute('role'), m.getAttribute('aria-label')]).toEqual(['img', 'Seats left']);
  });

  it('labels every illustration “Made-up example”, and draws checks and status lines', () => {
    expect(text(parse(exTag()).body)).toBe('Made-up example');
    expect([...parse(checks(['A', 'B'])).querySelectorAll('.checks li')].map(text)).toEqual(['A', 'B']);
    expect(
      parse(status('Opens soon.', { tone: 'muted' }))
        .querySelector('.status-muted .status-dot')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });
});

describe('the kit’s stylesheet', () => {
  const css = read('./kit.css');

  it('uses the homepage’s palette, value for value', () => {
    const palette = (src: string, prefix: string) =>
      Object.fromEntries(
        [...src.matchAll(new RegExp(`--${prefix}-([a-z-]+):\\s*([^;]+);`, 'g'))].map((m) => [m[1], m[2]!.trim()]),
      );
    const kit = palette(css, 'aiw');
    const home = palette(read('../home/home.css'), 'hp');
    expect(Object.keys(kit).sort()).toEqual(Object.keys(home).sort());
    expect(kit).toEqual(home);
  });

  it('loads only the self-hosted Geist files, from the homepage’s folder, and nothing from another host', () => {
    expect(css).not.toMatch(/@import|googleapis|gstatic|https?:\/\/(?!www\.w3\.org)/);
    expect([...css.matchAll(/url\('([^']+\.woff2)'\)/g)].map((m) => m[1])).toEqual([
      '../home/fonts/geist-latin-wght-normal.woff2',
      '../home/fonts/geist-mono-latin-wght-normal.woff2',
    ]);
  });

  it('sets no text under 16px (Spring’s rule)', () => {
    const sizes = [...css.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(10);
    expect(sizes.filter((n) => n < 16)).toEqual([]);
  });

  it('draws the seat meter for every count from 0 to the Accelerator’s seats', () => {
    const counts = [...new Set([...css.matchAll(/\.seatm\[data-left='(\d+)'\]/g)].map((m) => Number(m[1])))];
    expect(counts).toEqual(Array.from({ length: COHORT_SEATS + 1 }, (_, i) => i));
    for (let n = 1; n <= COHORT_SEATS; n++)
      expect(css).toContain(`.seatm[data-left='${n}'] .seatm-s:nth-child(n + ${n + 1})`);
  });

  it('honours reduced motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*animation-duration: 0\.001ms !important;[\s\S]*transition-duration: 0\.001ms !important;/,
    );
  });
});
