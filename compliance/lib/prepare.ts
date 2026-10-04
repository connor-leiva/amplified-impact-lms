import type { Browser, Page } from '@playwright/test';
import { PHASE_NOW, VIEWPORTS, type Scenario, type Action } from './scenarios';
import { REGION, REFERENCE_HIDE_CSS } from './regions';

export type Target = 'reference' | 'app';

// 127.0.0.1 rather than `localhost`: on Windows `localhost` resolves to ::1 first, so a server
// bound only to IPv4 and one bound only to IPv6 can both "own" the same port and which one you
// reach depends on the client. Being explicit removes that ambiguity.
export const REF_PORT = Number(process.env.REF_PORT ?? 4400);
export const APP_PORT = Number(process.env.APP_PORT ?? 4173);
export const REF_BASE = `http://127.0.0.1:${REF_PORT}`;
export const APP_BASE = process.env.APP_URL ?? `http://127.0.0.1:${APP_PORT}`;

export async function open(browser: Browser, s: Scenario, target: Target) {
  const ctx = await browser.newContext({
    viewport: VIEWPORTS[s.viewport ?? 'desktop'],
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: s.tz ?? 'America/Chicago',
    colorScheme: s.theme === 'dark' ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(PHASE_NOW[s.phase ?? 'live']));
  const prefs = { phase: s.phase ?? 'live', theme: s.theme ?? 'light', tz: null, sidebar: s.sidebar ?? 'full' };
  await page.addInitScript((p) => localStorage.setItem('ai-lms-prefs', JSON.stringify(p)), prefs);

  const url =
    target === 'reference'
      ? `${REF_BASE}/${encodeURIComponent(s.refFile ?? 'Amplified Impact LMS.dc.html')}${s.ref ? `#${s.role}/${s.ref}` : ''}`
      : `${APP_BASE}${s.path}${s.path.includes('?') ? '&' : '?'}as=${s.role}&phase=${s.phase ?? 'live'}`;
  await page.goto(url);
  await settle(page, target);
  if (target === 'reference') await page.addStyleTag({ content: REFERENCE_HIDE_CSS });
  for (const a of s.actions ?? []) await act(page, a, target);
  await settle(page, target);
  return { ctx, page };
}

async function settle(page: Page, target: Target) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  if (target === 'reference') await page.waitForFunction(() => !document.body.innerText.includes('Loading…'));
  else await page.locator('[data-app-ready="true"]').waitFor();
  await page.waitForTimeout(350); // drawers 240ms, modals 200ms
  await settleAnimations(page);
}

/**
 * Wait until every finite animation has finished.
 *
 * The fixed 350ms above covers the drawer (240ms) and modal (200ms) transitions when the machine is
 * idle, but under the full 55-scenario parallel run it is not always enough: a drawer was captured
 * mid-transition roughly once in five full runs, which is fatal to the zero-diff golden
 * requirement while being invisible in an isolated run.
 *
 * Infinite animations (`ai-skeleton`, `ai-pulse`) are excluded — they never finish by design, and
 * `screenshot({ animations: 'disabled' })` resets them to their first frame anyway.
 */
async function settleAnimations(page: Page) {
  await page
    .waitForFunction(
      () =>
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .every((a) => a.playState === 'finished' || a.playState === 'idle'),
      null,
      { timeout: 5_000 },
    )
    .catch(() => {
      /* A page with a genuinely stuck finite animation still gets captured, as before. */
    });
}

async function act(page: Page, a: Action, target: Target) {
  if ('press' in a) return page.keyboard.press(a.press);
  if ('scroll' in a) return page.locator('main').evaluate((el, y) => el.scrollTo(0, y), a.scroll.y);
  if ('fill' in a) return page.getByLabel(a.fill.label).fill(a.fill.value);
  const { role, name, within, nth = 0 } = a.click;
  const scope = within ? page.locator(REGION[within]!) : page;
  // Reference rows are plain divs; the table is the last place a name appears on the page.
  if (role === 'row' && target === 'reference')
    return (a.click.nth != null ? scope.getByText(name).nth(nth) : scope.getByText(name).last()).click();
  return scope.getByRole(role, { name, exact: typeof name === 'string' }).nth(nth).click();
}
