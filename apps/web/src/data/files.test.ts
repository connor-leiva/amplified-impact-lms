import { describe, it, expect, afterEach, vi } from 'vitest';
import type { StoredFileRef } from './repository';

// Phase 08 § 8.2, the browser half. The routes are deferred to the sprint that builds the Fastify
// app, so what is pinned here is the CLIENT contract: which URL each kind of stored file resolves
// to, and — the part that matters more — that fixture mode still writes the prototype's Blob.
//
// `boot.ts` resolves the data source once at module load, so each case re-imports the seam with a
// fresh module registry and a stubbed env, exactly as `boot.test.ts` does.

const load = async (source: string) => {
  vi.resetModules();
  vi.stubEnv('VITE_DATA_SOURCE', source);
  const files = await import('./files');
  const boot = await import('./boot');
  return { ...files, repo: boot.repo };
};

const RESOURCE: StoredFileRef = { kind: 'resource', id: 'r4' };
const MODULE_FILE: StoredFileRef = {
  kind: 'moduleFile',
  moduleId: 'marketing',
  fileName: 'listing-launch-packet.skill.json',
};

/**
 * Capture where a synthetic anchor click would have gone.
 *
 * Spying on `click` rather than letting it run is deliberate: jsdom would otherwise log a
 * navigation it cannot perform, and the href is the only thing under test — the redirect to a
 * presigned URL is the server's half.
 */
function watchClicks(): { hrefs: string[]; attached: number } {
  const seen = { hrefs: [] as string[], attached: 0 };
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    seen.hrefs.push(this.getAttribute('href') ?? '');
    // The anchor has to be in the document at click time, or the click does nothing in some
    // browsers — and it has to be gone again afterwards, which the caller checks.
    seen.attached += this.isConnected ? 1 : 0;
  });
  return seen;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('stored files · fixture mode keeps the prototype @g8', () => {
  it('has no bucket, so the screen falls back to its Blob', async () => {
    // THE constraint on this whole sprint. 55 parity scenarios and 25 e2e behaviours run in fixture
    // mode against a captured golden of the prototype, and the prototype downloads a Blob. A `true`
    // here would mean every Download button in the compliance suite navigated away instead.
    const m = await load('fixture');
    const clicks = watchClicks();

    expect(m.repo.fileUrl(RESOURCE)).toBeNull();
    expect(m.repo.fileUrl(MODULE_FILE)).toBeNull();
    expect(m.saveStoredFile(RESOURCE)).toBe(false);
    expect(m.saveStoredFile(MODULE_FILE)).toBe(false);
    expect(clicks.hrefs).toEqual([]);
  });
});

describe('stored files · http mode goes to the bucket @g8', () => {
  it('navigates a vault row to its resource route', async () => {
    const m = await load('http');
    const clicks = watchClicks();

    expect(m.saveStoredFile(RESOURCE)).toBe(true);
    expect(clicks.hrefs).toEqual(['/api/files/resource/r4']);
    expect(clicks.attached).toBe(1);
    // The anchor is a tool, not UI: it must not be left in the document for axe or the fingerprint
    // to find.
    expect(document.querySelector('a')).toBeNull();
  });

  it('navigates a build-kit file to its module route', async () => {
    const m = await load('http');
    const clicks = watchClicks();

    expect(m.saveStoredFile(MODULE_FILE)).toBe(true);
    expect(clicks.hrefs).toEqual(['/api/files/module/marketing/listing-launch-packet.skill.json']);
  });

  it('percent-encodes every segment', async () => {
    // A skill file is named by the admin who uploaded it. An un-encoded '/' or '..' would address a
    // different route entirely, and a space would make the URL invalid.
    const m = await load('http');
    const clicks = watchClicks();

    m.saveStoredFile({ kind: 'moduleFile', moduleId: 'm 1', fileName: '../secrets/key.json' });
    m.saveStoredFile({ kind: 'resource', id: 'r/4' });

    expect(clicks.hrefs).toEqual([
      '/api/files/module/m%201/..%2Fsecrets%2Fkey.json',
      '/api/files/resource/r%2F4',
    ]);
  });

  it('reports the stored file as handled even when the click is refused', async () => {
    // There is nothing useful to fall back to: the body the caller holds is the prototype's
    // generated placeholder, not the file in the bucket. Saving that would hand the viewer a text
    // file claiming to be their PDF.
    const m = await load('http');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('Blocked by the user agent');
    });

    expect(m.saveStoredFile(RESOURCE)).toBe(true);
  });
});
