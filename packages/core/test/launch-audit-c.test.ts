// D-248, the Week 0 launch audit's H-10, H-13 and H-14: two people editing one intake or stack card both keep their
// answers (a clash is refused), a session the builder adds belongs to the week it names, and the course roster is
// read at a session's start so the first live build's reminders go out.
import { describe, expect, it } from 'vitest';
import { WEEK0_INTAKE } from '../seed/intake-v1';
import { WEEK0_STACK } from '../seed/stack-v1';
import { seedProduction } from '../seed/curriculum';
import { applyIntakeChanges, intakeEdit, mergeIntakeEdit, sameIntakeAnswer } from '../src/intake';
import type { IntakeAnswers } from '../src/intake';
import { mergeStackEdit, prefillStack, stackEdit } from '../src/stack';
import { COURSE_OPENS_AT, acceleratorModuleId, courseRoster } from '../src/accelerator';
import type { AcceleratorPlan } from '../src/accelerator';
import { courseSessions } from '../src/course';
import { moduleForSession } from '../src/sessions';
import type { Db, Session } from '../src/types';

const PICKS = { sections: [{ title: 'Tools', questions: [{ id: 'tools', label: 'Your tools.', kind: 'multi' as const, options: ['A', 'B', 'C'] }] }] };

describe('H-10: an intake save sends only what changed, and the server merges it', () => {
  it('sends the questions that changed, each with the answer it was', () => {
    const base: IntakeAnswers = { name: 'Dana', ai: 'Claude' };
    const edit = intakeEdit(WEEK0_INTAKE, base, { name: 'Dana Lee ', ai: 'Claude', team: 'Lee Group', extra: 'no' });
    expect(edit).toEqual({ changes: { name: 'Dana Lee', team: 'Lee Group' }, base: { name: 'Dana', team: null } });
    // Clearing an answer is a change to nothing.
    expect(intakeEdit(WEEK0_INTAKE, base, { name: 'Dana', ai: '' })).toEqual({ changes: { ai: null }, base: { ai: 'Claude' } });
    // Typing the same answer back is no change, and choices in another order are the same choices.
    expect(intakeEdit(WEEK0_INTAKE, base, { name: ' Dana', ai: 'Claude' }).changes).toEqual({});
    expect(intakeEdit(PICKS, { tools: ['A', 'B'] }, { tools: ['B', 'A'] }).changes).toEqual({});
    expect(intakeEdit(PICKS, { tools: ['A', 'B'] }, { tools: ['A'] })).toEqual({ changes: { tools: ['A'] }, base: { tools: ['A', 'B'] } });
  });

  it('keeps both people’s answers when they change different questions', () => {
    // The owner and the operator both loaded { name: 'Dana' }. The operator saved first.
    const stored: IntakeAnswers = { name: 'Dana', ai: 'ChatGPT' };
    const owner = intakeEdit(WEEK0_INTAKE, { name: 'Dana' }, { name: 'Dana', team: 'Lee Group' });
    const out = mergeIntakeEdit(WEEK0_INTAKE, stored, owner.changes, owner.base);
    expect(out).toEqual({ answers: { name: 'Dana', ai: 'ChatGPT', team: 'Lee Group' }, conflicts: [] });
  });

  it('refuses a question someone else changed since this browser read it', () => {
    const stored: IntakeAnswers = { name: 'Dana Lee' };
    const stale = intakeEdit(WEEK0_INTAKE, { name: 'Dana' }, { name: 'Dana L.', team: 'Lee Group' });
    expect(mergeIntakeEdit(WEEK0_INTAKE, stored, stale.changes, stale.base).conflicts).toEqual(['name']);
    // Both typed the same answer: nothing to refuse.
    const same = intakeEdit(WEEK0_INTAKE, { name: 'Dana' }, { name: 'Dana Lee' });
    expect(mergeIntakeEdit(WEEK0_INTAKE, stored, same.changes, same.base).conflicts).toEqual([]);
    // A change sent with no base reads as "was empty": a stored answer is never overwritten blind.
    expect(mergeIntakeEdit(WEEK0_INTAKE, stored, { name: 'X' }, undefined).conflicts).toEqual(['name']);
  });

  it('drops what the form doesn’t ask, and clears a question on null', () => {
    const out = mergeIntakeEdit(WEEK0_INTAKE, { name: 'Dana', ai: 'Claude', old: 'x' }, { ai: null, nope: 'y' }, { ai: 'Claude' });
    expect(out).toEqual({ answers: { name: 'Dana' }, conflicts: [] });
    expect(applyIntakeChanges({ a: '1', b: '2' }, { a: null, c: '3' })).toEqual({ b: '2', c: '3' });
    expect(sameIntakeAnswer(undefined, '')).toBe(true);
    expect(sameIntakeAnswer(['a'], 'a')).toBe(false);
  });
});

describe('H-10: the stack card merges the rows that changed', () => {
  const loaded = prefillStack(WEEK0_STACK, { books: 'QuickBooks Online' });

  it('sends only the changed rows, and keeps a teammate’s other rows', () => {
    const mine = loaded.map((r) => (r.source === 'Books' ? { ...r, who: 'Sam' } : r));
    const edit = stackEdit(loaded, mine);
    expect(Object.keys(edit.changes)).toEqual(['Books']);
    // A teammate filled in Leads since this browser loaded the card.
    const stored = loaded.map((r) => (r.source === 'Leads and follow-up' ? { ...r, tool: 'Follow Up Boss' } : r));
    const out = mergeStackEdit(WEEK0_STACK, stored, edit.changes, edit.base);
    expect(out.conflicts).toEqual([]);
    expect(out.rows.find((r) => r.source === 'Books')!.who).toBe('Sam');
    expect(out.rows.find((r) => r.source === 'Leads and follow-up')!.tool).toBe('Follow Up Boss');
  });

  it('refuses a row someone else changed, and still refuses a secret', () => {
    const mine = loaded.map((r) => (r.source === 'Books' ? { ...r, tool: 'Xero' } : r));
    const edit = stackEdit(loaded, mine);
    const stored = loaded.map((r) => (r.source === 'Books' ? { ...r, tool: 'FreshBooks' } : r));
    expect(mergeStackEdit(WEEK0_STACK, stored, edit.changes, edit.base).conflicts).toEqual(['Books']);
    const secret = stackEdit(loaded, loaded.map((r) => (r.source === 'Books' ? { ...r, who: 'my password' } : r)));
    expect(mergeStackEdit(WEEK0_STACK, loaded, secret.changes, secret.base).secret).toBe(true);
  });
});

describe('H-13: a session belongs to the week the builder gave it', () => {
  const db = (): Db => seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  const added = (d: Db, moduleId: string): Session => {
    const n = Math.max(...d.sessions.filter((s) => s.cohortId === 'dec26').map((s) => s.n)) + 1;
    const s: Session = { id: 's_new', cohortId: 'dec26', n, title: 'Week 0 Setup Session', start: Date.parse('2026-11-25T18:00:00Z'), mins: 60, zoom: 'https://zoom.example/x', live: false, attended: null, replay: null, views: 0, kind: 'setup', moduleId };
    d.sessions.push(s);
    return s;
  };

  it('reads moduleId first: a builder session with the next n belongs to its week, and shows in the course', () => {
    const d = db();
    const s = added(d, acceleratorModuleId(0));
    expect(moduleForSession(d, s)!.id).toBe('accelerator-week-0');
    const row = courseSessions(d).find((r) => r.id === 's_new');
    expect(row).toMatchObject({ week: 0, type: 'setup', title: 'Week 0 Setup Session' });
    const w1 = added(d, acceleratorModuleId(1));
    expect(moduleForSession(d, w1)!.id).toBe('accelerator-week-1');
  });

  it('a draft week is no one’s, and a moduleId naming nothing falls back to the n rule', () => {
    const d = db();
    const s = added(d, acceleratorModuleId(3));
    d.modules.find((m) => m.id === 'accelerator-week-3')!.status = 'draft';
    expect(moduleForSession(d, s)).toBeNull();
    const build = d.sessions.find((x) => x.id === 'dec26-s1')!;
    expect(moduleForSession(d, { ...build, moduleId: 'gone' })!.id).toBe(moduleForSession(d, { id: build.id, n: build.n })!.id);
  });

  it('changes nothing for the seeded sessions: the same module and the same course rows as the n rule', () => {
    const d = db();
    const bare: Db = { ...d, sessions: d.sessions.map(({ moduleId: _m, ...s }) => s) };
    for (const s of d.sessions) expect(moduleForSession(d, s)?.id).toBe(moduleForSession(bare, { id: s.id, n: s.n })?.id);
    expect(courseSessions(d)).toEqual(courseSessions(bare));
  });
});

describe('H-14: the course roster is read at the session, not the tick', () => {
  const buyer: AcceleratorPlan = { kind: 'cohort', option: 'full', status: 'active', startsAt: COURSE_OPENS_AT };
  const insider: AcceleratorPlan = { kind: 'insiders', option: 'year', status: 'active', startsAt: null };
  const roster = courseRoster(
    new Map([
      ['t_buyer', [buyer]],
      ['t_insider', [insider]],
      ['t_refund', [{ ...buyer, status: 'ended' }]],
    ]),
    new Map<string, string | null>([
      ['u_buyer', 't_buyer'],
      ['u_op', 't_buyer'],
      ['u_insider', 't_insider'],
      ['u_refund', 't_refund'],
      ['u_none', null],
    ]),
  );
  // Tue Dec 1, 12:00 PM MT: the 24-hour reminder for Wed Dec 2's 12:00 PM MT build is due.
  const DEC1_NOON_MT = Date.parse('2026-12-01T12:00:00-07:00');

  it('is empty at Dec 1 noon MT, and holds the buyer and their operator at the build’s start', () => {
    expect(['u_buyer', 'u_op'].some((u) => roster.has(u, DEC1_NOON_MT))).toBe(false);
    expect(roster.has('u_buyer', COURSE_OPENS_AT)).toBe(true);
    expect(roster.has('u_op', COURSE_OPENS_AT)).toBe(true);
    expect(roster.has('u_insider', COURSE_OPENS_AT)).toBe(false);
    expect(roster.has('u_refund', COURSE_OPENS_AT)).toBe(false);
    expect(roster.has('u_none', COURSE_OPENS_AT)).toBe(false);
    expect(roster.has('u_unknown', COURSE_OPENS_AT)).toBe(false);
  });
});
