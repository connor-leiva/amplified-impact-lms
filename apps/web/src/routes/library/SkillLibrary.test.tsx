import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { GROK_TEMPLATES } from '@ai/core/grok-templates';
import { SKILL_CATALOG } from '@ai/core/skills';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import SkillLibrary, {
  COPY,
  SECTION_PREF_KEY,
  START_WITH,
  fileActionClass,
  groupForSkill,
  groupOnly,
  leadOf,
  lockedCountLine,
  offersPlans,
  readSectionOpen,
  sectionDisclosure,
  sectionOrder,
} from './SkillLibrary';
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

/** The screen's stylesheet, for the rules Design checks by value. */
const CSS = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SkillLibrary.module.css'), 'utf8');

/** The Setup Guide link's name (D-151: the guide in learn, in this tab). */
const GUIDE = COPY.guide;

let fetchMock: Mock;
const answer = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

beforeEach(() => {
  delete document.body.dataset.appReady;
  localStorage.clear();
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
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    const owner = await screen.findByRole('region', { name: COPY.sets.owner_ops });
    const claude = within(owner).getByRole('link', { name: COPY.files.claude });
    const chatgpt = within(owner).getByRole('link', { name: COPY.files.chatgpt });
    expect(claude).toHaveAttribute('href', '/api/skills/team-pnl-review/download/claude');
    expect(chatgpt).toHaveAttribute('href', '/api/skills/team-pnl-review/download/chatgpt');
    // Claude and ChatGPT are the same action (D-201): one class, the kit's primary, not first-file-wins.
    expect(claude.className).toBe(chatgpt.className);
    expect(claude.className).toMatch(/primary/);
    expect(fileActionClass('claude')).toBe(fileActionClass('chatgpt'));
    expect(fileActionClass('grok')).toBe('primary');
    const practice = within(owner).getByRole('link', { name: COPY.files.practice });
    expect(practice).toBeInTheDocument();
    expect(practice.className).toMatch(/secondary/);
    expect(practice.className).not.toMatch(/primary/);

    // Beside the downloads, the skill's guided setup, here in learn, in this tab (D-151).
    const guide = within(owner).getByRole('link', { name: GUIDE });
    expect(guide).toHaveAttribute('href', '/skill-library/team-pnl-review');
    expect(guide).not.toHaveAttribute('target');
    expect(guide.textContent).toBe('Setup Guide');

    const agent = screen.getByRole('region', { name: COPY.sets.agent });
    expect(within(agent).queryByRole('link', { name: COPY.files.claude })).toBeNull();
    expect(within(agent).queryByRole('link', { name: GUIDE })).toBeNull();
    expect(within(agent).getByText(COPY.locked)).toBeInTheDocument();
    // A locked skill's guide shows its steps' titles and what it takes to open it (D-151).
    expect(within(agent).getByRole('link', { name: COPY.preview })).toHaveAttribute('href', '/skill-library/offer-strategy');
    expect(within(agent).getByRole('button', { name: 'Get This Skill, $37' })).toBeInTheDocument();
    expect(within(agent).queryByRole('link', { name: COPY.seePlans })).toBeNull();

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
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    const agent = await screen.findByRole('region', { name: COPY.sets.agent });
    expect(within(agent).getByText('Coming December 14.')).toBeInTheDocument();
    expect(within(agent).queryByText(COPY.locked)).toBeNull();
    expect(within(agent).queryByRole('link', { name: COPY.seePlans })).toBeNull();
  });

  it('says why a paused two-pay AI Accelerator\'s skills are locked, and only then (D-143)', async () => {
    fetchMock.mockResolvedValue(answer(200, { paused: true, skills: [skill({ state: 'locked' })] }));
    const { unmount } = render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByText(COPY.paused)).toBeInTheDocument();
    unmount();
    fetchMock.mockResolvedValue(answer(200, { skills: [skill({ state: 'locked' })] }));
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    await screen.findByRole('region', { name: COPY.sets.owner_ops });
    expect(screen.queryByText(COPY.paused)).toBeNull();
  });

  it('sends a signed-out visitor to sign in', async () => {
    fetchMock.mockResolvedValue(answer(401, { error: 'Sign in' }));
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByText(COPY.unavailable)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.signIn })).toHaveAttribute('href', '/sign-in');
  });

  it('offers a Grok Bot template’s one file as a Grok Bot download (D-100)', async () => {
    fetchMock.mockResolvedValue(
      answer(200, {
        skills: [skill({ id: 'month-end-close', title: 'Month-End Close Packet', sets: 'both', files: ['grok'] })],
      }),
    );
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    const link = await screen.findByRole('link', { name: COPY.files.grok });
    expect(link).toHaveAttribute('href', '/api/skills/month-end-close/download/grok');
    expect(COPY.files.grok).toBe('Download for Grok Bot');
    expect(link.className).toMatch(/primary/);
    expect(screen.getByRole('link', { name: GUIDE })).toHaveAttribute('href', '/skill-library/month-end-close');
  });

  it('sends a skill whose page has another name to that page (D-101)', async () => {
    fetchMock.mockResolvedValue(
      answer(200, { skills: [skill({ id: 'content-opportunity-research', title: 'Content Strategist', sets: 'both', files: ['claude'] })] }),
    );
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByRole('link', { name: GUIDE })).toHaveAttribute('href', '/skill-library/content-strategist');
  });

  it('leads every skill with the problem it fixes, in its Library card’s words, above its downloads under "Set it up"', async () => {
    fetchMock.mockResolvedValue(
      answer(200, {
        skills: [skill({}), skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'locked', files: ['claude'] })],
      }),
    );
    render(<SkillLibrary />, { wrapper: MemoryRouter });
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
    const { unmount } = render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByText('Included with your Utah Life team')).toBeInTheDocument();
    expect(COPY.included('Utah Life')).toBe('Included with your Utah Life team');
    // Not a customer: nothing to bill.
    expect(screen.queryByRole('link', { name: COPY.billing })).toBeNull();
    unmount();

    // A member who also bought a plan keeps Manage Billing beside the note.
    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'membership', status: 'active' }], accessGroups: [{ id: 'utah-life', name: 'Utah Life' }], skills: [skill({})] }));
    const again = render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByText('Included with your Utah Life team')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: COPY.billing })).toBeInTheDocument();
    again.unmount();

    // Everyone else: Manage Billing as before, and no note.
    fetchMock.mockResolvedValue(answer(200, { skills: [skill({})] }));
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByRole('link', { name: COPY.billing })).toBeInTheDocument();
    expect(screen.queryByText(/Included with your/)).toBeNull();
  });

  describe('for an access group’s member (Design’s follow-up to D-148)', () => {
    const UTAH = [{ id: 'utah-life', name: 'Utah Life' }];

    it('gives the note its own class: 16px, no margin, the buttons’ 48px row (D-156), colour from a token', async () => {
      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: UTAH, skills: [skill({})] }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      const note = await screen.findByText('Included with your Utah Life team');
      expect(note.tagName).toBe('P');
      expect(note.className).toMatch(/included/);
      expect(note.className).not.toMatch(/note/);
      const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'SkillLibrary.module.css'), 'utf8');
      const rule = /\.included \{([^}]*)\}/.exec(css)?.[1] ?? '';
      expect(rule).toMatch(/margin: 0;/);
      expect(rule).toMatch(/font-size: 16px;/);
      // D-156: the kit's buttons are 48px tall, so the note's row is too (it was 40px with the old buttons).
      expect(rule).toMatch(/min-height: 48px;/);
      expect(rule).toMatch(/color: var\(--[a-z-]+\);/);
      expect(rule).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i);
    });

    it('shows no Team Hub to a member who bought nothing, even when the API says Team tier', async () => {
      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: UTAH, teamHub: true, skills: [skill({})] }));
      const { unmount } = render(<SkillLibrary />, { wrapper: MemoryRouter });
      await screen.findByText('Included with your Utah Life team');
      expect(screen.queryByRole('link', { name: COPY.teamHub })).toBeNull();
      unmount();

      // A member whose team bought a plan has a real team, and keeps it.
      fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agents', status: 'active' }], accessGroups: UTAH, teamHub: true, skills: [skill({})] }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
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
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      const owner = await screen.findByRole('region', { name: COPY.sets.owner_ops });
      expect(within(owner).getByText('Not included with Utah Life access')).toBeInTheDocument();
      expect(COPY.notIncluded('Utah Life')).toBe('Not included with Utah Life access');
      expect(screen.getAllByText('Not included with Utah Life access')).toHaveLength(3);
      // Never "Not in your plan." and never See Plans, on any row.
      expect(screen.queryByText(COPY.locked)).toBeNull();
      expect(screen.queryByRole('link', { name: COPY.seePlans })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Get This Skill, $37' })).toBeNull();
      expect(screen.queryByText('$37')).toBeNull();
      expect(document.body.textContent).not.toMatch(/Agent Plan/);
      expect(offersPlans(true)).toBe(false);
    });

    it('sets the member’s locked label at the 16 / 24 "lead" step in its own class, with no colour of its own (Design, PR #100)', async () => {
      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: UTAH, skills: [skill({ state: 'locked' })] }));
      const { unmount } = render(<SkillLibrary />, { wrapper: MemoryRouter });
      const label = (await screen.findByText('Not included with Utah Life access')).closest('span')!;
      expect(label.className).toMatch(/note/);
      expect(label.className).toMatch(/notIncluded/);
      unmount();
      const rule = /\.notIncluded \{([^}]*)\}/.exec(CSS)?.[1] ?? '';
      expect(rule).toMatch(/font-size: 16px;/);
      expect(rule).toMatch(/line-height: 24px;/);
      expect(rule).not.toMatch(/color|#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i);
      // Everyone else's note is unchanged.
      fetchMock.mockResolvedValue(answer(200, { skills: [skill({ state: 'locked' })] }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      expect((await screen.findByText(COPY.locked)).closest('span')!.className).not.toMatch(/notIncluded/);
    });

    it('names the group that applies to each locked skill when a learner is in more than one (Design, PR #100)', async () => {
      // Two active groups, in the API's fixed order. Only the second covers owner and ops skills.
      const TWO = [
        { id: 'acme', name: 'Acme Brokerage', covers: ['agent', 'both'] },
        { id: 'utah-life', name: 'Utah Life', covers: ['owner_ops', 'both'] },
      ];
      expect(groupForSkill({ sets: 'owner_ops' }, TWO as never)?.name).toBe('Utah Life');
      expect(groupForSkill({ sets: 'agent' }, TWO as never)?.name).toBe('Acme Brokerage');
      expect(groupForSkill({ sets: 'both' }, TWO as never)?.name).toBe('Acme Brokerage');
      // No group covers it: the first active one, never one picked at random.
      expect(groupForSkill({ sets: 'owner_ops' }, [TWO[0]!, { id: 'x', name: 'Xavier' }] as never)?.name).toBe('Acme Brokerage');
      // Groups from an older API with no `covers`: the first.
      expect(groupForSkill({ sets: 'agent' }, [{ id: 'utah-life', name: 'Utah Life' }])?.name).toBe('Utah Life');
      expect(groupForSkill({ sets: 'agent' }, [])).toBeNull();

      fetchMock.mockResolvedValue(
        answer(200, {
          plans: [],
          accessGroups: TWO,
          skills: [
            skill({ id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', state: 'locked' }),
            skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'locked' }),
          ],
        }),
      );
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      const owner = await screen.findByRole('region', { name: COPY.sets.owner_ops });
      // Both sets are locked for this member, so each is closed until they open it (D-201).
      await userEvent.click(within(owner).getByRole('button', { name: /Owner and Operations Skills/ }));
      expect(within(owner).getByText('Not included with Utah Life access')).toBeInTheDocument();
      const agentRegion = screen.getByRole('region', { name: COPY.sets.agent });
      await userEvent.click(within(agentRegion).getByRole('button', { name: /Agent Skills/ }));
      expect(within(agentRegion).getByText('Not included with Acme Brokerage access')).toBeInTheDocument();
    });

    it('keeps "Not in your plan." and See Plans for everyone else', async () => {
      fetchMock.mockResolvedValue(answer(200, { skills: [skill({ state: 'locked' }), skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'locked' })] }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      await screen.findByRole('region', { name: COPY.sets.owner_ops });
      expect(screen.getAllByText(COPY.locked)).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Get This Skill, $37' })).toHaveLength(2);
      expect(screen.queryByRole('link', { name: COPY.seePlans })).toBeNull();
      expect(screen.queryByText(/Not included with/)).toBeNull();
      expect(offersPlans(false)).toBe(true);
    });
  });

  describe('the first-run welcome for an access group’s member (D-150)', () => {
    it('gives the dismiss a 44px tap target, its X still in the corner, and the subtitle the 16 / 24 "lead" step (Design, PR #100)', () => {
      const dismiss = /\.dismiss \{([^}]*)\}/.exec(CSS)?.[1] ?? '';
      expect(dismiss).toMatch(/width: 44px;/);
      expect(dismiss).toMatch(/height: 44px;/);
      expect(dismiss).toMatch(/margin: -10px -10px 0 0;/);
      expect(CSS).toMatch(/its dismiss a 44px button/);
      const sub = /\n\.sub \{([^}]*)\}/.exec(CSS)?.[1] ?? '';
      expect(sub).toMatch(/font-size: 16px;/);
      expect(sub).toMatch(/line-height: 24px;/);
      expect(sub).toMatch(/color: var\(--text-secondary\);/);
    });

    const TRAINING = [
      skill({ id: 'appointment-follow-up', title: 'Appointment Follow-Up', sets: 'agent' }),
      skill({ id: 'repair-request-response', title: 'Repair Request Response', sets: 'agent' }),
      skill({ id: 'perfect-week', title: 'Perfect Week', sets: 'both' }),
      skill({ id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', state: 'locked' }),
    ];
    const member = (over: Record<string, unknown> = {}) =>
      answer(200, {
        plans: [],
        accessGroups: [{ id: 'utah-life', name: 'Utah Life', skills: 25, welcome: true, covers: ['agent', 'both'], ...over }],
        skills: TRAINING,
      });

    it('greets the group, counts its skills from the API, and links the two to start with to their Setup Guides', async () => {
      fetchMock.mockResolvedValue(member());
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      const panel = await screen.findByRole('region', { name: 'Welcome, Utah Life' });
      expect(panel.textContent).toBe(
        'Welcome, Utah Life' +
          'Your team access includes 25 agent skills. ' +
          'Start with Appointment Follow-Up and Repair Request Response. ' +
          'Each Setup Guide walks you through it step by step, with the downloads right in it.',
      );
      // D-151: each one's guided setup, here in learn, in this tab.
      const first = within(panel).getByRole('link', { name: 'Appointment Follow-Up' });
      expect(first).toHaveAttribute('href', '/skill-library/appointment-follow-up');
      expect(first).not.toHaveAttribute('target');
      expect(within(panel).getByRole('link', { name: 'Repair Request Response' })).toHaveAttribute('href', '/skill-library/repair-request-response');
      expect(START_WITH['utah-life']).toEqual(['appointment-follow-up', 'repair-request-response']);
      // At the top, before the skills their access holds. Owner skills sit below those (D-201).
      const agent = screen.getByRole('region', { name: COPY.sets.agent });
      const owner = screen.getByRole('region', { name: COPY.sets.owner_ops });
      expect(panel.compareDocumentPosition(agent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(agent.compareDocumentPosition(owner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('takes the count from the group’s grant, whatever it is: never a number typed into the page', async () => {
      fetchMock.mockResolvedValue(member({ skills: 31 }));
      const { unmount } = render(<SkillLibrary />, { wrapper: MemoryRouter });
      expect(await screen.findByText(/Your team access includes 31 agent skills\./)).toBeInTheDocument();
      unmount();
      fetchMock.mockResolvedValue(member({ skills: 1 }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      expect(await screen.findByText(/Your team access includes 1 agent skill\./)).toBeInTheDocument();
      expect(COPY.welcome.count(25)).toBe('Your team access includes 25 agent skills.');
    });

    it('is only for a member: nobody else sees it', async () => {
      fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agents', status: 'active' }], skills: TRAINING }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      await screen.findByRole('region', { name: COPY.sets.agent });
      expect(screen.queryByRole('region', { name: /^Welcome/ })).toBeNull();
      expect(screen.queryByText(/Your team access includes/)).toBeNull();
    });

    it('dismisses for good: hidden at once, kept by the server for this learner, and not shown again', async () => {
      fetchMock.mockImplementation(async (url: string) => (url === '/api/skills' ? member() : answer(200, { ok: true })));
      const { unmount } = render(<SkillLibrary />, { wrapper: MemoryRouter });
      const panel = await screen.findByRole('region', { name: 'Welcome, Utah Life' });
      await userEvent.click(within(panel).getByRole('button', { name: COPY.welcome.dismiss }));
      expect(screen.queryByRole('region', { name: 'Welcome, Utah Life' })).toBeNull();
      const call = fetchMock.mock.calls.find(([url]) => url === '/api/skills/welcome/dismiss');
      expect(call?.[1]).toMatchObject({ method: 'POST', credentials: 'include' });
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ group: 'utah-life' });
      unmount();

      // The next visit: the API says it was put away, so it stays away.
      fetchMock.mockImplementation(async () => member({ welcome: false }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      await screen.findByText('Included with your Utah Life team');
      expect(screen.queryByRole('region', { name: 'Welcome, Utah Life' })).toBeNull();
    });

    it('names no skill to start with that the member can’t open', async () => {
      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: [{ id: 'utah-life', name: 'Utah Life', skills: 2, welcome: true }], skills: [TRAINING[2]] }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      const panel = await screen.findByRole('region', { name: 'Welcome, Utah Life' });
      expect(panel.textContent).not.toMatch(/Start with/);
      expect(within(panel).queryAllByRole('link')).toHaveLength(0);
    });
  });

  it('says so when the list fails to load', async () => {
    fetchMock.mockResolvedValue(answer(500, {}));
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByRole('alert')).toHaveTextContent(COPY.failed);
  });

  it('links a Team tier learner to the Team Hub, where an owner invites their team, and no one else (D-119)', async () => {
    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agents', status: 'active' }], teamHub: true, skills: [skill({})] }));
    const { unmount } = render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByRole('link', { name: COPY.teamHub })).toHaveAttribute('href', '/team');
    unmount();

    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agent_plan', status: 'trialing' }], teamHub: false, skills: [skill({})] }));
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByRole('link', { name: COPY.billing })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: COPY.teamHub })).toBeNull();
  });

  it('links an AI Accelerator plan to its course, and no other plan (D-110)', async () => {
    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'cohort', status: 'active' }], skills: [skill({})] }));
    const { unmount } = render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByRole('link', { name: COPY.course })).toHaveAttribute('href', '/course');
    unmount();

    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'membership', status: 'active' }], skills: [skill({})] }));
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    expect(await screen.findByRole('link', { name: COPY.billing })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: COPY.course })).toBeNull();
  });

  describe('included skills first, and the locked section closed (D-201)', () => {
    const UTAH = [{ id: 'utah-life', name: 'Utah Life', covers: ['agent', 'both'] as ('agent' | 'both')[], welcome: false }];
    const rows = [
      skill({ id: 'team-pnl-review', title: 'Team P&L Review', sets: 'owner_ops', state: 'locked' }),
      skill({ id: 'inbox-meeting-follow-through', title: 'Inbox and Meeting Follow-Through', sets: 'owner_ops', state: 'open', free: true, files: ['claude'] }),
      skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'open', files: ['claude', 'chatgpt'] }),
      skill({ id: 'perfect-week', title: 'Perfect Week', sets: 'both', state: 'open', free: true, files: ['claude'] }),
    ];

    it('puts Agent Skills and Skills for Everyone above Owner and Operations, and closes that section', async () => {
      expect(lockedCountLine(12, 'Not included with Utah Life access')).toBe('12 Skills, Not Included With Utah Life Access');
      expect(lockedCountLine(1, 'Not included with Utah Life access')).toBe('1 Skill, Not Included With Utah Life Access');
      expect(lockedCountLine(2, COPY.locked)).toBe('2 Skills, Not In Your Plan');
      expect(sectionOrder(rows, { groups: UTAH, plans: [] })).toEqual(['agent', 'both', 'owner_ops']);
      expect(sectionDisclosure('owner_ops', rows, { groups: UTAH, plans: [] })).toBe(true);
      expect(sectionDisclosure('agent', rows, { groups: UTAH, plans: [] })).toBe(false);

      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: UTAH, skills: rows }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
      expect(headings[0]).toBe('Agent Skills');
      expect(headings[1]).toBe('Skills for Everyone');
      // The free owner skill does not count, and does not keep the section open.
      expect(headings[2]).toBe('Owner and Operations Skills 1 Skill, Not Included With Utah Life Access');

      const owner = screen.getByRole('region', { name: COPY.sets.owner_ops });
      const toggle = within(owner).getByRole('button', { name: /Owner and Operations Skills/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveAttribute('aria-controls', 'set-panel-owner_ops');
      // Closed: the rows are in the DOM with the hidden attribute (the stylesheet sets display: none).
      expect(owner.querySelector('ul')).toHaveAttribute('hidden');
      expect(within(owner).queryByRole('link', { name: COPY.seePlans })).toBeNull();
      expect(owner.textContent).not.toMatch(/See Plans|Upgrade|Agent Plan|—/);

      toggle.focus();
      await userEvent.keyboard('{Enter}');
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(owner.querySelector('ul')).not.toHaveAttribute('hidden');
      expect(within(owner).getByText('Not included with Utah Life access')).toBeInTheDocument();
      expect(within(owner).getByRole('link', { name: COPY.files.claude })).toHaveAttribute('href', '/api/skills/inbox-meeting-follow-through/download/claude');
      expect(within(owner).queryByRole('link', { name: COPY.seePlans })).toBeNull();

      await userEvent.keyboard(' ');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(readSectionOpen('owner_ops')).toBe(false);
      expect(JSON.parse(localStorage.getItem(SECTION_PREF_KEY)!)).toEqual({ owner_ops: false });
    });

    it('remembers the section open for the next visit, in this browser', async () => {
      localStorage.setItem(SECTION_PREF_KEY, JSON.stringify({ owner_ops: true, agent: false }));
      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: UTAH, skills: rows }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      const toggle = await screen.findByRole('button', { name: /Owner and Operations Skills/ });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Not included with Utah Life access')).toBeInTheDocument();
    });

    it('follows a builder edit of the locked line, on the rows and in the count', async () => {
      fetchMock.mockResolvedValue(
        answer(200, {
          plans: [],
          accessGroups: UTAH,
          lockedLines: { 'utah-life': 'Not part of your Utah Life access' },
          skills: [rows[0]!, rows[2]!],
        }),
      );
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      const toggle = await screen.findByRole('button', { name: /Owner and Operations Skills/ });
      expect(toggle).toHaveTextContent('1 Skill, Not Part Of Your Utah Life Access');
      await userEvent.click(toggle);
      expect(screen.getByText('Not part of your Utah Life access')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: COPY.seePlans })).toBeNull();
    });

    it('does the same for an Agent Plan member, and keeps See Plans on the locked rows', async () => {
      const agentRows = [
        skill({ id: 'team-pnl-review', sets: 'owner_ops', state: 'locked' }),
        skill({ id: 'l10-meeting-prep', title: 'L10 Meeting Prep', sets: 'owner_ops', state: 'locked' }),
        skill({
          id: 'offer-strategy',
          title: 'Offer Strategy',
          sets: 'agent',
          state: 'upcoming',
          opensAt: Date.parse('2027-01-04T00:00:00-06:00'),
          releasedAt: Date.parse('2026-11-01T00:00:00-05:00'),
        }),
      ];
      expect(sectionOrder(agentRows, { groups: [], plans: [{ kind: 'agent_plan' }] })).toEqual(['agent', 'owner_ops']);
      fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agent_plan', status: 'trialing' }], skills: agentRows }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      const headings = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent?.replace(/\s+/g, ' ').trim());
      expect(headings[0]).toBe('Agent Skills');
      expect(headings[1]).toContain('2 Skills, Not In Your Plan');
      expect(screen.queryByRole('button', { name: /Agent Skills/ })).toBeNull();
      await userEvent.click(screen.getByRole('button', { name: /Owner and Operations Skills/ }));
      expect(screen.getAllByRole('button', { name: 'Get This Skill, $37' })).toHaveLength(2);
      expect(screen.queryByRole('link', { name: COPY.seePlans })).toBeNull();
      expect(screen.getAllByText(COPY.locked)).toHaveLength(2);
    });

    it('leaves a Team Plan, and a page with no coverage to read, in today’s order and open', async () => {
      const mixed = [skill({ state: 'locked' }), skill({ id: 'offer-strategy', title: 'Offer Strategy', sets: 'agent', state: 'open' })];
      expect(sectionOrder(mixed, { groups: [], plans: [{ kind: 'agents' }] })).toEqual(['owner_ops', 'agent']);
      fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'agents', status: 'active' }], skills: mixed }));
      const { unmount } = render(<SkillLibrary />, { wrapper: MemoryRouter });
      const owner = await screen.findByRole('region', { name: COPY.sets.owner_ops });
      const agent = screen.getByRole('region', { name: COPY.sets.agent });
      expect(owner.compareDocumentPosition(agent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(within(owner).queryByRole('button', { name: /Owner and Operations/ })).toBeNull();
      expect(within(owner).getByRole('button', { name: 'Get This Skill, $37' })).toBeInTheDocument();
      expect(within(owner).getByText(COPY.locked)).toBeInTheDocument();
      unmount();

      // No covers and no plan kind: do not guess, and do not hide the rows.
      fetchMock.mockResolvedValue(answer(200, { plans: [], accessGroups: [{ id: 'utah-life', name: 'Utah Life' }], skills: [skill({ state: 'locked' })] }));
      render(<SkillLibrary />, { wrapper: MemoryRouter });
      expect(await screen.findByText('Not included with Utah Life access')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Owner and Operations Skills/ })).toBeNull();
    });

    it('paints both platform buttons with the kit’s primary colours, in light and in dark', () => {
      const primary = /\n\.primary \{([^}]*)\}/.exec(CSS)?.[1] ?? '';
      expect(primary).toMatch(/background: var\(--look-action\)/);
      expect(primary).toMatch(/color: var\(--look-on-action\)/);
      expect(primary).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i);
      const skillPrimary = /\.skill \.primary \{([^}]*)\}/.exec(CSS)?.[1] ?? '';
      expect(skillPrimary).toMatch(/flex: 1 1 0/);
      expect(skillPrimary).toMatch(/white-space: nowrap/);
      const count = /\.disclosureCount \{([^}]*)\}/.exec(CSS)?.[1] ?? '';
      expect(count).toMatch(/font-size: 16px/);
      expect(count).toMatch(/color: var\(--look-ink-secondary\)/);
      expect(count).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i);
      const button = /\.disclosure \{([^}]*)\}/.exec(CSS)?.[1] ?? '';
      expect(button).toMatch(/min-height: 44px/);
      expect(CSS).toMatch(/\.list\[hidden\] \{[^}]*display: none/);
      const look = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../styles/look.module.css'), 'utf8');
      expect(look).toMatch(/--look-action: var\(--look-near-black\)/);
      expect(look).toMatch(/--look-on-action: var\(--look-bone\)/);
      expect(look).toMatch(/--look-action: var\(--look-mint\)/);
      expect(look).toMatch(/--look-on-action: var\(--look-near-black\)/);
    });
  });
});
