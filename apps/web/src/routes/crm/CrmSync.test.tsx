import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CrmSync from './CrmSync';
import { COPY } from './CrmSync.vm';
import type { CrmSyncReport } from './CrmSync.vm';

// /admin/crm-sync against a stubbed `fetch`. The API's half is apps/api/test/crm-sync.test.ts.

let fetchMock: Mock;
const json = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;
const zero = { total: 0, synced: 0, waiting: 0, retrying: 0, gaveUp: 0 };
const REPORT: CrmSyncReport = {
  sync: 'on',
  fields: ['offer'],
  pipeline: true,
  stages: ['lead', 'purchased'],
  counts: { waitlist: { ...zero, total: 3, synced: 2, waiting: 1 }, order: { ...zero, total: 2, synced: 1, gaveUp: 1 }, login: zero, skill: zero },
  problems: [{ kind: 'order', id: 'o-gone', email: 'gone@example.com', state: 'gave-up', attempts: 8, lastAttemptAt: null, nextAttemptAt: null, syncedAt: null, error: 'upsert:rejected:400' }],
  recent: [],
};

beforeEach(() => {
  fetchMock = vi.fn(async () => json(200, REPORT));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete document.body.dataset.appReady;
});

describe('/admin/crm-sync', () => {
  it('shows the status, the counts and the rows that need a look, then marks the page ready', async () => {
    render(<CrmSync />);
    expect(await screen.findByText(COPY.status.on)).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: COPY.title })).toBeVisible();
    expect(screen.getByText('AI Offer')).toBeVisible();
    expect(screen.getByText('Lead, Purchased')).toBeVisible();
    const problems = screen.getByRole('table', { name: COPY.problemsHeading });
    expect(within(problems).getByText('gone@example.com')).toBeVisible();
    expect(within(problems).getByText('Gave Up')).toBeVisible();
    expect(within(problems).getByText('Contact: GHL refused it (400)')).toBeVisible();
    expect(screen.getByText(COPY.recentEmpty)).toBeVisible();
    expect(screen.getByRole('main')).toBeInTheDocument();
    await waitFor(() => expect(document.body.dataset.appReady).toBe('true'));
  });

  it('retries a row that gave up and says it is queued', async () => {
    render(<CrmSync />);
    fetchMock.mockImplementationOnce(async () => json(200, { ok: true }));
    await userEvent.click(await screen.findByRole('button', { name: COPY.retry }));
    expect(await screen.findByText(COPY.retried)).toBeVisible();
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/admin/crm-sync/retry');
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ kind: 'order', id: 'o-gone' });
  });

  it('tells other staff who the page is for, and the fixture build that it isn’t available', async () => {
    fetchMock.mockImplementationOnce(async () => json(403, { error: 'no' }));
    const { unmount } = render(<CrmSync />);
    expect(await screen.findByText(COPY.forbidden)).toBeVisible();
    unmount();
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('no API')));
    render(<CrmSync />);
    expect(await screen.findByText(COPY.unavailable)).toBeVisible();
  });

  it('sends a signed-out visitor to /sign-in', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    fetchMock.mockImplementationOnce(async () => json(401, { error: 'Not signed in' }));
    render(<CrmSync />);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/sign-in'));
  });
});
