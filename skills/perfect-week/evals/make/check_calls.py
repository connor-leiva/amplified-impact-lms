"""Objective checks for eval case 3: the calendar calls a run made, against the step 8 rules.

Usage:  python3 -I skills/perfect-week/evals/make/check_calls.py evals/runs/3/calls.json

The run writes every connector call it would make as JSON: [{"tool": "create_event" | "update_event" |
"delete_event", "args": {...}}]. This script expands every created series and checks it against the live
calendar in evals/files/case3-calendar-now.ics. Needs python-dateutil.
"""
import json
import os
import re
import sys
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from dateutil.rrule import rrulestr

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(os.path.dirname(HERE))
TZ = "America/Denver"
Z = ZoneInfo(TZ)
ME = "jordan@samplepeak.example"
START, END = date(2026, 11, 9), date(2026, 12, 18)
DAYS_OFF = {date(2026, 11, 26), date(2026, 11, 27)}


def read_ics(path):
    raw = open(path, encoding="utf-8").read().replace("\r\n", "\n")
    lines = []
    for l in raw.split("\n"):
        if l.startswith(" ") and lines:
            lines[-1] += l[1:]
        else:
            lines.append(l)
    evs, cur = [], None
    for l in lines:
        if l == "BEGIN:VEVENT":
            cur = {"ATT": [], "EX": []}
        elif l == "END:VEVENT":
            evs.append(cur)
            cur = None
        elif cur is not None:
            m = re.match(r"^([A-Z-]+)((?:;[^:]*)?):(.*)$", l)
            if not m:
                continue
            k, p, v = m.groups()
            if k == "ATTENDEE":
                cur["ATT"].append((v.replace("mailto:", ""), re.search(r"PARTSTAT=([A-Z-]+)", p).group(1)))
            elif k == "EXDATE":
                cur["EX"].append(v)
            else:
                cur[k] = (p, v)
    return evs


def dt(p, v):
    if "VALUE=DATE" in p:
        return None
    tz = ZoneInfo(re.search(r"TZID=([^;:]+)", p).group(1)) if "TZID=" in p else ZoneInfo("UTC")
    return datetime.strptime(v.rstrip("Z"), "%Y%m%dT%H%M%S").replace(tzinfo=tz)


def busy_intervals(evs):
    """Every instance in the window of an event with other people on it, or organized by someone else."""
    out, overrides = [], {}
    for e in evs:
        if "RECURRENCE-ID" in e:
            overrides[(e["UID"][1], dt(*e["RECURRENCE-ID"]))] = e
    lo = datetime.combine(START, time(0), Z)
    hi = datetime.combine(END, time(23, 59), Z)
    for e in evs:
        if "RECURRENCE-ID" in e:
            continue
        others = [a for a, s in e["ATT"] if a != ME]
        mine = [s for a, s in e["ATT"] if a == ME]
        org = e.get("ORGANIZER", ("", ""))[1].replace("mailto:", "")
        if not others and org == ME:
            continue
        if mine and mine[0] in ("DECLINED", "NEEDS-ACTION"):
            continue
        s, en = dt(*e["DTSTART"]), dt(*e["DTEND"])
        if s is None:
            continue
        if "RRULE" not in e:
            out.append((s, en, e["SUMMARY"][1], e["UID"][1]))
            continue
        ex = {dt(f";TZID={TZ}", v) for v in e["EX"]}
        for o in rrulestr(e["RRULE"][1], dtstart=s).between(lo, hi, inc=True):
            if o in ex:
                continue
            ov = overrides.get((e["UID"][1], o))
            if ov is not None:
                out.append((dt(*ov["DTSTART"]), dt(*ov["DTEND"]), ov["SUMMARY"][1], e["UID"][1]))
            else:
                out.append((o, o + (en - s), e["SUMMARY"][1], e["UID"][1]))
    return out


def expand_create(a):
    s = datetime.fromisoformat(a["startTime"]).replace(tzinfo=ZoneInfo(a["timeZone"]))
    e = datetime.fromisoformat(a["endTime"]).replace(tzinfo=ZoneInfo(a["timeZone"]))
    rec = a.get("recurrenceData") or []
    rr = [r for r in rec if r.startswith("RRULE:")]
    if not rr:
        return [(s, e)]
    ex = set()
    for r in rec:
        if r.startswith("EXDATE"):
            m = re.match(r"EXDATE;TZID=([^:]+):(\d{8}T\d{6})$", r)
            ex.add(datetime.strptime(m.group(2), "%Y%m%dT%H%M%S").replace(tzinfo=ZoneInfo(m.group(1))))
    occ = [o for o in rrulestr(rr[0][6:], dtstart=s) if o not in ex]
    return [(o, o + (e - s)) for o in occ]


def main(path):
    calls = json.load(open(path))
    evs = read_ics(os.path.join(SKILL, "evals", "files", "case3-calendar-now.ics"))
    busy = busy_intervals(evs)
    own_uids = {e["UID"][1] for e in evs if not [a for a, s in e["ATT"] if a != ME] and e.get("ORGANIZER", ("", ""))[1] == f"mailto:{ME}"}
    results = []

    def check(name, ok, detail=""):
        results.append(ok)
        print(("PASS  " if ok else "FAIL  ") + name + (f": {detail}" if detail and not ok else ""))

    check("every call passes notificationLevel NONE", all(c["args"].get("notificationLevel") == "NONE" for c in calls),
          [c for c in calls if c["args"].get("notificationLevel") != "NONE"][:2])
    guest_keys = {"attendees", "attendeeEmails", "addedAttendees", "addedAttendeeEmails"}
    check("no call adds a guest", not any(guest_keys & set(c["args"]) for c in calls))
    check("no Google Meet link", not any(c["args"].get("addGoogleMeetUrl") or c["args"].get("googleMeetUrl") for c in calls))
    touched = [c["args"]["eventId"] for c in calls if c["tool"] in ("update_event", "delete_event", "respond_to_event")]
    check("update, delete and RSVP only on their own solo events", all(t in own_uids for t in touched), touched)
    check("no RSVPs", not any(c["tool"] == "respond_to_event" for c in calls))
    creates = [c["args"] for c in calls if c["tool"] == "create_event"]
    check("every create passes timeZone America/Denver", all(a.get("timeZone") == TZ for a in creates))
    check("no focus time or out of office events", not any(a.get("eventType") in ("FOCUS_TIME", "OUT_OF_OFFICE") for a in creates))
    check("routine blocks have no reminders (useDefaultReminders false)", all(a.get("useDefaultReminders") is False for a in creates))
    rrules = [r for a in creates for r in a.get("recurrenceData", []) if r.startswith("RRULE:")]
    bad_rr = [r for r in rrules if not re.search(r"UNTIL=\d{8}T\d{6}Z|COUNT=\d+", r)]
    check("every RRULE ends with an UNTIL in UTC or a COUNT", not bad_rr, bad_rr[:2])
    exd = [r for a in creates for r in a.get("recurrenceData", []) if r.startswith("EXDATE")]
    check("every EXDATE is EXDATE;TZID=Area/City:YYYYMMDDTHHMMSS", all(re.match(r"EXDATE;TZID=[A-Za-z_]+/[A-Za-z_]+:\d{8}T\d{6}$", r) for r in exd))
    holds = [a for a in creates if a["summary"].startswith("Hold:")]
    check("holds are titled Hold: and say no invite went out", all("no invite" in a["description"].lower() for a in holds))
    check("every description carries the closing tag", all("Solo block: no guests, no invites." in a.get("description", "") for a in creates))
    occ, unreadable = [], []
    for a in creates:
        try:
            occ += [(s, e, a["summary"]) for (s, e) in expand_create(a)]
        except ValueError as err:
            unreadable.append((a["summary"], str(err)))
    check("every repeat rule can be expanded", not unreadable, unreadable[:2])
    bad_window = [(s.isoformat(), t) for s, e, t in occ if s.date() < START or s.date() > END]
    check("every occurrence is between Nov 9 and Dec 18", not bad_window, bad_window[:3])
    on_off = [(s.isoformat(), t) for s, e, t in occ if s.date() in DAYS_OFF]
    check("nothing on the days off (Nov 26 and 27)", not on_off, on_off[:3])
    weekend = [(s.isoformat(), t) for s, e, t in occ if s.weekday() >= 5]
    check("nothing on a weekend", not weekend, weekend[:3])
    def hours_ok(s, e):
        stop = time(15, 30) if s.weekday() == 3 else time(17, 0)
        return s.timetz().replace(tzinfo=None) >= time(8, 0) and e.timetz().replace(tzinfo=None) <= stop
    outside = [(s.isoformat(), t) for s, e, t in occ if not hours_ok(s.astimezone(Z), e.astimezone(Z))]
    check("everything inside working hours (8:00 to 5:00, Thu to 3:30)", not outside, outside[:3])
    clash = [(s.isoformat(), t, b[2]) for s, e, t in occ for b in busy if s < b[1] and b[0] < e]
    check("nothing overlaps a meeting with other people", not clash, clash[:3])
    print(f"\n{len(calls)} calls, {len(creates)} creates, {len(occ)} created occurrences; {sum(results)} of {len(results)} checks pass")
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
