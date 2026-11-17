// Console search (D-158, spec § 7.5): users, workspaces, orders and skills, five of each at most.
//
//   - An id, and a Stripe id (customer, subscription, payment intent, Checkout Session), matches
//     exactly.
//   - An email matches anywhere in it, by ILIKE; so do a person's, a team's and a skill's names, as the
//     prototype's search finds people by name.
//   - Every value is a bound parameter. `containsPattern` makes `%`, `_` and `\` in the words plain
//     characters, so a search for `a_b` finds "a_b", not "axb".
//
// A group the viewer's role cannot read is left empty (every role with `console.view` reads all four
// today, but the rule is written per group, so a later capability change cannot leak one).

import { sql } from 'drizzle-orm';
import { CONSOLE_PLAN_LABELS, ORDER_STATUS_LABELS, SEARCH_GROUP_MAX, SKILL_SET_LABELS, containsPattern, consoleCan, isPlanKind, userPath, workspacePath } from '@ai/core';
import type { SearchHit, SearchResults } from '@ai/core';
import type { OrderStatus } from '@ai/core/offer';
import type { Database } from '../db/client';

type Rows<T> = T[];

export async function searchConsole(db: Database, q: string, role: string | null): Promise<SearchResults> {
  const p = containsPattern(q);
  const out: SearchResults = { users: [], workspaces: [], orders: [], skills: [] };

  if (consoleCan(role, 'users.read')) {
    const rows = (await db.execute(sql`
      select u.id, u.name, u.email from users u
      where u.id = ${q} or u.email ilike ${p} or u.name ilike ${p}
      order by (u.id = ${q}) desc, lower(u.name), u.id
      limit ${SEARCH_GROUP_MAX}
    `)) as unknown as Rows<{ id: string; name: string; email: string }>;
    out.users = rows.map((r): SearchHit => ({ id: r.id, label: r.name, detail: r.email, href: userPath(r.id) }));
  }

  if (consoleCan(role, 'workspaces.read')) {
    const rows = (await db.execute(sql`
      select t.id, t.name, o.email as owner_email from teams t
      left join users o on o.id = t.owner_id
      where t.id = ${q} or t.name ilike ${p} or o.email ilike ${p}
        or exists (select 1 from accounts a where a.team_id = t.id and (a.id = ${q} or a.stripe_customer_id = ${q} or a.owner_email ilike ${p}))
      order by (t.id = ${q}) desc, lower(t.name), t.id
      limit ${SEARCH_GROUP_MAX}
    `)) as unknown as Rows<{ id: string; name: string; owner_email: string | null }>;
    out.workspaces = rows.map((r): SearchHit => ({ id: r.id, label: r.name, detail: r.owner_email ?? '', href: workspacePath(r.id) }));
  }

  if (consoleCan(role, 'billing.read')) {
    const rows = (await db.execute(sql`
      select o.id, o.plan, o.status, o.email, a.team_id,
        (select u.id from users u where lower(u.email) = lower(o.email) limit 1) as user_id
      from orders o left join accounts a on a.id = o.account_id
      where o.id = ${q} or o.stripe_session_id = ${q} or o.stripe_customer_id = ${q}
        or o.stripe_payment_intent_id = ${q} or o.stripe_subscription_id = ${q} or o.email ilike ${p}
      order by (o.id = ${q}) desc, o.created_at desc, o.id
      limit ${SEARCH_GROUP_MAX}
    `)) as unknown as Rows<{ id: string; plan: string; status: string; email: string | null; team_id: string | null; user_id: string | null }>;
    out.orders = rows.map((r): SearchHit => {
      const plan = isPlanKind(r.plan) ? CONSOLE_PLAN_LABELS[r.plan] : r.plan;
      const status = ORDER_STATUS_LABELS[r.status as OrderStatus] ?? r.status;
      // An order opens its workspace, or the person who bought it; Billing's own order view is PR 4.
      const href = r.team_id ? workspacePath(r.team_id) : r.user_id ? userPath(r.user_id) : null;
      return { id: r.id, label: r.id, detail: `${plan}, ${status}`, href };
    });
  }

  if (consoleCan(role, 'console.view')) {
    const rows = (await db.execute(sql`
      select s.id, s.title, s.sets from skills s
      where s.id = ${q} or s.title ilike ${p}
      order by (s.id = ${q}) desc, lower(s.title), s.id
      limit ${SEARCH_GROUP_MAX}
    `)) as unknown as Rows<{ id: string; title: string; sets: string }>;
    // No Console screen lists skills until Build (PR 10), so a skill opens nowhere yet.
    out.skills = rows.map((r): SearchHit => ({ id: r.id, label: r.title, detail: r.sets === 'both' ? `${SKILL_SET_LABELS.owner_ops}, ${SKILL_SET_LABELS.agent}` : (SKILL_SET_LABELS[r.sets as 'owner_ops' | 'agent'] ?? r.sets), href: null }));
  }

  return out;
}
