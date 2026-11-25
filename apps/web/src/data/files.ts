import { VIDEO_MP4 } from '@ai/core/uploads';
import type { UploadType } from '@ai/core/uploads';
import { repo } from './boot';
import type { StoredFileRef, UploadResult } from './repository';
import { checkFile, courseVideoRoute } from './upload';

/**
 * Phase 08 § 8.2, the browser half: hand a STORED file to the viewer.
 *
 * The prototype's Download buttons build a Blob behind a synthetic anchor, and in fixture mode they
 * still do — that behaviour is what the 55 parity scenarios and the 25 e2e behaviours measure, so
 * it cannot move. In http mode the bytes live in the Railway Storage Bucket instead, and the only
 * way to them is a route that checks the viewer's tier and streams the object on this origin (D-188;
 * it used to 302 to a presigned GET on the bucket's).
 *
 * `saveStoredFile` is the whole difference, kept in one function so that no screen has to ask which
 * data source it is on. A screen says "save this stored file, and here is the Blob to fall back
 * to"; which half answers is the repository's business.
 *
 * What is NOT a stored file is the harder half of § 8.2 and is documented on `StoredFileRef`:
 * calendar files, CSV exports and the system prompt are generated in the browser and have no object
 * in the bucket at all.
 */
export function saveStoredFile(ref: StoredFileRef): boolean {
  const url = repo.fileUrl(ref);
  // Fixture mode. There is no bucket, so the caller writes the Blob exactly as the reference does.
  if (!url) return false;

  try {
    // A plain same-origin navigation, which is what § 8.2 asks for ("navigate to these routes").
    // The route streams the file with `Content-Disposition: attachment` (D-188), so the
    // browser saves the file and leaves this page where it is — the SPA survives the click.
    //
    // Deliberately no `download` attribute: the response's own `Content-Disposition` names the file
    // (the name it was uploaded with, D-188). `rel` is set anyway so that a future `target` on this
    // anchor cannot hand anything an opener.
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    /* A runtime that refuses the synthetic click. Nothing useful to fall back to: the generated
       body the caller holds is the prototype's placeholder, not the file the viewer asked for. */
  }
  return true;
}

// --- D-188: uploads, and a course video's address -----------------------------------------------

/** Files uploaded in this tab, by key: the builder's preview plays them before the week is saved. */
const local = new Map<string, string>();

/** Where a course video plays from: this tab's own copy of a file it just uploaded, else the API (same-origin). */
export const courseVideoUrl = (key: string): string => local.get(key) ?? courseVideoRoute(key);

/**
 * Upload one file through the repository (`upload.ts` says what a file may be). A video is remembered
 * in this tab (an object URL of the file itself, no copy) so the builder's live preview can play it
 * before the week is saved.
 */
export async function uploadFile(file: File, onProgress?: (fraction: number) => void, videoOnly = false): Promise<UploadResult> {
  const check = checkFile(file, videoOnly);
  if (!check.ok) return check;
  const out = await repo.upload(file, onProgress);
  const previewable: readonly UploadType[] = [VIDEO_MP4, 'image/jpeg', 'text/vtt'];
  if (out.ok && previewable.includes(out.file.type)) {
    try {
      local.set(out.file.key, URL.createObjectURL(file));
    } catch {
      /* no object URLs here: the preview plays it from the API once saved */
    }
  }
  return out;
}

/**
 * D-252: how long a chosen video is, in seconds to a tenth, read from the file itself in this tab (its metadata only,
 * through an object URL that is let go once read). Null where it can't be read: no object URLs, a file the browser
 * can't open, or no answer within `waitMs`. The Week Builder stores it on the block (`durationS`) as it uploads.
 */
export function videoDurationOf(file: Blob, waitMs = 15_000): Promise<number | null> {
  const el = document.createElement('video');
  // A browser that can't play an mp4 (or a test DOM, which plays nothing) has no length to read.
  if (!el.canPlayType?.(VIDEO_MP4)) return Promise.resolve(null);
  let url: string;
  try {
    url = URL.createObjectURL(file);
  } catch {
    return Promise.resolve(null);
  }
  return new Promise<number | null>((resolve) => {
    let done = false;
    const finish = (seconds: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      el.removeAttribute('src');
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* nothing to let go */
      }
      resolve(seconds !== null && Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 10) / 10 : null);
    };
    const timer = setTimeout(() => finish(null), waitMs);
    el.preload = 'metadata';
    el.muted = true;
    el.onloadedmetadata = () => finish(el.duration);
    el.onerror = () => finish(null);
    el.src = url;
  });
}
