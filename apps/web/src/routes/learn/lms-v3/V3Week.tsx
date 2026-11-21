// D-228: the v3 week overview and locked week in their route. Wiring only: the pages are the package's; this hands
// them their props, sends Mark as deployed and Undo to the mutations (`markDeployed`, `unmarkDeployed`, B-11), opens
// today's prompt modal from the kit's View (C-11, kept as it is), starts the kit's downloads through the gated files
// route, and lets the locked week's calendar button download the week's sessions as today's Add to calendar does.
import { useEffect, useMemo, useState } from 'react';
import { ics } from '@ai/core';
import type { ChecklistMark, Learner } from '@ai/core';
import { acceleratorModuleId } from '@ai/core/accelerator';
import { useMutate } from '../../../data/hooks';
import type { CoursePayload } from '../../course/Course.vm';
import { saveIcs } from '../ics';
import type { WeekRow } from '../learn.vm';
import type { LockedWeekVM } from '../Week.vm';
import { PromptModal } from '../WeekContent';
import type { BuildKitVM } from '../WeekContent.vm';
import { LockedWeekPage } from './LockedWeekPage';
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
  formRow,
}: {
  p: CoursePayload;
  rows: readonly WeekRow[];
  r: WeekRow;
  me: Learner | null;
  checks: readonly ChecklistMark[];
  build: BuildKitVM | null;
  fileUrl: (id: string) => string | null;
  formRow?: KitInput['formRow'];
}) {
  const mutate = useMutate();
  const [prompt, setPrompt] = useState(false);
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
    formRow,
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
    </>
  );
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
