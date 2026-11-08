# Analysis Code

Last verified: 2026-11-08. The terms and formulas this code uses are explained, with sources, in `pnl-terms.md`; the layouts it reads (QuickBooks Online and Desktop, Xero, the P&L Detail, Sisu and back-office closing exports) are in `exports.md`. The thresholds at the top are this skill's defaults, not industry standards.

Run this code with Python 3 on the uploaded files. It uses Python's standard library, plus openpyxl for an .xlsx file and pdfplumber (or the pdftotext command) for a PDF. Do not paste it into the conversation. It never prints client names, addresses, agents' payouts, employees' pay or memo lines: charges in agent split, payroll and owner accounts show "(payee not shown)".

Usage:

    python3 pnl.py PNL_FILE [--detail DETAIL_FILE] [--production CLOSINGS_FILE] [--budget BUDGET_FILE] [--map map.json] [--out FOLDER]

It prints the full report and writes pnl_report.md (every table with its arithmetic), pnl_report.json (the same numbers and flags) and pnl_accounts.csv (each account by month and the category it was read as) to FOLDER.

What it does, in order: finds the month columns; reads each account under its section (income, cost of goods sold, expenses, other income, other expenses) and parent accounts; checks that the accounts add up to the report's own totals and Net Income; sorts each account into a category; works out month by month whether commission income is recorded gross (with agent splits as a cost) or net; computes company dollar, margin, the expense mix and the changes; flags account-level patterns; and, when given, reads the P&L Detail (duplicate charges, new vendors, a vendor in an unusual account), the production export (reconciliation, cost per closing, lead source return) and a budget.

```python
#!/usr/bin/env python3
# Team P&L Review analysis (Amplified Impact). Python 3 standard library, plus openpyxl for an .xlsx
# upload and pdfplumber (or the pdftotext command) for a .pdf upload.
#
# Reads a real estate team's P&L export (QuickBooks Online or Desktop, Xero, or a spreadsheet in the same
# shape: accounts down the side, months across the top) and, when given, a P&L Detail export, a closed-deal
# production export and a budget. Writes to --out:
#   pnl_report.md     every table, with the arithmetic shown
#   pnl_report.json   the same numbers and the flags, for drafting
#   pnl_accounts.csv  each account by month with the category it was read as, for checking
#
# Usage:
#   python3 pnl.py PNL_FILE [--detail DETAIL_FILE] [--production PROD_FILE] [--budget BUDGET_FILE]
#                  [--map map.json] [--out DIR]
#
# map.json is optional. Build it only from what the user said or what the run showed was misread, e.g.
#   {"accounts": {"Contract Labor": "agent_splits", "Marketing:Hollowbrook": "marketing"},
#    "lead_sources": {"Pumpkinpatch Portal": ["Online Lead Programs:Pumpkinpatch Portal"]},
#    "production_columns": {"gci": "Total Commission"}, "thresholds": {"dup_days": 5}}
# Categories: commission, agent_fees, other_income, contra_splits, agent_splits, referral_fees,
# brokerage_fees, lead_gen, marketing, people, tech, occupancy, other, owner, uncategorized.

import argparse
import csv
import json
import os
import re
import statistics
import subprocess
import sys
from collections import OrderedDict, defaultdict
from datetime import date, datetime, timedelta

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

DEFAULTS = {
    "gross_band_low": 0.5,        # split share under half the typical share: a low-split month
    "gross_band_high": 1.5,       # split share over 1.5 times the typical share: a high-split month
    "recon_tolerance": 0.05,      # P&L commission income within 5% of a production figure counts as a match
    "spike_ratio": 1.8,           # a month at 1.8 times the account's usual month or more
    "spike_min": 200.0,           # and at least $200 above it
    "double_tolerance": 0.02,     # within 2% of exactly twice the usual month: possible duplicate
    "dup_days": 7,                # same vendor, amount and account within 7 days: possible duplicate
    "recurring_min_months": 2,    # new vendor or account charged in at least 2 months in a row, through the last month
    "recurring_amount_ratio": 1.25,
    "contract_labor_share": 0.3,  # contract labor at 30% or more of commission income may be agent payouts
    "brokerage_share_drop": 0.4,  # brokerage fees as a share of commission income 40% below their usual share
}
OPEX = ["lead_gen", "marketing", "people", "tech", "occupancy", "other"]
CAT_NAMES = {
    "commission": "Commission income", "agent_fees": "Fees charged to agents", "other_income": "Other income",
    "contra_splits": "Agent splits recorded inside income", "agent_splits": "Agent splits",
    "referral_fees": "Referral fees paid", "brokerage_fees": "Brokerage split and fees",
    "lead_gen": "Lead generation", "marketing": "Marketing", "people": "People", "tech": "Tech",
    "occupancy": "Occupancy", "other": "Other", "owner": "Owner draws or distributions",
    "uncategorized": "Uncategorized", "uncategorized_income": "Uncategorized income",
}
COST_OF_SALE = ("agent_splits", "referral_fees", "brokerage_fees")
MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS = {m.lower(): i + 1 for i, m in enumerate(MON)}
MONTHS.update({"sept": 9, "january": 1, "february": 2, "march": 3, "april": 4, "june": 6, "july": 7,
               "august": 8, "september": 9, "october": 10, "november": 11, "december": 12})


# --- small helpers ---------------------------------------------------------------------------------

def norm(s):
    s = str(s or "").replace("·", " ").strip().lower()
    s = re.sub(r"^\d+(\.\d+)?\s*[\-:.]?\s+", "", s)  # account number prefix
    return re.sub(r"\s+", " ", s).strip()


def num(v):
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if s in ("", "-", "--") or "%" in s:
        return None
    neg = (s.startswith("(") and s.endswith(")")) or s.startswith("-") or s.endswith("-")
    t = re.sub(r"[,$()\s]", "", s).strip("-")
    if not re.fullmatch(r"\d+(\.\d+)?", t):
        return None
    x = float(t)
    return -x if neg else x


def money(x):
    if x is None:
        return "n/a"
    s = f"${abs(x):,.0f}"
    return "-" + s if round(x) < 0 else s


def m2(x):
    return f"{x:,.2f}"


def pct(x):
    return "n/a" if x is None else f"{x * 100:.1f}%"


def fm(x):
    """An operand in a printed formula: negatives in parentheses."""
    return f"({x:,.2f})" if x < 0 else f"{x:,.2f}"


def div(a, b):
    return None if not b else a / b


def mlabel(key):
    if re.fullmatch(r"\d{4}-\d{2}", key):
        y, m = key.split("-")
        return f"{MON[int(m) - 1]} {y}"
    return key


def parse_month(v, year_hint=None):
    if isinstance(v, (datetime, date)):
        return (v.year, v.month)
    s = str(v or "").strip().lower().replace(".", "")
    if not s:
        return None
    m = re.fullmatch(r"([a-z]{3,9})[\s,\-/']*(\d{2}|\d{4})", s)
    if m and m.group(1) in MONTHS:
        y = int(m.group(2))
        return (y + 2000 if y < 100 else y, MONTHS[m.group(1)])
    m = re.fullmatch(r"(\d{4})-(\d{1,2})", s)
    if m and 1 <= int(m.group(2)) <= 12:
        return (int(m.group(1)), int(m.group(2)))
    m = re.fullmatch(r"(\d{1,2})/(\d{4})", s)
    if m and 1 <= int(m.group(1)) <= 12:
        return (int(m.group(2)), int(m.group(1)))
    m = re.fullmatch(r"([a-z]{3,9})\s+1\s*-\s*(?:[a-z]{3,9}\s+)?(\d{1,2}),?\s*(\d{4})", s)
    if m and m.group(1) in MONTHS:
        return (int(m.group(3)), MONTHS[m.group(1)])
    if s in MONTHS and year_hint:
        return (year_hint, MONTHS[s])
    return None


def parse_date(v):
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v or "").strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%Y/%m/%d", "%m-%d-%Y", "%d-%b-%Y", "%b %d, %Y", "%B %d, %Y",
                "%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


# --- loading files into rows -----------------------------------------------------------------------

def load_rows(path):
    """Rows as lists of cells, each with a level (indent) for its first text cell."""
    ext = os.path.splitext(path)[1].lower()
    if ext in (".xlsx", ".xlsm"):
        return load_xlsx(path)
    if ext == ".pdf":
        return load_pdf(path)
    if ext == ".xls":
        sys.exit("This is an old .xls file. Save it as .xlsx or .csv (or export it again as Excel) and rerun.")
    return load_csv(path)


def load_xlsx(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    best, best_n = None, -1
    for ws in wb.worksheets:  # QuickBooks Desktop adds a tips sheet; take the sheet with the most numbers
        n = sum(1 for row in ws.iter_rows(values_only=True) for v in row if isinstance(v, (int, float)))
        if n > best_n:
            best, best_n = ws, n
    rows = []
    for row in best.iter_rows():
        cells = [c.value for c in row]
        level = None
        for i, c in enumerate(row):
            if isinstance(c.value, str) and c.value.strip():
                ind = (c.alignment.indent or 0) if c.alignment is not None else 0
                lead = len(c.value) - len(c.value.lstrip(" "))
                level = i * 10 + ind + lead / 2
                break
        rows.append({"cells": cells, "level": level})
    return rows


def load_csv(path):
    for enc in ("utf-8-sig", "latin-1"):
        try:
            with open(path, newline="", encoding=enc) as f:
                data = list(csv.reader(f))
            break
        except UnicodeDecodeError:
            continue
    rows = []
    for r in data:
        level = None
        for i, c in enumerate(r):
            if c.strip() and num(c) is None:
                level = i * 10 + (len(c) - len(c.lstrip(" "))) / 2
                break
        rows.append({"cells": r, "level": level})
    return rows


def pdf_lines(path):
    """Each line of the PDF as a list of words with x0, x1 (pdfplumber), or character columns (pdftotext)."""
    pages = []
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                words = page.extract_words(keep_blank_chars=False, use_text_flow=False, x_tolerance=1.5)
                lines = []
                for w in sorted(words, key=lambda w: (round(w["top"]), w["x0"])):
                    if lines and abs(lines[-1]["top"] - w["top"]) <= 2.5:
                        lines[-1]["words"].append(w)
                    else:
                        lines.append({"top": w["top"], "words": [w]})
                pages.append([[{"t": w["text"], "x0": w["x0"], "x1": w["x1"]} for w in sorted(l["words"], key=lambda w: w["x0"])] for l in lines])
        return pages, "pdfplumber"
    except ImportError:
        pass
    out = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout
    for ptxt in out.split("\f"):
        lines = []
        for line in ptxt.splitlines():
            ws = [{"t": m.group(0), "x0": m.start(), "x1": m.end()} for m in re.finditer(r"\S+", line)]
            if ws:
                lines.append(ws)
        pages.append(lines)
    return pages, "pdftotext"


def header_tokens(words, year_hint):
    toks, i = [], 0
    while i < len(words):
        w = words[i]
        t = w["t"]
        if i + 1 < len(words) and t.lower().strip(".") in MONTHS and re.fullmatch(r"'?\d{2}|\d{4}", words[i + 1]["t"]):
            toks.append({"t": t + " " + words[i + 1]["t"].strip("'"), "x0": w["x0"], "x1": words[i + 1]["x1"]})
            i += 2
            continue
        toks.append(dict(w))
        i += 1
    cols = [t for t in toks if parse_month(t["t"], year_hint) or t["t"].strip().lower() in ("total", "totals")]
    months = [t for t in cols if parse_month(t["t"], year_hint)]
    if len(cols) < 0.75 * len(toks):  # a title such as "January through October 2026" is not a header
        return None
    return cols if len(months) >= 2 or (months and len(cols) >= 2) else None


def load_pdf(path):
    pages, engine = pdf_lines(path)
    rows, year_hint = [], None
    for lines in pages:
        anchors = None
        for words in lines:
            text = " ".join(w["t"] for w in words)
            if year_hint is None:
                y = re.search(r"\b(20\d{2})\b", text)
                year_hint = int(y.group(1)) if y else None
            cols = header_tokens(words, year_hint)
            if cols:
                anchors = cols
                rows.append({"cells": [""] + [c["t"] for c in cols], "level": None, "header": True})
                continue
            if not anchors:
                rows.append({"cells": [text], "level": words[0]["x0"]})
                continue
            boundary = anchors[0]["x0"] - (8 if engine == "pdfplumber" else 1)
            label_words = [w for w in words if w["x1"] <= boundary or num(w["t"]) is None]
            nums = [w for w in words if w not in label_words]
            cells = [None] * len(anchors)
            for w in nums:
                j = min(range(len(anchors)), key=lambda k: abs(anchors[k]["x1"] - w["x1"]))
                cells[j] = w["t"]
            label = " ".join(w["t"] for w in label_words)
            rows.append({"cells": [label] + cells, "level": label_words[0]["x0"] if label_words else None})
    return rows


# --- the P&L --------------------------------------------------------------------------------------

SECTIONS = {
    "income": "income", "revenue": "income", "revenues": "income", "trading income": "income", "sales": "income",
    "cost of goods sold": "cogs", "cost of sales": "cogs", "cogs": "cogs", "cost of revenue": "cogs",
    "direct costs": "cogs", "cost of goods sold (cogs)": "cogs",
    "expenses": "expense", "expense": "expense", "operating expenses": "expense", "overhead": "expense",
    "other income": "other_income", "other revenue": "other_income",
    "other expenses": "other_expense", "other expense": "other_expense",
}
IGNORE = {"ordinary income/expense", "other income/expense", "other income / expense", "ordinary income / expense"}
COMPUTED = {"gross profit": "gross_profit", "net operating income": "net_operating_income",
            "net ordinary income": "net_operating_income", "operating profit": "net_operating_income",
            "net other income": "net_other_income", "net income": "net_income", "net profit": "net_income",
            "net income (loss)": "net_income", "net loss": "net_income", "net earnings": "net_income"}


def find_header(rows):
    year_hint = None
    for r in rows[:12]:
        for c in r["cells"]:
            y = re.search(r"\b(20\d{2})\b", str(c or ""))
            if y:
                year_hint = int(y.group(1))
                break
        if year_hint:
            break
    for i, r in enumerate(rows):
        cols = []
        for j, c in enumerate(r["cells"]):
            if j == 0 and not r.get("header"):
                continue
            pm = parse_month(c, year_hint)
            text = str(c or "").strip()
            if pm:
                cols.append((j, f"{pm[0]:04d}-{pm[1]:02d}", True))
            elif text.lower() in ("total", "totals", "ytd", "total ytd"):
                cols.append((j, "Total", False))
        if sum(1 for c in cols if c[2]) >= 1 and len(cols) >= 2 or sum(1 for c in cols if c[2]) >= 2:
            return i, cols, year_hint
    # one column: a "Total" header, or any text header above the first numbers
    for i, r in enumerate(rows):
        for j, c in enumerate(r["cells"][1:], start=1):
            if str(c or "").strip().lower() in ("total", "totals") or re.search(r"\d{4}", str(c or "")) and not num(c):
                below = rows[i + 1:i + 8]
                if any(len(b["cells"]) > j and num(b["cells"][j]) is not None for b in below):
                    return i, [(j, str(c).strip(), False)], year_hint
    return None, [], year_hint


def parse_pnl(path):
    rows = load_rows(path)
    hi, cols, year_hint = find_header(rows)
    if hi is None:
        sys.exit(f"Could not find the column headings (months or Total) in {os.path.basename(path)}.")
    month_cols = [(j, k) for j, k, is_m in cols if is_m]
    total_col = next((j for j, k, is_m in cols if not is_m and k.lower().startswith("total")), None)
    if not month_cols:  # a single period: treat its one column as the period
        month_cols = [(cols[0][0], cols[0][1])]
    seen, mc = set(), []
    for j, k in month_cols:
        if k not in seen:
            seen.add(k)
            mc.append((j, k))
    keys = [k for _, k in mc]
    first_data = min(j for j, _ in mc)
    title = [" ".join(str(c) for c in r["cells"] if c not in (None, "")) for r in rows[:hi]]
    basis = None
    for r in rows:
        t = " ".join(str(c) for c in r["cells"] if c not in (None, ""))
        mb = re.search(r"\b(cash|accrual) basis\b", t, re.I)
        if mb:
            basis = mb.group(1).capitalize()
            break
    levels = [r["level"] for r in rows[hi + 1:] if r["level"] is not None]
    has_levels = len(set(round(l, 1) for l in levels)) > 1
    section, stack, accounts, computed, notes = None, [], [], {}, []
    group_totals = []
    for r in rows[hi + 1:]:
        cells = list(r["cells"]) + [None] * (max(j for j, _ in mc) + 2)
        label = ""
        for c in cells[:first_data]:
            if isinstance(c, str) and c.strip():
                label = c.strip()
                break
            if c is not None and not isinstance(c, (int, float)) and str(c).strip():
                label = str(c).strip()
                break
        vals = {k: num(cells[j]) for j, k in mc}
        tot = num(cells[total_col]) if total_col is not None else None
        has_vals = any(v is not None for v in vals.values())
        if not label and not has_vals:
            continue
        low = norm(label)
        if re.search(r"\b(cash|accrual) basis\b", low) or low.startswith("practice file"):
            continue
        if low in IGNORE:
            continue
        if low in SECTIONS and not has_vals:
            section, stack = SECTIONS[low], []
            continue
        mt = re.match(r"^total(?: for)?\s+(.*)$", low)
        if mt or low in ("total", "totals"):
            name = mt.group(1).strip() if mt else ""
            if name in SECTIONS or name in ("cogs",):
                computed["total_" + SECTIONS.get(name, "cogs")] = vals
                stack = []
                continue
            idx = next((i for i in range(len(stack) - 1, -1, -1) if norm(stack[i]["name"]) == name), None)
            if idx is not None:
                g = stack[idx]
                gpath = [s["name"] for s in stack[:idx + 1]]
                child = [a for a in accounts if a["path"][:len(gpath)] == gpath and a["section"] == section]
                diff = {k: (vals[k] or 0.0) - sum(a["vals"][k] for a in child) for k in keys}
                if any(abs(v) > 0.005 for v in diff.values()):
                    accounts.append({"path": gpath + [f"{g['name']} (posted to the parent account)"], "section": section,
                                     "vals": diff, "total": None, "synthetic": True})
                group_totals.append((gpath, section, vals))
                stack = stack[:idx]
            continue
        if low in COMPUTED:
            computed[COMPUTED[low]] = vals
            if COMPUTED[low] == "net_income":
                break  # the end of the report; footers follow
            continue
        if re.match(r"^page \d+( of \d+)?$|^page$", low) or re.match(r"^page\b.*\bof\b", low):
            continue
        lvl = r["level"]
        if has_levels and lvl is not None:
            while stack and stack[-1]["level"] is not None and stack[-1]["level"] >= lvl:
                stack.pop()
        if not has_vals:
            stack.append({"name": label, "level": lvl})
            continue
        sec = section
        if sec is None:
            sec = "income" if re.search(r"income|commission|revenue|gci", low) else "expense"
            notes.append(f"'{label}' came before any section heading; read as {sec}.")
        accounts.append({"path": [s["name"] for s in stack] + [label], "section": sec,
                         "vals": {k: (vals[k] or 0.0) for k in keys}, "total": tot, "synthetic": False})
    return {"file": os.path.basename(path), "keys": keys, "is_months": all(re.fullmatch(r"\d{4}-\d{2}", k) for k in keys),
            "title": title, "basis": basis, "accounts": accounts, "computed": computed, "notes": notes,
            "has_total_col": total_col is not None}


# --- categories -------------------------------------------------------------------------------------

STRONG_COST = [
    ("uncategorized", r"uncategori[sz]ed|ask my accountant|suspense|unclassified"),
    ("owner", r"owner'?s? (draw|distribution|pay|equity)|\bdraws?\b|shareholder distribution|member distribution|partner distribution|distributions? to owner|guaranteed payments?"),
    ("marketing", r"referral.*(gift|appreciation|thank|party|event)|(gift|appreciation|thank|party|event).*referral"),
    ("referral_fees", r"referral"),
    ("brokerage_fees", r"brokerage|\bbroker\b|franchise|royalt|\bcap fee|company dollar|broker review"),
    ("agent_splits", r"commission|agent split|agent pay|agent comp|payout|\bsplits?\b|cost of sale.*agent"),
    ("lead_gen", r"\bleads?\b|lead gen|\bppc\b|pay.per.click|google ads|adwords|facebook ads|meta ads|\bportal\b|zillow|realtor\.com|homes\.com|opcity|readyconnect|prospect|seller data|buyer data|\bexpired"),
]
# A per-deal charge with no other keyword, in Cost of Goods Sold, is a brokerage charge (a TC fee is people).
COGS_FEES = [
    ("people", r"transaction coordinator|\btc\b"),
    ("brokerage_fees", r"transaction fees?|risk management|e&o|errors|per.?(deal|file|transaction)|deal fees?|file fees?|compliance fees?"),
]
OTHER_COST = [
    ("people", r"payroll|salar|wage|bonus|\bisa\b|inside sales|assistant|transaction coordinator|\btc\b|contract labor|contractor|\bstaff|recruit|training|coaching|employee|benefit|health insurance|401|workers.?comp|hiring|showing (agent|assistant)"),
    ("occupancy", r"\brent\b|lease|office space|utilit|electric|janitor|cleaning|repair|maintenance|cowork|co-work|parking|storage|building"),
    ("other", r"dues|\bmls\b|board|association|licens|insurance|e&o|errors|legal|attorney|accounting|bookkeep|professional|bank|merchant|interest|meal|entertain|travel|\bauto\b|vehicle|mileage|fuel|suppl|postage|charit|donat|depreciat|amortiz|tax|education|conference|seminar"),
    ("tech", r"software|subscription|saas|\bcrm\b|dialer|technolog|\btech\b|computer|\bit\b|internet|phone|telephone|\bcell|wireless|domain|hosting|\bapps?\b|cloud|\bidx\b|\bdata\b"),
    ("marketing", r"marketing|advertis|print|\bsigns?\b|signage|postcard|mail|photo|video|drone|staging|brand|website|\bweb\b|social|appreciation|gift|swag|promo|sponsor|open house|flyer|newsletter|event|billboard|magazine|\bseo\b"),
]
INCOME_RULES = [
    ("uncategorized_income", r"uncategori[sz]ed|ask my accountant|suspense|unclassified"),
    ("other_income", r"revenue shar|rev\.? shar|profit shar|stock award|equity award|stock income"),
    ("contra_splits", r"(agent|commission).*(paid|split|payout|less)|(paid|less|payout).*(agent|commission)"),
    ("agent_fees", r"(agent|desk|tech|technology|transaction|admin|e&o|marketing|franchise) fees?\b|fees? (from|charged to) agents|agent dues"),
    ("other_income", r"interest|dividend|misc|refund|rebate|reimburs|other income|gain on|cash back"),
    ("commission", r"commission|\bgci\b|referral|closing|listing|buyer|seller|real estate|brokerage|sales"),
]


def first_match(rules, name):
    for cat, rx in rules:
        if re.search(rx, name):
            return cat
    return None


def classify(acct, overrides):
    full = ":".join(acct["path"])
    leafn = acct["path"][-1]
    for key in (full, leafn):
        if key in overrides:
            return overrides[key], "set in map.json"
    names = [norm(p) for p in acct["path"]]
    leaf_name, parents = names[-1], names[:-1][::-1]
    if acct.get("synthetic"):
        leaf_name = parents[0] if parents else leaf_name
    sec = acct["section"]
    if sec in ("income", "other_income"):
        for nm in [leaf_name] + parents:
            c = first_match(INCOME_RULES, nm)
            if c == "contra_splits" and sum(acct["vals"].values()) > 0 and not re.search(r"less|paid", nm):
                c = None
            if c:
                return c, f"keyword in '{nm}'"
        return ("commission" if sec == "income" else "other_income"), "default for this section"
    c = first_match(STRONG_COST, leaf_name)
    if c:
        return c, f"keyword in '{leaf_name}'"
    if sec == "cogs":
        c = first_match(COGS_FEES, leaf_name)
        if c:
            return c, f"per-deal charge in Cost of Goods Sold: '{leaf_name}'"
    for nm in parents:
        c = first_match(STRONG_COST, nm) or first_match(OTHER_COST, nm)
        if c:
            return c, f"parent account '{nm}'"
    c = first_match(OTHER_COST, leaf_name)
    if c:
        return c, f"keyword in '{leaf_name}'"
    return "other", "no keyword: default"


# --- the analysis ---------------------------------------------------------------------------------

def sums_by(pnl, cats, keys):
    out = {k: 0.0 for k in keys}
    for a in pnl["accounts"]:
        if a["cat"] in cats:
            for k in keys:
                out[k] += a["vals"][k]
    return out


def analyze(pnl, overrides, th):
    keys = pnl["keys"]
    for a in pnl["accounts"]:
        a["cat"], a["why"] = classify(a, overrides)
        a["name"] = ":".join(a["path"])
    S = lambda *c: sums_by(pnl, c, keys)
    commission = S("commission")
    contra = S("contra_splits")
    splits_cost = S("agent_splits")
    splits = {k: splits_cost[k] - contra[k] for k in keys}  # contra lines are negative income
    referral, brokerage = S("referral_fees"), S("brokerage_fees")
    agent_fees, other_inc = S("agent_fees"), S("other_income", "uncategorized_income")
    opex = {c: S(c) for c in OPEX}
    unc, owner = S("uncategorized"), S("owner")
    total_opex = {k: sum(opex[c][k] for c in OPEX) + unc[k] for k in keys}
    cd = {k: commission[k] - splits[k] - referral[k] - brokerage[k] for k in keys}
    comp = pnl["computed"]
    inc_sec = {k: sum(a["vals"][k] for a in pnl["accounts"] if a["section"] == "income") for k in keys}
    cogs_sec = {k: sum(a["vals"][k] for a in pnl["accounts"] if a["section"] == "cogs") for k in keys}
    exp_sec = {k: sum(a["vals"][k] for a in pnl["accounts"] if a["section"] == "expense") for k in keys}
    oi_sec = {k: sum(a["vals"][k] for a in pnl["accounts"] if a["section"] == "other_income") for k in keys}
    oe_sec = {k: sum(a["vals"][k] for a in pnl["accounts"] if a["section"] == "other_expense") for k in keys}
    net_calc = {k: inc_sec[k] - cogs_sec[k] - exp_sec[k] + oi_sec[k] - oe_sec[k] for k in keys}
    net_rep = comp.get("net_income")
    net = {k: (net_rep[k] if net_rep and net_rep.get(k) is not None else net_calc[k]) for k in keys}
    checks = []
    if net_rep:
        for k in keys:
            if net_rep.get(k) is not None and abs(net_rep[k] - net_calc[k]) > 0.01:
                checks.append(f"{mlabel(k)}: accounts add to {m2(net_calc[k])} but the report's Net Income is {m2(net_rep[k])} (difference {m2(net_rep[k] - net_calc[k])}).")
    else:
        checks.append("The report has no Net Income line, so the totals could not be checked against it.")
    for name, sec in (("total_income", inc_sec), ("total_cogs", cogs_sec), ("total_expense", exp_sec)):
        rep = comp.get(name)
        if rep:
            for k in keys:
                if rep.get(k) is not None and abs(rep[k] - sec[k]) > 0.01:
                    checks.append(f"{mlabel(k)}: {name.replace('_', ' ')} on the report is {m2(rep[k])}; the accounts add to {m2(sec[k])}.")
    if pnl["has_total_col"] and pnl["is_months"]:
        for a in pnl["accounts"]:
            if a["total"] is not None and abs(sum(a["vals"].values()) - a["total"]) > 0.01:
                checks.append(f"{a['name']}: the months add to {m2(sum(a['vals'].values()))} but its Total column shows {m2(a['total'])}.")

    # How revenue is recorded, month by month.
    shares = {k: div(splits[k], commission[k]) for k in keys}
    with_splits = [shares[k] for k in keys if commission[k] > 0 and splits[k] > 0]
    typical = statistics.median(with_splits) if with_splits else None
    status = {}
    for k in keys:
        if commission[k] <= 0:
            status[k] = "no commission income"
        elif splits[k] <= 0.005:
            status[k] = "NET (no agent splits recorded)" if with_splits else "net (no splits on these books)"
        elif typical and shares[k] < th["gross_band_low"] * typical:
            status[k] = "LOW SPLITS"
        elif typical and shares[k] > th["gross_band_high"] * typical:
            status[k] = "HIGH SPLITS"
        else:
            status[k] = "gross"
    gross_months = [k for k in keys if status[k] == "gross"]
    net_months = [k for k in keys if status[k].startswith("NET")]
    mixed = bool(gross_months and net_months)
    gross_cd = [cd[k] for k in gross_months]
    gross_inc = [commission[k] for k in gross_months]
    hints = {}
    for k in net_months:
        if gross_cd and gross_inc:
            mcd, minc = statistics.median(gross_cd), statistics.median(gross_inc)
            closer = "the team's share (company dollar)" if abs(commission[k] - mcd) < abs(commission[k] - minc) else "gross commission"
            hints[k] = (f"{mlabel(k)} commission income {m2(commission[k])} is closer to the median company dollar of the gross months "
                        f"({m2(mcd)}) than to their median commission income ({m2(minc)})" if closer.startswith("the team")
                        else f"{mlabel(k)} commission income {m2(commission[k])} is closer to the median commission income of the gross months "
                        f"({m2(minc)}) than to their median company dollar ({m2(mcd)}): the splits may be missing, not netted")
    if not with_splits:
        verdict = ("No agent splits appear anywhere on these books: commission income is recorded net of splits (the team's share) every month, "
                   "or agents are paid outside these books. Ratios use commission income as company dollar.")
    elif mixed:
        verdict = (f"MIXED: {', '.join(mlabel(k) for k in net_months)} {'shows' if len(net_months) == 1 else 'show'} commission income with no agent splits, while "
                   f"{', '.join(mlabel(k) for k in gross_months)} show gross commission with splits as a cost. Company dollar is comparable "
                   f"across all months; gross commission, split share and any ratio on gross commission are not.")
    else:
        verdict = "Gross every month: commission income is recorded before agent splits, and splits are recorded as a cost."
    ref_where = ("referral fees are recorded as a cost" if any(referral[k] for k in keys) else "no referral fee line: referral fees are netted out before the money arrives, or none were paid")
    brk_where = ("brokerage split and fees are recorded as a cost" if any(brokerage[k] for k in keys) else "no brokerage split or fee line: the team is paid after the brokerage takes its share, or the team is the brokerage")
    split_where = ("agent splits sit inside income as a negative line" if any(contra[k] for k in keys) else
                   ("agent splits are recorded as a cost" if with_splits else "no agent split line"))

    # Brokerage share of commission over time (a cap reached, a fee change, or recording).
    bshare = {k: div(brokerage[k], commission[k]) for k in keys if commission[k] > 0 and status[k] == "gross"}
    bvals = [v for v in bshare.values() if v]
    btyp = statistics.median(bvals) if bvals else None

    margin = {k: div(net[k], cd[k]) if cd[k] > 0 else None for k in keys}
    T = lambda d: sum(d[k] for k in keys)
    period = {
        "commission": T(commission), "splits": T(splits), "referral": T(referral), "brokerage": T(brokerage),
        "company_dollar": T(cd), "agent_fees": T(agent_fees), "other_income": T(other_inc), "opex": T(total_opex),
        "net_income": T(net), "owner": T(owner), "uncategorized": T(unc),
        "by_cat": {c: T(opex[c]) for c in OPEX},
    }
    period["margin"] = div(period["net_income"], period["company_dollar"]) if period["company_dollar"] > 0 else None

    flags = []

    def flag(pri, code, text, question=None, **kw):
        flags.append(dict(priority=pri, code=code, text=text, question=question, **kw))

    if mixed:
        for k in net_months:
            flag(1, "mixed_recording", f"{mlabel(k)} records commission income of {m2(commission[k])} with no agent splits "
                 f"(other months record gross commission with splits as a cost). {hints.get(k, '')}".strip(),
                 f"{mlabel(k)} shows commission income of {m2(commission[k])} and no agent splits, referral fees or brokerage fees, while the other months show gross commission with those as costs. Was {mlabel(k)} recorded net of splits? Please restate it the same way as the other months.",
                 month=k)
    for k in keys:
        if status[k] in ("LOW SPLITS", "HIGH SPLITS") and typical:
            flag(8, "split_share", f"{mlabel(k)}: agent splits are {pct(shares[k])} of commission income against a usual {pct(typical)}.",
                 f"Agent splits in {mlabel(k)} are {pct(shares[k])} of commission income; most months run about {pct(typical)}. Was anything recorded net, or paid in a different month than its income?",
                 month=k)
    if checks:
        flag(2, "totals_do_not_tie", "The accounts do not add up to the report's own totals: " + " ".join(checks[:3]),
             "The exported report's totals don't match its accounts in places (see the list). Is this the final version of the report?")
    for k in keys:
        if unc[k]:
            names = [a["name"] for a in pnl["accounts"] if a["cat"] == "uncategorized" and a["vals"][k]]
            flag(4, "uncategorized", f"{', '.join(names)} holds {m2(unc[k])} in {mlabel(k)}.",
                 f"{', '.join(names)} holds {m2(unc[k])} in {mlabel(k)}. What is it, and which account should it move to?", month=k, amount=unc[k])
    for a in pnl["accounts"]:
        if a["cat"] == "uncategorized_income" and any(a["vals"].values()):
            flag(4, "uncategorized", f"{a['name']} holds {m2(sum(a['vals'].values()))} of income.",
                 f"{a['name']} holds {m2(sum(a['vals'].values()))}. Which income account should it move to?")
    if any(owner[k] for k in keys):
        names = sorted({a["name"] for a in pnl["accounts"] if a["cat"] == "owner"})
        flag(5, "owner_draw_on_pnl", f"{', '.join(names)} totals {m2(period['owner'])} in the period and is recorded as an expense, which lowers profit. "
             f"Net income before it: {m2(period['net_income'])} + {m2(period['owner'])} = {m2(period['net_income'] + period['owner'])}.",
             f"{', '.join(names)} ({m2(period['owner'])} this period) is posted as an expense. Does it hold only owner pay, with no other payments mixed in? (How owner pay should be recorded is a question for the CPA; no change until then.)")
    for a in pnl["accounts"]:
        if a["cat"] == "other_income" and re.search(r"revenue shar|rev\.? shar|profit shar|stock award|equity award|stock income", norm(a["path"][-1])) and any(a["vals"].values()):
            flag(10, "revenue_share_income", f"{a['name']} ({m2(sum(a['vals'].values()))} in the period) is read as other income from the brokerage, not commission from the team's closings: "
                 f"it is outside company dollar and inside net income.", None, account=a["name"])
    bk = [k for k in keys if k in bshare and bshare[k] is not None]
    for i, k in enumerate(bk):
        prior = [bshare[j] for j in bk[:i]]
        if len(prior) >= 2 and bshare[k] < (1 - th["brokerage_share_drop"]) * statistics.median(prior):
            pm = statistics.median(prior)
            later = ", ".join(f"{mlabel(j)} {pct(bshare[j])}" for j in bk[i:])
            flag(9, "brokerage_share_drop", f"Brokerage split and fees fell from about {pct(pm)} of commission income ({mlabel(bk[0])} to {mlabel(bk[i - 1])}) to: {later}.",
                 f"Brokerage split and fees dropped from about {pct(pm)} of commission income to {pct(bshare[k])} starting {mlabel(k)}. Did the team or its agents reach a brokerage cap, did the fee schedule change, or is something missing?",
                 month=k)
            break
    for a in pnl["accounts"]:
        if a["cat"] == "people" and re.search(r"contract labor|contractor", norm(a["path"][-1])) and period["commission"] > 0:
            share = sum(a["vals"].values()) / period["commission"]
            if share >= th["contract_labor_share"]:
                flag(6, "contract_labor_large", f"{a['name']} is {pct(share)} of commission income; it may hold agent payouts.",
                     f"Does {a['name']} include agent commission payouts? If so it belongs with agent splits.")

    # Account-level patterns (operating expense accounts).
    patterns = []
    if pnl["is_months"] and len(keys) >= 3:
        for a in pnl["accounts"]:
            if a["section"] not in ("expense", "other_expense", "cogs") or a["cat"] in COST_OF_SALE:
                continue
            v = [a["vals"][k] for k in keys]
            nz = [i for i, x in enumerate(v) if abs(x) > 0.005]
            for i, x in enumerate(v):
                if x < -0.005:
                    flag(7, "negative_expense", f"{a['name']} is negative ({m2(x)}) in {mlabel(keys[i])}: a refund, a reversal or income in the wrong place.",
                         f"{a['name']} shows {m2(x)} in {mlabel(keys[i])}. Is that a refund, a reversal, or income posted to an expense account?", month=keys[i])
            if not nz:
                continue
            f0 = nz[0]
            run = nz == list(range(f0, len(v)))
            amts = [v[i] for i in nz]
            if f0 >= 2 and run and len(nz) >= th["recurring_min_months"] and min(amts) > 0 and max(amts) / min(amts) <= th["recurring_amount_ratio"]:
                flag(6, "new_recurring_account", f"{a['name']} is new since {mlabel(keys[f0])} and recurs every month since: {', '.join(m2(x) for x in amts)}.",
                     f"{a['name']} started in {mlabel(keys[f0])} at {m2(amts[0])} a month. What is it, and is it meant to continue?", month=keys[f0], amount=amts[-1], account=a["name"], account_level=True)
                patterns.append(("new recurring", a["name"], keys[f0]))
                continue
            if len(nz) == 1 and nz[0] > 0 and v[nz[0]] >= th["spike_min"] and a["cat"] not in ("uncategorized",):
                flag(10, "one_time", f"{a['name']} appears once: {m2(v[nz[0]])} in {mlabel(keys[nz[0]])}.", None, month=keys[nz[0]], account=a["name"], account_level=True)
            # A price step: two values, one change, every month charged.
            vals_r = [round(x, 2) for x in v]
            if len(nz) == len(v) and len(set(vals_r)) == 2:
                cut = next(i for i in range(1, len(v)) if vals_r[i] != vals_r[i - 1])
                if all(x == vals_r[0] for x in vals_r[:cut]) and all(x == vals_r[cut] for x in vals_r[cut:]):
                    flag(9, "price_change", f"{a['name']} changed from {m2(vals_r[0])} to {m2(vals_r[cut])} a month starting {mlabel(keys[cut])}.",
                         f"{a['name']} went from {m2(vals_r[0])} to {m2(vals_r[cut])} a month in {mlabel(keys[cut])}. Was that a planned price or plan change?", month=keys[cut])
                    continue
            for i in nz:
                others = [v[j] for j in nz if j != i]
                if len(others) < 3 or v[i] <= 0:
                    continue
                med = statistics.median(others)
                if med <= 0:
                    continue
                steady = sum(1 for x in others if abs(x - med) <= 0.05 * med) >= max(3, round(len(others) * 2 / 3))
                if steady and abs(v[i] - 2 * med) <= th["double_tolerance"] * 2 * med and v[i] - med >= 1:
                    flag(3, "exact_double", f"{a['name']} in {mlabel(keys[i])} is {m2(v[i])}, about twice its usual {m2(med)}: possibly charged twice.",
                         f"{a['name']} is {m2(v[i])} in {mlabel(keys[i])}, about double its usual {m2(med)}. Was it charged twice?", month=keys[i], amount=v[i] - med, account=a["name"], account_level=True)
                elif v[i] >= th["spike_ratio"] * med and v[i] - med >= th["spike_min"] and v[i] > max(others) + 0.005:
                    flag(7, "spike", f"{a['name']} in {mlabel(keys[i])} is {m2(v[i])} against a usual {m2(med)} (+{m2(v[i] - med)}).",
                         f"What was the extra {m2(v[i] - med)} in {a['name']} in {mlabel(keys[i])}? One-time, or the new normal?", month=keys[i], amount=v[i] - med, account=a["name"], account_level=True)

    # Variances.
    var = {}
    if pnl["is_months"] and len(keys) >= 2:
        p, l = keys[-2], keys[-1]
        lines = [("Company dollar", cd[p], cd[l])] + [(CAT_NAMES[c], opex[c][p], opex[c][l]) for c in OPEX] + [("Net income", net[p], net[l])]
        var["mom"] = {"prev": p, "last": l, "lines": lines}
        movers = []
        for a in pnl["accounts"]:
            if a["section"] in ("expense", "other_expense", "cogs") and a["cat"] not in COST_OF_SALE:
                ch = a["vals"][l] - a["vals"][p]
                if abs(ch) > 0.005:
                    movers.append((abs(ch), a["name"], a["vals"][p], a["vals"][l], ch))
        var["movers"] = sorted(movers, reverse=True)[:6]
        cand = [(abs(cd[l] - cd[p]), "Company dollar", cd[p], cd[l])] + [(abs(opex[c][l] - opex[c][p]), CAT_NAMES[c], opex[c][p], opex[c][l]) for c in OPEX]
        big = max(cand)
        driver = None
        if big[1] != "Company dollar":
            cat = next(c for c in OPEX if CAT_NAMES[c] == big[1])
            ds = [m for m in var["movers"] if any(a["name"] == m[1] and a["cat"] == cat for a in pnl["accounts"])]
            driver = ds[0] if ds else None
        var["biggest"] = {"line": big[1], "prev": big[2], "last": big[3], "change": big[3] - big[2], "driver": driver}
        var["recording_changed"] = status[p] != status[l]
        before = keys[:-1]
        if len(before) >= 2:
            var["vs_avg"] = [(name, sum(d[k] for k in before) / len(before), d[l]) for name, d in
                             [("Company dollar", cd)] + [(CAT_NAMES[c], opex[c]) for c in OPEX] + [("Net income", net)]]
        years = sorted({k[:4] for k in keys})
        ly = years[-1]
        ykeys = [k for k in keys if k.startswith(ly)]
        if ykeys and ykeys[0] == f"{ly}-01":
            var["ytd"] = {"year": ly, "through": ykeys[-1], "company_dollar": sum(cd[k] for k in ykeys),
                          "opex": sum(total_opex[k] for k in ykeys), "net_income": sum(net[k] for k in ykeys)}
            prior = [f"{int(ly) - 1}{k[4:]}" for k in ykeys]
            if all(pk in keys for pk in prior):
                var["ytd_prior"] = {"company_dollar": sum(cd[k] for k in prior), "opex": sum(total_opex[k] for k in prior),
                                    "net_income": sum(net[k] for k in prior)}
        else:
            var["ytd_missing"] = f"The file starts in {mlabel(keys[0])}, so a year-to-date total from January isn't possible."
    return {"keys": keys, "commission": commission, "splits": splits, "contra": contra, "referral": referral,
            "brokerage": brokerage, "agent_fees": agent_fees, "other_income": other_inc, "opex": opex, "unc": unc,
            "owner": owner, "total_opex": total_opex, "cd": cd, "net": net, "net_calc": net_calc, "checks": checks,
            "shares": shares, "typical": typical, "status": status, "mixed": mixed, "gross_months": gross_months,
            "net_months": net_months, "verdict": verdict, "where": [split_where, ref_where, brk_where],
            "bshare": bshare, "btyp": btyp, "margin": margin, "period": period, "flags": flags, "var": var}


# --- P&L Detail -------------------------------------------------------------------------------------

def parse_detail(path, overrides):
    rows = load_rows(path)
    hi = None
    for i, r in enumerate(rows):
        low = [str(c or "").strip().lower() for c in r["cells"]]
        if "date" in low and any(x in ("amount", "debit", "credit") for x in low):
            hi = i
            cols = {name: low.index(name) for name in low if name}
            break
    if hi is None:
        return None, "No Date and Amount columns were found, so the detail file was not used."
    pick = lambda *names: next((cols[n] for n in names if n in cols), None)
    c_date, c_amt = cols["date"], pick("amount")
    c_name, c_memo = pick("name", "vendor", "payee", "contact"), pick("memo/description", "memo", "description")
    c_type, c_num = pick("transaction type", "type", "source"), pick("num", "no.", "reference", "ref")
    c_debit, c_credit = pick("debit"), pick("credit")
    section, stack, txs = None, [], []
    for r in rows[hi + 1:]:
        cells = list(r["cells"]) + [None] * 12
        d = parse_date(cells[c_date])
        if d is None:
            label = next((str(c).strip() for c in cells[:max(c_date, 1) + 1] if c not in (None, "") and str(c).strip()), "")
            if not label:
                label = next((str(c).strip() for c in cells if isinstance(c, str) and c.strip()), "")
            low = norm(label)
            if not low or re.search(r"basis|practice file", low):
                continue
            if low in SECTIONS:
                section, stack = SECTIONS[low], []
                continue
            if low in IGNORE or low in COMPUTED:
                continue
            mt = re.match(r"^total(?: for)?\s+(.*)$", low)
            if mt:
                name = mt.group(1)
                if name in SECTIONS:
                    stack = []
                    continue
                idx = next((i for i in range(len(stack) - 1, -1, -1) if norm(stack[i]) == name), None)
                if idx is not None:
                    stack = stack[:idx]
                continue
            stack.append(label)
            continue
        amt = num(cells[c_amt]) if c_amt is not None else None
        if amt is None and c_debit is not None:
            amt = (num(cells[c_debit]) or 0.0) - (num(cells[c_credit]) or 0.0)
        if amt is None:
            continue
        acct = {"path": list(stack), "section": section or "expense", "vals": {"x": amt}}
        cat, _ = classify(acct, overrides) if stack else ("other", "")
        txs.append({"date": d, "month": f"{d.year:04d}-{d.month:02d}", "account": ":".join(stack), "cat": cat,
                    "section": section or "expense", "name": str(cells[c_name] or "").strip() if c_name is not None else "",
                    "memo": str(cells[c_memo] or "").strip() if c_memo is not None else "", "amount": amt,
                    "type": str(cells[c_type] or "").strip() if c_type is not None else ""})
    return txs, None


PRIVATE_CATS = ("agent_splits", "people", "owner", "commission", "contra_splits", "agent_fees")


def show_name(t):
    return "(payee not shown)" if t["cat"] in PRIVATE_CATS else (t["name"] or "(no name)")


def detail_checks(txs, keys, th, overrides):
    out = {"duplicates": [], "new_recurring": [], "new_one_time": [], "multi_account": [], "keyword_mismatch": [], "uncategorized": []}
    exp = [t for t in txs if t["section"] in ("expense", "cogs", "other_expense") and t["amount"] > 0]
    by = defaultdict(list)
    for t in exp:
        by[(t["account"], t["name"].lower(), round(t["amount"], 2))].append(t)
    for (acct, nm, amt), ts in by.items():
        ts = sorted(ts, key=lambda t: t["date"])
        for a, b in zip(ts, ts[1:]):
            if (b["date"] - a["date"]).days <= th["dup_days"]:
                out["duplicates"].append((a, b))
    months = sorted({t["month"] for t in txs})
    vendors = defaultdict(list)
    for t in exp:
        if t["cat"] not in PRIVATE_CATS and t["cat"] not in COST_OF_SALE and t["name"]:
            vendors[t["name"].lower()].append(t)
    for v, ts in vendors.items():
        vm = sorted({t["month"] for t in ts})
        first = vm[0]
        if months and first != months[0] and months.index(first) >= 1:
            after = months[months.index(first):]
            monthly = [sum(t["amount"] for t in ts if t["month"] == m) for m in after]
            if len(after) >= th["recurring_min_months"] and all(x > 0 for x in monthly) and max(monthly) / min(monthly) <= th["recurring_amount_ratio"]:
                out["new_recurring"].append((ts[0], after, monthly))
            elif len(vm) == 1:
                out["new_one_time"].append(ts[0])
        accts = defaultdict(float)
        for t in ts:
            accts[(t["account"], t["cat"])] += t["amount"]
        cats = {c for (_, c) in accts}
        if len(accts) > 1 and len(cats) > 1:
            main = max(accts.items(), key=lambda kv: kv[1])[0]
            for (acct, cat), amt in accts.items():
                if (acct, cat) != main:
                    odd = [t for t in ts if t["account"] == acct]
                    out["multi_account"].append((odd, acct, main[0], amt))
    for t in exp:
        if t["cat"] in ("other", "uncategorized") and t["name"]:
            guess = first_match(STRONG_COST[2:], norm(t["name"])) or first_match(OTHER_COST[:2] + OTHER_COST[3:], norm(t["name"]))
            if guess and guess not in ("other",) and not any(t in odd for odd, *_ in out["multi_account"]):
                out["keyword_mismatch"].append((t, guess))
        if t["cat"] == "uncategorized":
            out["uncategorized"].append(t)
    return out


# --- production --------------------------------------------------------------------------------------

ALIASES = OrderedDict([
    ("close_date", ["settlement date", "close date", "closed date", "closing date", "date closed", "actual close date",
                    "close of escrow", "coe date", "settled date", "closing"]),
    ("status", ["status", "transaction status", "deal status", "stage"]),
    ("gci", ["gross commission amount", "gci", "gross commission", "gross commission income", "total gci",
             "total commission", "commission amount", "gross commission income gci"]),
    ("agent_paid", ["paid income to agents", "agent split", "agent paid", "agent commission", "agent income", "agent net",
                    "agent payout", "gross agent paid income", "net agent paid income", "agent dollar", "agent share",
                    "agent split amount", "paid to agent"]),
    ("team", ["team income amount", "team net", "team income", "company dollar", "team dollar", "team share",
              "net to team", "house", "company income", "team net income", "company dollar amount"]),
    ("referral", ["referral fee amount", "referral fee", "referral", "referral paid", "referral fees",
                  "referral adjustments", "referral amount", "referral fee paid"]),
    ("brokerage", ["transaction fee amount", "brokerage fee", "brokerage split", "broker fee", "brokerage fees",
                   "franchise fee", "royalty", "pre split adjustments", "transaction fee", "brokerage"]),
    ("source", ["lead type", "lead source", "source", "lead source name"]),
    ("side", ["side", "transaction side", "representation", "buyer seller", "deal side"]),
    ("units", ["units", "unit count", "sides"]),
])


def nkey(s):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(s or "").lower())).strip()


def parse_production(path, keys, overrides):
    if os.path.splitext(path)[1].lower() == ".pdf":
        return None, "The production file is a PDF; export it as CSV or Excel so closings can be counted in code."
    rows = load_rows(path)
    best, best_n = None, 0
    for i, r in enumerate(rows[:15]):
        cells = [nkey(c) for c in r["cells"]]
        n = sum(1 for c in cells if any(c == a for al in ALIASES.values() for a in al))
        if n > best_n:
            best, best_n = i, n
    if best is None or best_n < 2:
        return None, "No closing date or GCI columns were recognized in the production file."
    hdr = [nkey(c) for c in rows[best]["cells"]]
    colmap, used = {}, set()
    pc = {k: nkey(v) for k, v in (overrides.get("production_columns") or {}).items()}
    for field, al in ALIASES.items():
        if field in pc and pc[field] in hdr:
            colmap[field] = hdr.index(pc[field])
            used.add(colmap[field])
            continue
        for a in al:
            if a in hdr and hdr.index(a) not in used:
                colmap[field] = hdr.index(a)
                used.add(colmap[field])
                break
    if "close_date" not in colmap:
        return None, "No closing date column was recognized in the production file."
    keyset = set(keys)
    deals, skipped = [], defaultdict(int)
    for r in rows[best + 1:]:
        c = list(r["cells"]) + [None] * len(hdr)
        d = parse_date(c[colmap["close_date"]])
        if d is None:
            if any(str(x or "").strip() for x in r["cells"]):
                skipped["no close date"] += 1
            continue
        st = str(c[colmap["status"]] or "").strip() if "status" in colmap else ""
        if st and (re.search(r"cancel|fell|terminat|withdraw|expire|pending|forecast|active|under contract", st, re.I)
                   or not re.search(r"closed|sold|settled|complete|funded|paid", st, re.I)):
            skipped[f"status {st}"] += 1
            continue
        mk = f"{d.year:04d}-{d.month:02d}"
        if mk not in keyset:
            skipped["closed outside the P&L months"] += 1
            continue
        g = lambda f: (num(c[colmap[f]]) or 0.0) if f in colmap else None
        deal = {"month": mk, "gci": g("gci"), "agent_paid": g("agent_paid"), "team_col": g("team"),
                "referral": g("referral"), "brokerage": g("brokerage"),
                "source": (str(c[colmap["source"]]).strip() if "source" in colmap and c[colmap["source"]] else "(no source)"),
                "units": g("units") if "units" in colmap else 1.0}
        if deal["gci"] is not None and deal["agent_paid"] is not None:
            deal["team_calc"] = deal["gci"] - deal["agent_paid"] - (deal["referral"] or 0) - (deal["brokerage"] or 0)
        else:
            deal["team_calc"] = None
        deal["team"] = deal["team_col"] if deal["team_col"] is not None else deal["team_calc"]
        deals.append(deal)
    cols_used = {f: rows[best]["cells"][i] for f, i in colmap.items()}
    return {"deals": deals, "cols": cols_used, "skipped": dict(skipped), "status_col": "status" in colmap}, None


def production_analysis(prod, A, pnl, th, overrides):
    keys = A["keys"]
    deals = prod["deals"]
    per = {k: defaultdict(float) for k in keys}
    for d in deals:
        p = per[d["month"]]
        p["closings"] += d["units"] or 1
        for f in ("gci", "agent_paid", "referral", "brokerage", "team"):
            if d.get(f) is not None:
                p[f] += d[f]
    has = {f: any(d.get(f) is not None for d in deals) for f in ("gci", "agent_paid", "referral", "brokerage", "team")}
    recon = []
    tol = th["recon_tolerance"]
    for k in keys:
        p, inc = per[k], A["commission"][k]
        label = "no closings in the production file"
        if p["closings"] and has["gci"]:
            cands = [("gross GCI", p["gci"])]
            if has["referral"]:
                cands.append(("GCI after referral fees", p["gci"] - p["referral"]))
            if has["team"]:
                cands.append(("the team's share", p["team"]))
            hit = [n for n, x in cands if x and abs(inc - x) / x <= tol]
            label = ("matches " + hit[0]) if hit else "matches none of these (timing, a missing deal, or a different basis)"
        recon.append((k, inc, p.get("gci", 0.0), p.get("gci", 0.0) - p.get("referral", 0.0) if has["referral"] else None,
                      p.get("team") if has["team"] else None, label))
    flags = []
    for k, inc, gci, gar, team, label in recon:
        if has["referral"] and per[k]["referral"] > 0 and A["referral"][k] == 0 and A["status"][k] == "gross":
            flags.append(dict(priority=9, code="referral_netted", month=k,
                              text=f"{mlabel(k)}: the production file shows {m2(per[k]['referral'])} of referral fees but the P&L has no referral fee cost; they were likely taken out before the money arrived.",
                              question=f"The production file shows {m2(per[k]['referral'])} of referral fees in {mlabel(k)}, but the P&L shows none. Were they netted out of the commission deposit?"))
    n = sum(per[k]["closings"] for k in keys)
    P = A["period"]
    cpc = None
    if n:
        cpc = {"closings": n, "opex": P["opex"], "lead_gen": P["by_cat"]["lead_gen"], "company_dollar": P["company_dollar"],
               "net_income": P["net_income"], "gci": sum(per[k]["gci"] for k in keys) if has["gci"] else None}
    # Lead sources.
    stop = {"lead", "leads", "ads", "ad", "advertising", "marketing", "fees", "fee", "referral", "program", "programs",
            "online", "the", "and", "of", "inc", "llc", "co", "paid", "spend"}
    toks = lambda s: {t for t in nkey(s).split() if t not in stop and len(t) > 1}
    spend_accts = [a for a in pnl["accounts"] if a["cat"] in ("lead_gen", "marketing")]
    ls_over = overrides.get("lead_sources") or {}
    sources = defaultdict(lambda: defaultdict(float))
    for d in deals:
        s = sources[d["source"]]
        s["closings"] += d["units"] or 1
        for f in ("gci", "team", "referral", "agent_paid", "brokerage"):
            if d.get(f) is not None:
                s[f] += d[f]
    roi = []
    for src, s in sorted(sources.items(), key=lambda kv: -kv[1]["closings"]):
        matched = []
        if src in ls_over:
            matched = [a for a in pnl["accounts"] if a["name"] in ls_over[src]]
        else:
            st = toks(src)
            if st:
                matched = [a for a in spend_accts if st <= toks(a["path"][-1]) or (toks(a["path"][-1]) and toks(a["path"][-1]) <= st)]
        spend = sum(sum(a["vals"].values()) for a in matched)
        row = {"source": src, "closings": s["closings"], "gci": s["gci"] if has["gci"] else None,
               "team": s["team"] if has["team"] else None, "referral": s["referral"] if has["referral"] else None,
               "accounts": [a["name"] for a in matched], "spend": spend if matched else None}
        if matched and spend > 0 and row["team"] is not None:
            row["roi"] = (row["team"] - spend) / spend
            row["basis"] = "upfront spend in the P&L"
        elif not matched and has["referral"] and s["referral"] > 0 and row["team"] is not None:
            row["roi"] = row["team"] / s["referral"]
            row["basis"] = "pay at close: the referral fees on these closings are the cost, and the team's share is already after them"
            row["spend"] = s["referral"]
        roi.append(row)
    return {"per": per, "has": has, "recon": recon, "flags": flags, "cpc": cpc, "roi": roi, "closings": n}


# --- budget ------------------------------------------------------------------------------------------

def budget_compare(budget_path, A, pnl, overrides):
    b = parse_pnl(budget_path)
    for a in b["accounts"]:
        a["cat"], _ = classify(a, overrides)
    common = [k for k in A["keys"] if k in b["keys"]]
    if not common:
        return None, "The budget's columns don't match any month in the P&L."
    rows = []
    bud = lambda cats: sum(a["vals"][k] for a in b["accounts"] if a["cat"] in cats for k in common)
    act_cd = sum(A["cd"][k] for k in common)
    bud_cd = bud(("commission",)) - bud(("agent_splits",)) - bud(("referral_fees",)) - bud(("brokerage_fees",)) + bud(("contra_splits",))
    rows.append(("Company dollar", act_cd, bud_cd))
    for c in OPEX:
        rows.append((CAT_NAMES[c], sum(A["opex"][c][k] for k in common), bud((c,))))
    return {"months": common, "rows": rows}, None


# --- the report --------------------------------------------------------------------------------------

def table(headers, rows):
    out = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
    out += ["| " + " | ".join(str(x) for x in r) + " |" for r in rows]
    return "\n".join(out)


def write_report(pnl, A, det, prod, P, budget, notes, out_dir):
    keys = A["keys"]
    L = [f"# P&L Analysis: {pnl['file']}", ""]
    L.append("## What Was Read")
    L.append(f"- Report: {' / '.join(t for t in pnl['title'] if t)}")
    L.append(f"- Columns: {', '.join(mlabel(k) for k in keys)} ({len(keys)} {'months' if pnl['is_months'] else 'period columns'})")
    L.append(f"- Basis: {pnl['basis'] + ' (as printed on the report)' if pnl['basis'] else 'not shown on the report'}")
    L.append(f"- Accounts read: {len(pnl['accounts'])}")
    for n in pnl["notes"] + notes:
        L.append(f"- Note: {n}")
    L.append("")
    L.append("### Totals Check")
    if A["checks"]:
        L += [f"- {c}" for c in A["checks"]]
    else:
        L.append("- Every month's accounts add up to the report's own Net Income" + (" and section totals." if pnl["computed"] else "."))
    L.append("")
    L.append("## How Revenue Is Recorded")
    L.append(f"- {A['verdict']}")
    for w in A["where"]:
        L.append(f"- In these books, {w}.")
    rows = []
    for k in keys:
        rows.append([mlabel(k), money(A["commission"][k]), money(A["splits"][k]), money(A["referral"][k]),
                     money(A["brokerage"][k]), pct(A["shares"][k]) if A["splits"][k] else "none", A["status"][k]])
    L.append("")
    L.append(table(["Month", "Commission income", "Agent splits", "Referral fees", "Brokerage split and fees", "Splits as share of commission", "Reads as"], rows))
    if A["typical"]:
        L.append(f"\nTypical split share (median of the months with splits): {pct(A['typical'])}.")
    if A["btyp"]:
        L.append("\nBrokerage split and fees as a share of commission income (gross months): " +
                 ", ".join(f"{mlabel(k)} {pct(v)}" for k, v in A["bshare"].items()) + ".")
    L.append("")
    L.append("## Company Dollar and Margin")
    L.append("Company dollar = commission income - agent splits - referral fees paid - brokerage split and fees. Margin = net income / company dollar.")
    L.append("")
    for k in keys:
        L.append(f"- {mlabel(k)}: company dollar = {m2(A['commission'][k])} - {m2(A['splits'][k])} - {m2(A['referral'][k])} - {m2(A['brokerage'][k])} = {m2(A['cd'][k])}; "
                 f"margin = {m2(A['net'][k])} / {m2(A['cd'][k])} = {pct(A['margin'][k])}")
    Pp = A["period"]
    L.append(f"- Period: company dollar = {m2(Pp['commission'])} - {m2(Pp['splits'])} - {m2(Pp['referral'])} - {m2(Pp['brokerage'])} = {m2(Pp['company_dollar'])}; "
             f"margin = {m2(Pp['net_income'])} / {m2(Pp['company_dollar'])} = {pct(Pp['margin'])}")
    if Pp["agent_fees"] or Pp["other_income"]:
        L.append(f"- Also in income, outside company dollar: fees charged to agents {m2(Pp['agent_fees'])}; other income {m2(Pp['other_income'])}.")
    if Pp["owner"]:
        L.append(f"- Net income above includes owner draws recorded as expenses ({m2(Pp['owner'])}). Before them: {m2(Pp['net_income'])} + {m2(Pp['owner'])} = {m2(Pp['net_income'] + Pp['owner'])}; "
                 f"margin = {m2(Pp['net_income'] + Pp['owner'])} / {m2(Pp['company_dollar'])} = {pct(div(Pp['net_income'] + Pp['owner'], Pp['company_dollar']))}.")
    rows = [[mlabel(k), money(A["cd"][k]), money(A["total_opex"][k]), money(A["net"][k]), pct(A["margin"][k])] for k in keys]
    rows.append(["Period", money(Pp["company_dollar"]), money(Pp["opex"]), money(Pp["net_income"]), pct(Pp["margin"])])
    L.append("")
    L.append(table(["Month", "Company dollar", "Operating expenses", "Net income", "Margin on company dollar"], rows))
    if A["gross_months"] and not A["mixed"]:
        gp = sum(A["commission"][k] for k in A["gross_months"])
        L.append(f"\nCompany dollar as a share of gross commission (gross months): {m2(Pp['company_dollar'])} / {m2(gp)} = {pct(div(Pp['company_dollar'], gp))}.")
    elif A["mixed"]:
        gp = sum(A["commission"][k] for k in A["gross_months"])
        gcd = sum(A["cd"][k] for k in A["gross_months"])
        L.append(f"\nCompany dollar as a share of gross commission, gross months only ({', '.join(mlabel(k) for k in A['gross_months'])}): "
                 f"{m2(gcd)} / {m2(gp)} = {pct(div(gcd, gp))}. The net months are left out because their gross commission isn't on the books.")
    L.append("")
    L.append("## Expense Mix")
    L.append("Each category as a share of company dollar for the period (category total / company dollar).")
    L.append("")
    rows = []
    for c in OPEX:
        t = Pp["by_cat"][c]
        rows.append([CAT_NAMES[c], money(t), f"{m2(t)} / {m2(Pp['company_dollar'])} = {pct(div(t, Pp['company_dollar']))}", pct(div(t, Pp["opex"]))])
    if Pp["uncategorized"]:
        rows.append(["Uncategorized", money(Pp["uncategorized"]), f"{m2(Pp['uncategorized'])} / {m2(Pp['company_dollar'])} = {pct(div(Pp['uncategorized'], Pp['company_dollar']))}", pct(div(Pp["uncategorized"], Pp["opex"]))])
    rows.append(["Total operating expenses", money(Pp["opex"]), f"{m2(Pp['opex'])} / {m2(Pp['company_dollar'])} = {pct(div(Pp['opex'], Pp['company_dollar']))}", "100.0%"])
    L.append(table(["Category", "Period total", "Share of company dollar", "Share of operating expenses"], rows))
    if Pp["owner"]:
        L.append(f"\nOwner draws recorded as expenses ({m2(Pp['owner'])}) are kept out of the mix.")
    L.append("")
    rows = [[CAT_NAMES[c]] + [money(A["opex"][c][k]) for k in keys] for c in OPEX]
    L.append(table(["Category"] + [mlabel(k) for k in keys], rows))
    L.append("")
    L.append("### How Each Account Was Read")
    rows = [[a["name"], a["section"], CAT_NAMES.get(a["cat"], a["cat"]), a["why"], money(sum(a["vals"].values()))] for a in pnl["accounts"]]
    L.append(table(["Account", "Section", "Read as", "Why", "Period total"], rows))
    L.append("")
    V = A["var"]
    L.append("## Changes")
    if "mom" in V:
        p, l = V["mom"]["prev"], V["mom"]["last"]
        L.append(f"### {mlabel(l)} Against {mlabel(p)}")
        if V.get("recording_changed"):
            L.append(f"- Recording changed between these months ({A['status'][p]} to {A['status'][l]}): commission income and splits moved because of how they were recorded. Compare company dollar, not commission income.")
        rows = [[n, money(a), money(b), f"{fm(b)} - {fm(a)} = {m2(b - a)}", pct(div(b - a, a)) if a > 0 else "n/a"] for n, a, b in V["mom"]["lines"]]
        L.append(table(["Line", mlabel(p), mlabel(l), "Change", "Change %"], rows))
        bg = V["biggest"]
        L.append(f"\nBiggest change: {bg['line']}, {m2(bg['prev'])} to {m2(bg['last'])} ({m2(bg['change'])})" +
                 (f"; the largest account move inside it is {bg['driver'][1]}, {m2(bg['driver'][2])} to {m2(bg['driver'][3])} ({m2(bg['driver'][4])})." if bg.get("driver") else "."))
        if V["movers"]:
            L.append("\nLargest account moves (operating expenses):")
            for _, name, a, b, ch in V["movers"]:
                L.append(f"- {name}: {m2(a)} to {m2(b)} ({m2(ch)})")
    if "vs_avg" in V:
        l = keys[-1]
        L.append(f"\n### {mlabel(l)} Against the Average of {mlabel(keys[0])} to {mlabel(keys[-2])}")
        rows = [[n, money(avg), money(b), money(b - avg)] for n, avg, b in V["vs_avg"]]
        L.append(table(["Line", "Average", mlabel(l), "Difference"], rows))
    if "ytd" in V:
        y = V["ytd"]
        L.append(f"\n### Year to Date ({mlabel(y['year'] + '-01')} to {mlabel(y['through'])})")
        L.append(f"- Company dollar {m2(y['company_dollar'])}; operating expenses {m2(y['opex'])}; net income {m2(y['net_income'])}; margin {m2(y['net_income'])} / {m2(y['company_dollar'])} = {pct(div(y['net_income'], y['company_dollar']))}.")
        if "ytd_prior" in V:
            q = V["ytd_prior"]
            L.append(f"- Same months last year: company dollar {m2(q['company_dollar'])}; operating expenses {m2(q['opex'])}; net income {m2(q['net_income'])}. "
                     f"Change in net income: {m2(y['net_income'])} - {m2(q['net_income'])} = {m2(y['net_income'] - q['net_income'])}.")
        else:
            L.append("- No prior-year months are in the file, so there is no year-over-year comparison.")
    elif "ytd_missing" in V:
        L.append(f"\n- {V['ytd_missing']}")
    if budget:
        L.append(f"\n### Against Budget ({', '.join(mlabel(k) for k in budget['months'])})")
        rows = [[n, money(a), money(b), money(a - b), pct(div(a - b, abs(b))) if b else "n/a"] for n, a, b in budget["rows"]]
        L.append(table(["Line", "Actual", "Budget", "Actual - budget", "%"], rows))
    L.append("")
    L.append("## Flags")
    flags = sorted(A["flags"] + (P["flags"] if P else []), key=lambda f: (f["priority"], f.get("month") or ""))
    if det:
        for a, b in det["duplicates"]:
            text = f"{show_name(a)}: {m2(a['amount'])} on {a['date']} and again on {b['date']} in {a['account']}."
            flags.insert(0, dict(priority=3, code="duplicate_charge", text=text, month=a["month"], amount=a["amount"], account=a["account"],
                                 question=f"{show_name(a)} was charged {m2(a['amount'])} on {a['date']} and again on {b['date']} ({a['account']}). Is the second charge a duplicate, and has it been refunded?"))
        for t, after, monthly in det["new_recurring"]:
            flags.append(dict(priority=6, code="new_recurring_vendor", month=t["month"], amount=monthly[-1], account=t["account"],
                              text=f"{t['name']} is new since {mlabel(t['month'])} ({t['account']}) and is charged every month since: {', '.join(m2(x) for x in monthly)}.",
                              question=f"{t['name']} started in {mlabel(t['month'])} at {m2(monthly[0])} a month ({t['account']}). Is this a new subscription, and is it set up to recur?"))
        for odd, acct, main, amt in det["multi_account"]:
            t = odd[0]
            flags.append(dict(priority=8, code="likely_miscategorized", month=t["month"], amount=amt, account=acct,
                              text=f"{t['name']}: {m2(amt)} in {acct} ({', '.join(str(o['date']) for o in odd)}), while most of its charges are in {main}.",
                              question=f"{t['name']} has {m2(amt)} in {acct} on {', '.join(str(o['date']) for o in odd)}, but its other charges are in {main}. Should it move?"))
        for t, guess in det["keyword_mismatch"]:
            flags.append(dict(priority=8, code="likely_miscategorized", month=t["month"], amount=t["amount"],
                              text=f"{t['name']} ({m2(t['amount'])} on {t['date']}) is in {t['account']} but its name reads as {CAT_NAMES[guess].lower()}.",
                              question=f"{t['name']} ({m2(t['amount'])} on {t['date']}) is in {t['account']}. Is that the right account?"))
        for t in det["uncategorized"]:
            flags.append(dict(priority=4, code="uncategorized_detail", month=t["month"], amount=t["amount"],
                              text=f"Uncategorized: {t['name'] or '(no name)'} {m2(t['amount'])} on {t['date']}.", question=None))
        for t in det["new_one_time"]:
            if t["cat"] == "uncategorized":
                continue
            flags.append(dict(priority=10, code="new_vendor_once", month=t["month"], amount=t["amount"],
                              text=f"{t['name']}: a new vendor, charged once ({m2(t['amount'])} on {t['date']}, {t['account']}).", question=None))
        # The charge-level flags explain some account-level ones; keep one flag per finding.
        explained = set()
        for f in flags:
            acct = f.get("account")
            if f["code"] == "duplicate_charge":
                explained |= {("exact_double", f["month"], acct), ("spike", f["month"], acct)}
            if f["code"] == "new_recurring_vendor":
                explained.add(("new_recurring_account", f["month"], acct))
            if f["code"] == "likely_miscategorized":
                explained |= {("one_time", f["month"], acct), ("spike", f["month"], acct)}
        flags = [f for f in flags if not (f.get("account_level") and (f["code"], f.get("month"), f.get("account")) in explained)]
        for g in flags:
            if g["code"] == "uncategorized" and g.get("month"):
                ts = [t for t in det["uncategorized"] if t["month"] == g["month"]]
                if ts:
                    extra = "; ".join(f"{t['name'] or '(no name)'} {m2(t['amount'])} on {t['date']}" for t in ts)
                    g["text"] += f" In the detail: {extra}."
                    if g.get("question"):
                        g["question"] = g["question"].replace(". What is it", f" ({extra}). What is it")
        flags = [f for f in flags if f["code"] != "uncategorized_detail" or not any(g["code"] == "uncategorized" and g.get("month") == f["month"] for g in flags)]
        flags.sort(key=lambda f: (f["priority"], f.get("month") or ""))
    if flags:
        for f in flags:
            L.append(f"- [P{f['priority']} {f['code']}] {f['text']}")
    else:
        L.append("- None.")
    if det is None:
        L.append("\nCharge-level checks (duplicate charges, new vendors, a vendor in the wrong account) need the P&L Detail export; only account-level patterns were checked.")
    L.append("")
    L.append("## Questions for the Bookkeeper (seeds)")
    qs = [f["question"] for f in flags if f.get("question")]
    L += [f"{i}. {q}" for i, q in enumerate(qs, 1)] or ["None from the data."]
    L.append("")
    L.append("## Production")
    if not P:
        L.append("- Skipped: no production export (closings, GCI, lead sources) was provided, so cost per closing, reconciliation to closings and lead source return were not computed.")
    else:
        L.append(f"- Columns used: " + "; ".join(f"{f} = '{c}'" for f, c in prod["cols"].items()))
        if prod["skipped"]:
            L.append("- Rows left out: " + "; ".join(f"{v} ({k})" for k, v in prod["skipped"].items()))
        if not prod["status_col"]:
            L.append("- No status column: every row with a closing date in the P&L months was counted as closed.")
        L.append(f"- Closings counted in the P&L months: {P['closings']:g}")
        L.append("")
        rows = []
        for k, inc, gci, gar, team, label in P["recon"]:
            rows.append([mlabel(k), f"{P['per'][k]['closings']:g}", money(gci), money(gar) if gar is not None else "n/a",
                         money(team) if team is not None else "n/a", money(inc), label])
        L.append("### P&L Commission Income Against the Production File")
        L.append(table(["Month", "Closings", "Production GCI", "GCI after referral fees", "Team's share", "P&L commission income", "Reads as"], rows))
        for k, inc, gci, gar, team, label in P["recon"]:
            if A["status"][k] != "gross" or not label.startswith("matches gross"):
                p = P["per"][k]
                parts = [f"GCI {m2(p['gci'])}"] if P["has"]["gci"] else []
                for f, name in (("agent_paid", "paid to agents"), ("referral", "referral fees"), ("brokerage", "brokerage fees"), ("team", "team's share")):
                    if P["has"][f]:
                        parts.append(f"{name} {m2(p[f])}")
                L.append(f"\n{mlabel(k)} in the production file ({p['closings']:g} closings): " + "; ".join(parts) +
                         f". The P&L shows commission income {m2(inc)}, agent splits {m2(A['splits'][k])}, referral fees {m2(A['referral'][k])}, brokerage split and fees {m2(A['brokerage'][k])}.")
        c = P["cpc"]
        if c:
            L.append("\n### Cost per Closing (period)")
            L.append(f"- Operating expenses per closing = {m2(c['opex'])} / {c['closings']:g} = {m2(c['opex'] / c['closings'])}")
            L.append(f"- Lead generation per closing = {m2(c['lead_gen'])} / {c['closings']:g} = {m2(c['lead_gen'] / c['closings'])}")
            L.append(f"- Company dollar per closing = {m2(c['company_dollar'])} / {c['closings']:g} = {m2(c['company_dollar'] / c['closings'])}")
            L.append(f"- Net income per closing = {m2(c['net_income'])} / {c['closings']:g} = {m2(c['net_income'] / c['closings'])}")
            if c["gci"] is not None:
                L.append(f"- Average GCI per closing (production file) = {m2(c['gci'])} / {c['closings']:g} = {m2(c['gci'] / c['closings'])}")
            rows = [[mlabel(k), f"{P['per'][k]['closings']:g}", money(A['total_opex'][k]),
                     m2(A['total_opex'][k] / P['per'][k]['closings']) if P['per'][k]['closings'] else "n/a"] for k in keys]
            L.append("")
            L.append(table(["Month", "Closings", "Operating expenses", "Per closing"], rows))
            L.append("\nMonthly figures swing with closing timing; the period figure is the one to use.")
        L.append("\n### Lead Sources (period)")
        rows = []
        for r in P["roi"]:
            if r.get("roi") is not None:
                if r["basis"].startswith("pay at close"):
                    calc = f"{m2(r['team'])} / {m2(r['spend'])} = {r['roi']:.2f} per $1 of fees"
                else:
                    calc = f"({m2(r['team'])} - {m2(r['spend'])}) / {m2(r['spend'])} = {r['roi']:.2f} per $1 spent"
            else:
                calc = "no matching spend line" if not r["accounts"] else "no team share column"
            rows.append([r["source"], f"{r['closings']:g}", money(r["gci"]) if r["gci"] is not None else "n/a",
                         money(r["team"]) if r["team"] is not None else "n/a",
                         ", ".join(r["accounts"]) or ("referral fees on these closings" if r.get("basis", "").startswith("pay at close") else "none"),
                         money(r["spend"]) if r.get("spend") is not None else "n/a", calc])
        L.append(table(["Source", "Closings", "GCI", "Team's share", "Spend line in the P&L", "Spend", "Return on spend"], rows))
        L.append("\nReturn on spend = (team's share from the source's closings - spend) / spend, for the same months. For a pay-at-close source the team's share is already after the referral fee, so its return = team's share / referral fees. Lead spend and the closings it produces rarely land in the same months, so read this as a rough period view.")
    L.append("")
    with open(os.path.join(out_dir, "pnl_report.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    js = {"file": pnl["file"], "months": keys, "basis": pnl["basis"], "checks": A["checks"], "verdict": A["verdict"],
          "where": A["where"], "status": A["status"], "typical_split_share": A["typical"],
          "commission": A["commission"], "splits": A["splits"], "referral": A["referral"], "brokerage": A["brokerage"],
          "company_dollar": A["cd"], "net_income": A["net"], "margin": A["margin"], "opex": A["total_opex"],
          "by_category": {c: A["opex"][c] for c in OPEX}, "period": A["period"], "variances": {k: v for k, v in A["var"].items()},
          "flags": flags, "questions": qs,
          "production": None if not P else {"closings": P["closings"], "cost_per_closing": P["cpc"], "lead_sources": P["roi"],
                                            "reconciliation": P["recon"]}}
    with open(os.path.join(out_dir, "pnl_report.json"), "w", encoding="utf-8") as f:
        json.dump(js, f, indent=1, default=str)
    with open(os.path.join(out_dir, "pnl_accounts.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Account", "Section", "Read as", "Why"] + [mlabel(k) for k in keys] + ["Period"])
        for a in pnl["accounts"]:
            w.writerow([a["name"], a["section"], CAT_NAMES.get(a["cat"], a["cat"]), a["why"]] + [f"{a['vals'][k]:.2f}" for k in keys] + [f"{sum(a['vals'].values()):.2f}"])
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pnl")
    ap.add_argument("--detail")
    ap.add_argument("--production")
    ap.add_argument("--budget")
    ap.add_argument("--map")
    ap.add_argument("--out", default=".")
    args = ap.parse_args()
    overrides = json.load(open(args.map)) if args.map else {}
    th = dict(DEFAULTS)
    th.update(overrides.get("thresholds") or {})
    acct_over = overrides.get("accounts") or {}
    os.makedirs(args.out, exist_ok=True)
    pnl = parse_pnl(args.pnl)
    if not pnl["accounts"]:
        sys.exit("No accounts with amounts were found under the column headings.")
    A = analyze(pnl, acct_over, th)
    notes, det, prod, P, budget = [], None, None, None, None
    if args.detail:
        txs, err = parse_detail(args.detail, acct_over)
        if err:
            notes.append(err)
        else:
            det = detail_checks(txs, A["keys"], th, acct_over)
            notes.append(f"Detail file {os.path.basename(args.detail)}: {len(txs)} transactions read.")
            dsum = defaultdict(float)
            for t in txs:
                if t["section"] in ("expense", "other_expense"):
                    dsum[t["month"]] += t["amount"]
            for k in A["keys"]:
                rep = sum(a["vals"][k] for a in pnl["accounts"] if a["section"] in ("expense", "other_expense"))
                if abs(dsum.get(k, 0.0) - rep) > 0.01:
                    notes.append(f"Detail expenses for {mlabel(k)} add to {m2(dsum.get(k, 0.0))}; the P&L shows {m2(rep)}.")
    if args.production:
        prod, err = parse_production(args.production, A["keys"], overrides)
        if err:
            notes.append(err)
            prod = None
        else:
            P = production_analysis(prod, A, pnl, th, overrides)
    if args.budget:
        budget, err = budget_compare(args.budget, A, pnl, acct_over)
        if err:
            notes.append(err)
    print(write_report(pnl, A, det, prod, P, budget, notes, args.out))


if __name__ == "__main__":
    main()
```
