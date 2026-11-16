import { test, expect, type Page } from '@playwright/test';
import { HTTP_BASE, HTTP_PARITY } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

// The Clarity Call card (DECISIONS.md D-161), in a real browser, on the pages the API really serves:
// `pnpm --filter @ai/web build` and `apps/api/src/server.ts` over it, as Railway serves www. What jsdom
// cannot see is checked here: where the card lands among the page's sections, the phone's button, the
// focus ring, axe, and the width of the page. That each renderer draws it (and the pages that never
// do) is `apps/web/src/kit/clarity.test.ts`'s; what a click sends is `apps/web/src/analytics.test.ts`'s.
//
// THE HOMEPAGE is served at `/` on the marketing host only, so its request goes to the same server
// with `Host: www.amplifiedimpact.io` (the config sets MARKETING_HOST to it). The page's address stays
// 127.0.0.1, so `/analytics.js` loads no tag, and nothing else may leave the machine either: every
// request to another host is aborted, and the booking page's tab is answered here.

test.skip(!HTTP_PARITY, 'Needs the local http-mode server: run with GATE=9 (or HTTP_PARITY=1).');

const HREF = 'https://api.leadconnectorhq.com/widget/booking/XNxUdrtETSpLzuFotwUH';
const MARKETING_HOST = 'www.amplifiedimpact.io';

/** The pages that carry the card: the four sales pages, /forum, and a sample of the 54 skill pages. */
const PAGES = [
  '/',
  '/offer',
  '/forum',
  '/pricing',
  '/team-build',
  '/appointment-follow-up', // a paid Claude skill
  '/perfect-week', // a free Claude skill, with the phone's sign-up bar
  '/card-bank-feed-audit', // a Grok Bot template
  '/task-sync-starter', // the starter kit, drawn as a skill page
] as const;
const WIDTHS = [320, 375, 390, 768, 1024, 1280] as const;

/**
 * Pre-existing sideways scroll the card does not cause, by page and width, and where it comes from.
 * The card is measured against these too: the page must be exactly as wide with it as without it.
 */
const ALREADY_WIDER: Readonly<Record<string, string>> = {
  '/@320': 'the homepage’s hours section: “Start Getting Them Back, Free” ends at 322px (on main too)',
};

/**
 * Opens a page as the API serves it. `/` is www's homepage unless `appHost`, which asks the app host
 * for it (the LMS). `theme` is a kit page's saved choice.
 */
async function open(
  page: Page,
  path: string,
  width: number,
  { theme, appHost = false }: { theme?: 'light' | 'dark'; appHost?: boolean } = {},
): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  if (theme) await page.addInitScript((t) => localStorage.setItem('aiw-theme', t), theme);
  await page.context().route('**/*', (r) => (r.request().url().startsWith(HTTP_BASE) ? r.fallback() : r.abort()));
  if (path === '/' && !appHost)
    await page.route(`${HTTP_BASE}/`, async (r) =>
      r.fulfill({ response: await r.fetch({ headers: { ...r.request().headers(), host: MARKETING_HOST } }) }),
    );
  const res = await page.goto(`${HTTP_BASE}${path}`);
  expect(res?.status(), path).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  if (theme) await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
}

const card = (page: Page) => page.locator('aside[data-clarity-call]');
const button = (page: Page) => card(page).locator('a');

for (const path of PAGES) {
  test.describe(`on ${path}`, () => {
    test('is there once, after the last buy block and before the footer, a plain link to the booking page in a new tab', async ({
      page,
    }) => {
      await open(page, path, 1280);
      await expect(card(page)).toHaveCount(1);
      // A www page as the API serves it: with the analytics tag, which the button's click goes through.
      await expect(page.locator('script[src="/analytics.js"]')).toHaveCount(1);
      await expect(button(page)).toHaveCount(1);
      await expect(button(page)).toHaveAttribute('href', HREF);
      await expect(button(page)).toHaveAttribute('target', '_blank');
      await expect(button(page)).toHaveAttribute('rel', 'noopener');
      await expect(button(page)).toHaveAttribute('data-ai-event', 'clarity_call_click');
      await expect(button(page)).toHaveText('Book a Free Clarity Call');
      await expect(button(page)).toBeVisible();

      const where = await page.evaluate(() => {
        const aside = document.querySelector('aside[data-clarity-call]')!;
        const footer = document.querySelector('body > footer')!;
        const box = aside.getBoundingClientRect();
        const top = box.top + scrollY;
        // Every buy block: the Pay buttons (labelled by the API), the program cards and buy panels.
        const buys = [...document.querySelectorAll('a[data-ai-cart], .plan, .buy, main .close')];
        const shown = buys.filter((b) => b.getBoundingClientRect().height > 0);
        return {
          prev: aside.previousElementSibling?.tagName,
          next: aside.nextElementSibling?.tagName,
          buys: buys.length,
          before: buys.every((b) => !!(b.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING)),
          lastBuyBottom: Math.max(0, ...shown.map((b) => b.getBoundingClientRect().bottom + scrollY)),
          top,
          bottom: box.bottom + scrollY,
          footerTop: footer.getBoundingClientRect().top + scrollY,
        };
      });
      expect([where.prev, where.next]).toEqual(['MAIN', 'FOOTER']);
      expect(where.before).toBe(true);
      // Below everything that sells, on the screen as in the markup, and above the footer.
      expect(where.top).toBeGreaterThanOrEqual(where.lastBuyBottom - 0.5);
      expect(where.bottom).toBeLessThanOrEqual(where.footerTop + 0.5);
      if (['/offer', '/forum', '/pricing', '/team-build'].includes(path)) expect(where.buys).toBeGreaterThan(0);
    });

    test('runs its button the card’s full width on a phone (390), at least 48px tall, its words 16px or more', async ({
      page,
    }) => {
      await open(page, path, 390);
      const m = await page.evaluate(() => {
        const a = document.querySelector<HTMLElement>('aside[data-clarity-call] a')!;
        const parent = a.parentElement!;
        const cs = getComputedStyle(parent);
        const inner = parent.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const r = a.getBoundingClientRect();
        return { width: r.width, inner, height: r.height, size: parseFloat(getComputedStyle(a).fontSize) };
      });
      expect(Math.abs(m.width - m.inner)).toBeLessThan(1);
      expect(m.height).toBeGreaterThanOrEqual(48);
      expect(m.size).toBeGreaterThanOrEqual(16);
      // Every word of the card at 16px or more.
      const small = await card(page).evaluate((el) =>
        [...el.querySelectorAll('*')]
          .filter((e) => e.textContent?.trim() && parseFloat(getComputedStyle(e).fontSize) < 16)
          .map((e) => e.className),
      );
      expect(small).toEqual([]);
    });

    test('shows a focus ring on its button from the keyboard', async ({ page }) => {
      await open(page, path, 1280);
      await page.keyboard.press('Tab');
      await button(page).focus();
      const ring = await button(page).evaluate((a) => {
        const cs = getComputedStyle(a);
        return {
          visible: a.matches(':focus-visible'),
          style: cs.outlineStyle,
          width: parseFloat(cs.outlineWidth),
          color: cs.outlineColor,
        };
      });
      expect(ring.visible).toBe(true);
      expect(ring.style).toBe('solid');
      expect(ring.width).toBeGreaterThanOrEqual(2);
      expect(ring.color).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    });

    test('passes axe: no serious or critical violation on the page', async ({ page }) => {
      await open(page, path, 1280);
      await expectAccessible(page);
    });

    test('adds no sideways scroll from 320 to 1280, and every part of it stays on the screen', async ({ page }) => {
      for (const width of WIDTHS) {
        await open(page, path, width);
        const m = await page.evaluate(() => {
          const aside = document.querySelector('aside[data-clarity-call]')!;
          const off = [...aside.querySelectorAll('*')]
            .filter((e) => {
              const r = e.getBoundingClientRect();
              return r.width > 0 && (r.left < -0.5 || r.right > innerWidth + 0.5);
            })
            .map((e) => `${e.tagName.toLowerCase()}.${e.className}`);
          const withCard = document.documentElement.scrollWidth;
          const next = aside.nextSibling;
          aside.remove();
          const without = document.documentElement.scrollWidth;
          next?.parentNode?.insertBefore(aside, next);
          return { off, withCard, without, inner: innerWidth };
        });
        expect(m.off, `${path} at ${width}`).toEqual([]);
        expect(m.withCard, `${path} at ${width}: the card made the page wider`).toBe(m.without);
        const known = ALREADY_WIDER[`${path}@${width}`];
        if (known) test.info().annotations.push({ type: 'pre-existing', description: `${path} at ${width}: ${known}` });
        else expect(m.withCard, `${path} at ${width}`).toBeLessThanOrEqual(m.inner);
      }
    });
  });
}

test.describe('on the kit’s pages, in both themes', () => {
  for (const path of ['/', '/pricing', '/team-build'])
    for (const theme of ['light', 'dark'] as const)
      test(`${path}, ${theme}: passes axe, its card in the theme’s own colours`, async ({ page }) => {
        await open(page, path, 390, { theme });
        await expectAccessible(page);
        const colours = await page.evaluate(() => {
          const c = getComputedStyle(document.querySelector('.cc-card')!);
          const b = getComputedStyle(document.querySelector('aside[data-clarity-call] a')!);
          return { card: c.backgroundColor, ink: b.color, fill: b.backgroundColor };
        });
        // The secondary button: no fill of its own, the theme's ink for its words.
        expect(colours.fill).toBe('rgba(0, 0, 0, 0)');
        expect(colours.ink).not.toBe(colours.card);
      });
});

test('opens the booking page in a new tab, with no way back to this page (rel="noopener")', async ({ page }) => {
  await open(page, '/offer', 1280);
  const asked: string[] = [];
  // The booking page's own tab, answered here: nothing reaches GoHighLevel.
  await page.context().route('https://api.leadconnectorhq.com/**', (r) => {
    asked.push(r.request().url());
    return r.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Booking</title><p>Booking</p>',
    });
  });
  const [tab] = await Promise.all([page.waitForEvent('popup'), button(page).click()]);
  await tab.waitForLoadState();
  expect(asked).toEqual([HREF]);
  expect(tab.url()).toBe(HREF);
  expect(await tab.evaluate(() => window.opener)).toBeNull();
  // The page that sent the visitor stays where it was.
  expect(page.url()).toBe(`${HTTP_BASE}/offer`);
});

test.describe('where it never is', () => {
  for (const path of ['/agreement', '/offer/welcome', '/terms', '/privacy', '/teams', '/ops-time-audit'])
    test(`not on ${path}`, async ({ page }) => {
      await open(page, path, 1280);
      await expect(card(page)).toHaveCount(0);
      await expect(page.locator(`a[href="${HREF}"]`)).toHaveCount(0);
      expect(await page.content()).not.toContain('leadconnectorhq');
    });

  test('not in the LMS: the app’s sign-in, on the app host', async ({ page }) => {
    await open(page, '/', 1280, { appHost: true });
    // 127.0.0.1 is the app host: `/` is the SPA, which sends a visitor to sign in.
    await expect(page.locator('body[data-app-ready="true"]')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    await expect(card(page)).toHaveCount(0);
    expect(await page.content()).not.toContain('leadconnectorhq');
  });
});
