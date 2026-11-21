// D-225 (IMPLEMENTATION-SPEC.md §2.2): the v3 components are the package's, converted to TSX and nothing else. This
// renders the package's own JSX and the repo's TSX with the package's sample props and compares the HTML string. A
// renamed class, a moved element or a changed attribute fails here before any pixel test runs.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SchedulePage as PkgSchedule } from '@lms-v3-pkg/SchedulePage.jsx';
import { SAMPLE_CLOCKS, sampleNow, sampleSchedule } from '@lms-v3-pkg/sample-data.js';
import { SchedulePage } from './SchedulePage';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const NOW = () => Date.parse('2026-11-20T21:18:00Z');

// Every clock the mockup's bar offers, and today's pinned one (the pixel test's): wait, join, live, replay and ended lines.
const CLOCKS = ['today', ...Object.keys(SAMPLE_CLOCKS)];

describe('SchedulePage is the package’s, converted and nothing else', () => {
  it.each(CLOCKS.flatMap((c) => ['s1', 's7', 's8', 'deployed'].map((s) => [s, c])))('learner state %s at clock %s', (state, clock) => {
    const now = clock === 'today' ? NOW : sampleNow(clock);
    const schedule = sampleSchedule(state, clock === 'today' ? undefined : clock);
    expect(html(<SchedulePage schedule={schedule} now={now} />)).toBe(html(<PkgSchedule schedule={schedule} now={now} />));
  });
  it.each(['wait', 'join', 'live'])('the hero in mode %s', (mode) => {
    const schedule = { ...sampleSchedule('s1'), next: { ...sampleSchedule('s1').next, mode } };
    expect(html(<SchedulePage schedule={schedule} now={NOW} />)).toBe(html(<PkgSchedule schedule={schedule} now={NOW} />));
  });
});
