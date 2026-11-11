// Every word on /team-build, the Amplified AI Accelerator's sales page (DECISIONS.md D-112), that is not
// already somewhere else.
//
// THE SOURCES. Spring's page outline (docs/SPRING-PLAN.md, "Amplified AI Accelerator (/team-build)"):
// the hero, who it's for and not, the skills one per week, how it runs, what you get, proof, Meet Spring
// and Connor, the price block and the questions. The overnight brief: "8 weeks. 8 skills. Built live
// with us.", first build Wednesday, December 2, seats from /api/offer, the waitlist when sold out,
// requires Follow Up Boss, and "use the course brief's week-to-skill map, not the draft 8-name list".
// The course brief (Connor: "treat the planning PDF as final"): the week map below, its operating
// questions, the locked calendar (Wednesday builds and Thursday office hours at 1:00 PM Central, 90 and
// 60 minutes, nothing on December 23 or 30), the owner and ops lead pairing and its time estimates,
// and "graduation is an operating standard, not a guarantee".
//
// What the card says (price, what you get) is /offer's (`OFFERS.cohort`, D-105); the proof line and
// Spring and Connor are the homepage's. Spring reviews these words before they go live.
//
// Spring's voice: contractions, short sentences, lead with a statement, no victim language. No em
// dashes, no exclamation marks. Labels and buttons in Title Case. No testimonials, no results promises.
// Never "Forum". Open decisions stay open: no payment plan for $9,997.

import type { Faq } from '../site/offers-content';

export const TEAM_BUILD_META = {
  title: 'Amplified AI Accelerator · Amplified Impact',
  description:
    'For team owners and ops leads on Follow Up Boss. 8 weeks. 8 skills. Built live with us, from Wednesday, December 2. $7,500 founding price.',
  path: '/team-build',
} as const;

export const TB_HERO = {
  eyebrow: 'Amplified AI Accelerator',
  title: '8 weeks. 8 skills. Built live with us.',
  lede: 'Bring your ops lead. Each Wednesday we set up one skill on your own business, live, and you put it to work that week.',
  first: 'First build: Wednesday, December 2 at 1:00 PM Central.',
} as const;

/** The buy block's own lines, beside /offer's price and buttons. The countdown and seats are filled per request. */
export const BUY = {
  countdownAfter: ' at the founding price.',
  seatsOf: ' of ',
  seatsAfter: ' seats left.',
} as const;

export const WHO = {
  heading: 'Who it’s for',
  forItems: [
    'Team owners and ops leads on Follow Up Boss.',
    'Teams that come as two: the owner, who decides, and the ops lead, who runs it. One person can be both.',
    'Owners who can give it about 2 to 2.5 hours a week, with an ops lead at about 3 to 4. Those are our estimates.',
  ],
  notHeading: 'Who it’s not for',
  notItems: ['Teams not on Follow Up Boss yet.', 'Anyone who wants it built for them. We build together, as a group.'],
  waitlistBefore: 'Not on Follow Up Boss? ',
  waitlistLink: 'Join the waitlist',
  waitlistAfter: '. You’ll hear first when that changes.',
} as const;

/**
 * The course brief's week-to-skill map, by Library slug. A skill whose Library card exists is a link to
 * its page. Morning Brief (D-108) and New Agent Onboarding Plan (D-109) were shown by name while they
 * were on their own pull requests; both are in the Library now, so every skill on the map is a link.
 * `NEW_SKILLS` stays for any future item the map names before it lands, and a test fails the day such
 * an item is in the Library and still not linked.
 */
export interface Week {
  n: number;
  date: string;
  title: string;
  /** The week's operating question (the course plan). Week 0 has none: it is set-up. */
  question?: string;
  /** The week's skills, flagship first, by Library slug. */
  skills: readonly string[];
  /** Supporting skills, named but not the week's build. */
  support?: readonly string[];
  /** For a week with no skill: what it produces. */
  note?: string;
}

export const WEEKS = {
  heading: 'One skill a week',
  lede: 'Week 0 gets you ready. Then one skill a week, each one built on the last. Every week answers one question about your business.',
  weekLabel: 'Week',
  supportLabel: 'With',
  newTag: 'New',
  holiday: 'No builds or office hours on December 23 or 30.',
  items: [
    {
      n: 0,
      date: 'Before December 2',
      title: 'Get ready',
      skills: ['ai-brain-setup', 'voice-profile', 'team-ai-brain'],
      support: ['ops-time-audit'],
      note: 'Set up your AI, your voice and your team’s, on your own time. Then a 30-minute orientation.',
    },
    { n: 1, date: 'Wednesday, December 2', title: 'Know the business', question: 'What are we paying for leads, and what can we trust?', skills: ['lead-source-roi'] },
    { n: 2, date: 'Wednesday, December 9', title: 'Own the day', question: 'What needs attention, and who owns the next action?', skills: ['morning-brief'] },
    { n: 3, date: 'Wednesday, December 16', title: 'Turn insight into a decision', question: 'What should we solve this week?', skills: ['l10-meeting-prep'] },
    { n: 4, date: 'Wednesday, January 6', title: 'Protect the pipeline', question: 'Where is execution slipping?', skills: ['fub-pipeline-review'] },
    { n: 5, date: 'Wednesday, January 13', title: 'Coach from evidence', question: 'What behavior should change for this agent?', skills: ['agent-1on1-prep'] },
    {
      n: 6,
      date: 'Wednesday, January 20',
      title: 'Delegate an outcome',
      question: 'What work can leave the owner’s desk without lowering standards?',
      skills: ['team-playbook-builder'],
    },
    {
      n: 7,
      date: 'Wednesday, January 27',
      title: 'Make the workflow repeatable',
      question: 'Can your ops lead adapt and run the next workflow without us?',
      skills: ['new-agent-onboarding-plan'],
    },
    {
      n: 8,
      date: 'Wednesday, February 3',
      title: 'Sustain and expand',
      question: 'What stays, what stops, and what should agents adopt next?',
      skills: [],
      note: 'Your cohort-end review: keep, fix or retire each workflow, and a 90-day plan.',
    },
  ] as readonly Week[],
} as const;

/** New Library items the map names before they merge: none now (D-108 and D-109 are in the Library). */
export const NEW_SKILLS: Readonly<Record<string, string>> = {};

export const HOW = {
  heading: 'How it runs',
  items: [
    { title: 'Live builds', body: 'Wednesdays at 1:00 PM Central, 90 minutes. One outcome each week, plus a harder option if you want it.' },
    { title: 'Office hours', body: 'Thursdays at 1:00 PM Central, 60 minutes. Bring a real file and get unstuck.' },
    { title: 'Goal planning', body: 'Thursday, December 10: a year-end AI goal planning Zoom. Thursday, December 17: a second one, with your agents invited.' },
    { title: 'Recordings', body: 'Every build is recorded, so a missed week isn’t a lost week.' },
    { title: 'Holiday break', body: 'No builds or office hours on December 23 or 30.' },
  ],
} as const;

export const GET = {
  heading: 'What you get',
} as const;

export const PROOF = {
  heading: 'Built inside our own business',
  body: 'Spring runs The Utah Life Real Estate Group, an eXp Realty team in Farmington, Utah. We build AI into how that team runs. Then we teach it.',
} as const;

export const PRICE = {
  heading: 'Founding price',
  lede: 'One price for the owner and the ops lead.',
} as const;

export const TB_FAQ: { heading: string; items: readonly Faq[] } = {
  heading: 'Questions',
  items: [
    {
      q: 'Do I need Follow Up Boss?',
      a: ['Yes. We build on Follow Up Boss. On another CRM? Join the waitlist and we’ll tell you when that changes.'],
      link: { label: 'Join the Waitlist', href: '/offer#waitlist' },
    },
    {
      q: 'Who should come?',
      a: ['You and your ops lead. You decide what matters. Your ops lead runs it week to week. One person can do both.'],
    },
    {
      q: 'How much time does it take?',
      a: ['Plan on about 2 to 2.5 hours a week for the owner, and 3 to 4 for the ops lead. That’s our estimate, not a promise.'],
    },
    {
      q: 'What if I miss a build?',
      a: ['Every build is recorded. Watch it, then bring your questions to Thursday office hours.'],
    },
    {
      q: 'Do I need Claude or ChatGPT?',
      a: ['Yes, one of them. Some weeks also use a Grok Bot template. Every skill page says which tools it works in.'],
    },
    {
      q: 'What happens after week 8?',
      a: ['You get 90 days of new skills and office hours. Then Amplified Insiders is $197 a month from Tuesday, May 4, 2027, until you cancel.'],
    },
    {
      q: 'Is there a payment plan?',
      a: ['Yes. At the founding price, you can pay in 2 payments of $3,750.'],
    },
    {
      q: 'What’s the refund policy?',
      // The attorney's wording is the agreement's (docs/SPRING-PLAN.md, Phase 1 item 4): this page points to it.
      a: ['It’s in our Subscription Agreement, which you accept at checkout.'],
      link: { label: 'Read the Subscription Agreement', href: '/agreement' },
    },
  ],
};
