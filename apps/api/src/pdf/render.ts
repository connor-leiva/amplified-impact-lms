// D-229 (B-18, Phase 7): the intake as a PDF, in the package's placeholder look (Connor, Nov 21: "Ship placeholder
// look"), until the designed template arrives (Q-14). The HTML is `form-pdf.ts` (the package's, converted); headless
// Chromium prints it, as the package's `tools/make-pdf.mjs` does: setContent, the fonts, then `pdf()` with the page's
// own size and its backgrounds.
//
// THE BROWSER. `@sparticuz/chromium` ships a Chromium that runs on the host as it is (no system packages, whichever
// builder Railway uses): its only libraries beyond glibc are NSS's (`libnss3`, `libnspr4`, `libexpat`…), which a slim
// image lacks. The package ships those too (`bin/al2023.tar.br`) but unpacks them only on AWS Lambda, so they are
// unpacked here and handed to the browser alone (`LD_LIBRARY_PATH` in its environment, not this process's), on every
// host, so every host runs the same libraries. Fonts the same way: on a host with no fonts installed Chromium draws no
// text at all, not even a web font (measured: an empty fontconfig printed the sample with no words in it), so the
// browser gets the package's own font set and its fontconfig (`FONTCONFIG_PATH`) and never the host's. The PDF's words
// are Geist from data: URIs either way; with that font set the sample prints at 0 px from the package's.
// `CHROME_PATH` names another browser (a developer's Chrome, the tests').
// One render at a time, each in its own browser that is closed after it, so a stuck page can't hold memory between
// downloads.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CourseIntake } from '@ai/core/course-types';
import { formPdfHtml } from './form-pdf';

/** The repository's root, found from this file whether it runs from `src/` (tsx) or the bundle in `dist/`. */
function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, 'design-reference', 'fonts'))) return dir;
    dir = dirname(dir);
  }
  throw new Error('The repository root (design-reference/fonts) was not found.');
}

let assets: { sans: string; mono: string; logo: string } | null = null;
/** The fonts (the repo's own Geist files, byte for byte the mockup's) and the reversed academy logo, as data: URIs. */
function assetsOnce(): { sans: string; mono: string; logo: string } {
  if (assets) return assets;
  const root = repoRoot();
  const b64 = (p: string) => readFileSync(join(root, p)).toString('base64');
  assets = {
    sans: `data:font/woff2;base64,${b64('design-reference/fonts/geist-latin-wght-normal.woff2')}`,
    mono: `data:font/woff2;base64,${b64('design-reference/fonts/geist-mono-latin-wght-normal.woff2')}`,
    logo: `data:image/svg+xml;base64,${b64('handoff/lms-v3/brand/logos/amplified-impact-academy-reversed.svg')}`,
  };
  return assets;
}

/** The PDF's own words: the drawer's title and kicker (handoff/lms-v3/src/forms/week-0-intake.json › ui). */
export const PDF_UI = { title: 'Week 0 Intake', kicker: 'Week 0 · Step 1 · Owner and operator' };

export interface IntakePdfInput {
  intake: CourseIntake;
  answers: Record<string, string | string[]>;
  team: string;
  owner: string;
  cohort: string;
  submittedAt: number | null;
  /** When the answers were last saved, or now for a team that hasn't saved any. */
  savedAt: number;
}

/** "Nov 19, 2026", in the program's zone (Central), as the sample's footer line. */
const dateOf = (t: number): string => new Date(t).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' });

export function intakePdfHtml(x: IntakePdfInput): string {
  const a = assetsOnce();
  return formPdfHtml({
    form: { id: 'intake', ui: PDF_UI, intake: x.intake },
    answers: x.answers,
    meta: { team: x.team, owner: x.owner, cohort: x.cohort, status: x.submittedAt !== null ? 'Submitted' : 'Draft', date: dateOf(x.submittedAt ?? x.savedAt) },
    fonts: { sans: a.sans, mono: a.mono },
    logo: a.logo,
  });
}

/** "Week 0 Intake - Northline Realty.pdf", safe in a header. */
export const intakePdfName = (team: string): string => `${PDF_UI.title} - ${team.replace(/[^\p{L}\p{N} .,&'-]+/gu, '').trim() || 'Team'}.pdf`;

/** The bundled Chromium, unpacked to the temp directory on first use, with its own NSS libraries and fonts. */
async function bundledChromium(): Promise<{ executablePath: string; args: string[]; env: Record<string, string> }> {
  const pkg = await import('@sparticuz/chromium');
  const executablePath = await pkg.default.executablePath();
  const bin = join(dirname(createRequire(import.meta.url).resolve('@sparticuz/chromium')), '..', 'bin');
  const libs = join(await pkg.inflate(join(bin, 'al2023.tar.br')), 'lib');
  const fonts = await pkg.inflate(join(bin, 'fonts.tar.br'));
  const env = Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined && e[0] !== 'FONTCONFIG_FILE'));
  env.LD_LIBRARY_PATH = [libs, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
  env.FONTCONFIG_PATH = fonts;
  return { executablePath, args: pkg.default.args, env };
}

let queue: Promise<unknown> = Promise.resolve();

/** Print one HTML document to PDF. Renders wait their turn. */
export function renderPdf(html: string): Promise<Buffer> {
  const run = async (): Promise<Buffer> => {
    const { chromium } = await import('playwright-core');
    const chrome = (process.env.CHROME_PATH ?? '').trim();
    const launch = chrome ? { executablePath: chrome, args: [] } : await bundledChromium();
    const browser = await chromium.launch({ ...launch, headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      return await page.pdf({ preferCSSPageSize: true, printBackground: true });
    } finally {
      await browser.close();
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
