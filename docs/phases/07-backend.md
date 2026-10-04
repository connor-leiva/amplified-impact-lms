# Phase 07: Backend: Postgres, Auth, API and the HTTP Repository

**Goal.** Replace the fixture data source with a real backend without changing a single screen:
- a Postgres schema that mirrors `Db`
- magic-link authentication
- role-scoped snapshots
- one endpoint per mutation, enforced by the same `@ai/core` functions
- an `HttpRepository` that satisfies the `LmsRepository` interface

**Ships when:** `pnpm gate 7` is green. That requires the API oracle tests, the authorization matrix, the portal parity scenarios re-run in **http mode**, and the sign-in tests.

---

## 7.1 Stack

- Fastify 5, Drizzle ORM with `postgres` (porsager), and Zod for request validation.
- `@fastify/cookie` with signed, httpOnly session cookies.
- Postgres 16 on Railway (`DATABASE_URL`).

```bash
pnpm --filter @ai/api add drizzle-orm postgres @fastify/cookie @fastify/rate-limit @fastify/helmet zod
pnpm --filter @ai/api add -D drizzle-kit
```

## 7.2 Schema (`apps/api/src/db/schema.ts`)

Columns map 1:1 to `@ai/core` types. JSONB holds nested arrays the UI treats as a unit.
```ts
import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey, pgEnum, bigint } from 'drizzle-orm/pg-core';

export const tier = pgEnum('tier', ['agent', 'team']);
export const moduleStatus = pgEnum('module_status', ['draft', 'scheduled', 'published']);
const ts = (n: string) => bigint(n, { mode: 'number' });           // epoch ms, same as core

export const users = pgTable('users', {
  id: text('id').primaryKey(), email: text('email').notNull().unique(), name: text('name').notNull(),
  kind: text('kind', { enum: ['learner', 'staff'] }).notNull(),
  // learner fields
  tier: tier('tier'), role: text('role'), teamId: text('team_id'), cohortId: text('cohort_id'),
  joined: ts('joined'), last: ts('last'), status: text('status', { enum: ['active', 'invited'] }),
  reminded: ts('reminded'), nudged: ts('nudged'),
  // staff fields
  staffRole: text('staff_role', { enum: ['Owner', 'Admin', 'Instructor', 'Content Editor', 'Support'] }),
  prefs: jsonb('prefs').$type<{ tz?: string | null; theme?: 'light' | 'dark' }>().default({}),
});
export const teams = pgTable('teams', { id: text('id').primaryKey(), name: text('name').notNull(), ownerId: text('owner_id').notNull(), seats: integer('seats').notNull().default(7) });
export const cohorts = pgTable('cohorts', { id: text('id').primaryKey(), name: text('name').notNull(), start: ts('start').notNull(), end: ts('end').notNull(), weeks: integer('weeks'), status: text('status').notNull(), capacity: integer('capacity').notNull(), cadence: text('cadence').notNull() });
export const sessions = pgTable('sessions', { id: text('id').primaryKey(), cohortId: text('cohort_id').notNull(), n: integer('n').notNull(), title: text('title').notNull(), start: ts('start').notNull(), mins: integer('mins').notNull(), zoom: text('zoom').notNull(), live: boolean('live').notNull().default(false), attended: integer('attended'), replay: text('replay'), views: integer('views').notNull().default(0), movedFrom: ts('moved_from') });
export const modules = pgTable('modules', {
  id: text('id').primaryKey(), name: text('name').notNull(), short: text('short').notNull(), tier: tier('tier').notNull(), icon: text('icon').notNull(),
  forWho: text('for_who').notNull(), headline: text('headline').notNull(), outcome: text('outcome').notNull(), outputs: jsonb('outputs').$type<string[]>().notNull(),
  platform: text('platform').notNull(), runLabel: text('run_label').notNull(), build: integer('build').notNull(), session: integer('session'),
  status: moduleStatus('status').notNull(), opens: ts('opens'), order: integer('order').notNull(), dur: integer('dur').notNull().default(0),
  instructor: text('instructor').notNull(), transcript: jsonb('transcript').$type<[number, string][]>().notNull(), notes: text('notes').notNull(),
  prompt: text('prompt').notNull(), files: jsonb('files').notNull(), resources: jsonb('resources').notNull(), checklist: jsonb('checklist').notNull(), runDemo: jsonb('run_demo'),
});
export const progress = pgTable('progress', {
  userId: text('user_id').notNull(), moduleId: text('module_id').notNull(),
  steps: jsonb('steps').$type<string[]>().notNull(), builtAt: ts('built_at'), deployedAt: ts('deployed_at'), runtime: text('runtime'), issue: text('issue'), lastRun: jsonb('last_run'),
}, (t) => [primaryKey({ columns: [t.userId, t.moduleId] })]);
export const resources = pgTable('resources', { id: text('id').primaryKey(), title: text('title').notNull(), desc: text('desc').notNull(), cat: text('cat').notNull(), type: text('type').notNull(), tier: tier('tier').notNull(), size: text('size').notNull(), dl: integer('dl').notNull().default(0), updated: ts('updated').notNull(), exec: boolean('exec').notNull(), status: text('status').notNull(), storageKey: text('storage_key') });
export const announcements = pgTable('announcements', { id: text('id').primaryKey(), sessionId: text('session_id'), title: text('title').notNull(), body: text('body').notNull(), severity: text('severity').notNull(), action: text('action'), actionLabel: text('action_label').notNull(), audience: text('audience').notNull(), channels: jsonb('channels').$type<string[]>().notNull(), status: text('status').notNull(), at: ts('at').notNull(), opens: integer('opens_pct') });
export const dismissals = pgTable('dismissals', { userId: text('user_id').notNull(), announcementId: text('announcement_id').notNull() }, (t) => [primaryKey({ columns: [t.userId, t.announcementId] })]);
export const reminders = pgTable('reminders', { id: text('id').primaryKey(), label: text('label').notNull(), channel: text('channel').notNull(), on: boolean('on').notNull() });
export const tiers = pgTable('tiers', { id: tier('id').primaryKey(), name: text('name').notNull(), price: integer('price').notNull(), seats: integer('seats').notNull(), blurb: text('blurb').notNull(), features: jsonb('features').$type<string[]>().notNull() });
export const requests = pgTable('upgrade_requests', { id: text('id').primaryKey(), userId: text('user_id'), name: text('name').notNull(), email: text('email').notNull(), source: text('source').notNull(), at: ts('at').notNull(), status: text('status').notNull() });
export const permissions = pgTable('permissions', { role: text('role').notNull(), perm: text('perm').notNull(), allowed: boolean('allowed').notNull() }, (t) => [primaryKey({ columns: [t.role, t.perm] })]);
export const activity = pgTable('activity', { id: text('id').primaryKey(), t: ts('t').notNull(), who: text('who').notNull(), what: text('what').notNull(), tone: text('tone').notNull() });
export const authTokens = pgTable('auth_tokens', { tokenHash: text('token_hash').primaryKey(), email: text('email').notNull(), purpose: text('purpose', { enum: ['sign_in', 'invite'] }).notNull(), expiresAt: timestamp('expires_at').notNull(), usedAt: timestamp('used_at') });
export const authSessions = pgTable('auth_sessions', { id: text('id').primaryKey(), userId: text('user_id').notNull(), expiresAt: timestamp('expires_at').notNull(), impersonating: text('impersonating') });
```

`apps/api/package.json` scripts:
```json
{ "db:generate": "drizzle-kit generate", "db:migrate": "drizzle-kit migrate", "db:seed": "tsx src/db/seed.ts" }
```

## 7.3 Snapshot ⇄ rows (`apps/api/src/db/codec.ts`)

Write `loadDb(tx): Promise<Db>` (all rows → `Db`, with `base: ZERO_BASE` and `dismissed` rebuilt as `{ "userId:annId": 1 }`) and `persistDiff(tx, before: Db, after: Db)`, which upserts and deletes only the rows that changed.

**Every mutation endpoint follows this pattern**, so the API cannot drift from core:
```ts
// apps/api/src/routes/mutate.ts
import * as M from '@ai/core/mutations';
import { MutationError } from '@ai/core';

app.post('/api/mutate/:name', { preHandler: requireSession }, async (req, reply) => {
  const name = req.params.name as keyof typeof M;
  if (!(name in M)) return reply.code(404).send({ error: 'Unknown mutation' });
  const args = schemas[name].parse(req.body);                 // zod schema per mutation
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(42)`);  // serialize writes (low volume; revisit at scale)
    const before = await loadDb(tx);
    try {
      const out = M[name](before, req.actor, args as never, { now: clock.now(), id: newId });
      if (out.error) return reply.code(422).send({ error: out.error });
      await persistDiff(tx, before, out.db);
      await dispatchEffects(out.effects ?? []);                // emails etc. (phase 08)
      return { toast: out.toast, effects: (out.effects ?? []).filter((e) => e.type === 'confetti') };
    } catch (e) {
      if (e instanceof MutationError) return reply.code(e.code === 'forbidden' ? 403 : e.code === 'not_found' ? 404 : 422).send({ error: e.message });
      throw e;
    }
  });
});
```

## 7.4 Snapshot scoping (`GET /api/snapshot`)

| Viewer | Receives |
|---|---|
| Learner | All published/scheduled `modules` (`prompt`, `files`, `transcript` and `runDemo` blanked for modules they cannot access), their cohort's `sessions` (`zoom` blanked, see phase 08), their own user and progress, `teams`/`users` for **their team only** (other members' `email` visible only to Team Owner and Operations Lead), published `resources` (storage keys removed), announcements for their audience, `tiers`, **their own** `requests`, `dismissed` for themselves, `staff: []`, `perms: {}`, `activity: []`, `base: ZERO_BASE` |
| Staff with `viewLearners` | Everything except auth tables. Staff without `viewLearners` get `users: []`. |

Implement this as `scopeSnapshot(db, actor): Db`, a pure function in `@ai/core/scope.ts`, so it can be unit-tested.

## 7.5 Auth (magic link)

Endpoints:
- `POST /api/auth/request {email}`. Always returns `200 {ok:true}`, so it does not reveal whether an account exists. If a user exists, it emails a sign-in link `${APP_URL}/sign-in?token=…` that is valid for 15 minutes and stores `sha256(token)`. Rate limit: 5 per hour per email and IP.
- `POST /api/auth/verify {token}`. Marks the token used, creates `auth_sessions` (30 days, rolling), and sets cookie `ai_sid` (httpOnly, Secure, SameSite=Lax, signed).
- `POST /api/auth/sign-out`. Deletes the session.
- `GET /api/me`. Returns `{ viewer: { actor, role }, prefs }`, where role is `agent | owner | admin` for UI routing. Team members who are not the owner get `role: 'learner'` and see Team Hub read-only.
- `PATCH /api/me/prefs {tz?, theme?}`.
- Invites (`inviteMember`, `inviteStaff`) create `purpose:'invite'` tokens valid for 7 days. `/invite/:token` verifies the token, sets `status: 'active'` and `joined`, and signs the user in.

Login is invite-only. There is no public sign-up, because the business sells seats through sales calls.

### Sign-in screens (net-new; no reference, so build to this spec)

Reuse the existing patterns exactly:
- A centered card 400 px wide on `--bg-canvas`, with padding 32, radius 16, `--shadow-card` and a border.
- `BrandSlot` mark and wordmark at the top (gap 10), then the H1 `Sign In` 26/32.
- Sub 14 secondary: `We’ll email you a secure sign-in link.`
- `Work Email` input (canonical), then the full-width 40 px primary button `Email Me a Sign-In Link`.
- Success state: H1 `Check Your Email` and the sub `We sent a link to {email}. It expires in 15 minutes.`, with a link button `Use a Different Email`.
- Error copy:
  - `Enter a valid email address.`
  - `That link has expired. Request a new one.`
  - `That link was already used. Request a new one.`
- `/invite/:token` shows `Joining {Team or Amplified Impact}…` with a spinner, then redirects.
- Dark mode and focus rings follow the tokens.

Record these screens in DECISIONS.md as approved net-new UI.

## 7.6 HttpRepository (`apps/web/src/data/http.ts`)

```ts
export function createHttpRepository(): LmsRepository {
  const listeners = new Set<() => void>();
  const es = new EventSource('/api/events');                  // server emits "changed" after each committed mutation
  es.addEventListener('changed', () => listeners.forEach((f) => f()));
  const j = async (r: Response) => { if (r.status === 401) location.assign('/sign-in'); const b = await r.json(); if (!r.ok && r.status !== 422) throw new Error(b.error); return b; };
  return {
    source: 'http',
    viewer: () => fetch('/api/me', { credentials: 'include' }).then(j).then((b) => b.viewer),
    snapshot: () => fetch('/api/snapshot', { credentials: 'include' }).then(j),
    run: (name, args) => fetch(`/api/mutate/${name}`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(args) }).then(j),
    subscribe: (f) => { listeners.add(f); return () => listeners.delete(f); },
  };
}
```
`/api/events` is a Server-Sent Events stream. Each process keeps the set of connected clients and broadcasts `changed` (no payload) after each commit, and clients refetch their scoped snapshot. With more than one replica, use Postgres `LISTEN/NOTIFY` to fan out.

## 7.7 Seed and the test clock

- `apps/api/src/db/seed.ts` loads `seedForDatabase('live')` into an empty database, inside a transaction. It refuses to run if `NODE_ENV === 'production'` and any `users` rows exist.
- The test clock: `clock.now()` returns `Date.parse(process.env.FIXED_NOW)` when `NODE_ENV === 'test'` and `FIXED_NOW` is set; otherwise `Date.now()`. Enable a test-only route `POST /api/test/session {userId}` **only** when `NODE_ENV === 'test'`, so tests can sign in as a persona.

---

## Gate 7: Ship Checklist

**API oracle tests** (`apps/api/test/oracle.test.ts`, Vitest against a real Postgres from the CI `services:` block). For every mutation in the phase 02 catalog:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import * as M from '@ai/core/mutations';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import { resetDatabase, loadDb } from './helpers';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');
const cases = [
  { name: 'toggleStep', as: 'u_jamie', args: { moduleId: 'sales', stepId: 'c4' } },
  { name: 'requestUpgrade', as: 'u_jamie', args: { source: 'Team tier page' } },
  { name: 'inviteMember', as: 'u_alex', args: { email: 'new@northlinerealty.com', role: 'Sales Agent' } },
  { name: 'publishModule', as: 'st1', args: { id: 'operations' } },
  { name: 'goLive', as: 'st1', args: { sessionId: 'dec26-s3' } },
  // …one row per catalog entry (all 37)
] as const;

describe('API ⇔ core oracle @g7', () => {
  beforeEach(async () => { process.env.FIXED_NOW = new Date(NOW).toISOString(); await resetDatabase(seedForDatabase('live')); });
  for (const c of cases) it(c.name, async () => {
    const app = await build(); const cookie = await app.signInAs(c.as);
    const res = await app.inject({ method: 'POST', url: `/api/mutate/${c.name}`, headers: { cookie }, payload: c.args });
    expect(res.statusCode).toBe(200);
    const actor = c.as.startsWith('st') ? { kind: 'staff', staffId: c.as } : { kind: 'learner', userId: c.as };
    const expected = M[c.name](seedForDatabase('live'), actor as never, c.args as never, { now: NOW, id: deterministicIds() }).db;
    expect(normalize(await loadDb())).toEqual(normalize(expected));
  });
});
```
`normalize` sorts arrays by id and nothing else. Ids are deterministic because the API uses the same `deterministicIds()` generator when `NODE_ENV === 'test'`.

**Authorization matrix** (`apps/api/test/authz.test.ts`). For every staff mutation × every `STAFF_ROLES` entry, the HTTP status is 200 if `perms[role][perm]`, else 403. Every learner mutation called by another learner's session returns 403. An unauthenticated call to any `/api/*` route except `/api/health`, `/api/auth/*` and `/api/events` returns 401.

**Snapshot scoping**:
- Jamie's snapshot has no `prompt` for `meetings`, `finance` or `operations`; no `staff`; no other teams' users; and no `zoom` URLs.
- Alex's snapshot includes the Northline members' emails. Sarah's (Sales Agent) snapshot does not.

**Parity in http mode.** Build the web app with `VITE_DATA_SOURCE=http`, run the API with `NODE_ENV=test FIXED_NOW=…` against a database seeded from `seed('live')` **including** the `base` aggregates (test env only, via `SEED_WITH_BASELINE=1`), and sign in each persona through `/api/test/session`. Then:
```bash
APP_URL=http://localhost:3000 GATE=5 pnpm compliance --grep "@g5"
```
Every portal scenario must pass **with the same goldens**. This proves the backend is invisible to the user. Admin scenarios use fixture parity plus the oracle tests above.

**Sign-in e2e:**
- Request a link for an unknown email: the response is still 200.
- Request a link for `jamie@ortizhomes.com`: the test mailbox (`/api/test/outbox`) receives one message, verifying it lands on `/`, and reusing the token shows `That link was already used. Request a new one.`
- The axe check on `/sign-in` passes.

**CI.** Add an `api` job to `ci.yml` with `services: postgres: image: postgres:16` and run `pnpm --filter @ai/api db:migrate && pnpm --filter @ai/api test`. Then add `api` to the required checks.
