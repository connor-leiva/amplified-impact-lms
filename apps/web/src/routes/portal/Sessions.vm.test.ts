import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { phaseNow, seed, setViewerZone } from '@ai/core';
import { seedProduction } from '@ai/core/seed/curriculum';
import type { Db, Learner } from '@ai/core';
import { sessionsVM, type SessionsRow, type SessionsVM } from './Sessions.vm';

// Jamie Ortiz (Agent tier) and Alex Morgan (Team Owner) at the three demo instants. The expected
// strings are hard-coded, not recomputed: the point is to catch a change in `renderVals`' output,
// which is what the fingerprint test compares pixel-side.

const WEEK0 = phaseNow('week0'); // Fri 2026-11-27 10:42 CT
const WEEK2 = phaseNow('live'); // Mon 2026-12-07 10:42 CT
const POST = phaseNow('post'); // Tue 2027-01-12 10:42 CT

const CT = (s: string): number => Date.parse(`${s}-06:00`);

const learner = (db: Db, id: string): Learner => db.users.find((u) => u.id === id)!;
const vmFor = (phase: 'week0' | 'live' | 'post', id: string, now: number): SessionsVM => {
  const db = seed(phase);
  return sessionsVM(db, learner(db, id), now);
};
const labels = (vm: SessionsVM): string[] => vm.rows.map((r) => r.token.label ?? `access.${r.token.state}`);
const actionLabels = (r: SessionsRow): string[] => r.actions.map((a) => a.label);

describe('sessionsVM @g5', () => {
  // `fmt.when` reads the viewer zone, so pin it: `Tue, Dec 1 · 1:00 PM CT` must not depend on
  // the test machine.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('the page header', () => {
    it('reads the cohort, the number of live builds and the cadence, in every phase', () => {
      const sub = 'December 2026 Cohort · 6 live builds · Tue & Thu · 1:00 PM CT';
      expect(vmFor('week0', 'u_jamie', WEEK0).sub).toBe(sub);
      expect(vmFor('live', 'u_jamie', WEEK2).sub).toBe(sub);
      expect(vmFor('post', 'u_jamie', POST).sub).toBe(sub);
      expect(vmFor('live', 'u_alex', WEEK2).sub).toBe(sub);
    });

    it('puts only the sessions Jamie can reach in the all-sessions calendar', () => {
      const { calAll } = vmFor('live', 'u_jamie', WEEK2);
      expect(calAll.name).toBe('amplified-impact-sessions.ics');
      expect(calAll.toast).toBe('3 sessions added to your calendar');
      expect(calAll.events.map((e) => e.title)).toEqual([
        'Amplified Impact · Session 1: The Autonomous Agent',
        'Amplified Impact · Session 2: Speed to Lead',
        'Amplified Impact · Session 3: The Living Database',
      ]);
    });

    it('gives Alex all six, because the Team tier opens every session', () => {
      const { calAll } = vmFor('live', 'u_alex', WEEK2);
      expect(calAll.toast).toBe('6 sessions added to your calendar');
      expect(calAll.events).toHaveLength(6);
      expect(calAll.events[5]!.title).toBe('Amplified Impact · Session 6: Contract to Close');
    });
  });

  describe('Week 0 · nothing held yet', () => {
    it('makes Session 1 the next one for Jamie and schedules the rest', () => {
      const vm = vmFor('week0', 'u_jamie', WEEK0);
      expect(labels(vm)).toEqual([
        'Next Up',
        'Scheduled',
        'Scheduled',
        'access.locked',
        'access.locked',
        'access.locked',
      ]);
      expect(vm.rows.map((r) => r.state)).toEqual(['next', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead']);
      expect(vm.rows.map((r) => r.extra)).toEqual(['', '', '', '', '', '']);
    });

    it('shows Session 3 on the date it was first scheduled, before the move to Wed Dec 9', () => {
      const vm = vmFor('week0', 'u_jamie', WEEK0);
      expect(vm.rows[2]!.when).toBe('Tue, Dec 8 · 1:00 PM CT');
    });

    it('offers Jamie a disabled Join Button with the window hint on the next row only', () => {
      const vm = vmFor('week0', 'u_jamie', WEEK0);
      expect(vm.rows[0]!.join).toEqual({
        mode: 'disabled',
        hint: 'Opens 15 Min Before',
        url: 'https://zoom.us/j/8841200610',
        toast: 'Opening Zoom · https://zoom.us/j/8841200610',
      });
      expect(vm.rows.slice(1).every((r) => r.join === null)).toBe(true);
    });

    it('locks the three Team tier sessions for Jamie and offers Preview, never the page', () => {
      const vm = vmFor('week0', 'u_jamie', WEEK0);
      const locked = vm.rows.filter((r) => r.locked);
      expect(locked.map((r) => r.module)).toEqual([
        'Meetings AI Employee',
        'Finance AI Employee',
        'Operations AI Employee',
      ]);
      expect(locked.map((r) => r.actions)).toEqual([
        [{ kind: 'preview', label: 'Preview', icon: 'lock', variant: 'secondary', moduleId: 'meetings' }],
        [{ kind: 'preview', label: 'Preview', icon: 'lock', variant: 'secondary', moduleId: 'finance' }],
        [{ kind: 'preview', label: 'Preview', icon: 'lock', variant: 'secondary', moduleId: 'operations' }],
      ]);
    });

    it('locks nothing for Alex and gives every upcoming row Add to Calendar', () => {
      const vm = vmFor('week0', 'u_alex', WEEK0);
      expect(labels(vm)).toEqual(['Next Up', 'Scheduled', 'Scheduled', 'Scheduled', 'Scheduled', 'Scheduled']);
      expect(vm.rows.some((r) => r.locked)).toBe(false);
      expect(vm.rows.map(actionLabels)).toEqual([
        ['Add to Calendar'],
        ['Add to Calendar'],
        ['Add to Calendar'],
        ['Add to Calendar'],
        ['Add to Calendar'],
        ['Add to Calendar'],
      ]);
      expect(vm.rows[0]!.actions[0]!.download).toEqual({
        name: 'session-1.ics',
        toast: 'Calendar invite downloaded',
        events: [
          {
            id: 'dec26-s1',
            title: 'Amplified Impact · Session 1: The Autonomous Agent',
            start: CT('2026-12-01T13:00:00'),
            end: CT('2026-12-01T14:15:00'),
            url: 'https://zoom.us/j/8841200610',
          },
        ],
      });
    });

    it('reports no attendance for either viewer', () => {
      expect(vmFor('week0', 'u_jamie', WEEK0).att).toEqual({ attended: 0, held: 0 });
      expect(vmFor('week0', 'u_alex', WEEK0).att).toEqual({ attended: 0, held: 0 });
    });

    it('lists the Wednesday office hours around Week 0', () => {
      const vm = vmFor('week0', 'u_jamie', WEEK0);
      expect(vm.ohTime).toBe('11:00 AM CT');
      expect(vm.oh.map((o) => o.label)).toEqual([
        'Wed, Nov 25 · 11:00 AM CT',
        'Wed, Dec 2 · 11:00 AM CT',
        'Wed, Dec 9 · 11:00 AM CT',
      ]);
      expect(vm.oh.map((o) => o.past)).toEqual([true, false, false]);
    });
  });

  describe('Week 2 · two held, Session 3 next', () => {
    it('gives Jamie two replays, the next session, and three locked rows', () => {
      const vm = vmFor('live', 'u_jamie', WEEK2);
      expect(labels(vm)).toEqual([
        'Replay Ready',
        'Replay Ready',
        'Next Up',
        'access.locked',
        'access.locked',
        'access.locked',
      ]);
      expect(vm.rows.map((r) => r.state)).toEqual(['past', 'past', 'next', 'ahead', 'ahead', 'ahead']);
    });

    it('writes the full meta line for the held rows', () => {
      const vm = vmFor('live', 'u_jamie', WEEK2);
      expect(vm.rows[0]).toMatchObject({
        n: 1,
        title: 'The Autonomous Agent',
        module: 'Marketing AI Employee',
        when: 'Tue, Dec 1 · 1:00 PM CT',
        mins: 75,
        extra: '121 attended live',
      });
      expect(vm.rows[1]!.extra).toBe('109 attended live');
      expect(vm.rows[0]!.token).toEqual({
        kind: 'custom',
        tone: 'success',
        icon: 'check',
        label: 'Replay Ready',
      });
      expect(vm.rows[0]!.actions).toEqual([
        { kind: 'watch', label: 'Watch Replay', icon: 'play', variant: 'primary', moduleId: 'marketing' },
      ]);
    });

    it('shows the moved date on Session 3 and keeps the Join Button outside the window', () => {
      const vm = vmFor('live', 'u_jamie', WEEK2);
      const next = vm.rows[2]!;
      expect(next.when).toBe('Wed, Dec 9 · 1:00 PM CT');
      expect(next.token).toEqual({ kind: 'custom', tone: 'progress', icon: 'clock', label: 'Next Up' });
      expect(next.join).toMatchObject({ mode: 'disabled', hint: 'Opens 15 Min Before' });
      expect(actionLabels(next)).toEqual(['Add to Calendar']);
      expect(next.actions[0]!.download!.name).toBe('session-3.ics');
    });

    it('docks Jamie the one session she missed, and credits Alex with both', () => {
      expect(vmFor('live', 'u_jamie', WEEK2).att).toEqual({ attended: 1, held: 2 });
      expect(vmFor('live', 'u_alex', WEEK2).att).toEqual({ attended: 2, held: 2 });
    });

    it('schedules the Team tier sessions for Alex instead of locking them', () => {
      const vm = vmFor('live', 'u_alex', WEEK2);
      expect(labels(vm)).toEqual([
        'Replay Ready',
        'Replay Ready',
        'Next Up',
        'Scheduled',
        'Scheduled',
        'Scheduled',
      ]);
      expect(vm.rows[3]!.module).toBe('Meetings AI Employee');
      expect(vm.rows[3]!.when).toBe('Thu, Dec 10 · 1:00 PM CT');
    });

    it('lists the Wednesday office hours around Week 2', () => {
      const vm = vmFor('live', 'u_jamie', WEEK2);
      expect(vm.oh.map((o) => o.label)).toEqual([
        'Wed, Dec 2 · 11:00 AM CT',
        'Wed, Dec 9 · 11:00 AM CT',
        'Wed, Dec 16 · 11:00 AM CT',
      ]);
      expect(vm.oh.map((o) => o.past)).toEqual([true, false, false]);
      expect(vm.oh[0]!.download).toBeUndefined();
      expect(vm.oh[1]!.download).toEqual({
        name: 'office-hours.ics',
        toast: 'Office hours added to your calendar',
        events: [
          {
            id: `oh${CT('2026-12-09T11:00:00')}`,
            title: 'Amplified Impact office hours',
            start: CT('2026-12-09T11:00:00'),
            end: CT('2026-12-09T12:00:00'),
            url: 'https://zoom.us/j/8841299001',
          },
        ],
      });
    });

    it('opens the join window 15 minutes before the start', () => {
      const ready = vmFor('live', 'u_jamie', CT('2026-12-09T12:46:00')).rows[2]!;
      expect(ready.token.label).toBe('Next Up');
      expect(ready.join).toMatchObject({ mode: 'ready', hint: 'Opens 15 Min Before' });
      expect(actionLabels(ready)).toEqual(['Add to Calendar']);

      const shut = vmFor('live', 'u_jamie', CT('2026-12-09T12:44:00')).rows[2]!;
      expect(shut.join).toMatchObject({ mode: 'disabled' });
    });

    it('turns Session 3 live while it runs: a live token, a live Join Button and no other action', () => {
      const live = vmFor('live', 'u_jamie', CT('2026-12-09T13:05:00')).rows[2]!;
      expect(live.token).toEqual({ kind: 'custom', tone: 'live', label: 'Live Now' });
      expect(live.join).toEqual({
        mode: 'live',
        hint: '',
        url: 'https://zoom.us/j/8841203352',
        toast: 'Opening Zoom · https://zoom.us/j/8841203352',
      });
      expect(live.actions).toEqual([]);
      expect(live.state).toBe('next');
    });

    it('waits for the replay once Session 3 has ended', () => {
      const done = vmFor('live', 'u_jamie', CT('2026-12-09T15:00:00')).rows[2]!;
      expect(done.token).toEqual({
        kind: 'custom',
        tone: 'neutral',
        icon: 'clock',
        label: 'Replay Processing',
      });
      expect(done.join).toBeNull();
      expect(done.actions).toEqual([]);
      expect(done.state).toBe('past');
    });
  });

  describe('After Cohort · every session held', () => {
    it('leaves Jamie three replays and three locked rows, with no next session', () => {
      const vm = vmFor('post', 'u_jamie', POST);
      expect(labels(vm)).toEqual([
        'Replay Ready',
        'Replay Ready',
        'Replay Ready',
        'access.locked',
        'access.locked',
        'access.locked',
      ]);
      expect(vm.rows.every((r) => r.state === 'past')).toBe(true);
      expect(vm.rows.every((r) => r.join === null)).toBe(true);
      expect(vm.rows.map(actionLabels)).toEqual([
        ['Watch Replay'],
        ['Watch Replay'],
        ['Watch Replay'],
        ['Preview'],
        ['Preview'],
        ['Preview'],
      ]);
    });

    it('still counts the room on a locked, held session', () => {
      const vm = vmFor('post', 'u_jamie', POST);
      expect(vm.rows.map((r) => r.extra)).toEqual([
        '121 attended live',
        '109 attended live',
        '116 attended live',
        '98 attended live',
        '92 attended live',
        '104 attended live',
      ]);
    });

    it('counts 2 of 3 for Jamie and 6 of 6 for Alex', () => {
      expect(vmFor('post', 'u_jamie', POST).att).toEqual({ attended: 2, held: 3 });
      expect(vmFor('post', 'u_alex', POST).att).toEqual({ attended: 6, held: 6 });
    });

    it('gives Alex six replays to watch', () => {
      const vm = vmFor('post', 'u_alex', POST);
      expect(labels(vm)).toEqual(Array<string>(6).fill('Replay Ready'));
      expect(vm.rows.map((r) => r.actions[0]!.moduleId)).toEqual([
        'marketing',
        'sales',
        'database',
        'meetings',
        'finance',
        'operations',
      ]);
    });

    it('lists the Wednesday office hours after the cohort closed', () => {
      const vm = vmFor('post', 'u_alex', POST);
      expect(vm.oh.map((o) => o.label)).toEqual([
        'Wed, Jan 6 · 11:00 AM CT',
        'Wed, Jan 13 · 11:00 AM CT',
        'Wed, Jan 20 · 11:00 AM CT',
      ]);
      expect(vm.oh.map((o) => o.past)).toEqual([true, false, false]);
    });
  });

  describe('a viewer outside Central time', () => {
    it('puts the viewer zone first and the program zone in parentheses', () => {
      setViewerZone('America/New_York');
      try {
        const vm = vmFor('live', 'u_alex', WEEK2);
        expect(vm.rows[2]!.when).toBe('Wed, Dec 9 · 2:00 PM ET (1:00 PM CT)');
        expect(vm.sub).toBe('December 2026 Cohort · 6 live builds · Tue & Thu · 2:00 PM ET (1:00 PM CT)');
        expect(vm.ohTime).toBe('12:00 PM ET (11:00 AM CT)');
      } finally {
        setViewerZone('America/Chicago');
      }
    });
  });

  describe('no learner (the admin frame before the shell redirects)', () => {
    it('renders the default cohort without throwing', () => {
      const db = seed('live');
      const vm = sessionsVM(db, null, WEEK2);
      expect(vm.sub).toBe('December 2026 Cohort · 6 live builds · Tue & Thu · 1:00 PM CT');
      expect(vm.rows).toHaveLength(6);
      expect(vm.att).toEqual({ attended: 2, held: 2 });
    });
  });
});

// The AI Accelerator (D-110): a cohort with its own Thursday office-hours series. The prototype's
// cohorts above have none, and every expectation above is unchanged by it.
describe('Sessions · the AI Accelerator cohort', () => {
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));
  const prod = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  const buyer: Learner = { id: 'u_b', name: 'B', email: 'b@example.test', tier: 'team', role: 'Team Owner', teamId: 't_b', cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} };
  const at = (s: string) => sessionsVM(prod, buyer, CT(s));

  it('lists the eight Wednesday builds and says the cohort’s own cadence, not “Tue & Thu”', () => {
    const vm = at('2026-11-20T09:00');
    expect(vm.rows.map((r) => r.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(vm.rows[0]).toMatchObject({ title: 'Lead-Source ROI Live Build', module: 'Week 1 · Know the Business', when: 'Wed, Dec 2 · 1:00 PM CT', mins: 90 });
    expect(vm.sub).toBe('Amplified AI Accelerator · December 2026 Cohort · 8 live builds · Wed builds and Thu office hours · 1:00 PM CT');
    expect(vm.sub).not.toContain('Tue & Thu');
  });

  it('puts the real Thursday office hours in the Office Hours card, with no invented link or recording', () => {
    const vm = at('2026-12-08T09:00');
    expect(vm.ohDays).toBe('Thursdays');
    expect(vm.ohTime).toBe('1:00 PM CT');
    expect(vm.oh.map((o) => o.label)).toEqual([
      'Thu, Dec 3 · 1:00 PM CT',
      'Thu, Dec 10 · 1:00 PM CT',
      'Thu, Dec 17 · 1:00 PM CT',
      'Thu, Jan 7 · 1:00 PM CT',
      'Thu, Jan 14 · 1:00 PM CT',
      'Thu, Jan 21 · 1:00 PM CT',
      'Thu, Jan 28 · 1:00 PM CT',
      'Thu, Feb 4 · 1:00 PM CT',
    ]);
    expect(vm.oh[0]).toMatchObject({ past: true, posted: false });
    expect(vm.oh[0]!.download).toBeUndefined();
    expect(vm.oh[1]!.download!.events[0]).toMatchObject({ title: 'Amplified Impact · Week 2: Goal-Planning Session 1 and Office Hours', url: '' });
    expect(JSON.stringify(vm)).not.toContain('zoom.us');
  });

  it('shows a buyer whose plan does not open the course nothing at all', () => {
    // The snapshot drops the course's sessions for them (scopeSnapshot, D-110), so there is no row.
    const vm = sessionsVM({ ...prod, sessions: [], modules: [] }, buyer, CT('2026-12-08T09:00'));
    expect([vm.rows, vm.oh.length > 0]).toEqual([[], true]);
  });
});

