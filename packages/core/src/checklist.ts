// Checklist steps (D-190). Pure: no clock, no I/O. A path that holds a checklist item uses the one-step
// layout; every other path stays as it is. Hide and collapse conditions are stored and not evaluated
// yet (a later change). An item is never addressed by its number.

import type { AccordionBlock, CalloutBlock, CheckBlock, ContentBlock, PathBlock, VideoBlock } from './course-types';
import type { ChecklistMark, Step, VideoProgress } from './types';
import { autoTargets, crossesWatch } from './video';

const ITEM_ID = /^[A-Za-z0-9_-]+$/;
const CROSS = /^step:(\d+):([A-Za-z0-9_-]+)$/;

export const isCheck = (b: PathBlock): b is CheckBlock => b.type === 'check';
export const isCallout = (b: PathBlock): b is CalloutBlock => b.type === 'callout';

/** True when this path should draw the one-step layout. */
export const pathHasCheck = (blocks: readonly PathBlock[] | undefined): boolean => (blocks ?? []).some(isCheck);

/** A week uses the new step pills when any step, on either path, has a checklist item. */
export function weekHasCheck(steps: readonly { paths?: { claude?: { blocks: PathBlock[] }; chatgpt?: { blocks: PathBlock[] } } }[]): boolean {
  return steps.some((s) => pathHasCheck(s.paths?.claude?.blocks) || pathHasCheck(s.paths?.chatgpt?.blocks));
}

/** How many words a title has. The builder warns past 8; it does not refuse the save. */
export const titleWords = (title: string): number => title.trim().split(/\s+/).filter(Boolean).length;

/**
 * D-199: the intake's `operator` answer that means the owner holds both roles: "both" or "I'm both",
 * any case, with a straight or curly apostrophe. Personalization and the GHL intake sync both read it.
 */
export function isBothAnswer(value: string | string[] | undefined): boolean {
  if (typeof value !== 'string') return false;
  const got = value.trim().toLowerCase().replace(/[‘’ʼ]/g, "'");
  return got === 'both' || got === "i'm both";
}

/**
 * D-199: a stored condition against the team's intake. No intake, or a field the intake does not
 * have, does nothing. `both` also matches "I'm both" (`isBothAnswer`).
 */
export function conditionMet(cond: { field: string; equals: string } | undefined, answers?: Readonly<Record<string, string | string[]>>): boolean {
  if (!cond || !answers || !(cond.field in answers)) return false;
  const value = answers[cond.field];
  if (typeof value !== 'string') return false;
  const want = cond.equals.trim().toLowerCase();
  if (want === 'both') return isBothAnswer(value);
  return value.trim().toLowerCase() === want;
}

export const checkVisible = (b: CheckBlock, answers?: Readonly<Record<string, string | string[]>>): boolean => !conditionMet(b.hideIf, answers);

/** `step:6:s6-google` is another step's item. Anything else is an id on this step. */
export function parseDepend(raw: string): { cross: false; itemId: string } | { cross: true; stepN: number; itemId: string } | null {
  const id = raw.trim();
  if (!id) return null;
  const m = CROSS.exec(id);
  if (m) return { cross: true, stepN: Number(m[1]), itemId: m[2]! };
  if (ITEM_ID.test(id)) return { cross: false, itemId: id };
  return null;
}

/**
 * The first cross-step dependency that is not checked yet, as that step's number.
 * A missing step or item is waiting, never an error. A same-step dependency does not wait: it only
 * orders the list, and it does not block the checkbox.
 */
export function waitingOn(dependsOn: readonly string[] | undefined, satisfied: (stepN: number, itemId: string) => boolean): number | null {
  for (const raw of dependsOn ?? []) {
    const d = parseDepend(raw);
    if (d && d.cross && !satisfied(d.stepN, d.itemId)) return d.stepN;
  }
  return null;
}

/** Checks held in the browser for a staff preview (D-194). Nothing here is written. */
export interface LocalChecks {
  checks: ChecklistMark[];
  video: VideoProgress[];
}

const byMark = (a: ChecklistMark, b: ChecklistMark): number =>
  a.moduleId.localeCompare(b.moduleId) || a.stepId.localeCompare(b.stepId) || a.itemId.localeCompare(b.itemId);

/**
 * D-194: flip one checklist mark in memory. The same row the learner mutation stores, including a
 * sub-check id (`item:sub`). A staff preview uses this and does not call that mutation.
 */
export function localToggle(draft: LocalChecks, mark: { moduleId: string; stepId: string; itemId: string }, now: number): LocalChecks {
  const list = draft.checks.map((c) => ({ ...c }));
  const i = list.findIndex((x) => x.moduleId === mark.moduleId && x.stepId === mark.stepId && x.itemId === mark.itemId);
  const checked = i < 0 || !list[i]!.checked;
  const row: ChecklistMark = {
    moduleId: mark.moduleId,
    stepId: mark.stepId,
    itemId: mark.itemId,
    checked,
    auto: false,
    ...(checked ? { checkedAt: now } : {}),
  };
  if (i >= 0) list[i] = row;
  else list.push(row);
  list.sort(byMark);
  return { checks: list, video: draft.video };
}

/**
 * D-194: remember a video's place in memory, and check the items whose line it just crossed.
 * Same rule as `saveVideoProgress`: `maxPct` only rises, and a crossing checks each item once.
 * A bad portion is ignored. A staff preview uses this and does not call that mutation.
 */
export function localWatch(
  draft: LocalChecks,
  steps: readonly Step[],
  args: { moduleId: string; videoId: string; maxPct: number; lastPositionS: number },
  now: number,
): LocalChecks {
  if (!args.videoId.trim() || args.videoId.length > 300) return draft;
  if (!Number.isFinite(args.maxPct) || args.maxPct < 0 || args.maxPct > 1) return draft;
  if (!Number.isFinite(args.lastPositionS) || args.lastPositionS < 0 || args.lastPositionS > 86_400) return draft;
  const prevPct = draft.video.find((p) => p.moduleId === args.moduleId && p.videoId === args.videoId)?.maxPct ?? 0;
  const maxPct = Math.max(prevPct, args.maxPct);
  const due = autoTargets(steps, args.videoId).filter((t) => crossesWatch(prevPct, maxPct, t.at));
  const video = draft.video.filter((p) => !(p.moduleId === args.moduleId && p.videoId === args.videoId));
  video.push({ moduleId: args.moduleId, videoId: args.videoId, maxPct, lastPositionS: args.lastPositionS, updatedAt: now });
  video.sort((a, b) => a.moduleId.localeCompare(b.moduleId) || a.videoId.localeCompare(b.videoId));
  const list = draft.checks.map((c) => ({ ...c }));
  for (const t of due) {
    const i = list.findIndex((x) => x.moduleId === args.moduleId && x.stepId === t.stepId && x.itemId === t.itemId);
    if (i >= 0 && list[i]!.checked) continue;
    const mark: ChecklistMark = { moduleId: args.moduleId, stepId: t.stepId, itemId: t.itemId, checked: true, auto: true, checkedAt: now };
    if (i >= 0) list[i] = mark;
    else list.push(mark);
  }
  list.sort(byMark);
  return { checks: list, video };
}

export type StepCheckStatus = 'done' | 'progress' | 'waiting' | 'idle';

/**
 * One step's checklist status (D-190, used by the Start Here card in D-195). Done wins. Any checked
 * box, including one task of a sub-check item, is in progress. A step with nothing checked that is
 * waiting on another step is waiting. Otherwise it has not been started.
 */
export function stepChecklistStatus(done: boolean, blocks: readonly PathBlock[], anyChecked: boolean, isChecked: (itemId: string) => boolean, isWaiting: (b: CheckBlock) => boolean): StepCheckStatus {
  if (done) return 'done';
  const items = blocks.filter(isCheck);
  if (anyChecked || items.some((b) => itemChecked(b, isChecked))) return 'progress';
  if (items.some((b) => isWaiting(b))) return 'waiting';
  return 'idle';
}

/** An item with sub-checks is checked when every sub-check is. Any other item is its own row. */
export function itemChecked(b: CheckBlock, checked: (itemId: string) => boolean): boolean {
  const subs = b.subchecks ?? [];
  if (subs.length) return subs.every((s) => checked(`${b.id}:${s.id}`));
  return checked(b.id);
}

export interface CheckCounts {
  done: number;
  total: number;
  /** True when the count is a sub-check item's tasks ("4 of 7 tasks timed") rather than items. */
  tasks: boolean;
}

/**
 * The progress bar. A path with a sub-check item counts that item's tasks (the first such item).
 * Otherwise it counts visible checklist items. Hidden items are out; optional items stay in the count.
 */
export function progressCounts(blocks: readonly PathBlock[], checked: (itemId: string) => boolean, answers?: Readonly<Record<string, string | string[]>>): CheckCounts {
  const items = blocks.filter(isCheck).filter((b) => checkVisible(b, answers));
  const tasks = items.find((b) => (b.subchecks?.length ?? 0) > 0);
  if (tasks) {
    const subs = tasks.subchecks ?? [];
    return { done: subs.filter((s) => checked(`${tasks.id}:${s.id}`)).length, total: subs.length, tasks: true };
  }
  return { done: items.filter((b) => conditionMet(b.collapseIf, answers) || itemChecked(b, checked)).length, total: items.length, tasks: false };
}

/**
 * How many visible, non-optional items are still unchecked. A waiting item counts once it is checked.
 * Auto items count the same way until video progress checks them. Staff preview does not use this.
 */
export function gateRemaining(blocks: readonly PathBlock[], checked: (itemId: string) => boolean, answers?: Readonly<Record<string, string | string[]>>): number {
  return blocks.filter(isCheck).filter((b) => checkVisible(b, answers)).filter((b) => !b.optional && !conditionMet(b.collapseIf, answers) && !itemChecked(b, checked)).length;
}

export interface CheckGroup {
  item: CheckBlock;
  /** Callouts that sit directly under this item in the path. */
  callouts: CalloutBlock[];
}

export interface PathRegions {
  videos: VideoBlock[];
  /** Callouts that appear before the first checklist item. */
  leading: CalloutBlock[];
  groups: CheckGroup[];
  accordions: AccordionBlock[];
  /** Paragraphs, copy boxes, lists and tables on a checklist path. Still shown, so a save cannot hide them. */
  extras: ContentBlock[];
}

/** Split a path into the one-step regions. Callouts bind to the checklist item above them. */
export function pathRegions(blocks: readonly PathBlock[]): PathRegions {
  const videos: VideoBlock[] = [];
  const leading: CalloutBlock[] = [];
  const groups: CheckGroup[] = [];
  const accordions: AccordionBlock[] = [];
  const extras: ContentBlock[] = [];
  let current: CheckGroup | null = null;
  for (const b of blocks) {
    if (b.type === 'video') videos.push(b);
    else if (b.type === 'accordion') accordions.push(b);
    else if (b.type === 'check') {
      current = { item: b, callouts: [] };
      groups.push(current);
    } else if (b.type === 'callout') {
      if (current) current.callouts.push(b);
      else leading.push(b);
    } else extras.push(b);
  }
  return { videos, leading, groups: orderGroups(groups), accordions, extras };
}

/**
 * Same-step dependencies come first when the path's own order doesn't already put them there.
 * A cycle, or a dependency that isn't on this path, keeps the original order.
 */
export function orderGroups(groups: readonly CheckGroup[]): CheckGroup[] {
  const ids = new Set(groups.map((g) => g.item.id));
  const index = new Map(groups.map((g, i) => [g.item.id, i]));
  const after = new Map<string, string[]>();
  const need = new Map<string, number>();
  for (const g of groups) {
    need.set(g.item.id, 0);
    after.set(g.item.id, []);
  }
  for (const g of groups) {
    for (const raw of g.item.dependsOn ?? []) {
      const d = parseDepend(raw);
      if (!d || d.cross || d.itemId === g.item.id || !ids.has(d.itemId)) continue;
      after.get(d.itemId)!.push(g.item.id);
      need.set(g.item.id, (need.get(g.item.id) ?? 0) + 1);
    }
  }
  const ready = groups.map((g) => g.item.id).filter((id) => need.get(id) === 0);
  ready.sort((a, b) => index.get(a)! - index.get(b)!);
  const out: string[] = [];
  while (ready.length) {
    const id = ready.shift()!;
    out.push(id);
    for (const next of after.get(id) ?? []) {
      const left = (need.get(next) ?? 1) - 1;
      need.set(next, left);
      if (left === 0) {
        ready.push(next);
        ready.sort((a, b) => index.get(a)! - index.get(b)!);
      }
    }
  }
  if (out.length !== groups.length) return [...groups];
  const byId = new Map(groups.map((g) => [g.item.id, g]));
  return out.map((id) => byId.get(id)!);
}

/** Ids of the checklist items on one step, both paths. */
export function stepCheckIds(paths: { claude?: { blocks: readonly PathBlock[] }; chatgpt?: { blocks: readonly PathBlock[] } } | undefined): string[] {
  const ids: string[] = [];
  for (const which of ['claude', 'chatgpt'] as const) {
    for (const b of paths?.[which]?.blocks ?? []) if (b.type === 'check' && b.id) ids.push(b.id);
  }
  return ids;
}

const linkOk = (href: string): boolean => {
  const h = href.trim();
  if (h.startsWith('/') && !h.startsWith('//')) return true;
  if (/^mailto:[^\s]+$/.test(h)) return true;
  try {
    const u = new URL(h);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * What a save is refused for, beyond the copy rules: an id that is empty, repeated, or not a safe
 * token; a same-step dependency that isn't an item on the step; a link that isn't a route, a mailto
 * or an http(s) address. A `step:N:id` dependency is allowed even when that step has no such item yet.
 */
export function checklistIssueLines(
  steps: readonly { paths?: { claude?: { blocks: readonly PathBlock[] }; chatgpt?: { blocks: readonly PathBlock[] } } }[],
): string[] {
  const out: string[] = [];
  steps.forEach((s, i) => {
    const step = `Step ${i + 1}`;
    const seen = new Map<string, string>();
    for (const which of ['claude', 'chatgpt'] as const) {
      const blocks = s.paths?.[which]?.blocks ?? [];
      const path = which === 'claude' ? 'Claude' : 'ChatGPT';
      blocks.forEach((b, j) => {
        if (b.type !== 'check') return;
        const where = `${step}, ${path} path, block ${j + 1}`;
        if (!b.id.trim()) out.push(`${where}: Give this checklist item an id.`);
        else if (!ITEM_ID.test(b.id)) out.push(`${where}: Use letters, numbers, hyphens or underscores in the id.`);
        else if (seen.has(b.id)) out.push(`${where}: “${b.id}” is already used on this step (${seen.get(b.id)}).`);
        else seen.set(b.id, where);
        const subs = new Set<string>();
        for (const sub of b.subchecks ?? []) {
          if (!ITEM_ID.test(sub.id)) out.push(`${where}: Give each task an id of letters, numbers, hyphens or underscores.`);
          else if (subs.has(sub.id)) out.push(`${where}: Task “${sub.id}” is listed twice.`);
          else subs.add(sub.id);
        }
        if (b.action?.type === 'link' && b.action.href.trim() && !linkOk(b.action.href)) {
          out.push(`${where}: Use a route, a mailto or an http or https link.`);
        }
      });
    }
    const ids = new Set(seen.keys());
    for (const which of ['claude', 'chatgpt'] as const) {
      const blocks = s.paths?.[which]?.blocks ?? [];
      const path = which === 'claude' ? 'Claude' : 'ChatGPT';
      blocks.forEach((b, j) => {
        if (b.type !== 'check') return;
        const where = `${step}, ${path} path, block ${j + 1}`;
        for (const raw of b.dependsOn ?? []) {
          const d = parseDepend(raw);
          if (!d) out.push(`${where}: “${raw.trim()}” is not an item id. Use an id from this step, or step:N:id.`);
          else if (!d.cross && !ids.has(d.itemId)) out.push(`${where}: “${d.itemId}” is not an item on this step.`);
        }
      });
    }
  });
  return out;
}
