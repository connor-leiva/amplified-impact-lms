// Every word on /team-pnl-review that is its own: the landing page for Team P&L Review, Connor's free
// skill (`skills/team-pnl-review/`, version 1.0) that reads a real estate team's profit and loss export
// (QuickBooks Online, QuickBooks Desktop, Xero, or the bookkeeper's Excel, CSV or PDF), plus an optional
// P&L Detail, closed-deal export and budget, and hands back company dollar, margin, the expense mix,
// what changed, cost per closing when closings are uploaded, anomalies, questions for the bookkeeper,
// CPA and broker, a one-page owner brief and a bookkeeper email. What every skill page says the same
// way is in `skill-page.ts` (D-052).
//
// The words come from the skill itself (SKILL.md and its references), its page notes, its graded runs
// (cases 1 to 3 at 11 of 11, the practice run at 10 of 10, a no-skill baseline at 0 of 11, and a
// reviewer's second runs of case 1 and the practice) and the build and review reports, so the page
// promises what the skill does. For team owners, team leaders and the ops or finance person who reads
// the monthly P&L.
//
// What the page holds to, as SKILL.md does: it only reads, never changes the books, pays or sends
// anything; no tax or accounting advice (the CPA); every number from code, with the arithmetic shown;
// no benchmark from memory; no forecast; no individual's pay, client or account number; the owner
// decides every spending, split, hiring and vendor question, and the page never says the skill
// recommends one.
//
// Calls still open, and how the page handles them:
//   - Connor signs off on references/pnl-terms.md before release (page-notes.md). The page states
//     company dollar as the skill computes it today (commission income minus agent splits, referral fees
//     and brokerage split and fees; revenue share and fees charged to agents outside it). If he changes
//     the definition, the "What you get back" item and the sample's formula line change with it.
//   - Benchmarks: SKILL.md allows one only when a connected Sisu or QuickBooks connector returns it, with
//     the source and date. Whether QuickBooks stays is Connor's call; the FAQ says what SKILL.md says now.
//   - Plans: Claude's help center lists skills on every plan, Claude's docs list Pro and up, so Free is
//     unconfirmed and untested. ChatGPT's free plan has data analysis only as "Limited" (chatgpt.com/
//     pricing, read directly); its file and upload numbers came only from search excerpts of OpenAI's
//     help center, so the page's own words state none of them.
//   - Not tested, and said once in the FAQ without alarm: a real QuickBooks, Xero or Sisu export (every
//     test file was made up), the ChatGPT version inside ChatGPT, any connector, and a budget file.
//
// `setupMinutes` is an estimate (page-notes.md gives none): 10, as the other skill pages with a ChatGPT
// version say for the same shared steps. The practice set is two files, attached one by one. The note
// points to Database Health Check, the other half of a team's numbers: its CRM.
//
// Every string goes through `render.ts`'s escaping, so "P&L" and "Pinecone & Puddle" are written as
// they read, with a bare ampersand.
//
// House rules: no em dashes, short plain sentences, one action a step, the actor and the place named.

import type { Guide } from './content';
import { chatgptPaste, skillPage } from './skill-page';

export const TEAM_PNL_REVIEW: Guide = skillPage({
  slug: 'team-pnl-review',
  title: 'Team P&L Review',

  meta: {
    title: 'Team P&L Review: A Free AI Skill · Amplified Impact',
    description:
      'Upload your team’s P&L from QuickBooks or Xero and see what you kept, where the money went, what changed and what looks wrong, with every calculation shown, plus questions for your bookkeeper. A free skill for Claude and ChatGPT. It never changes your books.',
  },

  // Non-breaking spaces keep the audience on one line at phone width, as /recruiting-prep does.
  eyebrow: 'Free AI Skill · For Team Owners and Leaders',
  // page-notes.md, "One-Line Promise", with the actor named and P&L spelled out once.
  lede: 'Upload your team’s profit and loss report (P&L) and the AI shows what you actually kept, where the money went, what changed, what looks wrong, and the one decision on the table, with every calculation shown.',
  outcome: { n: '03', title: 'Know Where the Money Went', body: 'A one-page brief and a bookkeeper email, drafted for you to read first.' },
  optInBody:
    'Tell us where to send updates and the skill is yours. A skill is a set of instructions you add to Claude once, so Claude knows how to do this job. There’s a ChatGPT version too. Either one only reads your reports and never changes your books.',
  setupMinutes: 10,

  practice: {
    // page-notes.md, "Practice Prompt", word for word (a curly apostrophe, as on every page), and what the
    // two files hold and what the run should find (evals/make/planted/practice.json; sample.md).
    prompt: 'Here’s our P&L and our closed deals. How are we doing, and what should I look at?',
    note: [
      'There are two files: a QuickBooks-style P&L by month for a made-up team, January to September 2026, and that team’s closed-deal export. Every name and number in them is made up. Look for the 2 pending deals and 1 canceled deal left out of the 77 closings, the drop in brokerage fees, turned into a question for your broker, and the lead portal’s price increase as the one decision. ',
    ],
  },

  real: {
    // SKILL.md, section 1: the P&L by month is required; the Detail, closings and a budget help.
    body: [
      'Start a new chat the same way, attach your own P&L by month (and your P&L Detail or closed deals, if you have them), and say this.',
    ],
    prompt: 'Here’s our P&L by month. How are we doing, and what should I look at?',
    // SKILL.md, output item 12 (Check Before Sending) and the attached pnl_report.md.
    note: [
      '“Where to get your reports,” below, shows how to export each one. Before anything goes to your bookkeeper or a partner, check every dollar amount, month and account name in the ',
      { strong: 'Check before sending' },
      ' list against your reports.',
    ],
  },

  chatgpt: { paste: chatgptPaste('team-pnl-review') },

  sections: [
    {
      // sample.md (the practice run, 10 of 10 checks), shortened, in the output's own order and its own
      // words, cut only by whole items, rows, columns and sentences: the bottom line in full; three of
      // What I Used's five lines; the recording verdict and the brokerage line (not the month table);
      // the company dollar formula, the period's arithmetic and five months of the table, in three of its
      // five columns (four or more scroll out of sight on a phone); the agent fee income line; cost per
      // closing (four of five lines) and three of seven lead sources with the pay-at-close and timing
      // notes; all five anomalies; the broker question; two lines of the owner brief;
      // the bookkeeper email in full; and three rows of the check list. Left out: the expense mix table
      // (its top three shares are in the brief's line), What Changed and the bookkeeper questions (the
      // email asks them).
      kind: 'sample',
      eyebrow: 'Made-Up Example',
      heading: 'What a P&L review looks like',
      body: 'What Claude wrote from the practice files: a made-up QuickBooks-style P&L by month and closed-deal export for a made-up team. They’re the same files you practise on in setup.',
      title: 'Team P&L Review: Pinecone & Puddle Home Team, January to September 2026',
      note: 'Made-up example. Shortened: parts of most sections, three of seven lead sources, two lines of the owner brief, and three rows of the check list.',
      blocks: [
        { h: 'Bottom line' },
        {
          p: [
            'The team kept $41,233 in net income for January to September, a 12.1% margin on company dollar, and $19,091 in September (36.9%), after losing money in each of the first three months. The biggest change in September was company dollar, up 6,610.89 from August, and brokerage split and fees fell from 6.0% of commission income in January to April to between 1.9% and 3.2% from May on, a question for your broker. The one decision: keep or cancel Pumpkinpatch Portal (3,000.00 a month since July 2026; it was 2,500.00).',
          ],
        },
        { h: 'What I used' },
        {
          items: [
            'Production: PRACTICE Closed Deals Export Jan-Sep 2026.csv, 77 closings in those months. Left out: 2 pending deals and 1 canceled deal. Client names and addresses in the file were not used.',
            'Totals check: passed. Every month’s accounts add up to the report’s own Net Income and section totals.',
            'Gaps: no P&L Detail, so charge-level checks (duplicate charges, new vendors, a vendor in the wrong account) were not run. No budget. No prior-year months.',
          ],
        },
        { h: 'How revenue is recorded' },
        {
          p: [
            { strong: 'Gross every month. ' },
            'Commission income is recorded before agent splits, and agent splits, referral fees and brokerage split and fees are all costs. The production file agrees: every month’s commission income matches that month’s GCI.',
          ],
        },
        {
          p: [
            { strong: 'Brokerage split and fees dropped. ' },
            'About 6.0% of commission income from January to April, then May 3.2%, June 2.1%, July 1.9%, August 2.2%, September 1.9%. That can mean the team or its agents reached a brokerage cap, the fee schedule changed, or something is missing from the account. Only the broker knows the cap terms, so it goes to the broker as a question, along with when the cap year resets.',
          ],
        },
        { h: 'Company dollar and margin' },
        {
          p: [
            'Company dollar = commission income - agent splits - referral fees paid - brokerage split and fees. Margin = net income / company dollar.',
          ],
        },
        {
          p: [
            { strong: 'Period: ' },
            'company dollar = 1,076,878.75 - 623,335.34 - 75,196.65 - 38,980.00 = 339,366.76; margin = 41,233.00 / 339,366.76 = 12.1%',
          ],
        },
        {
          table: {
            caption: 'By month (5 of 9, and the period)',
            head: ['Month', 'Net income', 'Margin'],
            rows: [
              ['Jan 2026', '-$8,690', '-37.3%'],
              ['Mar 2026', '-$5,527', '-21.0%'],
              ['Apr 2026', '$939', '2.7%'],
              ['Aug 2026', '$9,465', '21.0%'],
              ['Sep 2026', '$19,091', '36.9%'],
              ['Period', '$41,233', '12.1%'],
            ],
          },
        },
        { p: ['The team also collected 6,750.00 in fees charged to agents (Agent Fee Income), outside company dollar.'] },
        { h: 'Cost per closing and lead sources' },
        { p: ['From the 77 closed deals in the export (January to September):'] },
        {
          items: [
            'Operating expenses per closing = 304,883.76 / 77 = 3,959.53',
            'Lead generation per closing = 37,987.77 / 77 = 493.35',
            'Company dollar per closing = 339,366.76 / 77 = 4,407.36',
            'Net income per closing = 41,233.00 / 77 = 535.49',
          ],
        },
        // The lead sources table's Source, Closings and Return columns, one line each: as a three-column
        // table, the arithmetic broke into a word a line on a phone.
        { p: [{ strong: 'Lead sources (period), 3 of 7:' }] },
        {
          items: [
            'Google PPC, 11 closings: (63,451.07 - 13,987.77) / 13,987.77 = 3.54 per $1 spent',
            'Pumpkinpatch Portal, 16 closings: (66,930.64 - 24,000.00) / 24,000.00 = 1.79 per $1 spent',
            'Lanternfly Leads, 16 closings: 46,882.21 / 75,196.65 = 0.62 per $1 of fees',
          ],
        },
        {
          p: [
            'Lanternfly Leads is pay at close: its referral fees ($75,197) are its cost, and the team’s share is already after them, so the team kept 0.62 per $1 of fees. Spend in one month often produces closings months later, so treat this as a rough nine-month view, not a verdict on any source.',
          ],
        },
        { h: 'Anomalies' },
        {
          items: [
            'Brokerage split and fees dropped from 6.0% of commission income (January to April) to 3.2% in May and 1.9% to 2.2% since. A cap, a fee change or something missing? A question for your broker (below).',
            'Uncategorized Expense: 486.20 in July 2026.',
            'New recurring charge: Software & Subscriptions:Video Editing App, 79.00 a month since June 2026.',
            'One-month jump: Google PPC was 3,940.85 in August 2026 against a usual 1,264.12 (+2,676.73), back to 1,296.33 in September.',
            'Price change: Pumpkinpatch Portal went from 2,500.00 to 3,000.00 a month starting July 2026.',
          ],
        },
        { h: 'Questions for the broker' },
        {
          p: [
            'Our brokerage split and fees were 6.0% of commission income from January to April 2026, 3.2% in May and 1.9% to 2.2% from June to September. Did the team or its agents reach a cap in May, or did the fee schedule change? When does the cap year reset?',
          ],
        },
        { h: 'Owner brief (draft)' },
        {
          p: [
            { strong: 'Where the Money Goes: ' },
            'People 54.5% of company dollar, occupancy 11.7%, lead generation 11.2%.',
          ],
        },
        {
          p: [
            { strong: 'The Decision: ' },
            'Keep or cancel Pumpkinpatch Portal (3,000.00 a month since July; it was 2,500.00). For January to September it cost 24,000.00 and its 16 closings brought the team 66,930.64.',
          ],
        },
        { h: 'Email to the bookkeeper (draft)' },
        {
          email: {
            subject: 'Questions On The January To September P&L',
            body: [
              'Hi [Bookkeeper Name],',
              'I went through the January to September P&L against our closed-deal export. A few questions:',
              '1. Uncategorized Expense has 486.20 in July. What is it, and where should it go?',
              '2. Video Editing App started in June at 79.00 a month. Which subscription is it?',
              '3. Google PPC was 3,940.85 in August, well above its usual month. Was that one campaign, or a billing catch-up?',
              '4. Brokerage split and fees dropped to 3.2% of commission income in May and 1.9% to 2.2% since, from 6.0% before. Is anything missing from that account from May on?',
              'Once the July item is moved, could you send an updated P&L by month as Excel?',
              'Thanks,',
              '[Owner Name]',
            ],
          },
        },
        { h: 'Check before sending' },
        { p: ['Every figure below comes from the analysis run (pnl_report.md, attached), in the section named.'] },
        {
          table: {
            caption: 'The check list (3 of 15)',
            head: ['Item in the drafts', 'Value', 'Where it comes from'],
            // Rows whose words fit three columns at phone width (the Uncategorized and Placeholders rows'
            // single words pushed the table past the card).
            rows: [
              ['Period net income and margin', '$41,233 (41,233.00), 12.1%', 'Company Dollar and Margin, Period'],
              ['Google PPC', '3,940.85 in August; usual 1,264.12; +2,676.73', 'Flags (spike)'],
              ['Cost per closing', '3,959.53; 4,407.36 and 535.49 per closing; 77 closings', 'Production, Cost per Closing'],
            ],
          },
        },
      ],
    },
    {
      // SKILL.md, "Output, In This Order" (items 1 to 12), in that order; page-notes.md "What Comes Back".
      kind: 'list',
      heading: 'What you get back',
      items: [
        {
          title: 'A bottom line',
          body: 'Three sentences at most: your profit for the period and the latest month, the biggest change, and the one decision.',
        },
        {
          title: 'What the AI used',
          body: 'Your files, the months, whether your books are on a cash or accrual basis (when the report says), and a totals check: every month’s accounts must add up to your report’s own totals. Plus any account the AI moved to a different category (say, agent payouts filed under Contract Labor), and anything missing.',
        },
        {
          title: 'How your books record commissions',
          body: 'Month by month, before any ratio: gross (commission income before agent splits, with splits as a cost) or net of splits. One month recorded the other way throws off every ratio built on commission income.',
        },
        {
          title: 'Company dollar and margin',
          body: 'Company dollar is what the team keeps from commissions after agent splits, referral fees and the brokerage’s split and fees. Margin is net income as a share of company dollar. You get both by month and for the period, with the arithmetic. Fees you charge agents and revenue share from your brokerage are shown on their own line.',
        },
        {
          title: 'Where the money goes',
          body: 'Lead generation, marketing, people, tech, occupancy and other, each as a share of company dollar.',
        },
        {
          title: 'What changed',
          body: 'Last month against the month before and against the earlier months’ average, year to date when your file starts in January, and against your budget if you upload one.',
        },
        {
          title: 'Cost per closing and lead sources',
          body: 'Only when you upload your closed deals. Without them, the AI skips both and names the export that fills the gap. It never guesses your closings from a TC fee.',
        },
        {
          title: 'Anomalies',
          body: 'Duplicate charges, new recurring charges, charges in the wrong account, uncategorized items, owner draws in expenses and one-month jumps. Duplicate charges, new vendors and a vendor in the wrong account need your P&L Detail.',
        },
        {
          title: 'Questions for your bookkeeper, CPA and broker',
          body: 'Each with the numbers that raised it. Your broker gets questions only when a cap, fee or referral question comes up.',
        },
        {
          title: 'An owner brief',
          body: 'One page in plain words that you can share with a business partner. It shows no one’s individual pay.',
        },
        {
          title: 'An email to your bookkeeper',
          body: 'A draft with the questions, for you to read and send.',
        },
        {
          title: 'Check before sending',
          body: 'Every dollar amount, percentage, month and account name in the brief and the email, traced to the calculation. Plus pnl_report.md, the full calculation file, to share with your bookkeeper.',
        },
      ],
    },
    {
      // SKILL.md's Run, Draft, Own and page-notes.md's, in the page's words; SKILL.md's guardrails for the
      // wire and account line and for decisions about people.
      kind: 'tiles',
      heading: 'Who does what',
      note: 'The AI does the math. You decide.',
      items: [
        {
          label: 'Run',
          title: 'The AI does the math',
          body: 'Reads your exports and does every sum and ratio with code, showing the arithmetic. Works out how each month records commissions, sorts your expenses, and finds duplicate charges, new charges and items in the wrong account.',
        },
        {
          label: 'Draft',
          title: 'You read it first',
          body: 'The owner brief, the questions for your bookkeeper, CPA and broker, and the email to your bookkeeper. Nothing goes to anyone until you send it.',
        },
        {
          label: 'Own',
          title: 'Always yours',
          body: 'Every spending, split, hiring and vendor decision. Every fix in your books (your bookkeeper), every recording and tax question (your CPA), and cap and fee questions (your broker). Wire instructions and bank, card, account and routing numbers: the AI never asks for or repeats them.',
        },
      ],
    },
    {
      // page-notes.md, "What You Need", and the build report's needs (computer, connectors, accounts and
      // cost). No ChatGPT file or upload numbers: they came only from search excerpts.
      kind: 'tiles',
      heading: 'What you need',
      note: 'About 10 minutes to set up',
      cta: true,
      columns: 2,
      items: [
        {
          title: 'A Claude plan',
          body: 'With skills and code execution on, so Claude can do the math in code. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan.',
          tag: 'Team or Enterprise: an owner turns on code execution',
        },
        {
          title: 'Or a ChatGPT plan',
          body: 'The ChatGPT version goes in a Project, a folder in ChatGPT that keeps instructions and files together. It needs data analysis, the ChatGPT tool that runs the math in code. ChatGPT’s free plan has data analysis only as “Limited.”',
          tag: 'Free ChatGPT limits data analysis',
        },
        {
          title: 'A computer',
          body: 'Setting up a skill is easiest on a computer. A computer is also where you export your P&L. QuickBooks Desktop exports from the computer it runs on.',
        },
        {
          title: 'Your P&L by month',
          body: 'From QuickBooks Online, QuickBooks Desktop or Xero, as Excel with the months across the top. A CSV or your bookkeeper’s PDF works too. Your P&L Detail, closed deals and a budget help, but aren’t needed.',
          tag: 'Excel works best. No numbers to type in.',
        },
        {
          title: 'Connectors, if you want',
          body: 'A connector links Claude to another app. You don’t need one: the skill works from your exports. If the QuickBooks, Xero or Sisu Sunburst connector is on, Claude can read your numbers there, and only reads. The QuickBooks connector can also send invoices, which the skill never does. We haven’t tested the connectors yet.',
          tag: 'Sunburst needs a Sunburst subscription',
        },
        {
          title: 'No extra cost',
          body: 'Nothing beyond your Claude or ChatGPT plan and the bookkeeping software you already use.',
        },
      ],
    },
    {
      // page-notes.md, "What to Upload, and Where It Comes From": Intuit's, Xero's and Sisu's help centers,
      // checked 2026-11-08. Intuit's Desktop article doesn't name a monthly option in Display columns by,
      // so the page says "if your version lists it". Back-office report paths vary and weren't checked.
      kind: 'list',
      heading: 'Where to get your reports',
      items: [
        {
          title: 'QuickBooks Online',
          body: 'Open Reports, then Standard reports, then Profit and Loss. Set the dates, choose Months under Display columns by, and run the report. Then click Export/Print, then Export to Excel.',
        },
        {
          title: 'QuickBooks Desktop',
          body: 'Open Reports, then Company & Financial, then Profit & Loss Standard. Click Customize Report. On the Display tab, set the dates, and pick Month under Display columns by if your version lists it. On the report, click Excel, then Create New Worksheet on Windows, or Export on a Mac.',
        },
        {
          title: 'Xero',
          body: 'Open the Reporting menu, then All reports, then Profit and Loss. Set the Date range, such as Last month, and choose how many past periods under Compare with. Click Update, then Export, then Microsoft Excel.',
        },
        {
          title: 'Your bookkeeper’s file',
          body: 'A PDF works too. Excel is more reliable.',
        },
        {
          title: 'Your P&L Detail (optional)',
          body: 'For duplicate charges and new vendors. In QuickBooks Online, search Standard reports for Profit and Loss Detail, use the same dates, and export to Excel. QuickBooks Online has the Detail report on its Essentials, Plus and Advanced plans. In QuickBooks Desktop: Reports, then Company & Financial, then Profit & Loss Detail.',
        },
        {
          title: 'Your closed deals (optional)',
          body: 'For cost per closing and lead sources. In Sisu, open the Transactions page, filter to closed deals for the same months, and click the Download icon. An Admin or TC login sees the whole team. Or use your brokerage back office’s closed deals report, or a spreadsheet with one row per closing.',
        },
        {
          title: 'A budget (optional)',
          body: 'In the same layout as the P&L: accounts down the side, months across the top.',
        },
      ],
    },
    {
      // page-notes.md, "Things to Say", all five.
      kind: 'prompts',
      heading: 'What to say',
      body: 'Tap to copy. Start a new chat, attach your reports, and paste. In ChatGPT, start the chat inside the Project. Follow-ups go in the same chat.',
      groups: [
        {
          label: 'With your P&L attached',
          items: [
            'Here’s our P&L for January through September. How are we doing?',
            'Margin by month, please, and something I can hand my business partner.',
            'Our bookkeeper sent this PDF. Is anything recorded wrong?',
          ],
        },
        {
          label: 'With more reports attached',
          items: [
            'Here’s the P&L and our closed deals from Sisu. What’s our cost per closing?',
            'Something feels off with our expenses. Here’s the P&L and the P&L Detail. What should I ask my bookkeeper?',
          ],
        },
      ],
    },
    {
      kind: 'faq',
      heading: 'Good to know',
      items: [
        {
          // SKILL.md, Guardrails and the Own line; page-notes.md, "What It Won't Do".
          q: 'What won’t it do?',
          a: [
            'The AI only reads. It never changes your books, pays anything or sends anything. With a connector on, it never uses a tool that creates or changes something. It never asks for or repeats wire instructions or bank, card, account or routing numbers. It gives no tax or accounting advice: how something should be recorded or taxed goes to your CPA. It never decides anyone’s pay, split or job, and never tells you to cut a person, change a split or drop a vendor. It lays out the choice with its numbers. It doesn’t forecast the year or set goals, and it never guesses your closings.',
          ],
        },
        {
          // SKILL.md, section 2 (the totals check; every number from the run, with its arithmetic) and the
          // attached pnl_report.md.
          q: 'How do I know the numbers are right?',
          a: [
            'Every number comes from code the AI runs on your files, not from math done by hand, and the arithmetic is shown next to it. First, the AI checks that every month’s accounts add up to your report’s own totals and Net Income. If they don’t, and it can’t find the misread line, it says so at the top and marks every number provisional. You also get ',
            { strong: 'pnl_report.md' },
            ', the full calculation file, to send your bookkeeper.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, section 3.
          q: 'Our books record commission net of splits. Is that wrong?',
          a: [
            'No. Either way can be consistent. The trouble is switching between them from month to month, and the AI checks that first. It measures margin and the expense mix on company dollar, which reads the same either way. If one month was recorded differently, the AI names the month, shows what still compares, and drafts a question for your bookkeeper.',
          ],
        },
        {
          // page-notes.md, FAQ; SKILL.md, Guardrails ("Numbers only from the uploads" and "No projections").
          q: 'Will it compare us with other teams?',
          a: [
            'Not from memory. The AI never uses “typical team” numbers or industry averages it knows. A benchmark shows up only if your Sisu or QuickBooks connector returns one, and then the AI names the source and the date. It doesn’t forecast your year either. Goals and forecasts belong in Sisu.',
          ],
        },
        {
          // page-notes.md, "What You Need" and "What Was and Wasn't Tested".
          q: 'Which plan do I need, and what was tested?',
          a: [
            'In Claude, a plan with skills and code execution. Claude’s help center lists skills on every plan, Free included, but Claude’s developer docs list them on Pro and up. If your Free account has no way to add a skill, you need a paid plan. In ChatGPT, a Project with data analysis. ChatGPT’s free plan limits data analysis. We tested the skill in Claude on made-up QuickBooks-style reports. We haven’t run a real QuickBooks, Xero or Sisu export through it yet, or tried it in ChatGPT, on Claude’s free plan, with a connector or with a budget. So run the practice files first. The first time you use your own P&L, look at the totals check in ',
            { strong: 'What I used' },
            '.',
          ],
        },
        {
          // page-notes.md, FAQ ("Is our financial data safe?"); SKILL.md, Guardrails (Privacy).
          q: 'Is our financial data safe?',
          a: [
            'Turn off training before you upload real numbers. The setup steps show where, in Claude and in ChatGPT. In the newer version of Claude, incognito chats can’t run code, so use a regular chat with training off. The AI never repeats client names, an agent’s payouts, anyone’s pay or account numbers, even when your files hold them. It reports agents and staff as totals.',
          ],
        },
      ],
    },
    {
      kind: 'note',
      body: [
        'Want to check the other half of your team’s numbers, your CRM? ',
        { link: 'Database Health Check', href: '/database-health-check', sameTab: true },
        ' turns your CRM export into a health report and a cleanup list. Want the month closed in QuickBooks first, or lead spend next to what closed? ',
        // The Grok Bot templates beside this skill (D-100): they run on a schedule; this reads the P&L.
        { link: 'Month-End Close Packet', href: '/month-end-close', sameTab: true },
        ' and ',
        { link: 'Lead-Source ROI', href: '/lead-source-roi', sameTab: true },
        ' are the Grok Bot templates for that.',
      ],
    },
  ],

  unlockKey: 'tpr-unlocked',
});
