// D-229 (B-18): the drawer's Download PDF asks `GET /api/intake/pdf` and saves the file under the route's name.
// D-246: the same helper serves Download Your Answers (PDF), so it says whether the file arrived.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadIntakePdf, pdfNameOf } from './V3Week';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Download PDF (B-18)', () => {
  it('takes the file name from the route’s content-disposition, or the route’s default', () => {
    expect(pdfNameOf('attachment; filename="Week 0 Intake - Northline Realty.pdf"')).toBe('Week 0 Intake - Northline Realty.pdf');
    expect(pdfNameOf(null)).toBe('Week 0 Intake.pdf');
    expect(pdfNameOf('attachment')).toBe('Week 0 Intake.pdf');
  });

  it('fetches the team’s PDF with the session and saves it under that name', async () => {
    const fetchMock = vi.fn(async () => new Response('%PDF-1.4', { status: 200, headers: { 'content-disposition': 'attachment; filename="Week 0 Intake - Northline Realty.pdf"' } }));
    vi.stubGlobal('fetch', fetchMock);
    const created = vi.fn(() => 'blob:pdf');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: created, revokeObjectURL: vi.fn() }));
    const saved: { href: string; download: string }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push({ href: this.getAttribute('href') ?? '', download: this.download });
    });
    await expect(downloadIntakePdf()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/intake/pdf', { credentials: 'include' });
    expect(created).toHaveBeenCalledTimes(1);
    expect(saved).toEqual([{ href: 'blob:pdf', download: 'Week 0 Intake - Northline Realty.pdf' }]);
  });

  it('saves nothing when the route refuses, and resolves false without throwing (the package’s button has no failure state)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 403 })));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await expect(downloadIntakePdf()).resolves.toBe(false);
    expect(click).not.toHaveBeenCalled();
  });
});
