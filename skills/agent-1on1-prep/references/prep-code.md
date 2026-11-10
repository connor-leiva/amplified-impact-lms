# Prep Code

Last verified: 2026-11-10. The Sisu and Follow Up Boss measures this code reads (appointments set and met, signed, under contract, closed units, closed volume and GCI, by month) and where they come from are described, with their sources, in `exports.md`. The rules for goals, the pace math, what changed, commitments and privacy are in `prep-rules.md`.

Run this code with Python 3 on the uploaded numbers. It uses Python's standard library, plus openpyxl for an .xlsx file. Do not paste it into the conversation. It never prints another agent's name or numbers, or any value from a pay column (split, take-home, income, cap, fees).

Usage:

    python3 prep1on1.py --numbers FILE [--agent "NAME"] [--goals goals.json] [--goals-source FILE ...] [--as-of YYYY-MM-DD] [--last-1on1 YYYY-MM-DD] [--through YYYY-MM] [--plan-start YYYY-MM] [--columns columns.json] [--out FOLDER]

It prints the data and writes one_on_one_data.md (every table, with the arithmetic) and one_on_one_data.json (the same, for drafting) to FOLDER.

What it does: finds the month-by-month table in a CSV or any sheet of a workbook (one row per month, or months across the top) and shows which column it read as which measure, marking any reading to confirm; keeps only the named agent's rows when the file holds several agents; leaves pay columns unread; checks every goal in goals.json against the files it came from and leaves out any goal whose quote or number isn't there; sums each measure for the plan year through the last full month before the as-of date, stopping at any empty or unreadable month instead of filling it; prorates each goal (by month when monthly goals are given, else evenly) and works out pace, the difference and what the annual goal needs per month left, each with its arithmetic; divides each pair of year-to-date counts; compares the year to date at the last one-on-one with now, and each month since with the agent's own monthly average before it; lists focus candidates from those numbers only; and lists every odd cell without fixing it.

```python
#!/usr/bin/env python3
# Agent 1:1 Prep (Amplified Impact). Python 3 standard library, plus openpyxl for an .xlsx upload.
#
# Reads ONE agent's production numbers by month (a Sisu dashboard or report copied into a spreadsheet, a Follow
# Up Boss report export, or the team's own tracker) and, when given, that agent's goals as goals.json. It only
# reads and does arithmetic: year to date against the prorated goal, what the months since the last one-on-one
# added, the agent's own monthly average, and count ratios, each with its arithmetic written out. It never fills
# an empty cell, never invents a goal, never forecasts, and never prints another agent's name or numbers, or any
# value from a pay column (split, take-home, income, cap, fees). Writes to --out:
#   one_on_one_data.md    every table, with the arithmetic
#   one_on_one_data.json  the same, for drafting
#
# Usage:
#   python3 prep1on1.py --numbers FILE [--agent "NAME"] [--goals goals.json] [--goals-source FILE ...]
#                       [--as-of YYYY-MM-DD] [--last-1on1 YYYY-MM-DD] [--through YYYY-MM] [--plan-start YYYY-MM]
#                       [--columns columns.json] [--out DIR]
#
# goals.json: write it only from the agent's goals file, business plan or the user's own words, one entry per goal,
# each with the line it came from exactly as written there ("quote"). Pass every file the goals came from as
# --goals-source (a pasted goal: save the message text to a file first). The run checks each quote against those
# files and leaves out any goal whose quote or number it can't find there.
#   {"plan_start": "2026-01",
#    "annual": {"closed_units": {"value": 24, "quote": "Closed units: 24"}},
#    "monthly": {"appointments_set": {"values": {"2026-01": 8, "2026-02": 10}, "quote": "..."}},
#    "rates": {"met_to_signed": {"value": 50, "quote": "Appointment met to signed: 50%"}}}
# Measures: conversations, appointments_set, appointments_met, signed, under_contract, closed_units,
#           closed_volume, gci. Rates: conversations_to_set, set_to_met, met_to_signed, signed_to_under_contract,
#           under_contract_to_closed.
# columns.json, only when the run misread a column: {"appointments_met": "Appts Held", "month": "Period"}.

import argparse
import csv
import io
import json
import os
import re
import sys
from datetime import date, datetime, timedelta

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

MEASURES = [
    ("conversations", "Conversations", False),
    ("appointments_set", "Appointments Set", False),
    ("appointments_met", "Appointments Met", False),
    ("signed", "Signed", False),
    ("under_contract", "Under Contract", False),
    ("closed_units", "Closed Units", False),
    ("closed_volume", "Closed Volume", True),
    ("gci", "GCI", True),
]
LABEL = {k: l for k, l, _ in MEASURES}
MONEY = {k for k, _, m in MEASURES if m}
ORDER = [k for k, _, _ in MEASURES]
SYN = {
    "conversations": ["conversations", "convos", "conversation", "contacts made"],
    "appointments_set": ["appointments set", "appts set", "appt set", "appointment set", "set appointments",
                         "appointments scheduled", "appts scheduled", "set"],
    "appointments_met": ["appointments met", "appts met", "appt met", "appointment met", "met appointments",
                         "appointments held", "appts held", "appointments attended", "met", "held", "appointments"],
    "signed": ["signed", "agreements signed", "signed agreements", "clients signed", "signed clients",
               "signed contracts", "buyer and listing agreements signed", "agreements"],
    "under_contract": ["under contract", "under contracts", "uc", "units under contract", "contracts written",
                       "went pending", "new pendings", "pending", "pendings"],
    "closed_units": ["closed units", "closings", "units closed", "closed deals", "closed transactions", "closed sides",
                     "sides closed", "transactions closed", "closed", "units"],
    "closed_volume": ["closed volume", "volume", "sales volume", "closed sales volume", "volume closed",
                      "closed sales", "closed volume $"],
    "gci": ["gci", "gross commission income", "closed gci", "gci closed", "gross commission", "gci $"],
}
CONFIRM = {
    "appointments": "read as appointments met (the column doesn't say set or met); confirm",
    "pending": "read as under contract by month (in Sisu, Pending is a live status and Under Contract counts by the "
               "Under Contract Date); confirm the column counts new pendings each month",
    "pendings": "read as under contract by month (new pendings each month); confirm",
    "went pending": "read as under contract by month; confirm",
    "new pendings": "read as under contract by month; confirm",
    "agreements": "read as signed (buyer and listing agreements); confirm",
    "units": "read as closed units; confirm it isn't units under contract",
    "closed": "read as closed units; confirm it is a count, not volume",
    "set": "read as appointments set; confirm",
    "met": "read as appointments met; confirm",
    "held": "read as appointments met; confirm",
    "contracts written": "read as under contract by month; confirm",
}
MONTH_COLS = ["month", "period", "month ending", "month end", "month year", "date", "mo", "month of"]
AGENT_COLS = ["agent", "agent name", "assigned to", "user", "team member", "agent user", "name"]
PAY_WORDS = ["split", "take home", "takehome", "paid income", "net income", "income", "cap", "fee", "fees", "bonus",
             "payout", "net to agent", "agent net", "company dollar", "salary", "draw", "pay", "commission split",
             "agent commission", "net commission"]
TOTAL_WORDS = {"total", "totals", "grand total", "ytd", "year to date", "ytd total", "sum", "year total"}
RATES = [
    ("conversations_to_set", "conversations", "appointments_set", "Conversations to appointments set"),
    ("set_to_met", "appointments_set", "appointments_met", "Appointments set to met"),
    ("met_to_signed", "appointments_met", "signed", "Appointments met to signed"),
    ("signed_to_under_contract", "signed", "under_contract", "Signed to under contract"),
    ("under_contract_to_closed", "under_contract", "closed_units", "Under contract to closed"),
]
RATE_LABEL = {k: l for k, _, _, l in RATES}
MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
               "November", "December"]
MON = {m[:3].lower(): i + 1 for i, m in enumerate(MONTH_NAMES)}
NULLS = {"", "none", "null", "n/a", "na", "nan"}


def norm(h):
    h = str(h or "").replace("﻿", "").strip().lower()
    h = h.replace("&", " and ")
    h = re.sub(r"[_\-:/.()#]+", " ", h)
    h = re.sub(r"[^a-z0-9$% ]", "", h)
    return re.sub(r"\s+", " ", h).strip()


def is_pay(h):
    n = " " + norm(h) + " "
    return any((" " + w + " ") in n for w in PAY_WORDS) and "gci" not in n and "gross commission" not in n


def ym_text(ym):
    return f"{MONTH_NAMES[ym[1] - 1]} {ym[0]}"


def ym_key(ym):
    return f"{ym[0]}-{ym[1]:02d}"


def next_ym(ym):
    return (ym[0] + 1, 1) if ym[1] == 12 else (ym[0], ym[1] + 1)


def prev_ym(ym):
    return (ym[0] - 1, 12) if ym[1] == 1 else (ym[0], ym[1] - 1)


def months_between(a, b):
    """Every month from a through b, inclusive."""
    out = []
    while a <= b:
        out.append(a)
        a = next_ym(a)
    return out


def parse_ym_arg(s):
    m = re.match(r"^(\d{4})-(\d{1,2})$", str(s or "").strip())
    return (int(m.group(1)), int(m.group(2))) if m else None


def parse_month(v, default_year):
    """Returns (ym or "TOTAL" or None, note). note says when the reading needs a confirm."""
    if isinstance(v, datetime):
        return (v.year, v.month), None
    if isinstance(v, date):
        return (v.year, v.month), None
    s = str(v or "").strip()
    n = norm(s)
    if not n:
        return None, None
    if n in TOTAL_WORDS or n.startswith("total") or n.startswith("ytd") or n.startswith("year to date"):
        return "TOTAL", None
    m = re.match(r"^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?(?:\s.*)?$", s)
    if m and 1 <= int(m.group(2)) <= 12:
        return (int(m.group(1)), int(m.group(2))), None
    m = re.match(r"^(\d{1,2})/(\d{4})$", s)
    if m and 1 <= int(m.group(1)) <= 12:
        return (int(m.group(2)), int(m.group(1))), None
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})(?:\s.*)?$", s)
    if m and 1 <= int(m.group(1)) <= 12:
        return (int(m.group(3)), int(m.group(1))), None
    m = re.match(r"^([A-Za-z]{3,9})\.?[\s,\-]+(\d{4})$", s)
    if m and m.group(1)[:3].lower() in MON:
        return (int(m.group(2)), MON[m.group(1)[:3].lower()]), None
    m = re.match(r"^([A-Za-z]{3,9})\.?[\s\-]+'?(\d{2})$", s)
    if m and m.group(1)[:3].lower() in MON:
        y = 2000 + int(m.group(2))
        return (y, MON[m.group(1)[:3].lower()]), f'"{s}" read as {MONTH_NAMES[MON[m.group(1)[:3].lower()] - 1]} {y}; confirm'
    m = re.match(r"^([A-Za-z]{3,9})\.?$", s)
    if m and m.group(1)[:3].lower() in MON and default_year:
        return (default_year, MON[m.group(1)[:3].lower()]), f'"{s}" has no year: read as {default_year}; confirm'
    return None, None


def parse_num(v):
    """Returns (value or None, status): num, empty, text or negative. A dash is text: it might mean zero, so a
    person confirms it."""
    if isinstance(v, bool):
        return None, "text"
    if isinstance(v, (int, float)):
        return (float(v), "num") if v >= 0 else (float(v), "negative")
    s = str(v or "").strip()
    if s.lower() in NULLS:
        return None, "empty"
    t = s.replace("$", "").replace(",", "").replace(" ", "")
    neg = False
    if re.match(r"^\(\d+(\.\d+)?\)$", t):
        t, neg = t[1:-1], True
    if re.match(r"^-?\d+(\.\d+)?$", t):
        x = float(t)
        if neg or x < 0:
            return -abs(x), "negative"
        return x, "num"
    return None, "text"


def fmt(v, money=False, dec=None):
    if v is None:
        return ""
    if money:
        return "${:,.0f}".format(round(v))
    if dec is not None:
        return f"{v:,.{dec}f}"
    if abs(v - round(v)) < 1e-9:
        return f"{int(round(v)):,}"
    return f"{v:,.1f}"


def us(iso):
    """2026-11-10 as 11/10/2026."""
    y, m, d = str(iso).split("-")
    return f"{m}/{d}/{y}"


def cell(v):
    return str(v).replace("|", "/").replace("\n", " ").strip()


def table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    for r in rows:
        out.append("| " + " | ".join(cell(c) for c in r) + " |")
    return "\n".join(out)


def read_sheets(path):
    """[(sheet name or None, rows)]: every sheet of a workbook, or the one table of a CSV."""
    if path.lower().endswith((".xlsx", ".xlsm")):
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        out = []
        for ws in wb.worksheets:
            rows = []
            for row in ws.iter_rows(values_only=True):
                rows.append(["" if v is None else v for v in row])
            out.append((ws.title, rows))
        return out
    raw = open(path, "rb").read()
    text = None
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    try:
        dialect = csv.Sniffer().sniff(text[:20000], delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    return [(None, list(csv.reader(io.StringIO(text), dialect)))]


def measure_for(header, used, overrides):
    n = norm(header)
    for key, h in overrides.items():
        if key in SYN and key not in used and (header == h or n == norm(h)):
            return key, None
    for key in ORDER:
        if key in used or key in overrides:
            continue
        for name in SYN[key]:
            if n == name or n == name + " $" or n == "$ " + name or n == name + " count":
                return key, CONFIRM.get(n)
    return None, None


def find_layout(rows, default_year, overrides):
    """('long', header index) when a row has a month column and two or more measures; ('wide', header index) when a
    row holds three or more months across and the rows below name measures in the first column."""
    for i, row in enumerate(rows[:25]):
        cells = [norm(c) for c in row]
        month_hit = any(c in MONTH_COLS or ("month" in overrides and c == norm(overrides["month"])) for c in cells)
        used, hits = set(), 0
        for c in row:
            if is_pay(c):
                continue
            k, _ = measure_for(c, used, overrides)
            if k:
                used.add(k)
                hits += 1
        if month_hit and hits >= 2:
            return "long", i
        months = [parse_month(c, default_year)[0] for c in row[1:]]
        if sum(1 for m in months if isinstance(m, tuple)) >= 3:
            below = [r[0] for r in rows[i + 1:i + 15] if r]
            used, hits = set(), 0
            for c in below:
                k, _ = measure_for(c, used, overrides)
                if k:
                    used.add(k)
                    hits += 1
            if hits >= 2:
                return "wide", i
    return None, None


def load_numbers(path, agent, overrides, default_year):
    tried = []
    for sheet, rows in read_sheets(path):
        layout, h = find_layout(rows, default_year, overrides)
        if layout:
            break
        tried.append(sheet or os.path.basename(path))
    else:
        raise SystemExit("Could not find a month-by-month table with two or more measures (appointments set or met, "
                         "signed, under contract, closed units, volume, GCI) in: " + ", ".join(tried) +
                         ". Write columns.json or copy the numbers into a CSV with one row per month.")
    out = {"file": os.path.basename(path), "sheet": sheet, "layout": layout, "header_row": h + 1, "columns": {},
           "confirm": [], "not_read": [], "pay_not_read": [], "month_notes": [], "agent": agent, "agent_column": None,
           "other_agents": 0, "rows_other_agents": 0}
    cells = {}  # ym -> {measure: (value, status, raw)}
    dup = set()
    total = None
    odd = []
    if layout == "long":
        head = rows[h]
        used = set()
        mcol = acol = None
        for j, c in enumerate(head):
            n = norm(c)
            if mcol is None and (("month" in overrides and (c == overrides["month"] or n == norm(overrides["month"])))
                                 or ("month" not in overrides and n in MONTH_COLS)):
                mcol = j
                out["columns"]["month"] = str(c)
                continue
            if acol is None and n in AGENT_COLS and "agent" not in used:
                acol = j
                out["agent_column"] = str(c)
                continue
            if is_pay(c):
                out["pay_not_read"].append(str(c))
                continue
            k, note = measure_for(c, used, overrides)
            if k:
                used.add(k)
                out["columns"][k] = (j, str(c))
                if note:
                    out["confirm"].append(f'{c}: {note}')
            elif str(c).strip():
                out["not_read"].append(str(c))
        data = [r for r in rows[h + 1:] if any(str(x).strip() for x in r)]
        if acol is not None:
            names = []
            for r in data:
                nm = str(r[acol]).strip() if acol < len(r) else ""
                if nm and nm not in names:
                    names.append(nm)
            if agent:
                a = norm(agent)
                match = [nm for nm in names if norm(nm) == a] or [nm for nm in names if a in norm(nm)]
                if len(match) != 1:
                    raise SystemExit(f'--agent "{agent}" matched {len(match)} names in the {out["agent_column"]} '
                                     f'column. Names in the file: ' + "; ".join(names))
                keep = match[0]
                out["agent"] = keep
            elif len(names) > 1:
                raise SystemExit(f"The file holds {len(names)} agents in the {out['agent_column']} column. Rerun with "
                                 "--agent and the name of the agent this one-on-one is with. Names: " + "; ".join(names))
            else:
                keep = names[0] if names else None
                out["agent"] = agent or keep
            others = [nm for nm in names if nm != keep]
            out["other_agents"] = len(others)
            out["rows_other_agents"] = sum(1 for r in data if acol < len(r) and str(r[acol]).strip() in others)
            data = [r for r in data if acol < len(r) and str(r[acol]).strip() == keep]
        for idx, r in enumerate(data):
            raw_m = r[mcol] if mcol < len(r) else ""
            ym, note = parse_month(raw_m, default_year)
            if note:
                out["month_notes"].append(note)
            vals = {}
            for k, col in out["columns"].items():
                if k == "month":
                    continue
                j = col[0]
                raw = r[j] if j < len(r) else ""
                v, st = parse_num(raw)
                vals[k] = (v, st, raw if not isinstance(raw, (datetime, date)) else str(raw))
            if ym == "TOTAL":
                total = vals
                continue
            if ym is None:
                if any(st == "num" for v, st, _ in vals.values()):
                    odd.append({"where": f"row with month cell \"{cell(raw_m)}\"", "what": "the month can't be read",
                                "treated": "left out of every sum"})
                continue
            if ym in cells:
                dup.add(ym)
            cells[ym] = vals if ym not in cells else cells[ym]
    else:
        head = rows[h]
        mcols = {}
        for j, c in enumerate(head):
            if j == 0:
                continue
            ym, note = parse_month(c, default_year)
            if ym == "TOTAL":
                mcols[j] = "TOTAL"
            elif ym:
                if note:
                    out["month_notes"].append(note)
                if ym in mcols.values():
                    dup.add(ym)
                mcols[j] = ym
            elif str(c).strip():
                out["not_read"].append(str(c))
        out["columns"]["month"] = "the header row (months across)"
        used = set()
        for r in rows[h + 1:]:
            if not r or not str(r[0]).strip():
                continue
            if is_pay(r[0]):
                out["pay_not_read"].append(str(r[0]))
                continue
            k, note = measure_for(r[0], used, overrides)
            if not k:
                out["not_read"].append(str(r[0]))
                continue
            used.add(k)
            out["columns"][k] = (0, str(r[0]))
            if note:
                out["confirm"].append(f"{r[0]}: {note}")
            for j, ym in mcols.items():
                raw = r[j] if j < len(r) else ""
                v, st = parse_num(raw)
                entry = (v, st, raw if not isinstance(raw, (datetime, date)) else str(raw))
                if ym == "TOTAL":
                    total = total or {}
                    total[k] = entry
                else:
                    cells.setdefault(ym, {})[k] = entry
    measures = [k for k in ORDER if k in out["columns"]]
    for ym in sorted(cells):
        for k in measures:
            v, st, raw = cells[ym].get(k, (None, "empty", ""))
            if ym in dup:
                odd.append({"where": f"{ym_text(ym)}", "what": "more than one row for this month",
                            "treated": "neither row used; a person fixes the file"})
                break
            if st == "empty":
                odd.append({"where": f"{ym_text(ym)}, {LABEL[k]}", "what": "empty",
                            "treated": "left empty, never counted as zero"})
            elif st == "text":
                odd.append({"where": f"{ym_text(ym)}, {LABEL[k]}", "what": f'not a number ("{cell(raw)}")',
                            "treated": "shown as written, not counted"})
            elif st == "negative":
                odd.append({"where": f"{ym_text(ym)}, {LABEL[k]}", "what": f'a negative number ("{cell(raw)}")',
                            "treated": "shown as written, not counted"})
    out["measures"] = measures
    return out, cells, dup, total, odd


def norm_text(s):
    s = str(s or "").lower()
    s = re.sub(r"[*_`|#>]", " ", s)
    s = s.replace("’", "'").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", s).strip()


def nums_in(s):
    out = set()
    for t in re.findall(r"\d[\d,]*(?:\.\d+)?", str(s)):
        try:
            out.add(round(float(t.replace(",", "")), 6))
        except ValueError:
            pass
    return out


def load_goals(path, sources, measures):
    g = {"annual": {}, "monthly": {}, "rates": {}, "rejected": [], "checked": bool(sources), "plan_start": None,
         "sources": [os.path.basename(s) for s in sources]}
    if not path:
        return g
    data = json.load(open(path, encoding="utf-8"))
    g["plan_start"] = parse_ym_arg(data.get("plan_start")) or ((int(data["year"]), 1) if data.get("year") else None)
    text = " ".join(norm_text(open(s, encoding="utf-8", errors="replace").read()) for s in sources)

    def check(quote, values):
        if not sources:
            return None
        q = norm_text(quote)
        if not q or q not in text:
            return "its quote is not in " + ", ".join(g["sources"])
        found = nums_in(quote)
        for v in values:
            if round(float(v), 6) not in found:
                return f"the number {fmt(float(v))} is not in its quote"
        return None

    for k, e in (data.get("annual") or {}).items():
        if k not in LABEL:
            g["rejected"].append({"goal": k, "why": "not a production measure this run reads (pay figures are never paced)"})
            continue
        why = check(e.get("quote", ""), [e.get("value")])
        if why:
            g["rejected"].append({"goal": f"{LABEL[k]} (annual)", "why": why})
        else:
            g["annual"][k] = {"value": float(e["value"]), "quote": e.get("quote", "")}
    for k, e in (data.get("monthly") or {}).items():
        if k not in LABEL:
            g["rejected"].append({"goal": k, "why": "not a production measure this run reads"})
            continue
        vals = {}
        for key, v in (e.get("values") or {}).items():
            ym = parse_ym_arg(key)
            if ym:
                vals[ym] = float(v)
        why = check(e.get("quote", ""), list(vals.values()))
        if why:
            g["rejected"].append({"goal": f"{LABEL[k]} (monthly)", "why": why})
        else:
            g["monthly"][k] = {"values": vals, "quote": e.get("quote", "")}
    for k, e in (data.get("rates") or {}).items():
        if k not in RATE_LABEL:
            g["rejected"].append({"goal": k, "why": "not a rate this run reads"})
            continue
        why = check(e.get("quote", ""), [e.get("value")])
        if why:
            g["rejected"].append({"goal": RATE_LABEL[k], "why": why})
        else:
            g["rates"][k] = {"value": float(e["value"]), "quote": e.get("quote", "")}
    return g


def total_over(cells, dup, months, k, money):
    """(total, arithmetic, problems) for measure k over months; total is None when any month can't be used."""
    vals, problems = [], []
    for ym in months:
        if ym in dup:
            problems.append(f"{ym_text(ym)} has more than one row")
            continue
        if ym not in cells:
            problems.append(f"{ym_text(ym)} has no row")
            continue
        v, st, raw = cells[ym].get(k, (None, "empty", ""))
        if st != "num":
            problems.append(f"{ym_text(ym)} is {'empty' if st == 'empty' else 'not a usable number'}")
            continue
        vals.append(v)
    if problems or not months:
        return None, "", problems
    t = sum(vals)
    return t, " + ".join(fmt(v, money) for v in vals) + " = " + fmt(t, money), []


def pace_for(k, ytd, months, goals):
    money = k in MONEY
    n = len(months)
    res = {"prorated": None, "prorated_math": "", "pace": None, "pace_math": "", "diff_math": "", "annual": None,
           "annual_math": "", "to_go_math": "", "goal_kind": None, "quote": ""}
    if k in goals["monthly"]:
        mv = goals["monthly"][k]["values"]
        res["quote"] = goals["monthly"][k]["quote"]
        if all(ym in mv for ym in months):
            p = sum(mv[ym] for ym in months)
            res["prorated"] = p
            res["prorated_math"] = (" + ".join(fmt(mv[ym], money) for ym in months) + " = " + fmt(p, money) +
                                    f" (the monthly goals, {ym_text(months[0])} through {ym_text(months[-1])})")
            res["goal_kind"] = "monthly"
        if k in goals["annual"]:
            res["annual"] = goals["annual"][k]["value"]
        elif len(mv) == 12:
            res["annual"] = sum(mv.values())
            res["annual_math"] = " + ".join(fmt(mv[ym], money) for ym in sorted(mv)) + " = " + fmt(res["annual"], money)
    if res["prorated"] is None and k in goals["annual"]:
        a = goals["annual"][k]["value"]
        res["annual"] = a
        res["quote"] = goals["annual"][k]["quote"]
        p = a * n / 12
        res["prorated"] = p
        res["prorated_math"] = f"{fmt(a, money)} x {n} / 12 = {fmt(p, money) if money else fmt(p, dec=1)}"
        res["goal_kind"] = "annual, prorated evenly"
    if res["prorated"] is None or ytd is None:
        return res
    p = res["prorated"]
    ps = fmt(p, money) if money else fmt(p, dec=1)
    if p > 0:
        pct = 100.0 * ytd / p
        res["pace"] = round(pct, 1)
        res["pace_math"] = f"{fmt(ytd, money)} / {ps} = {pct:.1f}% of the prorated goal"
    d = ytd - p
    if abs(d) < 1e-9:
        res["diff_math"] = "at the prorated goal"
    elif d > 0:
        res["diff_math"] = f"{fmt(ytd, money)} minus {ps} = {fmt(d, money) if money else fmt(d, dec=1)} over the prorated goal"
    else:
        res["diff_math"] = f"{ps} minus {fmt(ytd, money)} = {fmt(-d, money) if money else fmt(-d, dec=1)} under the prorated goal"
    return res


def to_go(k, ytd, annual, months_left):
    money = k in MONEY
    if annual is None or ytd is None:
        return ""
    rem = annual - ytd
    if rem <= 0:
        return f"the annual goal of {fmt(annual, money)} is reached ({fmt(ytd, money)} so far)"
    if months_left <= 0:
        return f"{fmt(annual, money)} minus {fmt(ytd, money)} = {fmt(rem, money)} to the annual goal, with no months left in the plan year"
    per = rem / months_left
    ml = f"{months_left} month{'s' if months_left != 1 else ''} left"
    return (f"({fmt(annual, money)} minus {fmt(ytd, money)}) / {ml} = "
            f"{fmt(per, money) if money else fmt(per, dec=1)} a month to reach the annual goal of {fmt(annual, money)}")


def rate_text(n, d):
    if d == 0:
        return None, "n/a (0 in the denominator)"
    pct = 100.0 * n / d
    return round(pct, 1), f"{fmt(n)} / {fmt(d)} = {pct:.1f}%"


def analyze(args):
    overrides = json.load(open(args.columns, encoding="utf-8")) if args.columns else {}
    as_of = datetime.strptime(args.as_of, "%Y-%m-%d").date() if args.as_of else date.today()
    plan_arg = parse_ym_arg(args.plan_start)
    default_year = (plan_arg or (as_of.year, 1))[0]
    nums, cells, dup, total, odd = load_numbers(args.numbers, args.agent, overrides, default_year)
    measures = nums["measures"]
    goals = load_goals(args.goals, args.goals_source or [], measures)
    o = {"numbers": nums, "as_of": as_of.isoformat(), "goals": goals, "odd": odd, "flags": []}

    as_ym = (as_of.year, as_of.month)
    last_day = (as_of + timedelta(days=1)).month != as_of.month
    last_full = as_ym if last_day else prev_ym(as_ym)
    data_months = sorted(cells)
    o["months_in_file"] = [ym_key(m) for m in data_months]
    if args.through:
        through = parse_ym_arg(args.through)
        o["through_source"] = "the month the user named (--through)"
        if through and through > last_full:
            o["flags"].append(f"--through {ym_text(through)} includes a month that isn't over on {us(as_of.isoformat())}")
    else:
        usable = [m for m in data_months if m <= last_full]
        through = min(last_full, usable[-1]) if usable else None
        o["through_source"] = ("the last full month before the as-of date" if through == last_full
                               else "the last month in the file before the as-of date")
    if through is None and total is not None:
        o["flags"].append("The file has only a total row; rerun with --through YYYY-MM (the last month the total covers)")
    plan_start = plan_arg or goals["plan_start"] or ((through[0], 1) if through else None)
    o["plan_start"] = ym_key(plan_start) if plan_start else None
    o["through"] = ym_key(through) if through else None
    window = months_between(plan_start, through) if (plan_start and through and through >= plan_start) else []
    o["window"] = [ym_key(m) for m in window]
    o["months_elapsed"] = len(window)
    o["months_left"] = max(0, 12 - len(window))
    after = [m for m in data_months if through and m > through]
    o["after_window"] = []
    for m in after:
        kind = ("month to date (a partial month), left out of the pace math" if m == as_ym
                else "after the as-of date: check the file" if m > as_ym
                else "after the pace window, left out")
        if m > as_ym:
            odd.append({"where": ym_text(m), "what": f"a month after the as-of date {us(as_of.isoformat())}",
                        "treated": "left out of every sum"})
        o["after_window"].append({"month": ym_key(m), "label": ym_text(m), "kind": kind,
                                  "values": {k: [cells[m].get(k, (None, 'empty', ''))[0],
                                                 cells[m].get(k, (None, 'empty', ''))[1],
                                                 cell(cells[m].get(k, (None, 'empty', ''))[2])] for k in measures}})
    before = [m for m in data_months if plan_start and m < plan_start]
    o["before_window"] = [ym_key(m) for m in before]
    only_total = bool(not data_months and total is not None and window)
    o["only_total"] = only_total

    # Year to date and pace.
    o["ytd"] = {}
    for k in measures:
        money = k in MONEY
        if only_total:
            v, st, raw = total.get(k, (None, "empty", ""))
            ytd, math, probs = (v, f"{fmt(v, money)} as printed in the file's total row", []) if st == "num" else (
                None, "", [f"the total row's {LABEL[k]} is not a usable number"])
        else:
            ytd, math, probs = total_over(cells, dup, window, k, money)
        p = pace_for(k, ytd, window, goals) if window else pace_for(k, None, [], goals)
        tg = to_go(k, ytd, p["annual"], o["months_left"]) if window else ""
        o["ytd"][k] = {"label": LABEL[k], "money": money, "ytd": ytd, "ytd_math": math, "problems": probs, **p,
                       "to_go_math": tg}
    o["has_goals"] = any(o["ytd"][k]["prorated"] is not None for k in measures)
    o["goals_unread"] = [LABEL[k] for k in list(goals["annual"]) + list(goals["monthly"]) if k not in measures]

    # The file's own total row, when it has one: does it tie to the run's sum of every month in the file?
    o["total_row"] = None
    if total is not None and data_months:
        ties = []
        for k in measures:
            v, st, raw = total.get(k, (None, "empty", ""))
            s, _, probs = total_over(cells, dup, data_months, k, k in MONEY)
            if st != "num" or s is None:
                ties.append([LABEL[k], cell(raw), "not compared"])
            else:
                ties.append([LABEL[k], fmt(v, k in MONEY), "ties" if abs(v - s) < 0.5 else f"differs: the months add to {fmt(s, k in MONEY)}"])
        o["total_row"] = ties

    # Rates (count ratios over the window).
    o["rates"] = []
    for rk, a, b, label in RATES:
        if a not in measures or b not in measures:
            continue
        ya, yb = o["ytd"][a]["ytd"], o["ytd"][b]["ytd"]
        if ya is None or yb is None:
            o["rates"].append({"key": rk, "label": label, "pct": None, "math": "not worked out (a total is missing)",
                               "goal": goals["rates"].get(rk)})
            continue
        pct, math = rate_text(yb, ya)
        g = goals["rates"].get(rk)
        cmp = ""
        if g and pct is not None:
            diff = pct - g["value"]
            cmp = ("at the plan's " if abs(diff) < 0.05 else ("over the plan's " if diff > 0 else "under the plan's ")) + fmt(g["value"]) + "%"
        o["rates"].append({"key": rk, "label": label, "pct": pct, "math": math, "goal": g, "against_goal": cmp})

    # What changed since the last one-on-one.
    o["since"] = None
    if args.last_1on1:
        l1 = datetime.strptime(args.last_1on1, "%Y-%m-%d").date()
        l_ym = (l1.year, l1.month)
        l_last_day = (l1 + timedelta(days=1)).month != l1.month
        then_through = l_ym if l_last_day else prev_ym(l_ym)
        if through and then_through > through:
            then_through = through
        s = {"date": l1.isoformat(), "then_through": ym_key(then_through), "then_label": ym_text(then_through),
             "months_since": [], "rows": [], "averages": [], "note": ""}
        if not window or not plan_start or then_through < plan_start:
            s["note"] = "The last one-on-one came before a full month of this plan year closed, so there is no earlier year to date to compare."
        elif only_total:
            s["note"] = "The file has year-to-date totals only, so what changed month by month can't be worked out."
        else:
            then_window = months_between(plan_start, then_through)
            since = [m for m in window if m > then_through]
            s["months_since"] = [ym_text(m) for m in since]
            if not since:
                s["note"] = (f"No full month has closed since the last one-on-one ({l1.strftime('%m/%d/%Y')}): "
                             f"the numbers run through {ym_text(through)} both times.")
            for k in measures:
                money = k in MONEY
                t0, m0, p0 = total_over(cells, dup, then_window, k, money)
                t1 = o["ytd"][k]["ytd"]
                pc0 = pace_for(k, t0, then_window, goals)
                vals = []
                for m in since:
                    v, st, raw = cells.get(m, {}).get(k, (None, "empty", ""))
                    vals.append(fmt(v, money) if st == "num" else ("(empty)" if st == "empty" else f'"{cell(raw)}"'))
                s["rows"].append({"measure": k, "label": LABEL[k], "ytd_then": t0, "ytd_then_text": fmt(t0, money) if t0 is not None else "not totaled",
                                  "since_values": vals, "ytd_now_text": fmt(t1, money) if t1 is not None else "not totaled",
                                  "pace_then": pc0["pace_math"] or "", "pace_now": o["ytd"][k]["pace_math"] or ""})
                if len(then_window) >= 3 and since:
                    tb, mb, pb = total_over(cells, dup, then_window, k, money)
                    if tb is not None:
                        avg = tb / len(then_window)
                        sv = []
                        ok = True
                        for m in since:
                            v, st, raw = cells.get(m, {}).get(k, (None, "empty", ""))
                            if st != "num":
                                ok = False
                            else:
                                sv.append(v)
                        s["averages"].append({
                            "measure": k, "label": LABEL[k],
                            "avg_math": f"{fmt(tb, money)} / {len(then_window)} = {fmt(avg, money) if money else fmt(avg, dec=1)} a month",
                            "avg": avg, "months": f"{ym_text(then_window[0])} through {ym_text(then_window[-1])}",
                            "since": [f"{ym_text(m)}: {fmt(v, money)}" for m, v in zip(since, sv)] if ok else [],
                            "since_mean": (sum(sv) / len(sv)) if ok and sv else None})
        o["since"] = s

    # Focus candidates, from the numbers only. With goals: measures under the prorated goal, lowest pace first, with
    # any rate under the plan's rate attached to the measure it feeds. Without goals: measures whose months since the
    # last one-on-one came in under the agent's own monthly average before it, furthest under first.
    cands = []
    if o["has_goals"]:
        under = sorted([k for k in measures if o["ytd"][k]["pace"] is not None and o["ytd"][k]["pace"] < 100],
                       key=lambda k: (o["ytd"][k]["pace"], ORDER.index(k)))
        for k in under:
            y = o["ytd"][k]
            facts = [f"{LABEL[k]}: {y['pace_math']} ({y['prorated_math']})"]
            for r in o["rates"]:
                if r.get("against_goal", "").startswith("under") and dict((x[0], x[2]) for x in RATES)[r["key"]] == k:
                    facts.append(f"{r['label']}: {r['math']}, {r['against_goal']} (\"{r['goal']['quote']}\")")
            if o["since"]:
                for a in o["since"]["averages"]:
                    if a["measure"] == k and a["since"]:
                        facts.append(f"{', '.join(a['since'])}, against the monthly average of {a['avg_math']} ({a['months']})")
            cands.append({"measure": k, "label": LABEL[k], "basis": "under the prorated goal", "facts": facts})
        listed = {c["measure"] for c in cands}
        for r in o["rates"]:
            feeds = dict((x[0], x[2]) for x in RATES)[r["key"]]
            if r.get("against_goal", "").startswith("under") and feeds not in listed:
                cands.append({"measure": r["key"], "label": r["label"], "basis": "a rate under the plan's rate",
                              "facts": [f"{r['label']}: {r['math']}, {r['against_goal']} (\"{r['goal']['quote']}\")"]})
    elif o["since"]:
        rows = [a for a in o["since"]["averages"] if a["since_mean"] is not None and a["since_mean"] < a["avg"]]
        rows.sort(key=lambda a: (a["since_mean"] / a["avg"] if a["avg"] else 1, ORDER.index(a["measure"])))
        for a in rows:
            cands.append({"measure": a["measure"], "label": a["label"],
                          "basis": "the months since the last one-on-one, under the agent's own monthly average",
                          "facts": [f"{', '.join(a['since'])}, against the monthly average of {a['avg_math']} ({a['months']})"]})
    o["focus_candidates"] = cands
    return o


def report_md(o):
    n = o["numbers"]
    ag = n.get("agent") or "[Agent Name]"
    out = [f"# One-on-One Prep Data: {ag}", ""]
    out += ["## Files Read", ""]
    where = f"{n['file']}" + (f", sheet \"{n['sheet']}\"" if n["sheet"] else "")
    out.append(f"- Numbers: {where}, header on row {n['header_row']}, "
               + ("one row per month." if n["layout"] == "long" else "months across the top, one measure per row."))
    if n["agent_column"]:
        out.append(f"- Agent column: {n['agent_column']}. Rows kept: {ag}. "
                   + (f"Rows for {n['other_agents']} other agent(s) ({n['rows_other_agents']} rows) were left out and are not shown anywhere."
                      if n["other_agents"] else "No other agent in the file."))
    cols = [f"{LABEL[k]} from \"{n['columns'][k][1]}\"" for k in n["measures"]]
    out.append("- Measures read: " + "; ".join(cols) + ".")
    if "month" in n["columns"]:
        out.append(f"- Month from: {n['columns']['month']}.")
    for c in n["confirm"]:
        out.append(f"- Confirm: {c}.")
    for c in n["month_notes"]:
        out.append(f"- Confirm: {c}.")
    if n["not_read"]:
        out.append("- Columns not read: " + ", ".join(n["not_read"]) + ".")
    if n["pay_not_read"]:
        out.append("- Pay columns not read (no value from them appears anywhere): " + ", ".join(n["pay_not_read"]) + ".")
    missing = [LABEL[k] for k in ORDER if k not in n["measures"] and k != "conversations"]
    if missing:
        out.append("- Not in the file: " + ", ".join(missing) + ".")
    out += ["", "## Settings", ""]
    out.append(f"- As of: {us(o['as_of'])}.")
    if o["window"]:
        out.append(f"- Pace window: {ym_text(parse_ym_arg(o['window'][0]))} through {ym_text(parse_ym_arg(o['window'][-1]))}, "
                   f"{o['months_elapsed']} month{'s' if o['months_elapsed'] != 1 else ''}, through {o['through_source']}. Months left in the plan year: {o['months_left']}.")
    else:
        out.append("- Pace window: none (no full month of the plan year in the file).")
    if o["before_window"]:
        out.append("- Months before the plan year, left out: " + ", ".join(ym_text(parse_ym_arg(m)) for m in o["before_window"]) + ".")
    for a in o["after_window"]:
        out.append(f"- {a['label']}: {a['kind']}.")
    if o["only_total"]:
        out.append("- Year to date comes from the file's total row: the file has no monthly rows, so nothing month by "
                   "month (what changed, monthly averages) can be worked out.")
    for f in o["flags"]:
        out.append(f"- Flag: {f}.")
    g = o["goals"]
    out += ["", "## Goals Read", ""]
    rows = []
    for k, e in g["annual"].items():
        rows.append([LABEL[k], fmt(e["value"], k in MONEY), "annual", e["quote"]])
    for k, e in g["monthly"].items():
        rows.append([LABEL[k], ", ".join(f"{ym_text(m)[:3]} {fmt(v, k in MONEY)}" for m, v in sorted(e["values"].items())), "monthly", e["quote"]])
    for k, e in g["rates"].items():
        rows.append([RATE_LABEL[k], fmt(e["value"]) + "%", "rate", e["quote"]])
    if rows:
        out.append(table(["Goal", "Value", "Kind", "Quote"], rows))
        out.append("")
        out.append("- Quotes checked against: " + (", ".join(g["sources"]) if g["checked"] else "nothing (no --goals-source given): confirm each goal") + ".")
    else:
        out.append("No goal given: no prorated goal and no pace math.")
    for r in g["rejected"]:
        out.append(f"- Left out: {r['goal']}: {r['why']}.")
    if o["goals_unread"]:
        out.append("- Goals with no matching column in the numbers: " + ", ".join(o["goals_unread"]) + ".")

    out += ["", "## Month by Month", ""]
    meas = n["measures"]
    cells_rows = []
    window = [parse_ym_arg(m) for m in o["window"]]
    md = {}
    # rebuild from ytd math is lossy; the json carries the cells
    for ym in window:
        md[ym] = o["_cells"].get(ym_key(ym), {})
    for ym in ([] if o["only_total"] else window):
        row = [ym_text(ym)]
        for k in meas:
            v, st, raw = md[ym].get(k, (None, "missing", ""))
            row.append(fmt(v, k in MONEY) if st == "num" else ("(empty)" if st == "empty" else ("(no row)" if st == "missing" else f'"{raw}"')))
        cells_rows.append(row)
    if window:
        cells_rows.append([f"Year to date ({o['months_elapsed']} months)"] +
                          [fmt(o["ytd"][k]["ytd"], k in MONEY) if o["ytd"][k]["ytd"] is not None else "not totaled" for k in meas])
    for a in o["after_window"]:
        cells_rows.append([f"{a['label']} ({'partial' if 'partial' in a['kind'] else 'left out'})"] +
                          [fmt(a["values"][k][0], k in MONEY) if a["values"][k][1] == "num" else ("(empty)" if a["values"][k][1] == "empty" else f'"{a["values"][k][2]}"') for k in meas])
    out.append(table(["Month"] + [LABEL[k] for k in meas], cells_rows) if cells_rows else "No months in the window.")

    out += ["", "## Year to Date Against the Prorated Goal", ""]
    for k in meas:
        y = o["ytd"][k]
        out.append(f"### {LABEL[k]}")
        if y["ytd"] is None:
            out.append(f"- Year to date: not totaled ({'; '.join(y['problems']) or 'no months in the window'}).")
        else:
            out.append(f"- Year to date: {y['ytd_math']}.")
        if y["prorated"] is None:
            out.append("- Goal: none given for this measure, so no pace math." if not y["goal_kind"] and not y["quote"]
                       else "- Goal: the monthly goals don't cover every month in the window, so no pace math.")
        else:
            out.append(f"- Prorated goal ({y['goal_kind']}): {y['prorated_math']}. Goal as written: \"{y['quote']}\".")
            if y["pace_math"]:
                out.append(f"- Pace: {y['pace_math']}.")
                out.append(f"- Difference: {y['diff_math']}.")
            if y["to_go_math"]:
                out.append(f"- To the annual goal: {y['to_go_math']}.")
            if y["annual_math"]:
                out.append(f"- Annual goal from the monthly goals: {y['annual_math']}.")
        out.append("")

    out += ["## Count Ratios (Same Months)", ""]
    if o["rates"]:
        out.append(table(["Ratio", "Year to date", "Plan's rate", "Against the plan"],
                         [[r["label"], r["math"], (fmt(r["goal"]["value"]) + "%") if r.get("goal") else "", r.get("against_goal", "")] for r in o["rates"]]))
        out.append("")
        out.append("Each ratio divides one year-to-date count by another for the same months. A deal signed in March may "
                   "come from a February appointment, so these are not cohort conversion rates; Sisu's own conversion "
                   "figures stay the source of record.")
    else:
        out.append("No pair of measures to compare.")

    out += ["", "## Since the Last One-on-One", ""]
    s = o["since"]
    if not s:
        out.append("No last one-on-one date given (--last-1on1), so nothing is compared.")
    else:
        out.append(f"- Last one-on-one: {us(s['date'])}. Its numbers ran through {s['then_label']} (the last full month before it).")
        if s["months_since"]:
            out.append("- Months added since: " + ", ".join(s["months_since"]) + ".")
        if s["note"]:
            out.append(f"- {s['note']}")
        if s["rows"]:
            out.append("")
            out.append(table(["Measure", f"YTD through {s['then_label']}", "Added since (by month)", "YTD now", "Pace then", "Pace now"],
                             [[r["label"], r["ytd_then_text"], ", ".join(r["since_values"]) or "none", r["ytd_now_text"],
                               r["pace_then"] or "no goal", r["pace_now"] or "no goal"] for r in s["rows"]]))
            out.append("")
            out.append("Both columns come from this file. If an earlier month was changed in the source since the last "
                       "one-on-one, the then column can differ from what was seen at the time.")
        if s["averages"]:
            out.append("")
            out.append(table(["Measure", "Monthly average before", "Months since"],
                             [[a["label"], f"{a['avg_math']} ({a['months']})", "; ".join(a["since"]) or "a month since is not a usable number"] for a in s["averages"]]))

    out += ["", "## Focus Candidates (From the Numbers)", ""]
    if o["focus_candidates"]:
        for i, c in enumerate(o["focus_candidates"], 1):
            out.append(f"{i}. {c['label']} ({c['basis']}): " + " ".join(f + "." for f in c["facts"]))
    else:
        out.append("None: no measure is under its prorated goal" + ("" if o["has_goals"] else " (no goal given) and no measure came in under the agent's own monthly average since the last one-on-one") + ".")
    if o["total_row"]:
        out += ["", "## The File's Total Row", ""]
        out.append(table(["Measure", "Total row", "Against the run's sum of every month in the file"], o["total_row"]))
        out.append("")
        out.append("The run never uses the file's total row for a year-to-date figure when the months are there; it adds the months itself.")
    out += ["", "## Odd Cells and Rows", ""]
    out.append(table(["Where", "What", "How it was treated"], [[x["where"], x["what"], x["treated"]] for x in o["odd"]]) if o["odd"] else "None.")
    return "\n".join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Agent 1:1 Prep")
    ap.add_argument("--numbers", required=True)
    ap.add_argument("--agent")
    ap.add_argument("--goals")
    ap.add_argument("--goals-source", action="append")
    ap.add_argument("--as-of")
    ap.add_argument("--last-1on1")
    ap.add_argument("--through")
    ap.add_argument("--plan-start")
    ap.add_argument("--columns")
    ap.add_argument("--out", default=".")
    args = ap.parse_args(argv)
    o = analyze(args)
    # The month cells, for the month table and the json.
    overrides = json.load(open(args.columns, encoding="utf-8")) if args.columns else {}
    plan_arg = parse_ym_arg(args.plan_start)
    as_of = datetime.strptime(args.as_of, "%Y-%m-%d").date() if args.as_of else date.today()
    _, cells, _, _, _ = load_numbers(args.numbers, args.agent, overrides, (plan_arg or (as_of.year, 1))[0])
    o["_cells"] = {ym_key(m): {k: (v[0], v[1], cell(v[2])) for k, v in c.items()} for m, c in cells.items()}
    md = report_md(o)
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "one_on_one_data.md"), "w", encoding="utf-8") as f:
        f.write(md + "\n")
    o["cells"] = o.pop("_cells")

    def plain(x):
        if isinstance(x, dict):
            return {(ym_key(k) if isinstance(k, tuple) else k): plain(v) for k, v in x.items()}
        if isinstance(x, (list, tuple)):
            return [plain(v) for v in x]
        return x

    with open(os.path.join(args.out, "one_on_one_data.json"), "w", encoding="utf-8") as f:
        json.dump(plain(o), f, indent=1, default=str)
    print(md)


if __name__ == "__main__":
    main()
```
