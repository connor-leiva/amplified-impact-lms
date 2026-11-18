import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setViewerZone, sessionKind, sessionWeek } from '@ai/core';
import { acceleratorSessions } from '@ai/core/seed/accelerator-v1';
import { courseContent } from '@ai/core/seed/accelerator-v1';
import { CourseBody } from './Course';
import type { Load } from './Course';
import type { CoursePayload } from './Course.vm';
import { COPY } from './Course.vm';

// The course page's body (D-110), in each state `GET /api/course` can answer. Its own addresses, /course
// and /course/week-N, redirect to the learner portal since D-182; the body stays for the curriculum
// builder's live preview (D-174), which hands it the draft as a `Load`.
const payload = {
  open: true,
  preview: false,
  course: courseContent(),
  sessions: acceleratorSessions().map((s) => ({ id: s.id, n: s.n, kind: sessionKind(s), week: sessionWeek(s), title: s.title, start: s.start, mins: s.mins })),
};

/** The body for `/course` (no week) or `/course/week-N`, as the page drew it from this answer. */
const at = (path: string, load: Load) =>
  render(
    <MemoryRouter>
      <CourseBody load={load} week={/^\/course\/(.+)$/.exec(path)?.[1]} />
    </MemoryRouter>,
  );
const ready = (payload: unknown): Load => ({ kind: 'ready', payload: payload as CoursePayload });

beforeEach(() => {
  setViewerZone('America/Chicago');
});
afterEach(() => {
  setViewerZone(null);
});

describe('the course page’s body', () => {
  it('shows a week: its question, its skills’ guided setups in learn (D-151), the build, the rubric and the evidence packet', async () => {
    at('/course/week-1', ready(payload));
    expect(await screen.findByRole('heading', { level: 1, name: 'Week 1 · Know the Business' })).toBeInTheDocument();
    expect(screen.getByText('What are we paying for leads, and what can we trust?')).toBeInTheDocument();

    const skills = screen.getByRole('region', { name: COPY.skills });
    const guides = within(skills).getAllByRole('link', { name: COPY.guidedSetup });
    // D-151: each skill's guided setup in learn, in this tab.
    expect(guides.map((a) => a.getAttribute('href'))).toEqual([
      '/skill-library/lead-source-roi',
      '/skill-library/fub-pipeline-review',
      '/skill-library/team-pnl-review',
    ]);
    for (const a of guides) expect(a).not.toHaveAttribute('target');
    expect(within(skills).getByRole('link', { name: COPY.download })).toHaveAttribute('href', '/skill-library');

    const live = screen.getByRole('region', { name: COPY.liveBuild });
    const join = within(live).getByRole('link', { name: 'Join in Sessions' });
    expect(join).toHaveAttribute('href', '/sessions');
    expect(join.closest('p')).toHaveTextContent('Wed, Dec 2 · 1:00 PM CT · 90 Minutes · Join in Sessions (opens 15 min before)');
    expect(document.body.textContent).not.toMatch(/TBA/);
    expect(screen.getByRole('region', { name: COPY.rubric })).toHaveTextContent('Evidence Quality');
    expect(screen.getByRole('region', { name: COPY.evidence })).toHaveTextContent('Three-Sentence Account');
    expect(screen.getByRole('region', { name: COPY.media })).toHaveTextContent('[VIDEO: week 1 Lead-Source ROI demo, to be recorded]');
    expect(screen.getByRole('button', { name: COPY.worksheet })).toBeInTheDocument();
  });

  it('shows the overview with all nine weeks', async () => {
    at('/course', ready(payload));
    const weeks = await screen.findByRole('region', { name: COPY.weeks });
    expect(within(weeks).getAllByRole('link')).toHaveLength(9);
    expect(screen.getByRole('region', { name: COPY.calendar })).toHaveTextContent('Goal-Planning Session 2 and Office Hours');
  });

  it('tells a buyer on another plan the course isn’t in it, and points to their Skill Library', async () => {
    at('/course/week-1', { kind: 'locked' });
    expect(await screen.findByText(COPY.locked)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.library })).toHaveAttribute('href', '/skill-library');
    expect(screen.queryByText('What are we paying for leads, and what can we trust?')).toBeNull();
  });

  it('tells a two-pay buyer whose second payment failed that the course is paused, and where to fix it (D-143)', async () => {
    at('/course/week-1', { kind: 'paused' });
    expect(await screen.findByText(COPY.paused)).toBeInTheDocument();
    expect(screen.getByText(COPY.pausedNote)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.billing })).toHaveAttribute('href', '/api/billing/portal');
    expect(screen.queryByText(COPY.locked)).toBeNull();
    expect(screen.queryByText('What are we paying for leads, and what can we trust?')).toBeNull();
  });

  it('asks a signed-out visitor to sign in', async () => {
    at('/course', { kind: 'signed-out' });
    expect(await screen.findByText(COPY.signedOut)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.signIn })).toHaveAttribute('href', '/sign-in');
  });
});

describe('the pre-launch preview and locked weeks (D-175)', () => {
  const preview = {
    ...payload,
    prelaunch: true,
    copy: { 'locked.opens': 'Opens {date}', 'course.prelaunch': 'Pre-launch preview line.' },
    course: {
      ...payload.course,
      weeks: payload.course.weeks.map((w) =>
        w.week === 0 ? w : { week: w.week, title: w.title, question: w.question, outcome: w.module.outcome, opensAt: Date.parse('2026-12-09T19:00:00Z'), locked: true },
      ),
    },
  };

  it('lists a locked week with a lock and when it opens, and says the preview line', async () => {
    at('/course', ready(preview));
    expect(await screen.findByText('Pre-launch preview line.')).toBeInTheDocument();
    expect(screen.getAllByText('Opens Wed, Dec 9 · 12:00 PM MT').length).toBe(8);
    expect(screen.getAllByLabelText('Locked').length).toBe(8);
  });

  it('draws a locked week’s page with its question and opening, and none of an open week’s sections', async () => {
    at('/course/week-2', ready(preview));
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading.textContent).toMatch(/^Week 2 · /);
    expect(screen.getByText('Opens Wed, Dec 9 · 12:00 PM MT')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: COPY.calendar })).toBeNull();
    expect(screen.getByRole('link', { name: /Week 1/ })).toHaveAttribute('href', '/course/week-1');
  });
});
