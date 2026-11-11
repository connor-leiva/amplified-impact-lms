"""Builds the made-up practice and eval files for new-agent-onboarding-plan.

Usage: python3 make_files.py SKILL_DIR HTML_DIR
Writes DOCX, XLSX, CSV and TXT files straight into practice/ and evals/files/, and one HTML file per PDF into
HTML_DIR. Then run html_to_pdf.cjs to print those to PDF in the same places.

Every team, person, brokerage, address, inbox and number here is made up. The three cases are the course
plan's three tests: normal inputs (the practice set, case 1 and the setup run, case 4), missing inputs (case 2)
and misleading or conflicting inputs (case 3).
"""
import csv
import json
import os
import sys

from docx import Document
from docx.shared import Pt
from openpyxl import Workbook
from openpyxl.styles import Font

STAMP = "PRACTICE FILE: made-up example"
SKILL_DIR, HTML_DIR = sys.argv[1], sys.argv[2]
PDFS = []


def out(rel):
    path = os.path.join(SKILL_DIR, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def html_doc(rel, title, meta, sections):
    """sections: list of (heading, [paragraph or ('table', rows) or ('list', items)])"""
    css = (
        "body{font-family:Georgia,serif;font-size:11pt;line-height:1.45;margin:0;color:#222}"
        "h1{font-size:19pt;margin:0 0 4px}h2{font-size:13pt;margin:18px 0 6px;border-bottom:1px solid #999}"
        ".stamp{font-family:Arial,sans-serif;font-weight:bold;color:#b00;font-size:10pt;margin-bottom:10px}"
        ".meta{font-family:Arial,sans-serif;font-size:9.5pt;color:#444;margin-bottom:12px}"
        "table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:6px 0}"
        "td,th{border:1px solid #888;padding:4px 6px;vertical-align:top;text-align:left}th{background:#eee}"
        "p{margin:5px 0}li{margin:3px 0}"
    )
    parts = [f"<html><head><meta charset='utf-8'><style>{css}</style></head><body>",
             f"<div class='stamp'>{STAMP}</div><h1>{title}</h1>",
             "<div class='meta'>" + "<br>".join(meta) + "</div>"]
    for heading, blocks in sections:
        parts.append(f"<h2>{heading}</h2>")
        for b in blocks:
            if isinstance(b, tuple) and b[0] == "table":
                rows = b[1]
                parts.append("<table><tr>" + "".join(f"<th>{c}</th>" for c in rows[0]) + "</tr>")
                for r in rows[1:]:
                    parts.append("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>")
                parts.append("</table>")
            elif isinstance(b, tuple) and b[0] == "list":
                parts.append("<ul>" + "".join(f"<li>{i}</li>" for i in b[1]) + "</ul>")
            else:
                parts.append(f"<p>{b}</p>")
    parts.append("</body></html>")
    name = rel.replace("/", "__").replace(".pdf", ".html")
    with open(os.path.join(HTML_DIR, name), "w", encoding="utf-8") as f:
        f.write("".join(parts))
    PDFS.append({"html": name, "pdf": rel})


def docx_doc(rel, title, meta, sections):
    d = Document()
    d.core_properties.author = "Made-up example"
    d.sections[0].header.paragraphs[0].text = STAMP
    p = d.add_paragraph()
    r = p.add_run(STAMP)
    r.bold = True
    d.add_heading(title, 0)
    for m in meta:
        d.add_paragraph(m).runs[0].font.size = Pt(9.5)
    for heading, blocks in sections:
        d.add_heading(heading, 1)
        for b in blocks:
            if isinstance(b, tuple) and b[0] == "table":
                rows = b[1]
                t = d.add_table(rows=len(rows), cols=len(rows[0]))
                t.style = "Table Grid"
                for i, row in enumerate(rows):
                    for j, c in enumerate(row):
                        t.cell(i, j).text = c
            elif isinstance(b, tuple) and b[0] == "list":
                for item in b[1]:
                    d.add_paragraph(item, style="List Bullet")
            else:
                d.add_paragraph(b)
    d.save(out(rel))


def xlsx_doc(rel, title, meta, header, rows, widths):
    wb = Workbook()
    ws = wb.active
    ws.title = "Checklist"
    ws.append([STAMP])
    ws["A1"].font = Font(bold=True, color="BB0000")
    ws.append([title])
    ws["A2"].font = Font(bold=True, size=13)
    for m in meta:
        ws.append([m])
    ws.append([])
    ws.append(header)
    for c in ws[ws.max_row]:
        c.font = Font(bold=True)
    for r in rows:
        ws.append(r)
    for col, width in zip("ABCDEFG", widths):
        ws.column_dimensions[col].width = width
    wb.save(out(rel))


def text_file(rel, lines):
    with open(out(rel), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")


# ---------------------------------------------------------------------------------------------------------
# Practice set (and cases 1 and 4): Thistledown Example Team at Copperleaf Example Realty. Normal inputs.
# ---------------------------------------------------------------------------------------------------------

html_doc(
    "practice/PRACTICE Thistledown Agent Handbook 2026.pdf",
    "Thistledown Example Team: Agent Handbook",
    ["Thistledown Example Team at Copperleaf Example Realty",
     "Owner: Rosalind Puddingstone, Team Leader",
     "Revised: March 2, 2026. Applies to every agent on the team."],
    [
        ("1. How to Use This Handbook", [
            "This handbook is the team's written standard for agents. The New Agent Checklist, kept by the "
            "Director of Operations, has the day-by-day steps for a new agent's first 30 days. When this "
            "handbook and the checklist seem to disagree, ask the Team Leader.",
        ]),
        ("2. Who Does What", [
            ("table", [
                ["Role", "Owns"],
                ["Team Leader", "Hiring; the welcome meeting on Day 1; the Day 7 and Day 30 checkpoints; the "
                 "Tuesday team meeting; final say on these standards."],
                ["Director of Operations", "Logins and systems; Follow Up Boss training; the New Agent "
                 "Checklist; W-9 and payment setup; headshot and website bio."],
                ["Mentor", "A senior agent the Team Leader assigns to each new agent. Weekly mentor time for "
                 "the first 30 days; shadowing; the buyer consultation role-play; the Day 14 checkpoint, with "
                 "the Team Leader."],
                ["Lead Manager", "The lead rotation and speed-to-lead training."],
                ["Transaction Coordinator", "Contract-to-close handoff training. Every accepted contract goes "
                 "to the Transaction Coordinator within 24 hours of acceptance."],
                ["Principal Broker, Copperleaf Example Realty", "License affiliation with Copperleaf; "
                 "Copperleaf's fair housing course; contract and legal questions."],
                ["New agent", "Completes each checklist step; logs every contact in Follow Up Boss the same "
                 "day; brings questions to the mentor first."],
            ]),
        ]),
        ("3. Onboarding Days and Meetings", [
            "Onboarding sessions are held Monday through Friday. The office is closed on federal holidays and "
            "on December 24.",
            "Team meeting: every Tuesday at 9:30 AM. Training: every Thursday at 10:00 AM. New agents attend "
            "both in their first 30 days, or tell the Team Leader before missing one.",
        ]),
        ("4. Standards by Day 30", [
            "By Day 30, a new agent is up to standard when they:",
            ("list", [
                "Log every lead and client contact in Follow Up Boss the same day. The Director of Operations "
                "checks this at Day 30.",
                "Buyer's agents: pass the buyer consultation role-play with their mentor by Day 14, scored on "
                "the team's Buyer Consultation Checklist.",
                "Have shadowed at least two buyer consultations and one listing appointment (one buyer "
                "consultation for agents licensed two years or more; see section 5).",
                "Have at least 150 sphere contacts in Follow Up Boss, with the source set to Sphere, by Day 21.",
                "Have completed Copperleaf's fair housing course.",
                "Can explain the contract-to-close handoff: what goes to the Transaction Coordinator, and by when.",
            ]),
            "These standards are the same for every new agent in the role.",
        ]),
        ("5. Experienced Agents", [
            "Agents licensed two years or more do one buyer consultation shadow (the Day 5 shadow) instead of "
            "two. Every other step and standard is the same.",
        ]),
        ("6. Leads", [
            "New agents join the lead rotation only after both of these: the Principal Broker confirms their "
            "license is active with Copperleaf Example Realty, and they pass the Day 14 checkpoint. The Lead "
            "Manager adds them.",
            "Respond to a new lead within 5 minutes during business hours.",
            "Text a lead only when Follow Up Boss shows documented text consent that names Thistledown Example "
            "Team or Copperleaf Example Realty. Scrub every call list against the National Do Not Call Registry "
            "before a call block.",
        ]),
        ("7. Buyers", [
            "A written buyer agreement is signed before any showing. No exceptions.",
        ]),
        ("8. Pay", [
            "Your split and fees are in your signed Independent Contractor Agreement. Questions go to the Team "
            "Leader.",
        ]),
        ("9. After Day 30", [
            "Day 60 and Day 90 reviews with the Team Leader, against goals you set together at Day 30.",
        ]),
    ],
)

CHECK_HEADER = ["Day", "Step", "Owner", "Applies To", "Needs Active License", "Notes"]
xlsx_doc(
    "practice/PRACTICE Thistledown New Agent Checklist.xlsx",
    "Thistledown Example Team: New Agent Checklist",
    ["Kept by: Barnaby Kettlewhite, Director of Operations", "Last updated: September 14, 2026"],
    CHECK_HEADER,
    [
        [1, "Welcome meeting with the Team Leader: the team, the standards and this checklist", "Team Leader", "All", "No", ""],
        [1, "Logins: Google Workspace email, Follow Up Boss and the shared drive", "Director of Operations", "All", "No", ""],
        [1, "Send your W-9 and direct deposit form through the secure upload link", "Director of Operations", "All", "No", "Never by email."],
        [1, "Confirm the license is active and affiliated with Copperleaf Example Realty", "Principal Broker", "All", "No", "Brokerage paperwork through Copperleaf's onboarding portal."],
        [2, "Follow Up Boss training, part 1: stages, tags and logging every contact", "Director of Operations", "All", "No", ""],
        [2, "MLS access and showing service setup", "Director of Operations", "All", "Yes", ""],
        [3, "Headshot and bio for the team website", "Director of Operations", "All", "No", ""],
        [3, "Meet your mentor and set weekly mentor time for Days 1 to 30", "Mentor", "All", "No", ""],
        [5, "Shadow a buyer consultation", "Mentor", "Buyer's Agent", "Yes", ""],
        [7, "Checkpoint: Week One Review", "Team Leader", "All", "No", "Logins working, W-9 in, mentor time set, Follow Up Boss logging started."],
        [8, "Follow Up Boss training, part 2: action plans and smart lists", "Director of Operations", "All", "No", ""],
        [8, "Start your sphere list in Follow Up Boss (150 contacts by Day 21)", "New agent", "All", "No", ""],
        [9, "Buyer consultation role-play, practice round", "Mentor", "Buyer's Agent", "No", ""],
        [10, "Copperleaf fair housing course", "Principal Broker", "All", "No", "The Principal Broker assigns it."],
        [12, "Shadow a listing appointment", "Mentor", "All", "Yes", ""],
        [14, "Checkpoint: Buyer Consultation Role-Play, scored on the Buyer Consultation Checklist", "Mentor and Team Leader", "Buyer's Agent", "No", ""],
        [15, "Speed-to-lead training: first response within 5 minutes", "Lead Manager", "All", "No", ""],
        [15, "Join the lead rotation", "Lead Manager", "Buyer's Agent", "Yes", "Only after the Day 14 checkpoint and the license confirmed."],
        [16, "Contract-to-close handoff training", "Transaction Coordinator", "All", "No", ""],
        [19, "Shadow a second buyer consultation", "Mentor", "Buyer's Agent", "Yes", "Skip if licensed two years or more."],
        [21, "Sphere list check: 150 contacts in Follow Up Boss", "Mentor", "All", "No", ""],
        [22, "First sphere call block with your mentor", "Mentor", "All", "Yes", "Scrubbed numbers only."],
        [28, "Listing presentation walk-through", "Team Leader", "Listing Agent", "No", ""],
        [30, "Checkpoint: Day 30 Review against the handbook's standards", "Team Leader", "All", "No", ""],
        [60, "Day 60 review", "Team Leader", "All", "No", ""],
        [90, "Day 90 review", "Team Leader", "All", "No", ""],
    ],
    (8, 72, 26, 16, 20, 52),
)

docx_doc(
    "practice/PRACTICE Thistledown Roles and Contacts.docx",
    "Thistledown Example Team: Roles and Contacts",
    ["Owner: Barnaby Kettlewhite, Director of Operations", "Last updated: October 1, 2026"],
    [
        ("Who Is in Each Role", [
            ("table", [
                ["Role", "Person", "How to reach them"],
                ["Team Leader", "Rosalind Puddingstone", "The #team-leadership channel, or in person"],
                ["Director of Operations", "Barnaby Kettlewhite", "The #ops-help channel"],
                ["Lead Manager", "Pip Larkspur", "The #leads channel"],
                ["Transaction Coordinator", "Tobias Inkwell", "The transactions inbox, transactions@thistledown.example"],
                ["Principal Broker, Copperleaf Example Realty", "Hollis Fernsby", "Through the Team Leader"],
                ["Mentors (the Team Leader assigns one to each new agent)", "Odette Brambleworth, Cassius Wheatley", "In person"],
            ]),
            "Personal cell numbers are in the team directory in Follow Up Boss, not in this document.",
        ]),
        ("When Something Breaks", [
            "Logins, Follow Up Boss or the shared drive: post in #ops-help. Contract questions: the Transaction "
            "Coordinator first; legal questions go to the Principal Broker through the Team Leader.",
        ]),
    ],
)

# ---------------------------------------------------------------------------------------------------------
# Case 2: missing inputs. One page of a leader's notes. No team name, start date, role, license status,
# standards, checkpoints or owners beyond "me".
# ---------------------------------------------------------------------------------------------------------

text_file("evals/files/case2/PRACTICE Onboarding Notes.txt", [
    STAMP,
    "",
    "New agent onboarding (my notes)",
    "",
    "Week 1: get them set up in Follow Up Boss, the MLS and Dotloop. Sit down with me.",
    "Week 2: shadow someone on a listing appointment and a couple of buyer appointments.",
    "Week 3: role-play the buyer consult.",
    "They should be taking leads by the end of the month.",
    "Weekly 1:1 with me, Fridays.",
])

# ---------------------------------------------------------------------------------------------------------
# Case 3: misleading and conflicting inputs. Saltmarsh Example Group at Driftwood Example Realty.
# ---------------------------------------------------------------------------------------------------------

xlsx_doc(
    "evals/files/case3/PRACTICE Saltmarsh Onboarding Checklist.xlsx",
    "Saltmarsh Example Group: Onboarding Checklist",
    ["Owner: Ferris Tumblebrook, Ops Manager", "Last updated: August 5, 2024"],
    CHECK_HEADER,
    [
        [1, "Orientation and team tour", "Ops Manager", "All", "No", ""],
        [1, "Logins: email, the CRM and the transaction system", "Ops Manager", "All", "No", ""],
        [3, "CRM training", "Ops Manager", "All", "No", ""],
        [5, "Shadow a showing with a senior agent", "Senior agent", "Buyer's Agent", "Yes", ""],
        [7, "Week one check-in", "Ops Manager", "All", "No", ""],
        [10, "Start taking team leads", "Ops Manager", "Buyer's Agent", "Yes", ""],
        [12, "Buyer process: show homes, then have the buyer sign the buyer agreement when you write the offer", "Team Leader", "Buyer's Agent", "Yes", ""],
        [20, "Contract-to-close training", "Ops Manager", "All", "No", ""],
        [30, "30-day review", "Ops Manager", "All", "No", ""],
    ],
    (8, 72, 22, 16, 20, 30),
)

html_doc(
    "evals/files/case3/PRACTICE Saltmarsh Team Standards 2026.pdf",
    "Saltmarsh Example Group: Team Standards",
    ["Saltmarsh Example Group at Driftwood Example Realty",
     "Owner: Marisol Quenby, Team Leader",
     "Revised: June 1, 2026"],
    [
        ("Day 1", [
            "Day 1 orientation is run by the Team Leader. Onboarding is Monday through Friday.",
        ]),
        ("Standards by Day 30", [
            ("list", [
                "Every lead and client contact is logged in the CRM the same day.",
                "A written buyer agreement is signed before any showing.",
                "The Driftwood fair housing course is complete by Day 14.",
                "Pass the Day 21 checkpoint: a buyer consultation role-play, scored by the Team Leader.",
            ]),
        ]),
        ("Checkpoints", [
            ("table", [
                ["Day", "Checkpoint", "Owner"],
                ["7", "Week one check-in", "Ops Manager"],
                ["21", "Buyer consultation role-play", "Team Leader"],
                ["30", "30-day review", "Team Leader"],
            ]),
        ]),
        ("Leads", [
            "New agents start team leads only after passing the Day 21 checkpoint, with their license active at "
            "Driftwood Example Realty.",
        ]),
        ("Office Days", [
            "New agents must be in the office Monday through Friday, 9 AM to 5 PM, for their first 30 days. "
            "Missing two days without approval removes lead eligibility for 60 days.",
        ]),
    ],
)

with open(out("evals/files/case3/PRACTICE Saltmarsh Roster Export 2026-11-10.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow([STAMP, "", "", "", "", ""])
    w.writerow(["Name", "Role", "Start Date", "License Status", "License Note", "Mentor"])
    w.writerow(["Marisol Quenby", "Team Leader", "2019-03-04", "Active", "", ""])
    w.writerow(["Ferris Tumblebrook", "Ops Manager", "2021-06-14", "Not licensed", "Staff", ""])
    w.writerow(["Bertrand Wickersham", "Buyer's Agent", "2022-01-10", "Active", "", "Marisol Quenby"])
    w.writerow(["Ottilie Fenwright", "Listing Agent", "2020-09-08", "Active", "", ""])
    w.writerow(["Teodora Brindlewick", "Buyer's Agent", "2026-11-30", "Pending",
                "Exam passed 2026-10-30. License application submitted 2026-11-02. Not yet issued.", ""])

html_doc(
    "evals/files/case3/PRACTICE Harborlight 30-Day Ramp Template.pdf",
    "Harborlight Example Team: 30-Day Agent Ramp",
    ["Shared by the Example Coaching Collective. Template, 2025.",
     "Built for Harborlight Example Team at Bayview Example Realty."],
    [
        ("The Ramp", [
            ("table", [
                ["When", "Target"],
                ["Day 1", "100 dials"],
                ["Week 2", "5 appointments set"],
                ["Week 3", "First showing"],
                ["Day 30", "2 signed buyers and 1 listing appointment"],
            ]),
            "Agents who hit the ramp close 10 deals in their first 90 days.",
        ]),
    ],
)

with open(os.path.join(HTML_DIR, "pdfs.json"), "w", encoding="utf-8") as f:
    json.dump(PDFS, f, indent=2)
print(f"wrote files; {len(PDFS)} PDFs to print")
