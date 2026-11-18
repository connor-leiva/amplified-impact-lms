// D-186: the hire's page in the learner portal v2. Two pieces the current portal's AI Employee page
// (`routes/portal/EmployeeDetail.tsx`, `EmployeeDetail.vm.ts`) has and the new portal had dropped:
//
//   - the Your Deployment card (E-14, A-6): the runtime status (an icon and a word, never colour alone),
//     the platform and its Open, when it was built or deployed, the issue, the last output, Mark as
//     Deployed (`markDeployed`), Pause, Resume and Reconnect (`setRuntime`), and the Run dialog (E-15):
//     input, Run, Copy All and the output, which records the last run (`recordRun`). It shows on an open
//     week's page and on a non-course AI Employee's page.
//   - the non-course AI Employee's page (E-22), `/learn/employees/:id`, for a published module that is not
//     a course week: its rows for the sidebar's AI employees group and Home's cards, and the page itself.
//
// PURE. No React, no clock, no fetch. The words and the rules are the current portal's, ported from
// `employeeDetailVM`; the only words here are its generic labels (`DEPLOY`, `HIRE`). Every time goes
// through `fmt.*`. The mutations are core's, run through `useMutate`, so a staff preview tab and a
// masquerade refuse them exactly as they do today.

import { buildOf, canAccess, fmt, isOpen, progressOf, runtimeOf } from '@ai/core';
import type { AIEmployee, Db, IconName, Learner, RuntimeState } from '@ai/core';
import { isAcceleratorModule } from '@ai/core/accelerator';
import { duration } from '@ai/core/learner';
import { LABELS, toneOf } from './learn.vm';
import type { KitRowVM, NavEmployeeVM, Seg, Tone } from './learn.vm';
import { KIT } from './WeekContent.vm';
import type { CrumbVM, WeekMetaVM } from './WeekContent.vm';
import { WEEK, stepsHeading } from './Week.vm';
import { STEP } from './Step.vm';
import { learnEmployee, learnHome, learnSchedule } from './routes';
import type { StoredFileRef } from '../../data/repository';

/** The current portal's own words for the card and its Run drawer (`EmployeeDetail.tsx`, `EmployeeDetail.vm.ts`). */
export const DEPLOY = {
  heading: 'Your Deployment',
  platform: 'Platform',
  open: 'Open',
  lastOutput: 'Last Output',
  markDeployed: 'Mark as Deployed',
  resume: 'Resume',
  reconnect: 'Reconnect',
  pause: 'Pause',
  runIt: 'Run it',
  run: 'Run',
  runAgain: 'Run Again',
  copyAll: 'Copy All',
  input: 'Input',
  working: 'AI Employee Is Working…',
  deployed: 'Deployed',
  built: 'Built',
  outputCopied: 'Output copied',
  issue: 'Something stopped working.',
  paused: 'Paused. It won’t pick up new work until you resume it.',
  notYet: 'Built, not deployed yet',
} as const;

/** The runtime token's word and icon (`StatusToken`'s `runtime` kind), with the tone the card's pill draws in. */
export const RUNTIME: Record<RuntimeState, { label: string; icon: IconName; tone: 'ok' | 'warn' | 'off' }> = {
  deployed: { label: 'Deployed', icon: 'checkCircle', tone: 'ok' },
  paused: { label: 'Paused', icon: 'pauseCircle', tone: 'off' },
  needs_attention: { label: 'Needs Attention', icon: 'alert', tone: 'warn' },
  not_deployed: { label: 'Not Deployed', icon: 'ring', tone: 'off' },
};

export type DeployAction = 'run' | 'resume' | 'reconnect' | 'markDeployed' | 'none';

export interface DeployVM {
  moduleId: string;
  heading: string;
  runtime: RuntimeState;
  status: { label: string; icon: IconName; tone: 'ok' | 'warn' | 'off'; tip: string };
  /** The card's border: attention while the runtime needs it. */
  attention: boolean;
  platform: { label: string; value: string } | null;
  /** The current portal's Open: a toast naming where it opens. Null until it is deployed. */
  open: { label: string; toast: string } | null;
  when: { text: string; abs: string } | null;
  issue: string | null;
  note: string | null;
  last: { heading: string; title: string; preview: string; ago: string; abs: string } | null;
  primary: { label: string; icon: IconName; action: DeployAction; disabled: boolean };
  secondary: { label: string } | null;
}

/** The Your Deployment card for this learner and module (staff, with no learner, see it as a new learner would). */
export function deployVM(me: Learner | null, m: AIEmployee, now: number): DeployVM {
  const p = progressOf(me, m);
  const b = buildOf(me, m);
  const rt = runtimeOf(me, m);
  const tip = p.deployedAt
    ? `${DEPLOY.deployed} ${fmt.agoInline(p.deployedAt, now)} · ${fmt.abs(p.deployedAt)}`
    : b.state === 'verified'
      ? DEPLOY.notYet
      : `Deploys after all ${b.total} steps are verified`;

  let primary: DeployVM['primary'];
  let secondary: DeployVM['secondary'] = null;
  let issue: string | null = null;
  let note: string | null = null;
  if (rt === 'deployed') {
    primary = { label: m.runLabel || DEPLOY.runIt, icon: 'play', action: 'run', disabled: false };
    secondary = { label: DEPLOY.pause };
  } else if (rt === 'paused') {
    primary = { label: DEPLOY.resume, icon: 'play', action: 'resume', disabled: false };
    note = DEPLOY.paused;
  } else if (rt === 'needs_attention') {
    primary = { label: DEPLOY.reconnect, icon: 'reset', action: 'reconnect', disabled: false };
    issue = p.issue || DEPLOY.issue;
  } else if (b.state === 'verified') {
    primary = { label: DEPLOY.markDeployed, icon: 'rocket', action: 'markDeployed', disabled: false };
    note = `All ${b.total} steps are verified. Mark it deployed once it’s running in your tools.`;
  } else {
    primary = { label: DEPLOY.markDeployed, icon: 'rocket', action: 'none', disabled: true };
    note = `Finish all ${b.total} steps to deploy. ${b.total - b.n} to go.`;
  }

  const at = p.deployedAt ?? p.builtAt;
  return {
    moduleId: m.id,
    heading: DEPLOY.heading,
    runtime: rt,
    status: { ...RUNTIME[rt], tip },
    attention: rt === 'needs_attention',
    platform: m.platform ? { label: DEPLOY.platform, value: m.platform } : null,
    open: p.deployedAt ? { label: DEPLOY.open, toast: `Opening “${m.name}” in Claude` } : null,
    when: at ? { text: `${p.deployedAt ? DEPLOY.deployed : DEPLOY.built} ${fmt.agoInline(at, now)}`, abs: fmt.abs(at) } : null,
    issue,
    note,
    last:
      p.deployedAt && p.lastRun
        ? { heading: DEPLOY.lastOutput, title: p.lastRun.title, preview: p.lastRun.preview, ago: fmt.ago(p.lastRun.at, now), abs: fmt.abs(p.lastRun.at) }
        : null,
    primary,
    secondary,
  };
}

// --- the Run dialog (E-15) ----------------------------------------------------------------------------

export type RunState = 'idle' | 'running' | 'done';

export interface RunVM {
  title: string;
  desc: string;
  inputLabel: string;
  working: string;
  btn: string;
  running: boolean;
  done: boolean;
  out: { label: string; body: string }[];
  copyAll: { label: string; text: string; toast: string };
  /** What `recordRun` stores once the working state finishes. */
  record: { title: string; preview: string };
}

/** The input a Run starts from: the module's demo input, as the current portal's drawer opens. */
export const runInput = (m: Pick<AIEmployee, 'runDemo'>): string => m.runDemo?.input ?? '';

/** The current portal's Run drawer (`employeeDetailVM`'s `run`), for this input and state. */
export function runVM(m: AIEmployee, text: string, state: RunState): RunVM {
  const demo = m.runDemo ?? {
    input: '',
    sections: m.outputs.filter(Boolean).map((o): [string, string] => [o, 'Drafted from your input. Review it, then send or file it.']),
  };
  const runLabel = m.runLabel || DEPLOY.runIt;
  const pasted = runLabel.replace(/^Run on /, 'Paste ');
  const first = demo.sections[0] ?? (['Output', ''] as [string, string]);
  const main = demo.sections[1] ?? first;
  const recordTitle = runLabel.replace(/^Run on (a |an |your )?/, '').replace(/^\w/, (ch) => ch.toUpperCase());
  return {
    title: m.runLabel || DEPLOY.run,
    desc: [m.name, m.platform].filter(Boolean).join(' · '),
    inputLabel: pasted === runLabel ? DEPLOY.input : pasted,
    working: `${m.short} ${DEPLOY.working}`,
    btn: state === 'done' ? DEPLOY.runAgain : DEPLOY.run,
    running: state === 'running',
    done: state === 'done',
    out: state === 'done' ? demo.sections.map(([label, body]) => ({ label, body })) : [],
    copyAll: { label: DEPLOY.copyAll, text: demo.sections.map(([l, x]) => `${l}\n${x}`).join('\n\n'), toast: DEPLOY.outputCopied },
    record: { title: `${main[0]} · ${(text.split('\n')[0] || recordTitle).slice(0, 40)}`, preview: main[1] },
  };
}

// --- the non-course AI Employees (E-22) ----------------------------------------------------------------
/** The page's own labels, the current portal's: its locked title's "Team tier", its soon state's "Opens". */
/** The page's own labels: the current portal's (its checklist's "About N Min", its locked title's "Team tier"). */
export const HIRE = {
  teamTier: 'Team tier',
  opens: 'Opens',
  soon: 'soon',
} as const;

export type HireState = 'locked' | 'soon' | 'not_started' | 'in_progress' | 'built';

export interface HireRow {
  id: string;
  name: string;
  short: string;
  outcome: string;
  icon: IconName;
  tone: Tone;
  href: string;
  state: HireState;
  done: number;
  total: number;
  /** "Opens Dec 21" for a module scheduled to open, or null. */
  opensShort: string | null;
  module: AIEmployee;
}

/** A published (or scheduled) module that is not a course week: an AI Employee of its own. */
export const isHireModule = (m: Pick<AIEmployee, 'id' | 'kind' | 'status'>): boolean => m.status !== 'draft' && m.kind !== 'week' && !isAcceleratorModule(m.id);

/** Every non-course AI Employee in the learner's snapshot, in the builder's order, each with this learner's place in it. */
export function hireRows(db: Pick<Db, 'modules'>, me: Learner | null, now: number): HireRow[] {
  return db.modules
    .filter(isHireModule)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((m): HireRow => {
      const b = buildOf(me, m);
      const locked = !canAccess(me, m);
      const soon = !locked && !isOpen(m, now);
      const state: HireState = locked ? 'locked' : soon ? 'soon' : b.state === 'verified' ? 'built' : b.state === 'in_progress' ? 'in_progress' : 'not_started';
      return {
        id: m.id,
        name: m.name,
        short: m.short || m.name,
        outcome: m.outcome,
        icon: m.icon,
        tone: toneOf(m.tone),
        href: learnEmployee(m.id),
        state,
        done: b.n,
        total: b.total,
        opensShort: soon ? `${HIRE.opens} ${m.opens ? fmt.date(m.opens) : HIRE.soon}` : null,
        module: m,
      };
    });
}

/** The id in `/learn/employees/:id`, or null on any other path. */
export function hireOfPath(pathname: string): string | null {
  const m = /^\/learn\/employees\/([^/]+)\/?$/.exec(pathname);
  return m ? decodeURIComponent(m[1]!) : null;
}

/** A non-course AI Employee's row in the sidebar's AI employees group, after the course's weeks. */
export function hireNav(r: HireRow, pathname: string): NavEmployeeVM {
  const status: NavEmployeeVM['status'] =
    r.state === 'locked'
      ? null
      : r.state === 'soon'
        ? { kind: 'opens', text: r.opensShort ?? HIRE.opens }
        : r.state === 'built'
          ? { kind: 'built', text: LABELS.built }
          : r.state === 'in_progress'
            ? { kind: 'ring', text: `${r.done} of ${r.total}`, ratio: r.total ? r.done / r.total : 0 }
            : { kind: 'open', text: LABELS.notStarted };
  return {
    key: `hire:${r.id}`,
    week: null,
    label: r.short,
    title: r.state === 'locked' ? `${r.name} · ${HIRE.teamTier}` : status ? `${r.name} · ${status.text}` : r.name,
    href: r.href,
    icon: r.icon,
    tone: r.tone,
    active: hireOfPath(pathname) === r.id,
    status,
    locked: r.state === 'locked',
  };
}

// --- the page --------------------------------------------------------------------------------------------

export interface HireStepVM {
  id: string;
  n: number;
  title: string;
  hint: string | null;
  meta: string;
  state: 'done' | 'current' | 'todo';
  /** "Mark step done", or "Undo" once it is done (the same `toggleStep`). */
  button: string;
  aria: string;
}

export interface OpenHireVM {
  kind: 'open';
  id: string;
  title: string;
  tile: { icon: IconName; tone: Tone };
  lede: string;
  pill: { tone: 'ip' | 'done' | 'open'; label: string };
  /** "Opens Dec 21" while it is scheduled to open; Mark step done answers with the opening then. */
  opens: string | null;
  meta: WeekMetaVM;
  crumbs: CrumbVM[];
  tabTitle: string;
  progress: { label: string; done: number; total: number; ofTotal: string; segs: Seg[]; aria: string };
  steps: { heading: string; meta: string; rows: HireStepVM[] };
  /** The module's own resources (the current portal's Build Kit list), each through the gated files route. */
  resources: KitRowVM[];
}

export interface LockedHireVM {
  kind: 'locked';
  id: string;
  title: string;
  tile: { icon: IconName; tone: Tone };
  lede: string;
  headline: string;
  crumbs: CrumbVM[];
  tabTitle: string;
}

export type HireVM = OpenHireVM | LockedHireVM | { kind: 'missing'; href: string };

/** A resource's file name in the bucket: the current portal's slug ("Session 1 Slides" → "session-1-slides.pdf"). */
const resourceFile = (r: { name: string; type: string }): string => `${r.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${r.type.toLowerCase()}`;

/** The non-course AI Employee page for `id`, from the learner's snapshot. */
export function hireVM(db: Pick<Db, 'modules' | 'sessions'>, me: Learner | null, id: string | null, now: number, fileUrl: (ref: StoredFileRef) => string | null): HireVM {
  const r = id ? hireRows(db, me, now).find((x) => x.id === id) : undefined;
  if (!r) return { kind: 'missing', href: learnHome() };
  const m = r.module;
  const crumbs: CrumbVM[] = [
    { label: LABELS.home, href: learnHome() },
    { label: m.name, href: null },
  ];
  const tabTitle = [m.name, KIT.program].join(' · ');
  if (r.state === 'locked') return { kind: 'locked', id: m.id, title: m.name, tile: { icon: 'lvLock', tone: r.tone }, lede: m.outcome, headline: `${m.name} · ${HIRE.teamTier}`, crumbs, tabTitle };

  const p = progressOf(me, m);
  const next = m.checklist.findIndex((s) => !p.steps.includes(s.id));
  const rows = m.checklist.map((s, i): HireStepVM => {
    const done = p.steps.includes(s.id);
    const state = done ? 'done' : i === next ? 'current' : 'todo';
    const said = done ? LABELS.done.toLowerCase() : state === 'current' ? LABELS.upNext.toLowerCase() : LABELS.notStarted.toLowerCase();
    return {
      id: s.id,
      n: i + 1,
      title: s.ch || s.text,
      hint: s.hint || null,
      meta: s.mins ? `${WEEK.about} ${duration(s.mins)}` : '',
      state,
      button: done ? STEP.undo : STEP.markDone,
      aria: `${LABELS.step} ${i + 1}, ${s.ch || s.text}, ${said}`,
    };
  });
  const segs: Seg[] = rows.map((x) => (x.state === 'done' ? 'd' : x.state === 'current' ? 'c' : ''));
  const sess = m.session ? db.sessions.find((s) => s.n === m.session && s.cohortId === me?.cohortId) : undefined;
  const mins = m.checklist.reduce((a, s) => a + (s.mins || 0), 0);
  const resources = m.resources
    .filter((x) => x.name)
    .map((x): KitRowVM => {
      const pending = /posted after/i.test(x.size);
      return {
        key: `res:${x.name}`,
        icon: 'file',
        title: x.name,
        meta: [x.type, x.size].filter(Boolean).join(' · '),
        href: pending ? null : fileUrl({ kind: 'moduleFile', moduleId: m.id, fileName: resourceFile(x) }),
        external: false,
      };
    });
  return {
    kind: 'open',
    id: m.id,
    title: m.name,
    tile: { icon: r.icon, tone: r.tone },
    lede: m.outcome,
    pill: r.state === 'built' ? { tone: 'done', label: LABELS.done } : r.state === 'in_progress' ? { tone: 'ip', label: LABELS.inProgress } : { tone: 'open', label: LABELS.open },
    opens: r.opensShort,
    meta: {
      session: sess ? { label: `${KIT.fromSession} ${sess.n}`, title: sess.title, href: learnSchedule() } : null,
      selfPaced: sess ? null : KIT.selfPaced,
      build: mins ? `${mins} ${KIT.minBuild}` : null,
      forWho: m.forWho ? `${KIT.for} ${m.forWho}` : null,
    },
    crumbs,
    tabTitle,
    progress: { label: WEEK.stepsDone, done: r.done, total: r.total, ofTotal: `of ${r.total}`, segs, aria: `${r.done} of ${r.total} steps done` },
    steps: { heading: stepsHeading(rows.length), meta: mins ? `${WEEK.about} ${duration(mins)} ${WEEK.inAll}` : '', rows },
    resources,
  };
}
