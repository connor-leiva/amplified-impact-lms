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
  adminDay,
  adminMonthDay,
  adminTime,
  adminWhen,
  canAccess,
  courseUsers,
  fmt,
  sessionFor,
  sessionState,
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

/** The reference reads the live session out of the December cohort by number, as written. */
const COHORT_ID = 'dec26';

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

export function curriculumVM(db: Db, now: number): CurriculumVM {
  const base = db.base;
  const mods = sortedModules(db);
  // Invited people have no portal yet, so they are not part of any AI Employee's audience. Nor is anyone
  // outside the course (D-243).
  const users = courseUsers(db).filter((u) => u.status !== 'invited');

  const rows: CurriculumRow[] = mods.map((m, i) => {
    const sess = m.session ? sessionFor(db, COHORT_ID, m.session) : null;
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

// ================================================================================================
// R2 (D-160 R2-2): the Curriculum screen of the signed-off Admin redesign (AdminRedesign.jsx
// `Curriculum`). Same snapshot, same `db.base` rule and the same publish and preview targets as above;
// the words are the mockup's, its times MST (`adminWhen`, BUILD-SPEC § 7).
// ================================================================================================

/** A live session, in each of the forms the R2 table prints it. */
export interface CurriculumR2Session {
  /** `Session 1 · Lead-Source ROI Live Build`. */
  title: string;
  /** `Wed, Dec 2 · 12:00 PM MST · Replay ready`. */
  when: string;
  /** Both lines, for the 1280 cell's title and accessible name. */
  full: string;
  /** 1280's one-line name: `Lead-Source ROI`. */
  short: string;
  /** 1280's date line: `Wed, Dec 2 · 12:00 PM`. */
  date: string;
  /** Laptop's line under the name, the Live session column gone: `Session 1 · Wed, Dec 2 · 12:00 PM MST`. */
  brief: string;
  /** `Session 1`. */
  n: string;
  /** `Wed, Dec 2`. */
  day: string;
}

export interface CurriculumR2Row {
  id: string;
  /** 1-based, in curriculum order (shown when the table is 1100px or wider). */
  order: number;
  name: string;
  desc: string;
  icon: IconName;
  tier: Tier;
  status: ModuleStatus;
  statusLabel: string;
  statusTone: 'ok' | 'info' | 'off';
  /** `6 steps · 3 files`, `Opens Dec 14` or `Hidden from learners`. */
  statusLine: string;
  session: CurriculumR2Session | null;
  /** The Deployed bar's percent, or null with `depLabel` in its place. */
  deployed: number | null;
  depLabel: string;
  /** The phone card's meta line. */
  meta: string;
  previewAs: 'agent' | 'owner';
  /** Publish (true) or Unpublish (false). */
  publishes: boolean;
}

export interface CurriculumR2VM {
  summary: string;
  /** The phone's summary, its last words kept together. */
  summaryPhone: string;
  /** The cohort has opened. Before then nothing is deployed yet. */
  started: boolean;
  rows: CurriculumR2Row[];
}

const R2_STATUS: Record<ModuleStatus, ['Published' | 'Scheduled' | 'Draft', 'ok' | 'info' | 'off']> = {
  published: ['Published', 'ok'],
  scheduled: ['Scheduled', 'info'],
  draft: ['Draft', 'off'],
};

/** The tier pill's words (the mockup's `TierPill`). */
export const tierWords = (t: Tier): string => (t === 'agent' ? 'Agent + Team' : 'Team only');

export function curriculumR2VM(db: Db, now: number): CurriculumR2VM {
  const mods = sortedModules(db);
  // D-243: the cohort's learners only, not the ones outside the course.
  const users = courseUsers(db).filter((u) => u.status !== 'invited');
  const cohort = db.cohorts.find((c) => c.id === COHORT_ID) ?? null;
  const started = !!cohort && now >= cohort.start;

  const rows = mods.map((m, i): CurriculumR2Row => {
    const s = m.session ? sessionFor(db, COHORT_ID, m.session) : null;
    const session: CurriculumR2Session | null = s
      ? (() => {
          const title = `Session ${s.n} · ${s.title}`;
          const when = `${adminWhen(s.start)}${sessionState(s, now) === 'replay' ? ' · Replay ready' : ''}`;
          return {
            title,
            when,
            full: `${title} · ${when}`,
            short: s.title.replace(/ Live Build$/, ''),
            date: `${adminDay(s.start)} · ${adminTime(s.start)}`,
            brief: `Session ${s.n} · ${adminWhen(s.start)}`,
            n: `Session ${s.n}`,
            day: adminDay(s.start),
          };
        })()
      : null;
    const b = db.base.mod[m.id] ?? [0, 0, 0];
    const pool = users.filter((u) => canAccess(u, m));
    const n = b[0] + b[1] + b[2] + pool.length;
    const d = b[0] + pool.filter((u) => statusOf(u, m) === 'deployed').length;
    const published = m.status === 'published';
    const deployed = started && published ? (n ? Math.round((d / n) * 100) : 0) : null;
    const [statusLabel, statusTone] = R2_STATUS[m.status];
    const draft = m.status === 'draft';
    const meta =
      (draft ? 'Hidden from learners · ' : '') +
      (session ? (draft ? '' : `${session.n} · `) + session.day : 'Self-paced') +
      (deployed !== null ? ` · ${deployed}% deployed` : !started && published ? ' · Not started' : '');
    return {
      id: m.id,
      order: i + 1,
      name: m.name,
      desc: m.outcome || 'No outcome line yet',
      icon: m.icon,
      tier: m.tier,
      status: m.status,
      statusLabel,
      statusTone,
      statusLine: draft
        ? 'Hidden from learners'
        : m.status === 'scheduled'
          ? m.opens
            ? `Opens ${adminMonthDay(m.opens)}`
            : 'Not scheduled'
          : `${m.checklist.length} steps · ${m.files.length} files`,
      session,
      deployed,
      depLabel: draft ? 'Not published' : 'Not started',
      meta,
      previewAs: m.tier === 'team' ? 'owner' : 'agent',
      publishes: !published,
    };
  });

  const drafts = mods.filter((m) => m.status === 'draft').length;
  const agent = mods.filter((m) => m.tier === 'agent').length;
  return {
    summary: `${mods.length} AI Employees · ${agent} in Agent Tier, all in Team Tier · ${drafts}\u00A0draft`,
    summaryPhone: `${mods.length} AI Employees · ${agent} in Agent\u00A0Tier\u00A0·\u00A0${drafts}\u00A0draft`,
    started,
    rows,
  };
}

/** The moves that take the row at `from` to `to`, one place at a time (`moveModule` moves one). */
export const movesFor = (from: number, to: number): { dir: -1 | 1; times: number } => ({
  dir: to < from ? -1 : 1,
  times: Math.abs(to - from),
});
