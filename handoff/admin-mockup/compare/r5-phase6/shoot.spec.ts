// R-5 Phase 6 (D-265): Program's screens, fixture build, the launch database (README.md). Each page its whole length, at
// 1440, 1280 and 390 (Connor's rule: 1280 and 390 for every screen), and at 1024 too for a page with a table (Curriculum's
// weeks, the Resource Vault, Course Settings' Glossary and Words). Device scale 2, America/Denver.
//
//   pnpm --filter @ai/web preview:fixture   # on :4173
//   npx playwright test -c handoff/admin-mockup/compare/r5-phase6/shoot.config.ts shoot
import { test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { launchDb } from '../../../../compliance/lib/launch-db';
import { openAt } from '../../../../compliance/lib/selling-world';

const OUT = fileURLToPath(new URL('.', import.meta.url));

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}
async function shootPage(page: Page, name: string, width: number): Promise<void> {
  await settle(page);
  // The admin frame scrolls inside itself, so the page's whole length is its tallest scroller's: the viewport grows to it.
  const view = page.viewportSize()!;
  const tall = await page.evaluate(() =>
    Math.max(
      document.documentElement.scrollHeight,
      ...[...document.querySelectorAll<HTMLElement>('*')]
        .filter((e) => e.scrollHeight > e.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY))
        .map((e) => e.scrollHeight + e.getBoundingClientRect().top),
    ),
  );
  await page.setViewportSize({ width: view.width, height: Math.max(view.height, Math.ceil(tall)) });
  await settle(page);
  await page.screenshot({ path: `${OUT}${name}-${width}.png`, fullPage: true });
  await page.setViewportSize(view);
}
async function go(page: Page, path: string): Promise<void> {
  const url = new URL(page.url());
  const [pathname, query] = path.split('?');
  url.pathname = pathname!;
  for (const [k, v] of new URLSearchParams(query ?? '')) url.searchParams.set(k, v);
  if (!query) url.searchParams.delete('section');
  await page.goto(url.toString());
  await page.locator('body[data-app-ready="true"]').waitFor();
}

const TABLE_WIDTHS = [1440, 1280, 1024, 390];
const WIDTHS = [1440, 1280, 390];

for (const width of TABLE_WIDTHS) {
  test(`pages with a table at ${width}`, async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/program', {
      db: launchDb(),
      width,
      context: { deviceScaleFactor: 2 },
    });
    await shootPage(page, 'curriculum', width);
    await go(page, '/admin/program/vault');
    await shootPage(page, 'vault', width);
    await go(page, '/admin/program/course?section=glossary');
    await shootPage(page, 'course-settings-glossary', width);
    await go(page, '/admin/program/course?section=words');
    await shootPage(page, 'course-settings-words', width);
    await close();
  });
}

for (const width of WIDTHS) {
  test(`a week and Course Settings at ${width}`, async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/program/weeks/accelerator-week-1', {
      db: launchDb(),
      width,
      context: { deviceScaleFactor: 2 },
    });
    for (const s of ['steps', 'basics', 'page', 'live', 'cards', 'kit']) {
      await go(page, `/admin/program/weeks/accelerator-week-1?section=${s}`);
      await shootPage(page, `week-${s}`, width);
    }
    await go(page, '/admin/program/weeks/accelerator-week-0?section=forms');
    await shootPage(page, 'week0-forms', width);
    for (const s of ['intro', 'roles', 'rules', 'before', 'after', 'join']) {
      await go(page, `/admin/program/course?section=${s}`);
      await shootPage(page, `course-settings-${s}`, width);
    }
    await go(page, '/admin/cohort/dec26/submissions?week=accelerator-week-1');
    await shootPage(page, 'cohort-submissions', width);
    await close();
  });
}
