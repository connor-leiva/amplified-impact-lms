// C-20 (D-230): what teams turned in for this week, for staff. Every version, newest first: the team, the kind, who
// and when, the files as downloads, the note, the minutes, and what staff did with it (Received, Picked for a live
// read, Reviewed). The team never sees that status (B-25); setting it is audited as `submission.status`. Only a week
// whose steps ask for a file (the Upload action) has the card. The admin console's own kit, as the other cards here.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fmt } from '@ai/core';
import { SUBMISSION_KIND_LABEL, SUBMISSION_STATUSES, SUBMISSION_STATUS_LABEL, asksOf, bytesLabel, isSubmissionKind } from '@ai/core/submissions';
import type { SubmissionStatus } from '@ai/core/submissions';
import { Card } from '../../components/r2/Card';
import { KV, Sel, k } from '../../components/r2/kit';
import type { WeekCardsProps } from './WeekBuilder';
import w from './WeekBuilder.module.css';

/** One turn-in as `GET /api/admin/submissions` sends it. */
export interface StaffSubmission {
  id: number;
  kind: string;
  team: string;
  files: { name: string; size: number; href?: string }[];
  note: string;
  minutes: string;
  by: string;
  at: number;
  status: SubmissionStatus;
  statusAt: number | null;
  statusBy: string | null;
  /** D-237: when its files were deleted with its cohort's, and by whom. */
  filesDeletedAt?: number | null;
  filesDeletedBy?: string | null;
}

export type StaffSubmissionsLoad = { kind: 'loading' } | { kind: 'ready'; subs: StaffSubmission[] } | { kind: 'failed' };

async function load(moduleId: string): Promise<StaffSubmissionsLoad> {
  try {
    const res = await fetch(`/api/admin/submissions?moduleId=${encodeURIComponent(moduleId)}`, { credentials: 'include', headers: { accept: 'application/json' } });
    if (!res.ok) return { kind: 'failed' };
    return { kind: 'ready', subs: ((await res.json()) as { subs?: StaffSubmission[] }).subs ?? [] };
  } catch {
    return { kind: 'failed' };
  }
}

/** The words the card shows. Chrome, not course words. */
export const SUBMISSIONS_CARD = {
  title: 'Submissions',
  none: 'Nothing turned in yet.',
  failed: 'Submissions didn’t load.',
  saveFailed: 'That status didn’t save. Try again.',
  team: 'Team',
  turnedIn: 'Turned in',
  files: 'Files',
  note: 'Note',
  minutes: 'Minutes',
  status: 'Status',
  deleted: 'Deleted',
} as const;

/** A row's lines, as the card lists them. Pure. */
export function submissionRows(s: StaffSubmission): { label: string; text: string }[] {
  return [
    { label: SUBMISSIONS_CARD.team, text: s.team },
    { label: SUBMISSIONS_CARD.turnedIn, text: `${fmt.when(s.at)} · ${s.by}` },
    ...(s.note ? [{ label: SUBMISSIONS_CARD.note, text: s.note }] : []),
    ...(s.minutes ? [{ label: SUBMISSIONS_CARD.minutes, text: s.minutes }] : []),
  ];
}

/** D-237: "Deleted Sun, Nov 22 · 3:18 PM UTC (9:18 AM CT) · Connor Leiva". Pure. */
export const filesDeletedLine = (s: Pick<StaffSubmission, 'filesDeletedAt' | 'filesDeletedBy'>): string =>
  s.filesDeletedAt ? `${SUBMISSIONS_CARD.deleted} ${fmt.when(s.filesDeletedAt)}${s.filesDeletedBy ? ` · ${s.filesDeletedBy}` : ''}` : '';

/** Only a week whose steps ask for a file has the card; nothing is read for any other. */
export function SubmissionsCard({ draft }: WeekCardsProps) {
  return asksOf(draft).length ? <Submissions moduleId={draft.id} /> : null;
}

function Submissions({ moduleId }: { moduleId: string }) {
  const key = ['admin', 'submissions', moduleId] as const;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: key, queryFn: () => load(moduleId) });
  const [fault, setFault] = useState<string | null>(null);
  const data: StaffSubmissionsLoad = q.data ?? { kind: 'loading' };
  const setStatus = async (id: number, status: SubmissionStatus) => {
    setFault(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/status`, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) setFault(SUBMISSIONS_CARD.saveFailed);
    } catch {
      setFault(SUBMISSIONS_CARD.saveFailed);
    }
    void qc.invalidateQueries({ queryKey: key });
  };
  const subs = data.kind === 'ready' ? data.subs : [];
  return (
    <Card title={`${SUBMISSIONS_CARD.title} · ${subs.length}`}>
      {data.kind === 'failed' ? <p className={k.mu}>{SUBMISSIONS_CARD.failed}</p> : null}
      {data.kind === 'ready' && !subs.length ? <p className={k.mu}>{SUBMISSIONS_CARD.none}</p> : null}
      {fault ? <p className={k.mu} role="alert">{fault}</p> : null}
      {subs.map((s) => (
        <fieldset key={s.id} className={w.blocks}>
          <legend className={w.legend}>{isSubmissionKind(s.kind) ? SUBMISSION_KIND_LABEL[s.kind] : s.kind}</legend>
          <KV
            rows={[
              ...submissionRows(s).map((r) => ({ label: r.label, value: r.text })),
              {
                label: SUBMISSIONS_CARD.files,
                value: (
                  <span>
                    {s.files.map((f, i) => (
                      <span key={`${i}:${f.name}`}>
                        {i ? ', ' : ''}
                        {f.href ? <a href={f.href} download>{f.name}</a> : f.name} ({bytesLabel(f.size)})
                      </span>
                    ))}
                    {/* D-237: deleted with the cohort's files: the names stay, the downloads don't. */}
                    {s.filesDeletedAt ? ` · ${filesDeletedLine(s)}` : null}
                  </span>
                ),
              },
              {
                label: SUBMISSIONS_CARD.status,
                value: (
                  <Sel aria-label={`${SUBMISSIONS_CARD.status}, ${s.team}`} value={s.status} onChange={(e) => void setStatus(s.id, e.target.value as SubmissionStatus)}>
                    {SUBMISSION_STATUSES.map((x) => (
                      <option key={x} value={x}>{SUBMISSION_STATUS_LABEL[x]}</option>
                    ))}
                  </Sel>
                ),
              },
            ]}
          />
        </fieldset>
      ))}
    </Card>
  );
}
