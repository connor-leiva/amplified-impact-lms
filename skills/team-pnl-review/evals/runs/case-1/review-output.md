# Team P&L Review: Gingersnap Realty Team, January to June 2026

Independent reviewer run, November 8, 2026. Code extracted from `references/analysis-code.md` exactly as SKILL.md step 2 says, run on `gingersnap-pnl-by-month-jan-jun-2026.xlsx` with `--production sisu-transactions-download-jan-jun-2026.csv`. No map.json was needed.

## 1. Bottom Line

The team made 38,706.29 in net income from January to June 2026, a 12.6% margin on company dollar, and 6,838.03 in June. April's commission income is recorded net of agent splits, referral fees and brokerage fees while the other five months are recorded gross, so commission income doesn't compare month to month; company dollar does, and its rise from May to June (46,645.35 to 53,091.03) is the biggest change. The one decision: settle with your bookkeeper and CPA on one way to record commission income, and have April restated before using any ratio built on commission income.

## 2. What I Used

- **P&L:** Profit and Loss by month, January to June 2026 (6 months), QuickBooks Online layout, accrual basis as printed on the report. 23 accounts read.
- **Production:** Sisu transactions download. 56 closings counted with a status of Closed and a settlement date in January to June 2026. Columns used: settlement_date, status, gross_commission_amount, paid_income_to_agents, team_income_amount, referral_fee_amount, transaction_fee_amount, lead_type.
- **Totals check:** every month's accounts add up to the report's own section totals and Net Income.
- **Account fixes:** none. Every account was read the way its name says (see "How Each Account Was Read" in `pnl_report.md`). Agent Tech Fee Income (7,200.00) is read as fees charged to agents: outside company dollar, inside net income.
- **Gaps:** no P&L Detail, so duplicate charges, new vendors and misfiled charges were not checked charge by charge (only account-level patterns). No budget. No prior-year months, so no year-over-year comparison.

## 3. How Revenue Is Recorded

**Mixed.** January, February, March, May and June record gross commission with agent splits, referral fees and brokerage split and fees as costs (Cost of Goods Sold). April records commission income of 63,691.41 with no agent splits, referral fees or brokerage fees at all.

| Month | Commission income | Agent splits | Referral fees | Brokerage split and fees | Splits as share of commission | Reads as |
|---|---|---|---|---|---|---|
| Jan 2026 | $113,049 | $64,246 | $5,972 | $5,652 | 56.8% | gross |
| Feb 2026 | $93,508 | $44,381 | $0 | $4,675 | 47.5% | gross |
| Mar 2026 | $158,905 | $84,321 | $5,511 | $7,945 | 53.1% | gross |
| Apr 2026 | $63,691 | $0 | $0 | $0 | none | net |
| May 2026 | $149,069 | $81,148 | $13,822 | $7,453 | 54.4% | gross |
| Jun 2026 | $139,676 | $71,240 | $8,361 | $6,984 | 51.0% | gross |

**The production file settles it.** April's 10 closings in Sisu show GCI of 147,457.50, paid to agents 67,915.20, referral fees 8,478.00, brokerage fees 7,372.89 and a team's share of 63,691.41. April's commission income of 63,691.41 matches the team's share, not April's GCI of 147,457.50. Every other month's commission income matches that month's gross GCI in the production file. So April was recorded net, not left without its splits, and April was not a slow month: it had 10 closings, as many as March and June.

**What still compares across all six months:** company dollar, net income and margin on company dollar. A net month leaves company dollar and net income where they would have been.

**What doesn't:** commission income, agent splits, split share, anything shown as a share of gross commission, and month-over-month change in commission income. Any ratio on gross commission below leaves April out.

Brokerage split and fees run 5.0% of commission income in every gross month, so there is no sign of a cap or fee change in these months. Referral fees in the production file appear on the P&L as a cost in every gross month that has them.

## 4. Company Dollar and Margin

Company dollar = commission income - agent splits - referral fees paid - brokerage split and fees. Margin = net income / company dollar.

- Jan 2026: company dollar = 113,048.75 - 64,246.35 - 5,971.50 - 5,652.46 = 37,178.44; margin = -7,722.20 / 37,178.44 = -20.8%
- Feb 2026: company dollar = 93,507.50 - 44,381.25 - 0.00 - 4,675.38 = 44,450.87; margin = 1,161.62 / 44,450.87 = 2.6%
- Mar 2026: company dollar = 158,905.00 - 84,321.00 - 5,511.00 - 7,945.26 = 61,127.74; margin = 17,162.60 / 61,127.74 = 28.1%
- Apr 2026: company dollar = 63,691.41 - 0.00 - 0.00 - 0.00 = 63,691.41; margin = 18,673.89 / 63,691.41 = 29.3%
- May 2026: company dollar = 149,068.75 - 81,148.19 - 13,821.76 - 7,453.45 = 46,645.35; margin = 2,592.35 / 46,645.35 = 5.6%
- Jun 2026: company dollar = 139,676.25 - 71,240.40 - 8,361.00 - 6,983.82 = 53,091.03; margin = 6,838.03 / 53,091.03 = 12.9%
- Period: company dollar = 717,897.66 - 345,337.19 - 33,665.26 - 32,710.37 = 306,184.84; margin = 38,706.29 / 306,184.84 = 12.6%

| Month | Company dollar | Operating expenses | Net income | Margin on company dollar |
|---|---|---|---|---|
| Jan 2026 | $37,178 | $46,101 | -$7,722 | -20.8% |
| Feb 2026 | $44,451 | $44,489 | $1,162 | 2.6% |
| Mar 2026 | $61,128 | $45,165 | $17,163 | 28.1% |
| Apr 2026 | $63,691 | $46,218 | $18,674 | 29.3% |
| May 2026 | $46,645 | $45,253 | $2,592 | 5.6% |
| Jun 2026 | $53,091 | $47,453 | $6,838 | 12.9% |
| Period | $306,185 | $274,679 | $38,706 | 12.6% |

Also in income, outside company dollar: fees charged to agents, 7,200.00 for the period. They are part of net income.

Company dollar as a share of gross commission, gross months only (January, February, March, May, June): 242,493.43 / 654,206.25 = 37.1%. April is left out because its gross commission isn't on the books.

## 5. Expense Mix

Each category as a share of company dollar for the period (category total / company dollar).

| Category | Period total | Share of company dollar | Share of operating expenses |
|---|---|---|---|
| Lead generation | $61,300 | 61,300.00 / 306,184.84 = 20.0% | 22.3% |
| Marketing | $9,051 | 9,050.85 / 306,184.84 = 3.0% | 3.3% |
| People | $150,028 | 150,028.50 / 306,184.84 = 49.0% | 54.6% |
| Tech | $10,311 | 10,311.20 / 306,184.84 = 3.4% | 3.8% |
| Occupancy | $33,597 | 33,596.97 / 306,184.84 = 11.0% | 12.2% |
| Other | $10,391 | 10,391.03 / 306,184.84 = 3.4% | 3.8% |
| Total operating expenses | $274,679 | 274,678.55 / 306,184.84 = 89.7% | 100.0% |

People is payroll (salaries and wages, payroll taxes, health insurance), never agent splits. Lead generation is the Online Lead Programs account. Monthly operating expenses stay between $44,489 and $47,453, so profit moves with company dollar, not with spending.

## 6. What Changed

**June against May** (company dollar, because commission income doesn't compare across the April recording change):

| Line | May 2026 | Jun 2026 | Change | Change % |
|---|---|---|---|---|
| Company dollar | $46,645 | $53,091 | 53,091.03 - 46,645.35 = 6,445.68 | 13.8% |
| Lead generation | $9,800 | $12,300 | 12,300.00 - 9,800.00 = 2,500.00 | 25.5% |
| Marketing | $1,851 | $1,533 | 1,532.55 - 1,850.65 = -318.10 | -17.2% |
| People | $25,005 | $25,005 | 25,004.75 - 25,004.75 = 0.00 | 0.0% |
| Tech | $1,716 | $1,716 | 1,716.40 - 1,716.40 = 0.00 | 0.0% |
| Occupancy | $5,569 | $5,602 | 5,601.95 - 5,569.30 = 32.65 | 0.6% |
| Other | $1,312 | $1,297 | 1,297.35 - 1,311.90 = -14.55 | -1.1% |
| Net income | $2,592 | $6,838 | 6,838.03 - 2,592.35 = 4,245.68 | 163.8% |

Biggest change: company dollar, 46,645.35 to 53,091.03 (6,445.68). The largest expense move is Online Lead Programs, 9,800.00 to 12,300.00 (2,500.00).

**June against the average of January to May:** company dollar $53,091 against an average of $50,619 (+$2,472); lead generation $12,300 against $9,800 (+$2,500); net income $6,838 against $6,374 (+$464). Every other category is within $521 of its average.

**Year to date (January to June 2026):** company dollar 306,184.84; operating expenses 274,678.55; net income 38,706.29; margin 38,706.29 / 306,184.84 = 12.6%. No prior-year months are in the file, so there is no year-over-year comparison.

## 7. Cost per Closing and Lead Sources

From the 56 closings in the production file, period figures:

- Operating expenses per closing = 274,678.55 / 56 = 4,904.97
- Lead generation per closing = 61,300.00 / 56 = 1,094.64
- Company dollar per closing = 306,184.84 / 56 = 5,467.59
- Net income per closing = 38,706.29 / 56 = 691.18
- Average GCI per closing (production file) = 801,663.75 / 56 = 14,315.42

Monthly cost per closing swings with closing timing (from 4,113.91 in May to 6,355.61 in February), so the period figure is the one to use. Agent splits are not in cost per closing; they are a cost of the sale.

**Lead sources (period):**

| Source | Closings | GCI | Team's share | Spend line in the P&L | Spend | Return |
|---|---|---|---|---|---|---|
| Sphere of Influence | 19 | $266,339 | $98,004 | none | n/a | no matching spend line |
| Zippity Leads | 10 | $140,478 | $40,025 | referral fees on these closings | $42,143 | 40,025.22 / 42,143.26 = 0.95 per $1 of fees |
| PPC | 9 | $152,254 | $63,976 | none | n/a | no matching spend line |
| Open House | 7 | $85,986 | $37,644 | none | n/a | no matching spend line |
| Sign Call | 6 | $78,412 | $27,444 | none | n/a | no matching spend line |
| Past Client | 5 | $78,195 | $39,091 | none | n/a | no matching spend line |

Zippity Leads is a pay-at-close source: its cost is the referral fee on each closing, and the team's share is already after it, so the team kept 0.95 for every 1.00 paid in its fees. The Online Lead Programs account (61,300.00 for the period) doesn't name a source, so the run couldn't tie it to PPC or any other lead type in Sisu; tell me which source it pays for and I'll rerun the return for it. Lead spend and the closings it produces rarely fall in the same months, so this is a rough period view.

## 8. Anomalies

1. **April recorded net of splits** (above). The top finding, because it breaks every ratio on commission income.
2. **Online Lead Programs went from 9,800.00 to 12,300.00 a month starting June 2026** (+2,500.00 a month). A price or plan change, or a new program added to the same account.

Charge-level checks (duplicate charges, new vendors, a vendor in the wrong account) need the P&L Detail export and were not run.

## 9. Questions

**For the bookkeeper**
1. April 2026 shows commission income of 63,691.41 and no agent splits, referral fees or brokerage fees, while the other months show gross commission with those as costs. Sisu shows April's GCI at 147,457.50 and the team's share at 63,691.41. Was April recorded net of splits? Please restate it the same way as the other months.
2. Online Lead Programs went from 9,800.00 to 12,300.00 a month in June 2026. What does the extra 2,500.00 a month cover?

**For the CPA**
1. Should the team present commission income gross (agent splits, referral fees and brokerage fees as costs) or net of them, and does the choice affect anything beyond how the P&L reads?

## 10. Owner Brief (Draft)

**Owner Brief: Gingersnap Realty Team P&L, January to June 2026**

**Bottom Line:** The team made 38,706.29 in net income from January to June 2026, a 12.6% margin on company dollar, and 6,838.03 in June. April is recorded net of agent splits, referral fees and brokerage fees while the other five months are gross, so commission income doesn't compare month to month; company dollar does, and its rise from May to June (46,645.35 to 53,091.03) is the biggest change. The decision: settle on one way to record commission income with the bookkeeper and CPA, and have April restated.

**Profit:** Net income 38,706.29 on company dollar of 306,184.84 (12.6%). June: 6,838.03 on 53,091.03 (12.9%).

**How Revenue Is Recorded:** Gross in January to March, May and June; net in April (commission income of 63,691.41 matches the team's share in Sisu, not April's GCI of 147,457.50).

**Where the Money Goes:** People 49.0% of company dollar, lead generation 20.0%, occupancy 11.0%.

**What Changed:** Company dollar rose 6,445.68 from May to June. Online Lead Programs rose from 9,800.00 to 12,300.00 a month in June.

**What Needs a Look:**
- April recorded net of splits.
- Online Lead Programs up 2,500.00 a month since June.

**Cost per Closing:** 4,904.97 in operating expenses per closing (274,678.55 / 56 closings).

**The Decision:** Decide with the bookkeeper and CPA one way to record commission income, and have April restated before using any ratio built on commission income.

**With the Bookkeeper:** 2 questions sent; 1 question for the CPA.

## 11. Email to the Bookkeeper (Draft)

**Subject: Questions On The January To June 2026 P&L**

Hi [Bookkeeper Name],

I went through the January to June 2026 P&L next to our Sisu closings and have two questions.

1. April shows commission income of 63,691.41 with no agent splits, referral fees or brokerage fees. The other months show the full commission with those as costs. Sisu shows April's GCI at 147,457.50 and our share at 63,691.41, so it looks like April was recorded net. Can you confirm, and restate April the same way as the other months?
2. Online Lead Programs went from 9,800.00 to 12,300.00 a month in June. What does the extra 2,500.00 a month cover?

Once April is restated, could you send me a fresh export of the P&L by month?

Thanks,
[Owner Name]

## 12. Check Before Sending

| Item in the drafts | Where it comes from in the run |
|---|---|
| January to June 2026; Gingersnap Realty Team | What Was Read (report title and columns) |
| Net income 38,706.29; margin 12.6%; company dollar 306,184.84 | Company Dollar and Margin, Period |
| June net income 6,838.03; June company dollar 53,091.03; June margin 12.9% | Company Dollar and Margin, Jun 2026 |
| May company dollar 46,645.35; change 6,445.68 | Changes, Jun 2026 Against May 2026 (Biggest change) |
| April commission income 63,691.41; no agent splits, referral fees or brokerage fees | How Revenue Is Recorded (month table) and Flags P1 |
| April GCI 147,457.50; team's share 63,691.41 | Production, P&L Commission Income Against the Production File (Apr 2026 line) |
| People 49.0%, lead generation 20.0%, occupancy 11.0% | Expense Mix |
| Online Lead Programs 9,800.00 to 12,300.00 starting June; 2,500.00 | Flags P9 price_change; Changes, Largest account moves |
| 4,904.97 per closing; 274,678.55; 56 closings | Production, Cost per Closing (period) |
| 2 bookkeeper questions, 1 CPA question | Section 9 above |
| Placeholders: [Bookkeeper Name], [Owner Name] | Fill in before sending |

The full run, with every calculation, is in `pnl_report.md` (attached to the review).
