// Staff commands for the offer (D-078, D-079). Run against the database `DATABASE_URL` names.
//
//   pnpm --filter @ai/api provision --order <id> [--invite-now]
//   pnpm --filter @ai/api comp --email <owner email> --name <owner name> --team <team name> [--cohort <id>] [--invite-now]
//       Comps a 2-seat Accelerator team into a cohort (default December 2026). No Stripe charge.
//       Re-runs provisioning for one paid order: finds or creates the account, the plan and the owner,
//       and sends the owner's invite (held until INVITES_FROM unless --invite-now). Run it twice and it
//       changes nothing the second time. Prints ids, never the buyer's details.
//
//   pnpm --filter @ai/api skills [--upload]
//       Loads the skill catalog (billing/skills-catalog.ts) and the Grok Bot templates (D-100), each from
//       its own list (billing/library-rows.ts), into the `skills` table: sets, free or paid, release dates
//       and bucket keys. With --upload, also puts each ZIP from apps/web/public/downloads into the bucket
//       under skills/<id>/, which needs the S3_* settings. Writes only the rows that differ, and checks
//       every ZIP before uploading any (billing/library-sync.ts), so it is safe to repeat: a second run
//       changes 0 rows. The pre-deploy command runs it on every deploy (docs/LAUNCH.md § 8, step 3).

import { getDb, close } from '../db/client';
import { clock } from '../lib/clock';
import { putObject } from '../storage';
import { readOfferConfig } from './config';
import { compAcceleratorTeam } from './comp';
import { provisionOrder } from './provision';
import { audit } from '../console/audit';
import { LIBRARY_ROWS } from './library-rows';
import { syncSkillRows, uploadSkillFiles } from './library-sync';

const log = {
  info: (o: Record<string, unknown>, m: string) => console.log(m, JSON.stringify(o)),
  warn: (o: Record<string, unknown>, m: string) => console.warn(m, JSON.stringify(o)),
  error: (o: Record<string, unknown>, m: string) => console.error(m, JSON.stringify(o)),
};

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

async function provision(): Promise<number> {
  const order = arg('--order');
  if (!order) {
    console.error('Usage: pnpm --filter @ai/api provision --order <order id> [--invite-now]');
    return 2;
  }
  const config = readOfferConfig();
  const out = await provisionOrder(order, {
    log,
    now: clock.now(),
    invitesFrom: config.invitesFrom,
    invitesEnabled: config.invitesEnabled,
    inviteNow: process.argv.includes('--invite-now'),
  });
  console.log(JSON.stringify(out, null, 2));
  return out.ok ? 0 : 1;
}

async function comp(): Promise<number> {
  const email = arg('--email');
  const name = arg('--name');
  const team = arg('--team');
  const cohort = arg('--cohort');
  if (!email || !name || !team) {
    console.error('Usage: pnpm --filter @ai/api comp --email <owner email> --name <owner name> --team <team name> [--cohort <id>]');
    return 2;
  }
  const config = readOfferConfig();
  const out = await compAcceleratorTeam(
    { email, name, teamName: team, cohortId: cohort },
    { log, now: clock.now(), invitesFrom: config.invitesFrom, invitesEnabled: config.invitesEnabled, inviteNow: process.argv.includes('--invite-now') },
  );
  if (out.ok) {
    await audit(null, {
      action: 'billing.comp',
      outcome: 'ok',
      actor: { source: 'system' },
      target: { type: 'order', id: out.orderId, label: team },
      after: { cohortId: out.cohortId, teamId: out.teamId, invite: out.invite, already: out.already, seats: 2, origin: 'comp', via: 'cli' },
    });
  }
  console.log(JSON.stringify(out.ok ? { ok: true, already: out.already, orderId: out.orderId, teamId: out.teamId, cohortId: out.cohortId, invite: out.invite } : { ok: false, reason: out.reason }, null, 2));
  return out.ok ? 0 : 1;
}

async function loadSkills(): Promise<number> {
  // Files first, so no row names a ZIP the bucket does not have; all checked before any goes up.
  if (process.argv.includes('--upload')) {
    const { missing, uploaded } = await uploadSkillFiles(putObject);
    for (const m of missing) console.error(`missing ${m.name}; build it with ${m.build}`);
    if (missing.length) return 1;
    console.log(`${uploaded} files uploaded (the same bytes under the same keys on a repeat run).`);
  }
  const changed = await syncSkillRows(getDb());
  for (const id of changed) {
    const s = LIBRARY_ROWS.find((r) => r.id === id)!;
    console.log(`${id}: ${s.sets}${s.free ? ', free' : ''}`);
  }
  console.log(`${changed.length} of ${LIBRARY_ROWS.length} skill rows changed.`);
  return 0;
}

const command = process.argv[2];
let code = 2;
try {
  if (command === 'provision') code = await provision();
  else if (command === 'comp') code = await comp();
  else if (command === 'skills') code = await loadSkills();
  else console.error('Commands: provision --order <id> [--invite-now] | comp --email <email> --name <name> --team <team> [--cohort <id>] | skills [--upload]');
} finally {
  await close();
}
process.exit(code);
