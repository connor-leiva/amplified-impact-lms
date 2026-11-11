// The words every www page shares (DECISIONS.md D-107): the main nav, the footer and the support
// address. One copy, so the eight pages of Spring's site map (docs/SPRING-PLAN.md, "Site map") can
// never disagree about where a link goes or what it is called.
//
// Spring's voice: short, plain, no em dashes. Labels and buttons in Title Case (D-048).

/** The public contact on every www page (the overnight brief: "replace admin@"). /agreement keeps its own. */
export const HELP_EMAIL = 'support@amplifiedimpact.io';

/** Where "Get 5 Free Skills" goes: the Library, showing the five free skills first. */
export const FREE_SKILLS_HREF = '/library?show=free';

export const SITE = {
  name: 'Amplified Impact',
  url: 'https://www.amplifiedimpact.io',
  logoAlt: 'Amplified Impact',
  skip: 'Skip to Content',
  /** Spring's site map: Programs, The Library, Free Resources, About, and a Get 5 Free Skills button. */
  nav: {
    label: 'Main',
    links: [
      { label: 'Programs', href: '/pricing' },
      { label: 'The Library', href: '/library' },
      { label: 'Free Resources', href: '/free' },
      { label: 'About', href: '/about' },
    ],
    cta: { label: 'Get 5 Free Skills', href: FREE_SKILLS_HREF },
  },
  footer: {
    byline: 'Amplified Impact, LLC',
    tagline: 'AI coaching and training for business owners and their teams.',
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
