// Every word on /closing-week-checklist, the Closing-Week Checklist page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/transactions/closing-week-checklist/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const CLOSING_WEEK_CHECKLIST: Guide = grokPage({
  slug: 'closing-week-checklist',
  meta: {
    title: 'Closing-Week Checklist: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that runs a seven-day closing checklist for every file in its last week, with a wire-fraud reminder that never touches wire instructions.',
  },
  eyebrow: 'Free Grok Bot Template · Transactions',
  lede: 'Walk-through, clear to close, the closing disclosure, keys. Every morning, this bot runs a seven-day checklist for each file about to close, with a wire-fraud warning that tells people to call a number they already trust. It never copies, stores or confirms wiring instructions.',
  outcome: { n: '03', title: 'A Calm Closing Week', body: 'What’s done and what’s open, with the reminders drafted.' },
  optInBody: 'Tell us where to send updates and the template is yours, with its setup in Grok Bot one step at a time: every button to click and every prompt to copy. It reads and drafts, and changes nothing until you approve.',
  apps: ['Gmail', 'Google Drive'],
  connectNote: [
    'It never opens a banking app.',
  ],
  sampleTitle: 'Closing-Week Checklist: An Example Morning',
  note: [
    'After settlement, ',
    { link: 'Post-Close File Closeout', href: '/post-close-file-closeout', sameTab: true },
    ' wraps up the file.',
  ],
  unlockKey: 'gcwc-unlocked',
});
