// D-188: what a file may be before it goes up, and the course video's address.
import { describe, expect, it } from 'vitest';
import { isUploadKey } from '@ai/core/uploads';
import { UPLOAD_COPY, checkFile, courseVideoRoute, fixtureUploadKey } from './upload';
import { courseVideoUrl } from './files';

describe('a file, checked as the API checks it (D-188)', () => {
  it('takes its type from its name', () => {
    expect(checkFile({ name: 'Leads.CSV', size: 10 })).toEqual({ ok: true, type: 'text/csv' });
    expect(checkFile({ name: 'Week 1.mp4', size: 10 }, true)).toEqual({ ok: true, type: 'video/mp4' });
  });
  it('refuses another type, a non-video where a video goes, and a file past its cap', () => {
    expect(checkFile({ name: 'page.html', size: 10 })).toEqual({ ok: false, error: UPLOAD_COPY.notAllowed });
    expect(checkFile({ name: 'guide.pdf', size: 10 }, true)).toEqual({ ok: false, error: UPLOAD_COPY.notVideo });
    expect(checkFile({ name: 'guide.pdf', size: 25_000_001 })).toEqual({ ok: false, error: UPLOAD_COPY.tooBig });
    expect(checkFile({ name: 'guide.pdf', size: 25_000_000 }).ok).toBe(true);
    expect(checkFile({ name: 'w.mp4', size: 500_000_001 })).toEqual({ ok: false, error: UPLOAD_COPY.videoTooBig });
    expect(checkFile({ name: 'w.mp4', size: 500_000_000 }).ok).toBe(true);
    expect(checkFile({ name: 'empty.csv', size: 0 }).ok).toBe(false);
  });
  it('says how far an upload has got, in whole percent', () => {
    expect(UPLOAD_COPY.progress(0)).toBe('Uploading 0%');
    expect(UPLOAD_COPY.progress(0.426)).toBe('Uploading 43%');
    expect(UPLOAD_COPY.progress(2)).toBe('Uploading 100%');
  });
  it('mints a fixture key of the upload route’s shape, which the actions accept', () => {
    const key = fixtureUploadKey('video/mp4', Date.parse('2026-12-08T19:00:00Z'));
    expect(key).toMatch(/^uploads\/2026\/12\/[0-9a-f-]{36}\.mp4$/);
    expect(isUploadKey(key)).toBe(true);
  });
  it('addresses a course video same-origin, each segment encoded', () => {
    expect(courseVideoRoute('uploads/2026/12/aaaaaaaa-bbbb.mp4')).toBe('/api/files/course/uploads/2026/12/aaaaaaaa-bbbb.mp4');
    expect(courseVideoUrl('uploads/2026/12/aaaaaaaa-bbbb.mp4')).toBe('/api/files/course/uploads/2026/12/aaaaaaaa-bbbb.mp4');
  });
});
