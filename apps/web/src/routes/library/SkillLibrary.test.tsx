import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { SKILL_CATALOG } from '@ai/core/skills';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import SkillLibrary, { COPY, START_WITH, groupOnly, leadOf, offersPlans } from './SkillLibrary';
import type { LibrarySkill } from './SkillLibrary';
import { ENTRIES, LEAD } from '../../library/content';

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

/** The Setup Guide link's accessible name: its label, then that it opens a new tab (D-150). */
const GUIDE = `${COPY.guide} ${COPY.newTab}`;

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

    // Beside the downloads, the skill's guided setup on its www page, in a new tab (D-101), and it
    // says so: an icon, the words for a screen reader, and a hover title (D-150).
    const guide = within(owner).getByRole('link', { name: GUIDE });
    expect(guide).toHaveAttribute('href', 'https://www.amplifiedimpact.io/team-pnl-review');
    expect(guide).toHaveAttribute('target', '_blank');
    expect(guide).toHaveAttribute('rel', 'noopener');
    expect(guide).toHaveAttribute('title', 'Opens in a new tab');
    expect(guide).toHaveAttribute('aria-label', 'Setup Guide (opens in a new tab)');
    // Its words as before, then the new-tab icon after them.
    expect(guide.textContent).toBe('Setup Guide');
    expect(guide.querySelectorAll('svg')).toHaveLength(2);
    expect(guide.lastElementChild?.tagName.toLowerCase()).toBe('svg');

    const agent = screen.getByRole('region', { name: COPY.sets.agent });
    expect(within(agent).queryByRole('link', { name: COPY.files.claude })).toBeNull();
    expect(within(agent).queryByRole('link', { name: GUIDE })).toBeNull();
    expect(within(agent).getByText(COPY.locked)).toBeInTheDocument();
    // /pricing compares all four programs; /offer#plans had no Agent Plan (D-140).
    expect(within(agent).getByRole('link', { name: COPY.seePlans })).toHaveAttribute('href', 'https://www.amplifiedimpact.io/pricing');

    const both = screen.getByRole('region', { name: COPY.sets.both });
    expect(within(both).getByText('Coming December 15.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/skills', expect.objectContaining({ credentials: 'include' }));
    // The ready mark is set in an effect after the list renders, so wait for it rather than race it.
    await waitFor(() => expect(document.body.dataset.appReady).toBe('true'));
    expect(screen.getByRole('link', { name: COPY.billing })).toHaveAttribute('href', '/api/billing/portal');
  });

  it('names the plan\'s first day for a skill the buyer has paid for but can\'t open yet (D-140)', async () => {
    // A Team Plan owner before Dec 14: the skill is released, and their plan opens it on its first day.
    fetchMock.mockResolvedValue(
      answer(200, {
        skills: [skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'upcoming', opensAt: Date.parse('2026-12-14T00:00:00-06:00') })],
      }),
    );
    render(<SkillLibrary />);
    const agent = await screen.findByRole('region', { name: COPY.sets.agent });
    expect(within(agent).getByText('Coming December 14.')).toBeInTheDocument();
    expect(within(agent).queryByText(COPY.locked)).toBeNull();
    expect(within(agent).queryByRole('link', { name: COPY.seePlans })).toBeNull();
  });

  it('says why a paused two-pay AI Accelerator\'s skills are locked, and only then (D-143)', async () => {
    fetchMock.mockResolvedValue(answer(200, { paused: true, skills: [skill({ state: 'locked' })] }));
    const { unmount } = render(<SkillLibrary />);
    expect(await screen.findByText(COPY.paused)).toBeInTheDocument();
    unmount();
    fetchMock.mockResolvedValue(answer(200, { skills: [skill({ state: 'locked' })] }));
    render(<SkillLibrary />);
    await screen.findByRole('region', { name: COPY.sets.owner_ops });
    expect(screen.queryByText(COPY.paused)).toBeNull();
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
    expect(screen.getByRole('link', { name: GUIDE })).toHaveAttribute('href', 'https://www.amplifiedimpact.io/month-end-close');
  });

  it('sends a skill whose page has another name to that page (D-101)', async () => {
    fetchMock.mockResolvedValue(
      answer(200, { skills: [skill({ id: 'content-opportunity-research', title: 'Content Strategist', sets: 'both', files: ['claude'] })] }),
    );
    render(<SkillLibrary />);
    expect(await screen.findByRole('link', { name: GUIDE })).toHaveAttribute('href', 'https://www.amplifiedimpact.io/content-strategist');
  });

  it('leads every skill with the problem it fixes, in its Library card’s words, above its downloads under "Set it up"', async () => {
    fetchMock.mockResolvedValue(
      answer(200, {
        skills: [skill({}), skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'locked', files: ['claude'] })],
      }),
    );
    render(<SkillLibrary />);
    const owner = await screen.findByRole('region', { name: COPY.sets.owner_ops });
    const card = ENTRIES.find((e) => e.href === '/team-pnl-review')!;
    const row = within(owner).getByRole('listitem');
    const lead = row.querySelector('[data-lead]');
    expect([...(lead?.querySelectorAll('dt') ?? [])].map((dt) => dt.textContent)).toEqual([LEAD.problem, LEAD.outcome, LEAD.forRole]);
    expect([...(lead?.querySelectorAll('dd') ?? [])].map((dd) => dd.textContent)).toEqual([card.problem, card.outcome, card.forRole]);
    // The downloads and the Setup Guide, named "Set it up", come after the lead and the summary, all kept.
    const setup = within(row).getByRole('group', { name: LEAD.setup });
    expect(within(setup).getByRole('link', { name: COPY.files.claude })).toBeInTheDocument();
    expect(within(setup).getByRole('link', { name: GUIDE })).toBeInTheDocument();
    expect(lead!.compareDocumentPosition(setup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(row).getByText("Reviews the team's profit and loss.")).toBeInTheDocument();
    // A locked skill leads the same way, with nothing to set up yet.
    const agent = screen.getByRole('region', { name: COPY.sets.agent });
    expect(within(agent).getByText(ENTRIES.find((e) => e.href === '/offer-strategy')!.problem)).toBeInTheDocument();
    expect(within(agent).queryByRole('group', { name: LEAD.setup })).toBeNull();
  });

  it('has a lead for every skill and Grok Bot template the platform serves, found by its www page', () => {
    for (const s of SKILL_CATALOG) expect(leadOf(s.id), s.id).toBeDefined();
    for (const g of GROK_TEMPLATES) expect(leadOf(g.id), g.id).toBeDefined();
    // A skill whose page has another name (D-101) reads that page's card.
    expect(leadOf('content-opportunity-research')?.problem).toBe(ENTRIES.find((e) => e.href === '/content-strategist')?.problem);
  });

  it('tells a Utah Life member their skills are included with their team, in place of billing (D-148)', async () => {
    fetchMock.mockResolvedValue(
      answer(200, { plans: [], accessGroups: [{ id: 'utah-life', name: 'Utah Life' }], skills: [skill({ id: 'appointment-follow-up', title: 'Appointment Follow-Up', sets: 'agent' })] }),
    );
    const { unmount } = render(<SkillLibrary />);
    expect(await screen.findByText('Included with your Utah Life team')).toBeInTheDocument();
    expect(COPY.included('Utah Life')).toBe('Included with your Utah Life team');
    // Not a customer: nothing to bill.
    expect(screen.queryByRole('link', { name: COPY.billing })).toBeNull();
    unmount();

    // A member who also bought a plan keeps Manage Billing beside the note.
    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'membership', status: 'active' }], accessGroups: [{ id: 'utah-life', name: 'Utah Life' }], skills: [skill({})] }));
    const again = render(<SkillLibrary />);
    expect(await screen.findByText('Included with your Utah Life team')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.billing })).toBeInTheDocument();
    again.unmount();

    // Everyone else: Manage Billing as before, and no note.
    fetchMock.mockResolvedValue(answer(200, { skills: [skill({})] }));
    render(<SkillLibrary />);
    expect(await screen.findByRole('link', { name: COPY.billing })).toBeInTheDocument();
    expect(screen.queryByText(/Included with your/)).toBeNull();
  });

  describe('for an access group’s member (Design’s follow-up to D-148)', () => {
    const UTAH = [{ id: 'utah-life', name: 'Utah Life' }];

    it('gives the note its own class: 16px, no margin, the buttons’ 40px row, colour from a token', async () => {
      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: UTAH, skills: [skill({})] }));
      render(<SkillLibrary />);
      const note = await screen.findByText('Included with your Utah Life team');
      expect(note.tagName).toBe('P');
      expect(note.className).toMatch(/included/);
      expect(note.className).not.toMatch(/note/);
      const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SkillLibrary.module.css'), 'utf8');
      const rule = /\.included \{([^}]*)\}/.exec(css)?.[1] ?? '';
      expect(rule).toMatch(/margin: 0;/);
      expect(rule).toMatch(/font-size: 16px;/);
      expect(rule).toMatch(/min-height: 40px;/);
      expect(rule).toMatch(/color: var\(--[a-z-]+\);/);
      expect(rule).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i);
    });

    it('shows no Team Hub to a member who bought nothing, even when the API says Team tier', async () => {
      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: UTAH, teamHub: true, skills: [skill({})] }));
      const { unmount } = render(<SkillLibrary />);
      await screen.findByText('Included with your Utah Life team');
      expect(screen.queryByRole('link', { name: COPY.teamHub })).toBeNull();
      unmount();

      // A member whose team bought a plan has a real team, and keeps it.
      fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agents', status: 'active' }], accessGroups: UTAH, teamHub: true, skills: [skill({})] }));
      render(<SkillLibrary />);
      expect(await screen.findByRole('link', { name: COPY.teamHub })).toHaveAttribute('href', '/team');
      expect(groupOnly({ groups: UTAH, paidPlans: false })).toBe(true);
      expect(groupOnly({ groups: UTAH, paidPlans: true })).toBe(false);
      expect(groupOnly({ groups: [], paidPlans: false })).toBe(false);
    });

    it('says a locked skill is not included with Utah Life access, with no upsell (D-150)', async () => {
      fetchMock.mockResolvedValue(
        answer(200, {
          plans: [],
          accessGroups: UTAH,
          skills: [
            skill({ id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', state: 'locked' }),
            // Neither should ever be locked for a member (the API test holds that); if one were, the same.
            skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'locked' }),
            skill({ id: 'perfect-week', title: 'Perfect Week', sets: 'both', state: 'locked' }),
          ],
        }),
      );
      render(<SkillLibrary />);
      const owner = await screen.findByRole('region', { name: COPY.sets.owner_ops });
      expect(within(owner).getByText('Not included with Utah Life access')).toBeInTheDocument();
      expect(COPY.notIncluded('Utah Life')).toBe('Not included with Utah Life access');
      expect(screen.getAllByText('Not included with Utah Life access')).toHaveLength(3);
      // Never "Not in your plan." and never See Plans, on any row.
      expect(screen.queryByText(COPY.locked)).toBeNull();
      expect(screen.queryByRole('link', { name: COPY.seePlans })).toBeNull();
      expect(document.body.textContent).not.toMatch(/Agent Plan/);
      expect(offersPlans(true)).toBe(false);
    });

    it('keeps "Not in your plan." and See Plans for everyone else', async () => {
      fetchMock.mockResolvedValue(answer(200, { skills: [skill({ state: 'locked' }), skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'locked' })] }));
      render(<SkillLibrary />);
      await screen.findByRole('region', { name: COPY.sets.owner_ops });
      expect(screen.getAllByText(COPY.locked)).toHaveLength(2);
      expect(screen.getAllByRole('link', { name: COPY.seePlans })).toHaveLength(2);
      expect(screen.queryByText(/Not included with/)).toBeNull();
      expect(offersPlans(false)).toBe(true);
    });
  });

  describe('the first-run welcome for an access group’s member (D-150)', () => {
    const TRAINING = [
      skill({ id: 'appointment-follow-up', title: 'Appointment Follow-Up', sets: 'agent' }),
      skill({ id: 'repair-request-response', title: 'Repair Request Response', sets: 'agent' }),
      skill({ id: 'perfect-week', title: 'Perfect Week', sets: 'both' }),
      skill({ id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', state: 'locked' }),
    ];
    const member = (over: Record<string, unknown> = {}) =>
      answer(200, { plans: [], accessGroups: [{ id: 'utah-life', name: 'Utah Life', skills: 25, welcome: true, ...over }], skills: TRAINING });

    it('greets the group, counts its skills from the API, and links the two to start with to their Setup Guides', async () => {
      fetchMock.mockResolvedValue(member());
      render(<SkillLibrary />);
      const panel = await screen.findByRole('region', { name: 'Welcome, Utah Life' });
      expect(panel.textContent).toBe(
        'Welcome, Utah Life' +
          'Your team access includes 25 agent skills. ' +
          'Start with Appointment Follow-Up and Repair Request Response. ' +
          'Each Setup Guide opens a step-by-step walkthrough in a new tab; come back here to download the files.',
      );
      const first = within(panel).getByRole('link', { name: `Appointment Follow-Up ${COPY.newTab}` });
      expect(first).toHaveAttribute('href', 'https://www.amplifiedimpact.io/appointment-follow-up');
      expect(first).toHaveAttribute('target', '_blank');
      expect(within(panel).getByRole('link', { name: `Repair Request Response ${COPY.newTab}` })).toHaveAttribute(
        'href',
        'https://www.amplifiedimpact.io/repair-request-response',
      );
      expect(START_WITH['utah-life']).toEqual(['appointment-follow-up', 'repair-request-response']);
      // At the top: before the first set of skills.
      const first_set = screen.getByRole('region', { name: COPY.sets.owner_ops });
      expect(panel.compareDocumentPosition(first_set) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('takes the count from the group’s grant, whatever it is: never a number typed into the page', async () => {
      fetchMock.mockResolvedValue(member({ skills: 31 }));
      const { unmount } = render(<SkillLibrary />);
      expect(await screen.findByText(/Your team access includes 31 agent skills\./)).toBeInTheDocument();
      unmount();
      fetchMock.mockResolvedValue(member({ skills: 1 }));
      render(<SkillLibrary />);
      expect(await screen.findByText(/Your team access includes 1 agent skill\./)).toBeInTheDocument();
      expect(COPY.welcome.count(25)).toBe('Your team access includes 25 agent skills.');
    });

    it('is only for a member: nobody else sees it', async () => {
      fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agents', status: 'active' }], skills: TRAINING }));
      render(<SkillLibrary />);
      await screen.findByRole('region', { name: COPY.sets.agent });
      expect(screen.queryByRole('region', { name: /^Welcome/ })).toBeNull();
      expect(screen.queryByText(/Your team access includes/)).toBeNull();
    });

    it('dismisses for good: hidden at once, kept by the server for this learner, and not shown again', async () => {
      fetchMock.mockImplementation(async (url: string) => (url === '/api/skills' ? member() : answer(200, { ok: true })));
      const { unmount } = render(<SkillLibrary />);
      const panel = await screen.findByRole('region', { name: 'Welcome, Utah Life' });
      await userEvent.click(within(panel).getByRole('button', { name: COPY.welcome.dismiss }));
      expect(screen.queryByRole('region', { name: 'Welcome, Utah Life' })).toBeNull();
      const call = fetchMock.mock.calls.find(([url]) => url === '/api/skills/welcome/dismiss');
      expect(call?.[1]).toMatchObject({ method: 'POST', credentials: 'include' });
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ group: 'utah-life' });
      unmount();

      // The next visit: the API says it was put away, so it stays away.
      fetchMock.mockImplementation(async () => member({ welcome: false }));
      render(<SkillLibrary />);
      await screen.findByText('Included with your Utah Life team');
      expect(screen.queryByRole('region', { name: 'Welcome, Utah Life' })).toBeNull();
    });

    it('names no skill to start with that the member can’t open', async () => {
      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: [{ id: 'utah-life', name: 'Utah Life', skills: 2, welcome: true }], skills: [TRAINING[2]] }));
      render(<SkillLibrary />);
      const panel = await screen.findByRole('region', { name: 'Welcome, Utah Life' });
      expect(panel.textContent).not.toMatch(/Start with/);
      expect(within(panel).queryAllByRole('link')).toHaveLength(0);
    });
  });

  it('says so when the list fails to load', async () => {
    fetchMock.mockResolvedValue(answer(500, {}));
    render(<SkillLibrary />);
    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.failed);
  });

  it('links a Team tier learner to the Team Hub, where an owner invites their team, and no one else (D-119)', async () => {
    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agents', status: 'active' }], teamHub: true, skills: [skill({})] }));
    const { unmount } = render(<SkillLibrary />);
    expect(await screen.findByRole('link', { name: COPY.teamHub })).toHaveAttribute('href', '/team');
    unmount();

    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agent_plan', status: 'trialing' }], teamHub: false, skills: [skill({})] }));
    render(<SkillLibrary />);
    expect(await screen.findByRole('link', { name: COPY.billing })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: COPY.teamHub })).toBeNull();
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
