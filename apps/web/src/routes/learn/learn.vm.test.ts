// D-177: the learner shell's view-model: the week rows, the nav, the top bar, kit and skill rows.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf, type LearnerStep } from '@ai/core/learner';
import { LABELS, barVM, dateTile, kitRow, linkedRoutes, navVM, sessionRow, skillRow, stepMeta, stepOfSkill, stepText, stepTitle, toneOf, weekOfPath, weekRows } from './learn.vm';
import { LEARNER_ID, LIVE_NOW, PRELAUNCH_NOW, learnState, liveState, prelaunchState } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

describe('the learner shell’s view-model (D-177)', () => {
  it('lists every week of the course from the API, each with the learner’s place in it', () => {
    const { payload, db } = prelaunchState();
    const rows = weekRows(payload, db, learnerOf(db, LEARNER_ID));
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({ week: 0, title: 'Foundations', state: 'in_progress', done: 2, total: 8, href: '/learn/week/0', opensShort: null });
    expect(rows[0]!.steps.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
    expect(rows[1]).toMatchObject({ week: 1, title: 'Where the Money Goes', state: 'locked', steps: [], opensShort: 'Opens Nov 29', open: null });
    // A locked week's icon and tone come from the snapshot's stub of its module; its words from the API's stub.
    expect(rows[1]!.icon).toBe('dollar');
    expect(rows.every((r) => r.tone === 'forest')).toBe(true);
  });

  it('reads a builder tone, and forest when it sets none or an unknown one', () => {
    expect(toneOf('terra')).toBe('terra');
    expect(toneOf(undefined)).toBe('forest');
    expect(toneOf('purple')).toBe('forest');
  });

  it('builds the nav: Home, Schedule, Skill library, the vault locked in the preview, and the AI employees with their status', () => {
    const { payload, db } = prelaunchState();
    const rows = weekRows(payload, db, learnerOf(db, LEARNER_ID));
    const nav = navVM(payload, rows, '/learn/week/0/step/3');
    expect(nav.cohort).toBe(true);
    expect(nav.home).toEqual({ label: 'Home', href: '/learn', active: false });
    expect(nav.schedule.href).toBe('/learn/schedule');
    expect(nav.library.href).toBe('/learn/skills');
    expect(nav.vault).toEqual({ label: 'Resource vault', href: '/learn/vault', locked: true, title: 'Opens Wed, Dec 2 · 12:00 PM MT', active: false });
    expect(nav.employees!.count).toBe(9);
    expect(nav.employees!.rows[0]).toMatchObject({ label: 'Foundations', active: true, status: { kind: 'ring', text: '2 of 8', ratio: 0.25 }, title: 'Foundations · 2 of 8' });
    expect(nav.employees!.rows[2]).toMatchObject({ label: 'Leads That Pay', active: false, status: { kind: 'opens', text: 'Opens Dec 9' } });
    expect(nav.help.href).toBe('mailto:support@amplifiedimpact.io');
  });

  it('D-249: keeps the vault’s lock on the course’s own opening, Wed, Dec 2, after Week 1 opens in the preview', () => {
    const { payload, db } = learnState(Date.parse('2026-11-30T09:00:00-07:00'), true, { 0: ['c1', 'c2'] });
    const rows = weekRows(payload, db, learnerOf(db, LEARNER_ID));
    expect(rows.slice(0, 3).map((r) => [r.week, r.state, r.opensShort])).toEqual([
      [0, 'in_progress', null],
      [1, 'not_started', null],
      [2, 'locked', 'Opens Dec 9'],
    ]);
    // Not Week 2's Dec 9: the vault opens when the preview ends, with the first live build.
    expect(navVM(payload, rows, '/learn').vault).toMatchObject({ locked: true, title: 'Opens Wed, Dec 2 · 12:00 PM MT' });
  });

  it('reads built, not started and an open vault once the course is live', () => {
    const { payload, db } = liveState();
    const rows = weekRows(payload, db, learnerOf(db, LEARNER_ID));
    const nav = navVM(payload, rows, '/learn');
    expect(nav.home.active).toBe(true);
    expect(nav.vault.locked).toBe(false);
    expect(nav.employees!.rows.slice(0, 3).map((r) => r.status)).toEqual([
      { kind: 'built', text: 'Built' },
      { kind: 'ring', text: '5 of 6', ratio: 5 / 6 },
      { kind: 'open', text: 'Not started' },
    ]);
  });

  it('drops the cohort pieces for a learner whose plan has no course', () => {
    const nav = navVM(null, [], '/learn');
    expect(nav.cohort).toBe(false);
    expect(nav.employees).toBeNull();
    expect(nav.vault.locked).toBe(false);
    // D-182: the vault is every learner's, and the current page on its own address.
    expect(nav.vault.href).toBe('/learn/vault');
    expect(navVM(null, [], '/learn/vault').vault.active).toBe(true);
  });

  it('says one thing in the top bar: the next live build, the session live now, or nothing', () => {
    const pre = prelaunchState();
    const next = barVM(pre.payload, PRELAUNCH_NOW);
    expect(next).toMatchObject({ kind: 'next', title: 'Map Your Spend Live Build', when: 'Wed, Dec 2 · 12:00 PM MT (1:00 PM CT)' });
    if (next.kind === 'next') expect(next.ics).toHaveLength(1);
    const live = barVM(liveState().payload, LIVE_NOW);
    expect(live).toMatchObject({ kind: 'live', title: 'Lead Source Review Live Build', started: 'Started 12:00 PM MT (1:00 PM CT)', week: 2 });
    expect(barVM(null, PRELAUNCH_NOW)).toEqual({ kind: 'none' });
    expect(barVM(pre.payload, Date.parse('2027-06-01T00:00:00Z'))).toEqual({ kind: 'none' });
  });

  it('knows which week a path is on', () => {
    expect(weekOfPath('/learn/week/3')).toBe(3);
    expect(weekOfPath('/learn/week/12/step/2')).toBe(12);
    expect(weekOfPath('/learn')).toBeNull();
  });

  it('writes a step’s title, what it asks, and its meta line from the step’s own fields', () => {
    const { payload, db } = prelaunchState();
    const [w0] = weekRows(payload, db, learnerOf(db, LEARNER_ID));
    const s3 = w0!.steps[2]!;
    expect(stepTitle(s3)).toBe('Start Your Time Baseline');
    // The new weeks' text is the done-when line: shown as Done when, never twice.
    expect(stepText(s3)).toBeNull();
    expect(stepMeta(s3, 'Claude or ChatGPT')).toBe('20 min, over two weeks · Claude or ChatGPT · Owner');
    expect(stepMeta(w0!.steps[0]!, null)).toBe('10 min · Owner');
  });

  it('draws a session’s date tile and line in the viewer’s zone', () => {
    const { payload } = prelaunchState();
    const build = payload.sessions.find((s) => s.kind === 'build' && s.week === 1)!;
    expect(dateTile(build.start)).toEqual({ dw: 'Wed', dd: '2' });
    expect(sessionRow(build)).toMatchObject({ title: 'Map Your Spend Live Build', meta: 'Week 1 · 12:00 PM MT (1:00 PM CT) · 1 hr 30 min' });
    const oh = payload.sessions.find((s) => s.kind === 'office_hours' && s.week === 1)!;
    expect(sessionRow(oh).meta).toBe('12:00 PM MT (1:00 PM CT) · 1 hr');
  });

  it('links a skill only to a Library page that exists, and says the coming copy string otherwise (D-176)', () => {
    const copy = { 'skill.coming': 'Coming With Week 1' };
    expect(skillRow({ title: 'AI Brain Setup', route: '/ai-brain-setup' }, copy)).toMatchObject({ href: '/learn/skills/ai-brain-setup', meta: 'Skill · Open now' });
    expect(skillRow({ title: 'Map Your Spend', route: 'map-your-spend' }, copy)).toMatchObject({ href: null, meta: 'Skill · Coming With Week 1' });
    expect(skillRow({ title: 'Map Your Spend', route: '/map-your-spend' }, undefined)).toMatchObject({ href: null, meta: 'Skill' });
  });

  it('parses one Linked skill or a comma list, and a single route matches as before (D-189)', () => {
    expect(linkedRoutes('map-your-spend')).toEqual(['/map-your-spend']);
    expect(linkedRoutes('/map-your-spend')).toEqual(['/map-your-spend']);
    expect(linkedRoutes(' map-your-spend, lead-source-review, , map-your-spend ')).toEqual(['/map-your-spend', '/lead-source-review']);
    expect(linkedRoutes(undefined)).toEqual([]);
    expect(linkedRoutes('   ')).toEqual([]);
    const step = (n: number, linkedSkill: string): LearnerStep => ({
      index: n - 1,
      n,
      id: `c${n}`,
      step: { text: 't', ch: 'c', mins: 0, t: 0, hint: '', linkedSkill },
      done: false,
      current: false,
    });
    const steps = [step(4, 'map-your-spend, lead-source-review'), step(2, 'ai-brain-setup')];
    expect(stepOfSkill('map-your-spend', steps)?.n).toBe(4);
    expect(stepOfSkill('/lead-source-review', steps)?.n).toBe(4);
    expect(stepOfSkill('ai-brain-setup', steps)?.n).toBe(2);
    expect(stepOfSkill('morning-brief', steps)).toBeUndefined();
  });

  it('a skill row prefers an open Library page, then the step that links it, then the coming line (D-189)', () => {
    const step = (n: number, linkedSkill: string): LearnerStep => ({
      index: n - 1,
      n,
      id: `c${n}`,
      step: { text: 't', ch: 'c', mins: 0, t: 0, hint: '', linkedSkill },
      done: false,
      current: false,
    });
    const place = { week: 0, steps: [step(4, 'map-your-spend, lead-source-review'), step(2, 'ai-brain-setup')] };
    const copy = { 'skill.coming': 'Coming With Week 1', 'skill.in_step': 'In Step {n}' };
    // (a) a page that exists stays Open now, even when a step also links it.
    expect(skillRow({ title: 'AI Brain Setup', route: 'ai-brain-setup' }, copy, place)).toMatchObject({ href: '/learn/skills/ai-brain-setup', meta: 'Skill · Open now' });
    // (b) no page, and a step in this week links it.
    expect(skillRow({ title: 'Map Your Spend', route: 'map-your-spend' }, copy, place)).toMatchObject({ href: '/learn/week/0/step/4', meta: 'Skill · In Step 4' });
    expect(skillRow({ title: 'Lead Source Review', route: '/lead-source-review' }, copy, place)).toMatchObject({ href: '/learn/week/0/step/4', meta: 'Skill · In Step 4' });
    // (c) nothing in this week links it.
    expect(skillRow({ title: 'Other', route: 'not-a-real-page' }, copy, place)).toMatchObject({ href: null, meta: 'Skill · Coming With Week 1' });
    // The copy string is missing: the same as (c), no link, even though a step links it.
    expect(skillRow({ title: 'Map Your Spend', route: 'map-your-spend' }, { 'skill.coming': 'Coming With Week 1' }, place)).toMatchObject({ href: null, meta: 'Skill · Coming With Week 1' });
  });

  it('downloads a kit item through the gated files route, with its step', () => {
    const { payload, db } = prelaunchState();
    const [w0] = weekRows(payload, db, learnerOf(db, LEARNER_ID));
    const row = kitRow({ id: 'r1', title: 'The Ready Check prompt', kind: 'prompt', platform: 'claude', stepId: 'c8' }, w0!.steps, (id) => `/api/files/resource/${id}`);
    expect(row).toMatchObject({ title: 'The Ready Check prompt', meta: 'Prompt · Step 8', href: '/api/files/resource/r1', icon: 'lvCopy' });
    expect(kitRow({ id: 'r2', title: 'A file', kind: null, platform: null, stepId: null }, [], () => null)).toMatchObject({ meta: 'File', href: null });
  });

  it('keeps its chrome to the mockup’s generic labels', () => {
    expect(Object.values(LABELS).every((l) => l.length < 30)).toBe(true);
    expect(Object.values(LABELS).join(' ')).not.toMatch(/\u2014/);
  });
});
