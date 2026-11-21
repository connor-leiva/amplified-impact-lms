// D-225 (IMPLEMENTATION-SPEC.md §2.2): the v3 components are the package's, converted to TSX and nothing else. This
// renders the package's own JSX and the repo's TSX with the package's sample props and compares the HTML string. A
// renamed class, a moved element or a changed attribute fails here before any pixel test runs.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LockedWeekPage as PkgLocked } from '@lms-v3-pkg/LockedWeekPage.jsx';
import { sampleLockedWeek } from '@lms-v3-pkg/sample-data.js';
import { LockedWeekPage } from './LockedWeekPage';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const NOW = () => Date.parse('2026-11-20T21:18:00Z');

describe('LockedWeekPage is the package’s, converted and nothing else', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('week %i', (n) => {
    const week = sampleLockedWeek(n);
    expect(html(<LockedWeekPage week={week} now={NOW} />)).toBe(html(<PkgLocked week={week} now={NOW} />));
  });
});
