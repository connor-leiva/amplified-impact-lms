// Every word on /post-close-file-closeout, the Post-Close File Closeout page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/transactions/post-close-file-closeout/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const POST_CLOSE_FILE_CLOSEOUT: Guide = grokPage({
  slug: 'post-close-file-closeout',
  meta: {
    title: 'Post-Close File Closeout: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that wraps up a file after settlement: the CDA request, the archive, the review ask and the CRM update, all drafted. Nothing is sent or changed until you approve each step.',
  },
  eyebrow: 'Free Grok Bot Template · Transactions',
  lede: 'After funding or recording, this bot drafts the commission request or CDA from documents in the file, the archive, a review request and the change to Past Client in your CRM. Nothing is sent or changed until you approve each one.',
  outcome: { n: '03', title: 'Files Closed Out', body: 'Every last-mile step drafted, for you to approve.' },
  optInBody: 'Tell us where to send updates and the template is yours, with its setup in Grok Bot one step at a time: every button to click and every prompt to copy. It reads and drafts, and changes nothing until you approve.',
  apps: ['Gmail', 'Google Drive'],
  connectNote: [
    'Your CRM is read, not changed; save that login in the Vault if it’s not in Connect apps.',
  ],
  sampleTitle: 'Post-Close File Closeout: An Example File',
  note: [
    'For the deposit itself, ',
    { link: 'Commission Tie-Out', href: '/commission-tie-out', sameTab: true },
    ' checks it against the CDA. For the client’s first year, ',
    { link: 'Post-Closing Client Care', href: '/post-closing-client-care', sameTab: true },
    ' is the Claude Skill.',
  ],
  unlockKey: 'gpcf-unlocked',
});
