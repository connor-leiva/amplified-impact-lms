// D-172 R2-gaps: the audited Build actions beside the reference-ported mutations. Each one is checked
// for who may run it (the existing `PermKey` rule), what it writes, what it leaves alone, its toast and
// its ONE audit row. Typed out by hand, so a changed rule or word is a red test.
import { describe, expect, it } from 'vitest';
import {
  ADMIN_ACTIONS,
  AUDIT_ACTIONS,
  AUDIT_ACTION_GROUPS,
  MutationError,
  NEW_STEP,
  addSession,
  addStep,
  attachReplay,
  copyName,
  duplicateAnnouncement,
  duplicateModule,
  duplicateStep,
  editResource,
  freshStepId,
  isAdminActionName,
  isReplayUrl,
  removeStep,
  saveAnnouncementDraft,
  saveBuilderModule,
  scopeSnapshot,
  seed,
  stepChanges,
  stepIdMap,
  updateAnnouncement,
} from '../src';
import type { Actor, Ctx, Db, Step } from '../src';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');
const mkCtx = (): Ctx => {
  let n = 1;
  return { now: NOW, id: (p: string) => `${p}_test_${n++}` };
};
const staff = (staffId: string): Actor => ({ kind: 'staff', staffId });
const OWNER = staff('st1');
const SUPPORT = staff('st4'); // curriculum: 0, cohorts: 0, announce: 0
const EDITOR = staff('st3'); // Content Editor: curriculum 1, cohorts 0, announce 0
const JAMIE: Actor = { kind: 'learner', userId: 'u_jamie' };
const fresh = (): Db => seed('live');

const step = (id: string, text = id): Step => ({ id, text, ch: '', mins: 3, t: 0, hint: '' });

describe('the catalog (D-172)', () => {
  it('names each action and audits it with an action from the closed list', () => {
    expect(Object.keys(ADMIN_ACTIONS)).toEqual(expect.arrayContaining(['duplicateModule', 'saveBuilderModule']));
    expect(isAdminActionName('duplicateModule')).toBe(true);
    expect(isAdminActionName('toString')).toBe(false);
    expect(isAdminActionName('publishModule')).toBe(false);
    expect(AUDIT_ACTIONS).toEqual(expect.arrayContaining(['module.duplicate', 'module.save']));
  });
});

describe('Curriculum › Duplicate (duplicateModule)', () => {
  it('copies the AI Employee as a draft, last, with every step and setting, and one audit row', () => {
    const db = fresh();
    const m = db.modules.find((x) => x.id === 'sales')!;
    const out = duplicateModule(db, OWNER, { id: 'sales' }, mkCtx());
    expect(out.error).toBeUndefined();
    expect(out.db.modules).toHaveLength(db.modules.length + 1);
    const copy = out.db.modules.at(-1)!;
    expect(copy.id).toBe('m_test_1');
    expect(copy.name).toBe('Sales AI Employee (copy)');
    expect(copy.status).toBe('draft');
    expect(copy.opens).toBeNull();
    expect(copy.order).toBe(Math.max(...db.modules.map((x) => x.order)) + 1);
    // Everything else is the original's, and shares nothing with it.
    const { id: _a, name: _b, status: _c, opens: _d, order: _e, ...rest } = copy;
    const { id: _f, name: _g, status: _h, opens: _i, order: _j, ...orig } = m;
    expect(rest).toEqual(orig);
    expect(copy.checklist).not.toBe(m.checklist);
    // The original is untouched, and so is everything else.
    expect(out.db.modules.find((x) => x.id === 'sales')).toEqual(m);
    expect(out.db.users).toBe(db.users);
    expect(out.toast).toEqual({ msg: 'Duplicated as a draft', tone: 'success' });
    expect(out.audit).toEqual({
      action: 'module.duplicate',
      target: { type: 'module', id: 'm_test_1', label: 'Sales AI Employee (copy)' },
      before: { from: 'sales', name: 'Sales AI Employee', status: m.status },
      after: { id: 'm_test_1', name: 'Sales AI Employee (copy)', status: 'draft', tier: m.tier, steps: 6, files: m.files.length },
    });
    expect(copyName('X')).toBe('X (copy)');
  });

  it('needs the curriculum permission, and an AI Employee that exists', () => {
    const db = fresh();
    expect(() => duplicateModule(db, SUPPORT, { id: 'sales' }, mkCtx())).toThrow(MutationError);
    expect(() => duplicateModule(db, JAMIE, { id: 'sales' }, mkCtx())).toThrow('You don’t have permission to do that.');
    expect(() => duplicateModule(db, OWNER, { id: 'nope' }, mkCtx())).toThrow('No AI Employee nope');
  });
});

describe('Module Builder: the draft’s step helpers', () => {
  const list = [step('c1'), step('c2'), step('c3')];

  it('Add step appends the mockup’s new step with an id no step has', () => {
    const next = addStep(list);
    expect(next).toHaveLength(4);
    expect(next[3]).toEqual({ id: 'new-1', ...NEW_STEP });
    expect(NEW_STEP).toEqual({ text: 'New step', ch: '', mins: 5, t: 0, hint: '', kind: 'Build' });
    expect(addStep(next)[4]!.id).toBe('new-2');
    expect(freshStepId([step('new-1'), step('new-3')])).toBe('new-2');
    expect(list).toHaveLength(3);
  });

  it('Duplicate step appends a copy of that step, last, with its own id', () => {
    const next = duplicateStep(list, 1);
    expect(next.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'new-1']);
    expect(next[3]).toEqual({ ...list[1], id: 'new-1' });
    expect(duplicateStep(list, 9)).toEqual(list);
  });

  it('Remove step takes that step out and keeps the order', () => {
    expect(removeStep(list, 1).map((s) => s.id)).toEqual(['c1', 'c3']);
    expect(removeStep(list, 9)).toEqual(list);
  });

  it('a save maps each kept step to its new place, and counts the changes', () => {
    const draft = [step('c3'), step('c1'), step('new-1'), step('c1')];
    expect([...stepIdMap(list, draft)]).toEqual([
      ['c3', 'c1'],
      ['c1', 'c2'],
    ]);
    expect(stepChanges(list, draft)).toEqual({ added: 2, removed: 1, reordered: true });
    expect(stepChanges(list, list)).toEqual({ added: 0, removed: 0, reordered: false });
    expect(stepChanges([], [step('new-1')])).toEqual({ added: 1, removed: 0, reordered: false });
  });
});

describe('Module Builder › Save (saveBuilderModule)', () => {
  it('saves through saveModule, keeps learners’ checks on the same steps, and writes one audit row', () => {
    const db = fresh();
    const sales = db.modules.find((x) => x.id === 'sales')!;
    // Jamie has Sales at 3 of 6: c1, c2, c3.
    expect(db.users.find((u) => u.id === 'u_jamie')!.progress.sales!.steps).toEqual(['c1', 'c2', 'c3']);
    // Remove step 2, duplicate step 3, add a new step.
    let checklist = removeStep(sales.checklist, 1);
    checklist = duplicateStep(checklist, 1);
    checklist = addStep(checklist);
    const draft = { ...structuredClone(sales), checklist };
    const out = saveBuilderModule(db, OWNER, { draft }, mkCtx());
    expect(out.error).toBeUndefined();
    const saved = out.db.modules.find((x) => x.id === 'sales')!;
    expect(saved.checklist.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7']);
    expect(saved.checklist.map((s) => s.text)).toEqual([
      sales.checklist[0]!.text,
      sales.checklist[2]!.text,
      sales.checklist[3]!.text,
      sales.checklist[4]!.text,
      sales.checklist[5]!.text,
      sales.checklist[2]!.text,
      'New step',
    ]);
    // c1 stays c1, c2 (removed) goes, c3 is now c2.
    expect(out.db.users.find((u) => u.id === 'u_jamie')!.progress.sales!.steps).toEqual(['c1', 'c2']);
    expect(out.toast).toEqual({ msg: 'Sales AI Employee saved', tone: 'success' });
    expect(out.audit).toEqual({
      action: 'module.save',
      target: { type: 'module', id: 'sales', label: 'Sales AI Employee' },
      before: { name: 'Sales AI Employee', status: sales.status, tier: sales.tier, steps: 6, files: sales.files.length },
      after: {
        name: 'Sales AI Employee',
        status: sales.status,
        tier: sales.tier,
        steps: 7,
        files: sales.files.length,
        stepChanges: { added: 2, removed: 1, reordered: false },
      },
    });
  });

  it('leaves learners’ progress alone when no step moved', () => {
    const db = fresh();
    const sales = db.modules.find((x) => x.id === 'sales')!;
    const out = saveBuilderModule(db, OWNER, { draft: { ...structuredClone(sales), name: 'Sales' } }, mkCtx());
    expect(out.db.users).toBe(db.users);
    expect(out.audit!.after).toMatchObject({ name: 'Sales', stepChanges: { added: 0, removed: 0, reordered: false } });
  });

  it('a new AI Employee is saved with no before and nothing to map', () => {
    const db = fresh();
    const sales = db.modules.find((x) => x.id === 'sales')!;
    const draft = { ...structuredClone(sales), id: 'brand-new', name: 'Brand New', status: 'draft' as const, checklist: addStep([]) };
    const out = saveBuilderModule(db, OWNER, { draft }, mkCtx());
    expect(out.error).toBeUndefined();
    expect(out.db.users).toBe(db.users);
    expect(out.audit).toMatchObject({ target: { id: 'brand-new', label: 'Brand New' }, before: null, after: { steps: 1, stepChanges: { added: 1, removed: 0, reordered: false } } });
  });

  it('refuses as saveModule refuses: a publish check is an inline error, with no write and no audit', () => {
    const db = fresh();
    const sales = db.modules.find((x) => x.id === 'sales')!;
    const draft = { ...structuredClone(sales), checklist: removeStep(sales.checklist, 0) };
    const out = saveBuilderModule(db, OWNER, { draft, status: 'published' }, mkCtx());
    expect(out.error).toBe('Give all six build steps a title.');
    expect(out.db).toBe(db);
    expect(out.audit).toBeUndefined();
    expect(() => saveBuilderModule(db, SUPPORT, { draft }, mkCtx())).toThrow(MutationError);
  });
});

describe('Resource Vault › Edit details (editResource)', () => {
  const edit = (over: Partial<Parameters<typeof editResource>[2]> = {}) => ({
    id: 'r1',
    title: 'Fair Housing Checker',
    desc: 'New description',
    cat: 'MLS & Fair Housing Compliance',
    tier: 'team' as const,
    module: 'marketing',
    ...over,
  });

  it('edits the title, description, category, tier and Attached to, with one audit row', () => {
    const db = fresh();
    const r = db.resources.find((x) => x.id === 'r1')!;
    const out = editResource(db, OWNER, edit(), mkCtx());
    const x = out.db.resources.find((y) => y.id === 'r1')!;
    expect(x).toEqual({ ...r, title: 'Fair Housing Checker', desc: 'New description', tier: 'team', module: 'marketing' });
    expect(out.toast).toEqual({ msg: 'Saved', tone: 'success' });
    expect(out.audit).toEqual({
      action: 'vault.edit',
      target: { type: 'resource', id: 'r1', label: 'Fair Housing Checker' },
      before: { title: r.title, cat: r.cat, tier: 'agent', module: null, attachedTo: null },
      after: { title: 'Fair Housing Checker', cat: r.cat, tier: 'team', module: 'marketing', attachedTo: 'Marketing AI Employee', descChanged: true },
    });
  });

  it('detaches with null, keeps the description when it is cleared, and an executive category is Team only', () => {
    const db = editResource(fresh(), OWNER, edit(), mkCtx()).db;
    const out = editResource(db, OWNER, edit({ module: null, desc: '  ', cat: 'Organizational SOPs', tier: 'agent' }), mkCtx());
    const x = out.db.resources.find((y) => y.id === 'r1')!;
    expect('module' in x).toBe(false);
    expect(x).toMatchObject({ desc: 'New description', cat: 'Organizational SOPs', exec: true, tier: 'team' });
    expect(out.audit!.after).toMatchObject({ module: null, attachedTo: null, descChanged: false });
  });

  it('refuses a blank title inline, an unknown AI Employee or resource, and a role without curriculum', () => {
    const db = fresh();
    expect(editResource(db, OWNER, edit({ title: ' ' }), mkCtx())).toEqual({ db, error: 'Add a title.' });
    expect(() => editResource(db, OWNER, edit({ module: 'nope' }), mkCtx())).toThrow('No AI Employee nope');
    expect(() => editResource(db, OWNER, edit({ id: 'nope' }), mkCtx())).toThrow('No resource nope');
    expect(() => editResource(db, SUPPORT, edit(), mkCtx())).toThrow(MutationError);
  });
});

describe('Cohorts & Sessions › Add session (addSession)', () => {
  const add = (over: Partial<Parameters<typeof addSession>[2]> = {}) => ({
    cohortId: 'dec26',
    title: 'Office hours',
    date: '2026-12-22',
    time: '12:00',
    mins: '60',
    zoom: ' https://zoom.us/j/1 ',
    ...over,
  });

  it('adds the next session in the cohort, at the MST instant typed, with one audit row', () => {
    const db = fresh();
    const out = addSession(db, OWNER, add(), mkCtx());
    expect(out.error).toBeUndefined();
    const s = out.db.sessions.at(-1)!;
    expect(s).toEqual({
      id: 's_test_1',
      cohortId: 'dec26',
      n: 7,
      title: 'Office hours',
      start: Date.parse('2026-12-22T12:00:00-07:00'),
      mins: 60,
      zoom: 'https://zoom.us/j/1',
      live: false,
      attended: null,
      replay: null,
      views: 0,
    });
    expect(out.toast).toEqual({ msg: 'Session 7 added', tone: 'success' });
    expect(out.audit).toEqual({
      action: 'session.create',
      target: { type: 'session', id: 's_test_1', label: 'Session 7 · Office hours' },
      after: { cohortId: 'dec26', n: 7, title: 'Office hours', start: s.start, mins: 60, zoomLink: true },
    });
    // A blank Zoom link is allowed (the invite reads Draft).
    expect(addSession(db, OWNER, add({ zoom: '' }), mkCtx()).db.sessions.at(-1)!.zoom).toBe('');
  });

  it('refuses inline: no title, a bad date or time, no length; and the cohorts permission', () => {
    const db = fresh();
    expect(addSession(db, OWNER, add({ title: '' }), mkCtx()).error).toBe('Add a title.');
    expect(addSession(db, OWNER, add({ date: '12/22/2026' }), mkCtx()).error).toBe('Pick a date and a start time.');
    expect(addSession(db, OWNER, add({ time: '' }), mkCtx()).error).toBe('Pick a date and a start time.');
    expect(addSession(db, OWNER, add({ date: '2026-13-45' }), mkCtx()).error).toBe('Pick a date and a start time.');
    expect(addSession(db, OWNER, add({ mins: '0' }), mkCtx()).error).toBe('Enter the length in minutes.');
    expect(() => addSession(db, OWNER, add({ cohortId: 'nope' }), mkCtx())).toThrow('No cohort nope');
    expect(() => addSession(db, EDITOR, add(), mkCtx())).toThrow(MutationError);
  });
});

describe('Cohorts & Sessions › Attach replay (attachReplay)', () => {
  const URL1 = 'https://example.com/replays/session-2';

  it('publishes a past session’s replay as Publish Replay does, records the link, with one audit row', () => {
    const db0 = fresh();
    const db = { ...db0, sessions: db0.sessions.map((s) => (s.id === 'dec26-s2' ? { ...s, replay: null, views: 5 } : s)) };
    const out = attachReplay(db, OWNER, { sessionId: 'dec26-s2', url: ` ${URL1} ` }, mkCtx());
    expect(out.error).toBeUndefined();
    expect(out.db.sessions.find((s) => s.id === 'dec26-s2')).toMatchObject({ replay: 'ready', views: 0, replayUrl: URL1 });
    expect(out.db.activity[0]!.what).toBe('published the Session 2 replay');
    expect(out.toast).toEqual({ msg: 'Session 2 replay attached', tone: 'success' });
    expect(out.audit).toEqual({
      action: 'session.replay_attach',
      target: { type: 'session', id: 'dec26-s2', label: 'Session 2 · ' + db.sessions.find((s) => s.id === 'dec26-s2')!.title },
      before: { replay: null, replayUrl: null },
      after: { replay: 'ready', replayUrl: URL1 },
    });
  });

  it('on a published replay it only records the link; learners never see it', () => {
    const db = fresh();
    const out = attachReplay(db, OWNER, { sessionId: 'dec26-s1', url: URL1 }, mkCtx());
    const s1 = out.db.sessions.find((s) => s.id === 'dec26-s1')!;
    expect(s1).toEqual({ ...db.sessions.find((s) => s.id === 'dec26-s1')!, replayUrl: URL1 });
    expect(out.db.activity).toBe(db.activity);
    const mine = scopeSnapshot(out.db, { kind: 'learner', userId: 'u_jamie' });
    expect(mine.sessions.find((s) => s.id === 'dec26-s1')).not.toHaveProperty('replayUrl');
  });

  it('refuses a session that has not ended, a link that is not https, and a role without cohorts', () => {
    const db = fresh();
    expect(attachReplay(db, OWNER, { sessionId: 'dec26-s4', url: URL1 }, mkCtx()).error).toBe('Attach a replay after the session ends.');
    const live = { ...db, sessions: db.sessions.map((s) => (s.id === 'dec26-s1' ? { ...s, live: true } : s)) };
    expect(attachReplay(live, OWNER, { sessionId: 'dec26-s1', url: URL1 }, mkCtx()).error).toBe('Attach a replay after the session ends.');
    for (const bad of ['http://example.com/a', 'example.com', 'https://', 'javascript:alert(1)', 'https://a b', `https://x.co/${'a'.repeat(2048)}`]) {
      expect(attachReplay(db, OWNER, { sessionId: 'dec26-s1', url: bad }, mkCtx()).error).toBe('Enter the replay’s https:// link.');
    }
    expect(isReplayUrl(URL1)).toBe(true);
    expect(isReplayUrl('https://[::1')).toBe(false);
    expect(() => attachReplay(db, EDITOR, { sessionId: 'dec26-s1', url: URL1 }, mkCtx())).toThrow(MutationError);
    expect(() => attachReplay(db, OWNER, { sessionId: 'nope', url: URL1 }, mkCtx())).toThrow('No session nope');
  });
});

describe('Announcements: Save draft, Edit and Duplicate', () => {
  const fields = (over: Record<string, unknown> = {}) => ({
    title: ' Office hours move ',
    body: ' Thursday this week. ',
    audience: 'team' as const,
    inapp: true,
    email: false,
    severity: 'warning' as const,
    action: 'sessions' as const,
    ...over,
  });

  it('Save draft adds a draft, first, never sent, with one audit row', () => {
    const db = fresh();
    const out = saveAnnouncementDraft(db, OWNER, fields(), mkCtx());
    expect(out.db.announcements[0]).toEqual({
      id: 'a_test_1',
      title: 'Office hours move',
      body: 'Thursday this week.',
      audience: 'team',
      channels: ['inapp'],
      severity: 'warning',
      action: 'sessions',
      actionLabel: 'Open Sessions',
      status: 'draft',
      at: NOW,
      opens: null,
    });
    expect(out.effects).toBeUndefined();
    expect(out.toast).toEqual({ msg: 'Saved as a draft', tone: 'success' });
    expect(out.audit).toEqual({
      action: 'announce.create',
      target: { type: 'announcement', id: 'a_test_1', label: 'Office hours move' },
      after: { title: 'Office hours move', status: 'draft', audience: 'team', channels: ['inapp'], at: NOW },
    });
    expect(saveAnnouncementDraft(db, OWNER, fields({ title: '' }), mkCtx()).error).toBe('Add a title.');
    expect(saveAnnouncementDraft(db, OWNER, fields({ inapp: false }), mkCtx()).error).toBe('Pick at least one channel.');
    expect(saveAnnouncementDraft(db, OWNER, fields({ body: '', action: '', severity: undefined }), mkCtx()).db.announcements[0]).toMatchObject({ body: '', action: null, actionLabel: '', severity: 'info' });
    expect(() => saveAnnouncementDraft(db, EDITOR, fields(), mkCtx())).toThrow(MutationError);
  });

  it('Edit keeps a draft a draft, schedules it in MST, or sends it now; one audit row each', () => {
    const db = saveAnnouncementDraft(fresh(), OWNER, fields(), mkCtx()).db;
    const draft = updateAnnouncement(db, OWNER, { ...fields({ title: 'Renamed' }), id: 'a_test_1', when: 'draft' }, mkCtx());
    expect(draft.db.announcements[0]).toMatchObject({ id: 'a_test_1', title: 'Renamed', status: 'draft', opens: null });
    expect(draft.toast!.msg).toBe('Saved as a draft');
    expect(draft.audit).toMatchObject({ action: 'announce.update', target: { id: 'a_test_1', label: 'Renamed' }, before: { title: 'Office hours move', status: 'draft' }, after: { title: 'Renamed', status: 'draft' } });

    const later = updateAnnouncement(db, OWNER, { ...fields(), id: 'a_test_1', when: 'later', at: '2026-12-11T09:00' }, mkCtx());
    expect(later.db.announcements[0]).toMatchObject({ status: 'scheduled', at: Date.parse('2026-12-11T09:00:00-07:00') });
    expect(later.toast!.msg).toBe('Scheduled for Fri, Dec 11');
    const fallback = updateAnnouncement(db, OWNER, { ...fields(), id: 'a_test_1', when: 'later', at: 'soon' }, mkCtx());
    expect(fallback.db.announcements[0]!.at).toBe(NOW);

    const now = updateAnnouncement(db, OWNER, { ...fields(), id: 'a_test_1', when: 'now' }, mkCtx());
    expect(now.db.announcements[0]).toMatchObject({ status: 'sent', at: NOW, opens: 0 });
    expect(now.toast!.msg).toMatch(/^Sent to [\d,]+ learners\. The banner is live on their dashboards\.$/);
    expect(now.effects).toBeUndefined();
    const owners = updateAnnouncement(db, OWNER, { ...fields({ audience: 'owners', inapp: false, email: true }), id: 'a_test_1', when: 'now' }, mkCtx());
    expect(owners.toast!.msg).toMatch(/^Sent to \d+ team owners$/);
    expect(updateAnnouncement(db, OWNER, { ...fields({ audience: 'agent' }), id: 'a_test_1', when: 'now' }, mkCtx()).toast!.msg).toMatch(/learners/);
    expect(updateAnnouncement(db, OWNER, { ...fields({ audience: 'all' }), id: 'a_test_1', when: 'now' }, mkCtx()).toast!.msg).toMatch(/learners/);
  });

  it('Edit refuses a sent announcement, a blank title or message, no channel, and a role without announce', () => {
    const db = fresh();
    expect(() => updateAnnouncement(db, OWNER, { ...fields(), id: 'a1', when: 'draft' }, mkCtx())).toThrow('Sent announcements can’t be edited.');
    // a3 is the seed's scheduled one.
    expect(updateAnnouncement(db, OWNER, { ...fields({ body: '' }), id: 'a3', when: 'now' }, mkCtx()).error).toBe('Add a title and a message.');
    expect(updateAnnouncement(db, OWNER, { ...fields({ title: '' }), id: 'a3', when: 'draft' }, mkCtx()).error).toBe('Add a title.');
    expect(updateAnnouncement(db, OWNER, { ...fields({ inapp: false }), id: 'a3', when: 'draft' }, mkCtx()).error).toBe('Pick at least one channel.');
    expect(() => updateAnnouncement(db, EDITOR, { ...fields(), id: 'a3', when: 'draft' }, mkCtx())).toThrow(MutationError);
    expect(() => updateAnnouncement(db, OWNER, { ...fields(), id: 'nope', when: 'draft' }, mkCtx())).toThrow('No announcement nope');
  });

  it('Duplicate copies any announcement as a draft, first, without its session link', () => {
    const db = fresh();
    const out = duplicateAnnouncement(db, OWNER, { id: 'a1' }, mkCtx());
    const a1 = db.announcements.find((a) => a.id === 'a1')!;
    const { sessionId: _s, ...rest } = a1;
    expect(out.db.announcements[0]).toEqual({ ...rest, id: 'a_test_1', status: 'draft', at: NOW, opens: null });
    expect(out.toast).toEqual({ msg: 'Duplicated as a draft', tone: 'success' });
    expect(out.audit).toMatchObject({ action: 'announce.duplicate', target: { id: 'a_test_1', label: a1.title }, before: { from: 'a1', status: 'sent' }, after: { status: 'draft' } });
    expect(() => duplicateAnnouncement(db, EDITOR, { id: 'a1' }, mkCtx())).toThrow(MutationError);
  });

  it('the audit groups stay narrower than the mockup’s widest Action option', () => {
    // "announcement" would widen the Audit Log's Action select; the group is "announce".
    expect(AUDIT_ACTION_GROUPS).toEqual(expect.arrayContaining(['module', 'vault', 'session', 'announce']));
    expect(AUDIT_ACTION_GROUPS).not.toContain('announcement');
  });
});
