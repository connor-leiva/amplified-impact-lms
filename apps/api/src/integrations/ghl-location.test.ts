import { describe, expect, it } from 'vitest';
import { ANCHOR_TAGS, APP_TAGS, CUSTOM_FIELDS, PIPELINE_NAME, PIPELINE_STAGES, ScriptStopped, copyContacts, politeFetch, setupLocation } from './ghl-location';
import type { Fetch } from './ghl';

// D-134's location scripts against a fake HighLevel with two locations. Nothing reaches the network.

interface Contact {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  tags: string[];
}
interface Location {
  pipelines: { id: string; name: string; stages: { id: string; name: string }[] }[];
  tags: { id: string; name: string }[];
  fields: { id: string; name: string; dataType: string }[];
  contacts: Contact[];
}
const empty = (): Location => ({ pipelines: [], tags: [], fields: [], contacts: [] });

function fakeHighLevel(locations: Record<string, Location>, tokens: Record<string, string>) {
  const calls: { token: string; method: string; path: string; body: Record<string, unknown> | undefined }[] = [];
  let n = 0;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const method = String(init?.method ?? 'GET');
    const token = String((init?.headers as Record<string, string>).Authorization).replace('Bearer ', '');
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ token, method, path: u.pathname + u.search, body });
    // A contact's tags call names no location: it is the contact's own.
    const contactTags = /^\/contacts\/([^/]+)\/tags$/.exec(u.pathname)?.[1];
    const locId =
      u.searchParams.get('locationId') ??
      (body?.locationId as string | undefined) ??
      (contactTags ? Object.keys(locations).find((k) => locations[k]!.contacts.some((c) => c.id === contactTags)) : undefined) ??
      u.pathname.split('/')[2]!;
    if (tokens[locId] !== token) return json({ message: 'no' }, 401);
    const L = locations[locId]!;
    if (u.pathname === '/opportunities/pipelines' && method === 'GET') return json({ pipelines: L.pipelines });
    if (u.pathname === '/opportunities/pipelines' && method === 'POST') {
      const p = { id: `p-${++n}`, name: String(body!.name), stages: (body!.stages as { name: string }[]).map((s) => ({ id: `st-${++n}`, name: s.name })) };
      L.pipelines.push(p);
      return json(p);
    }
    if (u.pathname.endsWith('/tags') && u.pathname.startsWith('/locations/')) {
      if (method === 'GET') return json({ tags: L.tags });
      const t = { id: `t-${++n}`, name: String(body!.name) };
      L.tags.push(t);
      return json({ tag: t });
    }
    if (u.pathname.endsWith('/customFields')) {
      if (method === 'GET') return json({ customFields: L.fields });
      const f = { id: `f-${++n}`, name: String(body!.name), dataType: String(body!.dataType) };
      L.fields.push(f);
      return json({ customField: f }, 201);
    }
    if (u.pathname === '/contacts/search') {
      const tag = (body!.filters as { value: string }[])[0]!.value;
      const all = L.contacts.filter((c) => c.tags.includes(tag));
      const after = (body!.searchAfter as [string] | undefined)?.[0];
      const start = after ? all.findIndex((c) => c.id === after) + 1 : 0;
      const page = all.slice(start, start + Number(body!.pageLimit)).map((c) => ({ ...c, searchAfter: [c.id] }));
      return json({ contacts: page, total: all.length });
    }
    if (u.pathname === '/contacts/upsert') {
      let c = L.contacts.find((x) => x.email === body!.email);
      const isNew = !c;
      if (!c) L.contacts.push((c = { id: `c-${++n}`, tags: [] }));
      Object.assign(c, body, { locationId: undefined });
      return json({ new: isNew, contact: { id: c.id, tags: c.tags } });
    }
    if (u.pathname.startsWith('/contacts/') && u.pathname.endsWith('/tags')) {
      const c = L.contacts.find((x) => x.id === u.pathname.split('/')[2])!;
      c.tags = [...new Set([...c.tags, ...(body!.tags as string[])])];
      return json({ tags: c.tags }, 201);
    }
    return json({}, 404);
  }) as Fetch;
  return { fetch, calls };
}

const noSleep = async () => {};
const opts = (locationId: string, token: string, fetch: Fetch) => ({ config: { token, locationId }, fetch, spacingMs: 0, sleep: noSleep });

describe('the tags this app writes @g9', () => {
  it('knows every tag Spring already has from this app, and the new aliases', () => {
    for (const tag of ['ai101-waitlist', 'event-expcon-2026', 'src-qr', 'src-ig', 'src-direct', 'sms-consent', 'task-sync-starter', 'ops-time-audit', 'voice-profile', 'reel-editor', 'retool', 'december-interest', 'team-size-1-10', 'team-size-11-25', 'offer-buyer', 'plan-cohort', 'pay-full', 'checkout-abandoned-cohort', 'refunded', 'membership-ended', 'payment-failed', 'event-forum-nov-2026', 'ai-lead-free-skills', 'ai-buyer-accelerator', 'ai-buyer-insiders', 'ai-buyer-agent-plan', 'ai-buyer-team-plan', 'ai-refunded', 'ai-canceled', 'lms-logged-in'])
      expect(APP_TAGS, tag).toContain(tag);
  });

  it('finds this app’s contacts by their own tags, never by a word Spring’s contacts share', () => {
    for (const shared of ['sms-consent', 'src-qr', 'src-direct', 'team-size-1-10', 'december-interest', 'pay-full', 'refunded', 'event-forum-nov-2026', 'event-expcon-2026']) expect(ANCHOR_TAGS, shared).not.toContain(shared);
    for (const ours of ['ai101-waitlist', 'voice-profile', 'offer-buyer', 'checkout-abandoned-cohort', 'ai-buyer-accelerator', 'lms-logged-in']) expect(ANCHOR_TAGS, ours).toContain(ours);
  });
});

describe('ghl:setup @g9', () => {
  it('reads and plans in a dry run, and writes nothing', async () => {
    const hl = fakeHighLevel({ 'loc-new': empty() }, { 'loc-new': 'pit-new' });
    const lines: string[] = [];
    const r = await setupLocation({ ...opts('loc-new', 'pit-new', hl.fetch), apply: false, print: (l) => lines.push(l) });
    expect(hl.calls.every((c) => c.method === 'GET')).toBe(true);
    expect(r.created).toEqual({ pipeline: true, tags: [...APP_TAGS], fields: CUSTOM_FIELDS.map((f) => f.name) });
    expect(r.env.GHL_PIPELINE_ID).toBe('(new)');
    expect(lines.join('\n')).toContain('Would create the pipeline "Amplified Impact"');
  });

  it('creates the pipeline, the tags and the fields once, and a second run creates nothing', async () => {
    const loc = empty();
    loc.tags.push({ id: 't-old', name: 'ai101-waitlist' });
    loc.fields.push({ id: 'f-old', name: 'AI Offer', dataType: 'TEXT' });
    const hl = fakeHighLevel({ 'loc-new': loc }, { 'loc-new': 'pit-new' });
    const first = await setupLocation({ ...opts('loc-new', 'pit-new', hl.fetch), apply: true });
    expect(loc.pipelines).toHaveLength(1);
    expect(loc.pipelines[0]!.name).toBe(PIPELINE_NAME);
    expect(loc.pipelines[0]!.stages.map((s) => s.name)).toEqual(['Lead', 'Free Skills', 'Checkout Started', 'Buyer', 'Refunded/Canceled']);
    const created = hl.calls.find((c) => c.method === 'POST' && c.path === '/opportunities/pipelines')!;
    expect(created.body).toEqual({ name: 'Amplified Impact', locationId: 'loc-new', stages: PIPELINE_STAGES.map((s, i) => ({ name: s.name, position: i })) });
    expect(first.created.tags).not.toContain('ai101-waitlist');
    expect(loc.tags.map((t) => t.name).sort()).toEqual([...APP_TAGS].sort());
    expect(first.created.fields).toEqual(['AI Cohort', 'AI Amount', 'AI Purchase Date', 'LMS Login']);
    expect(loc.fields.find((f) => f.name === 'AI Amount')!.dataType).toBe('MONETORY');
    expect(loc.fields.find((f) => f.name === 'AI Purchase Date')!.dataType).toBe('DATE');
    // The ids, as the Railway variables the sync reads. Canceled and Refunded share one stage.
    const stage = (name: string) => loc.pipelines[0]!.stages.find((s) => s.name === name)!.id;
    expect(first.env).toMatchObject({
      GHL_PIPELINE_ID: loc.pipelines[0]!.id,
      GHL_STAGE_LEAD: stage('Lead'),
      GHL_STAGE_FREE_SKILLS: stage('Free Skills'),
      GHL_STAGE_CHECKOUT_STARTED: stage('Checkout Started'),
      GHL_STAGE_PURCHASED: stage('Buyer'),
      GHL_STAGE_REFUNDED: stage('Refunded/Canceled'),
      GHL_STAGE_CANCELED: stage('Refunded/Canceled'),
      GHL_FIELD_OFFER: 'f-old',
    });
    expect(first.env).not.toHaveProperty('GHL_STAGE_PAYMENT_FAILED');

    const writes = hl.calls.length;
    const second = await setupLocation({ ...opts('loc-new', 'pit-new', hl.fetch), apply: true });
    expect(second.created).toEqual({ pipeline: false, tags: [], fields: [] });
    expect(hl.calls.slice(writes).every((c) => c.method === 'GET')).toBe(true);
    expect(second.env).toEqual(first.env);
  });

  it('never edits a pipeline that is already there: a missing stage is reported for Connor to add', async () => {
    const loc = empty();
    loc.pipelines.push({ id: 'p-x', name: 'amplified impact', stages: [{ id: 's1', name: 'Lead' }, { id: 's2', name: 'Buyer' }] });
    const hl = fakeHighLevel({ 'loc-new': loc }, { 'loc-new': 'pit-new' });
    const r = await setupLocation({ ...opts('loc-new', 'pit-new', hl.fetch), apply: true });
    expect(r.missingStages).toEqual(['Free Skills', 'Checkout Started', 'Refunded/Canceled']);
    expect(hl.calls.filter((c) => c.path.startsWith('/opportunities') && c.method !== 'GET')).toEqual([]);
    expect(r.env).toMatchObject({ GHL_PIPELINE_ID: 'p-x', GHL_STAGE_LEAD: 's1', GHL_STAGE_PURCHASED: 's2', GHL_STAGE_FREE_SKILLS: '(new)' });
  });

  it('stops on a refused token and says so without the token', async () => {
    const hl = fakeHighLevel({ 'loc-new': empty() }, { 'loc-new': 'pit-right' });
    const run = setupLocation({ ...opts('loc-new', 'pit-wrong-123', hl.fetch), apply: true });
    await expect(run).rejects.toBeInstanceOf(ScriptStopped);
    await expect(run).rejects.not.toThrow(/pit-wrong-123/);
  });
});

describe('ghl:copy @g9', () => {
  function spring() {
    const loc = empty();
    loc.contacts.push(
      { id: 'a', email: 'pat@example.com', firstName: 'Pat', lastName: 'Buyer', companyName: 'Northline', phone: '+18605550001', tags: ['offer-buyer', 'plan-cohort', 'pay-full', 'sms-consent', 'forum-vip', 'be-collective'] },
      { id: 'b', email: 'lead@example.com', firstName: 'Lee', tags: ['voice-profile', 'src-ig'] },
      { id: 'c', email: 'spring-only@example.com', tags: ['be-collective', 'sms-consent', 'src-qr'] },
      { id: 'd', tags: ['ai101-waitlist'] },
      { id: 'e', email: 'both@example.com', tags: ['ai101-waitlist', 'voice-profile'] },
    );
    return loc;
  }

  it('in a dry run, only searches the old location, by this app’s tags, and writes nothing anywhere', async () => {
    const hl = fakeHighLevel({ spring: spring(), 'loc-new': empty() }, { spring: 'pit-spring', 'loc-new': 'pit-new' });
    const r = await copyContacts({ from: opts('spring', 'pit-spring', hl.fetch), to: opts('loc-new', 'pit-new', hl.fetch), apply: false });
    expect(r).toMatchObject({ applied: false, contacts: 4, copied: 0, skippedNoEmail: 1 });
    expect(r.byTag).toEqual({ 'ai101-waitlist': 2, 'voice-profile': 2, 'offer-buyer': 1, 'plan-cohort': 1 });
    expect(hl.calls.every((c) => c.method === 'POST' && c.path === '/contacts/search' && c.token === 'pit-spring')).toBe(true);
    expect(hl.calls[0]!.body).toEqual({ locationId: 'spring', pageLimit: 100, filters: [{ field: 'tags', operator: 'eq', value: ANCHOR_TAGS[0] }] });
  });

  it('copies each contact once, with only this app’s tags and no phone, and never touches the old location', async () => {
    const old = spring();
    const before = JSON.stringify(old);
    const fresh = empty();
    fresh.contacts.push({ id: 'n1', email: 'pat@example.com', tags: ['already-here'] });
    const hl = fakeHighLevel({ spring: old, 'loc-new': fresh }, { spring: 'pit-spring', 'loc-new': 'pit-new' });
    const r = await copyContacts({ from: opts('spring', 'pit-spring', hl.fetch), to: opts('loc-new', 'pit-new', hl.fetch), apply: true, pageLimit: 1 });
    expect(r).toMatchObject({ applied: true, contacts: 4, copied: 3, skippedNoEmail: 1, failed: 0 });
    const pat = fresh.contacts.find((c) => c.email === 'pat@example.com')!;
    expect(pat).toMatchObject({ firstName: 'Pat', lastName: 'Buyer', companyName: 'Northline' });
    expect(pat.phone).toBeUndefined();
    expect(pat.tags.sort()).toEqual(['already-here', 'offer-buyer', 'pay-full', 'plan-cohort', 'sms-consent'].sort());
    expect(fresh.contacts.find((c) => c.email === 'lead@example.com')!.tags.sort()).toEqual(['src-ig', 'voice-profile']);
    expect(fresh.contacts.some((c) => c.email === 'spring-only@example.com')).toBe(false);
    // The old location: searched, never written. Nothing anywhere was deleted.
    expect(JSON.stringify(old)).toBe(before);
    expect(hl.calls.filter((c) => c.token === 'pit-spring').every((c) => c.path === '/contacts/search')).toBe(true);
    expect(hl.calls.some((c) => c.method === 'DELETE')).toBe(false);
    // Again: the same contacts, the same tags.
    const again = await copyContacts({ from: opts('spring', 'pit-spring', hl.fetch), to: opts('loc-new', 'pit-new', hl.fetch), apply: true });
    expect(again.copied).toBe(3);
    expect(fresh.contacts.filter((c) => c.email === 'pat@example.com')).toHaveLength(1);
  });
});

describe('the scripts’ pace @g9', () => {
  it('waits out a 429 by its Retry-After, retries a 5xx, and spaces its calls', async () => {
    const answers = [429, 503, 200];
    const seen: number[] = [];
    const slept: number[] = [];
    const inner = (async () => {
      const status = answers.shift()!;
      seen.push(status);
      return new Response('{}', { status, headers: status === 429 ? { 'retry-after': '7' } : {} });
    }) as Fetch;
    const res = await politeFetch(inner, 0, async (ms) => void slept.push(ms))('https://x.test/a');
    expect(res.status).toBe(200);
    expect(seen).toEqual([429, 503, 200]);
    expect(slept).toEqual([7000, 2000]);
  });
});
