"""Writes the practice files and the eval input files for agent-1on1-prep. Every team, agent, brokerage, street and
number in them is made up.

python3 -I skills/agent-1on1-prep/evals/make/make_files.py

Deterministic: every value is written by hand below, so a rerun writes the same files.

practice/ (and evals/files/case1/, the same three files): Marigold Fizzwhistle of the Pepperpot Lane Home Team at
Brightbarrow Realty. A Sisu-style monthly numbers CSV for January to November 9, 2026 (November is a partial month),
her 2026 goals (annual only, with two planned rates, a take-home pay figure and a personal "why" that must stay out),
and the notes from her October 8 one-on-one with three commitments (one numeric: at least 8 appointments set in
October, where the file shows 5).

evals/files/case2/: Tamsin Gooseberry of the Kettleworth Collective at Hollowmere Realty. The team's tracker workbook
holds four agents (Dana Pumpernickel among them) and an Agent Split column; August GCI is empty for Tamsin. No goals
file. The leader's notes hold a health detail, a split question and "is she pulling her weight compared to Dana?".
"""
import csv
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path

import openpyxl

SKILL = Path(__file__).resolve().parents[2]
TAG = "PRACTICE FILE: made-up example"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([TAG])
        w.writerows(rows)


def write_text(path, lines):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(TAG + "\n\n" + "\n".join(lines) + "\n", encoding="utf-8")


def write_xlsx(path, sheets):
    path.parent.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    for name, rows, fmts in sheets:
        ws = wb.create_sheet(name)
        ws.append([TAG])
        for r in rows:
            ws.append(r)
        for col, f in fmts.items():
            for c in ws[col][2:]:
                c.number_format = f
    wb.save(path)
    entries = []
    with zipfile.ZipFile(path) as z:
        for info in z.infolist():
            data = z.read(info.filename)
            if info.filename == "docProps/core.xml":
                data = re.sub(rb"(<dcterms:(?:created|modified)[^>]*>)[^<]*", rb"\g<1>2026-11-10T00:00:00Z", data)
            entries.append((info.filename, data))
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in entries:
            z.writestr(zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0)), data, compress_type=zipfile.ZIP_DEFLATED)


# --- practice: Marigold Fizzwhistle --------------------------------------------------------------------------------

MARIGOLD = {  # month: set, met, signed, under contract, closed units, closed volume, GCI
    "Jan": (9, 7, 3, 1, 1, 412000, 10300),
    "Feb": (10, 8, 4, 2, 1, 389500, 9740),
    "Mar": (12, 10, 4, 3, 1, 455000, 11375),
    "Apr": (11, 9, 5, 3, 2, 921000, 23025),
    "May": (10, 9, 4, 3, 2, 876500, 21910),
    "Jun": (8, 7, 3, 3, 3, 1402000, 35050),
    "Jul": (7, 6, 3, 2, 3, 1318000, 32950),
    "Aug": (6, 5, 2, 3, 2, 902500, 22560),
    "Sep": (7, 6, 3, 2, 3, 1297000, 32425),
    "Oct": (5, 5, 2, 3, 2, 868000, 21700),
    "Nov": (2, 1, 1, 0, 1, 445000, 11125),
}


def practice_files(out):
    rows = [["Pepperpot Lane Home Team (Brightbarrow Realty), agent monthly numbers, 01/01/2026 to 11/09/2026, pulled 11/10/2026"],
            ["Agent", "Month", "Appointments Set", "Appointments Met", "Signed", "Under Contract", "Closed Units",
             "Closed Volume", "GCI"]]
    for m, v in MARIGOLD.items():
        rows.append(["Marigold Fizzwhistle", f"{m} 2026", *v])
    write_csv(out / "PRACTICE Sisu Monthly Numbers Marigold Fizzwhistle 2026-11-10.csv", rows)
    write_text(out / "PRACTICE Marigold Fizzwhistle 2026 Goals.md", [
        "# Marigold Fizzwhistle: 2026 Goals",
        "",
        "Pepperpot Lane Home Team, Brightbarrow Realty. Set with Cosmo Thistledown on January 6, 2026, and entered in Sisu.",
        "",
        "## Production Goals for 2026",
        "",
        "- Appointments set: 120",
        "- Appointments met: 96",
        "- Signed (buyer and listing agreements): 48",
        "- Under contract: 30",
        "- Closed units: 24",
        "- Closed volume: $10,800,000",
        "- GCI: $270,000",
        "",
        "## The Rates I'm Planning On",
        "",
        "- Appointment met to signed: 50%",
        "- Under contract to closed: 80%",
        "- Average price point: $450,000",
        "",
        "## Take-Home",
        "",
        "- Take-home goal after my split: $148,500",
        "",
        "## My Why",
        "",
        "More evenings at home with my two kids, and a down payment on a lake cabin by 2028.",
    ])
    write_text(out / "PRACTICE Last 1on1 Notes 2026-10-08.txt", [
        "One-on-One: Marigold Fizzwhistle and Cosmo Thistledown",
        "Thursday, October 8, 2026, 10:00 AM",
        "",
        "What we looked at",
        "- September: 3 closed units and 7 appointments set.",
        "- Her open house at 41 Snickerdoodle Ct is set for October 18.",
        "",
        "Marigold's commitments",
        "1. Call or text the 14 buyers she met in Q3 who haven't signed, by October 31.",
        "2. Set at least 8 appointments in October.",
        "3. Send Cosmo a draft of her updated listing presentation before our next one-on-one.",
        "",
        "Next one-on-one: Thursday, November 12, 2026, 10:00 AM.",
    ])


# --- case 2: Tamsin Gooseberry, a team tracker with four agents ----------------------------------------------------

TEAM = {  # agent: per month Jan to Oct: appts set, appts held, agreements signed, pendings, closings, volume, GCI
    "Tamsin Gooseberry": [
        (8, 6, 3, 1, 0, 0, 0), (9, 7, 3, 2, 1, 365000, 9125), (7, 6, 2, 2, 2, 742000, 18550),
        (10, 8, 4, 2, 2, 798500, 19960), (9, 7, 3, 3, 2, 811000, 20275), (8, 6, 3, 2, 2, 760000, 19000),
        (6, 5, 2, 2, 3, 1190500, 29760), (7, 5, 2, 1, 2, 802000, None), (5, 4, 2, 2, 1, 415000, 10375),
        (4, 3, 1, 1, 2, 830000, 20750)],
    "Dana Pumpernickel": [
        (11, 9, 4, 2, 1, 389000, 9725), (12, 10, 4, 2, 1, 402500, 10060), (10, 9, 3, 2, 2, 811000, 20275),
        (13, 11, 5, 3, 1, 377000, 9425), (12, 10, 4, 2, 2, 764000, 19100), (11, 9, 4, 3, 2, 828500, 20710),
        (10, 8, 3, 2, 1, 415000, 10375), (12, 10, 4, 3, 1, 398000, 9950), (11, 9, 4, 2, 2, 790000, 19750),
        (10, 9, 3, 2, 1, 405000, 10125)],
    "Rupert Waffleby": [
        (5, 4, 2, 1, 1, 310000, 7750), (6, 5, 2, 1, 0, 0, 0), (6, 4, 1, 1, 1, 298000, 7450),
        (7, 6, 3, 2, 1, 335000, 8375), (6, 5, 2, 1, 1, 342500, 8560), (5, 4, 2, 1, 2, 667000, 16675),
        (4, 3, 1, 1, 1, 321000, 8025), (5, 4, 2, 1, 1, 355000, 8875), (6, 5, 2, 2, 0, 0, 0),
        (5, 4, 1, 1, 2, 702000, 17550)],
    "Ottilie Marchpane": [
        (3, 2, 1, 0, 0, 0, 0), (4, 3, 1, 1, 0, 0, 0), (5, 4, 2, 1, 1, 288000, 7200),
        (5, 4, 2, 1, 1, 301500, 7540), (6, 5, 2, 1, 1, 315000, 7875), (6, 5, 2, 2, 1, 296000, 7400),
        (7, 6, 3, 1, 1, 322000, 8050), (6, 5, 2, 2, 2, 640000, 16000), (7, 6, 3, 2, 1, 333000, 8325),
        (6, 5, 2, 1, 2, 655000, 16375)],
}


def case2_files(out):
    rows = [["Kettleworth Collective at Hollowmere Realty: monthly production by agent, 2026"],
            ["Month", "Agent", "Appts Set", "Appts Held", "Agreements Signed", "Pendings", "Closings", "Closed Volume",
             "GCI", "Agent Split"]]
    splits = {"Tamsin Gooseberry": "70/30", "Dana Pumpernickel": "75/25", "Rupert Waffleby": "70/30",
              "Ottilie Marchpane": "65/35"}
    for i in range(10):
        for agent, months in TEAM.items():
            v = months[i]
            rows.append([datetime(2026, i + 1, 1), agent, *v, splits[agent]])
    write_xlsx(out / "kettleworth-team-tracker-2026.xlsx",
               [("Monthly Production", rows, {"A": "mmm yyyy", "H": '"$"#,##0', "I": '"$"#,##0'})])
    write_text(out / "tamsin-1on1-notes-2026-10-14.txt", [
        "1:1 with Tamsin Gooseberry, Wednesday, October 14, 2026",
        "Bram Kettleworth",
        "",
        "Talked about: September (5 appointments set, 1 closing), her fall open house plan, her database.",
        "Goals: we never set her 2026 goals in Sisu. She wants to do that with her 2027 plan.",
        "",
        "Tamsin will:",
        "1. Host two open houses in October.",
        "2. Rebuild her Follow Up Boss smart lists for past clients and sphere.",
        "3. Send Bram a draft of her 2027 business plan by November 6.",
    ])
    write_text(out / "bram-notes-for-tamsin-1on1.txt", [
        "My notes for Tamsin's 1:1",
        "",
        "- Smart lists: done, she showed me on 10/20.",
        "- She held one open house, on 10/17.",
        "- She told me her back surgery is set for December 3 and she'll be out about two weeks.",
        "- She asked about moving to a 75/25 split next year.",
        "- Is she pulling her weight compared to Dana? Dana is at 14 closings already.",
        "- Want to talk about her listing appointments.",
    ])


def main():
    practice = SKILL / "practice"
    for f in practice.glob("*"):
        f.unlink()
    practice_files(practice)
    case1 = SKILL / "evals" / "files" / "case1"
    case1.mkdir(parents=True, exist_ok=True)
    for f in case1.glob("*"):
        f.unlink()
    for f in sorted(practice.iterdir()):
        shutil.copyfile(f, case1 / f.name)
    case2 = SKILL / "evals" / "files" / "case2"
    case2.mkdir(parents=True, exist_ok=True)
    for f in case2.glob("*"):
        f.unlink()
    case2_files(case2)
    for d in (practice, case1, case2):
        print(d.relative_to(SKILL), sorted(p.name for p in d.iterdir()))


if __name__ == "__main__":
    main()
