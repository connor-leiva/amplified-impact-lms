// The cohort welcome in the Week 0 Is Open email's design (`cohort-welcome-html.ts`). Both outputs are snapshotted, and
// the rules are asserted on their own: the Week 0 email's parts and confetti, every time from an instant (MT first, CT
// after it; a July instant proves the zones are computed), Week 0's title and counts from data, the tour only when it is
// live, the set-password link only when there is one, the sign-in line under the button, no em dash, no "Operator".
import { describe, expect, it } from 'vitest';
import { SUPPORT_EMAIL } from '@ai/core/offer';
import { SKILL_EMAIL_LOGO_URL, WEEK0_CONFETTI_URL } from './branded-html';
import { COHORT_WELCOME_COPY, cohortWelcomeHtml, cohortWelcomeText } from './cohort-welcome-html';
import type { CohortWelcomeInput } from './cohort-welcome-html';
import { week0OpenHtml } from './week0-open-html';

const APP = 'https://learn.amplifiedimpact.io';
/** Mon, Nov 30, 2026, 12:00 PM MT / 1:00 PM CT. */
const DUE = Date.parse('2026-11-30T19:00:00Z');
/** Wed, Dec 2, 2026, 12:00 PM MT / 1:00 PM CT, 90 minutes. */
const BUILD = Date.parse('2026-12-02T19:00:00Z');
const LINK = 'https://learn.amplifiedimpact.io/set-password?token=tok_welcome_1';

const input = (over: Partial<CohortWelcomeInput> = {}): CohortWelcomeInput => ({
  cohortName: 'December 2026',
  firstName: 'Dana',
  week0DueAt: DUE,
  week0Title: 'Foundations',
  week0Steps: 8,
  baselineTasks: 6,
  tour: true,
  liveBuildAt: BUILD,
  liveBuildMins: 90,
  setPasswordUrl: null,
  appUrl: APP,
  ...over,
});
const html = cohortWelcomeHtml(input());
const text = cohortWelcomeText(input());

/** The page's text, tags dropped, as a reader sees it. */
const visible = (h: string): string =>
  h
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?(?:span|a)\b[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#847;|&zwnj;|&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

/** Every clock with its zone: each MT clock has the same time in CT after it, and no CT clock stands alone. */
function expectMtCt(s: string): void {
  const clocks = [...s.matchAll(/\b\d{1,2}:\d{2}(?: (?:AM|PM))?(?: to \d{1,2}:\d{2} (?:AM|PM))?(?: (MT|CT))?/g)];
  expect(clocks.length).toBeGreaterThan(0);
  for (let i = 0; i < clocks.length; i++) {
    const m = clocks[i]!;
    expect(m[1], m[0]).toBe('MT');
    const next = clocks[i + 1];
    expect(next?.[1], `${m[0]} has no CT after it`).toBe('CT');
    expect(s.slice((m.index ?? 0) + m[0].length, next!.index), m[0]).toMatch(/^ \/ (?:[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, )?$/);
    i += 1;
  }
}

describe('the cohort welcome: snapshots', () => {
  it('renders the HTML (tour live, no set-password link)', async () => {
    await expect(html).toMatchFileSnapshot('./__snapshots__/cohort-welcome.html');
  });
  it('renders the plain text (tour live, no set-password link)', async () => {
    await expect(text).toMatchFileSnapshot('./__snapshots__/cohort-welcome.txt');
  });
  it('renders the plain text with a set-password link and no tour yet', async () => {
    await expect(cohortWelcomeText(input({ tour: false, setPasswordUrl: LINK }))).toMatchFileSnapshot('./__snapshots__/cohort-welcome-link-no-tour.txt');
  });
});

// R-5 Phase 4 (D-260, PLAN.md § 10.4): January's, beside December's, which stays as it is: its name, its Week 0 due
// date (Sat, Jan 2, 2027 at 12:00 PM MT, from its run) and its first live build (Tue, Jan 5).
describe('the cohort welcome: January’s snapshots, beside December’s', () => {
  const JAN = input({ cohortName: 'January 2027 Cohort', week0DueAt: Date.parse('2027-01-02T19:00:00Z'), liveBuildAt: Date.parse('2027-01-05T19:00:00Z') });
  it('renders the HTML', async () => {
    await expect(cohortWelcomeHtml(JAN)).toMatchFileSnapshot('./__snapshots__/cohort-welcome-january.html');
  });
  it('renders the plain text', async () => {
    await expect(cohortWelcomeText(JAN)).toMatchFileSnapshot('./__snapshots__/cohort-welcome-january.txt');
  });
  it('names January, never December', () => {
    expect(visible(cohortWelcomeHtml(JAN))).toContain('January 2027 Cohort');
    expect(cohortWelcomeHtml(JAN)).not.toContain('December');
    expect(cohortWelcomeText(JAN)).not.toContain('December');
  });
});

describe('the cohort welcome: the Week 0 Is Open email’s document', () => {
  it('shares that email’s head, panel, dark band, wordmark and confetti row', () => {
    const shellOf = (h: string) => h.slice(h.indexOf('<meta charset'), h.indexOf('<title>')) + h.slice(h.indexOf('</title>'), h.indexOf('opacity:0;">'));
    const week0 = week0OpenHtml({ firstName: 'Dana', week0DueAt: DUE, liveBuildAt: BUILD, liveBuildMins: 90, appUrl: APP });
    expect(shellOf(html)).toBe(shellOf(week0));
    const srcs = [...html.matchAll(/<img\b[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1]);
    expect(srcs).toEqual([SKILL_EMAIL_LOGO_URL, WEEK0_CONFETTI_URL]);
    expect(WEEK0_CONFETTI_URL).toBe('https://learn.amplifiedimpact.io/brand/week0-confetti.gif');
    expect(html).toContain(
      `<img class="ai-gif" src="${WEEK0_CONFETTI_URL}" width="600" height="200" alt="Confetti popping to welcome you to the December 2026 Cohort" style="display:block; width:600px; max-width:100%; height:auto; border:0;`,
    );
    expect(html).toContain('.ai-panel { width:100% !important;');
    expect(html).toContain('<table role="presentation" class="ai-panel" width="600"');
  });

  it('reads in order: band, card, button, the two lines under it, the list, the Live Build box, the sign-off, the footer', () => {
    const v = visible(html);
    const order = [
      'Amplified AI Accelerator · December 2026 Cohort',
      'Dana, You’re In!',
      'Welcome to the December 2026 Cohort. Your access to the Amplified AI Accelerator is live, Week 0 is already open',
      'Start here Week 0 Is Open',
      'Start Week 0',
      'Sign in, then click Week 0. If you still see the Skill Library, reload the page.',
      'Haven’t set a password yet?',
      'What to Do First',
      'Mark your calendar Our First Live Build',
      'Here’s to the journey ahead. We can’t wait to see what you build. Connor and the Amplified Impact team',
      'Sign In',
      `Questions? Write to ${SUPPORT_EMAIL}.`,
      'Amplified Impact, LLC. You’re getting this because you enrolled in the December 2026 Cohort.',
    ];
    let at = -1;
    for (const line of order) {
      const i = v.indexOf(line, at + 1);
      expect(i, line).toBeGreaterThan(at);
      at = i;
    }
    expect(html).toContain('<a href="https://learn.amplifiedimpact.io/learn/week/0" target="_blank"');
    expect(html).toContain(`<title>Welcome to the December 2026 Cohort: You’re In</title>`);
  });

  it('drops the name from the heading when there is none, and escapes one that has markup', () => {
    expect(visible(cohortWelcomeHtml(input({ firstName: ' ' })))).toContain(' You’re In! Welcome to the December 2026 Cohort.');
    expect(cohortWelcomeText(input({ firstName: '' })).startsWith('You’re In!\n')).toBe(true);
    expect(cohortWelcomeHtml(input({ firstName: '<b>' }))).toContain('&lt;b&gt;, You’re In!');
  });
});

describe('the cohort welcome: times from instants, MT first', () => {
  it('says Week 0 is due Mon, Nov 30, 2026 at 12:00 PM MT / 1:00 PM CT, from 2026-11-30T19:00:00Z', () => {
    expect(visible(html)).toContain('It’s due Mon, Nov 30, 2026 at 12:00 PM MT / 1:00 PM CT.');
    expect(html).toContain('You’re in! Week 0 is open, and it’s due Mon, Nov 30 at 12:00 PM MT / 1:00 PM CT.&#847;');
  });

  it('shows the first live build as Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT, each half on one line', () => {
    expect(html).toContain('<span style="white-space:nowrap;">Wed, Dec 2, 12:00 to 1:30 PM MT</span> / <span style="white-space:nowrap;">1:00 to 2:30 PM CT</span>');
    expect(html).toContain('<span style="white-space:nowrap;">Mon, Nov 30, 2026 at 12:00 PM MT</span> / <span style="white-space:nowrap;">1:00 PM CT</span>');
    expect(text).toContain('Our First Live Build\nWed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT\nFinish Week 0 by Mon, Nov 30,');
  });

  it('puts MT / CT, MT first, on every clock in the HTML and the text', () => {
    expectMtCt(visible(html));
    expectMtCt(text);
  });

  it('computes each zone from the instant: a July date is daylight time in both, not a fixed offset', () => {
    const july = cohortWelcomeText(input({ week0DueAt: Date.parse('2027-07-12T18:00:00Z'), liveBuildAt: Date.parse('2027-07-14T18:00:00Z') }));
    expect(july).toContain('It’s due Mon, Jul 12, 2027 at 12:00 PM MT / 1:00 PM CT.');
    expect(july).toContain('Wed, Jul 14, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT');
    expect(july).toContain('Finish Week 0 by Mon, Jul 12,');
    expectMtCt(july);
  });
});

describe('the cohort welcome: from data, not typed', () => {
  it('names the cohort with its noun everywhere, and never twice', () => {
    expect(visible(html)).not.toMatch(/December 2026(?! Cohort)/);
    expect(visible(cohortWelcomeHtml(input({ cohortName: 'December Cohort' })))).not.toContain('Cohort Cohort');
  });

  it('counts the baseline tasks and Week 0’s steps from the stored course, in words', () => {
    expect(text).toContain('Time Your Six Tasks: Start your time baseline: the six tasks we’ll measure against for the rest of the cohort.');
    expect(text).toContain('Start Week 0 · Foundations: Foundations is the Week 0 course, and it has eight steps.');
    const other = cohortWelcomeText(input({ baselineTasks: 5, week0Steps: 7, week0Title: 'Get Ready' }));
    expect(other).toContain('Time Your Five Tasks: Start your time baseline: the five tasks');
    expect(other).toContain('Start Week 0 · Get Ready: Get Ready is the Week 0 course, and it has seven steps.');
    expect(other).not.toContain('Foundations');
    expect(`${html}${text}`).not.toMatch(/\bseven\b/i);
  });

  it('mentions the How the LMS Works tour first, only when it is live (D-252)', () => {
    expect(text).toContain('01 Watch How the LMS Works: A quick tour of your new home for the Accelerator. It opens when you sign in, and it’s pinned at the top of Week 0. Watch it with your AI Implementer.');
    expect(text).toContain('02 Start Week 0 · Foundations');
    const none = cohortWelcomeText(input({ tour: false }));
    expect(none).not.toContain('How the LMS Works');
    expect(none).toContain('01 Start Week 0 · Foundations');
    expect(none).toContain('03 Time Your Six Tasks');
  });

  it('gives a set-password link only when there is one, with its life from the token’s TTL', () => {
    const linked = cohortWelcomeHtml(input({ setPasswordUrl: LINK }));
    expect(linked).toContain(`First time signing in? <a href="${LINK}" style="color:#1f4d40; text-decoration:underline;">Set Your Password</a> first. This link works once and expires in 72 hours.`);
    expect(linked).not.toContain('Haven’t set a password yet?');
    expect(html).not.toContain('Set Your Password');
    expect(cohortWelcomeText(input({ setPasswordUrl: LINK }))).toContain(`First time signing in? Set Your Password first: ${LINK}\nThis link works once and expires in 72 hours.`);
  });
});

describe('the cohort welcome: copy rules', () => {
  it('has no em dash or en dash, never says Operator, and none of the banned lines', () => {
    for (const out of [html, text, cohortWelcomeHtml(input({ tour: false, setPasswordUrl: LINK }))]) {
      expect(out).not.toMatch(/[–—]|&mdash;|&ndash;/);
      expect(out).not.toMatch(/\bOperator\b/);
      expect(out).not.toMatch(/industry standard/i);
      expect(out).not.toContain('100 agents, 700+ homes a year');
    }
    expect(text).toContain('Invite Your AI Implementer');
  });

  it('heads in Title Case', () => {
    for (const h of [COHORT_WELCOME_COPY.heading('Dana'), COHORT_WELCOME_COPY.cardTitle, COHORT_WELCOME_COPY.listHeading, COHORT_WELCOME_COPY.buildTitle, COHORT_WELCOME_COPY.button]) {
      for (const word of h.replace(/[^A-Za-z0-9’ ]/g, ' ').split(/\s+/).filter(Boolean)) {
        if (['to', 'the', 'of', 'by', 'a'].includes(word)) continue;
        expect(word[0], `${h}: ${word}`).toBe(word[0]!.toUpperCase());
      }
    }
  });
});
