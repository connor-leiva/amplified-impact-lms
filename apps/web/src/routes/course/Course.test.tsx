import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setViewerZone, sessionKind, sessionWeek } from '@ai/core';
import { acceleratorSessions } from '@ai/core/accelerator';
import { courseContent } from '@ai/core/accelerator-content';
import Course from './Course';
import { COPY } from './Course.vm';

// /course (D-110): the screen over `GET /api/course`, in each state the API can answer.

let fetchMock: Mock;
const answer = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;
const payload = {
  open: true,
  preview: false,
  course: courseContent(),
  sessions: acceleratorSessions().map((s) => ({ id: s.id, n: s.n, kind: sessionKind(s), week: sessionWeek(s), title: s.title, start: s.start, mins: s.mins })),
};

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/course" element={<Course />} />
        <Route path="/course/:week" element={<Course />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  delete document.body.dataset.appReady;
  setViewerZone('America/Chicago');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setViewerZone(null);
});

describe('the course screen', () => {
  it('shows a week: its question, its skills’ guided setups in learn (D-151), the build, the rubric and the evidence packet', async () => {
    fetchMock.mockResolvedValue(answer(200, payload));
    at('/course/week-1');
    expect(await screen.findByRole('heading', { level: 1, name: 'Week 1 · Know the Business' })).toBeInTheDocument();
    expect(screen.getByText('What are we paying for leads, and what can we trust?')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/course', expect.objectContaining({ credentials: 'include' }));

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
    expect(document.body.dataset.appReady).toBe('true');
  });

  it('shows the overview with all nine weeks', async () => {
    fetchMock.mockResolvedValue(answer(200, payload));
    at('/course');
    const weeks = await screen.findByRole('region', { name: COPY.weeks });
    expect(within(weeks).getAllByRole('link')).toHaveLength(9);
    expect(screen.getByRole('region', { name: COPY.calendar })).toHaveTextContent('Goal-Planning Session 2 and Office Hours');
  });

  it('tells a buyer on another plan the course isn’t in it, and points to their Skill Library', async () => {
    fetchMock.mockResolvedValue(answer(403, { open: false, error: 'x' }));
    at('/course/week-1');
    expect(await screen.findByText(COPY.locked)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.library })).toHaveAttribute('href', '/skill-library');
    expect(screen.queryByText('What are we paying for leads, and what can we trust?')).toBeNull();
  });

  it('tells a two-pay buyer whose second payment failed that the course is paused, and where to fix it (D-143)', async () => {
    fetchMock.mockResolvedValue(answer(403, { open: false, paused: true, error: 'x' }));
    at('/course/week-1');
    expect(await screen.findByText(COPY.paused)).toBeInTheDocument();
    expect(screen.getByText(COPY.pausedNote)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.billing })).toHaveAttribute('href', '/api/billing/portal');
    expect(screen.queryByText(COPY.locked)).toBeNull();
    expect(screen.queryByText('What are we paying for leads, and what can we trust?')).toBeNull();
  });

  it('asks a signed-out visitor to sign in', async () => {
    fetchMock.mockResolvedValue(answer(401, { error: 'Not signed in' }));
    at('/course');
    expect(await screen.findByText(COPY.signedOut)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.signIn })).toHaveAttribute('href', '/sign-in');
  });
});
