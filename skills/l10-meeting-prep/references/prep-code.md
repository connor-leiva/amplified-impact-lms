# Prep Code

Last verified: 2026-11-10. The export layouts this code reads (Ninety's scorecard CSV with the newest week on the left, its Rocks, To-Dos and Issues spreadsheets, Bloom Growth's meeting export CSVs, and spreadsheets) are described, with their sources, in `exports.md`. The agenda times are EOS Worldwide's, in `l10-agenda.md`. The rules for misses, empty cells, rock status and the to-do window are in `prep-rules.md`.

Run this code with Python 3 on the uploaded files. It uses Python's standard library, plus openpyxl for an .xlsx file. Do not paste it into the conversation.

Usage:

    python3 l10.py --scorecard FILE [--rocks FILE] [--todos FILE [--todos FILE2]] [--issues FILE] [--headlines FILE] --meeting-date YYYY-MM-DD [--start HH:MM] [--week YYYY-MM-DD] [--weeks 13] [--goals goals.json] [--out FOLDER]

It prints the data and writes l10_prep_data.md (every table and the arithmetic) and l10_prep_data.json (the same, for drafting) to FOLDER.

What it does: finds each file's header row and columns by name (and shows which column it used for what); sorts the scorecard's weeks by date, whichever way the file runs; picks the newest week with numbers on or before the meeting date; reads each measurable's own goal and its direction; marks each week's cell hit, miss, empty or not a number, and never fills an empty one; repeats each rock's status as written or "no status given"; counts the to-dos due in the 7 days up to the meeting and works out the completion rate from the ones with a status; lists the issues (short-term and long-term apart) and the headlines as written; and gives the agenda's clock times.

```python
#!/usr/bin/env python3
# L10 Meeting Prep (Amplified Impact). Python 3 standard library, plus openpyxl for an .xlsx upload.
#
# Reads what a team exports or pastes before its weekly EOS Level 10 Meeting: the scorecard (Ninety,
# Bloom Growth, formerly Traction Tools, or a spreadsheet), the rocks, last week's to-dos, the issues list
# and the headlines. It only reads and counts. It never fills an empty scorecard cell, never gives a rock
# a status its owner did not give, and never adds an issue. Writes to --out:
#   l10_prep_data.md    every table, with the arithmetic shown
#   l10_prep_data.json  the same, for drafting
#
# Usage:
#   python3 l10.py --scorecard FILE [--rocks FILE] [--todos FILE [--todos FILE2]] [--issues FILE] [--headlines FILE]
#                  [--meeting-date YYYY-MM-DD] [--start HH:MM] [--week YYYY-MM-DD] [--weeks 13]
#                  [--todo-days 7] [--goals goals.json] [--out DIR]
#
# One workbook with several tabs can be passed to more than one option; each option picks its tab.
# goals.json is optional. Write it only from what the user said or what the run showed was misread:
#   {"directions": {"Speed to Lead (Minutes)": "at most"},
#    "columns": {"scorecard": {"title": "KPI Name"}, "todos": {"status": "Complete?"}}}
# Directions: at least, at most, more than, less than, exactly.

import argparse
import csv
import json
import os
import re
import sys
from datetime import date, datetime, timedelta

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

AGENDA = [  # EOS Worldwide's Level 10 Meeting agenda: section, minutes (sources in the agenda reference)
    ("Segue", 5), ("Scorecard", 5), ("Rock Review", 5), ("Customer and Employee Headlines", 5),
    ("To-Do List", 5), ("IDS", 60), ("Conclude", 5),
]

SYN = {
    "title": ["title", "measurable", "measurables", "kpi", "kpi name", "kpi title", "metric", "metric name", "name",
              "measure", "rock", "rock name", "rock title", "goal name", "quarterly priority", "priority name",
              "to do", "todo", "to do title", "task", "task name", "action item", "issue", "issue title",
              "headline", "headline title", "item", "description of item"],
    "owner": ["owner", "owner name", "accountable", "who", "responsible", "assigned to", "assignee",
              "accountable user", "raised by", "submitted by", "created by", "person"],
    "goal": ["goal", "target", "goal value", "target value", "weekly goal", "goal target"],
    "direction": ["goal direction", "direction", "operator", "goal operator", "goal rule", "rule", "comparison",
                  "goal type", "target direction", "goal metric"],
    "status": ["status", "rock status", "state", "completion status", "complete", "completed", "done", "is complete",
               "is completed", "complete?", "done?"],
    "completed_on": ["completed date", "completed on", "completed on date", "date completed", "completion date",
                     "closed date", "done date", "completed at"],
    "due": ["due date", "due", "due by", "due on", "deadline", "target date", "rock due date", "due date time"],
    "created": ["created", "created date", "create date", "created on", "date created", "date added", "added",
                "raised on", "opened", "created at"],
    "priority": ["priority", "rank", "ranking", "order", "priority rank", "importance", "vote", "votes"],
    "notes": ["description", "details", "notes", "note", "detail", "details notes"],
    "kind": ["type", "headline type", "category", "issue type", "list", "term", "level"],
    "date": ["week", "week of", "date", "period", "week ending", "week start", "reporting period", "period start",
             "week beginning", "measured on"],
    "value": ["value", "actual", "score", "result", "number", "measured value"],
}
HINTS = {
    "scorecard": ["scorecard", "kpi", "metric", "measurable", "data"],
    "rocks": ["rock", "priorit", "goals"],
    "todos": ["to do", "todo", "to-do", "task", "action"],
    "issues": ["issue", "o&o", "o and o", "ids"],
    "headlines": ["headline"],
}
NEEDS = {
    "rocks": ["title", "owner"], "todos": ["title"], "issues": ["title"], "headlines": ["title"],
}
DONE = {"done", "complete", "completed", "yes", "y", "true", "x", "closed", "finished", "1", "checked", "resolved"}
NOT_DONE = {"not done", "open", "in progress", "no", "n", "false", "incomplete", "not complete", "0", "overdue",
            "pending", "not started", "todo", "to do", "active", "unchecked"}
BLANKS = {"", "-", chr(0x2013), chr(0x2014), "n/a", "na", "none", "null", "nan", "--"}
MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}


def norm(s):
    return re.sub(r"[^a-z0-9?&]+", " ", str(s).lower()).strip()


def cell_text(v):
    if v is None:
        return ""
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def read_sheets(path):
    """[(sheet name, rows)] for a CSV, TSV, TXT table or XLSX workbook; every cell as text."""
    ext = os.path.splitext(path)[1].lower()
    if ext in (".xlsx", ".xlsm"):
        import openpyxl
        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
        out = []
        for ws in wb.worksheets:
            rows = [[cell_text(v) for v in r] for r in ws.iter_rows(values_only=True)]
            out.append((ws.title, rows))
        return out
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    sample = text[:5000]
    delim = "\t" if sample.count("\t") > sample.count(",") else ","
    rows = [[c.strip() for c in r] for r in csv.reader(text.splitlines(), delimiter=delim)]
    return [(os.path.splitext(os.path.basename(path))[0], rows)]


def parse_date(s, ref=None):
    """A date from text such as 2026-11-02, 11/02/2026, 11/2/26, Nov 2, 2026 or Nov 2 (the first date found)."""
    if not s:
        return None
    s = str(s).strip()
    m = re.search(r"(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    m = re.search(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b", s)
    if m:
        y = m.group(3)
        year = (int(y) + 2000 if len(y) == 2 else int(y)) if y else None
        return fill_year(int(m.group(1)), int(m.group(2)), year, ref)
    m = re.search(r"\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?", s)
    if m and m.group(1).lower() in MONTHS:
        year = int(m.group(3)) if m.group(3) else None
        if year is None:
            m4 = re.search(r"\b(20\d{2})\b", s)
            year = int(m4.group(1)) if m4 else None
        return fill_year(MONTHS[m.group(1).lower()], int(m.group(2)), year, ref)
    return None


def fill_year(month, day, year, ref):
    ref = ref or date.today()
    try:
        if year:
            return date(year, month, day)
        d = date(ref.year, month, day)
        if (d - ref).days > 60:
            d = date(ref.year - 1, month, day)
        return d
    except ValueError:
        return None


def find_col(header, key, override=None):
    names = [norm(h) for h in header]
    if override:
        o = norm(override)
        return names.index(o) if o in names else None
    for syn in SYN[key]:
        if syn in names:
            return names.index(syn)
    return None


def find_header(rows, keys, overrides, extra_ok=None, limit=20):
    """The first row (of the first 20) that names every key in `keys`; returns (index, {key: column})."""
    for i, row in enumerate(rows[:limit]):
        if not any(c for c in row):
            continue
        cols = {}
        for key in SYN:
            c = find_col(row, key, overrides.get(key))
            if c is not None:
                cols[key] = c
        if all(k in cols for k in keys) or (extra_ok and extra_ok(row, cols)):
            return i, cols
    return None, {}


def pick_sheets(sheets, kind, needs, overrides, extra_ok=None):
    """Sheets that hold this kind of table: a sheet named for it first, else any whose header fits."""
    found = []
    for name, rows in sheets:
        i, cols = find_header(rows, needs, overrides, extra_ok)
        if i is not None:
            found.append((name, rows, i, cols))
    if len(found) > 1:
        named = [f for f in found if any(h in f[0].lower() for h in HINTS[kind])]
        if named:
            return named
        other = [f for f in found if not any(h in f[0].lower() for k, hs in HINTS.items() if k != kind for h in hs)]
        if other:
            return other[:1]
        return found[:1]
    return found


def number(s):
    """A number from a cell such as 12, 1,234, $12,500, 45%, 3.5 or 4 min; None when it is not one."""
    t = str(s).strip().replace(",", "").replace("$", "")
    m = re.fullmatch(r"\(?(-?\d+(?:\.\d+)?)\)?\s*%?\s*[A-Za-z. ]{0,12}", t)
    if not m:
        return None
    v = float(m.group(1))
    if t.startswith("(") and ")" in t:
        v = -v
    return v


def fmt(v):
    if v is None:
        return ""
    if abs(v - round(v)) < 1e-9:
        return f"{int(round(v)):,}"
    return f"{v:,.2f}".rstrip("0").rstrip(".")


DIR_WORDS = [
    ("at least", ["at least", "minimum", "greater than or equal", "greater than or equal to", "higher is better",
                  "above or equal", "or more", "or above", "or higher", "min", "gte", "ge", "up"]),
    ("at most", ["at most", "maximum", "less than or equal", "less than or equal to", "lower is better",
                 "below or equal", "or less", "or fewer", "or below", "or lower", "max", "lte", "le", "down"]),
    ("more than", ["greater than", "more than", "above", "over", "gt"]),
    ("less than", ["less than", "fewer than", "under", "below", "lt"]),
    ("exactly", ["equal", "equals", "equal to", "exactly", "eq"]),
]
SYMBOLS = ((">=", "at least"), ("=>", "at least"), ("\u2265", "at least"), ("<=", "at most"), ("=<", "at most"),
           ("\u2264", "at most"), (">", "more than"), ("<", "less than"), ("=", "exactly"))


def direction_word(text):
    """at least, at most, more than, less than or exactly, from a symbol or words; None when there are none."""
    t = str(text).strip().lower()
    if not t:
        return None
    for word, keys in DIR_WORDS:  # the whole cell is one of the words, such as "Max" or "Up"
        if t in keys:
            return word
    for sym, word in SYMBOLS:  # a symbol anywhere
        if sym in t:
            return word
    for word, keys in DIR_WORDS:  # a phrase of four letters or more, as whole words ("min" is often a unit)
        for k in sorted(keys, key=len, reverse=True):
            if len(k) > 3 and re.search(r"\b" + re.escape(k) + r"\b", t):
                return word
    return None


def read_goal(goal_text, dir_text, title, directions):
    """(reading, how) for a goal: reading is {'dir', 'value'} or {'dir': 'between', 'lo', 'hi'}; None if unreadable."""
    g = str(goal_text or "").strip()
    if norm(g) in ("", "n a", "na", "none"):
        return None, "no goal in the file"
    rng = re.fullmatch(r"(?:between\s+)?\$?([\d,]+(?:\.\d+)?)\s*%?\s*(?:to|and|-)\s*\$?([\d,]+(?:\.\d+)?)\s*%?\s*[A-Za-z ]{0,12}", g, re.I)
    if rng:
        lo, hi = float(rng.group(1).replace(",", "")), float(rng.group(2).replace(",", ""))
        return {"dir": "between", "lo": min(lo, hi), "hi": max(lo, hi)}, "range in the goal"
    plus = re.fullmatch(r"\$?([\d,]+(?:\.\d+)?)\s*%?\s*\+\s*[A-Za-z ]{0,12}", g)
    if plus:
        return {"dir": "at least", "value": float(plus.group(1).replace(",", ""))}, "the + in the goal"
    m = re.search(r"\$?(-?[\d,]*\.?\d+)", g)
    if not m:
        return None, "goal not readable as a number"
    value = float(m.group(1).replace(",", ""))
    words = re.sub(r"\$?-?[\d,]*\.?\d+\s*%?", " ", g).strip()
    d = direction_word(words) if words else None
    if title in directions:
        return {"dir": directions[title], "value": value}, "goals.json"
    if d:
        return {"dir": d, "value": value}, "the goal's own words or symbol"
    d = direction_word(dir_text) if dir_text else None
    if d:
        return {"dir": d, "value": value}, "the direction column"
    return {"dir": "at least", "value": value, "assumed": True}, "ASSUMED at least: the file gives no direction"


def goal_words(r):
    if r is None:
        return ""
    if r["dir"] == "between":
        return f"{fmt(r['lo'])} to {fmt(r['hi'])}"
    return f"{r['dir']} {fmt(r['value'])}"


def hits(v, r):
    d = r["dir"]
    if d == "between":
        return r["lo"] <= v <= r["hi"]
    g = r["value"]
    return {"at least": v >= g, "at most": v <= g, "more than": v > g, "less than": v < g,
            "exactly": abs(v - g) < 1e-9}[d]


# --- scorecard -------------------------------------------------------------------------------------

def read_scorecard(path, meeting, overrides, directions, weeks_n, pick_week=None):
    sheets = read_sheets(path)
    wide = lambda row, cols: "title" in cols and sum(1 for h in row if parse_date(h, meeting)) >= 2
    found = pick_sheets(sheets, "scorecard", ["title", "goal"], overrides, extra_ok=wide)
    if not found:
        return {"error": f"No scorecard table found in {os.path.basename(path)}: no header row with a measurable "
                         "name and a goal or week dates in the first 20 rows."}
    name, rows, hi, cols = found[0]
    header = rows[hi]
    date_cols = []
    for j, h in enumerate(header):
        if j in cols.values():
            continue
        d = parse_date(h, meeting)
        if d:
            date_cols.append((j, d, h))
    measurables = []
    layout = "wide"
    if len(date_cols) >= 2:
        for r in rows[hi + 1:]:
            r = r + [""] * (len(header) - len(r))
            title = r[cols["title"]].strip() if cols.get("title") is not None else ""
            if not title or norm(title).startswith("practice file"):
                continue
            cells = {d: r[j] for j, d, _ in date_cols}
            measurables.append({
                "title": title,
                "owner": r[cols["owner"]].strip() if "owner" in cols else "",
                "goal_text": r[cols["goal"]].strip() if "goal" in cols else "",
                "dir_text": r[cols["direction"]].strip() if "direction" in cols else "",
                "cells": cells,
            })
        week_labels = {d: h for _, d, h in date_cols}
    elif "date" in cols and "value" in cols:
        layout = "long"
        by = {}
        week_labels = {}
        for r in rows[hi + 1:]:
            r = r + [""] * (len(header) - len(r))
            title = r[cols["title"]].strip()
            d = parse_date(r[cols["date"]], meeting)
            if not title or not d:
                continue
            m = by.setdefault(title, {"title": title, "owner": "", "goal_text": "", "dir_text": "", "cells": {}})
            for k, key in (("owner", "owner"), ("goal_text", "goal"), ("dir_text", "direction")):
                if key in cols and r[cols[key]].strip():
                    m[k] = r[cols[key]].strip()
            m["cells"][d] = r[cols["value"]]
            week_labels[d] = r[cols["date"]]
        measurables = list(by.values())
        all_weeks = sorted(week_labels)
        for m in measurables:
            for d in all_weeks:
                m["cells"].setdefault(d, "")
    else:
        return {"error": f"Found a scorecard header in {name} but no week columns (two or more dates across the top) "
                         "and no Week and Value columns."}
    weeks_all = sorted(week_labels)
    future = [d for d in weeks_all if d > meeting]
    weeks = [d for d in weeks_all if d <= meeting]
    filled = [d for d in weeks if any(str(m["cells"].get(d, "")).strip().lower() not in BLANKS for m in measurables)]
    not_entered = [d for d in weeks if filled and d > filled[-1]]
    latest = filled[-1] if filled else None
    if pick_week:
        on_or_before = [d for d in weeks if d <= pick_week]
        latest = on_or_before[-1] if on_or_before else latest
        not_entered = [d for d in weeks if d > latest]
    window = [d for d in weeks if latest and d <= latest][-weeks_n:]
    used = {c for k, c in cols.items() if k in ("title", "owner", "goal", "direction", "date", "value")}
    ignored = [h for j, h in enumerate(header) if h and j not in used and j not in [c for c, _, _ in date_cols]]
    out_rows, blanks, unreadable = [], [], []
    for m in measurables:
        reading, how = read_goal(m["goal_text"], m["dir_text"], m["title"], directions)
        per_week = []
        for d in window:
            raw = str(m["cells"].get(d, "")).strip()
            if raw.lower() in BLANKS:
                per_week.append({"week": d.isoformat(), "raw": "", "value": None, "result": "BLANK"})
                blanks.append({"measurable": m["title"], "owner": m["owner"], "week": d.isoformat(),
                               "week_label": week_labels[d]})
                continue
            v = number(raw)
            if v is None:
                per_week.append({"week": d.isoformat(), "raw": raw, "value": None, "result": "UNREADABLE"})
                unreadable.append({"measurable": m["title"], "owner": m["owner"], "week": d.isoformat(), "raw": raw})
                continue
            res = "NO GOAL" if reading is None else ("HIT" if hits(v, reading) else "MISS")
            per_week.append({"week": d.isoformat(), "raw": raw, "value": v, "result": res})
        with_num = [w for w in per_week if w["value"] is not None]
        misses = [w for w in with_num if w["result"] == "MISS"]
        out_rows.append({
            "title": m["title"], "owner": m["owner"], "goal_text": m["goal_text"], "dir_text": m["dir_text"],
            "goal": reading, "goal_read_as": goal_words(reading), "goal_how": how,
            "this_week": per_week[-1] if per_week else None,
            "last_week": per_week[-2] if len(per_week) > 1 else None,
            "weeks_with_number": len(with_num), "misses": len(misses),
            "blanks": sum(1 for w in per_week if w["result"] == "BLANK"), "weeks": per_week,
        })
    return {
        "file": os.path.basename(path), "sheet": name, "header_row": hi + 1, "layout": layout,
        "columns_used": {k: header[c] for k, c in cols.items() if k in ("title", "owner", "goal", "direction", "date", "value")},
        "ignored_columns": ignored, "week_columns": len(weeks_all),
        "weeks_after_meeting": [week_labels[d] for d in future],
        "weeks_not_entered": [week_labels[d] for d in not_entered],
        "latest_week": latest.isoformat() if latest else None,
        "latest_week_label": week_labels[latest] if latest else None,
        "window": [d.isoformat() for d in window], "window_labels": [week_labels[d] for d in window],
        "order_in_file": ("one row per measurable per week" if layout == "long" else
                          "week columns newest first" if date_cols[0][1] > date_cols[-1][1] else "week columns oldest first"),
        "measurables": out_rows, "blanks": blanks, "unreadable": unreadable,
    }


# --- rocks, to-dos, issues, headlines ----------------------------------------------------------------

def table(path, kind, meeting, overrides):
    sheets = read_sheets(path)
    # Bloom Growth calls rocks Goals: a rocks table may name its rock column "Goal".
    rock_goal = (lambda row, cols: "goal" in cols and "owner" in cols) if kind == "rocks" else None
    found = pick_sheets(sheets, kind, NEEDS[kind], overrides, extra_ok=rock_goal)
    if kind == "rocks":
        found = [f for f in found if "milestone" not in f[0].lower()] or found
    if not found:
        return None
    out = []
    for name, rows, hi, cols in found:
        header = rows[hi]
        if "title" not in cols and "goal" in cols:
            cols["title"] = cols.pop("goal")
        items = []
        for r in rows[hi + 1:]:
            r = r + [""] * (len(header) - len(r))
            title = r[cols["title"]].strip()
            if not title or norm(title).startswith("practice file"):
                continue
            item = {k: r[c].strip() for k, c in cols.items() if k in ("title", "owner", "status", "completed_on", "due",
                                                                       "created", "priority", "notes", "kind")}
            items.append(item)
        out.append({"file": os.path.basename(path), "sheet": name, "header_row": hi + 1,
                    "columns_used": {k: header[c] for k, c in cols.items() if k in ("title", "owner", "status",
                                     "completed_on", "due", "created", "priority", "notes", "kind")},
                    "items": items})
    return out


def iso_or_raw(s, meeting):
    d = parse_date(s, meeting)
    return d.isoformat() if d else s


def read_rocks(path, meeting, overrides):
    t = table(path, "rocks", meeting, overrides)
    if not t:
        return {"error": f"No rocks table found in {os.path.basename(path)} (needs a title and an owner column)."}
    t = t[0]
    counts = {}
    for it in t["items"]:
        st = it.get("status", "")
        it["status_given"] = st if st else "no status given"
        it["due_iso"] = iso_or_raw(it.get("due", ""), meeting)
        counts[it["status_given"]] = counts.get(it["status_given"], 0) + 1
    t["status_counts"] = counts
    t["has_status_column"] = "status" in t["columns_used"]
    return t


def done_state(it, has_status, has_completed):
    if has_status:
        s = norm(it.get("status", ""))
        if s == "":
            return "no status given"
        if s in DONE or ("done" in s and "not" not in s) or ("complete" in s and "incomplete" not in s and "not" not in s):
            return "done"
        return "not done"
    if has_completed:
        return "done" if it.get("completed_on", "").strip() else "not done"
    return "no status given"


def read_todos(paths, meeting, overrides, window_days):
    parts = []
    for path in paths:
        t = table(path, "todos", meeting, overrides)
        if not t:
            return {"error": f"No to-do table found in {os.path.basename(path)} (needs a title column)."}
        parts.append(t[0])
    t = dict(parts[0])
    t["file"] = ", ".join(x["file"] for x in parts)
    cols = {}
    for x in parts:
        cols.update(x["columns_used"])
    t["columns_used"] = cols
    seen, items, dupes = set(), [], 0
    for x in parts:
        for it in x["items"]:
            key = (norm(it.get("title", "")), norm(it.get("owner", "")), norm(it.get("due", "")))
            if key in seen:
                dupes += 1
                continue
            seen.add(key)
            items.append(it)
    t["items"] = items
    t["duplicates_dropped"] = dupes
    has_status = "status" in t["columns_used"]
    has_completed = "completed_on" in t["columns_used"]
    has_due = "due" in t["columns_used"]
    start = meeting - timedelta(days=window_days)
    groups = {"counted": [], "older_open": [], "older_done": [], "not_due_yet": [], "no_due_date": []}
    for it in t["items"]:
        it["state"] = done_state(it, has_status, has_completed)
        d = parse_date(it.get("due", ""), meeting) if has_due else None
        it["due_iso"] = d.isoformat() if d else it.get("due", "")
        if not has_due:
            groups["counted"].append(it)
        elif d is None:
            groups["no_due_date"].append(it)
        elif d > meeting:
            groups["not_due_yet"].append(it)
        elif d > start:
            groups["counted"].append(it)
        elif it["state"] == "done":
            groups["older_done"].append(it)
        else:
            groups["older_open"].append(it)
    c = groups["counted"]
    done = sum(1 for i in c if i["state"] == "done")
    not_done = sum(1 for i in c if i["state"] == "not done")
    no_status = sum(1 for i in c if i["state"] == "no status given")
    with_status = done + not_done
    rate = None if with_status == 0 else round(100.0 * done / with_status, 1)
    if not has_due:
        window_words = "every to-do in the file (the file has no due date column)"
    else:
        window_words = f"to-dos due {(start + timedelta(days=1)).isoformat()} through {meeting.isoformat()} (the {window_days} days up to the meeting)"
    arithmetic = (f"{done} done / {with_status} with a status = {rate:.1f}%" if rate is not None
                  else "no to-do in the window has a status, so no rate")
    t.update({"groups": groups, "done": done, "not_done": not_done, "no_status": no_status, "with_status": with_status,
              "rate": rate, "arithmetic": arithmetic, "window_words": window_words,
              "has_status": has_status or has_completed, "has_due": has_due})
    return t


def read_issues(path, meeting, overrides):
    t = table(path, "issues", meeting, overrides)
    if not t:
        return {"error": f"No issues table found in {os.path.basename(path)} (needs a title column)."}
    short, long_ = [], []
    for sheet in t:
        is_long = "long" in sheet["sheet"].lower()
        for n, it in enumerate(sheet["items"], 1):
            it["n_in_file"] = n
            it["sheet"] = sheet["sheet"]
            it["created_iso"] = iso_or_raw(it.get("created", ""), meeting)
            kind = norm(it.get("kind", ""))
            (long_ if is_long or "long" in kind else short).append(it)
    return {"sheets": [{k: v for k, v in s.items() if k != "items"} for s in t], "short_term": short, "long_term": long_}


def read_headlines(path, meeting, overrides):
    t = table(path, "headlines", meeting, overrides)
    if t:
        return {"sheets": [{k: v for k, v in s.items() if k != "items"} for s in t],
                "items": [it for s in t for it in s["items"]]}
    text = open(path, encoding="utf-8", errors="replace").read()
    lines = [l.strip().lstrip("-*• ").strip() for l in text.splitlines()]
    lines = [l for l in lines if l and not norm(l).startswith("practice file")]
    return {"sheets": [{"file": os.path.basename(path), "sheet": "text", "header_row": None, "columns_used": {}}],
            "items": [{"title": l} for l in lines]}


# --- report ----------------------------------------------------------------------------------------

def agenda_rows(start):
    rows, t = [], None
    if start:
        h, m = (int(x) for x in start.split(":"))
        t = datetime(2000, 1, 1, h, m)
    for name, mins in AGENDA:
        if t:
            end = t + timedelta(minutes=mins)
            rows.append((name, mins, f"{clock(t)} to {clock(end)}"))
            t = end
        else:
            rows.append((name, mins, ""))
    return rows


def clock(t):
    h = t.hour % 12 or 12
    return f"{h}:{t.minute:02d} {'AM' if t.hour < 12 else 'PM'}"


def md_table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    for r in rows:
        out.append("| " + " | ".join(str(c).replace("|", "/") for c in r) + " |")
    return "\n".join(out)


def report(data):
    L = ["# L10 Prep Data", ""]
    L.append(f"Meeting date: {data['meeting_date']} ({data['meeting_date_source']}). Everything below is read or counted "
             "from the files; nothing is filled in.")
    L += ["", "## Files Read", ""]
    for f in data["files_read"]:
        L.append(f"- {f}")
    L += ["", "## Agenda (EOS Level 10 Meeting)", ""]
    L.append(md_table(["Section", "Minutes", "Time"], data["agenda"]))
    L.append(f"\nTotal: {sum(m for _, m, _ in data['agenda'])} minutes.")
    sc = data.get("scorecard")
    if sc and "error" not in sc:
        L += ["", "## Scorecard", ""]
        L.append(f"Week reviewed: **{sc['latest_week_label']}** (read as {sc['latest_week']}). Weeks counted: "
                 f"{len(sc['window'])}, from {sc['window_labels'][0]} through {sc['window_labels'][-1]}. The file has "
                 f"{sc['order_in_file']}.")
        if sc["weeks_not_entered"]:
            L.append(f"Not entered yet (every cell empty, left out): {', '.join(sc['weeks_not_entered'])}.")
        if sc["weeks_after_meeting"]:
            L.append(f"After the meeting date (left out): {', '.join(sc['weeks_after_meeting'])}.")
        L += ["", "### How Each Goal Was Read", ""]
        L.append(md_table(["Measurable", "Owner", "Goal in file", "Direction column", "Read as", "From"],
                          [(m["title"], m["owner"], m["goal_text"], m["dir_text"], m["goal_read_as"] or "(none)", m["goal_how"])
                           for m in sc["measurables"]]))
        L += ["", "### This Week Against Each Goal", ""]
        rows = []
        for m in sc["measurables"]:
            tw, lw = m["this_week"], m["last_week"]
            res = tw["result"] if tw else ""
            shown = tw["raw"] if tw and tw["raw"] else "(empty)"
            rows.append((m["title"], m["owner"], m["goal_read_as"] or "(none)", shown,
                         {"MISS": "**MISS**", "BLANK": "**BLANK: owner to fill**", "HIT": "hit"}.get(res, res),
                         (lw["raw"] or "(empty)") if lw else "", f"{m['misses']} of {m['weeks_with_number']}",
                         m["blanks"]))
        L.append(md_table(["Measurable", "Owner", "Goal", sc["latest_week_label"], "Result", "Week before",
                           f"Misses (weeks with a number, last {len(sc['window'])})", "Empty cells"], rows))
        miss = [m for m in sc["measurables"] if m["this_week"] and m["this_week"]["result"] == "MISS"]
        L += ["", f"Missed this week: {len(miss)} of {len(sc['measurables'])} measurables"
                  + (": " + "; ".join(f"{m['title']} ({m['this_week']['raw']} against {m['goal_read_as']})" for m in miss) if miss else ".")]
        L += ["", "### Empty Cells (never filled in; each goes to its owner)", ""]
        if sc["blanks"]:
            L.append(md_table(["Measurable", "Owner", "Week"], [(b["measurable"], b["owner"] or "(no owner in file)", b["week_label"])
                                                                for b in sc["blanks"]]))
        else:
            L.append("None in the weeks counted.")
        if sc["unreadable"]:
            L += ["", "### Cells That Aren't Numbers (shown as written)", ""]
            L.append(md_table(["Measurable", "Owner", "Week", "Cell"], [(u["measurable"], u["owner"], u["week"], u["raw"]) for u in sc["unreadable"]]))
        assumed = [m["title"] for m in sc["measurables"] if m["goal"] and m["goal"].get("assumed")]
        if assumed:
            L += ["", f"Direction ASSUMED (at least) because the file gives none: {', '.join(assumed)}. Confirm each, "
                      "and for any where lower is better, rerun with goals.json."]
    elif sc:
        L += ["", "## Scorecard", "", sc["error"]]
    rk = data.get("rocks")
    if rk and "error" not in rk:
        L += ["", "## Rocks (status exactly as the file gives it)", ""]
        if "completed_on" in rk["columns_used"]:
            L.append(md_table(["Rock", "Owner", "Due", "Status given", "Completed on (file)"],
                              [(r["title"], r.get("owner", ""), r["due_iso"], r["status_given"], r.get("completed_on", ""))
                               for r in rk["items"]]))
        else:
            L.append(md_table(["Rock", "Owner", "Due", "Status given"],
                              [(r["title"], r.get("owner", ""), r["due_iso"], r["status_given"]) for r in rk["items"]]))
        L.append("\nBy status given: " + ", ".join(f"{k} {v}" for k, v in rk["status_counts"].items()) +
                 f" (total {len(rk['items'])}).")
        if not rk["has_status_column"]:
            L.append("The file has no status column: every rock reads 'no status given'.")
    elif rk:
        L += ["", "## Rocks", "", rk["error"]]
    td = data.get("todos")
    if td and "error" not in td:
        g = td["groups"]
        L += ["", "## To-Dos", ""]
        L += [f"Counted: {td['window_words']}.", ""]
        if not td["has_status"]:
            L.append("The file has no status or completed column, so done and not done can't be read.")
        L.append(md_table(["To-do", "Owner", "Due", "State"],
                          [(i["title"], i.get("owner", ""), i["due_iso"], i["state"]) for i in g["counted"]]))
        L.append(f"\nDone {td['done']}, not done {td['not_done']}, no status given {td['no_status']} "
                 f"(total {len(g['counted'])}).")
        L.append(f"Completion rate: {td['arithmetic']}.")
        if td["no_status"]:
            n = td["no_status"]
            L.append(f"{n} to-do{'s' if n > 1 else ''} with no status given {'are' if n > 1 else 'is'} left out of the "
                     "rate, not counted as done or not done.")
        for key, label in (("older_open", "Still open from before this window (carried over)"),
                           ("not_due_yet", "Not due yet (after the meeting date)"),
                           ("no_due_date", "No due date in the file (not in the rate)")):
            if g[key]:
                L += ["", f"{label}: {len(g[key])}", ""]
                L.append(md_table(["To-do", "Owner", "Due", "State"],
                                  [(i["title"], i.get("owner", ""), i["due_iso"], i["state"]) for i in g[key]]))
        if g["older_done"]:
            L.append(f"\nDone before this window (left out): {len(g['older_done'])}.")
    elif td:
        L += ["", "## To-Dos", "", td["error"]]
    iss = data.get("issues")
    if iss and "error" not in iss:
        L += ["", "## Issues List (as in the file, file order)", ""]
        L.append(md_table(["#", "Issue", "Owner", "Added", "Priority in file", "Notes"],
                          [(i["n_in_file"], i["title"], i.get("owner", ""), i["created_iso"], i.get("priority", ""),
                            i.get("notes", "")) for i in iss["short_term"]]))
        if iss["long_term"]:
            L += ["", f"Long-term issues (their own tab or type in the file, kept out of this week's list): {len(iss['long_term'])}", ""]
            L.append(md_table(["Issue", "Owner"], [(i["title"], i.get("owner", "")) for i in iss["long_term"]]))
    elif iss:
        L += ["", "## Issues", "", iss["error"]]
    hl = data.get("headlines")
    if hl:
        L += ["", "## Headlines (as given)", ""]
        for h in hl["items"]:
            extra = ", ".join(x for x in (h.get("kind", ""), h.get("owner", "")) if x)
            L.append(f"- {h['title']}" + (f" ({extra})" if extra else ""))
    L += ["", "## Gaps", ""]
    L += [f"- {g}" for g in data["gaps"]] or ["- None."]
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scorecard")
    ap.add_argument("--rocks")
    ap.add_argument("--todos", action="append", help="repeat for a second file (open and archived exports)")
    ap.add_argument("--issues")
    ap.add_argument("--headlines")
    ap.add_argument("--meeting-date")
    ap.add_argument("--start")
    ap.add_argument("--weeks", type=int, default=13)
    ap.add_argument("--week", help="the week to review, YYYY-MM-DD (the column on or before it)")
    ap.add_argument("--todo-days", type=int, default=7)
    ap.add_argument("--goals")
    ap.add_argument("--out", default=".")
    a = ap.parse_args()
    cfg = json.load(open(a.goals)) if a.goals else {}
    directions = cfg.get("directions", {})
    colmap = cfg.get("columns", {})
    if a.meeting_date:
        meeting, src = date.fromisoformat(a.meeting_date), "from the request"
    else:
        meeting, src = date.today(), "no meeting date given: today's date used"
    data = {"meeting_date": meeting.isoformat(), "meeting_date_source": src, "agenda": agenda_rows(a.start),
            "files_read": [], "gaps": []}
    if a.scorecard:
        pick = date.fromisoformat(a.week) if a.week else None
        sc = read_scorecard(a.scorecard, meeting, colmap.get("scorecard", {}), directions, a.weeks, pick)
        data["scorecard"] = sc
        if "error" not in sc:
            data["files_read"].append(f"Scorecard: {sc['file']}, sheet '{sc['sheet']}', header row {sc['header_row']}, "
                                      f"{sc['layout']} layout, {len(sc['measurables'])} measurables, {sc['week_columns']} "
                                      f"week columns. Columns used: {sc['columns_used']}. Ignored: {sc['ignored_columns'] or 'none'}.")
            if "owner" not in sc["columns_used"]:
                data["gaps"].append("The scorecard has no owner column: empty cells can't be sent to an owner.")
        else:
            data["gaps"].append(sc["error"])
    else:
        data["gaps"].append("No scorecard file.")
    for key, fn, label in (("rocks", read_rocks, "Rocks"), ("issues", read_issues, "Issues"),
                           ("headlines", read_headlines, "Headlines")):
        path = getattr(a, key)
        if not path:
            data["gaps"].append(f"No {label.lower()} file.")
            continue
        r = fn(path, meeting, colmap.get(key, {}))
        data[key] = r
        if "error" in r:
            data["gaps"].append(r["error"])
        else:
            sheets = r["sheets"] if "sheets" in r else [r]
            for s in sheets:
                data["files_read"].append(f"{label}: {s['file']}, sheet '{s['sheet']}', header row {s['header_row']}. "
                                          f"Columns used: {s['columns_used']}.")
    if a.todos:
        td = read_todos(a.todos, meeting, colmap.get("todos", {}), a.todo_days)
        data["todos"] = td
        if "error" in td:
            data["gaps"].append(td["error"])
        else:
            if td["groups"]["counted"] and td["done"] == 0 and "completed_on" in td["columns_used"]:
                data["gaps"].append("No to-do in the window shows a completed date. If the file came from Ninety with "
                                    "Archive off, completed to-dos may be missing: export again with Archive on and "
                                    "attach both files.")
            data["files_read"].append(f"To-dos: {td['file']}, sheet '{td['sheet']}', header row {td['header_row']}. "
                                      f"Columns used: {td['columns_used']}."
                                      + (f" Exact duplicates across files dropped: {td['duplicates_dropped']}."
                                         if td["duplicates_dropped"] else ""))
    else:
        data["gaps"].append("No to-do file.")
    md = report(data)
    os.makedirs(a.out, exist_ok=True)
    open(os.path.join(a.out, "l10_prep_data.md"), "w", encoding="utf-8").write(md)
    json.dump(data, open(os.path.join(a.out, "l10_prep_data.json"), "w", encoding="utf-8"), indent=1, default=str)
    print(md)


if __name__ == "__main__":
    main()
```
