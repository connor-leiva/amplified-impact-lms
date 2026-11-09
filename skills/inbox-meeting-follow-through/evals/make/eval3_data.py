"""Eval 3: a Friday rollup for Bianca Fauxley (Pacific Time), Friday, October 30, 2026, 3:00 PM.

Made-up example. Outlook user with no connector: this week's earlier digests (Monday and Wednesday)
plus threads pasted from Outlook since Wednesday's pass. Planted: items done with proof, items that
slipped (one chased by a past client, one owed by an outside lender, one where the leader wasn't
copied so there's no proof either way), items still open, and two items repeated in both digests.
"""
from mailbox import d

B = "Bianca Fauxley <bianca@fauxleyhomes.example>"
HECTOR = "Hector Opsmith <hector@fauxleyhomes.example>"
LENA = "Lena Postwell <lena@fauxleyhomes.example>"
FELIX = "Felix Mockton <felix@fauxleyhomes.example>"
MAE = "Mae Closely <mae@fauxleyhomes.example>"
TEAM = "Fauxley Team <team@fauxleyhomes.example>"

DIGESTS = """PRACTICE FILE: made-up example. Two earlier daily passes from this week, saved from Claude into this project.

Team: Bianca Fauxley (Team Leader), Mae Closely (Transaction Coordinator), Ari Dialwell (ISA), Hector Opsmith (Operations), Lena Postwell (Marketing), Felix Mockton (Agent).

# Daily Pass, Monday, October 26, 2026

**Bottom line:** 3 items need you today. The most urgent is your Q4 goals promise to the team, due Wednesday. No high-risk emails.

## Your Promises
1. Send the team the Q4 team goals. Promised to the team Thursday, October 22 ("I'll send the Q4 goals by Wednesday"). Due Wednesday, October 28. Priority: High.
2. Send Gwen Pastly (past client) two roofer names. Promised Friday, October 23 ("I'll get you a couple of roofer names early next week"). Due Tuesday, October 27. Priority: Normal.

## Delegations
3. ISA (Ari Dialwell): website lead Dom Inquirely, asking about 44 Example Bluff Rd. Forward drafted for Ari to add the lead to Follow Up Boss and call. Source: "Website inquiry: 44 Example Bluff Rd," Sunday, October 25.

## Commitments From Meetings (Team Meeting, Monday, October 26)
| # | Commitment | Owner | Due | Timing words | Source |
|---|---|---|---|---|---|
| 4 | Submit the E&O insurance renewal paperwork | Hector Opsmith | Thu, Oct 29 | "by Thursday" | Team Meeting, 0:04:10 |
| 5 | Post the 44 Example Bluff Rd open house on the MLS and social | Lena Postwell | Fri, Oct 30 | "by Friday" | Team Meeting, 0:06:45 |
| 6 | Send the Sellmores the updated CMA | Felix Mockton | Tue, Oct 27 | "tomorrow" | Team Meeting, 0:09:30 |

## Waiting On Others
7. Seminar flyer from Sam Loanson (Example Valley Lending). Asked Friday, October 23. Due Wednesday, October 28. Not overdue.

Covered through: Monday, October 26, 2026, 6:55 AM Pacific. Sources: Outlook threads pasted by Bianca; Team Meeting transcript (Zoom). Gaps: none.

# Daily Pass, Wednesday, October 28, 2026

**Bottom line:** 4 items need you today. The most urgent is the Q4 goals promise, due today. No high-risk emails.

## Your Promises
1. Send the team the Q4 team goals. Due today, Wednesday, October 28. Priority: Urgent. (Carried from Monday.)
2. Send Gwen Pastly two roofer names. Overdue since Tuesday, October 27. Priority: High.
3. New: send Felix Mockton notes on his listing presentation. Promised Tuesday, October 27 ("I'll get you notes by Friday"). Due Friday, October 30. Priority: Normal.

## Commitments From Meetings (Ops Check-In, Tuesday, October 27)
| # | Commitment | Owner | Due | Timing words | Source |
|---|---|---|---|---|---|
| 4 | Order six new lockboxes | Hector Opsmith | Fri, Oct 30 | "by Friday" | Ops Check-In, 0:02:15 |

## Waiting On Others
5. Listing photos for 44 Example Bluff Rd from Example Photo Studio. Due Thursday, October 29. Not overdue.
6. Seminar flyer from Sam Loanson (Example Valley Lending). Due today, Wednesday, October 28.

Covered through: Wednesday, October 28, 2026, 6:58 AM Pacific. Sources: Outlook threads pasted by Bianca; Ops Check-In notes. Gaps: none.
"""

HEADER = [
    "PRACTICE FILE: made-up example. Every person, company, address and email in this file is fictional.",
    "",
    "Pasted from Outlook by Bianca Fauxley on Friday, October 30, 2026, 2:50 PM Pacific Time.",
    "Inbox and Sent Items since Wednesday, October 28, 2026, 7:00 AM. Times are Pacific Time.",
]

CONVERSATIONS = [
    {"subject": "Q4 Team Goals", "messages": [
        {"from": B, "to": TEAM, "date": d(2026, 10, 28, 16, 10), "attachments": "Q4_Team_Goals.pdf",
         "body": "Team, attached are our Q4 goals. We'll walk through them together Monday.\n\nBianca"}]},
    {"subject": "Roof leak", "messages": [
        {"from": "Gwen Pastly <gwen.pastly@mailbox.example>", "to": B, "date": d(2026, 10, 29, 9, 20),
         "subject": "Re: Roof leak",
         "body": "Hi Bianca, still hoping for those roofer names! Rain is coming Sunday.\n\nGwen"}]},
    {"subject": "E&O renewal submitted", "messages": [
        {"from": HECTOR, "to": B, "date": d(2026, 10, 29, 14, 0), "attachments": "EO_Renewal_Confirmation.pdf",
         "body": "The E&O renewal is submitted. Confirmation attached.\n\nHector"}]},
    {"subject": "Open house posted", "messages": [
        {"from": LENA, "to": B, "date": d(2026, 10, 30, 11, 0),
         "body": "The 44 Example Bluff Rd open house is posted on the MLS and our socials for Sunday, 1 to 4.\n\nLena"}]},
    {"subject": "Lockboxes ordered", "messages": [
        {"from": HECTOR, "to": B, "date": d(2026, 10, 30, 10, 15),
         "body": "Six lockboxes ordered, arriving Tuesday.\n\nHector"}]},
    {"subject": "Photos delivered: 44 Example Bluff Rd", "messages": [
        {"from": "Example Photo Studio <studio@examplephoto.example>", "to": B, "date": d(2026, 10, 29, 17, 5),
         "body": "Your photos for 44 Example Bluff Rd are delivered to your shared folder. Thanks for the business!"}]},
    {"subject": "Holiday card proof", "messages": [
        {"from": HECTOR, "to": B, "date": d(2026, 10, 29, 13, 0), "attachments": "Holiday_Card_Proof.pdf",
         "body": "Holiday card proof attached. Can you approve it?\n\nHector"},
        {"from": B, "to": HECTOR, "date": d(2026, 10, 29, 13, 30), "subject": "Re: Holiday card proof",
         "body": "Looks good at a glance. I'll approve the holiday card proof Monday after Lena weighs in.\n\nBianca"}]},
    {"subject": "December newsletter", "messages": [
        {"from": LENA, "to": B, "date": d(2026, 10, 30, 13, 0), "attachments": "December_Newsletter_Draft.pdf",
         "body": "Draft attached. Can you approve it by Monday so it goes out Tuesday?\n\nLena"}]},
    {"subject": "Listing presentation", "messages": [
        {"from": FELIX, "to": B, "date": d(2026, 10, 29, 16, 45), "subject": "Re: Listing presentation",
         "body": "Thanks again for watching my presentation Tuesday. Looking forward to your notes!\n\nFelix"}]},
    {"subject": "Settlement moved: 8 Example Fern Ct", "messages": [
        {"from": MAE, "to": B, "date": d(2026, 10, 30, 9, 0),
         "body": "FYI, settlement for 8 Example Fern Ct moved to Friday, November 6 at the lender's request. I've updated the file and told the agents.\n\nMae"}]},
    {"subject": "Example Realty Weekly", "messages": [
        {"from": "Example Realty Weekly <news@examplerealtyweekly.example>", "to": B, "date": d(2026, 10, 29, 8, 0),
         "body": "This week's news and tips."}]},
    {"subject": "Accepted: Monday Team Meeting", "messages": [
        {"from": LENA, "to": B, "date": d(2026, 10, 30, 12, 0), "body": "Lena Postwell has accepted this invitation."}]},
]
