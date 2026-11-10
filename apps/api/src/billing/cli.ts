// Staff commands for the offer (D-077, D-078). Run against the database `DATABASE_URL` names.
//
//   pnpm --filter @ai/api provision --order <id> [--invite-now]
//       Re-runs provisioning for one paid order: finds or creates the account, the plan and the owner,
//       and sends the owner's invite (held until INVITES_FROM unless --invite-now). Run it twice and it
//       changes nothing the second time. Prints ids, never the buyer's details.
//
//   pnpm --filter @ai/api skills [--upload]
//       Loads the skill catalog (billing/skills-catalog.ts) into the `skills` table: sets, free or paid,
//       release dates and bucket keys. With --upload, also puts each ZIP from apps/web/public/downloads
//       into the bucket under skills/<id>/, which needs the S3_* settings.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDb, close } from '../db/client';
import { skills } from '../db/schema';
import { clock } from '../lib/clock';
import { putObject, skillFileKey } from '../storage';
import { readOfferConfig } from './config';
import { provisionOrder } from './provision';
import { LAUNCH_RELEASE, SKILL_CATALOG, isFreeSkill } from './skills-catalog';

const DOWNLOADS = fileURLToPath(new URL('../../../web/public/downloads/', import.meta.url));

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
    inviteNow: process.argv.includes('--invite-now'),
  });
  console.log(JSON.stringify(out, null, 2));
  return out.ok ? 0 : 1;
}

async function loadSkills(): Promise<number> {
  const upload = process.argv.includes('--upload');
  const db = getDb();
  for (const s of SKILL_CATALOG) {
    const files: Record<string, string> = {};
    for (const [kind, name] of Object.entries(s.files)) {
      if (!name) continue;
      files[kind] = name;
      if (upload) {
        const path = `${DOWNLOADS}${name}`;
        if (!existsSync(path)) {
          console.error(`missing ${name}; build it with node scripts/skills.mjs build`);
          return 1;
        }
        await putObject(skillFileKey(s.id, name), readFileSync(path), 'application/zip');
      }
    }
    const row = { title: s.title, summary: s.summary, sets: s.sets, free: isFreeSkill(s.id), releasedAt: LAUNCH_RELEASE, files, status: 'published' };
    await db.insert(skills).values({ id: s.id, ...row }).onConflictDoUpdate({ target: skills.id, set: row });
    console.log(`${s.id}: ${s.sets}${isFreeSkill(s.id) ? ', free' : ''}${upload ? ', uploaded' : ''}`);
  }
  return 0;
}

const command = process.argv[2];
let code = 2;
try {
  if (command === 'provision') code = await provision();
  else if (command === 'skills') code = await loadSkills();
  else console.error('Commands: provision --order <id> [--invite-now] | skills [--upload]');
} finally {
  await close();
}
process.exit(code);
