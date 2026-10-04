// The Employee detail view-model, ported from `renderVals()` in
// design-reference/Portal Workspace.dc.html. SCREENS § 3.2, phase 05 § 5.1-5.2.
//
// Pure: no React, no `Date.now()`, no `localStorage`. Everything the screen renders — every string,
// every tone, every download payload — is computed here and unit-tested, so the component is
// markup only. `ui` is the screen's own ephemeral state (the player, the transcript search, the
// drawer), which the reference keeps in `this.state`.

import {
  avatarColor,
  buildOf,
  fmt,
  ics,
  isOpen,
  joinMode,
  nextIncluded,
  progressOf,
  runtimeOf,
  sessionEvent,
  sessionFor,
  sessionState,
  skillPreview,
} from '@ai/core';
import type { AIEmployee, Db, IconName, Learner, RuntimeState, Session, SkillFile } from '@ai/core';

// ---------------------------------------------------------------------------
// Screen state
// ---------------------------------------------------------------------------

export type Speed = 1 | 1.25 | 1.5 | 2;

/** The reference's `cycleSpeed` list. The label is `speed + '×'`. */
export const SPEEDS: readonly Speed[] = [1, 1.25, 1.5, 2];

export type DrawerRef = { kind: 'prompt' } | { kind: 'file'; i: number } | { kind: 'run' };

export type RunState = 'idle' | 'running' | 'done';

export interface EmployeeDetailUi {
  /** Playhead, in seconds. */
  t: number;
  playing: boolean;
  speed: Speed;
  cc: boolean;
  /** The Transcript toggle. The panel also needs a replay, so the VM gates it again. */
  transcript: boolean;
  q: string;
  /** `Copy` shows `Copied` in the success tint for 2 s. */
  copied: boolean;
  runText: string;
  runState: RunState;
  /** The open drawer, or null. */
  drawer: DrawerRef | null;
  /** The last drawer that was open, so its content survives the 240 ms slide-out. */
  lastDrawer: DrawerRef | null;
}

export const initialUi = (m: AIEmployee, t = 0): EmployeeDetailUi => ({
  t: Math.min(t, m.dur || 0),
  playing: false,
  speed: 1,
  cc: true,
  transcript: false,
  q: '',
  copied: false,
  runText: m.runDemo?.input ?? '',
  runState: 'idle',
  drawer: null,
  lastDrawer: null,
});

/**
 * The reference's `sync()`: moving to another AI Employee resets the player, the transcript search
 * and the drawer, and keeps the speed and caption choices the viewer already made.
 */
export const moduleReset = (m: AIEmployee, t = 0): Partial<EmployeeDetailUi> => ({
  t: Math.min(t, m.dur || 0),
  playing: false,
  transcript: false,
  q: '',
  runText: m.runDemo?.input ?? '',
  runState: 'idle',
  drawer: null,
});

// ---------------------------------------------------------------------------
// The player
// ---------------------------------------------------------------------------

/**
 * Phase 08 § 8.3. The screen drives playback only through this, so phase 08 can swap `TickerEngine`
 * for `HlsEngine` (a hidden `<video>` behind hls.js) without touching the poster, the controls, the
 * captions or the chapter rail — that chrome stays ours (SCREENS § 3.2).
 */
export interface VideoEngine {
  play(): void;
  pause(): void;
  seek(t: number): void;
  setRate(r: Speed): void;
  onTime(cb: (t: number) => void): () => void;
  onEnded(cb: () => void): () => void;
}

/** The reference's `setInterval(() => this.tick(), 250)` and its `s.t + 0.25 * s.speed`. */
export const TICK_MS = 250;
export const TICK_SEC = 0.25;

/**
 * The fixture engine (phase 05 § 5.2): it advances `t` by 0.25 s × rate every 250 ms while playing
 * and stops at `dur`, which is exactly what the prototype does, so a replay can be compared
 * deterministically. It holds no React state and reads no clock.
 */
export class TickerEngine implements VideoEngine {
  private t: number;
  private rate: Speed = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly time = new Set<(t: number) => void>();
  private readonly ended = new Set<() => void>();

  constructor(
    private readonly dur: number,
    t = 0,
  ) {
    this.t = Math.max(0, Math.min(dur, t));
  }

  play(): void {
    if (this.timer !== null || this.dur <= 0 || this.t >= this.dur) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  pause(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  seek(t: number): void {
    this.t = Math.max(0, Math.min(this.dur, t));
    this.emit();
  }

  setRate(r: Speed): void {
    this.rate = r;
  }

  onTime(cb: (t: number) => void): () => void {
    this.time.add(cb);
    return () => {
      this.time.delete(cb);
    };
  }

  onEnded(cb: () => void): () => void {
    this.ended.add(cb);
    return () => {
      this.ended.delete(cb);
    };
  }

  /** The current playhead. The screen mirrors it into `ui.t`; this is the engine's own copy. */
  get position(): number {
    return this.t;
  }

  private emit(): void {
    for (const cb of [...this.time]) cb(this.t);
  }

  private tick(): void {
    this.t = Math.min(this.dur, this.t + TICK_SEC * this.rate);
    this.emit();
    if (this.t >= this.dur) {
      this.pause();
      for (const cb of [...this.ended]) cb();
    }
  }
}

// ---------------------------------------------------------------------------
// Side effects the component performs. The VM resolves the payloads; the component owns the DOM.
// ---------------------------------------------------------------------------

export type VmAction =
  | { kind: 'download'; name: string; content: string; mime: string; toast: string }
  | { kind: 'copy'; text: string; toast: string }
  | { kind: 'toast'; msg: string; tone: 'success' | 'info' | 'warn' };

// ---------------------------------------------------------------------------
// View-model
// ---------------------------------------------------------------------------

export interface HeaderVM {
  icon: IconName;
  /** Icon tile tint: success once built, otherwise the action tint. */
  tone: 'built' | 'action';
  runtime: RuntimeState;
  runtimeTip: string;
}

export interface MetaVM {
  hasSession: boolean;
  selfPaced: boolean;
  n: number | '';
  title: string;
}

export interface SoonVM {
  label: string;
  text: string;
}

export interface PlayerVM {
  has: boolean;
  none: boolean;
  n: number | '–';
  title: string;
  sub: string;
  pct: string;
  tNow: number;
  time: string;
  total: string;
  chapter: string;
  playIcon: IconName;
  playTitle: string;
  showBigPlay: boolean;
  caption: string;
  cc: boolean;
  speedLabel: string;
  noneWhen: string;
  noneNote: string;
  showJoin: boolean;
  showCal: boolean;
  joinMode: 'disabled' | 'ready' | 'live';
  zoom: string;
  /** The toast the Join Button fires. The URL leaves the VM only here (SCREENS § 5.3). */
  join: VmAction;
  /** The session `.ics`, or null when there is no session to add. */
  cal: VmAction | null;
}

export interface ChapterVM {
  n: number;
  t: string;
  label: string;
  done: boolean;
  /** Seek-bar marker position, e.g. `8.56%`. */
  left: string;
  active: boolean;
  tip: string;
  /** Seconds to seek to, or null without a replay. */
  seek: number | null;
}

export interface TranscriptPartVM {
  s: string;
  hit: boolean;
}

export interface TranscriptLineVM {
  t: string;
  at: number;
  current: boolean;
  parts: TranscriptPartVM[];
}

export type AssetVM =
  | { kind: 'copyPrompt'; label: string; icon: IconName }
  | { kind: 'viewPrompt'; label: string; icon: IconName }
  | { kind: 'downloadFile'; label: string; icon: IconName; file: number };

export interface StepVM {
  id: string;
  n: number;
  text: string;
  hint: string;
  mins: number;
  t: string;
  on: boolean;
  /** The first unverified step, unless the AI Employee has not opened yet. */
  isNext: boolean;
  /** Seconds the `Watch at` link seeks to, or null without a replay. */
  watch: number | null;
  assets: AssetVM[];
  undoTip: string;
}

export interface ChecklistVM {
  done: number;
  total: number;
  state: 'not_started' | 'in_progress' | 'verified';
  tip: string;
  segs: ('track' | 'progress' | 'success')[];
  items: StepVM[];
}

export type DeployPrimaryAction = 'run' | 'resume' | 'reconnect' | 'markDeployed' | 'none';

export interface DeploymentVM {
  /** Card border: attention when the runtime needs it. */
  tone: 'default' | 'attention';
  canOpen: boolean;
  /** The `Open ↗` toast. */
  open: VmAction;
  when: string;
  whenAbs: string;
  issue: string;
  note: string;
  last: { title: string; preview: string; ago: string; abs: string } | null;
  primary: {
    label: string;
    icon: IconName;
    action: DeployPrimaryAction;
    disabled: boolean;
  };
  secondary: { label: string; action: 'pause' } | null;
}

export interface RunVM {
  inputLabel: string;
  text: string;
  running: boolean;
  done: boolean;
  btn: string;
  out: { label: string; body: string }[];
  copy: VmAction;
  /** What `recordRun` stores once the 1400 ms working state finishes. */
  record: { title: string; preview: string };
}

export interface CodeLinePartVM {
  t: string;
  kind: 'var' | 'head' | 'text' | 'blank';
}

export interface CodeLineVM {
  n: number;
  parts: CodeLinePartVM[];
}

export interface DrawerVM {
  open: boolean;
  isRun: boolean;
  isCode: boolean;
  name: string;
  desc: string;
  lines: CodeLineVM[];
  copy: VmAction;
  get: VmAction;
  getLabel: string;
  getIcon: IconName;
}

export interface KitFileVM {
  i: number;
  name: string;
  type: SkillFile['type'];
  desc: string;
  /** JSON and YAML names render in the mono face; a Notion template does not. */
  mono: boolean;
  getLabel: string;
  getIcon: IconName;
  get: VmAction;
}

export interface KitResourceVM {
  name: string;
  type: string;
  size: string;
  pending: boolean;
  get: VmAction | null;
}

export interface EmployeeDetailVM {
  id: string;
  name: string;
  /** Sidebar label, e.g. "Marketing". The Run drawer reads `{short} AI Employee Is Working…`. */
  short: string;
  outcome: string;
  build: number;
  forWho: string;
  platform: string;
  instructor: string;
  notes: string;
  dur: number;
  hd: HeaderVM;
  meta: MetaVM;
  soon: SoonVM | null;
  v: PlayerVM;
  rail: ChapterVM[];
  railTitle: string;
  trOpen: boolean;
  trOn: boolean;
  lines: TranscriptLineVM[];
  qCount: string;
  noTranscript: boolean;
  noTranscriptMsg: string;
  ck: ChecklistVM;
  dp: DeploymentVM;
  run: RunVM;
  dr: DrawerVM;
  files: KitFileVM[];
  resources: KitResourceVM[];
  vars: string[];
  cp: { label: string; icon: IconName; copied: boolean };
  copyPrompt: VmAction;
  promptStats: string;
  kitNote: string;
  insIni: string;
  insAv: string;
  nextUp: { label: string; to: string };
}

/** `f.type === 'Notion' ? '.md' : ''` — the reference's `ext`. */
const ext = (f: SkillFile): string => (f.type === 'Notion' ? '.md' : '');

const fileMime = (f: SkillFile): string => (f.type === 'JSON' ? 'application/json' : 'text/yaml');

/** The reference's `getFile`: a Notion template opens, everything else downloads. */
function getFile(f: SkillFile, m: AIEmployee): VmAction {
  if (f.type === 'Notion') return { kind: 'toast', msg: `Opening “${f.name}” in Notion`, tone: 'info' };
  const name = f.name + ext(f);
  return { kind: 'download', name, content: skillPreview(f, m), mime: fileMime(f), toast: `Downloaded ${name}` };
}

/** The reference's `hl`: `#` headings in `--text-link`, `{{VARS}}` in `--access-locked-text`. */
function highlight(txt: string): CodeLineVM[] {
  return txt.split('\n').map((ln, i) => {
    const head = /^#/.test(ln);
    const parts: CodeLinePartVM[] = ln
      .split(/(\{\{[A-Z_]+\}\})/)
      .filter(Boolean)
      .map((x) => ({ t: x, kind: /^\{\{/.test(x) ? 'var' : head ? 'head' : 'text' }));
    return { n: i + 1, parts: parts.length ? parts : [{ t: ' ', kind: 'blank' }] };
  });
}

export function employeeDetailVM(
  db: Db,
  user: Learner,
  m: AIEmployee,
  now: number,
  ui: EmployeeDetailUi,
): EmployeeDetailVM {
  const p = progressOf(user, m);
  const b = buildOf(user, m);
  const rt = runtimeOf(user, m);
  const soonM = !isOpen(m, now);

  const hd: HeaderVM = {
    icon: m.icon,
    tone: b.state === 'verified' ? 'built' : 'action',
    runtime: rt,
    runtimeTip: p.deployedAt
      ? `Deployed ${fmt.agoInline(p.deployedAt, now)} · ${fmt.abs(p.deployedAt)}`
      : b.state === 'verified'
        ? 'Built, not deployed yet'
        : 'Deploys after all 6 steps are verified',
  };

  const sess: Session | null = m.session ? sessionFor(db, user.cohortId, m.session) : null;
  const sst = sess ? sessionState(sess, now) : 'none';
  const meta: MetaVM = {
    hasSession: !!sess,
    selfPaced: !sess,
    n: sess ? sess.n : '',
    title: sess ? sess.title : '',
  };

  // ---- player -------------------------------------------------------------------------------
  const { t, playing, speed, cc, q } = ui;
  const hasVid = !!m.dur && (sst === 'replay' || (!sess && !!m.dur));
  const steps = m.checklist;
  const cur = steps.filter((s) => s.t <= t).pop();
  const capLine = m.transcript.filter((x) => x[0] <= t && t - x[0] < 30).pop();
  const jm = sess ? joinMode(sess, now) : 'disabled';

  const v: PlayerVM = {
    has: hasVid,
    none: !hasVid,
    n: sess ? sess.n : '–',
    title: sess ? sess.title : m.name,
    sub: `${m.name} · with ${m.instructor}`,
    pct: hasVid ? `${((t / m.dur) * 100).toFixed(2)}%` : '0%',
    tNow: Math.floor(t),
    time: fmt.clock(t),
    total: fmt.clock(m.dur || 0),
    chapter: hasVid && cur ? `Step ${steps.indexOf(cur) + 1} · ${cur.ch}` : '',
    playIcon: playing ? 'pause' : 'play',
    playTitle: playing ? 'Pause' : 'Play',
    showBigPlay: hasVid && !playing,
    caption: cc && playing && capLine ? capLine[1] : '',
    cc,
    speedLabel: `${speed}×`,
    noneWhen: sess
      ? sst === 'live'
        ? 'Live now'
        : sst === 'processing'
          ? 'Replay processing · usually within 2 hours'
          : fmt.when(sess.start)
      : 'Walkthrough video coming soon',
    noneNote: sess && sst === 'upcoming' ? (jm === 'ready' ? '' : 'Join opens 15 min before') : '',
    showJoin: !!sess && (sst === 'upcoming' || sst === 'live'),
    showCal: !!sess && sst === 'upcoming',
    joinMode: jm,
    zoom: sess ? sess.zoom : '',
    join: { kind: 'toast', msg: `Opening Zoom · ${sess ? sess.zoom : ''}`, tone: 'info' },
    cal: sess
      ? {
          kind: 'download',
          name: `session-${sess.n}.ics`,
          content: ics([sessionEvent(sess)], now),
          mime: 'text/calendar',
          toast: 'Calendar invite downloaded',
        }
      : null,
  };

  const rail: ChapterVM[] = steps.map((s, i) => {
    const done = p.steps.includes(s.id);
    const active = hasVid && !!cur && cur.id === s.id;
    return {
      n: i + 1,
      t: fmt.clock(s.t),
      label: s.ch,
      done,
      left: `${((s.t / (m.dur || 1)) * 100).toFixed(2)}%`,
      active,
      tip: hasVid ? `Jump to ${fmt.clock(s.t)} · ${s.text}` : s.text,
      seek: hasVid ? s.t : null,
    };
  });

  // ---- transcript ---------------------------------------------------------------------------
  const esc = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = esc ? new RegExp(`(${esc})`, 'ig') : null;
  const reT = esc ? new RegExp(esc, 'i') : null;
  let hits = 0;
  const lines: TranscriptLineVM[] = m.transcript
    .filter((x) => !reT || reT.test(x[1]))
    .map((x) => {
      const parts: TranscriptPartVM[] = re
        ? x[1]
            .split(re)
            .filter(Boolean)
            .map((s) => {
              const hit = s.toLowerCase() === q.trim().toLowerCase();
              if (hit) hits++;
              return { s, hit };
            })
        : [{ s: x[1], hit: false }];
      return {
        t: fmt.clock(x[0]),
        at: x[0],
        current: hasVid && !!capLine && capLine[0] === x[0],
        parts,
      };
    });

  // ---- build kit ----------------------------------------------------------------------------
  const vars = [...new Set((m.prompt.match(/\{\{[A-Z_]+\}\}/g) ?? []).map((x) => x.replace(/[{}]/g, '')))];
  const copyPrompt: VmAction = { kind: 'copy', text: m.prompt, toast: 'System prompt copied' };
  const cp = ui.copied
    ? { label: 'Copied', icon: 'check' as IconName, copied: true }
    : { label: 'Copy', icon: 'copy' as IconName, copied: false };

  const files: KitFileVM[] = m.files.map((f, i) => ({
    i,
    name: f.name,
    type: f.type,
    desc: f.desc,
    mono: f.type !== 'Notion',
    getLabel: f.type === 'Notion' ? 'Duplicate to Notion' : 'Download',
    getIcon: f.type === 'Notion' ? 'ext' : 'download',
    get: getFile(f, m),
  }));

  const resources: KitResourceVM[] = m.resources.map((r) => {
    const pending = /posted after/i.test(r.size);
    return {
      name: r.name,
      type: r.type,
      size: r.size,
      pending,
      get: pending
        ? null
        : {
            kind: 'download',
            name: `${r.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${r.type.toLowerCase()}`,
            content: `${r.name}\n\nPlaceholder file from the Amplified Impact prototype.`,
            mime: 'text/plain',
            toast: `Downloaded ${r.name}`,
          },
    };
  });

  // ---- checklist ----------------------------------------------------------------------------
  const locked = !!p.deployedAt;
  const nextIdx = steps.findIndex((s) => !p.steps.includes(s.id));
  const ck: ChecklistVM = {
    done: b.n,
    total: b.total,
    state: b.state,
    tip: p.builtAt ? `Built ${fmt.agoInline(p.builtAt, now)} · ${fmt.abs(p.builtAt)}` : '',
    segs: steps.map((s) =>
      p.steps.includes(s.id) ? (b.state === 'verified' ? 'success' : 'progress') : 'track',
    ),
    items: steps.map((s, i) => {
      const on = p.steps.includes(s.id);
      const assets: AssetVM[] = [];
      if (/system prompt/i.test(s.text)) {
        assets.push({ kind: 'copyPrompt', label: 'Copy Prompt', icon: 'copy' });
        assets.push({ kind: 'viewPrompt', label: 'View', icon: 'eye' });
      }
      if (/skill file/i.test(s.text))
        m.files.forEach((f, k) => {
          if (f.type === 'Notion') return;
          assets.push({
            kind: 'downloadFile',
            label: f.name.replace(/\.skill\.(json|ya?ml)$/i, ''),
            icon: 'download',
            file: k,
          });
        });
      return {
        id: s.id,
        n: i + 1,
        text: s.text,
        hint: s.hint,
        mins: s.mins,
        t: fmt.clock(s.t),
        on,
        isNext: i === nextIdx && !soonM,
        watch: hasVid ? s.t : null,
        assets,
        undoTip: locked ? 'Deployed AI Employees keep their checklist' : 'Verified · click to undo',
      };
    }),
  };

  // ---- deployment ---------------------------------------------------------------------------
  let primary: DeploymentVM['primary'];
  let secondary: DeploymentVM['secondary'] = null;
  let issue = '';
  let note = '';
  if (rt === 'deployed') {
    primary = { label: m.runLabel || 'Run it', icon: 'play', action: 'run', disabled: false };
    secondary = { label: 'Pause', action: 'pause' };
  } else if (rt === 'paused') {
    primary = { label: 'Resume', icon: 'play', action: 'resume', disabled: false };
    note = 'Paused. It won’t pick up new work until you resume it.';
  } else if (rt === 'needs_attention') {
    primary = { label: 'Reconnect', icon: 'reset', action: 'reconnect', disabled: false };
    issue = p.issue || 'Something stopped working.';
  } else if (b.state === 'verified') {
    primary = { label: 'Mark as Deployed', icon: 'rocket', action: 'markDeployed', disabled: false };
    note = 'All 6 steps are verified. Mark it deployed once it’s running in your tools.';
  } else {
    primary = { label: 'Mark as Deployed', icon: 'rocket', action: 'none', disabled: true };
    note = `Finish all ${b.total} steps to deploy. ${b.total - b.n} to go.`;
  }

  const dp: DeploymentVM = {
    tone: rt === 'needs_attention' ? 'attention' : 'default',
    canOpen: !!p.deployedAt,
    open: { kind: 'toast', msg: `Opening “${m.name}” in Claude`, tone: 'info' },
    when: p.deployedAt
      ? `Deployed ${fmt.agoInline(p.deployedAt, now)}`
      : p.builtAt
        ? `Built ${fmt.agoInline(p.builtAt, now)}`
        : '',
    whenAbs: p.deployedAt ? fmt.abs(p.deployedAt) : p.builtAt ? fmt.abs(p.builtAt) : '',
    issue,
    note,
    last:
      p.deployedAt && p.lastRun
        ? {
            title: p.lastRun.title,
            preview: p.lastRun.preview,
            ago: fmt.ago(p.lastRun.at, now),
            abs: fmt.abs(p.lastRun.at),
          }
        : null,
    primary,
    secondary,
  };

  // ---- run drawer ---------------------------------------------------------------------------
  const demo = m.runDemo ?? {
    input: '',
    sections: m.outputs
      .filter(Boolean)
      .map((o): [string, string] => [o, 'Drafted from your input. Review it, then send or file it.']),
  };
  const runLabel = m.runLabel || 'Run it';
  const pasted = runLabel.replace(/^Run on /, 'Paste ').replace(/^a /, 'a ');
  const first = demo.sections[0] ?? (['Output', ''] as [string, string]);
  const main = demo.sections[1] ?? first;
  const recordTitle = runLabel.replace(/^Run on (a |an |your )?/, '').replace(/^\w/, (ch) => ch.toUpperCase());
  const run: RunVM = {
    inputLabel: pasted === runLabel ? 'Input' : pasted,
    text: ui.runText,
    running: ui.runState === 'running',
    done: ui.runState === 'done',
    btn: ui.runState === 'done' ? 'Run Again' : 'Run',
    out: ui.runState === 'done' ? demo.sections.map(([label, body]) => ({ label, body })) : [],
    copy: {
      kind: 'copy',
      text: demo.sections.map(([l, x]) => `${l}\n${x}`).join('\n\n'),
      toast: 'Output copied',
    },
    record: {
      title: `${main[0]} · ${(ui.runText.split('\n')[0] || recordTitle).slice(0, 40)}`,
      preview: main[1],
    },
  };

  // ---- drawer -------------------------------------------------------------------------------
  const dd: DrawerRef = ui.drawer ?? ui.lastDrawer ?? { kind: 'prompt' };
  const df = dd.kind === 'file' ? (m.files[dd.i] ?? null) : null;
  const promptName = `${m.short.toLowerCase()}-system-prompt.md`;
  const dr: DrawerVM = {
    open: !!ui.drawer,
    isRun: dd.kind === 'run',
    isCode: dd.kind !== 'run',
    name: dd.kind === 'run' ? m.runLabel || 'Run' : df ? df.name : 'System Prompt',
    desc:
      dd.kind === 'run'
        ? `${m.name} · ${m.platform}`
        : df
          ? `${df.desc} · ${df.size}`
          : `${m.name} · paste into Claude → Project → Instructions`,
    lines: dd.kind === 'run' ? [] : highlight(df ? skillPreview(df, m) : m.prompt),
    copy: {
      kind: 'copy',
      text: df ? skillPreview(df, m) : m.prompt,
      toast: df ? 'File contents copied' : 'System prompt copied',
    },
    get: df
      ? getFile(df, m)
      : {
          kind: 'download',
          name: promptName,
          content: m.prompt,
          mime: 'text/markdown',
          toast: `Downloaded ${promptName}`,
        },
    getLabel: df && df.type === 'Notion' ? 'Duplicate to Notion' : 'Download',
    getIcon: df && df.type === 'Notion' ? 'ext' : 'download',
  };

  const nx = nextIncluded(db, user, m.id, now);

  return {
    id: m.id,
    name: m.name,
    short: m.short,
    outcome: m.outcome,
    build: m.build,
    forWho: m.forWho,
    platform: m.platform,
    instructor: m.instructor,
    notes: m.notes,
    dur: m.dur,
    hd,
    meta,
    soon: soonM
      ? {
          label: m.opens ? `Opens ${fmt.date(m.opens)}` : 'Opens Soon',
          text: `The live build is Session ${sess ? sess.n : ''}. Everything here unlocks ${
            m.opens ? fmt.day(m.opens) : 'soon'
          } at ${m.opens ? fmt.time(m.opens) : '9:00 AM CT'}.`,
        }
      : null,
    v,
    rail,
    railTitle: hasVid ? 'Chapters' : 'Session Agenda',
    trOpen: ui.transcript && hasVid,
    trOn: ui.transcript,
    lines,
    qCount: re ? `${hits} match${hits === 1 ? '' : 'es'}` : `${m.transcript.length} lines`,
    noTranscript: !m.transcript.length || (!!re && !lines.length),
    noTranscriptMsg: m.transcript.length
      ? 'No matches in this transcript.'
      : 'The searchable transcript posts with the replay.',
    ck,
    dp,
    run,
    dr,
    files,
    resources,
    vars,
    cp,
    copyPrompt,
    promptStats: `${m.prompt.split('\n').length} lines · about ${Math.round(m.prompt.length / 4)} tokens`,
    kitNote: `${m.files.length + 1} items`,
    insIni: fmt.initials(m.instructor),
    insAv: avatarColor(m.instructor),
    nextUp: nx ? { label: `Next: ${nx.name}`, to: `/employees/${nx.id}` } : { label: 'Back to Dashboard', to: '/' },
  };
}
