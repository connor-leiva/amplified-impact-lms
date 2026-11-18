// D-153: logins go out now, and nothing paid opens for an AI Accelerator buyer until the first live
// build, Wednesday, Dec 2, 2026, 12:00 PM Mountain (1:00 PM Central). Over HTTP, from the real
// provisioning path: what a buyer who checks out tonight can open, tonight and at the build, and what
// the pre-launch welcome is told. Amplified Insiders stays open at purchase (Connor, 2026-11-13); the
// Team Plan and the Agent Plan keep their own days; free skills stay open. And migration 0014, which
// moves plans bought before the change to the same instant.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { COURSE_OPENS_AT } from '@ai/core/accelerator';
import { ensureCurriculum } from '@ai/core/seed/curriculum';
import type { SkillGuide, SkillGuidesFile } from '@ai/core/skill-guides';
import { build } from '../src/app';
import type { App } from '../src/app';
import { AGENTS_SKILLS_FROM, COHORT_ONE } from '../src/billing/catalog';
import { provisionOrder } from '../src/billing/provision';
import type { Database } from '../src/db/client';
import { orders, plans, skills, users } from '../src/db/schema';
import { NOT_YET } from '../src/routes/course';
import { MIGRATIONS_FOLDER, resetDatabase, testDatabase } from './helpers';

const TONIGHT = Date.parse('2026-11-14T15:00:00-06:00');
const FIRST_BUILD = Date.parse('2026-12-02T12:00:00-07:00');
const DAY = 86_400_000;
const silent = { info: () => undefined, warn: () => undefined, error: () => undefined };

const guideFor = (slug: string, mark: string): SkillGuide => ({
  slug,
  skill: slug,
  title: slug,
  intro: 'Set it up once.',
  question: null,
  lanes: [{ id: 'claude', label: 'Claude', steps: [{ title: 'Download the Skill', body: [`${mark} save it.`], action: { kind: 'file', file: 'claude', label: 'Download Here' } }] }],
  prompts: [],
});
const GUIDES: SkillGuidesFile = {
  version: 1,
  ui: {
    setupTitle: 'Set it up',
    copy: { tag: 'Copy', copied: 'Copied.', copiedGrok: 'Copied.' },
    copyOpen: {
      claude: { label: 'Copy & Open Claude', href: 'https://claude.ai/new', toast: 'Copied.' },
      chatgpt: { label: 'Copy & Open ChatGPT', href: 'https://chatgpt.com/', toast: 'Copied.' },
    },
    guided: { progress: 'Step {n} of {total}', back: 'Back', next: 'Next', startOver: 'Start Over' },
  },
  guides: {
    'appointment-follow-up': guideFor('appointment-follow-up', 'SECRET-AFU'),
    'team-pnl-review': guideFor('team-pnl-review', 'SECRET-PNL'),
    'perfect-week': guideFor('perfect-week', 'SECRET-PW'),
  },
};

const BUYERS = {
  full: { plan: 'cohort', option: 'full' },
  twoPay: { plan: 'cohort', option: 'two_pay' },
  insiders: { plan: 'membership', option: 'year_upfront' },
  teamPlan: { plan: 'agents', option: 'upto15' },
} as const;
type Buyer = keyof typeof BUYERS;

let app: App;
let db: Database;

beforeAll(async () => {
  db = await testDatabase();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(TONIGHT).toISOString();
  // D-173: the course is data, so the database holds it as production's does (the deploy's ensure);
  // without it the course route answers 503 "not loaded" rather than opening at the build.
  await resetDatabase(ensureCurriculum(seedForDatabase('live')));
  await db.insert(skills).values([
    { id: 'appointment-follow-up', title: 'Appointment Follow-Up', sets: 'agent', releasedAt: TONIGHT - 10 * DAY, files: { claude: 'afu.zip' } },
    { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: TONIGHT - 10 * DAY, files: { claude: 'pnl.zip' } },
    { id: 'perfect-week', title: 'Perfect Week', sets: 'both', free: true, releasedAt: TONIGHT - 10 * DAY, files: { claude: 'pw.zip' } },
  ]);
  app = await build({ logger: false, skillGuides: GUIDES });
});
afterEach(async () => {
  await app?.close();
});

const at = (t: number) => {
  process.env.FIXED_NOW = new Date(t).toISOString();
};

/** A checkout tonight, through the path the webhook takes. Returns the owner's cookie. */
async function buy(who: Buyer): Promise<string> {
  const b = BUYERS[who];
  const email = `${who.toLowerCase()}@example.test`;
  await db.insert(orders).values({ id: `ord_${who}`, plan: b.plan, option: b.option, origin: 'payment_link', status: 'paid', name: who, email, company: who, crm: 'follow_up_boss', createdAt: TONIGHT });
  const out = await provisionOrder(`ord_${who}`, { db, log: silent, now: TONIGHT, invitesFrom: TONIGHT, invitesEnabled: false });
  expect(out.ok, who).toBe(true);
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  return app.signInAs(u!.id);
}

const library = async (cookie: string) => {
  const body = (await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json() as {
    courseOpensAt: number | null;
    skills: { id: string; state: string; opensAt: number | null }[];
  };
  return { courseOpensAt: body.courseOpensAt, states: Object.fromEntries(body.skills.map((s) => [s.id, [s.state, s.opensAt]])) };
};
const guide = (slug: string, cookie: string) => app.inject({ method: 'GET', url: `/api/skill-guides/${slug}`, headers: { cookie } });

describe('an AI Accelerator bought tonight (D-153)', () => {
  it('opens at the first live build, 12:00 PM Mountain on Wednesday, Dec 2', () => {
    expect(FIRST_BUILD).toBe(COHORT_ONE.firstBuildAt);
    expect(COURSE_OPENS_AT).toBe(FIRST_BUILD);
  });

  it.each(['full', 'twoPay'] as const)('%s: signs in now; every paid skill and its guide wait for the build, the free one is open, and the welcome has the date', async (who) => {
    const cookie = await buy(who);
    const [plan] = await db.select({ startsAt: plans.startsAt }).from(plans);
    expect(plan!.startsAt).toBe(FIRST_BUILD);

    for (const t of [TONIGHT, Date.parse('2026-11-16T08:00:00-06:00'), FIRST_BUILD - 1]) {
      at(t);
      const when = new Date(t).toISOString();
      expect(await library(cookie), when).toEqual({
        courseOpensAt: FIRST_BUILD,
        states: { 'appointment-follow-up': ['upcoming', FIRST_BUILD], 'team-pnl-review': ['upcoming', FIRST_BUILD], 'perfect-week': ['open', null] },
      });
      // The guided setups: the paid ones show no step's words; the free one does.
      for (const slug of ['appointment-follow-up', 'team-pnl-review']) {
        const res = await guide(slug, cookie);
        expect(res.statusCode, `${slug} ${when}`).toBe(200);
        expect(res.json(), `${slug} ${when}`).toMatchObject({ state: 'upcoming', opensAt: FIRST_BUILD, guide: null });
        expect(res.body).not.toMatch(/SECRET-/);
      }
      expect((await guide('perfect-week', cookie)).json()).toMatchObject({ state: 'open', guide: { slug: 'perfect-week' } });
      // The course: not open, and not "not in your plan" either.
      const course = await app.inject({ method: 'GET', url: '/api/course', headers: { cookie } });
      expect(course.statusCode).toBe(403);
      expect(course.json()).toEqual({ open: false, upcoming: true, opensAt: FIRST_BUILD, error: NOT_YET });
    }

    // At the build: everything at once.
    at(FIRST_BUILD);
    expect(await library(cookie)).toEqual({
      courseOpensAt: null,
      states: { 'appointment-follow-up': ['open', null], 'team-pnl-review': ['open', null], 'perfect-week': ['open', null] },
    });
    expect((await guide('appointment-follow-up', cookie)).json()).toMatchObject({ state: 'open', guide: { slug: 'appointment-follow-up' } });
    expect((await app.inject({ method: 'GET', url: '/api/course', headers: { cookie } })).statusCode).toBe(200);
  });

  it('has no welcome date once refunded', async () => {
    const cookie = await buy('full');
    await db.update(plans).set({ status: 'ended' });
    expect((await library(cookie)).courseOpensAt).toBeNull();
  });
});

describe('every other plan keeps its day (D-153)', () => {
  it('Amplified Insiders bought tonight opens its owner skills at once, and has no course date', async () => {
    const cookie = await buy('insiders');
    expect(await library(cookie)).toEqual({
      courseOpensAt: null,
      states: { 'appointment-follow-up': ['locked', null], 'team-pnl-review': ['open', null], 'perfect-week': ['open', null] },
    });
    expect((await guide('team-pnl-review', cookie)).json()).toMatchObject({ state: 'open', guide: { slug: 'team-pnl-review' } });
  });

  it('the Team Plan still opens its agent skills on Dec 14', async () => {
    const cookie = await buy('teamPlan');
    expect(await library(cookie)).toEqual({
      courseOpensAt: null,
      states: { 'appointment-follow-up': ['upcoming', AGENTS_SKILLS_FROM], 'team-pnl-review': ['locked', null], 'perfect-week': ['open', null] },
    });
  });

  it('a learner with no plan keeps the free skill and gets no welcome date', async () => {
    const cookie = await app.signInAs('u_jamie');
    expect(await library(cookie)).toEqual({
      courseOpensAt: null,
      states: { 'appointment-follow-up': ['locked', null], 'team-pnl-review': ['locked', null], 'perfect-week': ['open', null] },
    });
  });
});

describe('migration 0014: plans bought before the change (D-153)', () => {
  const run = async () => {
    const migration = readFileSync(join(MIGRATIONS_FOLDER, '0014_cohort_starts_at_first_build.sql'), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint')) await db.execute(sql.raw(statement));
  };

  it('moves every AI Accelerator plan that started early to the build, and nothing else', async () => {
    for (const who of Object.keys(BUYERS) as Buyer[]) await buy(who);
    // As production holds them: written before this change, every plan started at purchase.
    await db.update(plans).set({ startsAt: TONIGHT }).where(sql`kind in ('cohort', 'membership')`);
    const before = new Map((await db.select({ kind: plans.kind, option: plans.option, startsAt: plans.startsAt }).from(plans)).map((p) => [`${p.kind}/${p.option}`, p.startsAt]));
    expect(before.get('cohort/full')).toBe(TONIGHT);

    await run();
    await run(); // twice changes nothing

    const after = new Map((await db.select({ kind: plans.kind, option: plans.option, startsAt: plans.startsAt }).from(plans)).map((p) => [`${p.kind}/${p.option}`, p.startsAt]));
    expect(Object.fromEntries(after)).toEqual({
      'cohort/full': FIRST_BUILD,
      'cohort/two_pay': FIRST_BUILD,
      'membership/year_upfront': TONIGHT,
      'agents/upto15': AGENTS_SKILLS_FROM,
    });
  });

  it('leaves a plan that starts after the build alone', async () => {
    await buy('full');
    await db.update(plans).set({ startsAt: FIRST_BUILD + DAY });
    await run();
    const [p] = await db.select({ startsAt: plans.startsAt }).from(plans);
    expect(p!.startsAt).toBe(FIRST_BUILD + DAY);
  });
});
