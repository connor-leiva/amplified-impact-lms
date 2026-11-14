import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setViewerZone } from '@ai/core';
import SkillLibrary from './SkillLibrary';
import Course from '../course/Course';
import { COPY as COURSE_COPY } from '../course/Course.vm';
import { PRE_LAUNCH, whenOf } from './PreLaunch';

// D-153: an AI Accelerator buyer signs in at once, and nothing paid opens until the first live build.
// Sign-in lands them on the Skill Library (D-150: the course's modules are not in their snapshot, so
// the portal has nothing to draw), and both it and /course show the pre-launch welcome, from the
// instant the API reports. Never a blank shell, and never "not in your plan" to someone who bought it.

const FIRST_BUILD = Date.parse('2026-12-02T13:00:00-06:00');
const answer = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;
let fetchMock: Mock;

beforeEach(() => {
  delete document.body.dataset.appReady;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  setViewerZone('America/Denver');
});
afterEach(() => {
  vi.unstubAllGlobals();
  setViewerZone(null);
});

const upcomingSkill = { id: 'team-pnl-review', title: 'Team P&L Review', summary: '', sets: 'owner_ops', free: false, releasedAt: 0, state: 'upcoming', opensAt: FIRST_BUILD, files: ['claude'] };

describe('the pre-launch welcome (D-153)', () => {
  it('says when, in the viewer’s zone first and the program’s after it', () => {
    expect(whenOf(FIRST_BUILD)).toBe('Wednesday, Dec 2, at 12:00 PM MT (1:00 PM CT)');
    expect(PRE_LAUNCH.starts(whenOf(FIRST_BUILD))).toBe('Live sessions start Wednesday, Dec 2, at 12:00 PM MT (1:00 PM CT). Your course and your skills open then.');
  });

  it('greets a buyer on the Skill Library, with the date, the support address, and the skills still coming', async () => {
    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'cohort', status: 'active' }], courseOpensAt: FIRST_BUILD, skills: [upcomingSkill] }));
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    const panel = await screen.findByRole('region', { name: PRE_LAUNCH.title });
    expect(within(panel).getByText(PRE_LAUNCH.starts(whenOf(FIRST_BUILD)))).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'support@amplifiedimpact.io' })).toHaveAttribute('href', 'mailto:support@amplifiedimpact.io');
    // Nothing is opened to put it on screen: the skill still says when it comes.
    expect(screen.getByText('Coming December 2.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Download for Claude' })).toBeNull();
  });

  it('is not there for anyone the API gives no date: an open course, another plan, no plan', async () => {
    fetchMock.mockResolvedValue(answer(200, { plans: [{ kind: 'membership', status: 'active' }], courseOpensAt: null, skills: [{ ...upcomingSkill, state: 'open', opensAt: null }] }));
    render(<SkillLibrary />, { wrapper: MemoryRouter });
    await screen.findByRole('link', { name: 'Download for Claude' });
    expect(screen.queryByRole('region', { name: PRE_LAUNCH.title })).toBeNull();
    expect(document.querySelector('[data-pre-launch]')).toBeNull();
  });

  it('greets the same buyer on /course instead of "not in your plan", and leads back to the library', async () => {
    fetchMock.mockResolvedValue(answer(403, { open: false, upcoming: true, opensAt: FIRST_BUILD, error: 'x' }));
    render(
      <MemoryRouter initialEntries={['/course']}>
        <Routes>
          <Route path="/course" element={<Course />} />
        </Routes>
      </MemoryRouter>,
    );
    const panel = await screen.findByRole('region', { name: PRE_LAUNCH.title });
    expect(within(panel).getByText(PRE_LAUNCH.starts(whenOf(FIRST_BUILD)))).toBeInTheDocument();
    expect(screen.queryByText(COURSE_COPY.locked)).toBeNull();
    expect(screen.getByRole('link', { name: COURSE_COPY.library })).toHaveAttribute('href', '/skill-library');
    expect(screen.queryByText('What are we paying for leads, and what can we trust?')).toBeNull();
  });

  it('keeps every line 16px or larger, in tokens only', () => {
    const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'PreLaunch.module.css'), 'utf8');
    for (const size of css.match(/font-size: (\d+)px/g) ?? []) expect(Number(/\d+/.exec(size)![0]), size).toBeGreaterThanOrEqual(16);
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb|hsl|oklch/i);
  });
});
