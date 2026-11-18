// D-177: Home's view-model, before launch, at a live build, and without the course.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { COPY as COURSE_COPY } from '../course/Course.vm';
import { greeting, homeVM } from './Home.vm';
import { weekRows } from './learn.vm';
import { LEARNER_ID, PRELAUNCH_NOW, asShell, learnState, liveState, prelaunchState, sessionIn } from './test/fixture';
import type { LearnState } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const home = (st: LearnState) => {
  const me = learnerOf(st.db, LEARNER_ID);
  return homeVM({ kind: 'ready', payload: st.payload }, weekRows(st.payload, st.db, me), st.db.cohorts, me, me!.name, st.now);
};

describe('Home (D-177)', () => {
  it('greets the signed-in learner by first name, by the time of day where they are', () => {
    expect(greeting('Dana Ross', PRELAUNCH_NOW)).toBe('Good afternoon, Dana');
    expect(greeting('Dana Ross', Date.parse('2026-11-18T15:00:00Z'))).toBe('Good morning, Dana');
    expect(greeting('', PRELAUNCH_NOW)).toBe('Good afternoon');
  });

  it('before launch: the preview line, the step up next, and the countdown to the first live build', () => {
    const vm = home(prelaunchState());
    expect(vm.lede).toBe('Pre-launch preview: Week 0 is open now, and each week opens on the date shown.');
    expect(vm.hero).toMatchObject({
      kind: 'step',
      eyebrow: 'Up next · Step 3 of 8',
      title: 'Start Your Time Baseline',
      meta: '20 min, over two weeks · Claude or ChatGPT · Owner',
      segs: ['d', 'd', 'c', '', '', '', '', ''],
      doneText: '2 of 8 done',
      primary: { label: 'Continue step 3', href: '/learn/week/0/step/3' },
      secondary: { label: 'See all eight steps', href: '/learn/week/0' },
    });
    if (vm.hero?.kind !== 'step') throw new Error('no step hero');
    expect(vm.hero.right).toMatchObject({ label: 'Goes live in', foot: 'Wed, Dec 2 · 12:00 PM MT (1:00 PM CT)' });
    expect(vm.hero.right!.parts).toEqual([
      { n: 13, unit: 'days' },
      { n: 22, unit: 'hrs' },
      { n: 0, unit: 'min' },
    ]);
  });

  it('draws one card per week from the API, the current one outlined and the locked ones with when they open', () => {
    const vm = home(prelaunchState());
    const cards = vm.employees!.cards;
    expect(cards).toHaveLength(9);
    expect(cards[0]).toMatchObject({ title: 'Foundations', current: true, locked: false, foot: { kind: 'bar', text: '2 of 8' }, weekLabel: 'Week 0', aria: 'Foundations, 2 of 8' });
    expect(cards[1]).toMatchObject({ title: 'Where the Money Goes', current: false, locked: true, foot: { kind: 'text', text: 'Opens Dec 2' }, weekLabel: 'Week 1' });
    expect(vm.employees!.meta).toBeNull();
  });

  it('lists what is coming up and the cohort, with real counts only', () => {
    const vm = home(prelaunchState());
    expect(vm.comingUp!.rows.map((r) => r.title)).toEqual(['Map Your Spend Live Build', 'Map Your Spend Office Hours', 'Lead Source Review Live Build']);
    expect(vm.comingUp!.add).toMatchObject({ label: 'Add all to calendar' });
    expect(vm.cohort).toMatchObject({
      month: 'December 2026',
      stats: [{ figure: '15', label: 'in your cohort' }],
      officeHours: { title: 'Map Your Spend Office Hours', meta: 'Thu, Dec 3 · 12:00 PM MT (1:00 PM CT)' },
      support: { address: 'support@amplifiedimpact.io', href: 'mailto:support@amplifiedimpact.io' },
    });
    // No enrolment, no tile: a count the API can't vouch for is not drawn.
    expect(home(learnState(PRELAUNCH_NOW, true, {}, 0)).cohort!.stats).toEqual([]);
  });

  it('at a live build: live now, join, the time left, and that week’s card marked live', () => {
    const vm = home(liveState());
    expect(vm.lede).toBe('Which lead sources pay, and is every lead worked?');
    expect(vm.hero).toMatchObject({
      kind: 'live',
      eyebrow: 'Live now · Week 2',
      title: 'Lead Source Review Live Build',
      meta: '12:00 PM MT (1:00 PM CT) · Zoom',
      joinLabel: 'Join the live build',
      open: { label: 'Open Leads That Pay', href: '/learn/week/2' },
    });
    if (vm.hero?.kind !== 'live') throw new Error('no live hero');
    expect(vm.hero.right).toMatchObject({ label: 'Time left', foot: 'Ends 1:30 PM MT (2:30 PM CT). The replay posts after.' });
    expect(vm.hero.right.parts).toEqual([
      { n: 1, unit: 'hr' },
      { n: 25, unit: 'min' },
    ]);
    const cards = vm.employees!.cards;
    expect(cards.slice(0, 3).map((c) => c.foot)).toEqual([{ kind: 'built', text: 'Built' }, { kind: 'bar', segs: ['d', 'd', 'd', 'd', 'd', 'c'], text: '5 of 6' }, { kind: 'text', text: 'Not started' }]);
    expect(cards.filter((c) => c.live).map((c) => c.week)).toEqual([2]);
    expect(cards.some((c) => c.current)).toBe(false);
    expect(vm.employees!.meta).toBe('1 built');
  });

  it('without the course (Utah Life, a plan of skills): the greeting and the Library, and no cohort pieces', () => {
    for (const kind of ['locked', 'signed-out'] as const) {
      const vm = homeVM({ kind }, [], [], null, 'Pat Lee', PRELAUNCH_NOW);
      expect(vm).toMatchObject({ greeting: 'Good afternoon, Pat', hero: null, employees: null, comingUp: null, cohort: null });
      expect(vm.library).toEqual({ note: COURSE_COPY.lockedNote, label: COURSE_COPY.library, href: '/learn/skills' });
      expect(JSON.stringify(vm)).not.toMatch(/Accelerator/);
    }
  });

  it('paused, failed and not yet open each say so, with no cohort pieces', () => {
    expect(homeVM({ kind: 'paused' }, [], [], null, 'Pat Lee', PRELAUNCH_NOW)).toMatchObject({ lede: COURSE_COPY.paused, cohort: null, employees: null });
    expect(homeVM({ kind: 'failed' }, [], [], null, 'Pat Lee', PRELAUNCH_NOW)).toMatchObject({ lede: COURSE_COPY.failed, library: null });
    const up = homeVM({ kind: 'upcoming', opensAt: Date.parse('2026-12-02T19:00:00Z') }, [], [], null, 'Pat Lee', PRELAUNCH_NOW);
    expect(up.hero).toMatchObject({ kind: 'opens', right: { label: 'Goes live in', foot: 'Wed, Dec 2 · 12:00 PM MT (1:00 PM CT)' } });
  });
});

// D-183: Join from 15 minutes before, Go Live and End Session, and the in-app announcement.
describe('Home: Join, Go Live and the in-app announcement (D-183)', () => {
  const S1 = Date.parse('2026-12-02T19:00:00Z');
  const MIN = 60_000;
  const at = (now: number, edit?: Parameters<typeof learnState>[4]) => asShell(learnState(now, true, { 0: ['c1', 'c2'] }, 15, edit));
  const full = (st: LearnState) => {
    const me = learnerOf(st.db, LEARNER_ID);
    return homeVM({ kind: 'ready', payload: st.payload }, weekRows(st.payload, st.db, me), st.db.cohorts, me, me!.name, st.now, st.db);
  };

  it('Home hero Join enabled at start-15m, absent at start-16m @parity:D-2 @parity:A-8', () => {
    expect(home(at(S1 - 16 * MIN)).hero).toMatchObject({ kind: 'step' });
    const vm = home(at(S1 - 15 * MIN));
    expect(vm.hero).toMatchObject({ kind: 'live', state: 'ready', eyebrow: 'Starting soon · Week 1', sessionId: 'dec26-s1', joinLabel: 'Join the live build', right: { label: 'Goes live in' } });
    // Not live yet, so no card is marked live.
    expect(vm.employees!.cards.some((c) => c.live)).toBe(false);
  });

  it('Home follows Go Live hours early (Live now, Join) and End Session (gone) @parity:C-1 @parity:C-2', () => {
    const early = S1 - 3 * 3600_000;
    const live = home(at(early, (d) => (sessionIn(d, 'dec26-s1').live = true)));
    expect(live.hero).toMatchObject({ kind: 'live', state: 'live', eyebrow: 'Live now · Week 1' });
    expect(live.employees!.cards.filter((c) => c.live).map((c) => c.week)).toEqual([1]);
    expect(live.comingUp!.rows.map((r) => r.id)).not.toContain('dec26-s1');
    const ended = home(
      at(early + 20 * MIN, (d) => {
        const s = sessionIn(d, 'dec26-s1');
        Object.assign(s, { live: false, start: early + 20 * MIN - s.mins * MIN, replay: 'processing' });
      }),
    );
    expect(ended.hero).toMatchObject({ kind: 'step' });
  });

  it('the in-app announcement for the learner’s audience: severity, title, body, time, Open Sessions action; none once dismissed @parity:D-1 @parity:C-6 @parity:M-5', () => {
    const ann = (d: Parameters<NonNullable<Parameters<typeof learnState>[4]>>[0], dismissed = false) => {
      d.announcements = [
        { id: 'e1', title: 'By email only', body: '', severity: 'info', action: null, actionLabel: '', audience: 'all', channels: ['email'], status: 'sent', at: PRELAUNCH_NOW - 3600_000, opens: null },
        { id: 'n1', title: 'Office hours are open', body: 'Bring your questions.', severity: 'info', action: 'sessions', actionLabel: 'See the schedule', audience: 'all', channels: ['inapp'], status: 'sent', at: PRELAUNCH_NOW - 2 * 3600_000, opens: null },
      ];
      d.dismissed = dismissed ? { [`${LEARNER_ID}:n1`]: 1 } : {};
    };
    const vm = full(at(PRELAUNCH_NOW, (d) => ann(d)));
    expect(vm.banner).toMatchObject({
      id: 'n1',
      severity: 'info',
      title: 'Office hours are open',
      body: 'Bring your questions.',
      when: '2 hours ago',
      action: { label: 'See the schedule', kind: 'nav', href: '/learn/schedule' },
      dismiss: 'Dismiss',
    });
    expect(full(at(PRELAUNCH_NOW, (d) => ann(d, true))).banner).toBeNull();
    // Without the snapshot handed in, no banner (the view-model's other callers).
    expect(home(at(PRELAUNCH_NOW, (d) => ann(d))).banner).toBeNull();
  });

  it('the moved-session banner re-reads its title from the session; Update Calendar is the updated .ics @parity:D-1', () => {
    const vm = full(
      at(PRELAUNCH_NOW, (d) => {
        d.announcements = [
          { id: 'm1', sessionId: 'dec26-s1', title: 'Old words', body: '', severity: 'warning', action: 'calendar', actionLabel: 'Update Calendar', audience: 'all', channels: ['inapp', 'email'], status: 'sent', at: PRELAUNCH_NOW - 60_000, opens: null },
        ];
        sessionIn(d, 'dec26-s1').start = Date.parse('2026-12-03T19:00:00Z');
      }),
    );
    expect(vm.banner).toMatchObject({
      severity: 'warning',
      title: 'Session 1 moved to Thu Dec 3 · 12:00 PM MT (1:00 PM CT)',
      action: { kind: 'calendar', label: 'Update Calendar', name: 'session-1.ics', toast: 'Calendar invite updated' },
    });
    if (vm.banner?.action?.kind !== 'calendar') throw new Error('no calendar action');
    expect(vm.banner.action.ics).toEqual([{ id: 'dec26-s1', title: 'Map Your Spend Live Build', start: Date.parse('2026-12-03T19:00:00Z'), end: Date.parse('2026-12-03T20:30:00Z') }]);
  });

  it('after the cohort: "Your Cohort Wrapped", office hours to calendar, Rewatch Any Session @parity:D-6', () => {
    const END = Date.parse('2027-02-10T19:00:00Z');
    const vm = full(asShell(learnState(END, false, {}, 15)));
    expect(vm.post).toMatchObject({
      kicker: expect.stringMatching(/^Your Cohort Wrapped on /),
      title: 'Office Hours Continue',
      meta: expect.stringMatching(/^Drop-In Build Help with .+ · Next: Schedule TBA$/),
      ics: null,
      addLabel: 'Add Office Hours to Calendar',
      rewatch: { label: 'Rewatch Any Session', href: '/learn/schedule' },
    });
    // While a session is still ahead, none.
    expect(full(at(PRELAUNCH_NOW)).post).toBeNull();
  });

  it('for 12 hours after a build: Replay Ready with Watch Replay, or Session Ended with Open the Build Kit @parity:D-4 @parity:C-3', () => {
    const S1END = S1 + 90 * MIN;
    const processing = full(at(S1END + 60 * MIN, (d) => Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'processing' })));
    expect(processing.recent).toEqual({
      state: 'processing',
      badge: 'Session Ended',
      title: 'Map Your Spend Live Build',
      note: 'Replay processing · usually within 2 hours',
      action: { label: 'Open the Build Kit', href: '/learn/week/1' },
    });
    const ready = full(at(S1END + 3 * 3600_000, (d) => Object.assign(sessionIn(d, 'dec26-s1'), { replay: 'ready' })));
    expect(ready.recent).toMatchObject({ state: 'replay', badge: 'Replay Ready', action: { label: 'Watch Replay', href: '/learn/week/1' } });
    expect(full(at(S1END + 13 * 3600_000)).recent).toBeNull();
  });

  it('before the course opens: the pre-launch welcome beside the countdown @parity:K-14 @parity:G-7', () => {
    const up = homeVM({ kind: 'upcoming', opensAt: Date.parse('2026-12-02T19:00:00Z') }, [], [], null, 'Pat Lee', PRELAUNCH_NOW);
    expect(up.hero).toMatchObject({
      kind: 'opens',
      right: { label: 'Goes live in' },
      welcome: {
        title: 'You’re in the Amplified AI Accelerator.',
        starts: 'Live sessions start Wednesday, Dec 2, at 12:00 PM MT (1:00 PM CT). Your course and your skills open then.',
        support: 'Questions? Email',
        email: 'support@amplifiedimpact.io',
      },
    });
  });

  it('shows the announcement on Home without the course too', () => {
    const st = at(PRELAUNCH_NOW, (d) => {
      d.announcements = [{ id: 'n2', title: 'For everyone', body: '', severity: 'info', action: null, actionLabel: '', audience: 'all', channels: ['inapp'], status: 'sent', at: PRELAUNCH_NOW, opens: null }];
    });
    const me = learnerOf(st.db, LEARNER_ID);
    expect(homeVM({ kind: 'locked' }, [], [], me, 'Dana Ross', PRELAUNCH_NOW, st.db).banner).toMatchObject({ title: 'For everyone', action: null });
  });
});
