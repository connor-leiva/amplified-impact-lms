// Renders a form's answers to a branded PDF with headless Chrome, from src/pdf/form-pdf.js.
//   node tools/make-pdf.mjs                      # the sample: pdf/week-0-intake.sample.pdf (+ .html, the print source)
//   node tools/make-pdf.mjs --state draft --out /tmp/draft.pdf
// The LMS does the same thing on the server for GET /api/forms/:id/pdf (HANDOFF.md §9).
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'node:fs';
import { formPdfHtml } from '../src/pdf/form-pdf.js';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const at = (p) => new URL(p, import.meta.url);
const form = JSON.parse(readFileSync(at('../src/forms/week-0-intake.json'), 'utf8'));
const samples = JSON.parse(readFileSync(at('../src/forms/week-0-intake.samples.json'), 'utf8'));
const state = arg('state', 'submitted'), s = samples[state];
const font = (f) => 'data:font/woff2;base64,' + readFileSync(at('../mockup/fonts/' + f)).toString('base64');
const html = formPdfHtml({
  form, answers: s.answers,
  meta: { team: samples.learner.team, owner: samples.learner.name, cohort: samples.learner.cohort, status: state === 'submitted' ? 'Submitted' : 'Draft', date: state === 'submitted' ? 'Nov 19, 2026' : 'Nov 20, 2026' },
  fonts: { sans: font('geist-latin-wght-normal.woff2'), mono: font('geist-mono-latin-wght-normal.woff2') },
  logo: 'data:image/svg+xml;base64,' + readFileSync(at('../brand/logos/amplified-impact-academy-reversed.svg')).toString('base64'),
});
const out = arg('out', at('../pdf/week-0-intake.sample.pdf').pathname);
const browser = await chromium.launch({ executablePath: arg('chrome', '/usr/bin/google-chrome') });
const pg = await browser.newPage();
await pg.setContent(html, { waitUntil: 'load' });
await pg.evaluate(() => document.fonts.ready);
writeFileSync(out, await pg.pdf({ preferCSSPageSize: true, printBackground: true }));
if (!arg('out')) writeFileSync(at('../pdf/week-0-intake.sample.html'), html);
await browser.close();
console.log('wrote', out);
