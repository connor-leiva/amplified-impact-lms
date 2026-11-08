#!/usr/bin/env python3
"""Spot-check how the analysis code reads real estate account names, including the cases a test fixture
doesn't cover: revenue share income, per-deal brokerage fees in Cost of Goods Sold, referral gifts and
guaranteed payments. Everything here is made up.

  python3 -I evals/make/classifier_check.py SKILL_DIR SCRATCH_DIR

Extracts the code from references/analysis-code.md into SCRATCH_DIR, checks 25 account names, then runs
the code end to end on a small made-up P&L and checks the categories, the totals and two flags, and runs
the same P&L with the latest month first (month-end headers) to check the months are read in calendar order,
and a closings file with Sisu's form-field column names.
Prints PASS or the failures.
"""
import csv
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

CASES = [
    ("income", ["Revenue Share Income"], "other_income"),
    ("income", ["Rev Share"], "other_income"),
    ("income", ["Profit Share Income"], "other_income"),
    ("income", ["Stock Award Income"], "other_income"),
    ("income", ["Referral Fee Income"], "commission"),
    ("income", ["Commission Income", "Buyer Side"], "commission"),
    ("income", ["Agent Desk Fees"], "agent_fees"),
    ("cogs", ["Transaction Fees"], "brokerage_fees"),
    ("cogs", ["Risk Management Fee"], "brokerage_fees"),
    ("cogs", ["E&O Fee"], "brokerage_fees"),
    ("cogs", ["Transaction Coordinator Fees"], "people"),
    ("cogs", ["Cost of Sales", "Agent Commissions"], "agent_splits"),
    ("cogs", ["Brokerage Split"], "brokerage_fees"),
    ("cogs", ["Referral Fees Paid"], "referral_fees"),
    ("expense", ["Referral Gifts"], "marketing"),
    ("expense", ["Client Referral Gifts"], "marketing"),
    ("expense", ["Referral Fees"], "referral_fees"),
    ("expense", ["Guaranteed Payments"], "owner"),
    ("expense", ["Owner's Draw"], "owner"),
    ("expense", ["Insurance - E&O"], "other"),
    ("expense", ["Transaction Coordinator Fees"], "people"),
    ("expense", ["Online Lead Programs", "Zillow"], "lead_gen"),
    ("expense", ["Software & Subscriptions", "CRM"], "tech"),
    ("expense", ["Rent"], "occupancy"),
    ("expense", ["Transaction Fees"], "other"),  # outside Cost of Goods Sold: left for the account map review
]

PNL = [
    ["PRACTICE FILE: made-up example"],
    ["Made-up Test Team"], ["Profit and Loss"], ["January - March 2026"], [],
    ["", "Jan 2026", "Feb 2026", "Mar 2026", "Total"],
    ["Income"],
    ["Commission Income", "50000.00", "60000.00", "70000.00", "180000.00"],
    ["Revenue Share Income", "1200.00", "1300.00", "1400.00", "3900.00"],
    ["Total Income", "51200.00", "61300.00", "71400.00", "183900.00"],
    ["Cost of Goods Sold"],
    ["Agent Commissions", "30000.00", "36000.00", "42000.00", "108000.00"],
    ["Transaction Fees", "250.00", "300.00", "350.00", "900.00"],
    ["Total Cost of Goods Sold", "30250.00", "36300.00", "42350.00", "108900.00"],
    ["Gross Profit", "20950.00", "25000.00", "29050.00", "75000.00"],
    ["Expenses"],
    ["Client Referral Gifts", "100.00", "100.00", "100.00", "300.00"],
    ["Guaranteed Payments", "5000.00", "5000.00", "5000.00", "15000.00"],
    ["Rent", "2000.00", "2000.00", "2000.00", "6000.00"],
    ["Total Expenses", "7100.00", "7100.00", "7100.00", "21300.00"],
    ["Net Income", "13850.00", "17900.00", "21950.00", "53700.00"],
]


def main():
    skill, scratch = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    scratch.mkdir(parents=True, exist_ok=True)
    text = (skill / "references" / "analysis-code.md").read_text(encoding="utf-8")
    code = scratch / "pnl_check.py"
    code.write_text(re.search(r"`{3}python\n(.*)\n`{3}", text, re.S).group(1), encoding="utf-8")
    spec = importlib.util.spec_from_file_location("pnl_check", code)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    fails = []
    for sec, path, want in CASES:
        got = mod.classify({"path": path, "section": sec, "vals": {"2026-01": 100.0}, "synthetic": False}, {})[0]
        if got != want:
            fails.append(f"{sec} {':'.join(path)}: got {got}, want {want}")
    src = scratch / "made-up-pnl.csv"
    with src.open("w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(PNL)
    out = scratch / "made-up-run"
    subprocess.run([sys.executable, str(code), str(src), "--out", str(out)], check=True, capture_output=True)
    rep = json.loads((out / "pnl_report.json").read_text(encoding="utf-8"))
    md = (out / "pnl_report.md").read_text(encoding="utf-8")
    codes = {f["code"] for f in rep.get("flags", [])}
    for c in ("revenue_share_income", "owner_draw_on_pnl"):
        if c not in codes:
            fails.append(f"end to end: flag {c} missing")
    if "Every month's accounts add up" not in md:
        fails.append("end to end: totals check did not pass")
    if "company dollar = 180,000.00 - 108,000.00 - 0.00 - 900.00 = 71,100.00" not in md:
        fails.append("end to end: period company dollar is not 71,100.00 (revenue share or the transaction fee was misread)")
    # The same P&L with the latest month first and month-end headers, as a comparison layout (Xero's Compare with)
    # can export it: the run must read the months in calendar order.
    hdr = {"Jan 2026": "31 Jan 2026", "Feb 2026": "28 Feb 2026", "Mar 2026": "31 Mar 2026"}
    rev = [r if len(r) < 5 else [r[0]] + [hdr.get(c, c) for c in r[1:4]][::-1] + [r[4]] for r in PNL]
    src2 = scratch / "made-up-pnl-latest-first.csv"
    with src2.open("w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(rev)
    out2 = scratch / "made-up-run-latest-first"
    subprocess.run([sys.executable, str(code), str(src2), "--out", str(out2)], check=True, capture_output=True)
    md2 = (out2 / "pnl_report.md").read_text(encoding="utf-8")
    for want in ("### Mar 2026 Against Feb 2026", "### Year to Date (Jan 2026 to Mar 2026)", "= 71,100.00"):
        if want not in md2:
            fails.append(f"latest-month-first layout: '{want}' missing")
    # A closings file with Sisu's form-field column names (Closed (Settlement) Date, Gross Agent(s) Paid Income).
    prod = scratch / "made-up-sisu-labels.csv"
    with prod.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Closed (Settlement) Date", "Status", "GCI", "Gross Agent(s) Paid Income", "Team Net Income", "Lead Source"])
        w.writerow(["01/15/2026", "Closed", "50000.00", "30000.00", "19750.00", "Made-up Source"])
        w.writerow(["02/15/2026", "Closed", "60000.00", "36000.00", "23700.00", "Made-up Source"])
        w.writerow(["03/15/2026", "Closed", "70000.00", "42000.00", "27650.00", "Made-up Source"])
        w.writerow(["03/20/2026", "Pending", "9000.00", "5400.00", "3600.00", "Made-up Source"])
    out3 = scratch / "made-up-run-sisu-labels"
    subprocess.run([sys.executable, str(code), str(src), "--production", str(prod), "--out", str(out3)], check=True, capture_output=True)
    md3 = (out3 / "pnl_report.md").read_text(encoding="utf-8")
    for want in ("close_date = 'Closed (Settlement) Date'", "agent_paid = 'Gross Agent(s) Paid Income'", "Closings counted in the P&L months: 3"):
        if want not in md3:
            fails.append(f"Sisu column names: '{want}' missing")
    print("PASS: %d account names, the end-to-end run, the latest-month-first layout and Sisu column names" % len(CASES) if not fails else "FAIL\n" + "\n".join(fails))


if __name__ == "__main__":
    main()
