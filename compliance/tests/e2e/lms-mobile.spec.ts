import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';

/**
 * D-156: the LMS at www's phone quality, measured on every route in fixture mode (never a real
 * account, never production data).
 *
 *   overflow   at 320, 375, 390, 430 and 768 / 1024 / 1280 / 1440 CSS px, nothing scrolls sideways: not
 *              the document, and not the shell's <main> (the LMS page scrolls inside it). An element
 *              that is deliberately a scroll region (`overflow-x: auto | scroll`) is allowed to.
 *   min font   on a phone (under 768px), every visible run of text is set at 16px or more.
 *   tap        on a phone, every visible control (button, link, input, select, textarea, [role=button|
 *              tab|link|menuitem|switch|radio]) is at least 44×44, a primary button at least 48 tall. A
 *              link inside a sentence is exempt (WCAG 2.5.8's inline exception).
 *
 * D-160 (R2-1a): the floor and the tap sizes are the PHONE standard. D-156 first applied them at every
 * width, which was the root cause of the desktop admin's phone sizing; lms.css now sets them only under
 * `@media (max-width:767px)`, so the font and tap checks run at the four phone widths and stop at 768,
 * where desktop has its own, pre-D-156 sizes again. Overflow is still checked at every width, 1440
 * added.
 *
 * `KNOWN` names what is still out of line, per route, check and width, with the PR that owns it. A
 * finding not listed fails; a listed one that no longer happens fails too, so the list only shrinks.
 * `LMS_AUDIT=1` prints every finding instead of asserting, to rebuild the list.
 */

type Check = 'overflow' | 'font' | 'tap';
type Persona = 'agent' | 'owner' | 'admin';

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440] as const;
/** lms.css's phone query is `max-width: 767px`: the font floor and the tap sizes hold below this. */
const PHONE_BELOW = 768;
const NOW = '2026-12-07T10:42:00-06:00';

/** Every LMS route the fixture build serves, with the persona that reaches it. */
const ROUTES: readonly [Persona, string][] = [
  ['agent', '/'],
  ['agent', '/sessions'],
  ['agent', '/employees/marketing'],
  ['agent', '/vault'],
  ['agent', '/team-tier'],
  ['owner', '/team'],
  ['admin', '/admin'],
  ['admin', '/admin/curriculum'],
  ['admin', '/admin/curriculum/marketing'],
  ['admin', '/admin/curriculum/new'],
  ['admin', '/admin/cohorts'],
  ['admin', '/admin/learners'],
  ['admin', '/admin/vault'],
  ['admin', '/admin/announcements'],
  ['admin', '/admin/tiers'],
  ['admin', '/admin/staff'],
  ['admin', '/admin/crm-sync'],
  // The Admin Console (D-157): Roles, and the Console 404 for any other `/admin/` address.
  ['admin', '/admin/roles'],
  ['admin', '/admin/no-such-page'],
  // Two of its shared states (the fixture's own switches): Denied, and "Too many requests".
  ['admin', '/admin/roles?console-role=Support'],
  ['admin', '/admin/roles?console-state=rate_limited'],
  // The Audit Log, and its "Too many requests".
  ['admin', '/admin/audit'],
  ['admin', '/admin/audit?console-state=rate_limited'],
  // The Support records on R2 (D-160 R2-1c): Workspaces, a workspace, Users, a user, and Search.
  ['admin', '/admin/workspaces'],
  ['admin', '/admin/workspaces/ws_northshore'],
  ['admin', '/admin/workspaces?console-state=error'],
  ['admin', '/admin/users'],
  ['admin', '/admin/users/u_1042'],
  ['admin', '/admin/search?q=north'],
  // Masquerade on R2 (D-162 3b): the page, the learner view, and a session the fixture simulates
  // (`?masquerade=demo`): the paused Console and the banner over a learner page.
  ['admin', '/admin/masquerade'],
  ['admin', '/admin/masquerade/learner-view'],
  ['admin', '/admin/workspaces?masquerade=demo'],
  ['agent', '/?masquerade=demo'],
  ['agent', '/course'],
  ['agent', '/skill-library'],
  ['agent', '/skill-library/perfect-week'],
  ['agent', '/sign-in'],
  ['agent', '/forgot-password'],
  ['agent', '/set-password'],
  ['agent', '/account'],
  ['agent', '/invite/fixture-token'],
];

/**
 * What is still out of line, as `route|check|width`, with the PR that owns it. Empty since PR C (the
 * admin console): every LMS route is clear at every width. Rebuilt with LMS_AUDIT=1.
 */
const KNOWN: ReadonlySet<string> = new Set<string>([]);

async function openAt(browser: Browser, persona: Persona, path: string, width: number): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Chicago', viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() => {
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' }));
  });
  const sep = path.includes('?') ? '&' : '?';
  await page.goto(`${APP_BASE}${path}${sep}as=${persona}`);
  await page.locator('[data-app-ready="true"]').first().waitFor({ timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  return { page, close: () => ctx.close() };
}

/** Every finding on the page as `check: detail`. Runs in the browser. */
async function findings(page: Page): Promise<{ overflow: string[]; font: string[]; tap: string[] }> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      for (let e: Element | null = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
        if (e.getAttribute('aria-hidden') === 'true' || (e as HTMLElement).inert) return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth;
    };
    const label = (el: Element) => {
      const t = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
      return `${el.tagName.toLowerCase()}${t ? ` "${t.slice(0, 40)}"` : ''}`;
    };

    // Overflow: the document, and the shell's scroller.
    const overflow: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth) overflow.push(`document ${doc.scrollWidth} > ${doc.clientWidth}`);
    const main = document.querySelector('main');
    // Only a <main> that scrolls can scroll sideways; one that clips (the sign-in art) cannot.
    if (main && /auto|scroll/.test(getComputedStyle(main).overflowX) && main.scrollWidth > main.clientWidth + 1) {
      // Allowed when the overflow is contained by an intentional scroll region inside it.
      const regions = Array.from(main.querySelectorAll('*')).filter((e) => /auto|scroll/.test(getComputedStyle(e).overflowX) && e.scrollWidth > e.clientWidth);
      const mainRect = main.getBoundingClientRect();
      const escapees = Array.from(main.querySelectorAll('*')).filter((e) => {
        if (regions.some((r) => r !== e && r.contains(e))) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.right > mainRect.right + 1;
      });
      if (escapees.length) overflow.push(`main ${main.scrollWidth} > ${main.clientWidth}: ${escapees.slice(0, 3).map(label).join(', ')}`);
    }

    // Min font: every visible text node's typography.
    const font = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!(n.textContent ?? '').trim()) continue;
      const p = n.parentElement;
      if (!p || p.closest('svg, script, style, noscript') || !visible(p)) continue;
      const size = Number.parseFloat(getComputedStyle(p).fontSize);
      if (size < 16) font.add(`${label(p)} ${size}px`);
    }

    // Tap targets.
    const tap = new Set<string>();
    const controls = document.querySelectorAll(
      'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=link], [role=menuitem], [role=switch], [role=radio], [role=checkbox]',
    );
    for (const el of Array.from(controls)) {
      if (!visible(el) || (el as HTMLButtonElement).disabled) continue;
      const cs = getComputedStyle(el);
      // A link inside running text: inline, with other words beside it in the same block, bare or in
      // sibling spans ("From Session 1 · <link> · 45 Min Build"). WCAG 2.5.8's inline exception: the
      // target is "constrained by the line-height of non-target text".
      if (el.tagName === 'A' && cs.display === 'inline') {
        const block = el.parentElement;
        const words = block ? Array.from(block.childNodes).some((c) => c !== el && /[\p{L}\p{N}]/u.test(c.textContent ?? '')) : false;
        if (words) continue;
      }
      // A visually hidden native input behind a styled control is measured through its label.
      if (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'text' && Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      const primary = /\bprimary\b|_primary_/.test(el.className.toString()) || /--action-primary\)/.test(el.getAttribute('style') ?? '');
      const minH = primary ? 48 : 44;
      if (r.width < 44 - 0.5 || r.height < minH - 0.5) tap.add(`${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}${primary ? ' (primary)' : ''}`);
    }
    return { overflow, font: [...font], tap: [...tap] };
  });
}

for (const [persona, path] of ROUTES) {
  test(`${path} as ${persona}: no sideways scroll; on a phone nothing under 16px, 44px targets @lms-mobile`, async ({ browser }) => {
    const seen: string[] = [];
    const report: string[] = [];
    for (const width of WIDTHS) {
      const { page, close } = await openAt(browser, persona, path, width);
      const f = await findings(page);
      await close();
      const checks: Check[] = width < PHONE_BELOW ? ['overflow', 'font', 'tap'] : ['overflow'];
      for (const check of checks) {
        if (!f[check].length) continue;
        const key = `${path}|${check}|${width}`;
        seen.push(key);
        report.push(`${key}: ${f[check].slice(0, 6).join('; ')}`);
      }
    }
    if (process.env.LMS_AUDIT) {
      console.log(report.length ? report.join('\n') : `${path}: clean`);
      return;
    }
    const unexpected = seen.filter((k) => !KNOWN.has(k));
    const fixed = [...KNOWN].filter((k) => k.startsWith(`${path}|`) && !seen.includes(k));
    expect(unexpected, `new findings on ${path}:\n${report.filter((r) => unexpected.some((k) => r.startsWith(k))).join('\n')}`).toEqual([]);
    expect(fixed, `${path}: these are fixed now; remove them from KNOWN`).toEqual([]);
  });
}
