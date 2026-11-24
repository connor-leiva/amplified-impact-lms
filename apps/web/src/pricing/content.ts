// Every word on /pricing, Programs and Pricing (DECISIONS.md D-111), that is not already somewhere else.
//
// THE SOURCE IS SPRING'S PLAN (docs/SPRING-PLAN.md, "Pricing (/pricing)" and "Make the choice easy"), in
// her order: the headline, the "Which one is right for me?" picker, the founding banner with the
// countdown and seats left, four offer cards, the comparison table, the FAQ, and "Not ready? Start with
// 5 free skills". Spring reviews these words before they go live, so they ship on a pull request.
//
// ONE COPY OF EACH FACT. Three of the four cards are /offer's own words (`OFFERS` in
// `../offer/content.ts`, D-105), so /offer and /pricing cannot price a plan two ways. The fourth, the
// Amplified Agent Plan, is here, from the overnight brief: $117 a month or $790 a year, first charge
// January 4, 2027, 3-Month Minimum. The proof line is the homepage's (`HOME.proof`).
//
// Spring's voice: contractions, short sentences, lead with a statement, no victim language. No em
// dashes, no exclamation marks. Labels and buttons in Title Case, sentences in sentence case. Never
// "Forum". No testimonials (Connor: none until real ones exist).
//
// OPEN DECISIONS STAY OPEN (docs/SPRING-PLAN.md, "Open decisions"): no day or time for the weekly agent
// training ("weekly, starting the week of January 4"), no payment plan for $9,997, no Team Plan price
// after founding (the card goes to the waitlist, Connor 2026-11-10), and no single-skill checkout (Ampy,
// 2026-11-11: there is no single-skill cart, and the page never prices one or says it opens soon).

import { CARD_IDS } from '../site/offers-content';
import type { Faq } from '../site/offers-content';

export const PRICING_META = {
  title: 'Programs and Pricing · Amplified Impact',
  description:
    'Pick the way you want to learn AI. The Amplified AI Accelerator, the Amplified Agent Plan, the Amplified Team Plan and Amplified Insiders, with every price showing.',
  path: '/pricing',
} as const;

export const PRICING_HERO = {
  eyebrow: 'Programs and Pricing',
  title: 'Pick the way you want to learn AI.',
  lede: 'Build it live with us. Train your agents. Or get every skill and go at your own pace. Every price is on this page.',
} as const;

/** "Which one is right for me?": three buttons, each scrolls to its card (Spring's plan). */
export const PICKER: {
  heading: string;
  choices: readonly { label: string; hint: string; href: string; also?: { label: string; href: string } }[];
} = {
  heading: 'Which one is right for me?',
  choices: [
    { label: 'I’m an Agent', hint: 'Amplified Agent Plan', href: `#${CARD_IDS.agentPlan}` },
    // An owner has two cards (the offer-pages brief, Nov 11): the button still lands on the Accelerator,
    // and a link under it reaches the Team Plan's. Together they say what the hint said before.
    {
      label: 'I Own a Team',
      hint: 'Amplified AI Accelerator',
      href: `#${CARD_IDS.cohort}`,
      also: { label: 'Or the Amplified Team Plan', href: `#${CARD_IDS.agents}` },
    },
    { label: 'I Just Want the Skills', hint: 'Amplified Insiders', href: `#${CARD_IDS.membership}` },
  ],
};

export const PLANS_HEADING = 'Four ways in';

/**
 * The comparison table under the cards (Spring's plan, "Pricing (/pricing)", item 5). A cell is words,
 * or `true` (a check, labelled "Included") or `false` (a dash, labelled "Not included"): never a mark
 * without words. The founding prices have an "after November 30" version beside them.
 */
export type Cell = string | boolean | { open: string; closed: string };

export const COMPARE = {
  heading: 'Compare the programs',
  caption: 'What each program includes',
  rowLabel: 'What you get',
  included: 'Included',
  notIncluded: 'Not included',
  /** Column order: the cards' order. */
  rows: [
    {
      label: 'Skills included',
      cells: ['Every owner, ops and agent skill', 'Every agent skill', 'Every agent skill, for each agent', 'Every skill, plus 2 new a month'],
    },
    { label: 'AI employees built with you', cells: ['7, with at least 5 running by Feb 3', false, false, false] },
    {
      label: 'Live training',
      cells: ['8 live builds, 90 minutes, Wednesdays', 'Weekly, starting the week of January 4', 'Weekly, starting the week of January 4', false],
    },
    { label: 'Office hours', cells: [true, true, true, true] },
    { label: 'Owner view', cells: [false, false, 'Logins and a usage view', false] },
    { label: 'Owner call', cells: [false, false, 'Monthly, 16 to 40 agents', false] },
    { label: 'Starts', cells: ['Wednesday, December 2', 'Join any day', 'Agents start December 14', 'Join any day'] },
    {
      label: 'Price',
      cells: [
        { open: '$7,500 founding price', closed: '$9,997, next cohort' },
        '$117 a month, or $790 a year',
        { open: '$1,491 today for 3 months, up to 15 agents', closed: 'Waitlist' },
        '$1,997 today for one year, or $169 a month for team leaders',
      ],
    },
    {
      label: 'Commitment',
      cells: ['Paid in full, or 2 payments', '3-Month Minimum, or $790 a year', 'First 3 months paid today, then monthly', 'One year, or a 3-Month Minimum'],
    },
  ] as readonly { label: string; cells: readonly Cell[] }[],
} as const;

export const FAQ: { heading: string; items: readonly Faq[] } = {
  heading: 'Questions',
  items: [
    {
      q: 'Do I need Claude or ChatGPT?',
      // The Library's own count (`TOOLS` on each card): most skills run in Claude or ChatGPT, a few in Claude
      // only, and the Grok Bot templates in Grok Bot. A test holds "most" to the cards.
      a: [
        'Most skills run in Claude or ChatGPT, so you need one of them. A few, like Perfect Week and Inbox and Meeting Follow-Through, need a paid Claude plan. The Grok Bot templates run in Grok Bot.',
        'Every skill page says which tools it works in. The Amplified AI Accelerator’s hires run in Claude.',
      ],
    },
    {
      q: 'Which plan do I need?',
      a: [
        'An agent? The Amplified Agent Plan.',
        'A team owner who wants AI built into how your team runs? The Amplified AI Accelerator. Want your agents trained too? The Amplified Team Plan.',
        'Want every skill, at your own pace? Amplified Insiders.',
      ],
    },
    {
      q: 'What if I join mid-month?',
      a: [
        'Join any day. The weekly agent training changes topic each week of the month, so you cover every topic in 4 weeks.',
        'The Amplified AI Accelerator runs in cohorts. This one starts Wednesday, December 2.',
      ],
    },
    {
      q: 'Can I cancel?',
      a: [
        'The Amplified Agent Plan monthly has a 3-Month Minimum. Amplified Insiders by the month has a 3-Month Minimum. The Amplified Team Plan’s first 3 months are paid up front.',
        'If you cancel, you keep the skills you’ve downloaded. You lose new skills, updates and office hours.',
      ],
    },
    {
      q: 'Do I need Follow Up Boss?',
      a: ['No. The Amplified AI Accelerator runs hands-off on Sisu, QuickBooks Online and Google. For anything else, you drop in an export. It takes a few minutes a month.'],
    },
    {
      q: 'What’s the refund policy?',
      // The refund terms are the attorney's (docs/SPRING-PLAN.md, Phase 1 item 4): the agreement says them, this page points to it.
      a: ['It’s in our Subscription Agreement, which you accept at checkout.'],
      link: { label: 'Read the Subscription Agreement', href: '/agreement' },
    },
    {
      q: 'Can I buy one skill?',
      // Connor, 2026-11-23: a skill that is not free is $37 once. Insiders opens every skill.
      a: [
        'Yes. A skill that is not free is $37 once. You keep it, including future updates, and a refund ends that access. Amplified Insiders for Team Leaders is $169 a month and opens every skill. Amplified Insiders for Agents is $79 a month and opens every agent skill. Anyone can start with the 5 free skills.',
      ],
      link: { label: 'See the Library', href: '/library' },
    },
  ],
};

/** The page's last line (Spring's plan, item 7). */
export const END = {
  heading: 'Not ready? Start with 5 free skills.',
  body: 'Free for anyone. They make AI useful in your day first.',
  button: 'Get 5 Free Skills',
} as const;
