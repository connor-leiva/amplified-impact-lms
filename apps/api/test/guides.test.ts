// The free guides' landing pages and opt-ins (DECISIONS.md D-038, D-039), over HTTP, for every guide.
//
// Each opt-in is the /ai101 waitlist's route under its own path (`routes/ai101.ts`), so what that
// route already proves (body limit, duplicates, the log never carrying a visitor) is `ai101.test.ts`'s.
// This file holds what is the guides' own, for each guide in `GUIDE_SLUGS`:
//
//   1. ITS SIGN-UPS ARE ITS OWN. Stored under the guide's slug, so the GoHighLevel sync tags them as
//      that guide and not the waitlist, and someone on two lists is two rows, not a duplicate.
//   2. IT NEVER RECORDS SMS CONSENT. Guide pages have no SMS box, so a phone number or a "yes" sent to
//      one by hand is dropped, never stored as consent that visitor never saw.
//   3. THE NO-JS FORM LANDS ON THE GUIDE'S OWN PAGE: its download (or, for the voice profile setup,
//      its gated steps, `#unlocked`) or `#guide-error`, never /ai101.
//   4. THE PAGE IS SERVED LIKE /ai101: from memory, exempt from the global limit, revalidated, with
//      `Referrer-Policy: same-origin` (which the no-JS post needs) and its inline script in the CSP.
//
// And /retool's own (D-046), the "Retool, Don't Replace: AI 101 for Team Owners" talk's page, whose
// form asks two things no other form does:
//
//   5. ITS TEAM SIZE IS REQUIRED, AND IS ONE OF FOUR. Missing or anything else is the page's own 400
//      (or, without JS, its error line), after the name and the address and before anything else;
//      the December box is stored as ticked or not. The table's CHECK refuses any other size too.
//   6. NO OTHER FORM RECORDS EITHER. The other guides and the /ai101 waitlist ask neither, so what a
//      request says about them is dropped (D-038's rule for the SMS box), never stored or refused.
//   7. ITS CAPITALISED SPELLINGS ARRIVE. The talk ends on "Type RETOOL in the chat", so `/RETOOL`
//      and `/Retool` 301 to the page with the query string kept, as its trailing slash does.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { build, cspScriptHashes } from '../src/app';
import type { App, BuildOptions } from '../src/app';
import { ai101Waitlist } from '../src/db/schema';
import { TEAM_SIZES, TERMS_VERSION } from '../src/routes/ai101';
import { GUIDE_ALIASES, GUIDE_SLUGS, type GuideSlug } from '../src/routes/guide-list';
import { withQuery } from '../src/routes/guides';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-10-14T09:00:00-06:00');

/** A stand-in for `dist/<slug>.html`: an inline module script, a non-ASCII character, the form. */
const page = (slug: GuideSlug) =>
  [
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${slug} · Amplified Impact</title></head>`,
    `<body><main><h1>${slug}</h1>`,
    `<form id="guide-form" method="post" action="/api/${slug}"></form></main>`,
    '<script type="module">document.querySelector("form").noValidate = true;</script></body></html>',
  ].join('');
const PAGES = Object.fromEntries(GUIDE_SLUGS.map((slug) => [slug, page(slug)])) as Record<GuideSlug, string>;

const ORIGIN = 'http://localhost';

let app: App;

const fresh = async (opts: BuildOptions = {}): Promise<App> => {
  app = await build({ logger: false, guidePages: PAGES, ...opts });
  return app;
};

const postJson = (url: string, payload: unknown) =>
  app.inject({
    method: 'POST',
    url,
    payload: JSON.stringify(payload),
    headers: { 'content-type': 'application/json', origin: ORIGIN },
  });

const postForm = (url: string, fields: Record<string, string>) =>
  app.inject({
    method: 'POST',
    url,
    payload: new URLSearchParams(fields).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN },
  });

const rows = async () => (await testDatabase()).select().from(ai101Waitlist).orderBy(ai101Waitlist.source);
/** For the tests that store several rows under ONE source, where `rows()` leaves the order open. */
const rowsByEmail = async () => (await testDatabase()).select().from(ai101Waitlist).orderBy(ai101Waitlist.email);

/** What a page's script sends, arriving from ManyChat's link. */
const valid = { firstName: 'Pat', email: 'pat@example.com', website: '', src: 'ig' };

/**
 * What a guide's form asks beyond a name and an address, answered: /retool's required team size
 * (D-046), and nothing for any other guide, whose page has no such field. Spread into every body the
 * shared suites below post, so each one posts what its own page would.
 */
const asked = (slug: GuideSlug): Record<string, string> => (slug === 'retool' ? { teamSize: '11-25' } : {});

beforeAll(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await testDatabase();
});

afterAll(() => {
  delete process.env.FIXED_NOW;
});

beforeEach(() => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
});

afterEach(async () => {
  await app?.close();
});

/**
 * Where each guide's no-JS success lands: what its page shows with `:target`. The two step-throughs
 * with the opt-in part way down land on their gated steps (the voice profile setup's, D-040, and
 * /retool's, D-046); every other guide, the PDF guides and every skill page (the Reel Editor's holds
 * its setup steps, D-045; D-052), lands on its download.
 */
const STEP_THROUGHS: readonly GuideSlug[] = ['voice-profile', 'retool'];
const JOINED = Object.fromEntries(
  GUIDE_SLUGS.map((slug) => [slug, STEP_THROUGHS.includes(slug) ? '#unlocked' : '#download']),
) as Record<GuideSlug, string>;

it('serves the guides there are, by slug', () => {
  expect(GUIDE_SLUGS).toEqual([
      'task-sync-starter',
      'ops-time-audit',
      'voice-profile',
      'reel-editor',
      'retool',
      'database-health-check',
      'recruiting-prep',
      'team-playbook-builder',
      'content-strategist',
      'perfect-week',
      'inbox-meeting-follow-through',
      'due-diligence-review',
      'repair-request-response',
      'counter-explainer',
      'offer-strategy',
      'offer-comparison',
      'pricing-conversation-prep',
      'appointment-follow-up',
      'showing-tour-prep',
      'low-appraisal-response',
      'team-pnl-review',
      'new-construction-review',
    ]);
});

describe.each(GUIDE_SLUGS)('/%s · the page (D-038, D-039) @g9', (slug) => {
  const PAGE = PAGES[slug];

  it('serves the built page whole, revalidated, with the Referrer-Policy its no-JS form needs @g9', async () => {
    await fresh();
    const res = await app.inject({ method: 'GET', url: `/${slug}?src=ig` });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(PAGE);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['referrer-policy']).toBe('same-origin');
    expect(res.headers.etag).toBe(`"${createHash('sha256').update(PAGE, 'utf8').digest('base64url')}"`);

    const again = await app.inject({ method: 'GET', url: `/${slug}`, headers: { 'if-none-match': res.headers.etag! } });
    expect(again.statusCode).toBe(304);
    expect(again.body).toBe('');
  });

  it("is served under a CSP that admits the page's inline script by hash @g9", async () => {
    // `server.ts` adds every built guide to `cspScriptHashes`. Without it the opt-in still posts
    // (no-JS), but the in-place unlock and the in-app hint are dead, silently.
    const body = 'document.querySelector("form").noValidate = true;';
    const hash = `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;
    await fresh({ inlineScriptHashes: cspScriptHashes([PAGE]) });
    const csp = String((await app.inject({ method: 'GET', url: `/${slug}` })).headers['content-security-policy']);
    expect(csp).toContain(`script-src 'self' ${hash}`);
    expect(csp).toContain("form-action 'self'");
  });

  it('sends the trailing-slash spelling to the page with a 301, query string kept @g9', async () => {
    await fresh();
    const res = await app.inject({ method: 'GET', url: `/${slug}/?src=ig` });
    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe(`/${slug}?src=ig`);
  });

  it('answers a JSON 404 when the page has not been built @g9', async () => {
    await fresh({ guidePages: {} });
    const res = await app.inject({ method: 'GET', url: `/${slug}` });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Not found' });
  });

  it("is exempt from § 9.4's global limit: 120 visits from one address all load @g9", async () => {
    // A Reel's comments arrive in bursts, many through the same carrier NAT.
    await fresh();
    const codes = new Set<number>();
    for (let i = 0; i < 120; i++) codes.add((await app.inject({ method: 'GET', url: `/${slug}` })).statusCode);
    expect([...codes]).toEqual([200]);
  });
});

describe.each(GUIDE_SLUGS)('POST /api/%s · the opt-in (D-038, D-039) @g9', (slug) => {
  const URL = `/api/${slug}`;
  /** What this guide's page sends: `valid`, plus /retool's team size (D-046). */
  const VALID = { ...valid, ...asked(slug) };

  beforeEach(async () => {
    await resetDatabase();
    await fresh();
  });

  it("stores the sign-up under the guide's own source and answers 201 @g9", async () => {
    const res = await postJson(URL, { ...VALID, firstName: '  Pat ', email: ' Pat@Example.COM ' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true });
    const [row, ...rest] = await rows();
    expect(rest).toEqual([]);
    expect(row).toMatchObject({
      firstName: 'Pat',
      email: 'pat@example.com',
      brokerage: null,
      source: slug,
      src: 'ig',
      phone: null,
      smsConsent: false,
      smsConsentAt: null,
      smsConsentText: null,
      // /retool's answer (D-046); every other guide's row has neither.
      teamSize: slug === 'retool' ? '11-25' : null,
      decemberInterest: false,
      termsVersion: TERMS_VERSION,
      createdAt: NOW,
      ghlSyncedAt: null,
    });
    expect(TERMS_VERSION).toBe('2026-10-18');
  });

  it('never records a phone number or SMS consent, whatever the request says @g9', async () => {
    // Guide pages have no SMS box. A "yes" sent by hand is words that visitor never saw: dropped, and
    // the sign-up stored as email-only.
    expect((await postJson(URL, { ...VALID, phone: '(860) 555-0199', smsConsent: true })).statusCode).toBe(201);
    expect(await rows()).toEqual([
      expect.objectContaining({ phone: null, smsConsent: false, smsConsentAt: null, smsConsentText: null }),
    ]);
    // Not even a number that would be refused on the waitlist turns into an error here.
    expect(
      (await postJson(URL, { ...VALID, email: 'b@example.com', phone: 'not a phone', smsConsent: 'on' })).statusCode,
    ).toBe(201);
  });

  it('keeps someone on the waitlist and this guide as two rows, and a second sign-up as one @g9', async () => {
    expect((await postJson('/api/ai101/waitlist', valid)).statusCode).toBe(201);
    expect((await postJson(URL, VALID)).statusCode).toBe(201);
    expect((await postJson(URL, VALID)).statusCode).toBe(201);
    expect((await rows()).map((r) => r.source).sort()).toEqual(['expcon-2026-ai101', slug].sort());
  });

  it('takes the source from the server, never from the body @g9', async () => {
    expect((await postJson(URL, { ...VALID, source: 'expcon-2026-ai101' })).statusCode).toBe(201);
    expect((await rows()).map((r) => r.source)).toEqual([slug]);
  });

  it("refuses a bad name or address with the page's own messages, and stores nothing @g9", async () => {
    const name = await postJson(URL, { ...VALID, firstName: '  ' });
    expect(name.statusCode).toBe(400);
    expect(name.json()).toEqual({ field: 'firstName', error: 'Enter your first name.' });
    const email = await postJson(URL, { ...VALID, email: 'pat@' });
    expect(email.statusCode).toBe(400);
    expect(email.json()).toEqual({ field: 'email', error: 'Enter a valid email address.' });
    expect(await rows()).toEqual([]);
  });

  it('answers a filled honeypot exactly as a success, and stores nothing @g9', async () => {
    expect((await postJson(URL, { ...VALID, website: 'https://spam.example' })).statusCode).toBe(201);
    expect(await rows()).toEqual([]);
  });

  it('403s another origin @g9', async () => {
    const res = await app.inject({
      method: 'POST',
      url: URL,
      payload: JSON.stringify(VALID),
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
    });
    expect(res.statusCode).toBe(403);
    expect(await rows()).toEqual([]);
  });

  it("the no-JS form: stores the sign-up and lands where its page shows it, with a 303 @g9", async () => {
    const res = await postForm(URL, { firstName: 'Pat', email: 'pat@example.com', website: '', ...asked(slug) });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/${slug}${JOINED[slug]}`);
    expect(await rows()).toHaveLength(1);
  });

  it("the no-JS form: lands an invalid one on the guide's error line, never on /ai101 @g9", async () => {
    const res = await postForm(URL, { firstName: 'Pat', email: 'nope', website: '', ...asked(slug) });
    expect(res.statusCode).toBe(303);
    expect(res.headers.location).toBe(`/${slug}#guide-error`);
    expect(await rows()).toEqual([]);
  });

  it('logs the sign-up under its own name, without the visitor @g9', async () => {
    await app.close();
    const lines: string[] = [];
    await fresh({ logger: { level: 'info', stream: { write: (line: string) => void lines.push(line) } } });
    expect(
      (await postForm(URL, { firstName: 'Zephyrine', email: 'zephyrine.guide@example.com', website: '', ...asked(slug) }))
        .statusCode,
    ).toBe(303);
    const log = lines.join('');
    expect(log).toContain(`${slug}: sign-up recorded`);
    expect(log).not.toContain('Zephyrine');
    expect(log.toLowerCase()).not.toContain('zephyrine.guide@example.com');
  });
});

// ================================================================================================
// /retool (D-046)
// ================================================================================================

describe("/RETOOL and /Retool · the talk's spellings of /retool (D-046) @g9", () => {
  it('are the two there are @g9', () => {
    // "Type RETOOL in the chat": the room types it in capitals, or as a word.
    expect(GUIDE_ALIASES).toEqual({ retool: ['/RETOOL', '/Retool'] });
  });

  it('send each one, and the trailing slash, to /retool with a 301, query string kept byte for byte @g9', async () => {
    await fresh();
    for (const spelling of ['/RETOOL', '/Retool', '/retool/']) {
      for (const query of ['', '?src=slide', '?src=qr&utm_source=talk', '?a=%20b+c&a=d']) {
        const res = await app.inject({ method: 'GET', url: `${spelling}${query}` });
        expect(res.statusCode, spelling + query).toBe(301);
        expect(res.headers.location, spelling + query).toBe(`/retool${query}`);
      }
    }
    // HEAD the same way.
    expect((await app.inject({ method: 'HEAD', url: '/RETOOL?src=slide' })).headers.location).toBe('/retool?src=slide');
  });

  it('are exempt from the global limit, like the page: a room typing the slide all loads @g9', async () => {
    await fresh();
    const venue = { 'x-forwarded-for': '198.51.100.46' };
    const codes = new Set<number>();
    for (let i = 0; i < 110; i++) codes.add((await app.inject({ method: 'GET', url: '/RETOOL', headers: venue })).statusCode);
    expect([...codes]).toEqual([301]);
  });

  it('are those spellings exactly: any other is not the page @g9', async () => {
    await fresh();
    for (const url of ['/ReTool', '/reTOOL', '/RETOOLX', '/Retoolx', '/retoolx']) {
      expect((await app.inject({ method: 'GET', url })).statusCode, url).toBe(404);
    }
  });
});

describe('POST /api/retool · the team size and the December box (D-046) @g9', () => {
  const URL = '/api/retool';
  /** /retool's own message, as a literal: the page shows it under the `<select>`. */
  const CHOOSE = { field: 'teamSize', error: 'Choose your team size.' };

  beforeEach(async () => {
    await resetDatabase();
    await fresh();
  });

  it('offers exactly the four sizes the page posts @g9', () => {
    // Literals, not the constant: the web page's `<select>` is built against these strings.
    expect(TEAM_SIZES).toEqual(['1-10', '11-25', '26-50', '51+']);
  });

  it("stores the sign-up under `retool` with its team size and the December box, and answers 201 @g9", async () => {
    const res = await postJson(URL, { ...valid, teamSize: '26-50', decemberInterest: true });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true });
    expect(await rows()).toEqual([
      expect.objectContaining({
        source: 'retool',
        email: 'pat@example.com',
        src: 'ig',
        teamSize: '26-50',
        decemberInterest: true,
        // A guide all the same: no SMS box, so none of that.
        phone: null,
        smsConsent: false,
      }),
    ]);
  });

  it('takes each of the four sizes, trimmed, and stores an absent box as false @g9', async () => {
    for (const [i, size] of TEAM_SIZES.entries()) {
      expect((await postJson(URL, { ...valid, email: `p${i}@example.com`, teamSize: ` ${size} ` })).statusCode, size).toBe(201);
    }
    const stored = await rowsByEmail();
    expect(stored.map((r) => r.teamSize)).toEqual(['1-10', '11-25', '26-50', '51+']);
    expect(stored.map((r) => r.decemberInterest)).toEqual([false, false, false, false]);
  });

  it("refuses a missing team size, or any but the four, with the page's own message, and stores nothing @g9", async () => {
    // `undefined` is the key left out (JSON drops it). An en dash, a near miss, a size the page never
    // offered, an inherited property's name: none is a size.
    for (const teamSize of [undefined, null, '', '   ', '51', '51 +', '1-100', '11–25', 'small', '1-10,11-25', 'constructor']) {
      const res = await postJson(URL, { ...valid, teamSize, decemberInterest: true });
      expect(res.statusCode, String(teamSize)).toBe(400);
      expect(res.json(), String(teamSize)).toEqual(CHOOSE);
    }
    expect(await rows()).toEqual([]);
  });

  it('asks for it in form order: after the name and the address, before anything else @g9', async () => {
    // firstName, email, teamSize: the order the page lays them out in, so the field it focuses.
    expect((await postJson(URL, { ...valid, firstName: '', teamSize: 'nope' })).json()).toEqual({
      field: 'firstName',
      error: 'Enter your first name.',
    });
    expect((await postJson(URL, { ...valid, email: 'pat@', teamSize: 'nope' })).json()).toEqual({
      field: 'email',
      error: 'Enter a valid email address.',
    });
    expect((await postJson(URL, { ...valid, teamSize: 'nope', brokerage: 'b'.repeat(121) })).json()).toEqual(CHOOSE);
  });

  it('answers a filled honeypot as a success before it asks for a team size, and stores nothing @g9', async () => {
    // A 400 here would tell the bot which field to fill next.
    const res = await postJson(URL, { ...valid, website: 'https://spam.example' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ ok: true });
    expect(await rows()).toEqual([]);
  });

  it('the no-JS form: a ticked box posts "on" and is stored; an unticked one is absent and stored false @g9', async () => {
    // `URLSearchParams` writes `51+` as `51%2B`, as a browser's form encoder does.
    const ticked = await postForm(URL, { firstName: 'Pat', email: 'pat@example.com', teamSize: '51+', decemberInterest: 'on', website: '' });
    expect(ticked.statusCode).toBe(303);
    expect(ticked.headers.location).toBe('/retool#unlocked');
    const unticked = await postForm(URL, { firstName: 'Lee', email: 'lee@example.com', teamSize: '1-10', website: '' });
    expect(unticked.statusCode).toBe(303);
    expect(unticked.headers.location).toBe('/retool#unlocked');
    expect(await rowsByEmail()).toEqual([
      expect.objectContaining({ email: 'lee@example.com', teamSize: '1-10', decemberInterest: false }),
      expect.objectContaining({ email: 'pat@example.com', teamSize: '51+', decemberInterest: true }),
    ]);
  });

  it("the no-JS form: a missing or invalid team size lands on the page's error line, and stores nothing @g9", async () => {
    const cases: Record<string, string>[] = [
      { firstName: 'Pat', email: 'pat@example.com', website: '' },
      { firstName: 'Pat', email: 'pat@example.com', teamSize: '', website: '' },
      { firstName: 'Pat', email: 'pat@example.com', teamSize: '100+', decemberInterest: 'on', website: '' },
    ];
    for (const fields of cases) {
      const res = await postForm(URL, fields);
      expect(res.statusCode, JSON.stringify(fields)).toBe(303);
      expect(res.headers.location, JSON.stringify(fields)).toBe('/retool#guide-error');
    }
    expect(await rows()).toEqual([]);
  });

  it('logs the size and the box, which identify nobody, and never the visitor @g9', async () => {
    await app.close();
    const lines: string[] = [];
    await fresh({ logger: { level: 'info', stream: { write: (line: string) => void lines.push(line) } } });
    const fields = { firstName: 'Zephyrine', email: 'zephyrine.retool@example.com', teamSize: '26-50', decemberInterest: 'on', website: '' };
    expect((await postForm(URL, fields)).statusCode).toBe(303);
    const log = lines.join('');
    expect(log).toContain('retool: sign-up recorded');
    expect(log).toContain('"team":"26-50"');
    expect(log).toContain('"december":true');
    expect(log).not.toContain('Zephyrine');
    expect(log.toLowerCase()).not.toContain('zephyrine.retool@example.com');
  });

  it('the database itself refuses a team size that is not one of the four @g9', async () => {
    // `ai101_waitlist_team_size`, the CHECK migration 0005 added: the route never writes another
    // size, and neither can anything else that writes to the table.
    const db = await testDatabase();
    const insert = (id: string, teamSize: string | null) =>
      db.insert(ai101Waitlist).values({ id, firstName: 'Pat', email: `${id}@example.com`, source: 'retool', createdAt: NOW, teamSize });
    for (const [i, teamSize] of ['100+', '51', '', '51 ', 'team-size-1-10'].entries()) {
      const cause = await insert(`wl-bad${i}`, teamSize).then(
        () => null,
        (err: unknown) => (err as { cause?: unknown }).cause,
      );
      // The CHECK, by name and by Postgres's code for a check violation — not some other failure.
      expect(cause, teamSize).toMatchObject({ code: '23514', constraint_name: 'ai101_waitlist_team_size' });
    }
    expect(await rows()).toEqual([]);
    // Each of the four, and none at all (every other form's row, and every row before /retool).
    for (const [i, teamSize] of [...TEAM_SIZES, null].entries()) {
      await expect(insert(`wl-ok${i}`, teamSize)).resolves.toBeDefined();
    }
    expect((await rowsByEmail()).map((r) => r.teamSize)).toEqual([...TEAM_SIZES, null]);
  });
});

describe('only /retool records a team size or the December box (D-046) @g9', () => {
  // Every other form: the four other guides and the /ai101 waitlist. None of their pages asks either,
  // so what a request says about them is dropped before it is checked — D-038's rule for the SMS box
  // — and is neither stored nor refused: a size those pages never offer is not theirs to judge.
  const OTHERS = [...GUIDE_SLUGS.filter((slug) => slug !== 'retool').map((slug) => `/api/${slug}`), '/api/ai101/waitlist'];

  beforeEach(async () => {
    await resetDatabase();
    await fresh();
  });

  it('covers every form there is but /retool @g9', () => {
    // Every guide's opt-in from `GUIDE_SLUGS` (D-052) but /retool's, and the waitlist.
    expect(OTHERS).toContain('/api/ai101/waitlist');
    expect(OTHERS).not.toContain('/api/retool');
    for (const slug of GUIDE_SLUGS.filter((s) => s !== 'retool')) expect(OTHERS).toContain(`/api/${slug}`);
    expect(OTHERS).toHaveLength(GUIDE_SLUGS.length);
  });

  it.each(OTHERS)('%s stores neither, whatever the request says @g9', async (url) => {
    expect((await postJson(url, { ...valid, teamSize: '26-50', decemberInterest: true })).statusCode).toBe(201);
    expect((await postJson(url, { ...valid, email: 'b@example.com', teamSize: 'not a size', decemberInterest: 'on' })).statusCode).toBe(201);
    const form = await postForm(url, { firstName: 'Cy', email: 'c@example.com', teamSize: '51+', decemberInterest: 'on', website: '' });
    expect(form.statusCode).toBe(303);
    expect(form.headers.location).not.toContain('error');
    const stored = await rowsByEmail();
    expect(stored.map((r) => r.email)).toEqual(['b@example.com', 'c@example.com', 'pat@example.com']);
    for (const row of stored) expect(row, row.email).toMatchObject({ teamSize: null, decemberInterest: false });
  });
});

describe('withQuery', () => {
  it('keeps the query string exactly as it arrived, or adds none', () => {
    expect(withQuery('/ops-time-audit', '/ops-time-audit/?src=ig&x=1')).toBe('/ops-time-audit?src=ig&x=1');
    expect(withQuery('/ops-time-audit', '/ops-time-audit/')).toBe('/ops-time-audit');
  });
});
