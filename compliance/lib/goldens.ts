// Where a golden lives, and the one place that decides it.
//
// WHY THE PNGs ARE SPLIT BY PLATFORM AND THE FINGERPRINTS ARE NOT
//
// Measured against the CI container's own capture of the same unmodified `design-reference/`:
//
//   .json fingerprints   98 of 98 byte-identical between Windows and Linux
//   .png screenshots     98 of 98 differ; 60 of them by more than the 1% maxDiffPixelRatio
//                        (median 1.19%, worst 2.99% on shell-locked-preview-dialog)
//
// Chromium rasterizes text per platform, and no launch flag removes it — `playwright.config.ts`
// already turns off LCD filtering, subpixel positioning and hinting, which is what makes a capture
// reproducible on ONE machine. It does not make two operating systems agree. So a single committed
// PNG set cannot serve both: whichever platform did not capture it fails 60 scenarios, and the
// failures look exactly like a regression.
//
// Every diff is under 3% and the fingerprints match exactly, which is the evidence that this is
// rasterization and not layout — a real layout or copy regression moves a fingerprint, or moves far
// more than 3% of pixels.
//
// This is Playwright's own convention for the same problem (its `toMatchSnapshot` path template
// supports `{platform}` for exactly this reason). The fingerprints stay shared and unduplicated
// because they are platform-independent BY MEASUREMENT, not by assumption — and they are the
// goldens that carry the copy and the typography, which is what CLAUDE.md's "copy is exact" rule
// actually rides on.
//
// AUTHORITY. `compliance/goldens/linux/` is authoritative: it is what the CI `goldens` job
// re-captures and diffs, in the pinned container, on every push. `win32/` is a development
// convenience so the gate can run on a Windows machine with no Docker — it is NOT authority, and
// when the two disagree about whether the app matches the reference, CI is right. See DECISIONS.md
// D-001 and D-020.

import { mkdir } from 'node:fs/promises';

/** The platform keys a golden set can exist for. `process.platform`'s values, narrowed. */
export type GoldenPlatform = 'win32' | 'linux' | 'darwin';

const KNOWN: GoldenPlatform[] = ['win32', 'linux', 'darwin'];

/**
 * Which set this run reads and writes.
 *
 * `GOLDEN_PLATFORM` overrides the host, and CI sets it explicitly rather than relying on
 * inference: a capture job that silently wrote `darwin/` because it moved to a macOS runner would
 * leave the authoritative Linux set untouched and still pass its own diff check.
 */
export const PLATFORM: GoldenPlatform = (() => {
  const forced = process.env.GOLDEN_PLATFORM;
  if (forced) {
    if (!(KNOWN as string[]).includes(forced))
      throw new Error(`GOLDEN_PLATFORM must be one of ${KNOWN.join(', ')}, not ${JSON.stringify(forced)}`);
    return forced as GoldenPlatform;
  }
  const host = process.platform;
  if (!(KNOWN as string[]).includes(host))
    throw new Error(`no golden set for platform ${host}. Capture one, or set GOLDEN_PLATFORM.`);
  return host as GoldenPlatform;
})();

/** `compliance/goldens/` — the fingerprints live here, shared across platforms. */
export const GOLDEN_ROOT = new URL('../goldens/', import.meta.url);

/** `compliance/goldens/<platform>/` — the screenshots for THIS run's platform. */
export const PNG_DIR = new URL(`${PLATFORM}/`, GOLDEN_ROOT);

/**
 * The snapshot name `toMatchSnapshot` is given, as path segments.
 *
 * It must resolve, through `snapshotPathTemplate`, to exactly the file `pngPath` returns. If the
 * two ever disagree Playwright does not fail — it WRITES the app's own render as the expected
 * snapshot and every later run compares the app against itself (D-008). `parity.spec.ts` asserts
 * the file exists before comparing, which turns that silent failure into a loud one.
 *
 * Verified empirically when this split was made, not assumed: putting a different screen's image
 * at `win32/states-light-page.png` made the run fail and print `Snapshot: win32\states-light-page.png`,
 * which is the file `pngPath` returns.
 */
export const snapshotName = (stem: string): string[] => [PLATFORM, `${stem}.png`];

export const pngPath = (stem: string): URL => new URL(`${stem}.png`, PNG_DIR);

/** Shared: one fingerprint per region, for every platform. */
export const jsonPath = (stem: string): URL => new URL(`${stem}.json`, GOLDEN_ROOT);

/** Capture writes into the platform directory, which may not exist on a first run. */
export const ensurePngDir = async (): Promise<void> => {
  await mkdir(PNG_DIR, { recursive: true });
};
