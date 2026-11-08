---
name: team-pnl-review
description: Reviews a real estate team's profit and loss (P&L) export from QuickBooks, Xero or the bookkeeper (Excel, CSV or PDF), plus an optional P&L Detail, closed-deal export and budget. It first checks how commission income is recorded each month (gross GCI with agent splits as a cost, or net of splits and fees), then computes company dollar, margin, expense mix, monthly and year-to-date changes, and cost per closing and lead source return when closings data supports them. It flags duplicate charges, new recurring vendors and misfiled items, with all math in code, shown, and drafts an owner brief and bookkeeper questions. Use it whenever an owner, team leader or ops person uploads a P&L, income statement or monthly financials, or asks about profit, margin, company dollar or where the money went, even if they never say P&L. Not tax advice (the CPA). Not for goals or forecasts (Sisu), a CRM export (database-health-check), a recruit's production (recruiting-prep) or an agent fee schedule (team-playbook-builder).
compatibility: Needs code execution (Settings > Capabilities > Code execution and file creation) to do the math in Python. Works from uploaded P&L, P&L Detail and production exports (Excel, CSV or PDF). A QuickBooks, Xero or Sisu connector, if connected, is used read only.
metadata:
  author: Amplified Impact
  version: "1.0"
---

# Team P&L Review

Turn the team's P&L into what an owner needs once a month: what the team actually kept, where it went, what changed, what looks wrong, and the one decision on the table. Most team P&Ls can't be compared month to month because commission income is recorded gross one month and net of agent splits the next, so this skill checks that first, before any ratio.

**Run:** reads the exports, does every sum and ratio in code, works out how revenue is recorded month by month, sorts expenses, and finds duplicates, new charges and misfiled items. **Draft:** the owner brief and the questions and email for the bookkeeper, for the owner to read first. **Own:** the owner decides spending, splits, hires and cuts; the bookkeeper makes every correction in the books; the CPA answers how anything should be recorded or taxed. This skill never touches the books or pays anything, and never asks for, repeats or handles wire instructions or bank, card, account or routing numbers.

## 1. Get the Files

- **Required:** the P&L, best as Excel with months across the top (QuickBooks: Profit and Loss with Display columns by Months, then Export to Excel). CSV or the bookkeeper's PDF works. If nothing is uploaded, say where it comes from in one line (see `references/exports.md`) and stop.
- **Helpful:** the P&L Detail for the same months (duplicate charges and new vendors are only visible charge by charge); a closed-deal export from Sisu, the brokerage's back office or a spreadsheet (closings, GCI, agent paid, referral and brokerage fees, lead source); a budget in the same layout.
- **Connectors:** a QuickBooks, Xero or Sisu connector, if connected and the owner wants it used, read only. Never use a connector's tools that create, send or change anything. Save what it returns into the same account-by-month layout as a CSV before running the code.
- Never ask the owner to type numbers the files already hold. A missing team name or month goes in as a [placeholder], flagged at the top.
- If code execution is off, say to turn it on (Settings > Capabilities) and stop. This skill does not do P&L math by hand.

## 2. Run the Analysis in Code

Extract the code from `references/analysis-code.md` (in this skill's folder) and run it. Don't read the code into the conversation:
```
python3 -c "import re,sys;t=open(sys.argv[1]).read();open('/tmp/pnl.py','w').write(re.search(r'\x60{3}python\n(.*)\n\x60{3}',t,re.S).group(1))" SKILL_FOLDER/references/analysis-code.md
python3 /tmp/pnl.py PNL_FILE [--detail DETAIL] [--production CLOSINGS] [--budget BUDGET] [--map /tmp/map.json] --out OUTPUT_FOLDER
```
It prints the report and writes `pnl_report.md`, `pnl_report.json` and `pnl_accounts.csv`. Then:
1. **Totals check.** The run adds every account and compares it to the report's own totals and Net Income. If it doesn't tie, find the misread line (open the PDF page, or the cells), and if it can't be fixed, say so at the top and treat every number as provisional.
2. **Account map.** Read "How Each Account Was Read." If an account is misread (agent payouts in Contract Labor, a lead vendor filed under Marketing), write `/tmp/map.json` as the code's header shows and rerun. Say what you changed.
3. Every number in the output comes from this run, and every computed figure is shown with its arithmetic as the run prints it. Never compute a new total by hand; if a figure isn't in the run, leave it out.

## 3. Read How Revenue Is Recorded First

Read `references/pnl-terms.md` and `references/review-rules.md`. Then report, before any ratio:
- **The verdict:** gross every month, net every month, or mixed, with the month table. Mixed recording is the top finding: say which months, what the production file shows for them when present (gross GCI, GCI after referrals or the team's share), and that company dollar and net income still compare across months while commission income, split share and any ratio on GCI do not.
- **Where splits, referral fees and brokerage fees sit:** as costs, netted out, or not on these books. A month with low splits or a drop in brokerage fees has more than one explanation (team leader's own deals, a cap reached, a plan change, a recording change). Ask; don't conclude.
- **Income that isn't commission:** fees charged to agents, and revenue share, profit share or stock income from the brokerage, stay outside company dollar and inside net income. Say so in one line when they appear.
- The basis (cash or accrual) when the report shows it. On a cash basis, commissions land when the check arrives, so months won't match closing dates.

## 4. Analyze

Follow `references/review-rules.md`:
- **Company dollar and margin** by month and for the period, with the arithmetic.
- **Expense mix** (lead generation, marketing, people, tech, occupancy, other) as a share of company dollar.
- **Changes:** last month against the month before and against the average of the earlier months; year to date when the file starts in January; against budget when one is uploaded. Name the biggest change and the account behind it.
- **Cost per closing and lead source return** only from the production file. Without it, skip both, say so, and name the export that would fill the gap. Never estimate closings from a TC fee, a per-file charge or anything else.
- **Anomalies** from the run's flags, most important first. Duplicate charges and new vendors need the P&L Detail; without it, say charge-level checks weren't run.
- **The one decision** for the owner, chosen by the rule in `references/review-rules.md`.

## 5. Write the Drafts

- **Owner brief:** one page, plain words, the format in `references/review-rules.md`. It may be shared with a partner, so no individual's pay.
- **Questions for the bookkeeper**, then **questions for the CPA**, then **questions for the broker** when a cap, fee schedule or referral question came up, each with the numbers that raised it. Route each one by `references/review-rules.md` (Who Gets Which Question).
- **Email to the bookkeeper** with those questions: Title Case subject, short and specific, signed with the owner's name or [Owner Name]. Follow the owner's voice profile when one is in the conversation; otherwise warm, plain and direct.

## 6. Guardrails

- **Numbers only from the uploads,** through the code, with the arithmetic shown. No benchmarks or "typical team" figures from memory. A benchmark appears only when a connected Sisu or QuickBooks connector returns one; name the source and date.
- **Not tax or accounting advice.** How revenue, owner pay, agent payments or anything else should be recorded or taxed goes to the CPA, and no draft proposes a recording method or tax treatment. Questions about what was recorded go to the bookkeeper. Cap and fee schedules go to the broker.
- **Privacy:** no client names or addresses, no individual agent's payouts or employee's pay, no account, card or routing numbers, even when the files contain them. Report agents and staff as totals.
- **Owner decisions stay with the owner:** state choices with their numbers; never recommend cutting a person, changing someone's split or dropping a vendor as the answer.
- **No projections:** no run rates, year-end forecasts, revenue share projections or income promises. Goals and forecasting belong in Sisu.
- **Drafts only:** never send, never edit the books, never use a connector to write.

## 7. Output, In This Order

1. **Bottom line** (three sentences max): profit for the period and the latest month, the biggest change, and the one decision.
2. **What I Used:** files, months, basis, totals check, the account fixes made, and every gap and placeholder.
3. **How Revenue Is Recorded:** the verdict, the month table, and what it changes.
4. **Company Dollar and Margin**, with the arithmetic.
5. **Expense Mix**, with the arithmetic.
6. **What Changed:** month over month, against the average, year to date, budget if given.
7. **Cost per Closing and Lead Sources**, or the line saying why they were skipped.
8. **Anomalies**, most important first.
9. **Questions for the Bookkeeper**, **Questions for the CPA** and, when a cap, fee or referral question came up, **Questions for the Broker.**
10. **Owner Brief** (draft).
11. **Email to the Bookkeeper** (draft).
12. **Check Before Sending:** every dollar amount, percentage, date, month and account name in items 10 and 11, each traced to the run, plus any placeholder.

Attach `pnl_report.md` so the owner or bookkeeper can see every calculation.
