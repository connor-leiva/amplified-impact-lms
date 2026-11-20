import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { PROGRAM_TZ, setViewerZone } from '@ai/core';

// Pin the viewer's time zone for every unit test in this package.
//
// `fmt.*` resolves the viewer zone through `viewerZone()`, which falls back to `autoZone()` — the
// HOST's zone — when nothing has set one. Thirteen view-model tests asserted strings like
// `1:00 PM CT`, which is what `fmt.time` renders only when the viewer is ALREADY in the program
// zone. They passed for a developer in Chicago and failed on CI's UTC runner, where the same call
// renders `7:00 PM UTC (1:00 PM CT)`. The assertions were never wrong; they were measuring the
// machine, which is the definition of a false green.
//
// `PROGRAM_TZ` is the honest default here: it is the zone the compliance harness seeds into
// preferences, so a view-model test and the parity golden of the same screen describe one viewer.
// The cross-zone rendering is covered deliberately elsewhere rather than by accident here —
// `packages/core/test/behaviors.test.ts` drives `fmt` through Chicago, New York, Los Angeles and
// `null`, and the `time zone change updates every time on screen` e2e behaviour proves it end to
// end in a browser.
//
// It is set TWICE, deliberately, and both are load-bearing:
//
//   - at module scope, because a setup file is evaluated before the test module is imported, and
//     several suites build their view-model inside a `describe` body. Those run at COLLECTION
//     time, before any hook fires, so a `beforeEach` alone is too late for them — which is how
//     `Wednesdays · 5:00 PM UTC (11:00 AM CT)` still reached an assertion expecting
//     `Wednesdays · 11:00 AM CT` after the hook was added.
//   - in `beforeEach`, which closes the order-dependent version of the same bug: a test that sets
//     its own zone can no longer leak it into whatever runs next.
setViewerZone(PROGRAM_TZ);

beforeEach(() => {
  setViewerZone(PROGRAM_TZ);
});

// D-210: the v6 step page measures and observes the page (the scroll-spy, the scrollers' edge fades, the marker)
// with browser APIs jsdom does not have. In a unit test nothing scrolls or resizes, so these stand in as no-ops;
// what they drive is checked in the browser suites (compliance/, handoff/step-page-v6/diff/).
class NoopObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] { return []; }
}
const g = globalThis as Record<string, unknown>;
if (typeof g.IntersectionObserver === 'undefined') g.IntersectionObserver = NoopObserver;
if (typeof g.ResizeObserver === 'undefined') g.ResizeObserver = NoopObserver;
if (typeof Element !== 'undefined') {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  for (const name of ['scrollTo', 'scrollBy', 'scrollIntoView']) if (typeof proto[name] !== 'function') proto[name] = function noop() {};
}
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
}
