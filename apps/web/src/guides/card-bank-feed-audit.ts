// Every word on /card-bank-feed-audit, the Weekly Card & Bank Audit page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/bookkeeping/card-bank-feed-audit/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const CARD_BANK_FEED_AUDIT: Guide = grokPage({
  slug: 'card-bank-feed-audit',
  meta: {
    title: 'Weekly Card & Bank Audit: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that checks your business cards and operating account against QuickBooks Online every Monday. It finds uncategorized charges, duplicates, personal spend and missing receipts, and proposes a category for each. No expense reports needed.',
  },
  eyebrow: 'Free Grok Bot Template · Bookkeeping',
  lede: 'Most real estate teams never file an expense report. Every Monday, this bot compares your cards and your operating account to QuickBooks Online and lists what needs a look: uncategorized charges, duplicates, personal spend and missing receipts, each with a proposed category.',
  outcome: { n: '03', title: 'A Clean List Every Monday', body: 'The exceptions, ranked by dollars, for you to approve.' },
  optInBody: 'Tell us where to send updates and the template is yours. It’s a Grok Bot skill: one file you add to Grok Bot once, then a routine runs it on a schedule. It reads and drafts, and changes nothing until you approve.',
  connect: [
    'Connect ',
    { strong: 'QuickBooks Online' },
    ', ',
    { strong: 'Gmail' },
    ' and ',
    { strong: 'Google Drive' },
    ' in Grok Bot. It opens a card or bank site only when the QuickBooks feed looks stale, and you do the sign-in.',
  ],
  sampleTitle: 'Weekly Card & Bank Audit: An Example Week',
  note: [
    'Want the whole month in one packet? ',
    { link: 'Month-End Close Packet', href: '/month-end-close', sameTab: true },
    ' picks up where this leaves off.',
  ],
  unlockKey: 'gcba-unlocked',
});
