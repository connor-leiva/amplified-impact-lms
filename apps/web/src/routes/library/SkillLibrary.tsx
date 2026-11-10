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
import { BrandSlot } from '../../shell/BrandSlot';
import { Icon } from '../../components/Icon';
import s from './SkillLibrary.module.css';

export const COPY = {
  title: 'Skill Library',
  sub: 'Every skill your plan includes. Download one, then add it to Claude or ChatGPT.',
  sets: { owner_ops: 'Owner and Operations Skills', agent: 'Agent Skills', both: 'Skills for Everyone' },
  free: 'Free',
  locked: 'Not in your plan.',
  seePlans: 'See Plans',
  upcoming: (date: string) => `Coming ${date}.`,
  files: { claude: 'Download for Claude', chatgpt: 'Download for ChatGPT', practice: 'Practice Files' },
  loading: 'Loading your skills',
  unavailable: 'The skill library opens when you sign in.',
  signIn: 'Sign In',
  failed: "Your skills didn't load. Refresh the page to try again.",
  /** The owner's way into Stripe's billing portal (cards, invoices, cancelling). */
  billing: 'Manage Billing',
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
  files: FileKind[];
}

type Load = { kind: 'loading' } | { kind: 'ready'; skills: LibrarySkill[] } | { kind: 'signed-out' } | { kind: 'failed' };

async function loadSkills(): Promise<Load> {
  try {
    const res = await fetch('/api/skills', { credentials: 'include', headers: { accept: 'application/json' } });
    if (res.status === 401 || res.status === 404) return { kind: 'signed-out' };
    if (!res.ok) return { kind: 'failed' };
    const body = (await res.json()) as { skills?: LibrarySkill[] };
    return { kind: 'ready', skills: body.skills ?? [] };
  } catch {
    return { kind: 'signed-out' };
  }
}

const ORDER: SetName[] = ['owner_ops', 'agent', 'both'];
const dateOf = (t: number): string =>
  new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'America/Chicago' }).format(t);

function SkillRow({ skill }: { skill: LibrarySkill }) {
  return (
    <li className={s.skill} data-state={skill.state}>
      <div className={s.text}>
        <h3 className={s.name}>
          {skill.title}
          {skill.free ? <span className={s.badge}>{COPY.free}</span> : null}
        </h3>
        <p className={s.summary}>{skill.summary}</p>
      </div>
      <div className={s.actions}>
        {skill.state === 'open' ? (
          skill.files.map((kind, i) => (
            <a
              key={kind}
              className={i === 0 ? s.primary : s.secondary}
              href={`/api/skills/${encodeURIComponent(skill.id)}/download/${kind}`}
            >
              <Icon name="download" size={16} />
              {COPY.files[kind]}
            </a>
          ))
        ) : skill.state === 'locked' ? (
          <>
            <span className={s.note}>
              <Icon name="lock" size={16} />
              {COPY.locked}
            </span>
            <a className={s.secondary} href="https://www.amplifiedimpact.io/offer#plans">
              {COPY.seePlans}
            </a>
          </>
        ) : (
          <span className={s.note}>
            <Icon name="clock" size={16} />
            {COPY.upcoming(dateOf(skill.releasedAt))}
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
          <a className={s.secondary} href="/api/billing/portal">
            {COPY.billing}
          </a>
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
                  <SkillRow key={k.id} skill={k} />
                ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}

export default Component;
