// Every word on /agents, the Amplified Agent Plan's sales page (DECISIONS.md D-114), that is not
// already somewhere else.
//
// THE SOURCES. Spring's page outline (docs/SPRING-PLAN.md, "Amplified Agent Plan (/agents)"): the hero
// with a one-line promise, $79 a month and a Join button, opening the week of January 4; your first
// week, the starter path; the monthly training rotation as a 4 week calendar; office hours; what
// happens after you buy; proof, the questions and a final button. Her "How each program runs" names the
// starter path and the rotation's topics and skills. The overnight brief: "$79/mo or $790/yr, first
// charge January 4, 2027, cancel anytime. Wire buttons to the Agent Plan carts." The card's own words
// are `AGENT_PLAN` (`../site/offers-content.ts`), shared with /pricing.
//
// Spring's voice: contractions, short sentences, lead with a statement, no victim language. No em
// dashes, no exclamation marks. Labels and buttons in Title Case. No testimonials. Never "Forum".
// Open decisions stay open: the weekly training's day and time ("weekly, starting the week of
// January 4").

import type { Faq } from '../site/offers-content';

export const AGENTS_META = {
  title: 'Amplified Agent Plan · Amplified Impact',
  description:
    'AI for your leads, listings and buyers, with live training every week. $79 a month or $790 a year. Starts the week of January 4. Cancel anytime.',
  path: '/agents',
} as const;

export const AGENTS_HERO = {
  eyebrow: 'Amplified Agent Plan',
  title: 'AI for your leads, listings and buyers. Trained live every week.',
  lede: 'Every agent skill, a short starter path, and one live training a week on a real file. Starts the week of January 4.',
} as const;

/** The starter path (Spring's plan: "AI Brain Setup, Voice Profile, and their first 3 agent skills"). */
export const STARTER = {
  heading: 'Your first week',
  lede: 'Start with a short recorded starter path. It’s built to fit your first week.',
  steps: [
    { slug: 'ai-brain-setup', body: 'Teach your AI who you are and how you work.' },
    { slug: 'voice-profile', body: 'Teach it to write the way you talk.' },
    { slug: null, title: 'Your first 3 agent skills', body: 'Set up three skills you’ll use this month.' },
  ],
} as const;

/** The monthly rotation (Spring's plan, "How each program runs"), by Library slug. */
export const ROTATION = {
  heading: 'One live training a week',
  lede: 'One 60 minute session a week, building one skill live on a real file. The topic changes each week of the month, so you cover every topic in 4 weeks.',
  // [OPEN: the day and time of the weekly agent training]. Spring's placeholder stands until Connor sets it.
  when: 'Weekly, starting the week of January 4.',
  weeks: [
    { n: 1, topic: 'Leads and follow-up', skills: ['speed-to-lead-reply', 'sphere-touch-plan', 'open-house-follow-up'] },
    { n: 2, topic: 'Listings', skills: ['pricing-conversation-prep', 'listing-description-writer', 'seller-listing-update'] },
    { n: 3, topic: 'Buyers and contracts', skills: ['offer-strategy', 'due-diligence-review', 'counter-explainer'] },
    { n: 4, topic: 'Content and your week', skills: ['content-strategist', 'perfect-week', 'appointment-follow-up'] },
  ],
  weekLabel: 'Week',
} as const;

export const OFFICE_HOURS = {
  heading: 'Office hours',
  // The office hours' hour is the course's (1:00 PM Central). The weekly training's day and time stay
  // open: "Weekly, starting the week of January 4." (the offer-pages brief, Nov 11).
  body: 'Every Thursday, 1:00 PM Central, 60 minutes. Drop in with a real file and get help.',
  recorded: 'Every session is recorded, so you’re never behind.',
} as const;

/** What happens after you buy. The first step's login line has a version for before and after the invite hold. */
export const AFTER_BUY = {
  heading: 'What happens after you buy',
  steps: [
    {
      title: 'Watch your email',
      held: { before: 'Your login comes by email on ', after: '.' },
      sent: 'Your login comes by email within a few minutes.',
    },
    { title: 'Nothing is charged yet', body: 'Your card is saved. Your first charge is Monday, January 4, 2027, when your agent skills open.' },
    { title: 'The week of January 4', body: 'Start the starter path and join your first live training.' },
    { title: 'Until then', body: 'The 5 free skills are open to anyone, so you can start today.' },
  ],
} as const;

export const AGENTS_FAQ: { heading: string; items: readonly Faq[] } = {
  heading: 'Questions',
  items: [
    {
      q: 'When does it start?',
      a: ['The week of January 4. Your first charge is Monday, January 4, 2027, the day your agent skills open.'],
    },
    {
      q: 'Can I cancel?',
      a: ['Yes, anytime. If you cancel, you keep the skills you’ve downloaded. You lose new skills, updates and training.'],
    },
    {
      q: 'Monthly or yearly?',
      a: ['$79 a month, or $790 a year. Pick the one you want at checkout.'],
    },
    {
      q: 'Do I need Claude or ChatGPT?',
      a: ['Yes, one of them. Most skills run in both. A few, like Perfect Week, need a paid Claude plan. Every skill page says which tools it works in.'],
    },
    {
      q: 'What if I join mid-month?',
      a: ['Jump in any week. The topics rotate, so you cover every one in 4 weeks, and every session is recorded.'],
    },
    {
      q: 'I’m on a team. Should I buy this?',
      a: ['Ask your team owner about the Amplified Team Plan. You get the same skills and training, and your owner pays less per agent.'],
      link: { label: 'See the Amplified Team Plan', href: '/teams' },
    },
    {
      q: 'What’s the refund policy?',
      // The attorney's wording is the agreement's (docs/SPRING-PLAN.md, Phase 1 item 4): this page points to it.
      a: ['It’s in our Subscription Agreement, which you accept at checkout.'],
      link: { label: 'Read the Subscription Agreement', href: '/agreement' },
    },
  ],
};

export const AGENTS_END = {
  heading: 'Start the week of January 4.',
  button: 'Get Amplified Agent Plan',
  notReadyBefore: 'Not ready? ',
  notReadyLink: 'Start with 5 free skills',
  notReadyAfter: '.',
} as const;
