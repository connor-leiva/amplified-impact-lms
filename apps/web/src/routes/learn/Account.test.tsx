import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { setViewerZone } from '@ai/core';
import type { Db } from '@ai/core';
import type { Viewer } from '../../data/repository';
import type { AccountRead } from './Account.vm';
import type { CourseLoad } from './data';
import type * as DataModule from './data';
import type * as AccountDataModule from './accountData';
import { asBilling, asPassword, fetchAccount } from './accountData';
import { learnerRoutes } from './routes';
import { accountRead, accountState } from './test/account-fixture';
import type { LearnState } from './test/fixture';

// D-178: the learner Account page, rendered for real through its route and the learner shell; only the
// data hooks, `GET /api/course` and the page's two reads are stood in for.

const state: { db: Db; viewer: Viewer; now: number; course: CourseLoad; read: AccountRead } = {
  db: accountState().db,
  viewer: accountState().viewer,
  now: accountState().now,
  course: { kind: 'ready', payload: accountState().payload },
  read: accountRead(),
};

vi.mock('../../data/hooks', () => ({
  useDb: () => state.db,
  useViewer: () => state.viewer,
  useNow: () => state.now,
  useMutate: () => vi.fn(async () => ({})),
}));
vi.mock('./data', async (importOriginal) => ({
  ...(await importOriginal<typeof DataModule>()),
  useCourse: () => state.course,
}));
vi.mock('./accountData', async (importOriginal) => ({
  ...(await importOriginal<typeof AccountDataModule>()),
  useAccount: () => state.read,
}));

function use(st: LearnState, read: AccountRead = accountRead()) {
  state.db = st.db;
  state.viewer = st.viewer;
  state.now = st.now;
  state.course = { kind: 'ready', payload: st.payload };
  state.read = read;
}

function setWidth(w: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: w });
  window.dispatchEvent(new Event('resize'));
}

function at(path: string) {
  const router = createMemoryRouter([...learnerRoutes(true), { path: '/', element: <p>the portal</p> }, { path: '/account', element: <p>the password page</p> }], {
    initialEntries: [path],
  });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  setViewerZone('America/Denver');
  setWidth(1440);
  use(accountState());
  delete document.body.dataset.appReady;
});
afterEach(() => {
  setViewerZone(null);
  delete document.body.dataset.appReady;
});

describe('the Account page (D-178)', () => {
  it('one h1, the plan card with Manage billing, and the seats', async () => {
    at('/learn/account');
    expect(await screen.findByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Your plan, your profile and your receipts.')).toBeInTheDocument();
    const plan = screen.getByRole('region', { name: 'Amplified AI Accelerator' });
    expect(plan).toHaveTextContent('December 2026 cohort · Live Dec 2 to Feb 4 · Included through Tue, May 4, 2027');
    expect(within(plan).getByRole('link', { name: 'Manage billing' })).toHaveAttribute('href', '/api/billing/portal');
    expect(plan).toHaveTextContent('1of 2 in use');
    expect(plan).toHaveTextContent('Operator invite sent Nov 16, not accepted yet');
    // No money, receipts or card: those stay in Stripe's portal, behind Manage billing.
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Receipts' })).toBeNull();
    // No time-zone picker and no Save: nothing on the profile is written here.
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: /Save/ })).toBeNull();
  });

  it('Resend invite confirms as Team Hub does, with no request of its own', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    at('/learn/account');
    fireEvent.click(await screen.findByRole('button', { name: 'Resend invite' }));
    expect(await screen.findByText('Invite resent to sam@example.com')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('the profile reads only, and Change password goes to the password page', async () => {
    const router = at('/learn/account');
    const name = await screen.findByLabelText('Full name');
    expect(name).toHaveValue('Dana Ross');
    expect(name).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Email')).toHaveValue('dana@example.com');
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('You sign in with this.');
    expect(screen.getByLabelText('Role')).toHaveValue('Team owner');
    expect(screen.getByText('Last changed Nov 12, 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Change password' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'));
  });

  it('what is included, as a list', async () => {
    at('/learn/account');
    const inc = await screen.findByRole('region', { name: 'What’s included' });
    expect(within(inc).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '8 live builds, 90 minutes each',
      '10 office hours, 60 minutes each',
      'All 53 skills, owner and agent',
      'New skills and office hours through May 4, 2027',
    ]);
  });

  it('with no reads (the fixture build), only the profile from the snapshot', async () => {
    use(accountState(), { billing: null, password: null });
    at('/learn/account');
    await screen.findByRole('heading', { level: 1, name: 'Account' });
    expect(screen.queryByRole('link', { name: 'Manage billing' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Change password' })).toBeNull();
    expect(screen.getByLabelText('Full name')).toHaveValue('Dana Ross');
  });

  it('on a phone, the same page inside the shell’s phone frame', async () => {
    setWidth(390);
    at('/learn/account');
    expect(await screen.findByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });

  it('the account menu’s Account goes here', async () => {
    const router = at('/learn');
    await screen.findByRole('heading', { level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Your account' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Account' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/learn/account'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Account' })).toBeInTheDocument();
  });

  it('flag off: /learn/account redirects to /', async () => {
    const router = createMemoryRouter([...learnerRoutes(false), { path: '/', element: <p>the portal</p> }], { initialEntries: ['/learn/account'] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('the portal')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});

describe('the reads (D-178)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps only the fields the page uses, and treats anything else as no answer', () => {
    expect(asBilling({ skills: [{ sets: 'agent', state: 'open', title: 'x' }], plans: [{ kind: 'cohort', status: 'active', paidThrough: 5, extra: 1 }], accessGroups: [{ id: 'g', name: 'G', skills: 3 }] })).toEqual({
      plans: [{ kind: 'cohort', status: 'active', paidThrough: 5 }],
      accessGroups: [{ id: 'g', name: 'G' }],
      skills: [{ sets: 'agent', state: 'open' }],
    });
    expect(asBilling(null)).toBeNull();
    expect(asBilling('<!doctype html>')).toBeNull();
    expect(asPassword({ hasPassword: true, changedAt: 7 })).toEqual({ hasPassword: true, changedAt: 7 });
    expect(asPassword({ hasPassword: false })).toEqual({ hasPassword: false, changedAt: null });
    expect(asPassword({})).toBeNull();
  });

  it('reads /api/skills and /api/auth/password with the session, and nothing else', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === '/api/skills' ? new Response(JSON.stringify({ skills: [], plans: [] })) : new Response('{"error":"no"}', { status: 401 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchAccount()).toEqual({ billing: { plans: [], accessGroups: [], skills: [] }, password: null });
    expect(fetchMock.mock.calls.map((c) => c[0]).sort()).toEqual(['/api/auth/password', '/api/skills']);
    for (const call of fetchMock.mock.calls) expect((call as unknown[])[1]).toMatchObject({ credentials: 'include' });
  });

  it('no API (the fixture build): neither read answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<!doctype html>', { status: 200 })));
    expect(await fetchAccount()).toEqual({ billing: null, password: null });
  });
});
