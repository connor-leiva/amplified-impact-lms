import { test, expect, type Page } from '@playwright/test';
import { expectAccessible } from '../../lib/a11y';
import { launchDb } from '../../lib/launch-db';
import { JAN_KEYS, JAN_LINKS, januaryFacts, openAt, withJanuary } from '../../lib/selling-world';
import { DEFAULT_COHORT_ID } from '../../../packages/core/src/accelerator';
import { CLOSE_LINKS_WARNING } from '../../../packages/core/src/cohort-actions';

/**
 * D-262 (R-5 Phase 5, PLAN.md § 10, "Done when"): Cohort › Settings › Enrollment, what a cohort sells through. On the
 * launch database (§ 9.5's seed and every one-time data step, Phase 5's among them, so December's selling values are
 * stored), December's card says what it sells today: 15 seats, $7,500 or two payments, founding until Mon, Nov 30, both
 * Payment Links, GoHighLevel's dec26, Open. Its price dialog reads Stripe's price under each key and changes nothing.
 *
 * January, made in the database with every Before It Opens line done but its Stripe two (the rest is Phase 3's spec,
 * `admin-cohort.spec.ts`): Open enrollment is refused with the reason, in its dialog; Set the price and Edit enrollment
 * enter its lookup keys and its two Payment Links (made by hand in Stripe: the fixture's Stripe holds them under
 * `FIXTURE_FACTS_KEY`, as the API's facts route reads them from Stripe read only); then Open enrollment opens it, and
 * Close enrollment closes it. axe at 1280 and 390.
 *
 * The fixture build, as every e2e: the admin persona writes through the same `@ai/core` actions the API runs (the API's
 * own run of them, with a fake Stripe in test mode and their audit rows, is `apps/api/test/cohort-selling.test.ts`).
 */

const main = (page: Page) => page.locator('main');
const card = (page: Page) => main(page).locator('#cohort-enrollment');
/** A row of the Enrollment card: its label, then its value. */
const row = (page: Page, label: string) => card(page).getByText(label, { exact: true }).locator('xpath=..');

test.describe('selling a seat in a cohort (D-262) @g9 @console', () => {
  test('December’s Enrollment says what it sells today; its price dialog reads Stripe’s price and changes nothing', async ({ browser }) => {
    const { page, close } = await openAt(browser, `/admin/cohort/${DEFAULT_COHORT_ID}/settings`, { db: launchDb() });
    await expect(card(page).getByRole('heading', { name: 'Enrollment' })).toBeVisible();
    await expect(card(page).getByText('Open', { exact: true })).toBeVisible();
    await expect(row(page, 'Seats')).toContainText('0 of 15 taken');
    await expect(row(page, 'A seat is')).toContainText('A team: an owner and an AI Implementer');
    await expect(row(page, 'Price')).toContainText('$7,500');
    await expect(row(page, 'Two payments')).toContainText('Offered. $3,750 at checkout and $3,750 one month later.');
    await expect(row(page, 'Founding')).toContainText('Yes, until Mon, Nov 30 · 11:59 PM MT / Tue, Dec 1, 12:59 AM CT');
    await expect(row(page, 'Payment Links')).toContainText('2 of 2 entered');
    await expect(row(page, 'GoHighLevel')).toContainText('dec26');
    await expect(row(page, 'Who lands here')).toContainText('A team that buys a seat while enrollment is open');
    await expect(card(page).getByRole('button')).toHaveText(['Close enrollment', 'Change the price', 'Edit enrollment']);
    await expectAccessible(page);

    await card(page).getByRole('button', { name: 'Change the price' }).click();
    const price = page.getByRole('dialog', { name: 'Price for a Seat in the December 2026 Cohort' });
    await expect(price.getByLabel('Lookup key, paid in full')).toHaveValue('cohort_founding_full');
    await expect(price.getByLabel('Lookup key, Insiders after')).toHaveValue('membership_monthly_team_leader');
    await expect(price.getByLabel('Lookup key, two payments')).toHaveValue('cohort_founding_two_pay');
    await expect(price.getByText('Stripe: $7,500 once')).toBeVisible();
    await expect(price.getByText('Stripe: $169 a month')).toBeVisible();
    await expect(price.getByText('Stripe: $3,750 a month')).toBeVisible();
    await expect(price.getByText('$3,750 at checkout and $3,750 one month later, as Stripe schedules it. Revenue shows the second as still to collect.')).toBeVisible();
    await expect(price.getByText('Prices and Payment Links are made in Stripe. This shows Stripe’s price for this cohort.', { exact: true })).toBeVisible();
    // No typed price: the dialog has three keys and a checkbox, nothing else to type into.
    await expect(price.getByRole('textbox')).toHaveCount(3);
    await expectAccessible(page);
    await price.getByRole('button', { name: 'Cancel' }).click();
    await expect(price).toHaveCount(0);
    await close();
  });

  test('January: Open enrollment refused until its price and links are in Stripe, then opened, then closed', async ({ browser }) => {
    const { db, id } = withJanuary();
    const { page, close } = await openAt(browser, `/admin/cohort/${id}/settings`, { db, facts: januaryFacts(id) });
    await expect(page.getByRole('heading', { level: 1, name: 'January 2027 Cohort' })).toBeVisible();
    await expect(card(page).getByText('Closed', { exact: true })).toBeVisible();
    await expect(row(page, 'Seats')).toContainText('0 of 15 taken');
    await expect(row(page, 'Price')).toContainText('Not set');
    await expect(row(page, 'Two payments')).toContainText('Offered. Set its price to see Stripe’s schedule.');
    await expect(row(page, 'Founding')).toContainText('Yes. No close is set.');
    await expect(row(page, 'Payment Links')).toContainText('Not set');
    await expect(row(page, 'GoHighLevel')).toContainText('jan27');
    await expect(card(page).getByRole('button')).toHaveText(['Open enrollment', 'Set the price', 'Edit enrollment']);

    // Refused, with its reason, in the dialog: the first of Before It Opens not done.
    await card(page).getByRole('button', { name: 'Open enrollment' }).click();
    const opening = page.getByRole('dialog', { name: 'Open Enrollment for the January 2027 Cohort?' });
    await expect(opening.getByText('From now on, a team that buys a seat is placed in this cohort, up to 15 seats. They get the welcome email and can start the setup week on Sun, Dec 27.')).toBeVisible();
    await expect(opening.getByRole('alert')).toHaveText('Stripe price found for each lookup key: None yet. Prices and Payment Links are made in Stripe.');
    await expectAccessible(page);
    await expect(opening.getByRole('button', { name: 'Open enrollment' })).toBeDisabled();
    await opening.getByRole('button', { name: 'Cancel' }).click();

    // Set the price: the three lookup keys made by hand in Stripe, and Stripe's price under each once saved.
    await card(page).getByRole('button', { name: 'Set the price' }).click();
    const price = page.getByRole('dialog', { name: 'Price for a Seat in the January 2027 Cohort' });
    await expect(price.getByText('Prices and Payment Links are made in Stripe. This shows Stripe’s price for this cohort.', { exact: true })).toBeVisible();
    await price.getByLabel('Lookup key, paid in full').fill(JAN_KEYS.full);
    await price.getByLabel('Lookup key, Insiders after').fill(JAN_KEYS.rollover);
    await price.getByLabel('Lookup key, two payments').fill(JAN_KEYS.twoPay);
    await expect(price.getByText('Save to look it up in Stripe.')).toHaveCount(3);
    await expectAccessible(page);
    await price.getByRole('button', { name: 'Save price' }).click();
    await expect(price).toHaveCount(0);
    await expect(page.getByText('Price saved', { exact: true })).toBeVisible();
    await expect(row(page, 'Price')).toContainText('$7,500');
    await expect(row(page, 'Two payments')).toContainText('Offered. $3,750 at checkout and $3,750 one month later.');
    await expect(card(page).getByRole('button', { name: 'Change the price' })).toBeVisible();

    // Still refused: its Payment Links.
    await card(page).getByRole('button', { name: 'Open enrollment' }).click();
    await expect(opening.getByRole('alert')).toHaveText('Payment Links entered: None yet');
    await expect(opening.getByRole('button', { name: 'Open enrollment' })).toBeDisabled();
    await opening.getByRole('button', { name: 'Cancel' }).click();

    // Edit enrollment: its two links (each names January in Stripe) and when founding closes.
    await card(page).getByRole('button', { name: 'Edit enrollment' }).click();
    const enroll = page.getByRole('dialog', { name: 'Enrollment for the January 2027 Cohort' });
    await expect(enroll.getByText(`A link sells this cohort when, in Stripe, its metadata says ai_cohort = ${id}. A link without it sells December.`)).toBeVisible();
    await expect(enroll.getByLabel('Seats', { exact: true })).toHaveValue('15');
    await expect(enroll.getByLabel('GoHighLevel cohort value')).toHaveValue('jan27');
    await enroll.getByLabel('Founding closes', { exact: true }).fill('2026-12-31');
    await enroll.getByLabel('Time (MT)').fill('23:59');
    await enroll.getByLabel('Payment Link, paid in full').fill(JAN_LINKS.full);
    await enroll.getByLabel('Payment Link, two payments').fill(JAN_LINKS.twoPay);
    await expectAccessible(page);
    await enroll.getByRole('button', { name: 'Save' }).click();
    await expect(enroll).toHaveCount(0);
    await expect(page.getByText('Enrollment saved', { exact: true })).toBeVisible();
    await expect(row(page, 'Payment Links')).toContainText('2 of 2 entered');
    await expect(row(page, 'Founding')).toContainText('Yes, until Thu, Dec 31 · 11:59 PM MT / Fri, Jan 1, 12:59 AM CT');

    // Before It Opens, on the Overview: its two Stripe lines done, with what Stripe holds; all but Open enrollment done.
    await page.getByRole('tab', { name: 'Overview' }).click();
    const before = main(page).locator('section', { has: page.getByRole('heading', { name: 'Before It Opens' }) });
    await expect(before.getByRole('link', { name: /^Stripe price found for each lookup key/ })).toContainText('$7,500, or two payments · 15 seats');
    await expect(before.getByRole('link', { name: /^Payment Links entered/ })).toContainText('Both entered. Each names this cohort in Stripe.');
    await expect(before.getByText('10 of 11 done')).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('tab', { name: 'Settings' }).click();

    // Ready: Open enrollment opens it.
    await card(page).getByRole('button', { name: 'Open enrollment' }).click();
    await expect(opening.getByRole('alert')).toHaveCount(0);
    await expectAccessible(page);
    await opening.getByRole('button', { name: 'Open enrollment' }).click();
    await expect(opening).toHaveCount(0);
    await expect(page.getByText('Enrollment is open', { exact: true })).toBeVisible();
    await expect(card(page).getByText('Open', { exact: true })).toBeVisible();
    await expect(card(page).getByRole('button')).toHaveText(['Close enrollment', 'Change the price', 'Edit enrollment']);

    // Close enrollment: no new sales; the teams already in are not affected. It writes nothing to Stripe, so the dialog
    // says to turn the cohort's Payment Links off there by hand (Connor, Nov 27).
    await card(page).getByRole('button', { name: 'Close enrollment' }).click();
    const closing = page.getByRole('dialog', { name: 'Close Enrollment for the January 2027 Cohort?' });
    await expect(closing.getByText('No new team can buy a seat in this cohort. The 0 already in it are not affected.')).toBeVisible();
    await expect(closing.getByText(CLOSE_LINKS_WARNING, { exact: true })).toBeVisible();
    await expectAccessible(page);
    await closing.getByRole('button', { name: 'Close enrollment' }).click();
    await expect(closing).toHaveCount(0);
    await expect(page.getByText('Enrollment is closed', { exact: true })).toBeVisible();
    await expect(card(page).getByText('Closed', { exact: true })).toBeVisible();
    await close();
  });

  test('the Enrollment card and its dialogs are accessible at 390, with no sideways scroll', async ({ browser }) => {
    const { db, id } = withJanuary();
    for (const cohortId of [DEFAULT_COHORT_ID, id]) {
      const { page, close } = await openAt(browser, `/admin/cohort/${cohortId}/settings`, { db, facts: januaryFacts(id), width: 390 });
      await expect(card(page).getByRole('heading', { name: 'Enrollment' })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expectAccessible(page);
      for (const [button, dialog] of [
        [/^(Set|Change) the price$/, /^Price for a Seat in the /],
        ['Edit enrollment', /^Enrollment for the /],
        [/^(Open|Close) enrollment$/, /^(Open|Close) Enrollment for the /],
      ] as const) {
        await card(page).getByRole('button', { name: button }).click();
        const d = page.getByRole('dialog', { name: dialog });
        await expect(d).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await expectAccessible(page);
        await d.getByRole('button', { name: 'Cancel' }).click();
        await expect(d).toHaveCount(0);
      }
      await close();
    }
  });
});
