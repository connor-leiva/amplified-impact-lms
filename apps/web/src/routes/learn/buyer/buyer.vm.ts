// D-241: the $37 skill buyer inside the LMS, as data. Pure: the pages (`pages.tsx`) draw what these return, and the
// frame (`Buyer.tsx`) asks `buyerView` which page an address is. The design is `handoff/lms-mockup/buyer.html`.
import { skillOnlyBuyer } from '@ai/core/offer';
import type { SkillSet } from '@ai/core/offer';
import { guidePageOf } from '@ai/core/skill-guides';
import { leadFor } from '../../../library/content';
import { platformsOf } from '../Library.vm';
import type { ApiSkill, FileKind, SkillsPayload } from '../Library.vm';
import { LEARN_ROOT, learnAccount, learnHome, learnOfficeHours, learnSkill, learnSkills, learnTraining, learnWeek } from '../routes';
import type { Shell } from '../lms-v3/AppShell';
import { COPY, PLANS, planFor } from './content';
import type { BuyerPlan } from './content';

export { skillOnlyBuyer };

/** A learner with a $37 skill and nothing more: the one audience these pages are for (`skillOnlyBuyer`). */
export const isSkillBuyer = (p: SkillsPayload | null | undefined): boolean => !!p && skillOnlyBuyer(p);

/** One skill as the buyer's pages show it: the API's row, its lead and where its guide is. */
export interface BuyerSkill {
  id: string;
  title: string;
  sets: SkillSet;
  free: boolean;
  /** Bought for $37 and still held. */
  owned: boolean;
  /** Where it falls among their purchases, the latest first (-1: not bought). */
  rank: number;
  /** Open to this buyer: bought, or free. */
  open: boolean;
  /** Released for sale (an unreleased skill reads `upcoming` and has no $37 button). */
  forSale: boolean;
  files: FileKind[];
  slug: string;
  problem: string;
  outcome: string;
  role: string;
  tools: string;
}

/** The AI apps a skill's downloads are for, as the members' Skill Library says it (`platformsOf`). */
export const toolsOf = (files: readonly FileKind[]): string => platformsOf(files);

export function buyerSkill(s: ApiSkill, purchased: readonly string[]): BuyerSkill {
  const slug = guidePageOf(s.id);
  const lead = leadFor(slug);
  return {
    id: s.id,
    title: s.title,
    sets: s.sets,
    free: s.free,
    owned: purchased.includes(s.id),
    rank: purchased.indexOf(s.id),
    open: s.state === 'open',
    forSale: s.state !== 'upcoming',
    files: s.files,
    slug,
    problem: lead?.problem ?? s.summary,
    outcome: lead?.outcome ?? s.summary,
    role: lead?.forRole ?? 'Anyone',
    tools: toolsOf(s.files),
  };
}

/** The buyer's skills, in the API's order (release, then title), each with its lead. */
export function buyerSkills(p: SkillsPayload): BuyerSkill[] {
  const purchased = p.purchased ?? [];
  return p.skills.map((s) => buyerSkill(s, purchased));
}

/** The skills they bought, the latest purchase first (the API's `purchased` order). */
export const ownedOf = (skills: readonly BuyerSkill[]): BuyerSkill[] => skills.filter((s) => s.owned).sort((a, b) => a.rank - b.rank);
export const lockedOf = (skills: readonly BuyerSkill[]): BuyerSkill[] => skills.filter((s) => !s.open);

/** The buyer's one upgrade: Team Leader Insiders once any skill they bought is an owner, ops or both skill. */
export function myPlan(owned: readonly BuyerSkill[]): BuyerPlan {
  return owned.some((s) => s.sets !== 'agent') ? PLANS.leader : PLANS.agent;
}

/** What a plan would open of the skills locked now (Agent Insiders: the agent set and `both`, as `PLAN_SETS` says). */
export function opensWith(plan: BuyerPlan, skills: readonly BuyerSkill[]): number {
  return lockedOf(skills).filter((s) => plan.key === 'leader' || s.sets !== 'owner_ops').length;
}

/** A skill's Insiders plan, by its set (`skillUpsell`). */
export const planOf = (s: Pick<BuyerSkill, 'sets'>): BuyerPlan => planFor(s.sets);

/** The library's three sets, each yours first, then free, then the rest in the API's order; with its line. */
export const SET_ORDER: readonly SkillSet[] = ['owner_ops', 'agent', 'both'];
export function librarySets(skills: readonly BuyerSkill[]): { set: SkillSet; label: string; meta: string; rows: BuyerSkill[] }[] {
  return SET_ORDER.map((set) => {
    const xs = skills.filter((s) => s.sets === set);
    const rows = [...xs].sort((a, b) => Number(b.owned) - Number(a.owned) || Number(b.free) - Number(a.free));
    return { set, label: COPY.sets[set], meta: COPY.library.meta(xs.length, xs.filter((s) => s.owned).length, xs.filter((s) => s.free).length), rows };
  });
}

/** Rows a list shows before Show All. */
export const FIRST_ROWS = 5;

/** Three skills to open next: the first locked ones in the set of the buyer's first skill. */
export function nextSkills(skills: readonly BuyerSkill[], first: BuyerSkill): BuyerSkill[] {
  return skills.filter((s) => s.sets === first.sets && !s.open).slice(0, 3);
}

/** The downloads a skill has, in the order the pages show them: Claude and ChatGPT side by side. */
export const DOWNLOADS: readonly FileKind[] = ['claude', 'chatgpt', 'grok', 'practice'];
export const DOWNLOAD_LABEL: Record<FileKind, string> = { claude: 'Download for Claude', chatgpt: 'Download for ChatGPT', grok: 'Download for Grok Bot', practice: 'Practice Files' };
export const downloadsOf = (s: Pick<BuyerSkill, 'files'>): FileKind[] => DOWNLOADS.filter((k) => s.files.includes(k));
export const downloadHref = (id: string, kind: FileKind): string => `/api/skills/${encodeURIComponent(id)}/download/${kind}`;

// --- addresses -------------------------------------------------------------------------------------

export type BuyerView =
  | { kind: 'home' }
  | { kind: 'library' }
  | { kind: 'skill'; slug: string }
  | { kind: 'training' }
  | { kind: 'office' }
  | { kind: 'accelerator'; week: number }
  | { kind: 'account' }
  /** Anything else under /learn: Home. */
  | { kind: 'other' };

export function buyerView(pathname: string): BuyerView {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (p === LEARN_ROOT) return { kind: 'home' };
  if (p === learnSkills()) return { kind: 'library' };
  const sk = /^\/learn\/skills\/([^/]+)$/.exec(p);
  if (sk) return { kind: 'skill', slug: decodeURIComponent(sk[1]!) };
  if (p === learnTraining()) return { kind: 'training' };
  if (p === learnOfficeHours()) return { kind: 'office' };
  if (p === learnAccount()) return { kind: 'account' };
  const wk = /^\/learn\/week\/(\d)$/.exec(p);
  if (wk && Number(wk[1]) <= 8) return { kind: 'accelerator', week: Number(wk[1]) };
  return { kind: 'other' };
}

/** The nav row a view marks current. */
export function buyerCurrent(v: BuyerView): string | undefined {
  if (v.kind === 'home') return 'home';
  if (v.kind === 'library' || v.kind === 'skill') return 'library';
  if (v.kind === 'training') return 'training';
  if (v.kind === 'office') return 'office-hours';
  if (v.kind === 'accelerator') return `week-${v.week}`;
  return undefined;
}

/** The hidden breadcrumb's words for a view. */
export function buyerHere(v: BuyerView, skillTitle: string | null): string {
  if (v.kind === 'skill') return skillTitle ?? COPY.here.library;
  if (v.kind === 'library') return COPY.here.library;
  if (v.kind === 'training') return COPY.here.training;
  if (v.kind === 'office') return COPY.here.office;
  if (v.kind === 'accelerator') return COPY.here.accelerator;
  if (v.kind === 'account') return COPY.here.account;
  return COPY.here.home;
}

/** A v3 page draws its own `[data-ai]` frame; the guide player and the Account page are today's, inside the shell. */
export const v3PageOf = (v: BuyerView, skillOpen: boolean): boolean => v.kind !== 'account' && !(v.kind === 'skill' && skillOpen);

/**
 * A week of the AI Accelerator as the outline shows a locked one: what `GET /api/course` answers a $37 buyer
 * (`outline`, from `courseOutline`). The course's words are data (D-173); none of a week's content comes with it.
 */
export interface OutlineWeek {
  week: number;
  title: string;
  question: string;
  outcome: string;
}

/** The outline from `GET /api/course`'s answer to a buyer (a 403 with `outline`), or none. */
export function outlineOf(body: unknown): OutlineWeek[] {
  const rows = (body as { outline?: unknown } | null)?.outline;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((w): w is OutlineWeek => !!w && typeof w === 'object' && typeof (w as OutlineWeek).week === 'number' && typeof (w as OutlineWeek).title === 'string')
    .map((w) => ({ week: w.week, title: w.title, question: w.question ?? '', outcome: w.outcome ?? '' }));
}

/** The shell: the members' sidebar and top bar with the buyer's rows (`AppShell`). */
export function buyerShell(input: {
  owned: readonly BuyerSkill[];
  weeks: readonly OutlineWeek[];
  initials: string;
  here: string;
  logo: string;
  account: { open: boolean; onClick: () => void };
}): Shell {
  const n = input.owned.length;
  return {
    homeHref: learnHome(),
    helpHref: `mailto:${COPY.support}`,
    logo: { label: COPY.shell.logo, app: input.logo },
    cohort: [COPY.shell.program, COPY.shell.bought(n)],
    nav: [
      { icon: 'home', label: COPY.shell.home, href: learnHome(), id: 'home' },
      { icon: 'grid', label: COPY.shell.library, href: learnSkills(), id: 'library' },
      { icon: 'users', label: COPY.shell.office, href: learnOfficeHours(), id: 'office-hours', locked: true },
      { icon: 'radio', label: COPY.shell.training, href: learnTraining(), id: 'training', locked: true },
    ],
    weeksLabel: COPY.shell.weeks,
    weeks: input.weeks.map((w) => ({ n: w.week, title: w.title, href: learnWeek(w.week), id: `week-${w.week}`, locked: true })),
    next: null,
    account: { initials: input.initials, aria: 'Your account', onClick: input.account.onClick, open: input.account.open },
    here: input.here,
  };
}

/** The strip in the top bar: the buyer's own skill (or skills), and where it opens. */
export function stripOf(owned: readonly BuyerSkill[]): { label: string; title: string; more: string | null; action: string; href: string } | null {
  const first = owned[0];
  if (!first) return null;
  if (owned.length === 1) return { label: COPY.shell.yourSkill, title: first.title, more: null, action: COPY.shell.openGuide, href: learnSkill(first.slug) };
  return { label: COPY.shell.yourSkills, title: first.title, more: COPY.shell.more(owned.length - 1), action: COPY.shell.openSkills, href: learnSkills() };
}

/** Initials for the account button ("Alex Morgan" → "AM"). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}
