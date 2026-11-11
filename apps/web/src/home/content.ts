// Every word on www's homepage, `/` on the marketing host (DECISIONS.md D-102, D-107; redesigned from
// Connor's reference, `design/home-redesign`).
//
// THE ONLY FILE TO EDIT WHEN THE WORDS CHANGE. `render.ts` and `sections/` turn it into HTML at build
// time; nothing there is copy.
//
// TWO OBJECTS. `PAGE` is the page as it is now: the reference's words, as written (Connor's brief:
// "use the reference's copy as written"), with the Library's real count and the live founding seats in
// place of the reference's fixed ones. `HOME` (and `PHOTOS`) are the earlier outline's words, kept
// UNCHANGED because the rest of www still reads them: the proof line next to every buy button
// (`HOME.proof`, ../site/offers.ts), Meet Spring and Connor (`HOME.meet`, ../site/people.ts), and the
// tests of /pricing and /free. Moving those to `../site/` is a follow-up for a PR that may touch them.
//
// Prices are never typed here: `prices.ts` reads them from the offer's own words. Names are exact:
// Amplified AI Accelerator, Amplified Agent Plan, Amplified Team Plan, Amplified Insiders.
//
// Spring's voice: contractions, short sentences, no victim language, no em dashes. Buttons in Title Case.

import { COHORT_SEATS, PLAN_NAMES } from '@ai/core/offer';
import { CARD_STATES, OFFERS } from '../offer/content';
import { FREE_SKILLS_HREF, PROGRAM_PAGES } from '../site/content';
// Not `../site/offers`: it imports this file, so its button words come in through `sections/plans.ts`.
import { PRICES, usd } from './prices';

/** The two photos in the hero and in Meet Spring and Connor: real ones, theirs (the overnight brief). */
export const PHOTOS = {
  spring: { src: '/img/team/spring-bengtzen.jpg', width: 890, height: 1113, alt: 'Spring Bengtzen' },
  connor: { src: '/img/team/connor-leiva.jpg', width: 1000, height: 1000, alt: 'Connor Leiva' },
} as const;

export const HOME = {
  meta: {
    title: 'Amplified Impact · AI Coaching and Training for Business Owners and Their Teams',
    description:
      'AI coaching and training for business owners and their teams: live builds, ready to use skills and prompts, built inside a real estate team of 100 agents.',
    path: '/',
  },
  hero: {
    title: 'AI coaching and training for business owners and their teams.',
    lede: 'We teach you to build AI into how you work, with live coaching, ready to use skills and prompts. Right now we’re doing it for real estate, because that’s the business we run every day.',
    primary: { label: 'Get 5 Free Skills', href: FREE_SKILLS_HREF },
    secondary: { label: 'See the Programs', href: '/pricing' },
  },
  proof: {
    label: 'Built inside The Utah Life Real Estate Group',
    figure: '100 agents, 700+ homes a year',
  },
  shift: {
    heading: 'Use AI as a tool, or run a business where AI does real work.',
    before: {
      title: 'AI as a tool',
      items: ['You open a chat when you remember to.', 'Every prompt starts from scratch.', 'What you get depends on the day.'],
    },
    after: {
      title: 'AI that does real work',
      items: ['Skills run the same steps every time.', 'Your voice, your numbers and your process are built in.', 'It drafts. You check, then send.'],
    },
  },
  ways: {
    heading: 'Four ways in',
    lede: 'Pick the one that fits how you want to learn. Every price is right here.',
    cards: [
      {
        name: 'Amplified AI Accelerator',
        forWho: 'Team owners and ops leads on Follow Up Boss',
        amount: '$7,500',
        unit: 'founding price',
        line: '8 weeks. 8 skills. Built live with us. Starts Wednesday, December 2.',
        button: { label: 'See the Accelerator', href: '/team-build' },
      },
      {
        name: 'Amplified Agent Plan',
        forWho: 'Agents',
        amount: '$79',
        unit: 'a month, or $790 a year',
        line: 'Every agent skill and live weekly training, starting the week of January 4.',
        button: { label: 'See the Agent Plan', href: '/agents' },
      },
      {
        name: 'Amplified Team Plan',
        forWho: 'Team owners',
        amount: '$1,491',
        unit: 'today for 3 months, up to 15 agents',
        line: 'Every agent on the skills, with weekly training and a view of who’s using it.',
        button: { label: 'See the Team Plan', href: '/teams' },
      },
      {
        name: 'Amplified Insiders',
        forWho: 'Owners and ops leads at their own pace',
        amount: '$1,997',
        unit: 'today for one year, or $197 a month',
        line: 'Every owner and ops skill, 2 new skills a month, and office hours.',
        button: { label: 'Get Amplified Insiders', href: '/pricing#insiders' },
      },
    ],
    every: 'Every program includes weekly office hours.',
    notReadyBefore: 'Not ready? ',
    notReadyLink: 'Start with 5 free skills',
  },
  library: {
    heading: 'The Library',
    /** `n` is counted from the Library's own cards, so it is never out of date. */
    body: (n: number) => `${n} skills, guides and templates, sorted by who they’re for. The free ones are tagged. The rest open when you join.`,
    all: (n: number) => `See All ${n}`,
    free: 'Free',
    locked: 'Locked',
    count: (n: number) => `${n} skills`,
    /** By who it is for. Each slug is a page on the site, named by its Library card (a test holds it). */
    rows: [
      { heading: 'Buyer’s agents', slugs: ['showing-tour-prep', 'offer-strategy', 'due-diligence-review', 'new-construction-review'] },
      { heading: 'Listing agents', slugs: ['pricing-conversation-prep', 'offer-comparison', 'repair-request-response', 'low-appraisal-response'] },
      { heading: 'Team owners', slugs: ['database-health-check', 'recruiting-prep', 'team-playbook-builder', 'team-pnl-review'] },
      { heading: 'Content and your week', slugs: ['content-strategist', 'reel-editor', 'perfect-week', 'inbox-meeting-follow-through'] },
    ],
  },
  trust: {
    heading: 'The AI drafts. You check, then send.',
    items: [
      { label: 'Run', body: 'Reading, sorting and the math: comps, dates and deadlines.', done: true },
      { label: 'Draft', body: 'Emails, offer terms and follow-ups. Nothing goes out until you send it.', done: true },
      { label: 'Own', body: 'Money, contracts, fair housing and decisions about people stay with you.', done: false },
    ],
  },
  /** Offer Strategy's practice output, as a sheet of paper (`skills/offer-strategy/sample.md`). */
  sheet: {
    label: 'A made-up offer plan from the Offer Strategy skill',
    meta: 'Offer plan · Made-up example',
    title: '2286 E Pretend Poppy Ln',
    recommendation: 'Recommend $562,500 with the $5,000 Seller’s Contribution to Closing Costs the seller is already offering.',
    terms: [
      { term: 'Price', value: '$562,500', done: true },
      { term: 'Seller’s contribution', value: '$5,000', done: true },
      { term: 'Earnest money', value: '$5,000', done: true },
      { term: 'Due diligence', value: '10 days', done: true },
      { term: 'Settlement', value: 'Dec 11, 2026', done: false },
    ],
    initials: 'Buyer’s initials. Your buyer decides.',
  },
  free: {
    heading: 'Free resources',
    lede: 'Start here. Each one asks for your name and email, then it’s yours.',
    columns: [
      { heading: 'For Agents', slugs: ['voice-profile', 'ai101'] },
      { heading: 'For Team Owners', slugs: ['ops-time-audit', 'retool', 'task-sync-starter'] },
    ],
    all: { label: 'See All Free Resources', href: '/free' },
  },
  meet: {
    heading: 'Meet Spring and Connor',
    people: [
      {
        name: 'Spring Bengtzen',
        role: 'Founder and CEO, The Utah Life Real Estate Group',
        photo: 'spring',
        body: 'Spring leads an eXp Realty team in Farmington, Utah: 100 agents closing 700+ homes a year. She has more than 20 years in the business and coaches team owners through Spring B.',
      },
      {
        name: 'Connor Leiva',
        role: 'Co-founder, Amplified Impact',
        photo: 'connor',
        body: 'Connor is co-founder of Amplified Impact, an AI consulting firm that specializes in real estate. He has spent more than a decade in real estate operations, from RE/MAX Headquarters to Realogy to PLACE.',
      },
    ],
    more: { label: 'Read Our Story', href: '/about' },
  },
  end: {
    heading: 'Start with 5 free skills.',
    body: 'Or pick the program that fits. Every price is on the page.',
    primary: { label: 'Get 5 Free Skills', href: FREE_SKILLS_HREF },
    secondary: { label: 'See the Programs', href: '/pricing' },
  },
} as const;

// --- The page as it is now ------------------------------------------------------------------------

/** Where the page links. Each is a page the site already has; the buy buttons' Payment Links are /api/offer's. */
export const HREFS = {
  library: '/library',
  ai101: '/ai101',
  freeSkills: FREE_SKILLS_HREF,
  pricing: '/pricing',
  /** Each program's own page (`PROGRAM_PAGES`, the same as /pricing's cards). */
  programs: PROGRAM_PAGES,
  /** The page's own sections. */
  teamOwners: '#team-owners',
  plans: '#plans',
} as const;

/** The made-up offer plan, as Offer Strategy drafts it (`skills/offer-strategy/sample.md`). */
const OFFER_PLAN = {
  address: '2286 E Pretend Poppy Ln',
  price: '$562,500',
  terms: [
    { label: 'Price', value: '$562,500' },
    { label: 'Seller’s contribution', value: '$5,000' },
    { label: 'Earnest money', value: '$5,000' },
    { label: 'Due diligence', value: '10 days' },
    { label: 'Settlement', value: 'Dec 11, 2026' },
  ],
} as const;

/** The Library's rows by who they are for. Each slug is a page, named and tagged free by its Library card. */
const ROLES = [
  { id: 'buyers', label: 'Buyer’s agents', icon: 'sessions', slugs: ['showing-tour-prep', 'offer-strategy', 'due-diligence-review', 'new-construction-review'] },
  { id: 'listing', label: 'Listing agents', icon: 'analytics', slugs: ['pricing-conversation-prep', 'offer-comparison', 'repair-request-response', 'low-appraisal-response'] },
  { id: 'owners', label: 'Team owners', icon: 'team-hub', slugs: ['database-health-check', 'recruiting-prep', 'team-playbook-builder', 'team-pnl-review'] },
  { id: 'content', label: 'Content and your week', icon: 'video-lesson', slugs: ['content-strategist', 'reel-editor', 'perfect-week', 'inbox-meeting-follow-through'] },
] as const;

const T = PRICES.teamPlan;

export const PAGE = {
  hero: {
    eyebrow: 'Claude and ChatGPT skills for real estate',
    /** Two lines; the second is the quieter one. */
    title: ['AI that drafts the paperwork.', 'You keep the decisions.'],
    lead: 'Claude and ChatGPT skills for real estate agents and team owners: offers, inspections, follow-ups and team reports, drafted for you to check. The paid plans add live training.',
    primary: { label: 'Browse the Library', href: HREFS.library },
    secondary: { label: 'Start AI 101', href: HREFS.ai101 },
  },
  /** The hero's card: tap each term to check it. */
  offer: {
    label: 'Offer plan, a made-up example',
    kicker: 'Offer plan · made-up example',
    status: { drafting: 'Drafting', drafted: 'Drafted', checked: 'Checked by you' },
    address: OFFER_PLAN.address,
    recommendBefore: 'Recommend ',
    recommendStrong: OFFER_PLAN.price,
    recommendAfter: ' with the $5,000 Seller’s Contribution to Closing Costs the seller is already offering.',
    terms: OFFER_PLAN.terms,
    initials: 'Buyer’s initials',
    decides: 'Your buyer decides.',
    ready: 'Ready for your buyer.',
    /** `{n}` and `{total}` are filled in by the script as terms are ticked. */
    hint: {
      start: 'Tap each term to check it.',
      some: '{n} of {total} checked',
      all: 'Every term checked.',
    },
  },
  /** The strip under the hero. `n` is counted from the Library's own cards. */
  ticker: {
    count: (n: number) => `${n} guides, skills and templates`,
    items: ['Built for Claude and ChatGPT', 'Free skills in the Library'],
    scroll: 'Scroll',
  },
  proof: {
    label: 'Where the skills were built',
    eyebrow: 'Built inside',
    name: 'The Utah Life Real Estate Group',
    /** The same figures as `HOME.proof.figure`: "100 agents, 700+ homes a year" (a test holds them together). */
    stats: [
      { value: 100, plus: false, label: 'agents' },
      { value: 700, plus: true, label: 'homes a year' },
    ],
    marquee: 'Skills in the Library',
  },
  compare: {
    eyebrow: 'Two ways to use AI',
    heading: 'Use AI as a tool, or run a business where AI does real work.',
    tool: {
      index: '01',
      label: 'AI as a tool',
      bubbles: ['You open a chat when you remember to.', 'Every prompt starts from scratch.', 'What you get depends on the day.'],
      composer: 'Ask anything',
    },
    work: {
      index: '02',
      label: 'AI that does real work',
      items: ['Skills run the same steps every time.', 'Your voice, your numbers and your process are built in.', 'It drafts. You check, then send.'],
    },
  },
  steps: {
    eyebrow: 'How every skill works',
    heading: 'The AI drafts. You check, then send.',
    items: [
      { key: 'run', label: 'Run', icon: 'analytics', text: 'Reading, sorting and the math: comps, dates and deadlines.' },
      { key: 'draft', label: 'Draft', icon: 'ai-employee', text: 'Emails, offer terms and follow-ups. Nothing goes out until you send it.' },
      { key: 'own', label: 'Own', icon: 'checklist', text: 'Money, contracts, fair housing and decisions about people stay with you.' },
    ],
    run: {
      tag: 'Run',
      meta: 'Offer plan · made-up example',
      rows: [
        { label: 'Price', value: '$562,500' },
        { label: 'Seller’s contribution', value: '− $5,000' },
      ],
      total: { label: 'Price after the contribution', value: '$557,500' },
      sub: 'Terms and deadlines',
      deadlines: OFFER_PLAN.terms.slice(2),
    },
    draft: {
      tag: 'Draft',
      chip: 'Not sent',
      to: { label: 'To', value: 'Your buyer' },
      subject: { label: 'Subject', value: `Offer Plan for ${OFFER_PLAN.address}` },
      body: 'Here’s the plan for your offer: $562,500, with the $5,000 the seller is already offering toward your closing costs. Earnest money is $5,000, with 10 days for due diligence and settlement on Dec 11, 2026.',
    },
    own: {
      tag: 'Own',
      meta: 'Stays with you',
      rows: ['Money', 'Contracts', 'Fair housing', 'Decisions about people'],
      send: 'Send',
      note: 'You check, then send.',
    },
  },
  library: {
    eyebrow: 'The Library',
    heading: 'Skills for the work you do this week',
    /** `n` is counted from the Library's own cards (58 today), so it is never out of date. */
    intro: (n: number) =>
      `${n} guides, skills and templates for real estate teams. The free ones ask for your name and email. The rest are in the Amplified Skill Library.`,
    note: 'Skills that work on client files practise on a made-up example first.',
    all: (n: number) => `See All ${n}`,
    tabs: 'Skills by role',
    count: (n: number) => `${n} skills`,
    free: 'Free',
    roles: ROLES,
  },
  team: {
    eyebrow: 'For Team Owners',
    heading: PLAN_NAMES.agents,
    intro: 'For teams who want every agent on the agent skills, with weekly coaching.',
    items: [
      'Every agent skill in the platform',
      'A recorded core path, so a new hire starts the week they join',
      'A weekly live agent coaching session',
      'Logins for your agents, and a usage view for you',
    ],
    primary: { label: 'See the Team Plan', href: HREFS.programs.agents },
    secondary: { label: 'All Plans and Prices', href: HREFS.pricing },
    calc: {
      label: 'Agents on your team',
      tiers: ['Up to 15 agents', '16 to 40 agents'],
      /** The slider starts here, as in the reference. */
      start: 12,
      note: 'today for 3 months',
      after: (monthly: number) => `January 4 to April 3, 2027. Then ${usd(monthly)} a month from ${T.monthlyFrom}.`,
      extra: 'Plus a monthly owner call on who’s using it.',
      more: 'More than 40 agents? Email support.',
    },
  },
  plans: {
    eyebrow: 'Plans and prices',
    heading: 'Four ways in',
    intro: 'Pick the one that fits how you want to learn. Every price is right here.',
    accelerator: {
      index: '01',
      name: PLAN_NAMES.cohort,
      who: 'Team owners and ops leads on Follow Up Boss',
      note: 'Founding price',
      after: `Standard price ${usd(PRICES.accelerator.standard)}.`,
      /** After founding closes: /pricing's words for the next cohort's price. */
      closedNote: CARD_STATES.closedUnit,
      /**
       * The seats, live from /api/offer (`{left}` and `{total}` filled by the script): "12 of 15 founding
       * seats left" while any is open, then the reference's own "15 of 15 founding seats taken".
       */
      seatsLeft: '{left} of {total} founding seats left',
      seatsTaken: '{total} of {total} founding seats taken',
      seats: COHORT_SEATS,
      items: ['Both skill sets', 'Eight live 90-minute builds', 'Weekly 60-minute office hours for 90 days after the last build'],
      button: OFFERS.cohort.button,
    },
    agentPlan: {
      index: '02',
      name: 'Amplified Agent Plan',
      who: 'Agents',
      billing: 'Agent Plan billing',
      options: [
        { value: 'month', label: 'Monthly', note: 'a month', after: `Or ${usd(PRICES.agentPlan.yearly)} a year.` },
        { value: 'year', label: 'Yearly', note: 'a year', after: 'Twelve months for the price of ten.' },
      ],
      items: ['Every agent skill in the platform'],
      /** No buy button in the reference: this card's button is its page. */
      button: { label: 'See the Agent Plan', href: HREFS.programs.agentPlan },
    },
    teamPlan: {
      index: '03',
      name: PLAN_NAMES.agents,
      who: 'Team owners',
      change: ' · Change',
      note: 'today for 3 months',
      after: (monthly: number) => `Then ${usd(monthly)} a month from ${T.monthlyFrom}.`,
      items: ['Every agent skill', 'A short recorded starter path for each agent', 'One live agent training a week', 'Logins for your agents, and a usage view for you'],
      button: OFFERS.agents.button,
    },
    insiders: {
      index: '04',
      name: PLAN_NAMES.membership,
      who: 'Owners and ops leads at their own pace',
      billing: 'Insiders billing',
      options: [
        { value: 'year', label: 'Yearly', note: 'today for one year', after: 'Two months free, counted toward the Accelerator.' },
        { value: 'month', label: 'Monthly', note: 'a month', after: 'Three-month minimum.' },
      ],
      items: ['Every owner and ops skill', 'Two new skills a month', 'Weekly office hours'],
      button: OFFERS.membership.button,
    },
    /** What a card says when its button can't sell: /pricing's words (`CARD_STATES`). */
    states: CARD_STATES,
    free: {
      strong: 'Five free skills to start.',
      rest: ' The free ones ask for your name and email.',
      link: { label: 'Browse the Library', href: HREFS.library },
    },
  },
  start: {
    eyebrow: 'AI 101 · Free',
    heading: 'Sounds like you. Looks like you.',
    lead: 'A free, step-by-step guide with the prompts and setup from the session with Spring and Connor.',
    primary: { label: 'Start AI 101', href: HREFS.ai101 },
    secondary: { label: 'Browse the Library', href: HREFS.library },
    parts: [
      {
        index: 'Part I',
        title: 'Your AI voice profile',
        text: 'Build it from 10 to 15 of your own writings, or from about 30 minutes of questions. Works on a phone or laptop.',
      },
      {
        index: 'Part II',
        title: 'Your Carousel Creator',
        text: 'A brand kit and a Carousel Creator project that writes with your voice profile. Needs a laptop and Claude Pro or higher.',
      },
    ],
  },
} as const;

export type RoleIcon = (typeof ROLES)[number]['icon'] | (typeof PAGE.steps.items)[number]['icon'];
