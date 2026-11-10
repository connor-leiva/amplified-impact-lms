// Every word on /lead-source-roi, the Lead-Source ROI page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/bookkeeping/lead-source-roi/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const LEAD_SOURCE_ROI: Guide = grokPage({
  slug: 'lead-source-roi',
  meta: {
    title: 'Lead-Source ROI: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that puts what you spent on each lead source in QuickBooks Online next to what closed in Follow Up Boss. Untagged spend and closings with no source get called out. GCI is never estimated.',
  },
  eyebrow: 'Free Grok Bot Template · Bookkeeping',
  lede: 'Zillow, Google, Facebook, open houses, sphere. On the 5th of every month, this bot puts your spend from QuickBooks Online next to the closed units, volume and GCI in Follow Up Boss, by source. Untagged spend and closings with no source get called out.',
  outcome: { n: '03', title: 'See What Pays', body: 'Cost per closing by source, with nothing estimated.' },
  optInBody: 'Tell us where to send updates and the template is yours. It’s a Grok Bot skill: one file you add to Grok Bot once, then a routine runs it on a schedule. It reads and drafts, and changes nothing until you approve.',
  connect: [
    'Connect ',
    { strong: 'QuickBooks Online' },
    ' and ',
    { strong: 'Google Drive' },
    ' in Grok Bot. It reads Follow Up Boss, or your CRM, from an export or in the browser, and you do the sign-in.',
  ],
  sampleTitle: 'Lead-Source ROI: An Example Month',
  faq: [
    { q: 'How is this different from Team P&L Review?', a: [
      'Team P&L Review is a Claude Skill that reviews the whole P&L. This Grok Bot template looks at lead spend only, next to what closed, every month.',
    ] },
  ],
  note: [
    'Want the whole P&L reviewed, not just lead spend? ',
    { link: 'Team P&L Review', href: '/team-pnl-review', sameTab: true },
    ' is the Claude Skill for that.',
  ],
  unlockKey: 'glsr-unlocked',
});
