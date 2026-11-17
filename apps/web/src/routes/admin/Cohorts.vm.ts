// The Cohorts & Sessions screen's view-model, ported from `renderVals()` in
// design-reference/Admin Cohorts.dc.html. Contract: SCREENS § 4.4, phase 06 § 6.1.
//
// PURE: no React, no hooks, no clock read — `now` and the selected cohort come in.
//
// Every colour the reference computes inline (the card border and tint, the row background, the
// token's four status custom properties, the primary button's fill) becomes a flag or a tone here
// and a data attribute in Cohorts.module.css, so the model carries data and the stylesheet carries
// pixels. The reference's `go: () => act.mutate(...)` thunks become declarative mutation
// descriptors: the screen calls `useMutate()`, and the model stays testable.
//
// phase 06 § 6.2 — `db.base` is NOT optional. The learner population behind `sel.note` and behind
// every attendance percentage is `base.learners + users.filter(active).length`, exactly as the
// reference computes it. In http mode the API returns `ZERO_BASE`, so this same arithmetic shows
// live numbers. Nothing here branches on the data source.

import { adminWhen, fmt, fromAdminLocal, moduleForSession, sessionState, toAdminLocal } from '@ai/core';
import type { Cohort, Db, Session } from '@ai/core';

/** The three tones this screen's pills use. They resolve to the status custom properties in CSS. */
export type CohortTone = 'success' | 'progress' | 'neutral';

/** `success` is the Go Live fill, `outline` the End Session ghost, `primary` Publish Replay. */
export type PrimaryVariant = 'success' | 'outline' | 'primary';

export interface CohortCardVM {
  id: string;
  name: string;
  statusLabel: string;
  tone: CohortTone;
  /** `Dec 1 – Jan 8`, with the reference's en dash. */
  range: string;
  cadence: string;
  enrolled: number;
  capacity: number;
  /** `74%` — the enrollment bar's width, handed to CSS as `--w`. */
  fill: string;
  selected: boolean;
}

export interface SchedulePrimaryVM {
  label: string;
  mutation: 'goLive' | 'endSession' | 'publishReplay';
  variant: PrimaryVariant;
}

export interface ScheduleRowVM {
  id: string;
  n: number;
  title: string;
  /** The linked AI Employee, with ` · Team Tier` appended for a team-gated one. */
  module: string;
  day: string;
  /** `1:00 PM CT · 75 min`. */
  time: string;
  /** The display form: the reference strips `https://`. */
  zoom: string;
  /** The full link, which is what the copy button writes to the clipboard. */
  zoomUrl: string;
  statusLabel: string;
  tone: CohortTone;
  /** The live row's dot pulses; every other dot is still. */
  pulse: boolean;
  /** `121 · 82%`, or an em dash when nothing was recorded. */
  att: string;
  /** The next session: an action-primary tint behind the whole row. */
  isNext: boolean;
  primary: SchedulePrimaryVM | null;
}

export interface ScheduleHeadVM {
  cohortId: string;
  /** `December 2026 Schedule`. */
  title: string;
  note: string;
  /** Only a draft cohort offers `Open Enrollment`. */
  canOpen: boolean;
}

export interface CohortsVM {
  cohorts: CohortCardVM[];
  /** The resolved selection: the requested cohort, or the first one when it is gone. */
  selectedId: string | null;
  head: ScheduleHeadVM | null;
  rows: ScheduleRowVM[];
  /** phase 06 § 6.2: `base.learners` plus the modelled, non-invited learners. */
  learners: number;
}

/** The edit drawer's form. Strings throughout, because they are `<input>` values. */
export interface SessionForm {
  title: string;
  date: string;
  time: string;
  mins: string;
  zoom: string;
}

const COHORT_STATUS: Record<Cohort['status'], { label: string; tone: CohortTone }> = {
  completed: { label: 'Completed', tone: 'neutral' },
  live: { label: 'Live', tone: 'success' },
  enrolling: { label: 'Enrolling', tone: 'progress' },
  // The reference spreads `STATUS.none` and overrides only the label, so Draft is a neutral pill.
  draft: { label: 'Draft', tone: 'neutral' },
};

/**
 * `openEdit(s)` in the reference: the drawer is seeded from the session, with the date and time
 * read back in Central Time so the two `<input>`s round-trip through `fmt.fromCT` on save.
 */
export const sessionForm = (s: Session): SessionForm => ({
  title: s.title,
  date: fmt.isoDate(s.start),
  time: fmt.isoTime(s.start),
  mins: String(s.mins),
  zoom: s.zoom,
});

export function cohortsVM(db: Db, now: number, selectedId: string): CohortsVM {
  // phase 06 § 6.2. `db.base` first, always — the aggregate learners are not in `db.users`.
  const learners = db.base.learners + db.users.filter((u) => u.status !== 'invited').length;

  const co = db.cohorts.find((x) => x.id === selectedId) ?? db.cohorts[0] ?? null;

  const cohorts: CohortCardVM[] = db.cohorts.map((c) => {
    const st = COHORT_STATUS[c.status];
    return {
      id: c.id,
      name: c.name,
      statusLabel: st.label,
      tone: st.tone,
      range: `${fmt.date(c.start)} – ${fmt.date(c.end)}`,
      cadence: c.cadence,
      enrolled: c.enrolled,
      capacity: c.capacity,
      fill: Math.round((c.enrolled / c.capacity) * 100) + '%',
      selected: !!co && co.id === c.id,
    };
  });

  if (!co) return { cohorts, selectedId: null, head: null, rows: [], learners };

  const list = db.sessions.filter((s) => s.cohortId === co.id).sort((a, b) => a.start - b.start);

  // Only a live cohort has a "next" session, so an enrolling or draft cohort offers no Go Live.
  const nextId =
    co.status === 'live' ? (list.find((s) => s.live || s.start + s.mins * 60000 > now)?.id ?? null) : null;

  const rows: ScheduleRowVM[] = list.map((s) => {
    const m = moduleForSession(db, s);
    const st = sessionState(s, now);
    const isNext = s.id === nextId;

    let statusLabel: string;
    let tone: CohortTone;
    let primary: SchedulePrimaryVM | null = null;

    if (st === 'live') {
      statusLabel = 'Live Now';
      tone = 'success';
      primary = { label: 'End Session', mutation: 'endSession', variant: 'outline' };
    } else if (st === 'replay') {
      statusLabel = 'Replay Ready';
      tone = 'success';
    } else if (st === 'processing') {
      statusLabel = 'Replay Processing';
      tone = 'neutral';
      primary = { label: 'Publish Replay', mutation: 'publishReplay', variant: 'primary' };
    } else if (isNext) {
      statusLabel = 'Next Up';
      tone = 'progress';
      primary = { label: 'Go Live', mutation: 'goLive', variant: 'success' };
    } else {
      statusLabel = 'Scheduled';
      tone = 'neutral';
    }

    return {
      id: s.id,
      n: s.n,
      title: s.title,
      module: m ? m.name + (m.tier === 'team' ? ' · Team Tier' : '') : 'No AI Employee linked',
      day: fmt.day(s.start),
      time: `${fmt.time(s.start)} · ${s.mins} min`,
      zoom: s.zoom.replace('https://', ''),
      zoomUrl: s.zoom,
      statusLabel,
      tone,
      pulse: st === 'live',
      // phase 06 § 6.2: the denominator carries `db.base`.
      att: s.attended ? `${s.attended} · ${fmt.pct(s.attended / learners)}` : '—',
      isNext,
      primary,
    };
  });

  const note =
    co.status === 'live'
      ? `In progress · ${learners} learners · ${co.cadence}`
      : co.status === 'enrolling'
        ? `${co.enrolled} enrolled · starts ${fmt.day(co.start)}`
        : 'Draft · not visible on the sales page';

  return {
    cohorts,
    selectedId: co.id,
    head: { cohortId: co.id, title: `${co.name} Schedule`, note, canOpen: co.status === 'draft' },
    rows,
    learners,
  };
}

// ================================================================================================
// R2 (D-160 R2-2b): Cohorts & Sessions of the signed-off Admin redesign (AdminRedesign.jsx `Cohorts`).
// The current cohort's key facts and its sessions, in MST; the Go Live, End Session and Publish
// Replay actions and the attendance population are `cohortsVM`'s, above.
// ================================================================================================

const WEEK = 7 * 864e5;

export type R2Tone = 'ok' | 'info' | 'run' | 'off';

export interface CohortsR2Row {
  id: string;
  /** `Session 1 · Lead-Source ROI Live Build`. */
  title: string;
  /** `Wed, Dec 2 · 12:00 PM MST`. */
  when: string;
  /** The cohort week it falls in: `Week 1`. */
  week: string;
  /** Sent once the 24-hour reminder window opens, Scheduled before, Draft with no Zoom link. */
  invite: { label: 'Sent' | 'Scheduled' | 'Draft'; tone: R2Tone };
  /** Ready or Processing, or null ("—"). */
  replay: { label: string; tone: R2Tone } | null;
  /** `82%`, or null ("—"). */
  attendance: string | null;
  zoom: string;
  primary: SchedulePrimaryVM | null;
  /** D-172: over (not live, and past its start plus its length), so Attach replay may run. */
  ended: boolean;
  /** D-172: the replay link Attach replay recorded, or ''. */
  replayUrl: string;
}

export interface CohortsR2VM {
  cohortId: string;
  facts: {
    cohort: string;
    status: { label: string; tone: R2Tone };
    opens: string;
    week: string;
    enrolled: string;
    cadence: string;
  };
  rows: CohortsR2Row[];
}

export function cohortsR2VM(db: Db, now: number, cohortId: string): CohortsR2VM | null {
  const co = db.cohorts.find((c) => c.id === cohortId) ?? db.cohorts[0] ?? null;
  if (!co) return null;
  const base = cohortsVM(db, now, co.id);
  const started = now >= co.start;
  const weeks = co.weeks ?? 6;
  const weekOf = (t: number) => Math.max(1, Math.floor((t - co.start) / WEEK) + 1);
  const list = db.sessions.filter((s) => s.cohortId === co.id).sort((a, b) => a.start - b.start);
  return {
    cohortId: co.id,
    facts: {
      cohort: co.name,
      status:
        co.status === 'completed'
          ? { label: 'Completed', tone: 'off' }
          : started && co.status === 'live'
            ? { label: 'Active', tone: 'ok' }
            : { label: 'Scheduled', tone: 'info' },
      opens: adminWhen(co.start),
      week: started ? `${Math.min(weeks, weekOf(now))} of ${weeks}` : 'Not started',
      enrolled: `${co.enrolled} learners`,
      cadence: co.cadence,
    },
    rows: list.map((s): CohortsR2Row => {
      const row = base.rows.find((r) => r.id === s.id);
      return {
        id: s.id,
        title: `Session ${s.n} · ${s.title}`,
        when: adminWhen(s.start),
        week: `Week ${weekOf(s.start)}`,
        invite: !s.zoom
          ? { label: 'Draft', tone: 'off' }
          : now >= s.start - 864e5
            ? { label: 'Sent', tone: 'ok' }
            : { label: 'Scheduled', tone: 'info' },
        replay:
          s.replay === 'ready'
            ? { label: 'Ready', tone: 'ok' }
            : s.replay === 'processing'
              ? { label: 'Processing', tone: 'run' }
              : null,
        attendance: s.attended && base.learners ? fmt.pct(s.attended / base.learners) : null,
        zoom: s.zoom,
        primary: row?.primary ?? null,
        ended: !s.live && now >= s.start + s.mins * 60_000,
        replayUrl: s.replayUrl ?? '',
      };
    }),
  };
}

/** The edit dialog's fields, the date and time in MST. */
export const sessionFormR2 = (s: Session): SessionForm => {
  const { date, time } = toAdminLocal(s.start);
  return { title: s.title, date, time, mins: String(s.mins), zoom: s.zoom };
};

/**
 * What `updateSession` takes: it reads `date` and `time` as Central Time (the program's zone), so the
 * dialog's MST date and time become the same instant written in CT.
 */
export function sessionArgsR2(id: string, f: SessionForm) {
  const t = fromAdminLocal(f.date, f.time);
  return Number.isNaN(t)
    ? { id, ...f }
    : { id, title: f.title, date: fmt.isoDate(t), time: fmt.isoTime(t), mins: f.mins, zoom: f.zoom };
}

/**
 * D-172: Add session's dialog, empty but for what every session of the course has: the 12:00 PM MST
 * start (1:00 PM CT, the program's time) and 75 minutes.
 */
export const blankSessionFormR2 = (): SessionForm => ({ title: '', date: '', time: '12:00', mins: '75', zoom: '' });

/** What `addSession` takes: the cohort on screen, and the dialog's fields as typed (MST). */
export const addSessionArgsR2 = (cohortId: string, f: SessionForm) => ({ cohortId, title: f.title, date: f.date, time: f.time, mins: f.mins, zoom: f.zoom });
