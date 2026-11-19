// D-188: a file going to the bucket, the browser half (pure: no repository here; `files.ts` › `uploadFile` is the call). The Console's Vault (Publish to Vault, Replace
// file) and the Week Builder (a video block's mp4) call `uploadFile`; the repository does the rest:
// http mode asks `POST /api/files/upload-url` for a presigned PUT and sends the file straight to the
// bucket (so the CSP's `connect-src` allows the bucket's origin), fixture mode has no bucket and only
// records the file. Either way the screen then saves the returned key through an audited action.
//
// What a file may be is `@ai/core/uploads` (the API's own policy): its type read from its name, the
// 25 MB cap, and 500 MB for an mp4. A file the API would refuse is refused here first, in words.

import { UPLOAD_POLICY, VIDEO_MP4, uploadTypeFor } from '@ai/core/uploads';
import type { UploadType } from '@ai/core/uploads';

/** What an upload says. Sentence case, no em dash (the builder's copy rules). */
export const UPLOAD_COPY = {
  notAllowed: 'Choose a JSON, PDF, Markdown, ZIP, MP4, Excel or CSV file.',
  notVideo: 'Choose an mp4 file.',
  tooBig: 'That file is over 25 MB.',
  videoTooBig: 'That video is over 500 MB.',
  failed: 'The upload didn’t finish. Try again.',
  /** While it goes: "Uploading 42%". */
  progress: (fraction: number): string => `Uploading ${Math.min(100, Math.max(0, Math.round(fraction * 100)))}%`,
} as const;

/** The type a file goes up as, or why it can't: by its name, its size against its type's cap. */
export function checkFile(file: Pick<File, 'name' | 'size'>, videoOnly = false): { ok: true; type: UploadType } | { ok: false; error: string } {
  const type = uploadTypeFor(file.name);
  if (videoOnly && type !== VIDEO_MP4) return { ok: false, error: UPLOAD_COPY.notVideo };
  if (!type) return { ok: false, error: UPLOAD_COPY.notAllowed };
  if (file.size <= 0) return { ok: false, error: UPLOAD_COPY.failed };
  if (file.size > UPLOAD_POLICY[type].max) return { ok: false, error: type === VIDEO_MP4 ? UPLOAD_COPY.videoTooBig : UPLOAD_COPY.tooBig };
  return { ok: true, type };
}

/**
 * PUT a file to a presigned URL, with progress. The `content-type` is the one the URL was signed for
 * (`storage.ts`, decision 3), so it is the type read from the name, never `File.type`. Resolves true
 * only for a 2xx from the bucket.
 */
export function putFile(url: string, file: Blob, type: string, onProgress?: (fraction: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.send(file);
  });
}

/** A key shaped as the upload route mints one, for fixture mode, which has no route to ask. */
export function fixtureUploadKey(type: UploadType, now: number = Date.now()): string {
  const at = new Date(now);
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `fixture-${now.toString(36)}`;
  return `uploads/${at.getUTCFullYear()}/${String(at.getUTCMonth() + 1).padStart(2, '0')}/${token}.${UPLOAD_POLICY[type].ext[0]}`;
}

/** `GET /api/files/course/<key>`: an uploaded course video, served same-origin for a viewer who may open its week. */
export const courseVideoRoute = (key: string): string => `/api/files/course/${key.split('/').map(encodeURIComponent).join('/')}`;
