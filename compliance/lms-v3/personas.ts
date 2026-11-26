// LMS v3 rollout (Phase 11, D-257): one signed-in learner of every kind v3 now draws for, on a DEVELOPMENT database
// only, for the screenshots and the e2e of "every learner type inside the v3 frame". Run from apps/api:
//
//   LMS_V3_PERSONA_PASSWORD=… pnpm --filter @ai/api exec tsx ../../compliance/lms-v3/personas.ts
//
// Each persona is made the way production makes that kind of learner, by production's own functions, and nothing
// more: a paid order handed to `provisionOrder` (the Stripe webhook's call) for a plan, with the invite held; the
// group member's insert (`createGroupMember`) and a listed address for Utah Life; a $37 skill purchase row for the
// buyer. Then the set-password flow's own ending (`finishPasswordSet`) and the invite marked sent. No Stripe call,
// no email, no GoHighLevel row (nothing here reaches the jobs that write one: the orders carry no Stripe id and the
// local API runs with GoHighLevel unconfigured). Made-up people at `persona.example.test`, never a real buyer.
//
// It refuses any database whose name doesn't say it is a local one (the rule `prepare.ts` and `reset.sql` use), and
// it is safe to run twice: an address that already has a user is left as it is.
import { getDb, getSql } from '../../apps/api/src/db/client';
import type { Database } from '../../apps/api/src/db/client';
import { accessGroupMembers, orders, skillPurchases } from '../../apps/api/src/db/schema';
import { userByEmail } from '../../apps/api/src/auth';
import { createGroupMember, recordVerified } from '../../apps/api/src/billing/access-groups';
import { DEFAULT_INVITES_FROM } from '../../apps/api/src/billing/catalog';
import { provisionOrder } from '../../apps/api/src/billing/provision';
import { finishPasswordSet } from '../../apps/api/src/routes/password';
import { randomIds } from '../../apps/api/src/lib/clock';

/** Every learner kind the rollout covers besides the cohort's own test learner (D-200, D-202). */
export const PERSONAS = [
  { key: 'insiders', name: 'Riley Insiders', kind: 'plan', plan: 'membership', option: 'monthly' },
  { key: 'insiders-agent', name: 'Jordan Agent Insiders', kind: 'plan', plan: 'insiders_agent', option: 'monthly' },
  { key: 'agent-plan', name: 'Casey Agent Plan', kind: 'plan', plan: 'agent_plan', option: 'monthly' },
  { key: 'team-plan', name: 'Morgan Team Plan', kind: 'plan', plan: 'agents', option: 'upto15' },
  { key: 'utah-life', name: 'Taylor Utah Life', kind: 'group', group: 'utah-life' },
  { key: 'skill-buyer', name: 'Avery Skill Buyer', kind: 'skill', skill: 'speed-to-lead-reply' },
] as const;

export type PersonaKey = (typeof PERSONAS)[number]['key'];
export const personaEmail = (key: PersonaKey): string => `${key}@persona.example.test`;

const db = getDb();
const sql = getSql();

async function guard(): Promise<void> {
  const [{ db: name }] = await sql<{ db: string }[]>`select current_database() as db`;
  if (!/^ai_lms_(v3|dev)/.test(name)) throw new Error(`Refusing to touch ${name}: this script is for a local development database.`);
}

const quiet = { info: () => {}, warn: (_o: unknown, m: string) => console.warn(m), error: (_o: unknown, m: string) => console.error(m) };

async function persona(p: (typeof PERSONAS)[number], password: string, now: number): Promise<string> {
  const email = personaEmail(p.key);
  if (await userByEmail(db, email)) return `${p.key}: already there, left as it is.`;
  if (p.kind === 'plan') {
    const orderId = randomIds()('ord');
    await db.insert(orders).values({ id: orderId, plan: p.plan, option: p.option, origin: 'payment_link', status: 'paid', name: p.name, email, paymentsMade: 1, paidAt: now, createdAt: now });
    const out = await provisionOrder(orderId, { db, log: quiet, now, invitesFrom: Date.parse(DEFAULT_INVITES_FROM), invitesEnabled: false });
    if (!out.ok) throw new Error(`${p.key}: provisioning refused (${out.reason}).`);
  } else {
    await db.transaction(async (raw) => {
      const tx = raw as unknown as Database;
      if (p.kind === 'group') await tx.insert(accessGroupMembers).values({ groupId: p.group, email, name: p.name, addedAt: now }).onConflictDoNothing();
      const userId = await createGroupMember(tx, email, now, p.name);
      if (!userId) throw new Error(`${p.key}: the member insert was refused.`);
      await recordVerified(tx, email, now);
      if (p.kind === 'skill')
        await tx.insert(skillPurchases).values({ id: randomIds()('sp'), userId, skillId: p.skill, stripeSessionId: `cs_persona_${p.key}`, purchasedAt: now });
    });
  }
  const user = await userByEmail(db, email);
  if (!user) throw new Error(`${p.key}: the account was not written.`);
  await finishPasswordSet(db, user, password, now, null);
  await sql`update accounts set invite_sent_at = ${now} where owner_email = ${email} and invite_sent_at is null`;
  await sql`update users set name = ${p.name} where id = ${user.id}`;
  return `${p.key}: created (${email}).`;
}

async function main(): Promise<void> {
  const password = process.env.LMS_V3_PERSONA_PASSWORD;
  if (!password) throw new Error('Set LMS_V3_PERSONA_PASSWORD to the password the personas sign in with.');
  await guard();
  const now = Date.now();
  for (const p of PERSONAS) console.log(await persona(p, password, now));
  process.exit(0);
}

void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
