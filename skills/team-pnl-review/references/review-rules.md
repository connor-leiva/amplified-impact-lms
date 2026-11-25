# Review Rules

How to read the analysis run and turn it into the review. The run's thresholds are this skill's defaults, not industry standards; the owner can change any of them in map.json ("thresholds").

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

Outside company dollar, inside net income: **fees charged to agents** (desk, tech or transaction fees the team collects) and **revenue share, profit share or stock income from the brokerage**. Revenue share is paid by the brokerage on deals closed by agents the owner attracted to it, not earned on the team's own closings (`pnl-terms.md`), so counting it as commission would inflate company dollar and make splits look low.

## How Revenue Is Recorded: What to Say

- **Gross every month:** one line, then the month table. Splits as a share of commission and company dollar as a share of GCI are available.
- **Net every month (no splits anywhere):** commission income is the team's share, or agents are paid outside these books. Company dollar = commission income. Ratios on GCI need the production file.
- **Mixed:** the top finding. Name the months. With a production file, quote the reconciliation ("[Month]'s commission income of [amount] matches the team's share in the production file, not its GCI of [amount]"). Without one, give the run's "closer to" hint, labeled as a hint, and say the P&L alone can't tell a net month from a month whose splits were never entered. Then say what still compares (company dollar, net income, margin on company dollar) and what doesn't (commission income, split share, anything as a share of GCI, month-over-month change in commission income).
- **Low or high split month:** a question, never a conclusion. Possible causes: team leader's own deals, a split plan change, a team-level cap, a payout recorded in another month, or partly net recording.
- **Brokerage fees step down:** ask whether the team or its agents reached a brokerage cap or the fee schedule changed (`pnl-terms.md`, Cap). Never assert a cap.
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
4. **A new recurring charge, or a price increase on one, of $100 a month or more** (this skill's default for what's worth an owner's decision): "Keep or cancel [vendor or account] ([amount] a month since [month])." With several, the largest monthly amount.
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
