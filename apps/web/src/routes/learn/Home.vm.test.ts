// D-177: Home's view-model, before launch, at a live build, and without the course.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import { COPY as COURSE_COPY } from '../course/Course.vm';
import { greeting, homeVM } from './Home.vm';
import { weekRows } from './learn.vm';
import { LEARNER_ID, PRELAUNCH_NOW, learnState, liveState, prelaunchState } from './test/fixture';
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
