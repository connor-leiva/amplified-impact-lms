// D-174: the curriculum builder's audited writes, pure. Each one: the write, what it leaves alone, the
// inline refusals (no write, no audit row), who may, and the ONE audit row with its field-diff summary.
// The API runs the same functions through `POST /api/admin/actions/:name` (apps/api/test/course-builder.test.ts).
import { describe, expect, it } from 'vitest';
import {
  AUDIT_ACTIONS,
  ADMIN_ACTIONS,
  MutationError,
  deleteSession,
  editResource,
  saveBuilderModule,
  communityUrl,
  saveCohortCourse,
  saveCohortPlan,
  saveCopyString,
  saveSession,
  zonedInputs,
  zonedInstant,
} from '../src';
import type { Actor, Ctx, Db, SessionFields } from '../src';
import { ACCELERATOR_MODULE_IDS } from '../src/accelerator';
import { seedProduction } from '../seed/curriculum';

const NOW = Date.parse('2026-11-18T10:00:00-07:00');
const mkCtx = (): Ctx => {
  let n = 1;
  return { now: NOW, id: (p: string) => `${p}_test_${n++}` };
};
const OWNER: Actor = { kind: 'staff', staffId: 'st_owner' };
const SUPPORT: Actor = { kind: 'staff', staffId: 'st_support' };
const EDITOR: Actor = { kind: 'staff', staffId: 'st_editor' };

/** The production database: the course as the seed put it, with a Support member and a Content Editor. */
const prod = (): Db => {
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  db.staff.push({ id: 'st_support', name: 'Sam Support', email: 'sam@example.test', role: 'Support', last: null });
  db.staff.push({ id: 'st_editor', name: 'Erin Editor', email: 'erin@example.test', role: 'Content Editor', last: null });
  return db;
};
const W2 = ACCELERATOR_MODULE_IDS[2]!;

const forbidden = (fn: () => unknown): void => {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(MutationError);
    expect((e as MutationError).code).toBe('forbidden');
    return;
  }
  throw new Error('expected a forbidden MutationError');
};

describe('Mountain Time, daylight saving included', () => {
  it('reads a date and a time in America/Denver as that instant, winter and summer', () => {
    expect(zonedInstant('2026-12-02', '12:00')).toBe(Date.parse('2026-12-02T12:00:00-07:00'));
    expect(zonedInstant('2027-06-02', '12:00')).toBe(Date.parse('2027-06-02T12:00:00-06:00'));
    expect(zonedInstant('2027-03-14', '12:00')).toBe(Date.parse('2027-03-14T12:00:00-06:00')); // DST starts at 2 AM
    expect(zonedInputs(Date.parse('2026-12-11T19:00:00Z'))).toEqual({ date: '2026-12-11', time: '12:00' });
    expect(Number.isNaN(zonedInstant('2026-12-2', '12:00'))).toBe(true);
    expect(Number.isNaN(zonedInstant('2026-12-02', '24:00'))).toBe(true);
  });
});

describe('the catalog (D-174)', () => {
  it('registers every builder write and audits each with an action from the closed list', () => {
    for (const name of ['saveSession', 'deleteSession', 'saveCohortPlan', 'saveCohortCourse', 'saveCopyString'] as const) expect(ADMIN_ACTIONS[name], name).toBeTypeOf('function');
    for (const a of ['session.save', 'session.delete', 'cohort.save', 'cohort.course_save', 'copy.save']) expect(AUDIT_ACTIONS as readonly string[]).toContain(a);
  });
});

describe('sessions per week (D-174)', () => {
  const fields = (over: Partial<SessionFields> = {}): SessionFields => ({
    cohortId: 'dec26',
    moduleId: W2,
    kind: 'office_hours',
    title: 'Lead Source Review Office Hours',
    date: '2026-12-11',
    time: '12:00',
    mins: 60,
    zoom: '',
    replayVisibility: null,
    ...over,
  });

  it('adds a week’s session in Mountain Time, any kind, numbered after the last', () => {
    const db = prod();
    const out = saveSession(db, OWNER, fields(), mkCtx());
    expect(out.error).toBeUndefined();
    const s = out.db.sessions.find((x) => x.id === 's_test_1')!;
    expect(s).toEqual({
      id: 's_test_1',
      cohortId: 'dec26',
      n: Math.max(...db.sessions.map((x) => x.n)) + 1,
      title: 'Lead Source Review Office Hours',
      start: Date.parse('2026-12-11T12:00:00-07:00'),
      mins: 60,
      zoom: '',
      live: false,
      attended: null,
      replay: null,
      views: 0,
      kind: 'office_hours',
      moduleId: W2,
    });
    expect(out.audit).toMatchObject({ action: 'session.save', target: { type: 'session', id: 's_test_1' }, before: null, after: { kind: 'office_hours', moduleId: W2, zoomLink: false } });
  });

  it('edits a seeded session, keeps its record, notes where it moved from and audits what changed', () => {
    const db = prod();
    const before = db.sessions.find((x) => x.id === 'dec26-oh2')!;
    const out = saveSession(db, OWNER, fields({ id: 'dec26-oh2', title: 'Lead Source Review Office Hours', replayVisibility: 'after_open' }), mkCtx());
    const s = out.db.sessions.find((x) => x.id === 'dec26-oh2')!;
    expect(s).toMatchObject({ n: before.n, title: 'Lead Source Review Office Hours', start: Date.parse('2026-12-11T12:00:00-07:00'), movedFrom: before.start, replayVisibility: 'after_open', kind: 'office_hours' });
    const after = out.audit!.after as { changed: string[] };
    expect(after.changed).toEqual(expect.arrayContaining(['start', 'title', 'replayVisibility']));
    expect(out.toast).toEqual({ msg: `Session ${before.n} saved`, tone: 'success' });
  });

  it('refuses inline, writing nothing: no title, a bad time, no length, an em dash', () => {
    const db = prod();
    expect(saveSession(db, OWNER, fields({ title: ' ' }), mkCtx())).toEqual({ db, error: 'Add a title.' });
    expect(saveSession(db, OWNER, fields({ time: '25:00' }), mkCtx())).toEqual({ db, error: 'Pick a date and a start time.' });
    expect(saveSession(db, OWNER, fields({ mins: '0' }), mkCtx())).toEqual({ db, error: 'Enter the length in minutes.' });
    expect(saveSession(db, OWNER, fields({ title: 'Office Hours—Week 2' }), mkCtx())).toEqual({ db, error: 'Title: Use a comma, a colon or a period instead of an em dash.' });
  });

  it('is the cohorts permission’s: Support and a Content Editor may not', () => {
    forbidden(() => saveSession(prod(), SUPPORT, fields(), mkCtx()));
    forbidden(() => saveSession(prod(), EDITOR, fields(), mkCtx()));
  });

  it('deletes a session that hasn’t run and no page names; keeps the rest on the record', () => {
    const added = saveSession(prod(), OWNER, fields(), mkCtx()).db;
    const out = deleteSession(added, OWNER, { id: 's_test_1' }, mkCtx());
    expect(out.db.sessions.some((x) => x.id === 's_test_1')).toBe(false);
    expect(out.audit).toMatchObject({ action: 'session.delete', target: { id: 's_test_1' }, after: null });
    // Week 2's live-build page names dec26-s2.
    expect(deleteSession(added, OWNER, { id: 'dec26-s2' }, mkCtx()).error).toMatch(/page names this session/);
    const ran = structuredClone(added);
    ran.sessions.find((x) => x.id === 's_test_1')!.attended = 9;
    expect(deleteSession(ran, OWNER, { id: 's_test_1' }, mkCtx()).error).toBe('This session has run, so it stays on the record.');
  });
});

describe('the cohort: release plan and shared pages (D-174)', () => {
  it('saves the release plan in Mountain Time and audits what changed', () => {
    const db = prod();
    const co = db.cohorts[0]!;
    const out = saveCohortPlan(db, OWNER, { cohortId: 'dec26', name: co.name, cadence: co.cadence, previewOpens: { date: '2026-11-18', time: '12:00' }, defaultOpenTime: '12:00' }, mkCtx());
    expect(out.error).toBeUndefined();
    expect(out.db.cohorts[0]).toMatchObject({ previewOpensAt: Date.parse('2026-11-18T12:00:00-07:00'), defaultOpenTime: '12:00', timezone: 'America/Denver' });
    expect(out.audit).toMatchObject({ action: 'cohort.save', target: { type: 'cohort', id: 'dec26' }, after: { changed: ['previewOpensAt'], count: 1 } });
  });

  it('never refuses a line it didn’t change, and checks one it did', () => {
    const db = prod();
    const co = db.cohorts[0]!;
    // The seeded cadence reads "1:00 PM CT": untouched, it is not what refuses a save.
    expect(saveCohortPlan(db, OWNER, { cohortId: 'dec26', name: co.name, cadence: co.cadence, previewOpens: null, defaultOpenTime: '12:00' }, mkCtx()).error).toBeUndefined();
    expect(saveCohortPlan(db, OWNER, { cohortId: 'dec26', name: co.name, cadence: 'Wednesdays at 1:00 PM CT', previewOpens: null, defaultOpenTime: '12:00' }, mkCtx()).error).toBe(
      'Cadence: Show times in Mountain Time with “MT”, like 12:00 PM MT.',
    );
    expect(saveCohortPlan(db, OWNER, { cohortId: 'dec26', name: co.name, cadence: 'Wednesdays at 12:00 PM MT', previewOpens: null, defaultOpenTime: '12:00' }, mkCtx()).error).toBeUndefined();
  });

  it('saves what every week shares, audits the paths that changed, and is the curriculum permission’s', () => {
    const db = prod();
    const course = structuredClone(db.cohorts[0]!.course!);
    course.intro.sub = 'Hire, train and keep five AI employees.';
    const out = saveCohortCourse(db, OWNER, { cohortId: 'dec26', course }, mkCtx());
    expect(out.db.cohorts[0]!.course!.intro.sub).toBe('Hire, train and keep five AI employees.');
    expect(out.audit).toEqual({ action: 'cohort.course_save', target: { type: 'cohort', id: 'dec26', label: db.cohorts[0]!.name }, after: { changed: ['intro.sub'], count: 1 } });
    forbidden(() => saveCohortCourse(prod(), SUPPORT, { cohortId: 'dec26', course }, mkCtx()));
  });

  it('D-187: the cohort community link is saved trimmed, refused unless it is a web address, and dropped when emptied @parity:D-10', () => {
    const db = prod();
    const course = structuredClone(db.cohorts[0]!.course!);
    course.intro.community = '  https://www.skool.com/amplified-dec26 ';
    const out = saveCohortCourse(db, OWNER, { cohortId: 'dec26', course }, mkCtx());
    expect(out.error).toBeUndefined();
    expect(out.db.cohorts[0]!.course!.intro.community).toBe('https://www.skool.com/amplified-dec26');
    expect(out.audit?.after).toEqual({ changed: ['intro.community'], count: 1 });
    for (const bad of ['javascript:alert(1)', 'skool.com/amplified', 'mailto:help@example.com']) {
      course.intro.community = bad;
      expect(saveCohortCourse(out.db, OWNER, { cohortId: 'dec26', course }, mkCtx()).error).toBe('A community link is a web address that starts with https://.');
    }
    course.intro.community = '';
    const cleared = saveCohortCourse(out.db, OWNER, { cohortId: 'dec26', course }, mkCtx());
    expect(cleared.db.cohorts[0]!.course!.intro).not.toHaveProperty('community');
    expect(communityUrl('https://example.com/c')).toBe('https://example.com/c');
    expect(communityUrl('ftp://example.com')).toBeNull();
    expect(communityUrl(undefined)).toBeNull();
  });
});

describe('copy strings (D-174)', () => {
  it('changes Utah Life’s lock line and adds a new key, each audited without its text', () => {
    const db = prod();
    const out = saveCopyString(db, OWNER, { key: 'locked.utah_life', value: 'Not included with your Utah Life access', audience: 'learner' }, mkCtx());
    expect(out.db.copy!.find((c) => c.key === 'locked.utah_life')).toEqual({ key: 'locked.utah_life', value: 'Not included with your Utah Life access', audience: 'learner' });
    expect(out.db.copy!.map((c) => c.key)).toEqual(db.copy!.map((c) => c.key));
    expect(out.audit).toMatchObject({ action: 'copy.save', target: { id: 'locked.utah_life' }, before: { audience: 'learner', length: 34 }, after: { length: 39, changed: ['value'] } });
    const added = saveCopyString(out.db, EDITOR, { key: 'schedule.subtitle', value: 'Every live session, in Mountain Time.', audience: 'learner' }, mkCtx());
    expect(added.db.copy!.map((c) => c.key)).toEqual([...db.copy!.map((c) => c.key), 'schedule.subtitle']);
  });

  it('refuses a bad key, an empty value, an em dash; Support may not', () => {
    const db = prod();
    expect(saveCopyString(db, OWNER, { key: 'Locked Utah', value: 'x', audience: 'learner' }, mkCtx()).error).toMatch(/dotted lower-case/);
    expect(saveCopyString(db, OWNER, { key: 'home.countdown', value: '  ', audience: 'learner' }, mkCtx()).error).toBe('Write the text.');
    expect(saveCopyString(db, OWNER, { key: 'home.countdown', value: 'Soon—really', audience: 'learner' }, mkCtx()).error).toMatch(/em dash/);
    forbidden(() => saveCopyString(db, SUPPORT, { key: 'home.countdown', value: 'Soon', audience: 'learner' }, mkCtx()));
  });
});

describe('the Module Builder’s save, on a course week (D-174)', () => {
  it('refuses a changed string that breaks a copy rule, naming where, and writes nothing', () => {
    const db = prod();
    const draft = structuredClone(db.modules.find((m) => m.id === W2)!);
    draft.course!.question = 'Which sources pay—and which don’t?';
    draft.checklist[0]!.doneWhen = 'Your brief runs at 7:00 AM.';
    draft.outcome = 'Sends your owner a morning brief.';
    const out = saveBuilderModule(db, OWNER, { draft }, mkCtx());
    expect(out.db).toBe(db);
    expect(out.audit).toBeUndefined();
    expect(out.error!.split('\n')).toEqual([
      'Summary: Hire copy can’t say the hire sends, posts, updates the CRM or touches the books.',
      'Step 1, done when: Show times in Mountain Time with “MT”, like 12:00 PM MT.',
      'Question: Use a comma, a colon or a period instead of an em dash.',
    ]);
  });

  it('saves a clean edit to the week’s words, steps and cards, with the paths in its audit row', () => {
    const db = prod();
    const draft = structuredClone(db.modules.find((m) => m.id === W2)!);
    draft.course!.question = 'Which lead sources pay?';
    draft.course!.seatCard = { seat: 'Lead Desk Monitor', reportsTo: 'Owner', runs: 'Every Monday', pulls: 'Lead sources', applies: 'Your rules', produces: 'A source report', tookOver: 'The Monday tally', cantDo: 'Send email or post anywhere' };
    draft.checklist[1]!.who = 'Operator';
    const out = saveBuilderModule(db, OWNER, { draft }, mkCtx());
    expect(out.error).toBeUndefined();
    const saved = out.db.modules.find((m) => m.id === W2)!;
    expect(saved.course!.seatCard!.cantDo).toBe('Send email or post anywhere');
    expect((out.audit!.after as { changed: string[] }).changed).toEqual(['checklist[1].who', 'course.question', 'course.seatCard']);
  });

  it('never refuses over a line nobody touched', () => {
    const db = prod();
    // A line from before the rules, already in the database.
    db.modules.find((m) => m.id === W2)!.course!.why[0] = 'Old copy—with an em dash.';
    const draft = structuredClone(db.modules.find((m) => m.id === W2)!);
    draft.name = 'Leads That Pay';
    expect(saveBuilderModule(db, OWNER, { draft }, mkCtx()).error).toBeUndefined();
  });
});

describe('a kit item’s place in its week (D-174)', () => {
  const withResource = (): Db => {
    const db = prod();
    db.resources.push({ id: 'r_kit', title: 'Ready Check prompt', desc: 'Paste it into a new chat.', cat: 'Prompts', type: 'TXT', tier: 'agent', size: '2 KB', dl: 0, updated: NOW, exec: false, status: 'published' });
    return db;
  };
  const edit = (kit: Parameters<typeof editResource>[2]['kit']) => ({ id: 'r_kit', title: 'Ready Check prompt', desc: 'Paste it into a new chat.', cat: 'Prompts', tier: 'agent' as const, module: ACCELERATOR_MODULE_IDS[0]!, ...(kit ? { kit } : {}) });

  it('sets what it is, its step, who sees it and when, and its platform; audited with the kit', () => {
    const out = editResource(withResource(), OWNER, edit({ kind: 'prompt', stepId: 'c4', visibility: 'open_in_preview', platform: 'claude' }), mkCtx());
    expect(out.db.resources.find((r) => r.id === 'r_kit')).toMatchObject({ module: ACCELERATOR_MODULE_IDS[0], kind: 'prompt', stepId: 'c4', visibility: 'open_in_preview', platform: 'claude' });
    expect(out.audit).toMatchObject({ before: { kit: { kind: null, stepId: null } }, after: { kit: { kind: 'prompt', stepId: 'c4', visibility: 'open_in_preview', platform: 'claude' } } });
  });

  it('clears a field with null, and a step must be one of its week’s', () => {
    const set = editResource(withResource(), OWNER, edit({ kind: 'prompt', stepId: 'c4', visibility: 'published', platform: 'both' }), mkCtx()).db;
    const cleared = editResource(set, OWNER, edit({ kind: 'prompt', stepId: null, visibility: null, platform: null }), mkCtx()).db.resources.find((r) => r.id === 'r_kit')!;
    expect(['stepId' in cleared, 'visibility' in cleared, 'platform' in cleared]).toEqual([false, false, false]);
    expect(() => editResource(withResource(), OWNER, edit({ kind: 'prompt', stepId: 'c99', visibility: null, platform: null }), mkCtx())).toThrow(MutationError);
    expect(editResource(withResource(), OWNER, { ...edit({ kind: 'prompt', stepId: 'c4', visibility: null, platform: null }), module: null }, mkCtx()).error).toBe('Attach it to a week before you pick a step.');
  });

  it('leaves the kit alone, and its audit row as D-172 wrote it, when Edit details sends none', () => {
    const out = editResource(withResource(), OWNER, edit(undefined), mkCtx());
    expect(out.audit!.after).not.toHaveProperty('kit');
  });
});
