import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { previewOf } from '@ai/core/skill-guides';
import SkillGuide, { COPY } from './SkillGuide';
import type { GuideAnswer } from './SkillGuide';
import { GUIDES } from '../../guides/content';
import { exportGuide, exportSkillGuides } from '../../guides/setup-export';

// /skill-library/:slug (D-151): a skill's guided setup in learn. The guide's words come only from the
// API's answer (a test may read the real export; the screen never imports it, `gated.test.ts`).

const FILE = exportSkillGuides();
const guide = exportGuide(GUIDES['appointment-follow-up']!);
const open: GuideAnswer = {
  slug: 'appointment-follow-up',
  skill: 'appointment-follow-up',
  title: guide.title,
  sets: 'agent',
  free: false,
  state: 'open',
  opensAt: null,
  accessGroups: [],
  paidPlans: true,
  preview: previewOf(guide),
  guide,
  ui: FILE.ui,
};
const locked = (over: Partial<GuideAnswer> = {}): GuideAnswer => ({ ...open, state: 'locked', guide: null, ui: null, ...over });

let fetchMock: Mock;
const answer = (status: number, body: unknown = {}) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

beforeEach(() => {
  delete document.body.dataset.appReady;
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function at(slug: string) {
  const router = createMemoryRouter(
    [
      { path: '/skill-library/:slug', element: <SkillGuide /> },
      { path: '/skill-library', element: <p>the skill library</p> },
      { path: '/sign-in', element: <p>sign in</p> },
    ],
    { initialEntries: [`/skill-library/${slug}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('the guided setup in learn (D-151)', () => {
  it('asks the API for this guide only, and sends a signed-out visitor to sign in and back here', async () => {
    fetchMock.mockResolvedValue(answer(401));
    const router = at('appointment-follow-up');
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/skill-library/appointment-follow-up')}`);
    expect(fetchMock).toHaveBeenCalledWith('/api/skill-guides/appointment-follow-up', expect.objectContaining({ credentials: 'include' }));
  });

  it('walks an open skill one step at a time, with its file through the checked download, and copies its words', async () => {
    fetchMock.mockResolvedValue(answer(200, open));
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    at('appointment-follow-up');
    expect(await screen.findByRole('heading', { level: 1, name: guide.title })).toBeInTheDocument();
    expect(screen.getByText(guide.intro)).toBeInTheDocument();

    // The app switch, Claude first (no Grok Bot lane on this skill), pressed.
    const claude = screen.getByRole('button', { name: 'Claude' });
    expect(claude).toHaveAttribute('aria-pressed', 'true');
    const lane = guide.lanes[0]!;
    expect(screen.getByText(`Step 1 of ${lane.steps.length}`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: lane.steps[0]!.title })).toBeInTheDocument();

    // Every step's title is a button to it; Next moves on.
    const list = screen.getByRole('list', { name: FILE.ui.setupTitle });
    expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual(lane.steps.map((s, i) => `${i + 1}${s.title}`));
    const downloadAt = lane.steps.findIndex((s) => s.action?.kind === 'file');
    for (let i = 0; i < downloadAt; i++) await userEvent.click(screen.getByRole('button', { name: FILE.ui.guided.next }));
    const step = lane.steps[downloadAt]!;
    expect(screen.getByRole('heading', { level: 3, name: step.title })).toBeInTheDocument();
    const file = step.action?.kind === 'file' ? step.action : null;
    expect(screen.getByRole('link', { name: file!.label })).toHaveAttribute('href', `/api/skills/appointment-follow-up/download/${file!.file}`);
    expect(localStorage.getItem('guide-step:appointment-follow-up:claude')).toBe(String(downloadAt));

    // A step with words to say copies them, and says so.
    const sayAt = lane.steps.findIndex((s) => s.copy !== undefined);
    await userEvent.click(within(list).getAllByRole('button')[sayAt]!);
    await userEvent.click(screen.getByRole('button', { name: `${FILE.ui.copy.tag}: ${lane.steps[sayAt]!.copy}` }));
    expect(writeText).toHaveBeenCalledWith(lane.steps[sayAt]!.copy);
    expect(await screen.findByText(FILE.ui.copy.copied)).toBeInTheDocument();

    // The other app's steps, its own place.
    await userEvent.click(screen.getByRole('button', { name: 'ChatGPT' }));
    expect(screen.getByText(`Step 1 of ${guide.lanes[1]!.steps.length}`)).toBeInTheDocument();
    await waitFor(() => expect(document.body.dataset.appReady).toBe('true'));
  });

  it('copies each of "What to say"', async () => {
    fetchMock.mockResolvedValue(answer(200, open));
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    at('appointment-follow-up');
    const prompts = guide.prompts[0]!;
    expect(await screen.findByRole('heading', { level: 2, name: prompts.heading })).toBeInTheDocument();
    const first = prompts.groups[0]!.items[0]!;
    await userEvent.click(screen.getByRole('button', { name: `${FILE.ui.copy.tag}: ${first}` }));
    expect(writeText).toHaveBeenCalledWith(first);
  });

  it('shows a locked skill’s steps’ titles and the plans, with no step’s words', async () => {
    fetchMock.mockResolvedValue(answer(200, locked({ paidPlans: false })));
    at('appointment-follow-up');
    expect(await screen.findByText('Not in your plan.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See Plans' })).toHaveAttribute('href', 'https://www.amplifiedimpact.io/pricing');
    const titles = Array.from(document.querySelectorAll('ol li')).map((li) => li.textContent);
    expect(titles).toEqual(guide.lanes[0]!.steps.map((s, i) => `${i + 1}${s.title}`));
    expect(screen.queryByRole('button', { name: FILE.ui.guided.next })).toBeNull();
    expect(screen.getByText(COPY.previewNote)).toBeInTheDocument();
  });

  it('tells a Utah Life member a locked one is not included with their access, with no upsell (D-150)', async () => {
    fetchMock.mockResolvedValue(
      answer(200, locked({ sets: 'owner_ops', paidPlans: false, accessGroups: [{ id: 'utah-life', name: 'Utah Life', covers: ['agent', 'both'] }] })),
    );
    at('team-pnl-review');
    expect(await screen.findByText('Not included with Utah Life access')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'See Plans' })).toBeNull();
    expect(screen.queryByText('Not in your plan.')).toBeNull();
  });

  it('says when an upcoming one opens', async () => {
    fetchMock.mockResolvedValue(answer(200, locked({ state: 'upcoming', opensAt: Date.parse('2027-01-04T12:00:00-06:00') })));
    at('appointment-follow-up');
    expect(await screen.findByText('Coming January 4.')).toBeInTheDocument();
  });

  it('says so for a skill that is not there, and leads back to the library', async () => {
    fetchMock.mockResolvedValue(answer(404, { error: 'Not found' }));
    at('not-a-skill');
    expect(await screen.findByText(COPY.missing)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.back })).toHaveAttribute('href', '/skill-library');
  });
});
