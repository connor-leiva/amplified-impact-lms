// D-236: the seat card form's server. The Team Owner and the Operations Lead fill in their team's card for a week;
// the Operations Lead marks it ready for the owner, which checks the step's fill items for the whole team on both
// paths; only the Team Owner signs, which checks the sign items too; a change after signing keeps the signature.
// Agents read it; staff read every team's. Nothing is emailed.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import type { CheckBlock, SeatCard } from '@ai/core/course-types';
import { build } from '../src/app';
import type { App } from '../src/app';
import { accounts, checklistState, emailLog, modules, plans, teamSeatCards, teams, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';
import type { Database } from '../src/db/client';

/** Thu, Dec 3, 2026, 10:00 AM CT: the course is open, and Week 1 with it. */
const NOW = '2026-12-03T10:00:00-06:00';
const T = Date.parse(NOW);
const WEEK1 = 'accelerator-week-1';
const WEEK2 = 'accelerator-week-2';
const WEEK8 = 'accelerator-week-8';

const CARD: SeatCard = {
  seat: 'Finance Analyst',
  reportsTo: 'Owner',
  runs: 'Monthly, after the books close',
  pulls: 'Last month’s books and closings',
  applies: 'The Standard Chart',
  produces: 'Last month’s numbers at the top of the Owner Desk',
  tookOver: 'Baseline task 1',
  cantDo: 'Change the books',
};
const FULL = {
  reportsTo: 'Alex Morgan',
  runs: 'The 5th at 6:00 AM MT',
  pulls: 'QuickBooks and Sisu',
  applies: 'Our confirmed map',
  produces: 'Numbers on the Owner Desk',
  tookOver: 'Baseline task 1, 90 minutes',
  cantDo: 'Change the books',
  firstRun: 'Dec 5',
};

let handle: Database;
let app: App;
const cookie = new Map<string, string>();

const headers = (who: string) => ({ cookie: cookie.get(who)!, 'content-type': 'application/json' });
const read = (who: string, moduleId = WEEK1) => app.inject({ method: 'GET', url: `/api/seat-card?moduleId=${moduleId}`, headers: { cookie: cookie.get(who)! } });
const save = (who: string, payload: Record<string, unknown>) => app.inject({ method: 'PUT', url: '/api/seat-card', headers: headers(who), payload: { moduleId: WEEK1, ...payload } });
const ticked = async (itemId: string) =>
  (await handle.select().from(checklistState).where(eq(checklistState.itemId, itemId))).filter((t) => t.checked).map((t) => t.userId).sort();

/** Step 6 asks for the seat card on both paths, as the builder's Form action does, each naming its own sign item. */
function asks(card: SeatCard, step: { paths?: { claude?: { blocks: unknown[] }; chatgpt?: { blocks: unknown[] } } }, prefix = '') {
  const form = (sign: string): CheckBlock['action'] => ({ type: 'form', formId: 'seat-card', label: 'Open the seat card', itemId: sign });
  const item = (id: string, action?: CheckBlock['action']): CheckBlock => ({ type: 'check', id, title: id, ...(action ? { action } : {}) });
  step.paths = {
    claude: { blocks: [item(`${prefix}fill`, form(`${prefix}sign`)), item(`${prefix}sign`)] },
    chatgpt: { blocks: [item(`${prefix}fill-gpt`, form(`${prefix}sign-gpt`)), item(`${prefix}sign-gpt`)] },
  };
  return card;
}

beforeAll(async () => {
  process.env.FIXED_NOW = NOW;
  handle = await testDatabase();
});

beforeEach(async () => {
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  const week1 = db.modules.find((m) => m.id === WEEK1)!;
  week1.course = { ...week1.course!, seatCard: asks(CARD, week1.checklist[5]!) };
  // Week 8 asks too, but isn't open yet.
  const week8 = db.modules.find((m) => m.id === WEEK8)!;
  week8.course = { ...week8.course!, seatCard: asks(CARD, week8.checklist[0]!, 'w8-') };
  // Week 2's seat card has no Form action: it asks for nothing.
  await resetDatabase(db);
  await handle.update(modules).set({ status: 'scheduled', opens: T + 30 * 86_400_000 }).where(eq(modules.id, WEEK8));
  await handle.insert(teams).values([
    { id: 'team-a', name: 'Northline Realty', ownerId: 'own-a', seats: 5, seq: 90 },
    { id: 'team-b', name: 'Sample Team', ownerId: 'own-b', seats: 5, seq: 91 },
  ]);
  const learner = (id: string, name: string, teamId: string, role: string, seq: number) => ({
    id, email: `${id}@example.test`, name, kind: 'learner' as const, tier: 'team' as const, role, teamId, cohortId: 'dec26', status: 'active' as const, joined: T, seq,
  });
  await handle.insert(users).values([
    learner('own-a', 'Alex Morgan', 'team-a', 'Team Owner', 90),
    learner('op-a', 'Olive Operator', 'team-a', 'Operations Lead', 91),
    learner('ag-a', 'Avery Agent', 'team-a', 'Agent', 92),
    learner('own-b', 'Dana Whitlock', 'team-b', 'Team Owner', 93),
  ]);
  await handle.insert(accounts).values([
    { id: 'acct-a', teamId: 'team-a', ownerUserId: 'own-a', ownerEmail: 'own-a@example.test', name: 'Northline Realty', createdAt: T },
    { id: 'acct-b', teamId: 'team-b', ownerUserId: 'own-b', ownerEmail: 'own-b@example.test', name: 'Sample Team', createdAt: T },
  ]);
  await handle.insert(plans).values([
    { id: 'plan-a', accountId: 'acct-a', kind: 'cohort', option: 'full', seats: 5, cohortId: 'dec26', status: 'active', startsAt: T - 86_400_000 * 20, orderId: 'ord-a', createdAt: T },
    { id: 'plan-b', accountId: 'acct-b', kind: 'cohort', option: 'full', seats: 5, cohortId: 'dec26', status: 'active', startsAt: T - 86_400_000 * 20, orderId: 'ord-b', createdAt: T },
  ]);
  app = await build({ logger: false });
  for (const who of ['own-a', 'op-a', 'ag-a', 'own-b', 'st_owner']) cookie.set(who, await app.signInAs(who));
});

afterEach(async () => {
  await app?.close();
});

afterAll(() => {
  delete process.env.FIXED_NOW;
});

describe('the seat card form (D-236)', () => {
  it('saves as the team goes; the operator marks it ready and the owner signs, each checking its items on both paths', async () => {
    const start = await read('op-a');
    expect(start.statusCode).toBe(200);
    expect(start.json()).toEqual({ answers: {}, updatedAt: null, updatedBy: null, readyAt: null, signedAt: null, signedBy: null, role: 'operator', preview: false });

    // A save as you go checks nothing.
    const part = await save('op-a', { answers: { reportsTo: ' Alex Morgan ', runs: 'Monthly' } });
    expect(part.statusCode).toBe(200);
    expect(part.json()).toMatchObject({ answers: { reportsTo: 'Alex Morgan', runs: 'Monthly' }, updatedAt: T, updatedBy: 'Olive Operator', readyAt: null });
    expect(await ticked('fill')).toEqual([]);

    // Ready needs every answer; then the fill items are done for the whole team, both paths, and nothing is signed.
    expect((await save('op-a', { answers: { reportsTo: 'Alex Morgan' }, ready: true })).json()).toEqual({ error: 'Answer every line first.' });
    const ready = await save('op-a', { answers: FULL, ready: true });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toMatchObject({ readyAt: T, signedAt: null, signedBy: null });
    for (const id of ['fill', 'fill-gpt']) expect(await ticked(id)).toEqual(['ag-a', 'op-a', 'own-a']);
    for (const id of ['sign', 'sign-gpt']) expect(await ticked(id)).toEqual([]);

    // Only the Team Owner signs.
    const refused = await save('op-a', { answers: FULL, sign: true });
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toEqual({ error: 'Only the Team Owner signs.' });

    const owner = await read('own-a');
    expect(owner.json()).toMatchObject({ answers: FULL, readyAt: T, role: 'owner' });
    const signed = await save('own-a', { answers: FULL, sign: true });
    expect(signed.statusCode).toBe(200);
    expect(signed.json()).toMatchObject({ signedAt: T, signedBy: 'Alex Morgan' });
    for (const id of ['fill', 'fill-gpt', 'sign', 'sign-gpt']) expect(await ticked(id)).toEqual(['ag-a', 'op-a', 'own-a']);

    // A change after signing saves, and the card stays signed (Connor, Nov 22).
    const later = await save('op-a', { answers: { ...FULL, firstRun: 'Dec 6' } });
    expect(later.statusCode).toBe(200);
    expect(later.json()).toMatchObject({ answers: { firstRun: 'Dec 6' }, updatedBy: 'Olive Operator', readyAt: T, signedAt: T, signedBy: 'Alex Morgan' });
    const [row] = await handle.select().from(teamSeatCards).where(eq(teamSeatCards.teamId, 'team-a'));
    expect(row).toMatchObject({ moduleId: WEEK1, signedBy: 'own-a' });
  });

  it('lets an agent read the team’s card and change nothing; another team’s card is its own', async () => {
    await save('own-a', { answers: FULL });
    const agent = await read('ag-a');
    expect(agent.statusCode).toBe(200);
    expect(agent.json()).toMatchObject({ answers: FULL, role: 'agent', preview: false });
    const write = await save('ag-a', { answers: FULL });
    expect(write.statusCode).toBe(403);
    expect(write.json()).toEqual({ error: 'That card is for the owner and the operator.' });
    expect((await read('own-b')).json()).toMatchObject({ answers: {}, updatedAt: null, role: 'owner' });
  });

  it('refuses a password or an account number, an answer too long, a week that doesn’t ask or isn’t open, and staff writing', async () => {
    expect((await save('own-a', { answers: { pulls: 'QuickBooks, password hunter2' } })).statusCode).toBe(422);
    expect((await save('own-a', { answers: { pulls: 'Account 123456789' } })).json()).toEqual({ error: 'Never a password.' });
    expect((await save('own-a', { answers: { runs: 'x'.repeat(1001) } })).json()).toEqual({ error: 'One answer is too long.' });
    expect((await save('own-a', { moduleId: WEEK2, answers: FULL })).statusCode).toBe(404);
    expect((await read('own-a', WEEK2)).statusCode).toBe(404);
    expect((await save('own-a', { moduleId: WEEK8, answers: FULL })).statusCode).toBe(404);
    expect((await read('own-a', WEEK8)).json()).toEqual({ error: 'This week has no seat card.' });
    expect((await save('own-a', { moduleId: 'nope', answers: FULL })).statusCode).toBe(404);
    expect((await handle.select().from(teamSeatCards)).length).toBe(0);
    // Staff previewing read an empty card, locked, and nothing saves.
    expect((await read('st_owner')).json()).toEqual({ answers: {}, updatedAt: null, updatedBy: null, readyAt: null, signedAt: null, signedBy: null, role: 'agent', preview: true });
    expect((await save('st_owner', { answers: FULL })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `/api/seat-card?moduleId=${WEEK1}` })).statusCode).toBe(401);
  });

  it('gives staff every team’s card for the week, and refuses a learner', async () => {
    await save('op-a', { answers: FULL, ready: true });
    await save('own-b', { answers: { reportsTo: 'Dana Whitlock' } });
    const res = await app.inject({ method: 'GET', url: `/api/admin/seat-cards?moduleId=${WEEK1}`, headers: { cookie: cookie.get('st_owner')! } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      cards: [
        { team: 'Northline Realty', answers: FULL, updatedAt: T, updatedBy: 'Olive Operator', readyAt: T, signedAt: null, signedBy: null },
        { team: 'Sample Team', answers: { reportsTo: 'Dana Whitlock' }, updatedAt: T, updatedBy: 'Dana Whitlock', readyAt: null, signedAt: null, signedBy: null },
      ],
    });
    expect((await app.inject({ method: 'GET', url: '/api/admin/seat-cards', headers: { cookie: cookie.get('st_owner')! } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'GET', url: `/api/admin/seat-cards?moduleId=${WEEK1}`, headers: { cookie: cookie.get('own-a')! } })).statusCode).toBe(403);
  });

  // A real render: headless Chromium (`CHROME_PATH`, or the bundled `@sparticuz/chromium` as on the host).
  it('prints the team’s card for anyone on the team, signed or not, and refuses staff and no session', async () => {
    await save('own-a', { answers: FULL, sign: true });
    for (const who of ['own-a', 'ag-a']) {
      const res = await app.inject({ method: 'GET', url: `/api/seat-card/pdf?moduleId=${WEEK1}`, headers: { cookie: cookie.get(who)! } });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe('attachment; filename="Finance Analyst Seat Card - Northline Realty.pdf"');
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.rawPayload.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    }
    expect((await app.inject({ method: 'GET', url: `/api/seat-card/pdf?moduleId=${WEEK1}`, headers: { cookie: cookie.get('st_owner')! } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: `/api/seat-card/pdf?moduleId=${WEEK2}`, headers: { cookie: cookie.get('own-a')! } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/seat-card/pdf?moduleId=${WEEK1}` })).statusCode).toBe(401);
  }, 60_000);

  it('emails nobody', async () => {
    await save('op-a', { answers: FULL, ready: true });
    await save('own-a', { answers: FULL, sign: true });
    expect(await handle.select().from(emailLog)).toEqual([]);
  });
});
