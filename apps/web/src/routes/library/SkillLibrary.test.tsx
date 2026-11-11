import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import SkillLibrary, { COPY } from './SkillLibrary';
import type { LibrarySkill } from './SkillLibrary';

// /skill-library (D-079): open skills download, locked ones point to the plans, upcoming ones say when.

const skill = (over: Partial<LibrarySkill>): LibrarySkill => ({
  id: 'team-pnl-review',
  title: 'Team P&L Review',
  summary: "Reviews the team's profit and loss.",
  sets: 'owner_ops',
  free: false,
  releasedAt: Date.parse('2026-11-01T00:00:00-05:00'),
  state: 'open',
  files: ['claude', 'chatgpt', 'practice'],
  ...over,
});

let fetchMock: Mock;
const answer = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

beforeEach(() => {
  delete document.body.dataset.appReady;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('the skill library screen', () => {
  it('groups skills by set and links each open skill to its checked download', async () => {
    fetchMock.mockResolvedValue(
      answer(200, {
        skills: [
          skill({}),
          skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'locked', files: ['claude'] }),
          skill({ id: 'perfect-week', title: 'Perfect Week', sets: 'both', state: 'upcoming', releasedAt: Date.parse('2026-12-15T12:00:00Z') }),
        ],
      }),
    );
    render(<SkillLibrary />);
    const owner = await screen.findByRole('region', { name: COPY.sets.owner_ops });
    expect(within(owner).getByRole('link', { name: COPY.files.claude })).toHaveAttribute('href', '/api/skills/team-pnl-review/download/claude');
    expect(within(owner).getByRole('link', { name: COPY.files.practice })).toBeInTheDocument();

    // Beside the downloads, the skill's guided setup on its www page, in a new tab (D-101).
    const guide = within(owner).getByRole('link', { name: COPY.guide });
    expect(guide).toHaveAttribute('href', 'https://www.amplifiedimpact.io/team-pnl-review');
    expect(guide).toHaveAttribute('target', '_blank');

    const agent = screen.getByRole('region', { name: COPY.sets.agent });
    expect(within(agent).queryByRole('link', { name: COPY.files.claude })).toBeNull();
    expect(within(agent).queryByRole('link', { name: COPY.guide })).toBeNull();
    expect(within(agent).getByText(COPY.locked)).toBeInTheDocument();
    expect(within(agent).getByRole('link', { name: COPY.seePlans })).toHaveAttribute('href', 'https://www.amplifiedimpact.io/offer#plans');

    const both = screen.getByRole('region', { name: COPY.sets.both });
    expect(within(both).getByText('Coming December 15.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/skills', expect.objectContaining({ credentials: 'include' }));
    // The ready mark is set in an effect after the list renders, so wait for it rather than race it.
    await waitFor(() => expect(document.body.dataset.appReady).toBe('true'));
    expect(screen.getByRole('link', { name: COPY.billing })).toHaveAttribute('href', '/api/billing/portal');
  });

  it('sends a signed-out visitor to sign in', async () => {
    fetchMock.mockResolvedValue(answer(401, { error: 'Sign in' }));
    render(<SkillLibrary />);
    expect(await screen.findByText(COPY.unavailable)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.signIn })).toHaveAttribute('href', '/sign-in');
  });

  it('offers a Grok Bot template’s one file as a Grok Bot download (D-100)', async () => {
    fetchMock.mockResolvedValue(
      answer(200, {
        skills: [skill({ id: 'month-end-close', title: 'Month-End Close Packet', sets: 'both', files: ['grok'] })],
      }),
    );
    render(<SkillLibrary />);
    const link = await screen.findByRole('link', { name: COPY.files.grok });
    expect(link).toHaveAttribute('href', '/api/skills/month-end-close/download/grok');
    expect(COPY.files.grok).toBe('Download for Grok Bot');
    expect(screen.getByRole('link', { name: COPY.guide })).toHaveAttribute('href', 'https://www.amplifiedimpact.io/month-end-close');
  });

  it('sends a skill whose page has another name to that page (D-101)', async () => {
    fetchMock.mockResolvedValue(
      answer(200, { skills: [skill({ id: 'content-opportunity-research', title: 'Content Strategist', sets: 'both', files: ['claude'] })] }),
    );
    render(<SkillLibrary />);
    expect(await screen.findByRole('link', { name: COPY.guide })).toHaveAttribute('href', 'https://www.amplifiedimpact.io/content-strategist');
  });

  it('says so when the list fails to load', async () => {
    fetchMock.mockResolvedValue(answer(500, {}));
    render(<SkillLibrary />);
    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.failed);
  });

  it('links an AI Accelerator plan to its course, and no other plan (D-110)', async () => {
    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'cohort', status: 'active' }], skills: [skill({})] }));
    const { unmount } = render(<SkillLibrary />);
    expect(await screen.findByRole('link', { name: COPY.course })).toHaveAttribute('href', '/course');
    unmount();

    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'membership', status: 'active' }], skills: [skill({})] }));
    render(<SkillLibrary />);
    expect(await screen.findByRole('link', { name: COPY.billing })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: COPY.course })).toBeNull();
  });
});
