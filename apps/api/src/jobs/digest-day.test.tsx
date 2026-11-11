// The weekly digest's "before Thursday" follows the cohort (D-110): the AI Accelerator builds on
// Wednesdays, so its owners' digest names Wednesday; the prototype's cohorts keep Thursday.
import { describe, expect, it } from 'vitest';
import { render } from '@react-email/render';
import { seed, seedProduction } from '@ai/core';
import type { Learner } from '@ai/core';
import { digestDay } from './due';
import { WeeklyDigestEmail } from '../email/templates/weekly-digest';

const owner: Learner = { id: 'u_o', name: 'O', email: 'o@example.test', tier: 'team', role: 'Team Owner', teamId: 't_o', cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} };
const at = (s: string) => Date.parse(`${s}-06:00`);

describe('digestDay', () => {
  const prod = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });

  it('names the AI Accelerator’s next build day, Wednesday, through the holiday too', () => {
    expect(digestDay(prod, owner, at('2026-12-07T08:00'))).toBe('Wednesday');
    expect(digestDay(prod, owner, at('2026-12-28T08:00'))).toBe('Wednesday');
    // After the last build there is nothing to review before.
    expect(digestDay(prod, owner, at('2027-02-08T08:00'))).toBeUndefined();
  });

  it('leaves the prototype’s cohorts on Thursday', () => {
    expect(digestDay(seed('live'), owner, at('2026-12-07T08:00'))).toBeUndefined();
  });

  it('renders the day it is given, and Thursday without one', async () => {
    expect(await render(<WeeklyDigestEmail subject="Your team this week" appUrl="https://learn.amplifiedimpact.io" before="Wednesday" />)).toContain('what to review before Wednesday.');
    expect(await render(<WeeklyDigestEmail subject="Your team this week" appUrl="https://learn.amplifiedimpact.io" />)).toContain('what to review before Thursday.');
  });
});
