import { describe, expect, it } from 'vitest';
import { globSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CLARITY_CALL } from './content';
import { clarityCall, CLARITY_TITLE_ID, type ClarityHost } from './clarity';
import { renderV3Body } from '../home/v3/render';
import { renderOfferBody, renderWelcomeBody } from '../offer/render';
import { renderPricingBody } from '../pricing/render';
import { renderTeamBuildBody } from '../team-build/render';
import { GUIDES } from '../guides/content';
import { renderGuideBody } from '../guides/render';
import { renderLegal } from '../legal/render';
import { renderTeamsBody } from '../teams/render';
import { renderAgentsBody } from '../agents/render';
import { renderFreeBody } from '../free/render';
import { renderAboutBody } from '../about/render';
import { renderInsidersBody } from '../insiders/render';
import { renderLibraryBody } from '../library/render';
import { renderAi101Body } from '../ai101/render';
import { renderVoiceBody } from '../voice/render';
import { renderRetoolBody } from '../retool/render';

// The Clarity Call (D-161): one card, on the pages Connor named and nowhere else, after each page's last
// buy block and before its footer, with a plain link to the booking page in a new tab. That the API
// serves it so, and how it looks and behaves in a browser, is `compliance/tests/e2e/clarity-call.spec.ts`'s.

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = resolve(HERE, '../..');
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const parse = (body: string) =>
  new DOMParser().parseFromString(`<!doctype html><html lang="en"><body>${body}</body></html>`, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const HREF = 'https://api.leadconnectorhq.com/widget/booking/XNxUdrtETSpLzuFotwUH';

/** Every skill page: every guide drawn in the skill layout (`renderGuideBody` → `skillBody`). */
const SKILL_PAGES = Object.values(GUIDES).filter((g) => g.layout === 'skill');

/** The pages that carry the card: path, the renderer's <body>, and the kind of page it is. */
const PLACED: readonly { path: string; body: () => string; host: ClarityHost; shell: string; css: string }[] = [
  {
    path: '/',
    body: () => renderV3Body({ preview: false }),
    host: 'kit',
    shell: 'home.html',
    css: '/src/home/v3/v3.css',
  },
  // /forum is the same page, `offer.html`, served at both addresses (`apps/api/src/routes/offer.ts`).
  { path: '/offer', body: renderOfferBody, host: 'offer', shell: 'offer.html', css: '/src/offer/offer.css' },
  { path: '/pricing', body: renderPricingBody, host: 'kit', shell: 'pricing.html', css: '/src/pricing/pricing.css' },
  {
    path: '/team-build',
    body: () => renderTeamBuildBody(),
    host: 'kit',
    shell: 'team-build.html',
    css: '/src/team-build/team-build.css',
  },
  ...SKILL_PAGES.map((g) => ({
    path: `/${g.slug}`,
    body: () => renderGuideBody(g),
    host: 'skill' as const,
    shell: `${g.slug}.html`,
    css: '/src/guides/skills.css',
  })),
];

/** The www pages that never carry it, and why. */
const EXCLUDED: readonly { path: string; body: () => string; why: string }[] = [
  { path: '/agreement', body: () => renderLegal('agreement').body, why: 'the agreement (the brief)' },
  { path: '/offer/welcome', body: renderWelcomeBody, why: 'the page after checkout (the brief)' },
  { path: '/terms', body: () => renderLegal('terms').body, why: 'a legal page' },
  { path: '/privacy', body: () => renderLegal('privacy').body, why: 'a legal page' },
  { path: '/teams', body: () => renderTeamsBody(), why: 'not one of the pages Connor named' },
  { path: '/agents', body: () => renderAgentsBody(), why: 'not one of the pages Connor named' },
  { path: '/insiders', body: renderInsidersBody, why: 'not one of the pages Connor named' },
  { path: '/free', body: () => renderFreeBody(), why: 'not one of the pages Connor named' },
  { path: '/about', body: renderAboutBody, why: 'not one of the pages Connor named' },
  { path: '/library', body: renderLibraryBody, why: 'not one of the pages Connor named' },
  { path: '/ai101', body: renderAi101Body, why: 'a workshop kit, not a skill page' },
  { path: '/voice-profile', body: renderVoiceBody, why: 'a setup guide, not a skill page' },
  { path: '/retool', body: renderRetoolBody, why: 'a workshop kit, not a skill page' },
  ...Object.values(GUIDES)
    .filter((g) => g.layout !== 'skill')
    .map((g) => ({ path: `/${g.slug}`, body: () => renderGuideBody(g), why: 'a free PDF guide, not a skill page' })),
];

describe('the card', () => {
  const doc = parse(clarityCall('kit'));
  const card = doc.querySelector('aside.cc')!;
  const link = card.querySelector('a')!;

  it('says Connor’s words, as polished for his review', () => {
    expect(text(card.querySelector('.cc-eyebrow'))).toBe('Still deciding?');
    expect(text(card.querySelector('h2'))).toBe('Talk it through with Connor.');
    expect(text(card.querySelector('.cc-body'))).toBe(
      'Book a free 15-minute Clarity Call. We’ll look at where your business is today and whether this is the right next step. No pitch, no pressure.',
    );
    expect(text(link)).toBe('Book a Free Clarity Call');
    expect(text(card.querySelector('.cc-fine'))).toBe(
      '15 minutes · Monday to Friday, 9 AM to 5 PM Central · Zoom link sent automatically',
    );
    // The dots are for the eye only.
    expect([...card.querySelectorAll('.cc-fine [aria-hidden="true"]')].map(text)).toEqual(['·', '·']);
  });

  it('keeps the house rules: no dash of either kind, no exclamation mark, no proof line, no stats', () => {
    const words = text(card);
    expect(words).not.toMatch(/[–—!]/);
    expect(words).not.toMatch(/100 agents|700\+|homes a year/i);
    expect(card.querySelector('.proof-line')).toBeNull();
  });

  it('is a plain link to the booking page, in a new tab, labelled for analytics: no script, frame or embed', () => {
    expect(CLARITY_CALL.href).toBe(HREF);
    expect(card.querySelectorAll('a')).toHaveLength(1);
    expect(link.getAttribute('href')).toBe(HREF);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
    expect(link.getAttribute('data-ai-event')).toBe('clarity_call_click');
    expect(card.querySelector('script, iframe, embed, object, form, button')).toBeNull();
    expect(clarityCall('kit')).not.toMatch(/\son[a-z]+=/i);
  });

  it('is a complementary landmark named by its heading', () => {
    expect(card.getAttribute('aria-labelledby')).toBe(CLARITY_TITLE_ID);
    expect(card.querySelector('h2')?.id).toBe(CLARITY_TITLE_ID);
    expect(card.hasAttribute('data-clarity-call')).toBe(true);
  });

  it('lines up with each kind of page’s own column, and is otherwise the same markup', () => {
    const column = (host: ClarityHost) => parse(clarityCall(host)).querySelector('aside.cc > div')!.className;
    expect(column('kit')).toBe('wrap');
    expect(column('offer')).toBe('inner');
    expect(column('skill')).toBe('sk-wrap');
    const strip = (host: ClarityHost) =>
      clarityCall(host)
        .replace(/data-host="\w+"/, '')
        .replace(/<div class="(wrap|inner|sk-wrap)">/, '');
    expect(strip('offer')).toBe(strip('kit'));
    expect(strip('skill')).toBe(strip('kit'));
  });
});

describe('where it is placed', () => {
  it('counts every skill page: 54 of the 55 guide renders (all but the one PDF guide)', () => {
    expect(SKILL_PAGES).toHaveLength(54);
    expect(
      Object.values(GUIDES)
        .filter((g) => g.layout !== 'skill')
        .map((g) => g.slug),
    ).toEqual(['ops-time-audit']);
  });

  for (const page of PLACED) {
    it(`is on ${page.path}, once, between </main> and the footer, after every buy block, with the exact link`, () => {
      const doc = parse(page.body());
      const cards = [...doc.querySelectorAll('[data-clarity-call]')];
      expect(cards).toHaveLength(1);
      const card = cards[0]!;
      expect(card.getAttribute('data-host')).toBe(page.host);
      // Straight after the page's <main>, straight before its footer, outside both.
      expect(card.previousElementSibling?.tagName).toBe('MAIN');
      expect(card.nextElementSibling?.tagName).toBe('FOOTER');
      expect(card.parentElement).toBe(doc.body);
      // After every buy block: every Pay button (a Payment Link token) and every program card comes first.
      const buys = [...doc.querySelectorAll('a[href^="%%link:"], .plan, .buy')];
      for (const buy of buys)
        expect(
          buy.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
          buy.outerHTML.slice(0, 80),
        ).toBeTruthy();
      const a = card.querySelector('a')!;
      expect([a.getAttribute('href'), a.getAttribute('target'), a.getAttribute('rel')]).toEqual([
        HREF,
        '_blank',
        'noopener',
      ]);
      // Its heading id is the page's only one of that name.
      expect(doc.querySelectorAll(`#${CLARITY_TITLE_ID}`)).toHaveLength(1);
    });
  }

  it('sits after the buy blocks the brief names: /offer’s cards and waitlist, /pricing’s plans, /team-build’s price', () => {
    const after = (body: string, selector: string) => {
      const doc = parse(body);
      const card = doc.querySelector('[data-clarity-call]')!;
      const last = [...doc.querySelectorAll(selector)].at(-1)!;
      expect(last, selector).toBeTruthy();
      return !!(last.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING);
    };
    expect(after(renderOfferBody(), '.plan-grid .plan')).toBe(true);
    expect(after(renderOfferBody(), '#waitlist')).toBe(true);
    expect(after(renderPricingBody(), '.plan .pay-btn, .plan .btn-primary')).toBe(true);
    expect(after(renderTeamBuildBody(), '#price .buy')).toBe(true);
    expect(after(renderV3Body({ preview: false }), 'main section.close')).toBe(true);
  });

  for (const page of EXCLUDED) {
    it(`is not on ${page.path}: ${page.why}`, () => {
      const body = page.body();
      expect(parse(body).querySelector('[data-clarity-call], .cc')).toBeNull();
      expect(body).not.toContain('leadconnectorhq');
      expect(body).not.toContain(CLARITY_CALL.button);
    });
  }

  it('is not in the LMS or the admin console: nothing the app’s bundle builds from names it', () => {
    const app = globSync(['src/**/*.{ts,tsx}', 'index.html'], { cwd: WEB }).filter(
      (f) =>
        !/\.test\.tsx?$/.test(f) && !/^src\/(kit|home|offer|pricing|team-build|guides)\//.test(f.replace(/\\/g, '/')),
    );
    expect(app.length).toBeGreaterThan(100);
    for (const f of app) {
      const src = readFileSync(resolve(WEB, f), 'utf8');
      expect(src, f).not.toMatch(/kit\/clarity|leadconnectorhq|data-clarity-call|clarity_call_click/);
    }
  });

  it('is drawn from one place: the booking link is written once, in the kit’s words', () => {
    const files = globSync(['src/**/*.{ts,tsx,css}', '*.html', 'public/**/*.{js,html}'], { cwd: WEB }).filter(
      (f) => !/\.test\.tsx?$/.test(f),
    );
    const holders = files.filter((f) => readFileSync(resolve(WEB, f), 'utf8').includes('leadconnectorhq'));
    expect(holders.map((f) => relative('src', f).replace(/\\/g, '/'))).toEqual(['kit/content.ts']);
  });
});

describe('the pages’ builds', () => {
  it('load the card’s stylesheet on every page that carries it, through the page’s own', () => {
    for (const { shell, css } of PLACED) {
      expect(read(`../../${shell}`), shell).toContain(`<link rel="stylesheet" href="${css}" />`);
    }
    for (const css of [
      '../home/v3/v3.css',
      '../pricing/pricing.css',
      '../team-build/team-build.css',
      '../offer/offer.css',
      '../guides/skills.css',
    ]) {
      expect(read(css).match(/@import '[^']*clarity\.css';/g), css).toHaveLength(1);
    }
    // Not the agreement's, the PDF guide's, or the kit's own (which imports nothing).
    for (const css of ['../legal/legal.css', '../guides/guides.css', './kit.css'])
      expect(read(css), css).not.toContain('clarity.css');
  });
});

describe('the card’s stylesheet', () => {
  const css = read('./clarity.css');
  const rule = (selector: string, within = css) => {
    const m = new RegExp(`(?:^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`).exec(within);
    return m?.[1] ?? '';
  };

  it('uses tokens only, and the host page’s: the LMS names, or the kit’s theme on a kit page', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i);
    expect(rule('.cc')).toContain('--cc-ink: var(--text-primary);');
    expect(rule('.aiw .cc')).toContain('--cc-ink: var(--ink);');
    expect(rule('.aiw .cc')).toContain('--cc-focus: var(--focus-ring);');
  });

  it('sets no text under 16px (D-107)', () => {
    const sizes = [...css.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(4);
    expect(sizes.filter((n) => n < 16)).toEqual([]);
  });

  it('is a secondary button: outlined in the ink, never filled with the action colour', () => {
    const btn = rule('.cc-btn');
    expect(btn).toContain('background: transparent;');
    expect(btn).toContain('border: 1px solid var(--cc-outline);');
    expect(btn).toContain('color: var(--cc-ink);');
    // The Pay buttons' fill (`--action` on the kit, `--action-primary` elsewhere) is never a background here.
    expect(css).not.toMatch(/background(-color)?:\s*var\(--(action|action-primary|signal|accent)\)/);
  });

  it('on a phone (767px and under), runs the button the card’s full width, 48px tall at least, its words 16px', () => {
    const btn = rule('.cc-btn');
    expect(btn).toContain('width: 100%;');
    expect(btn).toContain('min-height: 48px;');
    expect(btn).toContain('font-size: 16px;');
    // The first wider layout starts at 768px, so everything up to 767px keeps the phone's button.
    const queries = [...css.matchAll(/@media \(([^)]+)\)/g)].map((m) => m[1]);
    expect(queries).toEqual(['min-width: 768px', 'min-width: 1024px', 'prefers-reduced-motion: reduce']);
  });

  it('shows a focus ring, and stops its transition under reduced motion', () => {
    expect(rule('.cc-btn:focus-visible')).toMatch(/outline: 2px solid var\(--cc-focus\);/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.cc-btn \{\s*transition: none;/);
  });
});
