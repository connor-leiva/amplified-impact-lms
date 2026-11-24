// D-229 (B-18), D-246: the team's Week 0 intake as a PDF, for the learner who filled it in. The file is made on the
// server from the team's saved answers (`GET /api/intake/pdf`, `apps/api/src/pdf/form-pdf.ts`), and the server takes
// the team from the session, never from the request, so a learner can only ever get their own team's. Shared by the
// v3 drawer (its foot's Download PDF and its submitted banner) and the intake page v3 doesn't draw for. No React here,
// so the legacy page doesn't load the v3 drawer to use it.

export const INTAKE_PDF_URL = '/api/intake/pdf';

/** D-246: the button that hands a team its submitted answers, on the drawer's confirmation and the intake page. */
export const DOWNLOAD_ANSWERS_LABEL = 'Download Your Answers (PDF)';

/** The file name the PDF route sends (`content-disposition`), or the route's own default. */
export function pdfNameOf(disposition: string | null): string {
  const m = /filename="([^"]+)"/.exec(disposition ?? '');
  return m?.[1] ?? 'Week 0 Intake.pdf';
}

/**
 * Fetch the team's PDF with the session and save it under the route's name. True once the browser has the file; false
 * when the route refused or the request failed (nothing is saved). It never throws: the drawer's button has no failure
 * state, and the intake page says so itself.
 */
export async function downloadIntakePdf(): Promise<boolean> {
  try {
    const res = await fetch(INTAKE_PDF_URL, { credentials: 'include' });
    if (!res.ok) throw new Error(`GET ${INTAKE_PDF_URL} ${res.status}`);
    const href = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = href;
    a.download = pdfNameOf(res.headers.get('content-disposition'));
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
