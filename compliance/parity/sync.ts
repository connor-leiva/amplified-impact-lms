// `pnpm parity:learner:sync`: write each manifest entry's `tests` from the `@parity:<ID>` tags in test
// titles, so nobody maintains that list by hand. Every other field of learner-parity.json is left as it
// is. A tag naming an unknown ID is not written anywhere; `check.ts` reports it.

import { readFileSync, writeFileSync } from 'node:fs';
import { collectListing } from './collect';
import { MANIFEST_FILE, testsById, type Manifest } from './check';

export function syncManifest(manifest: Manifest, tests: Map<string, string[]>): Manifest {
  return { ...manifest, entries: manifest.entries.map((e) => ({ ...e, tests: tests.get(e.id) ?? [] })) };
}

function main(): number {
  const text = readFileSync(MANIFEST_FILE, 'utf8');
  const manifest = JSON.parse(text) as Manifest;
  const listing = collectListing();
  const next = syncManifest(
    manifest,
    testsById(
      listing,
      manifest.entries.map((e) => e.id),
    ),
  );
  const out = JSON.stringify(next, null, 2) + '\n';
  const tagged = next.entries.filter((e) => e.tests.length).length;
  if (out === text)
    console.log(
      `learner-parity.json is up to date (${listing.length} tagged tests, ${tagged} of ${next.entries.length} IDs tagged).`,
    );
  else {
    writeFileSync(MANIFEST_FILE, out);
    console.log(
      `learner-parity.json updated (${listing.length} tagged tests, ${tagged} of ${next.entries.length} IDs tagged).`,
    );
  }
  return 0;
}

if (process.argv[1] && /sync\.ts$/.test(process.argv[1])) process.exit(main());
