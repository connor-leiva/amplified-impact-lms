// SEED, NOT RUNTIME (D-235). Connor, Nov 20 and 21, 2026: load Weeks 1 and 2 by code, and keep all of it configurable
// in the Week Builder ("I'm okay having it seed stuff into the portal, but I still want it ALL configurable in the admin
// portal in the curriculum builder"). The words are his approved Weeks 1 and 2 (`weeks-1-2-v1/*.json`, from
// `handoff/weeks-1-2/`): every step's body on both paths, its who, time, done-when and goal, and the week-level fields
// that changed. This step writes them once, into the same records the Week Builder edits; from then on the builder owns
// them.
//
// Only over the seed (the brief's rule 2, in code):
//   - a step changes only while it is as the seed left it: its seeded title, nothing on either path, and no who, time,
//     done-when or goal. Any other step is left exactly as it is and named;
//   - two steps also change their row (the sales page's schedule): Week 1 step 5 becomes "Schedule the Finance
//     Analyst" at 15 minutes, and Week 2 step 6 becomes 10 minutes, each only while it still has its seeded minutes;
//     the week's `build` (the sum of its minutes) follows, as the builder's save keeps it;
//   - a week-level field changes only while it still holds its seeded value: the repo's seed, or the value the
//     handoff names as seeded (compared by its words, so its straight apostrophes, missing final periods and "..."
//     cuts still match). Anything else is left and named.
// Nothing else changes: no step id, no other title or minutes, no status, opening, due date, session, Kit or media.
// Nothing is published or scheduled.
//
// The videos have not been recorded: each video block and its "Watch the video" item are left out, as the builder
// adds them when they are. A Download button whose Kit file isn't in the week's Kit yet, a calendar button whose
// session isn't there, and the seat card's Form button (before the seat card form exists) are left off their item and
// named, for the builder.

import type { AccordionBlock, CalloutBlock, CheckAction, CheckBlock, CheckRole, PathBlock, SeatCard } from '../src/course-types';
import { isWeekModule } from '../src/course';
import type { AIEmployee, Db, Step } from '../src/types';
import type { DataChange, DataSkip, DataStepOutcome } from './data-step';
import { weekModuleV2 } from './weeks-0-3-v2';
import week1Steps from './weeks-1-2-v1/week-1-steps.json' with { type: 'json' };
import week2Steps from './weeks-1-2-v1/week-2-steps.json' with { type: 'json' };
import week1Cards from './weeks-1-2-v1/week-1-card-changes.json' with { type: 'json' };
import week2Cards from './weeks-1-2-v1/week-2-card-changes.json' with { type: 'json' };

export const WEEKS_1_2_V1 = '2026-11-22-weeks-1-2-steps';

// --- the handoff's shapes (`handoff/weeks-1-2/reference/WEEK-N-BUILDER-LOAD-SHEET.md` says the same in words) -------

export interface DataButton {
  kind: 'No button' | 'Copy' | 'Download' | 'Add to calendar' | 'Upload' | 'Form';
  label?: string;
  text?: string;
  kit?: string[];
  session?: string;
  collects?: string;
  form?: string;
}
export interface DataCheck {
  type: 'check';
  id: string;
  title: string;
  detail: string;
  role: string;
  optional: boolean;
  click: string[];
  tasks: string[];
  deps: string[];
  other: unknown[];
  button: DataButton;
  play_at: unknown;
}
export interface DataCallout { type: 'callout'; kind: string; text: string }
export interface DataAccordion { type: 'accordion'; title: string; paras: string[]; head: string[]; rows: string[][]; link: string; link_label: string }
export interface DataVideo { type: 'video'; id: string; title: string; note: string }
export type DataBlock = DataCheck | DataCallout | DataAccordion | DataVideo;
export interface DataStep { title: string; who: string; time: string; mins: number; done: string; goal: string; claude: DataBlock[]; chatgpt: DataBlock[] }
export interface DataCardChange { field: string; seeded: string; change_to: string }

/** Each week's data, by week number. */
export const WEEKS_1_2_DATA: Readonly<Record<1 | 2, { steps: DataStep[]; cards: DataCardChange[] }>> = {
  1: { steps: week1Steps as unknown as DataStep[], cards: week1Cards as unknown as DataCardChange[] },
  2: { steps: week2Steps as unknown as DataStep[], cards: week2Cards as unknown as DataCardChange[] },
};

const moduleIdOf = (week: 1 | 2): string => `accelerator-week-${week}`;

/** The two rows that change their title or minutes, by week and step number: the sales page's schedule. */
export const ROW_CHANGES: readonly { week: 1 | 2; step: number; title: boolean; mins: boolean }[] = [
  { week: 1, step: 5, title: true, mins: true },
  { week: 2, step: 6, title: false, mins: true },
];

const ROLE: Readonly<Record<string, CheckRole | undefined>> = { Owner: 'owner', Operator: 'operator', 'Each of you': 'each', 'No role tag': undefined };
const CALLOUT: Readonly<Record<string, CalloutBlock['kind']>> = { Tip: 'tip', 'Heads up': 'heads_up', 'Doing it yourself?': 'diy' };
const COLLECTS: Readonly<Record<string, 'live_read' | 'checkpoint'>> = { 'Report for a live read': 'live_read', Checkpoint: 'checkpoint' };

/** What the week has for the buttons to name: its Kit (titles to ids), its sessions (titles to ids), and which forms exist. */
export interface WeekPicks {
  kit: ReadonlyMap<string, string>;
  sessions: ReadonlyMap<string, string>;
  /** The forms a Form button can open; the seat card's id once that form exists. */
  forms: Readonly<Record<string, string>>;
}

/** One item's button, or null with the reason it was left off (named in the step's summary). */
export function actionOf(b: DataButton, picks: WeekPicks): { action: CheckAction | null; missing: string | null } {
  switch (b.kind) {
    case 'No button':
      return { action: null, missing: null };
    case 'Copy':
      return { action: { type: 'copy', label: b.label ?? '', text: b.text ?? '' }, missing: null };
    case 'Download': {
      const titles = b.kit ?? [];
      const absent = titles.filter((t) => !picks.kit.has(t));
      if (absent.length || !titles.length) return { action: null, missing: `Download: ${absent.map((t) => `"${t}"`).join(', ') || 'no file named'} not in the week's Kit yet` };
      return { action: { type: 'download', kitItemIds: titles.map((t) => picks.kit.get(t)!) }, missing: null };
    }
    case 'Add to calendar': {
      const id = b.session ? picks.sessions.get(b.session) : undefined;
      return id ? { action: { type: 'calendar', sessionId: id }, missing: null } : { action: null, missing: `Add to calendar: no session "${b.session ?? ''}" in the week` };
    }
    case 'Upload': {
      const kind = COLLECTS[b.collects ?? ''];
      return kind ? { action: { type: 'upload', kind }, missing: null } : { action: null, missing: `Upload: it collects "${b.collects ?? ''}", which isn't a kind Turn in has` };
    }
    case 'Form': {
      const formId = picks.forms[b.form ?? ''];
      return formId
        ? { action: { type: 'form', formId: formId as 'intake' | 'stack-card', label: b.label ?? '' }, missing: null }
        : { action: null, missing: `Form: "${b.form ?? ''}" doesn't exist yet; set the button in the builder when it does` };
    }
    default:
      return { action: null, missing: `a button of kind "${(b as DataButton).kind}"` };
  }
}

/** A task line, "cd | Company dollar": its id and its label, split at the vertical bar. */
const subOf = (t: string): { id: string; label: string } => {
  const at = t.indexOf('|');
  return at < 0 ? { id: t.trim(), label: t.trim() } : { id: t.slice(0, at).trim(), label: t.slice(at + 1).trim() };
};

/**
 * One path's blocks in the builder's own shapes. Videos, and the "Watch the video" item right after each, are left out
 * (no recording exists yet), with any dependency on that item. Each item's button follows `actionOf`.
 */
export function pathBlocks(blocks: readonly DataBlock[], picks: WeekPicks): { blocks: PathBlock[]; missing: string[] } {
  const dropped = new Set<string>();
  blocks.forEach((b, i) => {
    const next = blocks[i + 1];
    if (b.type === 'video' && next?.type === 'check' && next.id.endsWith('-watch')) dropped.add(next.id);
  });
  const out: PathBlock[] = [];
  const missing: string[] = [];
  for (const b of blocks) {
    if (b.type === 'video') continue;
    if (b.type === 'check') {
      if (dropped.has(b.id)) continue;
      const c: CheckBlock = { type: 'check', id: b.id, title: b.title };
      if (b.detail) c.detail = b.detail;
      const role = ROLE[b.role];
      if (role) c.role = role;
      const { action, missing: why } = actionOf(b.button, picks);
      if (action) c.action = action;
      if (why) missing.push(`${b.id}: ${why}`);
      if (b.click.length) c.clickPath = [...b.click];
      const deps = b.deps.filter((d) => !dropped.has(d));
      if (deps.length) c.dependsOn = deps;
      if (b.optional) c.optional = true;
      if (b.tasks.length) c.subchecks = b.tasks.map(subOf);
      out.push(c);
    } else if (b.type === 'callout') {
      out.push({ type: 'callout', kind: CALLOUT[b.kind] ?? 'tip', text: b.text });
    } else {
      const a: AccordionBlock = { type: 'accordion', title: b.title, body: [...b.paras] };
      if (b.rows.length) a.table = { ...(b.head.length ? { head: [...b.head] } : {}), rows: b.rows.map((r) => [...r]) };
      if (b.link) a.link = { label: b.link_label, href: b.link };
      out.push(a);
    }
  }
  return { blocks: out, missing };
}

/** A step is as the seed left it: its seeded title, nothing on either path, and no who, time, done-when or goal. */
const asSeeded = (s: Step, seededTitle: string): string | null => {
  if ((s.ch || s.text) !== seededTitle) return 'its title was changed in the builder';
  if ((s.paths?.claude?.blocks.length ?? 0) || (s.paths?.chatgpt?.blocks.length ?? 0)) return 'it has blocks on a path (edited in the builder)';
  if (s.who || s.timeLabel || s.doneWhen || s.goal) return 'its who, time, done-when or goal was set in the builder';
  return null;
};

/** A sentence without its final period: a step's stored text, as the seed writes it beside the goal. */
const sentence = (goal: string): string => goal.trim().replace(/\.$/, '');

/** Words only: case, apostrophes, punctuation and spacing aside. */
const words = (s: string): string => s.normalize('NFKC').replace(/[‘’]/g, "'").toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Whether a stored value still holds what the handoff calls its seeded value. "..." at either end marks a cut: the
 * stored value then only has to start with, end with or contain what is left.
 */
export function holdsHandoffValue(stored: string, seeded: string): boolean {
  const lead = /^\s*(\.\.\.|…)/.test(seeded);
  const tail = /(\.\.\.|…)\s*$/.test(seeded);
  const core = words(seeded.replace(/^\s*(\.\.\.|…)/, '').replace(/(\.\.\.|…)\s*$/, ''));
  const have = words(stored);
  if (!core) return false;
  if (lead && tail) return have.includes(core);
  if (tail) return have.startsWith(core);
  if (lead) return have.endsWith(core);
  return have === core;
}

type SeatKey = keyof SeatCard;
const SEAT_KEYS: Readonly<Record<string, SeatKey>> = {
  Seat: 'seat', 'Reports To': 'reportsTo', Runs: 'runs', Pulls: 'pulls', Applies: 'applies', Produces: 'produces', 'Took Over': 'tookOver', "Can't Do": 'cantDo', 'First Run': 'firstRun',
};

/** Where a card-changes row's field lives in a week, as a getter and a setter (null for a field this step doesn't know). */
export function fieldOf(field: string): { get: (m: AIEmployee) => string | undefined; set: (m: AIEmployee, v: string) => AIEmployee } | null {
  if (field === 'Operator line') {
    return { get: (m) => m.course?.operator, set: (m, v) => ({ ...m, course: { ...m.course!, operator: v } }) };
  }
  const out = /^Outputs ([123])$/.exec(field);
  if (out) {
    const i = Number(out[1]) - 1;
    return { get: (m) => m.outputs[i], set: (m, v) => ({ ...m, outputs: m.outputs.map((x, j) => (j === i ? v : x)) }) };
  }
  if (field === 'Live build, Required') {
    return {
      get: (m) => m.course?.liveBuild?.required,
      set: (m, v) => ({ ...m, course: { ...m.course!, liveBuild: { ...m.course!.liveBuild!, required: v } } }),
    };
  }
  const seat = /^Seat card, (.+)$/.exec(field);
  const key = seat ? SEAT_KEYS[seat[1]!.replace(/[‘’]/g, "'")] : undefined;
  if (key) {
    return {
      get: (m) => m.course?.seatCard?.[key],
      set: (m, v) => ({ ...m, course: { ...m.course!, seatCard: { ...m.course!.seatCard!, [key]: v } } }),
    };
  }
  return null;
}

/** The week's Kit and sessions, by title, for the buttons. */
export function picksOf(db: Pick<Db, 'resources' | 'sessions'>, moduleId: string, forms: Readonly<Record<string, string>>): WeekPicks {
  return {
    kit: new Map(db.resources.filter((r) => r.module === moduleId).map((r) => [r.title, r.id])),
    sessions: new Map(db.sessions.filter((s) => s.moduleId === moduleId).map((s) => [s.title, s.id])),
    forms,
  };
}

/**
 * The plan. `forms` names the forms a Form button may open, by the handoff's name ("Seat card"); none yet, so the seat
 * card's two buttons are left off and named until its form exists.
 */
export function planWeeks12V1(db: Db, forms: Readonly<Record<string, string>> = {}): DataStepOutcome {
  const changes: DataChange[] = [];
  const skipped: DataSkip[] = [];
  let modules = db.modules;
  for (const week of [1, 2] as const) {
    const id = moduleIdOf(week);
    const m = modules.find((x) => x.id === id);
    if (!m || !isWeekModule(m)) {
      skipped.push({ id, reason: `Week ${week} is not in this database` });
      continue;
    }
    const data = WEEKS_1_2_DATA[week];
    const seed = weekModuleV2(week);
    const picks = picksOf(db, id, forms);
    let next: AIEmployee = m;
    // The steps.
    const checklist = m.checklist.map((s, i): Step => {
      const d = data.steps[i];
      const seededTitle = seed.checklist[i]?.ch ?? '';
      const at = `${id}.step-${i + 1}`;
      if (!d) return s;
      const why = asSeeded(s, seededTitle);
      if (why) {
        skipped.push({ id: at, reason: why });
        return s;
      }
      const claude = pathBlocks(d.claude, picks);
      const chatgpt = pathBlocks(d.chatgpt, picks);
      const row = ROW_CHANGES.find((r) => r.week === week && r.step === i + 1);
      const step: Step = { ...s, who: d.who, timeLabel: d.time, doneWhen: d.done, goal: d.goal, paths: { claude: { blocks: claude.blocks }, chatgpt: { blocks: chatgpt.blocks } } };
      if (row?.title) {
        step.ch = d.title;
        step.text = sentence(d.goal);
      }
      if (row?.mins) {
        if (s.mins === seed.checklist[i]!.mins) step.mins = d.mins;
        else skipped.push({ id: `${at}.mins`, reason: `its minutes were changed in the builder (${s.mins}); left as they are` });
      }
      changes.push({
        target: { type: 'module', id, label: `${m.name}, step ${i + 1}` },
        before: { title: s.ch || s.text, mins: s.mins, blocks: 0 },
        after: { title: step.ch || step.text, mins: step.mins, blocks: { claude: claude.blocks.length, chatgpt: chatgpt.blocks.length } },
      });
      for (const miss of [...claude.missing, ...chatgpt.missing]) skipped.push({ id: `${at}.button`, reason: `${miss} (left off the item)` });
      return step;
    });
    next = { ...next, checklist };
    const build = checklist.reduce((a, s) => a + (+s.mins || 0), 0);
    if (build !== m.build) next = { ...next, build };
    // The week-level fields.
    for (const row of data.cards) {
      const f = fieldOf(row.field);
      const at = `${id}.${row.field}`;
      if (!f) {
        skipped.push({ id: at, reason: 'not a field this step knows' });
        continue;
      }
      const stored = f.get(next);
      const seeded = f.get(seed);
      if (stored === undefined) {
        skipped.push({ id: at, reason: 'the week has no such field' });
        continue;
      }
      if (words(stored) === words(row.change_to)) {
        skipped.push({ id: at, reason: 'it already holds the new value' });
        continue;
      }
      if (stored !== seeded && !holdsHandoffValue(stored, row.seeded)) {
        skipped.push({ id: at, reason: 'it no longer holds its seeded value (changed in the builder)' });
        continue;
      }
      next = f.set(next, row.change_to);
      changes.push({ target: { type: 'module', id, label: `${m.name}, ${row.field}` }, before: stored, after: row.change_to });
    }
    modules = modules.map((x) => (x.id === id ? next : x));
  }
  return { db: { ...db, modules }, changes, skipped };
}
