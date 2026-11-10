// Every word on /trust-earnest-watch, the Trust & Earnest Money Watch page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/bookkeeping/trust-earnest-watch/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const TRUST_EARNEST_WATCH: Guide = grokPage({
  slug: 'trust-earnest-watch',
  meta: {
    title: 'Trust & Earnest Money Watch: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template for brokerages that hold client funds: a weekly three-way check of the trust bank, QuickBooks Online and the per-deal ledger, with commingling and aging funds flags. Utah-first, with a general mode. It never moves money.',
  },
  eyebrow: 'Free Grok Bot Template · Bookkeeping · For Brokers',
  lede: 'For brokers and brokerages that hold earnest money. Every Friday, this bot checks that the trust bank, QuickBooks Online and the per-deal ledger agree, and flags possible commingling, aging funds and closed files not at zero.',
  outcome: { n: '03', title: 'Three Records That Agree', body: 'The differences, ranked by dollars, flagged for the broker.' },
  optInBody: 'Tell us where to send updates and the template is yours. It’s a Grok Bot skill: one file you add to Grok Bot once, then a routine runs it on a schedule. It reads and drafts, and changes nothing until you approve.',
  connect: [
    'Connect ',
    { strong: 'QuickBooks Online' },
    ', ',
    { strong: 'Google Drive' },
    ' and ',
    { strong: 'Gmail' },
    ' in Grok Bot. It opens the trust bank’s site for the posted balance, and you do the sign-in.',
  ],
  sampleTitle: 'Trust & Earnest Money Watch: An Example Week',
  faq: [
    { q: 'Who is it for?', a: [
      'Brokers, brokerage ops and the TCs who hold earnest money for them.',
    ] },
  ],
  note: [
    'Watching the earnest money deadline on a contract? ',
    { link: 'Contract-to-Close Deadline Tracker', href: '/contract-to-close-deadlines', sameTab: true },
    ' tracks the dates.',
  ],
  unlockKey: 'gtew-unlocked',
});
