// D-187: the Team Plan window's view-model: the address, the gates and what the window says.
import { describe, expect, it } from 'vitest';
import { learnerOf } from '@ai/core/learner';
import { planItemOf, requestSource, teamGateFor, teamPlanHref, teamPlanVM, withoutPlan } from './TeamPlan.vm';
import { LEARNER_ID } from './test/fixture';
import { PLAN_COPY, TEAM_MODULE, TEAM_RESOURCE, groupSkills, offerSkills, planState } from './test/plan-fixture';
import { UTAH_LINE } from './test/library-fixture';

const me = (st = planState()) => learnerOf(st.db, LEARNER_ID);

describe('the Team Plan window’s address (D-187)', () => {
  it('/learn?plan=team opens it over Home; an item rides along; closing drops only its two parameters @parity:P-1 @parity:R-6', () => {
    expect(teamPlanHref()).toBe('/learn?plan=team');
    expect(teamPlanHref({ kind: 'team-hub' })).toBe('/learn?plan=team&item=team-hub');
    expect(teamPlanHref({ kind: 'module', id: TEAM_MODULE })).toBe(`/learn?plan=team&item=module%3A${TEAM_MODULE}`);
    expect(planItemOf('?plan=team')).toEqual({ kind: 'plan' });
    expect(planItemOf('?plan=team&item=team-hub')).toEqual({ kind: 'team-hub' });
    expect(planItemOf(`?plan=team&item=module%3A${TEAM_MODULE}`)).toEqual({ kind: 'module', id: TEAM_MODULE });
    expect(planItemOf(`?plan=team&item=resource:${TEAM_RESOURCE}`)).toEqual({ kind: 'resource', id: TEAM_RESOURCE });
    expect(planItemOf('?view=calendar')).toBeNull();
    expect(planItemOf('?plan=agent')).toBeNull();
    expect(withoutPlan('?as=agent&plan=team&item=team-hub&now=x')).toBe('?as=agent&now=x');
    expect(withoutPlan('?plan=team')).toBe('');
  });
});

describe('what comes with the Team Plan sends an Agent Plan learner to the window (D-187)', () => {
  it('a Team-only AI employee never becomes a page, nor the Team Hub, for an Agent tier learner @parity:SH-8', () => {
    const st = planState();
    expect(teamGateFor(`/learn/employees/${TEAM_MODULE}`, st.db, me(st))).toBe(teamPlanHref({ kind: 'module', id: TEAM_MODULE }));
    expect(teamGateFor('/learn/team', st.db, me(st))).toBe(teamPlanHref({ kind: 'team-hub' }));
  });

  it('nothing else is gated: a course week, an open AI employee, any other page, a Team tier learner, staff', () => {
    const st = planState();
    expect(teamGateFor('/learn/week/1', st.db, me(st))).toBeNull();
    expect(teamGateFor('/learn/employees/accelerator-week-1', st.db, me(st))).toBeNull();
    expect(teamGateFor('/learn/employees/no-such-module', st.db, me(st))).toBeNull();
    expect(teamGateFor('/learn', st.db, me(st))).toBeNull();
    const team = planState('team');
    expect(teamGateFor(`/learn/employees/${TEAM_MODULE}`, team.db, me(team))).toBeNull();
    expect(teamGateFor(`/learn/employees/${TEAM_MODULE}`, st.db, null)).toBeNull();
  });
});

describe('what the window says (D-187)', () => {
  it('an Agent Plan learner: a preview of the item, the builder’s words, and one button that asks @parity:SH-8 @parity:C-13', () => {
    const st = planState();
    const vm = teamPlanVM({ kind: 'module', id: TEAM_MODULE }, st.db, me(st), { kind: 'ready', payload: offerSkills() });
    expect(vm).toEqual({
      kind: 'offer',
      title: 'Operations AI Employee',
      preview: { name: 'Operations AI Employee', icon: expect.any(String), tone: expect.any(String), line: 'Upload an executed contract and get every deadline on a calendar.', outputs: ['A deadline calendar', 'A task list for the file', 'A weekly status note'] },
      heading: PLAN_COPY['plan.team.title'],
      lines: [PLAN_COPY['plan.team.lead'], PLAN_COPY['plan.team.solo']],
      ask: { label: PLAN_COPY['plan.team.ask'], source: 'Team Plan window · Operations AI Employee' },
      asked: null,
    });
    // The snapshot never carried the module's buildable parts.
    expect(JSON.stringify(vm)).not.toContain('SECRET PROMPT');
  });

  it('every plan word is the builder’s: an edited string shows, an emptied one is left out, no label means no button', () => {
    const st = planState();
    const edited = teamPlanVM({ kind: 'plan' }, st.db, me(st), { kind: 'ready', payload: offerSkills({ ...PLAN_COPY, 'plan.team.title': 'Part of the Team Plan', 'plan.team.solo': '' }) });
    expect(edited).toMatchObject({ kind: 'offer', title: 'Part of the Team Plan', heading: 'Part of the Team Plan', lines: [PLAN_COPY['plan.team.lead']] });
    const none = teamPlanVM({ kind: 'plan' }, st.db, me(st), { kind: 'ready', payload: offerSkills({}) });
    expect(none).toMatchObject({ kind: 'offer', title: 'Team Plan', heading: null, lines: [], ask: null });
  });

  it('a vault item and the Team Hub preview themselves @parity:A-7', () => {
    const st = planState();
    expect(teamPlanVM({ kind: 'resource', id: TEAM_RESOURCE }, st.db, me(st), { kind: 'ready', payload: offerSkills() })).toMatchObject({
      title: 'Team Playbook Template',
      preview: { line: 'The playbook a team fills in.' },
      ask: { source: 'Team Plan window · Team Playbook Template' },
    });
    expect(teamPlanVM({ kind: 'team-hub' }, st.db, me(st), { kind: 'ready', payload: offerSkills() })).toMatchObject({ title: 'Team Hub', ask: { source: 'Team Plan window · Team Hub' } });
    expect(requestSource(null)).toBe('Team Plan window');
  });

  it('once they have asked: the asked line, and no second button @parity:C-13', () => {
    const st = planState('agent', (d) => d.requests.push({ id: 'ur_1', userId: LEARNER_ID, name: 'Dana Ross', email: 'dana@example.com', source: 'Team Plan window', at: 0, status: 'new' }));
    expect(teamPlanVM({ kind: 'plan' }, st.db, me(st), { kind: 'ready', payload: offerSkills() })).toMatchObject({ ask: null, asked: PLAN_COPY['plan.team.asked'] });
    // A closed request is history: they may ask again.
    const closed = planState('agent', (d) => d.requests.push({ id: 'ur_1', userId: LEARNER_ID, name: 'Dana Ross', email: 'dana@example.com', source: 'x', at: 0, status: 'closed' }));
    expect(teamPlanVM({ kind: 'plan' }, closed.db, me(closed), { kind: 'ready', payload: offerSkills() })).toMatchObject({ ask: { label: PLAN_COPY['plan.team.ask'] }, asked: null });
  });

  it('Utah Life, and any access group’s member: “Not included with {group} access”, no upsell, no button @parity:SH-8 @parity:P-1', () => {
    const st = planState();
    const vm = teamPlanVM({ kind: 'module', id: TEAM_MODULE }, st.db, me(st), { kind: 'ready', payload: groupSkills() });
    expect(vm).toEqual({ kind: 'group', title: 'Operations AI Employee', preview: expect.any(Object), line: UTAH_LINE });
    expect(JSON.stringify(vm)).not.toContain(PLAN_COPY['plan.team.title']!);
    expect(JSON.stringify(vm)).not.toContain(PLAN_COPY['plan.team.ask']!);
    // A group with no line of its own reads the library's same words.
    const other = teamPlanVM({ kind: 'plan' }, st.db, me(st), { kind: 'ready', payload: { ...groupSkills(), accessGroups: [{ id: 'insiders-team', name: 'Insiders Team' }], lockedLines: {} } });
    expect(other).toMatchObject({ kind: 'group', line: 'Not included with Insiders Team access' });
  });

  it('nothing is offered until the library answers; nothing at all for a Team tier learner or a missing item', () => {
    const st = planState();
    expect(teamPlanVM({ kind: 'plan' }, st.db, me(st), { kind: 'loading' })).toMatchObject({ kind: 'wait', loading: 'Loading' });
    expect(teamPlanVM({ kind: 'plan' }, st.db, me(st), { kind: 'failed' })).toMatchObject({ kind: 'wait', loading: null });
    const team = planState('team');
    expect(teamPlanVM({ kind: 'plan' }, team.db, me(team), { kind: 'ready', payload: offerSkills() })).toBeNull();
    expect(teamPlanVM({ kind: 'module', id: 'gone' }, st.db, me(st), { kind: 'ready', payload: offerSkills() })).toBeNull();
    expect(teamPlanVM({ kind: 'plan' }, st.db, null, { kind: 'ready', payload: offerSkills() })).toBeNull();
  });
});
