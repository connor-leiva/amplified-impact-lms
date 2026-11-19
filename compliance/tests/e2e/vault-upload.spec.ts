import { test, expect, type Browser, type Page } from '@playwright/test';
import { APP_BASE } from '../../lib/prepare';
import { expectAccessible } from '../../lib/a11y';

/**
 * D-188: the Console's Resource Vault with a real file: Add resource's drop zone and "…" › Replace file.
 * In the fixture build there is no bucket, so the file is recorded and never sent (no `upload-url`, no
 * PUT); the row is written by the same audited actions the API runs (`publishVaultFile`,
 * `replaceVaultFile`). The http half (the presigned PUT, the key on the row, the audit row) is the API's
 * `files-stream.test.ts`.
 */

const NOW = '2026-12-08T13:00:00-07:00';

async function openVault(browser: Browser, width = 1280): Promise<{ page: Page; sent: string[]; close: () => Promise<void> }> {
  const ctx = await browser.newContext({ timezoneId: 'America/Phoenix', viewport: { width, height: width < 768 ? 844 : 900 } });
  const page = await ctx.newPage();
  const sent: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/files/') || r.method() === 'PUT') sent.push(`${r.method()} ${r.url()}`);
  });
  await page.clock.setFixedTime(new Date(NOW));
  await page.goto(`${APP_BASE}/admin/vault?as=admin&parity=r2&now=${encodeURIComponent(NOW)}`);
  await page.locator('body[data-app-ready="true"]').waitFor({ timeout: 15_000 });
  return { page, sent, close: () => ctx.close() };
}

const rowOf = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });
const CSV = { name: 'Lead list.csv', mimeType: 'text/csv', buffer: Buffer.from('name,email\n'.repeat(300)) };

test.describe('the Resource Vault’s real uploads (D-188) @g9 @r2', () => {
  test('Add resource: pick a file, publish, and the row has its real size; nothing is sent without a bucket', async ({ browser }) => {
    const { page, sent, close } = await openVault(browser);
    await page.getByRole('button', { name: 'Add resource' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add resource' });
    const chooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: /Drop a File or Click to Browse/ }).click();
    await (await chooser).setFiles(CSV);
    await expect(dialog.getByRole('button', { name: /Lead list\.csv/ })).toContainText('Ready to publish · click to replace');
    await dialog.getByLabel('Title').fill('Lead list template');
    await expectAccessible(page);
    await dialog.getByRole('button', { name: 'Publish to Vault' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Lead list template published to the vault')).toBeVisible();
    await expect(rowOf(page, 'Lead list template')).toContainText('3 KB');
    expect(sent).toEqual([]);
    await close();
  });

  test('Add resource refuses a file the bucket would refuse, inline', async ({ browser }) => {
    const { page, close } = await openVault(browser);
    await page.getByRole('button', { name: 'Add resource' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add resource' });
    await dialog.locator('input[type=file]').setInputFiles({ name: 'page.html', mimeType: 'text/html', buffer: Buffer.from('<p>x</p>') });
    await expect(dialog.getByRole('alert')).toHaveText('Choose a JSON, PDF, Markdown, ZIP, MP4, Excel, CSV, JPG or VTT file.');
    await close();
  });

  test('Replace file: the row’s "…" opens it, the file goes up, the row keeps its title with the new size', async ({ browser }) => {
    const { page, sent, close } = await openVault(browser);
    const row = rowOf(page, 'Standard chart of accounts');
    await row.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Replace file' }).click();
    const dialog = page.getByRole('dialog', { name: 'Replace file' });
    await expect(dialog).toContainText('Standard chart of accounts');
    await expect(dialog.getByRole('button', { name: 'Replace file' })).toBeDisabled();
    await expectAccessible(page);
    const chooser = page.waitForEvent('filechooser');
    await dialog.getByRole('button', { name: /Drop a File or Click to Browse/ }).click();
    await (await chooser).setFiles({ name: 'Chart v2.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.alloc(48_000, 1) });
    await expect(dialog.getByRole('button', { name: /Chart v2\.xlsx/ })).toContainText('Ready to replace · click to choose another');
    await dialog.getByRole('button', { name: 'Replace file' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('File replaced')).toBeVisible();
    await expect(rowOf(page, 'Standard chart of accounts')).toContainText('48 KB');
    expect(sent).toEqual([]);
    await close();
  });

  test('Replace file at 390: accessible', async ({ browser }) => {
    const { page, close } = await openVault(browser, 390);
    // A phone card has no row role: the innermost block holding the title and its "…".
    const card = page.locator('main div').filter({ hasText: 'Standard chart of accounts' }).filter({ has: page.getByRole('button', { name: 'More actions' }) }).last();
    await card.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Replace file' }).click();
    await expect(page.getByRole('dialog', { name: 'Replace file' })).toBeVisible();
    await expectAccessible(page);
    await close();
  });
});
