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
import { requirePerm } from './can';
import type { AuditAction } from './console';
import { EXEC_CATEGORIES } from './constants';
import { MutationError, publishReplay, saveModule } from './mutations';
import type { Actor, Ctx, Outcome } from './mutations';
import { fmt } from './time';
import type { AIEmployee, Announcement, Cohort, Db, ModuleStatus, Resource, Session, Step, Tier } from './types';

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
export function editResource(
  db: Db,
  a: Actor,
  args: { id: string; title: string; desc: string; cat: string; tier: Tier; module: string | null },
  _c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'curriculum');
  const r = resourceOf(db, args.id);
  const title = (args.title || '').trim();
  if (!title) return { db, error: 'Add a title.' };
  if (args.module !== null) moduleOf(db, args.module);
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
  });
  const after = next.resources.find((y) => y.id === r.id)!;
  return {
    db: next,
    toast: { msg: 'Saved', tone: 'success' },
    audit: {
      action: 'vault.edit',
      target: { type: 'resource', id: r.id, label: title },
      before: resourceSummary(db, r),
      after: { ...resourceSummary(next, after), descChanged: after.desc !== r.desc },
    },
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
  /** `YYYY-MM-DDTHH:MM`, MST, for a schedule. */
  at?: string;
}

const announcementOf = (db: Db, id: string): Announcement => {
  const an = db.announcements.find((x) => x.id === id);
  if (!an) throw new MutationError('not_found', `No announcement ${id}`);
  return an;
};

const channelsOf = (f: AnnouncementFields): Announcement['channels'] => [...(f.inapp ? ['inapp' as const] : []), ...(f.email ? ['email' as const] : [])];

const announcementSummary = (an: Announcement) => ({ title: an.title, status: an.status, audience: an.audience, channels: an.channels, at: an.at });

/** The schedule's instant from its MST `YYYY-MM-DDTHH:MM`, or `now` when it can't be read (as `sendAnnouncement`). */
const scheduleAt = (at: string | undefined, now: number): number => {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(at ?? '');
  const t = m ? fromAdminLocal(m[1]!, m[2]!) : NaN;
  return Number.isNaN(t) ? now : t;
};

/** How many a send reaches, as `sendAnnouncement` counts them. */
const reachOf = (db: Db, audience: Announcement['audience']): number => {
  const B = db.base;
  const users = db.users.filter((u) => u.status !== 'invited');
  if (audience === 'agent') return B.agent + users.filter((u) => u.tier === 'agent').length;
  if (audience === 'team') return B.teamSeats + users.filter((u) => u.tier === 'team').length;
  if (audience === 'owners') return B.teams + db.teams.length;
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
  const content = contentOf(args);
  if (!content.title) return { db, error: 'Add a title.' };
  if (!content.channels.length) return { db, error: 'Pick at least one channel.' };
  const id = c.id('a');
  const row: Announcement = { id, ...content, status: 'draft', at: c.now, opens: null };
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
  const reach = reachOf(db, args.audience);
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
  addSession,
  attachReplay,
  saveAnnouncementDraft,
  updateAnnouncement,
  duplicateAnnouncement,
};

export type AdminActionName = keyof typeof ADMIN_ACTIONS;
export type AdminActionArgs<K extends AdminActionName> = Parameters<(typeof ADMIN_ACTIONS)[K]>[2];

export const isAdminActionName = (name: string): name is AdminActionName => Object.prototype.hasOwnProperty.call(ADMIN_ACTIONS, name);
