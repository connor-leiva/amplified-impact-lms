"""Write the made-up practice files and eval input files for perfect-week.

Run from anywhere:  python3 -I skills/perfect-week/evals/make/make_files.py

Everything here is fictional: people, teams, brokerages, addresses and email domains (.example).
Output is deterministic, so a rerun changes nothing.

Writes:
  practice/perfect-week-practice-calendar.ics   two weeks of a team leader's Google Calendar export
  practice/perfect-week-practice-tasks.csv      the same person's ClickUp task export
  evals/files/case1-calendar.ics, case1-tasks.csv   copies of the practice files (case 1)
  evals/files/case2-calendar.ics, case2-tasks.csv   an overloaded listing agent (Todoist export)
"""

import csv
import io
import os
import shutil
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.dirname(os.path.dirname(HERE))
PRACTICE = os.path.join(SKILL, "practice")
FILES = os.path.join(SKILL, "evals", "files")
BANNER = "PRACTICE FILE: made-up example"
STAMP = "20261108T150000Z"


# --- iCalendar helpers ---------------------------------------------------------------------------

def esc(text):
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line):
    """Fold a content line at 75 octets, as RFC 5545 asks."""
    data = line.encode("utf-8")
    if len(data) <= 75:
        return line
    out, cur = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        limit = 75 if not out else 74
        if len(cur) + len(b) > limit:
            out.append(cur.decode("utf-8"))
            cur = b""
        cur += b
    out.append(cur.decode("utf-8"))
    return "\r\n ".join(out)


US_RULES = {
    # Standard US daylight saving rules (second Sunday in March, first Sunday in November).
    "America/Denver": ("-0700", "-0600", "MST", "MDT"),
    "America/Chicago": ("-0600", "-0500", "CST", "CDT"),
    "America/New_York": ("-0500", "-0400", "EST", "EDT"),
}


def vtimezone(tz):
    std, dst, sname, dname = US_RULES[tz]
    return [
        "BEGIN:VTIMEZONE",
        f"TZID:{tz}",
        f"X-LIC-LOCATION:{tz}",
        "BEGIN:DAYLIGHT",
        f"TZOFFSETFROM:{std}",
        f"TZOFFSETTO:{dst}",
        f"TZNAME:{dname}",
        "DTSTART:19700308T020000",
        "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
        "END:DAYLIGHT",
        "BEGIN:STANDARD",
        f"TZOFFSETFROM:{dst}",
        f"TZOFFSETTO:{std}",
        f"TZNAME:{sname}",
        "DTSTART:19701101T020000",
        "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
        "END:STANDARD",
        "END:VTIMEZONE",
    ]


def person(name, email, partstat="ACCEPTED", role="REQ-PARTICIPANT"):
    return (f"ATTENDEE;CUTYPE=INDIVIDUAL;ROLE={role};PARTSTAT={partstat};CN={name};"
            f"X-NUM-GUESTS=0:mailto:{email}")


def event(tz, uid, summary, start, end, organizer, attendees=(), rrule=None, exdates=(),
          recurrence_id=None, description="", location="", transp="OPAQUE", all_day=False,
          status="CONFIRMED", created="20261001T160000Z"):
    lines = ["BEGIN:VEVENT"]
    if all_day:
        lines.append(f"DTSTART;VALUE=DATE:{start}")
        lines.append(f"DTEND;VALUE=DATE:{end}")
    else:
        lines.append(f"DTSTART;TZID={tz}:{start}")
        lines.append(f"DTEND;TZID={tz}:{end}")
    if rrule:
        lines.append(f"RRULE:{rrule}")
    for d in exdates:
        lines.append(f"EXDATE;TZID={tz}:{d}")
    if recurrence_id:
        lines.append(f"RECURRENCE-ID;TZID={tz}:{recurrence_id}")
    lines.append(f"DTSTAMP:{STAMP}")
    lines.append(f"ORGANIZER;CN={organizer[0]}:mailto:{organizer[1]}")
    lines.append(f"UID:{uid}")
    lines.extend(attendees)
    lines.append(f"CREATED:{created}")
    lines.append(f"DESCRIPTION:{esc(description)}")
    lines.append(f"LAST-MODIFIED:{created}")
    lines.append(f"LOCATION:{esc(location)}")
    lines.append("SEQUENCE:0")
    lines.append(f"STATUS:{status}")
    lines.append(f"SUMMARY:{esc(summary)}")
    lines.append(f"TRANSP:{transp}")
    lines.append("END:VEVENT")
    return lines


def calendar(name, tz, events):
    lines = [
        "BEGIN:VCALENDAR",
        f"X-WR-CALDESC:{BANNER}. Every person\\, team\\, address and email here is made up.",
        "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
        "VERSION:2.0",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{name}",
        f"X-WR-TIMEZONE:{tz}",
    ]
    lines += vtimezone(tz)
    for e in events:
        lines += e
    lines.append("END:VCALENDAR")
    return "\r\n".join(fold(l) for l in lines) + "\r\n"


# --- Practice: Jordan Sampleton, team leader, Mountain time ---------------------------------------

def practice_calendar():
    tz = "America/Denver"
    me = ("Jordan Sampleton", "jordan@samplepeak.example")
    jordan = person(*me)
    morgan = ("Morgan Placeholder", "morgan@samplepeak.example")
    agents = [("Riley Testwell", "riley@samplepeak.example"), ("Avery Mockridge", "avery@samplepeak.example"),
              ("Casey Demoson", "casey@samplepeak.example"), ("Drew Fakely", "drew@samplepeak.example"),
              ("Quinn Notreal", "quinn@samplepeak.example")]
    team = [person(*morgan)] + [person(*a) for a in agents]
    tatum = ("Tatum Filewell", "tatum@samplepeak.example")
    pat = ("Pat Exampleton", "pat@samplepeak.example")
    blair = ("Blair Brokerton", "blair@fictionalsummit.example")
    ev = []
    ev.append(event(tz, "pw-huddle@practice.example", "Team Huddle", "20260907T090000", "20260907T093000", me,
                    [jordan] + team, rrule="FREQ=WEEKLY;BYDAY=MO",
                    description="Weekly numbers and wins. 30 minutes. PRACTICE FILE: made-up example."))
    ev.append(event(tz, "pw-teammtg@practice.example", "Team Meeting + Training", "20260908T093000", "20260908T110000", me,
                    [jordan] + team, rrule="FREQ=WEEKLY;BYDAY=TU",
                    description="Pipeline review then one training topic.", location="Sample Peak office, conference room"))
    ev.append(event(tz, "pw-riley-1on1@practice.example", "1:1 Riley Testwell", "20260910T100000", "20260910T103000", me,
                    [jordan, person(*agents[0])], rrule="FREQ=WEEKLY;INTERVAL=2;BYDAY=TH"))
    ev.append(event(tz, "pw-avery-1on1@practice.example", "1:1 Avery Mockridge", "20260917T100000", "20260917T103000", me,
                    [jordan, person(*agents[1])], rrule="FREQ=WEEKLY;INTERVAL=2;BYDAY=TH",
                    exdates=["20261126T100000"]))
    ev.append(event(tz, "pw-casey-coaching@practice.example", "Casey / Jordan coaching", "20260916T150000", "20260916T153000",
                    agents[2], [person(*agents[2]), jordan], rrule="FREQ=WEEKLY;INTERVAL=2;BYDAY=WE",
                    description="Casey's standing coaching call. Casey sets the agenda."))
    ev.append(event(tz, "pw-ops-sync@practice.example", "Ops sync w/ Morgan", "20260911T083000", "20260911T090000", me,
                    [jordan, person(*morgan)], rrule="FREQ=WEEKLY;BYDAY=FR"))
    ev.append(event(tz, "pw-ops-sync@practice.example", "Ops sync w/ Morgan (moved earlier)", "20261120T080000", "20261120T083000", me,
                    [jordan, person(*morgan)], recurrence_id="20261120T083000",
                    description="Moved to 8:00 this week only."))
    ev.append(event(tz, "pw-broker-hours@practice.example", "Broker office hours (Fictional Summit Realty)", "20260902T110000",
                    "20260902T120000", blair, [person(*blair), jordan, person("Other Team Leaders", "teamleaders@fictionalsummit.example")],
                    rrule="FREQ=MONTHLY;BYDAY=1WE", description="Monthly open questions with the managing broker."))
    ev.append(event(tz, "pw-owner-review@practice.example", "Monthly P&L + Pipeline Review w/ Pat", "20260918T110000",
                    "20260918T120000", pat, [person(*pat), jordan], rrule="FREQ=MONTHLY;BYDAY=3FR",
                    description="Owner review: P&L, pipeline, recruiting, team health."))
    ev.append(event(tz, "pw-focus@practice.example", "Focus time", "20260909T130000", "20260909T143000", me,
                    rrule="FREQ=WEEKLY;BYDAY=WE"))
    ev.append(event(tz, "pw-recruit-block@practice.example", "TIMEBLOCK: Recruiting calls", "20260910T130000", "20260910T140000", me,
                    rrule="FREQ=WEEKLY;BYDAY=TH", description="Calls to agents on the recruit list."))
    ev.append(event(tz, "pw-gym@practice.example", "Gym", "20260907T060000", "20260907T070000", me,
                    rrule="FREQ=WEEKLY;BYDAY=MO,WE,FR"))
    # One-offs, Mon Nov 9 to Sun Nov 22
    ev.append(event(tz, "pw-la-45sample@practice.example", "Listing appointment: 45 Sample Street (Maplewoods)",
                    "20261109T140000", "20261109T150000", me,
                    [jordan, person("Sam Maplewood", "sam.maplewood@mail.example")], location="45 Sample Street"))
    ev.append(event(tz, "pw-la-9example@practice.example", "Listing appointment: 9 Example Court", "20261110T173000",
                    "20261110T183000", me, location="9 Example Court",
                    description="Sellers asked for after work. Bring CMA and listing packet."))
    ev.append(event(tz, "pw-happyhour@practice.example", "Brokerage happy hour", "20261111T160000", "20261111T170000",
                    ("Fictional Summit Events", "events@fictionalsummit.example"),
                    [person("Fictional Summit Events", "events@fictionalsummit.example"), person(*me, partstat="DECLINED")]))
    ev.append(event(tz, "pw-lunchlearn@practice.example", "Lunch & Learn: 2027 Loan Programs (Placeholder Home Loans)",
                    "20261112T120000", "20261112T130000", ("Placeholder Home Loans", "events@placeholderloans.example"),
                    [person(*me, partstat="NEEDS-ACTION")], location="Online"))
    ev.append(event(tz, "pw-dd-210testwood@practice.example", "Due Diligence Deadline: 210 Testwood Drive", "20261113",
                    "20261114", tatum, [person(*tatum), jordan, person(*agents[3])], all_day=True, transp="TRANSPARENT",
                    description="Posted by Transactions. Confirm against the signed contract."))
    ev.append(event(tz, "pw-coffee-kit@practice.example", "Coffee: Kit Prospectson (recruit)", "20261116T090000",
                    "20261116T094500", me, [jordan, person("Kit Prospectson", "kit@otherbrokerage.example")],
                    location="Example Beans Cafe"))
    ev.append(event(tz, "pw-dentist@practice.example", "Dentist", "20261117T130000", "20261117T140000", me))
    ev.append(event(tz, "pw-friendsgiving@practice.example", "Friendsgiving potluck", "20261118T120000", "20261118T133000", morgan,
                    [person(*me, partstat="NEEDS-ACTION")], location="Sample Peak office",
                    description="Bring a dish! Whole team invited."))
    ev.append(event(tz, "pw-closing-77@practice.example", "Closing: 77 Placeholder Avenue", "20261119T140000", "20261119T153000",
                    ("Mock Title Co. Closer", "closer@mocktitle.example"),
                    [person("Mock Title Co. Closer", "closer@mocktitle.example"), jordan, person(*agents[1])],
                    location="Mock Title Co., Suite 100"))
    ev.append(event(tz, "pw-settle-210testwood@practice.example", "Settlement Deadline: 210 Testwood Drive", "20261120",
                    "20261121", tatum, [person(*tatum), jordan, person(*agents[3])], all_day=True, transp="TRANSPARENT",
                    description="Posted by Transactions. Confirm against the signed contract."))
    ev.append(event(tz, "pw-openhouse-45sample@practice.example", "Open house: 45 Sample Street", "20261121T110000",
                    "20261121T130000", me, location="45 Sample Street",
                    description="Lockbox code 0000 (practice). Signs in the garage."))
    return calendar("jordan@samplepeak.example", tz, ev)


def ms(dt_local):
    return str(int(dt_local.timestamp() * 1000))


def clickup_date_text(dt):
    day = dt.day
    suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    off = dt.strftime("%z")
    return f"{dt.strftime('%A, %B')} {day}{suffix} {dt.year}, {dt.strftime('%I:%M:%S %p').lstrip('0').lower()} {off[:3]}:{off[3:]}"


def est_text(minutes):
    if not minutes:
        return ""
    h, m = divmod(minutes, 60)
    return " ".join(p for p in [f"{h}h" if h else "", f"{m}m" if m else ""] if p)


def practice_tasks():
    tz = ZoneInfo("America/Denver")
    # (id, name, content, status, created, due, parent, assignees, tags, priority, list, folder, minutes)
    J, M = "Jordan Sampleton", "Morgan Placeholder"
    rows = [
        ("86b1p01", "Finalize 2027 team business plan (draft for Pat)", "Goals, team structure, lead sources. Pat wants a draft before the year-end review.", "in progress", "2026-10-12", "2026-12-11", "", [J], ["planning"], "high", "Leadership", "Team", 360),
        ("86b1p02", "Pull 2026 production numbers for the plan", "Export from Sisu dashboard.", "to do", "2026-10-12", "2026-11-20", "86b1p01", [J], [], "normal", "Leadership", "Team", 60),
        ("86b1p03", "Draft 2027 goals and team structure", "", "to do", "2026-10-12", "2026-12-04", "86b1p01", [J], [], "high", "Leadership", "Team", 180),
        ("86b1p04", "Review business plan draft with Pat", "", "to do", "2026-10-12", "2026-12-11", "86b1p01", [J], [], "normal", "Leadership", "Team", 60),
        ("86b1p05", "2027 team budget: agent marketing allowance", "", "to do", "2026-10-20", "2026-12-18", "", [J], ["planning"], "normal", "Leadership", "Team", 180),
        ("86b1p06", "Agent onboarding playbook: rewrite first 30 days", "New agents keep asking the same questions. Rewrite the first 30 days.", "in progress", "2026-10-05", "2026-12-18", "", [J], ["onboarding"], "high", "Leadership", "Team", 480),
        ("86b1p07", "Outline the first 30 days", "", "to do", "2026-10-05", "2026-11-20", "86b1p06", [J], [], "normal", "Leadership", "Team", 120),
        ("86b1p08", "Write week 1 and week 2 checklists", "", "to do", "2026-10-05", "2026-12-04", "86b1p06", [J], [], "normal", "Leadership", "Team", 180),
        ("86b1p09", "Record CRM setup walkthrough video", "", "to do", "2026-10-05", "2026-12-11", "86b1p06", [J], [], "normal", "Leadership", "Team", 120),
        ("86b1p10", "Review playbook draft with Morgan", "", "to do", "2026-10-05", "2026-12-18", "86b1p06", [J], [], "normal", "Leadership", "Team", 60),
        ("86b1p11", "Quarterly goal check-ins with all 5 agents", "One per agent before year end.", "to do", "2026-10-01", "2026-12-18", "", [J], ["coaching"], "normal", "Leadership", "Team", 0),
        ("86b1p12", "Plan year-end team party and awards", "", "to do", "2026-10-28", "2026-12-04", "", [J], ["culture"], "low", "Leadership", "Team", 120),
        ("86b1r01", "Recruiting: 10 coffees with target agents this quarter", "Pat's target is 5 hours a week on recruiting.", "in progress", "2026-10-01", "2026-12-18", "", [J], ["recruiting"], "high", "Recruiting", "Growth", 600),
        ("86b1r02", "Follow up with Kit Prospectson after coffee", "", "to do", "2026-11-02", "2026-11-17", "", [J], ["recruiting"], "normal", "Recruiting", "Growth", 30),
        ("86b1r03", "Update recruiting tracker spreadsheet", "", "to do", "2026-10-20", "2026-11-13", "", [J], ["recruiting"], "low", "Recruiting", "Growth", 60),
        ("86b1l01", "Listing presentation refresh (new market stats slides)", "", "to do", "2026-10-15", "2026-12-04", "", [J], ["listings"], "normal", "My Listings", "Production", 240),
        ("86b1l02", "Prep CMA and listing packet: 9 Example Court", "Appointment is Tuesday 5:30.", "to do", "2026-11-04", "2026-11-10", "", [J], ["listings"], "urgent", "My Listings", "Production", 90),
        ("86b1l03", "Prep listing packet: 45 Sample Street", "", "to do", "2026-11-04", "2026-11-09", "", [J], ["listings"], "urgent", "My Listings", "Production", 60),
        ("86b1l04", "Listing description and photo shot list: 45 Sample Street", "", "to do", "2026-11-04", "2026-11-13", "", [J], ["listings"], "normal", "My Listings", "Production", 60),
        ("86b1l05", "Open house prep: 45 Sample Street", "Signs, sign-in sheet, flyers.", "to do", "2026-11-04", "2026-11-20", "", [J], ["listings"], "normal", "My Listings", "Production", 60),
        ("86b1o01", "Review October team P&L with Morgan", "", "to do", "2026-10-30", "2026-11-06", "", [J], ["finance"], "high", "Operations", "Team", 60),
        ("86b1o02", "Submit October expense receipts to bookkeeper", "", "to do", "2026-10-30", "2026-11-03", "", [J], ["finance"], "normal", "Operations", "Team", 45),
        ("86b1o03", "Renew Follow Up Boss seats before renewal date", "", "to do", "2026-10-30", "2026-11-30", "", [J], ["tech"], "normal", "Operations", "Team", 30),
        ("86b1t01", "Update under-contract dates in transaction tracker: 210 Testwood Drive", "", "to do", "2026-11-02", "2026-11-10", "", [J], ["transactions"], "normal", "Transactions", "Production", 30),
        ("86b1t02", "Compliance file review: 77 Placeholder Avenue", "", "to do", "2026-11-02", "2026-11-18", "", [J], ["transactions"], "normal", "Transactions", "Production", 60),
        ("86b1m01", "Record 2 market update videos", "", "to do", "2026-10-25", "2026-11-25", "", [J], ["marketing"], "normal", "Marketing", "Growth", 120),
        ("86b1m02", "Holiday client gift list and order", "Pick the list, then order.", "to do", "2026-10-25", "2026-12-04", "", [J], ["marketing"], "normal", "Marketing", "Growth", 120),
        ("86b1m03", "Year-end past-client email", "", "to do", "2026-10-25", "2026-12-15", "", [J], ["marketing"], "normal", "Marketing", "Growth", 60),
        ("86b1m04", "Rewrite team website bio", "", "to do", "2026-09-15", "", "", [J], ["marketing"], "low", "Marketing", "Growth", 60),
        ("86b1x01", "Order open house signs", "", "to do", "2026-11-04", "2026-11-18", "", [M], ["listings"], "normal", "My Listings", "Production", 30),
        ("86b1x02", "Schedule photos: 45 Sample Street", "", "to do", "2026-11-04", "2026-11-11", "", [M], ["listings"], "normal", "My Listings", "Production", 15),
        ("86b1x03", "Submit September expense receipts to bookkeeper", "", "complete", "2026-09-28", "2026-10-03", "", [J], ["finance"], "normal", "Operations", "Team", 45),
    ]
    header = ["Task ID", "Task Name", "Task Content", "Status", "Date Created", "Date Created Text", "Due Date",
              "Due Date Text", "Start Date", "Start Date Text", "Parent ID", "Assignees", "Tags", "Priority",
              "List Name", "Folder Name", "Space Name", "Time Estimated", "Time Estimated Text"]
    buf = io.StringIO()
    buf.write(BANNER + "\r\n")
    w = csv.writer(buf, lineterminator="\r\n")
    w.writerow(header)
    for (tid, name, content, status, created, due, parent, assignees, tags, prio, lst, folder, minutes) in rows:
        c = datetime.fromisoformat(created + "T09:00:00").replace(tzinfo=tz)
        if due:
            d = datetime.fromisoformat(due + "T17:00:00").replace(tzinfo=tz)
            due_ms, due_txt = ms(d), clickup_date_text(d)
        else:
            due_ms, due_txt = "", ""
        w.writerow([tid, name, content, status, ms(c), clickup_date_text(c), due_ms, due_txt, "", "", parent,
                    "[" + ",".join(assignees) + "]", "[" + ",".join(tags) + "]", prio, lst, folder,
                    "Sample Peak Home Team", str(minutes * 60000) if minutes else "", est_text(minutes)])
    return buf.getvalue()


# --- Case 2: Taylor Mockridge, listing agent, works in Eastern, calendar still in Central ---------

def case2_calendar():
    tz = "America/Chicago"
    me = ("Taylor Mockridge", "taylor@exampleridge.example")
    taylor = person(*me)
    jamie = ("Jamie Leaderson", "jamie@exampleridge.example")
    team = [person(*jamie), person("Ridge Team", "team@exampleridge.example")]
    tc = ("Toni Transactor", "toni@exampleridge.example")
    ev = []
    ev.append(event(tz, "c2-teammtg@case2.example", "Team meeting", "20260908T090000", "20260908T103000", jamie,
                    [taylor] + team, rrule="FREQ=WEEKLY;BYDAY=TU"))
    ev.append(event(tz, "c2-1on1@case2.example", "1:1 Jamie / Taylor", "20260910T080000", "20260910T083000", jamie,
                    [person(*jamie), taylor], rrule="FREQ=WEEKLY;BYDAY=TH"))
    ev.append(event(tz, "c2-training@case2.example", "Sales training webinar (Example Ridge Realty)", "20260909T110000",
                    "20260909T120000", ("Example Ridge Training", "training@exampleridge.example"),
                    [person("Example Ridge Training", "training@exampleridge.example"), taylor, person("All Agents", "agents@exampleridge.example")],
                    rrule="FREQ=WEEKLY;BYDAY=WE"))
    ev.append(event(tz, "c2-coaching@case2.example", "Coaching: U10 practice", "20260908T170000", "20260908T183000", me,
                    rrule="FREQ=WEEKLY;BYDAY=TU,TH"))
    ev.append(event(tz, "c2-la-5ridge@case2.example", "Listing appointment: 18 Mockingbird Example Way", "20261109T163000",
                    "20261109T173000", me, [taylor, person("Lee Hollowtest", "lee.hollowtest@mail.example")],
                    location="18 Mockingbird Example Way"))
    ev.append(event(tz, "c2-inspection@case2.example", "Inspection: 41 Fiction Avenue", "20261112T130000", "20261112T150000",
                    ("Placeholder Inspections", "inspector@placeholderinspect.example"),
                    [person("Placeholder Inspections", "inspector@placeholderinspect.example"), taylor],
                    location="41 Fiction Avenue"))
    ev.append(event(tz, "c2-ce@case2.example", "CE class: Contracts update (live online)", "20261113T090000", "20261113T120000",
                    ("Example CE School", "classes@examplece.example"),
                    [person("Example CE School", "classes@examplece.example"), taylor], location="Online"))
    ev.append(event(tz, "c2-showings@case2.example", "Showings: Brightwater buyers (3 homes)", "20261114T090000",
                    "20261114T120000", me))
    ev.append(event(tz, "c2-dd@case2.example", "Due Diligence Deadline: 41 Fiction Avenue", "20261116", "20261117", tc,
                    [person(*tc), taylor], all_day=True, transp="TRANSPARENT"))
    ev.append(event(tz, "c2-la-2@case2.example", "Listing appointment: 7 Sampleview Terrace", "20261118T150000",
                    "20261118T160000", me, location="7 Sampleview Terrace"))
    ev.append(event(tz, "c2-closing@case2.example", "Closing: 41 Fiction Avenue", "20261120T130000", "20261120T140000",
                    ("Fictional Title Group", "closer@fictionaltitle.example"),
                    [person("Fictional Title Group", "closer@fictionaltitle.example"), taylor], location="Fictional Title Group"))
    ev.append(event(tz, "c2-settle@case2.example", "Settlement Deadline: 41 Fiction Avenue", "20261120", "20261121", tc,
                    [person(*tc), taylor], all_day=True, transp="TRANSPARENT"))
    return calendar("taylor@exampleridge.example", tz, ev)


def case2_tasks():
    me, jamie = "Taylor (48210001)", "Jamie (48210002)"
    header = ["TYPE", "CONTENT", "DESCRIPTION", "PRIORITY", "INDENT", "AUTHOR", "RESPONSIBLE", "DATE", "DATE_LANG",
              "TIMEZONE", "DURATION", "DURATION_UNIT", "DEADLINE", "DEADLINE_LANG"]
    rows = []

    def sec(name):
        rows.append(["section", name, "", "", "", "", "", "", "", "", "", "None", "", ""])

    def task(content, date, minutes, desc="", who=me, prio="4"):
        rows.append(["task", content, desc, prio, "1", me, who, date, "en" if date else "", "US/Central",
                     str(minutes) if minutes else "", "minute" if minutes else "None", "", ""])

    sec("Listings")
    task("Launch 3 Testwood Lane: MLS input, description, photo review", "Nov 12 2026", 240, prio="1")
    task("CMA for 18 Mockingbird Example Way listing appointment", "Nov 9 2026", 120, prio="1")
    task("Price reduction conversation prep: 5 Sample Ridge Road", "Nov 10 2026", 90, prio="2")
    task("Weekly seller update emails (4 listings)", "every friday", 60)
    task("Rebuild listing presentation", "Nov 19 2026", 480, prio="3")
    task("Listing videos for 3 Testwood Lane", "Nov 16 2026", 180, prio="2")
    sec("Buyers")
    task("Prep tour sheet for Brightwater buyers", "Nov 13 2026", 60, prio="2")
    task("Offer strategy notes for the Pinewood buyers", "Nov 10 2026", 90, prio="1")
    task("Buyer consult follow-ups (3)", "Nov 11 2026", 90)
    sec("Prospecting")
    task("Prospecting calls: 25 past clients", "every weekday", 60, prio="1")
    task("Write and send November market update email", "Nov 18 2026", 120)
    sec("Marketing")
    task("Write 8 neighborhood blog posts for website", "Nov 20 2026", 960)
    task("Film 4 Instagram reels", "Nov 19 2026", 240)
    task("Plan client appreciation pie pickup", "Nov 20 2026", 300)
    sec("Admin")
    task("CE: finish 6 remaining online hours", "Nov 30 2026", 360, desc="License renewal. Online course, self-paced.")
    task("Database cleanup: tag 400 contacts", "Nov 20 2026", 600)
    task("Expense tracking catch-up (September and October)", "Nov 2 2026", 180, prio="2")
    task("Update CRM notes from last week's showings", "Nov 9 2026", 60)
    rows.append(["note", "Jamie said the CRM notes matter for lead audits.", "", "", "", me, "", "", "", "", "", "None", "", ""])
    task("Approve team holiday card proof", "Nov 13 2026", 15, who=jamie)
    sec("Transactions")
    task("Track Due Diligence and Settlement deadlines for 41 Fiction Avenue in my own spreadsheet", "Nov 20 2026", 60)
    buf = io.StringIO()
    buf.write(BANNER + "\r\n")
    w = csv.writer(buf, lineterminator="\r\n")
    w.writerow(header)
    w.writerows(rows)
    return buf.getvalue()


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


def main():
    os.makedirs(FILES, exist_ok=True)
    write(os.path.join(PRACTICE, "perfect-week-practice-calendar.ics"), practice_calendar())
    write(os.path.join(PRACTICE, "perfect-week-practice-tasks.csv"), practice_tasks())
    shutil.copyfile(os.path.join(PRACTICE, "perfect-week-practice-calendar.ics"), os.path.join(FILES, "case1-calendar.ics"))
    shutil.copyfile(os.path.join(PRACTICE, "perfect-week-practice-tasks.csv"), os.path.join(FILES, "case1-tasks.csv"))
    write(os.path.join(FILES, "case2-calendar.ics"), case2_calendar())
    write(os.path.join(FILES, "case2-tasks.csv"), case2_tasks())
    print("wrote practice/ and evals/files/")


if __name__ == "__main__":
    main()
