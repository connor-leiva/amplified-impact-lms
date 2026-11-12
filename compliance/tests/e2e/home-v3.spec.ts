import { test, expect, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';

// Homepage v3 (docs/design/home-v3), in a real browser: what jsdom cannot see, which is layout.
//
// The fixture build carries v3's production render at /home-v3.html (`V3_PREVIEW=0` in
// `build:fixture`; an ordinary `pnpm build` has no v3 page). The page is settled here (reduced
// motion), which at 390 is also what every phone gets.
//
// WHY BOXES, NOT SCROLL WIDTH. S4's and S5's stages clip their overflow (`overflow: clip`), so
// content pushed past a panel's edge is cut off without the page ever scrolling sideways, and a
// "no sideways scroll" check passes. That is how S5's first panel lost the right end of its tag,
// its Morning Brief card and its caption at 390. These tests measure each part's box against the
// screen and against every ancestor that clips.

const THEMES = ['dark', 'light'] as const;

async function open(page: Page, theme: (typeof THEMES)[number], width: number) {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((t) => localStorage.setItem('aiw-theme', t), theme);
  // The kit header asks the API who is signed in; the fixture server has no API.
  await page.route('**/api/**', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto(`${APP_BASE}/home-v3.html`);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('body')).toHaveAttribute('data-theme', theme);
}

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

  test(`no words, picture or control in S1 to S5 runs off a 390 screen or out of a box that clips it, ${theme} @g9`, async ({ page }) => {
    await open(page, theme, 390);
    expect(await cuts(page, 'main', 'section *', undefined, true)).toEqual([]);
  });
}
