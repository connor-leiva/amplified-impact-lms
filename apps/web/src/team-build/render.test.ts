import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARD_CARTS, TOKEN_PATTERN } from '@ai/core/offer';
import { ENTRIES } from '../library/content';
import { HOME } from '../home/content';
import { OFFERS } from '../offer/content';
import { NEW_SKILLS, TB_FAQ, TB_HERO, WEEKS } from './content';
import { libraryEntry, renderBody, renderHead, renderTeamBuildBody, renderTeamBuildHead } from './render';

// /team-build, the Amplified AI Accelerator's sales page (D-112), on the parsed DOM: Spring's outline in
// her order, the course brief's week-to-skill map and calendar, the buy block's states, and the house
// rules. That the API serves it at `/team-build`, filled, is `apps/api/test/offer.test.ts`'s.

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(resolve(HERE, path), 'utf8');

const html = `<!doctype html><html lang="en"><head>${renderTeamBuildHead()}</head><body>${renderTeamBuildBody()}</body></html>`;
const doc = new DOMParser().parseFromString(html, 'text/html');
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const $ = (selector: string, root: ParentNode = doc) => root.querySelector(selector);
const $$ = (selector: string, root: ParentNode = doc) => [...root.querySelectorAll(selector)];

describe('the page', () => {
  it('is what the site plugin builds, with its canonical address and the site nav', () => {
    expect([renderHead, renderBody]).toEqual([renderTeamBuildHead, renderTeamBuildBody]);
    expect(text($('title'))).toBe('Amplified AI Accelerator · Amplified Impact');
    expect($('link[rel="canonical"]')?.getAttribute('href')).toBe('https://www.amplifiedimpact.io/team-build');
    expect($('nav[aria-label="Main"]')).not.toBeNull();
    const shell = read('../../team-build.html');
    expect(shell).toContain('data-founding="%%founding%%" data-seats="%%seats%%"');
    expect(shell).toContain('/src/team-build/team-build.css');
    expect(shell + html).not.toMatch(/<script/i);
  });

  it('runs in Spring’s order: hero, who, the weeks, how it runs and what you get, proof, Spring and Connor, price, questions', () => {
    expect($$('h1').map(text)).toEqual(['8 weeks. 8 skills. Built live with us.']);
    expect($$('main h2').map(text)).toEqual([
      'Who it’s for',
      'Who it’s not for',
      'One skill a week',
      'How it runs',
      'What you get',
      'Built inside our own business',
      'Meet Spring and Connor',
      'Founding price',
      'Questions',
    ]);
  });
});

describe('the hero', () => {
  it('says the first build’s date and time, with the proof line', () => {
    expect(text($('.first'))).toBe('First build: Wednesday, December 2 at 1:00 PM Central.');
    expect(TB_HERO.first).toContain('1:00 PM Central');
    expect([text($('.tb-hero .proof-line span')), text($('.tb-hero .proof-line strong'))]).toEqual([HOME.proof.label, HOME.proof.figure]);
  });

  it('has a buy block with the countdown, the seats left and the Accelerator’s two links, filled per request', () => {
    const buys = $$('.buy');
    expect(buys).toHaveLength(2);
    expect(buys[0]!.outerHTML).toBe(buys[1]!.outerHTML);
    const b = buys[0]!;
    const [full, two] = CARD_CARTS.cohort!;
    expect(b.getAttribute('data-state')).toBe(`%%state:${full}%%`);
    expect(text($('.amount', b))).toBe(OFFERS.cohort.price.amount);
    expect($$('.buy-facts p', b).map(text)).toEqual(['%%countdown%% at the founding price.', '%%seats-left%% of %%seats-total%% seats left.']);
    expect($$('.act-link a', b).map((a) => [text(a), a.getAttribute('href')])).toEqual([
      ['Get Amplified AI Accelerator', `%%link:${full}%%`],
      ['Or pay in 2 payments of $3,750', `%%link:${two}%%`],
    ]);
    // Closed or sold out: the waitlist instead of the links.
    expect($$('a.act-closed, a.act-soldout', b).map((a) => a.getAttribute('href'))).toEqual(['/offer#waitlist', '/offer#waitlist']);
    expect(text($('.price.founding-closed', b))).toBe('$9,997 next cohort');
  });
});

describe('who it’s for', () => {
  it('names Follow Up Boss, the owner and ops lead pair with their time estimates, and the waitlist', () => {
    const who = $('.who')!;
    expect(text(who)).toContain('Team owners and ops leads on Follow Up Boss.');
    expect(text(who)).toContain('about 2 to 2.5 hours a week, with an ops lead at about 3 to 4. Those are our estimates.');
    expect($('.who-waitlist a', who)?.getAttribute('href')).toBe('/offer#waitlist');
  });
});

describe('the weeks: the course brief’s map, not the draft list', () => {
  const weeks = $$('.week');

  it('are week 0 and the eight builds, on the locked Wednesdays, with nothing on December 23 or 30', () => {
    expect(weeks.map((w) => text($('.week-n', w)))).toEqual(['Week 0', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8']);
    expect(WEEKS.items.slice(1).map((w) => w.date)).toEqual([
      'Wednesday, December 2',
      'Wednesday, December 9',
      'Wednesday, December 16',
      'Wednesday, January 6',
      'Wednesday, January 13',
      'Wednesday, January 20',
      'Wednesday, January 27',
      'Wednesday, February 3',
    ]);
    // Each is a Wednesday in the 2026 to 2027 cohort, and none is a holiday week.
    for (const w of WEEKS.items.slice(1)) {
      const [, month, day] = /(\w+) (\d+)$/.exec(w.date)!;
      const year = month === 'December' ? 2026 : 2027;
      const d = new Date(`${month} ${day}, ${year} 12:00 UTC`);
      expect(d.getUTCDay(), w.date).toBe(3);
    }
    expect(html).not.toMatch(/December 23(?! or 30)|December 30(?!\.)/);
    expect(text($('.weeks-holiday'))).toBe('No builds or office hours on December 23 or 30.');
  });

  it('carry each week’s operating question and flagship, by its Library title', () => {
    expect(weeks.map((w) => text($('.week-skills', w)).replace(/ New$/, ''))).toEqual([
      'AI Brain Setup, Sounds Like You: Your AI Voice Profile, Team AI Brain',
      'Lead-Source ROI',
      'Morning Brief',
      'L10 Meeting Prep',
      'FUB Pipeline Review',
      'Agent 1:1 Prep',
      'Team Playbook Builder',
      'New Agent Onboarding Plan',
      '',
    ]);
    expect(text($('.week-q', weeks[1]))).toBe('What are we paying for leads, and what can we trust?');
    expect(text($('.week-q', weeks[8]))).toBe('What stays, what stops, and what should agents adopt next?');
    expect(text($('.week-support', weeks[0]))).toBe('With The Ops Time Audit');
  });

  it('links every skill the Library has, and shows the two new ones by name until they land (then it must link them)', () => {
    for (const w of WEEKS.items) {
      for (const slug of [...w.skills, ...(w.support ?? [])]) {
        const entry = libraryEntry(slug);
        if (entry) {
          expect(slug in NEW_SKILLS, `${slug} is in the Library now: take it out of NEW_SKILLS`).toBe(false);
          expect($(`.week a[href="/${slug}"]`), slug).not.toBeNull();
          expect(text($(`.week a[href="/${slug}"]`)), slug).toBe(entry.title);
        } else {
          expect(Object.keys(NEW_SKILLS)).toContain(slug);
          expect($(`.week a[href="/${slug}"]`), slug).toBeNull();
        }
      }
    }
    expect(() => libraryEntry('not-a-skill')).toThrow(/no Library card/);
    expect(ENTRIES.find((e) => e.href === '/lead-source-roi')?.tools).toEqual(['grok']);
  });
});

describe('how it runs and what you get', () => {
  it('says the locked calendar: Wednesday builds and Thursday office hours at 1:00 PM Central, 90 and 60 minutes', () => {
    const how = text($('.how-list'));
    expect(how).toContain('Wednesdays at 1:00 PM Central, 90 minutes.');
    expect(how).toContain('Thursdays at 1:00 PM Central, 60 minutes.');
    expect(how).toContain('Thursday, December 10');
    expect(how).toContain('Thursday, December 17');
  });

  it('lists /offer’s own lines for what you get', () => {
    expect($$('.how-cols .ticks li').map(text)).toEqual([...OFFERS.cohort.lines]);
  });
});

describe('Spring and Connor, and the questions', () => {
  it('reuses the homepage’s people, their own photos and the link to their story', () => {
    expect($$('.person-card h3').map(text)).toEqual(['Spring Bengtzen', 'Connor Leiva']);
    expect($$('.person-card img').map((i) => i.getAttribute('src'))).toEqual(['/img/team/spring-bengtzen.jpg', '/img/team/connor-leiva.jpg']);
    expect($('.meet .section-more a')?.getAttribute('href')).toBe('/about');
  });

  it('answers the questions a team owner asks, pointing to the agreement for refunds', () => {
    expect($$('.faq summary').map(text)).toEqual(TB_FAQ.items.map((f) => f.q));
    expect($$('.faq a').map((a) => a.getAttribute('href'))).toEqual(['/offer#waitlist', '/agreement']);
  });
});

describe('the words and the tokens', () => {
  const words = text(doc.body) + ' ' + renderTeamBuildHead();

  it('follow the house rules: no em dashes, no “Forum”, no testimonials, no results promises, no Jordan Hale', () => {
    expect(html).not.toMatch(/[–—]/);
    expect(words).not.toMatch(/forum/i);
    expect(words).not.toMatch(/testimonial|guarantee|\bincome\b|\bearn(s|ings)?\b|\broi\b(?!.*lead)|10x|close more|more deals|jordan/i);
    expect(words).not.toMatch(/!/);
    expect(words).not.toMatch(/Team Owner AI Build|FUB Automation Audit/);
  });

  it('uses only tokens the API fills', () => {
    const known = new Set(['founding', 'founding-closes', 'seats', 'countdown', 'seats-left', 'seats-total']);
    for (const [, name] of html.matchAll(TOKEN_PATTERN)) {
      expect(known.has(name!) || /^(state|link):(cohort-full|cohort-two-pay)$/.test(name!), name).toBe(true);
    }
  });

  it('keeps text legible on a phone', () => {
    const css = read('./team-build.css') + read('../site/offers.css') + read('../site/site.css');
    const sizes = [...css.matchAll(/font-size: (\d+)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(16);
  });
});
