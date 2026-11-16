// The R2 parity snapshot (D-160 R2-2, BUILD-SPEC § 6.1): the mockup's Build data (`MODS0`, the
// Module Builder's steps and files, the cohort and its sessions) as the app's own snapshot, so the
// Curriculum and Module Builder screens draw the mockup's rows from the same view-models production
// uses. FIXTURE ONLY: `boot.ts` imports this file dynamically behind
// `import.meta.env.VITE_DATA_SOURCE === 'fixture'` and `?parity=r2`, so the http build has none of it
// (`console-build.test.ts`).
//
// Everything not drawn by the Build screens is the ordinary fixture's (`seed('live')`). No learner is
// modelled one by one, so each published AI Employee's Deployed figure is its baseline, exactly the
// mockup's `dep` (66 of 100 is 66%).

import { seed } from '@ai/core';
import type { AIEmployee, Announcement, Db, IconName, Resource, Session, SkillFile, Step, StepKind } from '@ai/core';
import { ANNOUNCEMENTS, BUILDER_FILES, BUILDER_STEPS, MODS0, VAULT } from './parity-r2';

/** An instant written in MST (America/Phoenix, UTC−7 all year). */
const mst = (s: string): number => Date.parse(`${s}-07:00`);

const COHORT = 'dec26';

/** The cohort's six live builds (the mockup's Cohorts `S`), Wednesdays at 12:00 PM MST. */
const SESSIONS: readonly [title: string, day: string, zoom: boolean, attended: number | null][] = [
  ['Lead-Source ROI Live Build', '2026-12-02', true, 121],
  ['Morning Brief Live Build', '2026-12-09', true, 109],
  ['Database Live Build', '2026-12-16', true, null],
  ['Scorecard Live Build', '2026-12-23', true, null],
  ['Contract to Close', '2026-12-30', false, null],
  ['Handoff', '2027-01-06', false, null],
];

const ICON = (ic: string): IconName => `r2${ic[0]!.toUpperCase()}${ic.slice(1)}` as IconName;
const OPENS: Record<string, number> = {
  'Opens Dec 14': mst('2026-12-14T09:00:00'),
  'Opens Dec 21': mst('2026-12-21T09:00:00'),
};

const steps = (n: number): Step[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i + 1}`, text: `Step ${i + 1}`, ch: '', mins: 5, t: 0, hint: '' }));
const files = (n: number): SkillFile[] =>
  Array.from({ length: n }, (_, i) => ({
    name: `file-${i + 1}.json`,
    type: 'JSON',
    size: '1 KB',
    desc: '',
    steps: [],
  }));

function moduleOf(m: (typeof MODS0)[number], i: number): AIEmployee {
  const first = m.id === 'm1';
  return {
    id: m.id,
    name: m.n,
    short: m.n,
    tier: m.tier === 'both' ? 'agent' : 'team',
    icon: ICON(m.ic),
    forWho: '',
    headline: '',
    outcome: m.d,
    outputs: ['', '', ''],
    platform: 'Claude Project',
    runLabel: '',
    build: 0,
    session: m.ses ? Number(/^Session (\d+)/.exec(m.ses[0])![1]) : null,
    status: m.st === 'Published' ? 'published' : m.st === 'Scheduled' ? 'scheduled' : 'draft',
    opens: 'opens' in m ? OPENS[m.opens]! : null,
    order: i + 1,
    dur: 0,
    instructor: '',
    transcript: [],
    notes: '',
    prompt: '',
    files: first
      ? BUILDER_FILES.map(([name, desc, size]) => ({ name, type: 'JSON', size, desc, steps: [] }))
      : files(m.files),
    resources: [],
    checklist: first
      ? BUILDER_STEPS.map(([kind, text, len], j) => ({
          id: `c${j + 1}`,
          text,
          ch: '',
          mins: Number.parseInt(len, 10),
          t: 0,
          hint: '',
          kind: kind as StepKind,
        }))
      : steps(m.steps),
  };
}

const MONTHS: Record<string, string> = { Nov: '11', Dec: '12' };
/** "Dec 9, 3:10 PM" or "Dec 8" (9:00 AM), in 2026, MST. */
function stamp(s: string): number {
  const m = /^(\w{3}) (\d+)(?:, (\d+):(\d+) (AM|PM))?$/.exec(s)!;
  const h = m[3] ? (Number(m[3]) % 12) + (m[5] === 'PM' ? 12 : 0) : 9;
  const pad = (n: number | string) => String(n).padStart(2, '0');
  return mst(`2026-${MONTHS[m[1]!]}-${pad(m[2]!)}T${pad(h)}:${pad(m[4] ?? 0)}:00`);
}

/** The vault (`R`): each row attached to its AI Employee by name. */
const resourceOf = (
  [title, type, attached, tier, size, updated, opens]: (typeof VAULT)[number],
  i: number,
): Resource => ({
  id: `r${i + 1}`,
  title,
  desc: '',
  cat: 'Lead Generation Scripts',
  type,
  tier: tier === 'Team only' ? 'team' : 'agent',
  size,
  dl: opens,
  updated: stamp(updated),
  exec: false,
  status: 'published',
  module: MODS0.find((m) => m.n === attached)!.id,
});

const AUDIENCE: Record<string, Announcement['audience']> = {
  Everyone: 'all',
  'Team Tier': 'team',
  'Agent Tier': 'agent',
};
const CHANNELS: Record<string, Announcement['channels']> = {
  'In-app, email': ['inapp', 'email'],
  Email: ['email'],
  'In-app': ['inapp'],
};

/** Announcements (`rows`), newest first as `sendAnnouncement` keeps them. A draft has no send time. */
const announcementOf = (
  [title, audience, channels, status, at]: (typeof ANNOUNCEMENTS)[number],
  i: number,
): Announcement => ({
  id: `a${i + 1}`,
  title,
  body: '',
  severity: 'info',
  action: null,
  actionLabel: '',
  audience: AUDIENCE[audience]!,
  channels: CHANNELS[channels]!,
  status: status === 'Sent' ? 'sent' : status === 'Scheduled' ? 'scheduled' : 'draft',
  at: at === '—' ? stamp('Dec 10, 9:00 AM') : stamp(at),
  opens: null,
});

/** The parity snapshot: the ordinary fixture with the mockup's Build data in place. */
export function parityDb(): Db {
  const db = seed('live');
  const cohort = db.cohorts.find((c) => c.id === COHORT)!;
  Object.assign(cohort, {
    name: 'December 2026',
    start: mst('2026-12-02T12:00:00'),
    end: mst('2027-01-06T13:00:00'),
    weeks: 6,
    status: 'live',
    enrolled: 148,
    cadence: 'Wednesdays, weekly',
  });
  db.cohorts = [cohort];
  db.sessions = SESSIONS.map(([title, day, zoom, attended], i): Session => ({
    id: `${COHORT}-s${i + 1}`,
    cohortId: COHORT,
    n: i + 1,
    title,
    start: mst(`${day}T12:00:00`),
    mins: 60,
    zoom: zoom ? `https://zoom.us/j/88412${String(i + 1).padStart(5, '0')}` : '',
    live: false,
    attended,
    replay: attended !== null ? 'ready' : null,
    views: 0,
  }));
  db.modules = MODS0.map(moduleOf);
  db.resources = VAULT.map(resourceOf);
  db.announcements = ANNOUNCEMENTS.map(announcementOf);
  db.users = [];
  db.base = {
    ...db.base,
    // The 148 enrolled, none modelled one by one: the population attendance is a share of.
    learners: 148,
    mod: Object.fromEntries(
      MODS0.filter((m) => 'dep' in m).map((m) => [m.id, [m.dep, 100 - m.dep, 0]]),
    ) as Db['base']['mod'],
  };
  return db;
}
