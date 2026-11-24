// /learn/week/:week/step/:step (D-177): the step player, the learner mockup's artboards 08/09. Claude
// and ChatGPT tabs from the step's own paths, a copy button on every copy block, "Mark step done" through
// the portal's own `toggleStep`, and "For this step" with this step's Library skills and kit items.
// Markup only: every string is computed in Step.vm.ts. The week's Build Kit stays (parity E-10).

import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import type { LocalChecks } from '@ai/core/checklist';
import { acceleratorModuleId } from '@ai/core/accelerator';
import { localToggle, localWatch } from '@ai/core/checklist';
import { intakeFileIds, mayEditIntake } from '@ai/core/intake';
import { learnerOf } from '@ai/core/learner';
import { isLockedWeek } from '@ai/core/course';
import type { CourseIntake, SeatCard } from '@ai/core/course-types';
import { seatCardAskOf, seatCardRole } from '@ai/core/seat-card';
import { Icon } from '../../components/Icon';
import { isFixture, repo } from '../../data/boot';
import { useMutate } from '../../data/hooks';
import { useLearn } from './data';
import { weekRows } from './learn.vm';
import { PLATFORM_LABEL, STEP, asideRows, stepParam, stepVM } from './Step.vm';
import type { Platform, StepVM } from './Step.vm';
import { ChecklistPills, ChecklistPlayer, ChecklistRail, playAt } from './Checklist';
import { StartHereCard } from './StartHere';
import { weekParam } from './Week.vm';
import { GlossaryProvider } from './Glossary';
import { Blocks, Go, KitRows, Tile, nStyle } from './parts';
import type { VideoWatch } from './Video';
import { learnHome, learnIntake, learnStep } from './routes';
import { v3For } from './lms-v3/v3';
import { opensIntakeDrawer } from './lms-v3/form.vm';
import { v6StepAt } from './step-page/v6';
import { StepPageRoute } from './step-page/StepPageRoute';
import type { StepPageRouteProps } from './step-page/StepPageRoute';
import { asksOf, mayTurnIn } from '@ai/core/submissions';
import type { SubmissionAsk } from '@ai/core/submissions';
import { TURN_IN_UI, asksProps, subsProps, turnInLabel } from './lms-v3/turnin.vm';
import { useSubmissions, useTurnInWrites } from './lms-v3/turnin.data';
import { StepLive } from './Live';
import { BuildKit, Crumbs, moduleFileUrl, useTabTitle } from './WeekContent';
import { buildKitVM, crumbsVM, tabTitle } from './WeekContent.vm';
import type { BuildKitVM, CrumbVM } from './WeekContent.vm';
import s from './Learn.module.css';


function Tabs({ tabs, on, set }: { tabs: Platform[]; on: Platform; set: (p: Platform) => void }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = tabs.indexOf(on);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]!;
    set(next);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-p="${next}"]`)?.focus();
  };
  return (
    <div className={s.seg} role="radiogroup" aria-label={STEP.yourAi} onKeyDown={onKey}>
      {tabs.map((p) => (
        <button key={p} type="button" role="radio" data-p={p} aria-checked={p === on} tabIndex={p === on ? 0 : -1} onClick={() => set(p)}>
          {PLATFORM_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

/** D-184: what the step player draws beyond the step: the trail and the week's build kit (its prompt and files). */
interface StepMore {
  crumbs: CrumbVM[];
  kit: BuildKitVM | null;
  previewing: boolean;
  /** The tab's title (X-2), or null in the builder's preview. */
  title: string | null;
}

function withGlossary(vm: StepVM, page: ReactNode) {
  if (!vm.glossary?.length) return page;
  return <GlossaryProvider terms={vm.glossary}>{page}</GlossaryProvider>;
}

function Player({ vm, more, local }: { vm: StepVM; more: StepMore; local?: { toggle: (itemId: string) => void; watch: VideoWatch['onSave'] } }) {
  useTabTitle(more.title);
  const mutate = useMutate();
  const [picked, setPicked] = useState<Platform | null>(null);
  const preferred = vm.pathDefault && vm.tabs.includes(vm.pathDefault) ? vm.pathDefault : (vm.tabs[0] ?? 'claude');
  const platform = picked ?? preferred;
  const choose = (next: Platform) => {
    setPicked(next);
    if (local || isFixture || vm.mark.disabled) return;
    void mutate('setPref', { key: 'path', value: next });
  };
  const on = vm.tabs.includes(platform) ? platform : (vm.tabs[0] ?? 'claude');
  const blocks = vm.paths[on] ?? [];
  const forStep = asideRows(vm.aside, vm.tabs.length ? on : null);
  const [busy, setBusy] = useState(false);
  const saveProgress = useCallback(
    (p: { videoId: string; maxPct: number; lastPositionS: number }) => {
      if (vm.mark.disabled || !vm.mark.stepId) return;
      void mutate('saveVideoProgress', { moduleId: vm.mark.moduleId, videoId: p.videoId, maxPct: p.maxPct, lastPositionS: p.lastPositionS });
    },
    [mutate, vm.mark.disabled, vm.mark.moduleId, vm.mark.stepId],
  );
  const watch: VideoWatch = { progress: vm.videoProgress ?? [], onSave: local?.watch ?? (vm.mark.disabled ? undefined : saveProgress) };

  const mark = async () => {
    if (!vm.mark.stepId || busy) return;
    setBusy(true);
    try {
      await mutate('toggleStep', { moduleId: vm.mark.moduleId, stepId: vm.mark.stepId });
    } finally {
      setBusy(false);
    }
  };

  if (vm.pills) {
    const layout = vm.layouts?.[on];
    return withGlossary(vm, (
      <div className={`${s.pg} ${vm.pills ? s.pgStep : ''}`}>
        <Crumbs crumbs={more.crumbs} />
        <Link className={s.back} to={vm.back.href}>
          <Icon name="r2Back" size={14} strokeWidth={1.75} />
          {vm.back.label}
        </Link>
        <ChecklistPills vm={vm} />
        <div className={s.wz} data-v2="true">
          <div className={s.col} style={{ gap: 20 }}>
            <StepLive week={vm.week} step={vm.rail.find((r) => r.on)?.n ?? 1} />
            {layout ? (
              <ChecklistPlayer vm={vm} layout={layout} platform={on} setPlatform={choose} onPlay={playAt} watch={watch} onLocalToggle={local?.toggle} startHere={vm.startHere} />
            ) : (
              <>
                <div className={s.pht} style={{ gap: 8 }}>
                  <span className={s.pk}>{vm.eyebrow}</span>
                  <h1 className={s.h0}>{vm.title}</h1>
                  {vm.lede ? <p className={s.lede}>{vm.lede}</p> : null}
                  {vm.meta ? <span className={s.dl}>{vm.meta}</span> : null}
                </div>
                {vm.startHere ? <StartHereCard card={vm.startHere} collapsible /> : null}
                <section className={`${s.cd} ${s.hero} ${s.heroBlock}`} aria-labelledby="lv-do-t">
                  <div className={s.cdh} style={{ flexWrap: 'wrap', rowGap: 10 }}>
                    <h2 className={s.h2} id="lv-do-t" style={{ flex: '1 1 auto' }}>{STEP.doThis}</h2>
                    {vm.tabs.length > 1 ? <Tabs tabs={vm.tabs} on={on} set={choose} /> : null}
                  </div>
                  {blocks.length ? <Blocks key={on} blocks={blocks} marks={vm.pathMarks?.[on]} /> : <div className={s.blk}><p className={`${s.p} ${s.s2}`}>{vm.doneWhen ?? vm.lede ?? vm.title}</p></div>}
                  <div className={s.actb}>
                    <button type="button" className={`${s.b} ${s.bp} ${s.done} ${s.markDone}`} data-done={vm.mark.done ? 'true' : undefined} disabled={vm.mark.disabled || busy} onClick={() => void mark()}>
                      <Icon name={vm.mark.done ? 'reset' : 'r2Check'} size={14} strokeWidth={vm.mark.done ? 1.9 : 2.2} />
                      {vm.mark.done ? STEP.undo : STEP.markDone}
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
          <aside className={`${s.col} ${s.stepAside}`} aria-label={STEP.kit}>
            {layout ? <ChecklistRail layout={layout} /> : null}
            {forStep.length ? (
              <section className={s.cd} aria-labelledby="lv-skit-t">
                <div className={s.cdh}>
                  <h2 className={s.railH} id="lv-skit-t">{STEP.forStep}</h2>
                </div>
                <KitRows rows={forStep} />
              </section>
            ) : null}
            {more.kit ? <BuildKit vm={more.kit} previewing={more.previewing} notes={false} heading={STEP.forStep} headingClass={s.railH} tile={32} /> : null}
            <section className={s.cd} aria-labelledby="lv-help-t">
              <div className={s.cdh}>
                <h2 className={s.railH} id="lv-help-t">{STEP.stillStuck}</h2>
              </div>
              <Go className={s.li!} href={vm.help.email.href}>
                <Tile icon="r2Email" tone="forest" size={32} />
                <div className={`${s.colZ} ${s.grow}`}>
                  <span className={s.w5}>{vm.help.email.label}</span>
                  <span className={`${s.me} ${s.el}`}>{vm.help.email.address}</span>
                </div>
                <span className={s.mu} aria-hidden="true"><Icon name="arrowR" size={14} strokeWidth={1.75} /></span>
              </Go>
              {vm.help.officeHours ? (
                <Go className={s.li!} href={vm.help.officeHours.href}>
                  <Tile icon="lvLive" tone="forest" size={32} />
                  <div className={`${s.colZ} ${s.grow}`}>
                    <span className={s.w5}>{vm.help.officeHours.label}</span>
                    <span className={s.me}>{vm.help.officeHours.meta}</span>
                  </div>
                  <span className={s.mu} aria-hidden="true"><Icon name="arrowR" size={14} strokeWidth={1.75} /></span>
                </Go>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    ));
  }

  return withGlossary(vm, (
    <div className={s.pg}>
      <Crumbs crumbs={more.crumbs} />
      <Link className={s.back} to={vm.back.href}>
        <Icon name="r2Back" size={14} strokeWidth={1.75} />
        {vm.back.label}
      </Link>
      <nav className={s.stepper} aria-label={vm.railLabel} style={{ ...nStyle(vm.rail.length), ...(vm.rail.length > 7 ? ({ '--n-ph': String(Math.ceil(vm.rail.length / 2)) } as CSSProperties) : {}) }}>
        {vm.rail.map((r) => (
          <Link key={r.n} to={r.href} data-on={r.on ? 'true' : undefined} aria-label={r.aria} aria-current={r.on ? 'step' : undefined}>
            {r.state === 'done' ? <Icon name="r2Check" size={14} strokeWidth={2.2} /> : null}
            {r.n}
          </Link>
        ))}
      </nav>
      <div className={s.wz}>
        <nav className={s.rl} aria-label={vm.railLabel}>
          {vm.rail.map((r) => (
            <Link key={r.n} className={s.stp} to={r.href} data-on={r.on ? 'true' : undefined} aria-label={r.aria} aria-current={r.on ? 'step' : undefined}>
              <span className={`${s.sti} ${s.stiS}`} data-s={r.state}>
                {r.state === 'done' ? <Icon name="r2Check" size={12} strokeWidth={2.2} /> : r.n}
              </span>
              <span className={s.cl2}>{r.label}</span>
            </Link>
          ))}
        </nav>

        <div className={s.col} style={{ gap: 20 }}>
          <div className={s.pht} style={{ gap: 8 }}>
            <span className={s.pk}>{vm.eyebrow}</span>
            <h1 className={s.h0}>{vm.title}</h1>
            {vm.lede ? <p className={s.lede}>{vm.lede}</p> : null}
            {vm.meta ? <span className={s.dl}>{vm.meta}</span> : null}
            {vm.doneWhen && blocks.length ? <p className={`${s.p} ${s.s2}`}>{vm.doneWhen}</p> : null}
            {vm.hint ? <p className={`${s.p} ${s.me}`}>{vm.hint}</p> : null}
          </div>

          <StepLive week={vm.week} step={vm.rail.find((r) => r.on)?.n ?? 1} />
          <section className={`${s.cd} ${s.hero} ${s.heroBlock}`} aria-labelledby="lv-do-t">
            <div className={s.cdh} style={{ flexWrap: 'wrap', rowGap: 10 }}>
              <h2 className={s.h2} id="lv-do-t" style={{ flex: '1 1 auto' }}>
                {STEP.doThis}
              </h2>
              {vm.tabs.length > 1 ? <Tabs tabs={vm.tabs} on={on} set={choose} /> : null}
            </div>
            {blocks.length ? (
              <Blocks key={on} blocks={blocks} watch={watch} marks={vm.pathMarks?.[on]} />
            ) : (
              <div className={s.blk}>
                <p className={`${s.p} ${s.s2}`}>{vm.doneWhen ?? vm.lede ?? vm.title}</p>
              </div>
            )}
            <div className={s.actb}>
              {vm.prev ? (
                <Link className={`${s.b} ${s.bq} ${s.bi}`} to={vm.prev}>
                  <Icon name="r2Back" size={14} strokeWidth={1.75} />
                  {STEP.previous}
                </Link>
              ) : null}
              {vm.next ? (
                <Link className={`${s.b} ${s.bq} ${s.bi}`} to={vm.next}>
                  {STEP.next}
                  <Icon name="r2Chev" size={14} strokeWidth={1.75} />
                </Link>
              ) : null}
              <button
                type="button"
                className={`${s.b} ${s.bp} ${s.done} ${s.markDone}`}
                data-done={vm.mark.done ? 'true' : undefined}
                disabled={vm.mark.disabled || busy}
                onClick={() => void mark()}
              >
                <Icon name={vm.mark.done ? 'reset' : 'r2Check'} size={14} strokeWidth={vm.mark.done ? 1.9 : 2.2} />
                {vm.mark.done ? STEP.undo : STEP.markDone}
              </button>
            </div>
          </section>
        </div>

        <aside className={s.col} aria-label={STEP.kit}>
          {forStep.length ? (
            <section className={s.cd} aria-labelledby="lv-skit-t">
              <div className={s.cdh}>
                <h2 className={s.h2} id="lv-skit-t">
                  {STEP.forStep}
                </h2>
              </div>
              <KitRows rows={forStep} />
            </section>
          ) : null}
          {more.kit ? <BuildKit vm={more.kit} previewing={more.previewing} notes={false} /> : null}
          <section className={s.cd} aria-labelledby="lv-help-t">
            <div className={s.cdh}>
              <h2 className={s.h2} id="lv-help-t">
                {STEP.stillStuck}
              </h2>
            </div>
            <Go className={s.li!} href={vm.help.email.href}>
              <Tile icon="r2Email" tone="forest" size={28} />
              <div className={`${s.colZ} ${s.grow}`}>
                <span className={s.w5}>{vm.help.email.label}</span>
                <span className={`${s.me} ${s.el}`}>{vm.help.email.address}</span>
              </div>
              <span className={s.mu} aria-hidden="true"><Icon name="arrowR" size={14} strokeWidth={1.75} /></span>
            </Go>
            {vm.help.officeHours ? (
              <Go className={s.li!} href={vm.help.officeHours.href}>
                <Tile icon="lvLive" tone="blue" size={28} />
                <div className={`${s.colZ} ${s.grow}`}>
                  <span className={s.w5}>{vm.help.officeHours.label}</span>
                  <span className={s.me}>{vm.help.officeHours.meta}</span>
                </div>
                <span className={s.mu} aria-hidden="true"><Icon name="arrowR" size={14} strokeWidth={1.75} /></span>
              </Go>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  ));
}

/**
 * D-184: the step player from what the shell hands every screen (`useLearn`), for one step. The curriculum
 * builder's live preview draws it too, inside a `LearnProvider` with the unsaved draft's course; there
 * (`preview`) a step it can't show draws nothing rather than moving the builder's page.
 */
export function StepPage({ week, step, preview = false }: { week: number | null; step: number | null; preview?: boolean }) {
  const { course, db, viewer, now } = useLearn();
  const staff = viewer.actor.kind === 'staff';
  const [draft, setDraft] = useState<LocalChecks | null>(null);
  const [draftWeek, setDraftWeek] = useState(week);
  if (draftWeek !== week) {
    setDraftWeek(week);
    setDraft(null);
  }
  const me = learnerOf(db, viewer.actor.kind === 'learner' ? viewer.actor.userId : null);
  const [intake, setIntake] = useState<Readonly<Record<string, string | string[]>> | undefined>();
  const [operator, setOperator] = useState<{ name: string; byStep: Record<string, { done: number; total: number }> } | undefined>();
  // D-224: keyed on who the learner is, not the learner object. `learnerOf` makes a new object on every snapshot
  // refetch, so each check re-read the intake and the operator count and re-sent personalization: three more
  // requests per check, which helped spend § 9.4's per-minute budget.
  const meId = me?.id ?? null;
  const meRole = me?.role ?? null;
  useEffect(() => {
    if (isFixture || staff || preview || week === null || !meId || !meRole || !mayEditIntake(meRole)) return;
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch('/api/intake', { credentials: 'include' });
        if (!res.ok) return;
        const body = (await res.json()) as { answers?: Record<string, string | string[]>; preview?: boolean };
        if (!stop && body.answers && !body.preview) setIntake(body.answers);
      } catch {
        /* no intake leaves every item where the course put it */
      }
      if (meRole !== 'Team Owner') return;
      try {
        const res = await fetch('/api/personalize', { credentials: 'include' });
        if (!res.ok) return;
        const body = (await res.json()) as { name?: string | null; steps?: { moduleId: string; stepId: string; done: number; total: number }[] };
        if (stop || !body.name) return;
        const byStep: Record<string, { done: number; total: number }> = {};
        const moduleId = acceleratorModuleId(week);
        for (const row of body.steps ?? []) {
          if (row.moduleId !== moduleId) continue;
          byStep[row.stepId] = { done: row.done, total: row.total };
        }
        setOperator({ name: body.name, byStep });
      } catch {
        /* the count stays off when it cannot be read */
      }
    };
    void load();
    if (week === 0) void fetch('/api/personalize', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [staff, preview, week, meId, meRole]);
  const rows = useMemo(() => (course.kind === 'ready' ? weekRows(course.payload, db, me) : []), [course, db, me]);
  if (course.kind !== 'ready') return preview ? null : <Navigate to={learnHome()} replace />;
  const row = rows.find((r) => r.week === week);
  const vm = stepVM(course.payload, row, step, viewer.actor, now, {
    fileUrl: (id) => repo.fileUrl({ kind: 'resource', id }),
    checks: staff ? (draft?.checks ?? []) : me?.checks,
    prefs: me?.coursePrefs,
    videoProgress: staff ? (draft?.video ?? []) : me?.videoProgress,
    ...(intake ? { intake } : {}),
    ...(operator ? { operator } : {}),
  });
  if (vm.kind === 'missing') return preview ? null : <Navigate to={vm.href} replace />;
  const local = staff
    ? {
        toggle: (itemId: string) => {
          if (!vm.mark.stepId) return;
          const stepId = vm.mark.stepId;
          setDraft((d) => localToggle(d ?? { checks: [], video: [] }, { moduleId: vm.mark.moduleId, stepId, itemId }, now));
        },
        watch: (p: { videoId: string; maxPct: number; lastPositionS: number }) => {
          const steps = (row?.steps ?? []).flatMap((s) => (s.id ? [{ ...s.step, id: s.id }] : []));
          setDraft((d) => localWatch(d ?? { checks: [], video: [] }, steps, { moduleId: vm.mark.moduleId, ...p }, now));
        },
      }
    : undefined;
  const more: StepMore = {
    crumbs: crumbsVM(vm.back.label, vm.week, { n: step ?? 1, title: vm.title }),
    kit: buildKitVM(row?.module, moduleFileUrl),
    previewing: viewer.preview !== undefined,
    title: preview ? null : tabTitle(vm.week, vm.back.label, { n: step ?? 1, title: vm.title }),
  };
  // D-210: every step draws the v6 page, chrome-free (the shell asks the same rule), and the builder's live
  // preview draws the same page, so a step looks the same where it is built and where it is taken.
  const path = step !== null ? learnStep(vm.week, step) : null;
  if (path && v6StepAt(path, course.payload, rows, viewer.actor, me, now)) {
    // D-230 (B-26, B-27): for a viewer v3 draws for, a step that asks for a file has the Turn in button (or, for a
    // teammate who can't turn in, the line in its place), and the drawer opens here.
    const asks = !preview && v3For(viewer, me) && row?.module ? asksOf(row.module, row.week) : [];
    // D-236: on the step that asks for the week's seat card, its Form button opens the drawer (a viewer v3 draws for).
    const seatAsk = !preview && v3For(viewer, me) && row?.module ? seatCardAskOf(row.module) : null;
    const openWeek = seatAsk && seatAsk.step === step ? course.payload.course.weeks.find((w) => w.week === row!.week) : undefined;
    const seat =
      seatAsk && openWeek && !isLockedWeek(openWeek) && openWeek.seatCard
        ? { moduleId: row!.module!.id, card: openWeek.seatCard, at: { week: row!.week, step: seatAsk.step, ...(seatAsk.signLabel ? { signLabel: seatAsk.signLabel } : {}) } }
        : null;
    // D-229 (B-15): for a learner v3 draws for, the step's form action opens the intake's drawer here.
    const week0 = course.payload.course.weeks.find((w) => w.week === 0 && !isLockedWeek(w));
    const intake = !preview && v3For(viewer, me) && week0 && !isLockedWeek(week0) && week0.intake ? { form: week0.intake, kit: week0.kit ?? [] } : null;
    // D-242: the intake's kit files, whose Download opens that drawer, so the step page draws it as the form's button.
    const intakeFiles = intake ? intakeFileIds(rows.find((x) => x.week === 0)?.module, intake.kit) : [];
    const forms = intakeFiles.length ? { intakeFiles } : {};
    const inner = (seatCard?: { open: () => void }) =>
      asks.length ? (
        <TurnInStep key={`${vm.week}:${vm.eyebrow}`} moduleId={row!.module!.id} asks={asks} role={me?.role ?? null} vm={vm} kit={more.kit} title={more.title} local={local} {...(seatCard ? { seatCard } : {})} {...forms} />
      ) : (
        <StepPageRoute key={`${vm.week}:${vm.eyebrow}`} vm={vm} kit={more.kit} title={more.title} local={local} {...(seatCard ? { seatCard } : {})} {...forms} />
      );
    const page = seat ? (
      <SeatCardStep key={`seat:${vm.week}:${vm.eyebrow}`} seat={seat} role={me?.role ?? null} now={now}>
        {inner}
      </SeatCardStep>
    ) : (
      inner()
    );
    if (intake) {
      return (
        <>
          {page}
          <InPlaceIntake intake={intake.form} now={now} files={intakeFiles.flatMap((id) => repo.fileUrl({ kind: 'resource', id }) ?? [])} />
        </>
      );
    }
    return page;
  }
  // A new step starts on its own first tab.
  return <Player key={`${vm.week}:${vm.eyebrow}`} vm={vm} more={more} local={local} />;
}

const StepIntake = lazy(() => import('./lms-v3/StepIntake'));
const StepTurnIn = lazy(() => import('./lms-v3/StepTurnIn'));
const StepSeatCard = lazy(() => import('./lms-v3/StepSeatCard'));

/**
 * D-236: the step page with the seat card's Form button wired to its drawer (loaded on the first open). The owner's
 * drawer signs, the operator's marks it ready for the owner, and an agent's is locked (Connor, Nov 22).
 */
function SeatCardStep({
  seat,
  role,
  now,
  children,
}: {
  seat: { moduleId: string; card: SeatCard; at: { week: number; step: number; signLabel?: string } };
  role: string | null;
  now: number;
  children: (seatCard: { open: () => void }) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const seatCard = useMemo(
    () => ({
      open: () => {
        setLoaded(true);
        setOpen(true);
      },
    }),
    [],
  );
  return (
    <>
      {children(seatCard)}
      {loaded ? (
        <Suspense fallback={null}>
          <StepSeatCard moduleId={seat.moduleId} card={seat.card} at={seat.at} role={seatCardRole(role)} now={now} open={open} onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}

/** D-230: the step page with Turn in's button wired to its drawer (loaded on the first open), and the team's turn-ins. */
function TurnInStep({ moduleId, asks, role, ...props }: StepPageRouteProps & { moduleId: string; asks: SubmissionAsk[]; role: string | null }) {
  const can = mayTurnIn(role);
  const subs = useSubmissions(moduleId, can);
  const writes = useTurnInWrites(moduleId);
  const [askId, setAskId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const turnIn = useMemo(
    () => ({
      agent: can ? null : TURN_IN_UI.agent,
      labelOf: (kind: string) => turnInLabel(subs, kind),
      open: (kind: string) => {
        setLoaded(true);
        setAskId(kind);
      },
    }),
    [can, subs],
  );
  return (
    <>
      <StepPageRoute {...props} turnIn={turnIn} />
      {loaded ? (
        <Suspense fallback={null}>
          <StepTurnIn ui={TURN_IN_UI} asks={asksProps(asks)} subs={subsProps(subs)} can={can} askId={askId} onClose={() => setAskId(null)} upload={writes.upload} onSubmit={writes.onSubmit} />
        </Suspense>
      ) : null}
    </>
  );
}

/**
 * Answers a click on a link to the intake (its old page, or one of its kit files: `opensIntakeDrawer`) by opening its
 * drawer in place (loaded on the first open).
 */
function InPlaceIntake({ intake, now, files }: { intake: CourseIntake; now: number; files: readonly string[] }) {
  const key = files.join(' ');
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      const at = key ? key.split(' ').map((f) => new URL(f, window.location.href).pathname) : [];
      if (!a || !opensIntakeDrawer(new URL(a.href, window.location.href).pathname, learnIntake(), at)) return;
      e.preventDefault();
      setLoaded(true);
      setOpen(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [key]);
  return loaded ? (
    <Suspense fallback={null}>
      <StepIntake intake={intake} now={now} open={open} onClose={() => setOpen(false)} />
    </Suspense>
  ) : null;
}

export function Component() {
  const params = useParams();
  return <StepPage week={weekParam(params.week)} step={stepParam(params.step)} />;
}

export default Component;
