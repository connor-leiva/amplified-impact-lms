// Every word on /commission-tie-out, the Commission Tie-Out page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/bookkeeping/commission-tie-out/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const COMMISSION_TIE_OUT: Guide = grokPage({
  slug: 'commission-tie-out',
  meta: {
    title: 'Commission Tie-Out: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that checks every closing’s deposit in QuickBooks Online against the CDA, the split, the cap and the fees, and lists every dollar that does not match. It never changes your books.',
  },
  eyebrow: 'Free Grok Bot Template · Bookkeeping',
  lede: 'Each closing should tell one story: the CDA, the split, the cap, the franchise and referral fees, and the deposit. Every Tuesday, this bot checks them against QuickBooks Online and finds the gap before it becomes an awkward conversation.',
  outcome: { n: '03', title: 'Every Closing Tied Out', body: 'Matches, variances and missing deposits, with the math shown.' },
  optInBody: 'Tell us where to send updates and the template is yours, with its setup in Grok Bot one step at a time: every button to click and every prompt to copy. It reads and drafts, and changes nothing until you approve.',
  apps: ['QuickBooks Online', 'Gmail', 'Google Drive', 'Google Sheets'],
  connectNote: [
    'It opens your brokerage’s commission portal or Follow Up Boss only to confirm a closing; save that login in the Vault.',
  ],
  sampleTitle: 'Commission Tie-Out: An Example Week',
  note: [
    'Once a closing ties out, ',
    { link: 'Team Split & Payout Journals', href: '/team-payout-journals', sameTab: true },
    ' drafts the entries that pay it out.',
  ],
  unlockKey: 'gcto-unlocked',
});
