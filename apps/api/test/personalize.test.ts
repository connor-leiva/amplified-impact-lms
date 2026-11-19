// D-199: personalization stays on the caller's team, and staff cannot write it.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import { WEEK0_MODULE_ID } from '@ai/core/seed/start-here-v1';
import { build } from '../src/app';
import type { App } from '../src/app';
import { checklistState, teamIntake, teams, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';
import type { Database } from '../src/db/client';

const NOW = '2026-11-19T16:04:00Z';

let handle: Database;
let app: App;
let stepId = '';

beforeAll(async () => {
  process.env.FIXED_NOW = NOW;
  handle = await testDatabase();
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  const week = db.modules.find((m) => m.id === WEEK0_MODULE_ID)!;
  const step = week.checklist[0]!;
  stepId = step.id;
  step.paths = {
    claude: {
      blocks: [
        { type: 'check', id: 's1-accept', title: 'Accept the invite', role: 'operator' },
        { type: 'check', id: 's1-plan', title: 'Choose a plan', collapseIf: { field: 'plan', equals: 'Claude Team' }, collapsedNote: 'Covered.' },
      ],
    },
  };
  await resetDatabase(db);
  await handle.insert(teams).values([
    { id: 'team-a', name: 'Team A', ownerId: 'own-a', seats: 5, seq: 90 },
    { id: 'team-b', name: 'Team B', ownerId: 'own-b', seats: 5, seq: 91 },
  ]);
  await handle.insert(users).values([
    { id: 'own-a', email: 'a@example.test', name: 'Owner A', kind: 'learner', tier: 'team', role: 'Team Owner', teamId: 'team-a', status: 'active', joined: Date.parse(NOW), seq: 90 },
    { id: 'op-a', email: 'op@example.test', name: 'Jordan', kind: 'learner', tier: 'team', role: 'Operations Lead', teamId: 'team-a', status: 'active', joined: Date.parse(NOW), seq: 91 },
    { id: 'own-b', email: 'b@example.test', name: 'Owner B', kind: 'learner', tier: 'team', role: 'Team Owner', teamId: 'team-b', status: 'active', joined: Date.parse(NOW), seq: 92 },
  ]);
  await handle.insert(teamIntake).values({ teamId: 'team-a', answers: { plan: 'Claude Team', operator: "I'm both" }, updatedAt: Date.parse(NOW), updatedBy: 'own-a' });
  await handle.insert(checklistState).values({ userId: 'op-a', moduleId: WEEK0_MODULE_ID, stepId, itemId: 's1-accept', checked: true, checkedAt: Date.parse(NOW), auto: false });
  app = await build({ logger: false });
});

afterAll(async () => {
  delete process.env.FIXED_NOW;
  await app?.close();
});

describe('personalization (D-199)', () => {
  it('checks the team that asked, and shows that team’s operator only', async () => {
    const a = await app.signInAs('own-a');
    const b = await app.signInAs('own-b');
    const staff = await app.signInAs('st_owner');
    const read = await app.inject({ method: 'GET', url: '/api/personalize', headers: { cookie: a } });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({ name: 'Jordan', steps: [{ moduleId: WEEK0_MODULE_ID, stepId, done: 1, total: 1 }] });
    const other = await app.inject({ method: 'GET', url: '/api/personalize', headers: { cookie: b } });
    expect(other.json()).toEqual({ name: null, steps: [] });
    const preview = await app.inject({ method: 'POST', url: '/api/personalize', headers: { cookie: staff, 'content-type': 'application/json' }, payload: {} });
    expect(preview.statusCode).toBe(403);
    const post = await app.inject({ method: 'POST', url: '/api/personalize', headers: { cookie: a, 'content-type': 'application/json' }, payload: {} });
    expect(post.statusCode).toBe(200);
    const mine = await handle.select().from(checklistState).where(and(eq(checklistState.userId, 'own-a'), eq(checklistState.itemId, 's1-plan')));
    expect(mine).toHaveLength(1);
    const theirs = await handle.select().from(checklistState).where(eq(checklistState.userId, 'own-b'));
    expect(theirs).toEqual([]);
  });
});
