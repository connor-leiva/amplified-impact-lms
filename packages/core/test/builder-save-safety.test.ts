// D-246: the Module Builder's save made safe for an open week (the launch audit's H-5, H-6 and H-8), and
// the learner emails' rules and toasts (H-9). Pure: the API runs the same functions
// (apps/api/test/builder-save-safety.test.ts, apps/api/test/learner-email.test.ts).
import { describe, expect, it } from 'vitest';
import {
  LEARNER_EMAIL_COPY,
  MutationError,
  addStep,
  canonicalJson,
  learnerEmailToast,
  moduleVersion,
  newlySentWithEmail,
  nudgeTarget,
  publishNeededMessage,
  removeStep,
  resendInviteTarget,
  saveBuilderModule,
  sendNowToast,
  staleSaveMessage,
  usedStepIds,
} from '../src';
import type { AIEmployee, Actor, Ctx, Db, Learner, Resource } from '../src';
import { ACCELERATOR_MODULE_IDS } from '../src/accelerator';
import { seedProduction } from '../seed/curriculum';

const NOW = Date.parse('2026-11-25T10:00:00-07:00');
const mkCtx = (): Ctx => {
  let n = 1;
  return { now: NOW, id: (p: string) => `${p}_test_${n++}` };
};
const OWNER: Actor = { kind: 'staff', staffId: 'st_owner' };
const EDITOR: Actor = { kind: 'staff', staffId: 'st_editor' };
const SUPPORT: Actor = { kind: 'staff', staffId: 'st_support' };
const W0 = ACCELERATOR_MODULE_IDS[0]!;

const learner = (id: string, over: Partial<Learner> = {}): Learner => ({
  id,
  name: `${id} Learner`,
  email: `${id}@example.test`,
  tier: 'team',
  role: 'Sales Agent',
  teamId: 'team_a',
  cohortId: 'accelerator',
  joined: NOW - 86400000,
  last: null,
  status: 'active',
  progress: {},
  ...over,
});

const kit = (id: string, stepId: string): Resource => ({
  id,
  title: `Kit ${id}`,
  desc: 'A kit file.',
  cat: 'Lead Generation Scripts',
  type: 'PDF guide',
  tier: 'agent',
  size: '1 KB',
  dl: 0,
  updated: NOW,
  exec: false,
  status: 'published',
  module: W0,
  kind: 'file',
  stepId,
});

/**
 * Production's course with a team, two learners with checks on Week 0's steps 2, 3 and 5, a remembered
 * accordion on step 3, and kit files on steps 2 and 3. The staff are an Owner, a Content Editor and Support
 * (the seeded roles' own permissions, untouched).
 */
const world = (): Db => {
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  db.staff.push({ id: 'st_editor', name: 'Erin Editor', email: 'erin@example.test', role: 'Content Editor', last: null });
  db.staff.push({ id: 'st_support', name: 'Sam Support', email: 'sam@example.test', role: 'Support', last: null });
  db.teams.push({ id: 'team_a', name: 'Team A', ownerId: 'u_owner', seats: 5 });
  db.users.push(
    learner('u_owner', { role: 'Team Owner' }),
    learner('u_ana', {
      progress: { [W0]: { steps: ['c2', 'c3'], builtAt: null, deployedAt: null, runtime: null } },
      checks: [
        { moduleId: W0, stepId: 'c2', itemId: 'watch', checked: true, checkedAt: NOW, auto: false },
        { moduleId: W0, stepId: 'c3', itemId: 'brain', checked: true, checkedAt: NOW, auto: false },
        { moduleId: W0, stepId: 'c5', itemId: 'pack', checked: true, checkedAt: NOW, auto: false },
      ],
      coursePrefs: [{ key: `acc:${W0}:c3:0`, value: '1', updatedAt: NOW }],
    }),
    learner('u_ben', { status: 'invited', joined: 0 }),
  );
  db.resources.push(kit('k2', 'c2'), kit('k3', 'c3'));
  // Eight steps, so a published week can lose one and still have the six titled steps publishing needs.
  const w0 = db.modules.find((m) => m.id === W0)!;
  w0.checklist.push({ ...w0.checklist[5]!, id: 'c7', ch: 'Step Seven' }, { ...w0.checklist[5]!, id: 'c8', ch: 'Step Eight' });
  return db;
};

const week = (db: Db): AIEmployee => db.modules.find((m) => m.id === W0)!;
const titles = (m: AIEmployee) => m.checklist.map((s) => s.ch);
const save = (db: Db, draft: AIEmployee, a: Actor = OWNER, base?: string | null) =>
  saveBuilderModule(db, a, { draft, ...(base === undefined ? {} : { base }) }, mkCtx());
const ana = (db: Db) => db.users.find((u) => u.id === 'u_ana')!;

describe('H-5: a save keeps every step’s id, so learners’ checks, prefs and kit files stay put', () => {
  it('remove: the removed step’s id goes from progress and from its kit file; later steps keep theirs', () => {
    const db = world();
    const before = week(db);
    const draft = { ...structuredClone(before), checklist: removeStep(before.checklist, 1) }; // remove step 2 (c2)
    const out = save(db, draft);
    expect(out.error).toBeUndefined();
    const saved = week(out.db);
    expect(saved.checklist.map((s) => s.id)).toEqual(['c1', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
    expect(titles(saved)).toEqual([before.checklist[0]!.ch, ...before.checklist.slice(2).map((s) => s.ch)]);
    // Step 3's check, its accordion and its kit file are still on step 3 (now in second place).
    expect(ana(out.db).checks).toEqual(ana(db).checks);
    expect(ana(out.db).coursePrefs).toEqual(ana(db).coursePrefs);
    expect(ana(out.db).progress[W0]!.steps).toEqual(['c3']);
    expect(out.db.resources.find((r) => r.id === 'k3')!.stepId).toBe('c3');
    // Step 2's kit file has no step now, so it can be given another one; the audit row counts it.
    expect(out.db.resources.find((r) => r.id === 'k2')!.stepId).toBeUndefined();
    expect(out.audit!.after).toMatchObject({ steps: 7, stepChanges: { added: 0, removed: 1, reordered: false }, kitCleared: 1 });
  });

  it('reorder: each id moves with its step; nothing of a learner’s changes', () => {
    const db = world();
    const before = week(db);
    const draft = structuredClone(before);
    [draft.checklist[1], draft.checklist[2]] = [draft.checklist[2]!, draft.checklist[1]!]; // swap steps 2 and 3
    const out = save(db, draft);
    expect(out.error).toBeUndefined();
    const saved = week(out.db);
    expect(saved.checklist.map((s) => s.id)).toEqual(['c1', 'c3', 'c2', 'c4', 'c5', 'c6', 'c7', 'c8']);
    expect(saved.checklist[1]!.ch).toBe(before.checklist[2]!.ch);
    expect(out.db.users).toBe(db.users);
    expect(out.db.resources).toBe(db.resources);
    expect(out.audit!.after).toMatchObject({ stepChanges: { added: 0, removed: 0, reordered: true } });
  });

  it('insert: a new step gets an id past every id anyone still names, so no old check attaches to it', () => {
    const db = world();
    // An earlier save removed a step c9 that a learner had checked: the check is still stored.
    ana(db).checks!.push({ moduleId: W0, stepId: 'c9', itemId: 'old', checked: true, checkedAt: NOW, auto: false });
    expect([...usedStepIds(db, W0)].sort()).toEqual(['c2', 'c3', 'c5', 'c9']);
    const before = week(db);
    const added = addStep(before.checklist);
    const fresh = added.pop()!;
    const draft = { ...structuredClone(before), checklist: [added[0]!, fresh, ...added.slice(1)] }; // insert at step 2
    const out = save(db, draft);
    expect(out.error).toBeUndefined();
    const saved = week(out.db);
    expect(saved.checklist.map((s) => s.id)).toEqual(['c1', 'c10', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
    expect(saved.checklist[1]!.text).toBe('New step');
    expect(ana(out.db).checks).toEqual(ana(db).checks);
    expect(out.db.users).toBe(db.users);
    expect(out.db.resources.find((r) => r.id === 'k2')!.stepId).toBe('c2');
    expect(out.saved!.stepIds).toEqual(['c1', 'c10', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
  });

  it('saving the saved draft again changes nothing (the ids are the stored ones)', () => {
    const db = world();
    const draft = { ...structuredClone(week(db)), checklist: removeStep(week(db).checklist, 1) };
    const first = save(db, draft);
    const again = save(first.db, structuredClone(week(first.db)));
    expect(week(again.db)).toEqual(week(first.db));
    expect(again.db.users).toBe(first.db.users);
    expect(again.db.resources).toBe(first.db.resources);
  });
});

describe('H-6: a base version, and a conflict when the module moved on', () => {
  it('the version is a hash of the module: equal after a round trip that drops nulls, different after a change', () => {
    const m = week(world());
    // `codec.ts` reads a null column back as an absent key, and jsonb reorders keys.
    const trip = JSON.parse(JSON.stringify({ runDemo: null, ...m, opens: null })) as AIEmployee;
    delete (trip as Partial<AIEmployee>).opens;
    const plain = { ...m };
    delete (plain as Partial<AIEmployee>).opens;
    expect(moduleVersion(plain)).toBe(moduleVersion({ ...m, opens: null }));
    expect(moduleVersion(trip)).toBe(moduleVersion(m));
    expect(moduleVersion({ ...m, name: `${m.name}!` })).not.toBe(moduleVersion(m));
    expect(moduleVersion(m)).toMatch(/^[0-9a-f]{16}$/);
    expect(canonicalJson({ b: 1, a: [null, { d: null, c: 'x' }] })).toBe('{"a":[null,{"c":"x"}],"b":1}');
  });

  it('saves with the current base and answers the next base; a stale base refuses and writes nothing', () => {
    const db = world();
    const base = moduleVersion(week(db));
    const draft = { ...structuredClone(week(db)), checklist: removeStep(week(db).checklist, 1) };
    const first = save(db, draft, OWNER, base);
    expect(first.error).toBeUndefined();
    expect(first.saved!.version).toBe(moduleVersion(week(first.db)));
    // The same request again (a double click, a retry): its base is stale now, so nothing re-applies.
    let thrown: unknown;
    try {
      save(first.db, draft, OWNER, base);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(MutationError);
    expect((thrown as MutationError).code).toBe('conflict');
    expect((thrown as MutationError).message).toBe(staleSaveMessage({ kind: 'week' }));
    expect(staleSaveMessage({ kind: 'week' })).toBe('Someone changed this week since you opened it. Copy your changes, reload the page, and save again.');
    // With the base it answered, the next save goes through.
    expect(save(first.db, structuredClone(week(first.db)), OWNER, first.saved!.version).error).toBeUndefined();
  });

  it('a new module’s base is null; a null base for a module that exists is stale', () => {
    const db = world();
    const draft = { ...structuredClone(week(db)), id: 'brand-new', name: 'Brand New', status: 'draft' as const };
    expect(save(db, draft, OWNER, null).error).toBeUndefined();
    expect(() => save(db, structuredClone(week(db)), OWNER, null)).toThrow(MutationError);
  });

  it('who may comes first: Support is refused before any version is compared', () => {
    const db = world();
    try {
      save(db, structuredClone(week(db)), SUPPORT, 'stale');
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as MutationError).code).toBe('forbidden');
    }
  });
});

describe('H-8: saving a Published or Scheduled week without Publish modules says so', () => {
  it('a Content Editor’s save of a published week is refused with the permission named; roles are unchanged', () => {
    const db = world();
    expect(db.perms['Content Editor']!.publish).toBe(0);
    const draft = structuredClone(week(db));
    draft.name = 'Week 0, edited';
    try {
      save(db, draft, EDITOR);
      throw new Error('expected a refusal');
    } catch (e) {
      expect(e).toBeInstanceOf(MutationError);
      expect((e as MutationError).code).toBe('forbidden');
      expect((e as MutationError).message).toBe(
        'Saving a published or scheduled week needs the “Publish modules” permission. Ask an Owner or Admin.',
      );
    }
    expect(publishNeededMessage({ kind: undefined })).toBe(
      'Saving a published or scheduled AI Employee needs the “Publish modules” permission. Ask an Owner or Admin.',
    );
    expect(() => saveBuilderModule(db, EDITOR, { draft, status: 'published' }, mkCtx())).toThrow(
      'Publishing needs the “Publish modules” permission. Ask an Owner or Admin.',
    );
  });

  it('a Content Editor may still save a draft, and an Owner may save the published week', () => {
    const db = world();
    const draft = { ...structuredClone(week(db)), status: 'draft' as const };
    expect(save(db, draft, EDITOR).error).toBeUndefined();
    expect(save(db, structuredClone(week(db)), OWNER).error).toBeUndefined();
  });
});

describe('H-9: who a learner email may go to, and what its toast says', () => {
  it('Resend Invite: staff with View learners, or the invitee’s Team Owner, to someone who hasn’t joined', () => {
    const db = world();
    expect(resendInviteTarget(db, SUPPORT, 'u_ben').id).toBe('u_ben');
    expect(resendInviteTarget(db, { kind: 'learner', userId: 'u_owner' }, 'u_ben').id).toBe('u_ben');
    expect(() => resendInviteTarget(db, { kind: 'learner', userId: 'u_ana' }, 'u_ben')).toThrow(LEARNER_EMAIL_COPY.teamOnly);
    db.users.push(learner('u_far', { status: 'invited', teamId: 'team_b' }));
    expect(() => resendInviteTarget(db, { kind: 'learner', userId: 'u_owner' }, 'u_far')).toThrow(LEARNER_EMAIL_COPY.teamOnly);
    expect(() => resendInviteTarget(db, OWNER, 'u_ana')).toThrow(LEARNER_EMAIL_COPY.notInvited);
    expect(() => resendInviteTarget(db, OWNER, 'u_none')).toThrow(MutationError);
  });

  it('Send Nudge: staff with View learners, to someone who has joined', () => {
    const db = world();
    expect(nudgeTarget(db, EDITOR, 'u_ana').id).toBe('u_ana');
    expect(() => nudgeTarget(db, OWNER, 'u_ben')).toThrow(LEARNER_EMAIL_COPY.notJoined);
    expect(() => nudgeTarget(db, { kind: 'learner', userId: 'u_owner' }, 'u_ana')).toThrow(MutationError);
  });

  it('the toasts say what happened, never a send that didn’t', () => {
    const who = { name: 'Ana Learner', email: 'ana@example.test' };
    expect(learnerEmailToast('invite', 'sent', who)).toEqual({ msg: 'Invite resent to ana@example.test', tone: 'success' });
    expect(learnerEmailToast('nudge', 'sent', who)).toEqual({ msg: 'Nudge sent to Ana Learner', tone: 'success' });
    expect(learnerEmailToast('nudge', 'off', who)).toEqual({ msg: 'Email isn’t set up on this server, so nothing was sent.', tone: 'warn' });
    expect(learnerEmailToast('invite', 'failed', who)).toEqual({ msg: 'The email didn’t send. Try again.', tone: 'warn' });
  });

  it('Send now’s email: which announcements owe one, and the toast with the count', () => {
    const db = world();
    const after = structuredClone(db);
    const base = { title: 'T', body: 'B', severity: 'info' as const, action: null, actionLabel: '', audience: 'all' as const, at: NOW, opens: 0 };
    after.announcements.unshift(
      { ...base, id: 'a_both', channels: ['inapp', 'email'], status: 'sent' },
      { ...base, id: 'a_inapp', channels: ['inapp'], status: 'sent' },
      { ...base, id: 'a_later', channels: ['email'], status: 'scheduled' },
    );
    expect(newlySentWithEmail(db, after).map((a) => a.id)).toEqual(['a_both']);
    expect(newlySentWithEmail(after, after)).toEqual([]);
    const core = { msg: 'Sent to 2 learners. The banner is live on their dashboards.', tone: 'success' as const };
    const both = { audience: 'all' as const, channels: ['inapp', 'email'] as ('inapp' | 'email')[] };
    expect(sendNowToast(core, both, { outcome: 'sent', sent: 2, failed: 0 })).toEqual({
      msg: 'Sent to 2 learners. The banner is live on their dashboards. Email sent to 2 learners.',
      tone: 'success',
    });
    expect(sendNowToast(core, both, { outcome: 'sent', sent: 1, failed: 1 }).msg).toBe(
      'Sent to 2 learners. The banner is live on their dashboards. Email sent to 1 of 2 learners. The rest didn’t send.',
    );
    expect(sendNowToast(core, both, { outcome: 'off', sent: 0, failed: 0 })).toEqual({
      msg: 'Sent to 2 learners. The banner is live on their dashboards. Email isn’t set up on this server, so no email went out.',
      tone: 'warn',
    });
    const emailOnly = { audience: 'owners' as const, channels: ['email'] as ('inapp' | 'email')[] };
    expect(sendNowToast({ msg: 'Sent to 1 team owners' }, emailOnly, { outcome: 'sent', sent: 1, failed: 0 }).msg).toBe('Email sent to 1 team owners.');
    expect(sendNowToast(undefined, emailOnly, { outcome: 'off', sent: 0, failed: 0 }).msg).toBe('Email isn’t set up on this server, so nothing was sent.');
  });
});
