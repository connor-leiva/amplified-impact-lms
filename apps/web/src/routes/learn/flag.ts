// The learner portal v2's switch (D-177). Built alongside the current learner portal, behind a flag that
// is off by default: the user's Nov 18 choice.
//
//   VITE_LEARNER_V2=true    on (the fixture build sets it in .env.fixture)
//   VITE_LEARNER_V2=false   off
//   unset                   off, except under vitest (MODE 'test'), so the screens' tests run
//
// Read once, when the router is built: with the flag off the router registers none of the /learn screens,
// only a redirect to / (`routes.tsx`). No migration, no console flag and no Railway variable: production
// stays off until a build sets the variable on purpose.

export interface LearnerFlagEnv {
  VITE_LEARNER_V2?: string;
  MODE?: string;
}

export function learnerV2Enabled(env: LearnerFlagEnv = import.meta.env as LearnerFlagEnv): boolean {
  if (env.VITE_LEARNER_V2 === 'true') return true;
  if (env.VITE_LEARNER_V2 === 'false') return false;
  return env.MODE === 'test';
}
