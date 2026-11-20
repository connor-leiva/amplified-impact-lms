import { configure } from '@testing-library/react';

// The learner routes load as lazy chunks (`routes.tsx`). In a test, a route's first visit waits while
// vitest transforms its chunk, and on a busy runner that wait can outlast `findBy`'s one-second default:
// parity E-16 once failed with an empty page that way. A suite that renders these routes loads every
// chunk once, before its first test, so each visit renders from the module cache.
//
// A whole learner page is also a big first render in jsdom. Five of these suites run at once (a loaded
// CI runner) took E-14's and SH-7's first page past one second even with every chunk cached, so these
// suites wait up to five. A passing test is no slower: `findBy` returns as soon as the page is there.
export const LEARNER_FIND_TIMEOUT = 5000;

export async function preloadLearnerRoutes(): Promise<void> {
  configure({ asyncUtilTimeout: LEARNER_FIND_TIMEOUT });
  await Promise.all([
    import('../gates/LearnGate'),
    import('../../../shell/learner/LearnerShell'),
    import('../Home'),
    import('../Week'),
    import('../Step'),
    import('../Intake'),
    import('../Stack'),
    import('../Schedule'),
    import('../Library'),
    import('../Skill'),
    import('../Account'),
    import('../Team'),
    import('../../portal/Vault'),
    import('../Hire'),
  ]);
}

/** Long enough for a cold transform of every chunk on a loaded CI runner. */
export const PRELOAD_TIMEOUT = 120_000;
