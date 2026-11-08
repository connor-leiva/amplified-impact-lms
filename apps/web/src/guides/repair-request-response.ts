// Every word on /repair-request-response that is its own: the landing page for Repair Request Response, a
// free skill (`skills/repair-request-response/`, version 1.0) that drafts a listing agent's answer to a
// buyer's repair request or due diligence objection. It reads the request against the inspection report,
// the seller disclosure, the contractor bids and the REPC, sorts every item, prices it from bids only, and
// drafts the response terms, a seller email, a note to the buyer's agent and a disclosure note. What every
// skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and references/response-writing.md), its page notes, its
// graded runs (three evals and the practice run, all passed, plus a reviewer's reruns of eval 3 and the
// practice) and the build and review reports, so the page promises what the skill does. Listing side
// only: the note points buyer's agents to Due Diligence Review, its buyer-side mirror.
//
// What the page leaves out or hedges, and why:
//   - Gmail drafts: optional and untested (page-notes.md, "Not tested"), and Claude's Gmail connector page
//     lists it on Pro and up only. So "What to say" offers no draft prompt, and the page says only that
//     the AI writes the seller email in the chat for you to copy.
//   - ChatGPT Free's upload limits: the review could not open OpenAI's page (a bot check), so the number
//     rests on a vendor check marked "recheck by hand". The page states no number: it says free ChatGPT
//     limits uploads a day, and what that means (setup and a deal's files can take more than one day).
//   - Photos and scans: page-notes.md says photos work, but its "Not tested" list names scanned and
//     photographed bids. So the page says PDFs, and that photos and scans haven't been tested yet.
//   - Claude's phone apps: page-notes.md says the mobile apps weren't tested, so the page says so.
//   - Outside Utah: general mode is in SKILL.md but untested, and the page says so.
//
// The practice prompt is page-notes.md's, word for word (curly apostrophes, as on every page), with one
// line added at the start: "Pretend today is Sunday, November 8, 2026." The practice run was graded on
// that date. Without it, the made-up buyer's request lapses on November 11 and the made-up Due Diligence
// Deadline passes on November 17, and the AI would then answer that the deadline has passed (SKILL.md,
// section 2), not show what the skill does. /due-diligence-review and /counter-explainer do the same.
//
// The REPC changed on November 1, 2026 (its footer says it replaces the old form on January 1, 2027): the
// skill reads the version from the contract's footer, so the page says it works with both Utah forms, and
// elsewhere takes every deadline from the uploaded contract.
//
// The practice set is four PDFs, attached file by file. `setupMinutes` is an estimate (page-notes gives
// none): 10, as the other skill pages with a ChatGPT version say for the same steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const REPAIR_REQUEST_RESPONSE: Guide = skillPage({
  slug: 'repair-request-response',
  title: 'Repair Request Response',

  meta: {
    title: 'Repair Request Response: A Free AI Skill · Amplified Impact',
    description:
      'Upload the buyer’s repair request, the inspection report and your bids, and get your seller’s answer: what to agree to, what to push back on, the cost from your bids, the real deadline and the drafts to send. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Listing Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload the buyer’s repair request, the inspection report and your bids, and the AI lays out your seller’s answer: what to agree to, what to push back on, what it costs from your bids, the real deadline, and the drafts to send.',
  outcome: {
    n: '03',
    title: 'Know What to Send Back',
    body: 'What to agree to, what to push back on, and the drafts to send.',
  },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one prices repairs from your bids only, never from a guess.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word, after the "pretend today" line (see the top).
    prompt:
      'Pretend today is Sunday, November 8, 2026. Here’s the buyer’s repair addendum on 2215 W Example Hollow Ln, the inspection report, our seller disclosure and the roofer’s bid. Due diligence deadline is November 17 and settlement is December 4. My sellers care most about closing on time. What should we send back?',
    note: [
      'There are four files. Every name, address and number in them is made up. The words to say start with “Pretend today is Sunday, November 8, 2026” so the made-up deadlines haven’t already passed. ',
    ],
  },

  real: {
    // SKILL.md, section 1: the buyer's request is required; the report, bids, disclosure and REPC when
    // present; never ask the agent to type what a document contains; the seller's priority from the
    // agent's message.
    body: [
      'Start a new chat the same way, attach the buyer’s request, the inspection report, your bids, the seller disclosure and the signed contract, and say this.',
    ],
    prompt: 'Here’s the buyer’s repair request, the inspection and our bids. What should my sellers agree to?',
    note: [
      'Add what your sellers care most about, like their net, a sure close or closing on time, and the AI leads with that. Before anything goes out, check every date, dollar amount and page number in the ',
      { strong: 'Check before sending' },
      ' list against your documents.',
    ],
  },

  chatgpt: { paste: chatgptPaste('repair-request-response') },

  sections: [
    {
      // sample.md (the practice run, as the review left it), shortened, in the output's own order and its
      // own words, cut by whole parts, rows, items and sentences: both flags; the bottom line; three of
      // the clock's seven rows (its Source column dropped) and its first two "how the deadline works"
      // lines; the item table in two columns so it fits a phone without scrolling (each request's report
      // page moved into its cell; the category, the read and the response joined in the second; the
      // inspector's words, disclosed, visible and bid columns dropped) and the basement line from Options
      // and Tradeoffs; the net impact; the bid's timing and its bank-details line; the disclosure note's
      // roof and rodent lines and its closing lines (without the Utah citations sentence); four of the
      // seven response terms (without their numbers, and the opening's quoted parenthetical cut); the
      // seller email in full; three rows of Check before sending. Left out: the clock's other rows,
      // Questions for the Buyer's Agent, the strategy packages and the note to the buyer's agent. Also
      // left out: the disclosure note's "Not requested" line, which lists the stained basement carpet,
      // though the carpet was the buyer's item 6 (a slip in sample.md, for Connor).
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI wrote for a made-up repair request',
      body: 'From the practice files: a made-up home in Utah, a made-up six-item repair request, and made-up sellers who care most about closing on time. These are the same files you practise on in setup.',
      title: 'Repair Request Response: 2215 W Example Hollow Ln',
      note: 'Made-up example. Shortened: a few lines from most parts, and the seller email in full.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'No REPC was uploaded. The Due Diligence Deadline (November 17, 2026) and Settlement Deadline (December 4, 2026) come from your message. The buyer’s addendum cites Section 8.1(b)(ii), which is how the December 4, 2024 REPC numbers due diligence. Confirm both dates against the signed REPC.',
            'Addendum No. 1 wasn’t uploaded. If it changed any deadline, use those dates instead.',
          ],
        },
        { h: 'Bottom line for the agent' },
        {
          p: [
            'Agree to the three Safety items (deck stair guardrail, garage door auto-reverse, water heater discharge pipe), and counter the roof with a $1,240 credit, the roofer’s repair price, instead of a new roof, because the roofer can’t start until November 30, after the November 29 completion date the buyer set. Offer what the inspector actually recommended for the basement wall (clean the window well and drain, add a cover) instead of waterproofing, and decline the carpet. The net impact known from bids is $1,240, with four items still needing bids (three if the sellers don’t offer the window well work), and the deadline to have this signed by both sides is 5:00 PM Mountain Time on Tuesday, November 17, 2026.',
          ],
        },
        { h: 'The clock' },
        { p: ['For strategy; confirm dates with your transactions team.'] },
        {
          table: {
            caption: 'The clock, 3 of its 7 rows',
            head: ['What', 'When'],
            rows: [
              [
                'Buyer’s addendum lapses unless the sellers accept',
                '5:00 PM Mountain Time, Wednesday, November 11, 2026 (3 days)',
              ],
              ['Due Diligence Deadline', '5:00 PM Mountain Time, Tuesday, November 17, 2026 (9 days)'],
              ['Settlement Deadline', 'Friday, December 4, 2026'],
            ],
          },
        },
        { p: ['How the deadline works on the December 4, 2024 REPC:'] },
        {
          items: [
            'There is no Response Period. Under Section 8.1(b), by the Due Diligence Deadline the buyer must either cancel in writing (earnest money back to the buyer) or “resolve in writing with Seller” the objections. Under Section 8.1(c), if neither happens, the Due Diligence Condition is waived.',
            'So the deadline for a signed written resolution and the end of the buyer’s cancellation window are the same moment: 5:00 PM Mountain Time on November 17, 2026. There is no seven-day period plus three days.',
          ],
        },
        { h: 'Item table' },
        {
          table: {
            caption: 'The six requests, shortened to two columns',
            head: ['Request (report page)', 'Category, read and response'],
            rows: [
              [
                '1. Licensed roofer replaces the roof covering (page 3, item 3.2)',
                'Major System. Push back on replacement: the inspector recommended repair. Counter: $1,240 credit (Option 1 amount)',
              ],
              [
                '2. Secure the deck stair guardrail and post (page 4, item 4.2)',
                'Safety. Reasonable. Agree, qualified contractor',
              ],
              [
                '3. Repair the garage door so it reverses on contact (page 4, item 4.3)',
                'Safety. Reasonable. Agree, garage door technician',
              ],
              [
                '4. Licensed foundation contractor evaluates the east wall and installs waterproofing (page 5, item 5.3)',
                'Major System. Negotiable: disclosed, but only during due diligence, and the ask goes past the inspector’s “monitoring.” Counter: clean the window well and drain and install a cover, as the inspector recommended',
              ],
              [
                '5. Licensed plumber installs a relief valve discharge pipe (page 8, item 8.3)',
                'Safety. Reasonable. Agree, licensed plumber',
              ],
              ['6. Replace the basement family room carpet (page 10, item 10.1)', 'Cosmetic. Push back. Decline'],
            ],
          },
        },
        {
          p: [
            { strong: 'Item 4, basement wall.' },
            ' The buyer learned of the 2021 event during due diligence (the disclosure was signed after the offer), so “it was disclosed” carries less weight here. The inspector found the wall dry and recommended monitoring, a clear window well drain and a cover.',
          ],
        },
        { h: 'Bids and net impact' },
        {
          p: [
            'Pretend Shingle Roofing Co.: earliest start November 30, 2026, weather permitting. The bid lists bank details for the deposit, not repeated here: verify payment instructions by phone with the roofer at a number you already have before sending anything.',
          ],
        },
        { p: ['Net impact, from bids only:'] },
        {
          items: [
            'Recommended (Timing) package: $1,240.00 credit for the roof.',
            'Items still needing bids: the guardrail (item 2), the garage door (item 3) and the discharge pipe (item 5), plus the window well cleanout and cover if the sellers offer it (item 4). That’s 3 items, or 4 with the window well.',
            'No other dollar amounts are known. Get bids for those items this week so every repair can finish by November 29.',
          ],
        },
        { h: 'Disclosure note' },
        {
          p: [
            'For the agent and the sellers’ file. The sellers now know what this report found, including items the buyer didn’t ask about:',
          ],
        },
        {
          items: [
            'Wind-damaged and missing shingles on the north slope (page 3, item 3.2)',
            'Not requested, and found only in the body of the report, not in its summary: rodent droppings near the attic hatch and along the north eave, no live activity (page 9, item 9.2). The disclosure answered “No” to known pests (page 2, item 4a), signed October 20, 2026, before this November 2 inspection.',
          ],
        },
        {
          p: [
            'If this sale doesn’t close, the sellers’ disclosures to the next buyer must reflect any material defect they now know about, including the rodent evidence. Repairs finished with paid invoices can be disclosed as repaired. Which items count as material is your broker’s call; legal questions go to a real estate attorney.',
          ],
        },
        { h: 'Response terms for the addendum' },
        {
          p: [
            'The sellers check COUNTEROFFER on the buyer’s Addendum No. 2 and sign. Addendum No. 3 is a state-approved addendum with the COUNTEROFFER box checked:',
          ],
        },
        {
          items: [
            'Seller agrees to contribute $1,240.00 at Settlement toward Buyer’s closing costs in place of Buyer’s item 1 in Addendum No. 2.',
            'Seller agrees to have a qualified contractor secure the deck stair guardrail and post noted in item 4.2 on page 4 of the Example Ember Home Inspections report EEHI-26-1102 dated November 2, 2026, and to provide Buyer a paid invoice no later than five calendar days before the Settlement Deadline.',
            'Seller declines Buyer’s item 6 in Addendum No. 2.',
            'Acceptance line: Buyer shall have until [time] Mountain Time on [date before November 17, 2026] to accept.',
          ],
        },
        { p: ['Anything beyond these standard terms goes to your broker.'] },
        { h: 'Seller email' },
        {
          email: {
            subject: 'The Buyer’s Repair Request On 2215 W Example Hollow Ln: My Recommendation',
            body: [
              'Hi Toni and Sam,',
              'My recommendation: fix the three safety items, give a $1,240 credit for the roof instead of a new roof, offer to clean and cover the east window well, and say no to the carpet. That keeps your December 4 closing on track. I’d like your OK by Tuesday so we can answer before the buyer’s request expires at 5:00 PM on Wednesday, November 11.',
              'What They Asked For: Six items, from a new roof and basement waterproofing to new basement carpet.',
              'What I Recommend:',
              'Yes: the railing, the garage door and the water heater pipe, which the inspector rated as safety items.',
              'Roof: the inspector recommended a repair, not a new roof. Your roofer can’t start until November 30, after the buyer’s completion date, so a credit for the repair price is cleaner.',
              'Basement: the wall was dry, and you disclosed the 2021 water. Let’s offer what the inspector recommended: a clear window well drain and a cover.',
              'Carpet: no. The inspector noted a stain, which is cosmetic.',
              'What It Costs: $1,240 for the roof credit. I’ll get prices on the three safety repairs and the window well cover.',
              'Your Options:',
              '1. Roof credit (my pick): no roofing work before closing.',
              '2. Roof repair: same price, but weather-dependent after November 30.',
              '3. New roof: $16,800, which the inspector didn’t call for.',
              'One More Thing: The inspector also noted signs of rodents in the attic. Now that it’s known, if this sale didn’t close, it would go on your disclosure for the next buyer.',
              'Next Step: Reply with your OK and I’ll send the counter for your signatures.',
              '[Agent Name]',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 3 of its 13 rows',
            head: ['Item in the drafts', 'Source'],
            rows: [
              ['5:00 PM Mountain Time, November 11, 2026 (buyer’s addendum lapses)', 'Addendum No. 2, acceptance line'],
              ['November 17, 2026 (Due Diligence Deadline)', 'Your message; confirm against the REPC'],
              ['$1,240 (Option 1 repair)', 'Pretend Shingle Roofing bid, Option 1'],
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
          body: 'Only when they apply: anything the AI had to leave blank, like a missing deadline or bid, earlier addenda you didn’t upload, and a bold warning when the deadline is today, tomorrow or the day after.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: what to agree to, what to push back on, the cost from your bids, and the deadline.',
        },
        {
          title: 'The clock',
          body: 'Which Utah REPC the AI read, from the contract’s footer, the deadline for a signed answer, when the buyer’s request expires, and the Settlement Deadline. Labeled for strategy: your transactions team keeps the official dates.',
        },
        {
          title: 'An item table',
          body: 'Each request with its page in the report and what the inspector said. Its category (Safety, Major System, Maintenance or Cosmetic), whether it was disclosed or visible at showings, and a read: Reasonable, Negotiable or Push back.',
        },
        {
          title: 'Options and tradeoffs',
          body: 'For each item rated Negotiable or Push back: a repair by a licensed contractor with paid invoices, a credit, a price cut or a decline, and the risk of each.',
        },
        {
          title: 'Questions for the buyer’s agent',
          body: 'Where the request and the report don’t match: a wrong page, an ask that goes past what the inspector recommended, or a system the inspector didn’t test.',
        },
        {
          title: 'Bids and net impact',
          body: 'Each bid read against its item, including when the contractor can start. The total from your bids, with the math shown. An item without a bid says “needs bid.”',
        },
        {
          title: 'Three ways to answer',
          body: 'Net, Certainty and Timing, each with its items, its cost from your bids and its main risk. The one your seller cares about most comes first.',
        },
        {
          title: 'A disclosure note',
          body: 'What your seller now knows from the report, including findings the buyer didn’t ask about, and what that means for the next buyer if this sale doesn’t close.',
        },
        {
          title: 'Response terms',
          body: 'Plain terms for you to put on the state-approved addendum: a repair, a credit, a price change, a decline or a deadline extension. Anything else goes to your broker.',
        },
        {
          title: 'A seller email',
          body: 'Under 300 words, written as you, with your recommendation, the cost and the decision you need up top.',
        },
        {
          title: 'A note to the buyer’s agent',
          body: 'Short and factual. It never mentions your seller’s priorities, timing or bottom line.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, time, dollar amount, page number and quote in the drafts, with where to check it.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's. The skill drafts no texts, so texting consent
      // has no place here; the drafts describe the house and the documents, never the buyers.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You and your seller decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the reading',
          body: 'Reads every document, matches each request to its page in the report, sorts and rates each item, adds up your bids and counts the days to the deadline.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The response terms, the seller email, the note to the buyer’s agent and the disclosure note. Nothing reaches your seller or the buyer’s side until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'What your seller offers, and every dollar. The final wording on the form. Legal questions go to your broker or an attorney, and your transactions team keeps the official deadline calendar. Payment and bank details stay with you: the AI never repeats them from a bid.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its "Tested and Not Tested" (digital PDFs only; no photos,
      // scans, phone apps or Gmail drafts tested). No ChatGPT Free limits as numbers.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
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
          title: 'A computer',
          body: 'To set it up and use it on claude.ai or in the Claude desktop app, or on the ChatGPT website. We haven’t tested the phone apps yet.',
        },
        {
          title: 'Your documents, as PDFs',
          body: 'The buyer’s request, plus what else you have: the full inspection report, your contractor bids, the seller disclosure, and the signed contract with every addendum. Claude takes up to 20 files in a chat. We haven’t tested photos or scans yet.',
          tag: 'The buyer’s request is required',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app, like Gmail. This skill needs none. The AI writes the seller email in the chat for you to copy.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan, and no other accounts to make.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", with curly apostrophes. "Fourteen items on this repair addendum"
      // is cut to the request itself, since a real addendum won't have fourteen.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach the buyer’s request and your other documents, and paste.',
      groups: [
        {
          label: 'To start, with your documents attached',
          items: ['Here’s the buyer’s repair request, the inspection and our bids. What should my sellers agree to?'],
        },
        {
          label: 'With your sellers’ priority',
          items: [
            'My sellers want to protect their net. Build me a targeted counter to this repair addendum.',
            'Sellers just want to close on time. What’s the fastest clean answer to this inspection response?',
          ],
        },
        {
          label: 'When one item is the sticking point',
          items: [
            'The buyer wants a new roof. The inspector said repair. Help me counter.',
            'My sellers already disclosed the sewer roots. How do we answer this objection?',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md's FAQ; references/utah-repair-response.md (both REPC texts and the Lead-Based
          // Paint Addendum, checked 2026-11-08 by the build and the review).
          q: 'Isn’t there a seven-day Response Period?',
          a: [
            'Not in either current Utah REPC. Under the December 4, 2024 form (Section 8.1) and the November 1, 2026 form (Section 12.1), the buyer must cancel or have a signed written answer by 5:00 PM Mountain Time on the Due Diligence Deadline. The seven-day Response Period many agents remember is in the state Lead-Based Paint Addendum, for lead paint objections only. If your contract says otherwise, the AI reads it from your upload.',
          ],
        },
        {
          // SKILL.md, sections 1 and 2; eval 1 (the 2024 form), eval 2 (the 2026 form), eval 3 (no REPC).
          // General mode outside Utah is untested (page-notes.md, "Not tested").
          q: 'Which contracts does it work with?',
          a: [
            'Both Utah REPCs in use now. The AI reads the contract’s footer, “EFFECTIVE DECEMBER 4, 2024” or “EFFECTIVE NOVEMBER 1, 2026,” and takes the deadlines from your contract, not from memory. No contract attached? Put the Due Diligence Deadline in your message, or the AI leaves a blank for it and tells you. In another state, the AI takes every deadline from your contract and says it didn’t check your state’s rules. We haven’t tested it outside Utah yet.',
          ],
        },
        {
          // SKILL.md, section 5; page-notes.md's FAQ.
          q: 'Why does the AI keep saying “needs bid”?',
          a: [
            'The AI never guesses at a repair cost, not even a range. Every dollar comes from a contractor’s bid you upload, with the math shown. Attach a bid in the same chat, and the AI uses that number.',
          ],
        },
        {
          // SKILL.md, section 7; references/response-writing.md, "Disclosure Note"; page-notes.md's FAQ.
          q: 'Why does the AI bring up the next buyer?',
          a: [
            'Once your seller has the inspection report, what’s in it is known. If this sale falls through, your seller’s disclosures to the next buyer must reflect any material defect they now know about. So the disclosure note lists what the report found, even items the buyer didn’t ask about. Your broker decides which items count as material.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Not tested". ChatGPT Free's limit without a number (see
          // the top). The practice set alone is 4 PDFs, plus 4 files for the Project.
          q: 'Which plan do I need?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s docs list them on Pro and up. If your Free account shows no way to add a skill, that’s why. In ChatGPT, a Project works on the free plan, but free ChatGPT limits how many files you can upload in a day. So on free ChatGPT, setup and a deal’s request, report, disclosure and bids can take more than one day. We haven’t tried the skill on Claude’s free plan or inside ChatGPT yet, so run the practice files first.',
          ],
        },
        {
          // page-notes.md, "What It Will Not Do"; SKILL.md, section 8 (fair housing).
          q: 'What won’t the AI do?',
          a: [
            'The AI won’t estimate a repair cost: only your bids set dollar amounts. It never sends anything or fills in a form for you. It won’t write custom contract language: anything beyond a repair, credit, price change, decline or deadline extension goes to your broker. It won’t suggest hiding, delaying or leaving off anything your seller now knows. It describes the house, never the buyers. It never repeats bank, routing or wire details from a bid, and never puts your seller’s priorities or bottom line in the note to the buyer’s agent. Your transactions team keeps the official deadline calendar.',
          ],
        },
      ],
    },
    {
      // skills/due-diligence-review/SKILL.md: the buyer's side of the same objection.
      kind: 'note',
      body: [
        'Buyer’s agent writing the objection? ',
        { link: 'Due Diligence Review', href: '/due-diligence-review', sameTab: true },
        ' is the buyer-side skill.',
      ],
    },
  ],

  unlockKey: 'rrr-unlocked',
});
