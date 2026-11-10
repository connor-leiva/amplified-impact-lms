// Every word on /missing-documents-audit, the Missing-Documents File Audit page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/transactions/missing-documents-audit/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const MISSING_DOCUMENTS_AUDIT: Guide = grokPage({
  slug: 'missing-documents-audit',
  meta: {
    title: 'Missing-Documents File Audit: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that checks each transaction file against your brokerage’s own checklist every weekday, so broker review is a submit, not a scavenger hunt. It never submits a file.',
  },
  eyebrow: 'Free Grok Bot Template · Transactions',
  lede: 'Every weekday, this bot checks each active file against your brokerage’s checklist, not a guessed national list, and says what’s missing or unsigned before anyone submits it for review.',
  outcome: { n: '03', title: 'Ready for Review', body: 'What each file still needs, and nothing submitted without you.' },
  optInBody: 'Tell us where to send updates and the template is yours, with its setup in Grok Bot one step at a time: every button to click and every prompt to copy. It reads and drafts, and changes nothing until you approve.',
  apps: ['Google Drive', 'Gmail'],
  connectNote: [
    'Give it your brokerage’s checklist once, in the chat or as a file in Drive.',
  ],
  sampleTitle: 'Missing-Documents File Audit: An Example Sweep',
  faq: [
    { q: 'How is this different from TC File Audit?', a: [
      'TC File Audit is a Claude Skill you run on one file when you choose, against its contract dates. This Grok Bot template checks every active file against your checklist, each weekday.',
    ] },
  ],
  note: [
    'Want one file audited against its contract dates, with the asks drafted? ',
    { link: 'TC File Audit', href: '/tc-file-audit', sameTab: true },
    ' is the Claude Skill for that.',
  ],
  unlockKey: 'gmda-unlocked',
});
