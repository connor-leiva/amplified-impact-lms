// The Week 0 Is Open email (`week0-open`): Connor's v2 HTML, ported. Both outputs are snapshotted, and the rules the
// brief sets are asserted on their own: no em dash, no "Operator", every clock MT first with CT after it, the GIF an
// absolute https URL on learn, every date and time from an instant (real ones, and a July one to prove the zones are
// computed, not a fixed offset). The other branded emails must render byte for byte as on main before this change.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { SUPPORT_EMAIL } from '@ai/core/offer';
import { CONFETTI_MOBILE_CSS, SKILL_EMAIL_LOGO_URL, WEEK0_CONFETTI_PATH, WEEK0_CONFETTI_URL } from './branded-html';
import { learnerInviteHtml, learnerInviteText, learnerNudgeHtml, learnerNudgeText } from './learner-emails-html';
import { sessionReminderHtml, sessionReminderText } from './session-reminder-html';
import { WEEK0_OPEN_COPY, week0OpenHtml, week0OpenText } from './week0-open-html';
import type { Week0OpenInput } from './week0-open-html';

const APP = 'https://learn.amplifiedimpact.io';
/** Mon, Nov 30, 2026, 12:00 PM MT / 1:00 PM CT. */
const DUE = Date.parse('2026-11-30T19:00:00Z');
/** Wed, Dec 2, 2026, 12:00 PM MT / 1:00 PM CT, 90 minutes. */
const BUILD = Date.parse('2026-12-02T19:00:00Z');

const input = (over: Partial<Week0OpenInput> = {}): Week0OpenInput => ({ firstName: 'Dana', week0DueAt: DUE, liveBuildAt: BUILD, liveBuildMins: 90, appUrl: APP, ...over });
const html = week0OpenHtml(input());
const text = week0OpenText(input());

/** The page's text, tags dropped, as a reader sees it. */
const visible = (h: string): string =>
  h
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?span\b[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#847;|&zwnj;|&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

/** Every clock ("12:00 PM", "12:00 to 1:30 PM") with the zone after it. */
const CLOCK = /\b\d{1,2}:\d{2}(?: (?:AM|PM))?(?: to \d{1,2}:\d{2} (?:AM|PM))?(?: (MT|CT))?/g;

function expectMtCt(s: string): void {
  const clocks = [...s.matchAll(CLOCK)];
  expect(clocks.length).toBeGreaterThan(0);
  for (let i = 0; i < clocks.length; i++) {
    const m = clocks[i]!;
    // Every clock names its zone.
    expect(m[1], m[0]).toBeDefined();
    if (m[1] === 'MT') {
      // MT first, then " / " and the same time in CT (Central's own day may come first).
      const next = clocks[i + 1];
      expect(next?.[1], `${m[0]} has no CT after it`).toBe('CT');
      const between = s.slice((m.index ?? 0) + m[0].length, next!.index);
      expect(between, m[0]).toMatch(/^ \/ (?:[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, )?$/);
      i += 1;
    } else {
      throw new Error(`a CT clock with no MT before it: ${m[0]}`);
    }
  }
}

describe('the Week 0 Is Open email: snapshots', () => {
  it('renders the HTML', async () => {
    await expect(html).toMatchFileSnapshot('./__snapshots__/week0-open.html');
  });
  it('renders the plain text', async () => {
    await expect(text).toMatchFileSnapshot('./__snapshots__/week0-open.txt');
  });
});

// R-5 Phase 4 (D-260, PLAN.md § 10.4): January's, beside December's, which stays as it is. January's Week 0 is due Sat,
// Jan 2, 2027 at 12:00 PM MT and its first live build is Tue, Jan 5 (Connor's January, read through its run).
describe('the Week 0 Is Open email: January’s snapshots, beside December’s', () => {
  const JAN = input({ week0DueAt: Date.parse('2027-01-02T19:00:00Z'), liveBuildAt: Date.parse('2027-01-05T19:00:00Z'), cohortName: 'January 2027 Cohort' });
  it('renders the HTML', async () => {
    await expect(week0OpenHtml(JAN)).toMatchFileSnapshot('./__snapshots__/week0-open-january.html');
  });
  it('renders the plain text', async () => {
    await expect(week0OpenText(JAN)).toMatchFileSnapshot('./__snapshots__/week0-open-january.txt');
  });
  it('names January where Connor’s copy names December, and changes no other word', () => {
    const jan = week0OpenHtml(JAN);
    expect(visible(jan)).toContain('Welcome to the January Cohort: Week 0 Is Open');
    expect(visible(jan)).toContain('Amplified AI Accelerator · January 2027 Cohort');
    expect(visible(jan)).toContain('the founding members of the January 2027 Cohort');
    expect(jan).not.toContain('December');
    // Every word but January's name and the dates is December's.
    const words = (h: string) => visible(h).replace(/(December|January) (2026|2027) Cohort|(December|January) Cohort/g, 'X').replace(/[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}(, \d{4})?/g, 'D');
    expect(words(jan)).toBe(words(week0OpenHtml(input({ week0DueAt: Date.parse('2027-01-02T19:00:00Z'), liveBuildAt: Date.parse('2027-01-05T19:00:00Z') }))));
    expectMtCt(visible(jan));
  });
  it('escapes the cohort’s name', () => {
    expect(week0OpenHtml(input({ cohortName: 'January <b>2027</b>' }))).not.toContain('<b>');
  });
});

describe('the Week 0 Is Open email: times from instants, MT first', () => {
  it('says Week 0 is due Mon, Nov 30, 2026 at 12:00 PM MT / 1:00 PM CT, from 2026-11-30T19:00:00Z', () => {
    expect(visible(html)).toContain('Week 0 is due Mon, Nov 30, 2026 at 12:00 PM MT / 1:00 PM CT.');
    expect(text).toContain('Week 0 is due Mon, Nov 30, 2026 at 12:00 PM MT / 1:00 PM CT.');
  });

  it('fills the preheader from the same instant, without the year', () => {
    expect(html).toContain(
      '<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f1f0eb; opacity:0;">It’s official. The Amplified AI Accelerator is underway, and Week 0 is your launchpad. It’s due Mon, Nov 30 at 12:00 PM MT / 1:00 PM CT.&#847;',
    );
  });

  it('shows the first live build as Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT, from 2026-12-02T19:00:00Z for 90 minutes', () => {
    expect(visible(html)).toContain('Our First Live Build Wed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT ');
    expect(text).toContain('Our First Live Build\nWed, Dec 2, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT\n');
  });

  it('keeps each zone’s half on one line, so a phone breaks after the slash, never inside Central’s range', () => {
    expect(html).toContain('<span style="white-space:nowrap;">Wed, Dec 2, 12:00 to 1:30 PM MT</span> / <span style="white-space:nowrap;">1:00 to 2:30 PM CT</span>');
    expect(html).toContain('<span style="white-space:nowrap;">Mon, Nov 30, 2026 at 12:00 PM MT</span> / <span style="white-space:nowrap;">1:00 PM CT</span>');
  });

  it('puts MT / CT, MT first, on every clock in the HTML and the text', () => {
    expectMtCt(visible(html));
    expectMtCt(text);
  });

  it('computes each zone from the instant: a July date is daylight time in both, not a fixed offset', () => {
    // 18:00 UTC on Mon, Jul 12, 2027 is 12:00 PM MDT and 1:00 PM CDT. A fixed winter offset would say 11:00 AM MT.
    const july = week0OpenText(input({ week0DueAt: Date.parse('2027-07-12T18:00:00Z'), liveBuildAt: Date.parse('2027-07-14T18:00:00Z'), liveBuildMins: 90 }));
    expect(july).toContain('Week 0 is due Mon, Jul 12, 2027 at 12:00 PM MT / 1:00 PM CT.');
    expect(july).toContain('Wed, Jul 14, 12:00 to 1:30 PM MT / 1:00 to 2:30 PM CT');
    expectMtCt(july);
    const julyHtml = week0OpenHtml(input({ week0DueAt: Date.parse('2027-07-12T18:00:00Z'), liveBuildAt: Date.parse('2027-07-14T18:00:00Z'), liveBuildMins: 90 }));
    expect(julyHtml).toContain('It’s due Mon, Jul 12 at 12:00 PM MT / 1:00 PM CT.&#847;');
    expectMtCt(visible(julyHtml));
  });
});

describe('the Week 0 Is Open email: copy rules', () => {
  it('has no em dash or en dash, never says Operator, and none of the banned lines', () => {
    for (const out of [html, text]) {
      expect(out).not.toMatch(/[–—]|&mdash;|&ndash;/);
      expect(out).not.toMatch(/\bOperator\b/);
      expect(out).not.toMatch(/industry standard/i);
      expect(out).not.toContain('100 agents, 700+ homes a year');
    }
    expect(text).toContain('Invite Your AI Implementer');
  });

  it('uses Connor’s approved words: heading, intro, card, list, live build box and sign-off', () => {
    const v = visible(html);
    expect(v).toContain('Amplified AI Accelerator · December 2026 Cohort');
    expect(v).toContain('Dana, We’re Officially Underway!');
    expect(v).toContain(WEEK0_OPEN_COPY.intro);
    expect(v).toContain('Your launchpad Week 0 Is Open This is where it all begins.');
    expect(v).toContain('Your Week 0 Launch List 01 Fill In Your Intake Tell us about your business and the tools you use, right in the LMS.');
    expect(v).toContain('04 Connect Your Data Connect your books, closings, leads and Google tools so your AI can work from your real numbers.');
    expect(v).toContain('Mark your calendar Our First Live Build');
    expect(v).toContain('Here’s to the journey ahead. We can’t wait to see what you build. Connor and the Amplified Impact team');
  });

  it('drops the name from the heading when there is none, as the learner emails do', () => {
    const none = week0OpenHtml(input({ firstName: '  ' }));
    expect(visible(none)).toContain(' We’re Officially Underway! ');
    expect(none).not.toContain(', We’re Officially Underway!');
    expect(week0OpenText(input({ firstName: '' })).startsWith('We’re Officially Underway!\n')).toBe(true);
  });

  it('escapes the name', () => {
    expect(week0OpenHtml(input({ firstName: '<b>' }))).toContain('&lt;b&gt;, We’re Officially Underway!');
  });

  it('links Start Week 0 to Week 0 on learn, with the reload line and the sign-in line under it', () => {
    expect(html).toContain('<a href="https://learn.amplifiedimpact.io/learn/week/0" target="_blank"');
    expect(html).toContain('>Start Week 0</a>');
    const button = html.indexOf('>Start Week 0</a>');
    const reload = html.indexOf('Sign in, then click Week 0. If you still see the Skill Library, reload the page.');
    const signIn = html.indexOf('Haven’t set a password yet? On the sign-in page, choose Email Me a Sign-In Link Instead and we’ll send you a secure link.');
    expect(button).toBeGreaterThan(0);
    expect(reload).toBeGreaterThan(button);
    expect(signIn).toBeGreaterThan(reload);
    expect(html.indexOf('Your Week 0 Launch List')).toBeGreaterThan(signIn);
    expect(text).toContain('Start Week 0: https://learn.amplifiedimpact.io/learn/week/0\n\nSign in, then click Week 0. If you still see the Skill Library, reload the page.\n');
  });

  it('lists the four rows in the text as "01 Fill In Your Intake: …"', () => {
    expect(text).toContain(
      [
        'Your Week 0 Launch List',
        '01 Fill In Your Intake: Tell us about your business and the tools you use, right in the LMS.',
        '02 Invite Your AI Implementer: Your AI Implementer is a person on your team, not software. Name them and send their invite.',
        '03 Get Your AI Ready: Set up Claude or ChatGPT. Every step has a Claude version and a ChatGPT version.',
        '04 Connect Your Data: Connect your books, closings, leads and Google tools so your AI can work from your real numbers.',
      ].join('\n'),
    );
  });

  it('closes with Sign In and the support address from the offer, not a typed one', () => {
    expect(html).toContain(`Questions? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:#1f4d40; text-decoration:underline;">${SUPPORT_EMAIL}</a>.`);
    expect(html).toContain('<a href="https://learn.amplifiedimpact.io" style="color:#1f4d40; text-decoration:underline;">Sign In</a>');
    expect(text.endsWith(`Sign In: https://learn.amplifiedimpact.io\nQuestions? Write to ${SUPPORT_EMAIL}.`)).toBe(true);
  });
});

describe('the Week 0 Is Open email: the confetti', () => {
  it('loads the GIF from an absolute https URL on learn.amplifiedimpact.io, never a relative one', () => {
    expect(WEEK0_CONFETTI_PATH).toBe('/brand/week0-confetti.gif');
    expect(WEEK0_CONFETTI_URL).toBe('https://learn.amplifiedimpact.io/brand/week0-confetti.gif');
    const srcs = [...html.matchAll(/<img\b[^>]*\ssrc="([^"]*)"/g)].map((m) => m[1]);
    expect(srcs).toEqual([SKILL_EMAIL_LOGO_URL, WEEK0_CONFETTI_URL]);
    for (const src of srcs) expect(new URL(src!).origin).toBe('https://learn.amplifiedimpact.io');
    expect(html).not.toContain('src="week0-confetti.gif"');
  });

  it('keeps its 600 by 200 size, its alt text, the .ai-gif phone rule and the black cell behind it', () => {
    expect(html).toContain(
      `<td bgcolor="#0a0d0c" style="background-color:#0a0d0c; padding:20px 0 0 0; line-height:0; font-size:0;">`,
    );
    expect(html).toContain(
      `<img class="ai-gif" src="${WEEK0_CONFETTI_URL}" width="600" height="200" alt="Confetti popping to celebrate the start of the December 2026 Cohort" style="display:block; width:600px; max-width:100%; height:auto; border:0; color:#6fd3a5; font-family:'Geist', Helvetica, Arial, sans-serif; font-size:14px;">`,
    );
    expect(CONFETTI_MOBILE_CSS).toBe('.ai-gif { width:100% !important; height:auto !important; }');
    expect(html).toContain(`    .ai-btn a { display:block !important; }\n    ${CONFETTI_MOBILE_CSS}\n  }\n</style>`);
  });

  it('puts the eyebrow 8px under the GIF and the grey intro under the heading, as the approved band does', () => {
    expect(html).toContain('style="background-color:#0a0d0c; padding:8px 40px 0 40px; font-family:\'Geist Mono\'');
    expect(html).toContain('style="background-color:#0a0d0c; padding:16px 40px 0 40px; font-family:\'Geist\', -apple-system, \'Segoe UI\', Helvetica, Arial, sans-serif; font-size:42px;');
    expect(html).toContain('padding:16px 40px 40px 40px; font-family:\'Geist\', -apple-system, \'Segoe UI\', Helvetica, Arial, sans-serif; font-size:17px; line-height:1.55; color:#a3aba7;');
  });
});

describe('the other branded emails are unchanged by the new parts', () => {
  // sha256 of each output, taken on main at 25e234a (Nov 24, 2026) before `branded-html.ts` gained the Week 0 rows.
  // The purchase email's own hashes are `branded-html.test.ts`'s.
  const sha = (s: string) => createHash('sha256').update(s).digest('hex');
  const TEST_APP = 'https://app.amplifiedimpact.test';
  const inv = { firstName: 'Ana', email: 'ana@example.test', token: 'tok_inv_1', appUrl: TEST_APP };
  const nud = { firstName: 'Ana', appUrl: TEST_APP };
  const rem = { label: 'Session 3', title: 'The Living Database', when: 'Wed, Dec 9, 12:00 to 1:15 PM MT / 1:00 to 2:15 PM CT', firstName: 'Ana', appUrl: TEST_APP };

  it('Resend Invite and Send Nudge', () => {
    expect(sha(learnerInviteHtml(inv))).toBe('7c03c6d5ddc7a9c134e34517633fc5c1e24f64c4ddef2b35678f2095cccf22d8');
    expect(sha(learnerInviteText(inv))).toBe('4fe074713e3b3d703d0e944048e41704bdf66ab6946d1c309d1b403f23d77247');
    expect(sha(learnerNudgeHtml(nud))).toBe('b5ee1680641dbe741f2b1cf321dc0ac3a9a950c1213fa7e16d5efc612d30d144');
    expect(sha(learnerNudgeText(nud))).toBe('89957a09ec55983696f33600d05e7fcc27fd3be490490e9f0db87826638b7548');
  });

  it('the session reminders (D-250)', () => {
    expect(sha(sessionReminderHtml('session-24h', rem))).toBe('86937dd4bf55d391963f258edab0691f2fb4d822dd9ec87221253c02eca53928');
    expect(sha(sessionReminderText('session-24h', rem))).toBe('adae232220b4b5424887e28fc734b514d9db567297be38915aa9e7c58fe6e4bc');
    expect(sha(sessionReminderHtml('session-1h', rem))).toBe('7c6db7fe6210b4733aef84c796f388dd69a444e626ae05343344eb0f49860535');
    expect(sha(sessionReminderText('session-1h', rem))).toBe('0c6aed72aa8733f16e678b4465d1dda3f6f957c39c4cb2c40948684f3d9509ca');
  });
});
