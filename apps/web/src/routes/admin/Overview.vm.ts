// R-5 Phase 9 (D-270): the admin's Overview (`/admin`), the mockup's `Home` (handoff/admin-mockup/p3-areas.jsx), as the R2
// reference draws it (`Overview` in AdminRedesign.jsx). PURE: the snapshot, `now` and what the page read come in; what is
// counted, done or due is core's, and this only words it as the mockup does, with PLAN.md § 10.8's rules (Title Case
// headings, times "12:00 PM MT / 1:00 PM CT" through `fmt.mtCt`, no dashes).
//
//   Four tiles      Program, Cohort (the cohort the admin is on), People and Revenue, each opening its page.
//   Needs You       a group per cohort not archived, in start order: a running cohort's Needs You rows (Cohort ›
//                   Overview's own, `overviewVM` in cohort.vm.ts), a draft's Before It Opens lines not done; then
//                   "Payments and system": failed payments, upgrade requests, open incidents. A row that counts nothing
//                   is not drawn, nor a group with no row.
//   Who Has a Sign-In  the audience bar (Phase 7's `gotInOf`, `GET /api/console/users/audiences`), each segment opening
//                   People filtered (`/admin/people?gotIn=…`).
//   Cohorts         every cohort not archived, with its status word, and "New cohort".
//   Coming Up       each cohort's next two sessions, in time order, four at most.
//
// WHO COUNTS (spec § 4 rule 2, D-267): a cohort's Teams and Learners are the roster's (`rosterTeams`, `rosterLearners`:
// the API's one rule, in staff's snapshot), never `users.cohort_id`; a Utah Life agent is in no cohort figure and is
// counted once, under their group. "Active Learners" as the old Overview counted it is gone with it.
//
// Every number opens the list it counts (spec § 4 rule 1): each tile, row, segment and session carries its `to`.

import {
  STRIPE_UNASKED,
  cohortOpensFirst,
  cohortProgress,
  cohortShapeOf,
  cohortStatusWord,
  fmt,
  gotInChipLabel,
  meetsHowOften,
  rosterLearners,
  rosterTeams,
  usdWhole,
} from '@ai/core';
import type { CohortFacts, CohortStatusWord, Db, IconName, PeopleAudiences, RevenueSummary } from '@ai/core';
import type { NavCounts } from '../../shell/admin/adminNav';
import { cohortLabel } from '../../data/admin-shell';
import { programWeekModules } from './program/program.vm';
import { cohortPath, overviewVM as cohortOverviewVM } from './cohort/cohort.vm';
import { PAYMENTS } from './revenue/revenue.vm';
import { audTone } from './people/people.vm';
import type { AudTone } from './people/people.vm';

// ---------------------------------------------------------------------------------------------
// The words (the mockup's, sentence for sentence; *new* where the mockup's can't be computed, D-270)
// ---------------------------------------------------------------------------------------------

export const HOME_COPY = {
  title: 'Overview',
  description: 'What you teach, who is going through it, who has a sign-in, and what has been paid. Each one opens its page.',
  tiles: { program: 'Program', cohort: 'Cohort', people: 'People', revenue: 'Revenue' },
  program: 'AI Accelerator',
  programLine: (n: number, published: number, drafts: number) => `${n} weeks · ${published} published, ${drafts} in draft`,
  seats: (teams: number, cap: number) => `${teams} of ${cap} seats`,
  draftLeft: (left: number) => `Draft · ${left} left before it opens`,
  noCohort: 'No cohort yet',
  noCohortLine: 'Create the first one.',
  signIn: (n: number) => `${n} with a sign-in`,
  inCohort: (n: number) => `${n} in the cohort`,
  keptApart: (n: number, name: string) => `${n} ${name}, kept apart`,
  collected: (amount: string) => `${amount} collected`,
  still: (amount: string) => `${amount} still to collect`,
  monthly: (amount: string) => `${amount} a month`,
  unavailable: 'Unavailable',
  needs: { title: 'Needs You', sub: 'Across the cohort, payments and the system', system: 'Payments and system' },
  failed: (n: number) => `${n} payment${n === 1 ? '' : 's'} failed`,
  requests: (n: number) => `${n} team${n === 1 ? '' : 's'} asked to move up a plan`,
  incidents: (n: number) => `${n} incident${n === 1 ? ' is' : 's are'} open`,
  incidentsDetail: (n: number) => `Open ${n === 1 ? 'it' : 'them'} in Operations.`,
  stripeUnasked: 'Entered. What Stripe says is on the cohort’s Settings.',
  audience: {
    title: 'Who Has a Sign-In',
    line: (n: number) => `${n} people, each counted once.`,
    apart: (names: string) => `${names} agents are kept out of the learner count and out of revenue.`,
    people: 'People',
    label: 'Everyone with a sign-in, by how they got in',
  },
  cohorts: { title: 'Cohorts', create: 'New cohort' },
  coming: { title: 'Coming Up', schedule: 'Schedule', none: 'No sessions yet.', noLink: 'No link' },
} as const;

const C = HOME_COPY;
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const word = (n: number): string => NUMBER_WORDS[n] ?? n.toLocaleString('en-US');
const Word = (n: number): string => {
  const w = word(n);
  return w[0]!.toUpperCase() + w.slice(1);
};
/** "A and B", "A, B and C". */
const andList = (xs: readonly string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** "December 2026": a cohort's name as the mockup's tiles and lines say it (`c.n.replace(' Cohort', '')`). */
export const cohortShort = (c: Pick<Db['cohorts'][number], 'name'>): string => cohortLabel(c).replace(/ Cohort$/, '');

// ---------------------------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------------------------

export type HomeTileKey = 'program' | 'cohort' | 'people' | 'revenue';

export interface HomeTileVM {
  key: HomeTileKey;
  label: string;
  icon: IconName;
  value: string;
  line: string;
  to: string;
}

export type HomeTone = 'bad' | 'warn' | '';

export interface HomeNeedVM {
  key: string;
  icon: IconName;
  tone: HomeTone;
  title: string;
  detail: string;
  to: string;
}

export interface HomeNeedGroupVM {
  key: string;
  label: string;
  rows: HomeNeedVM[];
}

export interface HomeSegmentVM {
  key: string;
  label: string;
  count: number;
  tone: AudTone;
  to: string;
}

export interface HomeCohortVM {
  id: string;
  name: string;
  line: string;
  status: CohortStatusWord;
  to: string;
}

export interface HomeComingVM {
  key: string;
  day: string;
  mon: string;
  title: string;
  line: string;
  flag: string | null;
  to: string;
}

export interface HomeVM {
  tiles: HomeTileVM[];
  needs: { groups: HomeNeedGroupVM[]; total: number };
  audience: { total: number; line: string; segments: HomeSegmentVM[] } | null;
  cohorts: HomeCohortVM[];
  coming: HomeComingVM[];
  /** Where Coming Up's "Schedule" goes: the cohort the admin is on. */
  schedule: string;
}

export interface HomeInput {
  db: Db;
  now: number;
  /** The cohort the admin is on (the sidebar's switcher); null with none. */
  cohortId: string | null;
  /** The tiles the role may open (`areaTabs` per page). */
  open: Readonly<Record<HomeTileKey, boolean>>;
  /** Each cohort's facts (`GET /api/admin/overview`), or null until read or for a role that can't read them. */
  facts: Readonly<Record<string, CohortFacts>> | null;
  /** Each cohort's Community threads waiting on staff (the sidebar's count, per cohort). */
  waiting: Readonly<Record<string, number>>;
  audiences: PeopleAudiences | null;
  /** Phase 8's summary, all time; null while unread or unreadable (its figures then read "Unavailable"). */
  revenue: RevenueSummary | null;
  counts: NavCounts;
  /** Whether the role can see Revenue's lists (failed payments) and Plans & Upgrades (requests). */
  canBilling: boolean;
  canPlans: boolean;
}

/** The cohorts the Overview names: every one not archived, in start order. */
export const homeCohorts = (db: Pick<Db, 'cohorts'>): Db['cohorts'] =>
  [...db.cohorts].filter((c) => c.archivedAt === undefined).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

function needsOf(i: HomeInput, cohortId: string): HomeNeedVM[] {
  const facts = i.facts?.[cohortId] ?? null;
  const vm = cohortOverviewVM(i.db, cohortId, i.now, facts, i.waiting[cohortId] ?? 0);
  if (!vm) return [];
  if (vm.before)
    return vm.before.lines
      .filter((l) => !l.done)
      .map((l) => ({
        key: `${cohortId}:${l.key}`,
        icon: 'r2Cohorts' as const,
        tone: 'warn' as const,
        title: l.label,
        // The Overview reads no Stripe (D-270): a Stripe line whose keys or links are entered says where Stripe's answer is.
        detail: (l.key === 'stripe' || l.key === 'links') && l.detail === STRIPE_UNASKED ? C.stripeUnasked : l.detail,
        to: l.to,
      }));
  return (vm.needs ?? []).map((n) => ({ key: `${cohortId}:${n.title}`, icon: n.icon, tone: n.tone, title: n.title, detail: n.detail, to: n.to }));
}

function systemNeeds(i: HomeInput): HomeNeedVM[] {
  const out: HomeNeedVM[] = [];
  const failed = i.canBilling ? (i.revenue?.failed ?? i.counts.failed) : 0;
  if (failed > 0) {
    const retrying = Math.min(failed, (i.revenue?.coming ?? []).filter((c) => c.kind === 'retry').length);
    const rest = failed - retrying;
    const detail =
      retrying && rest
        ? `Stripe is retrying ${word(retrying)}. ${Word(rest)} need${rest === 1 ? 's' : ''} a new card.`
        : retrying
          ? `Stripe is retrying ${failed === 1 ? 'it' : 'them'}.`
          : `${failed === 1 ? 'It needs' : 'They need'} a new card.`;
    out.push({ key: 'failed', icon: 'r2Billing', tone: 'bad', title: C.failed(failed), detail, to: PAYMENTS.failed });
  }
  const asked = i.canPlans ? i.db.requests.filter((r) => r.status === 'new') : [];
  if (asked.length) {
    const names = asked.map((r) => r.name).filter(Boolean);
    const detail = names.length <= 2 ? `From ${andList(names)}.` : `From ${names.slice(0, 2).join(', ')} and ${names.length - 2} more.`;
    out.push({ key: 'requests', icon: 'r2Tiers', tone: '', title: C.requests(asked.length), detail, to: '/admin/revenue/plans' });
  }
  if (i.counts.incidents > 0)
    out.push({
      key: 'incidents',
      icon: 'r2Incidents',
      tone: 'bad',
      title: C.incidents(i.counts.incidents),
      detail: C.incidentsDetail(i.counts.incidents),
      to: '/admin/incidents',
    });
  return out;
}

export function homeVM(i: HomeInput): HomeVM {
  const { db, now } = i;
  const cohorts = homeCohorts(db);
  const current = cohorts.find((c) => c.id === i.cohortId) ?? null;

  // ---- the tiles ----
  const weeks = programWeekModules(db);
  const drafts = weeks.filter((m) => m.status === 'draft').length;
  const tiles: HomeTileVM[] = [];
  if (i.open.program)
    tiles.push({
      key: 'program',
      label: C.tiles.program,
      icon: 'r2Curriculum',
      value: C.program,
      line: C.programLine(weeks.length, weeks.length - drafts, drafts),
      to: '/admin/program',
    });
  if (i.open.cohort) {
    if (!current) tiles.push({ key: 'cohort', label: C.tiles.cohort, icon: 'r2Cohorts', value: C.noCohort, line: C.noCohortLine, to: '/admin/cohort/new' });
    else {
      let line: string;
      if (current.status === 'draft') {
        const before = cohortOverviewVM(db, current.id, now, i.facts?.[current.id] ?? null)?.before;
        line = C.draftLeft(before?.left ?? 0);
      } else {
        const p = cohortProgress(db, current.id, now);
        const where = p === null ? null : p.kind === 'running' ? `Week ${p.n} of ${p.of}` : `Opens ${fmt.mtDay(p.week1)}`;
        line = [where, C.seats(rosterTeams(db, current.id).length, current.capacity)].filter(Boolean).join(' · ');
      }
      tiles.push({ key: 'cohort', label: C.tiles.cohort, icon: 'r2Cohorts', value: cohortShort(current), line, to: cohortPath(current.id) });
    }
  }
  if (i.open.people) {
    const a = i.audiences;
    const parts = [
      current ? C.inCohort(rosterLearners(db, current.id).length) : null,
      ...(a?.leftOut ?? []).map((g) => C.keptApart(g.count, g.name)),
    ].filter((x): x is string => x !== null);
    tiles.push({
      key: 'people',
      label: C.tiles.people,
      icon: 'r2Learners',
      value: a ? C.signIn(a.total) : C.unavailable,
      line: parts.join(' · '),
      to: '/admin/people',
    });
  }
  if (i.open.revenue) {
    const r = i.revenue;
    const still = r ? C.still(usdWhole(r.stillToCollect.cents)) : null;
    tiles.push({
      key: 'revenue',
      label: C.tiles.revenue,
      icon: 'r2Billing',
      value: r?.cash ? C.collected(usdWhole(r.cash.collectedCents)) : C.unavailable,
      line: [still, r?.mrr ? C.monthly(usdWhole(r.mrr.cents)) : null].filter(Boolean).join(' · '),
      to: '/admin/revenue',
    });
  }

  // ---- Needs You ----
  const groups: HomeNeedGroupVM[] = [
    ...(i.open.cohort
      ? cohorts.map((c) => ({ key: c.id, label: cohortLabel(c) + (c.status === 'draft' ? ' · Draft' : ''), rows: needsOf(i, c.id) }))
      : []),
    { key: 'system', label: C.needs.system, rows: systemNeeds(i) },
  ].filter((g) => g.rows.length > 0);

  // ---- Who has a sign-in ----
  const a = i.audiences;
  const audience =
    a && i.open.people
      ? {
          total: a.total,
          line: [C.audience.line(a.total), a.leftOut.length ? C.audience.apart(andList(a.leftOut.map((g) => g.name))) : null].filter(Boolean).join(' '),
          segments: a.chips
            .filter((c) => c.count > 0)
            .map((c) => ({
              key: c.key,
              label: gotInChipLabel(c),
              count: c.count,
              tone: audTone(c.key, c.kind),
              to: `/admin/people?gotIn=${encodeURIComponent(c.key)}`,
            })),
        }
      : null;

  // ---- Cohorts ----
  const list: HomeCohortVM[] = cohorts.map((c) => {
    const shape = cohortShapeOf(db, c.id);
    const opens = cohortOpensFirst(db, c.id);
    const line = [
      shape ? `${shape.shape.buildWeeks} weeks` : null,
      shape ? meetsHowOften(shape.shape.slots) : null,
      opens !== null ? `opens ${fmt.mtDay(opens)}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    return { id: c.id, name: cohortLabel(c), line, status: cohortStatusWord(db, c.id, now), to: cohortPath(c.id) };
  });

  // ---- Coming up: each cohort's next two, in time order, four at most ----
  const many = cohorts.length > 1;
  const coming = cohorts
    .flatMap((c) =>
      db.sessions
        .filter((s) => s.cohortId === c.id && s.start + s.mins * 60_000 > now)
        .sort((x, y) => x.start - y.start || x.id.localeCompare(y.id))
        .slice(0, 2)
        .map((s) => ({ s, c })),
    )
    .sort((x, y) => x.s.start - y.s.start || x.s.id.localeCompare(y.s.id))
    .slice(0, 4)
    .map(({ s, c }): HomeComingVM => {
      const [dow, mon, dd] = fmt.mtDay(s.start).replace(',', '').split(' ');
      return {
        key: s.id,
        day: dd ?? '',
        mon: mon ?? '',
        title: s.title,
        line: `${dow} · ${fmt.mtCt(s.start)}${many ? ` · ${cohortShort(c)}` : ''}`,
        flag: !s.zoom.trim() ? C.coming.noLink : null,
        to: cohortPath(c.id, 'schedule'),
      };
    });

  return {
    tiles,
    needs: { groups, total: groups.reduce((n, g) => n + g.rows.length, 0) },
    audience,
    cohorts: list,
    coming,
    schedule: current ? cohortPath(current.id, 'schedule') : '/admin/cohort',
  };
}
