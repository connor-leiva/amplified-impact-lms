import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ACCELERATOR_HREF } from './content';
import { buyerSkills } from './buyer.vm';
import { OUTLINE, catalogAnswer } from './buyer.test-data';
import { Accelerator, Home, Library, LockedSkill, Office, Training } from './pages';
import type { Links } from './pages';

// D-241: the $37 buyer's pages, drawn from the real catalog.

const LINKS: Links = {
  'insiders-monthly': 'https://buy.stripe.com/leader',
  'insiders-agent-monthly': 'https://buy.stripe.com/agent',
  'agent-monthly': 'https://buy.stripe.com/agent-plan',
};
const owner = buyerSkills(catalogAnswer(['team-pnl-review']));
const agent = buyerSkills(catalogAnswer(['appointment-follow-up']));
const link = (name: string | RegExp) => screen.getByRole('link', { name });

describe('Home', () => {
  it('puts the skill they bought first, with its Setup Guide and both downloads alike', () => {
    render(<Home skills={owner} weeks={OUTLINE} first="Alex" hour={14} links={LINKS} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Good afternoon, Alex');
    const hero = screen.getByRole('region', { name: 'Your skill' });
    expect(within(hero).getByRole('heading', { level: 2 }).textContent).toBe('Team P&L Review');
    expect(within(hero).getByRole('link', { name: 'Open the Setup Guide' }).getAttribute('href')).toBe('/learn/skills/team-pnl-review');
    const claude = within(hero).getByRole('link', { name: 'Download for Claude' });
    const chatgpt = within(hero).getByRole('link', { name: 'Download for ChatGPT' });
    expect(claude.className).toBe(chatgpt.className);
    expect(claude.getAttribute('href')).toBe('/api/skills/team-pnl-review/download/claude');
    expect(chatgpt.getAttribute('href')).toBe('/api/skills/team-pnl-review/download/chatgpt');
  });

  it('shows the rest of the LMS locked, each with the plan that opens it, and one upgrade with its Payment Link', () => {
    render(<Home skills={owner} weeks={OUTLINE} first="Alex" hour={9} links={LINKS} />);
    const rows = screen.getByRole('heading', { name: 'Also in the Academy' }).closest('section')!;
    expect(within(rows).getAllByRole('link').map((a) => [a.querySelector('.wk-step-t')!.firstChild!.textContent, a.getAttribute('href')])).toEqual([
      ['Every Other Skill', '/learn/skills'],
      ['Office Hours', '/learn/office-hours'],
      ['Weekly Live Training', '/learn/training'],
      ['Week 0: Week Zero Setup', '/learn/week/0'],
      ['AI Hires, Weeks 1 to 8', '/learn/week/1'],
    ]);
    expect(within(rows).getByText('48 more skills, each with its Setup Guide to preview.')).toBeTruthy();
    const up = link('Upgrade to Amplified Insiders');
    expect(up.getAttribute('href')).toBe(LINKS['insiders-monthly']);
    expect(screen.getByText('Team P&L Review stays yours')).toBeTruthy();
    expect(screen.getByText('3-Month Minimum.')).toBeTruthy();
  });

  it('offers an agent skill’s buyer Agent Insiders, and says what it would open', () => {
    render(<Home skills={agent} weeks={OUTLINE} first="Alex" hour={20} links={LINKS} />);
    expect(link('Upgrade to Agent Insiders').getAttribute('href')).toBe(LINKS['insiders-agent-monthly']);
    expect(screen.getByText('48 more skills to preview. Agent Insiders opens 33 of them.')).toBeTruthy();
    expect(screen.getByText('3-Month Minimum. No weekly live training.')).toBeTruthy();
  });

  it('draws an upgrade as disabled while its Payment Link isn’t set, with no link in the page', () => {
    render(<Home skills={owner} weeks={OUTLINE} first="Alex" hour={14} links={{}} />);
    const up = screen.getByText('Upgrade to Amplified Insiders', { selector: '.aim-roll > span:first-child' }).closest('a')!;
    expect(up.getAttribute('href')).toBeNull();
    expect(up.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('the Skill Library', () => {
  it('leads with their skill, then the upgrade band, then every skill five at a time', () => {
    render(<Library skills={owner} links={LINKS} />);
    const own = screen.getByRole('heading', { name: 'Your Skill' }).closest('section')!;
    expect(within(own).getByRole('heading', { level: 3 }).textContent).toBe('Team P&L Review');
    expect(within(own).getByText('The problem')).toBeTruthy();
    expect(link('Upgrade to Amplified Insiders, $169/Month').getAttribute('href')).toBe(LINKS['insiders-monthly']);
    const ownerSet = screen.getByRole('list', { name: /Owner and Operations Skills/ });
    expect(ownerSet.querySelectorAll('li:not([data-more])')).toHaveLength(5);
    fireEvent.click(screen.getAllByRole('button', { name: 'Show All 16' })[0]!);
    expect(ownerSet.getAttribute('data-all')).toBe('true');
    expect(within(ownerSet).getAllByRole('link')[0]!.getAttribute('href')).toBe('/learn/skills/team-pnl-review');
  });

  it('says "Your Skills" for a buyer of two', () => {
    render(<Library skills={buyerSkills(catalogAnswer(['team-pnl-review', 'fub-pipeline-review']))} links={LINKS} />);
    expect(screen.getByRole('heading', { name: 'Your Skills' })).toBeTruthy();
  });
});

describe('a locked skill', () => {
  const s = owner.find((x) => x.id === 'database-health-check')!;
  const preview = { lanes: [{ id: 'claude' as const, label: 'Claude', steps: ['Check Code Execution Is On', 'Download the Skill'] }, { id: 'chatgpt' as const, label: 'ChatGPT', steps: ['Turn Off Training First'] }] };

  it('offers its Insiders plan first and this one skill for $37 beside it', () => {
    const onBuy = vi.fn();
    render(<LockedSkill s={s} preview={preview} links={LINKS} checkout={{ kind: 'idle' }} onBuy={onBuy} />);
    expect(link('Upgrade to Amplified Insiders, $169/Month').getAttribute('href')).toBe(LINKS['insiders-monthly']);
    fireEvent.click(screen.getByRole('button', { name: 'Get This Skill, $37' }));
    expect(onBuy).toHaveBeenCalledOnce();
  });

  it('shows its real setup steps, with Claude and ChatGPT as tabs that look the same', () => {
    render(<LockedSkill s={s} preview={preview} links={LINKS} checkout={{ kind: 'idle' }} onBuy={() => {}} />);
    const [claude, chatgpt] = screen.getAllByRole('radio');
    expect(claude!.className).toBe(chatgpt!.className);
    expect(screen.getByRole('list', { name: 'Claude steps' }).textContent).toContain('Check Code Execution Is On');
    fireEvent.keyDown(claude!, { key: 'ArrowRight' });
    expect(chatgpt!.getAttribute('aria-checked')).toBe('true');
    expect((screen.getByRole('list', { name: 'ChatGPT steps', hidden: true }) as HTMLElement).hidden).toBe(false);
  });

  it('says when checkout didn’t start, and holds the button while it does', () => {
    const { rerender } = render(<LockedSkill s={s} preview={null} links={LINKS} checkout={{ kind: 'busy' }} onBuy={() => {}} />);
    expect((screen.getByRole('button', { name: 'Starting Checkout' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<LockedSkill s={s} preview={null} links={LINKS} checkout={{ kind: 'failed' }} onBuy={() => {}} />);
    expect(screen.getByRole('alert').textContent).toBe('Checkout didn’t start. Try again.');
  });

  it('offers an agent skill’s plan by the skill’s set', () => {
    render(<LockedSkill s={owner.find((x) => x.id === 'speed-to-lead-reply')!} preview={null} links={LINKS} checkout={{ kind: 'idle' }} onBuy={() => {}} />);
    expect(link('Upgrade to Agent Insiders, $79/Month').getAttribute('href')).toBe(LINKS['insiders-agent-monthly']);
  });
});

describe('the locked areas', () => {
  it('Weekly Live Training upgrades to the Agent Plan, $117/Month, and shows the rotation', () => {
    render(<Training skills={agent} links={LINKS} />);
    expect(link('Upgrade to the Agent Plan, $117/Month').getAttribute('href')).toBe(LINKS['agent-monthly']);
    expect(screen.getAllByText('Speed to Lead Reply').length).toBeGreaterThan(0);
    expect(screen.getByText('Leads and Follow-Up')).toBeTruthy();
    expect(screen.getByText('Weekly, starting the week of January 4')).toBeTruthy();
  });

  it('Office Hours is in the buyer’s Insiders plan, Thursdays at 12:00 PM MT', () => {
    render(<Office owned={owner.filter((x) => x.owned)} links={LINKS} />);
    expect(link('Upgrade to Amplified Insiders, $169/Month').getAttribute('href')).toBe(LINKS['insiders-monthly']);
    expect(screen.getByText('12:00 PM MT, 60 minutes')).toBeTruthy();
  });

  it('the AI Accelerator shows the course\u2019s weeks locked, as its outline, and links to its own page', () => {
    render(<Accelerator weeks={OUTLINE} />);
    expect(screen.getAllByRole('listitem').filter((li) => li.id.startsWith('wk-row-'))).toHaveLength(9);
    expect(screen.getByRole('heading', { level: 2, name: 'Sample question 0?' })).toBeTruthy();
    expect(screen.getByText('Sample outcome 8.')).toBeTruthy();
    expect(link('See the AI Accelerator').getAttribute('href')).toBe(ACCELERATOR_HREF);
    expect(screen.getByText('Every hire reads and drafts. Nothing is sent without you.')).toBeTruthy();
  });
});
