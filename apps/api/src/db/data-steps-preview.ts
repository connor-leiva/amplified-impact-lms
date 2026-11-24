// D-242: print what the deploy's pending data steps would change, field by field, without writing anything.
//
//   DATABASE_URL=postgres://…/a-copy-of-production pnpm --filter @ai/api db:data-steps:preview
//
// The read is one read-only transaction (`previewDataMigrations`), so it cannot write even by mistake. It prints
// each pending step, then every record it would change with each field's words before and after, then what it
// would leave for staff. Nothing is sent anywhere.

import { pathToFileURL } from 'node:url';
import { close, getDb } from './client';
import { previewDataMigrations } from './data-migrations';
import type { DataMigrationPreview } from './data-migrations';

/** The preview as plain text, one field per line. Pure. */
export function previewText(steps: readonly DataMigrationPreview[]): string {
  if (!steps.length) return 'Every data step has already run. Nothing would change.\n';
  const lines: string[] = [];
  for (const s of steps) {
    lines.push(`== ${s.id}: ${s.describe}`, `   ${s.changes.length} record(s) would change, ${s.skipped.length} left for staff`);
    for (const c of s.changes) {
      lines.push(`-- ${c.target.type} ${c.target.id} (${c.target.label})`);
      const before = (c.before ?? {}) as Record<string, unknown>;
      const after = (c.after ?? {}) as Record<string, unknown>;
      for (const key of Object.keys(after)) {
        lines.push(`   ${key}`, `     before: ${JSON.stringify(before[key])}`, `     after:  ${JSON.stringify(after[key])}`);
      }
    }
    for (const k of s.skipped) lines.push(`!! ${k.id}: ${k.reason}`);
  }
  return `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  try {
    process.stdout.write(previewText(await previewDataMigrations(getDb())));
  } finally {
    await close();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err: unknown) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
