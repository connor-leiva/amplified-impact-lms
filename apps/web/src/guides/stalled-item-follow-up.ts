// Every word on /stalled-item-follow-up, the Stalled Lender, Title & Escrow Follow-Up page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/transactions/stalled-item-follow-up/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const STALLED_ITEM_FOLLOW_UP: Guide = grokPage({
  slug: 'stalled-item-follow-up',
  meta: {
    title: 'Stalled Lender, Title & Escrow Follow-Up: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that spots stalled appraisal, title, financing, HOA and earnest money items and drafts the follow-up email. It never invents a stall or a status.',
  },
  eyebrow: 'Free Grok Bot Template · Transactions',
  lede: 'If the appraisal, the title commitment, the HOA documents or the earnest money receipt should have moved and has not, this bot drafts the follow-up. Every weekday. It will not invent a stall or a status.',
  outcome: { n: '03', title: 'Nothing Sits Quietly', body: 'The stalled items and the follow-ups, drafted for you to send.' },
  optInBody: 'Tell us where to send updates and the template is yours, with its setup in Grok Bot one step at a time: every button to click and every prompt to copy. It reads and drafts, and changes nothing until you approve.',
  apps: ['Gmail', 'Google Sheets'],
  connectNote: [
    'It reads Gmail to see when each item was last touched.',
  ],
  sampleTitle: 'Stalled Lender, Title & Escrow Follow-Up: An Example Day',
  unlockKey: 'gsif-unlocked',
});
