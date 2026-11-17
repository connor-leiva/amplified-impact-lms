// The R2 mockup's remaining Build controls, made real (D-172): each one a pure function beside the
// reference-ported mutations (`mutations.ts`, unchanged), with the same shape — `(db, actor, args,
// ctx)` in, a NEW db out through immer — plus the ONE audit row the write owes (`audit`). The API runs
// them on `POST /api/admin/actions/:name` inside `/api/mutate`'s transaction shape and writes that row
// in the same transaction; the fixture build runs them in the browser, as it runs the mutations.
//
// They are NOT in `mutations.ts`: that module is the prototype's catalog (37 mutations, compared both
// ways by the oracle), and these have no prototype counterpart. Who may run each is the existing
// `PermKey` rule (`requirePerm`), exactly as the mutation beside it: `curriculum` for the curriculum
// and the vault, `cohorts` for sessions, `announce` for announcements.
//
// Conventions, the mutations' own:
//   - Validation the UI renders inline returns `{ db, error }` with the db untouched and no audit.
//   - Authorization and programming failures THROW `MutationError` (403, 404, 422 over HTTP).
//   - `audit` is set only when something was written. Its payloads hold names, ids, counts and
//     statuses, never an email address or anything secret (the API's `redactAuditPayload` runs too).

import { produce } from 'immer';
import { requirePerm } from './can';
import type { AuditAction } from './console';
import { MutationError, saveModule } from './mutations';
import type { Actor, Ctx, Outcome } from './mutations';
import type { AIEmployee, Db, ModuleStatus, Step } from './types';

/** The one audit row a write owes: what, on which thing, and before and after where it applies. */
export interface AdminAudit {
  action: AuditAction;
  target: { type: string; id: string; label: string };
  before?: unknown;
  after?: unknown;
}

/** A mutation's outcome, plus its audit row when it wrote something. */
export interface AdminOutcome extends Outcome {
  audit?: AdminAudit;
}

const moduleOf = (db: Db, id: string): AIEmployee => {
  const m = db.modules.find((x) => x.id === id);
  if (!m) throw new MutationError('not_found', `No AI Employee ${id}`);
  return m;
};

// ================================================================================================
// 1 · Curriculum › Duplicate (the mockup's row "…")
// ================================================================================================

/** What a duplicate is called: the original's name and " (copy)". */
export const copyName = (name: string): string => `${name} (copy)`;

/**
 * A copy of an AI Employee as a DRAFT: every step, setting, tier, file and resource entry, the live
 * session it is linked to, its prompt and notes. New id, " (copy)" after the name, last in the
 * curriculum, no opening day. Learners never see a draft, so nothing reaches them until it is
 * published. Toast: the mockup's "Duplicated as a draft".
 */
export function duplicateModule(db: Db, a: Actor, args: { id: string }, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'curriculum');
  const m = moduleOf(db, args.id);
  const id = c.id('m');
  const copy = JSON.parse(JSON.stringify(m)) as AIEmployee;
  copy.id = id;
  copy.name = copyName(m.name);
  copy.status = 'draft';
  copy.opens = null;
  copy.order = Math.max(0, ...db.modules.map((x) => x.order)) + 1;
  return {
    db: produce(db, (d) => {
      d.modules.push(copy);
    }),
    toast: { msg: 'Duplicated as a draft', tone: 'success' },
    audit: {
      action: 'module.duplicate',
      target: { type: 'module', id, label: copy.name },
      before: { from: m.id, name: m.name, status: m.status },
      after: { id, name: copy.name, status: 'draft', tier: copy.tier, steps: copy.checklist.length, files: copy.files.length },
    },
  };
}

// ================================================================================================
// 2 · Module Builder: Add step, Duplicate step, Remove step, and the save that persists them
// ================================================================================================
//
// The steps are the builder's DRAFT, as every other field there is (phase 06 § 6.3): Add step,
// Duplicate step and Remove step change the draft and mark it unsaved, exactly as the mockup's
// `setSteps(…); setDirty(true)`, so Discard (the unsaved-changes prompt) undoes them and nothing is
// half-written. "Save changes" persists the draft through `saveBuilderModule`: core's own
// `saveModule` (unchanged: its checks, its renumbering, its toast), then the learners' progress kept
// on the same steps, then ONE `module.save` audit row with the step changes.

/** The mockup's new step: `['Build', 'New step', '5 min']`. */
export const NEW_STEP: Readonly<Omit<Step, 'id'>> = { text: 'New step', ch: '', mins: 5, t: 0, hint: '', kind: 'Build' };

/** An id no step in the draft has: `new-1`, `new-2`, … Never `c…`, so a save can tell new from kept. */
export function freshStepId(list: readonly Step[]): string {
  const used = new Set(list.map((s) => s.id));
  let n = 1;
  while (used.has(`new-${n}`)) n++;
  return `new-${n}`;
}

/** Add step: the mockup's new step, last. */
export const addStep = (list: readonly Step[]): Step[] => [...list, { id: freshStepId(list), ...NEW_STEP }];

/** Duplicate step: a copy of step `i`, last (the mockup's `[...steps, [...s]]`), with an id of its own. */
export function duplicateStep(list: readonly Step[], i: number): Step[] {
  const s = list[i];
  if (!s) return [...list];
  return [...list, { ...s, id: freshStepId(list) }];
}

/** Remove step: step `i` gone, the rest in order. */
export const removeStep = (list: readonly Step[], i: number): Step[] => list.filter((_, j) => j !== i);

/**
 * How a save moves step ids: each kept step's old id → the `c{n}` `saveModule` gives its new place.
 * A step whose id the stored module did not have (added, duplicated) maps from nothing.
 */
export function stepIdMap(stored: readonly Step[], draft: readonly Step[]): Map<string, string> {
  const had = new Set(stored.map((s) => s.id));
  const map = new Map<string, string>();
  draft.forEach((s, i) => {
    if (had.has(s.id) && !map.has(s.id)) map.set(s.id, `c${i + 1}`);
  });
  return map;
}

/** The step changes a save makes, for its audit row. */
export function stepChanges(stored: readonly Step[], draft: readonly Step[]): { added: number; removed: number; reordered: boolean } {
  // A kept step is the first draft step with a stored id, as `stepIdMap` counts it; a repeat is new.
  const kept = [...stepIdMap(stored, draft).keys()];
  const keptSet = new Set(kept);
  const order = stored.map((s) => s.id).filter((id) => keptSet.has(id));
  return {
    added: draft.length - kept.length,
    removed: stored.filter((s) => !keptSet.has(s.id)).length,
    reordered: kept.some((id, i) => id !== order[i]),
  };
}

const moduleSummary = (m: AIEmployee) => ({
  name: m.name,
  status: m.status,
  tier: m.tier,
  steps: m.checklist.length,
  files: m.files.length,
});

/**
 * The Module Builder's Save (and its Status menu): `saveModule`, then every learner's checked steps
 * kept on the same steps (a removed step's check goes; the others follow their step to its new
 * `c{n}`), then one `module.save` audit row. Nothing else of a learner's progress is touched.
 */
export function saveBuilderModule(db: Db, a: Actor, args: { draft: AIEmployee; status?: ModuleStatus }, c: Ctx): AdminOutcome {
  const stored = db.modules.find((m) => m.id === args.draft.id) ?? null;
  const out = saveModule(db, a, args, c);
  if (out.error) return out;
  const saved = out.db.modules.find((m) => m.id === args.draft.id)!;
  const draftSteps = args.draft.checklist ?? [];
  const map = stored ? stepIdMap(stored.checklist, draftSteps) : new Map<string, string>();
  const moves = stored !== null && stored.checklist.some((s) => map.get(s.id) !== s.id);
  const next = moves
    ? produce(out.db, (d) => {
        for (const u of d.users) {
          const p = u.progress?.[saved.id];
          if (!p) continue;
          p.steps = p.steps.flatMap((id) => {
            const to = map.get(id);
            return to === undefined ? [] : [to];
          });
        }
      })
    : out.db;
  return {
    ...out,
    db: next,
    audit: {
      action: 'module.save',
      target: { type: 'module', id: saved.id, label: saved.name },
      before: stored ? moduleSummary(stored) : null,
      after: { ...moduleSummary(saved), stepChanges: stepChanges(stored?.checklist ?? [], draftSteps) },
    },
  };
}

// ================================================================================================
// The catalog
// ================================================================================================

/** Every audited Build action, by the name `POST /api/admin/actions/:name` and the repository use. */
export const ADMIN_ACTIONS = {
  duplicateModule,
  saveBuilderModule,
};

export type AdminActionName = keyof typeof ADMIN_ACTIONS;
export type AdminActionArgs<K extends AdminActionName> = Parameters<(typeof ADMIN_ACTIONS)[K]>[2];

export const isAdminActionName = (name: string): name is AdminActionName => Object.prototype.hasOwnProperty.call(ADMIN_ACTIONS, name);
