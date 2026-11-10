# The Date and Count Code

Last verified: 2026-11-10 (the code runs on Python 3.8 or later, standard library only)

Every days-remaining number, every counted period, the order check, the weekday of each date, the due-this-week list and the checklist counts come from this code, never from mental math. Write the file JSON (the shape is in the code's header and in `references/audit-rules.md`, section 3), save the code below as `/tmp/tc_dates.py`, and run it. It prints the report and writes `tc_dates.md` and `tc_dates.json`.

```
python3 -c "import re,sys;t=open(sys.argv[1]).read();open('/tmp/tc_dates.py','w').write(re.search(r'\x60{3}python\n(.*)\n\x60{3}',t,re.S).group(1))" SKILL_FOLDER/references/deadline-code.md
python3 /tmp/tc_dates.py /tmp/tc/file.json --out OUTPUT_FOLDER
```

What it does and doesn't do:
- Days remaining = the date minus the as-of date, in calendar days, printed with its arithmetic. Negative means the date has passed.
- Timing labels: passed, today, inside 3 days (1 to 3), this week (4 to 6), later. Both windows can be changed in the JSON ("soon_days", "week_days").
- A counted period is the event's date plus the number of calendar days (counting starts the day after the event, so Acceptance on the 27th plus 4 is the 31st).
- The order check lists every deadline that falls before one the contract lists above it, or before Acceptance, and any proposed change that would be out of order. It never says which date is right.
- It prints each date's weekday and lists deadlines that fall on a Saturday or Sunday. It doesn't know holidays.
- It never decides a checklist result (the audit does, by the rules) and never moves a date.

```python
"""TC File Audit: the date math and the checklist counts, from one JSON file the audit writes.

    python3 /tmp/tc_dates.py /tmp/tc/file.json --out OUTPUT_FOLDER

Prints the report and writes tc_dates.md and tc_dates.json to OUTPUT_FOLDER. Every value in the JSON is
read from the uploads or the user's message; nothing is typed from memory. Dates are YYYY-MM-DD.

{
  "as_of": "2026-11-10",                  the user's date; otherwise today's (say which in What I Used)
  "soon_days": 3,                         optional: "inside N days" (default 3)
  "week_days": 7,                         optional: "this week" is as_of through as_of + 6 (default 7)
  "form": "Utah REPC, footer EFFECTIVE DECEMBER 4, 2024",           optional, printed as given
  "acceptance": {"date": "2026-10-27", "source": "..."},           optional
  "deadlines": [                          the contract's deadlines, in the contract's own order
    {"name": "Due Diligence Deadline", "ref": "24(b)", "date": "2026-11-12",
     "source": "where the date in effect is written",
     "was": [{"date": "2026-11-09", "source": "REPC 24(b)"}],       dates a fully signed change replaced
     "proposed": [{"date": "2026-12-11", "source": "Addendum No. 2", "status": "signed by buyers only"}]}
  ],
  "counted": [                            periods the contract counts in calendar days from an event
    {"name": "Earnest Money delivery", "from": "2026-10-27", "from_label": "Acceptance", "days": 4,
     "source": "REPC page 1"}
  ],
  "dated": [                              other dates in the notes or documents (appointments, promises)
    {"name": "Appraisal appointment", "date": "2026-11-13", "source": "TC notes, 11/4"}
  ],
  "items": [                              one per item on the brokerage's checklist
    {"item": "Earnest money receipt", "result": "missing", "found": "Earnest Money Receipt (row 11)",
     "status": "Not Uploaded", "signed": "", "due": "Earnest Money delivery", "why": ""}
  ],
  "extra": ["Radon Test Results (row 12)"]   in the file, not on the checklist
}

"result" is one of: in file, missing, incomplete, unclear, not applicable.
"due" is a deadline's or counted period's name, a date (YYYY-MM-DD), or "" when the checklist gives none.
The code never decides a result, never moves a date and never reads a contract: it counts days.
"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path

RESULTS = ["missing", "incomplete", "unclear", "in file", "not applicable"]


def day(s, what):
    try:
        return dt.date.fromisoformat(str(s).strip())
    except ValueError:
        sys.exit(f"Not a YYYY-MM-DD date for {what}: {s!r}")


def long(d):
    return f"{d.strftime('%A')}, {d.strftime('%B')} {d.day}, {d.year}"


def timing(n, soon, week):
    if n < 0:
        return f"passed {-n} day{'s' if n != -1 else ''} ago"
    if n == 0:
        return "today"
    if n <= soon:
        return f"inside {soon} days"
    if n <= week - 1:
        return "this week"
    return "later"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--out", default=".")
    a = ap.parse_args()
    data = json.loads(Path(a.file).read_text(encoding="utf-8"))
    as_of = day(data["as_of"], "as_of")
    soon = int(data.get("soon_days", 3))
    week = int(data.get("week_days", 7))
    week_end = as_of + dt.timedelta(days=week - 1)
    out, rep = [], {"as_of": as_of.isoformat(), "week_end": week_end.isoformat()}

    def row(name, d, source):
        n = (d - as_of).days
        return {"name": name, "date": d.isoformat(), "weekday": d.strftime("%A"), "long": long(d),
                "days": n, "math": f"{d.isoformat()} - {as_of.isoformat()} = {n}",
                "timing": timing(n, soon, week), "source": source}

    out.append("# TC File Audit: Dates and Counts")
    out.append("")
    out.append(f"As of: {long(as_of)} ({as_of.isoformat()}). This week: {as_of.isoformat()} to {week_end.isoformat()}. "
               f"Inside {soon} days: {(as_of + dt.timedelta(days=1)).isoformat()} to {(as_of + dt.timedelta(days=soon)).isoformat()}.")
    if data.get("form"):
        out.append(f"Form: {data['form']}")
    acc = None
    if data.get("acceptance"):
        acc = day(data["acceptance"]["date"], "acceptance")
        out.append(f"Acceptance: {long(acc)} ({acc.isoformat()}), {data['acceptance'].get('source', '')}")
    out.append("")

    # Deadlines.
    dl, named = [], {}
    out.append("## Deadline Calendar")
    out.append("")
    out.append("| Deadline | Ref | Date | Days remaining | Arithmetic | Timing | Source | Replaced |")
    out.append("|---|---|---|---|---|---|---|---|")
    for x in data.get("deadlines", []):
        d = day(x["date"], x["name"])
        r = row(x["name"], d, x.get("source", ""))
        r["ref"] = x.get("ref", "")
        r["was"] = [{"date": day(w["date"], x["name"]).isoformat(), "source": w.get("source", "")} for w in x.get("was", [])]
        r["proposed"] = []
        for p in x.get("proposed", []):
            pd = day(p["date"], x["name"])
            pr = row(x["name"], pd, p.get("source", ""))
            pr["status"] = p.get("status", "")
            r["proposed"].append(pr)
        dl.append(r)
        named[x["name"]] = d
        was = "; ".join(f"{w['date']} ({w['source']})" for w in r["was"]) or ""
        out.append(f"| {r['name']} | {r['ref']} | {r['long']} | {r['days']} | {r['math']} | {r['timing']} | {r['source']} | {was} |")
    rep["deadlines"] = dl
    props = [(r, p) for r in dl for p in r["proposed"]]
    if props:
        out.append("")
        out.append("Proposed changes, not in effect per the documents shown (the date in the table stands):")
        for r, p in props:
            out.append(f"- {r['name']}: proposed {p['long']} ({p['math']}), {p['source']}, {p['status']}")
    out.append("")

    # Odd dates: a deadline earlier than one listed above it, or earlier than Acceptance.
    odd = []
    for i, r in enumerate(dl):
        for prev in dl[:i]:
            if r["date"] < prev["date"]:
                odd.append(f"{r['name']} ({r['date']}) is before {prev['name']} ({prev['date']}), which the contract lists above it")
        if acc and day(r["date"], r["name"]) < acc:
            odd.append(f"{r['name']} ({r['date']}) is before Acceptance ({acc.isoformat()})")
        for p in r["proposed"]:
            for other in dl:
                if other is r:
                    continue
                j, k = dl.index(other), dl.index(r)
                if (j < k and p["date"] < other["date"]) or (j > k and p["date"] > other["date"]):
                    odd.append(f"Proposed {r['name']} ({p['date']}) would be out of order with {other['name']} ({other['date']})")
    rep["odd"] = odd
    out.append("Order check: " + ("every deadline is on or after the ones listed above it." if not odd else "ODD DATE"))
    for o in odd:
        out.append(f"- ODD DATE: {o}")
    weekend = [r for r in dl if r["weekday"] in ("Saturday", "Sunday")]
    rep["weekend"] = [r["name"] for r in weekend]
    for r in weekend:
        out.append(f"- Falls on a {r['weekday']}: {r['name']} ({r['date']})")
    out.append("")

    # Counted periods.
    cnt = []
    if data.get("counted"):
        out.append("## Counted Periods (calendar days, counted from the day after the event)")
        out.append("")
        for x in data["counted"]:
            start = day(x["from"], x["name"])
            due = start + dt.timedelta(days=int(x["days"]))
            r = row(x["name"], due, x.get("source", ""))
            r["from"], r["from_label"], r["count"] = start.isoformat(), x.get("from_label", ""), int(x["days"])
            r["count_math"] = f"{start.isoformat()} + {int(x['days'])} = {due.isoformat()}"
            cnt.append(r)
            named[x["name"]] = due
            out.append(f"- {r['name']}: {r['count_math']} ({x.get('from_label', '')} + {x['days']} calendar days), "
                       f"{r['long']}; days remaining {r['math']} ({r['timing']}). Source: {r['source']}")
            if r["weekday"] in ("Saturday", "Sunday"):
                out.append(f"  - Falls on a {r['weekday']}.")
        out.append("")
    rep["counted"] = cnt

    dated = [row(x["name"], day(x["date"], x["name"]), x.get("source", "")) for x in data.get("dated", [])]
    rep["dated"] = dated

    # Checklist cross.
    items = []
    for x in data.get("items", []):
        res = str(x.get("result", "")).strip().lower()
        if res not in RESULTS:
            sys.exit(f"Item {x.get('item')!r}: result must be one of {RESULTS}, not {res!r}")
        r = dict(x, result=res)
        due = str(x.get("due", "") or "").strip()
        if due:
            d = named.get(due)
            if d is None:
                d = day(due, x.get("item", "item"))
            t = row(x["item"], d, x.get("source", ""))
            r.update(due_date=t["date"], due_long=t["long"], days=t["days"], math=t["math"], timing=t["timing"])
        else:
            r.update(due_date="", due_long="no date on the checklist", days=None, math="", timing="no date")
        items.append(r)
    rep["items"] = items
    counts = {k: sum(1 for i in items if i["result"] == k) for k in RESULTS}
    rep["counts"] = counts
    if items:
        out.append("## Checklist Cross")
        out.append("")
        out.append(f"{len(items)} checklist items: " + ", ".join(f"{counts[k]} {k}" for k in RESULTS) + ".")
        out.append("")
        opened = [i for i in items if i["result"] in ("missing", "incomplete", "unclear")]
        opened.sort(key=lambda i: (i["due_date"] == "", i["due_date"]))
        if opened:
            out.append("| Item | Result | In the file as | Status | Signed | Due | Days remaining | Timing |")
            out.append("|---|---|---|---|---|---|---|---|")
            for i in opened:
                days = "" if i["days"] is None else f"{i['days']} ({i['math']})"
                out.append(f"| {i['item']} | {i['result']} | {i.get('found') or 'not in the file'} | {i.get('status', '')} | "
                           f"{i.get('signed', '')} | {i['due_long']} | {days} | {i['timing']} |")
            out.append("")
        later = [i for i in opened if i["days"] is not None and i["days"] > week - 1]
        if later:
            out.append("Not in the file yet, due after this week: " + "; ".join(
                f"{i['item']} ({i['due_date']}, {i['days']} days)" for i in later))
            out.append("")
        if data.get("extra"):
            out.append("In the file, not on the checklist: " + "; ".join(data["extra"]))
            out.append("")

    # This week, and past due.
    week_rows = []
    for r in dl:
        week_rows.append(("Deadline", r))
    for r in cnt:
        week_rows.append(("Counted period", r))
    for r in dated:
        week_rows.append(("Date in the notes", r))
    for i in items:
        if i["result"] in ("missing", "incomplete", "unclear") and i["days"] is not None:
            week_rows.append((f"Checklist item ({i['result']})", {"name": i["item"], "date": i["due_date"],
                              "long": i["due_long"], "days": i["days"], "math": i["math"], "source": i.get("found") or "not in the file"}))
    this_week = sorted([w for w in week_rows if 0 <= w[1]["days"] <= week - 1], key=lambda w: w[1]["date"])
    past = sorted([w for w in week_rows if w[1]["days"] < 0 and w[0].startswith("Checklist")], key=lambda w: w[1]["date"])
    nodate = [i for i in items if i["result"] in ("missing", "incomplete", "unclear") and i["days"] is None]
    rep["this_week"] = [dict(kind=k, **{x: v for x, v in r.items() if x in ("name", "date", "long", "days", "math", "source")}) for k, r in this_week]
    rep["past_due_open"] = [dict(kind=k, **{x: v for x, v in r.items() if x in ("name", "date", "long", "days", "math", "source")}) for k, r in past]
    out.append(f"## Due This Week ({as_of.isoformat()} to {week_end.isoformat()})")
    out.append("")
    if not this_week:
        out.append("- Nothing dated this week.")
    for k, r in this_week:
        out.append(f"- {r['long']} ({r['days']} day{'' if r['days'] == 1 else 's'}, {r['math']}): {r['name']} [{k}]. {r['source']}")
    out.append("")
    if past:
        out.append("## Past Due and Still Open")
        out.append("")
        for k, r in past:
            out.append(f"- {r['name']} [{k}]: due {r['long']}, {r['math']} ({timing(r['days'], soon, week)})")
        out.append("")
    if nodate:
        out.append("## Still Open, No Date on the Checklist")
        out.append("")
        for i in nodate:
            out.append(f"- {i['item']} [checklist item ({i['result']})]")
        out.append("")
    rep["open_no_date"] = [i["item"] for i in nodate]

    text = "\n".join(out)
    print(text)
    o = Path(a.out)
    o.mkdir(parents=True, exist_ok=True)
    (o / "tc_dates.md").write_text(text + "\n", encoding="utf-8")
    (o / "tc_dates.json").write_text(json.dumps(rep, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
```
