// Every word on /tc-file-audit that is its own: the landing page for TC File Audit, a skill
// (`skills/tc-file-audit/`, version 1.0) that audits one real estate transaction file from contract to close for
// a transaction coordinator, ops lead or team owner. It crosses the file's document list (a SkySlope, Dotloop,
// Brokermint or Lone Wolf checklist export, status email, screenshot or typed list) against the brokerage's own
// required-document checklist, the contract's key dates and addenda, and the TC's notes, and hands back flags, a
// bottom line, a deadline calendar with days remaining counted in code, missing and incomplete items, what is due
// this week, a message to the agent, a note to the broker for compliance review and Check Before Sending. What
// every skill page says the same way is in `skill-page.ts` (D-052).
//
// The skill is paid (in the Amplified Skill Library, not in `FREE_SKILLS`), so the built page shows its hero and
// sample with the Skill Library card in place of the sign-up and the setup, and `content.ts` takes "Free" off its
// title, description and eyebrow (D-082). The words below are written as a free page, for the day Connor names it
// free, as every skill page's are.
//
// The words come from the skill itself (SKILL.md and references/audit-rules.md, file-exports.md,
// utah-repc-deadlines.md and deadline-code.md), its page notes, and its graded runs (the practice set at 10 of 10,
// case 2, a wire-change email plus missing seller disclosures, at 10 of 10, and case 3, an Idaho file with an odd
// closing date, at 7 of 7, all passing the objective checks), so the page promises what the skill does. The sample
// is sample.md, the graded practice run, cut only by whole rows, columns, items and sentences; the agent message is
// whole.
//
// What the page holds to, as SKILL.md does: it never says a document, signature or file is compliant, valid or
// legally sufficient; never interprets the contract or says what a missed deadline means; never extends, moves or
// recomputes a deadline (a change signed by one side stays "proposed"); never asks for, repeats or handles wire
// instructions or account, routing or Social Security numbers, and flags a wire-change message first with "verify
// by phone with the title company at a number you already have"; drafts only, nothing created or changed in any
// transaction system. Every vendor click path is page-notes.md's, from SkySlope's help center, checked 2026-11-10.
//
// Calls left open, and how the page handles them:
//   - Connor's filter: SkySlope and Dotloop already hold checklists and broker review. The FAQ says so and says
//     what this adds (one view crossing the file against the brokerage's list, the contract's dates and the notes,
//     with the asks drafted). Connor confirms it earns its place.
//   - Exports: SkySlope's help center shows the Update Agent status email, not a spreadsheet export; for Dotloop,
//     Brokermint and Lone Wolf no checklist export was found. The page names screenshots, the status email or a
//     typed list and never promises an export.
//   - The "this week" window (the as-of date and the six days after) and "inside 3 days" are the builder's
//     choices; the page says "this week" without defining the window.
//   - The wire wording is the assignment's; Connor confirms it matches the brokerages' own.
//   - Not tested, said once in the FAQ: a real SkySlope, Dotloop, Brokermint or Lone Wolf export or screenshot, a
//     real signed REPC as the only date source, the ChatGPT version inside ChatGPT.
//
// `setupMinutes` is an estimate (page-notes.md gives none): 10, as on the other skill pages with a ChatGPT
// version. The practice set is four files, attached one by one. The note points to Due Diligence Review, the
// sibling for the buyer's due diligence documents (SKILL.md's description names it).
//
// Every string goes through `render.ts`'s escaping, so "CC&Rs" and "Disclosure & Acknowledgement" are written
// as they read, with a bare ampersand.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const TC_FILE_AUDIT: Guide = skillPage({
  slug: 'tc-file-audit',
  skill: 'tc-file-audit',
  title: 'TC File Audit',

  meta: {
    title: 'TC File Audit: A Free AI Skill · Amplified Impact',
    description:
      'Attach one transaction file’s document list, the contract’s key dates, your brokerage’s checklist and your notes, and see what’s missing, what’s unsigned and what’s due this week, with days remaining counted and the asks to the agent and broker drafted. A free skill for Claude and ChatGPT.',
  },

  eyebrow: 'Free AI Skill · For TCs, Ops and Team Owners',
  // page-notes.md, "One-Line Promise", shortened by its last clause's detail.
  lede: 'Attach one transaction file’s document list, the contract’s key dates, your brokerage’s required-document checklist and your notes, and see in one place what’s missing, what’s unsigned and what’s due this week, with the asks to the agent and the broker already drafted.',
  outcome: { n: '03', title: 'Chase the Right Things', body: 'Missing items, deadlines and two drafted asks, for you to read first.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one only reads what you attach and never changes anything in your transaction system.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (a curly apostrophe, as on every page).
    prompt: 'Audit this transaction file as of November 10, 2026: what’s missing, what’s unsigned, and what’s due this week?',
    note: [
      'There are four files for a made-up Utah buyer file: a checklist export, a one-page key-dates summary marked PRACTICE (not a real form), the brokerage’s required-document checklist, and the TC’s notes. Every name in them is made up. Look for the two missing documents, the addendum only the buyers signed, and the deadline 2 days away. The prompt names the date, so your days remaining match the sample.',
    ],
  },

  real: {
    // SKILL.md, section 1: the document list, the dates, the brokerage's checklist and the notes.
    body: [
      'Start a new chat the same way, attach your own file’s document list, key dates, brokerage checklist and notes, and say this.',
    ],
    prompt: 'Audit this transaction file as of today: what’s missing, what’s unsigned, and what’s due this week?',
    // page-notes.md, "What to Upload": SkySlope's "MANAGE FILES: Using Update Agent" (updated 2025-12-16),
    // checked 2026-11-10. The other systems are in "Where to get each piece," below.
    note: [
      'In SkySlope, open the file’s ',
      { strong: 'Checklist' },
      ' tab, click the arrow next to ',
      { strong: 'Update Agent' },
      ', add your own email, and send it: the email lists every item’s status. Before anything goes to your agent or broker, check the ',
      { strong: 'Check before sending' },
      ' list against your file.',
    ],
  },

  chatgpt: { paste: chatgptPaste('tc-file-audit') },

  sections: [
    {
      // sample.md (the practice run, 10 of 10), shortened, in the output's own order and words, cut only by whole
      // rows, columns, items and sentences: the bottom line in full; three of the four flags; the calendar in
      // three of its five columns with the proposed line and the counted earnest money date; the two missing
      // items as lines; the incomplete item; Due This Week; the message to the agent in full; and three check
      // lines. Left out: What I Used, the broker note (the agent message carries the same items), the "not
      // applicable yet" line and most of the check list.
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a file audit looks like',
      body: 'What Claude wrote from the practice files: a made-up Utah buyer file’s checklist export, key-dates summary, brokerage checklist and TC notes. They’re the same files you practise on in setup.',
      title: 'TC File Audit: 1487 Example Quail Lane, Faketown, Utah',
      note: 'Made-up example. Shortened: three of four flags, three of five calendar columns, parts of most sections, no broker note, and three lines of the check list.',
      blocks: [
        { h: 'Flags' },
        {
          items: [
            'Two required documents are missing and past due: the earnest money receipt (due Saturday, October 31, 2026, passed 10 days ago) and the Lead-Based Paint Disclosure & Acknowledgement (the home was built in 1974; due by the Seller Disclosure Deadline, Tuesday, November 3, 2026, passed 7 days ago).',
            'Deadline inside 3 days: the Due Diligence Deadline is Thursday, November 12, 2026, 2 days from today, as Addendum No. 1 set it.',
            'A date change not signed by all parties: Addendum No. 2 would move the Settlement Deadline to Friday, December 11, 2026. It shows the buyers’ signatures only, so the Settlement Deadline in this audit stays Friday, December 4, 2026, per the documents shown.',
          ],
        },
        { h: 'Bottom line' },
        {
          p: [
            'Two required documents are missing and past due (the earnest money receipt and the Lead-Based Paint Disclosure & Acknowledgement for this 1974 home), and Addendum No. 2 is signed by the buyers only. The nearest deadline is the Due Diligence Deadline on Thursday, November 12, 2026, 2 days away. Chase the Lead-Based Paint Disclosure first: it is a Seller Disclosure that was due November 3, and the Due Diligence Deadline is in 2 days.',
          ],
        },
        { h: 'Deadline calendar' },
        { p: ['Days remaining are from Tuesday, November 10, 2026, computed in code.'] },
        {
          table: {
            caption: 'Section 24 deadlines, three of five columns',
            head: ['Deadline', 'Date', 'Days remaining'],
            rows: [
              ['(a) Seller Disclosure Deadline', 'Tuesday, November 3, 2026', 'Passed 7 days ago'],
              ['(b) Due Diligence Deadline', 'Thursday, November 12, 2026', '2 (inside 3 days)'],
              ['(c) Financing & Appraisal Deadline', 'Tuesday, November 24, 2026', '14'],
              ['(d) Settlement Deadline', 'Friday, December 4, 2026', '24'],
            ],
          },
        },
        {
          p: [
            { strong: 'Proposed, not in effect per the documents shown: ' },
            'Addendum No. 2, dated 11/09/2026, would change the Settlement Deadline to Friday, December 11, 2026 (31 days from today). It shows “Buyers: 11/09/2026. Sellers: not signed” (summary) and “Buyers only” (export row 13). Until every party signs, Friday, December 4, 2026 stands, per the documents shown. The parties decide, in writing; confirm with your broker.',
          ],
        },
        {
          p: [
            { strong: 'Counted from Acceptance: ' },
            'Earnest Money delivery ($5,000): Acceptance on Tuesday, October 27, 2026, plus four calendar days (counted from the day after Acceptance) is Saturday, October 31, 2026, passed 10 days ago (summary, Contract table). The December 4, 2024 form has no rule that moves a weekend date.',
          ],
        },
        { h: 'Missing items' },
        {
          items: [
            '5. Earnest money receipt: export row 6, Status: Not Uploaded. Due Saturday, October 31, 2026, passed 10 days ago. The notes say the buyers dropped off the earnest money check at Imaginary Title on 10/29, and on 11/9: “Still no EM receipt from title.”',
            '9. Lead-Based Paint Disclosure & Acknowledgement, signed by the sellers and the buyers (only if built before 1978): no row in the export. Due Tuesday, November 3, 2026 (Seller Disclosure Deadline), passed 7 days ago. The summary shows year built 1974, so the item applies.',
          ],
        },
        { h: 'Incomplete items' },
        {
          p: [
            '3. Addendum No. 2 (Settlement Deadline), signed by all parties: export row 13, Status: Pending Review, Signed: Buyers only. Missing: the sellers’ signatures. Notes, 11/9: sent to Dana Fictitious for the sellers’ signatures; “Still waiting on the sellers.”',
          ],
        },
        { h: 'Due this week' },
        {
          items: [
            'Past due and still open: the earnest money receipt (October 31) and the Lead-Based Paint Disclosure & Acknowledgement (November 3).',
            'Wednesday, November 11, 2026 (1 day): the buyers’ repair objection, planned (notes, 11/9, from Toby).',
            'Thursday, November 12, 2026 (2 days): Due Diligence Deadline, by 5:00 PM Mountain Time (Addendum No. 1).',
            'Friday, November 13, 2026 (3 days): the appraisal appointment (notes, 11/4).',
          ],
        },
        { h: 'Message to the agent (draft)' },
        {
          email: {
            subject: 'Missing Documents for 1487 Example Quail Lane',
            body: [
              'Hi Toby,',
              'I audited the Testcase file for 1487 Example Quail Lane as of today, Tuesday, November 10. Two required documents are missing and past due, and one addendum still needs signatures:',
              '1. Earnest money receipt from Imaginary Title Co. It was due Saturday, October 31, four calendar days after Acceptance on Tuesday, October 27. My notes say the buyers dropped off the check on October 29, but the receipt isn’t in the file yet.',
              '2. Lead-Based Paint Disclosure & Acknowledgement, signed by the sellers and the buyers. The home was built in 1974, so our checklist requires it, and it was due by the Seller Disclosure Deadline, Tuesday, November 3. Could you ask Dana Fictitious for it?',
              '3. Addendum No. 2 (Settlement Deadline to Friday, December 11) is signed by the buyers only. Until the sellers sign, the file shows the Settlement Deadline as Friday, December 4.',
              'Also this week: the Due Diligence Deadline is Thursday, November 12, 2 days from today (Addendum No. 1). If the buyers send their repair objection on Wednesday, November 11 as planned, please send me the signed resolution addendum or cancellation notice for the file.',
              'Thanks,',
              'Riley',
            ],
          },
        },
        { h: 'Check before sending' },
        {
          items: [
            'Due Diligence Deadline: Thursday, November 12, 2026 (Addendum No. 1: 11/12/2026, replacing 11/09/2026); 2026-11-12 - 2026-11-10 = 2.',
            'Earnest Money delivery: Saturday, October 31, 2026: 2026-10-27 + 4 = 2026-10-31; 2026-10-31 - 2026-11-10 = -10.',
            'REPC page initials: not shown in the export (row 2 shows “Signed: Yes” only).',
          ],
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'Flags first',
          body: 'Any message asking to send money to a new account comes first, always. Then documents missing and past due, deadlines inside 3 days, date changes not everyone signed, and odd dates, such as a closing before due diligence.',
        },
        {
          title: 'A bottom line',
          body: 'Three sentences at most: how many items are missing and incomplete, the nearest deadline with its days remaining, and the one thing to chase first.',
        },
        {
          title: 'What the AI used',
          body: 'Each file and what it held, the date the audit counts from, the state and contract form, and anything missing, with what it stopped.',
        },
        {
          title: 'A deadline calendar',
          body: 'Each deadline’s date and weekday, days remaining counted with code, where the date came from, and the signed addendum that changed it. A change only one side signed shows as proposed, and the date in effect stays.',
        },
        {
          title: 'Missing and incomplete items',
          body: 'What your brokerage’s checklist asks for that isn’t in the file, and what’s in the file but unsigned or missing initials or pages, as your export shows it. Each with its due date.',
        },
        {
          title: 'What’s due this week',
          body: 'Past due first, then each day in order: deadlines, documents and the dates in your notes.',
        },
        {
          title: 'Two drafts',
          body: 'A message to the agent asking for what’s missing, and a note to your broker for compliance review. Both for you to read and send.',
        },
        {
          title: 'Check before sending',
          body: 'Every date with its source and its days-remaining arithmetic, every status with its row, and every name and dollar amount.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI lines up the file. You chase it. Your broker reviews it.',
      items: [
        {
          label: 'Run',
          title: 'The AI reads and counts',
          body: 'Reads every file you attach, matches each checklist item to the file, and counts every day with code.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The message to the agent and the note to your broker. Nothing is sent or changed.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'The parties change dates, in writing. Your broker reviews the file and decides every compliance question. The title company confirms any wiring instruction, by phone, at a number you already have.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need". No ChatGPT limits as numbers.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on, so Claude can count the days with code. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Or a ChatGPT plan',
          body: 'The ChatGPT version goes in a Project, a folder in ChatGPT that keeps instructions and files together. It needs data analysis, the ChatGPT tool that runs the code. ChatGPT’s free plan has data analysis only as “Limited.”',
          tag: 'Free ChatGPT limits data analysis',
        },
        {
          title: 'Your transaction system',
          body: 'A login that can see the file’s checklist in SkySlope, Dotloop, Brokermint, Lone Wolf or your back office. No connector.',
        },
        {
          title: 'Your brokerage’s checklist',
          body: 'The list of what every file must hold, and by when. Without it, the AI can read your dates but can’t say what your brokerage requires.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload": SkySlope's help center, checked 2026-11-10 (Using Update Agent, Quick
      // Audit, Using Flags and Inbox Update). No export was found for Dotloop, Brokermint or Lone Wolf.
      kind: 'list',
      heading: 'Where to get each piece',
      items: [
        {
          title: 'SkySlope',
          body: 'Open the file’s Checklist tab and click the arrow next to Update Agent. Pick the statuses under Include Checklist, add your own email, and send it. The email lists every item’s status. A screenshot of the Checklist tab works too.',
        },
        {
          title: 'Dotloop, Brokermint or Lone Wolf',
          body: 'We didn’t find a checklist export in their help centers. Screenshot the file’s checklist or folders, print the page to PDF, or type the list: each document, its status, and who signed.',
        },
        {
          title: 'Your back office or tracker',
          body: 'Export it as CSV or Excel, or paste it.',
        },
        {
          title: 'The contract’s key dates',
          body: 'The signed purchase contract and every signed addendum, or your own key-dates summary. In Utah, the deadlines are in Section 24 of the December 4, 2024 REPC or Section 4 of the November 1, 2026 REPC.',
        },
        {
          title: 'Your brokerage’s checklist',
          body: 'From your policy manual or your broker. In SkySlope, only Auditor and Broker accounts can open the checklist templates, so ask your broker for the list.',
        },
        {
          title: 'Your notes',
          body: 'A notes file, a timeline, forwarded emails. Leave out anything with an account, routing or Social Security number.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say".
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat, attach your files, and paste. In ChatGPT, start the chat inside the Project. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'To start, with everything attached',
          items: [
            'Audit this transaction file as of today: what’s missing, what’s unsigned, and what’s due this week?',
            'Check the Quail Lane file against our brokerage checklist before it goes to broker review.',
          ],
        },
        {
          label: 'In the same chat, after the audit',
          items: [
            'Just the deadline calendar, please, with days remaining.',
            'Draft the email to the agent asking for what’s missing.',
            'What’s due this week on this deal?',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // page-notes.md, "Connor's Filter" and FAQ.
          q: 'Doesn’t SkySlope or Dotloop already do this?',
          a: [
            'They hold the checklist and run broker review, one file screen at a time. They don’t cross the file against your brokerage’s own list, the contract’s dates as the signed addenda left them, and your notes in one view, with days remaining counted and the asks drafted. That’s what this adds.',
          ],
        },
        {
          // SKILL.md, Guardrails; references/audit-rules.md, sections 7 and 8.
          q: 'Will it tell me the file is ready for closing?',
          a: [
            'No. It lists what’s in the file, what’s missing and what’s unsigned, as your export shows them, and drafts a note asking your broker to review. It never says a document or a file is compliant or sufficient.',
          ],
        },
        {
          // references/audit-rules.md, section 3; sample.md.
          q: 'An addendum moves closing, but only the buyers signed. Which date does it use?',
          a: [
            'The date in the signed contract. The new date shows as proposed, with who signed, until every party signs. The parties decide, in writing, with your broker. It never extends or moves a deadline itself.',
          ],
        },
        {
          // references/audit-rules.md, section 1; evals case 2.
          q: 'What if a wire email shows up in my notes?',
          a: [
            'It’s flagged first: don’t send funds, and verify by phone with the title company at a number you already have. The AI never repeats the email’s account, routing or phone numbers, and never says whether the email is real.',
          ],
        },
        {
          // page-notes.md, "What Was and Wasn't Tested".
          q: 'Has it been tried on a real file?',
          a: [
            'Not yet. It was tested on made-up files: a Utah buyer file, a Utah file with a wire email and missing seller disclosures, and an Idaho file with a closing date before its inspection deadline. Outside Utah it takes every date from what you attach and says state rules and forms were not checked. We haven’t tried a real SkySlope, Dotloop, Brokermint or Lone Wolf export, or the ChatGPT version inside ChatGPT.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Reviewing the buyer’s inspection and disclosures instead? ',
        { link: 'Due Diligence Review', href: '/due-diligence-review', sameTab: true },
        ' is built for that. Want every active file checked against your checklist each weekday? ',
        // The Grok Bot template beside this skill (D-100): a schedule, not one file on demand.
        { link: 'Missing-Documents File Audit', href: '/missing-documents-audit', sameTab: true },
        ' is the Grok Bot template for that.',
      ],
    },
  ],

  unlockKey: 'tcfa-unlocked',
});
