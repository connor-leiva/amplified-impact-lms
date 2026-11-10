// Every word on /contract-to-close-deadlines, the Contract-to-Close Deadline Tracker page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/transactions/contract-to-close-deadlines/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const CONTRACT_TO_CLOSE_DEADLINES: Guide = grokPage({
  slug: 'contract-to-close-deadlines',
  meta: {
    title: 'Contract-to-Close Deadline Tracker: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that sends a daily digest of overdue, due today and upcoming contract deadlines, with the date math shown. Utah REPC-first, with a general mode. It works from a spreadsheet if you have no transaction system.',
  },
  eyebrow: 'Free Grok Bot Template · Transactions',
  lede: 'Every morning, this bot lists what’s overdue, what’s due today and what’s due in the next three days, across your active files. Printed dates are copied. Day-count deadlines show the math. Conflicting addenda are flagged, not fixed.',
  outcome: { n: '03', title: 'No Missed Deadlines', body: 'A short digest each morning, every date traced to the contract.' },
  optInBody: 'Tell us where to send updates and the template is yours. It’s a Grok Bot skill: one file you add to Grok Bot once, then a routine runs it on a schedule. It reads and drafts, and changes nothing until you approve.',
  connect: [
    'Tell it which system holds your files: Dotloop, SkySlope, Brokermint, Lone Wolf, Paperless Pipeline, Open to Close, or a Google Sheet and an inbox. Connect ',
    { strong: 'Gmail' },
    ' and ',
    { strong: 'Google Drive' },
    ' in Grok Bot.',
  ],
  sampleTitle: 'Contract-to-Close Deadline Tracker: An Example Morning',
  note: [
    'A new contract to add? ',
    { link: 'New Contract Intake', href: '/new-contract-intake', sameTab: true },
    ' puts it in the tracker the same day.',
  ],
  unlockKey: 'gccd-unlocked',
});
