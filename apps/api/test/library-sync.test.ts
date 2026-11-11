// The Library's half of the deploy's pre-deploy step (`skills --upload`, .railway/railway.ts): the
// `skills` rows from the two catalogs and every ZIP into the bucket. Run on every deploy, so the
// properties under test are the ones that make repeating it safe.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { skills } from '../src/db/schema';
import type { Database } from '../src/db/client';
import { LIBRARY_ROWS } from '../src/billing/library-rows';
import { skillFiles, syncSkillRows, uploadSkillFiles } from '../src/billing/library-sync';
import { loadDb, resetDatabase, testDatabase } from './helpers';

let handle: Database;

beforeAll(async () => {
  handle = await testDatabase();
  // A database with learners, teams and their progress, to show the sync never reaches them.
  await resetDatabase(seedForDatabase('live'));
});

describe('the skills rows (skills)', () => {
  it('writes every row once, then 0 rows on every run after, never touching learners, teams or progress', async () => {
    const before = await loadDb();
    expect(await syncSkillRows(handle)).toHaveLength(LIBRARY_ROWS.length);
    expect(await syncSkillRows(handle)).toEqual([]);
    expect(await syncSkillRows(handle)).toEqual([]);
    const after = await loadDb();
    expect(after.users).toEqual(before.users);
    expect(after.teams).toEqual(before.teams);
    expect(after.staff).toEqual(before.staff);
    expect(await handle.select().from(skills)).toHaveLength(LIBRARY_ROWS.length);
  });

  it('rewrites only a row that drifted from the catalog', async () => {
    const id = LIBRARY_ROWS[0]!.id;
    await handle.update(skills).set({ free: !LIBRARY_ROWS[0]!.free, status: 'hidden' }).where(eq(skills.id, id));
    expect(await syncSkillRows(handle)).toEqual([id]);
    expect(await syncSkillRows(handle)).toEqual([]);
  });
});

describe('the ZIPs (skills --upload)', () => {
  let empty: string;
  beforeAll(() => {
    empty = mkdtempSync(join(tmpdir(), 'no-zips-'));
  });
  afterAll(() => rmSync(empty, { recursive: true, force: true }));

  it('puts every committed ZIP under skills/<id>/, the same bytes under the same keys each run', async () => {
    const runs: Map<string, number>[] = [];
    for (let i = 0; i < 2; i++) {
      const put = new Map<string, number>();
      const out = await uploadSkillFiles(async (key, body, type) => {
        expect(type).toBe('application/zip');
        put.set(key, body.byteLength);
      });
      expect(out.missing).toEqual([]);
      expect(out.uploaded).toBe(skillFiles().length);
      runs.push(put);
    }
    expect([...runs[0]!.keys()].every((k) => k.startsWith('skills/'))).toBe(true);
    expect(runs[1]).toEqual(runs[0]);
  });

  it('uploads nothing when a ZIP is missing, and names it with the command that builds it', async () => {
    const put = async () => {
      throw new Error('nothing may be uploaded');
    };
    const out = await uploadSkillFiles(put, LIBRARY_ROWS, `${empty}/`);
    expect(out.uploaded).toBe(0);
    expect(out.missing.length).toBe(skillFiles().length);
    expect(out.missing[0]!.build).toMatch(/^node scripts\//);
  });
});
