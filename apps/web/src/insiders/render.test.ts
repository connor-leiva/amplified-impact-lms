import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_CARTS, MEMBERSHIP_NAME, TOKEN_PATTERN } from '@ai/core/offer';
import { HOME } from '../home/content';
import { EVERY_CARD, FACT_LABELS, OFFERS } from '../offer/content';
import { renderPricingBody } from '../pricing/render';
import { renderBody, renderHead, renderInsidersBody, renderInsidersHead } from './render';

// /insiders, Amplified Insiders' own page (Connor, Nov 11), on the parsed DOM: /pricing's Insiders card
// on a page of its own, word for word and link for link, the proof line right under its buttons.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');
const parse = (head: string, body: string) =>
  new DOMParser().parseFromString(`<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`, 'text/html');
const doc = parse(renderInsidersHead(), renderInsidersBody());
const pricing = parse('', renderPricingBody());
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $ = (selector: string, root: ParentNode = doc) => root.querySelector(selector);
const $$ = (selector: string, root: ParentNode = doc) => [...root.querySelectorAll(selector)];
const c = OFFERS.membership;

describe('/insiders', () => {
  it('is what the site plugin builds, with its canonical address and no script', () => {
    expect([renderHead, renderBody]).toEqual([renderInsidersHead, renderInsidersBody]);
    expect(text($('title'))).toBe(`${MEMBERSHIP_NAME} · Amplified Impact`);
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/insiders');
    expect(read('../../insiders.html') + renderInsidersBody()).not.toMatch(/<script/i);
    expect(read('../../insiders.html')).toContain('<link rel="stylesheet" href="/src/insiders/insiders.css" />');
  });

  it('names the program exactly, and never a retired name', () => {
    expect(text($('h1'))).toBe('Amplified Insiders');
    expect(text(doc.body)).not.toMatch(/skill library|free library/i);
    // Every "Insiders" on the page, text node by text node, is the full name.
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const named: string[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/Insiders/.test(n.textContent ?? '')) named.push(n.textContent!);
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((t) => (t.match(/Insiders/g) ?? []).length !== (t.match(/Amplified Insiders/g) ?? []).length)).toEqual([]);
  });

  it('says what /pricing’s Insiders card says: who it’s for, what you get, how it runs, when it starts', () => {
    expect(text($('.lede'))).toBe(c.forWho);
    expect($$('.ins-facts h2').map(text)).toEqual([FACT_LABELS.lines, FACT_LABELS.howItRuns, FACT_LABELS.starts]);
    expect($$('.ins-facts .lines li').map(text)).toEqual([...c.lines]);
    expect(text($('.ins-facts .every'))).toBe(EVERY_CARD.officeHours);
  });

  it('shows /pricing’s Insiders price block and buttons, byte for byte: the same carts, Payment Link tokens and states', () => {
    const card = $('#insiders', pricing)!;
    expect($('.buy .price')?.outerHTML).toBe($('.price', card)?.outerHTML);
    // /pricing's card adds "See Full Details" under its buttons; this page has no such link.
    const pricingActions = $('.plan-actions', card)!.cloneNode(true) as Element;
    pricingActions.querySelector('a.details')?.remove();
    expect($('.buy .plan-actions')?.outerHTML).toBe(pricingActions.outerHTML);
    expect($('.buy')?.getAttribute('data-state')).toBe(`%%state:${CARD_CARTS.membership![0]}%%`);
    expect($$('.buy a.btn').map((a) => a.getAttribute('href'))).toEqual(['%%link:insiders-year%%']);
    expect($$('.buy a.more').map((a) => [text(a), a.getAttribute('href')])).toEqual([[c.more['insiders-monthly'], '%%link:insiders-monthly%%']]);
    // Every price is the card's; none is typed on this page.
    expect(read('./render.ts') + read('./content.ts')).not.toMatch(/\$\d/);
  });

  it('puts the proof line right under the buy buttons', () => {
    const proof = $('.buy .act-link .proof-line')!;
    expect(text(proof)).toBe(`${HOME.proof.label} ${HOME.proof.figure}`);
    expect(proof.previousElementSibling?.matches('a.more')).toBe(true);
    expect(proof.parentElement?.firstElementChild?.matches('a.btn.btn-primary')).toBe(true);
  });

  it('carries only the tokens the API fills for every sales page', () => {
    const tokens = [...new Set([...renderInsidersBody().matchAll(TOKEN_PATTERN)].map((m) => m[0]))].sort();
    expect(tokens).toEqual(['%%link:insiders-monthly%%', '%%link:insiders-year%%', '%%state:insiders-year%%']);
  });
});
