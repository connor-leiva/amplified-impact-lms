// Every word on /counter-explainer that is its own: the landing page for Counter Explainer, a free skill
// (`skills/counter-explainer/`, version 1.0) that reads one counteroffer or addendum against the
// contract and every earlier counter, and hands back what changed, the deal as it would stand, the
// response deadline, the options, a client email and the requested changes in plain words for the
// state-approved form. What every skill page says the same way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and drafting-guide.md), its page notes, its graded
// runs (three evals and the practice run, all passed, plus a reviewer's reruns of eval 2 and the
// practice) and the build and review reports, so the page promises what the skill does. Either side:
// buyer's and listing agents. It describes and summarizes; it never writes contract clauses, and
// anything beyond a standard term goes to the broker. The note points to Offer Comparison for weighing
// several offers.
//
// What the page leaves out or hedges, and why:
//   - Photos and scans: page-notes.md's upload list says they work, but its "Not tested" list names
//     scanned, photographed and handwritten counters. So the page says PDFs were tested and photos were
//     not.
//   - Gmail or Outlook drafts: optional, untested, and Claude's own pages disagree on whether the Gmail
//     connector can draft. So "What to say" offers no draft prompt, and the FAQ says to copy the email
//     from the chat if no draft appears.
//   - ChatGPT's limits (3 uploads a day, about 12 pages a message on Free) are page-notes.md's, from
//     OpenAI's pricing page and help-center search excerpts, as /due-diligence-review states them. The
//     ChatGPT version was not run inside ChatGPT, and the FAQ says so.
//
// The REPC changed on November 1, 2026 (the old form can't be used from January 1, 2027): the skill
// reads the version from the contract's footer, so the page says it works with both Utah forms, and in
// other states from the uploaded documents alone.
//
// The practice set is three PDFs and a README, attached file by file. `setupMinutes` is an estimate
// (page-notes gives none): 10, as /due-diligence-review says for the same shared setup steps.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const COUNTER_EXPLAINER: Guide = skillPage({
  slug: 'counter-explainer',
  title: 'Counter Explainer',

  meta: {
    title: 'Counter Explainer: A Free AI Skill · Amplified Impact',
    description:
      'Upload the contract and the new counter or addendum, and see exactly what changed, the deal as it would stand, the response deadline and a message for your client. A free skill for Claude and ChatGPT.',
  },

  // Non-breaking spaces keep the audience on one line: at 390 pixels the line wraps after the dot,
  // never with "Agents" alone.
  eyebrow: 'Free AI Skill · For\u00a0Buyer’s\u00a0and\u00a0Listing\u00a0Agents',
  // page-notes.md, "One-Line Promise", with the actor named.
  lede: 'Upload the contract and the new counter or addendum, and the AI shows you exactly what changed, including the line nobody mentioned, before your client signs.',
  outcome: { n: '03', title: 'Know What Changed', body: 'Every change, the deadline, and a message for your client.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one explains the changes in plain words and never writes contract language.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (curly apostrophes, as on every page). The
    // "treat today as" line keeps the made-up response deadline from having already passed.
    prompt:
      'I represent the buyers on 1428 Sample Ridge Lane. The listing agent sent Addendum No. 2 and says it’s just a home warranty and the washer and dryer. What does it change, and can you draft a message to my buyers? This is a practice run, so treat today as November 9, 2026.',
    note: [
      'Attach only the three PDFs. The README is for you. Every name, address and number in the files is made up. The words to say end with “treat today as November 9, 2026” so the made-up deadline hasn’t already passed. ',
    ],
  },

  real: {
    // SKILL.md, section 1: the new document is required; the contract and every earlier counter give
    // the full picture; the side comes from "my buyers" or "my sellers".
    body: [
      'Start a new chat the same way, attach the new counter or addendum, the purchase contract and every earlier counter or addendum, and say this.',
    ],
    prompt: 'Here’s the contract and every counter and addendum so far. What does the newest one change, and can you draft a message to my buyers?',
    note: [
      'Listing agent? Change “my buyers” to “my sellers” before you send it. You don’t need to type anything from the documents. Before anything goes out, check every date, dollar amount and section number in the ',
      { strong: 'Check before sending' },
      ' list against your documents.',
    ],
  },

  chatgpt: { paste: chatgptPaste('counter-explainer') },

  sections: [
    {
      // sample.md (the practice run), shortened, in the output's own order and its own words: four of
      // the five flags, the bottom line, the chain's note, the change table in three columns so it fits
      // a phone (no Source column; each term's section, and "Stated up front? No", moved into its
      // name, and the warranty cell cut to its cost and who pays), two lines of the math, the options, the client email
      // in full, three of the five requested changes with the broker line, and three rows of Check
      // before sending.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What the AI caught in a made-up addendum',
      body: 'What the AI wrote from the practice files: a made-up home in Utah, made-up buyers and a made-up seller. The listing agent said Addendum No. 2 was just a home warranty and the washer and dryer. They’re the same files you practise on in setup.',
      title: 'Counter Explainer: 1428 Sample Ridge Lane, Addendum No. 2',
      note: 'Made-up example. Shortened: a few lines from most parts, and the client email in full.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'Practice run: these are made-up practice files. Days are counted from November 9, 2026, the date you gave for the practice.',
            'A change not stated up front: item 4 of Addendum No. 2 moves the Settlement Deadline (Section 24(d)) from December 11 to December 4, 2026. The addendum’s heading (“Home warranty and laundry appliances.”) and the listing agent’s description leave it out.',
            'Response due within 48 hours: the buyers must sign by 5:00 PM Mountain Time on Tuesday, November 10, 2026, or Addendum No. 2 lapses.',
            'Form check: the REPC footer reads “EFFECTIVE DECEMBER 4, 2024,” so section numbers follow that form.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Addendum No. 2 adds a seller-paid home warranty (up to $600) and the washer and dryer, but item 4 also moves the Settlement Deadline in Section 24(d) from December 11 to December 4, 2026, which neither the heading nor the listing agent’s description mentions. That puts Settlement on the same day as the Financing & Appraisal Deadline, so your buyers’ lender would have to be ready to close on the last day of their appraisal and loan protections. The buyers have until 5:00 PM Mountain Time Tuesday, November 10, 2026 (tomorrow) to sign it; if they don’t, the contract stays as it is.',
          ],
        },
        { h: 'The chain' },
        {
          p: [
            'A contract already exists: the REPC as changed by Addendum No. 1. Addendum No. 2 proposes changes to it.',
          ],
        },
        { h: 'What changed' },
        {
          table: {
            caption: 'Every term Addendum No. 2 touches',
            head: ['Term', 'Contract now', 'If signed'],
            rows: [
              ['Settlement Deadline (24(d)). Not stated up front.', 'December 11, 2026', 'December 4, 2026 (7 days earlier)'],
              [
                'Home Warranty Plan (10.1)',
                'WILL NOT be included',
                'WILL be included; cost not to exceed $600, paid by Seller at Settlement',
              ],
              ['Washer and dryer (1.2)', 'Washers and dryers boxes unchecked', 'Included, conveyed by bill of sale'],
              [
                'Final walk-through scheduling (11). Not stated up front (minor).',
                '“upon reasonable notice and at a reasonable time”',
                'Scheduled through the listing agent with at least 24 hours’ notice',
              ],
            ],
          },
        },
        { p: ['Item 4 cites only “the date in Section 24(d).” In this REPC, 24(d) is the Settlement Deadline.'] },
        { h: 'The math' },
        {
          items: [
            'The Financing & Appraisal Deadline (Section 24(c)) is also Friday, December 4. Settlement and the end of the appraisal and loan protections would fall on the same day.',
            'Price lines don’t match: Section 2.1 lines total $5,000 + $0 + $440,100 + $0 + $43,900 = $489,000, but Addendum No. 1 set the price at $495,000, a $6,000 difference. Section 2.1 lets the buyers and lender adjust the loan (c) and cash (e) lines. Ask the lender to update them.',
          ],
        },
        { h: 'Options and tradeoffs' },
        {
          items: [
            'Sign it as written. The buyers get the warranty and the washer and dryer, and closing moves to December 4, the same day their appraisal and loan protections end.',
            'Counter specific terms (Addendum No. 3, COUNTEROFFER box). Accept the warranty, the washer and dryer and the walk-through notice, and keep Settlement at December 11 or propose another date. The seller can accept, counter or let it lapse. Until the seller accepts, the contract stays as it is.',
            'Let it lapse or reject it. Nothing changes: Settlement stays December 11, with no warranty and no washer and dryer. The contract’s deadlines keep running.',
          ],
        },
        { p: ['[Your recommendation]'] },
        { h: 'Client message' },
        {
          email: {
            subject: 'Addendum No. 2 On 1428 Sample Ridge Lane: Closing Would Move Up A Week',
            body: [
              'Hi Avery and Jordan,',
              'The seller sent an addendum that adds a home warranty and the washer and dryer, and it also moves closing up a week, from December 11 to December 4. We need your answer by 5:00 PM Tuesday, November 10.',
              'What changed',
              'Closing date: December 4 instead of December 11. This wasn’t in the summary I received; it’s item 4 of the addendum.',
              'Home warranty: the seller would pay for a one-year home warranty you choose, up to $600.',
              'Washer and dryer: both would stay with the home.',
              'Final walk-through: scheduled through the listing agent with at least 24 hours’ notice.',
              'What it means for you',
              'December 4 is also the last day you can back out if the appraisal comes in low or the loan terms don’t work for you. Closing that same day leaves no cushion if anything with the loan runs late. [I’ll check with your lender that December 4 works.] Your inspection deadline doesn’t change: it’s still November 17.',
              'Your options',
              '1. Sign it as written: you get the warranty, washer and dryer, and closing moves to December 4.',
              '2. Counter: keep the warranty and appliances, and keep closing on December 11. The seller can accept, counter, or say no.',
              '3. Let it expire: nothing changes. Closing stays December 11, without the warranty or appliances.',
              '[Your recommendation]',
              'Next step: let me know by [time] today so I can get your answer to the seller’s agent before 5:00 PM tomorrow.',
              '[Agent Name]',
            ],
          },
        },
        { h: 'Requested changes for the form' },
        {
          p: [
            'Only if the buyers counter. Enter these on the Blank Addendum as Addendum No. 3 with the COUNTEROFFER box checked, never by marking up the REPC.',
          ],
        },
        {
          items: [
            'Home Warranty Plan (Section 10.1): WILL be included; Buyer orders it from a company Buyer selects; cost not to exceed $600, paid by Seller at Settlement (same as Addendum No. 2, item 1).',
            'Settlement Deadline (Section 24(d)): stays December 11, 2026, or [date] if the buyers choose another.',
            'Who accepts and by when: Seller, by [time] Mountain Time on [date].',
          ],
        },
        {
          p: [
            { strong: 'Take to your broker:' },
            ' nothing here needs new wording. If the buyers want closing tied to the lender’s readiness instead of a date, that needs new wording; ask your broker.',
          ],
        },
        { h: 'Check before sending' },
        {
          table: {
            caption: 'Check before sending, 3 of 11 rows',
            head: ['Item in the drafts', 'Check against'],
            rows: [
              ['December 4, new date', 'Addendum No. 2, page 1, item 4'],
              ['5:00 PM Tuesday, November 10, response deadline', 'Addendum No. 2, page 1, acceptance line'],
              ['“up a week”', 'Computed, December 4 to December 11'],
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
          body: 'Only when they apply: a practice run, a missing document, which form or state the AI read, blanks to fill, a change not stated up front, and a deadline that has passed or is within 48 hours.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: what the document changes, the change that matters most, and the response deadline with the time left.',
        },
        {
          title: 'The chain',
          body: 'One line for each document, in order, with who signed it and when, and its status: accepted, countered, rejected, lapsed or pending.',
        },
        {
          title: 'What changed',
          body: 'A before-and-after table of every term, with its section and where it came from. A change the heading or the other agent’s note left out is marked “Not stated up front.”',
        },
        {
          title: 'The deal as it would stand',
          body: 'The price and how it’s paid, seller money, earnest money and when it goes at risk, conditions, every deadline, possession, and what’s included or excluded. With the math shown, like price lines that no longer add up to the price.',
        },
        {
          title: 'Conflicts, gaps and questions',
          body: 'Where two documents disagree, both sides quoted, and who settles it. Missing pages or signatures. A question for the other agent for each one.',
        },
        {
          title: 'What it means for your client',
          body: 'Money, time, risk and logistics, in one or two plain sentences per change, from your client’s side.',
        },
        {
          title: 'Response deadline and timeline',
          body: 'Who must respond, the exact time and date, and the time left. Labeled for strategy: your transactions team keeps the official dates.',
        },
        {
          title: 'Options and tradeoffs',
          body: 'Accept as written, counter specific terms, or let it lapse, with what happens to the deal under each. The AI leaves a [Your recommendation] line for you.',
        },
        {
          title: 'A client email',
          body: 'Written as you, under 300 words, with the decision and the deadline first. A change nobody mentioned goes at the top.',
        },
        {
          title: 'Requested changes for the form',
          body: 'Each change in plain words: the term, its section, the current value and the new one, with [amount] or [date] where your client hasn’t decided. You enter them on the state-approved form. Anything that needs new wording goes on a “Take to your broker” list.',
        },
        {
          title: 'Check before sending',
          body: 'Every date, time, dollar amount, section number and quote in the email and the requested changes, with the document, page and item to check it against.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own, and page-notes.md's. Texting: drafting-guide.md drafts a text only
      // when the agent asks, and whether the client agreed to texts is the agent's call.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI reads and drafts. You and your client decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the reading',
          body: 'Reads every page of every document, lines up every term across every version, does the date and dollar math, and checks the form version and the deadlines.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The client email, the questions for the other agent, and the requested changes in plain words. Nothing reaches your client or the other side until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Whether to accept, counter or let it lapse: your client decides, with your advice. Every price and dollar amount. The wording on the form. Anything beyond a standard term goes to your broker. If you ask the AI for a text, whether your client has agreed to get texts. Wire and account details: the AI never asks for them or repeats them.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and its "Tested and Not Tested" (PDFs only; no photos, scans or
      // Gmail or Outlook drafts tested).
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on. Claude’s help center lists skills on every plan, Free included, but we haven’t tested Free.',
          tag: 'Team or Enterprise: an owner turns them on',
        },
        {
          title: 'Or a ChatGPT Project',
          body: 'A Project is a folder in ChatGPT that keeps instructions and files together. Projects work on Free ChatGPT, with upload limits.',
          tag: 'Go or Plus fit long chains better',
        },
        {
          title: 'A computer, once',
          body: 'To set it up on claude.ai or in the Claude desktop app, or on the ChatGPT website. Once added, the Claude skill works in Claude’s phone app too.',
        },
        {
          title: 'Your documents',
          body: 'The new counter or addendum, plus the purchase contract and every earlier counter or addendum, as PDFs from your e-signature or transaction system. Claude takes up to 20 files in a chat. We haven’t tested photos or scans yet.',
          tag: 'The new counter or addendum is required',
        },
        {
          title: 'No connector needed',
          body: 'A connector links the AI to another app, like Gmail. This skill needs none. The AI writes the client email in the chat for you to copy.',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan, and no other accounts to make.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", word for word with curly apostrophes, and "Addendum 2" as it is
      // there.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat (in ChatGPT, inside the Project), attach your documents, and paste. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with your documents attached',
          items: [
            'The listing agent sent Addendum 2. What does it change, and can you draft a note to my buyers?',
            'Buyer countered back. Explain it to my sellers and give me their options. They have to answer by tomorrow night.',
          ],
        },
        {
          label: 'To check where the deal stands',
          items: [
            'What’s the deal now, with all three counters? Title is asking for the seller credit and the closing date.',
            'Is there anything in this extension addendum besides the new date?',
          ],
        },
        {
          label: 'Follow-ups, in the same chat',
          items: ['Turn my sellers’ answer into the changes I need to put on the counteroffer form.'],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md's FAQ; the practice run and eval 2 (a change made by section number only).
          q: 'Will the AI catch a change the other agent didn’t mention?',
          a: [
            'That’s what it’s built for. The AI reads every numbered item and looks up section numbers in your own form, so “the date in Section 24(d)” becomes “the Settlement Deadline.” Any change that wasn’t stated up front goes at the top. Still read the documents yourself before your client signs.',
          ],
        },
        {
          // SKILL.md, sections 6 and 7; drafting-guide.md, "Take to Your Broker"; page-notes.md's FAQ.
          q: 'Can the AI write the counteroffer for me?',
          a: [
            'No. The AI gives you each change in plain words, with its section number, for you to enter on the state-approved addendum form. It never writes clause language. Utah licensees fill out approved forms, and anything beyond changing a standard term, like a rent-back or an appraisal gap, goes to your broker.',
          ],
        },
        {
          // SKILL.md, section 2; page-notes.md's FAQ (UAR and the Division's forms page, checked
          // 2026-11-08); eval 3 (Idaho, general mode).
          q: 'Which contracts does it work with?',
          a: [
            'Both Utah REPCs in use now. The AI reads the contract’s footer, “EFFECTIVE DECEMBER 4, 2024” or “EFFECTIVE NOVEMBER 1, 2026,” and uses that form’s section numbers. The Utah Association of REALTORS says the old form can’t be used starting January 1, 2027. Ask your broker which version your brokerage uses. In another state, the AI takes every term, deadline and rule from your own documents and says it didn’t check your state’s rules.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "Not tested". ChatGPT's limits as /due-diligence-review
          // states them. The practice set alone is 3 PDFs, plus 4 files for the Project.
          q: 'Which plan do I need?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account shows no way to add a skill, that’s why. In ChatGPT, Projects work on Free, but Free allows 3 file uploads a day and about 12 pages of text per message. So on Free, setup and practice can take more than one day, and a contract plus several addenda may not fit in one message. Go and Plus allow about 40 pages per message. We tested the skill in Claude, not yet inside ChatGPT, so try the practice files first.',
          ],
        },
        {
          // page-notes.md, "What You Need": Claude's pages disagree on Gmail drafting; Microsoft 365 work
          // accounts need an admin; neither was tested.
          q: 'Can it save the client email in Gmail or Outlook?',
          a: [
            'Maybe, but you don’t need it. The AI writes the email in the chat for you to copy. With Claude’s Gmail or Microsoft 365 connector on, you can ask for a draft, but Claude’s own pages disagree on whether the Gmail connector can make drafts, and a work Microsoft 365 account needs an admin to allow it. We haven’t tested either. If no draft appears, copy the email from the chat. The AI never sends anything.',
          ],
        },
        {
          // page-notes.md, "What It Won't Do"; SKILL.md, section 7.
          q: 'What won’t it do?',
          a: [
            'The AI won’t recommend a price, an amount or an option. It won’t decide whether a counter is valid, or pick a winner when two documents conflict: it quotes both and names who settles it. It won’t estimate net proceeds, cash to close, commissions or loan limits. It doesn’t keep your official deadline calendar. It describes terms, never people. It leaves account, loan and Social Security numbers out of what it writes, and never asks for or repeats wire instructions. The skill isn’t built for repair requests, inspection findings or appraisal reports; those have their own skills.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Weighing several offers at once? ',
        { link: 'Offer Comparison', href: '/offer-comparison', sameTab: true },
        ' lines them up side by side.',
      ],
    },
  ],

  unlockKey: 'ce-unlocked',
});
