"""Writes the practice files and the eval input files for l10-meeting-prep. Every team, person, street and
company in them is made up.

python3 -I skills/l10-meeting-prep/evals/make/make_files.py

Deterministic: a fixed seed for the older weeks, then the planted values (each case's latest week, its empty
cells, its rocks, to-dos, issues and headlines) written by hand below, so a rerun writes the same files.
"""
import csv
import random
import re
import zipfile
from datetime import date, timedelta
from pathlib import Path

import openpyxl

SKILL = Path(__file__).resolve().parents[2]
TAG = "PRACTICE FILE: made-up example"


def history(rng, goal, direction, n, spread):
    """n made-up weekly values around a goal, about one week in four on the wrong side of it."""
    out = []
    for _ in range(n):
        good = rng.random() > 0.27
        delta = max(1, round(goal * spread * rng.random()))
        if direction in ("at least",):
            v = goal + delta if good else goal - delta
        else:
            v = goal - delta if good else goal + delta
        out.append(max(0, v))
    return out


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([TAG])
        w.writerows(rows)


def write_xlsx(path, sheets):
    path.parent.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    for name, rows in sheets:
        ws = wb.create_sheet(name)
        ws.append([TAG])
        for r in rows:
            ws.append(r)
    wb.save(path)
    # Same bytes on every run: fixed document dates and fixed timestamps inside the ZIP.
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


def write_text(path, lines):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(TAG + "\n\n" + "\n".join(lines) + "\n", encoding="utf-8")


# --- practice: Butterbean & Bramble Home Team, a Ninety-style set, meeting Tuesday 2026-11-17 9:00 AM ---------

def practice():
    rng = random.Random(1017)
    out = SKILL / "practice"
    weeks = [date(2026, 8, 17) + timedelta(weeks=i) for i in range(13)]  # Mondays, Aug 17 to Nov 9
    current = date(2026, 11, 16)  # this week, not entered yet
    ms = [  # title, owner, goal text, goal, direction, spread, latest week
        ("Leads Added", "Wren Tumbletop", ">= 60", 60, "at least", 0.25, "64"),
        ("Speed to Lead (Minutes)", "Wren Tumbletop", "<= 5", 5, "at most", 0.6, "7"),
        ("Conversations", "Basil Thistlewaite", ">= 150", 150, "at least", 0.2, "131"),
        ("Appointments Set", "Wren Tumbletop", ">= 12", 12, "at least", 0.3, "12"),
        ("Appointments Met", "Basil Thistlewaite", ">= 9", 9, "at least", 0.3, "7"),
        ("Buyer Agreements Signed", "Basil Thistlewaite", ">= 4", 4, "at least", 0.5, "4"),
        ("Listing Agreements Signed", "Clementine Quillfeather", ">= 2", 2, "at least", 0.6, "1"),
        ("New Pendings", "Otis Puddlecomb", ">= 3", 3, "at least", 0.6, "3"),
        ("Closings", "Otis Puddlecomb", ">= 2", 2, "at least", 0.6, "2"),
        ("Database Touches", "Hazel Snickerdoodle", ">= 200", 200, "at least", 0.2, ""),
    ]
    blanks = {("Appointments Met", date(2026, 10, 12)), ("Speed to Lead (Minutes)", date(2026, 9, 21))}
    cols = [current] + list(reversed(weeks))  # Ninety puts the newest period on the left
    label = lambda d: f"{d:%m/%d/%Y} - {(d + timedelta(days=6)):%m/%d/%Y}"
    rows = [["KPI Group", "Status", "Title", "Description", "Owner", "Goal", "Average", "Total"] + [label(d) for d in cols]]
    for title, owner, gtext, goal, direction, spread, latest in ms:
        vals = history(rng, goal, direction, 12, spread) + [None]
        cells = {}
        for d, v in zip(weeks, vals):
            cells[d] = "" if (title, d) in blanks else (str(v) if v is not None else "")
        cells[weeks[-1]] = latest
        cells[current] = ""
        nums = [float(cells[d]) for d in weeks if cells[d] != ""]
        avg = f"{sum(nums) / len(nums):.1f}"
        total = f"{sum(nums):.0f}"
        rows.append(["Weekly", "Active", title, "", owner, gtext, avg, total] + [cells[d] for d in cols])
    write_csv(out / "PRACTICE Scorecard Export 13 Weeks.csv", rows)

    write_csv(out / "PRACTICE Rocks Q4 2026.csv", [
        ["Owner", "Title", "Description", "Due Date", "Status", "Level"],
        ["Hazel Snickerdoodle", "Launch the Past Client Event Calendar", "", "12/31/2026", "On Track", "Company"],
        ["Marigold Fiddlesworth", "Hire and Onboard a Second ISA", "", "12/31/2026", "Off Track", "Company"],
        ["Clementine Quillfeather", "Get the Listing Presentation Under 45 Minutes", "", "12/31/2026", "On Track", "Team"],
        ["Otis Puddlecomb", "Move Every Transaction Into One Checklist", "", "12/31/2026", "Done", "Team"],
        ["Basil Thistlewaite", "Rebuild the Buyer Consult Script", "", "12/31/2026", "", "Team"],
        ["Wren Tumbletop", "Clean Up the CRM Stages", "", "12/31/2026", "On Track", "Team"],
    ])

    write_csv(out / "PRACTICE To-Dos.csv", [
        ["Title", "Owner", "Due Date", "Status", "Created"],
        ["Send the Gingersnap Court sellers their showing feedback summary", "Clementine Quillfeather", "11/17/2026", "Complete", "11/10/2026"],
        ["Post the second ISA job listing on two more sites", "Marigold Fiddlesworth", "11/17/2026", "Incomplete", "11/10/2026"],
        ["Book the January past client event venue", "Hazel Snickerdoodle", "11/17/2026", "Complete", "11/10/2026"],
        ["Add the weekend lead coverage schedule to the shared calendar", "Wren Tumbletop", "11/16/2026", "Complete", "11/10/2026"],
        ["Record the new buyer consult opener for the team", "Basil Thistlewaite", "11/17/2026", "Incomplete", "11/10/2026"],
        ["Get two quotes for the printer lease", "Otis Puddlecomb", "11/17/2026", "Complete", "11/10/2026"],
        ["Merge the duplicate stages in the CRM", "Wren Tumbletop", "11/17/2026", "Complete", "11/10/2026"],
        ["Draft the listing presentation outline", "Clementine Quillfeather", "11/13/2026", "Complete", "11/10/2026"],
        ["Call the photographer about faster turnaround", "Clementine Quillfeather", "11/17/2026", "Incomplete", "11/10/2026"],
        ["Send the lender partner the co-marketing rules", "Marigold Fiddlesworth", "11/17/2026", "Complete", "11/10/2026"],
        ["Update the transaction checklist for new construction", "Otis Puddlecomb", "11/06/2026", "Incomplete", "10/30/2026"],
        ["Order holiday cards for past clients", "Hazel Snickerdoodle", "11/24/2026", "Incomplete", "11/10/2026"],
    ])

    head = ["Owner", "Title", "Description", "Type", "Priority", "Team", "Who", "Attachment Names", "Completed Date",
            "Link", "Created Date", "Archived Date"]
    team = "Butterbean & Bramble Leadership Team"
    issue = lambda owner, title, desc, created: [owner, title, desc, "", "", team, owner, "", "", "", created, ""]
    write_xlsx(out / "PRACTICE Issues List.xlsx", [
        ("Short-Term Issues", [head,
            issue("Wren Tumbletop", "Speed to lead slipping on weekend portal leads",
                  "Saturday and Sunday leads wait 20 minutes or more. Nobody is assigned weekends.", "10/26/2026"),
            issue("Clementine Quillfeather", "Seller on Gingersnap Court wants out of the listing agreement",
                  "Unhappy with showing feedback. Asked to cancel by Friday 11/20.", "11/12/2026"),
            issue("Marigold Fiddlesworth", "Second ISA hire: two candidates declined",
                  "Both took salaried roles elsewhere.", "11/03/2026"),
            issue("Basil Thistlewaite", "Buyer agents not logging appointments met in the CRM",
                  "Appointments Met may read low because some aren't logged.", "11/05/2026"),
            issue("Otis Puddlecomb", "Office printer lease renewal", "Two quotes in, no decision yet.", "10/14/2026"),
            issue("Hazel Snickerdoodle", "Pick a date for team photo day", "", "11/09/2026"),
            issue("Marigold Fiddlesworth", "Lender partner wants to co-host an open house",
                  "Need to check the co-marketing rules first.", "10/30/2026"),
            issue("Clementine Quillfeather", "Listing photos taking five days to come back",
                  "Two launches pushed a week this month.", "11/10/2026"),
        ]),
        ("Long-Term Issues", [head,
            issue("Marigold Fiddlesworth", "Open a second office in Hollyhock Springs?", "", "09/15/2026"),
            issue("Marigold Fiddlesworth", "Team split structure for 2027", "", "10/01/2026"),
        ]),
    ])

    write_text(out / "PRACTICE Headlines.txt", [
        "Customer Headlines",
        "- The Fizzwick buyers closed on Pumpernickel Lane on Friday and sent the team a thank-you video. (Basil)",
        "- Past client Dot Quibble referred a neighbor; a listing appointment is set for Thursday. (Hazel)",
        "",
        "Employee Headlines",
        "- Wren hit one year with the team on Monday. (Marigold)",
        "- Otis finished his transaction coordinator certification. (Otis)",
    ])


# --- case 1: Pickleberry Point Realty Group, a spreadsheet scorecard plus Ninety-style XLSX, meeting 2026-11-18 ----

def case1():
    rng = random.Random(1118)
    out = SKILL / "evals" / "files" / "case1"
    weeks = [date(2026, 8, 17) + timedelta(weeks=i) for i in range(13)]  # Mondays, oldest first
    ms = [
        ("New Leads", "Fennel Quackenbush", "80+", 80, "at least", 0.2, "86"),
        ("Speed to Lead (Minutes)", "Fennel Quackenbush", "5", 5, "at most", 0.6, "9"),
        ("Appointments Set", "Juniper Wobblesby", "14+", 14, "at least", 0.25, "11"),
        ("Appointments Met", "Juniper Wobblesby", "10+", 10, "at least", 0.25, "8"),
        ("Buyer Agreements Signed", "Rosemary Pinwhistle", "4+", 4, "at least", 0.5, "5"),
        ("Listings Taken", "Barnaby Crumpet", "3+", 3, "at least", 0.6, "3"),
        ("Under Contract (Units)", "Barnaby Crumpet", "4+", 4, "at least", 0.5, "2"),
        ("Closed Units", "Tansy Fernwhistle", "3+", 3, "at least", 0.6, "4"),
        ("Past Client Calls", "Tansy Fernwhistle", "25+", 25, "at least", 0.3, "25"),
    ]
    blanks = {("Past Client Calls", date(2026, 9, 28))}
    rows = [["Measurable", "Owner", "Goal"] + [f"{d.month}/{d.day}/{d.year}" for d in weeks]]
    for title, owner, gtext, goal, direction, spread, latest in ms:
        vals = history(rng, goal, direction, 12, spread)
        cells = ["" if (title, d) in blanks else v for d, v in zip(weeks, vals)] + [int(latest)]
        rows.append([title, owner, gtext] + cells)
    write_xlsx(out / "Pickleberry Point Weekly Scorecard.xlsx", [("Scorecard", rows)])

    rock_head = ["Owner", "Title", "Description", "Due Date", "Status", "Level", "Team", "Attachment Names",
                 "Completed On (Date)", "Link", "Created Date", "Archived Date"]
    rock = lambda owner, title, status, level, done="": [owner, title, "", "12/31/2026", status, level, "Leadership",
                                                         "", done, "", "10/01/2026", ""]
    ms_head = ["Owner", "Title", "Description", "Associated Rock's Name", "Due Date", "Completed On (Date)", "Link"]
    write_xlsx(out / "Ninety Rocks Export.xlsx", [
        ("Rocks", [rock_head,
            rock("Juniper Wobblesby", "Hire a Full-Time ISA", "Off-Track", "Company"),
            rock("Barnaby Crumpet", "Launch the Seller Pre-Listing Packet", "On-Track", "Company"),
            rock("Rosemary Pinwhistle", "Every Buyer on a Signed Agreement Before Touring", "On-Track", "Team"),
            rock("Tansy Fernwhistle", "Move TC Checklists Into the New System", "Done", "Team", "11/06/2026"),
            rock("Fennel Quackenbush", "Build the Q1 2027 Lead Budget", "On-Track", "Team"),
            rock("Tansy Fernwhistle", "Start the Past Client Quarterly Pop-By", "Off-Track", "Team"),
        ]),
        ("Milestones", [ms_head,
            ["Juniper Wobblesby", "Post the job", "", "Hire a Full-Time ISA", "10/15/2026", "10/14/2026", ""],
            ["Juniper Wobblesby", "Hold three interviews", "", "Hire a Full-Time ISA", "11/15/2026", "", ""],
            ["Barnaby Crumpet", "Draft the packet", "", "Launch the Seller Pre-Listing Packet", "11/01/2026", "10/30/2026", ""],
            ["Tansy Fernwhistle", "Pick the first gift", "", "Start the Past Client Quarterly Pop-By", "10/30/2026", "", ""],
        ]),
    ])

    todo_head = ["Owner", "Title", "Description", "Due Date", "Repeating Cadence", "Team", "Attachments", "Completed On",
                 "Link", "Create Date", "Archive Date"]
    todo = lambda owner, title, due, done, created="11/11/2026": [owner, title, "", due, "", "Leadership", "", done, "",
                                                                  created, ""]
    write_xlsx(out / "Ninety To-Dos Export.xlsx", [
        ("To-Dos", [todo_head,
            todo("Rosemary Pinwhistle", "Call the Larkspur Loop listing agent about the inspection response", "11/18/2026", "11/16/2026"),
            todo("Juniper Wobblesby", "Post the ISA job on two more boards", "11/18/2026", ""),
            todo("Barnaby Crumpet", "Send the pre-listing packet draft to Pippin", "11/18/2026", "11/13/2026"),
            todo("Fennel Quackenbush", "Pull October lead source numbers", "11/18/2026", "11/17/2026"),
            todo("Tansy Fernwhistle", "Order the first pop-by gifts", "11/18/2026", ""),
            todo("Rosemary Pinwhistle", "Update the buyer agreement checklist", "11/17/2026", "11/17/2026"),
            todo("Fennel Quackenbush", "Set up a weekend lead coverage test", "11/18/2026", "11/14/2026"),
            todo("Barnaby Crumpet", "Collect showing feedback for the two active listings", "11/16/2026", "11/16/2026"),
            todo("Tansy Fernwhistle", "Book the holiday party venue", "11/18/2026", "11/12/2026"),
            todo("Juniper Wobblesby", "Send the Peachfuzz Leads renewal terms to Pippin", "11/18/2026", "11/17/2026"),
            todo("Barnaby Crumpet", "Review the two fallen pendings with the agents", "11/18/2026", "11/18/2026"),
            todo("Tansy Fernwhistle", "Train Juniper on the new TC system", "11/04/2026", "", "10/28/2026"),
            todo("Tansy Fernwhistle", "Renew the team E&O policy", "11/05/2026", "11/05/2026", "10/28/2026"),
            todo("Fennel Quackenbush", "Draft the Q1 2027 lead budget", "11/25/2026", ""),
        ]),
    ])

    write_csv(out / "Issues List.csv", [
        ["Title", "Owner", "Created", "Description", "Type"],
        ["Larkspur Loop buyer deal: inspection response due Thursday 11/19", "Rosemary Pinwhistle", "11/16/2026",
         "Seller's agent hasn't answered our repair request. Deadline is Thursday 11/19 at 5 PM.", "Short-Term"],
        ["Appointments set down since the ISA moved to part time", "Juniper Wobblesby", "11/02/2026",
         "ISA hours cut from 40 to 20 in October.", "Short-Term"],
        ["Two pendings fell through in October and nobody reviewed why", "Barnaby Crumpet", "10/28/2026", "", "Short-Term"],
        ["Weekend lead response has no owner", "Fennel Quackenbush", "11/09/2026",
         "Leads that come in after Friday 6 PM wait until Monday.", "Short-Term"],
        ["Showing feedback isn't reaching sellers", "Barnaby Crumpet", "11/04/2026", "", "Short-Term"],
        ["Desk setup for the new hire", "Tansy Fernwhistle", "11/11/2026", "", "Short-Term"],
        ["Holiday party budget", "Tansy Fernwhistle", "10/20/2026", "", "Short-Term"],
        ["Peachfuzz Leads contract renewal: decide by 11/30", "Juniper Wobblesby", "11/06/2026",
         "Renewal is 12 months. Price goes up on 12/1.", "Short-Term"],
        ["Add a property management arm in 2027?", "Pippin Marmalade", "09/22/2026", "", "Long-Term"],
    ])

    write_text(out / "Headlines.txt", [
        "Customer Headlines",
        "- The Larkspur Loop buyers left us a five-star review. (Rosemary)",
        "- A past client referred two coworkers this week. (Tansy)",
        "",
        "Employee Headlines",
        "- Rosemary is out Friday for her mom's knee surgery; Juniper is covering her showings. (Rosemary)",
        "- Fennel passed the broker pre-licensing exam. (Fennel)",
    ])


# --- case 2: Marzipan Meadows Home Team, Bloom Growth-style CSVs, meeting Monday 2026-11-16 10:00 AM --------------

def case2():
    rng = random.Random(1116)
    out = SKILL / "evals" / "files" / "case2"
    weeks = [date(2026, 8, 16) + timedelta(weeks=i) for i in range(13)]  # Sundays, Aug 16 to Nov 8
    ms = [
        ("Dials", "Sorrel Bumbleby", "300", ">=", 300, "at least", 0.15, "276"),
        ("Conversations", "Sorrel Bumbleby", "60", ">=", 60, "at least", 0.2, "61"),
        ("Appointments Set", "Sorrel Bumbleby", "10", ">=", 10, "at least", 0.3, "9"),
        ("Appointments Held", "Ivy Pennywhistle", "8", ">=", 8, "at least", 0.3, ""),
        ("Signed Agreements", "Ivy Pennywhistle", "5", ">=", 5, "at least", 0.4, "5"),
        ("Contracts Written", "Ivy Pennywhistle", "3", ">=", 3, "at least", 0.6, "2"),
        ("Lead Response Time (Minutes)", "Sorrel Bumbleby", "10", "<=", 10, "at most", 0.5, "12"),
        ("Database Touches", "Moss Crinkleton", "150", ">=", 150, "at least", 0.2, ""),
    ]
    blanks = {("Dials", date(2026, 10, 18))}
    rows = [["Measurable", "Owner", "Goal", "Goal Direction", "Week", "Value"]]
    for title, owner, goal_text, op, goal, direction, spread, latest in ms:
        vals = history(rng, goal, direction, 12, spread)
        for d, v in zip(weeks, vals + [None]):
            cell = latest if d == weeks[-1] else ("" if (title, d) in blanks else v)
            rows.append([title, owner, goal_text, op, d.isoformat(), cell])
    write_csv(out / "KPI (Metrics).csv", rows)

    write_csv(out / "Quarterly Priorities (Goals).csv", [
        ["Goal", "Owner", "Due Date", "Status"],
        ["Fill the Second ISA Seat", "Sorrel Bumbleby", "2026-12-31", "On Track"],
        ["Launch the Monthly Homeowner Newsletter", "Moss Crinkleton", "2026-12-31", ""],
        ["Get Buyers Pre-Approved Before Showings", "Ivy Pennywhistle", "2026-12-31", "Off Track"],
        ["Document the Listing Launch Checklist", "Thimble Oakhurst", "2026-12-31", ""],
        ["Hold Two Client Appreciation Events", "Moss Crinkleton", "2026-12-31", "Complete"],
    ])

    write_csv(out / "To-Dos.csv", [
        ["To-Do", "Owner", "Due Date", "Complete"],
        ["Send the Toffee Terrace buyers the HOA document request", "Thimble Oakhurst", "2026-11-16", "TRUE"],
        ["Interview the ISA candidate from the referral", "Sorrel Bumbleby", "2026-11-16", "TRUE"],
        ["Pick a newsletter template", "Moss Crinkleton", "2026-11-16", "FALSE"],
        ["Call the lender about the pre-approval letter template", "Ivy Pennywhistle", "2026-11-13", "TRUE"],
        ["Set the after-6 PM lead routing test", "Sorrel Bumbleby", "2026-11-16", "FALSE"],
        ["Draft the listing launch checklist outline", "Thimble Oakhurst", "2026-11-16", ""],
        ["Book the December client event space", "Moss Crinkleton", "2026-11-12", "TRUE"],
        ["Get the dialer renewal quote in writing", "Sorrel Bumbleby", "2026-11-16", "TRUE"],
        ["Log last week's appointments in the CRM", "Ivy Pennywhistle", "2026-11-16", "FALSE"],
        ["Send the October database touch report", "Moss Crinkleton", "2026-11-15", "TRUE"],
        ["Update the buyer consult folder", "Ivy Pennywhistle", "2026-11-02", "FALSE"],
        ["Order client event invitations", "Moss Crinkleton", "2026-11-23", "FALSE"],
    ])

    write_csv(out / "O&O (Issues).csv", [
        ["Issue", "Owner", "Created", "Details"],
        ["Lead response time over 10 minutes after 6 PM", "Sorrel Bumbleby", "2026-11-04",
         "Evening leads wait for the next morning about half the time."],
        ["Toffee Terrace buyer closing 11/20 still missing HOA documents", "Thimble Oakhurst", "2026-11-12",
         "Title needs them two days before closing."],
        ["Appointments held aren't getting logged", "Ivy Pennywhistle", "2026-11-09", ""],
        ["Dialer contract renewal: decide by 11/30", "Sorrel Bumbleby", "2026-10-21", "Annual contract auto-renews 12/1."],
        ["Newsletter design vendor", "Moss Crinkleton", "2026-10-28", "Two quotes, no decision."],
        ["Pre-approval letter template is out of date", "Ivy Pennywhistle", "2026-11-02",
         "Lender changed the template in October."],
    ])


if __name__ == "__main__":
    practice()
    case1()
    case2()
    print("wrote practice/ and evals/files/")
