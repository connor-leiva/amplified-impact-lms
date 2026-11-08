// Every word on /due-diligence-review that is its own: the landing page for Due Diligence Review, a
// free skill (`skills/due-diligence-review/`, version 1.1) that reads a buyer's due diligence documents
// on a home under contract and hands back an issue list by tier, questions for the listing agent, a
// negotiating timeline, a draft objection list and a buyer email. What every skill page says the same
// way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md), its page notes and its graded runs (three evals and
// the practice run, all passed, plus a second reviewer's runs), so the page promises what the skill does.
// Buyer side only: the note points listing agents to Repair Request Response.
//
// Two calls are Connor's and are left for him:
//   - Whether Claude's Gmail connector can create drafts. Claude's help center and the connector listing
//     say yes, Claude's docs call it read only, and no run tested it. So the page never promises a Gmail
//     draft: "What to say" leaves out "Make that a Gmail draft", and the one FAQ that mentions it says
//     the pages disagree and to copy the email from the chat.
//   - The practice set's old deed of trust (title Schedule B-I, item 4): put it in the objection, or
//     leave it to the title company. The two runs differed. The sample leaves out every line about it.
//
// The REPC changed on November 1, 2026 (the old form can't be used from January 1, 2027): the skill
// reads the version from the contract's footer, so the page says it works with both Utah forms, and in
// other states from the uploaded contract itself.
//
// It works in Claude (a skill) and in ChatGPT (a Project). The practice set is five PDFs, attached one
// by one. `setupMinutes` is an estimate from the steps (page-notes gives none).
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const DUE_DILIGENCE_REVIEW: Guide = skillPage({
  slug: 'due-diligence-review',
  title: 'Due Diligence Review',

  meta: {
    title: 'Due Diligence Review: A Free AI Skill · Amplified Impact',
    description:
      'Upload the inspection report and the rest of your due diligence documents, and get back what matters, what to ask the seller for, how much time is left, and an email for your buyer. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Buyer’s Agents',
  // page-notes.md, "One-Line Promise".
  lede: 'Upload the inspection report and the rest of your due diligence documents, and the AI hands back what matters, what to ask the seller for, how much time is really left, and an email for your buyer.',
  outcome: { n: '03', title: 'Know What to Ask For', body: 'What matters, what to ask for, and an email for your buyer.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too.',
  setupMinutes: 5,

  practice: {
    // page-notes.md, "Practice Prompt", word for word. The "pretend today" line keeps the made-up
    // deadline from having already passed.
    prompt:
      'Pretend today is Sunday, November 8, 2026. Here’s everything on 2468 Example Aspen Drive in Riverton. My buyers are Avery and Jordan Samplewood. They want to finish the rest of the basement and maybe build a detached shop in the backyard next year. What should we ask for?',
    note: [
      'Every name, address and number in them is made up. The words start with “Pretend today is Sunday, November 8, 2026” so the made-up deadline hasn’t already passed. ',
    ],
  },

  real: {
    body: [
      'Start a new chat the same way, attach your inspection report and the rest of your documents for the home (the signed contract and every addendum too), and say this.',
    ],
    prompt: 'Here’s everything on this home. What should we ask the seller for?',
    // SKILL.md, section 1: the buyer's plans, when the agent mentions them, are checked against every
    // document. Then the shared "Check before sending" line.
    note: [
      'Add your buyer’s plans, like renting it out or finishing the basement, and the AI checks every document against them. Before anything goes out, check every date, dollar amount and page number in the ',
      { strong: 'Check before sending' },
      ' list against your documents.',
    ],
  },

  chatgpt: { paste: chatgptPaste('due-diligence-review') },

  sections: [
    {
      // sample.md (the practice run), shortened, in the output's own order and its own words: the flags,
      // the bottom line, Tier 1 and the first two Tier 2 findings, one question for the listing agent,
      // the timeline's no-response-period lines, two asks and two held-back items, the buyer email in
      // full, and four rows of Check before sending. Left out: every line about the 2011 deed of trust
      // (Connor's call, open in the review).
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a review looks like',
      body: 'What the AI wrote from the practice files: a made-up home in Riverton, Utah, made-up buyers and made-up documents. They’re the same files you practise on in setup.',
      title: 'Due Diligence Review: 2468 Example Aspen Drive, Riverton, Utah',
      note: 'Made-up example. Shortened: a few findings from each part, and the buyer email in full.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'REPC version: the footer reads “EFFECTIVE DECEMBER 4, 2024,” so the December 4, 2024 form’s section numbers apply (8.1, 21, 24(b)).',
            'Not uploaded: the subdivision CC&Rs (a Seller Disclosure under Section 7(d); the title commitment lists CC&Rs recorded in 1995) and evidence of the irrigation water share (Section 7(i); the disclosure says “Certificate to be provided”).',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'The home has two safety items (a water heater that spilled exhaust during the draft test, and radon at 6.8 pCi/L in the basement) and three bigger-ticket items: a roof the inspector says is near the end of its life, stained roof sheathing above a bath fan that vents into the attic (not in the inspector’s summary), and grading that sends water toward the basement corner the buyers plan to finish. That’s 2 Tier 1 and 3 Tier 2 items, and the Due Diligence Deadline is 5 days away, at 5:00 PM Mountain Time on Friday, November 13, 2026. The backyard shop plan runs into two recorded easements along the rear lot line, which the buyers should check before they decide.',
          ],
        },
        { h: 'Issue list' },
        { p: [{ strong: 'Tier 1: Safety and Health' }] },
        {
          p: [
            { strong: '1. Water heater venting (page 7, rated Safety).' },
            ' “The vent connector is separated at the draft hood and slopes downward toward the chimney,” and “exhaust spillage was observed at the draft hood” during a 5-minute draft test. The inspector notes this “can allow carbon monoxide into the home” and says to have a licensed plumber or HVAC contractor correct it before use. Action: ask the seller. Cost: needs bid.',
          ],
        },
        {
          p: [
            { strong: '2. Radon at 6.8 pCi/L (radon report).' },
            ' A 48-hour continuous monitor test in the basement family room averaged 6.8 pCi/L. EPA recommends fixing a home at 4 pCi/L or more. Action: ask the seller for mitigation by a certified radon mitigation professional and a post-mitigation test. Cost: needs bid. Health questions go to a certified radon professional.',
          ],
        },
        { p: [{ strong: 'Tier 2: Major System or Structure' }] },
        {
          p: [
            { strong: '3. Roof (page 3, rated Further Evaluation).' },
            ' “Widespread granule loss on all slopes,” about a dozen cracked or lifted shingles on the south slope, and exposed nail heads. “The roof appears to be near the end of its service life.” The disclosure gives the roof’s age as “Approx. 2004.” Action: get the roofer’s evaluation and bid this week, then ask for a credit or price reduction from that bid. Cost: needs bid.',
          ],
        },
        {
          p: [
            {
              strong:
                '4. Bath fan venting into the attic, with stained roof sheathing (page 9). Not in the inspector’s summary.',
            },
            ' The upstairs hall bath fan duct “ends in the attic insulation instead of venting to the exterior” (Repair), and there is “dark staining on the underside of the roof sheathing over an area about 4 feet by 6 feet around the bath fan location” (Further Evaluation). The sheathing was dry at the time of inspection, and “the inspector cannot determine the nature of the staining.” I’ve rated it Tier 2 because it involves the roof structure and an unknown cause; the roofer evaluating item 3 can look at it on the same visit. Cost: needs bid.',
          ],
        },
        { h: 'Questions for the listing agent' },
        {
          items: [
            'The disclosure answers “No” to any past or present basement water. The inspection shows efflorescence on the foundation wall at the northeast corner (page 10) where the grading slopes toward the house (page 4). Any history there?',
          ],
        },
        { h: 'Negotiating timeline' },
        { p: ['For strategy; confirm dates with your transactions team.'] },
        {
          items: [
            'Due Diligence Deadline: 5:00 PM Mountain Time, Friday, November 13, 2026 (Sections 21 and 24(b)). 5 days from today.',
            'No response period. This REPC gives the seller no set number of days to answer and gives the buyers no cancellation window afterward. If the objection goes out Monday, November 9, the seller has November 10 through 5:00 PM Friday, November 13 to sign a resolution. Each day spent waiting for a roofing bid is a day less for the seller.',
            'If neither happens (Section 8.1(c)): the Due Diligence Condition is waived, and the Earnest Money Deposit becomes non-refundable except under the appraisal and financing conditions.',
          ],
        },
        { h: 'Draft objection list' },
        {
          p: [
            'Plain terms for you to put on your brokerage’s approved form (UAR’s Resolution of Due Diligence Addendum or the state-approved Blank Addendum).',
          ],
        },
        { p: [{ strong: 'Recommended Ask' }] },
        {
          items: [
            'Seller to have a licensed plumber or HVAC contractor correct the water heater venting noted on page 7 of the Practice Point Home Inspections report dated November 6, 2026 (vent connector separated at the draft hood and sloping toward the chimney, with exhaust spillage during the draft test). Seller to provide Buyer the contractor’s written findings and paid invoices no later than five calendar days before the Settlement Deadline.',
            'Seller to credit Buyer $[credit amount from roofing bid] at Settlement toward repair or replacement of the roof noted on page 3 of the same report.',
          ],
        },
        { p: [{ strong: 'Held Back' }] },
        {
          items: [
            'Furnace service (page 6): routine maintenance; the furnace produced heat.',
            'Deck boards and fasteners (page 4): routine maintenance, visible at showings.',
          ],
        },
        { h: 'Buyer email' },
        {
          email: {
            subject: 'Inspection, Radon And Title Review For 2468 Example Aspen Drive',
            body: [
              'Hi Avery and Jordan,',
              'The home is in solid shape overall, but there are two safety items and three bigger items to sort out, and we need to decide what to ask the seller for before 5:00 PM on Friday, November 13.',
              'What Needs Attention',
              'Water heater venting: exhaust spilled back during testing. A licensed contractor should correct it (page 7).',
              'Radon: the basement tested at 6.8 pCi/L. EPA recommends fixing a home at 4 or above, usually with a mitigation system.',
              'Roof: the inspector says it’s near the end of its life. I’d like a roofer’s evaluation and bid this week (page 3).',
              'Attic: a bath fan vents into the attic, and there’s staining on the roof boards around it. The roofer can look at both (page 9).',
              'Northeast basement corner: the soil slopes toward the house, with signs of past moisture on that wall. That matters before you finish the basement (pages 4 and 10).',
              'Your shop plan: a 20-foot irrigation easement and a 10-foot utility easement run along the back lot line. Let’s check what they allow.',
              'What’s Normal For A Home This Age',
              'A GFCI outlet, a loose toilet, furnace service, deck upkeep and caulking.',
              'Your Options',
              'Go ahead as is, ask the seller to fix or credit these items, or cancel by November 13 and get your $8,000 earnest money back.',
              'Next Steps',
              '1. As soon as you can: book a roofer to look at the roof and the attic, and tell me if you want a sewer scope.',
              '2. As early as possible this week: I send our request so the seller has time to answer.',
              '3. By 5:00 PM Friday, November 13: a signed agreement with the seller, or a decision to cancel.',
              '[Agent Name]',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 4 of 13 rows',
            head: ['Item in the drafts', 'Verify against'],
            rows: [
              ['Due Diligence Deadline: Friday, November 13, 2026, 5:00 PM Mountain Time', 'REPC Section 24(b) and Section 21'],
              ['$8,000 Earnest Money Deposit, released on a timely cancellation', 'REPC page 1 and Section 8.1(b)(i)'],
              [
                'Page 7: water heater vent separated, sloping toward the chimney, spillage in a 5-minute draft test',
                'Inspection report, page 7',
              ],
              ['“$[credit amount from roofing bid]”', 'The roofer’s bid'],
            ],
          },
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
          body: 'Only when they apply: a deadline within 48 hours (in bold, with your three choices), a deadline that has passed, anything the AI had to leave blank, a contract outside Utah, and which Utah REPC it read.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: the overall read, how many Tier 1 and Tier 2 items there are, and the days left.',
        },
        {
          title: 'Documents reviewed',
          body: 'Each document the AI read, with its date and pages, and anything you’d expect that’s missing.',
        },
        {
          title: 'An issue list, by tier',
          body: 'Every finding sorted into four tiers, from safety and health down to notes only, with its page. Findings the inspector’s summary left out are marked.',
        },
        {
          title: 'Questions for the listing agent',
          body: 'Neutral questions where the documents disagree, like a disclosure that says no water and a report that shows signs of it.',
        },
        {
          title: 'HOA findings',
          body: 'When you upload HOA documents: special assessments, rental rules, reserves, insurance changes and fees at closing. Every figure comes from the packet.',
        },
        {
          title: 'A negotiating timeline',
          body: 'The days left, what happens if you do nothing, and what happens to the earnest money, all from your contract. Labeled for strategy: your transactions team keeps the official dates.',
        },
        {
          title: 'A draft objection list',
          body: 'What to ask for, and what to hold back, each with a reason. Written as plain terms for you to put on your brokerage’s approved form.',
        },
        {
          title: 'A buyer email',
          body: 'Under 300 words, written as you. It lays out your buyer’s options without telling them whether to buy.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, dollar amount, page number and quote in the drafts, with where to check it.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the reading',
          body: 'Reads every page of every document, sorts each finding into a tier, checks the documents against each other, and counts the days to your deadline.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The questions for the listing agent, the objection list and the buyer email. Nothing reaches the seller’s side, your buyer, a lender or title until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Whether to object, cancel or go ahead, with your buyer. Every repair, credit and dollar amount, and any extension. Wire instructions and account numbers: the AI never asks for them or repeats them.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its sources (checked 2026-11-08).
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 5 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Claude’s help center lists skills on every plan, Free included.',
          tag: 'Team or Enterprise: an owner turns them on',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro.',
          tag: 'Free ChatGPT has upload limits',
        },
        {
          title: 'A computer, once',
          body: 'To set it up on claude.ai or in the Claude desktop app, or on the ChatGPT website. Once added, the Claude skill works in Claude’s phone app too.',
        },
        {
          title: 'Your documents, as PDFs',
          body: 'The full inspection report, plus what else you have: the seller disclosure, HOA documents, radon or sewer scope reports, the title commitment, and the signed contract with every addendum.',
          tag: 'The inspection report is required',
        },
        {
          title: 'No connectors needed',
          body: 'A connector links Claude to another app, like Gmail. This skill needs none. The AI writes the buyer email in the chat for you to copy.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan, and no other accounts to make.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", without "Make that a Gmail draft" (untested, and Claude's own
      // pages disagree; Connor's call) and without a street address to edit.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your documents, and paste. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with your documents attached',
          items: [
            'Here’s the inspection and disclosures. What should we ask the seller for?',
            'Go through the HOA docs. My buyer wants to rent it out in a couple of years.',
          ],
        },
        { label: 'When time is short', items: ['Our due diligence deadline is tomorrow. What do we send?'] },
        {
          label: 'Follow-ups, in the same chat',
          items: ['Is this inspection finding a big deal?', 'Draft the objection list and an email to my buyers.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md, section 1; page-notes.md's FAQ. UAR's notice (utahrealtors.com, checked 2026-11-08).
          q: 'Which contracts does it work with?',
          a: [
            'Both Utah REPCs in use now. The AI reads the footer, “EFFECTIVE DECEMBER 4, 2024” or “EFFECTIVE NOVEMBER 1, 2026,” and uses that form’s section numbers. The Utah Association of REALTORS says the old form can’t be used starting January 1, 2027. In another state, the AI takes the deadline, any response period and what happens if you do nothing from your uploaded contract, and says it didn’t check your state’s rules.',
          ],
        },
        {
          // page-notes.md's FAQ; both REPC texts and the Lead-Based Paint Addendum, per the review.
          q: 'In Utah, why does the AI say there’s no response period?',
          a: [
            'Neither current Utah REPC has one for due diligence. The seven-day response period many agents remember is in the Lead-Based Paint Addendum, for lead paint objections only. Under the REPC, sending an objection doesn’t buy time. By 5:00 PM on the Due Diligence Deadline you need a signed resolution, a signed extension or a written cancellation.',
          ],
        },
        {
          // SKILL.md, sections 2 and 5.
          q: 'Why won’t the AI estimate repair costs?',
          a: [
            'It uses only numbers from your documents. Without a bid, a finding says “needs bid,” and a credit in the objection list reads “$[credit amount from bid].” Get a contractor’s bid and the AI will use that number.',
          ],
        },
        {
          // page-notes.md, "What You Need": Claude's help center and docs disagree on Free; ChatGPT's
          // limits from OpenAI's help center and pricing page, via the vendor check of 2026-11-08.
          q: 'Do I need a paid plan?',
          a: [
            'In Claude, the help center lists skills on every plan, Free included. Claude’s developer docs list them on Pro and up, so if your Free account shows no way to add a skill, that’s why. In ChatGPT, Projects work on Free, Go, Plus and Pro. Free allows 3 file uploads a day and about 12 pages of text per message, so on Free, setup and a full set of documents can take more than one day, and a long inspection report plus an HOA packet can run past the page limit. Go and Plus allow about 40 pages per message.',
          ],
        },
        {
          // page-notes.md: Claude's pages disagree on Gmail drafts, and creating one was not tested.
          // Connor's call; the page promises nothing.
          q: 'Can it save the buyer email in Gmail?',
          a: [
            'Maybe. The AI always writes the email in the chat for you to copy. If you use Claude with its Gmail connector switched on, you can ask Claude to save the email as a Gmail draft. Claude’s own help pages disagree on whether that connector can make drafts, and we haven’t tested it, so if no draft appears, copy the email from the chat. The AI never sends anything.',
          ],
        },
        {
          // page-notes.md, "What It Will Not Do".
          q: 'What won’t it do?',
          a: [
            'The AI never sends, posts or writes to your CRM. It won’t estimate repair costs or how long something will last, tell your buyer whether to buy, or judge legal effect. Loan, insurance and health questions go to the lender, the title officer, an attorney or a certified professional. It doesn’t write new contract language or keep your official deadline calendar. It won’t repeat loan numbers, account numbers or wiring instructions, or comment on the people in a neighborhood, schools or safety.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Listing agent answering a buyer’s repair request? ',
        { link: 'Repair Request Response', href: '/repair-request-response', sameTab: true },
        ' is the seller-side skill.',
      ],
    },
  ],

  unlockKey: 'ddr-unlocked',
});
