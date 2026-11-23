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
// NOV 17, 2026: the week map, the seven hires, the times (12:00 PM MT) and the two rules in `WHO` and
// `HOW` are Connor's build spec ("Forum AI Owner Implementation Cohort: Build Spec"), which replaces the
// course brief's map. Follow Up Boss is no longer required: Sisu, QuickBooks Online and Google run
// hands-off, and anything else drops an export.
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
    'For team owners and ops leads. Seven AI employees built live with us, at least five running by Feb 3. From Wednesday, December 2. $7,500 founding price.',
  path: '/team-build',
} as const;

export const TB_HERO = {
  eyebrow: 'Amplified AI Accelerator',
  title: '8 weeks. 7 AI employees. Built live with us.',
  lede: 'Bring your ops lead. Each Wednesday we build one AI employee on your own business, live. It runs on a schedule and posts its work to your desk. At least five are running by Feb 3.',
  first: 'First build: Wednesday, December 2 at 12:00 PM MT.',
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
    'Team owners and ops leads.',
    'Teams on Sisu, QuickBooks Online and Google run hands-off. For anything else, you drop in an export. It takes a few minutes a month.',
    'Teams that come as two: the owner, who decides, and the ops lead, who runs it. One person can be both.',
    'Owners who can give it about 2 to 2.5 hours a week, with an ops lead at about 3 to 4. Those are our estimates.',
  ],
  notHeading: 'Who it’s not for',
  notItems: [
    'Anyone who wants hires that send on their own. Ours draft, and nothing sends until someone approves it.',
    'Anyone who wants it built for them. We build together, as a group.',
  ],
  waitlistBefore: 'Missed a seat? ',
  waitlistLink: 'Join the waitlist',
  waitlistAfter: '. You’ll hear first when the next cohort opens.',
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
  heading: 'One hire a week',
  lede: 'Week 0 sets up the office. Then one AI employee a week, built on your own numbers. Every week answers one question about your business. Week 8 is your org chart review.',
  weekLabel: 'Week',
  supportLabel: 'With',
  newTag: 'New',
  holiday: 'No builds or office hours on December 23 or 30.',
  items: [
    {
      n: 0,
      date: 'Due December 2',
      title: 'Set Up the Office',
      question: 'Is our setup ready to hire?',
      skills: ['ai-brain-setup', 'ready-check'],
      note: 'Claude set up, your data connected, write tools blocked and a test hire that posts to your desk with nobody there. Plus a 30-minute orientation.',
    },
    {
      n: 1,
      date: 'Wednesday, December 2',
      title: 'Where the Money Goes',
      question: 'Where does our money go, and is it the right amount?',
      skills: ['map-your-spend'],
      note: 'The hire: Finance Analyst. Runs monthly, after the books close, and posts last month’s numbers to the Owner Desk.',
    },
    {
      n: 2,
      date: 'Wednesday, December 9',
      title: 'Leads That Pay',
      question: 'Which lead sources pay, and is every lead worked?',
      skills: ['lead-source-review'],
      note: 'The hire: Lead Desk Monitor. Checks which new leads were worked to standard and posts each agent’s follow-up list to the Team Board.',
    },
    {
      n: 3,
      date: 'Wednesday, December 16',
      title: 'Run the Week',
      question: 'Does our week start on time and end with every task owned?',
      skills: ['meeting-manager'],
      note: 'The hire: Meeting Manager. Posts the Monday scoreboard before anyone asks, then a recap where every task has an owner and a date.',
    },
    {
      n: 4,
      date: 'Wednesday, January 6',
      title: 'Recruit With Their P&L',
      question: 'Why would a top producer join us, and can I prove it with their own numbers?',
      skills: ['recruit-pnl'],
      note: 'The hire: Recruiting Coordinator. Preps every recruit appointment. Follow-ups to recruits send only after someone approves them.',
    },
    {
      n: 5,
      date: 'Wednesday, January 13',
      title: 'Onboard Every New Agent',
      question: 'Is every new agent set up and on pace?',
      skills: ['new-agent-onboarding'],
      note: 'The hire: Onboarding Coordinator. Shows you every Monday which new agents are set up and on pace.',
    },
    {
      n: 6,
      date: 'Wednesday, January 20',
      title: 'Coach Off the Scorecard',
      question: 'What does each agent need from me this week?',
      skills: ['coaching-packet'],
      note: 'The hire: 1:1 Prep. Puts a one-page packet on your desk before every 1:1: the number, the question and the play.',
    },
    {
      n: 7,
      date: 'Wednesday, January 27',
      title: 'Every Post Checked',
      question: 'Can our posts go out right without me checking every one?',
      skills: ['post-check'],
      note: 'The hire: Marketing Coordinator. Checks every post your VA makes against your standards before it goes up, and hands the VA a fix list.',
    },
    {
      n: 8,
      date: 'Wednesday, February 3',
      title: 'Your AI Org Chart',
      question: 'Which hires stay, and what do I hire next?',
      skills: ['ai-org-chart-review'],
      note: 'No new hire. Re-time each task a hire took over, keep, fix or let go each one, and pick your next hire for a 90-day plan.',
    },
  ] as readonly Week[],
} as const;

/**
 * The Nov 17 build spec's flagship skills that are not Library cards (yet): each shows by name with the
 * New tag, no link. Take one out the day its Library card lands (a test fails until you do).
 */
export const NEW_SKILLS: Readonly<Record<string, string>> = {
  'ready-check': 'Ready Check',
  'map-your-spend': 'Map Your Spend',
  'lead-source-review': 'Lead Source Review',
  'meeting-manager': 'Meeting Manager',
  'recruit-pnl': 'Recruit P&L',
  'new-agent-onboarding': 'New Agent Onboarding',
  'coaching-packet': 'Coaching Packet',
  'post-check': 'Post Check',
  'ai-org-chart-review': 'AI Org Chart Review',
};

export const HOW = {
  heading: 'How it runs',
  items: [
    { title: 'Live builds', body: 'Wednesdays at 12:00 PM MT, 90 minutes. Connor reads three or four teams’ reports live against his standard. Then everyone builds the week’s hire together.' },
    { title: 'Office hours', body: 'Thursdays at 12:00 PM MT, 60 minutes. Bring a real file and get unstuck.' },
    // The Nov 17 build spec's rules 1 and 2, which it says to state on the offer page.
    { title: 'Your tools', body: 'Sisu, QuickBooks Online and Google run hands-off. For anything else, you drop in an export. It takes a few minutes a month.' },
    {
      title: 'What hires do',
      body: 'They read, draft and post to your desk. They never change your CRM or your books. Nothing sends until someone approves it.',
    },
    { title: 'Goal planning', body: 'Thursday, December 10: a year-end AI goal planning Zoom. Thursday, December 17: a second one, with your agents invited.' },
    // Spring: "recordings in the library" (the offer-pages brief, Nov 11).
    { title: 'Recordings', body: 'Every build is recorded, and the recordings live in the Library. A missed week isn’t a lost week.' },
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
      a: ['No. Sisu, QuickBooks Online and Google run hands-off. For anything else, you drop in an export. It takes a few minutes a month.'],
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
      a: ['The hires run in Claude, on a paid plan. The skill library also works in ChatGPT.'],
    },
    {
      q: 'What happens after week 8?',
      a: ['You get 90 days of new skills and office hours. Then Amplified Insiders is $169 a month from Tuesday, May 4, 2027, until you cancel.'],
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

/**
 * NEW COPY FROM THE V2 MOCKUP, for Spring's review: the labels on its two drawings of facts this page
 * already states in words (the hours from `WHO`, the week from `HOW`). Both drawings are hidden from
 * screen readers, since the words beside them say the same thing.
 */
export const V2_DRAWINGS = {
  hours: { title: 'Hours a week', note: 'Our estimates', owner: 'Owner', ops: 'Ops lead', unit: 'hours' },
  week: { title: 'A normal week', zone: 'Mountain time', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], times: ['10 AM', '11 AM', '12 PM', '1 PM', '2 PM'] },
} as const;
