// D-237: Delete turned-in files, on Cohorts & Sessions. The Subscription Agreement, Section 7: "If you share files with
// us for a live build, we use them only to help your team during that build and delete them when the cohort ends."
// Connor, Nov 22: a staff action on the cohort, audited (`submission.files_delete`), that removes the cohort's
// turned-in files from the bucket and marks each turn-in's files deleted; the team, who turned it in and when stay on
// record. The button asks first, with what it would remove. Not in the mockup: Connor's call. The admin console's own
// kit (Button, Modal), as the rest of the page.
import { useState } from 'react';
import { bytesLabel } from '@ai/core/submissions';
import { useToaster } from '../../components/primitives/Toaster';
import { Button } from '../../components/r2/Button';
import { Modal } from '../../components/r2/Modal';
import { k } from '../../components/r2/kit';

/** What `GET /api/admin/cohorts/:id/turned-in-files` answers. */
export interface CohortFilesCount {
  cohort: string;
  turnIns: number;
  files: number;
  bytes: number;
}

/** The words the button and its confirm show. Chrome, not course words. */
export const COHORT_FILES = {
  button: 'Delete turned-in files',
  title: 'Delete turned-in files',
  loading: 'Counting the files…',
  loadFailed: 'The files couldn’t be counted. Try again.',
  why: 'The Subscription Agreement promises to delete what teams share for a live build when the cohort ends.',
  keep: 'Each turn-in keeps its team, who turned it in and when. This can’t be undone.',
  none: (cohort: string) => `No turned-in files to delete for ${cohort}.`,
  cancel: 'Cancel',
  close: 'Close',
  confirm: 'Delete files',
  failed: 'Some files didn’t delete. Try again.',
  done: (files: number) => `Deleted ${files} ${files === 1 ? 'file' : 'files'}.`,
} as const;

/** "Delete the 12 files (4.2 MB) in 6 turn-ins for the December 2026 cohort?" Pure. */
export function cohortFilesQuestion(c: CohortFilesCount): string {
  const files = `${c.files} ${c.files === 1 ? 'file' : 'files'}`;
  const turnIns = `${c.turnIns} ${c.turnIns === 1 ? 'turn-in' : 'turn-ins'}`;
  return `Delete the ${files} (${bytesLabel(c.bytes)}) in ${turnIns} for ${c.cohort}?`;
}

const path = (cohortId: string) => `/api/admin/cohorts/${encodeURIComponent(cohortId)}/turned-in-files`;

export function CohortFilesButton({ cohortId }: { cohortId: string }) {
  const { toast } = useToaster();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<CohortFilesCount | 'loading' | 'failed'>('loading');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const start = async () => {
    setOpen(true);
    setErr('');
    setCount('loading');
    try {
      const res = await fetch(path(cohortId), { credentials: 'include', headers: { accept: 'application/json' } });
      setCount(res.ok ? ((await res.json()) as CohortFilesCount) : 'failed');
    } catch {
      setCount('failed');
    }
  };
  const remove = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`${path(cohortId)}/delete`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: '{}' });
      const body = (await res.json().catch(() => ({}))) as { files?: number };
      if (!res.ok) setErr(COHORT_FILES.failed);
      else {
        setOpen(false);
        toast(COHORT_FILES.done(body.files ?? 0));
      }
    } catch {
      setErr(COHORT_FILES.failed);
    } finally {
      setBusy(false);
    }
  };
  const ready = typeof count === 'object' ? count : null;
  const some = !!ready && ready.files > 0;
  return (
    <>
      <Button header onClick={() => void start()}>
        {COHORT_FILES.button}
      </Button>
      {open ? (
        <Modal
          title={COHORT_FILES.title}
          onClose={() => setOpen(false)}
          lock={busy}
          foot={
            <>
              <Button onClick={() => setOpen(false)}>{some ? COHORT_FILES.cancel : COHORT_FILES.close}</Button>
              {some ? (
                <Button kind="primary-danger" disabled={busy} onClick={() => void remove()}>
                  {COHORT_FILES.confirm}
                </Button>
              ) : null}
            </>
          }
        >
          {count === 'loading' ? <p className={k.mu}>{COHORT_FILES.loading}</p> : null}
          {count === 'failed' ? <p className={k.mu}>{COHORT_FILES.loadFailed}</p> : null}
          {ready && !some ? <p>{COHORT_FILES.none(ready.cohort)}</p> : null}
          {ready && some ? (
            <>
              <p>{cohortFilesQuestion(ready)}</p>
              <p className={k.mu}>{COHORT_FILES.why}</p>
              <p className={k.mu}>{COHORT_FILES.keep}</p>
            </>
          ) : null}
          {err ? (
            <p className={k.mu} role="alert">
              {err}
            </p>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
