// The AI Accelerator's reminders (D-110). Every paid buyer sits in cohort dec26 at Team tier, so the
// tier rule cannot keep an Amplified Insiders or Team Plan buyer from being reminded of a course they
// did not buy. The scheduler hands `dueWork` the learners whose plan opens it, and only they hear.
import { describe, expect, it } from 'vitest';
import { seedProduction } from '@ai/core/seed/curriculum';
import type { Db, Learner } from '@ai/core';
import { SUBJECTS } from '../email/subjects';
import { NO_KEYS, NO_ZONES, dueWork } from './due';

const at = (s: string) => Date.parse(`${s}-06:00`);
const learner = (id: string): Learner => ({ id, name: id, email: `${id}@example.test`, tier: 'team', role: 'Team Owner', teamId: `t_${id}`, cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} });

const db = (): Db => {
  const d = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  d.users.push(learner('u_buyer'), learner('u_insider'));
  return d;
};
const BUYERS = new Set(['u_buyer']);
const to = (sends: { job: string; to: string }[], job: string) => sends.filter((s) => s.job === job).map((s) => s.to);

describe('the AI Accelerator’s reminders go to its buyers only', () => {
  it('reminds the buyer of Week 1’s build, and not the Insiders buyer in the same cohort', () => {
    const sends = dueWork(db(), at('2026-12-01T14:00'), NO_KEYS, NO_ZONES, BUYERS).sends;
    expect(to(sends, 'session-24h')).toEqual(['u_buyer@example.test']);
  });

  it('without the set, behaves as before: the tier rule alone', () => {
    const sends = dueWork(db(), at('2026-12-01T14:00'), NO_KEYS, NO_ZONES).sends;
    expect(to(sends, 'session-24h').sort()).toEqual(['u_buyer@example.test', 'u_insider@example.test']);
  });

  it('names an office hour by its week in the subject, not by its n', () => {
    const sends = dueWork(db(), at('2026-12-02T14:00'), NO_KEYS, NO_ZONES, BUYERS).sends.filter((s) => s.job === 'session-24h');
    expect(sends).toHaveLength(1);
    const data = sends[0]!.data as { n: number; title: string; label?: string };
    expect(data).toMatchObject({ n: 101, title: 'Lead-Source ROI Office Hours', label: 'Week 1' });
    expect(SUBJECTS['session-24h'](data)).toBe('Tomorrow: Week 1 · Lead-Source ROI Office Hours');
    // A build keeps the subject it always had.
    const build = dueWork(db(), at('2026-12-01T14:00'), NO_KEYS, NO_ZONES, BUYERS).sends.find((s) => s.job === 'session-24h')!;
    expect(SUBJECTS['session-24h'](build.data as { n: number; title: string })).toBe('Tomorrow: Session 1 · Lead-Source ROI Live Build');
  });

  it('sends one build reminder per week, after the build, never a second after the office hour', () => {
    // 48 hours after the Week 1 office hour ends (Thu Dec 3, 2:00 PM CT).
    const sends = dueWork(db(), at('2026-12-05T14:30'), NO_KEYS, NO_ZONES, BUYERS).sends;
    expect(to(sends, 'build-48h')).toEqual([]);
    // 48 hours after the Week 1 build ends (Wed Dec 2, 2:30 PM CT).
    const after = dueWork(db(), at('2026-12-04T15:00'), NO_KEYS, NO_ZONES, BUYERS).sends;
    expect(to(after, 'build-48h')).toEqual(['u_buyer@example.test']);
  });
});
