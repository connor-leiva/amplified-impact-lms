// D-229 (B-18, Phase 7): the intake PDF in the package's placeholder look (Connor, Nov 21: "Ship placeholder look").
// `src/pdf/form-pdf.ts` is the package's `src/pdf/form-pdf.js`, converted and nothing else: the same HTML for every
// sample. And the server's document for the sample answers is byte for byte the package's own print source
// (`pdf/week-0-intake.sample.html`, which `tools/make-pdf.mjs` printed to `pdf/week-0-intake.sample.pdf`), fonts and
// logo included. The pixel gate (pdftoppm at 110 dpi, 0 px per page) is in the PR; this pins its input.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formPdfHtml } from '../src/pdf/form-pdf';
import type { FormPdfInput } from '../src/pdf/form-pdf';
import { PDF_UI, intakePdfHtml, intakePdfName } from '../src/pdf/render';

const PKG = fileURLToPath(new URL('../../../handoff/lms-v3/', import.meta.url));
const json = (p: string) => JSON.parse(readFileSync(PKG + p, 'utf8'));
const form = json('src/forms/week-0-intake.json');
const samples = json('src/forms/week-0-intake.samples.json');
const STATES = ['new', 'draft', 'submitted'] as const;

describe('intake PDF (D-229, B-18)', () => {
  it('converts the package’s formPdfHtml and nothing else: the same HTML for every sample', async () => {
    const pkg = (await import(pathToFileURL(PKG + 'src/pdf/form-pdf.js').href)) as { formPdfHtml: (x: FormPdfInput) => string };
    for (const state of STATES) {
      const x: FormPdfInput = {
        form,
        answers: samples[state].answers,
        meta: { team: samples.learner.team, owner: samples.learner.name, cohort: samples.learner.cohort, status: state === 'submitted' ? 'Submitted' : 'Draft', date: 'Nov 19, 2026' },
        fonts: { sans: 'sans.woff2', mono: 'mono.woff2' },
        logo: 'logo.svg',
      };
      expect(formPdfHtml(x), state).toBe(pkg.formPdfHtml(x));
    }
  });

  it('prints the sample answers as the package’s own print source, byte for byte (fonts and logo included)', () => {
    const html = intakePdfHtml({
      intake: form.intake,
      answers: samples.submitted.answers,
      team: samples.learner.team,
      owner: samples.learner.name,
      cohort: samples.learner.cohort,
      // Nov 19, 2026 in Central, as the sample's footer line.
      submittedAt: Date.parse('2026-11-19T22:00:00Z'),
      savedAt: Date.parse('2026-11-20T22:00:00Z'),
    });
    expect(html).toBe(readFileSync(PKG + 'pdf/week-0-intake.sample.html', 'utf8'));
  });

  it('uses the drawer’s words, dates a draft by its last save, and names the file for the team', () => {
    expect(PDF_UI).toEqual({ title: form.ui.title, kicker: form.ui.kicker });
    const draft = intakePdfHtml({ intake: form.intake, answers: samples.draft.answers, team: 'Northline Realty', owner: 'Alex Morgan', cohort: '', submittedAt: null, savedAt: Date.parse('2026-11-21T03:00:00Z') });
    expect(draft).toContain('Draft');
    expect(draft).toContain('Nov 20, 2026');
    expect(intakePdfName('Northline Realty')).toBe('Week 0 Intake - Northline Realty.pdf');
    expect(intakePdfName('Smith & Co.')).toBe('Week 0 Intake - Smith & Co..pdf');
    expect(intakePdfName('a"b\r\nc/d')).toBe('Week 0 Intake - abcd.pdf');
    expect(intakePdfName('')).toBe('Week 0 Intake - Team.pdf');
  });
});
