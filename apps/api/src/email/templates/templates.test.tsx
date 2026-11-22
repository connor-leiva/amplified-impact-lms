// Phase 08 § 8.1's nine React Email templates, measured as the Gate 8 checklist measures them:
//
//   "Email templates render snapshots (`@react-email/render` → HTML) that contain the exact subject
//    and the CTA label."
//
// Rendered HTML, not a React tree: everything these tests are about — whether a colour resolved to
// a hex, whether a link is absolute, what the H1's line-height actually is — only exists after
// `render()`. A shallow render would pass while the email was unreadable.
//
// Four of the assertions below are about a specific production failure rather than tidiness:
//
//   1. NO `var(--…)` AND NO `oklch(…)` SURVIVES. This is the one that matters most. Email clients
//      resolve neither, so a single leaked token reference is a dropped colour declaration — and a
//      dropped `color` on a dark-mode client that has already recoloured the background is black
//      text on a black card. Invisible email, nothing in the logs, nothing in the HTML to explain
//      it. See the banner at the top of `layout.tsx`.
//   2. EXACTLY ONE `<a>`. § 8.1 allows one primary button; the shell owns it so a template cannot
//      add a second link that bypasses it.
//   3. NO `zoom.us` ANYWHERE. § 8.4 makes the Zoom URL server-withheld until the join window opens
//      (`GET /api/sessions/:id/join`), and an email is permanent. A reminder carrying the URL would
//      be a standing bypass of the window, and nothing else in the system would notice.
//   4. EVERY LINK IS ABSOLUTE. There is no document in an inbox to resolve `/sessions` against.
//
// Every string expected here is written as a literal, never derived from the implementation, with
// one exception that is itself the assertion: the subjects come from `SUBJECTS`, because § 8.1's
// subject table is `subjects.ts`'s contract and `subjects.test.ts` already pins those strings
// character for character. What is being measured here is that the subject in the inbox is the
// subject in the HTML.
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { render } from '@react-email/render';
import { ACADEMY_URL, PROGRAM_TZ, buildWelcomeCopy, fmt, setViewerZone, viewerZone } from '@ai/core';
import { EMAIL_FONT_STACK, EMAIL_TOKENS } from '../tokens';
import { SUBJECTS, TEMPLATE_NAMES } from '../subjects';
import type { TemplateName } from '../subjects';
import { CONTENT_WIDTH, appBase, elementFor, renderEmail, renderTemplate, whenFor, zoneFor } from './index';
import type { EmailPayload } from './index';

// ---------- anchors ----------------------------------------------------------------------------

/**
 * A reserved-TLD origin, so a leaked link in a test fixture can never reach anything real.
 * `.test` is reserved by RFC 2606 for exactly this.
 */
const APP = 'https://app.amplifiedimpact.test';

/** Session 3 of the December 2026 cohort: 2026-12-09T13:00 CT, the same anchor Gate 2 uses. */
const S3_START = Date.parse('2026-12-09T13:00:00-06:00');

const CHICAGO = 'America/Chicago';
const NEW_YORK = 'America/New_York';
/** `ZONES`'s last entry. Here only as a third candidate for "a zone this host is not already in". */
const HONOLULU = 'Pacific/Honolulu';

let savedAppUrl: string | undefined;

beforeAll(() => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = APP;
});

afterAll(() => {
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  // `whenFor` already restores this per call; this is belt and braces for the suite's own pokes.
  setViewerZone(null);
});

// ---------- one payload per row of § 8.1's table ------------------------------------------------
//
// Real seed values wherever the seed has one, so a payload cannot be subtly unlike what the
// deferred routes will hand over: Session 3 is `The Living Database`, Session 2 is `Speed to Lead`,
// `a1` is the seeded moved-session announcement with its `Update Calendar` action, and the two AI
// Employees are `sales` and `marketing`.
const WELCOME_COPY = buildWelcomeCopy(
  {
    cohortName: 'December Cohort',
    sendsAt: Date.parse('2026-12-02T12:00:00-07:00'),
    session1At: Date.parse('2026-12-02T12:00:00-07:00'),
    session1Mins: 90,
    officeHoursAt: Date.parse('2026-12-04T11:00:00-07:00'),
    weekOpenAt: Date.parse('2026-11-29T12:00:00-07:00'),
    weekOpenClock: '12:00',
  },
  'Pat',
  null,
);

const SAMPLE: { [K in TemplateName]: EmailPayload<K> } = {
  'sign-in': { token: 'tok_signin_1' },
  'team-invite': { inviter: 'Alex Rivera', team: 'Northline Realty', token: 'tok_invite_1' },
  'staff-invite': { token: 'tok_staff_1' },
  'set-password': { token: 'tok_set_1' },
  'reset-password': { token: 'tok_reset_1' },
  announcement: {
    title: 'Session 3 moved to Wed Dec 9 · 1:00 PM CT',
    body: 'The replay, chapters and transcript are on the Sales AI Employee page.',
    action: 'calendar',
    actionLabel: 'Update Calendar',
  },
  'session-24h': { n: 3, title: 'The Living Database', start: S3_START, zone: CHICAGO },
  'session-1h': { n: 3, title: 'The Living Database', start: S3_START, zone: CHICAGO },
  'replay-ready': { n: 2, title: 'Speed to Lead', employee: 'Sales AI Employee', moduleId: 'sales' },
  'build-reminder': { employee: 'Marketing AI Employee', moduleId: 'marketing', steps: 3 },
  'weekly-digest': {},
  'skill-purchase': { skillName: 'Recruiting Prep', variant: 'new', sets: 'owner_ops', firstName: 'Pat', next: '/skill-library/recruiting-prep', token: 'tok_skill_1' },
  'learner-invite': { firstName: 'Pat', email: 'pat@example.test', token: 'tok_learner_1' },
  'learner-nudge': { firstName: 'Pat' },
  'cohort-welcome': { cohortName: 'December Cohort', copy: WELCOME_COPY },
};

/** Connor's HTML documents (the $37 skill email's design, D-247): not § 8.1's React Email shell. */
const BRANDED: readonly TemplateName[] = ['skill-purchase', 'learner-invite', 'learner-nudge'];
const branded = (name: TemplateName): boolean => BRANDED.includes(name);

/** § 8.1's exact subject for each sample, from `SUBJECTS` — the table, not a retyped copy. */
const SUBJECT: { [K in TemplateName]: string } = {
  'sign-in': SUBJECTS['sign-in']({}),
  'team-invite': SUBJECTS['team-invite']({ inviter: 'Alex Rivera', team: 'Northline Realty' }),
  'staff-invite': SUBJECTS['staff-invite']({}),
  announcement: SUBJECTS.announcement({ title: 'Session 3 moved to Wed Dec 9 · 1:00 PM CT' }),
  'session-24h': SUBJECTS['session-24h']({ n: 3, title: 'The Living Database' }),
  'session-1h': SUBJECTS['session-1h']({ n: 3, title: 'The Living Database' }),
  'replay-ready': SUBJECTS['replay-ready']({ n: 2, title: 'Speed to Lead' }),
  'build-reminder': SUBJECTS['build-reminder']({ employee: 'Marketing AI Employee' }),
  'weekly-digest': SUBJECTS['weekly-digest']({}),
  'set-password': SUBJECTS['set-password']({}),
  'reset-password': SUBJECTS['reset-password']({}),
  'skill-purchase': SUBJECTS['skill-purchase']({ skillName: 'Recruiting Prep', variant: 'new' }),
  'learner-invite': SUBJECTS['learner-invite']({}),
  'learner-nudge': SUBJECTS['learner-nudge']({}),
  'cohort-welcome': SUBJECTS['cohort-welcome']({ cohortName: 'December Cohort' }),
};

/**
 * The CTA label and href each template must render. Literals: this is the half of the Gate 8
 * assertion that no other file guards, so if a label is "improved" exactly one row fails and names
 * the template.
 */
const CTA: { [K in TemplateName]: { label: string; href: string } } = {
  'sign-in': { label: 'Sign In', href: `${APP}/sign-in?token=tok_signin_1` },
  'team-invite': { label: 'Accept Invite', href: `${APP}/invite/tok_invite_1` },
  'staff-invite': { label: 'Open Admin Console', href: `${APP}/invite/tok_staff_1` },
  announcement: { label: 'Update Calendar', href: `${APP}/sessions` },
  'session-24h': { label: 'Open Sessions', href: `${APP}/sessions` },
  'session-1h': { label: 'Join Session', href: `${APP}/sessions` },
  'replay-ready': { label: 'Watch Replay', href: `${APP}/employees/sales` },
  'build-reminder': { label: 'Continue Build', href: `${APP}/employees/marketing` },
  'weekly-digest': { label: 'Open Team Hub', href: `${APP}/team` },
  'set-password': { label: 'Set Your Password', href: `${APP}/set-password?token=tok_set_1` },
  'reset-password': { label: 'Reset Your Password', href: `${APP}/set-password?token=tok_reset_1` },
  'skill-purchase': { label: 'Set Your Password', href: `${APP}/set-password?token=tok_skill_1&amp;next=%2Fskill-library%2Frecruiting-prep` },
  'learner-invite': { label: 'Set Your Password', href: `${APP}/set-password?token=tok_learner_1` },
  'learner-nudge': { label: 'Sign In', href: `${APP}/sign-in` },
  'cohort-welcome': { label: 'Open The Academy', href: ACADEMY_URL },
};

// ---------- helpers ----------------------------------------------------------------------------

const renderOne = (template: TemplateName): Promise<string> => {
  // `elementFor` + `render` rather than `renderTemplate`, so the HTML and the subject can be
  // compared independently; `renderTemplate` is exercised on its own below.
  // skill-purchase is Connor's HTML string. Rendering its placeholder element would drop the note.
  const prepared = elementFor(template, SAMPLE[template] as Record<string, unknown>);
  if (prepared.html) return Promise.resolve(prepared.html);
  return render(prepared.element);
};

/** Every rendered template, once, so the per-row assertions do not re-render nine emails each. */
const HTML = {} as Record<TemplateName, string>;

beforeAll(async () => {
  for (const name of TEMPLATE_NAMES) HTML[name] = await renderOne(name);
});

/** The `style` attribute of the first `<tag>` that has one. */
function styleOf(html: string, tag: string): string {
  const m = new RegExp(`<${tag}\\b[^>]*\\sstyle="([^"]*)"`).exec(html);
  if (!m?.[1]) throw new Error(`no <${tag}> with a style attribute in the rendered email`);
  return m[1];
}

/** React escapes `'` and `"` inside attribute values; undo that before comparing a font stack. */
const unescapeAttr = (s: string): string => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

/**
 * One `style="…"` attribute, split into its individual declarations.
 *
 * WHY EVERY COLOUR AND WIDTH ASSERTION BELOW GOES THROUGH THIS. `toContain` on the raw attribute
 * string is a SUBSTRING test, and a CSS declaration list is full of strings that contain each
 * other: `max-width:560px` contains `width:560px`, and `background-color:#15211d` contains
 * `color:#15211d`. An assertion written against the raw string therefore passes when the
 * declaration it names has been deleted and a longer one happens to end with it — which is exactly
 * how `expect(column).toContain('width:560px')` went on passing with `layout.ts`'s explicit
 * `width` removed. Comparing whole declarations makes `toContain` an equality test per item, so it
 * can only pass when the declaration is really there.
 */
const declsOf = (style: string): string[] =>
  style
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean);

/** Every `style="…"` in the document, as declaration lists — one entry per styled element. */
const styleBlocks = (html: string): string[][] =>
  [...html.matchAll(/\sstyle="([^"]*)"/g)].map((m) => declsOf(m[1] ?? ''));

/** The declaration list of every `<table>` that has a style, in document order. */
const tableDecls = (html: string): string[][] =>
  [...html.matchAll(/<table\b[^>]*\sstyle="([^"]*)"/g)].map((m) => declsOf(m[1] ?? ''));

/** The whole `<a>…</a>`, the one primary button. */
function anchorOf(html: string): string {
  const m = /<a\b[^>]*>[\s\S]*?<\/a>/.exec(html);
  if (!m) throw new Error('the rendered email has no <a>');
  return m[0];
}

const hrefOf = (html: string): string => /<a\b[^>]*\shref="([^"]*)"/.exec(html)?.[1] ?? '';

// ================================================================================================
// Gate 8: the exact subject and the CTA label, per row of § 8.1's table
// ================================================================================================

describe('email templates · § 8.1 subjects and CTAs @g8', () => {
  it('covers all nine of § 8.1’s templates, D-132’s two password emails, and nothing else @g8', () => {
    // § 8.1's table has nine rows and D-132 adds two, then the $37 skill email, D-247's two and the cohort
    // welcome. If another name is ever added to `subjects.ts`, this fails here rather than silently rendering one
    // email short in production.
    expect(TEMPLATE_NAMES).toHaveLength(15);
    expect(Object.keys(SAMPLE).sort()).toEqual([...TEMPLATE_NAMES].sort());
  });

  for (const name of TEMPLATE_NAMES) {
    it(`${name} renders its exact subject and its CTA label @g8`, () => {
      const html = HTML[name];

      // skill-purchase keeps the inbox subject, and the document is Connor's: the <title> and the
      // greeting are "Thank you, {first name}." The first link is the wordmark, not the button.
      if (name === 'skill-purchase') {
        expect(html).toContain('<title>Thank you, Pat.</title>');
        expect(html).toContain('Thank you, Pat.');
        expect(html).toContain(`>${CTA[name].label}</a>`);
        expect(html).toContain(`href="${CTA[name].href}"`);
        return;
      }
      // D-247: the learner emails are the same document, with their own greeting.
      if (name === 'learner-invite' || name === 'learner-nudge') {
        const greeting = name === 'learner-invite' ? 'Welcome, Pat.' : 'Hi, Pat.';
        expect(html).toContain(`<title>${greeting}</title>`);
        expect(html).toContain(`>${CTA[name].label}</a>`);
        expect(html).toContain(`href="${CTA[name].href}"`);
        return;
      }

      // The subject, character for character — in the <title>, the preheader and the H1, which
      // `EmailLayout` renders from the one string.
      expect(html).toContain(SUBJECT[name]);
      expect(html).toContain(`<title>${SUBJECT[name]}</title>`);
      expect(styleOf(html, 'h1')).toBeTruthy();

      // The CTA label, inside the one primary button rather than merely somewhere in the document.
      expect(anchorOf(html)).toContain(CTA[name].label);
      expect(hrefOf(html)).toBe(CTA[name].href);
    });
  }

  it('renders the H1 from the subject, so the inbox and the email agree @g8', () => {
    // Not a style preference: CLAUDE.md forbids copy the product does not have, and § 8.1 specifies
    // a subject per template and no heading at all. The subject is therefore the only honest H1.
    const html = HTML['weekly-digest'];
    expect(html).toMatch(/<h1[^>]*>Your team this week<\/h1>/);
  });

  it('gives build-reminder the same CTA the page it opens will show @g8', async () => {
    // `cards.ts`: `buildOf` reports `not_started` at zero verified steps, which `employeeCard` maps
    // to `Start Build`, and `in_progress` above it, which maps to `Continue Build`.
    const started = await render(
      elementFor('build-reminder', {
        employee: 'Marketing AI Employee',
        moduleId: 'marketing',
        steps: 0,
      }).element,
    );
    expect(anchorOf(started)).toContain('Start Build');
    expect(anchorOf(started)).not.toContain('Continue Build');
    expect(started).toContain('0 of 6 steps verified');

    // The sample is 3 of 6, which is the other arm.
    expect(anchorOf(HTML['build-reminder'])).toContain('Continue Build');
    expect(HTML['build-reminder']).toContain('3 of 6 steps verified');
  });

  it('falls back to the app’s own `Open` label for an announcement with no action @g8', async () => {
    // `Dashboard.vm.ts`: `raw.action ? raw.actionLabel || 'Open' : ''`. The banner renders no button
    // at all in that last case; an email has to render one, and `Open` is the app's own word.
    const html = await render(
      elementFor('announcement', {
        title: 'Replay is up: Session 2 · Speed to Lead',
        body: 'The replay, chapters and transcript are on the Sales AI Employee page.',
        action: null,
      }).element,
    );
    expect(anchorOf(html)).toContain('Open');
    expect(hrefOf(html)).toBe(`${APP}/`);
  });
});

// ================================================================================================
// § 8.1's shell: 560 px column, Hanken Grotesk, H1 26/32, body 14/20, one primary button
// ================================================================================================

describe('email templates · § 8.1 shell @g8', () => {
  // skill-purchase is Connor's document (600px, Geist, his own button), and D-247's two learner emails
  // share it. Their own tests pin that.
  for (const name of TEMPLATE_NAMES.filter((n) => !branded(n))) {
    it(`${name} renders the 560 px content column @g8`, () => {
      const html = HTML[name];
      const column = tableDecls(html).find((d) => d.includes(`max-width:${CONTENT_WIDTH}px`));
      expect(column, 'no table carries the 560px max-width').toBeTruthy();
      // Both, deliberately: the CSS width holds the column at 560 in a client that honours it, and
      // `max-width` is what stops it overflowing a 375px phone. `layout.tsx` sets both and says
      // why; this asserts both, as whole DECLARATIONS rather than substrings — `max-width:560px`
      // contains the text `width:560px`, so the substring form of this assertion was satisfied by
      // the max-width alone and the explicit `width` was untested (see `declsOf`).
      expect(column).toContain(`width:${CONTENT_WIDTH}px`);
      expect(column).toContain(`max-width:${CONTENT_WIDTH}px`);
      expect(CONTENT_WIDTH).toBe(560);
    });

    it(`${name} renders the H1 at 26/32 and body text at 14/20 @g8`, () => {
      const html = HTML[name];

      const h1 = styleOf(html, 'h1');
      expect(h1).toContain('font-size:26px');
      expect(h1).toContain('line-height:32px');
      // Weight and tracking are `SignIn.module.css`'s `.h1`, the app's only 26/32 heading.
      expect(h1).toContain('font-weight:600');
      expect(h1).toContain('letter-spacing:-0.02em');

      const p = styleOf(html, 'p');
      expect(p).toContain('font-size:14px');
      // `Text` defaults to 24px; this is the assertion that our 20px actually wins.
      expect(p).toContain('line-height:20px');
      expect(p).not.toContain('line-height:24px');
    });

    it(`${name} renders Hanken Grotesk with the generated system-sans fallback @g8`, () => {
      const html = HTML[name];
      expect(unescapeAttr(styleOf(html, 'h1'))).toContain(`font-family:${EMAIL_FONT_STACK}`);
      // The reference's own Google Fonts family, for the clients that honour a <link> in <head>.
      expect(html).toContain('fonts.googleapis.com/css2?family=Hanken+Grotesk');
    });

    it(`${name} renders exactly one primary button, styled like Button primary @g8`, () => {
      const html = HTML[name];
      // § 8.1 allows one link. skill-purchase is Connor's document and is not in this loop.
      expect(html.match(/<a\b/g) ?? []).toHaveLength(1);

      const a = styleOf(html, 'a');
      // `Button.module.css`: `.primary` background/colour, `.btn` radius 8 and weight 600,
      // `.lg` height 40 / padding 0 16px / 14px.
      expect(a).toContain(`background-color:${EMAIL_TOKENS['action-primary']}`);
      expect(a).toContain(`color:${EMAIL_TOKENS['action-on-primary']}`);
      expect(a).toContain('border-radius:8px');
      expect(a).toContain('font-weight:600');
      expect(a).toContain('font-size:14px');
      expect(a).toContain('height:40px');
      expect(a).toContain('box-sizing:border-box');
      // 40 minus the two 1px borders: what centres the label where the app uses `align-items`.
      expect(a).toContain('line-height:38px');
      expect(a).not.toContain('line-height:100%');
    });
  }
});

// ================================================================================================
// The four production failures
// ================================================================================================

describe('email templates · what would break in a real inbox @g8', () => {
  for (const name of TEMPLATE_NAMES) {
    it(`${name} leaks no var(--…) and no oklch(…) into the HTML @g8`, () => {
      const html = HTML[name];
      // THE bug this directory's inline hex exists to prevent: an email client resolves neither, so
      // either one is a dropped colour declaration — black text on a dark client's black card.
      expect(html).not.toContain('var(--');
      expect(html).not.toContain('oklch(');
      // Connor's note uses his own colours, not the § 8.1 token pair or the 560px card.
      if (branded(name)) return;

      // And the hexes that should be there, are — ON THE ELEMENTS THAT NEED THEM.
      //
      // This half used to be `expect(html).toContain(EMAIL_TOKENS['text-primary'])` and the same
      // for `bg-surface`, anywhere in the document. Both are satisfied by hexes other elements
      // contribute: `text-primary` (#15211d) is also the H1's colour and `bg-surface` (#ffffff) is
      // also `action-on-primary` on the button. So the two declarations that actually prevent
      // black-on-black — the page box's own `color` and the card's own `background-color` — could
      // be deleted from `layout.tsx` and the suite stayed green. A token that LEAKED was caught; a
      // colour that VANISHED was not.
      //
      // What matters is the PAIR on one box. A dark-mode client recolours backgrounds it is given
      // and leaves the ones it is not; a box that paints its own background and does not set its
      // own text colour is the whole failure mode.
      const blocks = styleBlocks(html);

      const canvas = blocks.filter((d) => d.includes(`background-color:${EMAIL_TOKENS['bg-canvas']}`));
      expect(canvas.length, 'nothing paints the --bg-canvas page background').toBeGreaterThan(0);
      expect(
        canvas.some((d) => d.includes(`color:${EMAIL_TOKENS['text-primary']}`)),
        'the page box paints --bg-canvas but sets no text colour of its own',
      ).toBe(true);

      const card = blocks.find((d) => d.includes(`max-width:${CONTENT_WIDTH}px`));
      expect(card, 'no element carries the 560px column').toBeTruthy();
      expect(card, 'the 560px card does not paint --bg-surface').toContain(
        `background-color:${EMAIL_TOKENS['bg-surface']}`,
      );

      // The H1 carries its own colour too, rather than inheriting it: Outlook's Word engine does
      // not inherit `color` into a heading reliably, and this is the one line of every email.
      expect(declsOf(styleOf(html, 'h1'))).toContain(`color:${EMAIL_TOKENS['text-primary']}`);
    });

    it(`${name} renders an absolute link @g8`, () => {
      // There is no document in an inbox to resolve a relative href against.
      if (branded(name)) {
        const hrefs = [...HTML[name].matchAll(/\shref="([^"]*)"/g)].map((m) => m[1] ?? '');
        expect(hrefs.length).toBeGreaterThan(0);
        for (const href of hrefs) expect(href).toMatch(/^(https:\/\/|mailto:)/);
        return;
      }
      const href = hrefOf(HTML[name]);
      expect(href).toMatch(/^https:\/\//);
      // The welcome's button is the academy host, not a path on this app.
      if (name === 'cohort-welcome') expect(href).toBe(ACADEMY_URL);
      else expect(href.startsWith(`${APP}/`)).toBe(true);
    });

    it(`${name} never carries a Zoom URL @g8`, () => {
      // § 8.4: the Zoom URL is revealed only inside the join window, by
      // `GET /api/sessions/:id/join`. An email is permanent, so one in an email is a standing
      // bypass of that window. SCREENS § 5.3: `JoinButton` is the only element that links to Zoom.
      expect(HTML[name]).not.toContain('zoom.us');
    });
  }
});

// ================================================================================================
// § 8.1's time rule: `fmt.when` in the RECIPIENT's zone, falling back to CT
// ================================================================================================

describe('email templates · recipient time zones @g8', () => {
  it('renders a session instant in the recipient’s saved zone @g8', async () => {
    const html = await render(
      elementFor('session-24h', {
        n: 3,
        title: 'The Living Database',
        start: S3_START,
        zone: NEW_YORK,
      }).element,
    );
    // Viewer zone first, program zone in parentheses — CLAUDE.md's time rule, and the same string
    // Gate 2 pins for `fmt.when` with a New York viewer.
    expect(html).toContain('Wed, Dec 9 · 2:00 PM ET (1:00 PM CT)');
  });

  it('falls back to CT when the recipient has no saved zone @g8', async () => {
    for (const zone of [undefined, null, '']) {
      const html = await render(
        elementFor('session-1h', {
          n: 3,
          title: 'The Living Database',
          start: S3_START,
          zone,
        }).element,
      );
      // CT, and no parenthesised second zone: for a Central recipient `fmt.time` prints one clock.
      expect(html).toContain('Wed, Dec 9 · 1:00 PM CT');
      expect(html).not.toContain('(1:00 PM CT)');
    }
  });

  it('falls back to CT when the recipient’s saved zone is not a zone at all @g8', async () => {
    // `users.prefs` is free-form `jsonb` (`apps/api/src/db/schema.ts`) with no enum and no check
    // constraint, so `tz` is NOT guaranteed to be one of `ZONES`'s eight. A plausible typo rather
    // than a nonsense string, because that is the value this actually happens with: one letter
    // from the program zone, out of a hand-written migration or an imported roster.
    const TYPO = 'America/Chigago';
    // The premise, asserted rather than assumed: if `Intl` ever started accepting this string the
    // rest of the test would be measuring nothing.
    expect(() => new Intl.DateTimeFormat('en-US', { timeZone: TYPO })).toThrow(RangeError);

    // § 8.1: "and fall back to CT". Before this, `fmt.when` threw `RangeError` out of `elementFor`,
    // `transport.send` logged `template render threw: …` and returned `{ok: false}`, and that ONE
    // learner received no email at all — not a wrong hour, nothing — while the rest of the cohort
    // got theirs. Pinned as the literal CT string, not as `fmt.when(S3_START)`: this machine's host
    // zone IS Central, so comparing against an unzoned format would pass here and on no CI runner.
    expect(zoneFor(TYPO)).toBe(PROGRAM_TZ);
    expect(whenFor(S3_START, TYPO)).toBe('Wed, Dec 9 · 1:00 PM CT');

    const html = await render(
      elementFor('session-24h', {
        n: 3,
        title: 'The Living Database',
        start: S3_START,
        zone: TYPO,
      }).element,
    );
    expect(html).toContain('Wed, Dec 9 · 1:00 PM CT');
    // CT only, with no parenthesised second clock: the fallback IS the program zone, so `fmt.time`
    // prints one clock exactly as it does for a Central recipient.
    expect(html).not.toContain('(1:00 PM CT)');
  });

  it('does not latch a recipient’s zone into the shared fmt module @g8', () => {
    // `fmt` reads a module-level viewer zone (`packages/core/src/time.ts`), so a formatter that
    // forgot to restore it would silently re-zone every later email in the process — and in a
    // scheduler fanning one reminder out to twelve zones, most of them would be wrong. This is the
    // single invariant `recipient.ts`'s 48-line header is built around, and the try/finally in
    // `whenFor` is all that enforces it.
    //
    // WHY THE EXPECTED VALUE IS READ OFF THE HOST INSTEAD OF WRITTEN DOWN. The failure latches the
    // RECIPIENT's zone, so the assertion has to be able to tell that zone apart from a correctly
    // restored "auto" — and "auto" is the HOST's zone, which is Central on this program's machines
    // and UTC on CI. The previous version of this test poked New York in beforehand and asserted
    // `viewerZone() !== NEW_YORK`, which no realistic failure produces: deleting the whole
    // try/finally from `whenFor` left all 83 tests green. So: resolve what this host's auto zone
    // actually renders, pick a recipient zone that renders DIFFERENTLY, and assert the module came
    // back to auto.
    setViewerZone(null);
    const auto = viewerZone();
    const autoWhen = fmt.when(S3_START);
    const foreign = [NEW_YORK, HONOLULU, CHICAGO].find(
      (z) => z !== auto && whenFor(S3_START, z) !== autoWhen,
    );
    expect(foreign, 'no candidate zone renders differently from this host’s own').toBeTruthy();

    const rendered = whenFor(S3_START, foreign!);
    // The recipient really was rendered in their own zone — otherwise "it restored the zone" would
    // be trivially true of a `whenFor` that never set one.
    expect(rendered).not.toBe(autoWhen);
    // And the shared module is back to auto, both as the state it reports and as what it formats.
    expect(viewerZone()).toBe(auto);
    expect(fmt.when(S3_START)).toBe(autoWhen);

    // Restored to AUTO, not to whatever happened to be set before — `recipient.ts`'s consequence 1.
    // `time.ts` exports no reader for the raw `VIEW_TZ`, so a `whenFor` that tried to put back
    // "what it was" would have to read `viewerZone()`, which substitutes the host zone for null and
    // would latch it permanently. Poking `foreign` in beforehand is what makes that visible: a
    // restore-to-previous implementation lands on `foreign`, which is not `auto` by construction.
    setViewerZone(foreign!);
    whenFor(S3_START, CHICAGO);
    expect(viewerZone()).toBe(auto);
    setViewerZone(null);
  });
});

// ================================================================================================
// The renderer seam `transport.setRenderer` consumes
// ================================================================================================

describe('email templates · the transport seam @g8', () => {
  it('returns § 8.1’s subject alongside the HTML @g8', async () => {
    const out = await renderTemplate('team-invite', SAMPLE['team-invite'] as Record<string, unknown>);
    expect(out.subject).toBe('Alex Rivera invited you to Northline Realty on Amplified Impact');
    expect(out.html).toContain(out.subject);
  });

  it('renders every template through the typed door too @g8', async () => {
    for (const name of TEMPLATE_NAMES) {
      // `renderEmail` is what the deferred routes and jobs call; it must not diverge from the
      // untyped renderer the transport holds.
      const out = await renderEmail(name, SAMPLE[name] as never);
      expect(out.subject).toBe(SUBJECT[name]);
      expect(out.html).toContain(CTA[name].label);
    }
  });

  it('throws a named error for a missing payload field rather than rendering `undefined` @g8', async () => {
    // `transport.send` catches this, logs `template render threw: …` and reports `{ok:false}`
    // WITHOUT sending. The alternative is an inbox reading "Finish your undefined".
    await expect(renderTemplate('sign-in', {})).rejects.toThrow(
      'email template sign-in: "token" must be a string, got undefined',
    );
    await expect(
      renderTemplate('build-reminder', { employee: 'Marketing AI Employee', moduleId: 'marketing' }),
    ).rejects.toThrow('email template build-reminder: "steps" must be a finite number');
    // Whitespace is empty: it would render as a gap in the H1.
    await expect(renderTemplate('announcement', { title: '   ', body: 'x' })).rejects.toThrow(
      'email template announcement: "title" is empty',
    );
  });

  it('refuses to render a link against a missing or relative APP_URL @g8', () => {
    expect(() => appBase('')).toThrow('APP_URL is not set');
    expect(() => appBase('/sessions')).toThrow('APP_URL is not an absolute http(s) URL');
    expect(() => appBase('app.amplifiedimpact.test')).toThrow('not an absolute http(s) URL');
    // A sub-path deployment keeps its prefix: concatenation, not URL resolution.
    expect(appBase('https://host.test/lms/')).toBe('https://host.test/lms');
  });
});

describe('the sign-in link back to a guided setup (D-151)', () => {
  it('carries `next` when there is one, and only a guided setup in learn', async () => {
    const { signInPath } = await import('./links');
    expect(signInPath('tok_1')).toBe('/sign-in?token=tok_1');
    expect(signInPath('tok_1', '/skill-library/perfect-week')).toBe('/sign-in?token=tok_1&next=%2Fskill-library%2Fperfect-week');
  });
});
