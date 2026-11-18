import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { APP_BASE, HTTP_BASE, HTTP_PARITY, PERSONA_USER_ID } from '../../lib/prepare';

// D-170: a tab opened before a deploy, after the deploy. The deploy removed the hashed files the tab's
// old entry names (a real 404, D-137), so the next screen it lazy-loads cannot load. Simulated here by
// answering that screen's files 404 until the page reloads, which is the moment a real tab would get
// the new `index.html` and its new file names. The page must reload once, by itself, and then show the
// screen, with no "Unexpected Application Error!" at any point; a deploy that is itself missing the
// file must reload once and then show the error, never loop.
//
// Fixture mode always; http mode too (the API serving the real build) when the run has it (GATE=7+).

const NOW = '2026-12-07T10:42:00-06:00';
const ERROR_SCREEN = 'Unexpected Application Error';
const FLAG = 'ai-stale-chunk-reload';

type Mode = { name: 'fixture' | 'http'; base: string };
const MODES: Mode[] = [
  { name: 'fixture', base: APP_BASE },
  ...(HTTP_PARITY ? [{ name: 'http' as const, base: HTTP_BASE }] : []),
];

/** A desktop page for `role`, in fixture mode by `?as=`, in http mode by a real session. */
async function tab(browser: Browser, mode: Mode, role: 'agent' | 'admin') {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', viewport: { width: 1440, height: 900 } });
  if (mode.name === 'http') {
    const res = await ctx.request.post(`${HTTP_BASE}/api/test/session`, { data: { userId: PERSONA_USER_ID[role] } });
    expect(res.ok(), await res.text()).toBe(true);
  }
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() => {
    if (!localStorage.getItem('ai-lms-prefs'))
      localStorage.setItem(
        'ai-lms-prefs',
        JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' }),
      );
  });
  return {
    ctx,
    page,
    url: (path: string) => (mode.name === 'http' ? `${mode.base}${path}` : `${mode.base}${path}?as=${role}`),
  };
}

/**
 * Watch the tab: every document load, and whether React Router's error screen is ever drawn, even for
 * a frame (a MutationObserver in each document, reporting out).
 */
async function watch(ctx: BrowserContext, page: Page) {
  const seen = { documents: 0, errorScreen: false };
  await ctx.exposeBinding('__sawErrorScreen', () => {
    seen.errorScreen = true;
  });
  await page.addInitScript((text) => {
    const check = () => {
      if (document.body?.innerText.includes(text))
        (window as unknown as { __sawErrorScreen: () => void }).__sawErrorScreen();
    };
    new MutationObserver(check).observe(document, { childList: true, subtree: true, characterData: true });
  }, ERROR_SCREEN);
  page.on('request', (req) => {
    if (req.isNavigationRequest() && req.frame() === page.mainFrame()) seen.documents++;
  });
  return seen;
}

/** Answer a screen's hashed files (`/assets/<Screen>-<hash>.js|css`) 404, as a deploy leaves them, while `gone()`. */
async function removeFiles(page: Page, screen: string, kinds: 'js' | 'css' | 'both', gone: () => boolean) {
  const ext = kinds === 'both' ? '(?:js|css)' : kinds;
  const asked: string[] = [];
  await page.route(new RegExp(`/assets/${screen}-[\\w-]+\\.${ext}$`), (route) => {
    if (!gone()) return route.continue();
    asked.push(new URL(route.request().url()).pathname);
    return route.fulfill({ status: 404, contentType: 'text/plain; charset=utf-8', body: 'Not found' });
  });
  return asked;
}

for (const mode of MODES) {
  test(`${mode.name}: a screen whose files a deploy removed reloads the page once, then opens @g9`, async ({
    browser,
  }) => {
    const { ctx, page, url } = await tab(browser, mode, 'agent');
    const seen = await watch(ctx, page);
    await page.goto(url('/'));
    await page.locator('[data-app-ready="true"]').waitFor();
    expect(seen.documents).toBe(1);

    // The deploy: Sessions' files are gone for this document, and back once the tab has reloaded.
    const missing = await removeFiles(page, 'Sessions', 'both', () => seen.documents === 1);
    await page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Sessions', exact: true }).click();

    await expect.poll(() => seen.documents).toBe(2);
    await page.locator('[data-app-ready="true"]').waitFor();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Sessions');
    expect(missing.length).toBeGreaterThan(0);
    expect(seen.errorScreen).toBe(false);
    // Booted, so the guard is cleared and the next deploy can recover this tab too.
    await expect.poll(() => page.evaluate((k) => sessionStorage.getItem(k), FLAG)).toBeNull();
    // And it stays put: no second reload.
    await page.waitForTimeout(1_500);
    expect(seen.documents).toBe(2);
    await ctx.close();
  });
}

test('fixture: the reported case, Staff’s stylesheet gone (“Unable to preload CSS”), reloads once and opens Staff @g9', async ({
  browser,
}) => {
  const { ctx, page, url } = await tab(browser, MODES[0]!, 'admin');
  const seen = await watch(ctx, page);
  await page.goto(url('/admin'));
  await page.locator('[data-app-ready="true"]').waitFor();
  const missing = await removeFiles(page, 'Staff', 'css', () => seen.documents === 1);

  // As the person in the open tab would: the sidebar's Staff & Roles, which lazy-loads Staff's screen.
  const sidebar = page.locator('aside[aria-label="Primary"]');
  await sidebar.getByRole('button', { name: 'Access' }).click();
  await sidebar.getByRole('button', { name: 'Staff & Roles' }).click();

  await expect.poll(() => seen.documents).toBe(2);
  await page.locator('[data-app-ready="true"]').waitFor();
  await expect(page).toHaveURL(/\/admin\/staff/);
  await expect(page.getByRole('row', { name: /Publish modules/ })).toBeVisible();
  expect(missing.some((p) => p.endsWith('.css'))).toBe(true);
  expect(seen.errorScreen).toBe(false);
  await ctx.close();
});

test('fixture: a deploy that is itself missing the file reloads once, then shows the error, never a loop @g9', async ({
  browser,
}) => {
  const { ctx, page, url } = await tab(browser, MODES[0]!, 'agent');
  const seen = await watch(ctx, page);
  await page.goto(url('/'));
  await page.locator('[data-app-ready="true"]').waitFor();
  await removeFiles(page, 'Sessions', 'js', () => true);
  await page.locator('aside[aria-label="Primary"]').getByRole('button', { name: 'Sessions', exact: true }).click();

  await expect.poll(() => seen.documents).toBe(2);
  await expect(page.getByText(ERROR_SCREEN)).toBeVisible();
  await page.waitForTimeout(3_000);
  expect(seen.documents).toBe(2);
  await ctx.close();
});
