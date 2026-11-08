// Every word on /new-construction-review that is its own: the landing page for New Construction Review,
// a free skill (`skills/new-construction-review/`, version 1.0) for a buyer's agent whose client is
// buying a home from a builder. It reads the builder's purchase agreement, its addenda (incentive,
// options, deposits, lot reservation) and any plat, HOA or special district documents, and hands back
// the top risks, a money-at-risk table, every key term as written, the incentive's conditions with the
// RESPA points as questions, what the form lacks next to the Utah REPC, the lot and district notes,
// questions for the builder's rep, a list for a real estate attorney, key dates, a buyer email and
// Check before sending. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md), its page notes, its graded runs (three evals and the
// practice run, all passed, plus a second reviewer's reruns of eval 1 and the practice) and the build and
// review reports, so the page promises what the skill does. Buyer side. Not legal advice: the AI
// describes clauses and sends contract changes to an attorney, and when a refund clause is unclear it
// writes "Not clear" for the attorney rather than deciding. For a lender-tied incentive it describes the
// conditions and the RESPA rules and never advises on the loan. The note points to Due Diligence Review
// for inspection reports, including pre-drywall and final inspections on a new build.
//
// What the page leaves out or hedges, and why:
//   - ChatGPT Free's limits: page-notes.md cites OpenAI's Projects page only "from search results", and
//     gives no daily upload number. So the page states no number beyond the 5 files a Project holds
//     (which the shared setup step already says): it says Free ChatGPT has upload limits.
//   - Gmail is optional (only to save the buyer email as a draft), untested, and Claude's own pages
//     disagree on whether it can draft. So no prompt asks for a draft, and the connector tile says the AI
//     writes the email in the chat to copy.
//   - Claude Free: the help center lists skills on every plan, the developer docs on Pro and up, and no
//     run used Free. The page says both, in the wording every skill page uses.
//   - The phone app: page-notes.md says nothing about using the skill on a phone, so the computer tile
//     says only where it is set up.
//   - Not tested (page-notes.md): real builder contracts (the fixtures are short and made up), long scanned
//     contracts, the ChatGPT version inside ChatGPT, Claude Free and the Gmail draft. The FAQ says so.
//   - The sample leaves out the attorney item that quotes Utah's arbitration statute ("valid and
//     enforceable"): out of context on a page it reads like the legal conclusion the skill never draws.
//
// The practice prompt is page-notes.md's, word for word (curly apostrophes, as on every page), including
// its "Today is November 8, 2026" line, which keeps the made-up lot hold from having already run out. The
// practice set is three PDFs, attached file by file. `setupMinutes` is an estimate (page-notes gives
// none): 10, as the other skill pages with a ChatGPT version say for the same steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const NEW_CONSTRUCTION_REVIEW: Guide = skillPage({
  slug: 'new-construction-review',
  title: 'New Construction Review',

  meta: {
    title: 'New Construction Review: A Free AI Skill · Amplified Impact',
    description:
      'Upload the builder’s purchase agreement and its addenda before your buyer signs, and see the money at risk step by step, what differs from the REPC, the incentive’s real conditions, and the questions for the builder and an attorney. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Buyer’s Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload the builder’s purchase agreement and its addenda before your buyer signs, and the AI shows you the money at risk step by step, every term the builder wrote differently from a resale contract, the incentive’s real conditions, and the questions to ask the builder and an attorney.',
  outcome: {
    n: '03',
    title: 'Know Before Your Buyer Signs',
    body: 'The money at risk, what’s different, and questions for the builder and an attorney.',
  },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI explains the builder’s contract. It isn’t legal advice: contract changes go to an attorney.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word.
    prompt:
      'My buyers, Casey and Morgan Practiceton, want to sign Placeholder Peak Homes’ contract for Lot 47 in Make-Believe Meadows before the lot hold runs out Friday. They’d rather use their credit union than the builder’s lender. I registered them at the sales center on their first visit, October 24. The sales rep told them the builder ‘always fixes anything the inspector finds.’ We’re in Utah. Can you review the purchase agreement, the incentive addendum and the plat notes and draft an email to them? Today is November 8, 2026.',
    note: [
      'There are three files: the builder’s purchase agreement, an incentive addendum and the plat notes. Every name, address and number in them is made up. The words to say end with “Today is November 8, 2026” so the made-up lot hold hasn’t already run out. ',
    ],
  },

  real: {
    // SKILL.md, section 1: the purchase agreement is required, with every addendum and exhibit; the plat,
    // HOA or district documents are optional; use what the agent says and never ask them to retype what a
    // document holds.
    body: [
      'Start a new chat the same way. Attach the builder’s purchase agreement with every addendum and exhibit, plus any plat notes, HOA or special district documents you have. Then say this.',
    ],
    prompt: 'Here’s the builder’s purchase agreement and every addendum. What should I flag before my buyers sign?',
    // page-notes.md, "What to Upload", item 4 ("Just tell it"), and the shared Check before sending line.
    note: [
      'Add what the sales rep promised, which lender your buyer wants, when you registered your buyer with the builder, the signing or lot hold deadline, and your state. You don’t need to type anything that’s in the documents. Before anything goes out, check every date, dollar amount and page number in the ',
      { strong: 'Check before sending' },
      ' list against your documents.',
    ],
  },

  chatgpt: { paste: chatgptPaste('new-construction-review') },

  sections: [
    {
      // sample.md (the practice run), shortened, in the output's own order and its own words, cut only by
      // whole parts, rows, columns, items and sentences: two of the four flags; the bottom line; the money
      // table's three payments before Closing, with Amount and When due written into the Payment cell,
      // Nonrefundable when and What gets it back in one cell, and Who holds it said once by the quote
      // above it; three of the seventeen key terms (Term and page in one cell, the Flag column dropped,
      // the inspector-insurance sentence cut); the incentive's conditions, the lender line and both RESPA
      // points; two lot notes; two of the twelve questions; three of the seven attorney items (the second
      // cut to its first sentence); the buyer email in full; three rows of Check before sending. Left out:
      // documents reviewed, the REPC comparison, the HOA and tax notes and the key dates.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a review looks like',
      body: 'What the AI wrote from the practice files: a made-up builder’s contract for a lot in Utah, with made-up buyers. They’re the same files you practise on in setup. “PA” is the builder’s purchase agreement.',
      title: 'New Construction Review: Lot 47, Make-Believe Meadows Phase 2',
      note: 'Made-up example. Shortened: a few lines from most parts, and the buyer email in full.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'The lot hold and the incentive both end with the buyers’ signature: the lot is held until 5:00 PM Mountain Time on Friday, November 13, 2026 (PA p. 1), and the incentive applies only to agreements the buyers sign on or before November 13, 2026 (Incentive Addendum 6). That’s 5 days from today.',
            'Referred to but not uploaded: the Affiliated Business Arrangement Disclosure Statement (Incentive Addendum 5), the Homeowner Warranty Guide (PA 8.1, “which Seller will deliver at Closing”), the CC&Rs (PA 10.4 says the buyers acknowledge receiving them), and the geotechnical report named on the plat (Plat Note 3).',
          ],
        },
        { h: 'Bottom line for the agent' },
        {
          p: [
            'Casey and Morgan would pay $10,000 to the builder at signing and $10,337.50 more at the Design Studio within 21 days, $20,337.50 in all (computed), held by the builder, usable for construction, and nonrefundable after a 3-day window except on loan denial (earnest money only) or the builder’s default, with no appraisal protection (PA 2.1 to 2.5, 5.3, 5.5). Using their credit union instead of Sample Summit Home Loans takes the incentive from up to $17,500 to $0, and if the credit union’s written approval isn’t delivered within 30 days of the Contract Date the builder may cancel and keep every deposit (Incentive Addendum 1 to 3; PA 5.1, 5.4). Disputes go to binding arbitration with a jury and class action waiver and a one-year filing limit, implied warranties are waived, and Lot 47 sits in a public infrastructure district, on collapsible soils, along a 20-foot canal easement and a drainage swale (PA 8.2, 9; Plat Notes 2 to 4, 6).',
          ],
        },
        { h: 'Money at risk' },
        {
          p: [
            'All Deposits “are paid directly to Seller. They are not held in escrow or in a trust account, are not segregated from Seller’s other funds, and may be used by Seller for any purpose, including construction of the Home” (PA 2.4, p. 1).',
          ],
        },
        {
          table: {
            caption: 'Money at risk, 3 of 4 rows',
            head: ['Payment', 'Nonrefundable when, and what gets it back', 'Running total at risk'],
            rows: [
              [
                'Earnest money: $10,000, at signing',
                'After the 3-day window (Contract Date + 3 days). Cancel within 3 days: refund less a $500 fee, so $9,500 back (computed). After that: loan denied in writing within 30 days (5.3), or Seller default (14.2)',
                '$10,000',
              ],
              [
                'Option Deposit: $10,337.50 (25% of the $41,350 options), at the Design Studio Selection Appointment, within 21 days after the Contract Date',
                'When paid. Seller default only (2.5); not refunded on loan denial (5.3)',
                '$10,000 + $10,337.50 = $20,337.50',
              ],
              [
                'Change order payments: 100% of each change, plus $350 per change after Design Cut-Off, when the change order is signed',
                'When paid. Seller default only',
                '$20,337.50 + any change orders',
              ],
            ],
          },
        },
        {
          p: [
            'If the buyers don’t deliver written loan approval within 30 days after the Contract Date, “Seller may cancel this Agreement and retain all Deposits” (PA 5.4, p. 2). On Buyer default, the builder keeps all Deposits (14.1).',
          ],
        },
        { h: 'Key terms' },
        {
          table: {
            caption: 'Key terms, 3 of 17 rows',
            head: ['Term', 'What the contract says'],
            rows: [
              [
                'Inspections (p. 2, 6.1 to 6.3)',
                'Two inspections at Buyer’s cost: Pre-Drywall and Final. Seller corrects only what Seller “determines, in its sole discretion,” falls below its standards. “An inspection does not give Buyer a right to cancel this Agreement or to delay Closing.”',
              ],
              [
                'Appraisal (p. 2, 5.5)',
                '“This Agreement is not contingent on an appraisal. If the appraised value is less than the Purchase Price, Buyer shall pay the difference in cash at Closing.”',
              ],
              [
                'Entire agreement (p. 4, 16.4)',
                '“No sales representative or agent has authority to make any promise or representation not contained in this Agreement, and Buyer is not relying on any oral statement.”',
              ],
            ],
          },
        },
        { h: 'Incentive and lender conditions' },
        {
          p: [
            { strong: 'Incentive: up to $17,500' },
            ' at Closing toward closing costs, prepaid items, and/or a permanent or temporary rate buydown, if every condition is met (Addendum 1, 2):',
          ],
        },
        {
          items: [
            '(a) the loan comes from Sample Summit Home Loans, LLC (“Preferred Lender”);',
            '(b) a complete application to Preferred Lender within 5 calendar days after the Contract Date;',
            '(c) no change of lenders after applying;',
            '(d) Closing within 10 calendar days after the Notice of Completion; and',
            '(e) escrow and closing handled by Pretend Peak Title Agency.',
          ],
        },
        {
          p: [
            {
              strong:
                'If any condition isn’t met, including using the credit union, “the Incentive is $0, and the Purchase Price and all other terms of the Agreement are unchanged”',
            },
            ' (Addendum 3). So the difference is the full $17,500.',
          ],
        },
        {
          p: [
            { strong: 'The lender choice belongs to the buyers.' },
            ' This describes the conditions; it doesn’t say which loan is better. The credit union and Sample Summit can each lay out the full cost of their loan, with and without the incentive, side by side, and the lender confirms how much of the $17,500 the loan program allows.',
          ],
        },
        { p: [{ strong: 'RESPA points, as questions (not conclusions):' }] },
        {
          items: [
            'The Addendum says Sample Summit and Pretend Peak Title are “affiliates of Seller” and points to an Affiliated Business Arrangement Disclosure Statement that wasn’t uploaded. Federal rules call for that disclosure, describing the relationship and estimated charges, on a separate page no later than the referral (12 CFR 1024.15(b)(1)). Ask for it.',
            'Addendum 5 says “Buyer is not required to use Preferred Lender or Pretend Peak Title Agency to purchase the Home,” and the Addendum controls over the Agreement. PA 12.2 says closing “will be held at Pretend Peak Title Agency, Seller’s designated closing agent,” with the buyers paying for the lender’s policy. Ask whether, with the credit union, the buyers can choose their own title company for the lender’s policy, and have an attorney read 12.2 next to RESPA Section 9 (12 U.S.C. 2608(a): a seller may not “require directly or indirectly, as a condition to selling the property, that title insurance covering the property be purchased by the buyer from any particular title company”).',
          ],
        },
        { h: 'Lot, HOA and special district' },
        {
          items: [
            'Public infrastructure district (Note 4): all lots are inside Make-Believe Meadows Public Infrastructure District No. 1, which “may levy a property tax to finance and repay public infrastructure, at a rate not to exceed 0.015 per dollar of taxable value.” Utah Code 57-1-49 requires the expected annual cost of the district’s final tax rate to be in a disclosure at or before closing; that’s late for this decision, so ask the builder for it now. No tax is estimated here.',
            'Canal easement (Note 2): Lots 44 through 49 back onto the Example Irrigation Company canal, with a 20-foot maintenance easement where no fence, structure or landscaping that blocks access is allowed. PA 10.4 requires rear yard landscaping within 12 months; ask how that works with the easement.',
          ],
        },
        { h: 'Questions for the builder’s rep' },
        {
          items: [
            'The rep told the buyers the builder “always fixes anything the inspector finds.” PA 6.3 says the builder fixes only what it decides falls below its standards, and PA 16.4 says no sales representative’s promise counts unless it’s in the Agreement. Can that promise go into a signed addendum?',
            'PA 2.4: can the Deposits be held in escrow by the title company instead of paid to the builder?',
          ],
        },
        { h: 'For a real estate attorney' },
        {
          p: [
            'Not legal advice. These are the clauses a real estate attorney should review with Casey and Morgan before they sign.',
          ],
        },
        {
          items: [
            'Deposits paid to the builder, usable for any purpose, nonrefundable after 3 days (PA 2.4, 2.5), and the builder keeping all Deposits if loan approval is late (PA 5.4).',
            'Binding arbitration, jury and class action waivers, split fees, and a one-year filing limit (PA 9.1 to 9.3).',
            'Seller default remedy limited to a refund, with specific performance waived (PA 14.2).',
          ],
        },
        { h: 'Buyer email' },
        {
          email: {
            subject: 'What The Placeholder Peak Contract Says Before Friday',
            body: [
              'Hi Casey and Morgan,',
              'The short version: this is the builder’s own contract, not the standard Utah contract. Most of your deposit money goes straight to the builder and can’t come back after 3 days, and using your credit union means giving up the $17,500 incentive. You need to sign by 5:00 PM Friday, November 13, to keep the lot and the incentive.',
              'What You’d Be Putting At Risk',
              '$10,000 earnest money at signing. You can cancel within 3 days for a refund less a $500 fee. After that it comes back only if your loan is denied in writing within 30 days or the builder defaults.',
              '$10,337.50 at your Design Studio appointment, within 21 days. That one never comes back unless the builder defaults.',
              'Total: $20,337.50, plus any later changes.',
              'If your written loan approval isn’t in within 30 days, the builder can cancel and keep all of it.',
              'The Incentive',
              'The builder pays up to $17,500 toward closing costs or a rate buydown only if you use Sample Summit Home Loans (a builder affiliate), apply within 5 days, close within 10 days of completion and close with Pretend Peak Title. With your credit union, the incentive is $0. Both lenders can show you the full cost side by side, and the choice is yours.',
              'How This Differs From A Resale Contract',
              'No appraisal protection: a low appraisal means you cover the gap in cash.',
              'Inspections are allowed, but the builder decides what to fix, and the sales rep’s promise isn’t in the contract.',
              'Disputes go to binding arbitration, with one year to file.',
              'The lot has a special tax district, collapsible soils and a canal easement out back.',
              'Next Steps',
              '1. Have a real estate attorney review the contract before Friday.',
              '2. Ask your credit union whether it can approve your loan within 30 days.',
              '3. I’m requesting the warranty guide, HOA documents, soils report and the district’s yearly cost.',
              'Before wiring any money, call the title company at a number you look up yourself.',
              '[Agent Name]',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 3 of 26 rows',
            head: ['Item', 'Where to verify'],
            rows: [
              [
                '5:00 PM Mountain Time on November 13, 2026 (Friday, weekday checked)',
                'PA p. 1 (Lot Reservation); Incentive Addendum 6',
              ],
              ['$20,337.50', 'Computed: $10,000 + $10,337.50'],
              ['Rep’s promise to fix anything the inspector finds', 'Agent’s message (not in any document)'],
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
          body: 'Only when they apply: a deadline within 48 hours (in bold), blanks the AI had to leave for you to fill, a contract outside Utah, documents the contract mentions that you didn’t upload, and which REPC the comparison uses.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: the top three risks, each with its dollar amount or date.',
        },
        {
          title: 'Documents reviewed',
          body: 'One line each, with pages and dates, and the build stage: to be built, under construction, or finished (a spec or quick move-in home).',
        },
        {
          title: 'Money at risk',
          body: 'Every payment before closing in one table: earnest money, deposits, option and change order payments. Who holds it, when it turns nonrefundable, what gets it back, and the running total, with the math shown. Where a refund clause is unclear, it says “Not clear” and sends it to the attorney list.',
        },
        {
          title: 'Key terms, as written',
          body: 'Price, completion and delays, change orders, inspections, walkthrough, warranty, arbitration, financing and appraisal, HOA, special districts, agent registration and default, each with its page. “Not addressed” when the contract is silent.',
        },
        {
          title: 'Incentive and lender conditions',
          body: 'When there’s an incentive: the amount, every condition, and the dollar difference from the documents. Then the RESPA points (the federal rules on lenders and title companies a builder owns), as questions. The AI never says which lender to use.',
        },
        {
          title: 'What the form lacks next to the REPC',
          body: 'Section by section, in dollars or days. Outside Utah, a standard list of buyer protections instead. Each one is something to understand or ask about.',
        },
        {
          title: 'Lot, HOA and special district',
          body: 'The district’s name, maximum levy and fees as the documents state them, HOA dues and fees, and plat notes like easements, soils and drainage. The AI never estimates a tax.',
        },
        {
          title: 'Questions for the builder’s rep',
          body: 'Each tied to a page. A promise the rep made that isn’t in the documents becomes a request to put it in writing.',
        },
        {
          title: 'For a real estate attorney',
          body: 'The clauses your buyer may want explained or changed, in plain words. Not legal advice, and no contract language.',
        },
        {
          title: 'Key dates',
          body: 'From the documents only, labeled for strategy: your transactions team keeps the official dates.',
        },
        {
          title: 'A buyer email',
          body: 'Written as you, under 350 words: the bottom line, the money at risk by step, what’s different from a resale contract, the incentive’s conditions and next steps, including attorney review. It doesn’t tell your buyer whether to sign or which lender to use.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, dollar amount, page number and quoted term in the drafts, with where to check it.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You and your buyer decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the reading',
          body: 'Reads every page of the contract, addenda, plat and disclosures. Builds the money table, does the date and dollar math, compares the builder’s form with the REPC, and checks the RESPA points.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The questions for the builder’s rep, the list for a real estate attorney and the buyer email. Nothing reaches your buyer or the builder until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Whether to sign: your buyer decides. Every dollar, option and lender choice. Contract changes go to a real estate attorney, loan terms to the lender, and title, lien and district questions to the title company. Wire and account details: the AI never asks for them or repeats them.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its sources (checked 2026-11-08). No ChatGPT Free limits as
      // numbers, and no claim about the phone app.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns them on',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro.',
          tag: 'Free ChatGPT has upload limits',
        },
        {
          title: 'A computer, once',
          body: 'To set it up: on claude.ai, in the Claude desktop app, or on the ChatGPT website.',
        },
        {
          title: 'The builder’s documents, as PDFs',
          body: 'The purchase agreement with every addendum and exhibit: the incentive, option selections, deposit schedule, lot reservation and any Affiliated Business Arrangement Disclosure. Plat notes, HOA or special district documents help too.',
          tag: 'The purchase agreement is required',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app, like Gmail. This skill needs none. The AI writes the buyer email in the chat for you to copy.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan. The attorney review the AI recommends is your buyer’s own choice and cost.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From".
      kind: 'list',
      heading: 'Where to get the documents',
      items: [
        {
          title: 'The whole purchase agreement',
          body: 'Ask the builder’s sales consultant for the complete document as one PDF, with every addendum and exhibit, before your buyer signs. If the builder sent it for e-signature, still ask for the full PDF.',
        },
        {
          title: 'The plat notes',
          body: 'The recorded plat’s general notes show easements, soils notes and any special district. Ask your title officer for the recorded plat, or get it from the county recorder by the entry number in the contract.',
        },
        {
          title: 'Anything the builder hands over later',
          body: 'Builders often refer to documents they deliver later, like a warranty booklet “at Closing” or the CC&Rs. The AI lists each one that’s missing, so you can ask for it now.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", with curly apostrophes. The plat one asks what the documents say
      // the district can charge, since the AI reports that and never estimates a tax. The Colorado one is
      // written for a new chat, since "Same review, please" needs an earlier one.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach the builder’s documents, and paste. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with the documents attached',
          items: [
            'My buyers want to sign this builder contract by Friday. What should I flag before they do?',
            'What does this builder contract lack compared with the REPC?',
          ],
        },
        {
          label: 'About the incentive or the lot',
          items: [
            'The builder is offering $15,000 if they use the builder’s lender. My buyers have a credit union preapproval. Explain the incentive and what to ask.',
            'Here’s the purchase agreement and the plat. Is there a special district on this lot, and what do the documents say it can charge?',
          ],
        },
        {
          label: 'Follow-ups, in the same chat',
          items: ['The sales rep says they’ll fix anything our inspector finds. Is that in the contract?'],
        },
        {
          label: 'Outside Utah',
          items: ['This builder contract is for a home in Colorado. What should I flag before my buyer signs?'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md, sections 2, 3, 7 and 9; the review's "Not clear" check.
          q: 'Is this legal advice?',
          a: [
            'No. The AI explains what each clause says and where it is. It never says whether a clause is enforceable, and it never writes contract language. It makes a list of clauses for a real estate attorney to review with your buyer before they sign. When a refund clause isn’t clear, like whether option payments come back if the builder defaults, the AI writes “Not clear” and puts it on that list. It doesn’t decide that question itself.',
          ],
        },
        {
          // page-notes.md's FAQ (RESPA Sections 8 and 9, Regulation X 1024.15 and 1024.2), and SKILL.md,
          // section 4.
          q: 'Can the builder make my buyer use its lender?',
          a: [
            'RESPA (the Real Estate Settlement Procedures Act) allows a builder to send buyers to a lender or title company it owns only under conditions. They include a written Affiliated Business Arrangement Disclosure with estimated charges, and no requirement to use that company. An optional, true discount for using it isn’t treated as a requirement. The AI checks your documents against those rules and lists anything that looks like a requirement for the attorney. It never decides whether a rule was broken. It never says which lender to use or whether an incentive is worth it: your buyer’s lenders can lay out the full cost of each option side by side.',
          ],
        },
        {
          // page-notes.md's FAQ; Utah Code 57-1-49 (effective May 6, 2026).
          q: 'What’s a public infrastructure district?',
          a: [
            'In Utah, a special district that can levy a property tax on homes inside it to repay bonds for public infrastructure. It shows up in a plat note or a recorded notice. Since May 6, 2026, the seller must disclose the expected yearly cost at or before closing. That’s late for your buyer’s decision, so the AI tells you to ask for that number before they sign. The AI never estimates the tax.',
          ],
        },
        {
          // SKILL.md, section 1; page-notes.md's FAQ; eval 3 (Colorado, general mode).
          q: 'Which REPC does it compare with, and does it work outside Utah?',
          a: [
            'The Utah REPC dated November 1, 2026, by default. It’s the only form allowed from January 1, 2027. If your brokerage still uses the December 4, 2024 form, say so, and the AI uses that form’s section numbers. Outside Utah, the AI does the same review from your documents. It compares the builder’s form with a standard list of buyer protections, applies the federal rules, and says your state’s rules weren’t checked.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Tested and Not Tested". ChatGPT Free's limits without numbers.
          q: 'Which plan do I need?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. In ChatGPT, a Project on Free, Go, Plus or Pro. Free ChatGPT has upload limits. We tested the skill in Claude, on short made-up builder contracts. We haven’t tried it on real or scanned builder contracts, on Claude’s free plan, or inside ChatGPT yet, so run the practice files first.',
          ],
        },
        {
          // page-notes.md, "What It Won't Do"; SKILL.md, section 9.
          q: 'What won’t the AI do?',
          a: [
            'The AI won’t tell your buyer whether to sign, which lender to use, or whether an incentive is worth it. It won’t estimate a tax, a district levy, a repair or an upgrade cost: every number comes from your documents or is shown as math on them. It won’t say a builder broke RESPA. It doesn’t review inspection reports or keep your official deadline calendar. It describes the home, the lot and the documents, never the people in the community. It never repeats wiring instructions or account numbers, and it never sends anything.',
          ],
        },
      ],
    },
    {
      // page-notes.md, "What It Won't Do": an inspection report on a new build, pre-drywall or final, is
      // Due Diligence Review's.
      kind: 'note',
      body: [
        'Have an inspection report on the new build, pre-drywall or final? ',
        { link: 'Due Diligence Review', href: '/due-diligence-review', sameTab: true },
        ' is the skill that reads inspection reports.',
      ],
    },
  ],

  unlockKey: 'ncr-unlocked',
});
