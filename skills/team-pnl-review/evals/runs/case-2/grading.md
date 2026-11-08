# Grading: Case 2, Duplicated Software Charge and a New Recurring Vendor

Run: SKILL.md followed as written. The code was extracted from references/analysis-code.md and run on evals/files/case2/marmalade-pnl-by-month-jan-sep-2026.xlsx with --detail evals/files/case2/marmalade-pnl-detail-jan-sep-2026.xlsx. Analysis files: files/pnl_report.md, files/pnl_report.json, files/pnl_accounts.csv. Output: output.md.

Result: 11 of 11 expectations pass after the fixes below; every applicable objective check passes.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Snapdragon CRM 599.00 on 2026-08-03 and 2026-08-04 flagged as a likely duplicate for the bookkeeper | Pass | Anomaly 1 and Question 1 ("Is the second charge a duplicate, and has it been refunded?") |
| 2 | Pinecone Dialer flagged as a new recurring vendor since July 2026 at 349.00 a month | Pass | Anomaly 3: "charged 349.00 in July, August and September" |
| 3 | Lanternfly Leads 1,250.00 on 2026-06-05 in Office Supplies flagged as likely miscategorized | Pass | Anomaly 4, plus the Expense Mix note on why June lead generation shows $750 |
| 4 | Uncategorized Expense 412.18 in September 2026 flagged | Pass | Anomaly 2, with the vendor from the detail (SQ *PICKLE BARREL on 2026-09-24) |
| 5 | Gross every month; splits and brokerage fees as costs; no referral fee line | Pass | How Revenue Is Recorded |
| 6 | Company dollar, margin and expense mix on company dollar, with arithmetic | Pass | Ten company dollar lines; Expense Mix table with each division |
| 7 | Cost per closing and lead source return skipped; the missing export and its source named | Pass | "Skipped. The P&L has no count of closings..." with Sisu, back office and spreadsheet sources |
| 8 | No agent's or employee's name next to an amount | Pass | Objective check: none of the six payee names in the detail's agent payouts and payroll checks appear; People is reported as account totals |
| 9 | The decision is keep or cancel Pinecone Dialer; duplicate and misfiled charge go to the bookkeeper | Pass | Bottom line and Owner Brief; Questions 1 and 4 to the bookkeeper |
| 10 | Bookkeeper email: Title Case subject; asks about the duplicate, the dialer, the Office Supplies charge and the uncategorized item by vendor, date and amount | Pass | Subject "Four Questions On The January To September P&L"; four numbered questions; no memo text or card numbers |
| 11 | Check Before Sending present | Pass | 13-row table |

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs or the run's analysis output | Pass: 394 numbers, none untraced |
| Deadlines match the uploaded contract | Not applicable |
| No em or en dashes | Pass: 0 |
| Title Case subject lines | Pass: 1 of 1 |
| Check Before Sending section | Pass |
| No cost estimates without bids | Pass |
| No agent-only MLS fields in client-facing text | Not applicable |
| No protected-class language | Pass |
| No wire or account details | Pass: no card, account or routing numbers; memo lines never quoted |
| No client, agent or employee names | Pass |
| No benchmark language | Pass |
| Bottom line three sentences or fewer | Pass: 3 |

## Failures Found and Fixed

1. **False duplicate on a variable account.** The first run flagged Listing Photography (875.00 in August and September, against a median of 437.50) as "possibly charged twice." Fix: the exact-double test now applies only to steady accounts (at least two thirds of the other months within 5% of the usual amount), and a spike must also beat every other month. Rerun: no photography flag.
2. **The same finding reported twice.** With the detail uploaded, the CRM duplicate appeared as both a charge-level duplicate and an account-level "about twice its usual," the dialer as both a new vendor and a new account, and the uncategorized item twice. Fix: charge-level flags now replace the account-level flags they explain, and the uncategorized flag carries the vendor, date and amount from the detail. Rerun: one flag each.
3. **A hand-made count in the draft.** The first owner brief said "Four of nine months lost money," counted by hand and wrong (five months show a loss). SKILL.md already forbids new totals by hand; the brief now names the five months from the run's table, and the Check Before Sending row points to that table.
4. **Margin far above a real team's.** The first fixture produced a 51.9% margin; agent splits, payroll and rent were raised in the generator, giving 3.3%.
