import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seed, setViewerZone } from '@ai/core';
import type { AIEmployee, Db, Learner, Progress } from '@ai/core';
import { acceleratorModuleId } from '@ai/core/accelerator';
import { DEPLOY, deployVM, hireNav, hireOfPath, hireRows, hireVM, isHireModule, runInput, runVM } from './Hire.vm';
import { hireCard } from './Home.vm';
import { navVM, weekRows } from './learn.vm';
import { LEARNER_ID, liveState } from './test/fixture';
import type { StoredFileRef } from '../../data/repository';

// D-186: the hire's page in the learner portal v2: the Your Deployment card and its Run dialog (E-14, E-15,
// A-6), ported from the current portal's `employeeDetailVM`, and the non-course AI Employee's page (E-22).

const NOW = Date.parse('2026-12-09T19:05:00Z');
const H = 3_600_000;
const demo = seed('live');
const marketing = (): AIEmployee => structuredClone(demo.modules.find((m) => m.id === 'marketing')!);
const fileUrl = (ref: StoredFileRef): string => (ref.kind === 'moduleFile' ? `/api/files/module/${ref.moduleId}/${ref.fileName}` : '');

const me = (progress: Record<string, Progress> = {}, tier: Learner['tier'] = 'agent'): Learner => ({
  id: LEARNER_ID,
  name: 'Dana Ross',
  email: 'dana@example.com',
  tier,
  role: 'Agent',
  teamId: null,
  cohortId: 'dec26',
  joined: 0,
  last: null,
  status: 'active',
  progress,
});
const steps = (m: AIEmployee, n: number): string[] => m.checklist.slice(0, n).map((s) => s.id);
const prog = (m: AIEmployee, p: Partial<Progress>): Record<string, Progress> => ({ [m.id]: { steps: [], builtAt: null, deployedAt: null, runtime: null, ...p } });

beforeEach(() => setViewerZone('America/Denver'));
afterEach(() => setViewerZone(null));

describe('the Your Deployment card (D-186)', () => {
  const m = marketing();

  it('before the steps are done: Not Deployed, Mark as Deployed off, and how many steps are left @parity:E-14', () => {
    const vm = deployVM(me(prog(m, { steps: steps(m, 2) })), m, NOW);
    expect(vm.heading).toBe('Your Deployment');
    expect(vm.status).toMatchObject({ label: 'Not Deployed', icon: 'ring', tip: 'Deploys after all 6 steps are verified' });
    expect(vm.primary).toEqual({ label: 'Mark as Deployed', icon: 'rocket', action: 'none', disabled: true });
    expect(vm.note).toBe('Finish all 6 steps to deploy. 4 to go.');
    expect(vm.platform).toEqual({ label: 'Platform', value: m.platform });
    expect(vm.open).toBeNull();
    expect(vm.secondary).toBeNull();
  });

  it('built: Mark as Deployed runs `markDeployed`, and the card says when it was built @parity:E-14 @parity:A-6', () => {
    const vm = deployVM(me(prog(m, { steps: steps(m, 6), builtAt: NOW - 2 * H })), m, NOW);
    expect(vm.primary).toEqual({ label: 'Mark as Deployed', icon: 'rocket', action: 'markDeployed', disabled: false });
    expect(vm.note).toBe('All 6 steps are verified. Mark it deployed once it’s running in your tools.');
    expect(vm.status.tip).toBe(DEPLOY.notYet);
    expect(vm.when?.text).toMatch(/^Built /);
  });

  it('deployed: Deployed with its icon, the platform’s Open, the last output, Run it and Pause @parity:E-14', () => {
    const vm = deployVM(
      me(prog(m, { steps: steps(m, 6), builtAt: NOW - 5 * H, deployedAt: NOW - 4 * H, runtime: 'deployed', lastRun: { at: NOW - H, title: 'Listing Launch Packet · 1418 Alder Ct', preview: 'Vaulted ceilings' } })),
      m,
      NOW,
    );
    expect(vm.status).toMatchObject({ label: 'Deployed', icon: 'checkCircle', tone: 'ok' });
    expect(vm.status.tip).toMatch(/^Deployed .+ · /);
    expect(vm.open).toEqual({ label: 'Open', toast: `Opening “${m.name}” in Claude` });
    expect(vm.primary).toMatchObject({ label: m.runLabel, action: 'run', disabled: false });
    expect(vm.secondary).toEqual({ label: 'Pause' });
    expect(vm.last).toMatchObject({ heading: 'Last Output', title: 'Listing Launch Packet · 1418 Alder Ct', preview: 'Vaulted ceilings' });
    expect(vm.when?.text).toMatch(/^Deployed /);
  });

  it('paused: Resume, and the current portal’s line @parity:E-14', () => {
    const vm = deployVM(me(prog(m, { steps: steps(m, 6), deployedAt: NOW - H, runtime: 'paused' })), m, NOW);
    expect(vm.status).toMatchObject({ label: 'Paused', icon: 'pauseCircle' });
    expect(vm.primary).toMatchObject({ label: 'Resume', action: 'resume' });
    expect(vm.note).toBe('Paused. It won’t pick up new work until you resume it.');
  });

  it('needs attention: the issue, Reconnect, and the card marked for attention @parity:E-14', () => {
    const vm = deployVM(me(prog(m, { steps: steps(m, 6), deployedAt: NOW - H, runtime: 'needs_attention', issue: 'CRM webhook stopped responding' })), m, NOW);
    expect(vm.status).toMatchObject({ label: 'Needs Attention', icon: 'alert', tone: 'warn' });
    expect(vm.primary).toMatchObject({ label: 'Reconnect', action: 'reconnect' });
    expect(vm.issue).toBe('CRM webhook stopped responding');
    expect(vm.attention).toBe(true);
    const bare = deployVM(me(prog(m, { steps: steps(m, 6), deployedAt: NOW - H, runtime: 'needs_attention' })), m, NOW);
    expect(bare.issue).toBe('Something stopped working.');
  });

  it('staff, with no learner, see what a new learner sees', () => {
    expect(deployVM(null, m, NOW).primary.disabled).toBe(true);
  });
});

describe('the Run dialog (D-186)', () => {
  const m = marketing();

  it('opens on the demo input; Run shows the output, Run Again, Copy All, and what `recordRun` stores @parity:E-15', () => {
    const text = runInput(m);
    expect(text).toBe(m.runDemo!.input);
    const idle = runVM(m, text, 'idle');
    expect(idle.title).toBe(m.runLabel);
    expect(idle.desc).toBe(`${m.name} · ${m.platform}`);
    expect(idle.btn).toBe('Run');
    expect(idle.out).toEqual([]);
    expect(runVM(m, text, 'running').working).toBe(`${m.short} AI Employee Is Working…`);
    const done = runVM(m, text, 'done');
    expect(done.btn).toBe('Run Again');
    expect(done.out.map((o) => o.label)).toEqual(m.runDemo!.sections.map(([l]) => l));
    expect(done.copyAll).toMatchObject({ label: 'Copy All', toast: 'Output copied' });
    expect(done.record.title).toBe(`${m.runDemo!.sections[1]![0]} · ${text.split('\n')[0]!.slice(0, 40)}`);
    expect(done.record.preview).toBe(m.runDemo!.sections[1]![1]);
  });

  it('a module with no demo drafts from its outputs', () => {
    const bare = { ...marketing(), runDemo: undefined, runLabel: '' };
    const vm = runVM(bare, '', 'done');
    expect(vm.title).toBe('Run');
    expect(vm.inputLabel).toBe('Input');
    expect(vm.out.map((o) => o.label)).toEqual(bare.outputs.filter(Boolean));
  });
});

describe('the non-course AI Employees (D-186, E-22)', () => {
  const db = (): Pick<Db, 'modules' | 'sessions'> => ({ modules: [...liveState().db.modules, ...structuredClone(demo.modules)], sessions: structuredClone(demo.sessions) });

  it('every published module that is not a course week, in the builder’s order @parity:E-22', () => {
    const rows = hireRows(db(), me(), NOW);
    expect(rows.map((r) => r.id)).toEqual(['marketing', 'sales', 'database', 'meetings', 'finance', 'operations']);
    expect(isHireModule({ id: acceleratorModuleId(1), kind: 'week', status: 'published' })).toBe(false);
    expect(isHireModule({ id: 'x', kind: undefined, status: 'draft' })).toBe(false);
  });

  it('an Agent tier learner: Team tier ones locked, a scheduled one opening, the rest by progress @parity:E-22', () => {
    const m = marketing();
    const rows = hireRows(db(), me(prog(m, { steps: steps(m, 6), builtAt: NOW })), NOW);
    const by = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(by.marketing!.state).toBe('built');
    expect(by.sales!.state).toBe('not_started');
    expect(by.meetings!.state).toBe('locked');
    const team = hireRows(db(), me({}, 'team'), NOW);
    expect(team.find((r) => r.id === 'operations')!.state).toBe('soon');
    expect(team.find((r) => r.id === 'operations')!.opensShort).toMatch(/^Opens /);
  });

  it('the sidebar row and Home’s card link the page @parity:E-22', () => {
    const r = hireRows(db(), me(), NOW).find((x) => x.id === 'marketing')!;
    const nav = hireNav(r, '/learn/employees/marketing');
    expect(nav).toMatchObject({ key: 'hire:marketing', week: null, label: 'Marketing', href: '/learn/employees/marketing', active: true, status: { kind: 'open', text: 'Not started' } });
    expect(hireOfPath('/learn/employees/marketing')).toBe('marketing');
    expect(hireOfPath('/learn/week/1')).toBeNull();
    const locked = hireNav(hireRows(db(), me(), NOW).find((x) => x.id === 'meetings')!, '/learn');
    expect(locked).toMatchObject({ locked: true, status: null, title: 'Meetings AI Employee · Team tier' });
    expect(hireCard(r)).toMatchObject({ key: 'hire:marketing', title: 'Marketing AI Employee', href: '/learn/employees/marketing', weekLabel: `From Session ${r.module.session}` });
  });

  it('the nav lists them after the course’s weeks, in one count', () => {
    const st = liveState();
    const rows = weekRows(st.payload, st.db, null);
    const hires = hireRows(db(), me(), NOW).map((h) => hireNav(h, '/learn'));
    const nav = navVM(st.payload, rows, '/learn', hires);
    expect(nav.employees!.count).toBe(rows.length + hires.length);
    expect(nav.employees!.rows.at(-1)!.key).toBe('hire:operations');
    expect(nav.employees!.rows[0]!.key).toBe('week:0');
  });

  it('the page: its header line, its steps with Mark step done and Undo, its resources through the files route @parity:E-22 @parity:E-16', () => {
    const m = marketing();
    const vm = hireVM(db(), me(prog(m, { steps: steps(m, 2) })), 'marketing', NOW, fileUrl);
    if (vm.kind !== 'open') throw new Error('open');
    expect(vm.title).toBe(m.name);
    expect(vm.lede).toBe(m.outcome);
    expect(vm.crumbs.map((c) => c.label)).toEqual(['Home', m.name]);
    expect(vm.tabTitle).toBe(`${m.name} · Amplified AI Accelerator`);
    expect(vm.meta.build).toBe(`${m.checklist.reduce((a, s) => a + s.mins, 0)} Min Build`);
    expect(vm.meta.forWho).toBe(`For ${m.forWho}`);
    expect(vm.steps.rows.map((r) => r.state)).toEqual(['done', 'done', 'current', 'todo', 'todo', 'todo']);
    expect(vm.steps.rows.map((r) => r.button)).toEqual(['Undo', 'Undo', 'Mark step done', 'Mark step done', 'Mark step done', 'Mark step done']);
    expect(vm.progress).toMatchObject({ done: 2, total: 6 });
    expect(vm.pill).toEqual({ tone: 'ip', label: 'In progress' });
    const pending = m.resources.filter((r) => /posted after/i.test(r.size)).length;
    expect(vm.resources.filter((r) => r.href === null)).toHaveLength(pending);
    expect(vm.resources.find((r) => r.href)?.href).toMatch(/^\/api\/files\/module\/marketing\//);
  });

  it('a Team tier module for an Agent tier learner is locked; an unknown id goes Home', () => {
    expect(hireVM(db(), me(), 'meetings', NOW, fileUrl)).toMatchObject({ kind: 'locked', headline: 'Meetings AI Employee · Team tier' });
    expect(hireVM(db(), me(), 'nope', NOW, fileUrl)).toEqual({ kind: 'missing', href: '/learn' });
    expect(hireVM(db(), me(), acceleratorModuleId(1), NOW, fileUrl)).toEqual({ kind: 'missing', href: '/learn' });
  });
});
