// Every word on /team-payout-journals, the Team Split & Payout Journals page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/bookkeeping/team-payout-journals/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const TEAM_PAYOUT_JOURNALS: Guide = grokPage({
  slug: 'team-payout-journals',
  meta: {
    title: 'Team Split & Payout Journals: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that drafts the journal entries and agent payables for each pay period in QuickBooks Online, cap crossings and desk fees included. Nothing posts until you approve each line.',
  },
  eyebrow: 'Free Grok Bot Template · Bookkeeping · For Team Leaders',
  lede: 'After the commissions tie out, this bot drafts the split, cap, desk fee and payable entries for the period in QuickBooks Online, then waits. Nothing posts without your say-so that week.',
  outcome: { n: '03', title: 'Payouts Drafted, Not Posted', body: 'Entries that balance, for you to approve line by line.' },
  optInBody: 'Tell us where to send updates and the template is yours. It’s a Grok Bot skill: one file you add to Grok Bot once, then a routine runs it on a schedule. It reads and drafts, and changes nothing until you approve.',
  connect: [
    'Connect ',
    { strong: 'QuickBooks Online' },
    ' and ',
    { strong: 'Google Drive' },
    ' in Grok Bot, where your split plans and cap tracker live. Gmail is optional.',
  ],
  sampleTitle: 'Team Split & Payout Journals: An Example Week',
  note: [
    'It works from ',
    { link: 'Commission Tie-Out', href: '/commission-tie-out', sameTab: true },
    '. Run that first, so every deal it pays out has already been checked.',
  ],
  unlockKey: 'gtpj-unlocked',
});
