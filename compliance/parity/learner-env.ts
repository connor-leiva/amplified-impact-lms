// D-182: the learner parity suite runs against what ships, the learner portal's flag ON. Imported first by
// `learner.config.ts`, before the main config, so `lib/prepare.ts` reads `LEARNER_V2=1` when it is
// evaluated: the main config then serves the flag-on fixture build (`dist-fixture-v2`, port 4174) and its
// one test project, `e2e-learn`. Playwright's workers inherit the variable from the runner. Today's portal
// keeps its own parity (every scenario against its goldens, flag off) in `pnpm compliance`.
process.env.LEARNER_V2 = '1';
export {};
