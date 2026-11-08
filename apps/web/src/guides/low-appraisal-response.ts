// Every word on /low-appraisal-response that is its own: the landing page for Low Appraisal Response, a
// free skill (`skills/low-appraisal-response/`, version 1.0) for an agent with a home under contract
// whose appraisal came in under the price. It reads the appraisal, the contract and its addenda and the
// agent's CMA, and returns the gap, a fact check of the report, the comparables, better closed sales,
// whether a reconsideration of value has grounds, each side's options, the deadline, and the drafts: the
// request to the lender (or, listing side, a data package for the buyer's agent), a client email and a
// note to the other agent. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and references/rov-programs.md), its page notes, its
// graded runs (three evals and the practice run, all passed, plus a reviewer's reruns of eval 2 and the
// practice) and the build and review reports, so the page promises what the skill does. Both sides of a
// deal, so the eyebrow names both sides, in words short enough to stay on one line on a phone. The buyer or seller decides; the cash to cover the gap is between the
// buyer and their loan officer, who gives the figures (the review's correction: never "at least the
// gap"), and the page says so in the sample, the options, the tiles and the FAQ. Nothing goes to the
// appraiser (Regulation Z's valuation independence; every program runs a reconsideration through the
// lender, or for VA the lender or VA). The note points to Pricing Conversation Prep, whose appraisal
// check prices a listing from the closed sales a buyer's appraisal will lean on.
//
// What the page leaves out or hedges, and why:
//   - ChatGPT Free's limits: page-notes.md cites OpenAI's pages, but says help.openai.com could not be
//     opened and its facts come from a vendor check. So the page states no number: it says Free ChatGPT
//     has upload limits, and what page-notes says that means (a long appraisal, the contract and a CMA
//     may need more than one message or day).
//   - Gmail is optional (only to save a draft), untested, and Claude's own pages disagree on whether it
//     can draft. So no prompt asks for a draft, and the connector tile says the AI writes the drafts in
//     the chat to copy.
//   - Claude Free: the help center lists skills on every plan, the developer docs on Pro and up, and no
//     run used Free. The page says both, in the wording every skill page uses.
//   - Not tested (page-notes.md): real appraisals (longer than the 8-page made-up ones), scanned PDFs,
//     the ChatGPT version inside ChatGPT, USDA loans, cash buyers and an unchecked appraisal condition.
//     The page says what was tested (made-up files, both Utah REPCs, one case in Idaho) and nothing more.
//   - The practice gap addendum's reading at a gap of $10,000 or less is the skill's, sent to the broker
//     to confirm; the sample keeps that wording.
//
// The practice prompt is page-notes.md's, word for word (curly apostrophes, as on every page), including
// its "Pretend today is Sunday, November 8, 2026" line, which keeps the made-up deadline from having
// already passed. The practice set is three files (an appraisal PDF, the REPC with its addendum as a
// PDF, and a CMA export CSV), attached file by file. `setupMinutes` is an estimate (page-notes gives
// none): 10, as the other skill pages with a ChatGPT version say for the same steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const LOW_APPRAISAL_RESPONSE: Guide = skillPage({
  slug: 'low-appraisal-response',
  title: 'Low Appraisal Response',

  meta: {
    title: 'Low Appraisal Response: A Free AI Skill · Amplified Impact',
    description:
      'Upload the appraisal that came in under your contract price, and get what the report got wrong (if anything), whether a reconsideration of value is worth asking for, each side’s options, your real deadline and the drafts to send. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · Buyer or Listing Side',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload the appraisal that came in under your contract price, and the AI shows what the report got wrong (if anything), whether a reconsideration of value is worth asking for, each side’s options, your real deadline, and the drafts to send.',
  outcome: { n: '03', title: 'Know Your Next Move', body: 'Each side’s options, the real deadline, and the drafts to send.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI reads and drafts. You and your client decide.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (see the top).
    prompt:
      'Pretend today is Sunday, November 8, 2026. I represent the buyers, Jordan and Casey Example, on 4127 W Practice Ridge Dr. The appraisal came back at $612,000 on our $640,000 contract, and their lender is Make-Believe Mortgage Co. Here’s the appraisal, the REPC with its addendum, and my CMA export. What are our options, and is there anything worth sending to the lender?',
    note: [
      'There are three files: an appraisal report, the REPC with its addendum, and a CMA (comparative market analysis) export. Every name, address and number in them is made up. The words to say start with “Pretend today is Sunday, November 8, 2026” so the made-up deadline hasn’t already passed. ',
    ],
  },

  real: {
    // SKILL.md, section 1: the full appraisal (required for the review), the contract and every addendum,
    // and a CMA or MLS export when present; the side, the lender and what the client wants from the
    // agent's message; never ask the agent to type what a document contains.
    body: [
      'Start a new chat the same way. Attach the full appraisal, the signed contract with every addendum, and your CMA or MLS export. Then say this.',
    ],
    // page-notes.md, "Things to Say", the first, without its [brackets]: the AI reads the numbers from the files.
    prompt: 'The appraisal came in under our contract price. Here’s the appraisal, the contract and my comps. What are our options?',
    note: [
      'Add which side you’re on, the lender’s name and what your client wants. You don’t need to type anything that’s in your files. Before anything goes out, check every date, dollar amount and page number in the ',
      { strong: 'Check before sending' },
      ' list against your documents.',
    ],
  },

  chatgpt: { paste: chatgptPaste('low-appraisal-response') },

  sections: [
    {
      // sample.md (the practice run, as the review corrected it), shortened, in the output's own order and
      // its own words, cut by whole parts, rows, columns, items and sentences: three of the four flags (not
      // the placeholders); the bottom line; four of the clock's six rows (its Source column dropped, since
      // three columns were cramped at 390 pixels) and two of its four bullets (the last sentence of the
      // second cut); the gap, the addendum's term and three of its notes; the fact check's first sentences,
      // its table cut to the two comparables measured differently (the grid and the CMA export joined in
      // one cell, room counts cut, "GLA" spelled out once), and its paragraph; the own-rates table's label
      // and its last two rows, the adjusted prices, turned on their side so they fit a phone (the
      // arithmetic behind them cut); the better sales in two columns (each sale's numbers moved into its
      // address cell, the style and size rows cut) and every sale left out; the grounds; the four options,
      // each cut to its first sentences and its tradeoff; the lender request with every heading field, the
      // first item from each of its two lists and its closing (its "Why this supports another look" cut,
      // since it speaks of three sales); the client email in full; three rows of Check before sending.
      // Left out: the Comparable Review table, the reference points in Option 2 and the note to the
      // listing agent. Every table is two or three columns, so none scrolls sideways at 390 pixels.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI wrote for a made-up low appraisal',
      body: 'From the practice files: a made-up home in Utah, a made-up appraisal $28,000 under the price, a made-up contract and a made-up CMA (comparative market analysis) export. They’re the same files you practise on in setup.',
      title: 'Low Appraisal Review: 4127 W Practice Ridge Dr (Buyer Side)',
      note: 'Made-up example. Shortened: a few lines from most parts, one item from each list in the lender request, and the client email in full.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'The Financing & Appraisal Deadline is 5:00 PM Mountain Time on Friday, November 13, 2026, five days from today (Sunday, November 8). A reconsideration may not come back by then, so start the extension conversation now.',
            'Addendum No. 1 has an appraisal gap term. It changes what happens if the value moves only part of the way (see The Gap).',
            'The CMA export has agent-only columns (private remarks). They’re kept out of every draft.',
          ],
        },
        { h: 'Bottom line for the agent' },
        {
          p: [
            'The appraisal is $28,000 under the $640,000 price, and two things in the report drive it: Comparables 2 and 3 have their basements counted as above-grade living area (their grid square footage equals the MLS above-grade plus basement total), and all three comparables are 1.62 to 2.91 miles away while three rambler sales in Practice Ridge Estates, 0.08 to 0.34 miles away, closed before the 10/27/2026 effective date. Grounds for a reconsideration are strong. Send the request to Make-Believe Mortgage Co. Monday, ask the listing agent for an extension of the November 13 deadline at the same time, and walk the buyers through the gap term in Addendum No. 1 before they decide.',
          ],
        },
        { h: 'The clock' },
        { p: ['For strategy; confirm dates with your transactions team.'] },
        {
          table: {
            caption: 'The clock, 4 of its 6 rows, without the Source column',
            head: ['Item', 'Date or term'],
            rows: [
              ['Contract version', 'December 4, 2024 REPC (footer: “EFFECTIVE DECEMBER 4, 2024”)'],
              ['Appraisal Condition', 'IS checked'],
              ['Financing & Appraisal Deadline', '5:00 PM Mountain Time, Friday, November 13, 2026 (5 days)'],
              ['Earnest money', '$10,000'],
            ],
          },
        },
        {
          items: [
            'Name the right section in any cancellation. A financing cancellation under Section 8.3(b)(i), on the same deadline, releases $1,000 of the earnest money to the sellers. An appraisal cancellation under 8.2(a) returns all $10,000.',
            'The lender’s timing isn’t the contract’s (Section 21). If the reconsideration won’t finish by Friday, the buyers need an extension signed by both sides before 5:00 PM Friday on an approved addendum, or they decide by then.',
          ],
        },
        { h: 'The gap' },
        { p: ['$640,000 contract price minus $612,000 appraised value = ', { strong: '$28,000' }, ', about 4.4% of the price.'] },
        {
          p: [
            { strong: 'Addendum No. 1, item 2 (appraisal gap):' },
            ' “Buyer agrees to pay in cash at Settlement the difference between the appraised value and the Purchase Price, up to $10,000, and the Purchase Price shall not change. If the appraised value is more than $10,000 below the Purchase Price, the Appraisal Condition in Section 8.2 of the REPC remains in effect.”',
          ],
        },
        {
          items: [
            'Today: the value is $28,000 below the price, more than $10,000, so the Appraisal Condition remains in effect and the buyers keep their right to cancel by November 13.',
            'If a revised value moves only part of the way: at $630,000 or higher ($640,000 minus $10,000), the gap would be $10,000 or less. The addendum’s wording reads as though the buyers would then pay that difference in cash and the Appraisal Condition would no longer cover them. Have your broker confirm that reading, and make sure the buyers understand it before they request a reconsideration.',
            'The lender figures the loan-to-value on the lower of price and appraised value ($612,000), so keeping the $640,000 price means more cash, a loan that’s a larger share of the value, or both. How much depends on the loan-to-value the buyers keep; the lender gives the figures.',
          ],
        },
        { h: 'Fact check' },
        {
          p: [
            'The subject’s facts in the report match the MLS (MLS #2290318): 1,640 sq ft above grade, 1,600 sq ft basement with 1,480 finished, 3 bedrooms and 2 baths above grade plus 2 bedrooms and 1 bath below, 0.21 ac, built 2009, 3-car garage. The problem is how two comparables were measured:',
          ],
        },
        {
          table: {
            caption: 'The two comparables measured differently',
            head: ['Comparable', 'Report grid (page 3) and CMA export (same MLS number)'],
            rows: [
              [
                'Comparable 2, 9814 S Sample Bend Dr, MLS #2284471',
                'Grid: GLA (gross living area) 3,080 sq ft; basement “0 sq ft.” CMA export: above grade 1,560; below grade 1,520 (1,450 finished); total 3,080. The grid’s 3,080 is the MLS total: 1,560 above grade plus 1,520 basement. The basement was counted as above-grade living area.',
              ],
              [
                'Comparable 3, 7741 S Placeholder Hollow Way, MLS #2280962',
                'Grid: GLA 3,150 sq ft; basement “0 sq ft.” CMA export: above grade 1,610; below grade 1,540 (1,540 finished); total 3,150. Same: 1,610 plus 1,540 = 3,150.',
              ],
            ],
          },
        },
        {
          p: [
            'The subject’s basement is reported below grade, as Fannie Mae requires for any level that is partly below grade, while Comparables 2 and 3 had theirs counted above grade. The grid then compares unlike measurements.',
          ],
        },
        {
          p: [
            { strong: 'The report’s own rates applied to the corrected facts.' },
            ' This is arithmetic, not a value opinion. Only the appraiser can revise the value.',
          ],
        },
        {
          table: {
            caption: 'Adjusted prices, the table’s last 2 rows',
            head: ['Adjusted price', 'In the report', 'With the corrected facts'],
            rows: [
              ['Comparable 2', '$615,000', '$659,750'],
              ['Comparable 3', '$596,500', '$640,000'],
            ],
          },
        },
        { p: ['Comparable 1 is unchanged at $612,500. Keep this table in your notes; it stays out of the request.'] },
        { h: 'Better sales from the CMA' },
        {
          p: [
            'All in Practice Ridge Estates (the subject’s subdivision), all closed on or before 10/27/2026, none in the report:',
          ],
        },
        {
          table: {
            caption: 'Three closer sales, shortened to two columns',
            head: ['Sale', 'Why it applies'],
            rows: [
              [
                '4089 W Practice Ridge Dr, MLS #2290101: 0.08 mi, closed 09/18/2026, $645,000, seller concessions $5,000',
                'Same subdivision, same year and style, within 20 sq ft above grade and the same basement size; the closest match in the export',
              ],
              [
                '4210 W Sample Crest Cir, MLS #2290177: 0.21 mi, closed 10/09/2026, $652,500, seller concessions $0',
                'Same subdivision, closed 18 days before the effective date; slightly larger above grade, one fewer basement bedroom',
              ],
              [
                '3962 W Practice Ridge Dr, MLS #2289954: 0.34 mi, closed 07/30/2026, $628,000, seller concessions $3,000',
                'Same subdivision; slightly smaller, 2-car garage, fully finished basement',
              ],
            ],
          },
        },
        { p: ['Left out, and why:'] },
        {
          items: [
            '4155 W Example Knoll Ln (MLS #2291420), $650,000: closed 11/03/2026, after the effective date. Not usable for this appraisal.',
            '3890 W Example Knoll Ln (MLS #2289031), $560,000: bank owned (REO), sold as-is. Not arm’s length.',
            '4378 W Practice Ridge Dr (MLS #2288850), $702,000: two story with 2,450 sq ft above grade. Different style and size.',
            '4302 W Practice Ridge Dr (MLS #2291002), pending, and 4011 W Sample Crest Cir (MLS #2291388), active: not closed. Context for you only.',
          ],
        },
        { h: 'Grounds: Strong' },
        {
          items: [
            'Two of the three comparables were measured differently from the subject: their basements are inside the grid’s GLA, which produced -$72,000 and -$75,500 GLA adjustments, and the MLS records show it.',
            'Three rambler sales in the subject’s subdivision, 0.08 to 0.34 miles away, closed 07/30 to 10/09/2026, before the effective date, against report comparables 1.62 to 2.91 miles away.',
          ],
        },
        { p: ['There’s no promise the value changes. The lender reviews the request, and the appraiser decides.'] },
        { h: 'Options for the buyers' },
        {
          items: [
            'Request a reconsideration of value, and ask for an extension. Strong grounds. Tradeoff: one borrower-initiated request per appraisal under the conventional rules, and it may not finish by Friday, so pair it with an extension of the Financing & Appraisal Deadline signed before 5:00 PM Friday, November 13. Whether to extend is the sellers’ call.',
            'Renegotiate. A lower price or a credit, on a signed addendum that goes to the lender. Tradeoff: the sellers may say no, and any credit has to fit what the lender allows at the appraised value.',
            'Cover the gap. Keep the price. Addendum No. 1 already has the buyers paying up to $10,000 of a shortfall in cash; the other $18,000 of today’s gap is outside it. The lender figures the loan-to-value on $612,000, so they’d bring more cash, borrow a larger share of the value, or both. Tradeoff: cash out of pocket or different loan terms; Make-Believe Mortgage Co. gives the exact figures.',
            'Cancel under the Appraisal Condition. Written notice with a copy of the Notice of Appraised Value by 5:00 PM Friday, November 13, under Section 8.2(a); the $10,000 earnest money comes back. Tradeoff: they lose the house.',
          ],
        },
        { h: 'Reconsideration of value request' },
        {
          email: {
            subject: 'Request For Reconsideration Of Value, 4127 W Practice Ridge Dr',
            body: [
              'To: [Loan Officer Name], Make-Believe Mortgage Co.',
              'From: Jordan Example and Casey Example (borrowers)',
              'Date of request: [date sent]',
              'Property address: 4127 W Practice Ridge Dr, Example Springs, UT 84000',
              'Appraisal effective date: 10/27/2026 (report dated 10/30/2026, File No. PVS-26-1044)',
              'Appraiser: Avery Makebelieve, Pretend Valuation Services',
              'Loan program: Conventional',
              'We’re asking for a reconsideration of value based on the facts and sales below. We understand one borrower-initiated request is permitted per appraisal.',
              '1. Items in the report that differ from the property records',
              'Comparable 2, 9814 S Sample Bend Dr (MLS #2284471). The sales comparison grid (page 3) shows 3,080 sq ft of gross living area, a basement of “0 sq ft,” and 9 rooms, 5 bedrooms and 3.0 baths above grade. The MLS record shows 1,560 sq ft above grade and a 1,520 sq ft basement with 1,450 sq ft finished (3,080 total), with 3 bedrooms and 2 baths above grade and 2 bedrooms and 1 bath below.',
              '2. Additional closed sales for consideration (all closed on or before 10/27/2026, in Practice Ridge Estates)',
              'MLS #2290101, 4089 W Practice Ridge Dr, 0.08 mi, closed 09/18/2026, $645,000, seller concessions $5,000. Rambler, built 2009, 1,620 sq ft above grade, 1,600 sq ft basement with 1,500 finished, 3 bedrooms and 2 baths above grade plus 2 bedrooms and 1 bath below, 3-car garage, 0.20 ac. Same subdivision, style and age as the subject.',
              'Thank you for reviewing this. Please let us know the expected turn time; our contract’s Financing & Appraisal Deadline is 5:00 PM Mountain Time on November 13, 2026.',
              'Jordan Example and Casey Example',
            ],
          },
        },
        { h: 'Client email' },
        {
          email: {
            subject: 'Appraisal Results And Next Steps For 4127 W Practice Ridge Dr',
            body: [
              'Hi Jordan and Casey,',
              'The appraisal came in at $612,000, $28,000 under our $640,000 price. There are real grounds to ask for another look, and we need a plan by 5:00 PM Friday, November 13.',
              'What The Appraisal Says',
              'Two of the three sales the appraiser used, 1.62 to 2.91 miles away, have their basements counted as main-floor living space, so they look much larger than your home.',
              'What We Found',
              'Three similar ramblers in Practice Ridge Estates sold before the appraisal date and weren’t used, including 4089 W Practice Ridge Dr ($645,000 in September).',
              'One Contract Detail',
              'Addendum No. 1 has you covering up to $10,000 of a shortfall. The gap is $28,000, so you can still cancel over the appraisal. If a revised value came within $10,000 of the price, you’d likely cover that difference in cash with no option to cancel. I’ll confirm with my broker.',
              'Your Options',
              '1. Ask your lender for a reconsideration of value. I’ve drafted it. The value may not change, and the review may outlast our deadline.',
              '2. Ask the sellers to extend the deadline. I’ll ask Monday.',
              '3. Renegotiate the price or ask for a credit, in a signed addendum.',
              '4. Keep the price. Your lender figures the loan on $612,000, so you’d bring more cash or borrow a larger share of the value. Your loan officer has the numbers.',
              '5. Cancel by 5:00 PM Friday with written notice under the appraisal condition, and your $10,000 earnest money comes back.',
              'What Happens Next',
              'Monday, November 9: you send the request, and I ask for the extension.',
              'By 5:00 PM Friday: without a signed extension, we choose among options 3 to 5.',
              '[Agent Name]',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 3 of its 19 rows',
            head: ['Item in the drafts', 'Source'],
            rows: [
              ['$28,000 gap', '$640,000 minus $612,000 (computed)'],
              ['5:00 PM Mountain Time, Friday, November 13, 2026', 'REPC Section 24(c) and Section 21, page 3'],
              ['Placeholders still open', '[Loan Officer Name], [date sent], [Listing Agent Name], [Agent Name]'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, section 9, "Output, In This Order", in its order (sections 2 to 8 for what each part holds).
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: a bold warning when the deadline is today, tomorrow or the day after, blanks for you to fill, missing report pages, and which side you’re on if your message didn’t say. Outside Utah, a note that state rules weren’t checked.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: the gap, its likely cause, whether a reconsideration has real grounds, and the deadline.',
        },
        {
          title: 'The clock',
          body: 'Which contract the AI read and its appraisal terms, quoted. The deadline at 5:00 PM Mountain Time, the days left, and what a cancellation needs. Whether the lender’s review can finish in time, and what canceling under the financing condition instead would cost. Labeled for strategy: your transactions team keeps the official dates.',
        },
        {
          title: 'The gap',
          body: 'Contract price minus appraised value, with the math shown. Any appraisal gap term your buyer already agreed to, and what’s left. Seller credits flagged for the lender to confirm.',
        },
        {
          title: 'A fact check',
          body: 'The home’s facts in the report against the report’s own sketch and photos and your MLS data: above-grade and basement area, finish, bedrooms, baths, lot and garage. For any fact that’s off, the report’s own adjustment rates applied as arithmetic, labeled “not a value.”',
        },
        {
          title: 'A comparable review',
          body: 'Each sale the appraiser used: its distance, its sale date against the appraisal’s effective date, and whether it was measured the same way as your home. Described, never judged.',
        },
        {
          title: 'Better sales from your CMA',
          body: 'Up to five closed sales the report didn’t use, each closed on or before the effective date. Then the sales left out, and why: closed too late, not arm’s length, too different, or not closed yet.',
        },
        {
          title: 'The grounds',
          body: 'Strong, Some or Weak, with the two or three facts that decide it. When the report is well supported, the AI says so plainly.',
        },
        {
          title: 'Your side’s options',
          body: 'Buyer’s side: ask for a reconsideration, renegotiate, cover the gap, or cancel by the deadline. Listing side: back a reconsideration with sales, reduce to the value, meet in the middle, or hold the price. Each with its tradeoff and its deadline. Both sides when your message doesn’t say which.',
        },
        {
          title: 'The reconsideration request',
          body: 'Buyer’s side: a request from your buyers to their lender, in the loan program’s format, with no target value. Listing side: a data package for the buyer’s agent to pass to the buyer and the lender. With weak grounds, what a request would need instead of a padded one.',
        },
        { title: 'A client email', body: 'Written as you, in plain words: the gap, what the AI found, the options and what happens next.' },
        { title: 'A note to the other agent', body: 'Short and factual, like a request for an extension.' },
        {
          title: 'Check before sending',
          body: 'Every date, time, dollar amount, square footage, page number, MLS number and quote in the drafts, with where to check it.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own (its opening and section 8), and page-notes.md's. The skill drafts no
      // texts, so texting consent has no place here; the drafts describe the home and the sales, never
      // the people, and a report's comment on people goes to the lender and the broker (section 4).
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You and your client decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the reading and math',
          body: 'Reads every page. Checks the home’s facts against the report’s own sketch and photos and your MLS data, reviews the sales the appraiser used, sorts your CMA by the appraisal’s effective date, works out the gap and counts the days to the deadline.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The reconsideration request (or the listing-side data package), the client email and the note to the other agent. Nothing reaches your client, the lender or the other agent until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours and your client’s',
          body: 'Whether to ask for a reconsideration: the buyer, as the borrower, sends it. Every price and money decision. Covering the gap is between the buyer and their loan officer, who gives the figures. Any extension. Your transactions team keeps the official dates. Anything about the appraiser beyond the facts, and any fair housing concern in the report, goes to your broker and the lender. The AI never asks for or repeats wire or bank details.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its sources (checked 2026-11-08). The plan wording every skill
      // page uses. No ChatGPT Free limits as numbers (see the top). Gmail is optional and untested, so it
      // isn't offered here. Scanned PDFs are on page-notes.md's "Not tested" list.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on, so Claude can read a CSV export and do the gap and date math. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns them on',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro.',
          tag: 'Free ChatGPT has upload limits',
        },
        {
          title: 'A computer',
          body: 'To set it up once, on claude.ai, in the Claude desktop app or on the ChatGPT website. Once the skill is added, Claude’s docs say the phone app can use it too.',
        },
        {
          title: 'Your files',
          body: 'The full appraisal, every page, and the signed contract with every addendum. Your comps help most: a CMA as a PDF, or an MLS export as a CSV (a spreadsheet file).',
          tag: 'We haven’t tested scanned PDFs yet',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app, like Gmail. This skill needs none. The AI writes the drafts in the chat for you to copy.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan and the MLS access you already have.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From": Regulation B (12 CFR 1002.14) for
      // the buyer's copy of the appraisal; UtahRealEstate.com's "Exporting MLS Listings" and Flexmls Help's
      // "Export Search Results" and "Save a CMA as a PDF", all checked 2026-11-08. UtahRealEstate.com's
      // help has no PDF step for a CMA (the build report), so the page gives its CSV export only.
      kind: 'list',
      heading: 'Where to get your files',
      items: [
        {
          title: 'The appraisal, every page',
          body: 'The lender has to give the buyer a copy. Buyer’s agent: ask your buyer to forward the PDF from the lender’s email or portal. Listing agent: ask the buyer’s agent. Only have the lender’s notice of the value? The AI still works out the gap, the deadline and the options, and tells you the review needs the full report.',
        },
        {
          title: 'The contract and every addendum',
          body: 'From your transaction file. Include the FHA/VA Loan Addendum and any addendum with a seller credit or an appraisal gap term (where the buyer agreed to cover some of a shortfall).',
        },
        {
          title: 'Your comps, on UtahRealEstate.com',
          body: 'Select the listings in your search results. Choose Export Report from the Reports drop-down menu, answer the security question, pick Standard or Custom, choose CSV, then download. Include sales from before and after the appraisal’s effective date: the AI sorts out which ones count.',
        },
        {
          title: 'Your comps, on a Flexmls MLS',
          body: 'Run the search and click the More menu (three dots), then Export. Choose all matches or selected matches, and keep Generic Text Export, which saves a CSV. Or open your CMA, click Print and choose Save as PDF.',
        },
        {
          title: 'Check your MLS rules',
          body: 'MLS exports carry agent-only remarks and lockbox codes. The AI keeps them out of every draft. Ask your MLS or your broker about their rules for using MLS data in outside tools.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", with curly apostrophes; the first without its [brackets] (the AI
      // reads the numbers from the files). The Gmail draft line is left out (see the top). What a Tidewater
      // is: references/rov-programs.md (VA Pamphlet 26-7, Chapter 10, Topic 8), for a team owner who
      // hasn't met the word.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your files, and paste. Follow-ups go in the same chat. On a VA loan, a Tidewater is the appraiser’s notice, before the report is final, that the value may come in under the price.',
      groups: [
        {
          label: 'To start, with your files attached',
          items: [
            'The appraisal came in under our price. I’m the buyer’s agent. Here’s the appraisal and the REPC. What are our options?',
            'I’m the listing agent. The buyer’s appraiser used comps three miles away. Here’s the report and my CMA. What do I tell my sellers?',
          ],
        },
        {
          label: 'Is it worth a fight?',
          items: ['Is there anything in this appraisal worth a reconsideration of value, or is it solid?'],
        },
        {
          label: 'On a VA loan',
          items: [
            'My buyers want to fight a VA appraisal. Put together a reconsideration.',
            'The lender called about a Tidewater. Which sales should we send?',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md's FAQ; SKILL.md, section 8 (appraiser independence); references/rov-programs.md
          // (Regulation Z 1026.42; each program's process); eval 2 (the listing side can't file).
          q: 'Can I call the appraiser?',
          a: [
            'Don’t. Federal rules bar pressure of any kind on an appraiser, and a request for another look goes through the lender (on a VA loan, the lender or VA). So the AI never drafts anything to the appraiser, never suggests calling them, and never names a value they should reach. On the listing side, your sellers can’t file a request: the buyer is the borrower. The AI drafts a data package of facts and sales for the buyer’s agent to pass to the buyer and the lender.',
          ],
        },
        {
          // SKILL.md, sections 5 and 7; eval 3 (a well-supported VA appraisal the buyers wanted to fight).
          q: 'What if the appraisal is right?',
          a: [
            'The AI says so plainly. It calls the grounds Weak and says a reconsideration is unlikely to change the value. It won’t pad a request to please an upset client. Instead it says what a request would need: a fact the report got wrong, or a closer, more similar sale that closed by the appraisal’s effective date. It also gives the loan program’s process, in case you find one. We tested this on a made-up VA appraisal the buyers wanted to fight.',
          ],
        },
        {
          // page-notes.md's FAQ; SKILL.md, section 2; both REPCs (references/utah-appraisal.md).
          q: 'Does the lender’s review stop the contract clock?',
          a: [
            'No. In Utah, the buyer’s right to cancel over a low appraisal ends at 5:00 PM Mountain Time on the contract’s deadline, and the lender’s timing doesn’t change that. If the review won’t finish in time, the buyer and seller sign an extension before the deadline, or the buyer decides by then. Canceling later under the financing condition instead can cost part of the earnest money, and the AI shows how much.',
          ],
        },
        {
          // SKILL.md, sections 1 and 2; evals 1 (November 1, 2026 REPC), 2 (December 4, 2024 REPC with the
          // FHA/VA Loan Addendum) and 3 (Idaho, general mode); page-notes.md, "Not tested".
          q: 'Which contracts and loans does it read?',
          a: [
            'Both Utah REPCs in use now. The AI reads the footer, “EFFECTIVE DECEMBER 4, 2024” or “EFFECTIVE NOVEMBER 1, 2026,” and quotes that form’s appraisal terms. It reads the Utah FHA/VA Loan Addendum and any addendum with a seller credit or an appraisal gap term. It knows the reconsideration rules for conventional, FHA and VA loans. In another state, it takes the deadline from your contract and says it didn’t check your state’s rules. We tested it on made-up files, including one in Idaho. We haven’t tested it yet on real appraisals (they run longer than our made-up ones), USDA loans or cash buyers.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Not tested": the plan wording every skill page uses, and
          // ChatGPT Free's limits without numbers (see the top).
          q: 'Which plan do I need?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. In ChatGPT, a Project on Free, Go, Plus or Pro. Free ChatGPT has upload limits, so on Free a long appraisal, the contract and a CMA may need to go in over more than one message or day. We tested the skill in Claude. We haven’t tried it inside ChatGPT yet, so run the practice files first.',
          ],
        },
        {
          // page-notes.md, "What It Will Not Do"; SKILL.md, section 8.
          q: 'What won’t the AI do?',
          a: [
            'The AI won’t contact the appraiser, criticize them, or promise the value will change. It never invents sales, adjustments or market numbers: every number comes from your files. It won’t decide on price or money, work out a loan amount or the exact cash your buyer needs, or quote a limit on seller credits: the lender confirms those. It won’t write new contract language: a price change goes on your approved addendum. It keeps agent-only MLS remarks, lockbox codes, loan and account numbers, and your client’s bottom line out of anything your client or the other side sees. It describes the home and the sales, never the people. It never sends anything.',
          ],
        },
      ],
    },
    {
      // skills/pricing-conversation-prep/SKILL.md, its appraisal check: a financed buyer's appraisal leans on
      // the same closed sales the price is built from.
      kind: 'note',
      body: [
        'Setting the price before you list? ',
        { link: 'Pricing Conversation Prep', href: '/pricing-conversation-prep', sameTab: true },
        ' builds it from the closed sales a buyer’s appraisal will lean on.',
      ],
    },
  ],

  unlockKey: 'lar-unlocked',
});
