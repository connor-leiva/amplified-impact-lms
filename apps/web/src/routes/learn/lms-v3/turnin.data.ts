// D-230: what Turn in reads and writes, the API's own routes (`apps/api/src/routes/submissions.ts`), and nothing else.
//   GET  /api/submissions?moduleId=     the team's latest per kind (no status)
//   POST /api/submissions/upload-url    one file's presigned PUT; then the PUT itself, with real progress (B-24:
//                                       `XMLHttpRequest.upload.onprogress`; `fetch` has none)
//   POST /api/submissions               turn in the files the drawer put
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';
import { SUBMISSION_ERRORS } from '@ai/core/submissions';
import type { SubmissionKind } from '@ai/core/submissions';
import type { SubmissionWire } from './turnin.vm';
import { DB_KEY } from '../../../data/hooks';

export const submissionsKey = (moduleId: string) => ['learn', 'submissions', moduleId] as const;

async function readSubs(moduleId: string): Promise<Record<string, SubmissionWire>> {
  const res = await fetch(`/api/submissions?moduleId=${encodeURIComponent(moduleId)}`, { credentials: 'include', headers: { accept: 'application/json' } });
  if (!res.ok) return {};
  return ((await res.json()) as { subs?: Record<string, SubmissionWire> }).subs ?? {};
}

/** The team's latest turn-ins for a week; nothing until `enabled` (an owner or operator, a week that asks). */
export function useSubmissions(moduleId: string, enabled: boolean): Record<string, SubmissionWire> {
  return useQuery({ queryKey: submissionsKey(moduleId), queryFn: () => readSubs(moduleId), enabled }).data ?? {};
}

/** The server's words for a refusal, or the drawer's own when it said nothing. */
async function refusal(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as { error?: unknown };
  return new Error(typeof body.error === 'string' ? body.error : SUBMISSION_ERRORS.saveFailed);
}

const postJson = (url: string, body: unknown) =>
  fetch(url, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });

/** One file into the bucket with the presigned PUT, reporting progress 0..1. Resolves with its key. */
export function putFile(url: string, file: File, contentType: string, onProgress: (p: number) => void, make: () => XMLHttpRequest = () => new XMLHttpRequest()): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = make();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', contentType);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress(Math.min(0.99, e.loaded / e.total)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(SUBMISSION_ERRORS.saveFailed)));
    xhr.onerror = () => reject(new Error(SUBMISSION_ERRORS.saveFailed));
    xhr.send(file);
  });
}

/** The drawer's `upload` and `onSubmit` for one week, and a refresh of what the team turned in. */
export function useTurnInWrites(moduleId: string) {
  const qc = useQueryClient();
  const keys = useRef(new WeakMap<File, Promise<string>>());
  const upload = useCallback((file: File, onProgress: (p: number) => void): Promise<unknown> => {
    const done = (async () => {
      const res = await postJson('/api/submissions/upload-url', { name: file.name, size: file.size });
      if (!res.ok) throw await refusal(res);
      const { key, url, contentType } = (await res.json()) as { key: string; url: string; contentType: string };
      await putFile(url, file, contentType, onProgress);
      onProgress(1);
      return key;
    })();
    keys.current.set(file, done);
    return done;
  }, []);
  const onSubmit = useCallback(
    async (askId: string, x: { files: { name: string; file: File }[]; note: string; minutes: string }): Promise<unknown> => {
      const files = await Promise.all(x.files.map(async (f) => ({ key: await keys.current.get(f.file)!, name: f.name })));
      const res = await postJson('/api/submissions', { moduleId, kind: askId as SubmissionKind, files, note: x.note, minutes: x.minutes });
      if (!res.ok) throw await refusal(res);
      // What was turned in, and the step's item the server just checked for the team.
      await qc.invalidateQueries({ queryKey: submissionsKey(moduleId) });
      void qc.invalidateQueries({ queryKey: DB_KEY });
      return res.json();
    },
    [moduleId, qc],
  );
  return useMemo(() => ({ upload, onSubmit }), [upload, onSubmit]);
}
