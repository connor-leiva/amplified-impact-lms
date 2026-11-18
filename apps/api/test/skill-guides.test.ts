// The guided setups behind sign-in (DECISIONS.md D-151), end to end against Postgres: who gets a
// skill's full setup from `GET /api/skill-guides/:slug`, who gets only its steps' titles, how a free
// skill's sign-up becomes a free account that lands on its guide, where an old ZIP link goes, and the
// one-time rewrite of the course's links. The guides here carry marker words (SECRET-…), so a leak
// anywhere in an answer is a failure, not a coincidence.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { TEAM_PLAN_COPY } from '@ai/core/seed/copy-v2';
import { SEED_COPY, seedProduction } from '@ai/core/seed/curriculum';
import { acceleratorModules } from '@ai/core/seed/accelerator-v1';
import type { SkillGuide, SkillGuidesFile } from '@ai/core/skill-guides';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { provisionGroupMember, recordVerified } from '../src/billing/access-groups';
import type { Database } from '../src/db/client';
import { accessGroups, ai101Waitlist, copyStrings, modules, skills, users } from '../src/db/schema';
import { outboxFor, resetOutbox } from '../src/email/transport';
import type { OutboxEntry } from '../src/email/transport';
import { registerStaticFiles } from '../src/static';
import { GUIDE_SLUGS } from '../src/routes/guide-list';
import { MIGRATIONS_FOLDER, resetDatabase, testDatabase } from './helpers';
import { clearUsage, usageRows, withoutUsageTable } from './usage-helpers';

const NOW = Date.parse('2026-11-13T09:00:00-06:00');
const DAY = 86_400_000;
const APP_URL = 'https://learn.example.com';

const guideFor = (slug: string, skill: string, title: string, mark: string): SkillGuide => ({
  slug,
  skill,
  title,
  intro: 'Set it up once, in about 10 minutes.',
  question: 'Which AI app do you use?',
  lanes: [
    {
      id: 'claude',
      label: 'Claude',
      steps: [
        { title: 'Turn Off Training First', body: [`${mark}-STEP-1 open Settings and switch it off.`], action: { kind: 'link', label: 'Open Claude Settings', href: 'https://claude.ai/settings/data-privacy-controls' } },
        { title: 'Download the Skill', body: [`${mark}-STEP-2 save it, do not unzip it.`], action: { kind: 'file', file: 'claude', label: 'Download Here' } },
        { title: 'Practise on the Made-Up Example', body: [`${mark}-STEP-3 attach the practice files.`], copy: `${mark}-COPY review the practice file` },
      ],
    },
    { id: 'chatgpt', label: 'ChatGPT', steps: [{ title: 'Paste the Instructions', body: [`${mark}-STEP-4 paste these.`], copyBlock: `${mark}-BLOCK instructions` }] },
  ],
  prompts: [{ heading: 'What to say', body: 'Tap to copy.', groups: [{ label: 'To start', items: [`${mark}-PROMPT draft it`] }] }],
});

const GUIDES: SkillGuidesFile = {
  version: 1,
  ui: {
    setupTitle: 'Set it up',
    copy: { tag: 'Copy', copied: 'Copied. Paste it into Claude.', copiedGrok: 'Copied. Paste it into Grok Bot.' },
    copyOpen: {
      claude: { label: 'Copy & Open Claude', href: 'https://claude.ai/new', toast: 'Copied. Paste it into Claude.' },
      chatgpt: { label: 'Copy & Open ChatGPT', href: 'https://chatgpt.com/', toast: 'Copied. Paste it into ChatGPT.' },
    },
    guided: { progress: 'Step {n} of {total}', back: 'Back', next: 'Next', startOver: 'Start Over' },
  },
  guides: {
    'appointment-follow-up': guideFor('appointment-follow-up', 'appointment-follow-up', 'Appointment Follow-Up', 'SECRET-AFU'),
    // D-179: a sample output, as www shows anyone (made up, and never part of the setup).
    'team-pnl-review': {
      ...guideFor('team-pnl-review', 'team-pnl-review', 'Team P&L Review', 'SECRET-PNL'),
      sample: { title: 'Team P&L Review: Example Team', body: 'From the made-up practice file.', note: 'Made-up example. Shortened.', blocks: [{ h: 'Bottom line' }, { p: ['Margins held.'] }] },
    },
    'perfect-week': guideFor('perfect-week', 'perfect-week', 'Perfect Week', 'SECRET-PW'),
  },
};
const SECRET = /SECRET-/;

let app: App;
let db: Database;
let savedAppUrl: string | undefined;

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = APP_URL;
  db = await testDatabase();
});
afterAll(() => {
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

async function boot(guides: SkillGuidesFile | null = GUIDES): Promise<void> {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
  await resetDatabase(seedForDatabase('live'));
  await db.insert(skills).values([
    { id: 'appointment-follow-up', title: 'Appointment Follow-Up', sets: 'agent', releasedAt: NOW - 10 * DAY, files: { claude: 'appointment-follow-up.zip' } },
    { id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', releasedAt: NOW - 10 * DAY, files: { claude: 'team-pnl-review.zip' } },
    { id: 'perfect-week', title: 'Perfect Week', sets: 'both', free: true, releasedAt: NOW - 10 * DAY, files: { claude: 'perfect-week.zip' } },
  ]);
  app = await build({ logger: false, waitlist: true, skillGuides: guides });
}
beforeEach(async () => {
  await boot();
});
afterEach(async () => {
  await app?.close();
});

const guide = (slug: string, cookie?: string) =>
  app.inject({ method: 'GET', url: `/api/skill-guides/${slug}`, headers: cookie ? { cookie } : {} });
const post = (url: string, payload: Record<string, unknown>) => app.inject({ method: 'POST', url, payload, headers: { origin: 'http://localhost' } });

/** A learner with no plan: the seed's Jamie. */
const learner = () => app.signInAs('u_jamie');

/** A group's member, verified (D-148). */
async function member(email: string, groups: Array<{ id: string; name: string; plan: string }>) {
  for (const g of groups) await db.insert(accessGroups).values({ ...g, emailDomain: 'liveutah.com', expiresAt: null, createdAt: NOW - DAY }).onConflictDoNothing();
  const id = await provisionGroupMember(db, email, NOW);
  await recordVerified(db, email, NOW);
  return app.signInAs(id!);
}
const UTAH = { id: 'utah-life', name: 'Utah Life', plan: 'agent_plan' };

describe('signed out (D-151)', () => {
  it('gets nothing of a paid or a free skill’s setup: 401, no words', async () => {
    for (const slug of ['appointment-follow-up', 'team-pnl-review', 'perfect-week']) {
      const res = await guide(slug);
      expect(res.statusCode, slug).toBe(401);
      expect(res.body, slug).not.toMatch(SECRET);
      expect(res.body, slug).not.toContain('Turn Off Training First');
    }
  });
});

describe('a learner the access rule does not let in', () => {
  it('gets the steps’ titles and the plan line’s facts, and none of the setup', async () => {
    const res = await guide('appointment-follow-up', await learner());
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    const body = res.json();
    expect(body).toMatchObject({ slug: 'appointment-follow-up', state: 'locked', guide: null, ui: null, sets: 'agent', accessGroups: [] });
    expect(body.preview.lanes.map((l: { steps: string[] }) => l.steps)).toEqual([
      ['Turn Off Training First', 'Download the Skill', 'Practise on the Made-Up Example'],
      ['Paste the Instructions'],
    ]);
    expect(res.body).not.toMatch(SECRET);
  });
});

describe('a free skill (D-151)', () => {
  it('opens its whole setup to any signed-in learner: a free account is enough', async () => {
    const res = await guide('perfect-week', await learner());
    const body = res.json();
    expect(body.state).toBe('open');
    expect(body.guide.lanes[0].steps[0].body).toEqual(['SECRET-PW-STEP-1 open Settings and switch it off.']);
    expect(body.guide.prompts[0].groups[0].items).toEqual(['SECRET-PW-PROMPT draft it']);
    expect(body.ui.guided.next).toBe('Next');
  });

  it('turns a sign-up on its page into a sign-in link that lands on its guide, keeps the lead row, and makes the account', async () => {
    const res = await post('/api/perfect-week', { firstName: 'Sam', email: '  Sam.New@Example.com ', website: '' });
    expect(res.statusCode).toBe(201);
    // The lead row the GoHighLevel sync reads, unchanged.
    expect(await db.select({ email: ai101Waitlist.email, source: ai101Waitlist.source }).from(ai101Waitlist)).toEqual([{ email: 'sam.new@example.com', source: 'perfect-week' }]);
    await settleEmails();
    const mails = outboxFor({ to: 'sam.new@example.com', template: 'sign-in' }) as OutboxEntry[];
    expect(mails).toHaveLength(1);
    const link = /href="([^"]*\/sign-in\?token=[^"]+)"/.exec(mails[0]!.html ?? '')?.[1]?.replace(/&amp;/g, '&') ?? '';
    const url = new URL(link);
    expect(url.origin).toBe(APP_URL);
    expect(url.searchParams.get('next')).toBe('/skill-library/perfect-week');
    // No account until the link is spent.
    expect(await db.select().from(users).where(eq(users.email, 'sam.new@example.com'))).toEqual([]);

    const verify = await post('/api/auth/verify', { token: url.searchParams.get('token')! });
    expect(verify.statusCode).toBe(200);
    const [made] = await db.select().from(users).where(eq(users.email, 'sam.new@example.com'));
    expect(made).toMatchObject({ kind: 'learner', status: 'active' });
    const cookie = (verify.headers['set-cookie'] as string | string[]).toString().split(';')[0]!;
    expect((await guide('perfect-week', cookie)).json().state).toBe('open');
    // A free account opens the free skills, and nothing paid.
    const paid = await guide('appointment-follow-up', cookie);
    expect(paid.json()).toMatchObject({ state: 'locked', guide: null });
    expect(paid.body).not.toMatch(SECRET);
  });

  it('lets an address that signed up ask for its link again from the sign-in screen; an unknown one gets nothing', async () => {
    await post('/api/perfect-week', { firstName: 'Lee', email: 'lee@example.com', website: '' });
    await settleEmails();
    resetOutbox();
    expect((await post('/api/auth/request', { email: 'lee@example.com', next: '/skill-library/perfect-week' })).statusCode).toBe(200);
    expect((await post('/api/auth/request', { email: 'stranger@example.com', next: '/skill-library/perfect-week' })).statusCode).toBe(200);
    await settleEmails();
    expect(outboxFor({ to: 'lee@example.com', template: 'sign-in' })).toHaveLength(1);
    expect(outboxFor({ to: 'stranger@example.com' })).toEqual([]);
  });

  it('sends no link for a paid skill’s sign-up, and holds a sixth link in an hour', async () => {
    await post('/api/appointment-follow-up', { firstName: 'Pat', email: 'pat@example.com', website: '' });
    for (let i = 0; i < 6; i++) await post('/api/perfect-week', { firstName: 'Kim', email: 'kim@example.com', website: '' });
    await settleEmails();
    expect(outboxFor({ to: 'pat@example.com' })).toEqual([]);
    expect(outboxFor({ to: 'kim@example.com', template: 'sign-in' })).toHaveLength(5);
  });
});

describe('a Utah Life member (D-148, D-151)', () => {
  it('sees an agent skill’s whole setup, and only the titles of an owner-and-ops one', async () => {
    const cookie = await member('agent@liveutah.com', [UTAH]);
    const agent = await guide('appointment-follow-up', cookie);
    expect(agent.json().state).toBe('open');
    expect(agent.json().guide.lanes[0].steps[1].action).toEqual({ kind: 'file', file: 'claude', label: 'Download Here' });
    const owner = await guide('team-pnl-review', cookie);
    expect(owner.json()).toMatchObject({ state: 'locked', guide: null, accessGroups: [{ id: 'utah-life', name: 'Utah Life', covers: ['agent', 'both'] }] });
    expect(owner.body).not.toMatch(SECRET);
  });

  it('opens an owner-and-ops guide too for a learner whose grant covers it', async () => {
    const cookie = await member('owner@liveutah.com', [{ id: 'insiders-team', name: 'Insiders Team', plan: 'membership' }]);
    expect((await guide('team-pnl-review', cookie)).json().state).toBe('open');
  });
});

describe('the learner portal v2’s Skill Library (D-179)', () => {
  const UTAH_LINE = SEED_COPY.find((c) => c.key === 'locked.utah_life')!;
  const skillsOf = async (cookie: string) => (await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json() as { lockedLines: Record<string, string> };

  it('answers a locked skill’s sample output, which www shows anyone, and still none of its setup', async () => {
    const cookie = await member('preview@liveutah.com', [UTAH]);
    const res = await guide('team-pnl-review', cookie);
    expect(res.json()).toMatchObject({ state: 'locked', guide: null, ui: null, sample: GUIDES.guides['team-pnl-review']!.sample });
    expect(res.body).not.toMatch(SECRET);
    // A page with no sample answers null: learn draws nothing in its place.
    expect((await guide('appointment-follow-up', cookie)).json().sample).toBeNull();
  });

  it('answers each access group’s locked line from the builder’s copy string, and nothing for anyone else', async () => {
    await db.insert(copyStrings).values(UTAH_LINE).onConflictDoNothing();
    expect((await skillsOf(await member('lines@liveutah.com', [UTAH]))).lockedLines).toEqual({ 'utah-life': 'Not included with Utah Life access' });
    expect((await skillsOf(await learner())).lockedLines).toEqual({});
    // The builder's edit is what the screen reads.
    await db.update(copyStrings).set({ value: 'Not part of your Utah Life access' }).where(eq(copyStrings.key, 'locked.utah_life'));
    expect((await skillsOf(await member('edited@liveutah.com', [UTAH]))).lockedLines).toEqual({ 'utah-life': 'Not part of your Utah Life access' });
  });

  it('D-187: answers the Team Plan window’s words from the builder’s copy strings, to every learner, as edited @parity:SH-8 @parity:P-1', async () => {
    await db.insert(copyStrings).values([...TEAM_PLAN_COPY, { key: 'plan.team_other', value: 'Not the window’s', audience: 'learner' }, { key: 'plan.team.staff_note', value: 'Staff only', audience: 'staff' }]).onConflictDoNothing();
    const words = Object.fromEntries(TEAM_PLAN_COPY.map((c) => [c.key, c.value]));
    const planCopyOf = async (cookie: string) => ((await app.inject({ method: 'GET', url: '/api/skills', headers: { cookie } })).json() as { planCopy: Record<string, string> }).planCopy;
    // A learner with no group, and a Utah Life member (whose window shows their group's line instead).
    expect(await planCopyOf(await learner())).toEqual(words);
    expect(await planCopyOf(await member('plan@liveutah.com', [UTAH]))).toEqual(words);
    await db.update(copyStrings).set({ value: 'Ask Us About the Team Plan' }).where(eq(copyStrings.key, 'plan.team.ask'));
    expect((await planCopyOf(await learner()))['plan.team.ask']).toBe('Ask Us About the Team Plan');
  });
});

describe('the route’s other answers', () => {
  it('answers 404 for a page that is not a guide, and 403 for staff', async () => {
    const cookie = await learner();
    expect((await guide('not-a-skill', cookie)).statusCode).toBe(404);
    expect((await guide('__proto__', cookie)).statusCode).toBe(404);
    expect((await guide('appointment-follow-up', await app.signInAs('st1'))).statusCode).toBe(403);
  });

  it('answers 503, with no guide, on a deploy whose build wrote no guides', async () => {
    await app.close();
    await boot(null);
    const res = await guide('perfect-week', await learner());
    expect(res.statusCode).toBe(503);
  });
});

describe('an old ZIP link (D-151)', () => {
  let root: string;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'ai-guides-'));
    mkdirSync(join(root, 'downloads'));
    writeFileSync(join(root, 'index.html'), '<!doctype html><title>x</title>');
    for (const f of ['perfect-week.zip', 'appointment-follow-up.zip', 'ops-time-audit.pdf']) writeFileSync(join(root, 'downloads', f), 'PK');
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('goes to its guide in learn, free or paid, and never serves the file; a PDF guide is still a file', async () => {
    const a = await build({ fixtureOnly: true, logger: false, guidePages: Object.fromEntries(GUIDE_SLUGS.map((s) => [s, `<title>${s}</title>`])) });
    await registerStaticFiles(a, root);
    await a.ready();
    try {
      for (const [file, page] of [['perfect-week.zip', 'perfect-week'], ['appointment-follow-up.zip', 'appointment-follow-up']]) {
        const res = await a.inject({ method: 'GET', url: `/downloads/${file}` });
        expect([res.statusCode, res.headers.location], file).toEqual([302, `https://learn.amplifiedimpact.io/skill-library/${page}`]);
      }
      expect((await a.inject({ method: 'GET', url: '/downloads/ops-time-audit.pdf' })).statusCode).toBe(200);
    } finally {
      await a.close();
    }
  });
});

describe('the course’s links (migration 0013, D-151)', () => {
  it('rewrites the seeded week prompts to the guides in learn, exactly as a fresh seed writes them', async () => {
    await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
    // Put production's rows back as they were before this change: every guide link on www.
    await db.execute(sql`UPDATE modules SET prompt = replace(prompt, 'https://learn.amplifiedimpact.io/skill-library/', 'https://www.amplifiedimpact.io/') WHERE id LIKE 'accelerator-week-%'`);
    const before = await db.select({ id: modules.id, prompt: modules.prompt }).from(modules).where(sql`id LIKE 'accelerator-week-%'`);
    expect(before.some((m) => m.prompt.includes('https://www.amplifiedimpact.io/lead-source-roi\n'))).toBe(true);

    const migration = readFileSync(join(MIGRATIONS_FOLDER, '0013_course_guide_links.sql'), 'utf8');
    for (const statement of migration.split('--> statement-breakpoint')) await db.execute(sql.raw(statement));
    // Twice changes nothing.
    for (const statement of migration.split('--> statement-breakpoint')) await db.execute(sql.raw(statement));

    const after = new Map((await db.select({ id: modules.id, prompt: modules.prompt }).from(modules).where(sql`id LIKE 'accelerator-week-%'`)).map((m) => [m.id, m.prompt]));
    for (const m of acceleratorModules()) expect(after.get(m.id), m.id).toBe(m.prompt);
    // A page that is not a skill stays on www.
    expect([...after.values()].join('\n')).toContain('https://www.amplifiedimpact.io/voice-profile');
  });
});

// D-166: the usage count a guide view makes (spec §§ 7.7, 9): one `guide_view` per answered page, open
// or locked, none for a refusal, and the same answer when the count cannot be written.
describe('a guide view is counted (D-166) @console', () => {
  beforeEach(clearUsage);

  it('counts each guide a learner is answered, and nothing for staff or a page that is not a guide', async () => {
    const cookie = await learner();
    expect((await guide('perfect-week', cookie)).statusCode).toBe(200);
    expect((await guide('appointment-follow-up', cookie)).statusCode).toBe(200);
    expect((await guide('not-a-skill', cookie)).statusCode).toBe(404);
    expect((await guide('perfect-week', await app.signInAs('st1'))).statusCode).toBe(403);
    expect(await usageRows()).toEqual([expect.objectContaining({ user_id: 'u_jamie', kind: 'guide_view', count: 2 })]);
  });

  it('answers exactly as before when the count cannot be written', async () => {
    const cookie = await learner();
    const counted = await guide('perfect-week', cookie);
    const res = await withoutUsageTable(() => guide('perfect-week', cookie));
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body).toBe(counted.body);
    expect((await usageRows())[0]!.count).toBe(1);
  });
});
