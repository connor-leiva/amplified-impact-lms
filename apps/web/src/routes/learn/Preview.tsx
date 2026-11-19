// D-184: the learner portal v2's week page and step player, drawn from a course the caller hands in rather
// than from `GET /api/course`: the curriculum builder's live preview gives it the unsaved draft, so the
// builder previews exactly what a learner sees. Inside the preview a link to one of the week's own pages
// (a step, the week) moves the preview; every other link stays put, so the builder's page never moves.

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { MemoryRouter, useInRouterContext } from 'react-router';
import type { Db } from '@ai/core';
import '../../styles/r2.css';
import '../../styles/learner-v2.css';
import { ToasterProvider } from '../../components/primitives/Toaster';
import type { Viewer } from '../../data/repository';
import { ConfettiProvider } from '../../shell/Confetti';
import type { CoursePayload } from '../course/Course.vm';
import { LearnProvider } from './data';
import type { LearnContext } from './data';
import { StepPage } from './Step';
import { WeekPage } from './Week';
import { learnTeam } from './routes';
import c from './WeekContent.module.css';

/** Staff, previewing: nothing is written ("Mark step done" is off for anyone but a learner). */
const STAFF: Viewer = { actor: { kind: 'staff', staffId: 'preview' }, role: 'admin' };

/** A link inside the preview: `/learn/week/3` or `/learn/week/3/step/2`, as the week and step it names. */
export function previewTarget(href: string | null): { week: number; step: number | null } | null {
  const m = /^\/learn\/week\/(\d+)(?:\/step\/(\d+))?\/?$/.exec(href ?? '');
  return m ? { week: Number(m[1]), step: m[2] ? Number(m[2]) : null } : null;
}

export function LearnerWeekPreview({ payload, db, week, now }: { payload: CoursePayload; db: Db; week: number; now: number }) {
  const [step, setStep] = useState<number | null>(null);
  const ctx: LearnContext = { course: { kind: 'ready', payload }, db, viewer: STAFF, now };
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a || !e.currentTarget.contains(a)) return;
    const href = a.getAttribute('href');
    const to = previewTarget(href);
    // A step or the week stays inside the preview. A kit download is a real file link and is left alone.
    if (to && to.week === week) {
      e.preventDefault();
      setStep(to.step);
      return;
    }
    // Invite opens Team Hub. The link stays visible; following it would leave the builder.
    if (href === learnTeam()) e.preventDefault();
  };
  // The pages draw router links; outside a router (a test of the builder alone) they get one of their own.
  const routed = useInRouterContext();
  const page = (
    <ToasterProvider>
      <ConfettiProvider>
        <LearnProvider value={ctx}>
          <div className={c.frame} data-r2-scope="" data-learner-v2="" onClickCapture={onClickCapture}>
            {step === null ? <WeekPage week={week} preview /> : <StepPage week={week} step={step} preview />}
          </div>
        </LearnProvider>
      </ConfettiProvider>
    </ToasterProvider>
  );
  return routed ? page : <MemoryRouter>{page}</MemoryRouter>;
}
