// The words every www page shares (DECISIONS.md D-107): the main nav, the footer and the support
// address. One copy, so the eight pages of Spring's site map (docs/SPRING-PLAN.md, "Site map") can
// never disagree about where a link goes or what it is called.
//
// Spring's voice: short, plain, no em dashes. Labels and buttons in Title Case (D-048).

import { MEMBERSHIP_NAME, PLAN_NAMES } from '@ai/core/offer';

/** The public contact on every www page (the overnight brief: "replace admin@"). /agreement keeps its own. */
export const HELP_EMAIL = 'support@amplifiedimpact.io';

/** Where Log In goes (D-132): the LMS's email and password sign-in, on learn. */
export const LOGIN_URL = 'https://learn.amplifiedimpact.io/login';

/** Where "Get 5 Free Skills" goes: the Library, showing the five free skills first. */
export const FREE_SKILLS_HREF = '/library?show=free';

/**
 * Each program's own page (Connor, Nov 11: "/pricing has no links to the individual offer pages"). The
 * nav's Programs menu, the footer and /pricing's cards and table all link from here, keyed like
 * /pricing's cards (`CARD_ORDER` in `./offers.ts`): `agentPlan` is the Amplified Agent Plan, `agents`
 * the Team Plan. Amplified Insiders has no page of its own; the Library is where it's sold.
 */
export const PROGRAM_PAGES = {
  cohort: '/team-build',
  agents: '/teams',
  agentPlan: '/agents',
  membership: '/library',
} as const;

/** The four programs, in Connor's order, by their exact names. */
export const PROGRAMS = [
  { label: PLAN_NAMES.cohort, href: PROGRAM_PAGES.cohort },
  { label: PLAN_NAMES.agents, href: PROGRAM_PAGES.agents },
  { label: PLAN_NAMES.agent_plan, href: PROGRAM_PAGES.agentPlan },
  { label: MEMBERSHIP_NAME, href: PROGRAM_PAGES.membership },
] as const;

export const SITE = {
  name: 'Amplified Impact',
  url: 'https://www.amplifiedimpact.io',
  logoAlt: 'Amplified Impact',
  skip: 'Skip to Content',
  /**
   * Spring's site map: Programs, The Library, Free Resources, About, Log In and a Get 5 Free Skills button.
   * Programs opens a menu of the four programs and /pricing (a <details>, so a tap opens it with no
   * script); its `href` is where the footer's "Programs" goes.
   */
  nav: {
    label: 'Main',
    links: [
      { label: 'Programs', href: '/pricing', menu: [...PROGRAMS, { label: 'Compare All Programs', href: '/pricing' }] },
      { label: 'The Library', href: '/library' },
      { label: 'Free Resources', href: '/free' },
      { label: 'About', href: '/about' },
    ],
    /** Last in the nav, so between About and the Get 5 Free Skills button, and on a phone's second row too (D-132). */
    login: { label: 'Log In', href: LOGIN_URL },
    cta: { label: 'Get 5 Free Skills', href: FREE_SKILLS_HREF },
  },
  footer: {
    byline: 'Amplified Impact, LLC',
    tagline: 'AI coaching and training for business owners and their teams.',
    programsLabel: 'Programs',
    siteLabel: 'Site',
    legalLabel: 'Legal',
    legal: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Subscription Agreement', href: '/agreement' },
    ],
    contactBefore: 'Questions? Write to ',
    contactAfter: '.',
  },
} as const;
