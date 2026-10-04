// Employee card view-model (dashboard, States sheet, Module Builder preview).
// Ported verbatim from design-reference/lms-data.js `cardVM` (lines 295-308).
// Pure: every time value arrives through the `now` argument.

import { ICONS } from './icons';
import { buildOf, canAccess, isOpen } from './status';
import { sessionFor, sessionState } from './sessions';
import { fmt } from './time';
import type { AIEmployee, BuildState, Db, Learner, ModuleStatus, Progress, Step, Tier } from './types';

/**
 * The viewer `cardVM` renders for. The Portal passes a real {@link Learner}; the Admin Module
 * Builder preview passes a synthetic viewer (`{ tier: pvTier, progress: {}, cohortId: 'dec26' }`),
 * so the parameter is the structural shape both satisfy. The reference also tolerates a missing
 * viewer (`!!u &&` / `(u && u.cohortId)`), which is why null and undefined stay accepted.
 */
export interface CardVMUser {
  tier: Tier;
  progress?: Record<string, Progress>;
  cohortId?: string | null;
}

/**
 * The AI Employee `cardVM` renders. The Portal passes a saved {@link AIEmployee}; the Admin Module
 * Builder preview passes an unsaved draft (`{ ...draft, build: totalMins }`), so the parameter lists
 * only the fields the view-model reads while staying assignable from `AIEmployee`.
 */
export interface CardVMModule {
  id: string;
  name: string;
  /** An `IconName` for saved modules; any string for an in-progress draft, hence the `bot` fallback. */
  icon: string;
  tier: Tier;
  status: ModuleStatus;
  opens: number | null;
  session: number | null;
  build: number;
  outcome?: string;
  /**
   * Legacy alias for `outcome` that predates the `AIEmployee` type. The reference falls back to it
   * (`m.outcome || m.tagline || ''`), so the field stays declared here to keep that behaviour
   * reachable without widening `AIEmployee` itself.
   */
  tagline?: string;
  checklist?: Step[];
}

export type CardCta = 'Preview' | 'View Details' | 'Open' | 'Continue Build' | 'Start Build';

export interface CardVM {
  id: string;
  name: string;
  /** The resolved SVG path data, not the icon name. */
  icon: string;
  outcome: string;
  locked: boolean;
  soon: boolean;
  opensLabel: string;
  sessLine: string;
  mins: number;
  state: BuildState;
  n: number;
  total: number;
  /** One flag per checklist step: true once that step is done. */
  segs: boolean[];
  cta: CardCta;
  primary: boolean;
}

// Drift guard: the saved Db shapes must stay assignable to the two loosened parameters above,
// or the Portal would stop compiling against its own data. Type-level only, nothing is emitted.
type _Assert<T extends true> = T;
type _ModuleAssignable = _Assert<AIEmployee extends CardVMModule ? true : false>;
type _UserAssignable = _Assert<Learner extends CardVMUser ? true : false>;

// ICONS is an `as const` map, so a direct index would be typed as always present. A draft can carry
// an icon key outside the set, and the reference relies on that miss (`ICONS[m.icon] || ICONS.bot`).
const ICON_PATHS: Record<string, string | undefined> = ICONS;

// status.ts types progressOf/buildOf against a whole Learner even though they read only `progress`.
// The Module Builder preview has no whole Learner to give, so the nominal shape is re-asserted here
// at that one call. Nothing is converted or copied: the very same object is handed through, exactly
// as the reference does. canAccess and isOpen already accept the loosened shapes directly.
const asLearner = (u: CardVMUser | null | undefined): Learner => u as unknown as Learner;

export function cardVM(db: Db, u: CardVMUser | null | undefined, m: CardVMModule, now: number): CardVM {
  const locked = !canAccess(u, m),
    soon = !locked && !isOpen(m, now);
  const b = buildOf(asLearner(u), m),
    sess = m.session ? sessionFor(db, (u && u.cohortId) || 'dec26', m.session) : null;
  const sst = sess ? sessionState(sess, now) : 'none';
  const sessLine = !sess
    ? 'Self-Paced'
    : `Session ${sess.n} · ` +
      (sst === 'replay'
        ? 'Replay Ready'
        : sst === 'live'
          ? 'Live Now'
          : sst === 'processing'
            ? 'Replay Processing'
            : fmt.date(sess.start));
  return {
    id: m.id,
    name: m.name,
    icon: ICON_PATHS[m.icon] || ICONS.bot,
    outcome: m.outcome || m.tagline || '',
    locked,
    soon,
    opensLabel: soon && m.opens ? 'Opens ' + fmt.date(m.opens) : soon ? 'Opens Soon' : '',
    sessLine,
    mins: m.build,
    state: b.state,
    n: b.n,
    total: b.total,
    segs: Array.from({ length: b.total }, (_, i) => i < b.n),
    cta: locked
      ? 'Preview'
      : soon
        ? 'View Details'
        : b.state === 'verified'
          ? 'Open'
          : b.state === 'in_progress'
            ? 'Continue Build'
            : 'Start Build',
    primary: !locked && !soon && b.state !== 'verified',
  };
}
