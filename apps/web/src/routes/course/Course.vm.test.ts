// /course (D-110): the view-model over `GET /api/course`. The payload is built here the way the API
// builds it, from `@ai/core`'s course and calendar, so the screen is tested against the real words.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone, sessionKind, sessionWeek } from '@ai/core';
import { isLockedWeek } from '@ai/core/course';
import { LIBRARY_ROUTES_PENDING_MERGE } from '@ai/core/accelerator';
import { acceleratorSessions } from '@ai/core/seed/accelerator-v1';
import { courseContent } from '@ai/core/seed/accelerator-v1';
import { WEEKS_0_3 } from '@ai/core/seed/weeks-0-3-v2';
import { ENTRIES } from '../../library/content';
import { COPY, courseView, guideHref, isExternal, overviewVM, weekFromParam, weekVM } from './Course.vm';
import type { CoursePayload, WeekVM } from './Course.vm';

const payload = (preview = false): CoursePayload => ({
  open: true,
  preview,
  course: courseContent(),
  sessions: acceleratorSessions().map((s) => ({ id: s.id, n: s.n, kind: sessionKind(s), week: sessionWeek(s), title: s.title, start: s.start, mins: s.mins })),
});

const weeks = (): WeekVM[] => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => weekVM(payload(), n)!);

beforeEach(() => setViewerZone('America/Chicago'));
afterEach(() => setViewerZone(null));

describe('the course overview', () => {
  it('lists Week 0 and the eight weeks, each linking to its page', () => {
    const vm = overviewVM(payload());
    expect(vm.weeks.map((w) => [w.heading, w.href])).toEqual([
      ['Week 0 · Get Ready', '/course/week-0'],
      ['Week 1 · Know the Business', '/course/week-1'],
      ['Week 2 · Own the Day', '/course/week-2'],
      ['Week 3 · Turn Insight into a Decision', '/course/week-3'],
      ['Week 4 · Protect the Pipeline', '/course/week-4'],
      ['Week 5 · Coach from Evidence', '/course/week-5'],
      ['Week 6 · Delegate an Outcome', '/course/week-6'],
      ['Week 7 · Make the Workflow Repeatable', '/course/week-7'],
      ['Week 8 · Sustain and Expand', '/course/week-8'],
    ]);
    expect(vm.weeks[1]!.flagship).toBe('Lead-Source ROI');
    expect(vm.weeks[8]!.flagship).toBe('Lead-Source ROI, FUB Pipeline Review');
  });

  it('shows the calendar in the viewer’s zone, Wednesday builds and Thursday office hours at 1:00 PM Central', () => {
    const cal = overviewVM(payload()).calendar;
    expect(cal).toHaveLength(16);
    expect(cal[0]).toMatchObject({ label: 'Week 1 · Live Build', title: 'Lead-Source ROI Live Build', when: 'Wed, Dec 2 · 1:00 PM CT', mins: '90 Minutes' });
    expect(cal[1]).toMatchObject({ label: 'Week 1 · Office Hours', when: 'Thu, Dec 3 · 1:00 PM CT', mins: '60 Minutes' });
    expect(cal[3]).toMatchObject({ title: 'Goal-Planning Session 1 and Office Hours', when: 'Thu, Dec 10 · 1:00 PM CT' });
    expect(cal[6]!.when).toBe('Wed, Jan 6 · 1:00 PM CT');
    expect(cal.some((c) => /Dec 23|Dec 30/.test(c.when))).toBe(false);
    setViewerZone('America/New_York');
    expect(overviewVM(payload()).calendar[0]!.when).toMatch(/^Wed, Dec 2 · 2:00 PM E[SD]?T \(1:00 PM CT\)$/);
  });

  it('carries the intake, orientation, data pack, practice set, safe sharing, graduation and the three paths', () => {
    const vm = overviewVM(payload());
    expect(vm.before.intake.length).toBeGreaterThan(5);
    expect(vm.before.orientation.minutes).toBe('About 30 minutes');
    expect(vm.before.orientation.media).toBe('[VIDEO: orientation, about 30 minutes, to be recorded]');
    expect(vm.before.dataPack.map((d) => d.input)).toEqual(['Production', 'Accounting', 'Lead Sources', 'Team Structure', 'Tasks and Meetings', 'Pipeline', 'Agent Pilot']);
    expect(vm.before.safeSharing.join(' ')).toMatch(/tax IDs, bank details, identity documents/);
    expect(vm.after.graduation).toHaveLength(5);
    expect(vm.after.paths.map((p) => p.label)).toEqual(['Lead It Yourselves', 'Get Guided Help', 'Defer']);
    expect(vm.after.noPaywall).toMatch(/No surprise paywall/);
    expect(vm.support).toBe('Questions? Write to support@amplifiedimpact.io.');
  });
});

describe('every week’s page', () => {
  it('carries the rubric and the evidence packet on every week, Week 0 included', () => {
    for (const w of weeks()) {
      expect(w.rubric.dimensions.map((d) => d.label), w.heading).toEqual(['Business Fit', 'Evidence Quality', 'Output Quality', 'Control', 'Repeatability']);
      expect(w.rubric.scale).toBe('0 Not demonstrated · 1 Needs correction · 2 Meets standard');
      expect(w.evidence.map((e) => e.label), w.heading).toEqual(['Skill and Version Link', 'One Redacted Output', 'Test Checklist', 'Use Log', 'Three-Sentence Account']);
      expect(w.readiness.map((r) => r.label)).toEqual(['Green', 'Amber', 'Red']);
      expect(w.homework.byWeekEnd.length).toBeGreaterThan(0);
      expect(w.timeNote).toBe('These are planning estimates, not guarantees.');
    }
  });

  it('gives weeks 1 to 8 a 90-minute live build and a 60-minute office hour, joined from Sessions', () => {
    const join = { label: 'Join in Sessions', note: 'opens 15 min before', href: '/sessions' };
    for (const w of weeks().slice(1)) {
      expect(w.live!.mins).toBe('90 Minutes');
      expect(w.live!.when).toMatch(/^Wed, (Dec|Jan|Feb) \d+ · 1:00 PM CT$/);
      expect(w.live!.join).toEqual(join);
      expect(w.officeHours!.join).toEqual(join);
      expect(w.live!.agenda[0]!.label).toBe('0 to 10 min');
      expect(w.officeHours!.mins).toBe('60 Minutes');
      expect(w.officeHours!.when).toMatch(/^Thu, (Dec|Jan|Feb) \d+ · 1:00 PM CT$/);
      expect(w.officeHours!.issueForm.map((f) => f.label)).toEqual(['Expected Result', 'Actual Result', 'Redacted Input', 'What You Tried', 'Platform']);
    }
    const w0 = weekVM(payload(), 0)!;
    expect([w0.live, w0.officeHours, w0.noLive]).toEqual([null, null, COPY.noLive]);
  });

  it('turns Dec 10 and Dec 17 into the goal-planning sessions, with what you leave with', () => {
    const [w2, w3] = [weekVM(payload(), 2)!, weekVM(payload(), 3)!];
    expect(w2.officeHours).toMatchObject({ title: 'Goal-Planning Session 1 and Office Hours', when: 'Thu, Dec 10 · 1:00 PM CT', format: [] });
    expect(w2.officeHours!.outputs).toContain('A draft 2027 business goal.');
    expect(w3.officeHours).toMatchObject({ title: 'Goal-Planning Session 2 and Office Hours', when: 'Thu, Dec 17 · 1:00 PM CT' });
    expect(w3.officeHours!.note).toMatch(/agents invited/);
  });

  it('numbers the setup order, each skill step opening its guided setup in learn (D-151)', () => {
    const w1 = weekVM(payload(), 1)!;
    expect(w1.setup.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(w1.setup[0]!.links).toEqual([{ label: 'Open the Guided Setup', href: '/skill-library/lead-source-roi' }]);
    expect(w1.skills[0]).toEqual({ title: 'Lead-Source ROI', role: 'Flagship', use: expect.any(String), free: false, href: '/skill-library/lead-source-roi', pending: null });
    expect(w1.libraryHref).toBe('/skill-library');
    expect(w1.downloads.map((d) => d.name)).toEqual(['week-1-worksheet.csv', 'week-1-practice-set.csv', 'use-log.csv']);
    expect(w1.downloads[0]!.content.split('\n')[0]).toMatch(/^"Source","Period","Spend \(\$\)"/);
  });

  it('ships the templates each week names: the decision log, the card, the runbook and the three cohort-end worksheets', () => {
    const files = (n: number) => weekVM(payload(), n)!.downloads.map((d) => d.name);
    expect(files(0)).toEqual(['week-1-worksheet.csv', 'week-1-practice-set.csv']);
    expect(files(3)).toEqual(['use-log.csv', 'decision-log.csv']);
    expect(files(6)).toEqual(['use-log.csv', 'responsibility-card.csv']);
    expect(files(7)).toEqual(['use-log.csv', 'runbook.csv']);
    expect(files(8)).toEqual(['use-log.csv', 'keep-fix-retire.csv', '90-day-plan.csv', 'agent-go-no-go.csv']);
    const goNoGo = weekVM(payload(), 8)!.downloads.find((d) => d.name === 'agent-go-no-go.csv')!.content.split('\n');
    expect(goNoGo).toHaveLength(6);
    expect(goNoGo[1]).toBe('"Usefulness",,');
    expect(weekVM(payload(), 3)!.downloads[1]!.content).toContain('"Decision (No Action Counts)"');
  });

  it('links each week to the next and back', () => {
    const all = weeks();
    expect(all[0]!.prev).toBeNull();
    expect(all[0]!.next).toEqual({ label: 'Next: Week 1', href: '/course/week-1' });
    expect(all[8]!.prev).toEqual({ label: 'Previous: Week 7', href: '/course/week-7' });
    expect(all[8]!.next).toBeNull();
  });
});

describe('every flagship href exists in the Library catalog', () => {
  // `LIBRARY_ROUTES_PENDING_MERGE` (packages/core/src/accelerator.ts) was the one allowance while
  // Morning Brief and New Agent Onboarding Plan were on their own branches. It is empty now.
  // D-151: a skill's Library page opens as its guided setup in learn (`/skill-library/<page>`); a page
  // that is not a skill (/voice-profile) is still on www.
  const hrefOf = (route: string) => guideHref(route);
  const library = new Map(ENTRIES.filter((e) => e.href).map((e) => [hrefOf(e.href!), e.title]));
  const pending = new Set(LIBRARY_ROUTES_PENDING_MERGE.map((r) => hrefOf(r)));

  it('links each skill a setup step names: one guided setup plainly, several by their Library titles', () => {
    const www = '/skill-library';
    const w4 = weekVM(payload(), 4)!;
    expect(w4.setup[4]!.text).toBe('Optional: open Contract-to-Close Deadline Tracker, Stalled Lender, Title & Escrow Follow-Up or TC File Audit for the transaction side.');
    expect(w4.setup[4]!.links).toEqual([
      { label: 'Contract-to-Close Deadline Tracker', href: `${www}/contract-to-close-deadlines` },
      { label: 'Stalled Lender, Title & Escrow Follow-Up', href: `${www}/stalled-item-follow-up` },
      { label: 'TC File Audit', href: `${www}/tc-file-audit` },
    ]);
    expect(w4.setup[5]!.links).toEqual([{ label: 'Open the Guided Setup', href: `${www}/database-health-check` }]);
    const w5 = weekVM(payload(), 5)!;
    expect(w5.setup[5]!.links).toEqual([
      { label: 'Listing Appointment Prep', href: `${www}/listing-appointment-prep` },
      { label: 'Appointment Follow-Up', href: `${www}/appointment-follow-up` },
    ]);
    // Every label a step's links carry is its skill's Library title, so each link says where it goes.
    for (const w of weeks()) for (const s of w.setup) if (s.links.length > 1) for (const l of s.links) expect(library.get(l.href), l.href).toBe(l.label);
  });

  it('every skill and every setup link on every week is a Library page, by its Library title', () => {
    const missing: string[] = [];
    for (const w of weeks()) {
      for (const k of w.skills) {
        if (k.href === null) {
          missing.push(`${w.heading}: ${k.title} (no Library page)`);
          continue;
        }
        if (pending.has(k.href)) continue;
        if (!library.has(k.href)) missing.push(`${w.heading}: ${k.href}`);
        else expect(k.title, k.href).toBe(library.get(k.href));
      }
      for (const s of w.setup) for (const l of s.links) if (!pending.has(l.href) && !library.has(l.href)) missing.push(`${w.heading}: ${l.href}`);
    }
    expect(missing).toEqual([]);
  });

  it('allows no route as expected-but-not-merged: Morning Brief and New Agent Onboarding Plan are Library pages', () => {
    expect([...pending]).toEqual([]);
    for (const href of ['/skill-library/morning-brief', '/skill-library/new-agent-onboarding-plan']) {
      expect(library.has(href), href).toBe(true);
    }
  });

  it('opens a skill in learn, in this tab, and any other page on www, in a new one (D-151)', () => {
    expect(guideHref('/appointment-follow-up')).toBe('/skill-library/appointment-follow-up');
    expect(guideHref('/voice-profile')).toBe('https://www.amplifiedimpact.io/voice-profile');
    expect(isExternal(guideHref('/voice-profile'))).toBe(true);
    expect(isExternal(guideHref('/appointment-follow-up'))).toBe(false);
  });
});

describe('the route', () => {
  it('reads week-N, and falls back to the overview for anything else', () => {
    expect(weekFromParam('week-3')).toBe(3);
    expect(weekFromParam('week-10')).toBeNull();
    expect(weekFromParam('3')).toBeNull();
    expect(courseView(payload(), undefined)).toMatchObject({ kind: 'overview', notFound: false });
    expect(courseView(payload(), 'week-4')).toMatchObject({ kind: 'week', title: 'Week 4 · Protect the Pipeline' });
    expect(courseView(payload(), 'week-9')).toMatchObject({ kind: 'overview', notFound: true });
    expect(courseView(payload(true), 'week-1').preview).toBe(true);
  });

  it('writes no em dash anywhere it renders', () => {
    const all = JSON.stringify([overviewVM(payload()), weeks(), COPY]);
    expect(all).not.toContain('\u2014');
  });
});

describe('locked weeks and the pre-launch preview (D-175)', () => {
  /** What the API answers a preview learner: Week 0 whole, the rest as the outline shows them. */
  const preview = (): CoursePayload => {
    const full = payload();
    const opens = [0, Date.parse('2026-12-02T19:00:00Z'), Date.parse('2026-12-09T19:00:00Z')];
    return {
      ...full,
      prelaunch: true,
      copy: { 'locked.opens': 'Opens {date}', 'course.prelaunch': 'Pre-launch preview line.' },
      course: {
        ...full.course,
        weeks: full.course.weeks.map((w) =>
          w.week === 0 || isLockedWeek(w) ? w : { week: w.week, title: w.title, question: w.question, outcome: w.module.outcome, opensAt: opens[w.week] ?? null, locked: true as const },
        ),
      },
    };
  };

  it('lists a locked week with when it opens, in Mountain Time, from the copy string', () => {
    const vm = overviewVM(preview());
    expect(vm.weeks[0]).toMatchObject({ locked: false, opens: null });
    expect(vm.weeks[1]).toMatchObject({ locked: true, opens: 'Opens Wed, Dec 2 · 12:00 PM MT', flagship: '' });
    expect(vm.weeks[2]!.opens).toBe('Opens Wed, Dec 9 · 12:00 PM MT');
    // No date set: nothing to say about when.
    expect(vm.weeks[5]).toMatchObject({ locked: true, opens: null });
  });

  it('says a week’s own locked copy first, then the copy string, then the date alone', () => {
    const p = preview();
    const w1 = p.course.weeks[1] as Extract<CoursePayload['course']['weeks'][number], { locked: true }>;
    w1.lockedCopy = { headline: 'Leads That Pay is locked', line: 'It opens with its live build.', opens: 'Unlocks {date}' };
    expect(courseView(p, 'week-1')).toMatchObject({
      kind: 'locked',
      prelaunch: 'Pre-launch preview line.',
      vm: { heading: `Week 1 · ${w1.title}`, opens: 'Unlocks Wed, Dec 2 · 12:00 PM MT', headline: 'Leads That Pay is locked', line: 'It opens with its live build.', prev: { href: '/course/week-0' } },
    });
    expect(overviewVM({ ...p, copy: {} }).weeks[2]!.opens).toBe('Wed, Dec 9 · 12:00 PM MT');
  });

  it('opens Week 0 as a week, and carries the preview line on every page only in the preview', () => {
    expect(courseView(preview(), 'week-0')).toMatchObject({ kind: 'week', prelaunch: 'Pre-launch preview line.' });
    expect(courseView(preview(), undefined)).toMatchObject({ kind: 'overview', prelaunch: 'Pre-launch preview line.' });
    expect(courseView(payload(), undefined)).toMatchObject({ kind: 'overview', prelaunch: null });
  });
});

describe('the new Weeks 0 to 3, with Library pages still to come (D-176)', () => {
  /** The course after the content step: Weeks 0 to 3 new, the data pack and practice set retired. */
  const v2 = (copy: Record<string, string> = { 'skill.coming': 'Coming With Week 1' }): CoursePayload => {
    const base = payload();
    const course = structuredClone(base.course);
    course.weeks = [...structuredClone(WEEKS_0_3), ...course.weeks.slice(4)];
    course.before = { ...course.before, dataPack: [], practiceSetNote: '' };
    return { ...base, course, copy };
  };

  it('shows a skill whose Library page isn’t built with the copy string and no link', () => {
    const w1 = weekVM(v2(), 1)!;
    expect(w1.heading).toBe('Week 1 · Where the Money Goes');
    expect(w1.skills).toEqual([{ title: 'Map Your Spend', role: 'Flagship', use: expect.any(String), free: false, href: null, pending: 'Coming With Week 1' }]);
    expect(w1.setup[0]).toEqual({ n: 1, text: 'Run Map Your Spend on the last 12 full months', links: [], pending: 'Coming With Week 1' });
    expect(w1.setup[1]!.pending).toBeNull();
  });

  it('links the pages that exist and marks the ones that don’t, on Week 0', () => {
    const w0 = weekVM(v2(), 0)!;
    expect(w0.skills.map((k) => [k.title, k.href, k.pending])).toEqual([
      ['AI Brain Setup', guideHref('/ai-brain-setup'), null],
      ['Map Your Spend', null, 'Coming With Week 1'],
      ['Lead Source Review', null, 'Coming With Week 1'],
    ]);
    expect(w0.setup).toHaveLength(8);
    expect(w0.setup[4]!.links).toEqual([{ label: 'Open the Guided Setup', href: guideHref('/ai-brain-setup') }]);
  });

  it('says nothing in place of the link when the copy string is gone', () => {
    expect(weekVM(v2({}), 2)!.skills[0]).toMatchObject({ href: null, pending: null });
  });

  it('offers no worksheet or practice set once the cohort’s practice set note is empty', () => {
    expect(weekVM(v2(), 0)!.downloads).toEqual([]);
    expect(weekVM(v2(), 1)!.downloads.map((d) => d.name)).toEqual(['use-log.csv']);
    expect(overviewVM(v2()).before.downloads).toEqual([]);
    expect(overviewVM(v2()).before.dataPack).toEqual([]);
  });
});
