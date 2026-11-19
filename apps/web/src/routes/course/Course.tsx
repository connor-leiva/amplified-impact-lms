// /course and /course/week-N: the Amplified AI Accelerator (DECISIONS.md D-110).
//
// Net-new, like /skill-library (D-079): outside the shell, so no portal golden moves, and reached by
// its URL (each course AI Employee's notes and prompt panel name it). It reads `GET /api/course`,
// which answers the course only to a plan that opens it. In the fixture build there is no API, so it
// says the course opens when you sign in.
//
// Markup only: every string and every time is computed in Course.vm.ts.

import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { BrandSlot } from '../../shell/BrandSlot';
import { Icon } from '../../components/Icon';
import { PreLaunch } from '../library/PreLaunch';
import { VideoView } from '../learn/parts';
import { COPY, courseView, isExternal } from './Course.vm';
import type { CoursePayload, DownloadVM, LockedWeekVM, OverviewVM, Row, WeekVM } from './Course.vm';
import s from './Course.module.css';

/** A link that leaves learn opens in a new tab; a guided setup in learn (D-151) opens in this one. */
const newTab = (href: string) => (isExternal(href) ? { target: '_blank', rel: 'noopener' } : {});

export type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; payload: CoursePayload }
  | { kind: 'signed-out' }
  | { kind: 'locked' }
  | { kind: 'paused' }
  /** D-153: bought, and opening at the first live build. */
  | { kind: 'upcoming'; opensAt: number }
  | { kind: 'failed' };

export async function loadCourse(): Promise<Load> {
  try {
    const res = await fetch('/api/course', { credentials: 'include', headers: { accept: 'application/json' } });
    if (res.status === 401 || res.status === 404) return { kind: 'signed-out' };
    if (res.status === 403) {
      // D-143: paused until a payment goes through, which says something different from "not in your plan".
      const body = (await res.json().catch(() => null)) as { paused?: unknown; upcoming?: unknown; opensAt?: unknown } | null;
      if (body?.paused === true) return { kind: 'paused' };
      // D-153: not "not in your plan" to someone who bought it: when it opens, and the welcome.
      if (body?.upcoming === true && typeof body.opensAt === 'number') return { kind: 'upcoming', opensAt: body.opensAt };
      return { kind: 'locked' };
    }
    if (!res.ok) return { kind: 'failed' };
    return { kind: 'ready', payload: (await res.json()) as CoursePayload };
  } catch {
    return { kind: 'signed-out' };
  }
}

function save(d: DownloadVM): void {
  const url = URL.createObjectURL(new Blob([d.content], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = d.name;
  a.click();
  URL.revokeObjectURL(url);
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={s.section} aria-labelledby={id}>
      <h2 className={s.h2} id={id}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className={s.rows}>
      {rows.map((r) => (
        <div key={r.label} className={s.row}>
          <dt className={s.rowLabel}>{r.label}</dt>
          <dd className={s.rowText}>{r.text}</dd>
        </div>
      ))}
    </dl>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className={s.bullets}>
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function Downloads({ items }: { items: DownloadVM[] }) {
  if (!items.length) return null;
  return (
    <div className={s.actions}>
      {items.map((d) => (
        <button key={d.name} type="button" className={s.secondary} onClick={() => save(d)}>
          <Icon name="download" size={16} />
          {d.label}
        </button>
      ))}
    </div>
  );
}

function Overview({ vm, notFound }: { vm: OverviewVM; notFound: boolean }) {
  return (
    <>
      <header className={s.head}>
        <BrandSlot kind="lockup" />
        <h1 className={s.h1}>{vm.title}</h1>
        <p className={s.sub}>{vm.sub}</p>
        {notFound ? <p className={s.note}>{COPY.notFound}</p> : null}
      </header>

      <Section id="how" title={COPY.howItWorks}>
        <Bullets items={vm.how} />
        <Rows rows={vm.roles} />
        <p className={s.note}>{vm.scope}</p>
      </Section>

      <Section id="weeks" title={COPY.weeks}>
        <ol className={s.cards}>
          {vm.weeks.map((w) => (
            <li key={w.week} className={s.card}>
              <a className={s.cardLink} href={w.href}>
                <span className={s.cardTitle}>
                  {w.locked ? <Icon name="lock" size={14} label="Locked" /> : null} {w.heading}
                </span>
                <span className={s.cardQuestion}>{w.question}</span>
                <span className={s.cardMeta}>{w.locked ? w.opens : w.flagship}</span>
              </a>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="calendar" title={COPY.calendar}>
        <ul className={s.list}>
          {vm.calendar.map((c) => (
            <li key={c.id} className={s.line}>
              <span className={s.lineLabel}>{c.label}</span>
              <span className={s.lineTitle}>{c.title}</span>
              <span className={s.lineMeta}>
                {c.when} · {c.mins}
              </span>
            </li>
          ))}
        </ul>
        <p className={s.note}>{vm.holiday}</p>
      </Section>

      <Section id="before" title={COPY.before}>
        <h3 className={s.h3}>{COPY.intake}</h3>
        <Bullets items={vm.before.intake} />
        <h3 className={s.h3}>
          {COPY.orientation} · {vm.before.orientation.minutes}
        </h3>
        <Bullets items={vm.before.orientation.topics} />
        <p className={s.placeholder}>{vm.before.orientation.media}</p>
        {vm.before.dataPack.length ? (
          <>
            <h3 className={s.h3}>{COPY.dataPack}</h3>
            <dl className={s.rows}>
              {vm.before.dataPack.map((d) => (
                <div key={d.input} className={s.row}>
                  <dt className={s.rowLabel}>{d.input}</dt>
                  <dd className={s.rowText}>
                    <strong>{COPY.preferred}:</strong> {d.preferred} <strong>{COPY.minimum}:</strong> {d.minimum}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
        {vm.before.practiceSetNote ? (
          <>
            <h3 className={s.h3}>{COPY.practiceSet}</h3>
            <p className={s.text}>{vm.before.practiceSetNote}</p>
            <Downloads items={vm.before.downloads} />
          </>
        ) : null}
        <h3 className={s.h3}>{COPY.safeSharing}</h3>
        <Bullets items={vm.before.safeSharing} />
        <h3 className={s.h3}>{COPY.lanes}</h3>
        <Rows rows={vm.before.lanes} />
      </Section>

      <Section id="graduation" title={COPY.graduation}>
        <Bullets items={vm.after.graduation} />
        <p className={s.note}>{vm.after.note}</p>
      </Section>

      <Section id="after" title={COPY.afterWeek8}>
        <Rows rows={vm.after.paths} />
        <p className={s.note}>{vm.after.noPaywall}</p>
        <h3 className={s.h3}>{COPY.pilot}</h3>
        <Rows rows={vm.after.pilot} />
      </Section>

      <p className={s.note}>{vm.support}</p>
    </>
  );
}

/** D-175: a week the learner can't open yet: where it sits, what it asks, when it opens. Nothing more. */
function LockedWeek({ vm }: { vm: LockedWeekVM }) {
  return (
    <>
      <header className={s.head}>
        <BrandSlot kind="lockup" />
        <a className={s.back} href="/course">
          <Icon name="chevL" size={14} />
          {COPY.allWeeks}
        </a>
        <h1 className={s.h1}>{vm.heading}</h1>
        <p className={s.question}>{vm.question}</p>
      </header>
      <section className={s.section} aria-label={vm.heading}>
        {vm.headline ? <h2 className={s.h2}>{vm.headline}</h2> : null}
        {vm.line ? <p>{vm.line}</p> : null}
        {vm.outcome ? <p className={s.note}>{vm.outcome}</p> : null}
        {vm.opens ? (
          <p className={s.opens}>
            <Icon name="lock" size={16} /> {vm.opens}
          </p>
        ) : null}
      </section>
      <nav className={s.pager} aria-label="Weeks">
        {vm.prev ? (
          <a className={s.secondary} href={vm.prev.href}>
            <Icon name="arrowR" size={14} className={s.flip} />
            {vm.prev.label}
          </a>
        ) : (
          <span />
        )}
        {vm.next ? (
          <a className={s.primary} href={vm.next.href}>
            {vm.next.label}
            <Icon name="arrowR" size={14} />
          </a>
        ) : null}
      </nav>
    </>
  );
}

function Week({ vm }: { vm: WeekVM }) {
  return (
    <>
      <header className={s.head}>
        <BrandSlot kind="lockup" />
        <a className={s.back} href="/course">
          <Icon name="chevL" size={14} />
          {COPY.allWeeks}
        </a>
        <h1 className={s.h1}>{vm.heading}</h1>
        <p className={s.question}>{vm.question}</p>
      </header>

      <Section id="why" title={COPY.why}>
        <Bullets items={vm.why} />
      </Section>

      <Section id="who" title={COPY.whoDoesWhat}>
        <Rows rows={vm.roles} />
        <h3 className={s.h3}>{COPY.time}</h3>
        <Rows rows={vm.time} />
        <p className={s.note}>{vm.timeNote}</p>
      </Section>

      <Section id="skills" title={COPY.skills}>
        <ul className={s.list}>
          {vm.skills.map((k) => (
            <li key={k.title} className={s.skill}>
              <div className={s.skillText}>
                <span className={s.skillName}>
                  {k.title}
                  <span className={s.tag}>{k.role}</span>
                  {k.free ? <span className={s.badge}>{COPY.free}</span> : null}
                </span>
                <span className={s.text}>{k.use}</span>
              </div>
              {k.href ? (
                <a className={s.secondary} href={k.href} {...newTab(k.href)}>
                  <Icon name="listChecks" size={16} />
                  {COPY.guidedSetup}
                </a>
              ) : k.pending ? (
                <span className={s.tag}>{k.pending}</span>
              ) : null}
            </li>
          ))}
        </ul>
        <div className={s.actions}>
          <a className={s.secondary} href={vm.libraryHref}>
            <Icon name="download" size={16} />
            {COPY.download}
          </a>
        </div>
      </Section>

      <Section id="setup" title={COPY.setup}>
        <ol className={s.steps}>
          {vm.setup.map((step) => (
            <li key={step.n} className={s.step}>
              <span className={s.stepN}>{step.n}</span>
              <span className={s.stepText}>
                {step.text}
                {step.links.length === 1 ? (
                  <>
                    {' '}
                    <a href={step.links[0]!.href} {...newTab(step.links[0]!.href)}>
                      {step.links[0]!.label}
                    </a>
                  </>
                ) : step.links.length > 1 ? (
                  <>
                    {' '}
                    {COPY.guidedSetups}{' '}
                    {step.links.map((l, i) => (
                      <Fragment key={l.href}>
                        {i ? ' · ' : ''}
                        <a href={l.href} {...newTab(l.href)}>
                          {l.label}
                        </a>
                      </Fragment>
                    ))}
                  </>
                ) : null}
                {step.pending ? (
                  <>
                    {' '}
                    <span className={s.tag}>{step.pending}</span>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
        <Downloads items={vm.downloads} />
      </Section>

      <Section id="live" title={COPY.liveBuild}>
        {vm.live ? (
          <>
            <p className={s.when}>
              <Icon name="calendar" size={16} />
              {vm.live.when} · {vm.live.mins} · <a href={vm.live.join.href}>{vm.live.join.label}</a> ({vm.live.join.note})
            </p>
            <h3 className={s.h3}>{COPY.agenda}</h3>
            <Rows rows={vm.live.agenda} />
            <Rows
              rows={[
                { label: COPY.lesson, text: vm.live.lesson },
                { label: COPY.exercise, text: vm.live.exercise },
                { label: COPY.required, text: vm.live.required },
                { label: COPY.advanced, text: vm.live.advanced },
                { label: COPY.ownerApproval, text: vm.live.ownerApproval },
              ]}
            />
            <h3 className={s.h3}>{COPY.workingAtEnd}</h3>
            <Bullets items={vm.live.workingAtEnd} />
            <h3 className={s.h3}>{COPY.inClass}</h3>
            <Rows rows={vm.live.paths} />
          </>
        ) : (
          <p className={s.text}>{vm.noLive}</p>
        )}
      </Section>

      {vm.officeHours ? (
        <Section id="office-hours" title={COPY.officeHours}>
          <p className={s.when}>
            <Icon name="calendar" size={16} />
            {vm.officeHours.title} · {vm.officeHours.when} · {vm.officeHours.mins} ·{' '}
            <a href={vm.officeHours.join.href}>{vm.officeHours.join.label}</a> ({vm.officeHours.join.note})
          </p>
          <p className={s.text}>{vm.officeHours.note}</p>
          {vm.officeHours.format.length ? <Rows rows={vm.officeHours.format} /> : null}
          {vm.officeHours.outputs.length ? (
            <>
              <h3 className={s.h3}>{COPY.youLeaveWith}</h3>
              <Bullets items={vm.officeHours.outputs} />
            </>
          ) : null}
          <Bullets items={vm.officeHours.rules} />
          <h3 className={s.h3}>{COPY.issueForm}</h3>
          <Rows rows={vm.officeHours.issueForm} />
        </Section>
      ) : null}

      <Section id="homework" title={COPY.homework}>
        <h3 className={s.h3}>{COPY.byWeekEnd}</h3>
        <Bullets items={vm.homework.byWeekEnd} />
        <h3 className={s.h3}>{COPY.assignment}</h3>
        <Bullets items={vm.homework.assignment} />
        <h3 className={s.h3}>{COPY.acceptance}</h3>
        <Bullets items={vm.homework.acceptance} />
        <Rows rows={[{ label: COPY.useEvidence, text: vm.homework.useEvidence }]} />
        <p className={s.note}>{vm.missedAWeek}</p>
      </Section>

      <Section id="evidence" title={COPY.evidence}>
        <Rows rows={vm.evidence} />
      </Section>

      <Section id="rubric" title={COPY.rubric}>
        <p className={s.note}>{vm.rubric.scale}</p>
        <Rows rows={vm.rubric.dimensions} />
        <Bullets items={vm.rubric.rules} />
      </Section>

      <Section id="readiness" title={COPY.readiness}>
        <Rows rows={vm.readiness} />
      </Section>

      <Section id="media" title={COPY.media}>
        {vm.media.map((m, i) =>
          typeof m === 'string' ? (
            <p key={`${i}:${m}`} className={s.placeholder}>
              {m}
            </p>
          ) : (
            // D-188: a video, played as the learner portal plays one.
            <VideoView key={i} block={m} />
          ),
        )}
        {vm.materials.length ? (
          <>
            <h3 className={s.h3}>{COPY.materials}</h3>
            <Bullets items={vm.materials} />
          </>
        ) : null}
      </Section>

      <nav className={s.pager} aria-label="Weeks">
        {vm.prev ? (
          <a className={s.secondary} href={vm.prev.href}>
            <Icon name="arrowR" size={14} className={s.flip} />
            {vm.prev.label}
          </a>
        ) : (
          <span />
        )}
        {vm.next ? (
          <a className={s.primary} href={vm.next.href}>
            {vm.next.label}
            <Icon name="arrowR" size={14} />
          </a>
        ) : null}
      </nav>
    </>
  );
}

export function Component() {
  const { week } = useParams();
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    let alive = true;
    void loadCourse().then((next) => {
      if (alive) setLoad(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Outside `AppShell`, so this route marks the body ready itself, as /skill-library does.
  useEffect(() => {
    if (load.kind !== 'loading') document.body.dataset.appReady = 'true';
  }, [load.kind]);

  const view = useMemo(() => (load.kind === 'ready' ? courseView(load.payload, week) : null), [load, week]);
  useEffect(() => {
    if (view) document.title = view.kind === 'week' ? `${view.title} · Amplified AI Accelerator` : 'Amplified AI Accelerator';
  }, [view]);

  return <CourseBody load={load} week={week} />;
}

/**
 * The page for one state of the course, from what `GET /api/course` answered (or, in the builder's
 * live preview, D-174, from the unsaved draft). Markup only, as before.
 */
export function CourseBody({ load, week }: { load: Load; week: string | undefined }) {
  const view = useMemo(() => (load.kind === 'ready' ? courseView(load.payload, week) : null), [load, week]);
  return (
    <main className={s.page}>
      {load.kind === 'loading' ? (
        <div className={s.status} role="status" aria-busy="true">
          <Icon name="spinner" size={20} strokeWidth={2.2} className={s.spin} label={COPY.loading} />
        </div>
      ) : load.kind === 'signed-out' ? (
        <div className={s.status}>
          <BrandSlot kind="lockup" />
          <p>{COPY.signedOut}</p>
          <a className={s.primary} href="/sign-in">
            {COPY.signIn}
          </a>
        </div>
      ) : load.kind === 'locked' ? (
        <div className={s.status}>
          <BrandSlot kind="lockup" />
          <p>
            <Icon name="lock" size={16} /> {COPY.locked}
          </p>
          <p className={s.note}>{COPY.lockedNote}</p>
          <a className={s.secondary} href="/skill-library">
            {COPY.library}
          </a>
        </div>
      ) : load.kind === 'upcoming' ? (
        <div className={s.status}>
          <BrandSlot kind="lockup" />
          <PreLaunch opensAt={load.opensAt} />
          <a className={s.secondary} href="/skill-library">
            {COPY.library}
          </a>
        </div>
      ) : load.kind === 'paused' ? (
        <div className={s.status}>
          <BrandSlot kind="lockup" />
          <p>
            <Icon name="lock" size={16} /> {COPY.paused}
          </p>
          <p className={s.note}>{COPY.pausedNote}</p>
          <a className={s.primary} href="/api/billing/portal">
            {COPY.billing}
          </a>
        </div>
      ) : load.kind === 'failed' ? (
        <div className={s.status} role="alert">
          {COPY.failed}
        </div>
      ) : view ? (
        <>
          {view.preview ? <p className={s.previewTag}>{COPY.preview}</p> : null}
          {view.prelaunch ? <p className={s.prelaunch}>{view.prelaunch}</p> : null}
          {view.kind === 'week' ? (
            <Week vm={view.vm} />
          ) : view.kind === 'locked' ? (
            <LockedWeek vm={view.vm} />
          ) : (
            <Overview vm={view.vm} notFound={view.notFound} />
          )}
        </>
      ) : null}
    </main>
  );
}

export default Component;
