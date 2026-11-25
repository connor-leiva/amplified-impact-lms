// The Team Plan window (D-187): what an Agent Plan learner sees when they open something that comes with the
// Team Plan (a locked AI employee, a Team-only vault item, the Team Hub, or `/learn?plan=team`, where
// today's `/team-tier` lands). Connor, Nov 18, 2026: "show a preview window, not a sales page. It should say
// this comes with the Team Plan, that their team lead can add the team, and that solo agents can ask us. One
// button sends the request through `requestUpgrade` ... All wording is copy strings editable in the builder.
// Utah Life and other group members are unchanged: 'Not included with {group} access,' no upsell, no button."
//
// PURE. Every word the window says about the plan is a builder copy string (`plan.team.*`, sent with the
// library's answer, `GET /api/skills`); what it previews is the item's own data from the snapshot (an AI
// employee's name, headline and outputs, a vault item's title and line). An access group's member reads
// their group's locked line (`locked.utah_life`, the library's same rule) and is offered nothing. Until the
// library has answered, nothing is offered, so a group's member never sees the offer flash.

import { canAccess } from '@ai/core';
import type { Db, IconName, Learner } from '@ai/core';
import { isCourseWeek } from '@ai/core/accelerator';
import { COPY as LIBRARY } from '../library/SkillLibrary';
import { TEAM_HUB_LABEL, hasTeamHub, toneOf } from './learn.vm';
import type { Tone } from './learn.vm';
import type { SkillsLoad } from './skills-data';
import type { PlanItem } from './teamPlanContext';
import { LEARN_ROOT } from './routes';

/** Generic chrome. The plan's own words are copy strings, never here. */
export const PLAN_LABELS = {
  /** The dialog's name when it previews no item and the builder's heading is empty. */
  teamPlan: 'Team Plan',
  close: 'Close',
  loading: 'Loading',
} as const;

/** The builder's keys, in the order the window draws them (`packages/core/seed/copy-v2.ts`). */
export const PLAN_KEYS = { title: 'plan.team.title', lead: 'plan.team.lead', solo: 'plan.team.solo', ask: 'plan.team.ask', asked: 'plan.team.asked' } as const;

// --- the address -----------------------------------------------------------------------------------

/** `?plan=team` opens the window over the page; `&item=` says what it previews. */
export const PLAN_PARAM = 'plan';
export const PLAN_TEAM = 'team';
export const ITEM_PARAM = 'item';

const itemParam = (item: PlanItem): string | null =>
  item.kind === 'module' ? `module:${item.id}` : item.kind === 'resource' ? `resource:${item.id}` : item.kind === 'team-hub' ? 'team-hub' : null;

/** The window's address over Home: `/learn?plan=team`, with what it previews when there is one. */
export function teamPlanHref(item: PlanItem = { kind: 'plan' }): string {
  const q = new URLSearchParams({ [PLAN_PARAM]: PLAN_TEAM });
  const it = itemParam(item);
  if (it) q.set(ITEM_PARAM, it);
  return `${LEARN_ROOT}?${q.toString()}`;
}

/** What an address's query asks the window to show, or null when it asks for no window. */
export function planItemOf(search: string): PlanItem | null {
  const q = new URLSearchParams(search);
  if (q.get(PLAN_PARAM) !== PLAN_TEAM) return null;
  const it = q.get(ITEM_PARAM) ?? '';
  if (it === 'team-hub') return { kind: 'team-hub' };
  const m = /^(module|resource):(.+)$/.exec(it);
  if (m) return m[1] === 'module' ? { kind: 'module', id: m[2]! } : { kind: 'resource', id: m[2]! };
  return { kind: 'plan' };
}

/** The same query without the window's two parameters, for when it closes. */
export function withoutPlan(search: string): string {
  const q = new URLSearchParams(search);
  q.delete(PLAN_PARAM);
  q.delete(ITEM_PARAM);
  const rest = q.toString();
  return rest ? `?${rest}` : '';
}

// --- the gates -------------------------------------------------------------------------------------

/** A non-course AI employee's page in the learner portal (D-186's route). */
const EMPLOYEE_PATH = /^\/learn\/employees\/([^/]+)\/?$/;
const TEAM_PATH = /^\/learn\/team\/?$/;

/**
 * Where a page that comes with the Team Plan sends a learner whose plan doesn't open it: the window over
 * Home, about that page. Null for every page they may open, and for staff. As today's portal does it: a
 * locked AI employee "never becomes a page", and the Team Hub is the Team tier's. A course week is not
 * gated here: it follows course access, not the tier.
 */
export function teamGateFor(pathname: string, db: Pick<Db, 'modules' | 'teams'>, me: Learner | null): string | null {
  if (!me || me.tier === 'team') return null;
  if (TEAM_PATH.test(pathname)) return hasTeamHub(db, me) ? null : teamPlanHref({ kind: 'team-hub' });
  const emp = EMPLOYEE_PATH.exec(pathname);
  if (!emp) return null;
  const id = decodeURIComponent(emp[1]!);
  const m = db.modules.find((x) => x.id === id);
  if (!m || isCourseWeek(m.id) || canAccess(me, m)) return null;
  return teamPlanHref({ kind: 'module', id });
}

// --- the window ------------------------------------------------------------------------------------

export interface PlanPreviewVM {
  name: string;
  icon: IconName;
  tone: Tone;
  /** An AI employee's headline, or a vault item's line. */
  line: string | null;
  /** What an AI employee produces, up to three. */
  outputs: string[];
}

export type TeamPlanVM =
  /** The library hasn't answered (`loading`), or couldn't (null): nothing is offered until it does. */
  | { kind: 'wait'; title: string; preview: PlanPreviewVM | null; loading: string | null }
  /** An access group's member: their group's line, and nothing offered (D-150). */
  | { kind: 'group'; title: string; preview: PlanPreviewVM | null; line: string }
  | {
      kind: 'offer';
      title: string;
      preview: PlanPreviewVM | null;
      heading: string | null;
      lines: string[];
      /** The one button, through `requestUpgrade`; null once they have asked, or when the builder has no label. */
      ask: { label: string; source: string } | null;
      /** What the window says once their request is in. */
      asked: string | null;
    };

function previewOf(item: PlanItem, db: Pick<Db, 'modules' | 'resources'>): PlanPreviewVM | null {
  if (item.kind === 'team-hub') return { name: TEAM_HUB_LABEL, icon: 'r2Learners', tone: 'forest', line: null, outputs: [] };
  if (item.kind === 'module') {
    const m = db.modules.find((x) => x.id === item.id);
    if (!m) return null;
    return { name: m.name, icon: m.icon, tone: toneOf(m.tone), line: m.headline || m.outcome || null, outputs: m.outputs.filter(Boolean).slice(0, 3) };
  }
  if (item.kind === 'resource') {
    const r = db.resources.find((x) => x.id === item.id);
    return r ? { name: r.title, icon: 'r2Vault', tone: 'amber', line: r.desc || null, outputs: [] } : null;
  }
  return null;
}

/** The source the Console's Tiers screen shows for the request: where it was asked from. */
export const requestSource = (preview: PlanPreviewVM | null): string => (preview ? `Team Plan window · ${preview.name}` : 'Team Plan window');

/**
 * The window for this learner and item, or null when there is nothing to show: no learner, a Team tier
 * learner (they have it), or an item that isn't there.
 */
export function teamPlanVM(
  item: PlanItem,
  db: Pick<Db, 'modules' | 'resources' | 'requests'>,
  me: Learner | null,
  skills: SkillsLoad,
): TeamPlanVM | null {
  if (!me || me.tier === 'team') return null;
  const preview = previewOf(item, db);
  if (item.kind !== 'plan' && !preview) return null;
  // The dialog's name: the item it previews, else the plan. Never the builder's offer to a group's member.
  const named = preview?.name ?? PLAN_LABELS.teamPlan;
  if (skills.kind !== 'ready') return { kind: 'wait', title: named, preview, loading: skills.kind === 'loading' ? PLAN_LABELS.loading : null };
  const group = skills.payload.accessGroups?.[0];
  if (group) return { kind: 'group', title: named, preview, line: skills.payload.lockedLines?.[group.id] ?? LIBRARY.notIncluded(group.name) };
  const copy = skills.payload.planCopy ?? {};
  const heading = copy[PLAN_KEYS.title] || null;
  const title = preview?.name ?? heading ?? PLAN_LABELS.teamPlan;
  const open = db.requests.some((q) => q.userId === me.id && (q.status === 'new' || q.status === 'contacted'));
  const label = copy[PLAN_KEYS.ask] || null;
  return {
    kind: 'offer',
    title,
    preview,
    heading,
    lines: [copy[PLAN_KEYS.lead], copy[PLAN_KEYS.solo]].filter((x): x is string => !!x),
    ask: open || !label ? null : { label, source: requestSource(preview) },
    asked: open ? copy[PLAN_KEYS.asked] || null : null,
  };
}
