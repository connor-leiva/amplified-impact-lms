// Status model, ported verbatim from design-reference/lms-data.js (lines 190-216, 309-313).
// Access · build · runtime. Every function is pure and takes `now` in as an epoch-ms argument.

import { STEPS } from './constants';
import type { AIEmployee, BuildState, Db, Learner, Progress, RuntimeState } from './types';

// Module-shaped parameters stay as loose as the reference's duck typing: the Module Builder
// preview calls canAccess/isOpen with an unsaved draft, not a full AIEmployee.
type ProgressModule = Pick<AIEmployee, 'id'>;
type BuildModule = Pick<AIEmployee, 'id'> & Partial<Pick<AIEmployee, 'checklist'>>;
type AccessModule = Pick<AIEmployee, 'tier'>;
type OpenModule = Pick<AIEmployee, 'status' | 'opens'>;
type MaybeLearner = Learner | null | undefined;

// ---------- Semantic tones (CSS custom properties defined in each page's helmet) ----------
// These are data, not stylesheet colors: the view layer drops them straight into inline styles.
interface Tone {
  fg: string;
  bg: string;
  bd: string;
  dot: string;
}

const tone = (k: string): Tone => ({
  fg: `var(--${k}-text)`,
  bg: `var(--${k}-bg)`,
  bd: `var(--${k}-line)`,
  dot: `var(--${k})`,
});

export const TONES = {
  success: tone('status-success'),
  progress: tone('status-progress'),
  neutral: tone('status-neutral'),
  attention: tone('status-attention'),
  locked: tone('access-locked'),
  accent: {
    fg: 'var(--text-link)',
    bg: 'var(--action-primary-tint)',
    bd: 'var(--action-primary-line)',
    dot: 'var(--action-primary)',
  },
};

export const STATUS = {
  deployed: { label: 'Deployed', ...TONES.success },
  progress: { label: 'In Progress', ...TONES.progress },
  none: { label: 'Not Started', ...TONES.neutral },
  locked: { label: 'Team Tier', ...TONES.locked },
  soon: { label: 'Opens Soon', ...TONES.neutral },
  invited: { label: 'Invited', ...TONES.locked },
};

const AV = [192, 258, 330, 60, 145, 25, 290].map((h) => `oklch(0.78 0.08 ${h})`);

// `[...String(id)]` iterates code POINTS, so astral ids hash differently than a per-unit loop would.
// Keep the spread.
export const avatarColor = (id: string): string =>
  AV[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length]!;

// ---------- Status model: access · build · runtime ----------
// Returns a FRESH default object when there is no stored entry, so callers never share one.
export const progressOf = (u: MaybeLearner, m: ProgressModule): Progress =>
  (u && u.progress && u.progress[m.id]) || { steps: [], builtAt: null, deployedAt: null, runtime: null };

export const buildOf = (u: MaybeLearner, m: BuildModule): { state: BuildState; n: number; total: number } => {
  const total = (m.checklist || []).length || STEPS,
    p = progressOf(u, m),
    n = Math.min(total, p.steps.length);
  return { state: n >= total ? 'verified' : n ? 'in_progress' : 'not_started', n, total };
};

export const runtimeOf = (u: MaybeLearner, m: ProgressModule): RuntimeState => {
  const p = progressOf(u, m);
  return p.deployedAt ? p.runtime || 'deployed' : 'not_deployed';
};

export const statusOf = (u: MaybeLearner, m: ProgressModule): 'deployed' | 'progress' | 'none' => {
  const p = progressOf(u, m);
  return p.deployedAt ? 'deployed' : p.steps.length ? 'progress' : 'none';
};

export const canAccess = (u: Pick<Learner, 'tier'> | null | undefined, m: AccessModule): boolean =>
  m.tier === 'agent' || (!!u && u.tier === 'team');

export const isOpen = (m: OpenModule, now: number): boolean =>
  m.status === 'published' || (m.status === 'scheduled' && !!m.opens && now >= m.opens);

export const sortedModules = (db: Db): AIEmployee[] => db.modules.slice().sort((a, b) => a.order - b.order);

export const visibleModules = (db: Db): AIEmployee[] => sortedModules(db).filter((m) => m.status !== 'draft');

// `list` and `all` are separate visibleModules() calls, so they are different arrays — but slice()
// copies the array, not the elements, so list.includes(m) still matches on object identity.
// Ported as written.
export const nextIncluded = (db: Db, u: MaybeLearner, fromId: string, now: number): AIEmployee | null => {
  const list = visibleModules(db).filter((m) => canAccess(u, m) && isOpen(m, now));
  const all = visibleModules(db),
    i = all.findIndex((m) => m.id === fromId);
  return all.slice(i + 1).find((m) => list.includes(m)) || null;
};
