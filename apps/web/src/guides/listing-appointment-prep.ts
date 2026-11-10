// Every word on /listing-appointment-prep that is its own: the landing page for Listing Appointment Prep,
// a skill (`skills/listing-appointment-prep/`, version 1.0) that preps a listing agent for one listing
// appointment, everything except the price: flags, a bottom line, a one-page appointment plan, questions
// for the seller, a marketing plan built only from the agent's own menu and matched to the home, a
// seller net sheet estimate at the agent's own price scenarios, answers to six non-price objections,
// what to bring and Check before sending. What every skill page says the same way is in `skill-page.ts`
// (D-052).
//
// It is paid (the agent set of the Amplified Skill Library), so the page is drawn with its hero and
// sample and the Skill Library card in place of the sign-up and the setup (D-082, automatic from the
// catalog through `skill`). The free words and the setup below stay for the day it is free.
//
// The words come from the skill itself (SKILL.md and references/prep-guide.md, net-sheet.md,
// objections.md, nar-and-federal-rules.md and utah-listing-appointment.md), its page notes and its graded
// runs (the practice run 12 of 12, eval 1 14 of 14, eval 2 12 of 12, 2026-11-10), so the page promises
// what the skill does. The sample is sample.md, the graded practice run, cut only by whole flags, rows,
// questions, answers and sentences; the bottom line, the plan's agenda, the net sheet's table and the
// two answers it shows are whole.
//
// What the page holds to, as SKILL.md does: drafts only, never sent, never written to a CRM. No list
// price, ever: price scenarios come from the agent, and the CMA work is Pricing Conversation Prep's.
// Compensation is negotiable and set by agreement; nothing calls a rate standard, typical or usual, and
// no rate but the agent's own appears. Nothing invented: no service, stat, testimonial, sale or fee the
// files don't hold. The home is described, never people. No loan or account numbers.
//
// Calls left open, and how the page handles them:
//   - Commission: the page says only what references/nar-and-federal-rules.md quotes from NAR's MLS
//     policy summary (Policy Statement 8.12, effective August 17, 2024: compensation "not set by law"
//     and "fully negotiable," disclosed in the listing agreement; the seller's written approval, with
//     the amount, before any payment to a buyer's broker), checked 2026-11-10. No rate appears on the
//     page except the practice file's own (2.5%) and the practice prompt's 2% example.
//   - Utah: the FAQ names only what utah-listing-appointment.md supports (UAR's revised Exclusive Right
//     to Sell Listing Agreement, the square footage source rule R162-2f-401a(8), the net listing ban
//     R162-2f-401b(1)(h)), and says general mode doesn't check other states.
//   - The net sheet: the page calls it an estimate every time, as the skill titles it, and says the
//     real numbers come from the closing statement and the lender's payoff statement.
//   - Where the files come from: only Follow Up Boss's Notes tab was checked against a help center
//     (Lead Profile Overview, 2026-11-10). County, MLS and title company click paths differ by county
//     and company and were not checked, so the page names no menus for them.
//   - Not tested, and the page says so: real files (notes, county records, MLS printouts, Utah title fee
//     sheets), a presentation as slides, the ChatGPT Project inside ChatGPT, a voice QUICK CARD.
//   - No connectors, so no connector step and no link to Customize > Connectors.
//
// The practice set is five files (questionnaire, county record and MLS history, title fee sheet,
// marketing menu, first-call notes), attached file by file. The sample was run on Tuesday, November 10,
// 2026, so "Thursday" in the practice prompt became November 12; the practice note says the dates move
// with the day it's run. `setupMinutes` is an estimate (page-notes gives none): 10, as the other skill
// pages with a ChatGPT version say for the same shared steps. The note points to Pricing Conversation
// Prep and Appointment Follow-Up, the siblings before and after (SKILL.md's "Not for" line); both are
// already pages.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const LISTING_APPOINTMENT_PREP: Guide = skillPage({
  slug: 'listing-appointment-prep',
  skill: 'listing-appointment-prep',
  title: 'Listing Appointment Prep',

  meta: {
    title: 'Listing Appointment Prep: A Free AI Skill · Amplified Impact',
    description:
      'Attach your first-call notes, the seller’s questionnaire and your listing presentation, and get a one-page appointment plan, the questions to ask, a marketing plan from your own menu, a seller net sheet at your own prices and answers to “what’s your commission.” A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For Listing Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Attach your first-call notes, the seller’s questionnaire and your listing presentation, and the AI hands back a one-page plan, the questions to ask, a marketing plan built for this house, a seller net sheet at your own price scenarios, and plain answers to “why you” and “what’s your commission.”',
  outcome: { n: '03', title: 'Walk In Ready', body: 'A plan, a net sheet and your answers, every line sourced.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. The AI drafts your prep. It never picks your price or sends anything.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page).
    prompt:
      'Listing appointment with Dana and Lee Practiceton on Thursday. I’m Riley Sampleton with Example Peak Realty. Prep me. For the net sheet, use $749,000 and $775,000, and show a buyer’s agent line at 2% as an option.',
    note: [
      'There are five files for a made-up home in Cottonwood Heights: the seller’s questionnaire, the county record and MLS history, a title fee sheet, your marketing menu and your first-call notes. You’re playing the listing agent, Riley. Every name, address and number in them is made up. The AI turns “Thursday” into the next Thursday, so the dates in your plan depend on the day you practise. ',
    ],
  },

  real: {
    // SKILL.md, section 1 (the inputs; price scenarios and commission terms only from the agent).
    body: [
      'Start a new chat the same way, attach what you have (your notes, the seller’s questionnaire, the county record, your listing presentation and your title company’s fee sheet), and say this.',
    ],
    prompt: 'Here’s what I have for my listing appointment. Prep me.',
    note: [
      'Add the two prices you want on the net sheet, and your fee and listing terms if they aren’t in your presentation. The AI never picks a price. Before anything reaches your seller, check every number in the ',
      { strong: 'Check before sending' },
      ' list against your files.',
    ],
  },

  chatgpt: { paste: chatgptPaste('listing-appointment-prep') },

  sections: [
    {
      // sample.md (the practice run, 12 of 12 checks), shortened, in the output's own order and its own
      // words, cut only by whole flags, rows, questions, answers and sentences: five of six flags, the
      // whole bottom line, the plan's when, who and whole agenda, four of twelve questions, six of
      // fourteen marketing rows and both left-out lines, the net sheet's whole table, three of five open
      // items and its footer, two of six answers (whole, without their source lines), four of seven
      // things to bring, and five of twenty-five rows of Check before sending.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI hands back',
      body: 'What the AI wrote from the practice files: a made-up listing appointment with made-up sellers, Dana and Lee Practiceton, for a made-up agent, Riley. It’s the same set of files you practise on in setup.',
      title: 'Listing Appointment Prep: 1739 E Practice Point Cir, Thursday, November 12',
      note: 'Made-up example. Shortened: one flag cut, and a few rows kept from the questions, the marketing plan, the open items, what to bring and Check before sending. The bottom line, the agenda, the net sheet’s table and the two answers shown are whole.',
      blocks: [
        { h: 'Flags' },
        {
          p: [
            { strong: 'Pat is part of the decision but not on title.' },
            ' Lee’s mom, Pat, “wants to be part of it” (questionnaire) and may join by FaceTime (first call). The county record shows Dana and Lee as the owners (joint tenants), so they’re the two who sign. Plan how to include Pat (Questions, Decision Makers).',
          ],
        },
        {
          p: [
            { strong: 'Square footage: three numbers.' },
            ' County record: 3,040 finished (2,140 above grade plus 900 finished in the basement). 2016 MLS: 3,090 total. Questionnaire: “About 3,300.” In Utah, the listing agreement names the source of the square footage you market, so choose it with the sellers. Nothing below states a total.',
          ],
        },
        {
          p: [
            { strong: 'Your menu’s item 16 (targeted Facebook ads) names an audience by who they are.' },
            ' The marketing plan uses paid ads that describe the house only, with no audience by who people are. Reword that item on your menu.',
          ],
        },
        {
          p: [
            { strong: 'Price stays out of this prep.' },
            ' Dana’s “Zillow says 812” and “at least 800” (first call), the assessor’s 2026 value and the 2016 sale are not used. The net sheet uses only your two scenarios. Run pricing-conversation-prep on your CMA before Thursday.',
          ],
        },
        {
          p: [
            { strong: 'Left out on purpose:' },
            ' a loan number from the questionnaire; a comment about who the home suits and a school claim; agent-only remarks from the 2016 MLS history.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Dana and Lee Practiceton, Thursday, November 12 at 6:30 PM at 1739 E Practice Point Cir: Lee starts a job in Boise on February 1 and they want to be moved by the end of January, but Dana is leaning toward waiting for spring. The appointment turns on timing and their bottom line: Dana wrote “We want to know our bottom line before we sign anything,” and the net sheet shows $384,800.00 at $749,000 and $410,046.00 at $775,000 before the open items. First, run pricing-conversation-prep on your CMA, and ask Dana how Pat will join.',
          ],
        },
        { h: 'Appointment plan' },
        {
          p: [
            { strong: 'When and where:' },
            ' Thursday, November 12, 2026, 6:30 to 7:30 PM, at the house, 1739 E Practice Point Cir, Cottonwood Heights. About an hour, as Lee said.',
          ],
        },
        { p: [{ strong: 'Who:' }, ' Dana and Lee Practiceton (both on title). Pat may join by FaceTime.'] },
        {
          table: {
            caption: 'The agenda, whole',
            head: ['Time', 'What', 'Notes'],
            rows: [
              [
                '6:30 to 6:40',
                'Walk the home with them',
                'The 2021 kitchen, the 2023 roof, the basement theater room, the open space trail out back. Note the three repairs they named: dishwasher, garage door opener, basement bath fan',
              ],
              [
                '6:40 to 6:50',
                'Their goals',
                'Boise by February 1, now or spring, the “around 300” Dana wants to net, and who decides (Pat on FaceTime)',
              ],
              ['6:50 to 7:00', 'The marketing plan for this home', 'Below'],
              ['7:00 to 7:10', 'Price: your CMA and pricing talk (pricing-conversation-prep)', ''],
              ['7:10 to 7:20', 'The net sheet and your fee', 'Both scenarios, with and without a buyer’s brokerage line'],
              ['7:20 to 7:30', 'Questions, next steps, paperwork', 'Listing agreement, square footage source'],
            ],
          },
        },
        { h: 'Questions to ask' },
        {
          items: [
            '“Lee starts in Boise February 1. Will you both move by the end of January, or will one of you stay with the house?” (Decides now or spring, and who handles showings.)',
            '“Dana, you mentioned netting around 300 for the down payment. Is that a firm number?” (The net sheet compares to it.)',
            '“How would you like Pat included, and who makes the final call?” (Pat isn’t on title; Dana and Lee sign.)',
            '“Where are things with Morgan? Has anything been signed?” (If they’ve signed, you stop.)',
          ],
        },
        { h: 'Marketing plan for 1739 E Practice Point Cir' },
        {
          table: {
            caption: 'Built only from your marketing menu, 6 of 14 rows',
            head: ['Menu item', 'For this home', 'The fact that earns it'],
            rows: [
              ['3. Matterport 3D tour', 'Yes', 'Three finished levels (county record)'],
              [
                '6. Two open houses in the first two weekends, only with the sellers’ OK',
                'Ask',
                'The dog needs 2 hours’ notice and no showings before 10 AM on weekends (questionnaire)',
              ],
              ['9. Showings through your showing service, approved by text', 'Yes', 'Matches “2 hours notice for the dog” (questionnaire)'],
              [
                '11. Drone photos and video',
                'Yes',
                'Lot of 0.24 acres (county record) that backs the Example Creek open space trail (questionnaire; the 2016 MLS remarks say it backs the open space trail)',
              ],
              [
                '13. Pre-listing inspection, seller pays the inspector ($450 to $600 with the inspectors you use)',
                'Offer it',
                'They named three repairs and want to know their bottom line before signing (questionnaire)',
              ],
              [
                '16. Paid Facebook ads',
                'Yes, as ads about the house: the trail out back, the 2021 kitchen, the theater room. No audience by who people are',
                'See the flag',
              ],
            ],
          },
        },
        {
          p: [
            { strong: 'Left out, and why:' },
            ' 12. Twilight photos: your menu says homes with a view or strong outdoor lighting, and the inputs show neither. 14. HOA document packet: no HOA (questionnaire).',
          ],
        },
        { h: 'Seller Net Sheet: Estimate, Not a Closing Statement' },
        {
          table: {
            caption: 'The net sheet’s table, whole',
            head: ['Line', '$749,000', '$775,000', 'Source'],
            rows: [
              ['Sale price (Riley’s scenarios, not a recommended price)', '$749,000.00', '$775,000.00', 'Riley’s two scenarios'],
              [
                'Listing brokerage fee: 2.5% of the sale price, to Example Peak Realty at closing',
                '$18,725.00',
                '$19,375.00',
                'Riley’s terms (marketing menu, My Fee and Terms)',
              ],
              [
                'Owner’s policy, standard coverage',
                '$2,120.00',
                '$2,224.00',
                'Sample Summit Title rate card: $700,001 to $750,000, and $750,001 to $800,000',
              ],
              ['Escrow and settlement fee, seller’s portion', '$450.00', '$450.00', 'Sample Summit Title fee sheet'],
              ['Deed preparation', '$125.00', '$125.00', 'Sample Summit Title fee sheet'],
              [
                'Lien release tracking, 2 at $65.00',
                '$130.00',
                '$130.00',
                'Fee sheet, per loan or line of credit paid off (the mortgage and the HELOC)',
              ],
              ['Recording, release documents, 2 at $40.00', '$80.00', '$80.00', 'Fee sheet, per release document'],
              ['Payoff delivery, 2 at $35.00', '$70.00', '$70.00', 'Fee sheet, per payoff'],
              [
                'Mortgage payoff, Example Home Loans (estimate)',
                '$318,000.00',
                '$318,000.00',
                'Dana’s estimate (questionnaire and first call)',
              ],
              [
                'HELOC payoff, Sample Valley Credit Union (estimate)',
                '$24,500.00',
                '$24,500.00',
                'Dana’s estimate (questionnaire and first call)',
              ],
              ['Estimated net before the open items', '$384,800.00', '$410,046.00', 'Arithmetic below'],
              [
                'Compensation to a buyer’s brokerage at 2%: only if you choose to offer it (your decision)',
                '$14,980.00',
                '$15,500.00',
                'Riley’s example figure, to show the choice',
              ],
              ['Estimated net if you offer it', '$369,820.00', '$394,546.00', 'Arithmetic below'],
            ],
          },
        },
        { p: [{ strong: 'Open items, not in the totals' }] },
        {
          items: [
            '[Property tax proration: the title company calculates it for the closing date. The county record shows 2026 taxes of $4,318.62, due 11/30/2026.]',
            '[Repairs: the dishwasher, garage door opener and basement bath fan, if you fix them; no amounts given]',
            '[Seller concessions or credits: none set]',
          ],
        },
        {
          p: [
            { strong: 'Your goal:' },
            ' Dana mentioned wanting to net around $300,000 for the down payment in Boise. Before the open items, each estimate is above that, with or without the buyer’s brokerage line.',
          ],
        },
        {
          p: [
            'This is an estimate, not a closing statement. Your actual costs and proceeds come from the title or escrow company’s closing statement. Payoffs come from your lender’s payoff statement. Open items above are not included. Questions about taxes on the sale go to a CPA.',
          ],
        },
        { h: 'Objection answers' },
        {
          p: [
            { strong: '“What’s your commission?”' },
            ' “My fee is 2.5% of the sale price, paid to Example Peak Realty at closing. It isn’t set by law, and it’s negotiable, like every fee; we agree on it in the listing agreement. Paying a buyer’s agent is a separate choice, and it’s yours: you can offer something or nothing, and if you offer something, you approve the amount in writing before it’s offered. The net sheet shows it both ways. You mentioned a number you’d heard: there isn’t a set rate. Every fee is agreed between the agent and the seller.”',
          ],
        },
        {
          p: [
            { strong: '“We’ll wait for spring.”' },
            ' “That’s your call, and either can work. Here’s what I’d weigh: Lee starts in Boise on February 1, you want to be moved by the end of January, and Lee would rather not pay for two places. If we wait for spring, you’d likely still own this house after you’ve moved. If you’d rather wait, we can still get it ready now: the staging consult, the repairs and a photo date, so it’s ready on the day you choose.”',
          ],
        },
        { h: 'What to bring' },
        {
          items: [
            'The Exclusive Right to Sell Listing Agreement and Agency Disclosure, the current version from Example Peak Realty’s forms library, with the square footage source to fill in',
            'The net sheet, printed at $749,000 and $775,000, and Sample Summit Title’s fee sheet (effective October 1, 2026)',
            'Your CMA and pricing summary from pricing-conversation-prep',
            'No lead-based paint disclosure: built 1994 (county record)',
          ],
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 5 of 25 rows',
            head: ['Item', 'Where it’s from'],
            rows: [
              [
                'Thursday, November 12, 2026, 6:30 PM',
                'First call: “APPT: Thursday 6:30 PM at the house,” resolved from Tuesday, November 10, 2026',
              ],
              ['$749,000 and $775,000', 'Your message (scenarios, not recommended prices)'],
              ['$2,120.00; $2,224.00', 'Sample Summit Title rate card bands'],
              [
                '$318,000 and $24,500',
                'Dana: questionnaire (“$318,000,” “about $24,500”) and first call (“about $318K,” “around $24.5K”)',
              ],
              ['11 listings sold; 19 days; 99.1%; January 1 to October 31, 2026', 'Menu, My Numbers'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order", items 1 to 9, in its order; page-notes.md, "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags, first',
          body: 'Only when they apply: missing files and placeholders, no prices or fee given, files that disagree (square footage from each source), an owner on title nobody mentioned or a decision maker who isn’t on title, a property outside Utah, and a line saying something was left out on purpose.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: who, when and why they’re moving, the one thing that will decide the appointment, and the first thing to do.',
        },
        {
          title: 'A one-page appointment plan',
          body: 'When, where and who, the goal, an agenda with clock times that fit the time they gave you, the one thing to learn, and the close. The price block points to your CMA.',
        },
        {
          title: 'Questions to ask',
          body: 'Eight to twelve, only where your files leave a gap: motivation, timeline, what they need, who decides, the home, and other options. Each says why it’s asked.',
        },
        {
          title: 'A marketing plan for this house',
          body: 'Only what your own menu offers, item by item, with the fact about the house that earns each one, and the items left out and why. Nothing you don’t offer.',
        },
        {
          title: 'A seller net sheet, as an estimate',
          body: 'At the prices you give, with a source on every line: your fee as you state it, title charges from the fee sheet, payoffs as the seller said them, and every open item as a placeholder. The math is shown, and the top says it’s an estimate, not a closing statement.',
        },
        {
          title: 'Answers to six objections',
          body: 'Why you, we’ll wait for spring, my friend is an agent, we’ll sell it ourselves first, contract length, and what’s your commission. In your words, from your files, with a placeholder where they don’t say.',
        },
        {
          title: 'What to bring',
          body: 'The listing agreement, the net sheet and fee sheet, your CMA, your menu and numbers, and the lead-based paint disclosure when the home was built before 1978.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, dollar amount, percentage, stat and quote in the prep, with the file and line it came from, plus every open placeholder.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You decide and walk in.',
      items: [
        {
          label: 'Run',
          title: 'The AI reads every file',
          body: 'Lists each fact with its source, finds files that disagree and owners on title, turns “Thursday” into a date, matches your menu to the house, and does the net sheet math in code.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The plan, the questions, the marketing plan, the net sheet and the answers. Nothing reaches your seller until you check it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every price and scenario, your fee and how you negotiate it, the listing agreement, what the seller offers a buyer’s agent (their decision), every fair housing call, and the real payoff, which comes from the lender through title. The AI never asks for, repeats or handles loan or account numbers.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need" and "Install". No ChatGPT Free upload limits as numbers, no prices.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on; the net sheet math runs as code. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns on skills and code execution',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free, Go, Plus and Pro.',
          tag: 'Free ChatGPT has upload limits. Pasting works too.',
        },
        {
          title: 'A computer, once',
          body: 'Add the skill on claude.ai or in the Claude desktop app, or set up the Project on the ChatGPT website. After that, Claude uses the skill on your phone too.',
        },
        {
          title: 'What you know about the seller',
          body: 'Your first-call notes, the seller’s questionnaire, the county record and your listing presentation. Attach whatever you have. Anything missing becomes a marked placeholder.',
          tag: '“Where to get your files” shows how',
        },
        {
          title: 'A fee sheet, if you can',
          body: 'Ask your title or escrow officer for a seller fee sheet or rate card. Without one, the net sheet leaves title charges as a placeholder rather than guess.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond the plans you already have. No connectors.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where Each File Comes From". Follow Up Boss's Notes tab is its
      // help center's (Lead Profile Overview, checked 2026-11-10); county, MLS and title paths weren't
      // checked, so no menus are named for them. Attaching in Claude is page-notes.md's.
      kind: 'list',
      heading: 'Where to get your files',
      items: [
        {
          title: 'Your first-call notes',
          body: 'In Follow Up Boss, open the contact’s profile and click the Notes tab on the timeline, which shows every note on the profile. Copy the note and paste it into the chat. Your own typed notes work the same way.',
        },
        {
          title: 'The seller’s questionnaire',
          body: 'Your own form, as the seller sent it back: a PDF, a scan or an email reply.',
        },
        {
          title: 'The county record',
          body: 'Your county assessor’s or recorder’s page for the address, printed or saved as a PDF. It shows who is on title, which the AI checks against who you’re meeting.',
        },
        {
          title: 'The MLS history',
          body: 'The property’s listing history from your MLS, printed to PDF. The AI reads it as the home was then, and keeps its agent-only remarks out.',
        },
        {
          title: 'Your marketing menu or listing presentation',
          body: 'Your own document: a PDF, slides or text. It’s the only place the AI takes services, vendors, numbers, testimonials and your fee from.',
        },
        {
          title: 'A title fee sheet',
          body: 'From your title or escrow officer, for your county. The AI reads each price’s line from its rate table.',
        },
        {
          title: 'Attaching a file in Claude',
          body: 'Click the + at the lower left of the chat box, then Add files or photos. Pick the files and click Open. Or drag them into the chat.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your files, then paste these words with them. Change the names and prices to yours. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'The day before, with your files attached',
          items: [
            'Listing appointment Thursday with the Practicetons. Here’s my FUB note, their questionnaire and my listing presentation. Prep me. Net sheet at $749,000 and $775,000.',
            'I have a listing appointment tomorrow at 5:30. Everything’s attached. My fee is 2.75%, six-month listing.',
          ],
        },
        {
          label: 'Just one piece',
          items: ['Just the net sheet, please, at these two prices.'],
        },
        {
          label: 'The hard questions',
          items: [
            'They’re going to ask what my commission is. Help me answer it. My fee is 2.5%.',
            'They want to wait for spring, and her cousin is an agent. Help me with both.',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "What It Will Not Do"; SKILL.md, Guardrails.
          q: 'What won’t it do?',
          a: [
            'The AI won’t pick, suggest or react to a list price, or use an online estimate, the seller’s number, the assessor’s value or the last sale on the net sheet. It won’t call any commission standard or typical, or state anyone’s rate but yours. It won’t invent a service, number, testimonial, sale or fee. It won’t criticize another agent, a brokerage or a seller’s plan to sell on their own. It leaves out loan and account numbers, remarks about who lives in a neighborhood, and claims about schools or safety. It doesn’t estimate taxes on the sale. It never sends anything or writes to your CRM.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, step 1 and Guardrails ("Not pricing").
          q: 'Why won’t it suggest a list price?',
          a: [
            'Price belongs to the CMA and to you. ',
            { link: 'Pricing Conversation Prep', href: '/pricing-conversation-prep', sameTab: true },
            ' builds the range and the talk track from your comps. This skill uses only the prices you give it, so nothing on the net sheet reads as a promise of a price.',
          ],
        },
        {
          // page-notes.md, FAQ; references/nar-and-federal-rules.md (NAR Policy Statement 8.12).
          q: 'Why won’t it tell me what a normal commission is?',
          a: [
            'There isn’t one. Since August 17, 2024, NAR’s MLS policy has required listing agreements to say clearly that broker compensation isn’t set by law and is fully negotiable. Any payment to a buyer’s agent needs the seller’s written approval, with the amount, before it’s offered. So the AI explains your fee as you state it, makes the buyer’s agent question the seller’s choice, and leaves every other number out.',
          ],
        },
        {
          // page-notes.md, FAQ; references/net-sheet.md (the title and footer).
          q: 'Can I give the net sheet to my seller?',
          a: [
            'Yes, once you’ve checked it. Every line says where it came from, it’s titled an estimate, not a closing statement, and it says the real numbers come from the title company’s closing statement and the lender’s payoff statement. Payoffs are shown as the seller said them, never with a loan number.',
          ],
        },
        {
          // page-notes.md, FAQ; eval 2 (no menu, no fee sheet).
          q: 'What if I don’t have a marketing menu or a fee sheet?',
          a: [
            'It still works. The marketing plan holds only the services you named in your notes or your message, and the net sheet shows your fee, the payoff and a placeholder for everything else, left out of the totals. Nothing is filled in from general knowledge.',
          ],
        },
        {
          // page-notes.md, FAQ; references/utah-listing-appointment.md and nar-and-federal-rules.md.
          q: 'Does it work outside Utah?',
          a: [
            'Yes. Outside Utah, NAR’s policy, the REALTOR Code of Ethics and federal fair housing still apply, and the AI tells you it didn’t check your state’s rules. For a Utah home, it adds the Utah notes: the Utah Association of REALTORS listing agreement, the rule that the listing agreement names the source of the square footage you market, and Utah’s ban on net listings. For a home built before 1978, it adds the federal lead-based paint disclosure anywhere.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Tested and Not Tested".
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. In ChatGPT, a Project on Free, Go, Plus or Pro. We tested the skill in Claude on three made-up appointments: two in Utah and one in Idaho, one with no menu and no fee sheet. We haven’t tried it inside ChatGPT, with a presentation as slides, or on real notes, county records and fee sheets yet, so run the practice files first.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Pricing the home first? ',
        { link: 'Pricing Conversation Prep', href: '/pricing-conversation-prep', sameTab: true },
        ' turns your CMA into a price you can defend. After the appointment, ',
        { link: 'Appointment Follow-Up', href: '/appointment-follow-up', sameTab: true },
        ' writes the recap email and the Follow Up Boss note.',
      ],
    },
  ],

  unlockKey: 'lap-unlocked',
});
