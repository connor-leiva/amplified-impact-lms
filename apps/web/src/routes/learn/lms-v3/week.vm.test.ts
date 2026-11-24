// D-228: the v3 week page's props (IMPLEMENTATION-SPEC.md §7.3, §7.7), and the builder-to-page sync for v3 weeks
// (D-213's rule, Phase 5 step 4): every word the builder writes into Week 0 reaches the v3 page, or is named below
// with the reason the mockup doesn't draw it.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { weekRows } from '../learn.vm';
import { weekVM } from '../Week.vm';
import { LEARNER_ID, PRELAUNCH_NOW, learnState } from '../test/fixture';
import type { LearnState } from '../test/fixture';
import { kitGroups, lockedWeekProps, stepsTitle, v3LockedDraws, v3WeekDraws, weekProps } from './week.vm';
import { formItem, formRow, intakeStepOf } from './form.vm';

beforeEach(() => setViewerZone('America/Chicago'));
afterEach(() => setViewerZone(null));

const NOT_WORDS = new Set([
  'id',
  'kind',
  'href',
  'url',
  'upload',
  'type',
  'sessionId',
  'icon',
  'tone',
  'role',
  'sets',
  'skill',
  'slug',
  'name',
  'size',
  'format',
  'state',
  'audience',
  'platform',
  'video',
  'poster',
  'transcript',
  'item',
  'by',
  'key',
  'route',
]);

/** Week 0's course words the v3 page doesn't draw, and why. */
const NOT_DRAWN_V3: readonly [RegExp, string][] = [
  [/^course\.statusLabels\./, 'the nav and Home read them (D-217); the v3 nav says a status by its mark (D-227)'],
  [
    /^course\.startHere\.(title|sub|line)$/,
    'C-07: the Start Here card is retired on v3 weeks; its rows are the step list',
  ],
  [/^course\.startHere\.totals\./, 'B-10: each role’s time is the sum of its steps’ minutes'],
  [/^course\.time\./, 'B-10: each role’s time is the sum of its steps’ minutes'],
  [/^course\.media/, 'C-12: Week 0’s recordings are placeholders the mockup leaves out (UX-AUDIT)'],
  [/^course\.materials/, 'C-12: the materials list is the kit’s files on v3'],
  [
    /^course\.homework\.byWeekEnd/,
    'the mockup’s What done looks like has the acceptance test, adopted and before the next session',
  ],
  [/^course\.(liveBuild|officeHours)\./, 'a session page; Week 0 has no sessions'],
  [/^course\.intake\./, 'the form drawer’s questions (Phase 6), not the week page'],
  [/^course\.stackCard\./, 'C-15: the stack card stays its own page, opened from the kit'],
  [/^course\.skills\[\d+\]\.use$/, 'D-221: retired, nothing draws it'],
  [/^course\.lockedCopy\./, 'a locked week’s words; Week 0 is open'],
];

function week0(st: LearnState) {
  const me = learnerOf(st.db, LEARNER_ID);
  const rows = weekRows(st.payload, st.db, me);
  const r = rows.find((x) => x.week === 0)!;
  return {
    me,
    rows,
    r,
    props: weekProps({
      p: st.payload,
      rows,
      r,
      me,
      checks: me?.checks ?? [],
      build: null,
      fileUrl: (id) => `/api/files/resource/${id}`,
      download: () => undefined,
      onViewPrompt: () => undefined,
      now: st.now,
    }),
  };
}

describe('the builder and the v3 week page are one source (D-213, D-228)', () => {
  it('every word the builder writes into Week 0 reaches the v3 page, or is named as not drawn', () => {
    const marks = new Map<string, string>();
    let n = 0;
    const mark = (o: unknown, path: string): unknown => {
      if (typeof o === 'string') {
        const m = `ZQ${++n}Q`;
        marks.set(m, path);
        return m;
      }
      if (Array.isArray(o)) return o.map((x, i) => mark(x, `${path}[${i}]`));
      if (o && typeof o === 'object')
        return Object.fromEntries(
          Object.entries(o).map(([k, v]) => [k, NOT_WORDS.has(k) ? v : mark(v, `${path}.${k}`)]),
        );
      return o;
    };
    const st = learnState(PRELAUNCH_NOW, true, { 0: ['c1'] }, 15, (d) => {
      const m = d.modules.find((x) => x.id === 'accelerator-week-0')!;
      m.course = mark(m.course, 'course') as typeof m.course;
    });
    const page = JSON.stringify(week0(st).props);
    expect(marks.size).toBeGreaterThan(20);
    const missing = [...marks].filter(([m]) => !page.includes(m)).map(([, path]) => path);
    const unexplained = missing.filter((path) => !NOT_DRAWN_V3.some(([re]) => re.test(path)));
    expect(unexplained).toEqual([]);
  });
});

describe('weekProps (§7.3)', () => {
  it('the header: title, question, purpose, the crumbs and the three tags', () => {
    const { props } = week0(learnState(PRELAUNCH_NOW, true, { 0: ['c1'] }));
    expect(props).toMatchObject({ n: 0, title: 'Foundations', open: true });
    expect(props.crumbs).toEqual([{ label: 'Home', href: '/learn' }, { label: 'Foundations' }]);
    expect(props.tags.map((t) => t.icon)).toEqual(['clock', 'users', 'cal']);
    expect(props.tags[0]!.label).toBe('Self-paced');
    expect(props.tags[1]!.label).toBe('Owners and AI Implementers');
    expect(props.tags[2]!.label).toMatch(/^Due Mon, Nov 30, /);
  });

  it('the steps: role words read for the filter (B-09), statuses from the checks, the first not done is next', () => {
    const { props } = week0(learnState(PRELAUNCH_NOW, true, { 0: ['c1'] }));
    expect(props.steps).toHaveLength(8);
    expect(props.steps[0]).toMatchObject({ n: 1, status: 'done', who: ['owner'], href: '/learn/week/0/step/1' });
    expect(props.steps[1]!.who).toEqual(['owner', 'operator']);
    expect(props.steps.every((s) => typeof s.minutes === 'number' && s.time.length > 0)).toBe(true);
  });

  it('roles: counts and the sum of each role’s minutes (B-10)', () => {
    const { props } = week0(learnState(PRELAUNCH_NOW, true, { 0: ['c1'] }));
    const [all, owner, operator] = props.roles;
    expect(all).toMatchObject({ id: 'all', label: 'All', count: 8 });
    expect(all!.summary).toMatch(/^About \d+ hr( \d+ min)? in all\./);
    const ownerMins = props.steps.filter((s) => s.who.includes('owner')).reduce((a, s) => a + s.minutes, 0);
    expect(owner).toMatchObject({ id: 'owner', count: props.steps.filter((s) => s.who.includes('owner')).length });
    expect(owner!.summary).toContain(`about ${Math.floor(ownerMins / 60)} hr`);
    expect(operator).toMatchObject({ id: 'operator', label: 'AI Implementer' });
    expect(operator!.summary).toMatch(/^\d+ steps? for the AI Implementer, about /);
  });

  it('the step heading counts its steps', () => {
    expect(stepsTitle(8)).toBe('Eight steps');
    expect(stepsTitle(1)).toBe('One step');
  });

  it('deployed follows the learner’s deployment', () => {
    const st = learnState(PRELAUNCH_NOW, true, { 0: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] }, 15, (d) => {
      d.users.find((u) => u.id === LEARNER_ID)!.progress['accelerator-week-0']!.deployedAt = 1;
    });
    expect(week0(st).props.deployed).toBe(true);
    expect(week0(learnState(PRELAUNCH_NOW, true, { 0: ['c1'] })).props.deployed).toBe(false);
  });

  it('the seven Reference accordions, in the mockup’s words', () => {
    const { props } = week0(learnState(PRELAUNCH_NOW, true, { 0: ['c1'] }));
    expect(props.reference.map((a) => a.title)).toEqual([
      'How the program works',
      'Owner and AI Implementer',
      'What done looks like',
      'Evidence packet',
      'Rubric',
      'Readiness',
      'Tools this week',
    ]);
  });
});

describe('kitGroups (B-13)', () => {
  const st = learnState(PRELAUNCH_NOW, true, { 0: ['c1'] });
  const { r } = week0(st);
  const w = {
    ...r.open!,
    kit: [
      { id: 'a', title: 'Week 0 Intake Form', kind: 'file' as const, platform: null, stepId: 'c1', type: 'PDF' },
      { id: 'b1', title: 'Time Baseline', kind: 'file' as const, platform: null, stepId: 'c3', type: 'XLSX' },
      { id: 'b2', title: 'Time Baseline', kind: 'file' as const, platform: null, stepId: 'c3', type: 'CSV' },
      {
        id: 'z',
        title: r.open!.skills[1]?.title ?? 'Map Your Spend',
        kind: 'file' as const,
        platform: null,
        stepId: 'c4',
        type: 'ZIP',
      },
    ],
  };
  const groups = kitGroups({
    w,
    steps: r.steps,
    week: 0,
    build: {
      prompt: {
        title: 'System Prompt',
        stats: '6 lines · about 63 tokens',
        text: 'Hi',
        vars: [],
        lines: [],
        fileName: 'x',
        desc: '',
      },
      files: [],
      notes: null,
    },
    fileUrl: (id) => `/f/${id}`,
    download: () => undefined,
    onViewPrompt: () => undefined,
  });
  it('Skills, Files, For your AI', () =>
    expect(groups.map((g) => g.label)).toEqual(['Skills', 'Files', 'For your AI']));
  it('a file titled as a skill is its zip, on the skill’s row', () => {
    const skill = groups[0]!.rows.find((x) => x.title === w.kit[3]!.title)!;
    expect(skill.acts?.map((a) => a.label)).toEqual(['Zip']);
    expect(groups[1]!.rows.map((x) => x.title)).not.toContain(w.kit[3]!.title);
  });
  it('files sharing a title are one row with a button each', () => {
    const tb = groups[1]!.rows.find((x) => x.title === 'Time Baseline')!;
    expect(tb).toMatchObject({ meta: 'Step 3' });
    expect(tb.acts?.map((a) => a.label)).toEqual(['Excel', 'CSV']);
    expect(groups[1]!.rows.find((x) => x.title === 'Week 0 Intake Form')).toMatchObject({
      meta: 'Step 1',
      href: '/f/a',
    });
  });
  it('the system prompt: View and Copy', () => {
    const row = groups[2]!.rows[0]!;
    expect(row).toMatchObject({ icon: 'key', title: 'System prompt', meta: '6 lines · about 63 tokens' });
    expect(row.acts?.map((a) => a.label)).toEqual(['View', 'Copy']);
    expect(row.acts?.[1]!.copyText).toBe('Hi');
  });
});

describe('the intake’s form row without a step file (D-246)', () => {
  const st = learnState(PRELAUNCH_NOW, true, { 0: ['c1'] });
  const { r } = week0(st);
  const stack = { id: 's', title: 'Week 0 Stack Card', kind: 'file' as const, platform: null, stepId: 'c1', type: 'PDF' };
  const baseline = { id: 'b', title: 'Time Baseline', kind: 'file' as const, platform: null, stepId: 'c3', type: 'XLSX' };
  const f = { row: { meta: '9 of 22 answered', label: 'Continue' } };
  const files = (kit: (typeof stack)[], item?: ReturnType<typeof formItem>) => {
    const groups = kitGroups({
      w: { ...r.open!, kit },
      steps: r.steps,
      week: 0,
      build: null,
      fileUrl: (id) => `/f/${id}`,
      download: () => undefined,
      onViewPrompt: () => undefined,
      formRow: (it, row) => (it === item ? formRow(row, f, () => undefined) : row),
      formItem: item,
    });
    return groups.find((g) => g.label === 'Files')!.rows;
  };
  it('lists the mockup’s Week 0 Intake Form row on the intake’s step, as the form’s row, with no file behind it', () => {
    const rows = files([baseline, stack], formItem('c1'));
    expect(rows.map((x) => x.title)).toEqual(['Week 0 Intake Form', 'Week 0 Stack Card', 'Time Baseline']);
    expect(rows[0]).toMatchObject({ icon: 'file', form: 'intake', meta: 'Step 1 · 9 of 22 answered' });
    expect(rows[0]!.href).toBeUndefined();
    expect(rows[0]!.acts?.map((a) => a.label)).toEqual(['Continue']);
  });
  it('takes its step from the week’s own steps: the intake item’s, else the first', () => {
    expect(intakeStepOf(r.steps, 'c1')).toBe('c1');
    expect(intakeStepOf(r.steps, 'c3')).toBe('c3');
    // A module record whose ids the course's steps don't share (the item's step isn't on the week): the week's first.
    expect(intakeStepOf(r.steps, 'not-a-step')).toBe(r.steps[0]!.id);
    expect(intakeStepOf(r.steps, undefined)).toBe(r.steps[0]!.id);
    expect(intakeStepOf([], 'c1')).toBeNull();
    expect(files([stack], formItem(intakeStepOf(r.steps, 'not-a-step')))[0]).toMatchObject({ title: 'Week 0 Intake Form', meta: 'Step 1 · 9 of 22 answered' });
  });
  it('draws nothing extra without the stand-in, or without a form row to draw it', () => {
    expect(files([stack]).map((x) => x.title)).toEqual(['Week 0 Stack Card']);
    const groups = kitGroups({ w: { ...r.open!, kit: [stack] }, steps: r.steps, week: 0, build: null, fileUrl: () => null, download: () => undefined, onViewPrompt: () => undefined, formItem: formItem('c1') });
    expect(groups.find((g) => g.label === 'Files')!.rows.map((x) => x.title)).toEqual(['Week 0 Stack Card']);
  });
});

describe('the gap rule (§4.D) and the locked week (§7.7)', () => {
  it('Week 0 draws, and D-234: so does a live week (sessions, seat card, playbook card, placeholder media)', () => {
    const st = learnState(Date.parse('2026-12-10T12:00:00Z'), false, { 0: ['c1'] });
    const rows = weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID));
    expect(v3WeekDraws(rows.find((r) => r.week === 0))).toBe(true);
    const w1 = rows.find((r) => r.week === 1)!;
    expect(st.payload.sessions.some((x) => x.week === 1)).toBe(true);
    expect(w1.open?.seatCard && w1.open?.playbookCard).toBeTruthy();
    expect(v3WeekDraws(w1)).toBe(true);
  });
  it('D-234: a week keeps today’s page for a real video, or a sample output with a paragraph or a table', () => {
    const st = learnState(Date.parse('2026-12-10T12:00:00Z'), false, { 0: ['c1'] });
    const rows = weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID));
    const w1 = rows.find((r) => r.week === 1)!;
    const video = { ...w1, open: { ...w1.open!, media: [{ type: 'video', id: 'v', title: 'Replay', source: { url: 'https://example.test/v' } }] } };
    expect(v3WeekDraws(video as unknown as typeof w1)).toBe(false);
    const para = { ...w1, open: { ...w1.open!, sampleOutput: { title: 'Sample', blocks: [{ type: 'text', text: 'A paragraph.' }] } } };
    expect(v3WeekDraws(para as unknown as typeof w1)).toBe(false);
    const listed = { ...w1, open: { ...w1.open!, sampleOutput: { title: 'Sample', blocks: [{ type: 'list', items: ['One line'] }] } } };
    expect(v3WeekDraws(listed as unknown as typeof w1)).toBe(true);
  });
  it('a locked week draws from its stub, with the hero’s session’s time on its line', () => {
    const st = learnState(PRELAUNCH_NOW, true, { 0: ['c1'] });
    const rows = weekRows(st.payload, st.db, learnerOf(st.db, LEARNER_ID));
    const r = rows.find((x) => x.week === 1)!;
    const vm = weekVM(st.payload, rows, 1, PRELAUNCH_NOW, () => null);
    if (vm.kind !== 'locked') throw new Error('Week 1 should be locked');
    expect(v3LockedDraws(vm, r)).toBe(true);
    const lk = lockedWeekProps(vm, r, st.payload.sessions, rows, PRELAUNCH_NOW, 'blob:x')!;
    expect(lk).toMatchObject({
      n: 1,
      title: r.title,
      calendarHref: 'blob:x',
      back: { label: 'Back to Week 0', href: '/learn/week/0' },
    });
    expect(lk.opensAt).toBe(new Date(r.locked!.opensAt!).toISOString());
    expect(lk.sessions[0]).toMatchObject({ kind: 'Live build' });
    expect(lk.sessions[0]!.when).toContain(' · ');
    expect(lk.sessions.slice(1).every((s) => !s.when.includes(' · '))).toBe(true);
    expect(lk.crumbs).toEqual([{ label: 'Home', href: '/learn' }, { label: r.title }]);
  });
});

describe('D-234: a live week on the week page', () => {
  const week1 = (now: number) => {
    const st = learnState(now, false, { 0: ['c1'] });
    const me = learnerOf(st.db, LEARNER_ID);
    const rows = weekRows(st.payload, st.db, me);
    const r = rows.find((x) => x.week === 1)!;
    return weekProps({ p: st.payload, rows, r, me, checks: me?.checks ?? [], build: null, fileUrl: () => null, download: () => undefined, onViewPrompt: () => undefined, now });
  };
  it('its first tag is its live build, its sessions are the locked week’s list, its cards are Reference accordions', () => {
    // Week 1 opens with its live build (Wed, Dec 2, 1:00 PM CT): ten minutes in, the build is live.
    const props = week1(Date.parse('2026-12-02T19:10:00Z'));
    expect(props.tags[0]).toEqual({ icon: 'radio', label: 'Live build Wed, Dec 2, 1:00 PM CT' });
    expect(props.sessions?.map((x) => [x.title, x.kind, x.state])).toEqual([
      ['Map Your Spend Live Build', 'Live build', 'live'],
      ['Map Your Spend Office Hours', 'Office hours', 'wait'],
    ]);
    const titles = props.reference.map((x) => x.title);
    expect(titles.slice(-2)).toEqual(['Seat Card', 'Playbook Card']);
    const seat = props.reference.find((x) => x.title === 'Seat Card')!;
    expect(seat.blocks[0]).toMatchObject({ type: 'dl' });
  });
  it('each session line follows the Schedule’s state: Live now, then a replay or Session ended', () => {
    const during = week1(Date.parse('2026-12-02T19:30:00Z'));
    expect(during.sessions?.[0]?.state).toBe('live');
    const after = week1(Date.parse('2026-12-02T22:00:00Z'));
    expect(['processing', 'replay', 'ended']).toContain(after.sessions?.[0]?.state);
  });
  it('a self-paced week (Week 0) has no sessions and keeps "Self-paced"', () => {
    const st = learnState(Date.parse('2026-11-20T21:18:00Z'), false, { 0: ['c1'] });
    const me = learnerOf(st.db, LEARNER_ID);
    const rows = weekRows(st.payload, st.db, me);
    const r = rows.find((x) => x.week === 0)!;
    const props = weekProps({ p: st.payload, rows, r, me, checks: me?.checks ?? [], build: null, fileUrl: () => null, download: () => undefined, onViewPrompt: () => undefined, now: st.now });
    expect(props.sessions).toBeUndefined();
    expect(props.tags[0]!.label).toBe('Self-paced');
  });
});
