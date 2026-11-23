import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_CARTS, MEMBERSHIP_NAME, PLAN_SETS, TOKEN_PATTERN } from '@ai/core/offer';
import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { SKILL_CATALOG } from '@ai/core/skills';
import { HOME } from '../home/content';
import { FACT_LABELS, OFFERS } from '../offer/content';
import { END, FAQ } from '../pricing/content';
import { renderPricingBody } from '../pricing/render';
import { V2_INSIDERS } from './content';
import {
  insidersSkills,
  monthlyFigure,
  renderBody,
  renderHead,
  renderInsidersBody,
  renderInsidersHead,
  splitFirst,
} from './render';

// /insiders, Amplified Insiders' own page (Connor, Nov 11), on the parsed DOM: the v2 mockup's
// InsidersPage with /pricing's Insiders card's words, price, terms and Payment Links, the proof line
// right under every buy button, and the owner and ops skills Insiders opens.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const parse = (head: string, body: string) =>
  new DOMParser().parseFromString(
    `<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`,
    'text/html',
  );
const html = renderInsidersBody();
const doc = parse(renderInsidersHead(), html);
const pricing = parse('', renderPricingBody());
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $ = (selector: string, root: ParentNode = doc) => root.querySelector(selector);
const $$ = (selector: string, root: ParentNode = doc) => [...root.querySelectorAll(selector)];
const c = OFFERS.membership;
const PROOF = `${HOME.proof.label} ${HOME.proof.figure}`;

describe('/insiders', () => {
  it('is what the site plugin builds, with its canonical address and only the kit’s script', () => {
    expect(renderHead).toBe(renderInsidersHead);
    expect(renderBody).toBe(renderInsidersBody);
    expect(text($('title'))).toBe(`${MEMBERSHIP_NAME} · Amplified Impact`);
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/insiders');
    const shell = read('../../insiders.html');
    expect(shell).toContain('<body class="aiw" data-theme="dark" data-app-ready="true">');
    expect([...shell.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0])).toEqual([
      '<script type="module" src="/src/kit/client/main.ts">',
    ]);
    expect(html).not.toMatch(/<script/i);
    expect(shell + html).not.toMatch(/\son[a-z]+=/i);
  });

  it('names the program exactly, and never a retired name', () => {
    expect(text($('.in-hero .eb'))).toBe(MEMBERSHIP_NAME);
    expect(text($('h1'))).toBe(V2_INSIDERS.title);
    expect(text(doc.body)).not.toMatch(/skill library|free library/i);
    // Every "Insiders" on the page, text node by text node, is the full name.
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const named: string[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode())
      if (/Insiders/.test(n.textContent ?? '')) named.push(n.textContent!);
    expect(named.length).toBeGreaterThan(0);
    expect(
      named.filter((t) => (t.match(/Insiders/g) ?? []).length !== (t.match(/Amplified Insiders/g) ?? []).length),
    ).toEqual([]);
  });

  it('shows /pricing’s Insiders price block and buttons in the hero, byte for byte', () => {
    const card = $('#insiders', pricing)!;
    expect($('.in-hero .buy .price')?.outerHTML).toBe($('.price', card)?.outerHTML);
    // /pricing's card adds "See Full Details" under its buttons; this page has no such link.
    const pricingActions = $('.plan-actions', card)!.cloneNode(true) as Element;
    pricingActions.querySelector('a.details')?.remove();
    expect($('.in-hero .buy .plan-actions')?.outerHTML).toBe(pricingActions.outerHTML);
    expect($('.in-hero .buy')?.getAttribute('data-state')).toBe(`%%state:${CARD_CARTS.membership![0]}%%`);
    expect(text($('.in-hero .in-starts'))).toBe(c.starts[0]);
  });

  it('gives each way to pay its own cart, state, price, terms and button, from the card', () => {
    const plans = $$('.in-plan');
    expect(plans.map((p) => p.getAttribute('data-state'))).toEqual([
      '%%state:insiders-year%%',
      '%%state:insiders-monthly%%',
      '%%state:insiders-agent-monthly%%',
    ]);
    expect(plans.map((p) => $$('a.btn', p).map((a) => [text(a), a.getAttribute('href')]))).toEqual([
      [[c.button, '%%link:insiders-year%%']],
      [[c.more['insiders-monthly'], '%%link:insiders-monthly%%']],
      [['Get Amplified Insiders for Agents', '%%link:insiders-agent-monthly%%']],
    ]);
    expect(plans.map((p) => [text($('.price', p)), text($('.price-note', p))])).toEqual([
      [c.price.amount, c.price.unit],
      [...monthlyFigure(c.more['insiders-monthly']!)],
      ['$79', 'a month'],
    ]);
    expect(plans.map((p) => $$('.checks li', p).map(text))).toEqual([
      [c.price.terms[0], c.price.terms[1]],
      [c.price.terms[2]],
      ['3-Month Minimum.', 'Every agent skill, plus weekly office hours.', 'No weekly live training.'],
    ]);
    // The monthly price is read out of the card's own line, not typed.
    expect(monthlyFigure('Or pay $197 a month')).toEqual(['$197', 'a month']);
    expect(() => monthlyFigure('Or pay monthly')).toThrow(/can't find the monthly price/);
    // Every price is the card's; none is typed on this page.
    expect(read('./render.ts') + read('./content.ts')).not.toMatch(/\$\d/);
  });

  it('puts the proof line right under every buy button', () => {
    const buttons = $$('main a.btn').filter((a) => /%%link:/.test(a.getAttribute('href') ?? ''));
    expect(buttons).toHaveLength(4);
    for (const b of buttons) {
      const proof = b.closest('.act-link')?.querySelector('.proof-line');
      expect(text(proof)).toBe(PROOF);
    }
    expect($$('main .proof-line').length).toBe(4);
  });

  it('lists every owner and ops skill Insiders opens, by its Library card, grouped by its Library topic', () => {
    const opens = new Set<string>([...PLAN_SETS.membership, 'both']);
    const expected = [...SKILL_CATALOG, ...GROK_TEMPLATES].filter((s) => opens.has(s.sets)).map((s) => `/${s.id}`);
    const listed = $$('#what .iskill').map((a) => a.getAttribute('href')!);
    expect(listed.sort()).toEqual(expected.filter((h) => insidersSkills().some((s) => s.entry.href === h)).sort());
    expect(listed.length).toBe(insidersSkills().length);
    // Each group in the left column links to its list, with its count.
    expect($$('.inside-tabs a').map((a) => [a.getAttribute('href'), text($('.itab-n', a))])).toEqual(
      $$('.igroup').map((g) => [`#${g.id}`, String($$('.iskill', g).length)]),
    );
    // The shelf is a picture of the same list.
    expect($('.shelf')?.getAttribute('aria-hidden')).toBe('true');
    expect($$('.shelf-item').length).toBe(insidersSkills().length * 2);
  });

  it('says how it runs and who it’s for in the card’s own words', () => {
    expect(text($('.in-runs h2'))).toBe(FACT_LABELS.howItRuns);
    expect(
      $$('.irun')
        .map((r) => `${text($('.irun-k', r))} ${text($('.irun-t', r))}`)
        .join(' '),
    ).toBe(
      `${splitFirst(c.howItRuns)[0]} ${splitFirst(splitFirst(c.howItRuns)[1])[0]} ${c.lines[2]} ${splitFirst(splitFirst(c.howItRuns)[1])[1]} ${c.starts[0]}`,
    );
    expect(text($('.in-fit h2'))).toBe(FACT_LABELS.forWho);
    expect(text($('.in-fit .checks'))).toBe(c.forWho);
    expect($$('.elsewhere a').map((a) => a.getAttribute('href'))).toEqual(['/team-build', '/teams', '/agents']);
    expect(text($('.in-cancel'))).toBe(c.lines[3]);
  });

  it('asks /pricing’s own questions, word for word, and closes with its last line', () => {
    for (const q of $$('#questions summary')) {
      const item = FAQ.items.find((f) => f.q === text(q.querySelector('.faq-qt')));
      expect(item, text(q)).toBeTruthy();
      expect(text(q.closest('details')?.querySelector('.faq-a'))).toContain(item!.a[0]);
    }
    expect(text($('#close-title'))).toBe(END.heading);
    expect($$('.end .actions a').map((a) => a.getAttribute('href'))).toEqual(['/library?show=free']);
  });

  it('carries only the tokens the API fills for every sales page', () => {
    const tokens = [...new Set([...html.matchAll(TOKEN_PATTERN)].map((m) => m[0]))].sort();
    expect(tokens).toEqual([
      '%%link:insiders-agent-monthly%%',
      '%%link:insiders-monthly%%',
      '%%link:insiders-year%%',
      '%%state:insiders-agent-monthly%%',
      '%%state:insiders-monthly%%',
      '%%state:insiders-year%%',
    ]);
  });

  it('follows the house rules', () => {
    const words = text(doc.body);
    expect(html).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum|testimonial|guarantee|\+24|!/i);
    expect(read('./insiders.css')).toContain("@import '../kit/kit.css';");
    const css = read('./insiders.css') + read('../kit/kit.css');
    expect(Math.min(...[...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1])))).toBeGreaterThanOrEqual(16);
  });

  it('never starts a buy button, payment link, plan actions or proof line hidden (Ampy’s rule)', () => {
    const held = '.rv, .fade-1, .fade-2, .fade-3';
    const buying = $$(
      'a[href*="buy.stripe.com"], a[href^="%%link:"], .plan-actions, .proof-line, .in-plan .price, .stub',
    );
    expect(buying.length).toBeGreaterThan(8);
    for (const el of buying) expect(el.closest(held), el.outerHTML.slice(0, 80)).toBeNull();
    // The ticket's price is drawn from the start, not held back until it scrolls in.
    expect($('.stub')?.hasAttribute('data-in')).toBe(false);
    expect(read('./insiders.css')).not.toMatch(/\.stub:not\(\.is-in\)/);
  });
});
