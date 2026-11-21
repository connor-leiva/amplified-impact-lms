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
import { cleanIntakeAnswers, intakeFileIds } from '@ai/core/intake';
import { useMutate } from '../../../data/hooks';
import type { CoursePayload } from '../../course/Course.vm';
import { saveIcs } from '../ics';
import type { WeekRow } from '../learn.vm';
import type { LockedWeekVM } from '../Week.vm';
import { PromptModal } from '../WeekContent';
import type { BuildKitVM } from '../WeekContent.vm';
import { FormDrawer, useForm } from './FormDrawer';
import { NO_TAP } from './tap';
import type { FormApi } from './FormDrawer';
import { FORM_ID, formDef, formInitial, formRow } from './form.vm';
import type { IntakeBody } from './form.vm';
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
  const form = useIntakeForm(r.open?.intake, now);
  const [params, setParams] = useSearchParams();
  // B-15: `?form=intake` opens the drawer (the old intake page's address lands here).
  const drawerOpen = !!form && params.get('form') === FORM_ID;
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
  const asForm: KitInput['formRow'] = form
    ? (item, row) => (intakeIds.includes(item.id) ? formRow(row, form, () => setOpen(true)) : row)
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
  });
  const moduleId = acceleratorModuleId(r.week);
  return (
    <>
      <WeekPage
        key={r.week}
        week={week}
        labels={weekLabels(week.steps.length)}
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
              <FormDrawer f={form} open={drawerOpen} onClose={() => setOpen(false)} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** The file name the PDF route sends (`content-disposition`), or the route's own default. */
export function pdfNameOf(disposition: string | null): string {
  const m = /filename="([^"]+)"/.exec(disposition ?? '');
  return m?.[1] ?? 'Week 0 Intake.pdf';
}

/**
 * B-18: Download PDF. The file is made on the server (`GET /api/intake/pdf`, a second or two), so the button's busy
 * state covers the wait, then the browser saves it under the route's name. The package's `useForm` has no failure
 * state for this button: a failed download resolves without a file (PLAN.md, Found while building).
 */
export async function downloadIntakePdf(): Promise<void> {
  try {
    const res = await fetch('/api/intake/pdf', { credentials: 'include' });
    if (!res.ok) throw new Error(`GET /api/intake/pdf ${res.status}`);
    const href = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = href;
    a.download = pdfNameOf(res.headers.get('content-disposition'));
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch (err) {
    console.error(err);
  }
}

/**
 * The week's intake as the package's `useForm` drives it (§7.4): loaded from `GET /api/intake`, saved with
 * `PUT /api/intake` (the answers the course asks, `cleanIntakeAnswers`), submitted the same way, and printed with
 * `GET /api/intake/pdf`. One intake per team: two people editing at once, the last save wins, as today. Null when the
 * week has no intake.
 */
export function useIntakeForm(intake: CourseIntake | undefined, now: number): FormApi | null {
  const def = useMemo(() => (intake ? formDef(intake) : null), [intake]);
  const put = useCallback(
    async (answers: FormAnswers, submit: boolean) => {
      if (!intake) return;
      const res = await fetch('/api/intake', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers: cleanIntakeAnswers(intake, answers), submit }),
      });
      if (!res.ok) throw new Error(`PUT /api/intake ${res.status}`);
    },
    [intake],
  );
  const f = useForm({
    form: def ?? formDef({ sections: [] }),
    initial: { status: 'new', answers: {} },
    onSave: (a) => put(a, false),
    onSubmit: (a) => put(a, true),
    onDownloadPdf: downloadIntakePdf,
  });
  const reset = useRef(f.reset);
  reset.current = f.reset;
  const nowAt = useRef(now);
  nowAt.current = now;
  useEffect(() => {
    if (!intake) return undefined;
    let alive = true;
    void fetch('/api/intake', { credentials: 'include' })
      .then((res) => (res.ok ? (res.json() as Promise<IntakeBody>) : null))
      .then((body) => {
        if (alive && body) reset.current(formInitial(body, nowAt.current));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [intake]);
  return def ? f : null;
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
