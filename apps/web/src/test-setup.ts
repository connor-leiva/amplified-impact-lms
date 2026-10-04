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
