// Gate 8's last two automated lines, which are ALREADY COVERED — and this file is how the
// checklist gets ticked without a second copy that drifts from the first.
//
//   "The WebVTT parser round-trips the Marketing transcript fixture."
//      → packages/core/test/vtt.test.ts
//         describe '§8.3 the Marketing transcript fixture round-trips @g8'
//         it      'parseVtt(toVtt(t)) is the identical array, cue for cue @g8'
//
//   "Email templates render snapshots (`@react-email/render` → HTML) that contain the exact subject
//    and the CTA label."
//      → apps/api/src/email/templates/templates.test.tsx
//         describe 'email templates · § 8.1 subjects and CTAs @g8'
//         it      `${name} renders its exact subject and its CTA label @g8`, over all nine templates
//
// ================================================================================================
// WHY A TEST AND NOT A LINE IN THE REPORT
// ================================================================================================
// Gate 8's automated list is an artifact in its own right: `pnpm gate 8` is what decides whether the
// phase ships, and "that one is covered over there" is a claim somebody has to be able to re-check
// in a year. Two ways to honour it, and only one of them is safe:
//
//   COPY THE ASSERTION HERE. Then there are two oracles for one behaviour. `parseVtt`'s contract is
//   thirty-odd cases wide (cue identifiers, CRLF, entities, malformed input with line numbers) and
//   the templates' is nine files × five properties; a second, thinner copy of either would pass
//   while the real one changed underneath it, and the two would disagree without anything failing.
//   The repository already carries one instance of exactly that hazard, recorded in `files.ts`'s
//   header: `vaultFileName` is a second copy of a web view-model's derivation, kept only because it
//   has nowhere else to live and pinned to literals so the drift is loud.
//
//   ASSERT THE COVERAGE EXISTS, WHERE IT IS. That is this file. It reads the two suites off disk and
//   requires the named cases to still be there. It cannot tell you the parser is correct — the file
//   it points at does that, in the package that owns the code — but it can stop the checklist from
//   silently referring to a test somebody deleted or renamed, which is the one failure the report
//   line could not survive.
//
// SO THIS IS A DELIBERATE COUPLING TO TWO TEST TITLES. If either is reworded, this fails with a
// message naming the checklist line that lost its coverage, and the fix is to update the title here
// — not to delete the assertion. Stated plainly so the next reader does not treat it as an accident.
//
// Both suites are already tagged `@g8`, so they run inside Gate 8's own grep as well; that is
// asserted too, because a case that exists but is not in the gate's selection is not coverage the
// gate has.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Each entry is one line of Gate 8's automated list that this sprint did NOT re-implement, with the
 * file that does implement it and the exact case titles the claim rests on.
 *
 * `from` is resolved against this module's own URL rather than against `process.cwd()`: vitest is
 * invoked from the package root by `pnpm --filter @ai/api test` and from the repository root by
 * `pnpm gate 8`, and a relative path would resolve differently under the two.
 */
const COVERED = [
  {
    checklist: 'The WebVTT parser round-trips the Marketing transcript fixture.',
    from: '../../../../packages/core/test/vtt.test.ts',
    where: 'packages/core/test/vtt.test.ts',
    cases: [
      '§8.3 the Marketing transcript fixture round-trips @g8',
      'parseVtt(toVtt(t)) is the identical array, cue for cue @g8',
    ],
  },
  {
    checklist:
      'Email templates render snapshots (@react-email/render → HTML) that contain the exact subject and the CTA label.',
    from: '../../src/email/templates/templates.test.tsx',
    where: 'apps/api/src/email/templates/templates.test.tsx',
    cases: ['email templates · § 8.1 subjects and CTAs @g8', 'renders its exact subject and its CTA label @g8'],
  },
] as const;

describe('Gate 8 · the two checklist lines that are covered elsewhere @g8', () => {
  for (const entry of COVERED) {
    it(`"${entry.checklist}" is covered by ${entry.where} @g8`, () => {
      let source: string;
      try {
        source = readFileSync(fileURLToPath(new URL(entry.from, import.meta.url)), 'utf8');
      } catch (err) {
        throw new Error(
          `Gate 8's line "${entry.checklist}" is covered by ${entry.where}, which could not be read: ` +
            `${err instanceof Error ? err.message : String(err)}. Either restore that suite or write ` +
            'the case here — the checklist line has no coverage as things stand.',
        );
      }

      for (const title of entry.cases) {
        expect(
          source.includes(title),
          `${entry.where} no longer contains the case "${title}", which is what Gate 8's line ` +
            `"${entry.checklist}" is ticked by. Update this table if it was renamed; write the test ` +
            'if it was deleted.',
        ).toBe(true);
      }

      // The case has to be inside the gate's own selection, not merely inside the repository: a
      // `@g8` tag is how `pnpm gate 8` picks it up, and an untagged test is coverage nobody runs at
      // the moment that matters.
      expect(entry.cases.every((title) => title.includes('@g8'))).toBe(true);
    });
  }

  it('names every automated line of Gate 8, so the list cannot be ticked by omission @g8', () => {
    // The checklist has eight automated lines. Six are implemented in this directory, one file per
    // line; two are the entries above. The count is asserted because the honest failure mode of a
    // "covered elsewhere" note is the line that was quietly dropped from both places.
    const implementedHere = [
      'invite-email.test.ts',
      'announcement-email.test.ts',
      'session-reminder.test.ts',
      'join-window.test.ts',
      // One file carries two lines: the Team-tier download and the two `upload-url` refusals are
      // both § 8.2 and share the S3 fixture.
      'file-access.test.ts (download)',
      'file-access.test.ts (upload-url)',
    ];
    expect(implementedHere.length + COVERED.length).toBe(8);
  });
});
