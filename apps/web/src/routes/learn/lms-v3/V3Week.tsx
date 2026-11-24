// D-228: the v3 week overview and locked week in their route. Wiring only: the pages are the package's; this hands
// them their props, sends Mark as deployed and Undo to the mutations (`markDeployed`, `unmarkDeployed`, B-11), opens
// today's prompt modal from the kit's View (C-11, kept as it is), starts the kit's downloads through the gated files
// route, and lets the locked week's calendar button download the week's sessions as today's Add to calendar does.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router';
import { ics } from '@ai/core';
import type { ChecklistMark, Learner } from '@ai/core';
import { acceleratorModuleId } from '@ai/core/accelerator';
import type { CourseIntake } from '@ai/core/course-types';
import { intakeCheckTarget, intakeFileIds } from '@ai/core/intake';
import { useMutate } from '../../../data/hooks';
import { downloadIntakePdf } from '../intake-pdf';
import type { CoursePayload } from '../../course/Course.vm';
import { saveIcs } from '../ics';
import { INTAKE_LOAD_FAILED, intakeSaver, loadIntake } from '../intake-sync';
import type { IntakeSaver } from '../intake-sync';
import type { WeekRow } from '../learn.vm';
import type { LockedWeekVM } from '../Week.vm';
import { PromptModal } from '../WeekContent';
import type { BuildKitVM } from '../WeekContent.vm';
import { FormDrawer, FormRefusal, useForm } from './FormDrawer';
import { NO_TAP } from './tap';
import type { FormApi } from './FormDrawer';
import { FORM_ID, formDef, formInitial, formItem, formRow, intakeStepOf } from './form.vm';
import { LockedWeekPage } from './LockedWeekPage';
import type { FormAnswers } from './types';
import { WeekPage } from './WeekPage';
import { lockedWeekProps, weekLabels, weekProps } from './week.vm';
import type { KitInput } from './week.vm';

/** A download through the gated files route, as a link the browser follows (the response says attachment). */
function download(href: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function V3Week({
  p,
  rows,
  r,
  me,
  checks,
  build,
  fileUrl,
  now,
}: {
  p: CoursePayload;
  rows: readonly WeekRow[];
  r: WeekRow;
  me: Learner | null;
  checks: readonly ChecklistMark[];
  build: BuildKitVM | null;
  fileUrl: (id: string) => string | null;
  now: number;
}) {
  const mutate = useMutate();
  const [prompt, setPrompt] = useState(false);
  const [params, setParams] = useSearchParams();
  // B-15: `?form=intake` opens the drawer (the old intake page's address lands here).
  const asked = params.get('form') === FORM_ID;
  const form = useIntakeForm(r.open?.intake, now, asked);
  const drawerOpen = !!form && asked;
  const setOpen = (on: boolean) =>
    setParams(
      (q) => {
        const next = new URLSearchParams(q);
        if (on) next.set('form', FORM_ID);
        else next.delete('form');
        return next;
      },
      { replace: true },
    );
  // B-14: the kit files that are the intake (core's rule: production's has a generated id) become the form's row.
  const intakeIds = form ? intakeFileIds(r.module, r.open?.kit ?? []) : [];
  // D-246: with no such file (the static PDF is no longer needed as a step file), the form still has its row, on the
  // intake's step.
  const standIn = form && !intakeIds.length ? formItem(intakeStepOf(r.steps, intakeCheckTarget(r.module)?.stepId)) : undefined;
  const asForm: KitInput['formRow'] = form
    ? (item, row) => (intakeIds.includes(item.id) || item === standIn ? formRow(row, form, () => setOpen(true)) : row)
    : undefined;
  const week = weekProps({
    p,
    rows,
    r,
    me,
    checks,
    build,
    fileUrl,
    download,
    onViewPrompt: () => setPrompt(true),
    formRow: asForm,
    formItem: standIn,
    now,
  });
  const moduleId = acceleratorModuleId(r.week);
  return (
    <>
      <WeekPage
        key={r.week}
        week={week}
        labels={weekLabels(week.steps.length, r.week > 0 ? week.purpose : undefined)}
        onDeploy={(on) => void mutate(on ? 'markDeployed' : 'unmarkDeployed', { moduleId })}
      />
      {prompt && build?.prompt ? (
        <div data-r2-scope="" data-learner-v2="">
          <PromptModal prompt={build.prompt} onClose={() => setPrompt(false)} />
        </div>
      ) : null}
      {/* The drawer is the app's sibling, as the mockup draws it: a portal to <body>, so nothing of the shell stacks over it.
          It keeps D-225's exemption from the phone tap floor, as the frame does (NO_TAP). */}
      {form
        ? createPortal(
            <div style={NO_TAP}>
              <FormDrawer f={form} open={drawerOpen} onClose={() => setOpen(false)} locked={form.locked} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

// B-18: Download PDF, and D-246's Download Your Answers (PDF): the shared helper (`../intake-pdf`), re-exported here
// where the drawer's tests have always found it.
export { downloadIntakePdf, pdfNameOf } from '../intake-pdf';

/** H-10 (D-247): the drawer's foot when the intake didn't load (and can be asked again by opening it again). */
export const INTAKE_DRAWER_LOAD_FAILED = `${INTAKE_LOAD_FAILED} Close it and open it again.`;

/** The drawer's form, and whether it may be edited yet (H-10: not before the answers load, nor after a clash). */
export type IntakeFormApi = FormApi & { locked: boolean };

/**
 * The week's intake as the package's `useForm` drives it (§7.4): loaded from `GET /api/intake`, saved with
 * `PUT /api/intake` and submitted the same way, and printed with `GET /api/intake/pdf`. One intake per team. H-10
 * (D-247): the drawer is locked until the answers load, and a load that fails says so in its foot and is asked again
 * when the drawer opens again; a save sends only what changed (`intake-sync.ts`), so a teammate's other answers stay,
 * and a question they changed too is refused in the server's words, the drawer then locked with what was typed still
 * in it. Null when the week has no intake.
 */
export function useIntakeForm(intake: CourseIntake | undefined, now: number, open = false): IntakeFormApi | null {
  const def = useMemo(() => (intake ? formDef(intake) : null), [intake]);
  const saver = useRef<IntakeSaver | null>(null);
  const [load, setLoad] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [stale, setStale] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const put = useCallback(async (answers: FormAnswers, submit: boolean) => {
    const to = saver.current;
    if (!to) throw new FormRefusal(INTAKE_DRAWER_LOAD_FAILED);
    const out = await to.save(answers, submit);
    if (out.kind === 'saved' || out.kind === 'unchanged') return;
    if (out.kind === 'conflict') setStale(true);
    throw new FormRefusal(out.error);
  }, []);
  const f = useForm({
    form: def ?? formDef({ sections: [] }),
    initial: { status: 'new', answers: {} },
    onSave: (a) => put(a, false),
    onSubmit: (a) => put(a, true),
    onDownloadPdf: downloadIntakePdf,
  });
  const reset = useRef(f.reset);
  reset.current = f.reset;
  const refuse = useRef(f.refuse);
  refuse.current = f.refuse;
  const nowAt = useRef(now);
  nowAt.current = now;
  useEffect(() => {
    if (!intake) return undefined;
    let alive = true;
    void loadIntake().then((out) => {
      if (!alive) return;
      if (out.kind === 'failed') {
        saver.current = null;
        setLoad('failed');
        refuse.current(out.retry ? INTAKE_DRAWER_LOAD_FAILED : out.error);
        return;
      }
      saver.current = intakeSaver(intake, out.body.answers);
      reset.current(formInitial(out.body, nowAt.current));
      setLoad('ready');
    });
    return () => {
      alive = false;
    };
  }, [intake, attempt]);
  // A load that failed is asked again when the drawer opens again.
  const failed = useRef(false);
  failed.current = load === 'failed';
  useEffect(() => {
    if (open && failed.current) setAttempt((n) => n + 1);
  }, [open]);
  return def ? { ...f, locked: load !== 'ready' || stale } : null;
}

export function V3Locked({
  p,
  rows,
  r,
  vm,
  now,
}: {
  p: CoursePayload;
  rows: readonly WeekRow[];
  r: WeekRow;
  vm: LockedWeekVM;
  now: number;
}) {
  const events = vm.sessions?.add?.ics ?? [];
  // B-05: the mockup's button is a plain link to the week's calendar file. A click saves it under its name, as today's
  // Add to calendar does; the address is the same file, for a link opened another way.
  const key = JSON.stringify(events);
  const href = useMemo(
    () => (events.length ? URL.createObjectURL(new Blob([ics(events, now)], { type: 'text/calendar' })) : ''),
    [key, now],
  );
  useEffect(() => () => (href ? URL.revokeObjectURL(href) : undefined), [href]);
  // A capture listener, not a wrapper: the package's page sits directly in <main>, as the mockup draws it.
  useEffect(() => {
    if (!events.length) return undefined;
    const onClick = (e: globalThis.MouseEvent) => {
      if (!(e.target as Element | null)?.closest?.('#lk-cal')) return;
      e.preventDefault();
      e.stopPropagation();
      saveIcs(events, now);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [key, now]);
  const week = lockedWeekProps(vm, r, p.sessions, rows, now, href || '#');
  return week ? <LockedWeekPage key={r.week} week={week} now={() => now} /> : null;
}
