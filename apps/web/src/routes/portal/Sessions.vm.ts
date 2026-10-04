// The Sessions screen's view-model, ported from `renderVals()` in
// design-reference/Portal Sessions.dc.html. Contract: SCREENS § 3.3.
//
// PURE: no React, no hooks, no clock read — `now` comes in. Every colour the reference computes
// inline (`ringBd`, `ringBg`, `ringFg`, `bg`, `fg`, `bt`) becomes a flag here and a data attribute
// in Sessions.module.css, so the view-model carries data and the stylesheet carries pixels.
//
// The reference's `go: () => act.download(…)` / `act.openLocked(…)` thunks become declarative
// descriptors: the screen decides what a download or a Locked Preview means, and the model stays
// testable. The `.ics` TEXT is not built here — the screen calls `ics(events, now)` at click time,
// so a 15-second re-render does not re-serialise six calendars.

import {
  accessibleSessions,
  canAccess,
  fmt,
  joinMode,
  moduleForSession,
  nextSession,
  sessionEnd,
  sessionEvent,
  sessionState,
} from '@ai/core';
import type { Db, IcsEvent, IconName, Learner } from '@ai/core';
import type { TokenGlyph, TokenTone } from '../../components/StatusToken';

/** Drop-in build help: one hour, Wednesdays at 11:00 CT. Verbatim from the reference. */
const OH_TITLE = 'Amplified Impact office hours';
const OH_ZOOM = 'https://zoom.us/j/8841299001';
const OH_MS = 3600e3;
const WEEK_MS = 7 * 86400e3;
const DAY_MS = 86400e3;

/** A `.ics` the screen writes to a Blob at click time, plus the toast the reference shows after. */
export interface IcsDownload {
  name: string;
  events: IcsEvent[];
  toast: string;
}

export interface SessionsRowToken {
  kind: 'access' | 'custom';
  state?: string;
  tone?: TokenTone;
  icon?: TokenGlyph;
  label?: string;
}

export interface SessionsRowAction {
  kind: 'calendar' | 'preview' | 'watch';
  label: string;
  icon: IconName;
  variant: 'primary' | 'secondary';
  /** `calendar` only. */
  download?: IcsDownload;
  /** `preview` opens the Locked Preview on it; `watch` opens its AI Employee page. */
  moduleId?: string;
}

export interface SessionsRowJoin {
  mode: 'disabled' | 'ready' | 'live';
  hint: string;
  url: string;
  /** The reference toasts this on join, tone `info`. */
  toast: string;
}

/**
 * `past` — held, so the ring shows a success check instead of the number.
 * `next` — the next accessible session: an action-primary ring and a `--bg-sunken` row.
 * `ahead` — everything else: a `--line-strong` ring with the number.
 */
export type RowState = 'past' | 'next' | 'ahead';

export interface SessionsRow {
  id: string;
  n: number;
  title: string;
  module: string;
  when: string;
  mins: number;
  /** `{n} attended live` on a held session, else ''. */
  extra: string;
  token: SessionsRowToken;
  actions: SessionsRowAction[];
  join: SessionsRowJoin | null;
  state: RowState;
  locked: boolean;
}

export interface OfficeHoursRow {
  label: string;
  /** Past hours show `Recording Posted`; upcoming ones get the Add to Calendar link. */
  past: boolean;
  download?: IcsDownload;
}

export interface SessionsVM {
  sub: string;
  calAll: IcsDownload;
  rows: SessionsRow[];
  ohTime: string;
  oh: OfficeHoursRow[];
  att: { attended: number; held: number };
}

/**
 * The 11:00 CT Wednesday on or after `t`'s CT date. Ported literally, including the fixed
 * six-hour CST offset and the day-at-a-time walk: every office hour in the program is CST.
 */
const wed = (t: number): number => {
  let x = Date.parse(new Date(t - 6 * 3600e3).toISOString().slice(0, 10) + 'T11:00:00-06:00');
  while (new Date(x - 6 * 3600e3).getUTCDay() !== 3) x += DAY_MS;
  return x;
};

const SECONDARY = 'secondary' as const;
const PRIMARY = 'primary' as const;

export function sessionsVM(db: Db, user: Learner | null, now: number): SessionsVM {
  const co = db.cohorts.find((x) => x.id === user?.cohortId) ?? db.cohorts[0] ?? null;
  const list = co
    ? db.sessions.filter((s) => s.cohortId === co.id).sort((a, b) => a.start - b.start)
    : [];
  const next = nextSession(db, user, now);

  const rows: SessionsRow[] = list.map((s) => {
    const m = moduleForSession(db, s);
    const locked = !!m && !canAccess(user, m);
    const isNext = !!next && next.id === s.id;
    const st = sessionState(s, now);
    const past = st === 'replay' || st === 'processing';

    const cal: SessionsRowAction = {
      kind: 'calendar',
      label: 'Add to Calendar',
      icon: 'calPlus',
      variant: SECONDARY,
      download: {
        name: `session-${s.n}.ics`,
        events: [sessionEvent(s)],
        toast: 'Calendar invite downloaded',
      },
    };

    let token: SessionsRowToken;
    let actions: SessionsRowAction[] = [];
    let join: SessionsRowJoin | null = null;

    if (locked) {
      token = { kind: 'access', state: 'locked' };
      // Never a link to the page: a locked AI Employee only ever opens the Locked Preview.
      actions = [{ kind: 'preview', label: 'Preview', icon: 'lock', variant: SECONDARY, moduleId: m.id }];
    } else if (st === 'replay') {
      token = { kind: 'custom', tone: 'success', icon: 'check', label: 'Replay Ready' };
      actions = [
        {
          kind: 'watch',
          label: 'Watch Replay',
          icon: 'play',
          variant: PRIMARY,
          ...(m ? { moduleId: m.id } : {}),
        },
      ];
    } else if (st === 'processing') {
      token = { kind: 'custom', tone: 'neutral', icon: 'clock', label: 'Replay Processing' };
    } else if (st === 'live') {
      token = { kind: 'custom', tone: 'live', label: 'Live Now' };
      join = { mode: 'live', hint: '', url: s.zoom, toast: `Opening Zoom · ${s.zoom}` };
    } else {
      token = isNext
        ? { kind: 'custom', tone: 'progress', icon: 'clock', label: 'Next Up' }
        : { kind: 'custom', tone: 'neutral', icon: 'ring', label: 'Scheduled' };
      if (isNext)
        join = {
          mode: joinMode(s, now),
          hint: 'Opens 15 Min Before',
          url: s.zoom,
          toast: `Opening Zoom · ${s.zoom}`,
        };
      actions = [cal];
    }

    return {
      id: s.id,
      n: s.n,
      title: s.title,
      module: m ? m.name : 'Live session',
      when: fmt.when(s.start),
      mins: s.mins,
      extra: past && s.attended ? `${s.attended} attended live` : '',
      token,
      actions,
      join,
      state: past ? 'past' : isNext ? 'next' : 'ahead',
      locked,
    };
  });

  const accessible = accessibleSessions(db, user);

  // `min(A, max(B, A))` is `A` for every input, so this is the Wednesday a week back. Ported as
  // the reference writes it so the two can be compared line by line.
  const back = now - WEEK_MS;
  const firstOh = wed(co ? Math.min(back, Math.max(co.start - DAY_MS, back)) : back);
  const ohDays = [firstOh, firstOh + WEEK_MS, firstOh + 2 * WEEK_MS];

  const oh: OfficeHoursRow[] = ohDays.map((t) => {
    const past = t + OH_MS < now;
    return {
      label: fmt.when(t),
      past,
      ...(past
        ? {}
        : {
            download: {
              name: 'office-hours.ics',
              events: [{ id: `oh${t}`, title: OH_TITLE, start: t, end: t + OH_MS, url: OH_ZOOM }],
              toast: 'Office hours added to your calendar',
            },
          }),
    };
  });

  const held = accessible.filter((s) => sessionEnd(s) < now).length;
  const first = list[0];

  return {
    rows,
    oh,
    ohTime: fmt.time(firstOh),
    // Jamie missed one: the seed carries no per-learner attendance, so the reference docks her one.
    att: { attended: Math.max(0, held - (user?.id === 'u_jamie' && held > 1 ? 1 : 0)), held },
    sub:
      co && first
        ? `${co.name} Cohort · ${list.length} live builds · Tue & Thu · ${fmt.time(first.start)}`
        : '',
    calAll: {
      name: 'amplified-impact-sessions.ics',
      events: accessible.map(sessionEvent),
      toast: `${accessible.length} sessions added to your calendar`,
    },
  };
}
