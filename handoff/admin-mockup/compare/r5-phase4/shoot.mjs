// R-5 Phase 4 (D-260): the learner portal as January's test team and as a December team, from a real API on a seeded
// database (README.md says how the database and the server were made). Usage, with the API on BASE:
//
//   node handoff/admin-mockup/compare/r5-phase4/shoot.mjs <base> <december user id> <january user id>
//
// Each page at 1280 and 390, device scale 2, America/Denver, its whole length.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const [base, decId, janId] = process.argv.slice(2);
if (!base || !decId || !janId) throw new Error('usage: shoot.mjs <base> <december user id> <january user id>');
const OUT = fileURLToPath(new URL('.', import.meta.url));

const PAGES = [
  ['home', '/learn'],
  ['week-3', '/course/week-3'],
  ['schedule', '/learn/schedule'],
  ['community', '/learn/community'],
];
const WHO = [
  ['december', decId],
  ['january', janId],
];

const browser = await chromium.launch();
for (const [who, userId] of WHO) {
  for (const width of [1280, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, timezoneId: 'America/Denver' });
    const signIn = await ctx.request.post(`${base}/api/test/session`, { data: { userId } });
    if (!signIn.ok()) throw new Error(`sign-in as ${who}: ${signIn.status()}`);
    const page = await ctx.newPage();
    for (const [name, path] of PAGES) {
      await page.goto(`${base}${path}`);
      await page.waitForSelector('body[data-app-ready="true"]');
      // The page keeps its event stream open, so "network idle" never comes: let its reads and its rise settle.
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}${who}-${name}-${width}.png`, fullPage: true });
      console.log(`${who}-${name}-${width}.png  ${new URL(page.url()).pathname}`);
    }
    await ctx.close();
  }
}
await browser.close();
