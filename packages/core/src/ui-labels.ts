// The copy guard's allowlist (D-173): strings runtime code may hold even though the seed holds them too.
//
// Course content is data: the curriculum builder edits it and the database serves it, and the copy
// guard (`apps/api/test/copy-guard.test.ts`) fails when a seed string of 12 or more characters turns up
// in a runtime literal. A few strings are both: generic UI chrome a screen labels itself with (a button
// verb, a nav label from the mockup) or a name the product and billing use, which the seed happens to
// repeat. Each one is listed here, with why, and reviewed in the PR that adds it. Nothing else belongs
// here: a week title, a step, a question or a session title always comes from the database.

export const UI_LABELS: readonly { text: string; why: string }[] = [
  {
    text: 'Owner and operator',
    why: 'D-228, D-229: the v3 week page’s Reference accordion title and the form drawer’s kicker, words of the approved mockup (handoff/lms-v3). Week 0’s step 2 has the same words as its who line, which still comes from the database.',
  },
  {
    text: 'Amplified AI Accelerator',
    why: 'The program’s name: billing’s `PLAN_NAMES.cohort` (offer.ts), the course page’s tab title, the pre-launch welcome and the calendar files’ names. The course intro repeats it.',
  },
  {
    text: 'opens 15 min before',
    why: 'How a live session’s Join behaves (`JOIN_WINDOW_SHUT` in the join route, and the portal’s join note). The course intro repeats the rule.',
  },
  {
    text: 'Connect Your Data',
    why: 'Part of the course page’s Before heading, “Three Ways to Connect Your Data” (the lanes section, chrome since D-110). D-176’s Week 0 names its sixth step the same words; the step itself still comes from the database.',
  },
  {
    text: 'Office hours',
    why: 'The session-type label (the Schedule, the step player’s help row, the builder). D-193’s glossary uses the same two words for the term. The term’s short and long lines are not in this list.',
  },
  {
    text: 'your operator',
    why: 'The builder’s default Invite button reads “Invite your operator” (D-190). D-193’s Operator term has that phrase as an alias. The alias’s meaning still comes from the glossary, not from this label.',
  },
];

/** The allowlisted strings alone. */
export const UI_LABEL_TEXTS: ReadonlySet<string> = new Set(UI_LABELS.map((l) => l.text));
