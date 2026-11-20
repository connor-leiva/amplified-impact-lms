/* global process, console, URL */
// Saves the seeded test learner's session (D-200) for the v6 step page's tests: a password sign-in through
// the app's own /api/auth/login, from the app's origin, then the browser's storage state.
//   node compliance/step-page-v6/signin.mjs <origin> <out.json>    (SEED_TEST_MEMBER_EMAIL / _PASSWORD)
import { chromium } from '@playwright/test';

const [origin, out] = process.argv.slice(2);
const email = process.env.SEED_TEST_MEMBER_EMAIL;
const password = process.env.SEED_TEST_MEMBER_PASSWORD;
if (!origin || !out || !email || !password) throw new Error('Usage: signin.mjs <origin> <out.json>, with SEED_TEST_MEMBER_EMAIL and SEED_TEST_MEMBER_PASSWORD set.');
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' });
const ctx = await browser.newContext();
const r = await ctx.request.post(new URL('/api/auth/login', origin).href, {
  headers: { origin: new URL(origin).origin, 'content-type': 'application/json' },
  data: { email, password, remember: true },
});
const res = { status: r.status(), body: await r.text() };
if (res.status !== 200) throw new Error(`Sign-in failed: ${res.status} ${res.body}`);
await ctx.storageState({ path: out });
await browser.close();
console.log(`Saved the test learner's session to ${out}.`);
