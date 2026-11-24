// The Admin Module Builder's view-model — SCREENS § 4.3, phase 06 § 6.1 and § 6.3.
//
// Ported from `renderVals()` in design-reference/Admin Module Builder.dc.html. Pure: no React, no
// hooks, no clock read. The draft, `now` and the UI state come in; strings, flags and the two
// embedded component view-models come out. The component renders what this returns and computes
// nothing of its own.
//
// This screen has no analytics, so `db.base` (phase 06 § 6.2) plays no part here: every figure is
// read off the draft or off the one linked session. `db` is consulted only for the linked session,
// the session clash, and whether a module with this id is already saved.

import {
  ICONS,
  MODULE_ICONS,
  adminMonthDay,
  adminWhen,
  blankModule,
  cardVM,
  fmt,
  fromAdminLocal,
  savedStepIds,
  sessionFor,
  sessionState,
  sortedModules,
  toAdminLocal,
} from '@ai/core';
import type { AIEmployee, CardVM, Db, IconName, ModuleStatus, SkillFile, Step, Tier } from '@ai/core';
import type { LockedItem } from '../../components/LockedEmployeePreview';
import type { TokenGlyph, TokenTone } from '../../components/StatusToken';

// ICONS is an `as const` map, so a direct index is typed as always present. A draft loaded out of
// localStorage can carry an icon key outside the set, and the reference relies on that miss
// (`ic[d.icon] || ic.bot`), exactly as `cardVM` does.
const ICON_PATHS: Record<string, string | undefined> = ICONS;

export type PreviewTab = 'card' | 'locked' | 'header';

/** Everything the screen holds locally. The draft itself is passed separately. */
export interface ModuleBuilderUi {
  pv: PreviewTab;
  pvTier: Tier;
  /** The draft differs from what was last written. Drives the amber save note and the blocker. */
  dirty: boolean;
  /** When this draft was last saved in this session, or null. */
  savedAt: number | null;
  /** Validation messages from `saveModule`, already split into lines. */
  errors: string[];
}

// ---------------------------------------------------------------------------
// Static option lists. Copied from the reference's literal markup and `stDefs`.
// ---------------------------------------------------------------------------

/** The `Linked Session (Applies to Every Cohort)` options, verbatim from the reference's markup. */
export const SESSION_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Self-Paced (No Live Session)' },
  { value: '1', label: 'Session 1 · The Autonomous Agent' },
  { value: '2', label: 'Session 2 · Speed to Lead' },
  { value: '3', label: 'Session 3 · The Living Database' },
  { value: '4', label: 'Session 4 · The Meeting That Runs Itself' },
  { value: '5', label: 'Session 5 · Numbers on Autopilot' },
  { value: '6', label: 'Session 6 · Contract to Close' },
];

export const TIER_OPTIONS: readonly { value: Tier; label: string }[] = [
  { value: 'agent', label: 'Agent + Team' },
  { value: 'team', label: 'Team Only' },
];

export const PREVIEW_TABS: readonly { value: PreviewTab; label: string }[] = [
  { value: 'card', label: 'Card' },
  { value: 'locked', label: 'Locked Preview' },
  { value: 'header', label: 'Detail Header' },
];

export const PREVIEW_TIERS: readonly { value: Tier; label: string }[] = [
  { value: 'agent', label: 'Agent' },
  { value: 'team', label: 'Team' },
];

const STATUS_DEFS: readonly [ModuleStatus, string, string][] = [
  ['draft', 'Draft', 'Hidden from learners'],
  ['scheduled', 'Scheduled', 'Visible as “Opens …”'],
  ['published', 'Published', 'Available now'],
];

const PILLS: Record<ModuleStatus, { tone: TokenTone; icon: TokenGlyph; label: string }> = {
  published: { tone: 'success', icon: 'check', label: 'Published' },
  scheduled: { tone: 'progress', icon: 'clock', label: 'Scheduled' },
  draft: { tone: 'neutral', icon: 'ring', label: 'Draft' },
};

/** Picking `Scheduled` with no date yet seeds this instant. The reference's literal. */
export const DEFAULT_OPENS = Date.parse('2026-12-21T09:00:00-06:00');

/** The three demo uploads the dashed drop zone cycles through. The reference's `demoFiles`. */
const DEMO_FILES: readonly [SkillFile['type'], string, string][] = [
  ['JSON', 'skill.json', '3 KB'],
  ['YAML', 'skill.yaml', '2 KB'],
  ['Notion', '', 'Template'],
];

// ---------------------------------------------------------------------------
// Pure draft shaping. The component calls these; it never derives a value itself.
// ---------------------------------------------------------------------------

/** The order a brand-new AI Employee takes: one past the highest saved order. */
export const nextOrder = (db: Db): number => Math.max(0, ...db.modules.map((m) => m.order)) + 1;

/**
 * The reference's `sync()`: an existing module is deep-copied, `/new` starts from `blankModule`,
 * and `outputs` is always padded to exactly three entries.
 */
export function seedDraft(db: Db, id: string | null, now: number): AIEmployee {
  const m = id ? db.modules.find((x) => x.id === id) : null;
  const d = m ? structuredClone(m) : blankModule(nextOrder(db), now);
  const outputs = d.outputs ?? [];
  d.outputs = [0, 1, 2].map((i) => outputs[i] || '');
  return d;
}

/** The reference's `parseT`: `h:mm:ss`, `mm:ss` or bare seconds → seconds. */
export function parseReplayAt(value: string): number {
  const p = String(value)
    .split(':')
    .map((n) => parseInt(n, 10) || 0);
  if (p.length === 3) return (p[0] ?? 0) * 3600 + (p[1] ?? 0) * 60 + (p[2] ?? 0);
  if (p.length === 2) return (p[0] ?? 0) * 60 + (p[1] ?? 0);
  return p[0] ?? 0;
}

/** The reference's `setMins`: never below one minute, never NaN. */
export const parseMinutes = (value: string): number => Math.max(1, parseInt(value, 10) || 1);

/**
 * Reorder only. There are always exactly six steps (phase 06 § 6.3), so this swaps a neighbour
 * and returns the list unchanged at either end — the reference's `up`/`down` guards.
 */
export function moveStep(list: readonly Step[], i: number, dir: -1 | 1): Step[] {
  const j = i + dir;
  const a = list[i];
  const b = list[j];
  if (!a || !b) return list.slice();
  const next = list.slice();
  next[i] = b;
  next[j] = a;
  return next;
}

/** The reference's `addFile`: the next demo upload, named from the current sidebar label. */
export function nextFile(d: AIEmployee): SkillFile {
  const [type, ext, size] = DEMO_FILES[d.files.length % 3]!;
  const slug = (d.short || 'new').toLowerCase().replace(/\W+/g, '-');
  return {
    name: type === 'Notion' ? `${d.short || 'New'} SOP` : `${slug}-${d.files.length + 1}.${ext}`,
    type,
    size,
    desc: 'Uploaded just now',
    steps: d.outputs.filter(Boolean),
  };
}

/**
 * What `saveModule` writes, computed locally so the draft on screen shows the stored values the
 * moment the save succeeds — `build` set to the sum of the step minutes, `short` defaulted to the
 * name minus ` AI Employee` (SCREENS § 4.3). The reference's `save()` applies exactly this to its own
 * copy before `setState`; `@ai/core`'s `saveModule` is still the only thing that persists, and it
 * applies the same transforms to what it stores, so this is idempotent and never the authority.
 *
 * D-247 (H-5): the step ids are the ones the save answered (`saved.stepIds`): a kept step keeps its id
 * and a new one gets the id the server gave it, so the next save (and a kit item's step) names the
 * stored step. Without them (a new module's first save in a test), `c1…cN`, as a new module is saved.
 */
export function normalizeSaved(draft: AIEmployee, status?: ModuleStatus, stepIds?: readonly string[]): AIEmployee {
  const d = structuredClone(draft);
  if (status) d.status = status;
  if (d.status === 'published') d.opens = null;
  const ids = stepIds && stepIds.length === d.checklist.length ? stepIds : savedStepIds([], d.checklist);
  d.checklist = d.checklist.map((s, i) => ({ ...s, id: ids[i]! }));
  d.build = d.checklist.reduce((a, s) => a + (+s.mins || 0), 0);
  d.short = d.short.trim() || d.name.replace(/ AI Employee$/, '');
  return d;
}

// ---------------------------------------------------------------------------
// The view-model
// ---------------------------------------------------------------------------

export interface IconToggleVM {
  key: IconName;
  /** The resolved 24-grid path, so the toggle renders through `<Icon name>`'s sibling data. */
  path: string;
  on: boolean;
}

export interface OutputVM {
  n: number;
  value: string;
}

export interface StepVM {
  n: number;
  text: string;
  hint: string;
  ch: string;
  /** `mm:ss`, through `fmt.clock`. */
  t: string;
  mins: number;
  canUp: boolean;
  canDown: boolean;
}

export interface ReplayVM {
  icon: IconName;
  /** The glyph colour: `--text-tertiary` or `--status-success`. */
  tone: 'tertiary' | 'success';
  title: string;
  sub: string;
  btn: string;
  /** What the upload button toasts. Independent of the three visual branches. */
  toast: string;
}

export interface FileVM {
  index: number;
  name: string;
  type: SkillFile['type'];
  /** `Decisions, risks and questions from any transcript · 4 KB`. */
  meta: string;
}

export interface StatusChoiceVM {
  key: ModuleStatus;
  label: string;
  sub: string;
  on: boolean;
}

export interface PillVM {
  tone: TokenTone;
  icon: TokenGlyph;
  label: string;
}

export interface PortalLinkVM {
  /** A module with this id is saved and published, so the learner portal has something to show. */
  live: boolean;
  /** The persona the preview switches to in fixture mode (phase 06 § 6.4). */
  role: 'agent' | 'owner';
  path: string;
  /** Shown instead of navigating while the module is not live. */
  toast: string;
}

export interface ModuleBuilderVM {
  /** The draft itself, so every control reads one source. */
  d: AIEmployee;
  /** `d.session` as the `<select>`'s value: `''` for self-paced. */
  sessionStr: string;

  title: string;
  pill: PillVM;
  saveNote: string;
  dirty: boolean;
  saveLabel: string;
  publishLabel: string;
  canDelete: boolean;
  errors: string[];

  icons: IconToggleVM[];
  tierNote: string;
  outputs: OutputVM[];
  sessWarn: string;
  replay: ReplayVM;
  steps: StepVM[];
  totalMins: number;
  promptStats: string;
  vars: string[];
  noVars: boolean;
  example: string;
  files: FileVM[];
  statuses: StatusChoiceVM[];
  isScheduled: boolean;
  opensDate: string;

  pv: PreviewTab;
  pvTier: Tier;
  pvCard: boolean;
  pvLocked: boolean;
  pvHeader: boolean;
  card: CardVM;
  lockedItems: LockedItem[];
  outcomeOrHint: string;
  metaLine: string;
  portal: PortalLinkVM;
}

export function moduleBuilderVM(db: Db, d: AIEmployee, now: number, ui: ModuleBuilderUi): ModuleBuilderVM {
  const team = d.tier === 'team';
  // Every cohort runs the same six builds, so the builder always previews against `dec26`.
  const sess = d.session ? sessionFor(db, 'dec26', d.session) : null;
  const clash = d.session ? db.modules.find((x) => x.id !== d.id && x.session === d.session) : null;
  const sst = sess ? sessionState(sess, now) : 'none';

  const replayToast =
    sess && sst !== 'replay'
      ? 'The replay imports from Zoom when the session ends'
      : 'Upload started. Processing takes about 10 minutes.';
  const replay: ReplayVM = !sess
    ? {
        icon: 'video',
        tone: 'tertiary',
        title: 'Walkthrough video',
        sub: 'Optional for self-paced AI Employees',
        btn: 'Upload Video',
        toast: replayToast,
      }
    : sst === 'replay' && d.dur
      ? {
          icon: 'checkCircle',
          tone: 'success',
          title: `Session ${sess.n} replay attached`,
          sub: `${fmt.clock(d.dur)} · 6 chapters from the build steps · transcript indexed`,
          btn: 'Replace',
          toast: replayToast,
        }
      : {
          icon: 'clock',
          tone: 'tertiary',
          title: `Replay posts after Session ${sess.n}`,
          sub: `${fmt.day(sess.start)} · Zoom cloud recording imports automatically`,
          btn: 'Upload Manually',
          toast: replayToast,
        };

  const steps: StepVM[] = d.checklist.map((s, i) => ({
    n: i + 1,
    text: s.text,
    hint: s.hint,
    ch: s.ch,
    t: fmt.clock(s.t),
    mins: s.mins,
    canUp: i > 0,
    canDown: i < d.checklist.length - 1,
  }));
  const totalMins = d.checklist.reduce((a, s) => a + (+s.mins || 0), 0);

  const vars = [...new Set((d.prompt.match(/\{\{[A-Z_]+\}\}/g) ?? []).map((x) => x.replace(/[{}]/g, '')))];

  const saved = db.modules.find((x) => x.id === d.id);
  const live = !!saved && saved.status === 'published';

  return {
    d,
    sessionStr: d.session ? String(d.session) : '',

    title: d.name || 'Untitled AI Employee',
    pill: PILLS[d.status],
    saveNote: ui.dirty
      ? 'Unsaved changes'
      : ui.savedAt
        ? 'Saved ' + fmt.agoInline(ui.savedAt, now)
        : saved
          ? 'All changes saved'
          : 'Not saved yet',
    dirty: ui.dirty,
    saveLabel: d.status === 'draft' ? 'Save Draft' : 'Save',
    publishLabel: live ? 'Update Live Module' : 'Publish',
    canDelete: !!saved && saved.status === 'draft',
    errors: ui.errors,

    icons: MODULE_ICONS.map((k) => ({ key: k, path: ICONS[k], on: d.icon === k })),
    tierNote: team ? 'Agent tier learners see the locked preview' : 'Included in both tiers',
    outputs: d.outputs.map((o, i) => ({ n: i + 1, value: o })),
    sessWarn: clash ? `${clash.name} is also linked to Session ${d.session}. Both will share that live build.` : '',
    replay,
    steps,
    totalMins,
    promptStats: `${d.prompt.split('\n').length} lines · about ${Math.round(d.prompt.length / 4)} tokens`,
    vars,
    noVars: !vars.length,
    example: '{{TEAM_NAME}}',
    files: d.files.map((f, i) => ({
      index: i,
      name: f.name,
      type: f.type,
      meta: `${f.desc} · ${f.size}`,
    })),
    statuses: STATUS_DEFS.map(([key, label, sub]) => ({ key, label, sub, on: d.status === key })),
    isScheduled: d.status === 'scheduled',
    opensDate: d.opens ? fmt.isoDate(d.opens) : '',

    pv: ui.pv,
    pvTier: ui.pvTier,
    pvCard: ui.pv === 'card',
    pvLocked: ui.pv === 'locked',
    pvHeader: ui.pv === 'header',
    // The real card, from the real `cardVM`, against a synthetic viewer at the previewed tier.
    card: cardVM(db, { tier: ui.pvTier, progress: {}, cohortId: 'dec26' }, { ...d, build: totalMins }, now),
    lockedItems: [
      {
        id: d.id,
        name: d.name,
        short: d.short || d.name,
        icon: ICON_PATHS[d.icon] || ICONS.bot,
        headline: d.headline || d.outcome || 'Add an outcome headline',
        outputs: d.outputs.map((o, i) => o || `Output ${i + 1}`),
        sessLine: sess ? `Session ${sess.n} · ${fmt.day(sess.start)}` : 'Self-paced',
      },
    ],
    outcomeOrHint: d.outcome || 'Add an outcome line',
    metaLine: `${sess ? `From Session ${sess.n} · ${sess.title}` : 'Self-paced'} · ${totalMins} min build · For ${d.forWho || '…'}`,
    portal: {
      live,
      role: team ? 'owner' : 'agent',
      path: `/employees/${d.id}`,
      toast: 'Publish first. Drafts are hidden from learners.',
    },
  };
}

// ================================================================================================
// R2 (D-160 R2-2): the Module Builder of the signed-off Admin redesign (AdminRedesign.jsx `Builder`).
// The same draft, `saveModule` and `normalizeSaved` as above; the words are the mockup's, its times
// MST (`adminWhen`, BUILD-SPEC § 7).
// ================================================================================================

export interface BuilderR2Item {
  id: string;
  name: string;
  tone: 'ok' | 'info' | 'off';
  on: boolean;
}

export interface BuilderR2Step {
  key: string;
  text: string;
  /** The step's type pill (`Watch`, `Build`, …), or '' when the step has none. */
  kind: string;
  /** `4 min`. */
  length: string;
}

export interface BuilderR2VM {
  list: BuilderR2Item[];
  name: string;
  summary: string;
  icon: IconName;
  steps: BuilderR2Step[];
  files: { name: string; desc: string; size: string }[];
  status: { label: 'Published' | 'Scheduled' | 'Draft'; tone: 'ok' | 'info' | 'off' };
  tier: Tier;
  session: { title: string; when: string } | null;
  /** `Open now`, `Dec 14`, or a muted `Not scheduled`. */
  opens: { text: string; muted: boolean };
  /** A skill file is attached. */
  linked: boolean;
  /** `Saved`, or `Save changes` while there is something to save. */
  saveLabel: string;
  /** The live sessions a module can link to, for the details dialog. */
  sessionOptions: { value: string; label: string }[];
}

const R2_TONE: Record<ModuleStatus, ['Published' | 'Scheduled' | 'Draft', 'ok' | 'info' | 'off']> = {
  published: ['Published', 'ok'],
  scheduled: ['Scheduled', 'info'],
  draft: ['Draft', 'off'],
};

export function builderR2VM(db: Db, d: AIEmployee, ui: { dirty: boolean; saved: boolean }, now: number): BuilderR2VM {
  const sess = d.session ? sessionFor(db, 'dec26', d.session) : null;
  const [label, tone] = R2_TONE[d.status];
  return {
    list: sortedModules(db).map((m) => ({ id: m.id, name: m.name, tone: R2_TONE[m.status][1], on: m.id === d.id })),
    name: d.name,
    summary: d.outcome,
    icon: d.icon,
    // D-212: a course week's step shows its title from `ch` (the learner page's `ch || text`), so the row edits that.
    steps: d.checklist.map((s, i) => ({ key: `${i}`, text: d.kind === 'week' ? s.ch || s.text : s.text, kind: s.kind ?? '', length: `${s.mins} min` })),
    files: d.files.map((f) => ({ name: f.name, desc: f.desc, size: f.size })),
    status: { label, tone },
    tier: d.tier,
    session: sess
      ? {
          title: `Session ${sess.n} · ${sess.title}`,
          when: `${adminWhen(sess.start)}${sessionState(sess, now) === 'replay' ? ' · Replay ready' : ''}`,
        }
      : null,
    opens:
      d.status === 'scheduled'
        ? d.opens
          ? { text: adminMonthDay(d.opens), muted: false }
          : { text: 'Not scheduled', muted: true }
        : d.status === 'draft'
          ? { text: 'Not scheduled', muted: true }
          : { text: 'Open now', muted: false },
    linked: d.files.length > 0,
    saveLabel: ui.dirty || !ui.saved ? 'Save changes' : 'Saved',
    sessionOptions: [
      { value: '', label: 'Self-paced' },
      ...db.sessions
        .filter((s) => s.cohortId === 'dec26')
        .sort((a, b) => a.n - b.n)
        .map((s) => ({ value: String(s.n), label: `Session ${s.n} · ${s.title}` })),
    ],
  };
}

/** Move a step from `from` to `to` (a drag), one neighbour swap at a time, as `moveStep` does. */
export function moveStepTo(list: readonly Step[], from: number, to: number): Step[] {
  let out = list.slice();
  const dir = to < from ? -1 : 1;
  for (let i = from; i !== to; i += dir) out = moveStep(out, i, dir);
  return out;
}

/** An `<input type="date">` value for the opening day, in MST. */
export const opensInput = (t: number | null): string => (t ? toAdminLocal(t).date : '');
/** The opening instant for an `<input type="date">` value: 9:00 AM MST that day. */
export const opensFrom = (date: string): number | null => (date ? fromAdminLocal(date, '09:00') : null);
