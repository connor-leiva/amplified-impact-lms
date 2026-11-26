/* global process, console */
// READ ONLY: `GET /api/course` with a saved session (`compliance/step-page-v6/signin.mjs`'s storage state), written to
// a file for `week-draws.ts`. It sends one GET and nothing else.
//   node compliance/lms-v3/get-course.mjs <origin> <auth.json> <course.json>
import { writeFileSync } from 'node:fs';
import { request } from '@playwright/test';

const [origin, auth, out] = process.argv.slice(2);
if (!origin || !auth || !out) throw new Error('Usage: get-course.mjs <origin> <auth.json> <course.json>');
const ctx = await request.newContext({ baseURL: origin, storageState: auth });
const res = await ctx.get('/api/course', { headers: { accept: 'application/json' } });
writeFileSync(out, await res.text());
console.log(`GET /api/course ${res.status()}: saved to ${out}.`);
await ctx.dispose();
