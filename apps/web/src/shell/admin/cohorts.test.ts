import { describe, expect, it } from 'vitest';
import { cohortLabel } from '../../data/admin-shell';
import { afterPick, cohortChoices, defaultCohortId } from './cohorts';

// D-253 (spec § 3, "Which cohort"): the cohort `/admin/cohort` opens, the pickers' list, and where picking goes.

const D = (iso: string) => Date.parse(iso);
const dec = { id: 'dec26', name: 'Amplified AI Accelerator · December 2026', start: D('2026-11-29T19:00:00Z'), end: D('2027-02-05T00:00:00Z'), status: 'enrolling' as const };
const jan = { id: 'jan27', name: 'January 2027', start: D('2027-01-03T19:00:00Z'), end: D('2027-02-12T00:00:00Z'), status: 'draft' as const };
const old = { id: 'sep26', name: 'September 2026', start: D('2026-09-01T19:00:00Z'), end: D('2026-10-30T00:00:00Z'), status: 'completed' as const };

describe('the cohort the admin is on', () => {
  it('is the one running, else the next to start, else the newest', () => {
    // Nov 25: December hasn't started; it is the next to start.
    expect(defaultCohortId([dec, jan], D('2026-11-25T12:00:00Z'))).toBe('dec26');
    // Dec 10: December is running; January (a draft) is not.
    expect(defaultCohortId([jan, dec], D('2026-12-10T12:00:00Z'))).toBe('dec26');
    // Jan 10: both run by their dates, but a draft is never "running".
    expect(defaultCohortId([dec, jan], D('2027-01-10T12:00:00Z'))).toBe('dec26');
    // Feb 20: none runs and none is next; the newest.
    expect(defaultCohortId([old, dec, jan], D('2027-02-20T12:00:00Z'))).toBe('jan27');
    // Oct 1: September runs.
    expect(defaultCohortId([old, dec], D('2026-10-01T12:00:00Z'))).toBe('sep26');
    expect(defaultCohortId([], D('2026-10-01T12:00:00Z'))).toBeNull();
  });

  it('lists every cohort that exists in start order, a draft marked, the current one checked', () => {
    expect(cohortChoices([jan, dec], 'dec26')).toEqual([
      { id: 'dec26', label: 'December 2026 Cohort', current: true },
      { id: 'jan27', label: 'January 2027 Cohort · Draft', current: false },
    ]);
    // D-238: production's name starts with the program's; the label names the cohort alone.
    expect(cohortLabel(dec)).toBe('December 2026 Cohort');
    expect(cohortLabel({ name: 'December 2026 Cohort' })).toBe('December 2026 Cohort');
  });

  it('picking keeps the tab on a cohort’s page, stays on the Overview, and opens the cohort anywhere else', () => {
    expect(afterPick('/admin/cohort/dec26/people', 'jan27')).toBe('/admin/cohort/jan27/people');
    expect(afterPick('/admin/cohort/dec26', 'jan27')).toBe('/admin/cohort/jan27');
    // A thread is December's; picking January goes to January's Community.
    expect(afterPick('/admin/cohort/dec26/community/4', 'jan27')).toBe('/admin/cohort/jan27/community');
    expect(afterPick('/admin', 'jan27')).toBeNull();
    expect(afterPick('/admin/program', 'jan27')).toBe('/admin/cohort/jan27');
    expect(afterPick('/admin/audit', 'jan27')).toBe('/admin/cohort/jan27');
  });
});
