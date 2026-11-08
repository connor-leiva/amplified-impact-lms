# Page Notes: Team P&L Review

Everything the page and its library card need that isn't in SKILL.md. Facts checked 2026-11-08; sources inline.

**Before release: Connor reviews `references/pnl-terms.md`.** It defines GCI, company dollar, agent splits, brokerage split and fees, cap, referral fees, gross versus net recording, cash versus accrual, owner pay, cost per closing and lead source return, each with its source. Three calls in it are the skill's own and need his sign-off: (1) company dollar here = commission income minus agent splits, referral fees and brokerage split and fees (KW's 2008 definition subtracts only agent commissions; Sisu's import guide does the same); (2) margin and the expense mix are measured on company dollar, not on GCI, so they compare even when a month is recorded net; (3) revenue share, profit share or stock income from the brokerage, and fees charged to agents, are kept outside company dollar (inside net income), and a per-deal fee in Cost of Goods Sold with no other keyword is read as a brokerage fee. The definitions are sourced to Sisu's help center, a 2008 Keller Williams accounting course, eXp's income page and 2025 Form 10-K, IRS publications and Regulation X; none is tax or accounting advice.

## One-Line Promise

Upload your P&L and get what you actually kept, where it went, what changed, what looks wrong, and the one decision on the table, with every calculation shown.

## Who It's For

Team owners, team leaders and the ops or finance person who reads the monthly P&L, in any state and at any brokerage. Built for QuickBooks (Online or Desktop) and works with Xero or a bookkeeper's spreadsheet or PDF. Two of twelve Forum survey respondents named P&L, bookkeeping and reporting among their biggest time sinks, and one named the P&L as the job they'd hand AI.

## What to Upload, and Where It Comes From

1. **Your P&L (required), by month, as Excel.**
   - QuickBooks Online: Reports, then Standard reports. Open Profit and Loss, set the dates, choose Months under Display columns by, run the report, then Export/Print, then Export to Excel. Sources: "Export reports to Excel" (updated 2026-08-04), https://quickbooks.intuit.com/learn-support/en-us/help-article/report-management/export-reports-excel-quickbooks-online/L7iAoP97n_US_en_US ; "Customize reports" (updated 2026-09-15), https://quickbooks.intuit.com/learn-support/en-us/help-article/customize-reports/customize-reports-quickbooks-online/L0gKmSawG_US_en_US ; both checked 2026-11-08.
   - QuickBooks Desktop: Reports, Company & Financial, Profit & Loss Standard; Customize Report, Display tab, set the dates and pick the period in Display columns by (Intuit's article shows Year; pick the monthly option if your version lists it); then, on the open report, the Excel dropdown, Create New Worksheet (Windows), or Export (Mac). Sources: "Customize company and financial reports" (updated 2026-08-03), https://quickbooks.intuit.com/learn-support/en-us/help-article/customize-reports/customize-company-financial-reports/L0kGdvblz_US_en_US ; "Export reports as Excel workbooks in QuickBooks Desktop" (updated 2026-08-03), https://quickbooks.intuit.com/learn-support/en-us/help-article/export-reports/export-reports-excel-workbooks-quickbooks-desktop/L4cLJEeXt_US_en_US ; both checked 2026-11-08. Neither article names a monthly option in Display columns by, so the page should say "pick Month if you see it."
   - Xero: Reporting menu, All reports, open Profit and Loss, set the Date range (for example Last month), choose how many past periods under Compare with, click Update, then Export, Microsoft Excel. Sources: "Profit and Loss report," https://central.xero.com/s/article/Profit-and-Loss-New ; "Export and print a report," https://central.xero.com/s/article/Export-or-print-a-report ; both checked 2026-11-08.
   - A PDF from your bookkeeper works too; Excel is more reliable.
2. **Your P&L Detail (optional, for duplicate charges and new vendors).** QuickBooks Online: search Standard reports for Profit and Loss Detail, same dates, Export to Excel. Intuit says Detail versions of reports are on Essentials, Plus and Advanced (same "Customize reports" article). Desktop: Reports, Company & Financial, Profit & Loss Detail.
3. **Your closed deals (optional, for cost per closing and lead source return).** Sisu: the Transactions page filtered to closed deals for the same months, then the Download icon; Admin and TC users see the whole team. Source: "Transactions Page Overview" (Kayla Latta, updated 2026-08-31), https://kb-app.sisu.co/en/articles/8234892-transactions-page-overview (checked 2026-11-08). Or your brokerage back office's closed-transactions report (paths vary; not checked), or a spreadsheet with one row per closing.
4. **A budget (optional)** in the same layout, accounts down the side and months across the top.

## Things to Say

1. "Here's our P&L for January through September. How are we doing?"
2. "Here's the P&L and our closed deals from Sisu. What's our cost per closing?"
3. "Something feels off with our expenses. Here's the P&L and the P&L Detail. What should I ask my bookkeeper?"
4. "Margin by month, please, and something I can hand my business partner."
5. "Our bookkeeper sent this PDF. Is anything recorded wrong?"

## What Comes Back

- A three-sentence bottom line: profit for the period and the latest month, the biggest change, and the one decision.
- How your books record commission income, month by month (gross with splits as a cost, or net), checked before any ratio, because a single net month throws off every ratio built on commission.
- Income that doesn't come from your closings (fees you charge agents, revenue share or profit share from your brokerage) shown separately, outside company dollar.
- Company dollar and margin by month, with the arithmetic shown.
- Where the money goes: lead generation, marketing, people, tech, occupancy and other, as a share of company dollar.
- What changed: last month against the month before and against the average, year to date, and against budget if you gave one.
- Cost per closing and return by lead source, only when you upload closings.
- Anomalies: duplicate charges, new recurring vendors, charges in the wrong account, uncategorized items, owner draws in expenses, one-month spikes.
- Questions for your bookkeeper and your CPA (and your broker, when a cap or fee question comes up), a one-page owner brief, and a draft email to your bookkeeper.
- A Check Before Sending list, and the full calculation file (pnl_report.md) to share.

## What It Won't Do

- Give tax or accounting advice. How something should be recorded or taxed goes to your CPA.
- Change your books, pay anything, or ask for or handle wire instructions or bank, card, account or routing numbers.
- Use benchmarks or "typical team" numbers from memory, or forecast the year.
- Guess closings from a TC fee or anything else when you haven't uploaded them.
- Name an agent's payouts, an employee's pay, or a client.
- Set goals or forecast production (Sisu does that), clean up a CRM (Database Health Check) or size up a recruit (Recruiting Prep).

## What You Need

- **Claude:** a plan with skills and code execution. Claude's help center says skills work on Free, Pro, Max, Ultra, Team and Enterprise and need code execution, which is on by default for Free, Pro, Max and Ultra (Settings > Capabilities > Code execution and file creation, called "Create and edit files" in the newer settings). Claude's docs list Pro and up for custom skills, so Free is unconfirmed. Upload the skill under Customize > Skills, "+", "+ Create skill", "Upload a skill." Sources: https://support.claude.com/en/articles/12512180-use-skills-in-claude (modified 2026-10-30) and https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude (modified 2026-11-05), checked 2026-11-08. Chat uploads can be up to 500 MB per file and 20 files per chat (https://support.claude.com/en/articles/8241126-uploading-files-to-claude, dated 2026-07-23, checked 2026-11-08).
- **Connectors (optional):** the Intuit QuickBooks and Xero connectors in Claude's directory (both Anthropic verified; the QuickBooks one can also create and send invoices, which this skill never uses), and the Sunburst by Sisu custom connector (needs a Sunburst subscription; Claude Free allows one custom connector). Sources: https://claude.com/marketplace/connectors/quickbooks, https://claude.com/marketplace/connectors/xero, https://kb-app.sisu.co/en/articles/17769635-connecting-sunburst-to-chatgpt-claude-grok-more, checked 2026-11-08. Exports work without any connector.
- **ChatGPT version:** a ChatGPT Project with four files. To set it up: New project in the sidebar; add instructions.md (it downloads as team-pnl-review-instructions.md), pnl-terms.md, pnl-review-guide.md and pnl-analysis-code.md on the project's Sources tab; paste paste.txt into the project's instructions from the ••• menu, Project settings (OpenAI's Projects article and its February 23, 2026 release note, read through search excerpts; confirm the labels in a browser). It needs data analysis, which Free has only as "Limited"; Free allows 5 files per Project and 3 file uploads a day, and spreadsheets can be about 50 MB. Sources: https://chatgpt.com/pricing (read directly) and OpenAI help articles read through search excerpts (help.openai.com blocks direct reads): https://help.openai.com/en/articles/10169521-projects-in-chatgpt, https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq, https://help.openai.com/en/articles/8555545-file-uploads-faq. Confirm in a browser before publishing.
- **Accounts:** QuickBooks, Xero or a bookkeeper who can export the P&L; optionally Sisu or a back office for closings.
- **Cost:** nothing beyond your Claude or ChatGPT plan.

## Run, Draft, Own

- **Run:** reads your exports, does every sum and ratio in code, works out how revenue is recorded each month, sorts expenses, and finds duplicates, new charges and misfiled items.
- **Draft:** the owner brief, the bookkeeper, CPA and broker questions, and the bookkeeper email, for you to read first.
- **Own:** every spending, split, hiring and vendor decision; every correction in the books (your bookkeeper); every recording and tax question (your CPA); cap and fee questions (your broker).

## FAQs

**Our books record commission net of splits. Is that wrong?** No. Either way can be consistent. The problem is switching between them month to month, which this skill checks first. It measures margin and the expense mix on company dollar, which reads the same either way.

**What's company dollar?** What the team keeps from commissions after agent splits, referral fees and the brokerage's split and fees: the money that pays your expenses and your profit. Revenue share and fees you charge agents aren't in it; they're shown on their own line. The skill shows the formula every time, so you can see exactly what went in.

**Will it tell me if we're spending too much on leads compared with other teams?** No. It doesn't use benchmarks from memory. If you connect Sisu's Sunburst connector or the QuickBooks connector and they return a benchmark, it names the source and date.

**Is our financial data safe?** Turn off model training before you upload real numbers: in Claude, Settings, Privacy, then turn off "Help improve our AI models" (https://privacy.claude.com/en/articles/12109829-how-do-i-change-my-model-improvement-privacy-settings, checked 2026-11-08); in ChatGPT, Settings, Data controls, then turn off "Improve the model for everyone" (OpenAI help article read through search excerpts). Claude's incognito chats can't run code in the newer Claude experience, so use a regular chat with training off. The skill never repeats client names, individual pay or account numbers.

**We already track expenses in Sisu.** Then Sisu's Income Report already shows net income by transaction and agent. This skill reads the books your bookkeeper and CPA use, which is where recording mix-ups and duplicate charges show up.

## Practice Prompt

With both practice files attached (PRACTICE Team P&L by Month Jan-Sep 2026.xlsx and PRACTICE Closed Deals Export Jan-Sep 2026.csv): "Here's our P&L and our closed deals. How are we doing, and what should I look at?"

The practice files are a made-up QuickBooks-style P&L by month for a fictional team (Pinecone & Puddle Home Team), January to September 2026, and a made-up closed-deal export with 77 closings, two pending deals and one canceled deal. Expect a result like sample.md: a brokerage fee step-down to ask about, a new 79.00 subscription, a one-month Google PPC jump, an uncategorized item, a lead portal price increase as the decision, and cost per closing.

## Suggested Library Keywords

P&L, profit and loss, QuickBooks, Xero, bookkeeper, company dollar, GCI, agent splits, margin, expense review, cost per closing, lead source ROI, duplicate charges, owner brief, team finances, team leader, owner

## What Was and Wasn't Tested

Tested (evals/runs, graded in each grading.md):
- A QuickBooks Online style P&L by month with April recorded net of splits, plus a Sisu-style closings export: 11 of 11 expectations. A no-skill baseline on the same files passed 0 of 11: it read April as missing splits, told the owner profit was overstated, and asked the bookkeeper to add splits that were already netted out.
- A P&L by month plus a P&L Detail with a duplicated CRM charge, a new recurring dialer, a lead vendor charge in Office Supplies and an uncategorized item: 11 of 11 after fixes (a false duplicate on a variable account; one finding reported twice; a bottom line that gave September's loss a cause the numbers didn't support).
- A QuickBooks Desktop style PDF with no production file: 11 of 11 after fixes (the PDF's title line and page footer were misread on the first run, and the totals check caught the footer; a bookkeeper draft suggested moving Owner's Draw to equity, which is the CPA's call, so the skill now asks the bookkeeper only what the line holds).
- The practice files: 10 of 10; kept as sample.md.
- Every run passed the objective checks: every number traced to the files or the code's output, no dashes, Title Case subjects, Check Before Sending, no names, no account numbers, no benchmarks.
- How the code reads 25 real estate account names (revenue share and profit share income, agent desk fees, per-deal transaction, risk management and E&O fees in Cost of Goods Sold, referral gifts, guaranteed payments and more), plus a made-up P&L run end to end: evals/make/classifier_check.py, PASS.
- Every fixture regenerates identically from evals/make/make_files.py, and every run's analysis files were reproduced from the current code on 2026-11-08.
- Independent review (2026-11-08): a second reviewer ran case 1 and the practice files from scratch following SKILL.md (evals/runs/case-1/review-output.md, evals/runs/practice/review-output.md). Case 1 passed 11 of 11; the practice run caught all 8 planted items. The review found that broker questions (cap and fee schedule) had no place in the output, and that a summary had rounded several months' brokerage shares to "about 2%"; both are fixed in SKILL.md and review-rules.md, and sample.md was updated. It also found that a P&L with the latest month first (a comparison layout such as Xero's Compare with) was read backwards (January compared against February, a price increase read as a decrease, year to date lost); the code now sorts months by date and reads month-end headers such as "30 Sep 2026", and classifier_check.py covers it. All four runs' analysis files are unchanged by the fix.

Not tested:
- Real exports. The fixtures follow QuickBooks' report layouts as described in Intuit's help center (accounts down the side, months across, Total rows, Net Income), but a real QuickBooks Online Excel export, a real Desktop export, a real Xero export and a real Sisu Transactions download should each be run once (Connor's or a Forum member's) before release.
- A budget file (the comparison is built and spot-checked, not graded).
- A real P&L with revenue share income or per-deal brokerage fees (covered only by the classifier check above).
- Any connector (QuickBooks, Xero, Sunburst by Sisu).
- The ChatGPT version inside ChatGPT, including whether data analysis can open a Project file (the instructions fall back to asking for the code file in the chat, then to doing the same calculations by hand in Python with the formulas shown).
- P&Ls with class or location columns, or with comparison columns (prior year, % of income), beyond the month columns.
