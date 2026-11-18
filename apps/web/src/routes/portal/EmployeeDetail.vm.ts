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
  skillPreview,
} from '@ai/core';
import type { AIEmployee, Db, IconName, Learner, RuntimeState, SkillFile } from '@ai/core';
// Type-only: the shape of a stored file is the repository seam's, and nothing in `data/` is
// imported at runtime, so this file stays pure.
import type { StoredFileRef } from '../../data/repository';
import type { Speed } from '../../components/replay/engine';
import { replayVM } from '../../components/replay/replay.vm';
import type { ChapterVM, TranscriptLineVM } from '../../components/replay/replay.vm';

// ---------------------------------------------------------------------------
// Screen state
// ---------------------------------------------------------------------------

// D-183: the player's speeds, its engine interface and the fixture engine moved to
// `components/replay/engine.ts`, so the learner portal v2's week page plays a replay through the same
// engines. Re-exported here unchanged, so this screen and its tests read them where they always have.
export { SPEEDS, TICK_MS, TICK_SEC, TickerEngine, replayUrl } from '../../components/replay/engine';
export type { Speed, VideoEngine } from '../../components/replay/engine';
// D-183: the player, its chapters and its transcript are decided in `components/replay/replay.vm.ts`, which
// the learner portal v2's week page uses too. This screen builds its player from it, unchanged.
export type { ChapterVM, TranscriptLineVM, TranscriptPartVM } from '../../components/replay/replay.vm';

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
// Side effects the component performs. The VM resolves the payloads; the component owns the DOM.
// ---------------------------------------------------------------------------

export type VmAction =
  | {
      kind: 'download';
      name: string;
      content: string;
      mime: string;
      toast: string;
      /**
       * Phase 08 § 8.2. Set only when the file is an OBJECT IN THE BUCKET — a build-kit skill file
       * or a per-employee resource. `content` stays the prototype's generated body, because that is
       * what fixture mode saves and what the parity run measures; in http mode the screen navigates
       * to the stored file instead and never serialises it.
       *
       * Absent on the session `.ics` and on the System Prompt download, and that is the point of
       * the field: neither has an object in the bucket. The calendar file is built by `ics()` here
       * in the browser, and the prompt is a column on the AI Employee. Routing either one would ask
       * `/api/files/...` for something nobody ever uploaded, which answers 404 — a working
       * Add to Calendar button turned into a broken one.
       */
      stored?: StoredFileRef;
    }
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
  /**
   * The session the Join Button asks about, or `''` when there is none.
   *
   * Phase 08 § 8.4: in http mode `zoom` is blanked by `scopeSnapshot` and the URL comes from
   * `GET /api/sessions/:id/join` at click time, so the screen needs the id rather than the URL.
   */
  sessionId: string;
  /** The toast the Join Button fires. The URL leaves the VM only here (SCREENS § 5.3). */
  join: VmAction;
  /** The session `.ics`, or null when there is no session to add. */
  cal: VmAction | null;
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
  return {
    kind: 'download',
    name,
    content: skillPreview(f, m),
    mime: fileMime(f),
    toast: `Downloaded ${name}`,
    // § 8.2's `GET /api/files/module/:moduleId/:fileName`. `name` is the `:fileName` segment — the
    // file's own name, the same one the browser saves it under. `ext(f)` is '' on every branch that
    // reaches here (only a Notion template gets the `.md` suffix, and that returned above), so this
    // is `f.name` unchanged.
    stored: { kind: 'moduleFile', moduleId: m.id, fileName: name },
  };
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

  // D-183: the player, chapters and transcript, from the shared replay view-model.
  const r = replayVM(db, user.cohortId, p.steps, m, now, ui);
  const { sess, sst, hasVid } = r;
  const meta: MetaVM = {
    hasSession: !!sess,
    selfPaced: !sess,
    n: sess ? sess.n : '',
    title: sess ? sess.title : '',
  };

  // ---- player -------------------------------------------------------------------------------
  const steps = m.checklist;
  const jm = sess ? joinMode(sess, now) : 'disabled';

  const v: PlayerVM = {
    ...r.player,
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
    sessionId: sess ? sess.id : '',
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

  const rail: ChapterVM[] = r.rail;
  const lines: TranscriptLineVM[] = r.lines;

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
    // The reference's slug, and from § 8.2 also the bucket's `:fileName`: `r.name` is a title
    // ("Session 1 Slides"), this is the filename ("session-1-slides.pdf").
    const fileName = `${r.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${r.type.toLowerCase()}`;
    return {
      name: r.name,
      type: r.type,
      size: r.size,
      pending,
      get: pending
        ? null
        : {
            kind: 'download',
            name: fileName,
            content: `${r.name}\n\nPlaceholder file from the Amplified Impact prototype.`,
            mime: 'text/plain',
            toast: `Downloaded ${r.name}`,
            // A per-employee resource is a real upload in production — the `content` above is the
            // prototype's placeholder, which is exactly why it must not be what http mode saves.
            stored: { kind: 'moduleFile', moduleId: m.id, fileName },
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
    railTitle: r.railTitle,
    trOpen: r.trOpen,
    trOn: r.trOn,
    lines,
    qCount: r.qCount,
    noTranscript: r.noTranscript,
    noTranscriptMsg: r.noTranscriptMsg,
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
