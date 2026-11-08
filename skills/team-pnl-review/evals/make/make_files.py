#!/usr/bin/env python3
"""Make the practice files and eval files for team-pnl-review. Everything is made up and deterministic
(seeded), so a rerun writes the same numbers.

  python3 -I evals/make/make_files.py SKILL_DIR

Writes:
  practice/PRACTICE Team P&L by Month Jan-Sep 2026.xlsx       QuickBooks Online style P&L by month
  practice/PRACTICE Closed Deals Export Jan-Sep 2026.csv      brokerage back-office style closed-deal export
  evals/files/case1/gingersnap-pnl-by-month-jan-jun-2026.xlsx  April recorded net of splits, every other month gross
  evals/files/case1/sisu-transactions-download-jan-jun-2026.csv
  evals/files/case2/marmalade-pnl-by-month-jan-sep-2026.xlsx   built from the detail below
  evals/files/case2/marmalade-pnl-detail-jan-sep-2026.xlsx     a duplicated CRM charge, a new recurring dialer
  evals/files/case3/butterscotch-profit-and-loss-jan-oct-2026.pdf  QuickBooks Desktop style PDF, no production file
  evals/make/planted/*.json                                    what each file plants, for grading
"""
import csv
import json
import random
import subprocess
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font

MARK = "PRACTICE FILE: made-up example"
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
               "October", "November", "December"]
STREETS = ["Puddleduck Way", "Gumdrop Ct", "Snickerdoodle Ln", "Marshmallow Dr", "Pinwheel Pl", "Teakettle Rd",
           "Bumblebee Cir", "Lollipop Loop", "Jellybean Row", "Waffle Iron Ave", "Pumpernickel St", "Kazoo Ct"]
CLIENT_FIRST = ["Rosie", "Milo", "Pippa", "Otis", "Hazel", "Fitz", "Wren", "Bram", "Tilly", "Gus", "Posy", "Rufus"]
CLIENT_LAST = ["Rutabaga", "Crumpet", "Noodlewood", "Fizzlebottom", "Puddingstone", "Wafflesworth",
               "Bumbleberry", "Tinkerpot", "Marmaduke", "Sprinkleton", "Gingersnap", "Muffintop"]


def r2(x):
    return round(x + 1e-9, 2)


# ---------------------------------------------------------------------------------------------------
# P&L trees. A node is ("leaf", name, [monthly values]) or ("group", name, [children]).

def leaf(name, vals):
    return ("leaf", name, [r2(v) for v in vals])


def group(name, children):
    return ("group", name, children)


def total(node, n):
    if node[0] == "leaf":
        return node[2]
    out = [0.0] * n
    for c in node[2]:
        for i, v in enumerate(total(c, n)):
            out[i] += v
    return [r2(v) for v in out]


def sum_nodes(nodes, n):
    out = [0.0] * n
    for nd in nodes:
        for i, v in enumerate(total(nd, n)):
            out[i] += v
    return [r2(v) for v in out]


def qbo_rows(sections, n):
    """QuickBooks Online P&L rows: (level, label, values or None, bold). Values include the Total column."""
    rows = []

    def emit(node, level):
        if node[0] == "leaf":
            rows.append((level, node[1], node[2] + [r2(sum(node[2]))], False))
        else:
            rows.append((level, node[1], None, False))
            for c in node[2]:
                emit(c, level + 1)
            t = total(node, n)
            rows.append((level, "Total " + node[1], t + [r2(sum(t))], True))

    inc, cogs, exp, oinc, oexp = (sections.get(k, []) for k in ("income", "cogs", "expense", "other_income", "other_expense"))
    ti, tc, te, toi, toe = (sum_nodes(x, n) for x in (inc, cogs, exp, oinc, oexp))
    withtot = lambda v: v + [r2(sum(v))]
    rows.append((0, "Income", None, True))
    for nd in inc:
        emit(nd, 1)
    rows.append((0, "Total Income", withtot(ti), True))
    if cogs:
        rows.append((0, "Cost of Goods Sold", None, True))
        for nd in cogs:
            emit(nd, 1)
        rows.append((0, "Total Cost of Goods Sold", withtot(tc), True))
    gp = [r2(a - b) for a, b in zip(ti, tc)]
    rows.append((0, "Gross Profit", withtot(gp), True))
    rows.append((0, "Expenses", None, True))
    for nd in exp:
        emit(nd, 1)
    rows.append((0, "Total Expenses", withtot(te), True))
    noi = [r2(a - b) for a, b in zip(gp, te)]
    rows.append((0, "Net Operating Income", withtot(noi), True))
    net = noi
    if oinc or oexp:
        if oinc:
            rows.append((0, "Other Income", None, True))
            for nd in oinc:
                emit(nd, 1)
            rows.append((0, "Total Other Income", withtot(toi), True))
        if oexp:
            rows.append((0, "Other Expenses", None, True))
            for nd in oexp:
                emit(nd, 1)
            rows.append((0, "Total Other Expenses", withtot(toe), True))
        noth = [r2(a - b) for a, b in zip(toi, toe)]
        rows.append((0, "Net Other Income", withtot(noth), True))
        net = [r2(a + b) for a, b in zip(noi, noth)]
    rows.append((0, "Net Income", withtot(net), True))
    return rows, net


def write_qbo_xlsx(path, company, title, period, labels, sections, footer):
    n = len(labels)
    rows, net = qbo_rows(sections, n)
    wb = Workbook()
    ws = wb.active
    ws.title = "Profit and Loss"
    ws.append([MARK])
    ws.append([company])
    ws.append([title])
    ws.append([period])
    ws.append([])
    ws.append([""] + labels + ["Total"])
    for c in ws[6]:
        c.font = Font(bold=True)
        c.alignment = Alignment(horizontal="center")
    for level, label, vals, bold in rows:
        ws.append([label] + ([v for v in vals] if vals else []))
        r = ws.max_row
        ws.cell(r, 1).alignment = Alignment(indent=level)
        if bold:
            ws.cell(r, 1).font = Font(bold=True)
        for ci in range(2, n + 3):
            ws.cell(r, ci).number_format = "#,##0.00;(#,##0.00)"
    ws.append([])
    ws.append([footer])
    ws.column_dimensions["A"].width = 44
    for ci in range(2, n + 3):
        ws.column_dimensions[ws.cell(6, ci).column_letter].width = 13
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
    return net


# ---------------------------------------------------------------------------------------------------
# Deals

def make_deals(rng, year, counts, agents, sources, tl_agent, split_pct, ref_pct, brokerage):
    """Closed deals, one row per side. brokerage(deal, running_total) returns that deal's brokerage fee."""
    deals = []
    running = 0.0
    for mi, cnt in enumerate(counts):
        days = sorted(rng.randint(2, 28) for _ in range(cnt))
        for d in days:
            price = rng.randrange(285000, 735000, 500)
            rate = rng.choice([0.025, 0.0275, 0.03])
            gci = r2(price * rate)
            agent = rng.choices([a for a, _ in agents], weights=[w for _, w in agents])[0]
            src = rng.choices([s for s, _ in sources], weights=[w for _, w in sources])[0]
            ref = r2(gci * ref_pct.get(src, 0.0))
            brk = r2(brokerage(gci, running))
            running += brk
            agent_paid = 0.0 if agent == tl_agent else r2((gci - ref) * split_pct)
            team = r2(gci - ref - brk - agent_paid)
            deals.append({
                "date": date(year, mi + 1, d), "price": price, "gci": gci, "agent": agent, "source": src,
                "referral": ref, "brokerage": brk, "agent_paid": agent_paid, "team": team,
                "side": rng.choice(["Buyer", "Seller"]),
                "address": f"{rng.randint(100, 9899)} {rng.choice(STREETS)}",
                "client": f"{rng.choice(CLIENT_FIRST)} {rng.choice(CLIENT_LAST)}",
            })
    return deals


def by_month(deals, key, months, year):
    out = [0.0] * months
    for d in deals:
        if d["date"].year == year and d["date"].month <= months:
            out[d["date"].month - 1] += d[key]
    return [r2(v) for v in out]


def counts_by_month(deals, months):
    out = [0] * months
    for d in deals:
        out[d["date"].month - 1] += 1
    return out


# ---------------------------------------------------------------------------------------------------
# Practice: Pinecone & Puddle Home Team, Jan to Sep 2026, gross every month, brokerage cap reached in August

def practice(skill):
    rng = random.Random(20261)
    n, year = 9, 2026
    agents = [("Tessa Teaspoon", 3), ("Ollie Oatcake", 3), ("Juniper Jellybean", 2), ("Barnaby Biscuit", 2),
              ("Marigold Fern", 1.4)]
    sources = [("Lanternfly Leads", 22), ("Pumpkinpatch Portal", 20), ("Google PPC", 12), ("Sphere", 18),
               ("Past Client", 14), ("Open House", 6), ("Agent Generated", 8)]
    cap = 26000.0

    def brokerage(gci, running):
        fee = gci * 0.06
        if running >= cap:
            return 295.0
        return min(fee, cap - running) if running + fee > cap else fee

    deals = make_deals(rng, year, [6, 6, 8, 9, 11, 10, 10, 9, 8], agents, sources, "Marigold Fern", 0.55,
                       {"Lanternfly Leads": 0.35}, brokerage)
    closings = counts_by_month(deals, n)
    gci = by_month(deals, "gci", n, year)
    sections = {
        "income": [leaf("Commission Income", gci), leaf("Agent Fee Income", [750] * n)],
        "cogs": [
            leaf("Agent Commission Splits", by_month(deals, "agent_paid", n, year)),
            leaf("Brokerage Split & Fees", by_month(deals, "brokerage", n, year)),
            leaf("Referral Fees Paid", by_month(deals, "referral", n, year)),
        ],
        "expense": [
            group("Advertising & Marketing", [
                group("Online Lead Programs", [
                    leaf("Pumpkinpatch Portal", [2500, 2500, 2500, 2500, 2500, 2500, 3000, 3000, 3000]),
                    leaf("Google PPC", [1180.42, 1225.10, 1198.77, 1240.05, 1302.66, 1288.19, 1315.40, 3940.85, 1296.33]),
                ]),
                leaf("Listing Photos & Signs", [640, 615, 880, 925, 1105, 990, 1010, 920, 845]),
                leaf("Postcards & Mailers", [450] * n),
                leaf("Client Appreciation", [180, 245, 210, 260, 395, 310, 240, 285, 330]),
            ]),
            group("Payroll Expenses", [
                leaf("Salaries & Wages", [8400] * n),
                leaf("Payroll Taxes", [642.60] * n),
            ]),
            leaf("Transaction Coordinator Fees", [350 * c for c in closings]),
            group("Software & Subscriptions", [
                leaf("CRM", [899] * n),
                leaf("Dialer", [249] * n),
                leaf("Website & IDX", [199] * n),
                leaf("Video Editing App", [0, 0, 0, 0, 0, 79, 79, 79, 79]),
            ]),
            group("Rent & Office", [
                leaf("Rent", [2800] * n),
                leaf("Utilities", [236.18, 228.40, 201.77, 188.62, 179.05, 203.90, 241.33, 238.71, 207.46]),
            ]),
            leaf("Dues & Licenses", [1140, 0, 0, 1140, 0, 0, 1140, 0, 0]),
            leaf("Insurance - E&O", [385] * n),
            leaf("Professional Fees", [650] * n),
            leaf("Meals", [164.20, 212.75, 188.40, 301.15, 256.80, 172.35, 233.90, 198.60, 244.05]),
            leaf("Bank Fees", [27.50, 31.00, 25.00, 38.75, 29.25, 33.50, 26.00, 35.25, 30.00]),
            leaf("Uncategorized Expense", [0, 0, 0, 0, 0, 0, 486.20, 0, 0]),
        ],
    }
    labels = [f"{MON[i]} {year}" for i in range(n)]
    out = Path(skill) / "practice"
    net = write_qbo_xlsx(out / "PRACTICE Team P&L by Month Jan-Sep 2026.xlsx", "Pinecone & Puddle Home Team",
                         "Profit and Loss", "January - September, 2026", labels, sections,
                         "Accrual Basis Monday, October 5, 2026 08:42 AM GMT-06:00")
    # Closed-deal export, brokerage back-office style, plus two pendings and one cancelled deal that must be left out.
    rows = []
    for d in deals:
        rows.append([d["date"].strftime("%m/%d/%Y"), "Closed", d["address"], d["client"], d["agent"], d["side"],
                     f"{d['price']:.2f}", f"{d['gci']:.2f}", f"{d['referral']:.2f}", f"{d['brokerage']:.2f}",
                     f"{d['agent_paid']:.2f}", f"{d['team']:.2f}", d["source"]])
    rows.append(["10/16/2026", "Pending", "4410 Kazoo Ct", "Posy Sprinkleton", "Tessa Teaspoon", "Buyer", "512000.00",
                 "14080.00", "0.00", "295.00", "7744.00", "6041.00", "Sphere"])
    rows.append(["10/23/2026", "Pending", "771 Gumdrop Ct", "Gus Tinkerpot", "Ollie Oatcake", "Seller", "468500.00",
                 "12883.75", "4509.31", "295.00", "4605.95", "3473.49", "Lanternfly Leads"])
    rows.append(["09/18/2026", "Cancelled", "2290 Teakettle Rd", "Hazel Marmaduke", "Juniper Jellybean", "Buyer",
                 "399000.00", "9975.00", "0.00", "0.00", "0.00", "0.00", "Google PPC"])
    with open(out / "PRACTICE Closed Deals Export Jan-Sep 2026.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([MARK])
        w.writerow(["Close Date", "Status", "Property Address", "Client", "Agent", "Side", "Sale Price", "GCI",
                    "Referral Fee", "Brokerage Fee", "Agent Split", "Team Net", "Lead Source"])
        w.writerows(rows)
    cap_month = next((d["date"].month for d in deals if d["brokerage"] == 295.0), None)
    return {
        "closings_by_month": closings, "closings_total": sum(closings), "gci_by_month": gci,
        "net_income_by_month": net, "brokerage_cap_first_flat_fee_month": cap_month,
        "planted": ["Video Editing App new recurring from Jun at 79", "Google PPC spike in Aug (3940.85)",
                    "Pumpkinpatch Portal up from 2500 to 3000 in Jul", "Uncategorized Expense 486.20 in Jul",
                    "brokerage fees drop to a flat 295 per deal after the made-up cap", "2 pending and 1 cancelled rows to exclude",
                    "Lanternfly Leads is pay at close: cost is the referral fee", "client names and addresses in the export"],
    }


# ---------------------------------------------------------------------------------------------------
# Case 1: Gingersnap Realty Team, Jan to Jun 2026. April's commission income is the team's share (net of
# splits, referral fees and brokerage fees); every other month is gross GCI with those costs in COGS.

def case1(skill):
    rng = random.Random(20262)
    n, year = 6, 2026
    agents = [("Pippa Pancake", 3), ("Wendell Wafflecone", 3), ("Dot Dumpling", 2), ("Ferris Fudgeworth", 2),
              ("Gilda Gingersnap", 1.2)]
    sources = [("Zippity Leads", 25), ("Sphere of Influence", 25), ("Past Client", 15), ("Sign Call", 10),
               ("Open House", 10), ("PPC", 15)]
    deals = make_deals(rng, year, [8, 7, 10, 10, 11, 10], agents, sources, "Gilda Gingersnap", 0.6,
                       {"Zippity Leads": 0.3}, lambda g, run: g * 0.05)
    gci = by_month(deals, "gci", n, year)
    splits = by_month(deals, "agent_paid", n, year)
    ref = by_month(deals, "referral", n, year)
    brk = by_month(deals, "brokerage", n, year)
    team = by_month(deals, "team", n, year)
    apr = 3
    income = list(gci)
    income[apr] = team[apr]
    s2, r2_, b2 = list(splits), list(ref), list(brk)
    s2[apr] = r2_[apr] = b2[apr] = 0.0
    sections = {
        "income": [leaf("4000 Commission Income", income), leaf("4100 Agent Tech Fee Income", [1200] * n)],
        "cogs": [leaf("5000 Agent Commission Splits", s2), leaf("5100 Referral Fees Paid", r2_),
                 leaf("5200 Brokerage Split & Fees", b2)],
        "expense": [
            group("6000 Advertising & Marketing", [
                leaf("6010 Online Lead Programs", [5800, 5800, 5800, 5800, 5800, 7300]),
                leaf("6020 Signs & Print", [410.55, 388.20, 512.75, 466.10, 530.40, 498.85]),
                leaf("6030 Listing Photography", [650, 520, 845, 780, 910, 715]),
                leaf("6040 Client Gifts", [295.40, 180.15, 342.60, 276.90, 410.25, 318.70]),
            ]),
            group("6100 Payroll Expenses", [
                leaf("6110 Salaries & Wages", [9800] * n),
                leaf("6120 Payroll Taxes", [749.70] * n),
            ]),
            group("6200 Software & Subscriptions", [
                leaf("6210 CRM", [1050] * n),
                leaf("6220 Dialer", [349] * n),
                leaf("6230 Transaction Management", [199] * n),
                leaf("6240 Other Software", [118.40, 118.40, 131.20, 118.40, 118.40, 118.40]),
            ]),
            leaf("6300 Rent", [3200] * n),
            leaf("6310 Utilities", [214.36, 236.10, 198.44, 176.82, 169.30, 201.95]),
            leaf("6400 Dues & Licenses", [1320, 0, 0, 1320, 0, 0]),
            leaf("6410 Insurance - E&O", [410] * n),
            leaf("6420 Professional Fees", [600] * n),
            leaf("6430 Meals", [244.18, 198.65, 287.40, 231.55, 266.90, 252.35]),
            leaf("6440 Bank Fees", [35] * n),
        ],
    }
    labels = [f"{MON[i]} {year}" for i in range(n)]
    out = Path(skill) / "evals" / "files" / "case1"
    net = write_qbo_xlsx(out / "gingersnap-pnl-by-month-jan-jun-2026.xlsx", "Gingersnap Realty Team",
                         "Profit and Loss", "January - June, 2026", labels, sections,
                         "Accrual Basis Wednesday, July 8, 2026 10:15 AM GMT-04:00")
    with open(out / "sisu-transactions-download-jan-jun-2026.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([MARK])
        w.writerow(["settlement_date", "status", "agent_name", "first_name", "last_name", "property_address_line_1",
                    "transaction_amount", "gross_commission_amount", "referral_fee_amount", "transaction_fee_amount",
                    "paid_income_to_agents", "team_income_amount", "lead_type"])
        for d in deals:
            fn, ln = d["client"].split(" ", 1)
            w.writerow([d["date"].isoformat(), "Closed", d["agent"], fn, ln, d["address"], f"{d['price']:.2f}",
                        f"{d['gci']:.2f}", f"{d['referral']:.2f}", f"{d['brokerage']:.2f}", f"{d['agent_paid']:.2f}",
                        f"{d['team']:.2f}", d["source"]])
    return {"gci_by_month": gci, "splits_by_month": splits, "referral_by_month": ref, "brokerage_by_month": brk,
            "team_share_by_month": team, "pnl_commission_income": income, "net_income_by_month": net,
            "closings_by_month": counts_by_month(deals, n),
            "planted": ["April commission income equals the production file's team share; splits, referral and brokerage lines are zero in April",
                        "Online Lead Programs up from 5800 to 7300 in June", "client names in the production file"]}


# ---------------------------------------------------------------------------------------------------
# Case 2: Marmalade Key Team, Jan to Sep 2026, a P&L by month built from a P&L Detail. A CRM charge is
# duplicated in August, a dialer starts in July and recurs, a lead vendor charge lands in Office Supplies.

def case2(skill):
    rng = random.Random(20263)
    n, year = 9, 2026
    agents = [("Tessa Teaspoon", 3), ("Ollie Oatcake", 3), ("Juniper Jellybean", 2)]
    sources = [("Lanternfly Leads", 40), ("Sphere", 35), ("Past Client", 25)]
    deals = make_deals(rng, year, [5, 5, 6, 7, 8, 8, 7, 7, 6], agents, sources, None, 0.6, {}, lambda g, run: g * 0.06)
    tx = defaultdict(list)  # account path -> list of (date, type, num, name, memo, amount)
    chk = [1040]

    def num():
        chk[0] += 1
        return str(chk[0])

    for d in deals:
        tx[("income", "Commission Income")].append((d["date"], "Deposit", "", "Cobblestone Brokerage Co.",
                                                    f"Closing {d['address']}", d["gci"]))
        tx[("cogs", "Brokerage Split & Fees")].append((d["date"], "Bill", "", "Cobblestone Brokerage Co.",
                                                      f"Brokerage split {d['address']}", d["brokerage"]))
        tx[("cogs", "Agent Commission Splits")].append((d["date"], "Check", num(), d["agent"],
                                                       f"Commission {d['address']}", d["agent_paid"]))
    for m in range(1, n + 1):
        tx[("income", "Agent Fee Income")].append((date(year, m, 1), "Deposit", "", "Agent tech fees", "Monthly tech fees", 450.00))
        tx[("expense", "Software & Subscriptions", "CRM")].append((date(year, m, 3), "Expense", "", "Snapdragon CRM", "Monthly plan", 599.00))
        tx[("expense", "Software & Subscriptions", "Document Signing")].append((date(year, m, 9), "Expense", "", "Dottedline Docs", "Monthly plan", 129.00))
        if m >= 7:
            tx[("expense", "Software & Subscriptions", "Dialer")].append((date(year, m, 12), "Expense", "", "Pinecone Dialer", "Monthly seats", 349.00))
        if m != 6:
            tx[("expense", "Advertising & Marketing", "Online Lead Programs")].append((date(year, m, 5), "Expense", "", "Lanternfly Leads", "Monthly lead budget", 2000.00))
        else:
            tx[("expense", "Advertising & Marketing", "Online Lead Programs")].append((date(year, m, 5), "Expense", "", "Lanternfly Leads", "Monthly lead budget", 750.00))
            tx[("expense", "Office Supplies")].append((date(year, m, 5), "Expense", "", "Lanternfly Leads", "Card charge", 1250.00))
        tx[("expense", "Advertising & Marketing", "Postcards")].append((date(year, m, 15), "Expense", "", "Moonbeam Postcards", "Farm mailer", 420.00))
        tx[("expense", "Advertising & Marketing", "Listing Photography")].append((date(year, m, 18), "Expense", "", "Glimmerglass Photo", "Listing shoots", r2(rng.choice([350, 525, 700, 875]))))
        tx[("expense", "Rent")].append((date(year, m, 1), "Check", num(), "Quillfeather Properties LLC", "Office rent", 3100.00))
        tx[("expense", "Payroll Expenses", "Salaries & Wages")].append((date(year, m, 15), "Payroll Check", "", "Clementine Quill", "Payroll", 2275.00))
        tx[("expense", "Payroll Expenses", "Salaries & Wages")].append((date(year, m, 28), "Payroll Check", "", "Clementine Quill", "Payroll", 2275.00))
        tx[("expense", "Payroll Expenses", "Payroll Taxes")].append((date(year, m, 28), "Tax Payment", "", "IRS", "Employer taxes", 348.08))
        tx[("expense", "Transaction Coordinator Fees")].append((date(year, m, 27), "Bill", "", "Teacup Transaction Services", "TC files", 325.00 * sum(1 for d in deals if d["date"].month == m)))
        tx[("expense", "Insurance - E&O")].append((date(year, m, 20), "Expense", "", "Fiddlehead Mutual", "E&O premium", 365.00))
        tx[("expense", "Bank Fees")].append((date(year, m, 30 if m != 2 else 27), "Expense", "", "Bank", "Service charge", 30.00))
        tx[("expense", "Meals")].append((date(year, m, 22), "Expense", "", "The Soggy Biscuit Cafe", "Team lunch", r2(rng.choice([142.35, 188.10, 96.40, 210.75, 164.90]))))
    # Planted anomalies
    tx[("expense", "Software & Subscriptions", "CRM")].append((date(year, 8, 4), "Expense", "", "Snapdragon CRM", "Monthly plan", 599.00))
    tx[("expense", "Software & Subscriptions", "Video")].append((date(year, 5, 14), "Expense", "", "Hootenanny Video", "One-time template pack", 59.00))
    tx[("expense", "Uncategorized Expense")].append((date(year, 9, 24), "Expense", "", "SQ *PICKLE BARREL", "", 412.18))
    order = [
        ("income", "Commission Income"), ("income", "Agent Fee Income"),
        ("cogs", "Agent Commission Splits"), ("cogs", "Brokerage Split & Fees"),
        ("expense", "Advertising & Marketing", "Online Lead Programs"), ("expense", "Advertising & Marketing", "Postcards"),
        ("expense", "Advertising & Marketing", "Listing Photography"),
        ("expense", "Bank Fees"), ("expense", "Insurance - E&O"), ("expense", "Meals"), ("expense", "Office Supplies"),
        ("expense", "Payroll Expenses", "Payroll Taxes"), ("expense", "Payroll Expenses", "Salaries & Wages"),
        ("expense", "Rent"),
        ("expense", "Software & Subscriptions", "CRM"), ("expense", "Software & Subscriptions", "Dialer"),
        ("expense", "Software & Subscriptions", "Document Signing"), ("expense", "Software & Subscriptions", "Video"),
        ("expense", "Transaction Coordinator Fees"), ("expense", "Uncategorized Expense"),
    ]
    monthly = {k: [0.0] * n for k in order}
    for k in order:
        for t in tx[k]:
            monthly[k][t[0].month - 1] += t[5]

    def nodes_for(section):
        out, groups = [], {}
        for k in order:
            if k[0] != section:
                continue
            if len(k) == 2:
                out.append(leaf(k[1], monthly[k]))
            else:
                if k[1] not in groups:
                    groups[k[1]] = []
                    out.append(("group", k[1], groups[k[1]]))
                groups[k[1]].append(leaf(k[2], monthly[k]))
        return out

    sections = {s: nodes_for(s) for s in ("income", "cogs", "expense")}
    labels = [f"{MON[i]} {year}" for i in range(n)]
    out = Path(skill) / "evals" / "files" / "case2"
    net = write_qbo_xlsx(out / "marmalade-pnl-by-month-jan-sep-2026.xlsx", "Marmalade Key Team", "Profit and Loss",
                         "January - September, 2026", labels, sections,
                         "Accrual Basis Thursday, October 8, 2026 02:31 PM GMT-05:00")
    # P&L Detail, QuickBooks Online style: labels in column A, transactions from column B.
    wb = Workbook()
    ws = wb.active
    ws.title = "Profit and Loss Detail"
    for line in [[MARK], ["Marmalade Key Team"], ["Profit and Loss Detail"], ["January - September, 2026"], []]:
        ws.append(line)
    ws.append(["", "Date", "Transaction Type", "Num", "Name", "Memo/Description", "Split", "Amount", "Balance"])
    titles = {"income": "Income", "cogs": "Cost of Goods Sold", "expense": "Expenses"}
    for section in ("income", "cogs", "expense"):
        ws.append([titles[section]])
        sec_total = 0.0
        open_group = None
        for k in [k for k in order if k[0] == section]:
            if len(k) == 3 and open_group != k[1]:
                if open_group:
                    ws.append([f"Total for {open_group}", "", "", "", "", "", "", r2(gsum)])
                open_group, gsum = k[1], 0.0
                ws.append([k[1]])
            elif len(k) == 2 and open_group:
                ws.append([f"Total for {open_group}", "", "", "", "", "", "", r2(gsum)])
                open_group = None
            ws.append([k[-1]])
            bal = 0.0
            split = "Checking" if section != "expense" else "Business Card"
            for t in sorted(tx[k], key=lambda t: (t[0], t[3])):
                bal += t[5]
                ws.append(["", t[0].strftime("%m/%d/%Y"), t[1], t[2], t[3], t[4], split, r2(t[5]), r2(bal)])
            ws.append([f"Total for {k[-1]}", "", "", "", "", "", "", r2(bal)])
            sec_total += bal
            if open_group:
                gsum += bal
        if open_group:
            ws.append([f"Total for {open_group}", "", "", "", "", "", "", r2(gsum)])
        ws.append([f"Total for {titles[section]}", "", "", "", "", "", "", r2(sec_total)])
    ws.append([])
    ws.append(["Accrual Basis Thursday, October 8, 2026 02:33 PM GMT-05:00"])
    ws.column_dimensions["A"].width = 34
    wb.save(out / "marmalade-pnl-detail-jan-sep-2026.xlsx")
    return {"net_income_by_month": net, "closings_by_month": counts_by_month(deals, n),
            "planted": ["Snapdragon CRM 599.00 on 08/03 and again on 08/04 in CRM (duplicate)",
                        "Pinecone Dialer 349.00 monthly from July (new recurring vendor)",
                        "Lanternfly Leads 1,250.00 in Office Supplies in June (likely miscategorized; Online Lead Programs that month is 750.00)",
                        "Hootenanny Video 59.00 one time in May (new vendor, not recurring)",
                        "Uncategorized Expense 412.18 on 09/24",
                        "agent payout names and an employee's payroll checks in the detail (must not appear by name)"]}


# ---------------------------------------------------------------------------------------------------
# Case 3: Butterscotch Lane Group, Jan to Oct 2026, QuickBooks Desktop style PDF. No production file.

def case3(skill):
    rng = random.Random(20264)
    n, year = 10, 2026
    agents = [("A", 3), ("B", 3), ("C", 2), ("D", 2)]
    sources = [("x", 1)]
    deals = make_deals(rng, year, [4, 5, 6, 7, 8, 8, 7, 7, 6, 6], agents, sources, None, 0.62, {},
                       lambda g, run: g * 0.05)
    closings = counts_by_month(deals, n)
    gci = by_month(deals, "gci", n, year)
    ref = [0, 1840.50, 0, 2215.80, 0, 0, 3012.45, 0, 1765.20, 0]
    sections = {
        "income": [leaf("4000 · Commission Income", gci)],
        "cogs": [leaf("5000 · Agent Commissions Paid", by_month(deals, "agent_paid", n, year)),
                 leaf("5050 · Brokerage Fees", by_month(deals, "brokerage", n, year)),
                 leaf("5100 · Referral Fees", ref)],
        "expense": [
            group("6000 · Advertising", [
                leaf("6010 · Lead Generation", [3400] * n),
                leaf("6020 · Print & Signs", [520.40, 488.15, 610.90, 575.25, 702.80, 655.10, 590.45, 612.30, 4800 + 540.75, 498.60]),
                leaf("6030 · Social Media Ads", [600] * n),
            ]),
            leaf("6100 · Transaction Coordinator Fees", [375 * c for c in closings]),
            group("6200 · Payroll", [
                leaf("6210 · Admin Wages", [4333.33] * n),
                leaf("6220 · Payroll Taxes", [331.50] * n),
            ]),
            leaf("6300 · Software", [912.40, 912.40, 912.40, 938.15, 938.15, 938.15, 938.15, 938.15, 938.15, 938.15]),
            leaf("6400 · Office Rent", [2450] * n),
            leaf("6500 · Owner's Draw", [6000] * n),
            leaf("6600 · Insurance", [298] * n),
            leaf("6700 · Accounting", [525] * n),
            leaf("6800 · Auto & Travel", [312.66, 288.10, 405.25, 350.80, 298.45, 377.90, 421.15, 366.30, 309.75, 344.60]),
        ],
        "other_income": [leaf("7000 · Interest Income", [12.40, 11.85, 13.10, 12.95, 14.20, 13.75, 14.05, 13.60, 12.80, 13.35])],
    }
    rows, net = qbo_rows(sections, n)
    # Restyle into QuickBooks Desktop labels.
    rename = {"Income": "Income", "Total Income": "Total Income", "Cost of Goods Sold": "Cost of Goods Sold",
              "Total Cost of Goods Sold": "Total COGS", "Expenses": "Expense", "Total Expenses": "Total Expense",
              "Net Operating Income": "Net Ordinary Income", "Other Income": "Other Income",
              "Total Other Income": "Total Other Income", "Net Other Income": "Net Other Income"}
    labels = [f"{MON[i]} {str(year)[2:]}" for i in range(n)] + ["TOTAL"]
    html = ["<html><head><style>body{font-family:Arial;font-size:7.4px;margin:0} h1,h2,h3{text-align:center;margin:2px}"
            " h1{font-size:12px} h2{font-size:11px} h3{font-size:9px} table{border-collapse:collapse;width:100%}"
            " td{padding:1px 3px;white-space:nowrap} td.n{text-align:right} th{text-align:right;border-bottom:1px solid #000;padding:1px 3px}"
            " .b{font-weight:bold} .basis{font-size:8px}</style></head><body>",
            "<div class='basis'>10:41 AM<br>11/03/26<br>Accrual Basis</div>",
            "<h1>Butterscotch Lane Group</h1><h2>Profit &amp; Loss</h2><h3>January through October 2026</h3>",
            "<table><thead><tr><th style='text-align:left'></th>" + "".join(f"<th>{l}</th>" for l in labels) + "</tr></thead><tbody>"]
    html.append("<tr><td class='b'>Ordinary Income/Expense</td>" + "<td></td>" * len(labels) + "</tr>")
    in_other = False
    for level, label, vals, bold in rows:
        if label == "Other Income" and not in_other:
            html.append("<tr><td class='b'>Other Income/Expense</td>" + "<td></td>" * len(labels) + "</tr>")
            in_other = True
        lab = rename.get(label, label)
        pad = 10 + 10 * level if label not in ("Gross Profit", "Net Ordinary Income", "Net Income", "Net Other Income") else (6 if label == "Gross Profit" else 0)
        cls = " b" if bold else ""
        cells = "".join(f"<td class='n{cls}'>{v:,.2f}</td>" for v in vals) if vals else "<td></td>" * len(labels)
        html.append(f"<tr><td class='{cls.strip()}' style='padding-left:{pad}px'>{lab}</td>{cells}</tr>")
    html.append("</tbody></table></body></html>")
    out = Path(skill) / "evals" / "files" / "case3"
    out.mkdir(parents=True, exist_ok=True)
    tmp = out / "_tmp.html"
    tmp.write_text("\n".join(html), encoding="utf-8")
    pdf = out / "butterscotch-profit-and-loss-jan-oct-2026.pdf"
    subprocess.run(["node", str(Path(__file__).with_name("html_to_pdf.cjs")), str(tmp), str(pdf), MARK, "landscape"], check=True)
    tmp.unlink()
    return {"net_income_by_month": net, "closings_by_month_hidden": closings,
            "planted": ["no production file: cost per closing must be skipped",
                        "Transaction Coordinator Fees are 375 per file, a temptation to infer closings",
                        "Owner's Draw 6,000 a month in Expense", "Print & Signs spike in Sep (5,340.75)",
                        "Software price change in Apr (912.40 to 938.15)"]}


def main():
    skill = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    planted = Path(skill) / "evals" / "make" / "planted"
    planted.mkdir(parents=True, exist_ok=True)
    for name, fn in (("practice", practice), ("case1", case1), ("case2", case2), ("case3", case3)):
        info = fn(skill)
        (planted / f"{name}.json").write_text(json.dumps(info, indent=1, default=str) + "\n", encoding="utf-8")
        print(name, "ok")


if __name__ == "__main__":
    main()
