// D-122: GET /api/health/library, the read-only check that a Skill Library download link resolves.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import { LIBRARY_ROWS } from '../src/billing/library-rows';
import { skillFiles, syncSkillRows } from '../src/billing/library-sync';
import { libraryStatus, resetLibraryStatus, SAMPLE } from '../src/routes/library-status';
import type { LibraryDeps } from '../src/routes/library-status';
import { resetS3, StorageConfigError } from '../src/storage';
import { resetDatabase, testDatabase } from './helpers';

const ALL_IDS = LIBRARY_ROWS.map((r) => r.id);
const ALL_KEYS = skillFiles().map((f) => f.key);
const SIGNED = 'https://bucket.example/skills/x?X-Amz-Credential=AKIDEXAMPLE&X-Amz-Signature=abc';

const deps = (over: Partial<LibraryDeps> = {}): LibraryDeps => ({
  publishedIds: async () => ALL_IDS,
  listKeys: async () => ALL_KEYS,
  presign: async () => SIGNED,
  probe: async () => 206,
  urlStyle: () => 'path',
  ...over,
});

describe('libraryStatus', () => {
  it('is ok when every row is published, every ZIP is in the bucket and a paid file’s link answers', async () => {
    const seen: string[] = [];
    const out = await libraryStatus(deps({ presign: async (key) => (seen.push(key), SIGNED) }));
    expect(out).toEqual({
      ok: true,
      storage: 'configured',
      urlStyle: 'path',
      rows: { published: ALL_IDS.length, expected: ALL_IDS.length },
      files: { inBucket: ALL_KEYS.length, expected: ALL_KEYS.length },
      link: { status: 206, resolves: true },
      error: null,
    });
    // The download route's own key, for a skill a paying plan opens and a free visitor cannot.
    expect(seen).toEqual([SAMPLE.key]);
    expect(LIBRARY_ROWS.find((r) => SAMPLE.key.startsWith(`skills/${r.id}/`))!.free).toBe(false);
    // Never the link, a credential or a key.
    expect(JSON.stringify(out)).not.toMatch(/http|X-Amz|AKID|skills\//);
  });

  it('says how many ZIPs are missing, and is not ok', async () => {
    const out = await libraryStatus(deps({ listKeys: async () => ALL_KEYS.slice(1) }));
    expect(out).toMatchObject({ ok: false, files: { inBucket: ALL_KEYS.length - 1 } });
  });

  it('is not ok when the link does not answer 200 or 206', async () => {
    expect(await libraryStatus(deps({ probe: async () => 403 }))).toMatchObject({ ok: false, link: { status: 403, resolves: false } });
  });

  it('says the storage is missing, and touches nothing else, with no S3_* settings', async () => {
    let listed = false;
    const out = await libraryStatus(
      deps({
        urlStyle: () => {
          throw new StorageConfigError('File storage is not configured: S3_BUCKET is not set.');
        },
        listKeys: async () => ((listed = true), ALL_KEYS),
      }),
    );
    expect(out).toMatchObject({ ok: false, storage: 'missing', error: 'storage-missing', urlStyle: null, link: { status: null } });
    expect(listed).toBe(false);
  });

  it('names the step that failed with a fixed word, never the error’s message', async () => {
    const boom = async (): Promise<never> => {
      throw new Error('secret-looking detail https://bucket.example?X-Amz-Credential=AKIDEXAMPLE');
    };
    for (const [over, error] of [
      [{ listKeys: boom }, 'list-failed'],
      [{ presign: boom }, 'presign-failed'],
      [{ probe: boom }, 'fetch-failed'],
    ] as const) {
      const out = await libraryStatus(deps(over));
      expect(out.error).toBe(error);
      expect(JSON.stringify(out)).not.toMatch(/secret|http|AKID/);
    }
  });

  it('counts only the catalogs’ published rows', async () => {
    const out = await libraryStatus(deps({ publishedIds: async () => [...ALL_IDS.slice(2), 'not-in-the-catalog'] }));
    expect(out).toMatchObject({ ok: false, rows: { published: ALL_IDS.length - 2, expected: ALL_IDS.length } });
  });
});

describe('GET /api/health/library', () => {
  const saved = { ...process.env };
  beforeAll(async () => {
    await testDatabase();
    await resetDatabase(seedForDatabase('live'));
  });
  afterEach(() => {
    process.env = { ...saved };
    resetS3();
    resetLibraryStatus();
  });

  it('answers with no session, counts the rows, and says the storage is missing when it is', async () => {
    for (const k of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_ENDPOINT', 'S3_REGION', 'S3_URL_STYLE']) delete process.env[k];
    resetS3();
    await syncSkillRows((await testDatabase()) as never);
    const app = await build({ logger: false });
    const res = await app.inject({ method: 'GET', url: '/api/health/library' });
    await app.close();
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.json()).toMatchObject({
      ok: false,
      storage: 'missing',
      error: 'storage-missing',
      rows: { published: ALL_IDS.length, expected: ALL_IDS.length },
    });
  });
});
