import { describe, expect, it } from 'vitest';
import {
  changedFields,
  changedPaths,
  cohortCopyFields,
  copyIssues,
  diffSummary,
  moduleCopyFields,
  rulesBroken,
} from '../src/course-rules';
import type { CopyField } from '../src/course-rules';
import { curriculumSeed } from '../seed/curriculum';

const f = (text: string, hire = false): CopyField => ({ path: 'x', label: 'X', text, ...(hire ? { hire: true } : {}) });

describe('the copy rules (D-174)', () => {
  it('refuses an em dash, and nothing else that looks like one', () => {
    expect(rulesBroken(f('Pick one—and stick with it.'))).toEqual(['em_dash']);
    expect(rulesBroken(f('Pick one, and stick with it. A range: 10–20 minutes.'))).toEqual([]);
  });

  it('refuses the team-size and homes-a-year line, in any of its forms', () => {
    for (const t of ['Built inside a 100-agent team.', 'a 100 agent team', 'closing 700+ homes a year', '700 homes a year']) {
      expect(rulesBroken(f(t)), t).toEqual(['banned_line']);
    }
    expect(rulesBroken(f('Teams of 10 agents close 70 homes.'))).toEqual([]);
  });

  it('keeps hire copy from saying the hire sends, posts, updates the CRM or touches the books', () => {
    for (const t of ['Sends the brief at 7.', 'It posts to Slack.', 'Updates the CRM after each call.', 'Touches the books nightly.', 'Updating your CRM for you.']) {
      expect(rulesBroken(f(t, true)), t).toEqual(['hire_claim']);
    }
    // The same words are fine where the owner or the operator does them (steps, course pages).
    expect(rulesBroken(f('Send the brief to your team.'))).toEqual([]);
    expect(rulesBroken(f('Drafts the brief for you to review.', true))).toEqual([]);
  });

  it('wants a time of day in Mountain Time with MT, ranges included', () => {
    expect(rulesBroken(f('Builds start at 12:00 PM MT.'))).toEqual([]);
    expect(rulesBroken(f('Office hours, 12:00 to 1:00 PM MT.'))).toEqual([]);
    expect(rulesBroken(f('Office hours, 12:00 PM to 1:00 PM MT.'))).toEqual([]);
    expect(rulesBroken(f('Office hours, 12:00 PM – 1:00 PM MT.'))).toEqual([]);
    for (const t of ['Wednesdays at 1:00 PM CT.', 'Starts at 12 pm.', 'At 9:30 a.m. MST.', 'From 12:00 PM to 1:00 PM.']) {
      expect(rulesBroken(f(t)), t).toEqual(['time_zone']);
    }
    // Not a time of day.
    expect(rulesBroken(f('Week 1 has 3 steps, about 45 min in all.'))).toEqual([]);
  });

  it('names every issue by where it is and what to do', () => {
    expect(copyIssues([{ path: 'course.question', label: 'Question', text: 'Ready—set?' }])).toEqual([
      { path: 'course.question', label: 'Question', rule: 'em_dash', message: 'Use a comma, a colon or a period instead of an em dash.' },
    ]);
  });
});

describe('where a week’s strings are', () => {
  const seed = curriculumSeed();

  it('finds every learner-facing string of a week, with a stable path, and only those', () => {
    const week2 = seed.modules[2]!;
    const fields = moduleCopyFields(week2);
    const paths = fields.map((x) => x.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain('course.question');
    expect(paths).toContain('checklist[0].text');
    expect(paths).toContain('course.liveBuild.agenda[0].activity');
    expect(paths).toContain('course.homework.acceptance[0]');
    // Ids, routes and settings are not copy.
    expect(paths.some((p) => /(^|\.)(id|route|sessionId|icon|status|tier)$/.test(p))).toBe(false);
    expect(fields.every((x) => x.text.trim().length > 0)).toBe(true);
  });

  it('marks hire copy: the outcome and outputs, the cards, but not the steps and not Can’t do', () => {
    const week = structuredClone(seed.modules[2]!);
    week.course!.seatCard = { seat: 'S', reportsTo: 'R', runs: 'Runs', pulls: 'P', applies: 'A', produces: 'Pr', tookOver: 'T', cantDo: 'Send email' };
    const hire = new Set(moduleCopyFields(week).filter((x) => x.hire).map((x) => x.path));
    expect(hire.has('outcome')).toBe(true);
    expect(hire.has('outputs[0]')).toBe(true);
    expect(hire.has('course.seatCard.runs')).toBe(true);
    expect(hire.has('course.seatCard.cantDo')).toBe(false);
    expect(hire.has('checklist[0].text')).toBe(false);
  });

  it('finds what every week shares, from the cohort', () => {
    const fields = cohortCopyFields(seed.cohort);
    expect(fields.length).toBeGreaterThan(40);
    expect(fields.map((x) => x.path)).toContain('course.intro.sub');
  });

  it('checks only what a save changes: an untouched sentence never blocks an edit', () => {
    const before = moduleCopyFields(seed.modules[2]!);
    const edited = structuredClone(seed.modules[2]!);
    edited.course!.question = 'Who owns the next action—today?';
    const changed = changedFields(before, moduleCopyFields(edited));
    expect(changed.map((x) => x.path)).toEqual(['course.question']);
    expect(copyIssues(changed).map((i) => i.rule)).toEqual(['em_dash']);
  });

  it('lists what the seed itself breaks, so the PM can see it (it is main’s course, word for word)', () => {
    const issues = seed.modules.flatMap((m) => copyIssues(moduleCopyFields(m)).map((i) => `${m.id} ${i.path} ${i.rule}`));
    const shared = copyIssues(cohortCopyFields(seed.cohort)).map((i) => `cohort ${i.path} ${i.rule}`);
    // Pinned so a change to the seed or the rules is seen in review; the rules never rewrite the seed.
    expect([...issues, ...shared]).toMatchSnapshot();
  });
});

describe('the field-diff summary an audit row records', () => {
  it('names the paths that changed, never the values', () => {
    expect(changedPaths({ a: 1, b: { c: 'x', d: [1, 2] } }, { a: 1, b: { c: 'y', d: [1, 3] } })).toEqual(['b.c', 'b.d[1]']);
    expect(changedPaths({ a: [1] }, { a: [1, 2] })).toEqual(['a']);
    expect(changedPaths({}, { seatCard: { seat: 'S' } })).toEqual(['seatCard']);
    expect(changedPaths({ x: 1 }, { x: 1 })).toEqual([]);
  });

  it('caps a row at forty paths and says how many changed in all', () => {
    const before = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${String(i).padStart(2, '0')}`, 0]));
    const after = Object.fromEntries(Object.keys(before).map((k) => [k, 1]));
    const s = diffSummary(before, after);
    expect(s.changed).toHaveLength(40);
    expect(s.count).toBe(50);
  });
});
