// A fake GoHighLevel for the sync's tests (D-134): it keeps contacts by email, each contact's tags as
// a union, its custom fields and one opportunity per contact, the way the real one does. Used by
// ghl-sync.test.ts and offer.test.ts's per-offer runs. Nothing reaches the network.
import type { Fetch } from '../src/integrations/ghl';

/**
 * A fake GHL that keeps state like the real one: contacts by email, each contact's tags as a union,
 * its custom fields, and one opportunity per contact. `fail` answers a step with a status instead.
 */
export function fakeCrm(fail: Partial<Record<'upsert' | 'fields' | 'search' | 'create' | 'update', number>> = {}) {
  const calls: { method: string; path: string; body: Record<string, unknown> | undefined }[] = [];
  const contacts = new Map<string, string>();
  const tags = new Map<string, Set<string>>();
  const fields = new Map<string, Record<string, unknown>>();
  const opps = new Map<string, Record<string, unknown>>();
  let n = 0;
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  const refuse = (step: keyof typeof fail) => (fail[step] ? json({ message: 'refused pat@example.com' }, fail[step]) : null);
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const method = String(init?.method ?? 'GET');
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
    calls.push({ method, path: u.pathname + u.search, body });
    if (u.pathname === '/contacts/upsert') {
      const r = refuse('upsert');
      if (r) return r;
      const email = String(body!.email);
      const isNew = !contacts.has(email);
      if (isNew) contacts.set(email, `c-${++n}`);
      const id = contacts.get(email)!;
      return json({ new: isNew, contact: { id, tags: [...(tags.get(id) ?? [])] } });
    }
    if (u.pathname.endsWith('/tags')) {
      const id = u.pathname.split('/')[2]!;
      tags.set(id, new Set([...(tags.get(id) ?? []), ...((body!.tags as string[]) ?? [])]));
      return json({ tags: [...tags.get(id)!] }, 201);
    }
    if (method === 'PUT' && u.pathname.startsWith('/contacts/')) {
      const r = refuse('fields');
      if (r) return r;
      const id = u.pathname.split('/')[2]!;
      const items = body!.customFields as { id: string; field_value: unknown }[];
      fields.set(id, { ...(fields.get(id) ?? {}), ...Object.fromEntries(items.map((i) => [i.id, i.field_value])) });
      return json({ succeeded: true });
    }
    if (u.pathname === '/opportunities/search') {
      const r = refuse('search');
      if (r) return r;
      const o = opps.get(u.searchParams.get('contact_id')!);
      return json({ opportunities: o ? [o] : [] });
    }
    if (method === 'POST' && u.pathname === '/opportunities/') {
      const r = refuse('create');
      if (r) return r;
      const o = { id: `o-${++n}`, ...body };
      opps.set(String(body!.contactId), o);
      return json({ opportunity: o }, 201);
    }
    if (method === 'PUT' && u.pathname.startsWith('/opportunities/')) {
      const r = refuse('update');
      if (r) return r;
      const o = [...opps.values()].find((x) => x.id === u.pathname.split('/')[2])!;
      Object.assign(o, body);
      return json({ opportunity: o });
    }
    return json({}, 404);
  }) as Fetch;
  const of = (email: string) => contacts.get(email)!;
  return { fetch, calls, tagsOf: (email: string) => [...(tags.get(of(email)) ?? [])], fieldsOf: (email: string) => fields.get(of(email)) ?? {}, oppOf: (email: string) => opps.get(of(email)) };
}

