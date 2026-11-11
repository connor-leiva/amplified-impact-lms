// GET /api/health/library: can a buyer download from the Skill Library right now? (D-122)
//
// A Skill Library download is GET /api/skills/:id/download/:kind: the plan check (`canOpenSkill`, D-079,
// tested per cart in offer.test.ts), then `presignGet` on the file's key in the bucket, then a 302 to
// that five-minute link. Checking it end to end from outside would need a paying buyer's session. This
// checks everything after the plan check, the part a deploy can break, with no session and no secret:
//
//   - the `skills` rows: how many of the catalogs' rows are published;
//   - the bucket: how many of the catalogs' ZIPs are there, by name (a listing; no object is read);
//   - one real link: the same `presignGet` the download route calls, for a paid skill's file, fetched
//     here with `Range: bytes=0-0` (one byte). Only the HTTP status comes back.
//
// It returns counts, the URL style and that status: never the link, a key, a credential or an error
// message. Results are kept for a minute, so calling it in a loop cannot turn into bucket traffic.

import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client';
import { skills } from '../db/schema';
import { LIBRARY_ROWS } from '../billing/library-rows';
import { skillFiles } from '../billing/library-sync';
import { listKeys, presignGet, skillFileKey, storageUrlStyle, StorageConfigError } from '../storage';
import type { S3UrlStyle } from '../storage';

export const LIBRARY_STATUS_PATH = '/api/health/library';

export interface LibraryStatus {
  ok: boolean;
  storage: 'configured' | 'missing';
  urlStyle: S3UrlStyle | null;
  rows: { published: number; expected: number };
  files: { inBucket: number; expected: number };
  /** One paid skill's file, through the download route's own presign, fetched for one byte. */
  link: { status: number | null; resolves: boolean };
  /** What stopped the check, as a fixed word: never an error message, which can carry details. */
  error: 'storage-missing' | 'list-failed' | 'presign-failed' | 'fetch-failed' | null;
}

export interface LibraryDeps {
  publishedIds: () => Promise<string[]>;
  listKeys: (prefix: string) => Promise<string[]>;
  presign: (key: string, filename: string) => Promise<string>;
  /** The HTTP status of a one-byte GET of a presigned link. */
  probe: (url: string) => Promise<number>;
  urlStyle: () => S3UrlStyle;
}

/** A paid skill's Claude file: what a paying plan downloads and a free visitor cannot. */
export const SAMPLE = (() => {
  const row = LIBRARY_ROWS.find((r) => !r.free && r.files.claude)!;
  return { key: skillFileKey(row.id, row.files.claude!), name: row.files.claude! };
})();

const realDeps: LibraryDeps = {
  publishedIds: async () =>
    (await getDb().select({ id: skills.id }).from(skills).where(eq(skills.status, 'published'))).map((r) => r.id),
  listKeys,
  presign: (key, filename) => presignGet(key, filename),
  probe: async (url) => {
    const res = await fetch(url, { headers: { range: 'bytes=0-0' }, signal: AbortSignal.timeout(5000) });
    await res.body?.cancel();
    return res.status;
  },
  urlStyle: storageUrlStyle,
};

export async function libraryStatus(deps: LibraryDeps = realDeps): Promise<LibraryStatus> {
  const catalog = new Set(LIBRARY_ROWS.map((r) => r.id));
  const published = (await deps.publishedIds()).filter((id) => catalog.has(id)).length;
  const expectedFiles = skillFiles().map((f) => f.key);
  const out: LibraryStatus = {
    ok: false,
    storage: 'configured',
    urlStyle: null,
    rows: { published, expected: catalog.size },
    files: { inBucket: 0, expected: expectedFiles.length },
    link: { status: null, resolves: false },
    error: null,
  };
  try {
    out.urlStyle = deps.urlStyle();
  } catch (err) {
    if (err instanceof StorageConfigError) return { ...out, storage: 'missing', error: 'storage-missing' };
    throw err;
  }
  try {
    const present = new Set(await deps.listKeys('skills/'));
    out.files.inBucket = expectedFiles.filter((k) => present.has(k)).length;
  } catch {
    return { ...out, error: 'list-failed' };
  }
  let url: string;
  try {
    url = await deps.presign(SAMPLE.key, SAMPLE.name);
  } catch {
    return { ...out, error: 'presign-failed' };
  }
  try {
    out.link.status = await deps.probe(url);
  } catch {
    return { ...out, error: 'fetch-failed' };
  }
  out.link.resolves = out.link.status === 200 || out.link.status === 206;
  out.ok = out.rows.published === out.rows.expected && out.files.inBucket === out.files.expected && out.link.resolves;
  return out;
}

let cached: { at: number; value: Promise<LibraryStatus> } | null = null;
const KEEP_MS = 60_000;

/** Forgets the kept result (tests). */
export const resetLibraryStatus = (): void => {
  cached = null;
};

export function registerLibraryStatusRoute(app: FastifyInstance): void {
  app.get(LIBRARY_STATUS_PATH, async (_req, reply) => {
    const now = Date.now();
    if (!cached || now - cached.at > KEEP_MS) {
      const value = libraryStatus();
      cached = { at: now, value };
      value.catch(() => {
        cached = null;
      });
    }
    return reply.header('cache-control', 'no-store').send(await cached.value);
  });
}
