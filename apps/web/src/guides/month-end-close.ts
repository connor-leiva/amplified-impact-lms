// Every word on /month-end-close, the Month-End Close Packet page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/bookkeeping/month-end-close/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const MONTH_END_CLOSE: Guide = grokPage({
  slug: 'month-end-close',
  meta: {
    title: 'Month-End Close Packet: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that builds your month-end close packet from QuickBooks Online: reconciliations, leftover uncategorized items, deals that closed but have not paid, and a P&L by agent or lead source. It changes nothing until you approve.',
  },
  eyebrow: 'Free Grok Bot Template · Bookkeeping',
  lede: 'On the 3rd of every month, this bot builds one packet you can review in a sitting: the reconciliations, the leftover uncategorized items, the deals that closed this month but pay next month, and a P&L by agent or lead source.',
  outcome: { n: '03', title: 'The Month, Closed', body: 'One packet to review, with every proposed change waiting on you.' },
  optInBody: 'Tell us where to send updates and the template is yours. It’s a Grok Bot skill: one file you add to Grok Bot once, then a routine runs it on a schedule. It reads and drafts, and changes nothing until you approve.',
  connect: [
    'Connect ',
    { strong: 'QuickBooks Online' },
    ', ',
    { strong: 'Google Drive' },
    ' and ',
    { strong: 'Gmail' },
    ' in Grok Bot. Follow Up Boss or your brokerage portal is optional, for closings that have not paid yet.',
  ],
  sampleTitle: 'Month-End Close Packet: An Example Month',
  faq: [
    { q: 'How is this different from Team P&L Review?', a: [
      'Team P&L Review is a Claude Skill that reads a finished P&L and drafts the owner brief. This Grok Bot template closes the month in QuickBooks Online first, on a schedule.',
    ] },
  ],
  note: [
    'Want the P&L itself reviewed, with the one decision on the table? ',
    { link: 'Team P&L Review', href: '/team-pnl-review', sameTab: true },
    ' is the Claude Skill for that.',
  ],
  unlockKey: 'gmec-unlocked',
});
