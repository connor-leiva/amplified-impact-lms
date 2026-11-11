# Dates Code

Last verified: 2026-11-11. The federal holiday rules this code follows (5 U.S.C. 6103, and OPM for the observed weekday) are in `compliance-defaults.md`, with their sources.

Run this code with Python 3 on the plan's steps. It uses only Python's standard library. Write plan.json at /tmp/plan.json as the code's header shows. Do not paste the code into the conversation.

Usage:

    python3 plan_dates.py --plan plan.json --out OUTPUT_FOLDER

It prints the dated plan and writes plan_dates.md (the steps by week, every move and why, the holidays and closed days in the window, any problem) and plan_dates.json (the same, for drafting) to OUTPUT_FOLDER.

What it does: counts each step's Day from the start date (Day 1 is the start date); moves a step that lands on a day the team doesn't onboard, a closed day or a federal holiday (the day itself or the weekday it is observed) to the next open day, or a step due by a day back to the open day before it; keeps calls and voicemails off Sundays and holidays whatever the onboarding days; lists each weekly meeting on its dates and marks any that falls on a closed day; groups the steps into four weeks by date; and lists every move, the holidays and closed days in the window, and any problem (a start date that isn't an onboarding day, a step with no day). It never adds, drops or rewords a step.

```python
#!/usr/bin/env python3
# New Agent Onboarding Plan (Amplified Impact). Python 3 standard library only.
#
# Dates ONE new agent's onboarding plan. It reads plan.json, written from the team's onboarding setup and the
# leader's message, counts every Day number from the start date (Day 1 is the start date), and moves any step
# that lands on a day the team doesn't onboard (a day outside its workdays, a closed date it names, or a federal
# legal holiday, on the day itself or the weekday it is observed) to the next open day. A step due BY a day moves
# back to the open day before it instead, so it is never late. Calls and voicemails never land on a Sunday or a
# legal holiday, whatever the workdays (a conservative default). It only dates what plan.json holds: it never
# adds a step, an owner or a day. Writes to --out:
#   plan_dates.md    the dated steps by week, every move and why, the holidays in the window, problems
#   plan_dates.json  the same, for drafting
#
# The Day column is the team's Day number; the Date is when it happens after any move. Steps are grouped into
# weeks by their date, so a Day 7 step moved off a Sunday is listed in Week 2 with its move.
#
# Usage:
#   python3 plan_dates.py --plan plan.json --out OUTPUT_FOLDER
#
# plan.json:
#   {"agent": "First Last",
#    "start": "2026-12-07",                         Day 1, from the leader's message
#    "length": 30,                                  days in the plan (30 unless the setup says otherwise)
#    "workdays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
#    "workdays_source": "where the setup says so, or: House default, not your team's",
#    "closed": [{"date": "2026-12-24", "why": "Office closed (Agent Handbook, p. 3)"}],
#    "steps": [{"id": "1.1", "day": 1, "when": "on", "kind": "step", "what": "Welcome meeting",
#               "owner": "Rosalind Puddingstone (Team Leader)", "status": "ready",
#               "source": "New Agent Checklist, row 2"}]}
#   kind:   "step", "checkpoint", "calls" (any step with phone calls or voicemails), or "recurring" (a meeting
#           held every week on "weekday", such as "Tue": listed on each date in the plan, never moved; a date
#           that falls on a closed day or holiday is marked to confirm with its owner)
#   when:   "on" (it happens that day) or "by" (it is due by that day)
#   status: "ready", "held" (license not confirmed, a conflict, a broker review), or "placeholder"
#   day:    a whole number from 1. A step past the plan's length goes under After the Plan, undated.
#
# State and local holidays are not in this code: list them in "closed" when the setup names them.

import argparse
import datetime as dt
import json
import os
import sys

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
          "November", "December"]


def long_date(d):
    return f"{LONG[d.weekday()]}, {MONTHS[d.month - 1]} {d.day}, {d.year}"


def short_date(d):
    return f"{DAYS[d.weekday()]} {MONTHS[d.month - 1][:3]} {d.day}"


def nth_weekday(year, month, weekday, n):
    d = dt.date(year, month, 1)
    d += dt.timedelta(days=(weekday - d.weekday()) % 7)
    return d + dt.timedelta(weeks=n - 1)


def last_weekday(year, month, weekday):
    d = dt.date(year + (month == 12), month % 12 + 1, 1) - dt.timedelta(days=1)
    return d - dt.timedelta(days=(d.weekday() - weekday) % 7)


def federal_holidays(year):
    """5 U.S.C. 6103(a), each on its own date and on the weekday it is observed (Saturday: the Friday before;
    Sunday: the Monday after, as OPM applies it)."""
    named = [
        (dt.date(year, 1, 1), "New Year's Day"),
        (nth_weekday(year, 1, 0, 3), "Birthday of Martin Luther King, Jr."),
        (nth_weekday(year, 2, 0, 3), "Washington's Birthday"),
        (last_weekday(year, 5, 0), "Memorial Day"),
        (dt.date(year, 6, 19), "Juneteenth National Independence Day"),
        (dt.date(year, 7, 4), "Independence Day"),
        (nth_weekday(year, 9, 0, 1), "Labor Day"),
        (nth_weekday(year, 10, 0, 2), "Columbus Day"),
        (dt.date(year, 11, 11), "Veterans Day"),
        (nth_weekday(year, 11, 3, 4), "Thanksgiving Day"),
        (dt.date(year, 12, 25), "Christmas Day"),
    ]
    out = {}
    for d, name in named:
        out[d] = name
        if d.weekday() == 5:
            out.setdefault(d - dt.timedelta(days=1), f"{name} (observed)")
        elif d.weekday() == 6:
            out.setdefault(d + dt.timedelta(days=1), f"{name} (observed)")
    return out


def fail(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--out", default=".")
    args = ap.parse_args()

    with open(args.plan, encoding="utf-8") as f:
        plan = json.load(f)
    try:
        start = dt.date.fromisoformat(str(plan["start"]))
    except (KeyError, ValueError):
        fail('plan.json needs "start" as YYYY-MM-DD. With no start date, give the plan in Day numbers and do not run this.')
    length = int(plan.get("length", 30))
    workdays = plan.get("workdays") or []
    if not workdays or any(w not in DAYS for w in workdays):
        fail('plan.json needs "workdays", such as ["Mon", "Tue", "Wed", "Thu", "Fri"].')
    closed = {}
    for c in plan.get("closed", []):
        closed[dt.date.fromisoformat(c["date"])] = c.get("why", "Closed (your setup)")

    holidays = {}
    for y in range(start.year - 1, start.year + 3):
        holidays.update(federal_holidays(y))

    def blocked(d, kind):
        """Why a day is not open for this kind of step, or None when it is open."""
        if d in holidays:
            return f"{holidays[d]}, a federal legal holiday"
        if d in closed:
            return closed[d]
        if kind == "calls" and d.weekday() == 6:
            return "Sunday (no calls or voicemails on a Sunday, a conservative default)"
        if DAYS[d.weekday()] not in workdays:
            return f"{LONG[d.weekday()]}, not an onboarding day"
        return None

    def day_of(d):
        return (d - start).days + 1

    problems = []
    if blocked(start, "step"):
        problems.append(f"Day 1, {long_date(start)}, is not an open day ({blocked(start, 'step')}). Confirm the start date.")

    rows, after = [], []
    seen = set()
    for s in plan.get("steps", []):
        sid = str(s.get("id", ""))
        if sid in seen:
            problems.append(f"Step {sid} appears twice in plan.json.")
        seen.add(sid)
        if s.get("kind") == "recurring":
            wd = s.get("weekday")
            if wd not in DAYS:
                problems.append(f"Recurring step {sid} needs a weekday such as \"Tue\" ({wd!r}); it is left out.")
                continue
            for n in range(length):
                d = start + dt.timedelta(days=n)
                if DAYS[d.weekday()] != wd:
                    continue
                why = blocked(d, "step")
                rows.append({
                    **s, "id": f"{sid}.{n + 1}", "day": n + 1, "when": "on", "nominal": d.isoformat(),
                    "nominal_long": long_date(d), "date": d.isoformat(), "date_long": long_date(d),
                    "scheduled_day": n + 1, "moved": False, "moved_from": [], "past_plan": False,
                    "not_held": why,
                })
            continue
        day = s.get("day")
        if not isinstance(day, int) or day < 1:
            problems.append(f"Step {sid} has no whole-number day ({day!r}); it is left undated.")
            after.append({**s, "date": None})
            continue
        if day > length:
            after.append({**s, "date": None})
            continue
        kind = s.get("kind", "step")
        when = s.get("when", "on")
        nominal = start + dt.timedelta(days=day - 1)
        d, moves = nominal, []
        if when == "by":
            while blocked(d, kind) and d > start:
                moves.append(f"{short_date(d)}: {blocked(d, kind)}")
                d -= dt.timedelta(days=1)
            if blocked(d, kind):
                problems.append(f"Step {sid} is due by Day {day} and no open day comes before it; kept on {short_date(nominal)}.")
                d, moves = nominal, []
        else:
            while blocked(d, kind):
                moves.append(f"{short_date(d)}: {blocked(d, kind)}")
                d += dt.timedelta(days=1)
        rows.append({
            **s,
            "kind": kind,
            "when": when,
            "nominal": nominal.isoformat(),
            "nominal_long": long_date(nominal),
            "date": d.isoformat(),
            "date_long": long_date(d),
            "scheduled_day": day_of(d),
            "moved": bool(moves),
            "moved_from": moves,
            "past_plan": day_of(d) > length,
        })

    rows.sort(key=lambda r: (r["date"], r["day"], str(r.get("id", ""))))
    end = start + dt.timedelta(days=length - 1)
    last = max([end] + [dt.date.fromisoformat(r["date"]) for r in rows])
    weeks = []
    bounds = [(1, 7), (8, 14), (15, 21), (22, max(length, day_of(last)))]
    for n, (a, b) in enumerate(bounds, 1):
        ws, we = start + dt.timedelta(days=a - 1), start + dt.timedelta(days=b - 1)
        weeks.append({
            "week": n,
            "label": f"Week {n} (Days {a} to {b}): {long_date(ws)} to {long_date(we)}",
            "steps": [r for r in rows if a <= r["scheduled_day"] <= b],
        })
    in_window = sorted((d, n) for d, n in holidays.items() if start <= d <= last)
    closed_in = sorted((d, w) for d, w in closed.items() if start <= d <= last)

    data = {
        "agent": plan.get("agent", ""),
        "start": start.isoformat(),
        "start_long": long_date(start),
        "length": length,
        "day_last": end.isoformat(),
        "day_last_long": long_date(end),
        "day_last_open": blocked(end, "step") is None,
        "workdays": workdays,
        "workdays_source": plan.get("workdays_source", ""),
        "weeks": weeks,
        "after_plan": after,
        "moved": [r for r in rows if r["moved"]],
        "recurring_not_held": [r for r in rows if r.get("not_held")],
        "holidays_in_window": [{"date": d.isoformat(), "date_long": long_date(d), "name": n} for d, n in in_window],
        "closed_in_window": [{"date": d.isoformat(), "date_long": long_date(d), "why": w} for d, w in closed_in],
        "problems": problems,
        "note": "Federal legal holidays only (5 U.S.C. 6103). State and local holidays were not checked.",
    }

    md = [f"# Plan Dates: {data['agent'] or '[New Agent]'}", ""]
    md.append(f"- Day 1: {data['start_long']}")
    md.append(f"- Day {length}: {data['day_last_long']}" + ("" if data["day_last_open"] else f" ({blocked(end, 'step')})"))
    md.append(f"- Onboarding days: {', '.join(workdays)} ({data['workdays_source'] or 'source not given'})")
    md.append(f"- {data['note']}")
    md.append("")
    if problems:
        md += ["## Problems", ""] + [f"- {p}" for p in problems] + [""]
    for w in weeks:
        md += [f"## {w['label']}", ""]
        if not w["steps"]:
            md += ["No steps.", ""]
            continue
        md += ["| Date | Day | Step | What | Owner | Status | Source | Note |", "|---|---|---|---|---|---|---|---|"]
        for r in w["steps"]:
            note = []
            if r["moved"]:
                note.append(f"Day {r['day']} ({r['nominal_long']}) moved: " + "; ".join(r["moved_from"]))
            if r["when"] == "by":
                note.append("due by")
            if r["past_plan"]:
                note.append(f"past Day {length}")
            if r.get("not_held"):
                note.append(f"recurring; {r['not_held']}: confirm with the owner whether it meets")
            elif r.get("kind") == "recurring":
                note.append("recurring")
            md.append("| " + " | ".join([
                r["date_long"], str(r["day"]), str(r.get("id", "")), str(r.get("what", "")),
                str(r.get("owner", "")), str(r.get("status", "")), str(r.get("source", "")), "; ".join(note),
            ]) + " |")
        md.append("")
    if after:
        md += ["## After the Plan (undated)", ""] + [f"- Day {s.get('day')}: {s.get('what', '')} ({s.get('source', '')})" for s in after] + [""]
    md += ["## Moves", ""]
    md += [f"- Step {r['id']}: Day {r['day']}, {r['nominal_long']} to {r['date_long']}. Why: " + "; ".join(r["moved_from"]) for r in data["moved"]] or ["- None."]
    md += ["", "## Holidays and Closed Days in the Window", ""]
    shut = sorted([(h["date"], h["date_long"], h["name"]) for h in data["holidays_in_window"]]
                  + [(c["date"], c["date_long"], c["why"]) for c in data["closed_in_window"]])
    md += [f"- {long}: {why}" for _, long, why in shut]
    if not shut:
        md.append("- None.")
    md.append("")

    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "plan_dates.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    with open(os.path.join(args.out, "plan_dates.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print("\n".join(md))


if __name__ == "__main__":
    main()
```
