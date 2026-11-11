import { describe, expect, it } from 'vitest';
import { FREE_SKILLS } from '@ai/core/skills';
import {
  FREE_SKILL_SOURCES,
  GHL_API_VERSION,
  GHL_BASE_URL,
  buyerTags,
  chicagoDate,
  ghlSyncPaused,
  isTextable,
  orderFieldValues,
  readGhlConfig,
  setContactFields,
  syncLoginContact,
  syncStamp,
  upsertOpportunity,
  SOURCE_TAGS,
  srcTag,
  syncWaitlistContact,
  TEAM_SIZE_TAGS,
  teamSizeTag,
  waitlistTags,
} from './ghl';
import type { Fetch, GhlConfig, WaitlistContact } from './ghl';
// The route's list of sizes, which the tag table must cover exactly. Test-only: ghl.ts reads no route.
import { TEAM_SIZES } from '../routes/ai101';
import { GUIDE_SLUGS } from '../routes/guide-list';

// The GoHighLevel client (D-033), against a fake fetch. Nothing here reaches the network.

const config: GhlConfig = { token: 'pit-test-token-123', locationId: 'loc-abc' };
// A phone number but NO SMS consent: the case that must never put a number in the CRM.
const pat: WaitlistContact = { firstName: 'Pat', email: 'pat@example.com', brokerage: 'Northline Realty', src: 'qr', phone: '+18605551234', smsConsent: false };

interface Seen {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** A fake GHL: answers each call from `script`, in order, and records what it was sent. */
function fakeGhl(script: Array<{ status?: number; body?: unknown; throw?: Error }>) {
  const seen: Seen[] = [];
  let i = 0;
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const step = script[i++] ?? { status: 500 };
    seen.push({
      url: String(url),
      method: String(init?.method),
      headers: Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>)),
      body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
    });
    if (step.throw) throw step.throw;
    return new Response(step.body === undefined ? '' : JSON.stringify(step.body), { status: step.status ?? 200 });
  }) as Fetch;
  return { fetch, seen };
}

const upserted = (id: string, tags: string[] = [], isNew = true) => ({ status: 200, body: { new: isNew, contact: { id, tags } } });
const tagged = (tags: string[]) => ({ status: 201, body: { tags } });

describe('tags @g9', () => {
  it('maps the allowed ?src= values to their channel tags', () => {
    expect(srcTag('qr')).toBe('src-qr');
    expect(srcTag('ig')).toBe('src-ig');
    expect(srcTag(' QR ')).toBe('src-qr');
  });

  it('calls a sign-up with no src a direct one', () => {
    for (const none of [null, undefined, '', '   ']) expect(srcTag(none)).toBe('src-direct');
  });

  it('never lets the public URL mint a tag of its own choosing', () => {
    // `?src=` is in a link anyone can edit. Only allowed values become tags.
    for (const other of ['facebook', 'anything', 'src-qr', 'qr2']) expect(srcTag(other)).toBe('src-other');
  });

  it('gives every sign-up the list tag and the event tag, plus its channel', () => {
    expect(waitlistTags('qr')).toEqual(['ai101-waitlist', 'event-expcon-2026', 'src-qr']);
    expect(waitlistTags(null)).toEqual(['ai101-waitlist', 'event-expcon-2026', 'src-direct']);
  });

  it('tags by the form the sign-up came from: the Task Sync Starter Kit is never the waitlist (D-038)', () => {
    expect(waitlistTags('qr', false, 'expcon-2026-ai101')).toEqual(['ai101-waitlist', 'event-expcon-2026', 'src-qr']);
    // ManyChat's link carries `?src=ig`.
    expect(waitlistTags('ig', false, 'task-sync-starter')).toEqual(['task-sync-starter', 'src-ig']);
    expect(waitlistTags(null, false, 'task-sync-starter')).toEqual(['task-sync-starter', 'src-direct']);
    // The Ops Time Audit (D-039): its own tag, so its own workflow.
    expect(waitlistTags('ig', false, 'ops-time-audit')).toEqual(['ops-time-audit', 'src-ig']);
    // The voice profile setup (D-040), Spring's: its own tag too.
    // One of the five free skills (D-134): its slug, then the pack's alias.
    expect(waitlistTags('ig', false, 'voice-profile')).toEqual(['voice-profile', 'ai-lead-free-skills', 'src-ig']);
    // The Reel Editor (D-045), the first Claude skill: its own tag, so it can start its own workflow.
    expect(waitlistTags('ig', false, 'reel-editor')).toEqual(['reel-editor', 'src-ig']);
    // A source nobody mapped gets no form tag, so it can trigger no workflow, the waitlist's least of all.
    expect(waitlistTags('qr', false, 'some-new-form')).toEqual(['src-qr']);
  });

  it("tags a /retool sign-up with its own tag, its channel, its team size and the December box (D-046)", () => {
    expect(waitlistTags('ig', false, 'retool', { teamSize: '26-50', decemberInterest: true })).toEqual([
      'retool',
      'src-ig',
      'team-size-26-50',
      'december-interest',
    ]);
    expect(waitlistTags(null, false, 'retool', { teamSize: '1-10', decemberInterest: false })).toEqual([
      'retool',
      'src-direct',
      'team-size-1-10',
    ]);
    expect(waitlistTags('qr', false, 'retool', { teamSize: '51+' })).toEqual(['retool', 'src-qr', 'team-size-51-plus']);
    expect(waitlistTags('facebook', false, 'retool', { teamSize: '11-25' })).toEqual(['retool', 'src-other', 'team-size-11-25']);
  });

  it('maps each of the four team sizes to its own tag, and nothing else to any tag (D-046)', () => {
    // The table covers the route's sizes exactly: a size added there and forgotten here fails.
    expect(Object.keys(TEAM_SIZE_TAGS)).toEqual([...TEAM_SIZES]);
    expect(TEAM_SIZES.map((size) => teamSizeTag(size))).toEqual([
      'team-size-1-10',
      'team-size-11-25',
      'team-size-26-50',
      // `+` spelled out: a tag is a word typed into a filter.
      'team-size-51-plus',
    ]);
    expect(teamSizeTag(' 11-25 ')).toBe('team-size-11-25');
    // An allow-list, as `?src=` is: nothing else mints a tag, an inherited property's name least of all.
    for (const other of [null, undefined, '', '51', '51-plus', '100+', 'team-size-1-10', 'constructor', '__proto__', 'toString']) {
      expect(teamSizeTag(other), String(other)).toBeNull();
      expect(waitlistTags('ig', false, 'retool', { teamSize: other }), String(other)).toEqual(['retool', 'src-ig']);
    }
  });

  it('adds december-interest for a ticked box and only then (D-046)', () => {
    expect(waitlistTags('ig', false, 'retool', { teamSize: '11-25', decemberInterest: true })).toContain('december-interest');
    for (const team of [{ teamSize: '11-25', decemberInterest: false }, { teamSize: '11-25' }, {}]) {
      expect(waitlistTags('ig', false, 'retool', team), JSON.stringify(team)).not.toContain('december-interest');
    }
  });

  it('tags every guide\'s sign-ups with the guide\'s own slug, from GUIDE_SLUGS (D-052)', () => {
    // A guide added to the list is tagged without a second list to keep: its slug, then the channel.
    for (const slug of GUIDE_SLUGS) {
      expect(SOURCE_TAGS[slug], slug).toEqual([slug]);
      // The five free skills carry the pack's alias between the two (D-134).
      expect(waitlistTags('ig', false, slug), slug).toEqual(FREE_SKILL_SOURCES.includes(slug) ? [slug, 'ai-lead-free-skills', 'src-ig'] : [slug, 'src-ig']);
    }
  });

  it("leaves every other form's tags as they were: no size and no box adds nothing (D-046)", () => {
    for (const source of ['expcon-2026-ai101', 'task-sync-starter', 'ops-time-audit', 'voice-profile', 'reel-editor']) {
      expect(waitlistTags('ig', false, source, { teamSize: null, decemberInterest: false }), source).toEqual(
        waitlistTags('ig', false, source),
      );
    }
    expect(waitlistTags('qr', true, 'expcon-2026-ai101', { teamSize: null, decemberInterest: false })).toEqual([
      'ai101-waitlist',
      'event-expcon-2026',
      'src-qr',
      'sms-consent',
    ]);
  });
});

describe('configuration @g9', () => {
  it('is on only when BOTH variables are set', () => {
    expect(readGhlConfig({ GHL_TOKEN: ' pit-x ', GHL_LOCATION_ID: ' loc ' })).toEqual({ token: 'pit-x', locationId: 'loc', fields: {}, pipeline: null });
    expect(readGhlConfig({ GHL_TOKEN: 'pit-x' })).toBeNull();
    expect(readGhlConfig({ GHL_LOCATION_ID: 'loc' })).toBeNull();
    expect(readGhlConfig({ GHL_TOKEN: '  ', GHL_LOCATION_ID: 'loc' })).toBeNull();
    expect(readGhlConfig({})).toBeNull();
  });
});

describe('syncWaitlistContact @g9', () => {
  it('upserts the contact, then tags it — two calls, in that order, to v2 with the token', async () => {
    const ghl = fakeGhl([upserted('c1'), tagged(['ai101-waitlist', 'event-expcon-2026', 'src-qr'])]);
    const result = await syncWaitlistContact(pat, { config, fetch: ghl.fetch });

    expect(result).toEqual({ ok: true, contactId: 'c1', created: true, tagsDropped: [] });
    expect(ghl.seen.map((s) => `${s.method} ${s.url}`)).toEqual([
      `POST ${GHL_BASE_URL}/contacts/upsert`,
      `POST ${GHL_BASE_URL}/contacts/c1/tags`,
    ]);
    for (const s of ghl.seen) {
      expect(s.headers.Authorization).toBe('Bearer pit-test-token-123');
      expect(s.headers.Version).toBe(GHL_API_VERSION);
      expect(s.headers['Content-Type']).toBe('application/json');
    }
  });

  it('sends the name, address and brokerage, and NO tags, in the upsert', async () => {
    // HighLevel's upsert REPLACES a contact's tags. Sending ours there would wipe an existing
    // client's — so the upsert must carry none.
    const ghl = fakeGhl([upserted('c1'), tagged([])]);
    await syncWaitlistContact(pat, { config, fetch: ghl.fetch });
    expect(ghl.seen[0]!.body).toEqual({
      locationId: 'loc-abc',
      email: 'pat@example.com',
      firstName: 'Pat',
      companyName: 'Northline Realty',
    });
    expect(ghl.seen[0]!.body).not.toHaveProperty('tags');
    expect(ghl.seen[0]!.body).not.toHaveProperty('source');
  });

  it('never sends a phone number to GHL without SMS consent', async () => {
    // GHL can text any contact with a number. The only sure way nobody unconsented is texted is that
    // GHL never has their number. (The exact-body test above already has no `phone`, with one given.)
    const ghl = fakeGhl([upserted('c1'), tagged([])]);
    await syncWaitlistContact(pat, { config, fetch: ghl.fetch });
    expect(ghl.seen[0]!.body).not.toHaveProperty('phone');
    expect(ghl.seen[1]!.body.tags).not.toContain('sms-consent');
  });

  it("tags a kit sign-up with the kit's tag and not the waitlist's (D-038)", async () => {
    const ghl = fakeGhl([upserted('c1'), tagged(['task-sync-starter', 'src-ig'])]);
    const kit = { ...pat, brokerage: null, phone: null, src: 'ig', source: 'task-sync-starter' };
    expect(await syncWaitlistContact(kit, { config, fetch: ghl.fetch })).toMatchObject({ ok: true, tagsDropped: [] });
    expect(ghl.seen[1]!.body).toEqual({ tags: ['task-sync-starter', 'src-ig'] });
    // Which form it was picks the tags; it is never sent as a field of the contact.
    expect(ghl.seen[0]!.body).not.toHaveProperty('source');
  });

  it('tags a /retool sign-up with its size and the December box, and sends neither as a contact field (D-046)', async () => {
    const ghl = fakeGhl([upserted('c1'), tagged(['retool', 'src-ig', 'team-size-26-50', 'december-interest'])]);
    const owner = { ...pat, brokerage: null, phone: null, src: 'ig', source: 'retool', teamSize: '26-50', decemberInterest: true };
    expect(await syncWaitlistContact(owner, { config, fetch: ghl.fetch })).toMatchObject({ ok: true, tagsDropped: [] });
    expect(ghl.seen[1]!.body).toEqual({ tags: ['retool', 'src-ig', 'team-size-26-50', 'december-interest'] });
    // Facts for marketing's filters, as tags; the contact itself gets the name and the address only.
    expect(ghl.seen[0]!.body).toEqual({ locationId: 'loc-abc', email: 'pat@example.com', firstName: 'Pat' });
  });

  it('sends the number and the sms-consent tag when the visitor ticked the box', async () => {
    const ghl = fakeGhl([upserted('c1'), tagged([])]);
    await syncWaitlistContact({ ...pat, smsConsent: true }, { config, fetch: ghl.fetch });
    expect(ghl.seen[0]!.body.phone).toBe('+18605551234');
    expect(ghl.seen[1]!.body).toEqual({ tags: ['ai101-waitlist', 'event-expcon-2026', 'src-qr', 'sms-consent'] });
  });

  it('treats consent with no number as not textable, rather than trusting the database alone', () => {
    expect(isTextable({ phone: '+18605551234', smsConsent: true })).toBe(true);
    expect(isTextable({ phone: null, smsConsent: true })).toBe(false);
    expect(isTextable({ phone: '  ', smsConsent: true })).toBe(false);
    expect(isTextable({ phone: '+18605551234', smsConsent: false })).toBe(false);
  });

  it('leaves the company alone when no brokerage was given', async () => {
    // An empty companyName would blank an existing contact's company.
    for (const brokerage of [null, '', '  ']) {
      const ghl = fakeGhl([upserted('c1'), tagged([])]);
      await syncWaitlistContact({ ...pat, brokerage }, { config, fetch: ghl.fetch });
      expect(ghl.seen[0]!.body).not.toHaveProperty('companyName');
    }
  });

  it('tags an EXISTING contact with the union of its tags and ours, so none can be lost', async () => {
    // Correct whether GHL's tags call appends (the union's old half is a no-op) or replaces (the
    // union is exactly what should survive).
    const ghl = fakeGhl([
      upserted('c9', ['client', 'VIP'], false),
      tagged(['client', 'vip', 'ai101-waitlist', 'event-expcon-2026', 'src-qr']),
    ]);
    const result = await syncWaitlistContact(pat, { config, fetch: ghl.fetch });
    expect(ghl.seen[1]!.body).toEqual({ tags: ['client', 'vip', 'ai101-waitlist', 'event-expcon-2026', 'src-qr'] });
    expect(result).toEqual({ ok: true, contactId: 'c9', created: false, tagsDropped: [] });
  });

  it('reports, by name, a tag that went missing anyway', async () => {
    const ghl = fakeGhl([upserted('c9', ['client', 'vip'], false), tagged(['client', 'ai101-waitlist'])]);
    const result = await syncWaitlistContact(pat, { config, fetch: ghl.fetch });
    expect(result).toMatchObject({ ok: true, tagsDropped: ['vip'] });
  });

  it('does not invent a dropped tag when the response carries no tag list', async () => {
    const ghl = fakeGhl([upserted('c9', ['client'], false), { status: 201, body: { succeded: true } }]);
    expect(await syncWaitlistContact(pat, { config, fetch: ghl.fetch })).toMatchObject({ ok: true, tagsDropped: [] });
  });

  it('accepts an upsert answer that is the contact itself, not wrapped', async () => {
    const ghl = fakeGhl([{ status: 200, body: { id: 'c2', tags: [] } }, tagged([])]);
    expect(await syncWaitlistContact(pat, { config, fetch: ghl.fetch })).toMatchObject({ ok: true, contactId: 'c2', created: false });
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [400, 'rejected'],
    [422, 'rejected'],
    [429, 'rate-limited'],
    [500, 'server'],
    [503, 'server'],
  ] as const)('reports a %i from the upsert as %s, and never calls the tags endpoint', async (status, kind) => {
    const ghl = fakeGhl([{ status, body: { message: 'Pat pat@example.com is invalid' } }]);
    const result = await syncWaitlistContact(pat, { config, fetch: ghl.fetch });
    expect(result).toEqual({ ok: false, kind, status, step: 'upsert' });
    expect(ghl.seen).toHaveLength(1);
  });

  it('reports a failed tags call as step "tags"', async () => {
    const ghl = fakeGhl([upserted('c1'), { status: 502 }]);
    expect(await syncWaitlistContact(pat, { config, fetch: ghl.fetch })).toEqual({ ok: false, kind: 'server', status: 502, step: 'tags' });
  });

  it('calls a 2xx with no contact id malformed, rather than tagging nothing', async () => {
    const ghl = fakeGhl([{ status: 200, body: { new: true, contact: {} } }]);
    expect(await syncWaitlistContact(pat, { config, fetch: ghl.fetch })).toEqual({ ok: false, kind: 'malformed', step: 'upsert' });
  });

  it('tells a dropped connection from a timeout', async () => {
    const down = fakeGhl([{ throw: new TypeError('fetch failed') }]);
    expect(await syncWaitlistContact(pat, { config, fetch: down.fetch })).toEqual({ ok: false, kind: 'network', step: 'upsert' });

    // A real timeout: a GHL that never answers, and a 30 ms budget.
    const hang = ((_u: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
      })) as Fetch;
    expect(await syncWaitlistContact(pat, { config, fetch: hang, timeoutMs: 30 })).toEqual({ ok: false, kind: 'timeout', step: 'upsert' });
  });

  it('never puts the visitor, the token or a response body into what it reports', async () => {
    // GHL error bodies can echo the request back. A result is logged; it must carry none of it.
    for (const step of [{ status: 422, body: { message: 'Pat pat@example.com pit-test-token-123' } }, { throw: new TypeError('pat@example.com') }]) {
      const ghl = fakeGhl([step]);
      const text = JSON.stringify(await syncWaitlistContact(pat, { config, fetch: ghl.fetch }));
      for (const secret of ['Pat', 'pat@example.com', 'pit-test-token-123', 'Northline', '8605551234']) expect(text).not.toContain(secret);
    }
  });
});

// --- D-134 ------------------------------------------------------------------------------------------

describe('D-134: the marketing aliases @g9', () => {
  it('adds ai-lead-free-skills to the five free skills, after their own slug, and to nothing else', () => {
    // The same five as the Library's FREE_FIVE: core's FREE_SKILLS and the Voice Profile, each a guide.
    expect([...FREE_SKILL_SOURCES].sort()).toEqual([...FREE_SKILLS, 'voice-profile'].sort());
    for (const slug of FREE_SKILL_SOURCES) {
      expect(GUIDE_SLUGS, slug).toContain(slug);
      expect(waitlistTags(null, false, slug)).toEqual([slug, 'ai-lead-free-skills', 'src-direct']);
    }
    for (const source of ['expcon-2026-ai101', 'cohort-waitlist', 'task-sync-starter', 'retool'])
      expect(waitlistTags(null, false, source), source).not.toContain('ai-lead-free-skills');
  });

  it('adds each plan’s alias beside its existing tags, which stay exactly as they were', () => {
    const base = { option: 'full', status: 'paid', paidAt: 1, paymentFailedAt: null, membershipEndedAt: null, refundedAt: null, campaign: null, smsConsent: false, phone: null };
    expect(buyerTags({ ...base, plan: 'cohort' })).toEqual(['offer-buyer', 'plan-cohort', 'pay-full', 'ai-buyer-accelerator']);
    expect(buyerTags({ ...base, plan: 'membership', option: 'year_upfront' })).toEqual(['offer-buyer', 'plan-membership', 'pay-year', 'ai-buyer-insiders']);
    expect(buyerTags({ ...base, plan: 'agent_plan', option: 'monthly' })).toEqual(['offer-buyer', 'plan-agent-plan', 'pay-monthly', 'ai-buyer-agent-plan']);
    expect(buyerTags({ ...base, plan: 'agents', option: 'upto15' })).toEqual(['offer-buyer', 'plan-agents', 'ai-buyer-team-plan']);
    // A full refund and an ended membership: the old tag, then its alias.
    expect(buyerTags({ ...base, plan: 'cohort', refundedAt: 2 })).toEqual(['offer-buyer', 'plan-cohort', 'pay-full', 'ai-buyer-accelerator', 'refunded', 'ai-refunded']);
    expect(buyerTags({ ...base, plan: 'membership', option: 'monthly', membershipEndedAt: 2 })).toEqual(['offer-buyer', 'plan-membership', 'pay-monthly', 'ai-buyer-insiders', 'membership-ended', 'ai-canceled']);
    // Abandoned checkout, payment failed and the forum are as they were, with no alias.
    expect(buyerTags({ ...base, plan: 'cohort', status: 'expired', paidAt: null })).toEqual(['checkout-abandoned-cohort']);
    expect(buyerTags({ ...base, plan: 'cohort', campaign: 'forum' })).toEqual(['offer-buyer', 'plan-cohort', 'pay-full', 'ai-buyer-accelerator', 'event-forum-nov-2026']);
    // The Skill Library has no alias.
    expect(buyerTags({ ...base, plan: 'library' })).toEqual(['offer-buyer', 'plan-library']);
  });

  it('still writes every tag Spring already has, by its exact name', () => {
    const all = new Set([
      ...waitlistTags('qr', true, 'expcon-2026-ai101', { teamSize: '1-10', decemberInterest: true }),
      ...waitlistTags('ig', false, 'expcon-2026-ai101'),
      ...waitlistTags(null, false, 'retool', { teamSize: '11-25' }),
      ...['task-sync-starter', 'ops-time-audit', 'voice-profile', 'reel-editor'].flatMap((s) => waitlistTags(null, false, s)),
    ]);
    for (const tag of ['ai101-waitlist', 'event-expcon-2026', 'src-qr', 'src-ig', 'src-direct', 'sms-consent', 'task-sync-starter', 'ops-time-audit', 'voice-profile', 'reel-editor', 'retool', 'december-interest', 'team-size-1-10', 'team-size-11-25'])
      expect(all, tag).toContain(tag);
  });
});

describe('D-134: configuration @g9', () => {
  const env = { GHL_TOKEN: 'pit-test-token-123', GHL_LOCATION_ID: 'loc-abc' };

  it('reads each field id and the pipeline only from their own variables, with no defaults', () => {
    expect(readGhlConfig(env)).toEqual({ token: 'pit-test-token-123', locationId: 'loc-abc', fields: {}, pipeline: null });
    expect(
      readGhlConfig({ ...env, GHL_FIELD_OFFER: ' f-offer ', GHL_FIELD_LMS_LOGIN: 'f-login', GHL_FIELD_AMOUNT: '  ', GHL_PIPELINE_ID: 'p1', GHL_STAGE_LEAD: 's-lead', GHL_STAGE_PURCHASED: 's-buy' }),
    ).toEqual({
      token: 'pit-test-token-123',
      locationId: 'loc-abc',
      fields: { offer: 'f-offer', lmsLogin: 'f-login' },
      pipeline: { id: 'p1', stages: { lead: 's-lead', purchased: 's-buy' } },
    });
    // A pipeline id with no stage ids, or stage ids with no pipeline, is no pipeline.
    expect(readGhlConfig({ ...env, GHL_PIPELINE_ID: 'p1' })?.pipeline).toBeNull();
    expect(readGhlConfig({ ...env, GHL_STAGE_LEAD: 's-lead' })?.pipeline).toBeNull();
    // Field and stage ids alone never switch the integration on.
    expect(readGhlConfig({ GHL_FIELD_OFFER: 'f', GHL_PIPELINE_ID: 'p', GHL_STAGE_LEAD: 's' })).toBeNull();
  });

  it('pauses only for GHL_SYNC_ENABLED=false, exactly', () => {
    expect(ghlSyncPaused({ GHL_SYNC_ENABLED: 'false' })).toBe(true);
    for (const v of [undefined, '', 'true', '0', 'no', 'FALSE', 'off']) expect(ghlSyncPaused(v === undefined ? {} : { GHL_SYNC_ENABLED: v }), String(v)).toBe(false);
  });

  it('stamps what a sync wrote, changing with the location, a field id or the pipeline, and never holding one', () => {
    const plain = readGhlConfig(env)!;
    const stamp = syncStamp(plain);
    expect(syncStamp(readGhlConfig(env)!)).toBe(stamp);
    expect(syncStamp(readGhlConfig({ ...env, GHL_LOCATION_ID: 'loc-new' })!)).not.toBe(stamp);
    expect(syncStamp(readGhlConfig({ ...env, GHL_FIELD_OFFER: 'f-offer' })!)).not.toBe(stamp);
    expect(syncStamp(readGhlConfig({ ...env, GHL_FIELD_OFFER: 'f-other' })!)).not.toBe(syncStamp(readGhlConfig({ ...env, GHL_FIELD_OFFER: 'f-offer' })!));
    expect(syncStamp(readGhlConfig({ ...env, GHL_PIPELINE_ID: 'p1', GHL_STAGE_LEAD: 's' })!)).not.toBe(stamp);
    const full = syncStamp(readGhlConfig({ ...env, GHL_FIELD_OFFER: 'f-offer', GHL_PIPELINE_ID: 'p1', GHL_STAGE_LEAD: 's-lead' })!);
    for (const raw of ['loc-abc', 'f-offer', 'p1', 's-lead', 'pit-test-token-123']) expect(full).not.toContain(raw);
  });
});

describe('D-134: custom fields @g9', () => {
  const withFields: GhlConfig = { ...config, fields: { offer: 'f-offer', cohort: 'f-cohort', amount: 'f-amount', purchaseDate: 'f-date', lmsLogin: 'f-login' } };

  it('reads each plan’s values: its name, the Accelerator’s cohort, the amount in dollars and the day it was paid in Chicago', () => {
    // 2026-11-15T03:30Z is still Nov 14 in Chicago.
    const paidAt = Date.parse('2026-11-15T03:30:00Z');
    expect(orderFieldValues({ plan: 'cohort', amountTotal: 99700, paidAt })).toEqual({ offer: 'Amplified AI Accelerator', cohort: 'dec26', amount: 997, purchaseDate: '2026-11-14' });
    expect(orderFieldValues({ plan: 'membership', amountTotal: 19700, paidAt })).toEqual({ offer: 'Amplified Insiders', amount: 197, purchaseDate: '2026-11-14' });
    expect(orderFieldValues({ plan: 'agent_plan', amountTotal: 0, paidAt: null })).toEqual({ offer: 'Amplified Agent Plan' });
    expect(orderFieldValues({ plan: 'agents', amountTotal: null, paidAt: null })).toEqual({ offer: 'Amplified Team Plan' });
    expect(chicagoDate(Date.parse('2026-07-01T04:59:00Z'))).toBe('2026-06-30');
  });

  it('writes only the fields that have an id and a value, by id, and never an empty one', async () => {
    const ghl = fakeGhl([{ status: 200, body: { succeeded: true } }]);
    const r = await setContactFields('c-1', { offer: 'Amplified Insiders', cohort: '', amount: 0, purchaseDate: '2026-11-14' }, { config: withFields, fetch: ghl.fetch });
    expect(r).toEqual({ ok: true, action: 'written' });
    expect(ghl.seen).toHaveLength(1);
    expect(ghl.seen[0]!.method).toBe('PUT');
    expect(ghl.seen[0]!.url).toBe(`${GHL_BASE_URL}/contacts/c-1`);
    // Only customFields: nothing else on the contact is sent, so nothing else can change.
    expect(ghl.seen[0]!.body).toEqual({ customFields: [{ id: 'f-offer', field_value: 'Amplified Insiders' }, { id: 'f-date', field_value: '2026-11-14' }] });
  });

  it('makes no call at all when no field id is set, or no value is', async () => {
    const ghl = fakeGhl([]);
    expect(await setContactFields('c-1', { offer: 'Amplified Insiders' }, { config, fetch: ghl.fetch })).toEqual({ ok: true, action: 'skipped' });
    expect(await setContactFields('c-1', {}, { config: withFields, fetch: ghl.fetch })).toEqual({ ok: true, action: 'skipped' });
    expect(ghl.seen).toEqual([]);
  });

  it('reports a refused field write as step "fields", with a kind and a status only', async () => {
    const ghl = fakeGhl([{ status: 422, body: { message: 'pat@example.com bad field f-offer' } }]);
    const r = await setContactFields('c-1', { offer: 'Amplified Insiders' }, { config: withFields, fetch: ghl.fetch });
    expect(r).toEqual({ ok: false, kind: 'rejected', status: 422, step: 'fields' });
  });
});

describe('D-134: the opportunity @g9', () => {
  const pipeline = { id: 'p1', stages: { lead: 's-lead', freeSkills: 's-free', purchased: 's-buy', refunded: 's-refund', canceled: 's-refund' } };
  const withPipeline: GhlConfig = { ...config, pipeline };
  const none = { status: 200, body: { opportunities: [], meta: { total: 0 } } };
  const one = (stage: string, extra: Record<string, unknown> = {}) => ({
    status: 200,
    body: { opportunities: [{ id: 'o-1', contactId: 'c-1', pipelineId: 'p1', pipelineStageId: stage, name: 'Amplified Impact', status: 'open', ...extra }] },
  });

  it('does nothing at all without a pipeline, or without an id for the stage', async () => {
    const ghl = fakeGhl([]);
    expect(await upsertOpportunity('c-1', { stage: 'purchased', name: 'x' }, { config, fetch: ghl.fetch })).toEqual({ ok: true, action: 'skipped' });
    expect(await upsertOpportunity('c-1', { stage: 'paymentFailed', name: 'x' }, { config: withPipeline, fetch: ghl.fetch })).toEqual({ ok: true, action: 'skipped' });
    expect(ghl.seen).toEqual([]);
  });

  it('finds it by contact and pipeline in the configured location only, and creates one when there is none', async () => {
    const ghl = fakeGhl([none, { status: 201, body: { opportunity: { id: 'o-1' } } }]);
    const r = await upsertOpportunity('c-1', { stage: 'purchased', name: 'Amplified AI Accelerator', monetaryValue: 997 }, { config: withPipeline, fetch: ghl.fetch });
    expect(r).toEqual({ ok: true, action: 'created' });
    const search = new URL(ghl.seen[0]!.url);
    expect([ghl.seen[0]!.method, search.pathname]).toEqual(['GET', '/opportunities/search']);
    expect(Object.fromEntries(search.searchParams)).toEqual({ location_id: 'loc-abc', pipeline_id: 'p1', contact_id: 'c-1', limit: '1' });
    expect([ghl.seen[1]!.method, ghl.seen[1]!.url]).toEqual(['POST', `${GHL_BASE_URL}/opportunities/`]);
    expect(ghl.seen[1]!.body).toEqual({ pipelineId: 'p1', locationId: 'loc-abc', contactId: 'c-1', name: 'Amplified AI Accelerator', status: 'won', pipelineStageId: 's-buy', monetaryValue: 997 });
  });

  it('writes nothing when it is already where it belongs: a second sync is a no-op', async () => {
    const ghl = fakeGhl([one('s-buy', { name: 'Amplified AI Accelerator', monetaryValue: 997 })]);
    expect(await upsertOpportunity('c-1', { stage: 'purchased', name: 'Amplified AI Accelerator', monetaryValue: 997 }, { config: withPipeline, fetch: ghl.fetch })).toEqual({ ok: true, action: 'unchanged' });
    expect(ghl.seen).toHaveLength(1);
  });

  it('moves a lead forward to Purchased, with the plan’s name and value', async () => {
    const ghl = fakeGhl([one('s-lead'), { status: 200, body: { opportunity: { id: 'o-1' } } }]);
    expect(await upsertOpportunity('c-1', { stage: 'purchased', name: 'Amplified Insiders', monetaryValue: 197 }, { config: withPipeline, fetch: ghl.fetch })).toEqual({ ok: true, action: 'moved' });
    expect([ghl.seen[1]!.method, ghl.seen[1]!.url]).toEqual(['PUT', `${GHL_BASE_URL}/opportunities/o-1`]);
    expect(ghl.seen[1]!.body).toEqual({ pipelineId: 'p1', pipelineStageId: 's-buy', status: 'won', name: 'Amplified Insiders', monetaryValue: 197 });
  });

  it('never moves a purchase back to a lead stage, nor a stage this app does not know', async () => {
    for (const stage of ['s-buy', 's-refund', 's-connor-added']) {
      const ghl = fakeGhl([one(stage)]);
      expect(await upsertOpportunity('c-1', { stage: 'freeSkills', name: 'Amplified Impact' }, { config: withPipeline, fetch: ghl.fetch }), stage).toEqual({ ok: true, action: 'unchanged' });
      expect(ghl.seen, stage).toHaveLength(1);
    }
  });

  it('follows the orders among the purchase stages: Purchased to Refunded, and back only for a new paid order', async () => {
    const refund = fakeGhl([one('s-buy'), { status: 200, body: {} }]);
    expect(await upsertOpportunity('c-1', { stage: 'refunded', name: 'Amplified Insiders' }, { config: withPipeline, fetch: refund.fetch })).toEqual({ ok: true, action: 'moved' });
    expect(refund.seen[1]!.body).toMatchObject({ pipelineStageId: 's-refund', status: 'lost' });
    // `contactTarget` says Purchased again only when a paid order that is not refunded exists.
    const rebuy = fakeGhl([one('s-refund'), { status: 200, body: {} }]);
    expect(await upsertOpportunity('c-1', { stage: 'purchased', name: 'Amplified Agent Plan' }, { config: withPipeline, fetch: rebuy.fetch })).toEqual({ ok: true, action: 'moved' });
    // A stage Connor added is moved by a purchase, never by a lead.
    const custom = fakeGhl([one('s-connor-added'), { status: 200, body: {} }]);
    expect(await upsertOpportunity('c-1', { stage: 'purchased', name: 'Amplified Agent Plan' }, { config: withPipeline, fetch: custom.fetch })).toEqual({ ok: true, action: 'moved' });
  });

  it('moves Free Skills to Lead’s stage when only Lead is set, and reports a failure as step "opportunity"', async () => {
    const leadOnly: GhlConfig = { ...config, pipeline: { id: 'p1', stages: { lead: 's-lead' } } };
    const ghl = fakeGhl([none, { status: 201, body: {} }]);
    await upsertOpportunity('c-1', { stage: 'freeSkills', name: 'Amplified Impact' }, { config: leadOnly, fetch: ghl.fetch });
    expect(ghl.seen[1]!.body).toMatchObject({ pipelineStageId: 's-lead', status: 'open' });
    for (const [status, kind] of [[401, 'unauthorized'], [422, 'rejected'], [429, 'rate-limited'], [503, 'server']] as const) {
      const failing = fakeGhl([{ status, body: { message: 'contact pat@example.com' } }]);
      expect(await upsertOpportunity('c-1', { stage: 'purchased', name: 'x' }, { config: withPipeline, fetch: failing.fetch })).toEqual({ ok: false, kind, status, step: 'opportunity' });
    }
  });
});

describe('D-134: a learner’s first sign-in @g9', () => {
  it('upserts the learner by email with their name and no phone, then adds lms-logged-in to their tags', async () => {
    const ghl = fakeGhl([upserted('c-9', ['spring-client']), tagged(['spring-client', 'lms-logged-in'])]);
    const r = await syncLoginContact({ email: 'jamie@ortizhomes.com', name: 'Jamie Ortiz' }, { config, fetch: ghl.fetch });
    expect(r).toEqual({ ok: true, contactId: 'c-9', created: true, tagsDropped: [] });
    expect(ghl.seen[0]!.body).toEqual({ locationId: 'loc-abc', email: 'jamie@ortizhomes.com', firstName: 'Jamie', lastName: 'Ortiz' });
    expect(ghl.seen[1]!.body).toEqual({ tags: ['spring-client', 'lms-logged-in'] });
  });
});
