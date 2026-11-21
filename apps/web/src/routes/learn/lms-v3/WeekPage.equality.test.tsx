// D-225 (IMPLEMENTATION-SPEC.md §2.2): the v3 components are the package's, converted to TSX and nothing else. This
// renders the package's own JSX and the repo's TSX with the package's sample props and compares the HTML string. A
// renamed class, a moved element or a changed attribute fails here before any pixel test runs.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WeekPage as PkgWeek } from '@lms-v3-pkg/WeekPage.jsx';
import { intakeForm, sampleLabels, sampleWeek, withForm } from '@lms-v3-pkg/sample-data.js';
import { WeekPage } from './WeekPage';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('WeekPage (Hero, StepList, Kit, Reference) is the package’s, converted and nothing else', () => {
  it.each(['s1', 's7', 's8', 'deployed'])('learner state %s', (state) => {
    const week = sampleWeek(state);
    expect(html(<WeekPage week={week} labels={sampleLabels} />)).toBe(html(<PkgWeek week={week} labels={sampleLabels} />));
  });
  it.each(['Fill in', 'Continue', 'Edit'])('the intake row once withForm puts the form on it (%s)', (label) => {
    const f = { form: { id: intakeForm.id }, row: { meta: 'Draft', label } };
    const week = withForm(sampleWeek('s1'), f, () => {});
    expect(html(<WeekPage week={week} labels={sampleLabels} />)).toBe(html(<PkgWeek week={week} labels={sampleLabels} />));
  });
});
