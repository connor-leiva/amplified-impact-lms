// The kit's words. Almost all of them are live words from elsewhere (the nav, the footer, the offers),
// read from their own files so they can't drift; `KIT` below holds the few the mockup adds, all of them
// listed in the kit PR under "New copy for Spring's review".
//
// Spring's voice: short, plain, no em dashes. Labels and buttons in Title Case (D-048).

import { MEMBERSHIP_NAME, PLAN_NAMES } from '@ai/core/offer';
import { OFFERS } from '../offer/content';
import { PROGRAMS } from '../site/content';
import { AGENT_PLAN } from '../site/offers-content';
import type { ProgramKey } from '../home/program-logo';

/** The words the mockup adds, for controls only the kit has. */
export const KIT = {
  /** The theme switch's name, by the theme it switches to. */
  themeTo: { light: 'Switch to light mode', dark: 'Switch to dark mode' },
  /** The phone menu's button, closed and open, and its list of links. */
  menuOpen: 'Open menu',
  menuClose: 'Close menu',
  menuNav: 'Menu',
  /** The label on every made-up illustration (the brief: keep it). */
  example: 'Made-up example',
} as const;

/**
 * Each program's line in the Programs menu: who it's for, /pricing's own words, and its logo: Connor's
 * lockup (`programLogo()` in `../home/program-logo.ts`, PR #73's artwork), never a generic icon.
 */
const PROGRAM_LINES: Readonly<Record<string, { who: string; logo: ProgramKey }>> = {
  [PLAN_NAMES.cohort]: { who: OFFERS.cohort.forWho, logo: 'accelerator' },
  [PLAN_NAMES.agents]: { who: OFFERS.agents.forWho, logo: 'team-plan' },
  [PLAN_NAMES.agent_plan]: { who: AGENT_PLAN.forWho, logo: 'agent-plan' },
  [MEMBERSHIP_NAME]: { who: OFFERS.membership.forWho, logo: 'insiders' },
};

/**
 * The four programs as the kit's menu shows them: the live `PROGRAMS` (its order, names and links),
 * each with its line. No prices (the brief). A build error if a program has no line.
 */
export const KIT_PROGRAMS = PROGRAMS.map((p) => {
  const line = PROGRAM_LINES[p.label];
  if (!line) throw new Error(`The Programs menu has no line for "${p.label}". Add it to src/kit/content.ts.`);
  return { ...p, ...line };
});
