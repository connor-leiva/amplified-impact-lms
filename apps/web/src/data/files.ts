import { repo } from './boot';
import type { StoredFileRef } from './repository';

/**
 * Phase 08 § 8.2, the browser half: hand a STORED file to the viewer.
 *
 * The prototype's Download buttons build a Blob behind a synthetic anchor, and in fixture mode they
 * still do — that behaviour is what the 55 parity scenarios and the 25 e2e behaviours measure, so
 * it cannot move. In http mode the bytes live in the Railway Storage Bucket instead, and the only
 * way to them is a route that checks the viewer's tier and 302-redirects to a presigned GET.
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
    // The route answers 302 to a presigned URL carrying `Content-Disposition: attachment`, so the
    // browser saves the file and leaves this page where it is — the SPA survives the click.
    //
    // Deliberately no `download` attribute: it is ignored the moment the redirect lands on another
    // origin, and the presigned URL's `ResponseContentDisposition` already names the file. `rel`
    // is set anyway so that a future `target` on this anchor cannot hand the bucket an opener.
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
