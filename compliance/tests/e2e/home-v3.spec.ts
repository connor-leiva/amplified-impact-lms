import { test, expect, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';

// Homepage v3 (docs/design/home-v3), in a real browser: what jsdom cannot see, which is layout.
//
// The fixture build carries www's homepage, v3, at /home.html, built exactly as an ordinary
// `pnpm build` builds it (the API serves that file at `/` on www). The page is settled here (reduced
// motion), which at 390 is also what every phone gets.
//
// WHY BOXES, NOT SCROLL WIDTH. S4's and S5's stages clip their overflow (`overflow: clip`), so
// content pushed past a panel's edge is cut off without the page ever scrolling sideways, and a
// "no sideways scroll" check passes. That is how S5's first panel lost the right end of its tag,
// its Morning Brief card and its caption at 390. These tests measure each part's box against the
// screen and against every ancestor that clips.

const THEMES = ['dark', 'light'] as const;

/**
 * Opens the production render, settled (reduced motion) unless `motion`. The fixture server has no
 * API: every call answers 503 (the kit header asks who is signed in), and with `offer: 'hangs'`
 * `/api/offer` never answers at all.
 */
async function open(
  page: Page,
  theme: (typeof THEMES)[number],
  width: number,
  { motion = false, offer = 'fails' }: { motion?: boolean; offer?: 'fails' | 'hangs' } = {},
) {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: motion ? 'no-preference' : 'reduce' });
  await page.addInitScript((t) => localStorage.setItem('aiw-theme', t), theme);
  await page.route('**/api/**', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  // Playwright runs the newest route first: this one holds /api/offer's request open for good.
  if (offer === 'hangs') await page.route('**/api/offer', () => new Promise<void>(() => undefined));
  await page.goto(`${APP_BASE}/home.html`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
}

/** A day before the founding deadline (11:59 PM Mountain, November 30): 18 days and some hours before it. */
const BEFORE_DEADLINE = new Date('2026-11-12T20:00:00Z');

/**
 * S11's and S12's seat meter (with its seats left, `data-left`), every proof line and every program
 * button of the state the page starts on ("open"), as the browser shows them on load: how many there
 * are, and what keeps any of them from showing. Opacity is checked on the element and every ancestor, so
 * a faded wrapper counts. Parts kept for the sold-out and closed states are left out.
 */
async function offerOnLoad(page: Page): Promise<{ counts: Record<string, number>; held: string[] }> {
  return page.evaluate(() => {
    const held: string[] = [];
    const counts: Record<string, number> = {};
    const name = (e: Element) => `${e.tagName.toLowerCase()}.${(e.getAttribute('class') ?? '').trim().split(/\s+/).join('.')}`;
    const ofOpenState = (el: Element) => {
      const part = el.closest('[data-when]');
      return !part || (part.getAttribute('data-when') ?? '').split(' ').some((s) => s.endsWith('-open'));
    };
    for (const cls of ['pg', 'wed']) {
      const sec = document.querySelector(`main section.${cls}`);
      if (!sec) {
        held.push(`section.${cls} is missing`);
        continue;
      }
      const els = [...sec.querySelectorAll('.seatm, [data-left], .proof-line, .cta-group a')].filter(ofOpenState);
      counts[cls] = els.length;
      for (const el of els) {
        const label = `${cls}: ${name(el)} "${(el.textContent ?? '').trim().slice(0, 30)}"`;
        const r = el.getBoundingClientRect();
        if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || !r.width || !r.height) held.push(`${label} is not visible`);
        for (let a: Element | null = el; a; a = a.parentElement) {
          const o = getComputedStyle(a).opacity;
          if (o !== '1') held.push(`${label}: ${a === el ? 'its' : `${name(a)}'s`} opacity is ${o}`);
        }
      }
    }
    return { counts, held };
  });
}

/** S11 has its meter, 4 proof lines and 6 program buttons; S12 its meter, 1 proof line and 2 buttons. */
const OFFER_PARTS = { pg: 11, wed: 4 };
const seatLines = (page: Page) => page.locator('section.pg [data-v3-seats] .status, section.wed [data-v3-seats] .status');

/**
 * For each element `selector` finds under `scope`: what keeps it from being whole on screen. An
 * empty list means it is whole: inside the screen's width, inside every ancestor that clips it (on
 * the axis it clips), and, with `within`, inside the border of the nearest ancestor matching it.
 * Skipped: what is hidden or faded right out (a handed-off timeline block) and screen-reader-only
 * copies; with `wordsOnly`, also every element that carries no words, picture or control of its own
 * (the hero's ripple rings and stacked "ghost" cards are drawings that bleed past the section on
 * purpose, as in the mockup). A part that is missing altogether is reported.
 */
async function cuts(page: Page, scope: string, selector: string, within?: string, wordsOnly = false): Promise<string[]> {
  return page.evaluate(
    ([scopeSel, sel, withinSel, onlyWords]) => {
      const out: string[] = [];
      const name = (e: Element) => {
        const cls = (e.getAttribute('class') ?? '').trim();
        return `${e.tagName.toLowerCase()}${cls ? `.${cls.split(/\s+/).join('.')}` : ''}`;
      };
      const seen = (e: Element) => {
        let o = 1;
        for (let a: Element | null = e; a; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity);
        return o > 0.05 && getComputedStyle(e).visibility !== 'hidden';
      };
      const inner = (e: Element) => {
        const b = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return {
          l: b.left + parseFloat(cs.borderLeftWidth),
          r: b.right - parseFloat(cs.borderRightWidth),
          t: b.top + parseFloat(cs.borderTopWidth),
          b: b.bottom - parseFloat(cs.borderBottomWidth),
        };
      };
      const offX = (r: DOMRect, box: { l: number; r: number }) => r.left < box.l - 0.5 || r.right > box.r + 0.5;
      const offY = (r: DOMRect, box: { t: number; b: number }) => r.top < box.t - 0.5 || r.bottom > box.b + 0.5;
      const root = document.querySelector(scopeSel);
      if (!root) return [`${scopeSel} is missing`];
      const els = [...root.querySelectorAll(sel)];
      if (!els.length) return [`no ${sel} in ${scopeSel}`];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || el.closest('.sr-only') || !seen(el)) continue;
        const carries =
          el.matches('a, button, img, picture, video, input, select, textarea, [role="img"]') ||
          [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');
        if (onlyWords && !carries) continue;
        const text = `${name(el)} "${(el.textContent ?? '').trim().slice(0, 32)}"`;
        if (r.left < -0.5 || r.right > innerWidth + 0.5) out.push(`${text} runs off the screen (${Math.round(r.left)}–${Math.round(r.right)} of ${innerWidth})`);
        const border = withinSel ? el.parentElement?.closest(withinSel) : null;
        if (border && (offX(r, inner(border)) || offY(r, inner(border)))) out.push(`${text} is outside ${name(border)}`);
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const cs = getComputedStyle(a);
          const box = inner(a);
          if ((cs.overflowX !== 'visible' && offX(r, box)) || (cs.overflowY !== 'visible' && offY(r, box))) {
            out.push(`${text} is cut off by ${name(a)}, which clips it`);
          }
        }
        const own = getComputedStyle(el);
        if (own.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) out.push(`${text} cuts off its own words`);
      }
      return out;
    },
    [scope, selector, within ?? '', wordsOnly] as const,
  );
}

for (const width of [390, 1280]) {
  test(`S2 renders the morning task sync video with its poster at ${width} @g9`, async ({ page }) => {
    await open(page, 'dark', width);
    const video = page.locator('section.vid video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('poster', '/media/morning-task-sync.webp');
    await expect(video).toHaveAttribute('preload', 'metadata');
    await expect(video.locator('source')).toHaveAttribute('src', '/media/morning-task-sync.mp4');
    await expect(video.locator('source')).toHaveAttribute('type', 'video/mp4');
    const flags = await video.evaluate((el: HTMLVideoElement) => ({
      autoplay: el.hasAttribute('autoplay'),
      controls: el.hasAttribute('controls'),
      playsinline: el.hasAttribute('playsinline'),
      paused: el.paused,
      label: el.getAttribute('aria-label'),
    }));
    expect(flags).toEqual({
      autoplay: false,
      controls: true,
      playsinline: true,
      paused: true,
      label: 'Connor’s morning task sync, recorded live: Claude reads ClickUp and Gmail and posts the day’s plan. 60 seconds.',
    });
    await expect(page.locator('section.vid h2')).toHaveText('Watch it run in a real business.');
    await expect(page.locator('section.vid .vid-caption')).toHaveText(flags.label!);
    const box = await video.boundingBox();
    expect(box && box.width > 0 && Math.abs(box.width / box.height - 16 / 9) < 0.02).toBe(true);
    const poster = await page.request.get(`${APP_BASE}/media/morning-task-sync.webp`);
    expect(poster.status()).toBe(200);
    expect(poster.headers()['content-type'] ?? '').toMatch(/image\/webp/);
    const mp4 = await page.request.get(`${APP_BASE}/media/morning-task-sync.mp4`, { headers: { Range: 'bytes=0-1' } });
    expect([200, 206]).toContain(mp4.status());
    expect(mp4.headers()['content-type'] ?? '').toMatch(/video\/mp4/);
  });
}

for (const theme of THEMES) {
  for (const width of [390, 1280]) {
    test(`S5's panels show their tag, card and words whole at ${width}, ${theme} @g9`, async ({ page }) => {
      await open(page, theme, width);
      const panels = page.locator('section.how .how-panel');
      await expect(panels).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        await page.locator(`section.how .how-step[data-step="${i}"]`).click();
        await expect(panels.nth(i)).toHaveClass(/is-on/);
        const panel = `section.how .how-panel[data-panel="${i}"]`;
        // The panel itself, on screen and inside the stage.
        expect(await cuts(page, 'section.how', `.how-panel[data-panel="${i}"]`), `panel ${i + 1}`).toEqual([]);
        // Every part of it, inside its border as well as on screen.
        expect(await cuts(page, panel, '*', '.how-panel'), `panel ${i + 1}'s parts`).toEqual([]);
      }
      // The three Design named (panel 1): the "Made-up example" tag, the Morning Brief card, the caption.
      await page.locator('section.how .how-step[data-step="0"]').click();
      for (const part of ['.how-bar .ex-tag', '.how-core', '.how-note']) {
        expect(await cuts(page, 'section.how .how-panel[data-panel="0"]', part, '.how-panel'), part).toEqual([]);
      }
    });
  }

  test(`S4's "done before 8 AM" chips keep their check at 390, the words inside the chip, ${theme} @g9`, async ({ page }) => {
    await open(page, theme, 390);
    const checks = page.locator('section.mon .mon-b-ok');
    await expect(checks).toHaveCount(6);
    for (const box of await checks.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect))) {
      expect([Math.round(box.width), Math.round(box.height)], 'the mockup’s 16px check').toEqual([16, 16]);
    }
    expect(await cuts(page, 'section.mon', '.mon-b-done > span', '.mon-b')).toEqual([]);
  });

  test(`no words, picture or control in S1 to S16 runs off a 390 screen or out of a box that clips it, ${theme} @g9`, async ({ page }) => {
    await open(page, theme, 390);
    expect(await cuts(page, 'main', 'section *', undefined, true)).toEqual([]);
  });

  for (const width of [390, 1280]) {
    test(`every link and button in S1 to S16 is a 44px tap (Spring's mobile rule) at ${width}, ${theme} @g9`, async ({ page }) => {
      await open(page, theme, width);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('main a[href], main button')]
          .map((el) => [el, el.getBoundingClientRect()] as const)
          .filter(([, r]) => r.width > 0 && r.height < 44)
          .map(([el, r]) => `${(el.textContent ?? '').trim().slice(0, 32)} (${Math.round(r.height)}px)`),
      );
      expect(small).toEqual([]);
    });
  }
}

// RULE: no buy, seat or proof element starts hidden. S11's and S12's seat meters once did, waiting for
// /api/offer; these load the page with the API unanswered, the script on and off.
for (const theme of THEMES) {
  for (const width of [390, 1280]) {
    test(`S11 and S12 show their seat meter, proof lines and program buttons on load, /api/offer failing, script on, ${width}, ${theme} @g9`, async ({
      page,
    }) => {
      await page.clock.setFixedTime(BEFORE_DEADLINE);
      await open(page, theme, width);
      await expect(page.locator('section.pg')).toHaveAttribute('data-acc', 'open');
      expect(await offerOnLoad(page)).toEqual({ counts: OFFER_PARTS, held: [] });
      // The days left from the deadline written into the page; the seats are the written cap, not a count.
      await expect(seatLines(page)).toHaveText(['18 days left · 15 of 15 founding seats', '18 days left · 15 of 15 founding seats']);
    });
  }

  test(`S11 and S12 show their seat meter, proof lines and program buttons on load, /api/offer never answering, motion allowed, 1280, ${theme} @g9`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(BEFORE_DEADLINE);
    await open(page, theme, 1280, { motion: true, offer: 'hangs' });
    expect(await offerOnLoad(page)).toEqual({ counts: OFFER_PARTS, held: [] });
    // Still so once each section has arrived: S12's ring has counted its builds in, 0 to 8.
    for (const cls of ['pg', 'wed']) await page.locator(`section.${cls}`).scrollIntoViewIfNeeded();
    await expect(page.locator('section.wed [data-v3-built]')).toHaveText('8');
    expect(await offerOnLoad(page)).toEqual({ counts: OFFER_PARTS, held: [] });
    await expect(seatLines(page)).toHaveText(['18 days left · 15 of 15 founding seats', '18 days left · 15 of 15 founding seats']);
  });
}

test.describe('with no script', () => {
  test.use({ javaScriptEnabled: false });

  for (const width of [390, 1280]) {
    test(`S11 and S12 show their seat meter, proof lines and program buttons on load, ${width} @g9`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.route('**/api/**', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
      await page.goto(`${APP_BASE}/home.html`);
      await expect(page.locator('html')).not.toHaveClass(/aiw-js/);
      expect(await offerOnLoad(page)).toEqual({ counts: OFFER_PARTS, held: [] });
      // What the page knows for certain: the deadline's day and the written cap.
      await expect(seatLines(page)).toHaveText(['Ends Nov 30 · 15 of 15 founding seats', 'Ends Nov 30 · 15 of 15 founding seats']);
      expect(await page.locator('section.pg .seatm, section.wed .seatm').evaluateAll((els) => els.map((e) => e.getAttribute('data-left')))).toEqual(['15', '15']);
    });
  }
});

test('S7’s “People” closes the skills and takes them out of the keyboard’s reach; “People and AI” brings them back @g9', async ({ page }) => {
  await open(page, 'dark', 390);
  const count = page.locator('[data-oc-skills]');
  await expect(count).toHaveText('29');
  await page.locator('[data-oc-mode="people"]').click();
  await expect(page.locator('[data-oc-mode="people"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(count).toHaveText('0');
  // From the toggle, Tab goes past every hidden chip: the next stop is outside the chart.
  await page.locator('[data-oc-mode="ai"]').focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.closest('.oc') === null)).toBe(true);
  await page.locator('[data-oc-mode="ai"]').click();
  await expect(count).toHaveText('29');
  await page.locator('[data-oc-mode="ai"]').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Inbox and Meeting Follow-Through');
});

test('S15 opens one question at a time, natively: opening the second closes the first @g9', async ({ page }) => {
  await open(page, 'dark', 1280);
  const items = page.locator('section.faq details');
  await expect(items.nth(0)).toHaveAttribute('open', '');
  await items.nth(1).locator('summary').click();
  await expect(items.nth(1)).toHaveAttribute('open', '');
  await expect(items.nth(0)).not.toHaveAttribute('open', '');
});

test('S9 recounts from the keyboard: a slider moved with the arrow key changes the hours back @g9', async ({ page }) => {
  await open(page, 'dark', 390);
  const first = page.locator('section.hrs input[type="range"]').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(first).toHaveAttribute('aria-valuetext', '5 hours a week');
  await expect(page.locator('[data-v3-out="week"]')).toHaveText('12');
  await expect(page.locator('[data-v3-out="dollars"]')).toHaveText('$150,000');
});

test('S11 and S12 follow /api/offer: the seats once counted, then sold out with the waiting list, the proof line beside it @g9', async ({ page }) => {
  const facts = (left: number) => ({
    open: true,
    founding: { open: true, closesAt: '2026-11-30T23:59:00-07:00' },
    seats: { total: 15, sold: 15 - left, left },
    carts: [],
  });
  let left = 9;
  await open(page, 'dark', 1280);
  // Registered after `open()`'s stand-in for the API, so it answers first (Playwright runs the newest route first).
  await page.route('**/api/offer', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(facts(left)) }));
  await page.reload();
  await expect(page.locator('#p-accelerator [data-v3-seats]')).toBeVisible();
  await expect(page.locator('#p-accelerator .status')).toContainText('9 of 15 founding seats left');
  await expect(page.locator('#p-accelerator .seatm')).toHaveAttribute('data-left', '9');
  left = 0;
  await page.reload();
  await expect(page.locator('section.pg')).toHaveAttribute('data-acc', 'soldout');
  await expect(page.locator('#p-accelerator .pg-cta a:visible')).toHaveText(['Join the Waitlist']);
  await expect(page.locator('#p-accelerator .pg-cta .proof-line')).toBeVisible();
  await expect(page.locator('section.wed .wed-cta .proof-line')).toBeVisible();
});
