"""Writes the made-up practice files and eval case 2's files for team-ai-brain.

python3 skills/team-ai-brain/evals/make/make_files.py
node skills/team-ai-brain/evals/make/html_to_pdf.cjs skills/team-ai-brain/evals/make/listing-launch-sop.html \
  "skills/team-ai-brain/practice/PRACTICE 03 SOP Listing Launch, printed.pdf" "PRACTICE FILE: made-up example"

Every team, person, brokerage, portal, street, phone number and account number in these files is made up. Phone
numbers use the 555-01xx range set aside for fiction; account numbers are zeros and a counting pattern.

Planted for the skill to find (the practice set, eval 1):
- conflicts: the first call on HomeFinder Example leads (ISA within 5 minutes, SOP 02 step 1, against the next agent
  on the buyer rotation with 10 minutes to claim, Lead Flow 09) and the pond (after day 7, SOP 02 step 6, against 14
  days with no logged contact, Lead Flow 09 rule 2); the call script's "Send a text right after the voicemail"
  against the texting consent house line, SOP 02 step 4 and the compliance notes
- client and personal data to leave out: seven team cell numbers (roles list), a client name tied to a listing and a
  lockbox code (listing launch PDF), escrow account and routing numbers and a client file name, and a client's name,
  phone and address in an example post (handoff SOP), and a lead's name, email, phone and address (lead flow)
- a fair housing line to leave out and send to the broker (buyer consult SOP step 4)
- gaps: who approves listing posts, the lender list, the Photo Day Checklist, the New Lead Intro email
- stale: the under contract handoff SOP (March 4, 2024)
- Utah: the brand guide's brokerage-name line (R162-2f-401h) and the broker's Sunday request (house practice,
  Utah Code 13-25a-111)

Eval case 2 (thin set): a roles list and one SOP, Boise, Idaho (general mode), the SOP dated May 2, 2025 (stale), with
a text step that doesn't mention consent.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1].parent
PRACTICE = SKILL / "practice"
CASE2 = SKILL / "evals" / "files" / "case-2"
MARK = "PRACTICE FILE: made-up example. Kettle Creek Example Team and Sample Summit Realty are made up, and so is every name, street and number in this file."

FILES = {
    "PRACTICE 01 Roles List, Kettle Creek Example Team.md": f"""{MARK}

# Kettle Creek Example Team: Roles List

Sample Summit Realty (a made-up brokerage), Lehi, Utah
Owner: Juniper Testwell, Team Leader. Last updated: October 1, 2026

| Role | Name | Owns | Cell |
|---|---|---|---|
| Team Leader | Juniper Testwell | Team standards and the brand guide, agent coaching, the buyer rotation, final say on lead routing | 801-555-0142 |
| Operations Manager | Marlo Fakerson | Follow Up Boss setup and lead flow, SOPs, listing launch, Do Not Call scrubs | 801-555-0177 |
| Inside Sales Agent (ISA) | Dex Placeholder | First calls to new online leads, setting buyer consults | 801-555-0119 |
| Buyer's Agent | Rory Samplewood | Buyer consults, showings, offers | 801-555-0163 |
| Buyer's Agent | Tamsin Notreal | Buyer consults, showings, offers | 801-555-0128 |
| Listing Agent | Wren Examplar | Listing appointments, listing remarks, seller updates | 801-555-0185 |
| Transaction Coordinator | Ollie Madeup | Under contract to closing: deadlines, title and lender updates | 801-555-0134 |

## Team Channels (Slack)

- #kc-leads: new lead alerts and appointment posts
- #kc-transactions: everything from mutual acceptance to closing
- #kc-marketing: social posts, flyers and brand questions

## Questions That Go Outside the Team

- Contracts, legal and compliance: Sample Summit Realty's principal broker. Agents send these through Juniper.
- Loans: the buyer's lender.
""",
    "PRACTICE 02 SOP New Online Lead Response.md": f"""{MARK}

# SOP: New Online Lead Response

Kettle Creek Example Team. Owner: Marlo Fakerson, Operations Manager. Last updated: August 12, 2026

## Purpose

Every new online lead gets a real conversation fast, and every touch is in Follow Up Boss.

## Steps

1. The ISA calls every new online lead within 5 minutes of the Follow Up Boss alert, from 8 a.m. to 8 p.m.
2. Leads that come in after 8 p.m. get their first call at 8 a.m. the next morning.
3. No answer: leave the voicemail from the Online Buyer Lead call script, then send the "New Lead Intro" email from Follow Up Boss.
4. Text only if the lead has the "Text OK" tag in Follow Up Boss. No tag, no text.
5. Call attempts: day 1 (two calls), day 2, day 4 and day 7.
6. After day 7 with no conversation, move the lead to the Kettle Creek Pond.
7. When the ISA sets a buyer consult, assign the lead to the next agent on the buyer rotation, change the stage to Appointment Set, and post the consult time in #kc-leads.
8. Log every call, text and email in Follow Up Boss the same day.

## Never

- Never ask a lead for a Social Security number, bank details or account numbers. Lenders collect those.
- Never promise a showing before the buyer agreement is signed (see the Buyer Consult SOP).
""",
    "PRACTICE 04 SOP Buyer Consult and Agreement.md": f"""{MARK}

# SOP: Buyer Consult and Buyer Agreement

Kettle Creek Example Team. Owner: Juniper Testwell, Team Leader. Last updated: September 8, 2026

1. Every buyer gets a consult, in person at the Lehi office or on video, before the first showing.
2. Sign the Kettle Creek buyer agreement at the consult. No showing, in person or live video, until it is signed.
3. Confirm preapproval, or give the buyer three lender names from the team's lender list. Never call one lender "the best."
4. Ask about their family so you can suggest neighborhoods with the right schools.
5. Send the consult recap email the same day.
6. Set up the buyer's search in Follow Up Boss and change the stage to Active Client.
""",
    "PRACTICE 05 SOP Under Contract Handoff.md": f"""{MARK}

# SOP: Under Contract Handoff

Kettle Creek Example Team. Owner: Ollie Madeup, Transaction Coordinator. Last updated: March 4, 2024

1. The agent posts in #kc-transactions within 1 hour of mutual acceptance.
2. The agent uploads the signed contract and every addendum to the transaction folder the same day.
3. The TC sends the intro email to the clients, the lender and title within 1 business day.
4. Earnest money: the TC confirms with title that it arrived by the contract deadline. Wire instructions come only from the title company. For the Crestline Example file, title's escrow account was 000111222, routing 000000000.
5. The TC puts every contract deadline on the shared transactions calendar.
6. Change the stage to Under Contract in Follow Up Boss. After funding, change it to Closed.

Example handoff post: "Buyer Priya Fictionale, 801-555-0190, 77 S Makebelieve Ln, mutual acceptance today, closing in 30 days."
""",
    "PRACTICE 06 Call Script, Online Buyer Lead.md": f"""{MARK}

# Call Script: Online Buyer Lead

Kettle Creek Example Team. Owner: Dex Placeholder, ISA. Last updated: July 20, 2026

## Opening

"Hi, is this {{first name}}? This is {{your name}} with the Kettle Creek Team at Sample Summit Realty. You asked about {{address}} on {{lead source}}. Do you have a minute?"

## Questions

1. "What got you looking at {{address}}?"
2. "When are you hoping to move?"
3. "Have you talked with a lender yet?"
4. "Are you working with an agent already?" If yes: thank them and end the call. No pitch.

## Setting the Consult

"The easiest next step is a 20-minute consult, at our Lehi office or on video. Does Tuesday or Wednesday work better?"

## Voicemail

"Hi {{first name}}, it's {{your name}} with the Kettle Creek Team at Sample Summit Realty, calling about {{address}}. Call me back at {{your number}} when it suits you. Talk soon."

## If They Don't Answer

Send a text right after the voicemail.
""",
    "PRACTICE 07 Brand Guide.md": f"""{MARK}

# Kettle Creek Example Team Brand Guide

Owner: Juniper Testwell, Team Leader. Last updated: January 15, 2026

## Must (Everyone, Everything)

1. Our name is "Kettle Creek Team." Never "KC Team" or "Kettle Creek Realty."
2. "Sample Summit Realty" appears on every ad, post, flyer, listing and email signature.
3. Email signature: your name, then "Kettle Creek Team | Sample Summit Realty", then your phone number, then "Licensed in Utah".
4. Describe homes, never people. No "perfect for families," no school or safety claims.
5. Never write "dream home," "stunning," "won't last long" or "don't hesitate to reach out."
6. Every listing post is approved in #kc-marketing before it goes up.

## Our Voice (The Team Default; Your Own Voice Can Change These)

- Warm, plain and short. One idea per paragraph.
- We say "home," not "house."
- First names. Sign off with your first name.
- Emoji are fine on social posts, never in client emails.
""",
    "PRACTICE 08 Compliance Notes from Broker Training.md": f"""{MARK}

# Compliance Notes from Broker Training

Juniper's notes from Sample Summit Realty's broker training. Owner: Juniper Testwell. Last updated: September 22, 2026

- Texts: only to people with the "Text OK" tag in Follow Up Boss. We add the tag only when the lead form or the person said yes to texts in writing. A phone number is not permission.
- Quiet hours: no calls or texts before 8 a.m. or after 8 p.m., in the lead's time zone.
- STOP means stop: add the "Do Not Text" tag right away and tell Marlo.
- Do Not Call: Marlo scrubs our call lists against the National Do Not Call Registry every month.
- Wire fraud: we never send wire instructions, never ask for account numbers, and never forward wiring details. Clients call the title company at a number they look up themselves.
- Advertising: "Sample Summit Realty" on everything (see the brand guide).
- Sundays: the broker asked us not to cold call on Sundays.
""",
    "PRACTICE 09 Follow Up Boss Lead Flow.md": f"""{MARK}

# How Leads Flow in Follow Up Boss

Kettle Creek Example Team. Owner: Marlo Fakerson, Operations Manager. Last updated: October 20, 2026

## Lead Sources (Admin > Lead Flow)

| Lead source | Where it comes from | Assigned to | Action plan |
|---|---|---|---|
| Website (IDX) | Our team website | Dex Placeholder (ISA) | New Website Lead |
| HomeFinder Example | A made-up home search portal | The next agent on the buyer rotation. The agent has 10 minutes to claim it, then it goes to the next agent | Portal Buyer |
| Open House Sign-In | Sample SignIn App | The hosting agent | Open House Visitor |
| Sphere and Referral | Added by hand | The agent who adds it | None |

## Stages

Lead, Attempted Contact, Spoke With, Appointment Set, Active Client, Under Contract, Closed, Nurture, Past Client, Trash

## Tags

- Text OK: consent to texts on file
- Do Not Text
- Do Not Call

## Rules

1. Every new lead gets a stage the same day it arrives.
2. A lead with no logged contact for 14 days goes to the Kettle Creek Pond, where any agent can claim it.
3. Agents never delete a lead. Wrong or fake leads go to Trash.

## Training Example

New lead from HomeFinder Example: Jordan Pemberfake, jordan.pemberfake@example.com, 801-555-0101, asked about 1482 W Pretend Hollow Dr, Lehi.
""",
}

CASE2_MARK = "PRACTICE FILE: made-up example (eval case 2). Brambleton Example Group and Placeholder Peak Realty are made up, and so is every name in this file."

CASE2_FILES = {
    "Brambleton roles list.csv": f"""{CASE2_MARK}
Role,Name,What they own
Team Lead,Casey Fakeworth,Team standards; hiring; final say on who works which lead
Operations Coordinator,Pat Exampleton,Follow Up Boss; showing schedule; SOPs
Buyer Agent,Lou Testerly,Buyer consults and showings
Buyer Agent,Mina Sampleford,Buyer consults and showings
Buyer Agent,Ari Notaperson,Buyer consults and showings
Listing Agent,Sol Madeupson,Listings and seller updates
Showing Assistant,Bea Placeholdia,Confirms showings and collects feedback
""",
    "Showing SOP (Google Doc download).txt": f"""{CASE2_MARK}

Brambleton Example Group, Placeholder Peak Realty, Boise, Idaho
SOP: Booking and Running Showings
Owner: Pat Exampleton, Operations Coordinator
Last updated: May 2, 2025

1. Before any showing, the buyer agreement is signed. No exceptions.
2. Request every showing in ShowingTime at least 24 hours ahead.
3. Text the buyer the showing schedule the night before.
4. Bea confirms each showing the morning of.
5. Leave feedback for the listing agent within 24 hours.
6. Log each showing in Follow Up Boss as an appointment.
7. Never share lockbox codes in a text or email. They come through ShowingTime only.
""",
}


def main():
    PRACTICE.mkdir(exist_ok=True)
    CASE2.mkdir(parents=True, exist_ok=True)
    for name, text in FILES.items():
        (PRACTICE / name).write_text(text, encoding="utf-8")
    for name, text in CASE2_FILES.items():
        (CASE2 / name).write_text(text, encoding="utf-8")
    for t in list(FILES.values()) + list(CASE2_FILES.values()):
        assert chr(0x2013) not in t and chr(0x2014) not in t
    print(f"wrote {len(FILES)} practice files and {len(CASE2_FILES)} case 2 files; print the PDF with html_to_pdf.cjs")


if __name__ == "__main__":
    main()
