import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_FOUNDING_CLOSES_AT } from '@ai/core/offer';
import { ENTRIES } from '../library/content';
import { paid } from '../library/render';
import { CARD_STATES } from '../offer/content';
import { kitHeader } from '../kit/render';
import { renderPricingBody } from '../pricing/render';
import { FOUNDING } from '../site/offers-content';
import { HELP_EMAIL, SITE } from '../site/content';
import { fill } from './client/fill';
import { HOME, PHOTOS } from './content';
import { dollarsIn, PRICES, usd } from './prices';
import { ART, PROGRAMS, programLogo, type ProgramKey } from './program-logo';
import { entryFor, liveEntries, renderHomeBody, renderHomeHead } from './render';
import { LOCKUP_TYPE } from './sections/plans';
import { PAUSE, splitProof } from './sections/proof';

// www's homepage, restyled from Connor's reference with the LIVE homepage's content (`design/home-redesign`,
// Addendum 2: "content comes from the live site, the look comes from the mockup"). `content.ts` is main's
// file, unchanged; these tests hold the page to it: the same nine sections in Spring's order, the same
// words, the same links, the same two headshots, and nothing the live page doesn't say but one word,
// the marquee's "Pause". That the API serves it at `/` on www only is `apps/api/test/marketing.test.ts`'s.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

const doc = new DOMParser().parseFromString(
  `<!doctype html><html lang="en"><head>${renderHomeHead()}</head><body>${renderHomeBody()}</body></html>`,
  'text/html',
);
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $ = (selector: string) => doc.querySelector(selector);
const $$ = (selector: string) => [...doc.querySelectorAll(selector)];
const meta = (key: string) =>
  doc.querySelector(`meta[name="${key}"], meta[property="${key}"]`)?.getAttribute('content') ?? null;
const n = liveEntries().length;

/** Every link in the live homepage's body, section by section, in order (main's render; checked against
 *  www.amplifiedimpact.io, Nov 11). In the Library and Free resources the reference's layout puts the
 *  "See All" link in the section's opening column, so there it comes before the list rather than after. */
const LIVE_LINKS: Record<string, ReadonlyArray<[string, string]>> = {
  hero: [
    ['Get 5 Free Skills', '/library?show=free'],
    ['See the Programs', '/pricing'],
  ],
  plans: [
    ['See the Accelerator', '/team-build'],
    ['See the Agent Plan', '/agents'],
    ['See the Team Plan', '/teams'],
    ['Get Amplified Insiders', '/pricing#insiders'],
    ['Start with 5 free skills', '/library?show=free'],
  ],
  skills: [
    [`See All ${n}`, '/library'],
    ['Showing Tour Prep', '/showing-tour-prep'],
    ['Offer Strategy', '/offer-strategy'],
    ['Due Diligence Review', '/due-diligence-review'],
    ['New Construction Review', '/new-construction-review'],
    ['Pricing Conversation Prep', '/pricing-conversation-prep'],
    ['Offer Comparison', '/offer-comparison'],
    ['Repair Request Response', '/repair-request-response'],
    ['Low Appraisal Response', '/low-appraisal-response'],
    ['Database Health Check', '/database-health-check'],
    ['Recruiting Prep', '/recruiting-prep'],
    ['Team Playbook Builder', '/team-playbook-builder'],
    ['Team P&L Review', '/team-pnl-review'],
    ['Content Strategist', '/content-strategist'],
    ['Reel Editor', '/reel-editor'],
    ['Perfect Week', '/perfect-week'],
    ['Inbox and Meeting Follow-Through', '/inbox-meeting-follow-through'],
  ],
  start: [
    ['See All Free Resources', '/free'],
    ['Sounds Like You: Your AI Voice Profile', '/voice-profile'],
    ['AI 101 for Agents', '/ai101'],
    ['The Ops Time Audit', '/ops-time-audit'],
    ["Retool, Don't Replace", '/retool'],
    ['Task Sync Starter Kit', '/task-sync-starter'],
  ],
  meet: [['Read Our Story', '/about']],
  end: [
    ['Get 5 Free Skills', '/library?show=free'],
    ['See the Programs', '/pricing'],
  ],
};
/** A link's words: a skill row's name, without its row number and tag. */
const label = (a: Element) => text(a.querySelector('.skill-name') ?? a);

describe('the head and the shell', () => {
  it('keeps the page’s title, description, canonical address and share image', () => {
    expect(text($('title'))).toBe('Amplified Impact · AI Coaching and Training for Business Owners and Their Teams');
    expect(meta('description')).toMatch(/^AI coaching and training for business owners and their teams/);
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/');
    expect(meta('og:image')).toBe('https://www.amplifiedimpact.io/img/team/spring-bengtzen.jpg');
  });

  it('loads its stylesheet and exactly one script, as a module file (never inline), and the body opts into the page’s look', () => {
    const shell = read('../../home.html');
    expect(shell).toContain('rel="icon" type="image/svg+xml" href="data:image/svg+xml,');
    expect(shell).toContain('<link rel="stylesheet" href="/src/home/page.css" />');
    // Its own look, then a guard that puts everything inside the kit's header back to the browser's
    // defaults, then the kit's: the header computes as on a kit page, where only `kit.css` applies.
    const page = read('./page.css');
    expect(page).toContain('@layer home, header-guard, kit;');
    expect([...page.matchAll(/@import '([^']+)' layer\((\w+)\)/g)].map((m) => [m[1], m[2]])).toEqual([
      ['./home.css', 'home'],
      ['../kit/kit.css', 'kit'],
    ]);
    expect(page).toMatch(/@layer header-guard \{\s*\.hp-chrome :not\(svg, svg \*\),[\s\S]*?all: revert;/);
    expect(shell.match(/<script\b[^>]*>/g)).toEqual(['<script type="module" src="/src/home/client/main.ts">']);
    expect(shell).toMatch(/<body class="hp"/);
    expect(renderHomeBody()).not.toMatch(/<script/i);
  });

  it('self-hosts Geist and Geist Mono, with their licence beside them', () => {
    const css = read('./home.css');
    expect(css).toContain("src: url('./fonts/geist-latin-wght-normal.woff2') format('woff2')");
    expect(css).toContain("src: url('./fonts/geist-mono-latin-wght-normal.woff2') format('woff2')");
    for (const f of ['geist-latin-wght-normal.woff2', 'geist-mono-latin-wght-normal.woff2']) {
      const bytes = readFileSync(resolve(HERE, 'fonts', f));
      expect(bytes.subarray(0, 4).toString('latin1'), f).toBe('wOF2');
      expect(bytes.length, f).toBeLessThan(40_000);
    }
    expect(read('./fonts/OFL.txt')).toContain('SIL Open Font License, Version 1.1');
    // No font or stylesheet from anywhere else: § 9.4's `font-src 'self'`.
    expect(css).not.toMatch(/fonts\.googleapis|fonts\.gstatic|url\(['"]?https?:/);
  });
});

describe('the kit’s header, and the site’s own footer', () => {
  const parse = (html: string) => new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
  /** A header's markup without "you are here", the one thing that differs from page to page. */
  const unmarked = (header: Element | null) =>
    (header?.outerHTML ?? '').replace(/ aria-current="page"/g, '').replace(/ data-current(="")?/g, '').replace(/ is-current/g, '');
  const pair = (a: Element | null) => [text(a), a?.getAttribute('href')];

  it('renders the same header as a kit page: the kit’s own markup for `/`, and /pricing’s but for where you are', () => {
    expect($$('header')).toHaveLength(1);
    const header = $('header.hdr');
    expect(header?.outerHTML).toBe(parse(kitHeader('/')).querySelector('header.hdr')?.outerHTML);
    const pricing = parse(renderPricingBody()).querySelector('header.hdr');
    expect(pricing).not.toBeNull();
    expect(unmarked(header)).toBe(unmarked(pricing));
    // On the homepage nothing in the nav is "here", as in the kit's own render for `/`.
    expect($$('header [aria-current], header [data-current], header .is-current')).toHaveLength(0);
    // In the kit's own scope, dark like the page, around the header and nothing else.
    const scope = header!.parentElement!;
    expect([scope.className, scope.getAttribute('data-theme'), scope.children.length]).toEqual(['aiw hp-chrome', 'dark', 1]);
  });

  it('keeps the nav’s entries, labels, links and order, from the same nav data', () => {
    const n = SITE.nav;
    expect(text($('.hdr-trigger'))).toBe(n.links[0].label);
    expect($$('.hdr-programs .pm-card').map((a) => [text(a.querySelector('.pm-name')), a.getAttribute('href')])).toEqual(
      n.links[0].menu.map((l) => [l.label, l.href]),
    );
    expect($$('.hdr-nav > a').map(pair)).toEqual(n.links.slice(1).map((l) => [l.label, l.href]));
    expect(pair($('.hdr-login'))).toEqual([n.login.label, n.login.href]);
    expect(pair($('.hdr-cta'))).toEqual([n.cta.label, n.cta.href]);
    // The phone menu: the same programs, then the same links and Log In, then the same button.
    expect($$('.menu-programs a').map(pair)).toEqual(n.links[0].menu.map((l) => [l.label, l.href]));
    expect($$('.menu-nav a').map(pair)).toEqual([...n.links.slice(1), n.login].map((l) => [l.label, l.href]));
    expect(pair($('.menu-cta'))).toEqual([n.cta.label, n.cta.href]);
    // The live values, as the homepage linked them before.
    expect($$('.hdr-nav > a, .hdr-login').map(pair)).toEqual([
      ['The Library', '/library'],
      ['Free Resources', '/free'],
      ['About', '/about'],
      ['Log In', 'https://learn.amplifiedimpact.io/login'],
    ]);
    expect(pair($('.hdr-cta'))).toEqual(['Get 5 Free Skills', '/library?show=free']);
  });

  it('carries Logo 1 in the brand slot, once, and no longer the signature', () => {
    expect($$('[data-brand-slot]').map((el) => [el.getAttribute('data-brand-slot'), el.getAttribute('href')])).toEqual([
      ['logo-1', '/'],
    ]);
    expect($('[data-brand-slot] svg.wm')?.getAttribute('aria-label')).toBe(SITE.logoAlt);
    expect(renderHomeBody()).not.toMatch(/data-brand-slot="signature"|site-top/);
  });

  it('keeps the site’s own footer, its legal links and support address, and the skip link', () => {
    expect($$('footer.site-foot a').map((a) => a.getAttribute('href'))).toEqual(
      expect.arrayContaining(['/agreement', '/terms', '/privacy', `mailto:${HELP_EMAIL}`]),
    );
    expect($('a.skip')?.getAttribute('href')).toBe('#main');
  });
});

describe('the live homepage, in its order', () => {
  it('has Spring’s nine sections in her order, with the live headings', () => {
    expect($$('main > section').map((s) => s.className.split(' ')[1])).toEqual([
      'hero',
      'proof',
      'cmp',
      'plans',
      'skills',
      'dcs',
      'start',
      'meet',
      'end',
    ]);
    expect($$('h1').map(text)).toEqual([HOME.hero.title]);
    expect($$('main h2').map(text)).toEqual([
      'Use AI as a tool, or run a business where AI does real work.',
      'Four ways in',
      'The Library',
      'The AI drafts. You check, then send.',
      'Free resources',
      'Meet Spring and Connor',
      'Start with 5 free skills.',
    ]);
    expect($('#programs')?.classList.contains('plans')).toBe(true);
  });

  it('links exactly where the live homepage links, section by section, and nowhere else', () => {
    const sections = $$('main > section');
    expect(sections.flatMap((s) => [...s.querySelectorAll('a[href]')])).toEqual($$('main a[href]'));
    const found = Object.fromEntries(
      sections
        .map(
          (s) =>
            [
              s.className.split(' ')[1]!,
              [...s.querySelectorAll('a[href]')].map((a) => [label(a), a.getAttribute('href')]),
            ] as const,
        )
        .filter(([, links]) => links.length > 0),
    );
    expect(found).toEqual(LIVE_LINKS);
  });

  it('opens with the live headline, lede and buttons, and Spring and Connor named under their photos', () => {
    const h = HOME.hero;
    expect(text($('.hero-lead'))).toBe(h.lede);
    expect($$('.hero-actions a').map((a) => [text(a), a.getAttribute('href')])).toEqual([
      [h.primary.label, h.primary.href],
      [h.secondary.label, h.secondary.href],
    ]);
    expect(
      $$('.hero-person').map((f) => [f.querySelector('img')?.getAttribute('src'), text(f.querySelector('figcaption'))]),
    ).toEqual([
      [PHOTOS.spring.src, PHOTOS.spring.alt],
      [PHOTOS.connor.src, PHOTOS.connor.alt],
    ]);
  });

  it('says the live proof, in its words: Built inside The Utah Life Real Estate Group, 100 agents, 700+ homes a year', () => {
    const p = splitProof();
    expect(`${p.lead} ${p.name}`).toBe(HOME.proof.label);
    expect(p.stats.map((s) => `${s.value}${s.plus ? '+' : ''} ${s.label}`).join(', ')).toBe(HOME.proof.figure);
    expect($('.proof')?.getAttribute('aria-label')).toBe(HOME.proof.label);
    expect(text($('.proof-name'))).toBe(p.name);
    expect($$('.proof-stat').map((s) => text(s.querySelector('.proof-label')))).toEqual([
      '100 agents',
      '700+ homes a year',
    ]);
  });

  it('draws the shift with the live columns’ words', () => {
    const s = HOME.shift;
    expect(text($('.cmp-tool .cmp-label'))).toBe(`01${s.before.title}`);
    expect($$('.bubble').map(text)).toEqual([...s.before.items]);
    expect($$('.work-item').map(text)).toEqual([...s.after.items]);
    expect(text($('.composer'))).toBe('');
  });

  it('shows the four live programs, each with its live words, its figure from the offer’s constants, and its button', () => {
    const cards = $$('.plan');
    expect(cards.map((c) => text(c.querySelector('h3')))).toEqual(HOME.ways.cards.map((c) => c.name));
    HOME.ways.cards.forEach((c, i) => {
      const card = cards[i]!;
      expect(text(card.querySelector('.plan-who')), c.name).toBe(c.forWho);
      expect(text(card.querySelector('.plan-line')), c.name).toBe(c.line);
      const open = card.querySelector('.founding-open') ?? card;
      expect([text(open.querySelector('.price')), text(open.querySelector('.price-unit'))], c.name).toEqual([
        c.amount,
        c.unit,
      ]);
      expect(card.querySelector('.cta')?.getAttribute('href'), c.name).toBe(c.button.href);
    });
    expect($$('.plans-free p').map(text)).toEqual([
      HOME.ways.every,
      `${HOME.ways.notReadyBefore}${HOME.ways.notReadyLink}`,
    ]);
  });

  it('previews the Library from its own cards: each skill a link to its page, tagged Free or Locked', () => {
    const l = HOME.library;
    expect(n).toBe(ENTRIES.filter((e) => e.href !== null).length);
    expect(text($('.skills-intro .intro'))).toBe(l.body(n));
    expect(text($('.big-num'))).toBe(String(n));
    expect($$('[role="tab"]').map(text)).toEqual(l.rows.map((r) => r.heading));
    expect($$('[role="tabpanel"]').map((p) => p.hasAttribute('hidden'))).toEqual([false, true, true, true]);
    l.rows.forEach((r, i) => {
      const panel = $(`#hp-panel-${i + 1}`)!;
      expect(text(panel.querySelector('.tp-count'))).toBe(l.count(r.slugs.length));
      r.slugs.forEach((slug) => {
        const e = entryFor(slug);
        const a = panel.querySelector(`a[href="/${slug}"]`)!;
        expect(text(a.querySelector('.skill-name')), slug).toBe(e.title);
        expect(text(a.querySelector('.tag')), slug).toBe(paid(e) ? l.locked : l.free);
        expect(existsSync(resolve(HERE, `../../${slug}.html`)), `${slug}.html`).toBe(true);
      });
    });
    for (const lock of $$('.tag-lock')) expect(lock.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps Run, Draft and Own (the AI’s two marked done) beside the live offer plan, ticked as the live sheet ticks it', () => {
    expect(
      $$('.dcs-step').map((li) => [
        text(li.querySelector('.dcs-name')),
        text(li.querySelector('.dcs-text')),
        li.classList.contains('is-done'),
      ]),
    ).toEqual(HOME.trust.items.map((it) => [it.label, it.body, it.done]));
    const s = HOME.sheet;
    expect($('[data-offer]')?.getAttribute('aria-label')).toBe(s.label);
    expect([
      text($('.offer-kicker')),
      text($('.offer-addr')),
      text($('.offer-rec')),
      text($('.offer-sign-text')),
    ]).toEqual([s.meta, s.title, s.recommendation, s.initials]);
    expect(
      $$('.term').map((t) => [
        text(t.querySelector('.term-label')),
        text(t.querySelector('.term-value')),
        (t.querySelector('input') as HTMLInputElement).checked,
      ]),
    ).toEqual(s.terms.map((t) => [t.term, t.value, t.done]));
  });

  it('lists the live free resources, by their Library titles and descriptions', () => {
    expect($$('.part-head').map(text)).toEqual(HOME.free.columns.map((c) => c.heading));
    const slugs = HOME.free.columns.flatMap((c) => [...c.slugs]);
    expect($$('.part').map((p) => [text(p.querySelector('a')), text(p.querySelector('.part-text'))])).toEqual(
      slugs.map((slug) => [entryFor(slug).title, entryFor(slug).description]),
    );
    expect(text($('.free .lead'))).toBe(HOME.free.lede);
  });

  it('introduces Spring and Connor in their real headshots, with their live bios', () => {
    expect(
      $$('.person').map((p) => [
        p.querySelector('img')?.getAttribute('src'),
        text(p.querySelector('h3')),
        text(p.querySelector('.person-role')),
        text(p.querySelector('.person-body')),
      ]),
    ).toEqual(HOME.meet.people.map((p) => [PHOTOS[p.photo].src, p.name, p.role, p.body]));
  });

  it('ends with the live close', () => {
    expect([text($('.end h2')), text($('.end .lead'))]).toEqual([HOME.end.heading, HOME.end.body]);
  });
});

describe('the headshots: real photos, and no other image', () => {
  it('shows exactly Spring’s and Connor’s headshots, twice each (the hero and Meet), from files on this site', () => {
    const srcs = $$('main img').map((i) => i.getAttribute('src'));
    expect(srcs).toEqual([PHOTOS.spring.src, PHOTOS.connor.src, PHOTOS.spring.src, PHOTOS.connor.src]);
    for (const img of $$('main img')) {
      const p = Object.values(PHOTOS).find((x) => x.src === img.getAttribute('src'))!;
      expect([img.getAttribute('alt'), img.getAttribute('width'), img.getAttribute('height')]).toEqual([
        p.alt,
        String(p.width),
        String(p.height),
      ]);
    }
    for (const p of Object.values(PHOTOS)) {
      const file = readFileSync(resolve(HERE, `../../public${p.src}`));
      expect([file[0], file[1]], p.src).toEqual([0xff, 0xd8]);
    }
  });
});

describe('prices and the live offer state', () => {
  const card = (logo: string) => $(`.plan[data-card="${logo}"]`)!;

  it('read the figures from the offer’s constants, and they are the live homepage’s', () => {
    expect([
      usd(PRICES.accelerator.founding),
      usd(PRICES.agentPlan.monthly),
      usd(PRICES.teamPlan.today[0]),
      usd(PRICES.insiders.yearly),
    ]).toEqual(HOME.ways.cards.map((c) => c.amount));
    expect(PRICES.accelerator).toEqual({ founding: 7500, standard: 9997, twoPay: 3750 });
    expect(PRICES.agentPlan).toEqual({ monthly: 79, yearly: 790 });
    expect(PRICES.teamPlan.today).toEqual([1491, 2391]);
    expect(PRICES.insiders).toEqual({ yearly: 1997, monthly: 197 });
    expect(dollarsIn('Then $497 or $797 a month')).toEqual([497, 797]);
  });

  it('shows the Accelerator’s seats in /pricing’s words once /api/offer counts them, and /pricing’s next-cohort price after founding', () => {
    const block = $('[data-seats]')!;
    expect(block.hasAttribute('hidden')).toBe(true);
    expect(block.querySelectorAll('.seatbar span')).toHaveLength(15);
    expect(fill(block.getAttribute('data-left')!, { left: 12, total: 15 })).toBe(
      `12${FOUNDING.seatsOf}15${FOUNDING.seatsAfter}`,
    );
    expect(block.getAttribute('data-taken')).toBe(FOUNDING.soldout);
    expect([
      text(card('accelerator').querySelector('.founding-closed .price')),
      text(card('accelerator').querySelector('.founding-closed .price-unit')),
    ]).toEqual([CARD_STATES.closedAmount, CARD_STATES.closedUnit]);
    const plans = $('[data-plans]')!;
    expect([plans.getAttribute('data-founding'), plans.getAttribute('data-closes-at')]).toEqual([
      'open',
      DEFAULT_FOUNDING_CLOSES_AT,
    ]);
  });

  it('puts the one buying button, Get Amplified Insiders, under /api/offer: shown, or /pricing’s “Opens soon.”', () => {
    const ins = card('insiders');
    expect(ins.getAttribute('data-cart')).toBe('insiders-year');
    expect(ins.hasAttribute('data-state')).toBe(false);
    expect([
      text(ins.querySelector('.act-link .cta')),
      ins.querySelector('.act-link .cta')?.getAttribute('href'),
    ]).toEqual(['Get Amplified Insiders', '/pricing#insiders']);
    expect(text(ins.querySelector('.act-soon'))).toBe(CARD_STATES.soon);
    expect($$('.plan[data-cart]')).toHaveLength(1);
  });

  it('puts the proof line right under every card’s button', () => {
    for (const b of $$('.plan .cta')) {
      const next = b.nextElementSibling;
      expect(next?.className, text(b)).toBe('proof-line');
      expect(text(next)).toBe(`${HOME.proof.label} ${HOME.proof.figure}`);
    }
  });
});

describe('never hidden (Ampy’s rule)', () => {
  it('puts no plan card, card button, payment link, plan actions, seat counter or proof line inside a reveal', () => {
    const buying = $$('.plan, .plan .cta, a[href*="buy.stripe.com"], .plan-actions, [data-seats], .proof-line');
    expect(buying.length).toBeGreaterThan(12);
    for (const el of buying) expect(el.closest('.rv'), el.outerHTML.slice(0, 80)).toBeNull();
    // Narrow: the section's heading and the note under the cards still rise in.
    expect($('.plans-head')?.classList.contains('rv')).toBe(true);
    expect($('.plans-free')?.classList.contains('rv')).toBe(true);
  });
});

describe('the program lockups (Connor’s, from `program-logo.ts`)', () => {
  it('head each card in place of a symbol and a typed name: its own program’s stacked lockup, the exact name in the h3', () => {
    const cards = $$('.plan');
    expect(cards.map((c) => c.querySelector('.plan-top h3 .plan-logo')?.getAttribute('data-program'))).toEqual([
      'accelerator',
      'agent-plan',
      'team-plan',
      'insiders',
    ]);
    expect(cards.map((c) => text(c.querySelector('h3')))).toEqual([
      'Amplified AI Accelerator',
      'Amplified Agent Plan',
      'Amplified Team Plan',
      'Amplified Insiders',
    ]);
    for (const card of cards) {
      const h3 = card.querySelector('h3')!;
      const key = h3.querySelector('.plan-logo')!.getAttribute('data-program') as ProgramKey;
      // The name is the heading's only text, visually hidden: the lockup draws it.
      expect([...h3.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim())).toEqual([]);
      expect([h3.querySelector('.sr-only')?.textContent, h3.id, card.getAttribute('aria-labelledby')], key).toEqual([
        PROGRAMS.find((p) => p.key === key)!.name,
        card.getAttribute('aria-labelledby'),
        h3.id,
      ]);
      // The stacked lockup at 24px type, hidden from screen readers since the h3 says the name. Every
      // stacked lockup is the same height, so the cards' first row lines up.
      const svg = h3.querySelector('svg')!;
      expect([svg.getAttribute('viewBox'), svg.getAttribute('height'), svg.getAttribute('aria-hidden')], key).toEqual([
        ART[key].stacked.viewBox.join(' '),
        '45.15',
        'true',
      ]);
      expect(svg.outerHTML, key).toBe(
        new DOMParser().parseFromString(
          programLogo(key, { variant: 'stacked', size: LOCKUP_TYPE, title: '' }),
          'text/html',
        ).body.firstElementChild!.outerHTML,
      );
      expect(Number(svg.getAttribute('width')), key).toBeLessThanOrEqual(186);
      // No symbol on its own, and no typed name, anywhere in the card.
      expect(card.querySelectorAll('svg[viewBox="0 0 48 48"]'), key).toHaveLength(0);
    }
    expect(LOCKUP_TYPE).toBeGreaterThanOrEqual(18);
    // The numbers stay.
    expect($$('.plan .plan-idx').map(text)).toEqual(['01', '02', '03', '04']);
  });

  it('take the section’s colours (bone here: the dark-on-Bone “-light” lockup), and no drawing on the page is an unnamed image', () => {
    expect($('#programs')!.getAttribute('data-theme')).toBe('light');
    for (const svg of $$('.plan-logo svg')) {
      const [ink, signal, ...letters] = [...svg.querySelectorAll('path')];
      expect(ink!.getAttribute('fill')).toBe('currentColor');
      expect(signal!.getAttribute('style')).toBe('fill:var(--signal, currentColor)');
      expect(letters.length).toBeGreaterThan(0);
      for (const l of letters) expect(l.getAttribute('fill')).toBe('currentColor');
    }
    for (const svg of $$('main svg')) {
      const named = svg.getAttribute('role') === 'img' && !!svg.getAttribute('aria-label');
      expect(named || svg.getAttribute('aria-hidden') === 'true').toBe(true);
    }
  });
});

describe('the words', () => {
  const body = renderHomeBody();
  const words = text(doc.body);

  it('follow the house rules: no em dashes, no “Forum”, no income or results promises, no retired name', () => {
    expect(body + renderHomeHead()).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum/i);
    expect(words).not.toMatch(
      /guarantee|\bincome\b|\bearn(s|ings)?\b|revenue|\broi\b|double|10x|save \d|close more|more deals/i,
    );
    expect(words).not.toMatch(/skill library|free library/i);
  });

  it('say nothing the live site doesn’t, but the marquee’s “Pause”', () => {
    const l = HOME.library;
    const live = [
      JSON.stringify(HOME),
      l.body(n),
      l.all(n),
      ...l.rows.map((r) => l.count(r.slugs.length)),
      ...ENTRIES.flatMap((e) => [e.title, e.description]),
      ...Object.values(PHOTOS).map((p) => p.alt),
      ...Object.values(CARD_STATES).map(String),
      ...Object.values(FOUNDING).map(String),
    ].map((s) => s.replace(/\\"/g, '"'));
    const said: string[] = [];
    const walk = (node: Node) => {
      if (node.nodeType === 3) {
        const t = node.textContent!.replace(/\s+/g, ' ').trim();
        if (t) said.push(t);
      }
      node.childNodes.forEach(walk);
    };
    walk($('main')!);
    for (const el of $$('main [aria-label], main img[alt]'))
      said.push(el.getAttribute('aria-label') ?? el.getAttribute('alt')!);
    const unknown = said.filter((t) => !/^[\d$,.+]+$/.test(t) && t !== PAUSE && !live.some((s) => s.includes(t)));
    expect(unknown).toEqual([]);
    expect(said).toContain(PAUSE);
  });
});

describe('the stylesheet', () => {
  const css = read('./home.css');

  it('keeps every word at 16px or more (Spring’s rule, D-107/D-111), the shared stylesheet’s included', () => {
    const sizes = [...(css + read('../site/site.css')).matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(30);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
    expect(css).not.toMatch(/font: [^;]*\b(1[0-5]|[0-9])px/);
  });

  it('draws a visible focus ring, honors reduced motion, and lets the marquee be paused (WCAG 2.2.2)', () => {
    expect(css).toMatch(/\.hp :focus-visible \{\s*outline: 2px solid var\(--focus-ring\);/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.hp \.mq-track,[\s\S]*animation: none !important;/,
    );
    expect(css).toContain('.hp .mq-band:has(.mq-pause input:checked) .mq-track {\n  animation-play-state: paused;');
    const pause = $('.mq-pause')!;
    expect([pause.tagName, pause.querySelector('input')?.getAttribute('type'), text(pause)]).toEqual([
      'LABEL',
      'checkbox',
      PAUSE,
    ]);
  });

  it('gives a thumb 44px: text links, the offer plan’s rows, the tabs, the pause control and the resource links', () => {
    for (const rule of [
      /\.hp \.cta-link \{[^}]*min-height: 44px;/,
      /\.hp \.term \{[^}]*min-height: 48px;/,
      /\.hp \.tab \{[^}]*min-height: 56px;/,
      /\.hp \.mq-pause \{[^}]*min-height: 44px;/,
      /\.hp \.part-title \{[^}]*min-height: 44px;/,
    ])
      expect(css).toMatch(rule);
  });

  it('lines up every row of the four cards side by side (a subgrid), and lets them flow once they wrap', () => {
    const wide = css.slice(css.indexOf('@media (min-width: 1200px) {'));
    const block = wide.slice(0, wide.indexOf('\n}\n') + 2);
    expect(block).toContain('@supports (grid-template-rows: subgrid) {');
    expect(block).toMatch(
      /\.hp \.plan \{\s*display: grid;\s*grid-row: span 7;\s*grid-template-rows: subgrid;\s*row-gap: 0;\s*align-items: start;\s*\}/,
    );
    // Each row by number: a card without seats still puts its button in the sixth row.
    const rows = [
      ['.hp .plan-top', 1],
      ['.hp .plan-who', 2],
      ['.hp .plan-price', 3],
      ['.hp .plan-line', 4],
      ['.hp .seat-block', 5],
      ['.hp .plan .act-soon', 6],
      ['.hp .plan .proof-line', 7],
    ] as const;
    for (const [selector, row] of rows) {
      const at = block.lastIndexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      expect(block.slice(at, block.indexOf('}', at)), selector).toContain(`grid-row: ${row};`);
    }
    expect(block).toMatch(/\.hp \.plan \.cta,\s*\.hp \.plan \.act-soon \{\s*grid-row: 6;/);
    // The same gap between the price and its unit on every card, the Accelerator's one level deeper.
    expect(css).toMatch(
      /\.hp \.plan-price,\s*\.hp \.plan-price > \.founding-open,\s*\.hp \.plan-price > \.founding-closed \{\s*display: flex;\s*flex-direction: column;\s*gap: 6px;/,
    );
    // Without subgrid the line under the divider takes the slack, so the buttons still line up.
    expect(block).toMatch(/^@media \(min-width: 1200px\) \{\s*\.hp \.plan-line \{\s*flex: 1;\s*\}/);
    // Below 1200px: two across, then one, and no reserved space (no minimum heights, no slack).
    expect(css).toMatch(
      /@media \(max-width: 1199px\) \{\s*\.hp \.plans-grid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(css.slice(0, css.indexOf('@media (min-width: 1200px) {'))).not.toMatch(/\.hp \.plan-line \{[^}]*flex: 1/);
    expect(css).not.toMatch(/\.hp \.plan-who \{[^}]*min-height/);
  });

  it('never fades the shift’s rows with opacity: they fade by colour, which stays AA', () => {
    const rule = css.slice(css.indexOf('.hp .work-item {'), css.indexOf('}', css.indexOf('.hp .work-item {')));
    expect(rule).not.toMatch(/opacity/);
    expect(css).toMatch(/color-mix\(in srgb, var\(--ink\) calc\(var\(--k\) \* 100%\), var\(--ink-muted\)\)/);
  });
});
