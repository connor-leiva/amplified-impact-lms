import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { SKILL_PURCHASE, skillUpsell } from '@ai/core/offer';
import { previewOf } from '@ai/core/skill-guides';
import SkillGuide, { COPY, TOAST_MS } from './SkillGuide';
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
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const CSS = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SkillGuide.module.css'), 'utf8');
const rule = (selector: string) => new RegExp(`\\n${selector.replace('.', '\\.')} \\{([^}]*)\\}`).exec(CSS)?.[1] ?? '';

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
    const router = at('appointment-follow-up');
    expect(await screen.findByText('Not in your plan.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/skill-library/appointment-follow-up');
    expect(screen.getByRole('button', { name: SKILL_PURCHASE.get })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'See Plans' })).toBeNull();
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
    expect(screen.queryByRole('button', { name: SKILL_PURCHASE.get })).toBeNull();
    expect(screen.queryByRole('link', { name: skillUpsell('agent').label })).toBeNull();
    expect(screen.queryByRole('link', { name: skillUpsell('owner_ops').label })).toBeNull();
    expect(screen.queryByText('$37')).toBeNull();
    expect(screen.queryByText(/\$197/)).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the two choices before payment, and does not for a Utah Life member', async () => {
    const upsell = skillUpsell('agent');
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes('/api/offer')) {
        return Promise.resolve(answer(200, { carts: [{ id: upsell.cart, paymentLink: 'https://buy.stripe.com/test_agent_insiders' }] }));
      }
      return Promise.resolve(answer(200, locked({ paidPlans: false })));
    });
    at('appointment-follow-up');
    await userEvent.click(await screen.findByRole('button', { name: SKILL_PURCHASE.get }));
    const dialog = screen.getByRole('dialog', { name: SKILL_PURCHASE.title });
    expect(within(dialog).getByRole('button', { name: SKILL_PURCHASE.get })).toBeInTheDocument();
    expect(await within(dialog).findByRole('link', { name: upsell.label })).toHaveAttribute('href', 'https://buy.stripe.com/test_agent_insiders');
    expect(within(dialog).getByText(SKILL_PURCHASE.body)).toBeInTheDocument();
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

  it('does not call a real guide missing when the account cannot open the library', async () => {
    fetchMock.mockResolvedValue(answer(403, { error: 'The skill library is for learners.' }));
    at('ai-brain-tuneup');
    expect(await screen.findByText(COPY.refused)).toBeInTheDocument();
    expect(screen.queryByText(COPY.missing)).toBeNull();
    expect(screen.getByRole('link', { name: COPY.back })).toHaveAttribute('href', '/skill-library');
  });

  describe('Design\u2019s look check on PR 105', () => {
    it('puts the words first, then Copy & Open, for a line and a block alike', async () => {
      fetchMock.mockResolvedValue(answer(200, open));
      at('appointment-follow-up');
      await screen.findByRole('heading', { level: 1, name: guide.title });
      const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      // A line: the Claude lane's practice step.
      const claude = guide.lanes[0]!;
      const sayAt = claude.steps.findIndex((x) => x.copy !== undefined);
      const list = screen.getByRole('list', { name: FILE.ui.setupTitle });
      fireEvent.click(within(list).getAllByRole('button')[sayAt]!);
      const chip = screen.getByRole('button', { name: `${FILE.ui.copy.tag}: ${claude.steps[sayAt]!.copy}` });
      expect(before(chip, screen.getByRole('link', { name: FILE.ui.copyOpen.claude.label }))).toBe(true);
      // A block: the ChatGPT lane's Project instructions.
      fireEvent.click(screen.getByRole('button', { name: 'ChatGPT' }));
      const chatgpt = guide.lanes[1]!;
      const blockAt = chatgpt.steps.findIndex((x) => x.copyBlock !== undefined);
      fireEvent.click(within(screen.getByRole('list', { name: FILE.ui.setupTitle })).getAllByRole('button')[blockAt]!);
      const block = screen.getByRole('button', { name: `${FILE.ui.copy.tag}: ${chatgpt.steps[blockAt]!.title}` });
      expect(before(block, screen.getByRole('link', { name: FILE.ui.copyOpen.chatgpt.label }))).toBe(true);
    });

    it('confirms a copy at the foot of the screen, fixed, wherever the words were, then clears it', async () => {
      fetchMock.mockResolvedValue(answer(200, open));
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(() => Promise.resolve()) } });
      at('appointment-follow-up');
      const first = guide.prompts[0]!.groups[0]!.items[0]!;
      const chip = await screen.findByRole('button', { name: `${FILE.ui.copy.tag}: ${first}` });
      vi.useFakeTimers();
      await act(async () => {
        fireEvent.click(chip);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60);
      });
      const toast = screen.getByRole('status');
      expect(toast.textContent).toBe(FILE.ui.copy.copied);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(TOAST_MS);
      });
      expect(toast.textContent).toBe('');
      const t = rule('.toast');
      expect(t).toMatch(/position: fixed;/);
      expect(t).toMatch(/bottom: 24px;/);
      expect(t).toMatch(/font-size: 16px;/);
      expect(t).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i);
    });

    it('sets "Step n of N" and a block\u2019s words at 16 / 24, and since D-156 the step numbers and Copy tags at 16px too', () => {
      for (const sel of ['.progress', '.blockText']) {
        expect(rule(sel), sel).toMatch(/font-size: 16px;/);
        expect(rule(sel), sel).toMatch(/line-height: 24px;/);
      }
      // D-156: no LMS text under 16px; the 14px step numbers and Copy tags rose to the floor.
      expect(rule('.stepN')).toMatch(/font-size: 16px;/);
      expect(rule('.chipTag')).toMatch(/font-size: 16px;/);
    });
  });
});
