// /skill-library/:slug: a skill's guided setup, step by step, in learn (DECISIONS.md D-151). Net-new
// and outside the shell, like the Skill Library it opens from.
//
// It reads `GET /api/skill-guides/:slug`, which answers the full setup only when the skill library's
// one access rule opens the skill for this learner. This file holds no guide's words: every step,
// button, file and word to paste comes from that answer, so no browser bundle carries a setup. A
// locked or upcoming skill shows what www shows anyone, its steps' titles, and what it would take to
// open it: "Not included with Utah Life access" for an access group's member (no upsell, D-150),
// "Not in your plan." and Get This Skill for anyone else. Signed out, it sends the visitor to sign in and
// back here (`next`).
//
// THE STEPS, ONE AT A TIME, as the www pages did (D-070): "Step 2 of 7", Back and Next, the place kept
// on this device. Every step's title is a button above, so any step is one tap away. Words to say are
// copied with a tap; "Copy & Open Claude" copies them and opens the app in a new tab. A step's file
// downloads through `GET /api/skills/:id/download/:kind`, which checks the rule again.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { GuideInline, GuideLaneId, GuideStep, GuideUi, SkillGuide, SkillGuidePreview } from '@ai/core/skill-guides';
import { LEAD } from '../../library/content';
import { BrandSlot } from '../../shell/BrandSlot';
import { Icon } from '../../components/Icon';
import { COPY as LIBRARY, groupForSkill } from './SkillLibrary';
import { GetSkillButton, SKILL_PURCHASE } from './SkillPurchase';
import type { AccessGroupInfo } from './SkillLibrary';
import s from './SkillGuide.module.css';

export const COPY = {
  back: 'Skill Library',
  loading: 'Loading the guided setup',
  missing: 'We couldn’t find that skill.',
  failed: 'The guided setup didn’t load. Refresh the page to try again.',
  /** Over a locked skill's steps' titles: the setup is there, behind the plan line under it. */
  previewNote: 'Every step, with what to click and the words to paste, opens with the skill.',
  copyFailed: 'Copy didn’t work here. Select the words and copy them yourself.',
  question: 'Which AI app do you use?',
} as const;

type State = 'open' | 'locked' | 'upcoming';

export interface GuideAnswer {
  slug: string;
  skill: string;
  title: string;
  sets: 'owner_ops' | 'agent' | 'both';
  free: boolean;
  state: State;
  opensAt: number | null;
  accessGroups: AccessGroupInfo[];
  paidPlans: boolean;
  preview: SkillGuidePreview;
  guide: SkillGuide | null;
  ui: GuideUi | null;
}

type Load = { kind: 'loading' } | { kind: 'ready'; answer: GuideAnswer } | { kind: 'missing' } | { kind: 'failed' };

const SIGN_IN = '/sign-in';
/** How long the copy confirmation stays, as on www's guide pages. */
export const TOAST_MS = 3200;
const dateOf = (t: number): string => new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'America/Chicago' }).format(t);

/** A learn path for this guide, the one `next` the sign-in screen accepts (`safeNext`). */
export const guidePath = (slug: string): string => `/skill-library/${slug}`;

function Inline({ segs }: { segs: readonly GuideInline[] }) {
  return (
    <>
      {segs.map((seg, i) => {
        if (typeof seg === 'string') return <span key={i}>{seg}</span>;
        if ('strong' in seg) return <strong key={i}>{seg.strong}</strong>;
        if (seg.sameTab && seg.href.startsWith('/')) {
          return (
            <Link key={i} to={seg.href}>
              {seg.link}
            </Link>
          );
        }
        return (
          <a key={i} href={seg.href} target="_blank" rel="noopener">
            {seg.link}
          </a>
        );
      })}
    </>
  );
}

/** The clipboard, or the old way where it isn't allowed. True when the words were copied. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** The place in a lane, kept on this device only. Never an error. */
function readStep(key: string): number {
  try {
    const n = Number(window.localStorage.getItem(key));
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}
function saveStep(key: string, n: number): void {
  try {
    window.localStorage.setItem(key, String(n));
  } catch {
    /* Private mode: the place is not kept. */
  }
}

function StepView({
  step,
  skill,
  lane,
  ui,
  say,
}: {
  step: GuideStep;
  skill: string;
  lane: GuideLaneId;
  ui: GuideUi;
  say: (words: string, toast: string, open?: string) => void;
}) {
  const toast = lane === 'grok' ? ui.copy.copiedGrok : ui.copy.copied;
  const opens = lane === 'grok' ? null : ui.copyOpen[lane];
  const action = step.action;
  return (
    <div className={s.stepBody}>
      <p className={s.text}>
        <Inline segs={step.body} />
      </p>
      {action ? (
        action.kind === 'file' ? (
          <a className={s.primary} href={`/api/skills/${encodeURIComponent(skill)}/download/${action.file}`}>
            <Icon name="download" size={16} />
            {action.label}
          </a>
        ) : (
          <a className={s.secondary} href={action.href} target="_blank" rel="noopener">
            {action.label}
            <Icon name="ext" size={14} />
          </a>
        )
      ) : null}
      {step.copy !== undefined ? (
        <div className={s.copyRow}>
          <button type="button" className={s.chip} onClick={() => say(step.copy!, toast)} aria-label={`${ui.copy.tag}: ${step.copy}`}>
            <span className={s.chipText}>{step.copy}</span>
            <span className={s.chipTag} aria-hidden="true">
              {ui.copy.tag}
            </span>
          </button>
          {opens ? (
            <a className={s.primary} href={opens.href} target="_blank" rel="noopener" onClick={() => say(step.copy!, opens.toast)}>
              {opens.label}
            </a>
          ) : null}
        </div>
      ) : null}
      {/* The words first, then Copy & Open, for a line and a block alike (Design's look check on PR 105). */}
      {step.copyBlock !== undefined ? (
        <div className={s.copyRow}>
          <button type="button" className={s.block} onClick={() => say(step.copyBlock!, toast)} aria-label={`${ui.copy.tag}: ${step.title}`}>
            <span className={s.blockText}>{step.copyBlock}</span>
            <span className={s.chipTag} aria-hidden="true">
              {ui.copy.tag}
            </span>
          </button>
          {opens ? (
            <a className={s.primary} href={opens.href} target="_blank" rel="noopener" onClick={() => say(step.copyBlock!, opens.toast)}>
              {opens.label}
            </a>
          ) : null}
        </div>
      ) : null}
      {step.note ? (
        <p className={s.note}>
          <Inline segs={step.note} />
        </p>
      ) : null}
    </div>
  );
}

/** The open guide: the app switch when there is more than one, then that app's steps, one at a time. */
function OpenGuide({ guide, ui }: { guide: SkillGuide; ui: GuideUi }) {
  const [laneId, setLaneId] = useState<GuideLaneId>(guide.lanes[0]?.id ?? 'claude');
  const lane = guide.lanes.find((l) => l.id === laneId) ?? guide.lanes[0];
  const key = `guide-step:${guide.slug}:${laneId}`;
  const [at, setAt] = useState(() => readStep(key));
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    setAt(readStep(key));
  }, [key]);

  const total = lane?.steps.length ?? 0;
  const current = Math.min(at, Math.max(0, total - 1));
  const go = useCallback(
    (n: number) => {
      moved.current = true;
      setAt(n);
      saveStep(key, n);
    },
    [key],
  );
  // Moving to a step puts the keyboard and a screen reader on its title.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [current]);

  // The confirmation shows at the foot of the screen, wherever the words were, then clears.
  const clearing = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(clearing.current), []);
  const say = useCallback((words: string, toast: string) => {
    void copyText(words).then((ok) => {
      setMessage('');
      window.clearTimeout(clearing.current);
      window.setTimeout(() => setMessage(ok ? toast : COPY.copyFailed), 50);
      clearing.current = window.setTimeout(() => setMessage(''), TOAST_MS);
    });
  }, []);

  if (!lane) return null;
  const step = lane.steps[current];
  return (
    <section className={s.card} aria-labelledby="guide-setup">
      <h2 className={s.h2} id="guide-setup">
        {ui.setupTitle}
      </h2>
      <p className={s.intro}>{guide.intro}</p>
      {guide.lanes.length > 1 ? (
        <div className={s.switch} role="group" aria-label={guide.question ?? COPY.question}>
          <p className={s.question}>{guide.question ?? COPY.question}</p>
          <div className={s.switchRow}>
            {guide.lanes.map((l) => (
              <button key={l.id} type="button" className={s.switchButton} aria-pressed={l.id === laneId} onClick={() => setLaneId(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <ol className={s.steps} aria-label={ui.setupTitle}>
        {lane.steps.map((st, i) => (
          <li key={`${lane.id}-${i}`}>
            <button
              type="button"
              className={s.stepTab}
              aria-current={i === current ? 'step' : undefined}
              data-done={i < current ? 'true' : undefined}
              onClick={() => go(i)}
            >
              <span className={s.stepN} aria-hidden="true">
                {i < current ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <span>{st.title}</span>
            </button>
          </li>
        ))}
      </ol>
      {step ? (
        <article className={s.step} aria-labelledby="guide-step-title">
          <p className={s.progress}>{ui.guided.progress.replace('{n}', String(current + 1)).replace('{total}', String(total))}</p>
          <h3 className={s.h3} id="guide-step-title" tabIndex={-1} ref={heading}>
            {step.title}
          </h3>
          <StepView step={step} skill={guide.skill} lane={lane.id} ui={ui} say={say} />
          <div className={s.nav}>
            <button type="button" className={s.secondaryButton} onClick={() => go(current - 1)} disabled={current === 0}>
              {ui.guided.back}
            </button>
            {current < total - 1 ? (
              <button type="button" className={s.primaryButton} onClick={() => go(current + 1)}>
                {ui.guided.next}
              </button>
            ) : (
              <button type="button" className={s.secondaryButton} onClick={() => go(0)}>
                {ui.guided.startOver}
              </button>
            )}
          </div>
        </article>
      ) : null}
      {guide.prompts.map((p) => (
        <section key={p.heading} className={s.prompts} aria-labelledby={`prompts-${p.heading}`}>
          <h2 className={s.h2} id={`prompts-${p.heading}`}>
            {p.heading}
          </h2>
          <p className={s.intro}>{p.body}</p>
          {p.groups.map((g) => (
            <div key={g.label} className={s.group}>
              <h3 className={s.h3}>{g.label}</h3>
              <ul className={s.chips}>
                {g.items.map((w) => (
                  <li key={w}>
                    <button type="button" className={s.chip} onClick={() => say(w, ui.copy.copied)} aria-label={`${ui.copy.tag}: ${w}`}>
                      <span className={s.chipText}>{w}</span>
                      <span className={s.chipTag} aria-hidden="true">
                        {ui.copy.tag}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
      <p className={s.toast} role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}

/** A locked or upcoming skill: its steps' titles, as www shows them, and what it would take to open it. */
function Preview({ answer, pending }: { answer: GuideAnswer; pending: boolean }) {
  const lane = answer.preview.lanes[0];
  const group = answer.state === 'locked' ? groupForSkill({ sets: answer.sets }, answer.accessGroups) : null;
  return (
    <section className={s.card} aria-labelledby="guide-setup">
      <h2 className={s.h2} id="guide-setup">
        {LEAD.setup}
      </h2>
      {lane ? (
        <ol className={s.previewSteps}>
          {lane.steps.map((t, i) => (
            <li key={`${i}-${t}`}>
              <span className={s.stepN} aria-hidden="true">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <p className={s.intro}>{COPY.previewNote}</p>
      <div className={s.planRow}>
        {answer.state === 'upcoming' ? (
          <span className={s.planLine}>
            <Icon name="clock" size={16} />
            {LIBRARY.upcoming(dateOf(answer.opensAt ?? Date.now()))}
          </span>
        ) : group ? (
          // An access group's member (D-150): a fact, not an upsell.
          <span className={s.planLine}>
            <Icon name="lock" size={16} />
            {LIBRARY.notIncluded(group.name)}
          </span>
        ) : (
          <>
            <span className={s.planLine}>
              <Icon name="lock" size={16} />
              {LIBRARY.locked}
            </span>
            {pending ? <p className={s.intro}>{SKILL_PURCHASE.pending}</p> : null}
            <GetSkillButton skillId={answer.skill} sets={answer.sets} className={s.primary} />
          </>
        )}
      </div>
    </section>
  );
}

export function Component() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    let alive = true;
    setLoad({ kind: 'loading' });
    void (async () => {
      try {
        const res = await fetch(`/api/skill-guides/${encodeURIComponent(slug)}`, { credentials: 'include', headers: { accept: 'application/json' } });
        if (!alive) return;
        // Signed out: sign in, then straight back here (D-151).
        if (res.status === 401) {
          navigate(`${SIGN_IN}?next=${encodeURIComponent(guidePath(slug))}`, { replace: true });
          return;
        }
        if (res.status === 404 || res.status === 403) return setLoad({ kind: 'missing' });
        if (!res.ok) return setLoad({ kind: 'failed' });
        const answer = (await res.json()) as GuideAnswer;
        if (alive) setLoad({ kind: 'ready', answer });
      } catch {
        if (alive) setLoad({ kind: 'failed' });
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, navigate]);

  // Outside `AppShell`, so this route marks the body ready itself, as the Skill Library does.
  useEffect(() => {
    if (load.kind !== 'loading') document.body.dataset.appReady = 'true';
  }, [load.kind]);

  const title = load.kind === 'ready' ? load.answer.title : '';
  const body = useMemo(() => {
    if (load.kind === 'loading') {
      return (
        <div className={s.status} role="status" aria-busy="true">
          <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} label={COPY.loading} />
          <p>{COPY.loading}</p>
        </div>
      );
    }
    if (load.kind === 'missing') return <p className={s.status}>{COPY.missing}</p>;
    if (load.kind === 'failed') {
      return (
        <p className={s.status} role="alert">
          {COPY.failed}
        </p>
      );
    }
    const a = load.answer;
    const pending = params.has('session_id') && a.accessGroups.length === 0;
    return a.state === 'open' && a.guide && a.ui ? <OpenGuide guide={a.guide} ui={a.ui} /> : <Preview answer={a} pending={pending} />;
  }, [load, params]);

  return (
    <main className={s.page}>
      <header className={s.head}>
        <BrandSlot kind="lockup" />
        <Link className={s.back} to="/skill-library">
          <Icon name="chevL" size={16} />
          {COPY.back}
        </Link>
        {title ? <h1 className={s.h1}>{title}</h1> : null}
      </header>
      {body}
    </main>
  );
}

export default Component;
