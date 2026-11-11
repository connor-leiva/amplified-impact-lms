// The Amplified AI Accelerator (D-110): the locked calendar, who can open it, the portal's nine AI
// Employees and the words every week must carry. Every instant below is written with its offset:
// December to February in Central Time is CST, UTC-6.
import { describe, expect, it } from 'vitest';
import {
  STEPS,
  cohortLine,
  cohortWeek,
  moduleForSession,
  scopeSnapshot,
  seed,
  seedProduction,
  sessionEvent,
  sessionFor,
  sessionKind,
  sessionLabel,
  sessionWeek,
} from '../src/index';
import type { Db } from '../src/index';
import {
  ACCELERATOR_CALENDAR,
  ACCELERATOR_MODULE_IDS,
  COURSE_OPENS_AT,
  LIBRARY_ROUTES_PENDING_MERGE,
  acceleratorCohort,
  acceleratorOpen,
  acceleratorSessions,
  isAcceleratorModule,
} from '../src/accelerator';
import {
  ACCELERATOR_WEEKS_CONTENT,
  EVIDENCE_PACKET,
  ISSUE_FORM_FIELDS,
  LIVE_BUILD_AGENDA,
  OFFICE_HOURS_FORMAT,
  RUBRIC,
  WEEK8_AGENDA,
  acceleratorModules,
  courseContent,
  rubricResult,
} from '../src/accelerator-content';
import { DEFAULT_INVITES_FROM } from '../src/offer';

const CT = (s: string) => Date.parse(`${s}-06:00`);
/** The Central wall clock of an instant, `YYYY-MM-DD HH:MM`, independent of the host zone. */
const wall = (t: number) => new Date(t - 6 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const weekday = (t: number) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(t - 6 * 3600e3).getUTCDay()];

describe('the locked calendar', () => {
  const sessions = acceleratorSessions();
  const builds = sessions.filter((s) => sessionKind(s) === 'build');
  const thursdays = sessions.filter((s) => sessionKind(s) === 'office_hours');

  it('has eight Wednesday builds at 1:00 PM Central, 90 minutes each, on the table’s dates', () => {
    expect(builds.map((s) => wall(s.start))).toEqual([
      '2026-12-02 13:00',
      '2026-12-09 13:00',
      '2026-12-16 13:00',
      '2027-01-06 13:00',
      '2027-01-13 13:00',
      '2027-01-20 13:00',
      '2027-01-27 13:00',
      '2027-02-03 13:00',
    ]);
    for (const s of builds) {
      expect(weekday(s.start)).toBe('Wed');
      expect(s.mins).toBe(90);
    }
    expect(builds.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('has eight Thursday sessions at 1:00 PM Central, 60 minutes each, the day after each build', () => {
    expect(thursdays.map((s) => wall(s.start))).toEqual([
      '2026-12-03 13:00',
      '2026-12-10 13:00',
      '2026-12-17 13:00',
      '2027-01-07 13:00',
      '2027-01-14 13:00',
      '2027-01-21 13:00',
      '2027-01-28 13:00',
      '2027-02-04 13:00',
    ]);
    for (const s of thursdays) {
      expect(weekday(s.start)).toBe('Thu');
      expect(s.mins).toBe(60);
      expect(s.id).toMatch(/^dec26-oh[1-8]$/);
    }
  });

  it('titles Dec 10 and Dec 17 as the goal-planning sessions', () => {
    const byDay = Object.fromEntries(thursdays.map((s) => [wall(s.start).slice(0, 10), s.title]));
    expect(byDay['2026-12-10']).toBe('Goal-Planning Session 1 and Office Hours');
    expect(byDay['2026-12-17']).toBe('Goal-Planning Session 2 and Office Hours');
    expect(thursdays.filter((s) => /Goal-Planning/.test(s.title))).toHaveLength(2);
  });

  it('skips the holidays: nothing on Dec 23, Dec 24, Dec 30 or Dec 31, and nothing between Dec 18 and Jan 5', () => {
    const days = sessions.map((s) => wall(s.start).slice(0, 10));
    for (const d of ['2026-12-23', '2026-12-24', '2026-12-30', '2026-12-31']) expect(days).not.toContain(d);
    expect(sessions.filter((s) => s.start > CT('2026-12-18T00:00') && s.start < CT('2027-01-05T00:00'))).toEqual([]);
  });

  it('keeps every n unique, and no office hour’s n is a module’s session', () => {
    const ns = sessions.map((s) => s.n);
    expect(new Set(ns).size).toBe(16);
    const moduleSessions = acceleratorModules().map((m) => m.session);
    for (const s of thursdays) expect(moduleSessions).not.toContain(s.n);
  });

  it('invents no Zoom link: every session waits for the real one', () => {
    for (const s of sessions) expect(s.zoom).toBe('');
  });

  it('is the cohort the brief locks: 8 weeks from Wed Dec 2, ending after the Feb 4 office hour, 15 seats', () => {
    const co = acceleratorCohort();
    expect(co).toMatchObject({
      id: 'dec26',
      name: 'Amplified AI Accelerator · December 2026',
      weeks: 8,
      capacity: 15,
      enrolled: 0,
      cadence: 'Wed builds and Thu office hours · 1:00 PM CT',
    });
    expect(wall(co.start)).toBe('2026-12-02 13:00');
    expect(wall(co.end)).toBe('2027-02-04 14:00');
  });

  it('matches the calendar table row for row', () => {
    expect(ACCELERATOR_CALENDAR.map((w) => [w.week, w.build, w.thursday])).toEqual([
      [1, '2026-12-02', '2026-12-03'],
      [2, '2026-12-09', '2026-12-10'],
      [3, '2026-12-16', '2026-12-17'],
      [4, '2027-01-06', '2027-01-07'],
      [5, '2027-01-13', '2027-01-14'],
      [6, '2027-01-20', '2027-01-21'],
      [7, '2027-01-27', '2027-01-28'],
      [8, '2027-02-03', '2027-02-04'],
    ]);
  });
});

describe('the office-hours series beside the builds', () => {
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });

  it('ties a build and its office hour to the same week’s AI Employee', () => {
    for (let w = 1; w <= 8; w++) {
      const build = db.sessions.find((s) => s.id === `dec26-s${w}`)!;
      const oh = db.sessions.find((s) => s.id === `dec26-oh${w}`)!;
      expect(moduleForSession(db, build)!.id).toBe(`accelerator-week-${w}`);
      expect(moduleForSession(db, oh)!.id).toBe(`accelerator-week-${w}`);
      // The module's own session is the build, never the office hour.
      expect(sessionFor(db, 'dec26', moduleForSession(db, oh)!.session!)!.id).toBe(build.id);
      expect([sessionWeek(build), sessionWeek(oh)]).toEqual([w, w]);
      expect([sessionLabel(build), sessionLabel(oh)]).toEqual([`Session ${w}`, `Week ${w}`]);
    }
  });

  it('names an office hour by its week in the calendar file, and a build as before', () => {
    const oh = db.sessions.find((s) => s.id === 'dec26-oh2')!;
    expect(sessionEvent(oh).title).toBe('Amplified Impact · Week 2: Goal-Planning Session 1 and Office Hours');
    expect(sessionEvent(db.sessions.find((s) => s.id === 'dec26-s1')!).title).toBe('Amplified Impact · Session 1: Lead-Source ROI Live Build');
  });

  it('changes nothing for the reference’s sessions, which are all builds', () => {
    const demo = seed('live');
    for (const s of demo.sessions) {
      expect(sessionKind(s)).toBe('build');
      expect(sessionWeek(s)).toBe(s.n);
      expect(sessionLabel(s)).toBe(`Session ${s.n}`);
    }
  });
});

describe('the cohort line counts course weeks, not Mondays', () => {
  const db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  const co = db.cohorts[0]!;
  const line = (at: string) => cohortLine(co, CT(at), db.sessions);

  it('reads Week 4 on Jan 6 and Week 8 on Feb 3, across the two-week holiday', () => {
    expect(line('2026-11-20T09:00')).toMatch(/Cohort · Starts /);
    expect(line('2026-11-30T09:00')).toBe('Amplified AI Accelerator · December 2026 Cohort · Week 1 of 8');
    expect(line('2026-12-10T09:00')).toBe('Amplified AI Accelerator · December 2026 Cohort · Week 2 of 8');
    expect(line('2026-12-23T09:00')).toBe('Amplified AI Accelerator · December 2026 Cohort · Week 3 of 8');
    expect(line('2026-12-30T09:00')).toBe('Amplified AI Accelerator · December 2026 Cohort · Week 3 of 8');
    expect(line('2027-01-06T09:00')).toBe('Amplified AI Accelerator · December 2026 Cohort · Week 4 of 8');
    expect(line('2027-02-03T13:30')).toBe('Amplified AI Accelerator · December 2026 Cohort · Week 8 of 8');
    expect(line('2027-02-04T13:30')).toBe('Amplified AI Accelerator · December 2026 Cohort · Week 8 of 8');
    expect(line('2027-02-05T09:00')).toBe('Amplified AI Accelerator · December 2026 Cohort · Completed');
  });

  it('keeps the reference’s Monday arithmetic for every cohort without an office-hours series', () => {
    const demo = seed('live');
    for (const c of demo.cohorts) {
      for (const at of ['2026-11-27T10:42', '2026-12-07T10:42', '2027-01-12T10:42', '2027-03-01T10:00']) {
        expect(cohortWeek(c, CT(at), demo.sessions)).toBe(cohortWeek(c, CT(at)));
        expect(cohortLine(c, CT(at), demo.sessions)).toBe(cohortLine(c, CT(at)));
      }
    }
  });
});

describe('who can open the course', () => {
  const AFTER = CT('2026-11-20T09:00');
  const plan = (kind: string, option: string | null, status = 'active', startsAt?: number) => ({ kind, option, status, startsAt });

  it('opens for the AI Accelerator in full and in two payments', () => {
    expect(acceleratorOpen([plan('cohort', 'full')], AFTER)).toBe(true);
    expect(acceleratorOpen([plan('cohort', 'two_pay')], AFTER)).toBe(true);
    expect(acceleratorOpen([plan('cohort', 'two_pay', 'past_due')], AFTER)).toBe(true);
    expect(acceleratorOpen([plan('membership', 'year_upfront'), plan('cohort', 'full')], AFTER)).toBe(true);
  });

  it('stays shut for every other plan, for no plan, and for a refunded Accelerator', () => {
    expect(acceleratorOpen([], AFTER)).toBe(false);
    expect(acceleratorOpen([plan('membership', 'year_upfront')], AFTER)).toBe(false);
    expect(acceleratorOpen([plan('membership', 'monthly')], AFTER)).toBe(false);
    expect(acceleratorOpen([plan('agents', 'upto15')], AFTER)).toBe(false);
    expect(acceleratorOpen([plan('agents', '16to40')], AFTER)).toBe(false);
    expect(acceleratorOpen([plan('library', 'upfront')], AFTER)).toBe(false);
    expect(acceleratorOpen([plan('cohort', 'upfront')], AFTER)).toBe(false);
    expect(acceleratorOpen([plan('cohort', null)], AFTER)).toBe(false);
    expect(acceleratorOpen([plan('cohort', 'full', 'ended')], AFTER)).toBe(false);
  });

  it('honours the Nov 16 invite hold and a plan that has not started', () => {
    expect(COURSE_OPENS_AT).toBe(Date.parse(DEFAULT_INVITES_FROM));
    expect(acceleratorOpen([plan('cohort', 'full')], COURSE_OPENS_AT - 1)).toBe(false);
    expect(acceleratorOpen([plan('cohort', 'full')], COURSE_OPENS_AT)).toBe(true);
    expect(acceleratorOpen([plan('cohort', 'full', 'active', AFTER + 1)], AFTER)).toBe(false);
  });
});

describe('the snapshot, scoped by plan', () => {
  // A production database with two learners on cohort dec26: every paid buyer sits there, whatever
  // they bought, so the plan has to decide.
  const db = (): Db => {
    const d = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
    for (const id of ['u_buyer', 'u_insider'])
      d.users.push({ id, name: id, email: `${id}@example.test`, tier: 'team', role: 'Team Owner', teamId: `t_${id}`, cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} });
    return d;
  };

  it('gives an Accelerator buyer all nine weeks and all sixteen sessions', () => {
    const snap = scopeSnapshot(db(), { kind: 'learner', userId: 'u_buyer' }, { accelerator: true });
    expect(snap.modules.map((m) => m.id)).toEqual(ACCELERATOR_MODULE_IDS);
    expect(snap.modules.every((m) => m.checklist.length === STEPS && m.notes.length > 0)).toBe(true);
    expect(snap.sessions).toHaveLength(16);
  });

  it('gives any other plan none of the course: no modules, no notes, no sessions', () => {
    const snap = scopeSnapshot(db(), { kind: 'learner', userId: 'u_insider' }, { accelerator: false });
    expect(snap.modules.filter((m) => isAcceleratorModule(m.id))).toEqual([]);
    expect(snap.sessions).toEqual([]);
    expect(JSON.stringify(snap)).not.toContain('What are we paying for leads');
  });

  it('changes nothing for the demo, which has no course, nor for a caller that passes no access', () => {
    const demo = seed('live');
    const actor = { kind: 'learner' as const, userId: 'u_jamie' };
    expect(scopeSnapshot(demo, actor, { accelerator: false })).toEqual(scopeSnapshot(demo, actor));
    expect(scopeSnapshot(db(), { kind: 'learner', userId: 'u_insider' }).modules).toHaveLength(9);
  });
});

describe('the portal’s nine AI Employees', () => {
  const modules = acceleratorModules();

  it('keep the AIEmployee shape: six steps, three outputs, minutes that add up, no recording', () => {
    expect(modules.map((m) => m.id)).toEqual(ACCELERATOR_MODULE_IDS);
    for (const m of modules) {
      expect(m.checklist).toHaveLength(STEPS);
      expect(m.checklist.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
      expect(m.outputs).toHaveLength(3);
      expect(m.build).toBe(m.checklist.reduce((a, s) => a + s.mins, 0));
      expect(m.instructor).toBe('Connor Leiva');
      expect([m.dur, m.transcript, m.files, m.resources]).toEqual([0, [], [], []]);
      expect(m.runDemo).toBeUndefined();
      expect(m.status).toBe('published');
      expect(m.tier).toBe('team');
    }
    expect(modules.map((m) => m.session)).toEqual([null, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('point at the real Library skill instead of a course prompt pack', () => {
    for (const m of modules) {
      expect(m.prompt).toMatch(/The prompts for this week stay in the Library/);
      expect(m.prompt).toMatch(/https:\/\/www\.amplifiedimpact\.io\/[a-z0-9-]+/);
      // The portal turns a step mentioning a system prompt or skill files into a download button for
      // a course file that does not exist. No step says either.
      for (const s of m.checklist) expect(s.text).not.toMatch(/system prompt|skill file/i);
    }
  });

  it('map steps four to six to the three tests, the last with an approval in class', () => {
    for (const m of modules.slice(1, 8)) {
      expect(m.checklist.slice(3).map((s) => s.ch)).toEqual(['Normal Test', 'Missing-Input Test', 'Misleading-Input Test']);
      expect(m.checklist[5]!.text).toMatch(/owner|second person/i);
    }
  });
});

describe('every week’s words', () => {
  const weeks = ACCELERATOR_WEEKS_CONTENT;
  const course = courseContent();

  it('covers Week 0 and the eight weeks with the brief’s titles and questions', () => {
    expect(weeks.map((w) => [w.week, w.title, w.question])).toEqual([
      [0, 'Get Ready', 'Are we ready to start on our own data?'],
      [1, 'Know the Business', 'What are we paying for leads, and what can we trust?'],
      [2, 'Own the Day', 'What needs attention, and who owns the next action?'],
      [3, 'Turn Insight into a Decision', 'What should we solve this week?'],
      [4, 'Protect the Pipeline', 'Where is execution slipping?'],
      [5, 'Coach from Evidence', 'What behavior should change for this agent?'],
      [6, 'Delegate an Outcome', 'What work can leave the owner’s desk without lowering standards?'],
      [7, 'Make the Workflow Repeatable', 'Can our operator adapt and run the next workflow without the instructor?'],
      [8, 'Sustain and Expand', 'What stays, what stops, and what should agents adopt next?'],
    ]);
  });

  it('maps each week to the Library titles and routes in the brief, flagships first', () => {
    const map = Object.fromEntries(weeks.map((w) => [w.week, w.skills.map((s) => `${s.role}:${s.title}:${s.route}`)]));
    expect(map[0]).toEqual([
      'flagship:AI Brain Setup:/ai-brain-setup',
      'flagship:Sounds Like You: Your AI Voice Profile:/voice-profile',
      'flagship:Team AI Brain:/team-ai-brain',
      'supporting:The Ops Time Audit:/ops-time-audit',
    ]);
    expect(map[1]).toEqual(['flagship:Lead-Source ROI:/lead-source-roi', 'supporting:FUB Pipeline Review:/fub-pipeline-review', 'supporting:Team P&L Review:/team-pnl-review']);
    expect(map[2]).toEqual(['flagship:Morning Brief:/morning-brief', 'supporting:Task Sync Starter Kit:/task-sync-starter', 'supporting:Inbox and Meeting Follow-Through:/inbox-meeting-follow-through']);
    expect(map[3]).toEqual(['flagship:L10 Meeting Prep:/l10-meeting-prep', 'supporting:Task Sync Starter Kit:/task-sync-starter']);
    expect(map[4]).toEqual([
      'flagship:FUB Pipeline Review:/fub-pipeline-review',
      'optional:Contract-to-Close Deadline Tracker:/contract-to-close-deadlines',
      'optional:Stalled Lender, Title & Escrow Follow-Up:/stalled-item-follow-up',
      'optional:TC File Audit:/tc-file-audit',
      'optional:Database Health Check:/database-health-check',
    ]);
    expect(map[5]).toEqual([
      'flagship:Agent 1:1 Prep:/agent-1on1-prep',
      'supporting:FUB Pipeline Review:/fub-pipeline-review',
      'pilot:Listing Appointment Prep:/listing-appointment-prep',
      'pilot:Appointment Follow-Up:/appointment-follow-up',
    ]);
    expect(map[6]).toEqual(['flagship:Team Playbook Builder:/team-playbook-builder', 'supporting:Inbox and Meeting Follow-Through:/inbox-meeting-follow-through', 'supporting:Task Sync Starter Kit:/task-sync-starter']);
    expect(map[7]).toEqual(['flagship:New Agent Onboarding Plan:/new-agent-onboarding-plan', 'supporting:Team Playbook Builder:/team-playbook-builder', 'alternative:Recruiting Prep:/recruiting-prep']);
    expect(map[8]).toEqual(['supporting:Lead-Source ROI:/lead-source-roi', 'supporting:FUB Pipeline Review:/fub-pipeline-review']);
    // AI Brain Setup stays free.
    expect(weeks[0]!.skills.find((s) => s.route === '/ai-brain-setup')!.free).toBe(true);
  });

  it('gives every week an intro, an owner and an operator, a time budget and a numbered setup order', () => {
    for (const w of weeks) {
      expect(w.why.length).toBeGreaterThan(0);
      expect(w.owner).not.toBe('');
      expect(w.operator).not.toBe('');
      expect(w.time.owner).toMatch(/^About /);
      expect(w.time.operator).toMatch(/^About /);
      expect(w.setup.length).toBeGreaterThanOrEqual(5);
      // Every setup step that opens a skill opens one the week names.
      for (const step of w.setup) if (step.route) expect(w.skills.map((s) => s.route)).toContain(step.route);
    }
  });

  it('gives weeks 1 to 8 a live-build page and an office-hours page tied to their sessions', () => {
    const sessions = acceleratorSessions();
    for (const w of weeks.slice(1)) {
      expect(w.liveBuild!.sessionId).toBe(`dec26-s${w.week}`);
      expect(w.officeHours!.sessionId).toBe(`dec26-oh${w.week}`);
      expect(sessions.find((s) => s.id === w.officeHours!.sessionId)!.title).toBe(w.officeHours!.title);
      expect(w.liveBuild!.required).not.toBe('');
      expect(w.liveBuild!.advanced).not.toBe('');
      expect(w.liveBuild!.ownerApproval).toMatch(/owner/i);
      expect(w.liveBuild!.workingAtEnd.length).toBeGreaterThan(0);
      expect(w.homework.byWeekEnd.length).toBeGreaterThan(0);
    }
    expect([weeks[0]!.liveBuild, weeks[0]!.officeHours]).toEqual([null, null]);
  });

  it('runs every build for 90 minutes and every office hour 10, 40, 10', () => {
    for (const agenda of [LIVE_BUILD_AGENDA, WEEK8_AGENDA]) {
      expect(agenda[0]!.from).toBe(0);
      expect(agenda[agenda.length - 1]!.to).toBe(90);
      agenda.slice(1).forEach((a, i) => expect(a.from).toBe(agenda[i]!.to));
    }
    expect(OFFICE_HOURS_FORMAT.map((a) => a.to - a.from)).toEqual([10, 40, 10]);
    expect(ISSUE_FORM_FIELDS.map((f) => f.label)).toEqual(['Expected Result', 'Actual Result', 'Redacted Input', 'What You Tried', 'Platform']);
  });

  it('carries the evidence packet and the rubric for every week', () => {
    expect(EVIDENCE_PACKET.map((e) => e.label)).toEqual(['Skill and Version Link', 'One Redacted Output', 'Test Checklist', 'Use Log', 'Three-Sentence Account']);
    expect(RUBRIC.map((d) => d.label)).toEqual(['Business Fit', 'Evidence Quality', 'Output Quality', 'Control', 'Repeatability']);
    expect(course.shared.evidence).toBe(EVIDENCE_PACKET);
    expect(course.shared.rubric).toBe(RUBRIC);
    for (const w of weeks) expect(w.homework.useEvidence).not.toBe('');
  });

  it('scores the rubric the plan’s way: 8 of 10 and no zero in evidence or control', () => {
    expect(rubricResult([2, 2, 2, 2, 2])).toEqual({ total: 10, tested: true });
    expect(rubricResult([2, 2, 1, 2, 1])).toEqual({ total: 8, tested: true });
    expect(rubricResult([2, 0, 2, 2, 2])).toEqual({ total: 8, tested: false });
    expect(rubricResult([2, 2, 2, 0, 2])).toEqual({ total: 8, tested: false });
    expect(rubricResult([1, 1, 2, 1, 2])).toEqual({ total: 7, tested: false });
    expect(() => rubricResult([2, 2])).toThrow();
  });

  it('marks media as placeholders and leaves the recordings to exist first', () => {
    for (const w of weeks) {
      expect(w.media.length).toBeGreaterThan(0);
      for (const m of w.media) expect(m).toMatch(/^\[VIDEO: (week \d|orientation).+, (to be recorded|posts after the session)\]$/);
    }
    expect(weeks[2]!.media).toContain('[VIDEO: week 2 Morning Brief demo, to be recorded]');
  });

  it('keeps the house rules in every word it serves: no em dashes, no prices, no invented people', () => {
    const all = JSON.stringify([course, acceleratorModules(), acceleratorSessions(), acceleratorCohort()]);
    expect(all).not.toContain('—');
    expect(all).not.toMatch(/\$\d{2,}/);
    expect(all).not.toContain('Jordan Hale');
    expect(all).not.toMatch(/guarantee(d)? (results|income)/i);
    expect(all).toContain('support@amplifiedimpact.io');
    expect(all).toContain('Zoom link TBA');
  });

  it('lists exactly the two Library items that are expected but not merged yet', () => {
    expect(LIBRARY_ROUTES_PENDING_MERGE).toEqual(['/morning-brief', '/new-agent-onboarding-plan']);
  });
});
