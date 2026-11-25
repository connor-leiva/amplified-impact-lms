"""Writes evals/page/sample-page.json: the practice run as the page the skill hands back (skills/README.md, Page Kit).

python3 -I skills/team-pnl-review/evals/make/make_page_sample.py

What the model writes as page.json on a run, for the practice files and prompt: every table figure from the
run (evals/runs/practice/files/pnl_report.json, the run sample.md was written from), every line of arithmetic
as pnl_report.md prints it (with "$" on its dollar amounts), and every sentence from sample.md, the graded
output, with dollar amounts as whole dollars ("$6,611") except a charge someone will look up in the books
("$486.20"). The sections follow SKILL.md's "Output, In This Order", each in the kind it names; the bottom
line (headline, findings, moves and the one decision) is in sample-words.json. Then build and check it:

    python3 skills/_page-kit/tests/check_skill_page.py skills/team-pnl-review
    node skills/_page-kit/tests/shoot_page.cjs skills/team-pnl-review/evals/page/Team-PnL-Review-Sample.html
"""
import json
import re
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
FILES = SKILL / "evals" / "runs" / "practice" / "files"
RUN = json.loads((FILES / "pnl_report.json").read_text(encoding="utf-8"))
MD = (FILES / "pnl_report.md").read_text(encoding="utf-8")
SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
CENTS = re.compile(r"(?<![\d$.,])(-?)(\d{1,3}(?:,\d{3})*\.\d{2})(?![\d%])")


def dollars(line):
    """The run's arithmetic, with "$" on every amount in cents: "-8,690.07" becomes "-$8,690.07"."""
    return CENTS.sub(lambda m: "%s$%s" % (m.group(1), m.group(2)), line)


def tc(label):
    """A line or category name from the run, in Title Case for the page ("Lead generation" to "Lead Generation")."""
    return " ".join(w if w in ("of", "and", "per") else w[:1].upper() + w[1:] for w in label.split(" "))


def mon(ym):
    return "%s %s" % (SHORT[int(ym[5:]) - 1], ym[:4])


def md_table(heading):
    """The rows of the first table under a heading of pnl_report.md, as lists of cells."""
    lines = MD.split(heading, 1)[1].splitlines()
    start = next(i for i, l in enumerate(lines) if l.startswith("|"))
    end = next((i for i in range(start, len(lines)) if not lines[i].startswith("|")), len(lines))
    return [[c.strip() for c in r.strip("|").split("|")] for r in lines[start + 2:end]]


def pct(cell):
    return float(cell.replace("%", "").split(" = ")[-1])


def used():
    return {
        "id": "used", "kind": "callouts", "label": "What I Used",
        "finding": "The P&L by month and the closed-deal export, nine months, totals check passed.",
        "items": [
            {"status": "on", "chip": "Passed", "title": "Totals Check",
             "text": "Every month's accounts add up to the report's own Net Income and section totals."},
            {"title": "P&L", "text": "PRACTICE Team P&L by Month Jan-Sep 2026.xlsx, QuickBooks Profit and Loss, Jan 2026 to Sep 2026 "
                                     "(9 months), accrual basis as printed on the report, 27 accounts."},
            {"title": "Production", "text": "PRACTICE Closed Deals Export Jan-Sep 2026.csv, 77 closings in those months. Columns used: "
                                            "Close Date, Status, GCI, Agent Split, Team Net, Referral Fee, Brokerage Fee, Lead Source. "
                                            "Left out: 2 pending deals and 1 canceled deal. Client names and addresses in the file were not used."},
            {"status": "on", "chip": "No Fixes", "title": "Account Map", "text": "Every account read by its name or parent account."},
            {"status": "quiet", "chip": "Gaps", "title": "Not In These Files",
             "text": "No P&L Detail, so charge-level checks (duplicate charges, new vendors, a vendor in the wrong account) "
                     "were not run. No budget. No prior-year months."}],
    }


def revenue():
    share = dict(re.findall(r"(\w{3} \d{4}) (\d+\.\d)%", MD.split("Brokerage split and fees as a share of commission income", 1)[1].split("\n", 1)[0]))
    split = {r[0]: pct(r[5]) for r in md_table("## How Revenue Is Recorded")}
    drop = next(f["month"] for f in RUN["flags"] if f["code"] == "brokerage_share_drop")
    rows = []
    for ym in RUN["months"]:
        m = mon(ym)
        row = {"month": m, "ym": ym, "reads": RUN["status"][ym].capitalize(), "commission": RUN["commission"][ym],
               "splits": RUN["splits"][ym], "referral": RUN["referral"][ym], "brokerage": RUN["brokerage"][ym],
               "split_share": split[m], "brokerage_share": float(share[m])}
        if ym >= drop:
            row["_status"] = "hold"
        rows.append(row)
    return {
        "id": "revenue", "kind": "table", "label": "How Revenue Is Recorded",
        "finding": "Gross every month.",
        "note": "Commission income is recorded before agent splits, and agent splits, referral fees and brokerage split and fees "
                "are all costs. Splits % and Brokerage % are each a share of commission income.",
        "callout": {"status": "on", "chip": "Months Compare", "text": "The production file agrees: **every month's commission income matches that month's GCI**."},
        "columns": [{"key": "month", "label": "Month", "type": "text", "sortKey": "ym"},
                    {"key": "reads", "label": "Reads As", "type": "text"},
                    {"key": "commission", "label": "Commission", "type": "usd"},
                    {"key": "splits", "label": "Splits", "type": "usd"},
                    {"key": "referral", "label": "Referrals", "type": "usd"},
                    {"key": "brokerage", "label": "Brokerage", "type": "usd"},
                    {"key": "split_share", "label": "Splits %", "type": "pct"},
                    {"key": "brokerage_share", "label": "Brokerage %", "type": "pct"}],
        "rows": rows, "sort": {"key": "month", "dir": "asc"}, "search": False,
        "chart": {"type": "columns", "x": "month", "label": "Brokerage split and fees as a share of commission income, by month",
                  "series": [{"key": "brokerage_share", "label": "Brokerage %"}],
                  "legend": [{"status": "hold", "label": "May to September: the step-down to ask your broker about"}]},
        "mathTitle": "What it changes",
        "math": ["Splits vary from 46.0% to 65.0% of commission income (typical 58.0%). Months with more referral-fee deals or "
                 "more of the team leader's own deals can run lower. The production file matches every month, so this doesn't "
                 "point to a recording problem.",
                 "Brokerage split and fees dropped. About 6.0% of commission income from January to April, then May 3.2%, June "
                 "2.1%, July 1.9%, August 2.2%, September 1.9%. That can mean the team or its agents reached a brokerage cap, the "
                 "fee schedule changed, or something is missing from the account. Only the broker knows the cap terms, so it goes "
                 "to the broker as a question, along with when the cap year resets."],
    }


def dollar():
    lines = [dollars(l[2:]) for l in MD.split("## Company Dollar and Margin", 1)[1].splitlines() if l.startswith("- ")]
    share = re.search(r"Company dollar as a share of gross commission \(gross months\): (.*)", MD).group(1)
    return {
        "id": "dollar", "kind": "tiles", "label": "Company Dollar and Margin",
        "finding": "The team kept $41,233 on $339,367 of company dollar, a 12.1% margin.",
        "note": "Company dollar = commission income - agent splits - referral fees paid - brokerage split and fees. "
                "Margin = net income / company dollar.",
        "tiles": [
            {"label": "Company Dollar", "value": "$339,367", "unit": "January to September 2026",
             "means": "What the team kept from **$1,076,879** of commission, after splits, referral fees and brokerage fees (31.5%)."},
            {"label": "Operating Expenses", "value": "$304,884", "unit": "January to September 2026",
             "means": "What it cost to run the team: 89.8% of company dollar."},
            {"label": "Net Income", "value": "$41,233", "unit": "January to September 2026",
             "means": "What was left: a **12.1% margin** on company dollar."},
            {"label": "Fees Charged To Agents", "value": "$6,750", "unit": "Agent Fee Income",
             "means": "Outside company dollar, inside net income."}],
        "mathTitle": "Company dollar and margin, month by month and for the period, as the run prints them",
        "math": lines + ["Company dollar as a share of gross commission (gross months): " + dollars(share)],
    }


def dollar_months():
    margins = {r[0]: pct(r[4]) for r in md_table("Company dollar = commission income")}
    rows = []
    for ym in RUN["months"]:
        row = {"month": mon(ym), "ym": ym, "cd": RUN["company_dollar"][ym], "opex": RUN["opex"][ym],
               "net": RUN["net_income"][ym], "margin": margins[mon(ym)]}
        if RUN["net_income"][ym] < 0:
            row["_status"] = "off"
        rows.append(row)
    return {
        "id": "dollar-months", "kind": "table", "label": "Company Dollar and Margin by Month",
        "finding": "A loss in each of January, February and March, then a profit every month from April.",
        "note": "Operating expenses stayed between $31,731 and $36,421 a month. Profit follows company dollar: the first "
                "quarter's company dollar of $22,799 to $26,300 a month didn't cover expenses.",
        "columns": [{"key": "month", "label": "Month", "type": "text", "sortKey": "ym"},
                    {"key": "cd", "label": "Company Dollar", "type": "usd"},
                    {"key": "opex", "label": "Operating Expenses", "type": "usd"},
                    {"key": "net", "label": "Net Income", "type": "usd"},
                    {"key": "margin", "label": "Margin", "type": "pct"}],
        "rows": rows, "sort": {"key": "month", "dir": "asc"}, "search": False,
        "chart": {"type": "columns", "x": "month", "label": "Net income by month",
                  "series": [{"key": "net", "label": "Net Income"}],
                  "legend": [{"status": "off", "label": "A month with a loss"}]},
    }


def mix():
    names = {"Lead generation": "lead_gen", "Marketing": "marketing", "People": "people", "Tech": "tech",
             "Occupancy": "occupancy", "Other": "other"}
    items, rows, lines = [], [], []
    for r in md_table("## Expense Mix"):
        lines.append(dollars("%s: %s" % (r[0], r[2])))
        if r[0].startswith("Total"):
            continue
        total = RUN["period"]["by_cat"][names[r[0]]] if r[0] in names else RUN["period"]["uncategorized"]
        items.append({"label": tc(r[0]), "text": "%s for the period, %s of operating expenses." % (r[1], r[3]),
                      "bars": [{"value": pct(r[2]), "text": "%s of company dollar" % r[2].split(" = ")[-1]}]})
        rows.append({"cat": r[0], "total": total, "share_cd": pct(r[2]), "share_opex": pct(r[3])})
    items.sort(key=lambda it: -it["bars"][0]["value"])
    return {
        "id": "mix", "kind": "bars", "label": "Expense Mix", "format": "pct",
        "finding": "People is 54.5% of company dollar, occupancy 11.7%, lead generation 11.2%.",
        "note": "People is salaries and wages, payroll taxes, health insurance, transaction coordinator fees and coaching and "
                "training. Agent splits are not in it.",
        "items": items,
        "detail": {"label": "Show The Table", "sort": {"key": "total", "dir": "desc"}, "columns": [
            {"key": "cat", "label": "Category", "type": "text"}, {"key": "total", "label": "Period Total", "type": "usd"},
            {"key": "share_cd", "label": "Share of Company Dollar", "type": "pct"},
            {"key": "share_opex", "label": "Share of Operating Expenses", "type": "pct"}], "rows": rows},
        "mathTitle": "Each category / company dollar, January to September 2026", "math": lines,
    }


def changed():
    mom = {r[0]: r for r in md_table("### Sep 2026 Against Aug 2026")}
    avg = {l: a for l, a, _ in RUN["variances"]["vs_avg"]}
    whole = lambda v: "$%s" % format(round(abs(v)), ",")
    items, rows = [], []
    for line, prev, last in RUN["variances"]["mom"]["lines"]:
        diff = round(last - prev, 2)
        word = "No change" if diff == 0 else ("Up " if diff > 0 else "Down ") + whole(diff)
        items.append({"label": tc(line), "from": whole(prev), "fromLabel": "Aug", "to": whole(last), "toLabel": "Sep",
                      "change": word, "dir": "flat" if diff == 0 else ("up" if diff > 0 else "down"),
                      "text": "January to August average: %s a month." % whole(avg[line])})
        rows.append({"line": line, "aug": prev, "sep": last, "change": dollars(mom[line][3]), "avg": avg[line]})
    return {
        "id": "changed", "kind": "deltas", "label": "What Changed",
        "finding": "Biggest change: company dollar, up $6,611 from August to September.",
        "note": "Referral fees went from $13,998 in August to $0 in September and brokerage split and fees from $2,655 to "
                "$2,360, while agent splits rose with commission income. Lead generation fell $2,645 because Google PPC came "
                "back from $3,940.85 in August to $1,296.",
        "items": items,
        "detail": {"label": "Show The Table", "columns": [
            {"key": "line", "label": "Line", "type": "text"}, {"key": "aug", "label": "Aug 2026", "type": "usd"},
            {"key": "sep", "label": "Sep 2026", "type": "usd"}, {"key": "change", "label": "Change", "type": "text"},
            {"key": "avg", "label": "Jan to Aug Average", "type": "usd"}], "rows": rows},
        "mathTitle": "Year to date",
        "math": ["Year to date (January to September 2026): company dollar $339,366.76; operating expenses $304,883.76; net "
                 "income $41,233.00; margin $41,233.00 / $339,366.76 = 12.1%.",
                 "No prior-year months are in the file, so there is no year-over-year comparison."],
    }


def closing():
    spend_md = {r[0]: r for r in md_table("### Lead Sources (period)")}
    items, rows = [], []
    for s in RUN["production"]["lead_sources"]:
        r = spend_md[s["source"]]
        if r[5] == "n/a":
            spend, ret = "No spend line in the P&L.", ""
        elif s["source"] == "Lanternfly Leads":
            spend, ret = "Spend: %s in referral fees." % r[5], " Kept $%s per $1 of fees." % r[6].split(" = ")[1].split(" per")[0]
        else:
            spend, ret = "Spend: %s." % r[5], " Returned $%s per $1 spent." % r[6].split(" = ")[1].split(" per")[0]
        items.append({"label": s["source"], "text": "%d closings, %s of GCI. %s%s" % (s["closings"], r[2], spend, ret),
                      "bars": [{"value": s["team"], "text": "%s team's share" % r[3]}]})
        rows.append({"source": s["source"], "closings": s["closings"], "gci": s["gci"], "team": s["team"],
                     "spend": "no spend line" if r[5] == "n/a" else r[5], "return": "n/a" if r[6].startswith("no matching") else dollars(r[6])})
    per = [dollars(l[2:]) for l in MD.split("### Cost per Closing (period)", 1)[1].split("\n\n", 1)[0].splitlines() if l.startswith("- ")]
    return {
        "id": "closing", "kind": "bars", "label": "Cost per Closing and Lead Sources", "format": "usd",
        "finding": "Each lead source's share for the team, from the 77 closed deals in the export.",
        "callout": {"text": "Operating expenses per closing: **$3,960** across 77 closings, with $4,407 of company dollar and "
                            "$535 of net income per closing."},
        "note": "Lanternfly Leads is pay at close: its referral fees are its cost, and the team's share is already after them. "
                "Pumpkinpatch Portal and Google PPC are paid up front; their spend is the P&L account with the same name. Spend "
                "in one month often produces closings months later, so treat this as a rough nine-month view, not a verdict on "
                "any source.",
        "items": items,
        "detail": {"label": "Show The Table", "sort": {"key": "closings", "dir": "desc"}, "columns": [
            {"key": "source", "label": "Source", "type": "text"}, {"key": "closings", "label": "Closings", "type": "num"},
            {"key": "gci", "label": "GCI", "type": "usd"}, {"key": "team", "label": "Team's Share", "type": "usd"},
            {"key": "spend", "label": "Spend", "type": "text"}, {"key": "return", "label": "Return", "type": "text"}], "rows": rows},
        "mathTitle": "Cost per closing, January to September 2026",
        "math": per + ["Monthly, operating expenses per closing ran from $3,108.33 (May, 11 closings) to $5,457.03 (January, 6 "
                       "closings); the period figure is the one to use."],
    }


AFTER = [
    {"id": "anomalies", "kind": "callouts", "label": "Anomalies",
     "finding": "Five things to look at, most important first.",
     "note": "Charge-level checks need the QuickBooks Profit and Loss Detail export for the same months.",
     "items": [
         {"status": "hold", "chip": "Ask The Broker", "title": "Brokerage Split and Fees Dropped",
          "text": "From 6.0% of commission income (January to April) to 3.2% in May and 1.9% to 2.2% since. A cap, a fee change or "
                  "something missing? A question for your broker (below)."},
         {"status": "hold", "title": "Uncategorized Expense", "text": "$486.20 in July 2026."},
         {"status": "hold", "title": "New Recurring Charge",
          "text": "Software & Subscriptions:Video Editing App, $79 a month since June 2026."},
         {"status": "hold", "title": "One-Month Jump",
          "text": "Google PPC was $3,940.85 in August 2026 against a usual $1,264 (+$2,677), back to $1,296 in September."},
         {"status": "hold", "title": "Price Change",
          "text": "Pumpkinpatch Portal went from $2,500 to $3,000 a month starting July 2026."}]},
    {"id": "q-bookkeeper", "kind": "questions", "label": "Questions for the Bookkeeper",
     "finding": "Four questions about what was recorded, each with the numbers that raised it.",
     "items": [
         {"tag": "Uncategorized Expense", "ask": "Uncategorized Expense holds $486.20 in July. What is it, and which account should it move to?",
          "why": "Anomaly: an uncategorized expense, $486.20 in July 2026."},
         {"tag": "Video Editing App", "ask": "Video Editing App started in June at $79 a month. Which subscription is it, and is it meant to continue?",
          "why": "Anomaly: a new recurring charge since June 2026."},
         {"tag": "Google PPC in August", "ask": "Google PPC was $3,940.85 in August, $2,677 above its usual month. Was that one campaign, or a billing catch-up?",
          "why": "Anomaly: a one-month jump, back to $1,296 in September."},
         {"tag": "Brokerage Split and Fees", "ask": "Brokerage split and fees dropped from 6.0% of commission income to 3.2% in May and 1.9% to 2.2% since. "
                                                    "Is anything missing from that account from May on? (I'm asking the broker separately about a cap or fee change.)",
          "why": "The step-down marked Watch in How Revenue Is Recorded."}]},
    {"id": "q-cpa", "kind": "prose", "label": "Questions for the CPA",
     "finding": "None from these numbers.", "paragraphs": ["Nothing in this run asks how something should be recorded or taxed."]},
    {"id": "q-broker", "kind": "questions", "label": "Questions for the Broker",
     "finding": "One question about the brokerage cap.",
     "items": [
         {"tag": "Cap or Fee Change",
          "ask": "Our brokerage split and fees were 6.0% of commission income from January to April 2026, 3.2% in May and 1.9% to "
                 "2.2% from June to September. Did the team or its agents reach a cap in May, or did the fee schedule change? "
                 "When does the cap year reset?",
          "why": "Only the broker knows the cap terms and when the cap year resets."}]},
    {"id": "drafts", "kind": "drafts", "label": "Owner Brief and Email to the Bookkeeper",
     "finding": "Two drafts for you to read first. The brief may be shared with a partner, so it holds no one's pay.",
     "drafts": [
         {"label": "Owner Brief", "style": "memo", "to": "You, and a partner if you share it", "channel": "One page",
          "subject": "Owner Brief: Pinecone & Puddle Home Team P&L, January to September 2026",
          "body": "Bottom Line: We kept $41,233 in net income for January to September, a 12.1% margin on company dollar, and "
                  "$19,091 in September (36.9%), after losses in January, February and March. Brokerage split and fees fell from "
                  "6.0% of commission income in January to April to between 1.9% and 3.2% from May on. Our decision: keep or "
                  "cancel Pumpkinpatch Portal at $3,000 a month.\n"
                  "Profit: Period net income $41,233 on company dollar of $339,367 (12.1%). September net income $19,091 on "
                  "company dollar of $51,747 (36.9%).\n"
                  "How Revenue Is Recorded: Gross every month, and it matches our closed-deal export month by month.\n"
                  "Where the Money Goes: People 54.5% of company dollar, occupancy 11.7%, lead generation 11.2%.\n"
                  "What Changed: Company dollar rose from $45,136 in August to $51,747 in September; Google PPC came back down "
                  "from its August jump.\n"
                  "What Needs a Look:\n"
                  "- Brokerage fees down since May: asking the broker whether we reached a cap or the fee schedule changed.\n"
                  "- $486.20 uncategorized in July.\n"
                  "- Video Editing App, new at $79 a month since June.\n"
                  "- Google PPC at $3,940.85 in August.\n"
                  "Cost per Closing: $3,960 in operating expenses per closing across 77 closings, with $4,407 of company "
                  "dollar and $535 of net income per closing.\n"
                  "Lead Sources: Google PPC returned $3.54 per $1 spent and Pumpkinpatch Portal $1.79; Lanternfly Leads kept $0.62 "
                  "per $1 of referral fees.\n"
                  "The Decision: Keep or cancel Pumpkinpatch Portal ($3,000 a month since July; it was $2,500). For January "
                  "to September it cost $24,000 and its 16 closings brought the team $66,931.\n"
                  "With the Bookkeeper: 4 questions to send; 1 question for the broker."},
         {"label": "Email to the Bookkeeper", "to": "[Bookkeeper Name]", "channel": "Email draft",
          "subject": "Questions On The January To September P&L",
          "body": "Hi [Bookkeeper Name],\n\n"
                  "I went through the January to September P&L against our closed-deal export. A few questions:\n\n"
                  "1. Uncategorized Expense has $486.20 in July. What is it, and where should it go?\n"
                  "2. Video Editing App started in June at $79 a month. Which subscription is it?\n"
                  "3. Google PPC was $3,940.85 in August, well above its usual month. Was that one campaign, or a billing catch-up?\n"
                  "4. Brokerage split and fees dropped to 3.2% of commission income in May and 1.9% to 2.2% since, from 6.0% "
                  "before. Is anything missing from that account from May on?\n\n"
                  "Once the July item is moved, could you send an updated P&L by month as Excel?\n\n"
                  "Thanks,\n[Owner Name]",
          "flag": "Fill in [Bookkeeper Name] and [Owner Name] before sending."}]},
    {"id": "check", "kind": "checklist", "label": "Check Before Sending",
     "finding": "Every figure in the drafts, traced to the analysis run (pnl_report.md), in the section named.",
     "items": [
         {"text": "Period net income and margin: $41,233, 12.1%", "source": "Company Dollar and Margin, Period"},
         {"text": "Period company dollar: $339,367", "source": "Company Dollar and Margin, Period"},
         {"text": "September net income, company dollar, margin: $19,091, $51,747, 36.9%", "source": "Company Dollar and Margin, Sep 2026"},
         {"text": "August company dollar: $45,136", "source": "Changes"},
         {"text": "Referral fees $13,998 (Aug) to $0 (Sep); brokerage $2,655 to $2,360",
          "source": "Company Dollar and Margin, Aug and Sep 2026 lines"},
         {"text": "Months with a loss: January, February, March", "source": "Company Dollar and Margin table"},
         {"text": "Brokerage share: 6.0% (Jan to Apr), 3.2% in May, 1.9% to 2.2% since",
          "source": "How Revenue Is Recorded; Flags (brokerage_share_drop)"},
         {"text": "Expense shares: People 54.5%, occupancy 11.7%, lead generation 11.2%", "source": "Expense Mix"},
         {"text": "Uncategorized: $486.20, July 2026", "source": "Flags (uncategorized)"},
         {"text": "Video Editing App: $79 a month since June 2026", "source": "Flags (new_recurring_account)"},
         {"text": "Google PPC: $3,940.85 in August; usual $1,264; +$2,677", "source": "Flags (spike)"},
         {"text": "Pumpkinpatch Portal: $2,500 to $3,000 since July 2026; $24,000 spend; 16 closings; $66,931 team's share",
          "source": "Flags (price_change); Production, Lead Sources"},
         {"text": "Cost per closing: $3,960; $4,407 and $535 per closing; 77 closings", "source": "Production, Cost per Closing"},
         {"text": "Lead source returns: $3.54, $1.79, $0.62", "source": "Production, Lead Sources"},
         {"text": "Placeholders: [Bookkeeper Name], [Owner Name]", "source": "fill in before sending"},
         {"text": "Confirm the cap question with your broker before treating the lower brokerage fees as permanent.",
          "source": "your broker"}]},
]


def main():
    p = RUN["period"]
    page = {
        "id": "team-pnl-review:pinecone-and-puddle:2026-09",
        "report": "Team P&L Review",
        "subtitle": "Pinecone & Puddle Home Team, January to September 2026, from the QuickBooks P&L and the closed-deal export.",
        "sample": "Practice File: Made-Up Example",
        "meta": [{"label": "Team", "value": "Pinecone & Puddle Home Team"},
                 {"label": "Period", "value": "Jan to Sep 2026, 9 months"},
                 {"label": "Basis", "value": "Accrual, as printed"},
                 {"label": "Closings", "value": "77, from the closed-deal export"},
                 {"label": "Totals Check", "value": "Passed"}],
        "dataCheck": list(RUN["checks"]),
        "headline": [],
        "keyNumbers": [
            {"label": "Net Income", "value": "$41,233", "means": "Kept January to September: a **12.1% margin** on company dollar."},
            {"label": "September Net Income", "value": "$19,091", "delta": {"dir": "up", "text": "Up $9,626 from August"},
             "means": "A 36.9% margin on $51,747 of company dollar."},
            {"label": "Company Dollar", "value": "$339,367", "means": "What the team kept from commission, after splits and fees."},
            {"label": "Brokerage Fees In September", "value": "1.9%", "status": "hold", "chip": "Watch",
             "delta": {"dir": "down", "text": "From 6.0% in January to April"}, "means": "Of commission income. **Ask your broker** why."}],
        "sections": [used(), revenue(), dollar(), dollar_months(), mix(), changed(), closing()] + AFTER,
        "stamp": "Team P&L Review",
        "closing": "Every figure comes from the analysis run on your files, with its arithmetic. pnl_report.md holds every calculation, "
                   "to share with your bookkeeper.",
    }
    out = SKILL / "evals" / "page" / "sample-page.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(page, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", out.relative_to(SKILL), len(page["sections"]), "sections")


if __name__ == "__main__":
    main()
