// Every word on /pricing-conversation-prep that is its own: the landing page for Pricing Conversation
// Prep, a free skill (`skills/pricing-conversation-prep/`, version 1.1) that turns a listing-side CMA
// (a CMA report, an MLS export, or both) into prep for a pricing conversation with a seller: a bottom
// line, the closest comps, a market read from that comp set, a recommended price with a range and a
// confidence level, a talk track, objection answers, a one-page seller summary and Check before
// sending. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md), its page notes and its graded runs (three evals and
// the practice run, all passed, plus a second reviewer's runs of case 2 and the practice set), so the
// page promises what the skill does. Listing side only, for a new listing or a price reduction on an
// active listing. The page never calls the output an appraisal or a valuation: it is the agent's
// recommended price from a CMA, and the agent and the seller set the price (SKILL.md, Run, Draft, Own).
// The note points to Low Appraisal Response and Appointment Follow-Up, the two siblings SKILL.md's
// description routes to most often from here.
//
// Calls left open, and how the page handles them:
//   - The Gmail draft step was not tested (page-notes.md, "Not tested"), so the page never promises a
//     Gmail draft: "What to say" has no prompt for one, and the connector tile says the summary is
//     written in the chat to copy.
//   - Claude Free: the help center lists skills on every plan, the docs on Pro and up, and no run used
//     Free. ChatGPT Free's upload and data analysis limits are unpublished (page-notes.md), so the page
//     gives no numbers for them. The ChatGPT version was not run inside ChatGPT.
//   - Two Utah REPC versions are in use until January 1, 2027: the skill explains the appraisal
//     condition without section numbers or deadline names, and so does the page.
//
// It works in Claude (a skill) and in ChatGPT (a Project). The practice set is two files (a CMA PDF and
// an MLS CSV), attached one by one. `setupMinutes` is an estimate (page-notes gives none): 10, as
// /due-diligence-review and /database-health-check say for the same shared setup steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const PRICING_CONVERSATION_PREP: Guide = skillPage({
  slug: 'pricing-conversation-prep',
  title: 'Pricing Conversation Prep',

  meta: {
    title: 'Pricing Conversation Prep: A Free AI Skill · Amplified Impact',
    description:
      'Upload your CMA before a listing appointment or a price reduction talk, and get back a recommended price you can defend, the story behind it, and answers to your seller’s likely objections. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Listing Agents',
  // page-notes.md, "One-Line Promise", with the actor named and both modes (SKILL.md, "Pick the mode").
  lede: 'Upload your CMA before a listing appointment or a price reduction talk, and the AI hands back a recommended price you can defend, the story behind it, and answers to the objections your seller is most likely to raise.',
  outcome: { n: '03', title: 'Walk In Ready', body: 'A price to defend, a talk track, and answers to pushback.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI recommends a price from your comps. You and your seller decide it.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt:
      'I have a listing appointment Thursday with Sam and Pat Pretendley at 1482 W Juniper Example Dr. They’re hoping for $615,000, and Pat said Zillow shows $607,000. My CMA report and the MLS export are attached. Prep me for the pricing conversation.',
    note: ['There are two files: a CMA report and an MLS export. Every name, address and number in them is made up. '],
  },

  real: {
    // SKILL.md, section 1: a CMA report or MLS export is required; for a price reduction, the active
    // listing's MLS sheet and the showing report the agent already has.
    body: [
      'Start a new chat the same way, attach your CMA report or MLS export (for a price reduction, the listing’s MLS sheet and your showing report too), and say this.',
    ],
    prompt: 'Here’s my CMA. Prep me for the pricing conversation.',
    // SKILL.md, section 1 (the seller's number and Zillow's are used when the agent mentions them) and
    // section 8, item 9 (every number traced to its MLS number or file).
    note: [
      'Add what your sellers have said to the message, like the price they want or the Zillow number they quote, and the AI places it against your comps. Before you share anything, check every price, date and square footage in the ',
      { strong: 'Check before sending' },
      ' list against its MLS number.',
    ],
  },

  chatgpt: { paste: chatgptPaste('pricing-conversation-prep') },

  sections: [
    {
      // sample.md (the practice run), shortened, in the output's own order and its own words, cut only
      // by whole items, rows, sentences and clauses: the files read, the bottom line, the subject, three
      // of the five closest comps, the rambler left out, two lines of the market read, three of the
      // recommendation, the talk track's recommendation and ask, one objection, the seller summary's
      // title, bottom line and Why This Price, and three lines of Check before sending. The comp table
      // keeps two of its ten columns' worth (each sale's price and concessions, and sample.md's "Why it's
      // close, or where it differs"), so it reads on a phone with no sideways scroll; the above-grade
      // and basement split shows in the subject line and the rambler left out.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the prep looks like',
      body: 'What the AI wrote from the practice files: a made-up home in Utah, made-up sellers and a made-up CMA. They’re the same files you practise on in setup.',
      title: 'Pricing Prep: 1482 W Juniper Example Dr (New Listing)',
      note: 'Made-up example. Shortened: a few lines from each part.',
      blocks: [
        {
          p: [
            'Utah listing, so the Utah notes apply. Files read in full: the CMA report and the MLS export, which adds one rambler sale. The two files agree on every listing they share.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Recommend listing at ',
            { strong: '$599,900' },
            ', inside a supported range of ',
            { strong: '$590,000 to $605,000' },
            ', with ',
            { strong: 'high confidence' },
            ': five two-story sales in Juniper Example Park closed between $572,000 and $604,500 in the last six months, and the closest match, 1528 W Juniper Example Dr, went pending in 9 days at $599,900. The Pretendleys’ $615,000 is above every two-story sale in the CMA, and the pushback most likely to come first is Zillow’s $607,000.',
          ],
        },
        { h: 'Closest comps' },
        {
          p: [
            'The subject: two-story, 2006, 2,180 sq ft above grade, basement 1,040 sq ft with 980 finished, 5 beds, 3.5 baths, 2-car garage. Roof replaced 2024; original kitchen cabinets with new counters in 2019.',
          ],
        },
        {
          table: {
            caption: 'Closest comps, 3 of 5 rows',
            head: ['Sale', 'Why it’s close, or where it differs'],
            rows: [
              [
                '1510 W Juniper Example Dr: $589,000, with $7,500 in concessions ($581,500 after)',
                'Same street, nearly the same size, finished basement, original kitchen. Subject should sell at or a little above it.',
              ],
              [
                '1602 W Cedar Sample Cir: $598,000, with $4,000 in concessions ($594,000 after)',
                'Larger: 120 more sq ft above grade, 6 beds, second kitchenette. Subject should land close to it.',
              ],
              [
                '1376 W Cedar Sample Cir: $604,500, no concessions',
                'Remodeled kitchen (2023) and a three-car garage. The top of the bracket: subject shouldn’t pass it.',
              ],
            ],
          },
        },
        {
          p: [
            { strong: 'Left out of the range:' },
            ' 1299 W Maple Mock Way ($612,000, in the export only). It’s a rambler with 1,650 sq ft above grade and 1,600 finished in the basement, so its total looks like the subject’s, but it’s a different home. It sold for $370.91 per above-grade sq ft against $188.31 per total sq ft, which shows how far total square footage can mislead.',
          ],
        },
        { h: 'Market read (this comp set)' },
        {
          items: [
            'Months of supply: 5 two-story sales in the 6-month window = 0.83 a month. 3 two-story actives ÷ 0.83 = 3.6 months. Under the five-to-six-month rule of thumb, so this comp set leans toward sellers.',
            'First price versus reduced: the three that sold at their first price went under contract in 5, 9 and 14 days. The two that started higher and cut took 36 and 44 days and sold at 96.6% of their original price.',
          ],
        },
        { h: 'Recommendation' },
        {
          items: [
            'Recommended price: $599,900. It’s where the closest match went pending in 9 days, and it stays under $600,000, so the home shows up in searches capped there.',
            'The Pretendleys’ $615,000: $10,500 above the highest two-story sale ($604,500), above the new active at $609,000, and $9,900 under the active at $624,900 that has sat 47 days after a cut.',
            'Appraisal check (Utah): a financed buyer’s appraiser will lean on these same closed sales. If the buyer’s contract includes the appraisal condition and the home appraises below the price, the buyer can cancel by the contract’s appraisal deadline and get the earnest money back. It’s a right to cancel, not an automatic price cut, but at $615,000 it’s a real risk. No appraisal result is certain.',
          ],
        },
        { h: 'Talk track' },
        {
          p: [
            { strong: 'Recommendation.' },
            ' “I’d list at $599,900. That’s where the home most like yours drew a buyer in 9 days, and it keeps you in every search up to $600,000.”',
          ],
        },
        {
          p: [
            { strong: 'Ask.' },
            ' “Can we agree on $599,900 so we launch at the price buyers are already responding to?”',
          ],
        },
        { h: 'Objections and answers' },
        {
          p: [
            { strong: '“Zillow says $607,000.”' },
            ' “Zillow’s a fair place to start. In Utah, sale prices aren’t public record, so an online estimate may not have the actual closed prices I’m showing you. What buyers really paid for homes like yours runs from $572,000 to $604,500, and the buyer’s appraiser will use those sales too.”',
          ],
        },
        { h: 'Seller summary' },
        { p: [{ strong: 'Pricing Summary For 1482 W Juniper Example Dr' }] },
        { p: [{ strong: 'I recommend listing at $599,900, inside a supported range of $590,000 to $605,000.' }] },
        {
          p: [
            { strong: 'Why This Price.' },
            ' Your home lines up closely with the five two-story sales around you, and your finished basement and 2024 roof put you near the top of them. The fully remodeled home with a three-car garage sold for $604,500, and the home most like yours just went under contract at $599,900 in 9 days. $599,900 keeps you in searches capped at $600,000, while two higher-priced homes are still on the market.',
          ],
        },
        { p: ['This is my price opinion based on a comparative market analysis, not an appraisal.'] },
        { h: 'Check before sending' },
        {
          items: [
            'Subject 2,180 above grade, 1,040 basement (980 finished): CMA subject table and agent notes. Confirm the square footage against the tax record or a measurement before you quote it.',
            '$589,000, October 17, 2026, $7,500 concessions, original kitchen: MLS 2210555.',
            '$599,900, the range $590,000 to $605,000, and the $600,000 search line: your call.',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", in its order.
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: anything missing from your files (left as a [placeholder]), a home outside Utah, or two files that disagree.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: the recommended price, the supported range, how confident the AI is, and the pushback your seller is most likely to raise.',
        },
        {
          title: 'The closest comps',
          body: 'The three to five closest sales in a table, with why each one is close, and the sales left out and why. Above-grade and basement square feet side by side, and the price after any seller concessions.',
        },
        {
          title: 'A market read',
          body: 'From your comp set, with the math shown: months of supply, sale-to-list, days on market, price cuts, concessions and expired listings.',
        },
        {
          title: 'The recommendation',
          body: 'A range, one specific price and a confidence level. Where your seller’s number sits, what a buyer’s appraisal will lean on, and what would change the number. For a price reduction, a read of your showings and feedback too.',
        },
        {
          title: 'A talk track',
          body: 'An opening, three beats (what sold, what the home competes with, what that means for this home), your recommendation and the ask.',
        },
        {
          title: 'Objections and answers',
          body: 'The four to six your seller is most likely to raise, each answered with numbers from your CMA.',
        },
        {
          title: 'A seller summary',
          body: 'One page for your seller: the bottom line, the closest sales, what’s competing now, a market snapshot and why this price. It calls the number your price opinion, never an appraisal.',
        },
        {
          title: 'Check before sending',
          body: 'Every price, date, percentage, day count and square footage in the drafts, with the MLS number or file to check it against.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You and your seller set the price.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the math',
          body: 'Reads your CMA, MLS sheet and showing report. Sorts and cleans the comps, and works out price per above-grade square foot, concessions, sale-to-list, months of supply and days on market.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The talk track, the objection answers and the seller summary. Nothing reaches your seller until you share it.',
        },
        {
          label: 'Own',
          title: 'Always yours and your seller’s',
          body: 'The price: your recommendation, and your seller’s decision on the list price, any reduction or concession. Every money conversation, and the fair housing review of anything you share. The AI keeps your seller’s loan balance and what they need to net out of anything your seller sees, and never asks for wire instructions or account numbers.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its sources (checked 2026-11-08). No ChatGPT Free limits as
      // numbers: OpenAI doesn't publish them (page-notes.md).
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on, so Claude can do the math on your export. Claude’s help center lists skills on every plan, Free included.',
          tag: 'Team or Enterprise: an owner turns them on',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro.',
          tag: 'Free ChatGPT limits uploads and data analysis',
        },
        {
          title: 'A computer',
          body: 'To set it up on claude.ai or in the Claude desktop app, or on the ChatGPT website. It’s also the easy way to save your CMA from your MLS and attach it.',
        },
        {
          title: 'Your CMA',
          body: 'Your comparative market analysis: a CMA report as a PDF, an MLS export as a CSV (a spreadsheet file), or both. For a price reduction, add the listing’s MLS sheet and your showing report.',
          tag: 'Needs sold comps with prices and close dates',
        },
        {
          title: 'No connectors needed',
          body: 'A connector links the AI to another app, like Gmail. This skill needs none. The AI writes the seller summary in the chat for you to copy.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan and the MLS access you already have.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", without a street address to edit.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your files, and paste. Change any price or day count to yours. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'New listing, with your CMA attached',
          items: ['Prep me for my listing appointment. Here’s my CMA.', 'The sellers want $650,000. What can I actually defend?'],
        },
        {
          label: 'Price reduction, with the MLS sheet, comps and showing report attached',
          items: [
            '45 days on market and no offers. Prep the price reduction conversation. Here’s the MLS sheet, comps and showing report.',
          ],
        },
        {
          label: 'When your seller pushes back, in the same chat',
          items: [
            'The seller keeps quoting Zillow. Help me answer it with these comps.',
            'They say their house is bigger than the neighbor’s. How do I handle the square footage argument?',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md, sections 6 and 7; page-notes.md, "What It Won't Do".
          q: 'Is the AI’s number an appraisal?',
          a: [
            'No. It’s a recommended price built from your CMA. You make the recommendation, and your seller decides the list price. The seller summary says it’s your price opinion based on a comparative market analysis, not an appraisal. The AI never promises a sale price, a timeline or an appraisal result.',
          ],
        },
        {
          // page-notes.md, FAQ (Fannie Mae B4-1.3-05, ANSI Z765, checked 2026-11-08); SKILL.md, section 2.
          q: 'Why doesn’t the AI just use price per square foot?',
          a: [
            'Appraisers count only above-grade finished space as living area and look at the basement separately, as Fannie Mae requires. Total square footage makes a home with a big basement look underpriced. So the AI compares above-grade and basement square feet separately, and uses price per above-grade square foot only as a cross-check. That’s also how it answers a seller who says “our house is bigger.”',
          ],
        },
        {
          // page-notes.md, FAQ and "Privacy before you upload"; SKILL.md, sections 4, 6 and 7.
          q: 'Will my seller see the private remarks or lockbox codes in my export?',
          a: [
            'No. The AI keeps agent-only fields (private remarks, showing instructions, lockbox and gate codes, owner contact details), showing agents’ names, and comments about people, schools or safety out of the talk track and the seller summary. Look over the ',
            { strong: 'Check before sending' },
            ' list anyway before you share anything. Rules on using MLS data in outside tools vary, so check with your MLS or broker.',
          ],
        },
        {
          // page-notes.md, "Who It's For" and FAQ; SKILL.md, "Pick the state".
          q: 'Does it work outside Utah?',
          a: [
            'Yes. The skill is built for Utah first: it knows sale prices aren’t public record there, and how the appraisal condition works in both Utah REPCs in use until January 1, 2027. In another state, the AI uses the same comp method on your files only, and tells you it didn’t check your state’s rules.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Not tested": Claude's help center lists skills on every
          // plan, its docs on Pro and up; no run on Free, and none inside ChatGPT.
          q: 'Which plan do I need?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account shows no way to add a skill, that’s why. In ChatGPT, a Project on Free, Go, Plus or Pro. Free ChatGPT has limits on uploads and data analysis, and ChatGPT tells you when you reach one. We tested the skill in Claude. We haven’t tried it on Claude’s free plan or inside ChatGPT yet, so run the practice files first.',
          ],
        },
        {
          // page-notes.md, "What It Won't Do" and FAQ; SKILL.md, sections 2 and 7.
          q: 'What won’t it do?',
          a: [
            'The AI won’t set the price: it recommends, and you decide. It never invents comps, dollar adjustments, upgrade values or market numbers. With only two or three sold comps, it labels older or farther ones, lowers its confidence and tells you what’s missing. It doesn’t do commission or seller net math (ask your title company for a net sheet), or quote concession limits for a specific buyer (their lender confirms those). It never sends anything, and it never asks for, repeats or handles wire instructions or account numbers.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Appraisal came in under the contract price? Try ',
        { link: 'Low Appraisal Response', href: '/low-appraisal-response', sameTab: true },
        '. Writing to your sellers after the appointment? Try ',
        { link: 'Appointment Follow-Up', href: '/appointment-follow-up', sameTab: true },
        '.',
      ],
    },
  ],

  unlockKey: 'pcp-unlocked',
});
