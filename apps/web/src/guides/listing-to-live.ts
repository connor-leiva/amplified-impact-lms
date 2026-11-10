// Every word on /listing-to-live, the Listing-to-Live Launch Checklist page (DECISIONS.md D-100): a Grok Bot
// template, not a Claude Skill. `grokPage()` in `grok-page.ts` reads the template itself,
// content/grok-bot-templates/transactions/listing-to-live/SKILL.md, for the name to mention, the
// routine (its schedule, example cron and prompt, word for word), the sample and the guardrails.
// What is here is the page's own: the README's blurb and listing row (who it is for, the
// schedule, what it connects to), rewritten in the library's voice, and its pointer to the
// skills and templates next to it. House rules: no em dashes, short plain sentences.

import type { Guide } from './content';
import { grokPage } from './grok-page';

export const LISTING_TO_LIVE: Guide = grokPage({
  slug: 'listing-to-live',
  meta: {
    title: 'Listing-to-Live Launch Checklist: A Free Grok Bot Template · Amplified Impact',
    description: 'A Grok Bot template that gets a listing from signed agreement to live without missing the disclosures, photos, remarks, sign or lockbox. It never publishes to the MLS.',
  },
  eyebrow: 'Free Grok Bot Template · Transactions · For Listing Agents',
  lede: 'Photos, disclosures, remarks (facts only), the sign, the lockbox and your office’s coming-soon rules. Every weekday, this bot checks each listing in pre-launch, before anyone hits publish. Lockbox codes never appear in the report.',
  outcome: { n: '03', title: 'Launch Without a Miss', body: 'A checklist per listing, and nothing published without you.' },
  optInBody: 'Tell us where to send updates and the template is yours. It’s a Grok Bot skill: one file you add to Grok Bot once, then a routine runs it on a schedule. It reads and drafts, and changes nothing until you approve.',
  connect: [
    'Tell it where your listing files live: a system or a Drive folder. It reads the MLS in the browser and never publishes. You do the sign-in.',
  ],
  sampleTitle: 'Listing-to-Live Launch Checklist: An Example Listing',
  note: [
    'Writing the remarks? ',
    { link: 'Listing Description Writer', href: '/listing-description-writer', sameTab: true },
    ' is the Claude Skill for that.',
  ],
  unlockKey: 'gltl-unlocked',
});
