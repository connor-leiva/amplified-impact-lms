"""Write the input files for eval case 3 (the step 8 rules).

Run from anywhere:  python3 -I skills/perfect-week/evals/make/make_case3.py

  evals/files/case3-calendar-now.ics          Jordan's calendar re-read on Mon Nov 9 at build time: the practice
                                              calendar plus what changed after the plan was made
  evals/files/case3-before-the-calendar.md    the Before the calendar section Jordan approved in steps 3 to 7

Everything is fictional. Output is deterministic.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_files as M  # noqa: E402

TZ = "America/Denver"
ME = ("Jordan Sampleton", "jordan@samplepeak.example")
DREW = ("Drew Fakely", "drew@samplepeak.example")


def calendar_now():
    text = M.practice_calendar()
    lines = text.split("\r\n")
    out = []
    i = 0
    # Unfold so we can edit whole events, then re-fold at the end.
    unfolded = []
    for l in lines:
        if l.startswith(" ") and unfolded:
            unfolded[-1] += l[1:]
        else:
            unfolded.append(l)
    events, cur, head, tail = [], None, [], []
    for l in unfolded:
        if l == "BEGIN:VEVENT":
            cur = [l]
            continue
        if cur is not None:
            cur.append(l)
            if l == "END:VEVENT":
                events.append(cur)
                cur = None
            continue
        if events:
            tail.append(l)
        else:
            head.append(l)
    def uid(e):
        return next(x for x in e if x.startswith("UID:"))[4:]
    def set_prop(e, name, value):
        for k, x in enumerate(e):
            if x.startswith(name + ":") or x.startswith(name + ";"):
                e[k] = value
                return
        e.insert(-1, value)
    kept = []
    for e in events:
        u = uid(e)
        if u == "pw-coffee-kit@practice.example":
            set_prop(e, "DTSTART", f"DTSTART;TZID={TZ}:20261116T094500")
            set_prop(e, "DTEND", f"DTEND;TZID={TZ}:20261116T103000")
            set_prop(e, "SEQUENCE", "SEQUENCE:1")
            set_prop(e, "LAST-MODIFIED", "LAST-MODIFIED:20261108T220000Z")
        if u == "pw-lunchlearn@practice.example":
            e[:] = [x.replace("PARTSTAT=NEEDS-ACTION", "PARTSTAT=ACCEPTED") if x.startswith("ATTENDEE") else x for x in e]
        if u == "pw-ops-sync@practice.example" and not any(x.startswith("RECURRENCE-ID") for x in e):
            e.insert(e.index(next(x for x in e if x.startswith("RRULE"))) + 1, f"EXDATE;TZID={TZ}:20261127T083000")
        if u == "pw-recruit-block@practice.example":
            e.insert(e.index(next(x for x in e if x.startswith("RRULE"))) + 1, f"EXDATE;TZID={TZ}:20261126T130000")
        kept.append(e)
    new = []
    new += M.event(TZ, "c3-reinspect@practice.example", "Re-inspection walkthrough: 210 Testwood Drive", "20261111T090000",
                   "20261111T100000", DREW, [M.person(*DREW), M.person(*ME)], location="210 Testwood Drive",
                   description="Drew asked Jordan to join the re-inspection walkthrough.", created="20261108T230000Z"),
    new += M.event(TZ, "c3-drew-1on1@practice.example", "Drew / Jordan 1:1", "20261118T150000", "20261118T153000", DREW,
                   [M.person(*DREW), M.person(*ME)], rrule="FREQ=WEEKLY;INTERVAL=2;BYDAY=WE",
                   description="Drew set this up after the team meeting.", created="20261108T230500Z"),
    body = head + [x for e in kept + list(new) for x in e] + tail
    body = [l.replace("DTSTAMP:20261108T150000Z", "DTSTAMP:20261109T143000Z") for l in body]
    return "\r\n".join(M.fold(l) for l in body if l != "") + "\r\n"


SERIES = [
    # (title, days, start, end, area, job, weeks)
    ("Launch", "Mon to Fri", "8:00", "8:15", "Rituals", "Pick today's top 3 from your plan and task list.", ""),
    ("Comms sweep", "Mon to Thu", "8:15", "8:30", "Rituals", "Email, texts and team chat: answer what takes two minutes, park the rest.", ""),
    ("Lunch", "Mon to Fri", "12:00", "12:30", "Lunch and breaks", "Away from the desk.", ""),
    ("Comms sweep", "Mon, Tue, Wed, Fri", "4:15", "4:45", "Rituals", "Second pass: replies, voicemails, team questions.", ""),
    ("Shutdown", "Mon, Tue, Wed, Fri", "4:45", "5:00", "Rituals", "Close loops and write tomorrow's top 3.", ""),
    ("Comms sweep", "Thu", "2:45", "3:15", "Rituals", "Second pass before pickup.", ""),
    ("Shutdown", "Thu", "3:15", "3:30", "Rituals", "Note tomorrow's top 3; done by 3:30 for pickup.", ""),
    ("Huddle prep", "Mon", "8:30", "9:00", "Leadership and coaching", "Last week's numbers and wins for the 9:00 huddle.", ""),
    ("Recruiting: coffee or recruit calls", "Mon", "9:30", "11:30", "Recruiting", "One recruit coffee, or 4 to 6 calls from your recruit list, then log them.", ""),
    ("Leadership project", "Mon", "12:30", "2:30", "Leadership and coaching", "Business plan and onboarding playbook deliverables (see Projects).", ""),
    ("Your listings", "Mon", "2:45", "4:15", "Your listings", "Listing prep and seller updates; past-client calls from your CRM list.", ""),
    ("Team meeting prep", "Tue", "8:30", "9:30", "Leadership and coaching", "Training topic and pipeline review agenda for 9:30.", ""),
    ("Team meeting follow-through", "Tue", "11:00", "11:30", "Leadership and coaching", "Send notes and owners for every action item.", ""),
    ("Your listings", "Tue", "12:30", "2:30", "Your listings", "CMAs, listing packets, the listing presentation refresh.", ""),
    ("Marketing", "Tue", "2:45", "3:45", "Marketing", "Market update videos, client gifts, past-client email.", ""),
    ("Leadership project", "Wed", "8:30", "10:30", "Leadership and coaching", "Business plan and onboarding playbook deliverables (see Projects).", ""),
    ("Operations and finance", "Wed", "11:00", "12:00", "Operations and finance", "P&L questions, expenses, tech and renewals.", ""),
    ("Recruiting follow-up", "Wed", "1:00", "2:30", "Recruiting", "Follow-ups from coffees and calls; book next week's coffees.", ""),
    ("1:1 prep", "Wed", "2:30", "3:00", "Leadership and coaching", "Prep for Casey (Week A) or Drew (Week B).", ""),
    ("Hold: 1:1 Drew Fakely", "Wed", "3:00", "3:30", "Leadership and coaching", "Every other week. No invite sent: you invite Drew when you are ready.", "Week B (from Nov 18)"),
    ("Your listings", "Thu", "8:30", "9:30", "Your listings", "Past-client calls from your CRM list.", ""),
    ("1:1 prep", "Thu", "9:30", "10:00", "Leadership and coaching", "Prep for Avery (Week A) or Riley (Week B).", ""),
    ("Hold: 1:1 Quinn Notreal", "Thu", "10:30", "11:00", "Leadership and coaching", "Every other week. No invite sent: you invite Quinn when you are ready.", "Week A (from Nov 12)"),
    ("Recruiting: coffee or recruit calls", "Thu", "11:00", "12:00", "Recruiting", "A coffee, or calls and the recruiting follow-up list.", ""),
    ("Ops sync prep", "Fri", "8:15", "8:30", "Operations and finance", "Agenda for Morgan: hand-offs and open questions.", ""),
    ("Leadership project", "Fri", "9:00", "11:00", "Leadership and coaching", "Business plan and onboarding playbook deliverables (see Projects).", ""),
    ("Your listings", "Fri", "11:00", "12:00", "Your listings", "Seller updates and past-client calls. On review Fridays this hour is the review with Pat.", ""),
    ("Operations and finance", "Fri", "12:30", "1:30", "Operations and finance", "Hand-offs to Morgan, receipts, renewals.", ""),
    ("Marketing", "Fri", "1:30", "2:30", "Marketing", "Videos, gifts, past-client email.", ""),
    ("Weekly review", "Fri", "3:30", "4:15", "Rituals", "Check this week against the plan and set next week's blocks.", ""),
]


def before_md():
    out = [
        "# Before the Calendar: Jordan's Perfect Week (approved draft)",
        "",
        "PRACTICE FILE: made-up example. This is the Before the calendar section from the plan page Jordan reviewed",
        "in steps 3 to 7 (built Sun Nov 8 from the calendar export and ClickUp tasks). All times Mountain (America/Denver).",
        "",
        "## Scope",
        "",
        "Repeating blocks from Mon Nov 9 through Fri Dec 18. Days off: Thu Nov 26 and Fri Nov 27 (skip every block).",
        "Week A is the week of Nov 9, Nov 23 and Dec 7; Week B is Nov 16, Nov 30 and Dec 14.",
        "",
        "## What Will Be Added",
        "",
        "| # | Title | Days | Time | Area (color) | Job | Every other week |",
        "|---|---|---|---|---|---|---|",
    ]
    for n, (title, days, s, e, area, job, weeks) in enumerate(SERIES, 1):
        out.append(f"| {n} | {title} | {days} | {s} to {e} | {area} | {job} | {weeks or 'No'} |")
    out += [
        f"| {len(SERIES) + 1} | Listing appointment prep: 45 Sample Street | Mon Nov 9 only | 1:00 to 2:00 | Your listings | Finish the listing packet right before the 2:00 appointment. | Single event |",
        "",
        "Open time and breaks are not added; they stay empty on purpose.",
        "",
        "Area colors (Google Calendar colorId, matching the plan page): Leadership and coaching 9, Recruiting 10, Your listings 6,",
        "Operations and finance 8, Marketing 3, Rituals 1, Lunch and breaks 2.",
        "",
        "## What Will Change to Fit (as of Nov 8)",
        "",
        "- Mon Nov 9: Leadership project ends at 1:00 (listing prep 1:00 to 2:00, listing appointment 2:00 to 3:00); Your listings starts at 3:00.",
        "- Mon Nov 16: Recruiting starts at 9:45 (coffee with Kit until 9:45), unless Jordan moves the coffee.",
        "- Tue Nov 17: Your listings splits around a personal appointment (12:30 to 1:00 and 2:00 to 2:30).",
        "- Thu Nov 19: afternoon comms sweep and shutdown skip for the closing.",
        "- Fri Nov 20: Launch and ops sync prep skip (ops sync moved to 8:00); Your listings skips for the review with Pat. Same Friday hour on Dec 18.",
        "- Wed Dec 2: Operations and finance skips for broker office hours.",
        "",
        "## What Stays Exactly As It Is",
        "",
        "Every meeting with other people; Jordan's own named blocks (TIMEBLOCK: Recruiting calls, the 9 Example Court appointment,",
        "the open house, Gym, personal appointments); the \"Focus time\" placeholder unless Jordan says to clear it; all-day contract",
        "deadlines from Transactions.",
        "",
        "## Decisions Jordan Had Open",
        "",
        "Move Kit's coffee; Lunch & Learn (Nov 12) and Friendsgiving (Nov 18); clear the \"Focus time\" placeholder or keep it;",
        "the Nov 27 ops sync; the Nov 26 recruiting calls block; ask Pat about Dec 18.",
        "",
        "## The Three House Rules",
        "",
        "- No invites: no guests on anything created, and notifications off on every create, change and delete.",
        "- Hands off other people's meetings: no edits, moves, deletes or RSVPs on anything with other people on it.",
        "- Jordan's own events stay unless Jordan says otherwise.",
        "",
    ]
    return "\n".join(out)


def main():
    M.write(os.path.join(M.FILES, "case3-calendar-now.ics"), calendar_now())
    M.write(os.path.join(M.FILES, "case3-before-the-calendar.md"), before_md())
    print("wrote evals/files/case3-*")


if __name__ == "__main__":
    main()
