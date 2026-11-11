import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { phaseNow, seed, seedProduction, setViewerZone } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { cardAction, dashboardVM, nextWednesday } from './Dashboard.vm';

// Expectations are HARD-CODED, never recomputed from the same helpers the view-model uses: a test
// that recomputes its own answer proves only that the code agrees with itself. The strings below
// are the ones compliance/goldens/dash-*-main.json captured from the unmodified prototype.

const WEEK0 = phaseNow('week0'); // 2026-11-27 10:42 CT
const LIVE = phaseNow('live'); //  2026-12-07 10:42 CT
const POST = phaseNow('post'); //  2027-01-12 10:42 CT

const learner = (db: Db, id: string): Learner => db.users.find((u) => u.id === id)!;

describe('dashboardVM @g5', () => {
  // `fmt.*` reads the viewer zone, so pin it: `Dec 9` and `1:00 PM CT` must not depend on the
  // machine the suite runs on. Central is what the goldens were captured in.
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));

  describe('Jamie Ortiz · Agent tier · Week 2', () => {
    const db = seed('live');
    const vm = dashboardVM(db, learner(db, 'u_jamie'), LIVE);

    it('names the included AI Employees in the subline', () => {
      expect(vm.subline).toBe('Agent Tier · Marketing, Sales and Database Included');
    });

    it('shows the moved-session banner, retitled from the session itself', () => {
      expect(vm.ann).toEqual({
        id: 'a1',
        severity: 'warning',
        title: 'Session 3 moved to Wed Dec 9 · 1:00 PM CT',
        body: '',
        when: '19 hours ago',
        abs: 'Dec 6, 2026, 3:00 PM CT',
        actionLabel: 'Update Calendar',
        action: {
          kind: 'download',
          file: {
            name: 'session-3.ics',
            content: expect.stringContaining('BEGIN:VCALENDAR') as string,
            mime: 'text/calendar',
            toast: 'Calendar invite updated',
          },
        },
      });
    });

    it('puts the next live session on the card, counting down', () => {
      expect(vm.session).toMatchObject({
        variant: 'scheduled',
        kicker: 'Next Live Session',
        n: 3,
        title: 'The Living Database',
        module: 'Database AI Employee',
        when: 'Wed, Dec 9 · 1:00 PM CT',
        mins: 75,
        instructor: 'Jordan Hale',
        primary: 'calendar',
        join: 'disabled',
        hint: 'Opens 15 Min Before',
        aria: 'Starts in 2 days 2 hours',
      });
      expect(vm.session?.countdown).toEqual([
        { v: '02', l: 'Days' },
        { v: '02', l: 'Hours' },
        { v: '18', l: 'Min' },
      ]);
      expect(vm.post).toBeNull();
    });

    it('routes the card actions at the session and its AI Employee', () => {
      expect(vm.join).toEqual({
        kind: 'toast',
        msg: 'Opening Zoom · https://zoom.us/j/8841203352',
        tone: 'info',
      });
      expect(vm.watch).toEqual({ kind: 'nav', to: '/employees/database' });
      expect(vm.cal?.ics.name).toBe('session-3.ics');
      expect(vm.cal?.ics.toast).toBe('Calendar invite downloaded');
      expect(vm.cal?.google).toContain('calendar.google.com');
      expect(vm.cal?.outlook).toContain('outlook.live.com');
    });

    it('counts 1 of 3 built, one segment per included AI Employee', () => {
      expect(vm.pg.done).toBe(1);
      expect(vm.pg.total).toBe(3);
      expect(vm.pg.segs).toEqual([
        {
          key: 'marketing',
          label: 'Marketing',
          state: 'verified',
          n: 6,
          total: 6,
          w: '100%',
          tip: 'Marketing AI Employee: 6 of 6 steps verified',
        },
        {
          key: 'sales',
          label: 'Sales',
          state: 'in_progress',
          n: 3,
          total: 6,
          w: '50%',
          tip: 'Sales AI Employee: 3 of 6 steps verified',
        },
        {
          key: 'database',
          label: 'Database',
          state: 'not_started',
          n: 0,
          total: 6,
          w: '0%',
          tip: 'Database AI Employee: 0 of 6 steps verified',
        },
      ]);
      expect(vm.pg.aria).toBe(
        '1 of 3 AI Employees built. Marketing 6 of 6 steps, Sales 3 of 6 steps, Database 0 of 6 steps',
      );
    });

    it('offers the in-progress AI Employee as Next Up and sells the locked three', () => {
      expect(vm.pg.next).toEqual({
        name: 'Sales AI Employee',
        action: { kind: 'nav', to: '/employees/sales' },
      });
      expect(vm.pg.lockedNote).toBe('3 More with Team Tier');
      expect(vm.pg.lockedAction).toEqual({ kind: 'locked', moduleId: 'meetings' });
      expect(vm.pg.week0).toBeNull();
    });

    it('lists every visible AI Employee on the grid, locked ones included', () => {
      expect(vm.cards.map((c) => c.id)).toEqual([
        'marketing',
        'sales',
        'database',
        'meetings',
        'finance',
        'operations',
      ]);
      expect(vm.cards.map((c) => c.cta)).toEqual([
        'Open',
        'Continue Build',
        'Start Build',
        'Preview',
        'Preview',
        'Preview',
      ]);
      expect(vm.cards[0]?.sessLine).toBe('Session 1 · Replay Ready');
      expect(vm.cards[2]?.sessLine).toBe('Session 3 · Dec 9');
    });

    it('builds the three quick links', () => {
      expect(vm.links.map((l) => [l.title, l.sub, l.icon, l.arrow])).toEqual([
        ['Cohort Community', '148 members · 23 new posts today', 'chat', 'arrowUR'],
        ['Office Hours', 'Wednesdays · 11:00 AM CT', 'calendar', 'calPlus'],
        ['Technical Support', 'Typical reply in under 2 hours', 'headset', 'chevR'],
      ]);
      expect(vm.links[0]?.action).toEqual({
        kind: 'toast',
        msg: 'Opening the cohort community',
        tone: 'info',
      });
      expect(vm.links[1]?.action).toMatchObject({
        kind: 'download',
        file: { name: 'office-hours.ics', toast: 'Office hours added to your calendar' },
      });
      expect(vm.links[2]?.action).toEqual({
        kind: 'toast',
        msg: 'Support chat opened. Luis from Support will reply here.',
        tone: 'info',
      });
    });

    it('tokenizes the cohort schedule: two replays, the next one, three locked', () => {
      expect(vm.sched.map((x) => [x.n, x.title, x.sub])).toEqual([
        [1, 'The Autonomous Agent', 'Tue, Dec 1 · 1:00 PM CT'],
        [2, 'Speed to Lead', 'Thu, Dec 3 · 1:00 PM CT'],
        [3, 'The Living Database', 'Wed, Dec 9 · 1:00 PM CT'],
        [4, 'The Meeting That Runs Itself', 'Thu, Dec 10 · 1:00 PM CT'],
        [5, 'Numbers on Autopilot', 'Tue, Dec 15 · 1:00 PM CT'],
        [6, 'Contract to Close', 'Thu, Dec 17 · 1:00 PM CT'],
      ]);
      expect(vm.sched.map((x) => x.token)).toEqual([
        { kind: 'custom', tone: 'success', icon: 'check', label: 'Replay' },
        { kind: 'custom', tone: 'success', icon: 'check', label: 'Replay' },
        { kind: 'custom', tone: 'progress', icon: 'clock', label: 'Next' },
        { kind: 'access', state: 'locked' },
        { kind: 'access', state: 'locked' },
        { kind: 'access', state: 'locked' },
      ]);
      expect(vm.sched.map((x) => x.locked)).toEqual([false, false, false, true, true, true]);
    });

    it('never navigates to a locked session row — it asks for the preview', () => {
      expect(vm.sched[0]?.action).toEqual({ kind: 'nav', to: '/employees/marketing' });
      expect(vm.sched[3]?.action).toEqual({ kind: 'locked', moduleId: 'meetings' });
      expect(vm.allSessions).toEqual({ kind: 'nav', to: '/sessions' });
    });
  });

  describe('Alex Morgan · Team owner · Week 2', () => {
    const db = seed('live');
    const vm = dashboardVM(db, learner(db, 'u_alex'), LIVE);

    it('names the team in the subline and unlocks all six', () => {
      expect(vm.subline).toBe('Northline Realty Team · Team Tier');
      expect(vm.pg.done).toBe(2);
      expect(vm.pg.total).toBe(6);
      expect(vm.pg.lockedNote).toBe('');
      expect(vm.pg.lockedAction).toBeNull();
    });

    it('measures every segment, including the not-yet-open Operations build', () => {
      expect(vm.pg.segs.map((x) => [x.label, x.state, x.n, x.w])).toEqual([
        ['Marketing', 'verified', 6, '100%'],
        ['Sales', 'verified', 6, '100%'],
        ['Database', 'in_progress', 2, '33%'],
        ['Meetings', 'not_started', 0, '0%'],
        ['Finance', 'not_started', 0, '0%'],
        ['Operations', 'not_started', 0, '0%'],
      ]);
      expect(vm.pg.aria).toBe(
        '2 of 6 AI Employees built. Marketing 6 of 6 steps, Sales 6 of 6 steps, Database 2 of 6 steps, Meetings 0 of 6 steps, Finance 0 of 6 steps, Operations 0 of 6 steps',
      );
    });

    it('offers Database as Next Up and skips the scheduled Operations build', () => {
      expect(vm.pg.next).toEqual({
        name: 'Database AI Employee',
        action: { kind: 'nav', to: '/employees/database' },
      });
    });

    it('sees the owner audience banner and no locked schedule rows', () => {
      expect(vm.ann?.id).toBe('a1');
      expect(vm.sched.map((x) => x.locked)).toEqual([false, false, false, false, false, false]);
      expect(vm.sched[3]?.action).toEqual({ kind: 'nav', to: '/employees/meetings' });
      expect(vm.sched[3]?.token).toBeNull();
    });

    it('marks Operations as opening later rather than locked', () => {
      expect(vm.cards[5]).toMatchObject({
        id: 'operations',
        locked: false,
        soon: true,
        opensLabel: 'Opens Dec 14',
        cta: 'View Details',
      });
    });
  });

  describe('Week 0', () => {
    const db = seed('week0');
    const vm = dashboardVM(db, learner(db, 'u_jamie'), WEEK0);

    it('has no banner and nothing built', () => {
      expect(vm.ann).toBeNull();
      expect(vm.pg.done).toBe(0);
      expect(vm.pg.total).toBe(3);
      expect(vm.pg.segs.map((x) => [x.label, x.state, x.w])).toEqual([
        ['Marketing', 'not_started', '0%'],
        ['Sales', 'not_started', '0%'],
        ['Database', 'not_started', '0%'],
      ]);
    });

    it('hides Next Up and shows the orientation row instead', () => {
      expect(vm.pg.next).toBeNull();
      expect(vm.pg.week0).toEqual({
        date: 'Dec 1',
        watch: {
          kind: 'toast',
          msg: 'Orientation · 5 min. Plays in the production player.',
          tone: 'info',
        },
      });
    });

    it('counts down to Session 1, which has not moved yet', () => {
      expect(vm.session).toMatchObject({
        variant: 'scheduled',
        n: 1,
        title: 'The Autonomous Agent',
        module: 'Marketing AI Employee',
        when: 'Tue, Dec 1 · 1:00 PM CT',
        aria: 'Starts in 4 days 2 hours',
      });
      expect(vm.session?.countdown).toEqual([
        { v: '04', l: 'Days' },
        { v: '02', l: 'Hours' },
        { v: '18', l: 'Min' },
      ]);
      expect(vm.post).toBeNull();
      // Session 3 is back on its original Dec 8 date in Week 0.
      expect(vm.sched[2]?.sub).toBe('Tue, Dec 8 · 1:00 PM CT');
    });

    it('tokens only the next session, and still locks the team-tier three', () => {
      expect(vm.sched.map((x) => x.token)).toEqual([
        { kind: 'custom', tone: 'progress', icon: 'clock', label: 'Next' },
        null,
        null,
        { kind: 'access', state: 'locked' },
        { kind: 'access', state: 'locked' },
        { kind: 'access', state: 'locked' },
      ]);
    });

    it('still offers office hours on the coming Wednesday', () => {
      expect(vm.links[1]?.sub).toBe('Wednesdays · 11:00 AM CT');
    });
  });

  describe('After Cohort', () => {
    const db = seed('post');
    const jamie = dashboardVM(db, learner(db, 'u_jamie'), POST);
    const alex = dashboardVM(db, learner(db, 'u_alex'), POST);

    it('replaces the session card with the office-hours card', () => {
      expect(jamie.session).toBeNull();
      expect(jamie.join).toBeNull();
      expect(jamie.cal).toBeNull();
      expect(jamie.watch).toBeNull();
      expect(jamie.post).toEqual({
        ended: 'Jan 8',
        title: 'Office Hours Continue Wednesdays',
        host: 'Jordan Hale',
        next: 'Wed, Jan 13 · 11:00 AM CT',
        cal: {
          name: 'office-hours.ics',
          content: expect.stringContaining('SUMMARY:Amplified Impact office hours') as string,
          mime: 'text/calendar',
          toast: 'Office hours added to your calendar',
        },
        rewatch: { kind: 'nav', to: '/sessions' },
      });
    });

    it('shows everything built, with no Next Up left', () => {
      expect(jamie.pg.done).toBe(3);
      expect(jamie.pg.total).toBe(3);
      expect(jamie.pg.next).toBeNull();
      expect(jamie.pg.week0).toBeNull();
      expect(jamie.pg.lockedNote).toBe('3 More with Team Tier');
      expect(jamie.cards.map((c) => c.cta)).toEqual(['Open', 'Open', 'Open', 'Preview', 'Preview', 'Preview']);
    });

    it('has no announcement left in app', () => {
      expect(jamie.ann).toBeNull();
      expect(alex.ann).toBeNull();
    });

    it('marks every replay ready on the schedule', () => {
      expect(alex.pg.done).toBe(6);
      expect(alex.pg.next).toBeNull();
      expect(alex.sched.map((x) => x.token?.label)).toEqual([
        'Replay',
        'Replay',
        'Replay',
        'Replay',
        'Replay',
        'Replay',
      ]);
      expect(jamie.sched.map((x) => x.token)).toEqual([
        { kind: 'custom', tone: 'success', icon: 'check', label: 'Replay' },
        { kind: 'custom', tone: 'success', icon: 'check', label: 'Replay' },
        { kind: 'custom', tone: 'success', icon: 'check', label: 'Replay' },
        { kind: 'access', state: 'locked' },
        { kind: 'access', state: 'locked' },
        { kind: 'access', state: 'locked' },
      ]);
    });
  });

  describe('cardAction', () => {
    const db = seed('live');
    const jamie = dashboardVM(db, learner(db, 'u_jamie'), LIVE);
    const alex = dashboardVM(db, learner(db, 'u_alex'), LIVE);

    it('opens the Locked Preview instead of navigating', () => {
      expect(cardAction(jamie.cards[3]!)).toEqual({ kind: 'locked', moduleId: 'meetings' });
    });

    it('toasts the open date for a scheduled AI Employee, in sentence case', () => {
      expect(cardAction(alex.cards[5]!)).toEqual({
        kind: 'toast',
        msg: 'Operations AI Employee opens Dec 14. Materials post that morning.',
        tone: 'info',
      });
    });

    it('navigates to an accessible, open AI Employee', () => {
      expect(cardAction(jamie.cards[0]!)).toEqual({ kind: 'nav', to: '/employees/marketing' });
    });
  });

  describe('nextWednesday', () => {
    it('finds the coming Wednesday at 11:00 AM CT from each phase instant', () => {
      expect(nextWednesday(WEEK0)).toBe(Date.parse('2026-12-02T11:00:00-06:00'));
      expect(nextWednesday(LIVE)).toBe(Date.parse('2026-12-09T11:00:00-06:00'));
      expect(nextWednesday(POST)).toBe(Date.parse('2027-01-13T11:00:00-06:00'));
    });

    it('skips a Wednesday whose 11:00 AM has already passed', () => {
      // Wednesday 2026-12-09, 12:30 PM CT — the hour is gone, so the next one is a week later.
      expect(nextWednesday(Date.parse('2026-12-09T12:30:00-06:00'))).toBe(Date.parse('2026-12-16T11:00:00-06:00'));
    });
  });
});

// The AI Accelerator (D-110): the office-hours quick link and the post-cohort card follow the
// cohort's own Thursday series and its real instructor, never the prototype's Wednesday hour, its
// Zoom link or its invented instructor.
describe('Dashboard · the AI Accelerator cohort', () => {
  beforeAll(() => setViewerZone('America/Chicago'));
  afterAll(() => setViewerZone(null));
  const prod = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  const buyer: Learner = { id: 'u_b', name: 'B', email: 'b@example.test', tier: 'team', role: 'Team Owner', teamId: 't_b', cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} };
  const CT = (s: string): number => Date.parse(`${s}-06:00`);

  it('points the Office Hours link at the next real Thursday', () => {
    const vm = dashboardVM(prod, buyer, CT('2026-12-08T09:00'));
    const oh = vm.links.find((l) => l.key === 'office-hours')!;
    expect(oh.sub).toBe('Thursdays · 1:00 PM CT');
    expect(JSON.stringify(oh)).toContain('Goal-Planning Session 1 and Office Hours');
    expect(JSON.stringify(vm)).not.toContain('zoom.us');
    expect(JSON.stringify(vm)).not.toContain('Jordan Hale');
    expect(vm.session).toMatchObject({ instructor: 'Connor Leiva', title: 'Morning Brief Live Build' });
  });

  it('after the cohort, names the real instructor and invents no next office hour', () => {
    const vm = dashboardVM(prod, buyer, CT('2027-02-10T09:00'));
    expect(vm.post).toEqual({ ended: 'Feb 4', title: 'Office Hours Continue', host: 'Connor Leiva', next: 'Schedule TBA', cal: null, rewatch: { kind: 'nav', to: '/sessions' } });
    expect(vm.links.find((l) => l.key === 'office-hours')).toMatchObject({ sub: 'Schedule TBA', action: { kind: 'nav', to: '/sessions' } });
    expect(JSON.stringify(vm)).not.toContain('Jordan Hale');
  });
});

