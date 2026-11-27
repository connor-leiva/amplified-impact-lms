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
import { adminDay, fromAdminLocal } from './admin-build';
import { rosterLearners, rosterTeams } from './cohort-roster';
import { can, requirePerm } from './can';
import type { AuditAction } from './console';
import { EXEC_CATEGORIES } from './constants';
import { MutationError, publishReplay, saveModule, uploadResource } from './mutations';
import { UPLOAD_POLICY, fileSizeLabel, isUploadKey, isUploadType, nameMatchesType } from './uploads';
import type { Actor, Ctx, Outcome } from './mutations';
import { fmt } from './time';
import { withoutRetired } from './course-retired';
import { changedFields, checklistIssues, copyIssues, diffSummary, issueLine, moduleCopyFields, tourIssues, videoIssues } from './course-rules';
import { deleteSession, saveCohortCourse, saveCohortPlan, saveCopyString, saveProgramCourse, saveSession } from './course-actions';
import { saveCohortEnrollment, saveCohortPrice } from './cohort-selling';
import {
  addCohortSessions,
  archiveCohort,
  closeCohortEnrollment,
  createCohortFromShape,
  keepCohortOverlap,
  openCohortEnrollment,
  saveCohortHosts,
  saveCohortIncluded,
  saveCohortRun,
  saveCohortShape,
  saveCohortWords,
} from './cohort-actions';
import type { CohortActionResult } from './cohort-actions';
import { moduleVersion } from './module-version';
import type { AIEmployee, Announcement, Cohort, Db, ModuleStatus, Resource, ResourceKind, ResourcePlatform, ResourceVisibility, Session, Step, Tier } from './types';

/** The one audit row a write owes: what, on which thing, and before and after where it applies. */
export interface AdminAudit {
  action: AuditAction;
  target: { type: string; id: string; label: string };
  before?: unknown;
  after?: unknown;
}

/**
 * D-188: a stored file the write put on a vault row. `Db` never holds a storage key (§ 7.4 strips it from
 * every snapshot and `codec.ts` leaves it out), so the API writes it to `resources.storage_key` and
 * `resources.file_name` itself, in the same transaction, and records the key it replaced in the audit
 * row. The fixture build has no bucket and ignores it.
 */
export interface AdminStorageWrite {
  resourceId: string;
  key: string;
  fileName: string;
}

/** A mutation's outcome, plus its audit row when it wrote something. */
export interface AdminOutcome extends Outcome {
  audit?: AdminAudit;
  storage?: AdminStorageWrite;
  /** D-247: set by `saveBuilderModule`: the saved module's new version and step ids, for the builder. */
  saved?: SavedModuleRef;
  /** R-5 (D-254): set by a cohort write: the cohort, its layout's warnings, and the sessions left as they were. */
  cohort?: CohortActionResult;
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
// `saveModule` (unchanged: its checks and its toast), then the step ids kept stable, then ONE
// `module.save` audit row with the step changes.
//
// D-247 (H-5): a step's id no longer moves. `saveModule` (the reference's) still numbers the steps
// `c1…cN`, and `saveBuilderModule` then gives every kept step back the id it had, so a learner's
// checks (`checklist_state`), their checked steps (`progress.steps`), their remembered accordions
// (`acc:<module>:<step>:<n>`) and a kit item's `stepId` stay on the step they were made on through a
// reorder, a removal or an insert. A new step gets `c{n}` past every id the module or any of those
// records still names, so nothing old can attach to it. The step page's address is the step's
// position (`/learn/week/:week/step/:n`), not its id, so it is unaffected.

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

/** The `n` of a `c{n}` step id, or 0 for any other id. */
const stepNumber = (id: string): number => {
  const m = /^c(\d+)$/.exec(id);
  return m ? Number(m[1]) : 0;
};

/**
 * D-247: every step id this module's records still name: the stored steps, the draft's, and every id a
 * learner's checked steps, checks or remembered accordions, or a kit item attached to it, carries. A
 * new step's id is past all of them.
 */
export function usedStepIds(db: Db, moduleId: string, ...lists: readonly (readonly Step[])[]): Set<string> {
  const used = new Set<string>();
  for (const list of lists) for (const s of list) used.add(s.id);
  const acc = `acc:${moduleId}:`;
  for (const u of db.users) {
    for (const id of u.progress?.[moduleId]?.steps ?? []) used.add(id);
    for (const c of u.checks ?? []) if (c.moduleId === moduleId) used.add(c.stepId);
    for (const p of u.coursePrefs ?? []) {
      if (!p.key.startsWith(acc)) continue;
      const rest = p.key.slice(acc.length);
      const cut = rest.lastIndexOf(':');
      if (cut > 0) used.add(rest.slice(0, cut));
    }
  }
  for (const r of db.resources) if (r.module === moduleId && r.stepId) used.add(r.stepId);
  return used;
}

/**
 * D-247: the id each draft step is saved with, in order. A kept step (the first draft step with a stored
 * id) keeps that id; any other (added, duplicated, a repeat) gets `c{n}`, past every id in `used`.
 * A new module has no stored steps, so it is numbered `c1…cN`, as `saveModule` numbers it.
 */
export function savedStepIds(stored: readonly Step[], draft: readonly Step[], used: ReadonlySet<string> = new Set()): string[] {
  const had = new Set(stored.map((s) => s.id));
  const kept = new Set<string>();
  let n = Math.max(0, ...[...used].map(stepNumber), ...stored.map((s) => stepNumber(s.id)));
  return draft.map((s) => {
    if (had.has(s.id) && !kept.has(s.id)) {
      kept.add(s.id);
      return s.id;
    }
    n += 1;
    return `c${n}`;
  });
}

/** The step changes a save makes, for its audit row. */
export function stepChanges(stored: readonly Step[], draft: readonly Step[]): { added: number; removed: number; reordered: boolean } {
  // A kept step is the first draft step with a stored id, as `savedStepIds` counts it; a repeat is new.
  const had = new Set(stored.map((s) => s.id));
  const kept: string[] = [];
  for (const s of draft) if (had.has(s.id) && !kept.includes(s.id)) kept.push(s.id);
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

/** What the builder calls the module in a sentence: a week or an AI Employee. */
const moduleNoun = (m: Pick<AIEmployee, 'kind'>): string => (m.kind === 'week' ? 'week' : 'AI Employee');

/**
 * D-247 (H-6): what a stale save says. The draft stays on screen, so nothing typed is lost.
 */
export const staleSaveMessage = (m: Pick<AIEmployee, 'kind'>): string =>
  `Someone changed this ${moduleNoun(m)} since you opened it. Copy your changes, reload the page, and save again.`;

/**
 * D-247 (H-8): what a save says to someone without the Publish modules permission. Saving a module that
 * is Published or Scheduled (or publishing one) needs it; the roles that lack it are not changed here.
 */
export const publishNeededMessage = (m: Pick<AIEmployee, 'kind'>, status?: ModuleStatus): string =>
  status === 'published'
    ? 'Publishing needs the “Publish modules” permission. Ask an Owner or Admin.'
    : `Saving a published or scheduled ${moduleNoun(m)} needs the “Publish modules” permission. Ask an Owner or Admin.`;

/** Whether this save publishes, exactly as `saveModule` decides it (and so needs `publish`). */
export const savePublishes = (draft: Pick<AIEmployee, 'status'>, status?: ModuleStatus): boolean =>
  status === 'published' || (status === undefined && draft.status !== 'draft');

/** D-247: what the builder needs back from a save: the module, its new version, and its step ids in order. */
export interface SavedModuleRef {
  id: string;
  version: string;
  stepIds: string[];
}

/**
 * The Module Builder's Save (and its Status menu): `saveModule`, then the step ids kept stable (D-247),
 * then one `module.save` audit row.
 *
 * `base` (D-247, H-6) is the version of the module the draft was opened from (`moduleVersion`), or null
 * for a module that did not exist. When it is given and the stored module is no longer that version,
 * nothing is written and it throws `MutationError('conflict')`. So a repeated request, a second tab or a
 * second editor can't apply a save over a newer one. The API requires it; a caller that omits it is not
 * checked (the fixture's own tests, and core's).
 *
 * A removed step's id comes off every learner's checked steps (so a build is counted on the steps there
 * are) and off a kit item that pointed at it (so the item can be given another step). Nothing else of a
 * learner's progress is touched: their checks and remembered accordions stay on the steps they were made
 * on, because those steps keep their ids.
 */
export function saveBuilderModule(
  db: Db,
  a: Actor,
  given: { draft: AIEmployee; status?: ModuleStatus; base?: string | null },
  c: Ctx,
): AdminOutcome {
  // D-220, D-221: the retired course fields (the promise, the old setup order, a kit skill's use line) are
  // dropped, never stored again.
  const draft = withoutRetired(given.draft);
  const args: { draft: AIEmployee; status?: ModuleStatus } = given.status === undefined ? { draft } : { draft, status: given.status };
  const stored = db.modules.find((m) => m.id === args.draft.id) ?? null;
  if (given.base !== undefined) {
    requirePerm(db, a, 'curriculum');
    const current = stored ? moduleVersion(stored) : null;
    if (given.base !== current) throw new MutationError('conflict', staleSaveMessage(stored ?? args.draft));
  }
  // D-174: every learner-facing string this save changes passes the copy rules; one it leaves alone
  // never refuses it. Checked before `saveModule`, so a refusal writes nothing.
  const issues = copyIssues(changedFields(stored ? moduleCopyFields(stored) : [], moduleCopyFields(args.draft)));
  // D-188: a video block plays an uploaded mp4 or an http(s) link, and nothing else. D-252: the LMS tour is one
  // uploaded video with a transcript, in Week 0's Media, across the whole course.
  const videos = [...videoIssues(args.draft), ...tourIssues(args.draft, db.modules)];
  // D-190: checklist ids, same-step dependencies and links. Copy rules already cover the words.
  const checks = checklistIssues(args.draft);
  if (issues.length || videos.length || checks.length) {
    requirePerm(db, a, 'curriculum');
    return { db, error: [...issues.map(issueLine), ...videos, ...checks].join('\n') };
  }
  // D-247 (H-8): `saveModule` refuses a save that publishes without the Publish modules permission with
  // the generic "You don't have permission"; this says which permission, and who has it.
  if (savePublishes(args.draft, args.status) && !can(db, a, 'publish')) {
    requirePerm(db, a, 'curriculum');
    throw new MutationError('forbidden', publishNeededMessage(args.draft, args.status));
  }
  const out = saveModule(db, a, args, c);
  if (out.error) return out;
  const id = args.draft.id;
  const draftSteps = args.draft.checklist ?? [];
  const storedSteps = stored?.checklist ?? [];
  const ids = savedStepIds(storedSteps, draftSteps, usedStepIds(db, id, storedSteps, draftSteps));
  const live = new Set(ids);
  const removed = new Set(storedSteps.map((s) => s.id).filter((x) => !live.has(x)));
  let kitCleared = 0;
  const next = produce(out.db, (d) => {
    const m = d.modules.find((x) => x.id === id)!;
    m.checklist.forEach((s, i) => {
      if (s.id !== ids[i]) s.id = ids[i]!;
    });
    if (!removed.size) return;
    for (const u of d.users) {
      const p = u.progress?.[id];
      if (p && p.steps.some((x) => removed.has(x))) p.steps = p.steps.filter((x) => !removed.has(x));
    }
    for (const r of d.resources) {
      if (r.module === id && r.stepId && removed.has(r.stepId)) {
        delete r.stepId;
        kitCleared += 1;
      }
    }
  });
  const saved = next.modules.find((m) => m.id === id)!;
  return {
    ...out,
    db: next,
    saved: { id, version: moduleVersion(saved), stepIds: ids },
    audit: {
      action: 'module.save',
      target: { type: 'module', id: saved.id, label: saved.name },
      before: stored ? moduleSummary(stored) : null,
      // D-174: the field-diff summary, where the module changed (paths only, never values).
      after: {
        ...moduleSummary(saved),
        stepChanges: stepChanges(storedSteps, draftSteps),
        ...(kitCleared ? { kitCleared } : {}),
        ...diffSummary(stored ?? {}, saved),
      },
    },
  };
}

// ================================================================================================
// 3 · Resource Vault › Edit details (the mockup's row "…"), and "Attached to"
// ================================================================================================

const resourceOf = (db: Db, id: string): Resource => {
  const r = db.resources.find((x) => x.id === id);
  if (!r) throw new MutationError('not_found', `No resource ${id}`);
  return r;
};

const resourceSummary = (db: Db, r: Resource) => ({
  title: r.title,
  cat: r.cat,
  tier: r.tier,
  module: r.module ?? null,
  attachedTo: r.module ? (db.modules.find((m) => m.id === r.module)?.name ?? null) : null,
});

/**
 * Edit details: a resource's title, description, category, tier access and the AI Employee it is
 * attached to (`module`, an AI Employee's id, or null for none: the Vault's "Attached to"). The rules
 * are `uploadResource`'s: a title is required, and an executive category is always Team only. The
 * file, its size and its opens are not touched.
 */
/** D-174: a kit item's place in its week: what it is, the step it belongs to, who sees it and when, its platform. */
export interface ResourceKit {
  kind: ResourceKind | null;
  stepId: string | null;
  visibility: ResourceVisibility | null;
  platform: ResourcePlatform | null;
}

export const kitOf = (r: Resource): ResourceKit => ({ kind: r.kind ?? null, stepId: r.stepId ?? null, visibility: r.visibility ?? null, platform: r.platform ?? null });

export function editResource(
  db: Db,
  a: Actor,
  args: { id: string; title: string; desc: string; cat: string; tier: Tier; module: string | null; kit?: ResourceKit },
  _c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'curriculum');
  const r = resourceOf(db, args.id);
  const title = (args.title || '').trim();
  if (!title) return { db, error: 'Add a title.' };
  const attached = args.module !== null ? moduleOf(db, args.module) : null;
  // D-174: a kit item's step is a step of the week it is attached to.
  if (args.kit?.stepId) {
    if (!attached) return { db, error: 'Attach it to a week before you pick a step.' };
    if (!attached.checklist.some((x) => x.id === args.kit!.stepId)) throw new MutationError('invalid', `No step ${args.kit.stepId} in ${attached.id}`);
  }
  const exec = EXEC_CATEGORIES.includes(args.cat);
  const next = produce(db, (d) => {
    const x = d.resources.find((y) => y.id === r.id)!;
    x.title = title;
    x.desc = (args.desc || '').trim() || r.desc;
    x.cat = args.cat;
    x.exec = exec;
    x.tier = exec ? 'team' : args.tier;
    if (args.module === null) delete x.module;
    else x.module = args.module;
    if (args.kit) {
      for (const k of ['kind', 'stepId', 'visibility', 'platform'] as const) {
        const v = args.kit[k];
        if (v === null) delete x[k];
        else (x as Record<string, unknown>)[k] = v;
      }
    }
  });
  const after = next.resources.find((y) => y.id === r.id)!;
  return {
    db: next,
    toast: { msg: 'Saved', tone: 'success' },
    audit: {
      action: 'vault.edit',
      target: { type: 'resource', id: r.id, label: title },
      before: { ...resourceSummary(db, r), ...(args.kit ? { kit: kitOf(r) } : {}) },
      after: { ...resourceSummary(next, after), descChanged: after.desc !== r.desc, ...(args.kit ? { kit: kitOf(after) } : {}) },
    },
  };
}

// ================================================================================================
// D-188 · Resource Vault › Publish to Vault and Replace file, with a real upload
// ================================================================================================
//
// The browser asks `POST /api/files/upload-url` for a key and a presigned PUT, puts the file in the
// bucket, then runs one of these with the key and the file's real name, size and type. The row's
// words and rules are `uploadResource`'s (core's reference mutation, which is called unchanged); what is
// new is the real size and the stored file, which the API saves on the row (`storage`) and audits.

/** The file a browser put in the bucket: the key the upload route minted, and its name, size and type. */
export interface VaultFile {
  key: string;
  name: string;
  size: number;
  type: string;
}

/** What a vault write refuses a file with, inline. */
export const VAULT_FILE_ERROR = 'Upload the file again, then save.';

const fileOk = (f: VaultFile): boolean =>
  isUploadKey(f.key) && isUploadType(f.type) && nameMatchesType(f.name, f.type) && f.name.trim() !== '' && Number.isInteger(f.size) && f.size > 0 && f.size <= UPLOAD_POLICY[f.type].max;

// The object's key is recorded as `object`: the audit log drops any field whose name says "key" (spec
// § 7.8's secret rule), and a storage key is a place in the bucket, not a secret.
const fileSummary = (f: VaultFile) => ({ name: f.name, size: f.size, type: f.type, object: f.key });

/**
 * Add resource › Publish to Vault, with the file uploaded: `uploadResource` (its title and executive
 * rules, its toast and activity line, unchanged), the row's size from the real file, and the stored file
 * on the row. Audited `vault.upload`.
 */
export function publishVaultFile(
  db: Db,
  a: Actor,
  args: { title: string; desc: string; cat: string; type: string; tier: Tier; file: VaultFile },
  c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'curriculum');
  if (!fileOk(args.file)) return { db, error: VAULT_FILE_ERROR };
  const out = uploadResource(db, a, { title: args.title, desc: args.desc, cat: args.cat, type: args.type, tier: args.tier, file: args.file.name }, c);
  if (out.error) return out;
  const added = out.db.resources[0]!;
  const next = produce(out.db, (d) => {
    d.resources[0]!.size = fileSizeLabel(args.file.size);
  });
  return {
    ...out,
    db: next,
    audit: {
      action: 'vault.upload',
      target: { type: 'resource', id: added.id, label: added.title },
      after: { ...resourceSummary(next, next.resources[0]!), type: added.type, status: added.status, file: fileSummary(args.file) },
    },
    storage: { resourceId: added.id, key: args.file.key, fileName: args.file.name },
  };
}

/**
 * A row's "…" › Replace file: the stored file swapped for the one just uploaded, the size and the
 * Updated day with it. The title, words, tier, attachment and opens stay. The old object is left in the
 * bucket, and the API records its key in the audit row (`vault.replace`).
 */
export function replaceVaultFile(db: Db, a: Actor, args: { id: string; file: VaultFile }, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'curriculum');
  const r = resourceOf(db, args.id);
  if (!fileOk(args.file)) return { db, error: VAULT_FILE_ERROR };
  const next = produce(db, (d) => {
    const x = d.resources.find((y) => y.id === r.id)!;
    x.size = fileSizeLabel(args.file.size);
    x.updated = c.now;
  });
  return {
    db: next,
    toast: { msg: 'File replaced', tone: 'success' },
    audit: {
      action: 'vault.replace',
      target: { type: 'resource', id: r.id, label: r.title },
      before: { size: r.size },
      after: { size: fileSizeLabel(args.file.size), file: fileSummary(args.file) },
    },
    storage: { resourceId: r.id, key: args.file.key, fileName: args.file.name },
  };
}

// ================================================================================================
// 4 · Cohorts & Sessions › Add session, and a session's Attach replay
// ================================================================================================

const cohortOf = (db: Db, id: string): Cohort => {
  const co = db.cohorts.find((x) => x.id === id);
  if (!co) throw new MutationError('not_found', `No cohort ${id}`);
  return co;
};

const sessionOf = (db: Db, id: string): Session => {
  const s = db.sessions.find((x) => x.id === id);
  if (!s) throw new MutationError('not_found', `No session ${id}`);
  return s;
};

/**
 * Add session: a session in the cohort the screen shows, numbered after its last, with Edit session's
 * fields. The date and time are typed in MST (BUILD-SPEC § 7) and saved as that same instant. Not live,
 * no attendance, no replay. A blank Zoom link reads "Draft" in the Zoom invite column, as a session
 * with none does.
 */
export function addSession(
  db: Db,
  a: Actor,
  args: { cohortId: string; title: string; date: string; time: string; mins: number | string; zoom: string },
  c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  const title = (args.title || '').trim();
  if (!title) return { db, error: 'Add a title.' };
  const start = fromAdminLocal(args.date, args.time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date) || !/^\d{2}:\d{2}$/.test(args.time) || Number.isNaN(start)) return { db, error: 'Pick a date and a start time.' };
  const mins = parseInt(String(args.mins), 10);
  if (!(mins > 0)) return { db, error: 'Enter the length in minutes.' };
  const n = Math.max(0, ...db.sessions.filter((x) => x.cohortId === co.id).map((x) => x.n)) + 1;
  const id = c.id('s');
  const zoom = (args.zoom || '').trim();
  return {
    db: produce(db, (d) => {
      d.sessions.push({ id, cohortId: co.id, n, title, start, mins, zoom, live: false, attended: null, replay: null, views: 0 });
    }),
    toast: { msg: `Session ${n} added`, tone: 'success' },
    audit: {
      action: 'session.create',
      target: { type: 'session', id, label: `Session ${n} · ${title}` },
      after: { cohortId: co.id, n, title, start, mins, zoomLink: zoom !== '' },
    },
  };
}

/** A replay link: an absolute `https://` URL, 2,048 characters at most. */
export function isReplayUrl(url: string): boolean {
  if (url.length > 2048 || !/^https:\/\/\S+$/.test(url)) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Attach replay: a past session's recording link. The session must have ended (not live, and past its
 * start plus its length). It records the link (`replayUrl`), and when the replay is not published yet
 * it publishes it exactly as Publish Replay does (`publishReplay`, unchanged: Replay "Ready", views
 * reset, the linked AI Employee's replay length if it had none). Publish Replay stays at its step; the
 * difference is the link. Learners' snapshots never carry the link (`scopeSnapshot`).
 */
export function attachReplay(db: Db, a: Actor, args: { sessionId: string; url: string }, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const sess = sessionOf(db, args.sessionId);
  const url = (args.url || '').trim();
  if (sess.live || sess.start + sess.mins * 60_000 > c.now) return { db, error: 'Attach a replay after the session ends.' };
  if (!isReplayUrl(url)) return { db, error: 'Enter the replay’s https:// link.' };
  const published = sess.replay === 'ready' ? db : publishReplay(db, a, { sessionId: sess.id }, c).db;
  return {
    db: produce(published, (d) => {
      d.sessions.find((x) => x.id === sess.id)!.replayUrl = url;
    }),
    toast: { msg: `Session ${sess.n} replay attached`, tone: 'success' },
    audit: {
      action: 'session.replay_attach',
      target: { type: 'session', id: sess.id, label: `Session ${sess.n} · ${sess.title}` },
      before: { replay: sess.replay, replayUrl: sess.replayUrl ?? null },
      after: { replay: 'ready', replayUrl: url },
    },
  };
}

// ================================================================================================
// 5 · Announcements: Save draft, Edit (drafts and scheduled) and Duplicate
// ================================================================================================
//
// The audit actions are `announce.*`, not the mockup's `announcement.create`: the Audit Log's Action
// select lists each action group, and "announcement" would widen that select past the mockup's
// widest option ("masquerade") and move the Audit Log's pixels. Nothing here sends: a draft is never
// sent (learners see `sent` only, and the scheduler flips only `scheduled`), and Duplicate makes a draft.

const ACTION_LABELS: Record<string, string> = { '': '', calendar: 'Update Calendar', sessions: 'Open Sessions' };

/** What the dialog carries, as `sendAnnouncement` takes it; `at` is the schedule typed in MST. */
export interface AnnouncementFields {
  title: string;
  body: string;
  audience: Announcement['audience'];
  inapp: boolean;
  email: boolean;
  severity?: Announcement['severity'];
  action?: Announcement['action'] | '';
  /** `YYYY-MM-DDTHH:MM`, MT, for a schedule. */
  at?: string;
  /**
   * R-5 audit (D-267): the cohort whose Announcements tab it is made on. It then reaches the people who count in that
   * cohort only (`announcementReaches`). Kept when it is edited.
   */
  cohortId?: string;
}

/** R-5 audit (D-267): a cohort an announcement names must exist. */
function checkAnnouncementCohort(db: Db, cohortId: string | undefined): void {
  if (cohortId !== undefined && !db.cohorts.some((co) => co.id === cohortId)) throw new MutationError('not_found', `No cohort ${cohortId}`);
}

const announcementOf = (db: Db, id: string): Announcement => {
  const an = db.announcements.find((x) => x.id === id);
  if (!an) throw new MutationError('not_found', `No announcement ${id}`);
  return an;
};

const channelsOf = (f: AnnouncementFields): Announcement['channels'] => [...(f.inapp ? ['inapp' as const] : []), ...(f.email ? ['email' as const] : [])];

const announcementSummary = (an: Announcement) => ({ title: an.title, status: an.status, audience: an.audience, channels: an.channels, at: an.at });

/** The schedule's instant from its MT `YYYY-MM-DDTHH:MM`, or `now` when it can't be read (as `sendAnnouncement`). */
const scheduleAt = (at: string | undefined, now: number): number => {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(at ?? '');
  const t = m ? fromAdminLocal(m[1]!, m[2]!) : NaN;
  return Number.isNaN(t) ? now : t;
};

/**
 * How many a send reaches, as `sendAnnouncement` counts them. R-5 audit (D-267): one that names a cohort counts the people
 * who count in it (`rosterLearners`, `rosterTeams`).
 */
export const reachOf = (db: Db, audience: Announcement['audience'], cohortId?: string): number => {
  const B = db.base;
  const people = cohortId !== undefined ? rosterLearners(db, cohortId) : db.users;
  const users = people.filter((u) => u.status !== 'invited');
  if (audience === 'agent') return B.agent + users.filter((u) => u.tier === 'agent').length;
  if (audience === 'team') return B.teamSeats + users.filter((u) => u.tier === 'team').length;
  if (audience === 'owners') return B.teams + (cohortId !== undefined ? rosterTeams(db, cohortId) : db.teams).length;
  return B.learners + users.length;
};

/** The fields as a row's content: trimmed title and body, channels, severity, the banner's action. */
const contentOf = (f: AnnouncementFields) => {
  const action = f.action || null;
  return {
    title: (f.title || '').trim(),
    body: (f.body || '').trim(),
    audience: f.audience,
    channels: channelsOf(f),
    severity: f.severity || ('info' as const),
    action,
    actionLabel: ACTION_LABELS[action || ''] ?? '',
  };
};

/** New announcement › Save draft: a draft, never sent. Toast: the mockup's "Saved as a draft". */
export function saveAnnouncementDraft(db: Db, a: Actor, args: AnnouncementFields, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'announce');
  checkAnnouncementCohort(db, args.cohortId);
  const content = contentOf(args);
  if (!content.title) return { db, error: 'Add a title.' };
  if (!content.channels.length) return { db, error: 'Pick at least one channel.' };
  const id = c.id('a');
  const row: Announcement = { id, ...(args.cohortId !== undefined ? { cohortId: args.cohortId } : {}), ...content, status: 'draft', at: c.now, opens: null };
  return {
    db: produce(db, (d) => {
      d.announcements.unshift(row);
    }),
    toast: { msg: 'Saved as a draft', tone: 'success' },
    audit: { action: 'announce.create', target: { type: 'announcement', id, label: content.title }, after: announcementSummary(row) },
  };
}

/**
 * A row's "…" › Edit, for a draft or a scheduled announcement (a sent one is history): the dialog's
 * fields, then Save draft (it stays, or becomes, a draft), Schedule (MST, saved as that instant; the
 * scheduler sends it then, as it sends every scheduled one) or Send now (sent now, as `sendAnnouncement`
 * sends). Its id and place in the list are kept.
 */
export function updateAnnouncement(db: Db, a: Actor, args: AnnouncementFields & { id: string; when: 'draft' | 'now' | 'later' }, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'announce');
  const an = announcementOf(db, args.id);
  if (an.status === 'sent') throw new MutationError('invalid', 'Sent announcements can’t be edited.');
  const content = contentOf(args);
  if (args.when === 'draft' ? !content.title : !content.title || !content.body) {
    return { db, error: args.when === 'draft' ? 'Add a title.' : 'Add a title and a message.' };
  }
  if (!content.channels.length) return { db, error: 'Pick at least one channel.' };
  const at = args.when === 'later' ? scheduleAt(args.at, c.now) : c.now;
  const status = args.when === 'draft' ? 'draft' : args.when === 'later' ? 'scheduled' : 'sent';
  const next = produce(db, (d) => {
    const x = d.announcements.find((y) => y.id === an.id)!;
    Object.assign(x, content, { status, at, opens: status === 'sent' ? 0 : null });
  });
  const reach = reachOf(db, args.audience, an.cohortId);
  const msg =
    status === 'draft'
      ? 'Saved as a draft'
      : status === 'scheduled'
        ? `Scheduled for ${adminDay(at)}`
        : `Sent to ${fmt.num(reach)} ${args.audience === 'owners' ? 'team owners' : 'learners'}${args.inapp ? '. The banner is live on their dashboards.' : ''}`;
  return {
    db: next,
    toast: { msg, tone: 'success' },
    audit: {
      action: 'announce.update',
      target: { type: 'announcement', id: an.id, label: content.title },
      before: announcementSummary(an),
      after: announcementSummary(next.announcements.find((y) => y.id === an.id)!),
    },
  };
}

/** A row's "…" › Duplicate: a copy as a draft, first in the list. Toast: the mockup's "Duplicated as a draft". */
export function duplicateAnnouncement(db: Db, a: Actor, args: { id: string }, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'announce');
  const an = announcementOf(db, args.id);
  const id = c.id('a');
  const { sessionId: _session, ...rest } = an;
  const copy: Announcement = { ...rest, channels: [...an.channels], id, status: 'draft', at: c.now, opens: null };
  return {
    db: produce(db, (d) => {
      d.announcements.unshift(copy);
    }),
    toast: { msg: 'Duplicated as a draft', tone: 'success' },
    audit: {
      action: 'announce.duplicate',
      target: { type: 'announcement', id, label: copy.title },
      before: { from: an.id, title: an.title, status: an.status },
      after: announcementSummary(copy),
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
  editResource,
  // D-188: the Vault's real uploads.
  publishVaultFile,
  replaceVaultFile,
  addSession,
  attachReplay,
  saveAnnouncementDraft,
  updateAnnouncement,
  duplicateAnnouncement,
  // D-174: the curriculum builder (`course-actions.ts`).
  saveSession,
  deleteSession,
  saveCohortPlan,
  saveCohortCourse,
  saveCopyString,
  // R-5 Phase 6 (D-265): Program › Course Settings saves the program record.
  saveProgramCourse,
  // R-5 (D-254): a cohort owns its run and its shape (`cohort-actions.ts`).
  createCohortFromShape,
  saveCohortShape,
  saveCohortRun,
  addCohortSessions,
  // R-5 Phase 3 (D-255): the Cohort page's Settings.
  saveCohortWords,
  saveCohortIncluded,
  saveCohortHosts,
  keepCohortOverlap,
  // R-5 Phase 5 (D-262): Settings › Enrollment (`cohort-selling.ts`, `cohort-actions.ts`), the `billing` permission.
  saveCohortPrice,
  saveCohortEnrollment,
  openCohortEnrollment,
  closeCohortEnrollment,
  // R-5 Phase 9 (D-270): Settings › Clean-Up's archive, the `cohorts` permission.
  archiveCohort,
};

export type AdminActionName = keyof typeof ADMIN_ACTIONS;
export type AdminActionArgs<K extends AdminActionName> = Parameters<(typeof ADMIN_ACTIONS)[K]>[2];

export const isAdminActionName = (name: string): name is AdminActionName => Object.prototype.hasOwnProperty.call(ADMIN_ACTIONS, name);

/** D-220: a module without the retired `course.promise`. Everything else is the same object. */
export function withoutPromise(m: AIEmployee): AIEmployee {
  if (!m.course || m.course.promise === undefined) return m;
  const { promise: _p, ...course } = m.course;
  return { ...m, course };
}
