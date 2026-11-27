// The Admin Curriculum view-model, ported from `renderVals()` in
// design-reference/Admin Curriculum.dc.html. Contract: SCREENS § 4.2, phase 06 § 6.1-6.4.
//
// PURE: no React, no hooks, no clock read — `now` comes in. Every colour the reference computes
// inline (`upFg`, `downFg`, `aBg`, `aFg`, `tBg`, `tFg`, `st.*`, `actBg`, `actFg`, `actBd`) becomes
// a flag here and a data attribute in Curriculum.module.css, so the model carries data and the
// stylesheet carries pixels.
//
// The reference's thunks (`up`, `down`, `setAgent`, `setTeam`, `act`, `edit`, `preview`) become
// declarative descriptors; the screen turns them into @ai/core mutations and navigation.
//
// THE `db.base` RULE (phase 06 § 6.2). `base.mod[id]` is `[deployed, inProgress, notStarted]` for
// the ~134 learners the fixture does not model one by one, so Deployed is
//   d = base[0] + the modelled deployments      over
//   n = base[0] + base[1] + base[2] + the modelled pool
// There is deliberately NO branch on the data source: in http mode the API returns `ZERO_BASE`,
// and this same arithmetic then reports the live numbers.

import {
  canAccess,
  fmt,
  sessionFor,
  sessionState,
  rosterLearnersAll,
  sortedModules,
  statusOf,
} from '@ai/core';
import type { Db, IconName, ModuleStatus, Tier } from '@ai/core';

/** The reference's `stMap`: a `Draft` is `STATUS.none` relabelled, so its tone is neutral. */
const STATUS_LABEL: Record<ModuleStatus, string> = {
  published: 'Published',
  scheduled: 'Scheduled',
  draft: 'Draft',
};


export interface CurriculumRow {
  id: string;
  /** 1-based position in curriculum order. The reference uses the index, not `module.order`. */
  order: number;
  name: string;
  /** The outcome line, or the reference's placeholder when a draft has none yet. */
  sub: string;
  icon: IconName;
  /** False at the ends of the list, where the reference greys the chevron out. */
  canMoveUp: boolean;
  canMoveDown: boolean;
  tier: Tier;
  sess: string;
  sessSub: string;
  status: ModuleStatus;
  statusLabel: string;
  stSub: string;
  /**
   * `66%`, or `—` when the AI Employee is a draft or has no audience at all. The reference uses
   * this ONE string for both the label and the bar's width, so the screen passes it through as a
   * custom property: an em dash is an invalid width, which leaves the bar at `auto`, exactly as
   * the prototype renders it.
   */
  dep: string;
  /**
   * The persona the `eye` action switches to in fixture mode (phase 06 § 6.4), and the read-only
   * learner its http-mode preview tab shows (D-138, `previewUrl`).
   */
  previewAs: 'agent' | 'owner';
  actLabel: string;
  /** `publishModule` when true, `unpublishModule` when false. */
  publishes: boolean;
}

export interface CurriculumVM {
  summary: string;
  rows: CurriculumRow[];
}

/**
 * The reference reads the live session out of its cohort by number. D-265: the cohort it is handed, else the first in the
 * database (the prototype's one), no longer December's by id.
 */
export function curriculumVM(db: Db, now: number, cohortId: string = db.cohorts[0]?.id ?? ''): CurriculumVM {
  const base = db.base;
  const mods = sortedModules(db);
  // Invited people have no portal yet, so they are not part of any AI Employee's audience. Nor is anyone who counts in no
  // cohort (R-5 audit, D-267: an access group's member, another plan's buyer).
  const users = rosterLearnersAll(db).filter((u) => u.status !== 'invited');

  const rows: CurriculumRow[] = mods.map((m, i) => {
    const sess = m.session ? sessionFor(db, cohortId, m.session) : null;
    const b = base.mod[m.id] ?? [0, 0, 0];
    const pool = users.filter((u) => canAccess(u, m));
    const n = b[0] + b[1] + b[2] + pool.length;
    const d = b[0] + pool.filter((u) => statusOf(u, m) === 'deployed').length;
    const published = m.status === 'published';

    return {
      id: m.id,
      order: i + 1,
      name: m.name,
      sub: m.outcome || 'No outcome line yet',
      icon: m.icon,
      canMoveUp: i > 0,
      canMoveDown: i < mods.length - 1,
      tier: m.tier,
      sess: sess ? `Session ${sess.n} · ${sess.title}` : 'Self-paced',
      // `Replay ready` is sentence case in the reference, and the fingerprint compares it exactly.
      sessSub: sess
        ? `${fmt.day(sess.start)} · ${sessionState(sess, now) === 'replay' ? 'Replay ready' : fmt.time(sess.start)}`
        : 'No live session',
      status: m.status,
      statusLabel: STATUS_LABEL[m.status],
      stSub:
        m.status === 'scheduled' && m.opens
          ? 'Opens ' + fmt.date(m.opens)
          : m.status === 'draft'
            ? 'Hidden from learners'
            : `${m.checklist.length} steps · ${m.files.length} files`,
      dep: m.status === 'draft' || !n ? '—' : fmt.pct(d / n),
      previewAs: m.tier === 'team' ? 'owner' : 'agent',
      actLabel: published ? 'Unpublish' : m.status === 'scheduled' ? 'Publish Now' : 'Publish',
      publishes: !published,
    };
  });

  const drafts = mods.filter((m) => m.status === 'draft').length;

  return {
    rows,
    // `all in Team Tier` is a fixed clause: every AI Employee is in the Team tier by definition.
    summary: `${mods.length} AI Employees · ${mods.filter((m) => m.tier === 'agent').length} in Agent Tier, all in Team Tier${
      drafts ? ` · ${drafts} draft` : ''
    }`,
  };
}

/**
 * The http-mode preview tab (D-138): the AI Employee's page as the learner its tier calls for. The
 * flag is `preview`, never `as`, which switches persona in fixture mode only (`data/preview.ts`).
 */
export const previewUrl = (r: Pick<CurriculumRow, 'id' | 'previewAs'>): string =>
  `/employees/${encodeURIComponent(r.id)}?preview=${r.previewAs}`;

/** The tier pill's words (the mockup's `TierPill`). */
export const tierWords = (t: Tier): string => (t === 'agent' ? 'Agent + Team' : 'Team only');

/** The moves that take the row at `from` to `to`, one place at a time (`moveModule` moves one). */
export const movesFor = (from: number, to: number): { dir: -1 | 1; times: number } => ({
  dir: to < from ? -1 : 1,
  times: Math.abs(to - from),
});
