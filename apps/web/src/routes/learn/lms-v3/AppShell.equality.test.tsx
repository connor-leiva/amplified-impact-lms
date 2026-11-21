// D-225 (IMPLEMENTATION-SPEC.md §2.2): the v3 components are the package's, converted to TSX and nothing else. This
// renders the package's own JSX and the repo's TSX with the package's sample props and compares the HTML string. A
// renamed class, a moved element or a changed attribute fails here before any pixel test runs.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppShell as Pkg } from '@lms-v3-pkg/components/AppShell.jsx';
import { sampleShell } from '@lms-v3-pkg/sample-data.js';
import { AppShell } from './AppShell';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const NOW = () => Date.parse('2026-11-20T21:18:00Z');

describe('AppShell is the package’s, converted and nothing else', () => {
  it.each(['s1', 's7', 's8', 'deployed'])('learner state %s', (state) => {
    const shell = sampleShell(state);
    for (const current of [undefined, 'schedule', 'week-0']) {
      expect(html(<AppShell shell={shell} current={current} now={NOW}><p>page</p></AppShell>)).toBe(html(<Pkg shell={shell} current={current} now={NOW}><p>page</p></Pkg>));
    }
  });
  it.each(['soon', 'live', 'ended', 'nextday'])('clock %s, and the Schedule hiding the strip', (clock) => {
    const shell = sampleShell('s1', clock);
    expect(html(<AppShell shell={shell} hideNext now={NOW}><p /></AppShell>)).toBe(html(<Pkg shell={shell} hideNext now={NOW}><p /></Pkg>));
    expect(html(<AppShell shell={shell} defaultCollapsed now={NOW}><p /></AppShell>)).toBe(html(<Pkg shell={shell} defaultCollapsed now={NOW}><p /></Pkg>));
  });
});
