// Every word on www's homepage, `/` on the marketing host (DECISIONS.md D-102, rewritten in D-107).
//
// THE ONLY FILE TO EDIT WHEN THE WORDS CHANGE. `render.ts` turns it into HTML at build time.
//
// The page is Spring's "Homepage outline" (docs/SPRING-PLAN.md), nine sections in her order and in her
// words where the plan gives them: the hero, the proof strip, the shift, four ways in, the Library
// preview, the trust section, free resources, Meet Spring and Connor, and the final call to action.
// No testimonials yet (the overnight brief). The proof numbers are Connor's: "100 agents, 700+ homes
// a year", current, not hedged. Spring reviews these words.
//
// Prices are the offer's (D-104 and the Agent Plan's live links); every price shows. Names are exact:
// Amplified AI Accelerator, Amplified Agent Plan, Amplified Team Plan, Amplified Insiders.
//
// Spring's voice: contractions, short sentences, no victim language, no em dashes. Buttons in Title Case.

import { FREE_SKILLS_HREF } from '../site/content';

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
