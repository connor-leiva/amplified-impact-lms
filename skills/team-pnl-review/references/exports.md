# Where the Files Come From

Last verified: 2026-11-08. Click paths are from each vendor's help center on that date; screens change, so follow what's on screen when they differ.

## The P&L (required)

Best: the Profit and Loss with one column per month, as Excel, for January through the last full month (or any run of months). A PDF from the bookkeeper works; Excel reads more reliably.

- **QuickBooks Online:** Reports, then Standard reports. Open Profit and Loss, set the dates, choose Months under Display columns by, and run the report. Then Export/Print, then Export to Excel. The report can be run on a cash or accrual basis from its Accounting method setting. Sources: "Export reports to Excel" (updated 2026-08-04), https://quickbooks.intuit.com/learn-support/en-us/help-article/report-management/export-reports-excel-quickbooks-online/L7iAoP97n_US_en_US ; "Customize reports" (updated 2026-09-15, its video walks through Display columns by Month), https://quickbooks.intuit.com/learn-support/en-us/help-article/customize-reports/customize-reports-quickbooks-online/L0gKmSawG_US_en_US ; "Choose between cash and accrual accounting methods" (updated 2026-08-05), https://quickbooks.intuit.com/learn-support/en-us/help-article/product-preferences/choose-cash-accrual-accounting-methods-reports/L64yocn6B_US_en_US
- **QuickBooks Online, charge-level detail:** search Standard reports for Profit and Loss Detail, set the same dates, Export to Excel. Intuit says "Detail" versions of standard reports are available on QuickBooks Online Essentials, Plus and Advanced (same "Customize reports" article). This is the file that shows duplicate charges and new vendors.
- **QuickBooks Desktop:** Reports, then Company & Financial, then Profit & Loss Standard. Customize Report, Display tab, set the dates, and pick the period in Display columns by (Intuit's article shows Year; pick the monthly option if your version lists it, and follow the screen). For detail: Reports, Company & Financial, Profit & Loss Detail. To export on Windows: on the open report, the Excel dropdown, then Create New Worksheet; on a Mac, Export, then File, Save As. Sources: "Customize company and financial reports" (updated 2026-08-03), https://quickbooks.intuit.com/learn-support/en-us/help-article/customize-reports/customize-company-financial-reports/L0kGdvblz_US_en_US ; "Export reports as Excel workbooks in QuickBooks Desktop" (updated 2026-08-03), https://quickbooks.intuit.com/learn-support/en-us/help-article/export-reports/export-reports-excel-workbooks-quickbooks-desktop/L4cLJEeXt_US_en_US ; both checked 2026-11-08.
- **Xero:** Reporting menu, All reports, then open the Profit and Loss report. Set the Date range (for example Last month), choose the number of past periods under Compare with (Xero suggests months when the range is a month), and click Update. Then Export and choose Microsoft Excel (PDF and Google Sheets are also offered). Running and exporting the report needs the administrator, standard + reports or viewer role. Sources: "Profit and Loss report," https://central.xero.com/s/article/Profit-and-Loss-New ; "Export and print a report," https://central.xero.com/s/article/Export-or-print-a-report ; both checked 2026-11-08.
- **A bookkeeper's spreadsheet:** fine if it has accounts down the side and months across the top, with section headings (Income, Cost of Goods Sold, Expenses) and a Net Income line.

## The Production Export (optional; needed for cost per closing and lead source return)

One row per closed deal, for the same months: closing date, status, GCI, what the agents were paid, referral fees, brokerage fees, the team's share and lead source. Client names and addresses can stay in the file; the skill never repeats them.

- **Sisu:** the Transactions page, filtered to the closed transactions for the same months. The Download icon exports the transactions currently shown to a spreadsheet, and the Form Selector and Choose Visible Columns control which columns come with it, so pick the commission fields (GCI, Gross Agent Paid Income) and lead source. Admin and TC users see all team transactions; agents see only their own. The Income Report also downloads, but it includes forecasted transactions; the skill counts only closed ones. Sources: "Transactions Page Overview" (Kayla Latta, updated 2026-08-31), https://kb-app.sisu.co/en/articles/8234892-transactions-page-overview ; "Income Report Overview" (2026-07-01), https://kb-app.sisu.co/en/articles/9311648-income-report-overview
- **The brokerage's back office:** a closed-transactions or production report with those columns. Each brokerage's click path differs and wasn't checked; ask the broker or office manager for the report.
- **A spreadsheet** the team keeps, one row per closing.

The skill counts a row only when its status reads closed (closed, sold, settled, complete, funded or paid) and its closing date falls in the P&L's months. Pending, canceled and forecasted rows are left out and counted in the report.

## A Budget (optional)

A budget with the same accounts down the side and the same months across the top, as Excel or CSV. The run compares company dollar and each expense category for the months both files share.

## Connectors (optional, read only)

An export is the most reliable input. When a connector is connected and the owner wants it used, read only what this review needs and save it to a CSV in the account-by-month layout before running the code.

- **Intuit QuickBooks** (Claude's connector directory: Anthropic verified, made by Intuit QuickBooks, added March 2026). Its tools include profit and loss reports from the QuickBooks account and industry benchmarking, and it can also create and send invoices and payment links. Use only the reading tools. https://claude.com/marketplace/connectors/quickbooks (checked 2026-11-08)
- **Xero** (Anthropic verified, made by Xero Limited, added April 2026). Its listing says "Claude connects with read-only access"; tools include get_profit_and_loss and get_bank_account_transactions. https://claude.com/marketplace/connectors/xero (checked 2026-11-08)
- **Sunburst by Sisu** (a custom connector, not in the directory). Sisu's article says it needs an active Sunburst subscription, signs in with the Sisu account, and gives access to production, lead sources and ROI, commissions and expenses, and goals and benchmarks; Claude Free accounts are limited to one custom connector. Server: https://mcp.sisu.co/mcp. Source: "Connecting Sunburst to ChatGPT, Claude, Grok & More," https://kb-app.sisu.co/en/articles/17769635-connecting-sunburst-to-chatgpt-claude-grok-more (checked 2026-11-08)

Benchmarks: use one only when a connected Sisu or QuickBooks connector returns it in this conversation. Name the source, what it measures and the date, and say when it may define revenue differently than these books (a benchmark built on gross revenue doesn't compare with a P&L recorded net).

If the team already logs expenses in Sisu, Sisu's own Income Report shows net income by transaction and agent. This skill reads the books the CPA and bookkeeper use, which is where recording problems and duplicate charges live.
