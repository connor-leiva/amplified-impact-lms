// D-230 (§7.6, B-24, B-25, B-27): Turn in's props against the package's sample, the step button's two words, and the
// upload's real progress through `XMLHttpRequest.upload.onprogress`.
import { describe, expect, it, vi } from 'vitest';
import { turnInSamples } from '@lms-v3-pkg/sample-data.js';
import { OK_EXT } from '@lms-v3-pkg/components/TurnIn.jsx';
import { SUBMISSION_KIND_LABEL, SUBMISSION_TYPES } from '@ai/core/submissions';
import { OK_EXT as REPO_OK_EXT } from './TurnIn';
import { TURN_IN_UI, asksProps, subsProps, turnInLabel, turnedInWhen } from './turnin.vm';
import { putFile } from './turnin.data';

describe('Turn in’s props (D-230)', () => {
  it('uses the package’s words', () => {
    expect(TURN_IN_UI).toEqual(turnInSamples.ui);
  });
  it('lets the server take exactly the drawer’s files, and heads each kind as the drawer does', () => {
    expect(Object.keys(SUBMISSION_TYPES)).toEqual(OK_EXT);
    expect(REPO_OK_EXT).toEqual(OK_EXT);
    for (const [k, label] of Object.entries(SUBMISSION_KIND_LABEL)) expect(turnInSamples.ui.kinds[k].title).toBe(label);
  });
  it('draws a turn-in as the sample does: sizes, the stamp without a zone, the files as downloads', () => {
    // Thu, Nov 19, 2026, 4:02 PM CT (the test setup's viewer zone is Central).
    const at = Date.parse('2026-11-19T22:02:00Z');
    expect(turnedInWhen(at)).toBe(turnInSamples.sent.when);
    const subs = subsProps({
      live_read: { id: 7, kind: 'live_read', files: [{ name: 'Map Your Spend report (made up).html', size: 184_000, href: '/api/submissions/7/files/0' }], note: 'Please look at advertising. (Made-up note.)', minutes: '', by: 'Alex Morgan', at },
    });
    expect(subs.live_read).toEqual({ ...turnInSamples.sent, short: undefined, files: [{ ...turnInSamples.sent.files[0], href: '/api/submissions/7/files/0' }] });
  });
  it('asks as the sample does, and labels the step’s button Turn in, then View', () => {
    expect(asksProps([
      { id: 'live_read', kind: 'live_read', step: 4, stepId: 'c4', itemId: 'r', kicker: 'Week 1 · Step 4' },
      { id: 'checkpoint', kind: 'checkpoint', step: 6, stepId: 'c6', itemId: 'k', kicker: 'Week 1 · Step 6' },
    ])).toEqual(turnInSamples.asks);
    expect(turnInLabel({}, 'live_read')).toBe('Turn in');
    expect(turnInLabel({ live_read: {} }, 'live_read')).toBe('View');
    expect(turnInLabel({ live_read: {} }, 'checkpoint')).toBe('Turn in');
  });
});

describe('the upload (B-24)', () => {
  /** A stand-in for XMLHttpRequest: records the PUT and lets the test drive its progress and its end. */
  function fakeXhr() {
    const x = {
      method: '', url: '', headers: {} as Record<string, string>, body: null as unknown, status: 0,
      upload: { onprogress: null as ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null },
      onload: null as (() => void) | null, onerror: null as (() => void) | null,
      open(m: string, u: string) { x.method = m; x.url = u; },
      setRequestHeader(k: string, v: string) { x.headers[k] = v; },
      send(b: unknown) { x.body = b; },
    };
    return x;
  }
  it('PUTs the file with the signed type and reports its progress, never 1 before the bucket answers', async () => {
    const x = fakeXhr();
    const seen: number[] = [];
    const file = new File(['abc'], 'report.html', { type: 'text/html' });
    const done = putFile('https://bucket.example/put', file, 'text/html', (p) => seen.push(p), () => x as unknown as XMLHttpRequest);
    expect([x.method, x.url, x.headers['content-type'], x.body]).toEqual(['PUT', 'https://bucket.example/put', 'text/html', file]);
    x.upload.onprogress!({ lengthComputable: true, loaded: 42, total: 100 });
    x.upload.onprogress!({ lengthComputable: true, loaded: 100, total: 100 });
    x.status = 200;
    x.onload!();
    await done;
    expect(seen).toEqual([0.42, 0.99]);
  });
  it('fails when the bucket refuses or the network drops', async () => {
    const x = fakeXhr();
    const refused = putFile('u', new File(['a'], 'a.pdf'), 'application/pdf', vi.fn(), () => x as unknown as XMLHttpRequest);
    x.status = 403;
    x.onload!();
    await expect(refused).rejects.toThrow('That didn’t go through. Try again.');
    const y = fakeXhr();
    const dropped = putFile('u', new File(['a'], 'a.pdf'), 'application/pdf', vi.fn(), () => y as unknown as XMLHttpRequest);
    y.onerror!();
    await expect(dropped).rejects.toThrow('That didn’t go through. Try again.');
  });
});
