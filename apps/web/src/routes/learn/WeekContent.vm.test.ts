// D-184: the open week's content, build kit, downloads, pager and trail in the learner portal v2, and the
// sidebar's Team Hub and cohort line. Every field present shows; every field empty shows nothing.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import type { AIEmployee, Db } from '@ai/core';
import { courseFor, courseSessions } from '@ai/core/course';
import type { LearnerCourse, OpenCourseWeek } from '@ai/core/course';
import type { CohortCourse } from '@ai/core/course-types';
import { planContentV2 } from '@ai/core/seed/content-v2';
import { planCopyV1 } from '@ai/core/seed/copy-v1';
import { seedProduction } from '@ai/core/seed/curriculum';
import { planReleaseV1 } from '@ai/core/seed/release-plan-v1';
import type { CoursePayload } from '../course/Course.vm';
import { COPY, skillVM } from '../course/Course.vm';
import { buildKitVM, codeLines, crumbsVM, tabTitle, weekContentVM } from './WeekContent.vm';
import { hasTeamHub, sideVM, weekRows } from './learn.vm';
import { weekVM } from './Week.vm';
import { learner } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const LIVE = Date.parse('2026-12-09T19:05:00Z');
const deployed = (): Db => planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;

/** The whole course open (staff's view, as the builder's preview has it), from the deployed seed. */
function payloadOf(d: Db): CoursePayload {
  return { open: true, preview: false, course: courseFor(d, LIVE, 'staff')!, sessions: courseSessions(d), copy: {} };
}
const open = (p: CoursePayload, week: number) => p.course.weeks.find((w) => w.week === week) as OpenCourseWeek;
const ids = (p: CoursePayload, week: number) => weekContentVM(p, week)!.sections.map((x) => x.id);

describe('the week’s content (D-184)', () => {
  it('@parity:K-1 @parity:K-2 @parity:K-3 @parity:K-4 @parity:K-6 @parity:K-7 every field present shows, in the course page’s order', () => {
    const p = payloadOf(deployed());
    open(p, 1).officeHours!.outputs = ['A spend map you trust.'];
    // D-217: the builder's flagship and tools follow Who Does What; a sample output (when set) comes before the cards.
    expect(ids(p, 1)).toEqual(['why', 'who', 'tools', 'live', 'office-hours', 'homework', 'evidence', 'rubric', 'readiness', 'media', 'seat', 'playbook']);
    open(p, 1).sampleOutput = { title: 'Sample report', madeUpLabel: 'Made-up data', blocks: [{ type: 'table', head: ['Source', 'Cost'], rows: [['Zillow', '$1']] }] };
    const sample = weekContentVM(p, 1)!.sections.find((x) => x.id === 'sample')!;
    expect(ids(p, 1).indexOf('sample')).toBe(ids(p, 1).indexOf('seat') - 1);
    expect(sample).toMatchObject({ title: 'Sample report', meta: 'Made-up data', parts: [{ kind: 'table', head: ['Source', 'Cost'], rows: [['Zillow', '$1']] }] });
    expect(weekContentVM(p, 1)!.sections.find((x) => x.id === 'tools')!.parts[0]).toEqual({ kind: 'rows', heading: null, rows: [{ label: 'Flagship', text: open(p, 1).flagship }] });
    const vm = weekContentVM(p, 1)!;
    const sec = (id: string) => vm.sections.find((x) => x.id === id)!;
    const w = open(p, 1);

    expect(sec('why')).toMatchObject({ title: COPY.why, parts: [{ kind: 'list', items: w.why }] });
    expect(sec('who').title).toBe(COPY.whoDoesWhat);
    expect(sec('who').parts).toEqual([
      { kind: 'rows', heading: null, rows: [{ label: 'Owner', text: w.owner }, { label: 'Operator', text: w.operator }] },
      { kind: 'rows', heading: COPY.time, rows: [{ label: 'Owner', text: w.time.owner }, { label: 'Operator', text: w.time.operator }] },
      { kind: 'text', text: p.course.shared.estimateNote, note: true },
    ]);

    // The live build: when (the viewer's zone, then the program's), its length, the agenda and the rest.
    const live = sec('live');
    expect(live.meta).toBe('Wed, Dec 2 · 12:00 PM MT (1:00 PM CT) · 90 Minutes');
    expect(live.parts[0]).toMatchObject({ kind: 'rows', heading: COPY.agenda });
    expect((live.parts[0] as { rows: unknown[] }).rows).toHaveLength(w.liveBuild!.agenda.length);
    expect((live.parts[0] as { rows: { label: string }[] }).rows[0]!.label).toBe(`${w.liveBuild!.agenda[0]!.from} to ${w.liveBuild!.agenda[0]!.to} min`);
    expect(live.parts[1]).toEqual({
      kind: 'rows',
      heading: null,
      rows: [
        { label: COPY.lesson, text: w.liveBuild!.lesson },
        { label: COPY.exercise, text: w.liveBuild!.exercise },
        { label: COPY.required, text: w.liveBuild!.required },
        { label: COPY.advanced, text: w.liveBuild!.advanced },
        { label: COPY.ownerApproval, text: w.liveBuild!.ownerApproval },
      ].filter((r) => r.text),
    });
    expect(live.parts).toContainEqual({ kind: 'list', heading: COPY.workingAtEnd, items: w.liveBuild!.workingAtEnd });
    expect(live.parts).toContainEqual(expect.objectContaining({ kind: 'rows', heading: COPY.inClass }));

    // Office hours: its title, when and length, its note, format, outputs, rules and the issue form.
    const oh = sec('office-hours');
    expect(oh.meta).toBe(`${w.officeHours!.title} · Thu, Dec 3 · 12:00 PM MT (1:00 PM CT) · 60 Minutes`);
    expect(oh.parts[0]).toEqual({ kind: 'text', text: w.officeHours!.note, note: false });
    expect(oh.parts).toContainEqual({ kind: 'list', heading: COPY.youLeaveWith, items: ['A spend map you trust.'] });
    expect(oh.parts).toContainEqual(expect.objectContaining({ kind: 'rows', heading: COPY.issueForm }));

    const hw = sec('homework');
    expect(hw.parts).toContainEqual({ kind: 'list', heading: COPY.byWeekEnd, items: w.homework.byWeekEnd });
    expect(hw.parts).toContainEqual({ kind: 'list', heading: COPY.assignment, items: w.homework.assignment });
    expect(hw.parts).toContainEqual({ kind: 'list', heading: COPY.acceptance, items: w.homework.acceptance });
    expect(hw.parts).toContainEqual({ kind: 'rows', heading: null, rows: [{ label: COPY.useEvidence, text: w.homework.useEvidence }] });

    expect(sec('evidence').parts[0]).toMatchObject({ kind: 'rows', rows: p.course.shared.evidence.map((e) => ({ label: e.label, text: e.hint })) });
    expect(sec('rubric').parts[0]).toEqual({ kind: 'text', text: p.course.shared.rubricScale.map((x) => `${x.score} ${x.label}`).join(' · '), note: true });
    expect(sec('readiness').parts[0]).toMatchObject({ kind: 'rows', rows: p.course.shared.readiness.map((r) => ({ label: r.gate, text: r.text })) });
    expect(sec('media').parts).toEqual([
      { kind: 'list', heading: null, items: w.media },
      { kind: 'list', heading: COPY.materials, items: w.materials },
    ]);
  });

  it('D-188: puts a week’s Media videos after its lines, each to play inline', () => {
    const d = deployed();
    const m = d.modules.find((x) => x.course?.week === 1)!;
    const video = { type: 'video' as const, source: { url: 'https://cdn.example.test/recap.m3u8' }, title: 'Recap' };
    m.course!.media = [...m.course!.media, video];
    const p = payloadOf(d);
    const w = open(p, 1);
    const media = weekContentVM(p, 1)!.sections.find((x) => x.id === 'media')!;
    expect(media.parts).toEqual([
      { kind: 'list', heading: null, items: w.media.filter((x) => typeof x === 'string') },
      { kind: 'videos', videos: [video] },
      { kind: 'list', heading: COPY.materials, items: w.materials },
    ]);
  });

  it('@parity:K-8 @parity:K-10 How It Works on the course’s first week, the graduation and after-the-course paths on its last', () => {
    const p = payloadOf(deployed());
    expect(ids(p, 0)[0]).toBe('how');
    expect(ids(p, 1)).not.toContain('how');
    const how = weekContentVM(p, 0)!.sections[0]!;
    expect(how.parts[0]).toEqual({ kind: 'list', heading: null, items: p.course.intro.how });
    expect(how.parts[1]).toMatchObject({ kind: 'rows', rows: [{ label: 'Owner', text: p.course.intro.roles.owner }, { label: 'Operator', text: p.course.intro.roles.operator }] });
    expect(how.parts.slice(2).map((x) => (x as { text: string }).text)).toEqual([p.course.intro.scope, p.course.intro.instructor, p.course.intro.support].filter(Boolean));
    const last = ids(p, 8);
    expect(last.slice(-2)).toEqual(['graduation', 'after']);
    const after = weekContentVM(p, 8)!.sections.at(-1)!;
    expect(after.parts).toContainEqual(expect.objectContaining({ kind: 'rows', heading: COPY.pilot }));
  });

  it('@parity:K-15 the seat card and the playbook card, as `GET /api/course` now sends them, each row the builder filled', () => {
    const d = deployed();
    const p = payloadOf(d);
    const w = open(p, 1);
    // The API's answer carries the week's cards (D-184), straight from the builder's data.
    expect(w.seatCard).toEqual(d.modules.find((m) => m.id === 'accelerator-week-1')!.course!.seatCard);
    expect(w.seatCard && w.playbookCard).toBeTruthy();
    const vm = weekContentVM(p, 1)!;
    expect(vm.sections.map((x) => x.id).slice(-2)).toEqual(['seat', 'playbook']);
    const seat = vm.sections.find((x) => x.id === 'seat')!;
    expect(seat.title).toBe('Seat Card');
    expect((seat.parts[0] as { rows: { label: string; text: string }[] }).rows).toContainEqual({ label: 'Seat', text: w.seatCard!.seat });
    const pb = vm.sections.find((x) => x.id === 'playbook')!;
    expect(pb.title).toBe('Playbook Card');
    expect((pb.parts[0] as { rows: { label: string; text: string }[] }).rows).toContainEqual({ label: 'Play', text: w.playbookCard!.play });
    // A week without cards has no such section, and an empty row is left out.
    expect(ids(p, 0)).not.toContain('seat');
    Object.assign(w, {
      seatCard: { seat: 'Finance Analyst', reportsTo: 'The owner', runs: 'Weekly', pulls: 'The books', applies: 'The chart', produces: 'A spend map', tookOver: 'Categorizing', cantDo: 'Pay bills', firstRun: '' },
      playbookCard: { number: '4', question: 'Where does the money go?', play: 'Map it weekly.', signedOff: true },
    });
    const again = weekContentVM(p, 1)!;
    expect((again.sections.find((x) => x.id === 'seat')!.parts[0] as { rows: { label: string }[] }).rows.map((r) => r.label)).toEqual(['Seat', 'Reports To', 'Runs', 'Pulls', 'Applies', 'Produces', 'Took Over', 'Can’t Do']);
    expect(again.sections.find((x) => x.id === 'playbook')).toMatchObject({ meta: 'Signed Off', parts: [{ rows: [{ label: 'Number', text: '4' }, { label: 'Question', text: 'Where does the money go?' }, { label: 'Play', text: 'Map it weekly.' }] }] });
  });

  it('the open week’s question, for under its title; none when it has none', () => {
    const p = payloadOf(deployed());
    expect(weekContentVM(p, 1)!.question).toBe(open(p, 1).question);
    open(p, 1).question = '';
    expect(weekContentVM(p, 1)!.question).toBeNull();
  });

  it('@parity:E-18 the header line: From Session N to the Schedule, or Self-Paced, the build minutes and who it’s for', () => {
    const d = deployed();
    const p = payloadOf(d);
    const m1 = d.modules.find((m) => m.id === 'accelerator-week-1')!;
    const s1 = p.sessions.find((s) => s.week === 1 && s.kind === 'build')!;
    const mins = (w: number) => open(p, w).module.checklist.reduce((n, s) => n + s.mins, 0);
    expect(weekContentVM(p, 1, m1)!.meta).toEqual({
      session: { label: `From Session ${s1.n}`, title: s1.title, href: '/learn/schedule' },
      selfPaced: null,
      build: `${mins(1)} Min Build`,
      forWho: `For ${m1.forWho}`,
    });
    // Week 0 has no live build: Self-Paced, as the current portal says of an AI Employee with no session.
    expect(weekContentVM(p, 0)!.meta).toEqual({ session: null, selfPaced: 'Self-Paced', build: `${mins(0)} Min Build`, forWho: null });
    // An empty value renders nothing.
    open(p, 0).module.checklist.forEach((s) => (s.mins = 0));
    expect(weekContentVM(p, 0, { forWho: '' })!.meta).toEqual({ session: null, selfPaced: 'Self-Paced', build: null, forWho: null });
  });

  it('@parity:X-2 the tab is named after the week, and a step after itself and its week, as the course page names it', () => {
    expect(tabTitle(1, 'Where the Money Goes')).toBe('Week 1 · Where the Money Goes · Amplified AI Accelerator');
    expect(tabTitle(1, 'Where the Money Goes', { n: 2, title: 'Answer the Flags' })).toBe('Step 2 · Answer the Flags · Week 1 · Where the Money Goes · Amplified AI Accelerator');
  });

  it('@parity:K-5 a week’s skills carry their role and Free, as the course page tags them, and the kit links the Skill Library', () => {
    const d = deployed();
    const p = payloadOf(d);
    const rows = weekRows(p, d, null);
    const vm = weekVM(p, rows, 1, LIVE, () => null);
    if (vm.kind !== 'open') throw new Error('not open');
    const w = open(p, 1);
    const skills = vm.kit!.rows.filter((r) => r.key.startsWith('skill:'));
    expect(skills.map((r) => r.tags)).toEqual(w.skills.map((k) => [{ label: skillVM(k, p.copy).role }, ...(k.free ? [{ label: 'Free', tone: 'done' }] : [])]));
    expect(skills[0]!.tags![0]!.label).toBe('Flagship');
    expect(vm.kit!.library).toEqual({ label: 'Download in Your Skill Library', href: '/learn/skills' });
    // A kit item that isn't a skill has no tags.
    expect(vm.kit!.rows.filter((r) => !r.key.startsWith('skill:')).every((r) => !r.tags)).toBe(true);
  });

  it('every field empty shows nothing: no section, no heading, no download', () => {
    const d = deployed();
    const p = payloadOf(d);
    const blank = (w: OpenCourseWeek) =>
      Object.assign(w, {
        why: [],
        owner: '',
        operator: '',
        time: { owner: '', operator: '' },
        liveBuild: { sessionId: w.liveBuild?.sessionId ?? 'none', agenda: [], lesson: '', exercise: '', required: '', advanced: '', ownerApproval: '', workingAtEnd: [] },
        officeHours: w.officeHours ? { sessionId: w.officeHours.sessionId, title: '', note: '', format: null, outputs: [] } : null,
        homework: { byWeekEnd: [], assignment: [], acceptance: [], useEvidence: '' },
        media: [],
        materials: [],
        seatCard: undefined,
        playbookCard: undefined,
        flagship: undefined,
        tools: undefined,
        sampleOutput: undefined,
      });
    for (const w of p.course.weeks) blank(w as OpenCourseWeek);
    const empty: CohortCourse = {
      intro: { ...p.course.intro, how: [], roles: { owner: '', operator: '' }, scope: '', support: '', instructor: '' },
      shared: { ...p.course.shared, officeHoursRules: [], issueForm: [], evidence: [], rubric: [], rubricRules: [], readiness: [], paths: [], missedAWeek: '', estimateNote: '' },
      before: { ...p.course.before, practiceSetNote: '' },
      after: { graduation: [], graduationNote: '', paths: [], noPaywall: '', pilotQuestions: [] },
    };
    const q: CoursePayload = { ...p, course: { ...p.course, ...empty } as LearnerCourse };
    for (const week of [0, 1, 4, 8]) {
      const vm = weekContentVM(q, week)!;
      // A session's line alone is no section: an office hours with nothing to say isn't drawn.
      expect(vm.sections, `week ${week}`).toEqual([]);
    }
    expect(weekContentVM(q, 0)!.downloads).toEqual([]);
  });

  it('a locked week, or one not in the course, has no content', () => {
    const d = deployed();
    const p: CoursePayload = { open: true, preview: false, course: courseFor(d, LIVE, { open: true, preview: false })!, sessions: courseSessions(d), copy: {} };
    expect(weekContentVM(p, 8)).toBeNull();
    expect(weekContentVM(p, 42)).toBeNull();
  });

  it('@parity:K-12 Previous and Next week, each to its own week page', () => {
    const p = payloadOf(deployed());
    expect(weekContentVM(p, 0)!.pager).toEqual({ prev: null, next: { label: 'Next', title: `Week 1 · ${open(p, 1).title}`, href: '/learn/week/1' } });
    expect(weekContentVM(p, 3)!.pager).toEqual({
      prev: { label: 'Previous', title: `Week 2 · ${open(p, 2).title}`, href: '/learn/week/2' },
      next: { label: 'Next', title: `Week 4 · ${open(p, 4).title}`, href: '/learn/week/4' },
    });
    expect(weekContentVM(p, 8)!.pager!.next).toBeNull();
  });
});

describe('the week’s downloads (D-184)', () => {
  it('@parity:K-13 the per-week templates on their weeks; the worksheet and practice set only while the practice set note is set', () => {
    const d = deployed();
    const p = payloadOf(d);
    expect(weekContentVM(p, 0)!.downloads).toEqual([]);
    expect(weekContentVM(p, 1)!.downloads.map((x) => x.name)).toEqual(['use-log.csv']);
    expect(weekContentVM(p, 8)!.downloads.map((x) => x.name)).toContain('use-log.csv');
    expect(weekContentVM(p, 1)!.downloads[0]!.content.split('\n')[0]).toContain(',');
    const noted: CoursePayload = { ...p, course: { ...p.course, before: { ...p.course.before, practiceSetNote: 'Practice on the sample books first.' } } };
    expect(weekContentVM(noted, 0)!.downloads.map((x) => x.name)).toEqual(['week-1-worksheet.csv', 'week-1-practice-set.csv']);
    expect(weekContentVM(noted, 1)!.downloads.map((x) => x.name)).toEqual(['week-1-worksheet.csv', 'week-1-practice-set.csv', 'use-log.csv']);
    expect(weekContentVM(noted, 2)!.downloads.map((x) => x.name)).toEqual(['use-log.csv']);
  });
});

describe('the build kit (D-184)', () => {
  const files = (ref: { kind: string; moduleId?: string; fileName?: string }) => `/api/files/module/${ref.moduleId}/${ref.fileName}`;
  const mod = (over: Partial<AIEmployee>): AIEmployee => ({ ...deployed().modules.find((m) => m.id === 'accelerator-week-1')!, ...over });

  it('@parity:E-10 @parity:C-10 the system prompt: its stats, its text to view and copy, and its variables', () => {
    const vm = buildKitVM(mod({ prompt: '# Role\nYou are {{TEAM_NAME}}’s analyst.\nUse {{CHART}} and {{TEAM_NAME}}.', files: [], notes: '' }), files)!;
    expect(vm.prompt).toMatchObject({ title: 'System Prompt', stats: '3 lines · about 18 tokens', vars: ['TEAM_NAME', 'CHART'], fileName: 'week-1-system-prompt.md' });
    expect(vm.prompt!.lines[0]).toEqual({ n: 1, parts: [{ t: '# Role', kind: 'head' }] });
    expect(vm.prompt!.lines[1]!.parts.map((x) => x.kind)).toEqual(['text', 'var', 'text']);
    expect(vm.files).toEqual([]);
    expect(vm.notes).toBeNull();
  });

  it('@parity:E-11 @parity:A-9 the module’s files, each downloaded through the gated files route; a Notion template only previews', () => {
    const vm = buildKitVM(
      mod({
        prompt: '',
        notes: '',
        files: [
          { name: 'spend-map.skill.yaml', type: 'YAML', size: '2 KB', desc: 'The spend map skill', steps: ['Pull the books'] },
          { name: 'Spend Review', type: 'Notion', size: '', desc: 'The review page', steps: [] },
        ],
      }),
      files,
    )!;
    expect(vm.prompt).toBeNull();
    expect(vm.files.map(({ lines: _l, preview: _p, ...f }) => f)).toEqual([
      { key: '0:spend-map.skill.yaml', name: 'spend-map.skill.yaml', type: 'YAML', meta: 'YAML · The spend map skill · 2 KB', href: '/api/files/module/accelerator-week-1/spend-map.skill.yaml', downloadLabel: 'Download spend-map.skill.yaml' },
      { key: '1:Spend Review', name: 'Spend Review', type: 'Notion', meta: 'Notion · The review page', href: null, downloadLabel: 'Download Spend Review' },
    ]);
    expect(vm.files[0]!.preview).toContain('name: spend-map');
  });

  it('@parity:E-13 the instructor notes, with who wrote them', () => {
    const vm = buildKitVM(mod({ prompt: '', files: [], notes: 'Bring last month’s statements.', instructor: 'Connor Leiva' }), files)!;
    expect(vm.notes).toEqual({ title: 'Instructor Notes', who: 'Connor Leiva', initials: 'CL', body: 'Bring last month’s statements.' });
  });

  it('a module with no prompt, files or notes has no kit; nor does a week with no module', () => {
    expect(buildKitVM(mod({ prompt: '  ', files: [], notes: '' }), files)).toBeNull();
    expect(buildKitVM(undefined, files)).toBeNull();
  });

  it('marks headings and variables, and keeps a blank line', () => {
    expect(codeLines('a\n\n{{X}}')).toEqual([
      { n: 1, parts: [{ t: 'a', kind: 'text' }] },
      { n: 2, parts: [{ t: ' ', kind: 'blank' }] },
      { n: 3, parts: [{ t: '{{X}}', kind: 'var' }] },
    ]);
  });
});

describe('the trail and the sidebar (D-184)', () => {
  it('@parity:SH-7 Home, the week, and the step on a step', () => {
    expect(crumbsVM('Foundations', 0)).toEqual([
      { label: 'Home', href: '/learn' },
      { label: 'Foundations', href: null },
    ]);
    expect(crumbsVM('Foundations', 0, { n: 3, title: 'Start Your Time Baseline' })).toEqual([
      { label: 'Home', href: '/learn' },
      { label: 'Foundations', href: '/learn/week/0' },
      { label: 'Step 3 · Start Your Time Baseline', href: null },
    ]);
  });

  it('@parity:T-1 Team Hub for a Team tier learner on a team, never for an Agent tier one', () => {
    const d = deployed();
    d.teams.push({ id: 't1', name: 'Ross Team', ownerId: 'u-dana', seats: 5 });
    const owner = { ...learner({}), teamId: 't1' };
    const agent = { ...learner({}), tier: 'agent' as const, role: 'Agent' as const, teamId: null };
    expect(hasTeamHub(d, owner)).toBe(true);
    expect(hasTeamHub(d, { ...owner, teamId: null })).toBe(false);
    expect(hasTeamHub(d, agent)).toBe(false);
    expect(hasTeamHub(d, null)).toBe(false);
    // D-182: the Team Hub inside the learner portal, where `/team` sends a learner with the course.
    expect(sideVM(d, owner, null, '/learn/team', LIVE).teamHub).toEqual({ label: 'Team Hub', href: '/learn/team', active: true });
    expect(sideVM(d, agent, null, '/learn', LIVE).teamHub).toBeNull();
  });

  it('@parity:SH-9 the cohort line for a learner in the course, and none without the course', () => {
    const d = deployed();
    const me = learner({});
    const p = payloadOf(d);
    expect(sideVM(d, me, p, '/learn', LIVE).cohortLine).toBe(`${d.cohorts[0]!.name} Cohort · Week 2 of 8`);
    expect(sideVM(d, me, null, '/learn', LIVE).cohortLine).toBeNull();
    expect(sideVM(d, null, p, '/learn', LIVE).cohortLine).toBeNull();
  });
  it('D-226: the v3 shell’s two lines, the program and the cohort, from a name that leads with the program', () => {
    const d = deployed();
    const named = { ...d, cohorts: d.cohorts.map((c, i) => (i === 0 ? { ...c, name: 'Amplified AI Accelerator · December 2026' } : c)) };
    const me = learner({});
    const p = payloadOf(named);
    const v = sideVM(named, me, p, '/learn', LIVE);
    expect(v.program).toBe('Amplified AI Accelerator');
    expect(v.cohortOnly).toBe('December 2026 Cohort · Week 2 of 8');
    expect(v.cohortLine).toBe('Amplified AI Accelerator · December 2026 Cohort · Week 2 of 8');
    const plain = { ...d, cohorts: d.cohorts.map((c, i) => (i === 0 ? { ...c, name: 'December 2026' } : c)) };
    expect(sideVM(plain, me, payloadOf(plain), '/learn', LIVE).cohortOnly).toBe('December 2026 Cohort · Week 2 of 8');
    expect(sideVM(d, me, null, '/learn', LIVE)).toMatchObject({ program: null, cohortOnly: null });
  });
});
