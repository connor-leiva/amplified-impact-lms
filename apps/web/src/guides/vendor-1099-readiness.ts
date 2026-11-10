// Every word on /vendor-1099-readiness, the 1099 Vendor & Agent Readiness page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/bookkeeping/vendor-1099-readiness/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const VENDOR_1099_READINESS: Guide = grokPage({
  slug: 'vendor-1099-readiness',
  meta: {
    title: '1099 Vendor & Agent Readiness: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that tracks who you paid, who sent a W-9 and who is over the IRS threshold, so January is a check, not a scramble. It never files the forms and never shows a TIN.',
  },
  eyebrow: 'Free Grok Bot Template · Bookkeeping · For Team Leaders',
  lede: 'Photographers, TCs, stagers, coaches and 1099 agents. Every month, and every Monday from October to January, this bot checks who you paid in QuickBooks Online, who sent a W-9 and who is over the IRS threshold.',
  outcome: { n: '03', title: 'January Is a Check', body: 'Who is over the threshold and whose W-9 is missing, all year.' },
  optInBody: 'Tell us where to send updates and the template is yours, with its setup in Grok Bot one step at a time: every button to click and every prompt to copy. It reads and drafts, and changes nothing until you approve.',
  apps: ['QuickBooks Online', 'Google Drive', 'Gmail'],
  connectNote: [
    'Point it to the Google Drive folder where your W-9s live.',
  ],
  sampleTitle: '1099 Vendor & Agent Readiness: An Example Run',
  unlockKey: 'g1099-unlocked',
});
