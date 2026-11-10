// Every word on www's homepage, `/` on the marketing host (DECISIONS.md D-102).
//
// THE ONLY FILE TO EDIT WHEN THE WORDS CHANGE. `render.ts` turns it into HTML at build time. The page
// is the "Amplified Impact Unslop Review" homepage mockup (2026-11-10), with every line held to what
// the site already says elsewhere:
//   - Most skills are paid now (D-080, D-082): the library's own line, "The free ones ask for your name
//     and email. The rest are in the Amplified Skill Library.", is said here too, and a free skill
//     carries a "Free" tag. Which ones are free is the catalog's call (`FREE_SKILLS`), read through
//     the library, so this file names none.
//   - The team owners' card is the Amplified Team Plan, in /offer's own words (`CARDS_COPY.agents` in
//     `../offer/content.ts`), so the two pages cannot say different things. Prices stay on /offer.
//   - The sample sheet is Offer Strategy's practice run (`skills/offer-strategy/sample.md`), made-up
//     names and numbers, labelled as such.
//   - No income, results or time-saved claims, no counts that are not computed from the library.
//
// House rules: no em dashes, short plain sentences. Labels and buttons in Title Case (D-048),
// headings and descriptions in sentence case.

/**
 * The hero photo: ONE FILE TO SWAP. A neutral placeholder today (`apps/web/public/img/home-hero.jpg`,
 * made by no camera: warm paper and a faint green wash). When Connor's photo arrives, replace that
 * file (keep the name), put its real width and height here, and say in `alt` what it shows. The empty
 * `alt` is right for the placeholder, which shows nothing.
 */
export const HERO_PHOTO = {
  src: '/img/home-hero.jpg',
  width: 1600,
  height: 1200,
  alt: '',
} as const;

export const HOME = {
  meta: {
    title: 'Amplified Impact · AI Skills and Training for Real Estate Teams',
    description:
      'Claude and ChatGPT skills for real estate agents and team owners: offers, inspections, follow-ups and team reports, drafted for you to check. You keep the decisions.',
    url: 'https://www.amplifiedimpact.io/',
    siteName: 'Amplified Impact',
    // The share image is the hero photo, so it changes when the photo does.
    imageAlt: 'Amplified Impact',
  },
  skip: 'Skip to Content',
  logoAlt: 'Amplified Impact',
  nav: {
    label: 'Main',
    links: [
      { label: 'Free Library', href: '/library' },
      { label: 'AI 101', href: '/ai101' },
      { label: 'For Team Owners', href: '#team-owners' },
    ],
    cta: { label: 'Browse the Free Library', href: '/library' },
  },
  hero: {
    title: 'AI that drafts the paperwork. You keep the decisions.',
    lede: 'Claude and ChatGPT skills for real estate agents and team owners: offers, inspections, follow-ups and team reports, drafted for you to check. The paid plans add live training.',
    primary: { label: 'Browse the Free Library', href: '/library' },
    secondary: { label: 'Start AI 101', href: '/ai101' },
  },
  /** Offer Strategy's practice output, as a sheet of paper (`skills/offer-strategy/sample.md`). */
  sheet: {
    label: 'A made-up offer plan from the Offer Strategy skill',
    meta: 'Offer plan · made-up example',
    title: '2286 E Pretend Poppy Ln',
    recommendation:
      'Recommend $562,500 with the $5,000 Seller’s Contribution to Closing Costs the seller is already offering.',
    // `done`: the contract checkbox is ticked. The last is left for the buyer.
    terms: [
      { term: 'Price', value: '$562,500', done: true },
      { term: 'Seller’s contribution', value: '$5,000', done: true },
      { term: 'Earnest money', value: '$5,000', done: true },
      { term: 'Due diligence', value: '10 days', done: true },
      { term: 'Settlement', value: 'Dec 11, 2026', done: false },
    ],
    initials: 'Buyer’s initials. Your buyer decides.',
  },
  skills: {
    heading: 'Skills for the work you do this week',
    /** `n` is counted from the library's live cards, so it is never out of date. */
    body: (n: number) =>
      `${n} guides, skills and templates for real estate teams. The free ones ask for your name and email. The rest are in the Amplified Skill Library.`,
    note: 'Skills that work on client files practise on a made-up example first.',
    all: (n: number) => `See All ${n}`,
    free: 'Free',
    count: (n: number) => `${n} skills`,
    /** By who it is for. Each slug is a page on the site, named by its library card (a test holds it). */
    rows: [
      {
        heading: 'Buyer’s agents',
        slugs: ['showing-tour-prep', 'offer-strategy', 'due-diligence-review', 'new-construction-review'],
      },
      {
        heading: 'Listing agents',
        slugs: ['pricing-conversation-prep', 'offer-comparison', 'repair-request-response', 'low-appraisal-response'],
      },
      {
        heading: 'Team owners',
        slugs: ['database-health-check', 'recruiting-prep', 'team-playbook-builder', 'team-pnl-review'],
      },
      {
        heading: 'Content and your week',
        slugs: ['content-strategist', 'reel-editor', 'perfect-week', 'inbox-meeting-follow-through'],
      },
    ],
  },
  roles: {
    heading: 'The AI drafts. You check, then send.',
    // `done`: the AI does it (the box is ticked). Own stays empty: it is the agent's.
    items: [
      { label: 'Run', body: 'Reading, sorting and the math: comps, dates and deadlines.', done: true },
      { label: 'Draft', body: 'Emails, offer terms and follow-ups. Nothing goes out until you send it.', done: true },
      { label: 'Own', body: 'Money, contracts, fair housing and decisions about people stay with you.', done: false },
    ],
  },
  /** The team owners' card: the Amplified Team Plan on /offer (its name and lines come from there). */
  team: {
    id: 'team-owners',
    label: 'For Team Owners',
    /** How many of the plan's lines to show: what it includes. Its terms and prices are on /offer. */
    lines: 3,
    button: { label: 'See the Team Plan', href: '/offer#plan-agents' },
    all: { label: 'All Plans and Prices', href: '/offer' },
  },
  footer: {
    byline: 'By Connor Leiva · Amplified Impact, LLC',
    label: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
} as const;
