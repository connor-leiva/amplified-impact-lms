// Every word on /offer-strategy that is its own: the landing page for Offer Strategy, a free skill
// (`skills/offer-strategy/`, version 1.0) that turns a listing's MLS sheet and price history, the comps
// and the buyer's preapproval letter into a recommended offer for a buyer: flags, a bottom line, where
// the listing stands, the price from the comps, every term in a table, a risk ledger, questions for the
// listing agent, a buyer email and Check before sending. What every skill page says the same way is in
// `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and references/offer-terms.md), its page notes, its
// graded runs (three evals and the practice run, all passed, plus a reviewer's reruns of eval 2 and the
// practice set) and the build and review reports, so the page promises what the skill does. Buyer side,
// before the offer. The skill recommends one price and every term with the risk behind it; the buyer
// decides, and the page says so in the opt-in, the outcome step, the tiles and the FAQ. The note points
// listing agents comparing the offers that came in to Offer Comparison.
//
// What the page leaves out or hedges, and why:
//   - No "typical" Utah due diligence length, earnest money or concession amount: none could be sourced
//     (page-notes.md, "Not verified anywhere"). The FAQ says the AI builds the length from what has to
//     fit and says to confirm with the broker or team leader, as references/offer-terms.md and the
//     practice run do.
//   - ChatGPT Free's upload limit: page-notes.md takes "3 a day" from the shared vendor facts, since
//     help.openai.com did not open for the review. So the page states no number: it says Free limits
//     daily uploads and data analysis, and what that means (setup and practice can take more than a day).
//   - Gmail is optional (only to save the buyer email as a draft) and untested, so no prompt asks for a
//     draft, and the connector tile says the AI writes the email in the chat to copy.
//   - Claude Free: the help center lists skills on every plan, the docs on Pro and up, and no run used
//     Free. The page says both. The ChatGPT version was not run inside ChatGPT.
//   - Real MLS sheets, CMAs and lender letters were not tested (all made up), so the page claims nothing
//     about real files beyond what to upload. The click paths for the MLS sheet, its price history and
//     the export are page-notes.md's, checked against UtahRealEstate.com's and Flexmls's help centers on
//     2026-11-08. Flexmls's help has no PDF step, so the page says to save from the browser.
//   - Escalation and appraisal gap: the AI gives the numbers and never drafts the wording (SKILL.md,
//     section 4; eval 1). Buyer letters: it advises against them (fair housing, NAR) and never drafts one.
//
// The practice set is three files (an MLS sheet PDF with its price history, a CMA export CSV and a
// preapproval letter PDF), attached file by file. `setupMinutes` is an estimate (page-notes gives none):
// 10, as the other skill pages with a ChatGPT version say for the same steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const OFFER_STRATEGY: Guide = skillPage({
  slug: 'offer-strategy',
  title: 'Offer Strategy',

  meta: {
    title: 'Offer Strategy: A Free AI Skill · Amplified Impact',
    description:
      'Upload the listing’s MLS sheet, your comps and your buyer’s preapproval letter, and get a recommended offer, term by term, with the risk behind each term in dollars and an email your buyer can follow. Your buyer decides. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Buyer’s Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload the listing’s MLS sheet, your comps and your buyer’s preapproval letter, and the AI hands back a recommended offer, term by term, with the risk behind each term in plain dollars and an email your buyer can follow.',
  outcome: { n: '03', title: 'Let Your Buyer Decide', body: 'A price, every term with its risk, and an email that explains them.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI recommends an offer from your files. Your buyer decides.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt:
      'My buyers, Riley and Jordan Exampleton, want to write on 2286 E Pretend Poppy Ln. We’re on the new November 2026 REPC. Their top number is $565,000. The listing agent says there are no offers yet and they’re reviewing as they come in. Our team usually puts down $5,000 earnest money. If we get acceptance Tuesday, November 10, what should we offer? The MLS sheet, CMA export and their preapproval letter are attached.',
    note: [
      'There are three files: an MLS sheet with its price history, a CMA export and a preapproval letter. Every name, address and number in them is made up. ',
    ],
  },

  real: {
    // SKILL.md, section 1: the MLS sheet with its price history and the comps are required, the letter is
    // helpful; use what the agent says and never ask them to retype what a file holds.
    body: [
      'Start a new chat the same way. Attach the listing’s MLS sheet with its price history, your CMA (comparative market analysis) or comp export, and your buyer’s preapproval letter. Then say this.',
    ],
    // page-notes.md, "Things to Say", the first, without the [address] to fill in.
    prompt: 'My buyers want to write on this home. Here’s the MLS sheet, my CMA and their preapproval. What should we offer?',
    // SKILL.md, section 1 ("Helpful" and "Pick the Utah form") and section 9, item 9.
    note: [
      'Add what the listing agent told you (an offer deadline, highest and best, the seller’s dates), your buyer’s top number and your usual earnest money. In Utah, say which REPC form you’re writing on. You don’t need to type anything that’s in your files. Before anything goes out, check every price, date and section number in the ',
      { strong: 'Check before sending' },
      ' list against your files.',
    ],
  },

  chatgpt: { paste: chatgptPaste('offer-strategy') },

  sections: [
    {
      // sample.md (the practice run), shortened, in the output's own order and its own words, cut only by
      // whole parts, rows, columns, items and sentences: the bottom line; three of the seven signals and
      // the position call; three of the five closest comps (Price and After concessions written into the
      // address cell, Read kept, the other columns dropped), the two left out, the range, the
      // recommendation and the appraisal check; five of the nineteen terms (each term's section moved into
      // its name, the recommendation and its why in one cell) and three of the dates; two of the risk
      // ledger's four rows, Term and What it risks only; two of the five questions; the buyer email in
      // full; two rows of Check before sending. Every table is two columns, so none scrolls sideways at
      // 390 pixels. Left out: the flags, the comp set's numbers, the pending and expired listings.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What an offer plan looks like',
      body: 'What the AI wrote from the practice files: a made-up listing in Utah, made-up buyers, a made-up preapproval letter and a made-up CMA (comparative market analysis). They’re the same files you practise on in setup.',
      title: 'Offer Strategy: 2286 E Pretend Poppy Ln',
      note: 'Made-up example. Shortened: a few rows and lines from each part, and the buyer email in full.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'Recommend ',
            { strong: '$562,500 with the $5,000 Seller’s Contribution to Closing Costs the seller is already offering' },
            ' (price after concessions $557,500), and the three terms that matter most are ',
            {
              strong:
                'the price inside the supported range, $5,000 earnest money, and a Settlement date after December 1 with a few days’ possession for the seller',
            },
            ', confirmed through the listing agent. That is a ',
            { strong: 'moderate' },
            ' offer for a balanced listing with no other offers: $7,400 under list, with $2,500 of room left under the buyers’ $565,000 limit for a counter. The buyers decide; the lender confirms the concession fits the loan.',
          ],
        },
        { h: 'Where the listing stands' },
        {
          table: {
            caption: '3 of its 7 signals',
            head: ['Signal', 'What the files show'],
            rows: [
              [
                'Days on market',
                '23 (listed 10/16/2026) against a median of 15 for this comp set’s five recent solds (7, 13, 15, 15, 23)',
              ],
              ['Price history', 'One cut: $579,900 to $569,900 on 10/30/2026 ($10,000)'],
              [
                'Agent-only remarks (for your strategy only; never share)',
                'Seller relocating for work; prefers settlement after December 1 and 3 days possession after recording.',
              ],
            ],
          },
        },
        {
          p: [
            { strong: 'Position: Balanced.' },
            ' The listing has sat a little longer than the comp set’s median and cut once, the seller is already offering money toward closing costs, and no other offers are reported. Matching the seller’s timing is a cheap way to make a fair price land.',
          ],
        },
        { h: 'Price' },
        {
          table: {
            caption: '3 of the 5 closest comps',
            head: ['Sale', 'Read'],
            rows: [
              [
                '2310 E Pretend Poppy Ln: $560,000, $556,000 after concessions',
                'Closest match: same street, nearly the same size; updated baths, no kitchen update noted. The listing should sell at or a bit above it.',
              ],
              [
                '2402 E Pretend Poppy Ln: $556,500, no concessions',
                'Same floor plan with an original kitchen; the oldest of these sales (about five months). The listing’s 2021 kitchen and 2023 roof put it above this one.',
              ],
              [
                '1988 E Sample Sage Dr: $572,500, $567,500 after concessions',
                'Larger, five bedrooms. Its net after concessions marks the top of the range.',
              ],
            ],
          },
        },
        {
          p: [
            { strong: 'Left out:' },
            ' 2129 E Example Aster Way ($499,000), a short sale sold as-is. 2277 E Make Believe Ct ($538,000) sold in March, more than six months ago (labeled older).',
          ],
        },
        {
          p: [
            { strong: 'Supported range: $560,000 to $567,500.' },
            ' Confidence: high. Five recent sales of the same style, two on the same street, one with the same floor plan.',
          ],
        },
        {
          p: [
            { strong: 'Recommended offer: $562,500 with a $5,000 Seller’s Contribution to Closing Costs.' },
            ' Price after concessions: $562,500 minus $5,000 = $557,500, just above the closest sale’s net of $556,000.',
          ],
        },
        {
          p: [
            { strong: 'Appraisal check:' },
            ' $562,500 is below the highest closed sale ($572,500) and inside the supported range, so the reference gap is zero.',
          ],
        },
        { h: 'Recommended terms (November 1, 2026 REPC)' },
        {
          table: {
            caption: '5 of its 19 terms',
            head: ['Term (section)', 'Recommendation, and why'],
            rows: [
              [
                'Earnest Money Deposit (1(a), 5)',
                '$5,000. Your team’s usual amount. Delivered no later than 4 calendar days after Acceptance.',
              ],
              [
                'Seller’s Contribution to Closing Costs (2.2, 8.3(c))',
                '$5,000. The seller offers it in the public remarks. The lender confirms the amount fits the loan.',
              ],
              [
                'Financing Condition (3(c), 3(c)(i), 12.3(a))',
                'Box checked; leave the 50% default in 3(c)(i). If the buyers cancel for loan terms after Due Diligence and by the Financing Deadline, 50% of $5,000 = $2,500 goes to the seller.',
              ],
              [
                'Due Diligence Deadline (4(b))',
                '10 days after Acceptance. Room for an inspection and any follow-up on a 2004 home with a 2023 roof and 2016 furnace. Confirm what’s customary with your team leader.',
              ],
              [
                'Settlement Deadline (4(e))',
                '31 days after Acceptance. After December 1, which the agent-only remarks say the seller prefers (confirm with the listing agent; don’t share the remark), and inside the letter’s December 27 expiration.',
              ],
            ],
          },
        },
        {
          p: [
            { strong: 'Dates if Acceptance is Tuesday, November 10, 2026.' },
            ' For strategy; confirm dates with your transactions team.',
          ],
        },
        {
          items: [
            'Due Diligence Deadline: Friday, November 20 (day 10), 5:00 PM Mountain Time',
            'Financing Deadline: Friday, December 4 (day 24)',
            'Settlement Deadline: Friday, December 11 (day 31)',
          ],
        },
        { h: 'Risk ledger' },
        {
          table: {
            caption: '2 of its 4 rows, 2 of its 4 columns',
            head: ['Term', 'What it risks for the buyers'],
            rows: [
              [
                '$5,000 earnest money',
                'Non-refundable after Friday, November 20 except for an appraisal cancellation by November 30 (12.2(a)) or a financing cancellation by December 4 (12.3(a), $2,500 to the seller). If the loan hasn’t funded after the Financing Deadline, all $5,000 goes to the seller (12.3(c)).',
              ],
              [
                '10-day Due Diligence',
                'Any repair request has to be resolved in writing by 5:00 PM on November 20; there’s no response period after it.',
              ],
            ],
          },
        },
        { h: 'Questions for the listing agent' },
        {
          items: [
            'Is the $5,000 toward the buyer’s closing costs still on offer?',
            'Does the seller have a preferred Settlement date and move-out timing?',
          ],
        },
        { p: ['(Don’t share the buyers’ $565,000 limit.)'] },
        { h: 'Buyer email' },
        {
          email: {
            subject: 'Offer Plan For 2286 E Pretend Poppy Ln',
            body: [
              'Hi Riley and Jordan,',
              'I recommend offering $562,500 with the $5,000 the seller is already offering toward your closing costs. That’s $7,400 under list, right in line with the recent sales, and it leaves room under your $565,000 limit if the seller counters. I can’t promise the seller says yes, and I’d like your go-ahead by [time].',
              'What The Sales Show',
              '2310 E Pretend Poppy Ln, on your street and nearly the same size, sold October 2 for $560,000 with $4,000 toward the buyer’s costs.',
              '2402 E Pretend Poppy Ln, the same floor plan with an original kitchen, sold in June for $556,500. This home’s updated kitchen and newer roof put it above that one.',
              'Larger homes nearby sold for $571,000 and $572,500.',
              'The Terms I Recommend',
              '$562,500, with $5,000 from the seller toward closing costs.',
              '$5,000 earnest money.',
              '10 days for inspections.',
              'Appraisal and loan approval on your lender’s timeline, with a little cushion for Thanksgiving week.',
              'Closing Friday, December 11. I’m confirming with the listing agent how much time the seller needs to move out after closing.',
              'What Each Choice Risks',
              'The seller may counter. We’d have $2,500 of room before your limit.',
              'Your earnest money becomes hard to get back after the 10-day inspection period, except for appraisal and loan problems.',
              'Please have your lender confirm the $5,000 toward closing costs fits your loan.',
              'What I Need From You (By [Time])',
              '1. Are you comfortable at $562,500?',
              '2. Is closing December 11 workable for you?',
              'Please don’t include a personal letter or photos with the offer; we’ll keep it about price and terms.',
              '[Agent Name]',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: '2 of its 14 rows',
            head: ['Item', 'Where to verify'],
            rows: [
              ['$560,000 with $4,000 (2310 E Pretend Poppy Ln, sold 10/02/2026)', 'CMA export, MLS # 2288140'],
              [
                'All dates (November 13, 14, 16, 20, 24, 30; December 4, 11)',
                'Counted from Acceptance on Tuesday, November 10; confirm with your transactions team',
              ],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, section 9, "Output, In This Order", in its order.
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: blanks for you to fill, which REPC form the section numbers come from (or both, if you didn’t say), a preapproval letter that has expired or doesn’t match, and a price above your buyer’s top number. Outside Utah, a note that state rules weren’t checked.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: the recommended price, the three terms that matter most, and how competitive the offer is.',
        },
        {
          title: 'Where the listing stands',
          body: 'Days on market against the comps, every price cut, the listing agent’s instructions and any seller money in the public remarks. Then a call: Competitive, Balanced or Buyer Leverage.',
        },
        {
          title: 'The price',
          body: 'The closest sold comps in a table, with concessions and the price after concessions, what was left out and why, the supported range, one recommended price, and the gap to the highest closed sale (the appraisal check).',
        },
        {
          title: 'Recommended terms',
          body: 'Every term in a table, with a reason: price, earnest money, due diligence, appraisal and financing deadlines, settlement, possession, appraisal and financing protection, seller concessions, sale of your buyer’s home, escalation, and lead-based paint when it applies. In Utah, with the section number on your form. The dates are counted from Acceptance and labeled for strategy.',
        },
        {
          title: 'A risk ledger',
          body: 'A table of every term that gives the seller more than the safer version: what the seller gets, what your buyer risks in dollars with the math shown, and who confirms it (the lender, the inspector or your broker).',
        },
        {
          title: 'Questions for the listing agent',
          body: 'Five to eight, picked for this listing. They never reveal your buyer’s top number, cash or reasons.',
        },
        {
          title: 'A buyer email',
          body: 'Written as you, under 350 words: the recommended price, the sales behind it, the terms, what each choice risks, and the decisions your buyer needs to make. It ends with a line advising against a personal letter or photos.',
        },
        {
          title: 'Check before sending',
          body: 'Every price, dollar amount, date, time, day count and section number, traced to its file, your message or a labeled recommendation.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own (its opening and sections 4 and 8), and page-notes.md's.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI recommends. Your buyer decides.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the reading and math',
          body: 'Reads the MLS sheet, its price history, the comps and the preapproval letter, and sorts the comps. Does the math: days on market against the comps, prices after concessions, the appraisal gap, and every date counted from Acceptance.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The term table, the risk ledger, the questions for the listing agent and the buyer email. Nothing reaches your buyer or the listing agent until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours and your buyer’s',
          body: 'Your buyer decides the price and every term, including any waiver. You own the advice, every money conversation and any fair housing call. The lender confirms the cash, the concession and the loan timing. Your broker approves any escalation wording. Your transactions team keeps the official dates. Wire instructions and account numbers: the AI never asks for them or repeats them.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its sources (checked 2026-11-08). No ChatGPT Free limits as
      // numbers. Gmail is optional and untested, so it isn't offered here.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on, so Claude can do the comp and date math. Claude’s help center lists skills on every plan, Free included.',
          tag: 'Team or Enterprise: an owner controls skills',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro.',
          tag: 'Free ChatGPT limits uploads and data analysis',
        },
        {
          title: 'A computer',
          body: 'To set it up once, on claude.ai, in the Claude desktop app or on the ChatGPT website. Saving reports from your MLS is easiest on a computer too.',
        },
        {
          title: 'Your files',
          body: 'The listing’s MLS sheet with its price history, and your comps with sold prices and close dates: a CMA as a PDF, or an MLS export as a CSV (a spreadsheet file). Your buyer’s preapproval letter is recommended.',
          tag: 'MLS sheet and comps required',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app, like Gmail. This skill needs none. The AI writes the buyer email in the chat for you to copy.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan and the MLS access you already have.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From": UtahRealEstate.com's help center
      // ("View Listing History", "Exporting MLS Listings") and Flexmls Help ("View Listing History"), all
      // checked 2026-11-08. Flexmls's help has no PDF step, so the page says to save from the browser.
      kind: 'list',
      heading: 'Where to get your files',
      items: [
        {
          title: 'The MLS sheet, on UtahRealEstate.com',
          body: 'Open the listing in the Agent Full Report and save it as a PDF. Then click the History link to the right of the Tax ID. That opens the Property Activity Report, with the listing’s price and status changes. Click the Adobe symbol in its top right corner to open the full report as a PDF, and save it. Attach both PDFs.',
        },
        {
          title: 'The MLS sheet, on a Flexmls MLS',
          body: 'Open the listing and click the History link on the Detail tab. Expand the rows to see each price change. Save the listing and its history as a PDF from your browser.',
        },
        {
          title: 'Your comps, as a CSV',
          body: 'On UtahRealEstate.com, select the listings in your search results. Choose Export Report from the Reports drop-down menu, answer the security question, pick Standard or Custom, choose CSV, then select Download. A CMA report saved as a PDF works too.',
        },
        {
          title: 'Your buyer’s preapproval letter',
          body: 'Ask the lender for the current letter. If it shows a loan or account number, the AI leaves it out. Better still, ask the lender for a copy without them.',
        },
        {
          title: 'Check your MLS rules',
          body: 'MLS sheets carry agent-only remarks and lockbox codes. Ask your MLS or your broker about their rules for using MLS data in outside tools.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", with curly apostrophes, the first without its [address] (it is the
      // real-files step's words, so here it is the shorter version).
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your files, and paste. Change any number or day to yours. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with your files attached',
          items: [
            'My buyers want to write on this one. What should we offer?',
            'This one’s been sitting 60 days with two price cuts. How far under list can we go, and how much can we ask for in closing costs?',
          ],
        },
        {
          label: 'When it’s competitive',
          items: [
            'Highest and best is due Monday at 6. My FHA buyers can go to $510,000. Should they waive the appraisal or escalate?',
            'My buyer wants to waive the appraisal to stand out. Is that a good idea with her letter?',
          ],
        },
        {
          label: 'On the new Utah REPC',
          items: ['We’re on the new November 2026 REPC. Which boxes do I check and what deadlines do I write?'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md's FAQ; SKILL.md, section 4; references/offer-terms.md, section 3; evals 1 and 3.
          q: 'Should my buyer waive the appraisal to win?',
          a: [
            'That’s your buyer’s choice. The AI shows the possible gap in dollars: your offer minus the highest closed sale, as a reference point, not a prediction. It compares that with the cash your buyer’s letter shows. It won’t recommend a waiver unless the lender confirms the cash, and never when the letter shows the cash isn’t there. For FHA and VA buyers, it explains why checking “no appraisal condition” isn’t a real waiver: the FHA/VA Loan Addendum still lets them walk away if the price is over the appraised value.',
          ],
        },
        {
          // SKILL.md, sections 4, 7 and 8; references/offer-terms.md, sections 3 and 6 (NAR on buyer
          // letters); page-notes.md's FAQ (no state-approved escalation form in Utah).
          q: 'Will the AI write an escalation clause or a buyer letter?',
          a: [
            'No to both. For escalation, the AI gives you the numbers your buyer picks: a starting price, an increment and a cap at or below their top number. The wording comes from your brokerage’s approved addendum, and your broker reviews it. Utah has no state-approved escalation form. The AI also advises against a personal letter or photos with the offer, because they can raise fair housing concerns. It leaves anything about your buyer’s family or background out of the plan.',
          ],
        },
        {
          // references/offer-terms.md, section 3; page-notes.md, "What It Won't Do" and "Not verified
          // anywhere"; the practice run's Due Diligence row.
          q: 'How long should due diligence be?',
          a: [
            'The AI won’t quote a “typical” Utah length, because we couldn’t find a reliable source for one. It builds the length from what has to fit: when the seller’s disclosures are due, your inspector’s schedule, follow-ups the home’s age may need, and HOA review. Then it tells you to confirm what’s customary with your broker or team leader. Earnest money and concession amounts work the same way: they come from you, the listing agent or the lender, never a guess.',
          ],
        },
        {
          // SKILL.md, section 1 ("Pick the state", "Pick the Utah form"); page-notes.md's FAQ (UAR's notice
          // and the November 1, 2026 REPC, checked 2026-11-08); evals 1, 2 and 3.
          q: 'Which contract does the AI use?',
          a: [
            'In Utah, the REPC form you say you’re writing on. Until December 31, 2026, that can be the December 4, 2024 form or the November 1, 2026 form. From January 1, 2027, only the new one. The section numbers differ, and the AI never mixes them. If you don’t say, it shows both and asks. On the new form, it tells you which Section 3 boxes to check, since a condition with an unchecked box doesn’t apply. In another state, the AI uses plain names for each term, no Utah sections, and says state rules weren’t checked.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Not tested". ChatGPT Free's limits without numbers: the
          // daily upload limit came from the shared vendor facts, and the data analysis limit isn't
          // published. The practice set is 3 files, plus 4 for the Project.
          q: 'Which plan do I need?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s docs list them on Pro and up. If your Free account shows no way to add a skill, that’s why. In ChatGPT, a Project on Free, Go, Plus or Pro. Free ChatGPT limits how many files you can upload a day, so setup and the practice run can take more than one day. Free ChatGPT also limits data analysis, and ChatGPT tells you when you reach that limit. We tested the skill in Claude. We haven’t tried it on Claude’s free plan or inside ChatGPT yet, so run the practice files first.',
          ],
        },
        {
          // page-notes.md, "What It Won't Do"; SKILL.md, section 8.
          q: 'What won’t the AI do?',
          a: [
            'The AI won’t decide for your buyer: it recommends, and your buyer decides. It won’t promise acceptance, an appraisal, a loan or a closing. It never invents comps, other offers or the seller’s reasons. It keeps agent-only remarks and lockbox codes out of your buyer’s email, never reveals your buyer’s top number to the listing side, and leaves loan and account numbers out of everything. It doesn’t keep your official deadline calendar, and it never sends anything.',
          ],
        },
      ],
    },
    {
      // skills/offer-comparison/SKILL.md: listing side, every offer a listing received, side by side for
      // the seller.
      kind: 'note',
      body: [
        'Listing agent comparing the offers that came in? ',
        { link: 'Offer Comparison', href: '/offer-comparison', sameTab: true },
        ' puts them side by side for your sellers.',
      ],
    },
  ],

  unlockKey: 'os-unlocked',
});
