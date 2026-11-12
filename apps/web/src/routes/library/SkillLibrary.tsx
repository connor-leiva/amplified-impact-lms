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
import { SETUP_GUIDE_ORIGIN, setupGuideHref } from '@ai/core/skills';
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
  seePlans: 'See Plans',
  upcoming: (date: string) => `Coming ${date}.`,
  // `grok`: a Grok Bot template's one file (D-100).
  files: { claude: 'Download for Claude', chatgpt: 'Download for ChatGPT', practice: 'Practice Files', grok: 'Download for Grok Bot' },
  // The skill's www page, with its guided setup step by step (D-101), in a new tab.
  guide: 'Setup Guide',
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
}

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
export const leadOf = (id: string) => leadFor(setupGuideHref(id).replace(`${SETUP_GUIDE_ORIGIN}/`, ''));

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
 * Whether a locked row may offer the plans. Not to an access group's member on an agent or `both` skill
 * (D-148): their group already gives them the Agent Plan's skills, so a plan upsell there would be
 * selling them what they have. Owner and ops skills, which the Agent Plan doesn't include, keep it.
 */
export const offersPlans = (skill: Pick<LibrarySkill, 'sets'>, member: boolean): boolean => !member || skill.sets === 'owner_ops';

/** An access group's member who bought nothing (D-148): the team of one their account sits on is plumbing, not a team. */
export const groupOnly = (load: { groups: readonly AccessGroupInfo[]; paidPlans: boolean }): boolean => load.groups.length > 0 && !load.paidPlans;

function SkillRow({ skill, member }: { skill: LibrarySkill; member: boolean }) {
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
            <a className={s.secondary} href={setupGuideHref(skill.id)} target="_blank" rel="noopener">
              <Icon name="listChecks" size={16} />
              {COPY.guide}
            </a>
          </>
        ) : skill.state === 'locked' ? (
          <>
            <span className={s.note}>
              <Icon name="lock" size={16} />
              {COPY.locked}
            </span>
            {/* Every program, the Agent Plan included (D-140): `/offer#plans` lists three of the four. */}
            {offersPlans(skill, member) ? (
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
                  <SkillRow key={k.id} skill={k} member={load.groups.length > 0} />
                ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

export default Component;
