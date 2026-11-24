// Week 0's eight steps, as the AI Accelerator's spec writes them (moved here unchanged from `seed/weeks-0-3-v2.ts`, which
// still builds the course from them). D-241: also read at runtime, as the $37 skill buyer's locked preview of Week 0.
// Pure data, no imports.

export interface Week0Step {
  n: number;
  step: string;
  who: string;
  time: string;
  doneWhen: string;
}

export const WEEK0_STEPS: readonly Week0Step[] = [
  { n: 1, step: 'Fill In Your Intake and Name Your Operator', who: 'Owner', time: '10 min', doneWhen: 'Intake in, operator invited, stack card sent back' },
  { n: 2, step: 'Watch the Orientation', who: 'Owner and operator', time: '30 min', doneWhen: 'Both know how a week runs and what a hire is' },
  { n: 3, step: 'Start Your Time Baseline', who: 'Owner', time: '20 min, over two weeks', doneWhen: 'Six tasks timed per occurrence, or marked not done today' },
  // ADJUSTED: spec "Get Claude Ready".
  { n: 4, step: 'Get Your AI Ready', who: 'Operator', time: '20 min', doneWhen: 'Paid plan, training off, skills on, both cohort skills pass their self-test, on the Claude Path or the ChatGPT Path' },
  { n: 5, step: 'Set Up Your AI Brain', who: 'Each of you', time: '30 min', doneWhen: 'A new chat knows the business, and About My Business is in the AI Office' },
  { n: 6, step: 'Connect Your Data', who: 'Operator', time: '25 min', doneWhen: 'Each green source answers a test question; each yellow source’s export is in the inbox' },
  // ADJUSTED: "on your platform" added; ChatGPT per-tool blocking is Test B.
  { n: 7, step: 'Lock the Guardrails', who: 'Operator', time: '10 min', doneWhen: 'Every write tool Blocked except drafts and AI Office saves, on your platform' },
  { n: 8, step: 'Run the Ready Check and Your Test Hire', who: 'Operator', time: '20 min, plus a next-morning check', doneWhen: 'Ready Check is green and the test hire ran with nobody there' },
];
