import { describe, expect, it } from 'vitest';
import {
  GHL_API_VERSION,
  GHL_BASE_URL,
  isTextable,
  readGhlConfig,
  srcTag,
  syncWaitlistContact,
  waitlistTags,
} from './ghl';
import type { Fetch, GhlConfig, WaitlistContact } from './ghl';

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
    // A source nobody mapped gets no form tag, so it can trigger no workflow, the waitlist's least of all.
    expect(waitlistTags('qr', false, 'some-new-form')).toEqual(['src-qr']);
  });
});

describe('configuration @g9', () => {
  it('is on only when BOTH variables are set', () => {
    expect(readGhlConfig({ GHL_TOKEN: ' pit-x ', GHL_LOCATION_ID: ' loc ' })).toEqual({ token: 'pit-x', locationId: 'loc' });
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
