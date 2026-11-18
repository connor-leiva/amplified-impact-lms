import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { CourseRedirect, LibraryRedirect, coursePathFor, learnerPathFor, libraryPathFor, weekOfModule, withQuery } from './redirects';

// D-182: every learner address of the first portal goes to the learner portal's page that does its job.

describe('where each old address goes', () => {
  it.each([
    ['/', '/learn'],
    ['/sessions', '/learn/schedule'],
    ['/sessions/', '/learn/schedule'],
    ['/team', '/learn/team'],
    ['/vault', '/learn/vault'],
    ['/team-tier', '/learn?plan=team'],
    ['/employees/accelerator-week-0', '/learn/week/0'],
    ['/employees/accelerator-week-8', '/learn/week/8'],
    ['/employees/accelerator-week-9', '/learn'],
    ['/employees/marketing', '/learn/employees/marketing'],
    ['/employees/%E0%A4%A', '/learn'],
    ['/admin', '/learn'],
    ['/nowhere', '/learn'],
  ])('%s → %s', (from, to) => expect(learnerPathFor(from)).toBe(to));

  it('@parity:R-6 @parity:E-22 Team Tier opens the Team Plan window; a non-course AI Employee its own page; one query string either way', () => {
    expect(learnerPathFor('/team-tier')).toBe('/learn?plan=team');
    expect(learnerPathFor('/employees/sales%20coach')).toBe('/learn/employees/sales%20coach');
    expect(withQuery('/learn?plan=team', '?as=agent&now=week1', '#x')).toBe('/learn?plan=team&as=agent&now=week1#x');
    expect(withQuery('/learn/schedule', '?view=calendar', '')).toBe('/learn/schedule?view=calendar');
    expect(withQuery('/learn', '', '#top')).toBe('/learn#top');
  });

  it('@parity:R-3 a course week’s module by its id, and nothing else', () => {
    expect(weekOfModule('accelerator-week-3')).toBe('/learn/week/3');
    expect(weekOfModule('sales')).toBeNull();
  });

  it('@parity:R-7 the course pages: a week by its `week-N`, anything else Home', () => {
    expect(coursePathFor(undefined)).toBe('/learn');
    expect(coursePathFor('week-3')).toBe('/learn/week/3');
    expect(coursePathFor('week-0')).toBe('/learn/week/0');
    expect(coursePathFor('3')).toBe('/learn');
    expect(coursePathFor('week-x')).toBe('/learn');
  });

  it('@parity:R-8 @parity:R-9 the Skill Library and a skill, by the same slug', () => {
    expect(libraryPathFor(undefined)).toBe('/learn/skills');
    expect(libraryPathFor('appointment-follow-up')).toBe('/learn/skills/appointment-follow-up');
  });
});

describe('the route elements', () => {
  const at = (path: string) => {
    const router = createMemoryRouter(
      [
        { path: '/course', element: <CourseRedirect /> },
        { path: '/course/:week', element: <CourseRedirect /> },
        { path: '/skill-library', element: <LibraryRedirect /> },
        { path: '/skill-library/:slug', element: <LibraryRedirect /> },
        { path: '/learn/*', element: <p>the learner portal</p> },
      ],
      { initialEntries: [path] },
    );
    render(<RouterProvider router={router} />);
    return router;
  };

  it.each([
    ['/course', '/learn'],
    ['/course/week-3#rubric', '/learn/week/3#rubric'],
    ['/skill-library', '/learn/skills'],
    ['/skill-library/content-strategist?x=1', '/learn/skills/content-strategist?x=1'],
  ])('%s replaces itself with %s, keeping its query and fragment', async (from, to) => {
    const router = at(from);
    await screen.findByText('the learner portal');
    await waitFor(() => expect(`${router.state.location.pathname}${router.state.location.search}${router.state.location.hash}`).toBe(to));
    expect(router.state.historyAction).toBe('REPLACE');
  });
});
