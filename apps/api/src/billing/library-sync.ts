// The `skills` table from the two catalogs (D-079, D-100), and their ZIPs into the bucket. What
// `pnpm --filter @ai/api skills [--upload]` runs, and the last step of the pre-deploy command on every
// deploy (docs/LAUNCH.md § 6 and § 8, step 3), so it has to be safe to repeat and quiet when nothing
// changed:
//   - a row is written only when it differs from the catalog's, so a second run changes 0 rows;
//   - every ZIP is checked BEFORE any is uploaded, so a missing file stops the run with nothing half
//     uploaded, and no row ever names a file the bucket does not have (files go up before rows);
//   - an upload puts the same bytes under the same key (`skills/<id>/<file>`), so repeating it
//     changes nothing a member can see. 122 files, 4.4 MB.
// It reads and writes only the `skills` table and the bucket's `skills/` keys: never users, teams,
// accounts, plans or progress.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Database } from '../db/client';
import { skills } from '../db/schema';
import { skillFileKey } from '../storage';
import { LIBRARY_ROWS } from './library-rows';
import type { LibraryRow } from './library-rows';
import { LAUNCH_RELEASE } from './skills-catalog';

/** Where the ZIPs are committed: the same folder www serves the free ones from. */
export const DOWNLOADS = fileURLToPath(new URL('../../../web/public/downloads/', import.meta.url));

type Files = LibraryRow['files'];
type SkillValues = Omit<typeof skills.$inferInsert, 'id'>;

/** A catalog row as the table holds it. Every skill is published and released on launch day. */
export function valuesFor(r: LibraryRow): SkillValues {
  const files = Object.fromEntries(Object.entries(r.files).filter(([, name]) => !!name)) as Files;
  return { title: r.title, summary: r.summary, sets: r.sets, free: r.free, releasedAt: LAUNCH_RELEASE, files, status: 'published' };
}

/** Postgres hands JSONB back with its keys re-ordered, so files compare by content, not by order. */
const sortedFiles = (f: Files | undefined): string =>
  JSON.stringify(Object.entries(f ?? {}).filter(([, v]) => !!v).sort(([a], [b]) => a.localeCompare(b)));

function sameRow(prev: typeof skills.$inferSelect, next: SkillValues): boolean {
  return (
    prev.title === next.title &&
    prev.summary === next.summary &&
    prev.sets === next.sets &&
    prev.free === next.free &&
    prev.releasedAt === next.releasedAt &&
    prev.status === next.status &&
    sortedFiles(prev.files) === sortedFiles(next.files)
  );
}

/** Writes each catalog row that differs from the table's, and returns the ids it wrote. */
export async function syncSkillRows(db: Database, rows: readonly LibraryRow[] = LIBRARY_ROWS): Promise<string[]> {
  const existing = new Map((await db.select().from(skills)).map((s) => [s.id, s]));
  const changed: string[] = [];
  for (const r of rows) {
    const values = valuesFor(r);
    const prev = existing.get(r.id);
    if (prev && sameRow(prev, values)) continue;
    await db.insert(skills).values({ id: r.id, ...values }).onConflictDoUpdate({ target: skills.id, set: values });
    changed.push(r.id);
  }
  return changed;
}

/** Every ZIP the catalogs name, by its bucket key, with the command that rebuilds it. */
export function skillFiles(rows: readonly LibraryRow[] = LIBRARY_ROWS, dir: string = DOWNLOADS) {
  return rows.flatMap((r) =>
    Object.values(r.files)
      .filter((name): name is string => !!name)
      .map((name) => ({ key: skillFileKey(r.id, name), path: `${dir}${name}`, name, build: r.build })),
  );
}

export type Put = (key: string, body: Uint8Array, contentType: string) => Promise<void>;

/**
 * Puts every ZIP in the bucket, after checking every one exists. Returns the names it could not find
 * (and uploads nothing) or the number it uploaded.
 */
export async function uploadSkillFiles(
  put: Put,
  rows: readonly LibraryRow[] = LIBRARY_ROWS,
  dir: string = DOWNLOADS,
): Promise<{ missing: { name: string; build: string }[]; uploaded: number }> {
  const files = skillFiles(rows, dir);
  const missing = files.filter((f) => !existsSync(f.path)).map(({ name, build }) => ({ name, build }));
  if (missing.length) return { missing, uploaded: 0 };
  for (const f of files) await put(f.key, readFileSync(f.path), 'application/zip');
  return { missing: [], uploaded: files.length };
}
