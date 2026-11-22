// D-237: Delete turned-in files, on Cohorts & Sessions. It counts first, asks, then deletes through the audited route,
// and says how many went. A cohort with nothing to delete says so, with no delete button.
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToasterProvider } from '../../components/primitives/Toaster';
import { COHORT_FILES, CohortFilesButton, cohortFilesQuestion } from './CohortFiles';
import { filesDeletedLine } from './SubmissionsCard';
import { subsProps } from '../learn/lms-v3/turnin.vm';

const COUNT = { cohort: 'Amplified AI Accelerator · December 2026', turnIns: 6, files: 12, bytes: 4_200_000 };

describe('deleting a cohort’s turned-in files (D-237)', () => {
  let calls: { method: string; url: string }[];
  let count: unknown;
  let removed: { status: number; json: unknown };
  beforeEach(() => {
    calls = [];
    count = COUNT;
    removed = { status: 200, json: { turnIns: 6, files: 12, bytes: 4_200_000, failed: 0 } };
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      calls.push({ method, url });
      const r = method === 'POST' ? removed : { status: 200, json: count };
      return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'content-type': 'application/json' } });
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  const open = async () => {
    render(<ToasterProvider><CohortFilesButton cohortId="dec26" /></ToasterProvider>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: COHORT_FILES.button })); });
  };

  it('asks with what it would remove', () => {
    expect(cohortFilesQuestion(COUNT)).toBe('Delete the 12 files (4.2 MB) in 6 turn-ins for Amplified AI Accelerator · December 2026?');
    expect(cohortFilesQuestion({ ...COUNT, turnIns: 1, files: 1, bytes: 2_000 })).toBe('Delete the 1 file (2 KB) in 1 turn-in for Amplified AI Accelerator · December 2026?');
  });

  it('counts, asks, deletes through the audited route and says how many went', async () => {
    await open();
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain(cohortFilesQuestion(COUNT));
    expect(dialog.textContent).toContain(COHORT_FILES.why);
    expect(dialog.textContent).toContain(COHORT_FILES.keep);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: COHORT_FILES.confirm })); });
    expect(calls).toEqual([
      { method: 'GET', url: '/api/admin/cohorts/dec26/turned-in-files' },
      { method: 'POST', url: '/api/admin/cohorts/dec26/turned-in-files/delete' },
    ]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Deleted 12 files.')).toBeTruthy();
  });

  it('says so when a file won’t delete, and keeps the dialog open', async () => {
    removed = { status: 502, json: { turnIns: 5, files: 10, bytes: 1, failed: 1 } };
    await open();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: COHORT_FILES.confirm })); });
    expect(screen.getByRole('alert').textContent).toBe(COHORT_FILES.failed);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('has nothing to delete for a cohort with no files left: no delete button', async () => {
    count = { ...COUNT, turnIns: 0, files: 0, bytes: 0 };
    await open();
    expect(screen.getByRole('dialog').textContent).toContain(COHORT_FILES.none(COUNT.cohort));
    expect(screen.queryByRole('button', { name: COHORT_FILES.confirm })).toBeNull();
  });

  it('keeps a deleted turn-in’s file names, with no download, for the team and for staff', () => {
    const team = subsProps({ live_read: { id: 7, kind: 'live_read', files: [{ name: 'report.html', size: 184_000 }], note: '', minutes: '', by: 'Alex Morgan', at: 0 } });
    expect(team.live_read!.files).toEqual([{ name: 'report.html', size: '184 KB', href: undefined }]);
    expect(filesDeletedLine({ filesDeletedAt: Date.parse('2026-12-21T15:18:00Z'), filesDeletedBy: 'Connor Leiva' })).toMatch(/^Deleted .+ · Connor Leiva$/);
    expect(filesDeletedLine({ filesDeletedAt: null, filesDeletedBy: null })).toBe('');
  });
});
