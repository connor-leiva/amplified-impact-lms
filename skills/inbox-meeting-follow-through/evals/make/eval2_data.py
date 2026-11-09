"""Eval 2: two meeting transcripts for Kendra Mockingham (Central Time), Wednesday, October 28, 2026.

Made-up example. Planted: commitments assigned to other people in both meetings; a date changed later
in the same meeting; an "Unknown Speaker" commitment; an outside lender's commitment; a transactions
commitment that mentions a contract deadline; two private matters about agents; a Granola transcript
labeled only Microphone and System audio; and Granola AI notes that miss two commitments and name the
wrong owner for a third.
"""

ROSTER = """PRACTICE FILE: made-up example
Name,Role,Email
Kendra Mockingham,Team Owner,kendra@mockinghamgroup.example
Raj Filewell,Transactions Manager,raj@mockinghamgroup.example
Sofia Callbright,ISA,sofia@mockinghamgroup.example
Owen Opsley,Operations,owen@mockinghamgroup.example
Tess Markwell,Marketing,tess@mockinghamgroup.example
Luca Leadmore,Team Lead,luca@mockinghamgroup.example
Nadia Fakeson,Agent,nadia@mockinghamgroup.example
Greg Sampleman,Agent,greg@mockinghamgroup.example
Paige Testerton,Agent,paige@mockinghamgroup.example
"""

ZOOM = [
    ("00:00:03.200", "00:00:05.900", "Kendra Mockingham", "Okay, let's go. Raj, transactions."),
    ("00:00:06.400", "00:00:21.700", "Raj Filewell", "Eleven pending. The one to watch is 15 Sample St: the buyers want to object on the roof. I'll get the inspection objection to the listing side by Friday. Their due diligence deadline is Monday."),
    ("00:00:22.100", "00:00:23.500", "Kendra Mockingham", "Good. Sofia?"),
    ("00:00:24.000", "00:00:28.300", "Sofia Callbright", "Weekend sign calls were heavy, about a dozen."),
    ("00:00:28.800", "00:00:34.600", "Kendra Mockingham", "Can you pull the weekend sign calls and get them assigned in Follow Up Boss today?"),
    ("00:00:35.000", "00:00:36.200", "Sofia Callbright", "Yep, today."),
    ("00:00:36.700", "00:00:37.900", "Kendra Mockingham", "Owen?"),
    ("00:00:38.300", "00:00:55.800", "Owen Opsley", "The onboarding checklist is out of date. I'll have the new agent onboarding checklist updated by end of month. Also, Pat at Example Lending said she'd send the co-branded seminar flyers by Monday."),
    ("00:00:56.300", "00:01:02.100", "Kendra Mockingham", "Great. I'll call Pat about locking the seminar date. Tess, marketing?"),
    ("00:01:02.600", "00:01:08.400", "Tess Markwell", "The Q4 mailer is ready. I'll send it to the printer next week."),
    ("00:01:08.900", "00:01:12.700", "Kendra Mockingham", "Can it go sooner? The holiday mail rush is coming."),
    ("00:01:13.100", "00:01:15.600", "Tess Markwell", "Actually, I can do it Thursday."),
    ("00:01:16.000", "00:01:21.300", "Kendra Mockingham", "Thursday's great. And the listing presentation deck is getting stale."),
    ("00:01:21.800", "00:01:26.500", "Unknown Speaker", "I can redo the listing presentation deck by next Wednesday."),
    ("00:01:27.000", "00:01:28.900", "Kendra Mockingham", "Thanks, Tess. Luca?"),
    ("00:01:29.400", "00:01:49.900", "Luca Leadmore", "Two private things. Greg wants to talk about moving his split to 70/30. I told him we'd look at it after his numbers this quarter. And Paige told me she's going through a divorce, so she may need some grace this month."),
    ("00:01:50.400", "00:01:58.700", "Kendra Mockingham", "Understood. I'll meet with Greg about his split next week. Keep the Paige piece between us."),
    ("00:01:59.200", "00:02:06.500", "Kendra Mockingham", "Last thing: I'll approve the new photographer contract by Friday. Owen, send it to me today."),
    ("00:02:07.000", "00:02:08.800", "Owen Opsley", "Sending it after this."),
    ("00:02:09.300", "00:02:10.600", "Kendra Mockingham", "Thanks, all."),
]

GRANOLA_NOTES = """Agent Team Huddle
Wednesday, October 28, 2026, 11:00 AM Central Time
Attendees (calendar): Kendra Mockingham, Luca Leadmore, Nadia Fakeson, Greg Sampleman, Paige Testerton
Recorded by: Kendra Mockingham (Kendra and Luca in the conference room; Nadia, Greg and Paige on the call)

AI NOTES

Open houses
- Weekend open house schedule going out; Luca covering Sunday at Example Bluff

Pipeline
- Paige has a listing appointment at Example Pine
- Greg's buyers on Sample Ct are under contract

Reminders
- Q4 mailer goes to the printer Thursday; changes to Tess today

Action items
- Luca to send the open house schedule for the weekend
- Tess to send the Q4 mailer Thursday
- Kendra to send the updated commission disbursement form by Friday
"""

GRANOLA_TRANSCRIPT = [
    ("Microphone", "Morning, team. Quick huddle. Open houses this weekend: who's taking the schedule?"),
    ("System audio", "I can send the open house schedule out by tomorrow."),
    ("Microphone", "Thanks, Nadia. Luca, you'll staff Sunday?"),
    ("Microphone", "Yes, I've got Sunday at Example Bluff, one to four."),
    ("Microphone", "Paige, how's the Example Pine listing appointment looking?"),
    ("System audio", "Good. I'll send my CMA to Luca by Thursday for a once-over."),
    ("Microphone", "Perfect. Greg, your buyers on Sample Ct?"),
    ("System audio", "Under contract. The lender needs a fresh preapproval letter in the file, so I'll get it to Raj tomorrow."),
    ("Microphone", "Great. Reminder, Tess is sending the Q4 mailer to the printer Thursday, so get her any changes today."),
    ("Microphone", "And I'll get everyone the updated commission disbursement form by Friday."),
    ("System audio", "Quick question. My buyers asked whether the Example Bluff schools are good. What do I say?"),
    ("Microphone", "Point them to the school district's own site and let them decide. We talk about the house. Okay, that's it, have a great day."),
]


def zoom_vtt():
    lines = ["WEBVTT", "",
             "NOTE PRACTICE FILE: made-up example. Weekly Leadership Meeting, Wednesday, October 28, 2026, 9:00 AM Central Time. Zoom cloud recording audio transcript, saved as .txt.", ""]
    for i, (a, b, who, text) in enumerate(ZOOM, 1):
        lines += [str(i), f"{a} --> {b}", f"{who}: {text}", ""]
    return "\n".join(lines)


def granola_txt():
    lines = ["PRACTICE FILE: made-up example. Copied from Granola (notes and transcript).", "", GRANOLA_NOTES.strip(), "", "TRANSCRIPT", ""]
    for who, text in GRANOLA_TRANSCRIPT:
        lines += [f"{who}: {text}", ""]
    return "\n".join(lines)
