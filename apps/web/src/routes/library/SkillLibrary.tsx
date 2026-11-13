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
import { Link } from 'react-router';
import { guidePageOf, skillGuidePath } from '@ai/core/skill-guides';
import { LEAD, leadFor } from '../../library/content';
import { BrandSlot } from '../../shell/BrandSlot';
import { Icon } from '../../components/Icon';
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

/** D-150: the skills a group's welcome names first, in order: today's training. Shown only if open. */
export const START_WITH: Readonly<Record<string, readonly string[]>> = {
  'utah-life': ['appointment-follow-up', 'repair-request-response'],
};

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; skills: LibrarySkill[]; course: boolean; teamHub: boolean; paused: boolean; groups: AccessGroupInfo[]; paidPlans: boolean }
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
    };
    return {
      kind: 'ready',
      skills: body.skills ?? [],
      course: holdsCourse(body.plans),
      teamHub: body.teamHub === true,
      paused: body.paused === true,
      groups: body.accessGroups ?? [],
      paidPlans: (body.plans ?? []).length > 0,
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

function SkillRow({ skill, groups }: { skill: LibrarySkill; groups: readonly AccessGroupInfo[] }) {
  const member = groupForSkill(skill, groups)?.name ?? null;
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
            {skill.files.map((kind, i) => (
              <a
                key={kind}
                className={i === 0 ? s.primary : s.secondary}
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
            <span className={member === null ? s.note : `${s.note} ${s.notIncluded}`}>
              <Icon name="lock" size={16} />
              {member === null ? COPY.locked : COPY.notIncluded(member)}
            </span>
            {/* D-151: the guide shows the steps' titles and what it would take to open it. */}
            <Link className={s.secondary} to={guideHrefOf(skill.id)}>
              <Icon name="listChecks" size={16} />
              {COPY.preview}
            </Link>
            {/* Every program, the Agent Plan included (D-140): `/offer#plans` lists three of the four. */}
            {offersPlans(member !== null) ? (
              <a className={s.secondary} href={PLANS_URL}>
                {COPY.seePlans}
              </a>
            ) : null}
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
        ORDER.filter((set) => load.skills.some((k) => k.sets === set)).map((set) => (
          <section key={set} className={s.group} aria-labelledby={`set-${set}`}>
            <h2 className={s.h2} id={`set-${set}`}>
              {COPY.sets[set]}
            </h2>
            <ul className={s.list} role="list">
              {load.skills
                .filter((k) => k.sets === set)
                .map((k) => (
                  <SkillRow key={k.id} skill={k} groups={load.groups} />
                ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

export default Component;
