// /skill-library: the skill library a buyer's plan opens (DECISIONS.md D-079). Net-new, like the
// sign-in screens: there is no reference file for it, so it sits OUTSIDE the shell (no sidebar entry,
// so no portal golden moves) and is reached by its URL, which the welcome email and the www skill
// pages link to.
//
// It reads `GET /api/skills`, which answers every published skill as `open`, `locked` or `upcoming`
// by the one access rule (`canOpenSkill`), and downloads through `GET /api/skills/:id/download/:kind`,
// which checks the rule again and answers a 5-minute link. Signed out, it sends the visitor to
// /sign-in. In the fixture build there is no API, so it says the library opens when you sign in.

import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { AGENT_TRAINING, PLAN_SETS, skillOnlyBuyer, type PlanKind, type TrainingAccess } from '@ai/core/offer';
import { guidePageOf, skillGuidePath } from '@ai/core/skill-guides';
import { LEAD, leadFor } from '../../library/content';
import { BrandSlot } from '../../shell/BrandSlot';
import { Icon } from '../../components/Icon';
import { PreLaunch } from './PreLaunch';
import { AgentPlanUpgrade, GetSkillButton } from './SkillPurchase';
import s from './SkillLibrary.module.css';

export const COPY = {
  title: 'Skill Library',
  sub: 'Every skill your plan includes. Download one, then follow its Setup Guide to add it to Claude, ChatGPT or Grok Bot.',
  sets: { owner_ops: 'Owner and Operations Skills', agent: 'Agent Skills', both: 'Skills for Everyone' },
  free: 'Free',
  locked: 'Not in your plan.',
  /** D-150: an access group's member, on a skill their group doesn't open. A fact, not an upsell. */
  notIncluded: (group: string) => `Not included with ${group} access`,
  seePlans: 'See Plans',
  upcoming: (date: string) => `Coming ${date}.`,
  // `grok`: a Grok Bot template's one file (D-100).
  files: { claude: 'Download for Claude', chatgpt: 'Download for ChatGPT', practice: 'Practice Files', grok: 'Download for Grok Bot' },
  // The skill's guided setup, step by step, here in learn (D-151): `/skill-library/<page>`, same tab.
  guide: 'Setup Guide',
  /** D-151: a locked skill's guide, which shows its steps' titles and what it would take to open it. */
  preview: 'Preview the Setup',
  /** D-150: an access group's first-run welcome, at the top of the page until the member dismisses it. */
  welcome: {
    title: (group: string) => `Welcome, ${group}`,
    count: (n: number) => `Your team access includes ${n} agent ${n === 1 ? 'skill' : 'skills'}.`,
    startWith: 'Start with',
    and: 'and',
    // D-151: the Setup Guide is here in learn now, with the downloads in it.
    guides: 'Each Setup Guide walks you through it step by step, with the downloads right in it.',
    dismiss: 'Dismiss',
  },
  loading: 'Loading your skills',
  unavailable: 'The skill library opens when you sign in.',
  signIn: 'Sign In',
  failed: "Your skills didn't load. Refresh the page to try again.",
  /** The owner's way into Stripe's billing portal (cards, invoices, cancelling). */
  billing: 'Manage Billing',
  /**
   * D-148: what an access group's member sees in place of billing: their skills come with their team
   * (Utah Life), not a plan they bought. Connor's words, with the group's own name.
   */
  included: (group: string) => `Included with your ${group} team`,
  paused: 'Your second payment didn’t go through, so your AI Accelerator skills are paused. Update your card in Manage Billing and they open again on their own.',
  /** An AI Accelerator plan's way to its course pages (D-110). */
  course: 'Open the AI Accelerator',
  /** A Team tier learner's way to the Team Hub, where an owner invites their team (D-119). */
  teamHub: 'Open Team Hub',
} as const;

type SkillState = 'open' | 'locked' | 'upcoming';
type SetName = keyof typeof COPY.sets;
type FileKind = keyof typeof COPY.files;

export interface LibrarySkill {
  id: string;
  title: string;
  summary: string;
  sets: SetName;
  free: boolean;
  releasedAt: number;
  state: SkillState;
  /** The day an `upcoming` skill opens: its release, or the viewer's plan's first day (D-140). */
  opensAt?: number | null;
  files: FileKind[];
}

/** An access group whose entitlement the viewer holds (D-148). */
export interface AccessGroupInfo {
  id: string;
  name: string;
  /** D-150: how many agent skills the group's own grant opens today, from the API (never typed in). */
  skills?: number;
  /** D-150: whether the group's welcome panel is still to be shown to this learner. */
  welcome?: boolean;
  /** The skill sets the group's grant covers (`planCovers`): which skills it "applies" to. */
  covers?: SetName[];
}

/**
 * The group a member's locked row names (Design, PR #100): the one whose grant covers that skill's
 * set, or else the first. The API sends only active groups (unexpired, address verified), in a fixed
 * order, so "the first" is the same on every load. Null for a learner in no group.
 */
export function groupForSkill(skill: Pick<LibrarySkill, 'sets'>, groups: readonly AccessGroupInfo[]): AccessGroupInfo | null {
  return groups.find((g) => g.covers?.includes(skill.sets)) ?? groups[0] ?? null;
}

/** What the library knows about who is reading, for order and the locked section (D-201). */
export interface LibraryAccess {
  groups: readonly AccessGroupInfo[];
  plans?: readonly { kind?: string }[];
}

const PLAN_KINDS = new Set<string>(Object.keys(PLAN_SETS));

/** The same rule as the API's `planCovers`: `both` opens whenever the plan opens any set. */
function planCoversSet(kind: string, set: SetName): boolean {
  if (!PLAN_KINDS.has(kind)) return false;
  const opens = PLAN_SETS[kind as PlanKind];
  return set === 'both' ? opens.length > 0 : (opens as readonly string[]).includes(set);
}

/**
 * Whether this response says which sets the viewer can hold. Absent `covers` and no known plan
 * (older answers, and the tests that predate them) is unknown, and the page keeps today's order.
 */
function coverageKnown(load: LibraryAccess): boolean {
  if (load.groups.some((g) => Array.isArray(g.covers))) return true;
  return (load.plans ?? []).some((p) => p.kind !== undefined && PLAN_KINDS.has(p.kind));
}

/** True when a group grant or a bought plan covers the set, false when we know neither does, null when we can't tell. */
export function coverageFor(set: SetName, load: LibraryAccess): boolean | null {
  if (!coverageKnown(load)) return null;
  if (load.groups.some((g) => g.covers?.includes(set))) return true;
  if ((load.plans ?? []).some((p) => p.kind !== undefined && planCoversSet(p.kind, set))) return true;
  return false;
}

/**
 * A skill this viewer's access actually holds. Free skills are everyone's, so they do not count as
 * held by a plan or a group. An unreleased skill reads `upcoming` for everyone, with `opensAt` equal
 * to its release; only a plan's own first day (a different instant) counts as held.
 */
export function skillHeld(skill: Pick<LibrarySkill, 'free' | 'state' | 'opensAt' | 'releasedAt'>): boolean {
  if (skill.free || skill.state === 'locked') return false;
  if (skill.state === 'open') return true;
  return skill.opensAt != null && skill.opensAt !== skill.releasedAt;
}

/**
 * A section is in this member's access when they hold one of its skills, or when we can't tell.
 * A set we know their plan and groups do not cover is out, and so is a set they cover on paper but
 * hold none of (a sales agent is barred from owner skills the plan would otherwise open).
 */
export function sectionInAccess(set: SetName, skills: readonly LibrarySkill[], load: LibraryAccess): boolean {
  const inSet = skills.filter((k) => k.sets === set);
  if (inSet.some(skillHeld)) return true;
  const covered = coverageFor(set, load);
  if (covered === false) return false;
  if (covered === true && inSet.some((k) => !k.free && k.state === 'locked')) return false;
  return true;
}

/** Group members and Agent Plan members (D-201). Everyone else keeps today's order. */
export function reorderAudience(load: LibraryAccess): boolean {
  return load.groups.length > 0 || (load.plans ?? []).some((p) => p.kind === 'agent_plan');
}

/** Included sections first, in today's order, then the sections this member's access does not hold. */
export function sectionOrder(skills: readonly LibrarySkill[], load: LibraryAccess): SetName[] {
  const present = ORDER.filter((set) => skills.some((k) => k.sets === set));
  if (!reorderAudience(load)) return present;
  const top: SetName[] = [];
  const bottom: SetName[] = [];
  for (const set of present) (sectionInAccess(set, skills, load) ? top : bottom).push(set);
  return [...top, ...bottom];
}

/** Locked skills in a section: the count the header names. Never a free skill, which they can download. */
export function notIncludedCount(set: SetName, skills: readonly LibrarySkill[]): number {
  return skills.filter((k) => k.sets === set && k.state === 'locked').length;
}

/** The bottom section is a disclosure when this member holds none of it and it has locked skills. */
export function sectionDisclosure(set: SetName, skills: readonly LibrarySkill[], load: LibraryAccess): boolean {
  return reorderAudience(load) && !sectionInAccess(set, skills, load) && notIncludedCount(set, skills) > 0;
}

/** Title Case, word by word, leaving a group name's own capitals as they are. A trailing period comes off. */
export function titleCaseLine(phrase: string): string {
  return phrase
    .replace(/\.+$/, '')
    .trim()
    .replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

/**
 * "12 Skills, Not Included With Utah Life Access": the locked count, then the same line the locked
 * rows use, in Title Case. The line is the builder's (`lockedLines`) when this group has one.
 */
export function lockedCountLine(count: number, phrase: string): string {
  return `${count} ${count === 1 ? 'Skill' : 'Skills'}, ${titleCaseLine(phrase)}`;
}

/** The locked line for a set: the builder's string for the group that applies, else the {group} pattern. */
export function sectionPhrase(set: SetName, groups: readonly AccessGroupInfo[], lockedLines?: Readonly<Record<string, string>>): string {
  const group = groupForSkill({ sets: set }, groups);
  if (!group) return COPY.locked.replace(/\.$/, '');
  return lockedLines?.[group.id] ?? COPY.notIncluded(group.name);
}

/** Claude, ChatGPT and a Grok Bot file are one kind of action. Practice Files stay outlined (D-201). */
const PLATFORM_FILES = new Set<FileKind>(['claude', 'chatgpt', 'grok']);
export function fileActionClass(kind: FileKind): 'primary' | 'secondary' {
  return PLATFORM_FILES.has(kind) ? 'primary' : 'secondary';
}

/**
 * Open or closed, per browser (D-201). The course portal's `learner_prefs` is not this page's: the
 * Skill Library stands outside that shell and does not read the snapshot. Two people on one browser
 * share the choice; a private window starts collapsed again.
 */
export const SECTION_PREF_KEY = 'ai-skill-library-sections';

export function readSectionOpen(set: string): boolean | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SECTION_PREF_KEY) || '{}') as Record<string, unknown>;
    return typeof raw[set] === 'boolean' ? raw[set] : null;
  } catch {
    return null;
  }
}

export function writeSectionOpen(set: string, open: boolean): void {
  try {
    const raw = JSON.parse(localStorage.getItem(SECTION_PREF_KEY) || '{}') as Record<string, unknown>;
    const next: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(raw)) if (typeof v === 'boolean') next[k] = v;
    next[set] = open;
    localStorage.setItem(SECTION_PREF_KEY, JSON.stringify(next));
  } catch {
    /* private mode, quota */
  }
}

/** D-150: the skills a group's welcome names first, in order: today's training. Shown only if open. */
export const START_WITH: Readonly<Record<string, readonly string[]>> = {
  'utah-life': ['appointment-follow-up', 'repair-request-response'],
};

type Load =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      skills: LibrarySkill[];
      course: boolean;
      teamHub: boolean;
      paused: boolean;
      groups: AccessGroupInfo[];
      /** Bought plans, as `/api/skills` reports them. An access group's grant is not one of these. */
      plans: { kind?: string; status?: string }[];
      /** D-179: each group's locked line from the builder (`locked.utah_life`), by group id. */
      lockedLines: Record<string, string>;
      paidPlans: boolean;
      training: TrainingAccess;
      /** D-153: when a bought AI Accelerator opens, while it has not; null otherwise. */
      courseOpensAt: number | null;
      /** D-241: a $37 skill buyer with no plan and no access group, whose library is in the LMS now (`/learn`). */
      buyer: boolean;
    }
  | { kind: 'signed-out' }
  | { kind: 'failed' };

/** An AI Accelerator plan, by the plans `/api/skills` reports: only the AI Accelerator is a `cohort` plan. */
const holdsCourse = (plans: { kind?: string; status?: string }[] | undefined): boolean =>
  (plans ?? []).some((p) => p.kind === 'cohort' && p.status !== 'ended');

async function loadSkills(): Promise<Load> {
  try {
    const res = await fetch('/api/skills', { credentials: 'include', headers: { accept: 'application/json' } });
    if (res.status === 401 || res.status === 404) return { kind: 'signed-out' };
    if (!res.ok) return { kind: 'failed' };
    const body = (await res.json()) as {
      skills?: LibrarySkill[];
      plans?: { kind?: string; status?: string }[];
      teamHub?: boolean;
      paused?: boolean;
      accessGroups?: AccessGroupInfo[];
      lockedLines?: Record<string, string>;
      courseOpensAt?: number | null;
      training?: TrainingAccess;
      purchased?: string[];
    };
    return {
      kind: 'ready',
      skills: body.skills ?? [],
      course: holdsCourse(body.plans),
      teamHub: body.teamHub === true,
      paused: body.paused === true,
      groups: body.accessGroups ?? [],
      plans: body.plans ?? [],
      lockedLines: body.lockedLines ?? {},
      paidPlans: (body.plans ?? []).length > 0,
      training: body.training === 'open' || body.training === 'locked' ? body.training : 'hidden',
      courseOpensAt: typeof body.courseOpensAt === 'number' ? body.courseOpensAt : null,
      buyer: skillOnlyBuyer({ plans: body.plans, accessGroups: body.accessGroups, purchased: body.purchased }),
    };
  } catch {
    return { kind: 'signed-out' };
  }
}

const ORDER: SetName[] = ['owner_ops', 'agent', 'both'];
/** Where "See Plans" goes: /pricing compares all four programs (D-123). */
export const PLANS_URL = 'https://www.amplifiedimpact.io/pricing';
const dateOf = (t: number): string =>
  new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'America/Chicago' }).format(t);

/**
 * A skill's lead (`LEAD` in the www Library's content): the problem it fixes, what it does for you, and
 * who it's for, in the same words as its Library card and its www page, first under its name and above
 * how to set it up. Found by the skill's www page, which is not always its id (/content-strategist).
 */
export const leadOf = (id: string) => leadFor(guidePageOf(id));

/** A skill's guided setup in learn (D-151): `/skill-library/<page>`. */
export const guideHrefOf = (id: string): string => skillGuidePath(guidePageOf(id));

function Lead({ id }: { id: string }) {
  const lead = leadOf(id);
  if (!lead) return null;
  return (
    <dl className={s.lead} data-lead>
      <div className={s.leadProblem}>
        <dt>{LEAD.problem}</dt>
        <dd>{lead.problem}</dd>
      </div>
      <div>
        <dt>{LEAD.outcome}</dt>
        <dd>{lead.outcome}</dd>
      </div>
      {lead.forRole ? (
        <div>
          <dt>{LEAD.forRole}</dt>
          <dd>{lead.forRole}</dd>
        </div>
      ) : null}
    </dl>
  );
}

/**
 * Whether a locked row may offer the plans. Never to an access group's member (D-150, Connor): their
 * team gave them their skills, so a locked row says plainly it isn't included with their group's
 * access (`COPY.notIncluded`), with no upsell. Everyone else is offered the plans, as before.
 */
export const offersPlans = (member: boolean): boolean => !member;

/** An access group's member who bought nothing (D-148): the team of one their account sits on is plumbing, not a team. */
export const groupOnly = (load: { groups: readonly AccessGroupInfo[]; paidPlans: boolean }): boolean => load.groups.length > 0 && !load.paidPlans;

/**
 * D-150: an access group's first-run welcome, at the top of the page. Its count is the group's own
 * grant's, from the API. The skills it names link to their Setup Guides. Dismissed for good per
 * learner (`POST /api/skills/welcome/dismiss`, kept on the server, so on every device).
 */
function Welcome({ group, skills, onDismiss }: { group: AccessGroupInfo; skills: readonly LibrarySkill[]; onDismiss: () => void }) {
  const titleId = `welcome-${group.id}`;
  const count = group.skills ?? skills.filter((k) => k.state === 'open' && k.sets !== 'owner_ops').length;
  const start = (START_WITH[group.id] ?? [])
    .map((id) => skills.find((k) => k.id === id && k.state === 'open'))
    .filter((k): k is LibrarySkill => k !== undefined);
  return (
    <section className={s.welcome} aria-labelledby={titleId} data-welcome={group.id}>
      <div className={s.welcomeText}>
        <h2 className={s.welcomeTitle} id={titleId}>
          {COPY.welcome.title(group.name)}
        </h2>
        <p className={s.welcomeBody}>
          {COPY.welcome.count(count)}{' '}
          {start.length ? (
            <>
              {COPY.welcome.startWith}{' '}
              {start.map((k, i) => (
                <span key={k.id}>
                  {i > 0 ? ` ${COPY.welcome.and} ` : null}
                  <Link className={s.welcomeLink} to={guideHrefOf(k.id)}>
                    {k.title}
                  </Link>
                </span>
              ))}
              .{' '}
            </>
          ) : null}
          {COPY.welcome.guides}
        </p>
      </div>
      <button type="button" className={s.dismiss} aria-label={COPY.welcome.dismiss} title={COPY.welcome.dismiss} onClick={onDismiss}>
        <Icon name="x" size={16} />
      </button>
    </section>
  );
}

/** Put a group's welcome away for good. Best effort: hidden at once, and kept by the server when it answers. */
async function dismissWelcome(group: string): Promise<void> {
  try {
    await fetch('/api/skills/welcome/dismiss', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ group }),
    });
  } catch {
    /* Offline: it is hidden for this visit and shows again on the next. */
  }
}

function TrainingRow({ access }: { access: TrainingAccess }) {
  const [open, setOpen] = useState(false);
  if (access === 'hidden') return null;
  return (
    <ul className={s.list} role="list">
      <li className={s.skill} data-state={access === 'open' ? 'open' : 'locked'} data-training={access}>
        <div className={s.text}>
          <h2 className={s.name} id="weekly-live-training">
            {AGENT_TRAINING.title}
          </h2>
        </div>
        <div className={s.actions}>
          {access === 'open' ? (
            <span className={s.note}>
              <Icon name="checkCircle" size={16} />
              {AGENT_TRAINING.included}
            </span>
          ) : (
            <button type="button" className={s.primary} onClick={() => setOpen(true)}>
              <Icon name="lock" size={16} />
              {AGENT_TRAINING.locked}
            </button>
          )}
        </div>
      </li>
      {open ? <AgentPlanUpgrade onClose={() => setOpen(false)} /> : null}
    </ul>
  );
}

function SkillRow({ skill, groups, lockedLines }: { skill: LibrarySkill; groups: readonly AccessGroupInfo[]; lockedLines: Readonly<Record<string, string>> }) {
  const group = groupForSkill(skill, groups);
  const memberLine = group ? (lockedLines[group.id] ?? COPY.notIncluded(group.name)) : null;
  const setupId = `setup-${skill.id}`;
  return (
    <li className={s.skill} data-state={skill.state}>
      <div className={s.text}>
        <h3 className={s.name}>
          {skill.title}
          {skill.free ? <span className={s.badge}>{COPY.free}</span> : null}
        </h3>
        <Lead id={skill.id} />
        <p className={s.summary}>{skill.summary}</p>
      </div>
      {/* The downloads and the Setup Guide, under the lead, named "Set it up" (`LEAD.setup`). */}
      {skill.state === 'open' ? (
        <p className={s.setupLabel} id={setupId}>
          {LEAD.setup}
        </p>
      ) : null}
      <div className={s.actions} {...(skill.state === 'open' ? { role: 'group', 'aria-labelledby': setupId } : {})}>
        {skill.state === 'open' ? (
          <>
            {skill.files.map((kind) => (
              <a
                key={kind}
                className={fileActionClass(kind) === 'primary' ? s.primary : s.secondary}
                href={`/api/skills/${encodeURIComponent(skill.id)}/download/${kind}`}
              >
                <Icon name="download" size={16} />
                {COPY.files[kind]}
              </a>
            ))}
            <Link className={s.secondary} to={guideHrefOf(skill.id)}>
              <Icon name="listChecks" size={16} />
              {COPY.guide}
            </Link>
          </>
        ) : skill.state === 'locked' ? (
          <>
            <span className={memberLine === null ? s.note : `${s.note} ${s.notIncluded}`}>
              <Icon name="lock" size={16} />
              {memberLine === null ? COPY.locked : memberLine}
            </span>
            {/* D-151: the guide shows the steps' titles and what it would take to open it. */}
            <Link className={s.secondary} to={guideHrefOf(skill.id)}>
              <Icon name="listChecks" size={16} />
              {COPY.preview}
            </Link>
            {/* A bought skill, or every skill with Amplified Insiders. Never for an access group's member. */}
            {offersPlans(memberLine !== null) ? <GetSkillButton skillId={skill.id} sets={skill.sets} className={s.primary} /> : null}
          </>
        ) : (
          <span className={s.note}>
            <Icon name="clock" size={16} />
            {COPY.upcoming(dateOf(skill.opensAt ?? skill.releasedAt))}
          </span>
        )}
      </div>
    </li>
  );
}

export function Component() {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  // D-150: welcomes put away in this visit, hidden before the server has answered.
  const [dismissed, setDismissed] = useState<readonly string[]>([]);
  // D-201: a locked section the member has opened or closed in this visit. Absent: the browser's memory, else closed.
  const [opened, setOpened] = useState<Readonly<Record<string, boolean>>>({});

  const sectionIsOpen = (set: string): boolean => (Object.prototype.hasOwnProperty.call(opened, set) ? opened[set]! : (readSectionOpen(set) ?? false));
  const toggleSection = (set: string) => {
    const next = !sectionIsOpen(set);
    writeSectionOpen(set, next);
    setOpened((current) => ({ ...current, [set]: next }));
  };

  useEffect(() => {
    let alive = true;
    void loadSkills().then((next) => {
      if (alive) setLoad(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Outside `AppShell`, so this route marks the body ready itself, as /sign-in does.
  useEffect(() => {
    if (load.kind !== 'loading') document.body.dataset.appReady = 'true';
  }, [load.kind]);

  // D-241: a $37 skill buyer with no plan and no access group has their library inside the LMS. Everyone else, an
  // access group's member (Utah Life) and every plan's member above all, keeps this page exactly as it was.
  if (load.kind === 'ready' && load.buyer) return <Navigate to="/learn" replace />;

  return (
    <main className={s.page}>
      <header className={s.head}>
        <BrandSlot kind="lockup" />
        <h1 className={s.h1}>{COPY.title}</h1>
        <p className={s.sub}>{COPY.sub}</p>
        {load.kind === 'ready' ? (
          <div className={s.actions}>
            {load.course ? (
              <a className={s.primary} href="/course">
                {COPY.course}
              </a>
            ) : null}
            {load.teamHub && !groupOnly(load) ? (
              <a className={s.secondary} href="/team">
                {COPY.teamHub}
              </a>
            ) : null}
            {/* A team member who bought nothing has nothing to bill (D-148): the note says why it's theirs. */}
            {load.paidPlans || load.groups.length === 0 ? (
              <a className={s.secondary} href="/api/billing/portal">
                {COPY.billing}
              </a>
            ) : null}
            {load.groups.map((g) => (
              <p key={g.id} className={s.included}>
                <Icon name="checkCircle" size={16} />
                {COPY.included(g.name)}
              </p>
            ))}
          </div>
        ) : null}
        {load.kind === 'ready' && load.paused ? (
          // D-143: why the AI Accelerator's skills read locked, and where to fix it.
          <p className={s.note} role="status">
            <Icon name="lock" size={16} />
            {COPY.paused}
          </p>
        ) : null}
      </header>

      {/* D-153: bought, and opening at the first live build: why the course and the skills wait. */}
      {load.kind === 'ready' && load.courseOpensAt !== null ? <PreLaunch opensAt={load.courseOpensAt} /> : null}

      {load.kind === 'ready' ? <TrainingRow access={load.training} /> : null}

      {load.kind === 'ready'
        ? load.groups
            .filter((g) => g.welcome !== false && !dismissed.includes(g.id))
            .map((g) => (
              <Welcome
                key={g.id}
                group={g}
                skills={load.skills}
                onDismiss={() => {
                  setDismissed((d) => [...d, g.id]);
                  void dismissWelcome(g.id);
                }}
              />
            ))
        : null}

      {load.kind === 'loading' ? (
        <div className={s.status} role="status" aria-busy="true">
          <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} label={COPY.loading} />
        </div>
      ) : load.kind === 'signed-out' ? (
        <div className={s.status}>
          <p>{COPY.unavailable}</p>
          <a className={s.primary} href="/sign-in">
            {COPY.signIn}
          </a>
        </div>
      ) : load.kind === 'failed' ? (
        <div className={s.status} role="alert">
          {COPY.failed}
        </div>
      ) : (
        sectionOrder(load.skills, load).map((set) => {
          const disclosure = sectionDisclosure(set, load.skills, load);
          const open = !disclosure || sectionIsOpen(set);
          const panelId = `set-panel-${set}`;
          const phrase = sectionPhrase(set, load.groups, load.lockedLines);
          const count = notIncludedCount(set, load.skills);
          return (
            <section key={set} className={s.group} aria-labelledby={`set-${set}`} data-collapsed={disclosure && !open ? 'true' : undefined}>
              <h2 className={s.h2}>
                {disclosure ? (
                  <button type="button" className={s.disclosure} aria-expanded={open} aria-controls={panelId} onClick={() => toggleSection(set)}>
                    <span className={s.disclosureTitle} id={`set-${set}`}>
                      {COPY.sets[set]}
                    </span>{' '}
                    <span className={s.disclosureCount}>{lockedCountLine(count, phrase)}</span>
                    <Icon name={open ? 'chevU' : 'chevD'} size={20} />
                  </button>
                ) : (
                  <span id={`set-${set}`}>{COPY.sets[set]}</span>
                )}
              </h2>
              <ul id={panelId} className={s.list} role="list" hidden={disclosure && !open ? true : undefined}>
                {load.skills
                  .filter((k) => k.sets === set)
                  .map((k) => (
                    <SkillRow key={k.id} skill={k} groups={load.groups} lockedLines={load.lockedLines} />
                  ))}
              </ul>
            </section>
          );
        })
      )}
    </main>
  );
}

export default Component;
