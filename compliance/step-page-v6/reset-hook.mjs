/* global process, console, URL, setTimeout */
// Resets the test learner before every shot that uses its saved session (D-210), keeps those shots under the
// API's rate limit, and waits for the app to draw. The handoff's two tests open a
// new browser context with `storageState` for each target screenshot, and the states tick real boxes and mark
// the step done, so each one must start from the same place. Loaded with `node --import`, from the handoff
// folder (where its playwright-core lives); it changes nothing in the tests themselves.
//   V6_RESET_CMD='psql "$DATABASE_URL" -v email=… -f ../../compliance/step-page-v6/reset.sql' \
//     node --import ../../compliance/step-page-v6/reset-hook.mjs diff/pixel-diff.mjs --target … --storage-state …
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const cmd = process.env.V6_RESET_CMD;
if (!cmd) throw new Error('Set V6_RESET_CMD to the command that resets the test learner.');
const { chromium } = createRequire(`${process.cwd()}/`)('playwright-core');
const launch = chromium.launch.bind(chromium);
let resets = 0;
// The API allows 100 requests a minute per session (app.ts, § 9.4). A shot's two page loads make about 25 and
// ticking every box and marking the step done about 50 more, so before each target shot the hook waits until
// the page's own API requests over the last 61 s leave room for a heavy one (V6_SHOT_NEED, 75).
const LIMIT = 100;
const NEED = Number(process.env.V6_SHOT_NEED ?? 75);
const api = [];
const recent = () => { const since = Date.now() - 61_000; while (api.length && api[0] < since) api.shift(); return api.length; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
chromium.launch = async (...args) => {
  const browser = await launch(...args);
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (options = {}) => {
    if (!options.storageState) return newContext(options);
    while (recent() + NEED > LIMIT) await sleep(500);
    execSync(cmd, { stdio: 'inherit' });
    resets++;
    // The tests wait for `load`, which is when the mockup has drawn. The LMS is an app: it draws once the
    // session and the course have loaded, after `load`. So on the target page only, a navigation also
    // waits for the step page to be on screen, and then the tests go on exactly as written.
    const ctx = await newContext(options);
    ctx.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/api/')) api.push(Date.now()); });
    const newPage = ctx.newPage.bind(ctx);
    ctx.newPage = async (...a) => {
      const page = await newPage(...a);
      for (const m of ['goto', 'reload']) {
        const nav = page[m].bind(page);
        page[m] = async (...b) => {
          const res = await nav(...b);
          await page.waitForSelector('[data-step-page] .page', { timeout: 30_000 });
          return res;
        };
      }
      return page;
    };
    return ctx;
  };
  return browser;
};
process.on('exit', () => console.log(`reset-hook: the test learner was reset ${resets} time(s).`));
