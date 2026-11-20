import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import type { CourseLoad } from './data';
import type * as DataModule from './data';
import type { GuideLoad, SkillsLoad } from './skills-data';
import type { SkillsPayload } from './Library.vm';
import { learnerRoutes } from './routes';
import { prelaunchState } from './test/fixture';
import { UTAH_LINE, answerOf, buyerSkills, utahSkills } from './test/library-fixture';
import { PRELOAD_TIMEOUT, preloadLearnerRoutes } from './test/preload';

// D-179: the Skill Library and a skill's page, rendered for real through the learner routes and shell;
// only the data hooks are stood in for, with the catalog as `GET /api/skills` answers it.

const base = prelaunchState();
const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad; skills: SkillsLoad; payload: SkillsPayload } = {
  db: base.db,
  viewer: base.viewer,
  now: base.now,
  course: { kind: 'ready', payload: base.payload },
  skills: { kind: 'ready', payload: buyerSkills() },
  payload: buyerSkills(),
};

vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => state.now,
  useMutate: () => vi.fn(),
}));
vi.mock('./data', async (importOriginal) => ({
  ...(await importOriginal<typeof DataModule>()),
  useCourse: () => state.course,
}));
vi.mock('./skills-data', () => ({
  useSkills: () => state.skills,
  useGuide: (slug: string | null): GuideLoad => {
    if (!slug) return { kind: 'loading' };
    const id = state.payload.skills.find((k) => k.id === slug || (slug === 'content-strategist' && k.id === 'content-opportunity-research'))?.id;
    return id ? { kind: 'ready', answer: answerOf(state.payload, slug, id) } : { kind: 'missing' };
  },
}));

function as(payload: SkillsPayload, course: CourseLoad = { kind: 'ready', payload: base.payload }) {
  state.payload = payload;
  state.skills = { kind: 'ready', payload };
  state.course = course;
}

function at(path: string, enabled = true) {
  const router = createMemoryRouter([...learnerRoutes(enabled), { path: '/', element: <p>the portal</p> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

// Every lazy route chunk loaded once, so no first render races its import (E-16).
beforeAll(preloadLearnerRoutes, PRELOAD_TIMEOUT);

beforeEach(() => {
  setViewerZone('America/Denver');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  as(buyerSkills());
});
afterEach(() => setViewerZone(null));

describe('the Skill Library (D-179)', () => {
  it('draws the library inside the shell, with the nav’s Skill library as the current page', async () => {
    at('/learn/skills');
    expect(await screen.findByRole('heading', { level: 1, name: 'Skill library' }, { timeout: 5000 })).toBeInTheDocument();
    const nav = within(document.querySelector<HTMLElement>('aside[aria-label="Primary"]')!);
    expect(nav.getByRole('link', { name: 'Skill library' })).toHaveAttribute('href', '/learn/skills');
    expect(nav.getByRole('link', { name: 'Skill library' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('heading', { level: 2, name: 'Start here' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AI Brain Setup, open' })).toHaveAttribute('href', '/learn/skills/ai-brain-setup');
    // The featured card's sample, labelled made up.
    expect(screen.getByRole('note', { name: 'A sample of what it builds' })).toHaveTextContent('AI Brain Setup: Example File');
    expect(screen.getByText('Sample output · made-up data')).toBeInTheDocument();
    // One lock line per group, and a lock on each card.
    const team = screen.getByRole('region', { name: 'Owner and Operations Skills' });
    expect(within(team).getAllByText('Opens Wed, Dec 2')).toHaveLength(1);
    expect(within(team).getByRole('link', { name: 'TC File Audit, opens Wed, Dec 2' })).toHaveAttribute('href', '/learn/skills/tc-file-audit');
  });

  it('filters by a chip, and searches', async () => {
    at('/learn/skills');
    const chips = await screen.findByRole('toolbar', { name: 'Filter by topic' });
    fireEvent.click(within(chips).getByRole('button', { name: /^Bookkeeping/ }));
    expect(within(chips).getByRole('button', { name: /^Bookkeeping/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('region', { name: 'Owner and Operations Skills' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Bookkeeping' })).toBeInTheDocument();
    fireEvent.click(within(chips).getByRole('button', { name: /^All/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search skills' }), { target: { value: 'appraisal' } });
    expect(screen.getByRole('link', { name: /^Low Appraisal Response/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^TC File Audit/ })).toBeNull();
  });

  it('a Utah Life member’s locked skills read the copy string, with no upsell and no cohort pieces', async () => {
    as(utahSkills(), { kind: 'locked' });
    at('/learn/skills');
    const team = await screen.findByRole('region', { name: 'Owner and Operations Skills' });
    expect(within(team).getByText(UTAH_LINE)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'See Plans' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Schedule' })).toBeNull();
  });

  it('says the library opens when you sign in, with no API', async () => {
    state.skills = { kind: 'signed-out' };
    at('/learn/skills');
    expect(await screen.findByText('The skill library opens when you sign in.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
  });

  it('redirects to / when the flag is off', async () => {
    at('/learn/skills', false);
    expect(await screen.findByText('the portal')).toBeInTheDocument();
    at('/learn/skills/tc-file-audit', false);
    expect((await screen.findAllByText('the portal')).length).toBeGreaterThan(0);
  });
});

describe('a skill’s page (D-179)', () => {
  it('previews a locked skill: when it opens, its sample labelled made up, what comes with it, nothing of its setup', async () => {
    at('/learn/skills/tc-file-audit');
    expect(await screen.findByRole('heading', { level: 1, name: 'TC File Audit' })).toBeInTheDocument();
    expect(within(document.querySelector('main')!).getByRole('link', { name: 'Skill library' })).toHaveAttribute('href', '/learn/skills');
    expect(screen.getByText(/^Opens Wed, Dec 2 at 12:00 PM MT/)).toBeInTheDocument();
    const sample = screen.getByRole('region', { name: 'A sample of what it builds' });
    expect(within(sample).getByText('Made-up data')).toBeInTheDocument();
    expect(within(sample).getByText('Made-up example. Shortened.')).toBeInTheDocument();
    expect(within(sample).getByRole('table', { name: 'Dates' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'When it opens' })).toBeInTheDocument();
    expect(screen.getByText('Downloads for Claude and ChatGPT')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('SECRET');
    expect(screen.queryByRole('button', { name: 'Mark step done' })).toBeNull();
  });

  it('runs an open skill’s setup in the step player: the rail, the app tabs, Next, the download and the copy block', async () => {
    at('/learn/skills/ai-brain-setup');
    expect(await screen.findByRole('heading', { level: 1, name: 'First Step' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Settings/ })).toHaveAttribute('href', 'https://claude.ai/settings');
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Second Step' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download Here/ })).toHaveAttribute('href', '/api/skills/ai-brain-setup/download/claude');
    expect(screen.getByText('SECRET-COPY say this')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Over' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'ChatGPT' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Paste It' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'What to say' })).toBeInTheDocument();
  });

  it('sends an address that is no skill’s back to the library', async () => {
    const router = at('/learn/skills/not-a-skill');
    expect(await screen.findByRole('heading', { level: 1, name: 'Skill library' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/learn/skills');
  });
});
