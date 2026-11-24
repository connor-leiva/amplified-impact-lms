// D-174, the learner build brief's PR 2 acceptance ("no-deploy check"): an API test edits each field
// type through the admin route and asserts that `GET /api/course` and the snapshot return the new value
// immediately. Every write goes through `POST /api/admin/actions/:name` (one transaction, one audit
// row), against a real Postgres seeded as production is (`seedProduction`), with no restart between.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc } from 'drizzle-orm';
import { MODULE_ICONS, moduleVersion } from '@ai/core';
import type { Db } from '@ai/core';
import { ACCELERATOR_MODULE_IDS } from '@ai/core/accelerator';
import type { CourseContent } from '@ai/core/course-types';
import { SEED_COPY, seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { auditLog } from '../src/db/schema';
import { persistDiff } from '../src/db/io';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-11-18T10:00:00-07:00');
const W2 = ACCELERATOR_MODULE_IDS[2]!;
let app: App;
let cookie: string;

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
  app = await build({ logger: false });
  cookie = await app.signInAs('st_owner');
});
afterEach(async () => {
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

/**
 * D-246 (H-6): a builder save sends the version of the module it opened. Every draft here is opened from
 * the stored row just before it is sent, so the helper adds that row's version when a test gives none.
 */
const withBase = async (name: string, payload: unknown): Promise<unknown> => {
  if (name !== 'saveBuilderModule' || !payload || typeof payload !== 'object' || 'base' in payload) return payload;
  const id = (payload as { draft: { id: string } }).draft.id;
  const stored = (await loadDb()).modules.find((m) => m.id === id);
  return { ...payload, base: stored ? moduleVersion(stored) : null };
};
const act = async (name: string, payload: unknown) =>
  app.inject({ method: 'POST', url: `/api/admin/actions/${name}`, headers: { cookie, 'content-type': 'application/json' }, payload: JSON.stringify(await withBase(name, payload)) });
const ok = async (name: string, payload: unknown): Promise<void> => {
  const res = await act(name, payload);
  expect(res.statusCode, `${name}: ${res.body}`).toBe(200);
};
const course = async (): Promise<{ course: CourseContent; sessions: { id: string; title: string; start: number; mins: number }[] }> => {
  const res = await app.inject({ method: 'GET', url: '/api/course', headers: { cookie } });
  expect(res.statusCode).toBe(200);
  return res.json();
};
const snapshot = async (): Promise<Db> => (await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } })).json() as Db;
const auditActions = async (): Promise<string[]> => (await (await testDatabase()).select().from(auditLog).orderBy(asc(auditLog.id))).map((r) => r.action);

describe('every field the builder edits shows at once, with no deploy (brief PR 2 acceptance) @course-builder', () => {
  it('a week’s words, steps, run of show, cards, dates, name, icon and tone', { timeout: 180_000 }, async () => {
    const stored = (await loadDb()).modules.find((m) => m.id === W2)!;
    const draft = structuredClone(stored);
    const icon = MODULE_ICONS.find((i) => i !== stored.icon)!;
    draft.name = 'Leads That Pay';
    draft.icon = icon;
    draft.tone = 'violet';
    draft.dueAt = Date.parse('2026-12-15T12:00:00-07:00');
    draft.course!.question = 'Which lead sources pay?';
    draft.course!.time.owner = 'About 1 hr 30 min';
    draft.course!.liveBuild!.agenda[0]!.activity = 'The Question';
    draft.checklist[0]!.who = 'Operator';
    draft.checklist[0]!.doneWhen = 'The report runs on your own data.';
    draft.checklist[0]!.paths = { claude: { blocks: [{ type: 'copy', label: 'Prompt', text: 'Read my lead source export.' }] }, chatgpt: { blocks: [{ type: 'text', text: 'Open a new chat.' }] } };
    draft.checklist[0]!.openInPreview = true;
    draft.course!.promise = 'Know which sources pay.';
    // D-221: an older draft's retired setup order and use lines go too.
    draft.course!.setup = [{ text: 'Open the kit.' }];
    draft.course!.skills = draft.course!.skills.map((k) => ({ ...k, use: 'What it does.' }));
    draft.course!.seatCard = { seat: 'Lead Desk Monitor', reportsTo: 'Owner', runs: 'Every Monday', pulls: 'Lead sources', applies: 'Your rules', produces: 'A source report', tookOver: 'The Monday tally', cantDo: 'Send email or post anywhere' };
    draft.course!.playbookCard = { number: '2', question: 'Which sources pay?', play: 'Cut the bottom source.', signedOff: true };
    draft.course!.sampleOutput = { title: 'Source report', madeUpLabel: 'Made-up data', blocks: [{ type: 'table', head: ['Source', 'Cost per closing'], rows: [['Zillow', '$4,100']] }] };
    draft.course!.lockedCopy = { headline: 'Week 2 is locked', line: 'It opens with its live build.', opens: 'Opens {date}' };
    draft.course!.statusLabels = { not_started: 'Not hired yet', running: 'On the clock' };
    await ok('saveBuilderModule', { draft });

    const { course: c } = await course();
    const week = c.weeks.find((w) => w.week === 2)!;
    expect(week.question).toBe('Which lead sources pay?');
    expect(week.time.owner).toBe('About 1 hr 30 min');
    expect(week.liveBuild!.agenda[0]!.activity).toBe('The Question');
    expect(week.module.icon).toBe(icon);
    expect(week.module.checklist[0]).toMatchObject({ who: 'Operator', doneWhen: 'The report runs on your own data.', openInPreview: true, paths: draft.checklist[0]!.paths });

    const m = (await snapshot()).modules.find((x) => x.id === W2)!;
    expect(m).toMatchObject({ name: 'Leads That Pay', icon, tone: 'violet', dueAt: draft.dueAt });
    // D-220: the retired promise an older draft still carries is dropped on save; the outcome is the one copy.
    expect(m.course!.promise).toBeUndefined();
    expect(m.course!.setup).toBeUndefined();
    expect(m.course!.skills.every((k) => k.use === undefined)).toBe(true);
    expect(m.course).toMatchObject({ seatCard: draft.course!.seatCard, playbookCard: draft.course!.playbookCard, sampleOutput: draft.course!.sampleOutput, lockedCopy: draft.course!.lockedCopy, statusLabels: draft.course!.statusLabels });
    expect(await auditActions()).toEqual(['module.save']);
  });

  it('a week’s kit skills and Week 0’s stack card (D-221)', { timeout: 180_000 }, async () => {
    const W0 = ACCELERATOR_MODULE_IDS[0]!;
    const draft = structuredClone((await loadDb()).modules.find((m) => m.id === W0)!);
    draft.course!.skills = [
      { title: 'Lead Source Review', route: '/lead-source-review', role: 'flagship', free: true },
      { title: 'AI Brain Setup', route: '/ai-brain-setup', role: 'supporting' },
    ];
    draft.course!.stackCard = {
      sources: [{ id: 'books', name: 'Books', green: 'Read-only export', yellow: 'A CSV each month' }],
      exampleLabel: 'Made up',
      exampleTeam: 'Northline Realty',
      example: [{ source: 'Books', tool: 'QuickBooks Online', plan: 'green', who: 'The bookkeeper' }],
    };
    await ok('saveBuilderModule', { draft });
    const week = (await course()).course.weeks.find((w) => w.week === 0)!;
    expect(week.skills).toEqual(draft.course!.skills);
    expect((week as { stackCard?: unknown }).stackCard).toEqual(draft.course!.stackCard);
    expect(await auditActions()).toEqual(['module.save']);
  });

  it('a week’s opening day and time (scheduled, Mountain Time)', { timeout: 120_000 }, async () => {
    const stored = (await loadDb()).modules.find((m) => m.id === W2)!;
    const opens = Date.parse('2026-12-09T12:00:00-07:00');
    await ok('saveBuilderModule', { draft: { ...structuredClone(stored), opens }, status: 'scheduled' });
    expect((await snapshot()).modules.find((x) => x.id === W2)).toMatchObject({ status: 'scheduled', opens });
  });

  it('a week’s sessions: one moved and retitled, one added, any kind', { timeout: 120_000 }, async () => {
    await ok('saveSession', { id: 'dec26-oh2', cohortId: 'dec26', moduleId: W2, kind: 'office_hours', title: 'Lead Source Review Office Hours', date: '2026-12-11', time: '12:00', mins: 60, zoom: '', replayVisibility: 'after_open' });
    await ok('saveSession', { cohortId: 'dec26', moduleId: W2, kind: 'other', title: 'Lead Source Review Q&A', date: '2026-12-14', time: '12:00', mins: 30, zoom: '', replayVisibility: null });
    const { sessions } = await course();
    expect(sessions.find((s) => s.id === 'dec26-oh2')).toMatchObject({ title: 'Lead Source Review Office Hours', start: Date.parse('2026-12-11T12:00:00-07:00'), mins: 60 });
    const snap = await snapshot();
    expect(snap.sessions.find((s) => s.id === 'dec26-oh2')).toMatchObject({ kind: 'office_hours', replayVisibility: 'after_open' });
    expect(snap.sessions.find((s) => s.title === 'Lead Source Review Q&A')).toMatchObject({ kind: 'other', moduleId: W2, mins: 30 });
    expect(await auditActions()).toEqual(['session.save', 'session.save']);
  });

  it('the cohort’s release plan and what every week shares, the community link included @parity:D-10', { timeout: 120_000 }, async () => {
    const co = (await loadDb()).cohorts[0]!;
    await ok('saveCohortPlan', { cohortId: 'dec26', name: co.name, cadence: 'Wednesday builds at 12:00 PM MT', previewOpens: { date: '2026-11-18', time: '12:00' }, defaultOpenTime: '12:00' });
    const shared = structuredClone(co.course!);
    shared.intro.sub = 'Hire, train and keep your AI employees.';
    // D-187 (D-10): the cohort community's link, which the learner portal's Home opens.
    shared.intro.community = 'https://www.skool.com/amplified-dec26';
    await ok('saveCohortCourse', { cohortId: 'dec26', course: shared });
    expect((await course()).course.intro.sub).toBe('Hire, train and keep your AI employees.');
    expect((await course()).course.intro.community).toBe('https://www.skool.com/amplified-dec26');
    expect((await snapshot()).cohorts[0]).toMatchObject({ cadence: 'Wednesday builds at 12:00 PM MT', previewOpensAt: Date.parse('2026-11-18T12:00:00-07:00'), defaultOpenTime: '12:00' });
    expect(await auditActions()).toEqual(['cohort.save', 'cohort.course_save']);
  });

  it('a copy string, the Utah Life line included', { timeout: 120_000 }, async () => {
    await ok('saveCopyString', { key: 'locked.utah_life', value: 'Not included with Utah Life access', audience: 'learner' });
    await ok('saveCopyString', { key: 'schedule.subtitle', value: 'Every live session, in Mountain Time.', audience: 'learner' });
    // By key, with the two strings D-175 seeds (a locked week's opening, the preview line) as they were.
    expect((await snapshot()).copy).toEqual([
      SEED_COPY.find((c) => c.key === 'course.prelaunch'),
      SEED_COPY.find((c) => c.key === 'locked.opens'),
      { key: 'locked.utah_life', value: 'Not included with Utah Life access', audience: 'learner' },
      { key: 'schedule.subtitle', value: 'Every live session, in Mountain Time.', audience: 'learner' },
    ]);
    expect(await auditActions()).toEqual(['copy.save', 'copy.save']);
  });

  it('a kit item’s week, step, kind, visibility and platform', { timeout: 120_000 }, async () => {
    const before = await loadDb();
    const after = structuredClone(before);
    after.resources.push({ id: 'r_kit', title: 'Ready Check prompt', desc: 'Paste it into a new chat.', cat: 'Prompts', type: 'TXT', tier: 'agent', size: '2 KB', dl: 0, updated: NOW, exec: false, status: 'published' });
    await persistDiff(await testDatabase(), before, after);
    await ok('editResource', { id: 'r_kit', title: 'Ready Check prompt', desc: 'Paste it into a new chat.', cat: 'Prompts', tier: 'agent', module: ACCELERATOR_MODULE_IDS[0], kit: { kind: 'prompt', stepId: 'c4', visibility: 'open_in_preview', platform: 'chatgpt' } });
    expect((await snapshot()).resources.find((r) => r.id === 'r_kit')).toMatchObject({ module: ACCELERATOR_MODULE_IDS[0], kind: 'prompt', stepId: 'c4', visibility: 'open_in_preview', platform: 'chatgpt' });
  });
});

describe('the copy rules hold on the server too @course-builder', () => {
  it('a changed string that breaks one is the inline 422, naming where; nothing written, no row', { timeout: 120_000 }, async () => {
    const before = await loadDb();
    const draft = structuredClone(before.modules.find((m) => m.id === W2)!);
    draft.course!.question = 'Which sources pay—and which don’t?';
    const res = await act('saveBuilderModule', { draft });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'Question: Use a comma, a colon or a period instead of an em dash.' });
    expect(await loadDb()).toEqual(before);
    expect(await auditActions()).toEqual([]);
  });

  // D-188: a video block in a step's Claude and ChatGPT paths and in the week's Media.
  it('saves a video block, uploaded or a link, in both paths and in Media, and the course sends it', { timeout: 120_000 }, async () => {
    const draft = structuredClone((await loadDb()).modules.find((m) => m.id === W2)!);
    const upload = { type: 'video' as const, source: { upload: 'uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000001.mp4', name: 'Week 2 build.mp4', size: 1000, type: 'video/mp4' as const }, title: 'Watch the build' };
    const link = { type: 'video' as const, source: { url: 'https://www.youtube.com/watch?v=abc' } };
    draft.checklist[0]!.paths = { claude: { blocks: [{ type: 'text', text: 'First, watch.' }, upload] }, chatgpt: { blocks: [link] } };
    draft.course!.media = [...draft.course!.media, { type: 'video', source: { url: 'https://cdn.example.test/w2.m3u8' }, title: 'Recap' }];
    await ok('saveBuilderModule', { draft });
    const week = (await course()).course.weeks.find((w) => w.week === 2)!;
    expect(week.module.checklist[0]!.paths).toEqual({ claude: { blocks: [{ type: 'text', text: 'First, watch.' }, upload] }, chatgpt: { blocks: [link] } });
    expect(week.media.at(-1)).toEqual({ type: 'video', source: { url: 'https://cdn.example.test/w2.m3u8' }, title: 'Recap' });
    expect((await auditActions()).at(-1)).toBe('module.save');
  });

  it('refuses a video that isn’t an http(s) link, and a title that breaks a copy rule, inline; nothing written', { timeout: 120_000 }, async () => {
    const before = await loadDb();
    const draft = structuredClone(before.modules.find((m) => m.id === W2)!);
    draft.checklist[1]!.paths = { claude: { blocks: [{ type: 'video', source: { url: 'javascript:alert(1)' } }] } };
    let res = await act('saveBuilderModule', { draft });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'Step 2, Claude path, block 1: Use an http or https link for a video, or upload an mp4.' });
    draft.checklist[1]!.paths = { claude: { blocks: [{ type: 'video', source: { url: 'https://example.test/a.mp4' }, title: 'Watch this—now' }] } };
    res = await act('saveBuilderModule', { draft });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toEqual({ error: 'Step 2, Claude path, block 1: Use a comma, a colon or a period instead of an em dash.' });
    expect(await loadDb()).toEqual(before);
    expect(await auditActions()).toEqual([]);
    // An upload whose key the upload route would never mint is a 400, not a save.
    draft.checklist[1]!.paths = { claude: { blocks: [{ type: 'video', source: { upload: 'modules/marketing/x.mp4', name: 'x.mp4', size: 1, type: 'video/mp4' } }] } };
    expect((await act('saveBuilderModule', { draft })).statusCode).toBe(400);
  });

  it('a malformed body is a 400 before anything runs', { timeout: 120_000 }, async () => {
    const res = await act('saveSession', { cohortId: 'dec26', moduleId: W2, kind: 'webinar', title: 'x', date: '2026-12-11', time: '12:00', mins: 60, zoom: '', replayVisibility: null });
    expect(res.statusCode).toBe(400);
    expect((await act('saveCopyString', { key: 'a.b', value: 'x', audience: 'learner', extra: 1 })).statusCode).toBe(400);
  });
});
