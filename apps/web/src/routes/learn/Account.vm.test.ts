// D-178: the learner Account page's view-model, from the reads that already exist.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setViewerZone } from '@ai/core';
import { learnerOf } from '@ai/core/learner';
import type { CourseLoad } from './data';
import { ACCOUNT, accountVM, buildsLine, leadPlan, liveRange, officeHoursLine, skillsLine } from './Account.vm';
import type { AccountRead } from './Account.vm';
import { accountRead, accountState, skills } from './test/account-fixture';
import { LEARNER_ID, prelaunchState } from './test/fixture';

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

const ready = (st = accountState()): CourseLoad => ({ kind: 'ready', payload: st.payload });

function vmFor(read: AccountRead = accountRead(), st = accountState(), course: CourseLoad = ready(st)) {
  return accountVM(read, st.db, learnerOf(st.db, LEARNER_ID), course);
}

describe('the Account page (D-178)', () => {
  it('an AI Accelerator owner: the plan by billing’s name, the cohort, its live dates and the date it runs to', () => {
    const vm = vmFor();
    expect(vm.title).toBe('Account');
    expect(vm.lede).toBe('Your plan, your profile and your receipts.');
    expect(vm.plan).toEqual({
      eyebrow: 'Your plan',
      name: 'Amplified AI Accelerator',
      // The plan's date is said in billing's zone, as the offer pages say it.
      line: 'December 2026 cohort · Live Dec 2 to Feb 4 · Included through Tue, May 4, 2027',
      billing: { label: 'Manage billing', href: '/api/billing/portal' },
    });
  });

  it('the seats: one of two in use, the operator’s invite still waiting, and no Resend until a real one exists (D-178)', () => {
    expect(vmFor().seats).toEqual({
      label: 'Seats',
      used: 1,
      of: 'of 2 in use',
      segments: [true, false],
      note: 'AI Implementer invite sent Nov 16, not accepted yet',
      resend: null,
    });
  });

  it('once the operator joins, both seats are in use and nothing waits', () => {
    const st = accountState({ operatorStatus: 'active' });
    expect(vmFor(accountRead(), st).seats).toMatchObject({ used: 2, segments: [true, true], note: null, resend: null });
  });

  it('the profile: name, email and role, read only, and the password’s last change', () => {
    expect(vmFor().profile).toEqual({
      heading: 'Profile',
      name: { label: 'Full name', value: 'Dana Ross' },
      email: { label: 'Email', value: 'dana@example.com', hint: 'You sign in with this.' },
      role: { label: 'Role', value: 'Team owner', hint: 'Your AI Implementer gets the second seat.' },
      password: { label: 'Password', changed: 'Last changed Nov 12, 2026', action: { label: 'Change password', href: '/account' } },
    });
  });

  it('what is included: counted from the course’s sessions and the skills the plan opens', () => {
    expect(vmFor().included).toEqual({
      heading: 'What’s included',
      items: [
        '8 live builds, 90 minutes each',
        // The office hours fall on Thursdays and, for Weeks 2 and 3, Fridays (D-176), so they are counted.
        '10 office hours, 60 minutes each',
        'All 53 skills, owner and agent',
        'New skills and office hours through May 4, 2027',
      ],
    });
  });

  it('an AI Implementer: no Manage billing (the owner’s alone), no receipts in the lede, and no Resend for a joined team', () => {
    const st = accountState({ role: 'Operations Lead', operatorStatus: 'active' });
    const vm = vmFor(accountRead(), st);
    expect(vm.plan?.billing).toBeNull();
    expect(vm.lede).toBe(ACCOUNT.ledeNoBilling);
    expect(vm.profile.role).toEqual({ label: 'Role', value: 'AI Implementer', hint: null });
  });

  it('a sales agent can’t resend an invite', () => {
    const st = accountState({ role: 'Sales Agent' });
    expect(vmFor(accountRead(), st).seats?.resend).toBeNull();
  });

  it('Utah Life: access through the group, no plan to bill, the agent skills it opens, no seats', () => {
    const st = prelaunchState();
    const read: AccountRead = {
      billing: { plans: [], accessGroups: [{ id: 'utah-life', name: 'Utah Life' }], skills: [...skills('locked').slice(0, 30), ...skills().slice(30)] },
      password: { hasPassword: false, changedAt: null },
    };
    const vm = accountVM(read, st.db, learnerOf(st.db, LEARNER_ID), { kind: 'locked' });
    expect(vm.plan).toEqual({ eyebrow: 'Your plan', name: 'Included with your Utah Life team', line: null, billing: null });
    expect(vm.seats).toBeNull();
    expect(vm.included?.items).toEqual(['23 skills, agent']);
    expect(vm.profile.password?.changed).toBeNull();
  });

  it('no reads (the fixture build, signed out): the profile from the snapshot alone', () => {
    const vm = vmFor({ billing: null, password: null });
    expect(vm.plan).toBeNull();
    expect(vm.included).toBeNull();
    expect(vm.profile.password).toBeNull();
    expect(vm.profile.name.value).toBe('Dana Ross');
    expect(vm.lede).toBe(ACCOUNT.ledeNoBilling);
  });

  it('before the course answers (paused, upcoming): the plan without its live dates or sessions', () => {
    const vm = vmFor(accountRead(), accountState(), { kind: 'paused' });
    expect(vm.plan?.line).toBe('December 2026 cohort · Included through Tue, May 4, 2027');
    expect(vm.included?.items).toEqual(['All 53 skills, owner and agent', 'New skills and office hours through May 4, 2027']);
  });
});

describe('the pieces', () => {
  it('leads with the AI Accelerator, then a plan that hasn’t ended', () => {
    expect(leadPlan([{ kind: 'membership', status: 'active', paidThrough: 1 }, { kind: 'cohort', status: 'active', paidThrough: 2 }])?.kind).toBe('cohort');
    expect(leadPlan([{ kind: 'cohort', status: 'ended', paidThrough: 2 }, { kind: 'agent_plan', status: 'trialing', paidThrough: null }])?.kind).toBe('agent_plan');
    expect(leadPlan([{ kind: 'unknown', status: 'active', paidThrough: null }])).toBeNull();
    expect(leadPlan([])).toBeNull();
  });

  it('counts sessions and skills honestly', () => {
    const s = (kind: 'build' | 'office_hours', start: string, mins: number) => ({ id: start, n: 1, kind, week: 1, title: 't', start: Date.parse(start), mins });
    const thursdays = [s('office_hours', '2026-12-03T19:00:00Z', 60), s('office_hours', '2026-12-10T19:00:00Z', 60)];
    expect(officeHoursLine(thursdays)).toBe('Office hours every Thursday, 60 minutes');
    expect(officeHoursLine([s('office_hours', '2026-12-03T19:00:00Z', 60)])).toBe('1 office hour, 60 minutes each');
    expect(officeHoursLine([])).toBeNull();
    expect(buildsLine([s('build', '2026-12-02T19:00:00Z', 90), s('build', '2026-12-09T19:00:00Z', 120)])).toBe('2 live builds');
    expect(buildsLine([])).toBeNull();
    expect(liveRange([])).toBeNull();
    expect(skillsLine(skills('locked'))).toBeNull();
    expect(skillsLine([{ sets: 'both', state: 'upcoming' }])).toBe('All 1 skill');
  });
});
