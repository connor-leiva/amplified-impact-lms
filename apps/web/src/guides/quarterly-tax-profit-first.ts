// Every word on /quarterly-tax-profit-first, the Quarterly Tax & Profit-First Set-Aside page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/bookkeeping/quarterly-tax-profit-first/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const QUARTERLY_TAX_PROFIT_FIRST: Guide = grokPage({
  slug: 'quarterly-tax-profit-first',
  meta: {
    title: 'Quarterly Tax & Profit-First Set-Aside: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that shows what to move into tax, profit and reserve after each commission month, at the rates you or your CPA set, and how close the next IRS estimate date is. It never invents a tax rate and never moves money.',
  },
  eyebrow: 'Free Grok Bot Template · Bookkeeping · For Producing Agents',
  lede: 'Commission months are lumpy. On the 5th of every month, this bot uses the percentages you or your CPA chose to show what to move into tax, profit and reserve, and how close the next IRS estimate date is. It will not invent a tax rate.',
  outcome: { n: '03', title: 'Set Aside, Not Guessed', body: 'What to move this month, as transfers you approve.' },
  optInBody: 'Tell us where to send updates and the template is yours. It’s a Grok Bot skill: one file you add to Grok Bot once, then a routine runs it on a schedule. It reads and drafts, and changes nothing until you approve.',
  connect: [
    'Connect ',
    { strong: 'QuickBooks Online' },
    ' and ',
    { strong: 'Google Drive' },
    ' in Grok Bot, where your set-aside tracker lives.',
  ],
  sampleTitle: 'Quarterly Tax & Profit-First Set-Aside: An Example Month',
  faq: [
    { q: 'Will it tell me what I owe?', a: [
      'No. It applies the percentages you set and shows the math. Your CPA decides what you owe.',
    ] },
  ],
  note: [
    'Want every closing checked first? ',
    { link: 'Commission Tie-Out', href: '/commission-tie-out', sameTab: true },
    ' ties each deposit to its CDA.',
  ],
  unlockKey: 'gqtp-unlocked',
});
