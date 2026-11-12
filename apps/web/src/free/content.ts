// Every word on /free, Free Resources (DECISIONS.md D-116), that the Library does not already say.
//
// THE SOURCE IS SPRING'S PLAN (docs/SPRING-PLAN.md, "Free resources and lead magnets" and "Free
// Resources (/free)"): two columns, For Agents and For Team Owners, each resource opening its own
// opt-in, with the voice profile and the AI 101 registration at ai.springb.co kept and linked. The
// overnight brief: "Link /voice-profile, /ai101, /ops-time-audit, /retool, /task-sync-starter, and
// ai.springb.co." Each resource's title and line are its Library card's (`ENTRIES`), so this page and
// the Library cannot name one two ways. These are guides and kits, separate from the 5 free skills.
//
// Spring's voice: contractions, short sentences, lead with a statement. No em dashes, no exclamation
// marks. Labels and buttons in Title Case. Never "Forum".

export const FREE_META = {
  title: 'Free Resources · Amplified Impact',
  description:
    'Free guides and kits for agents and team owners: your AI voice profile, AI 101, the Ops Time Audit, Retool, Don’t Replace, and the Task Sync Starter Kit.',
  path: '/free',
} as const;

export const FREE_HERO = {
  eyebrow: 'Free Resources',
  title: 'Free guides and kits to start using AI.',
  lede: 'Pick the column that fits you. Each one asks for your name and email, then it’s yours.',
} as const;

/** Spring's two columns, each resource by its Library page. */
export const COLUMNS = [
  { heading: 'For Agents', slugs: ['voice-profile', 'ai101'] },
  { heading: 'For Team Owners', slugs: ['ops-time-audit', 'task-sync-starter', 'retool'] },
] as const;

/** The AI 101 registration (Spring's plan: "AI 101 registration (ai.springb.co)"), under For Agents. */
export const AI101_SIGNUP = {
  label: 'Register for AI 101',
  href: 'https://ai.springb.co',
  body: 'The live AI 101 workshop for agents, on Spring’s site.',
} as const;

export const OPEN_LABEL = 'Open';

/** The free five are skills, not these: a pointer to them, and the way to everything else. */
export const SKILLS = {
  heading: 'Want the 5 free skills too?',
  body: 'They’re in the Library: AI Brain Setup, Sounds Like You, AI Brain Tune-Up, Perfect Week, and Inbox and Meeting Follow-Through.',
  button: 'Get 5 Free Skills',
  more: 'See the Programs',
} as const;

/**
 * The v2 mockup's labels on this page, which the live page never had: NEW COPY FOR SPRING'S REVIEW, each
 * listed in the pull request. A count is the column's own, so it cannot drift from what's listed.
 */
export const V2_LABELS = {
  /** In each door's corner: "3 Free". */
  doorCount: (n: number) => `${n} Free`,
  /** At each door's foot. */
  doorGo: 'Start Here',
  /** Over each column's heading: "3 Free Resources". */
  colCount: (n: number) => `${n} Free Resources`,
  /** The AI 101 sign-up's kind, where the Library's cards have theirs. */
  signupKind: 'Live Workshop',
} as const;
