import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-164: Billing's confirmed refund and void (spec § 7.6), in the fixture build. The Console fixture
 * answers both steps as the API does, with the R2 mockup's invoices, so the dialogs read the mockup's
 * `Confirm` words plus the spec's additions: the preview's consequences, a 10-character reason, the
 * amount or invoice id typed to confirm, a refusal in words with "Start again", and the mockup's toasts.
 * A Team Plan subscription's "Change seat tier…" is drawn disabled with its reason (its gate failed).
 * The dialogs have no ref frame: no parity cell; each state passes axe (zero serious or critical).
 */

const NOW = '2026-12-10T09:30:00-07:00';
const REASON = 'Customer canceled inside the trial window.';

async function openAt(browser: Browser, path: string, width = 1280): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date(NOW));
  await page.addInitScript(() =>
    localStorage.setItem('ai-lms-prefs', JSON.stringify({ phase: 'live', theme: 'light', tz: null, sidebar: 'full' })),
  );
  await page.goto(`${APP_BASE}${path}${path.includes('?') ? '&' : '?'}as=admin`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, close: () => ctx.close() };
}

const rows = (page: Page) =>
  page.locator('main [role="table"] [role="row"]').filter({ has: page.locator('[role="cell"]') });
const dialog = (page: Page) => page.getByRole('dialog');

async function choose(page: Page, row: number, item: RegExp) {
  await rows(page).nth(row).getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: item }).click();
  await expect(dialog(page)).toBeVisible();
}

test.describe('Billing refund and void (D-164) @g9 @console', () => {
  test('refund: the mockup’s Confirm, the consequences, a reason and the amount typed; then the toast and the row', async ({
    browser,
  }) => {
    const { page, close } = await openAt(browser, '/admin/billing/invoices');
    await choose(page, 0, /Refund…/);
    const d = dialog(page);
    await expect(d).toHaveAccessibleName('Refund $1,495.00 to Northshore Group?');
    await expect(d).toContainText(
      'Invoice in_1QxT4mNs0291, Visa ending 4242. The refund is sent to Stripe and cannot be reversed from the admin.',
    );
    await expect(d.getByRole('list', { name: 'What happens' }).getByRole('listitem')).toHaveText([
      'Stripe refunds the whole $1,495.00 payment.',
      'Order ord_northshore is marked refunded, and its CRM record in GoHighLevel is resynced.',
      'The Team Plan · 41 seats plan ends and its access ends now.',
      'Subscription sub_1Qn7NshoreT41 is cancelled in Stripe (unless already cancelled), so nothing more is charged.',
    ]);
    await expect(d).toContainText('This action is audit-logged.');
    const reason = d.getByRole('textbox', { name: 'Reason' });
    await expect(reason).toHaveAttribute('placeholder', 'Required');
    await expect(reason).toBeFocused();
    const cta = d.getByRole('button', { name: 'Refund $1,495.00' });
    await expect(cta).toBeDisabled();
    await expectAccessible(page);
    // Under 10 characters, or the wrong amount: still disabled.
    await reason.fill('Too short');
    await d.getByRole('textbox', { name: 'Type $1,495.00 to confirm' }).fill('1495');
    await expect(cta).toBeDisabled();
    await reason.fill(REASON);
    await d.getByRole('textbox', { name: 'Type $1,495.00 to confirm' }).fill('1,494');
    await expect(cta).toBeDisabled();
    await d.getByRole('textbox', { name: 'Type $1,495.00 to confirm' }).fill('$1,495.00');
    await expect(cta).toBeEnabled();
    await cta.click();
    await expect(dialog(page)).toHaveCount(0);
    // The R2 toast (the list's own loading status may be there too while it reads again).
    await expect(page.getByRole('status').filter({ hasText: 'Refund sent to Stripe' })).toBeVisible();
    // The list is read again: the invoice is refunded, and Refund… is gone from it.
    await expect(rows(page).first()).toContainText('Refunded');
    await rows(page).first().getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: /Refund…/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('tab', { name: 'Refunds' }).click();
    await expect(rows(page).first()).toContainText(REASON);
    await expect(rows(page).first()).toContainText('Connor Leiva');
    await close();
  });

  test('void: the invoice id typed to confirm; then "Invoice voided" and the row reads Void', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/billing/invoices');
    await choose(page, 4, /Void invoice…/);
    const d = dialog(page);
    await expect(d).toHaveAccessibleName('Void invoice in_1QxN1hHm0279?');
    await expect(d).toContainText('$695.00 for Hale & Marlowe Realty. The customer will no longer be asked to pay it.');
    await expect(d.getByRole('list', { name: 'What happens' })).toContainText('webhook result ignored:type');
    await d.getByRole('textbox', { name: 'Reason' }).fill('Billed twice by mistake.');
    await d.getByRole('textbox', { name: 'Type in_1QxN1hHm0279 to confirm' }).fill('in_1QxN1hHm0279');
    await expectAccessible(page);
    await d.getByRole('button', { name: 'Void invoice' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Invoice voided' })).toBeVisible();
    await expect(rows(page).nth(4)).toContainText('Void');
    await close();
  });

  test('refusals in words: an expired confirmation offers Start again; a missing Write scope names it', async ({ browser }) => {
    const a = await openAt(browser, '/admin/billing/invoices?console-state=action_expired');
    await choose(a.page, 0, /Refund…/);
    const d = dialog(a.page);
    await d.getByRole('textbox', { name: 'Reason' }).fill(REASON);
    await d.getByRole('textbox', { name: 'Type $1,495.00 to confirm' }).fill('1495');
    await d.getByRole('button', { name: 'Refund $1,495.00' }).click();
    await expect(d.getByRole('alert')).toHaveText(
      'This confirmation expired after 5 minutes. Start again to see the current figures.',
    );
    await expectAccessible(a.page);
    await d.getByRole('button', { name: 'Start again' }).click();
    await expect(d.getByRole('alert')).toHaveCount(0);
    await expect(d.getByRole('button', { name: 'Refund $1,495.00' })).toBeVisible();
    // The reason is kept; what was typed is asked again.
    await expect(d.getByRole('textbox', { name: 'Reason' })).toHaveValue(REASON);
    await expect(d.getByRole('textbox', { name: 'Type $1,495.00 to confirm' })).toHaveValue('');
    await a.close();

    const b = await openAt(browser, '/admin/billing/invoices?console-state=action_scope');
    await choose(b.page, 4, /Void invoice…/);
    const v = dialog(b.page);
    await v.getByRole('textbox', { name: 'Reason' }).fill('Billed twice by mistake.');
    await v.getByRole('textbox', { name: 'Type in_1QxN1hHm0279 to confirm' }).fill('in_1QxN1hHm0279');
    await v.getByRole('button', { name: 'Void invoice' }).click();
    await expect(v.getByRole('alert')).toHaveText('Stripe’s restricted key can’t change Invoices. Add Write on Invoices to the key.');
    await expect(rows(b.page).nth(4)).toContainText('Open');
    await b.close();
  });

  test('Cancel and Escape close it and change nothing', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/billing/invoices');
    await choose(page, 0, /Refund…/);
    await dialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(page)).toHaveCount(0);
    await choose(page, 0, /Refund…/);
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    await expect(rows(page).first()).toContainText('Paid');
    await close();
  });

  test('the seat tier: drawn on a Team Plan subscription, disabled, its reason in words', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/billing/subscriptions');
    await rows(page).first().getByRole('button', { name: 'More actions' }).click();
    const tier = page.getByRole('menuitem', { name: 'Change seat tier…' });
    await expect(tier).toHaveAttribute('aria-disabled', 'true');
    await expect(tier).toHaveAccessibleDescription('Off until a tier change in Stripe also updates the workspace’s seats.');
    await expect(tier).toContainText('Off until a tier change in Stripe also updates the workspace’s seats.');
    await expectAccessible(page);
    // Playwright won't click what is aria-disabled unless forced; a person can, and nothing happens.
    await tier.click({ force: true });
    await expect(dialog(page)).toHaveCount(0);
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    // Not on a plan with no tiers (Red Cliff's Agent Plan).
    await rows(page).nth(2).getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menuitem', { name: 'Change seat tier…' })).toHaveCount(0);
    await close();
  });

  test('Admin acts; Support sees neither action nor the seat tier', async ({ browser }) => {
    const admin = await openAt(browser, '/admin/billing/invoices?console-role=Admin');
    await choose(admin.page, 0, /Refund…/);
    await expect(dialog(admin.page)).toHaveAccessibleName('Refund $1,495.00 to Northshore Group?');
    await admin.close();
    const support = await openAt(browser, '/admin/billing/subscriptions?console-role=Support');
    await rows(support.page).first().getByRole('button', { name: 'More actions' }).click();
    await expect(support.page.getByRole('menuitem', { name: /seat tier/ })).toHaveCount(0);
    await support.close();
  });

  test('on a phone: the dialog fits, 16px text, 48px primary, no sideways scroll', async ({ browser }) => {
    const { page, close } = await openAt(browser, '/admin/billing/invoices', 390);
    // A phone's rows are cards; the first card's "…" is the first invoice's.
    await page.locator('main').getByRole('button', { name: 'More actions' }).first().click();
    await page.getByRole('menuitem', { name: /Refund…/ }).click();
    const d = dialog(page);
    await expect(d.getByRole('list', { name: 'What happens' })).toBeVisible();
    const cta = d.getByRole('button', { name: 'Refund $1,495.00' });
    expect((await cta.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    expect((await d.getByRole('button', { name: 'Cancel' }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await d.getByRole('textbox', { name: 'Reason' }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const small = await d.evaluate((el) =>
      [...el.querySelectorAll<HTMLElement>('p, li, label, input, button')].filter((n) => parseFloat(getComputedStyle(n).fontSize) < 16).length,
    );
    expect(small).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expectAccessible(page);
    await close();
  });
});
