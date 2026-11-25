# P&L Review Guide

How to read the analysis run and turn it into the review. The run's thresholds are this review's defaults, not industry standards; the owner can change any of them in map.json ("thresholds").

## Reading the Run

- Use the run's figures exactly as printed: whole dollars in the tables, cents in the arithmetic lines. Don't re-round, re-add or convert, and don't fold several months into one rounded figure ("about 2%"): give the range the run printed ("1.9% to 2.2%").
- Every computed figure in the output carries its arithmetic, copied from the run (in the form "company dollar = [commission] - [splits] - [referral fees] - [brokerage fees] = [result]").
- **Totals check fails:** say so in What I Used and the bottom line, list the months and amounts, and call every figure provisional. For a PDF, look at the page: a footer or a wrapped line read as an account is the usual cause. If it can't be fixed, ask for the Excel export.
- **Account map:** check every account the run marked "no keyword: default" and any account whose name suggests agent payouts (Contract Labor, 1099 Payments) or a lead vendor. Fix with map.json and rerun:
  `{"accounts": {"Contract Labor": "agent_splits", "Office Supplies": "other"}}` (full path with colons, or the account's own name).

## Categories

Cost of the sale, subtracted to get company dollar:
- **Agent splits:** commissions paid to the team's agents, wherever they sit (Cost of Goods Sold, expenses, or a negative line inside income).
- **Referral fees paid:** to other brokerages and pay-at-close lead programs.
- **Brokerage split and fees:** the brokerage's split, royalty, franchise, transaction and review fees. A per-deal charge in Cost of Goods Sold with no other keyword (Transaction Fees, Risk Management Fee, E&O Fee) is read as a brokerage fee; a TC fee there is people.

Operating expenses, shown as a share of company dollar:
- **Lead generation:** paid lead programs, portals, pay-per-click and paid social bought for leads, prospecting data and lists.
- **Marketing:** listing photos and video, signs, print and mail, client appreciation and gifts, events, website and branding.
- **People:** salaries and wages, payroll taxes, benefits, ISAs and assistants, contract labor, transaction coordinator fees, recruiting, training and coaching. Never agent splits.
- **Tech:** software and subscriptions, CRM, dialer, IDX, phones and internet.
- **Occupancy:** rent, utilities, cleaning, repairs, storage.
- **Other:** dues and licenses, insurance, professional fees, bank fees, meals, travel and auto, supplies, taxes, and anything without a keyword.

Kept apart: **Uncategorized** (always a bookkeeper question) and **owner draws, distributions or guaranteed payments** recorded as expenses (left out of the mix; net income shown both ways).

Outside company dollar, inside net income: **fees charged to agents** (desk, tech or transaction fees the team collects) and **revenue share, profit share or stock income from the brokerage**. Revenue share is paid by the brokerage on deals closed by agents the owner attracted to it, not earned on the team's own closings (P&L Terms, below), so counting it as commission would inflate company dollar and make splits look low.

## How Revenue Is Recorded: What to Say

- **Gross every month:** one line, then the month table. Splits as a share of commission and company dollar as a share of GCI are available.
- **Net every month (no splits anywhere):** commission income is the team's share, or agents are paid outside these books. Company dollar = commission income. Ratios on GCI need the production file.
- **Mixed:** the top finding. Name the months. With a production file, quote the reconciliation ("[Month]'s commission income of [amount] matches the team's share in the production file, not its GCI of [amount]"). Without one, give the run's "closer to" hint, labeled as a hint, and say the P&L alone can't tell a net month from a month whose splits were never entered. Then say what still compares (company dollar, net income, margin on company dollar) and what doesn't (commission income, split share, anything as a share of GCI, month-over-month change in commission income).
- **Low or high split month:** a question, never a conclusion. Possible causes: team leader's own deals, a split plan change, a team-level cap, a payout recorded in another month, or partly net recording.
- **Brokerage fees step down:** ask whether the team or its agents reached a brokerage cap or the fee schedule changed (P&L Terms, below, Cap). Never assert a cap.
- **Referral fees in the production file but not on the P&L:** they were likely withheld at closing (netted out). Fine if consistent; say which way the books do it.

## Which Figures to Show

- **Always:** company dollar and margin on company dollar, by month and for the period; expense mix as a share of company dollar.
- **Only for gross months:** splits as a share of commission; company dollar as a share of gross commission.
- **Only with a production file:** closings, cost per closing, lead generation per closing, company dollar and net income per closing, average GCI per closing, the P&L-to-production reconciliation, lead source return.
- **Lead spend the run couldn't tie to a source** (an account such as Online Lead Programs that names no vendor in the production file): say so with its period total and ask the owner which source it pays for; `map.json` "lead_sources" ties them on a rerun. Never guess the match.
- **Never:** a ratio that mixes gross and net months; a benchmark from memory; a run rate, forecast or year-end estimate; closings inferred from TC fees or any per-file charge.

## Flags: What Each One Gets

Use the run's priority order (P1 is most important).

| Flag | Goes to | What to write |
|---|---|---|
| P1 mixed_recording | Bookkeeper, CPA, the decision | Which months, the evidence, a request to restate; CPA question on which method to keep |
| P2 totals_do_not_tie | Top of the output | The months and amounts; figures are provisional |
| P3 duplicate_charge, exact_double | Bookkeeper | Vendor, account, both dates, amount; ask whether it's a duplicate and whether it was refunded |
| P4 uncategorized | Bookkeeper | Amount, month, vendor if the detail shows it; ask where it belongs |
| P5 owner_draw_on_pnl | CPA and bookkeeper | Net income as reported and before the draw line. Bookkeeper: only whether the line holds owner pay and nothing else. CPA: how owner pay should be recorded. Never suggest where it should go |
| P6 new_recurring_vendor, new_recurring_account | Owner (keep or cancel), bookkeeper (what is it) | Vendor or account, start month, monthly amount |
| P6 contract_labor_large | Bookkeeper | Ask whether it holds agent payouts |
| P7 spike, negative_expense | Bookkeeper | Account, month, amount against the usual |
| P8 likely_miscategorized, split_share | Bookkeeper | Vendor, amount, date, the account it's in and the one it usually uses |
| P9 price_change | Owner | Old and new monthly amount, start month |
| P9 brokerage_share_drop | Broker; bookkeeper only if something may be missing | The shares before and after. Broker: did the team or its agents reach a cap, did the fee schedule change, and when does the cap year reset. Bookkeeper: only whether anything is missing from the account |
| P9 referral_netted | Bookkeeper | Confirm referral fees are withheld at closing |
| P10 one_time, new_vendor_once | List only | One line each, no question unless the owner asks |
| P10 revenue_share_income | What I Used, Company Dollar | One line: kept out of commission income and company dollar, included in net income |

When both an account-level and a charge-level flag describe the same thing, the run keeps the charge-level one. Report it once.

## The Biggest Change

Use the run's "Biggest change" line: the largest move from the month before to the latest month among company dollar and the six expense categories, with the account behind it. If the recording changed between those two months, say commission income moved because of recording and compare company dollar.

## The One Decision

The first that applies:
1. **Mixed recording:** "Decide with your bookkeeper and CPA one way to record commission income, and have [months] restated before using any ratio built on commission income."
2. **Totals don't tie:** "Get a corrected export before deciding anything from these numbers."
3. **Owner draws recorded as expenses:** "Decide with your CPA how owner pay is recorded, so profit means the same thing every month ([net income as reported], or [net income before the draw line])."
4. **A new recurring charge, or a price increase on one, of $100 a month or more** (this review's default for what's worth an owner's decision): "Keep or cancel [vendor or account] ([amount] a month since [month])." With several, the largest monthly amount.
5. **The largest increase in an expense category in the latest month that the run doesn't mark one-time:** "Decide whether [category] at [new amount] continues (it was [old amount])."
6. **With production, a lead source whose period return is below zero:** "Decide whether [source] stays at [spend] for these months' results ([team share] back on [spend]), allowing for the lag between spend and closings."
7. **Otherwise:** "Nothing in these numbers forces a decision this month."

Duplicate charges and misfiled items are fixes for the bookkeeper, not owner decisions. Never frame the decision as letting a person go, changing someone's split, or a tax move.

## Who Gets Which Question

- **Bookkeeper:** what was recorded and where, and corrections: the recording method by month, duplicates, uncategorized items, misfiled charges, negative expenses, totals that don't tie, what a new vendor is.
- **CPA:** how something should be recorded or taxed: gross or net presentation, owner pay, how agents are paid and reported, cash or accrual.
- **Broker:** cap and fee schedules, and referral fees paid to anyone other than a brokerage.
- **Owner:** keep or cancel, and how much to spend.

## Owner Brief

A one-page draft the owner can share with a partner. About 250 words.
- Title in Title Case: "Owner Brief: [Team Name] P&L, [First Month] to [Last Month]"
- **Bottom Line:** the same three sentences.
- **Profit:** period net income and margin on company dollar; the latest month's. When owner draws are in expenses, both ways.
- **How Revenue Is Recorded:** one line.
- **Where the Money Goes:** the three largest expense categories as a share of company dollar.
- **What Changed:** the biggest change and its account.
- **What Needs a Look:** up to five flags, one line each.
- **Cost per Closing:** the period figure, or "Not available: add [the export] to see it."
- **The Decision:** the one decision.
- **With the Bookkeeper:** how many questions there are to send, plus how many go to the CPA or the broker.

No individual's pay, no client names, no account or card numbers.

## Email to the Bookkeeper

- Subject in Title Case, such as "Questions On The January To June P&L".
- To [Bookkeeper Name]. One line on why, then the questions numbered, each with the month, account, vendor and amount. Ask for a corrected export once fixes are in.
- Name charges by vendor, date and amount only. Never repeat card, account or routing numbers or a memo line.
- Under 250 words. Sign with the owner's name or [Owner Name].

## Check Before Sending

List every dollar amount, percentage, date, month and account or vendor name in the owner brief and the email, each with the run section it comes from ("Company Dollar and Margin", "Flags", "Production"), plus every placeholder still in the drafts.

## Where the Files Come From

Last verified: 2026-11-08. Click paths are from each vendor's help center on that date; screens change, so follow what's on screen when they differ.

### The P&L (required)

Best: the Profit and Loss with one column per month, as Excel, for January through the last full month (or any run of months). A PDF from the bookkeeper works; Excel reads more reliably.

- **QuickBooks Online:** Reports, then Standard reports. Open Profit and Loss, set the dates, choose Months under Display columns by, and run the report. Then Export/Print, then Export to Excel. The report can be run on a cash or accrual basis from its Accounting method setting. Sources: "Export reports to Excel" (updated 2026-08-04), https://quickbooks.intuit.com/learn-support/en-us/help-article/report-management/export-reports-excel-quickbooks-online/L7iAoP97n_US_en_US ; "Customize reports" (updated 2026-09-15, its video walks through Display columns by Month), https://quickbooks.intuit.com/learn-support/en-us/help-article/customize-reports/customize-reports-quickbooks-online/L0gKmSawG_US_en_US ; "Choose between cash and accrual accounting methods" (updated 2026-08-05), https://quickbooks.intuit.com/learn-support/en-us/help-article/product-preferences/choose-cash-accrual-accounting-methods-reports/L64yocn6B_US_en_US
- **QuickBooks Online, charge-level detail:** search Standard reports for Profit and Loss Detail, set the same dates, Export to Excel. Intuit says "Detail" versions of standard reports are available on QuickBooks Online Essentials, Plus and Advanced (same "Customize reports" article). This is the file that shows duplicate charges and new vendors.
- **QuickBooks Desktop:** Reports, then Company & Financial, then Profit & Loss Standard. Customize Report, Display tab, set the dates, and pick the period in Display columns by (Intuit's article shows Year; pick the monthly option if your version lists it, and follow the screen). For detail: Reports, Company & Financial, Profit & Loss Detail. To export on Windows: on the open report, the Excel dropdown, then Create New Worksheet; on a Mac, Export, then File, Save As. Sources: "Customize company and financial reports" (updated 2026-08-03), https://quickbooks.intuit.com/learn-support/en-us/help-article/customize-reports/customize-company-financial-reports/L0kGdvblz_US_en_US ; "Export reports as Excel workbooks in QuickBooks Desktop" (updated 2026-08-03), https://quickbooks.intuit.com/learn-support/en-us/help-article/export-reports/export-reports-excel-workbooks-quickbooks-desktop/L4cLJEeXt_US_en_US ; both checked 2026-11-08.
- **Xero:** Reporting menu, All reports, then open the Profit and Loss report. Set the Date range (for example Last month), choose the number of past periods under Compare with (Xero suggests months when the range is a month), and click Update. Then Export and choose Microsoft Excel (PDF and Google Sheets are also offered). Running and exporting the report needs the administrator, standard + reports or viewer role. Sources: "Profit and Loss report," https://central.xero.com/s/article/Profit-and-Loss-New ; "Export and print a report," https://central.xero.com/s/article/Export-or-print-a-report ; both checked 2026-11-08.
- **A bookkeeper's spreadsheet:** fine if it has accounts down the side and months across the top, with section headings (Income, Cost of Goods Sold, Expenses) and a Net Income line.

### The Production Export (optional; needed for cost per closing and lead source return)

One row per closed deal, for the same months: closing date, status, GCI, what the agents were paid, referral fees, brokerage fees, the team's share and lead source. Client names and addresses can stay in the file; the review never repeats them.

- **Sisu:** the Transactions page, filtered to the closed transactions for the same months. The Download icon exports the transactions currently shown to a spreadsheet, and the Form Selector and Choose Visible Columns control which columns come with it, so pick the commission fields (GCI, Gross Agent Paid Income) and lead source. Admin and TC users see all team transactions; agents see only their own. The Income Report also downloads, but it includes forecasted transactions; the analysis counts only closed ones. Sources: "Transactions Page Overview" (Kayla Latta, updated 2026-08-31), https://kb-app.sisu.co/en/articles/8234892-transactions-page-overview ; "Income Report Overview" (2026-07-01), https://kb-app.sisu.co/en/articles/9311648-income-report-overview
- **The brokerage's back office:** a closed-transactions or production report with those columns. Each brokerage's click path differs and wasn't checked; ask the broker or office manager for the report.
- **A spreadsheet** the team keeps, one row per closing.

The analysis counts a row only when its status reads closed (closed, sold, settled, complete, funded or paid) and its closing date falls in the P&L's months. Pending, canceled and forecasted rows are left out and counted in the report.

### A Budget (optional)

A budget with the same accounts down the side and the same months across the top, as Excel or CSV. The run compares company dollar and each expense category for the months both files share.


If the team already logs expenses in Sisu, Sisu's own Income Report shows net income by transaction and agent. This review reads the books the CPA and bookkeeper use, which is where recording problems and duplicate charges live.

## P&L Terms

Last verified: 2026-11-08. Sources are listed at the end, with the date each was checked.

These definitions explain the numbers; they don't change them. Brokerages, coaches and software define some of these terms differently, so this review always shows the formula it used. This is not tax or accounting advice: how something should be recorded or taxed is a question for the team's CPA, and how it was recorded is a question for the bookkeeper.

### GCI (Gross Commission Income)

- The total commission earned on closed transactions before anyone on the deal is paid. Sisu's glossary: GCI "represents your total earnings from the commissions on sales. Referral fees haven't been subtracted yet." Sisu's import template describes its gross commission field as "the total commission collected from the client before anyone is paid on the deal." Keller Williams' market center accounting course (2008) defines it as "the total amount of commission dollars the Market Center receives from a transaction." [1] [2] [5]
- Sisu also uses **Adjusted GCI**: GCI minus referral fees. [1]
- In this review: on a P&L recorded gross, a month's commission income should be close to that month's GCI in the production file, allowing for timing.

### Agent Splits

- The share of commission paid to the agents on the deal. Sisu calls it Gross Agent(s) Paid Income: "a percentage of the GCI that's paid to all your team's agents who are involved in the deal. Referral fees and pre-split adjustments have not been taken out." Net Agent(s) Paid Income is what is left for the agents after those come out. [1]
- Not payroll. IRS Publication 15-A (2026) treats licensed real estate agents as statutory nonemployees, self-employed for federal tax purposes, when substantially all their pay is tied to sales rather than hours and they work under a written contract saying they won't be treated as employees. Whether a team's agents meet that test is a CPA question. This review keeps agent splits out of "people" costs and treats them as a cost of the sale. [7]
- A month where splits look low against commission income has several possible causes: the team leader's own deals (no split paid), a split plan change, an agent reaching a team-level cap, or the month being recorded net. This review asks; it doesn't assume.

### Company Dollar

- What the company keeps after the agents are paid, to run the business and make a profit. Keller Williams' course (2008): "The money a Market Center keeps after all the agents are paid their commissions. The market center uses these funds to pay bills and to make a profit." Its worksheet runs: GCI, less agent commission, equals company dollar; less expenses, equals profit. [5]
- Sisu's import template: "Your team/company's income will be derived from gross_commission_amount MINUS paid_income_to_agents." Sisu's Income Report shows a Team Net Income tile: "What the team/brokerage makes after payouts." [2] [3]
- **This review's working definition, for a team inside a brokerage:** company dollar = commission income minus agent splits minus referral fees paid minus brokerage split and fees. The brokerage's share and referral fees come off before the team can spend anything, so they belong on the same side as agent splits. Some coaches and brokerages leave referral or brokerage fees out of this; when a team uses a different definition, say so and show both.
- Why it's the denominator for margin and the expense mix: it means the same thing whether the books record commission gross or net (see below), so it compares across months even when the recording doesn't.

### Brokerage Split and Fees

- What the brokerage keeps from each deal: its split, plus any royalty, franchise, transaction or review fees. Sisu calls charges that come out before anyone is paid "pre-split adjustments": they "come 'off the top' (or possibly added to) Adjusted GCI prior to the team/brokerage or any agent receiving their pay." [13]
- On a P&L they can appear as one line or several (a split, a transaction fee, a risk management or E&O fee per deal). This review reads a per-deal fee in Cost of Goods Sold as a brokerage charge and shows how it read every account, so the owner or bookkeeper can correct it.
- On a P&L they show up either as a cost line (when the team records the full commission) or not at all (when the team is paid after the brokerage has taken its share).

### Cap

- A yearly limit on what an agent pays the brokerage. After it, the agent keeps more of each commission until the cap year resets.
- Two published examples. eXp Realty's income page (checked 2026-11-08): "Agents retain 80% of their commission until they reach a $16,000 annual cap paid to the brokerage. Once the cap is met, the agent keeps 100% of their commission for the remainder of their anniversary year, subject to standard transaction and broker review fees." Keller Williams' course (2008) describes "an annual cap on the amount of money an associate pays to Keller Williams (both in Company Dollar and Royalty fees)," set by each market center, calculated on closed transactions and restarting at the agent's anniversary date. [4] [5]
- What it does to a P&L: once the team or its agents cap, brokerage split and fees drop to transaction fees, so company dollar rises without any change in production. eXp World Holdings' 2025 annual report names "increased agent capping" as a reason its commission costs rose. [6]
- Teams can have their own caps on what agents pay the team, which lowers the team's share of later deals the same way.
- This review never states a cap amount for anyone's brokerage or team. Cap terms come from the brokerage agreement and the broker.

### Referral Fees

- Paid to another brokerage, or to a referral or lead program, for a client referral. Sisu's commission form takes referral fees first: "Referral Adjustments get paid out prior to the local brokerage receiving any payment. In other words, referral adjustments come 'off the top.'" [13]
- Federal rules (Regulation X, 12 CFR 1024.14(g)(1)(v)) do not prohibit "a payment pursuant to cooperative brokerage and referral arrangements or agreements between real estate agents and real estate brokers," and the rule adds that this "refers only to fee divisions within real estate brokerage arrangements when all parties are acting in a real estate brokerage capacity." Who else may receive a referral fee is set by state license law; a referral fee paid to anyone other than a brokerage is a question for the broker. [8]
- **Pay-at-close lead programs** charge little or nothing up front and collect a referral fee after the deal closes. Sisu's glossary describes Zillow Flex as connections "at no upfront cost." Zillow's own FAQ, read only through search excerpts because zillow.com blocks automated reading, says the fee is paid out of escrow at closing or within 15 days after. Confirm with the bookkeeper how the team's fees are paid. [1] [9]
- So a referral fee can be withheld on the settlement statement (the team's deposit is already net of it and no expense appears) or paid after closing (a cost line). For a pay-at-close source, the referral fee is the cost of the source.

### Revenue Share and Other Brokerage Income

- Some brokerages pay agents and team owners for the agents they bring to the brokerage. eXp World Holdings' 2025 annual report: "The Company maintains a revenue share program which allows agents and brokers to earn additional income from real estate transactions closed by agents they have attracted to the Company," funded "from the Company's portion of transaction commissions." The same report says its commissions and other agent-related costs "include sales commissions, revenue share and stock-based compensation paid to the Company's agents." [6]
- On a team's P&L, revenue share, profit share or stock income from the brokerage is income, but it doesn't come from the team's closings. This review reads it as other income: outside commission income and company dollar, inside net income. Counting it as commission would make splits look low and company dollar look high.
- Each brokerage's program and its terms come from the brokerage agreement and the broker. This review never projects revenue share or states anyone's terms.

### Gross Versus Net Recording

- **Gross:** commission income is the full commission (GCI). Agent splits, referral fees and brokerage split and fees are recorded as costs, often under Cost of Goods Sold. Large brokerages report this way: eXp World Holdings says that as principal it "recognizes revenue in the gross amount of consideration to which the Company expects to be entitled" and records agent commissions as "commissions and other agent-related costs." [6]
- **Net:** commission income is what the team receives after some or all of those have come out, so the cost lines are smaller or missing. A team whose brokerage pays agents directly, or pays the team after taking its split and fees, may only ever see net money.
- Either can be a consistent choice. What breaks a P&L is mixing them. In a month recorded net (when it nets out exactly the splits and fees):

| Measure | Effect in the net month |
|---|---|
| Commission income | Drops by the splits and fees left out |
| Agent splits, referral and brokerage lines | Zero or near zero |
| Splits as a share of commission | Falls to about zero |
| Expenses as a share of commission income | Jump, because the denominator shrank |
| Company dollar | Unchanged |
| Net income | Unchanged |

- If a month instead records the full commission but the splits were simply never entered, company dollar and net income are overstated by the missing splits. Without a production file the P&L alone can't always tell the two apart, so this review asks.
- Which presentation the books should use, and any tax effect, is a CPA question. This review only asks for consistency.

### Cash Versus Accrual

- IRS Publication 538: "Under the cash method, you generally report income in the tax year you receive it, and deduct expenses in the tax year in which you pay the expenses. Under the accrual method, you generally report income in the tax year you earn it, regardless of when payment is received." [10]
- QuickBooks Online lets any report run on either basis (the Accounting method setting on the report) without changing the company setting, and notes that changing the company's tax accounting method needs IRS approval. [11]
- Real estate effect: on a cash basis, a commission lands in the month the check arrives, which can be after the closing month, so a production file by closing date won't match the P&L month for month.

### Owner Pay

- How an owner is paid (draws, distributions, guaranteed payments, or salary through payroll) depends on how the business is set up for tax; the IRS says "the procedures for compensating yourself for your efforts in carrying on a trade or business will depend on the type of business structure you elect." [12]
- So "profit" on one team's P&L may be before owner pay and on another's after it. When a draw, distribution or guaranteed payment line appears among expenses, this review shows net income both as reported and before that line, asks the bookkeeper only whether the line holds owner pay and nothing else, and asks the CPA how owner pay should be recorded. It never suggests where the line belongs.

### Cost per Closing and Lead Source Return

- **Cost per closing** = operating expenses for the months ÷ closings in the same months. eXp World Holdings reports the same idea at brokerage scale, "real estate per transaction cost": selling, general and administrative, sales and marketing and technology and development expenses divided by total transactions. [6] This review computes it only from a production file, never from a per-file fee or any other proxy.
- **Lead source return:** Sisu's glossary defines Lead Source ROI as how much money, or profit, a lead source makes, and ROI as the net gain divided by the original cost. [1] This review uses (the team's share from that source's closings − that source's spend) ÷ spend, for the same months. For a pay-at-close source the spend is the referral fees on its closings, and the team's share in the production file is usually already after those fees, so the return is that share ÷ the fees (the same net gain per dollar, without subtracting the fee twice). Lead spend and the closings it produces rarely fall in the same months, so it is a rough period view.

### Sources

1. Sisu, "Sisu Glossary" (Alex Masterson, June 12, 2024), checked 2026-11-08: https://kb.sisu.co/en/articles/8514178-sisu-glossary
2. Sisu, "Importing Your Past Sales Transactions into Sisu" (Zac Muir, January 23, 2024), checked 2026-11-08: https://kb.sisu.co/en/articles/2138658-import-your-past-sales-transactions-into-sisu
3. Sisu, "Income Report Overview" (Kayla Latta, July 1, 2026), checked 2026-11-08: https://kb-app.sisu.co/en/articles/9311648-income-report-overview
4. eXp Realty, "Income," checked 2026-11-08: https://www.exprealty.com/income
5. Keller Williams Realty, "Keller Accounting," KW Connect MCA Skills course (2008), pages 5 to 7, checked 2026-11-08: https://images.kw.com/connect/attachments/1208898254638_3_Keller_Accounting.pdf
6. eXp World Holdings, Inc., Form 10-K for 2025, filed 2026-02-24, revenue recognition and results sections, checked 2026-11-08: https://www.sec.gov/Archives/edgar/data/1495932/000110465926019145/expi-20251231x10k.htm
7. IRS, Publication 15-A (2026), "Statutory Nonemployees" (page last reviewed 2026-04-30), checked 2026-11-08: https://www.irs.gov/publications/p15a
8. Consumer Financial Protection Bureau, Regulation X, 12 CFR 1024.14(g)(1)(v), checked 2026-11-08: https://www.consumerfinance.gov/rules-policy/regulations/1024/14/
9. Zillow, Zillow Preferred (Flex) FAQ, read only through search result excerpts on 2026-11-08 (direct reads blocked): https://www.zillow.com/z/flex-performance-terms/flex-faq/
10. IRS, Publication 538, "Accounting Periods and Methods" (page last reviewed 2026-04-30), checked 2026-11-08: https://www.irs.gov/publications/p538
11. QuickBooks, "Choose between cash and accrual accounting methods in QuickBooks Online" (updated 2026-08-05), checked 2026-11-08: https://quickbooks.intuit.com/learn-support/en-us/help-article/product-preferences/choose-cash-accrual-accounting-methods-reports/L64yocn6B_US_en_US
12. IRS, "Paying yourself" (page last reviewed 2026-05-08), checked 2026-11-08: https://www.irs.gov/businesses/small-businesses-self-employed/paying-yourself
13. Sisu, "Using The Commission Form & Generating CDA's" (Kayla Latta, March 21, 2025), checked 2026-11-08: https://kb-app.sisu.co/en/articles/10518280-using-the-commission-form-generating-cda-s
