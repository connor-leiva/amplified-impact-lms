"""Writes the practice files and the eval input files for ai-brain-tuneup. Every name, number, login and brokerage is made up.

python3 skills/ai-brain-tuneup/evals/make/make_files.py

Writes practice/ (four files: messy Project instructions, a stale 2025 plan, a current checklist and a memory write-out
with a conflict and one client's phone number), evals/files/eval-1-full-messy-workspace/ (five files, one of them a
PDF printed from evals/make/mockingdale-2025-plan.html with html_to_pdf.cjs) and evals/files/eval-2-style-conflict/
(four files: a mostly fine workspace whose custom style fights its instructions on tone).
"""
import subprocess
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
MAKE = SKILL / "evals" / "make"

PRACTICE = {
    "PRACTICE Project instructions, My Real Estate Assistant.md": """PRACTICE FILE: made-up example. Copied from the "Set project instructions" box of the Claude Project "My Real Estate Assistant" on November 9, 2026. Every name in it is made up.

# My Real Estate Assistant

You are my real estate assistant. I'm Jamie Testerson and I run the Testerson Home Team.

## How to write
- Be professional.
- Make my emails sound good.
- Keep everything short but thorough.
- Keep client emails under 100 words.
- Don't use emojis.
- Sign emails: Jamie Testerson, Testerson Home Team

## What I need help with
- When I paste a listing worksheet, write the MLS description and a social caption.
- Use the brand colors and logo from the brand file.
- Write follow-up notes in my CRM notes format.
- Always text new leads first, then email if they don't answer.
- Help me with whatever I need.
""",
    "PRACTICE Knowledge file, 2025 Business Plan.md": """PRACTICE FILE: made-up example. A knowledge file in the Claude Project "My Real Estate Assistant." Every name and number in it is made up.

# Testerson Home Team: 2025 Business Plan
Fakewood Realty Group
Prepared January 6, 2025

## 2025 Goals
- 30 closed transactions
- $210,000 in gross commission income
- 40% of closings from past clients and sphere
- Hire a second buyer's agent by June 30, 2025

## Team
- Jamie Testerson: team lead, listings
- Pat Placeholder: buyer's agent
- Jordan Notreal: transaction coordinator. Jordan handles all listing paperwork and sends every DocuSign.

## Where We Work
- Kaysville and Layton, mostly move-up sellers

## Marketing
- A postcard every month to the Example Hills farm (about 400 homes)
- An open house every weekend we have a listing
""",
    "PRACTICE Knowledge file, Listing Launch Checklist Oct 2026.md": """PRACTICE FILE: made-up example. A knowledge file in the Claude Project "My Real Estate Assistant." Every name in it is made up.

# Listing Launch Checklist
Testerson Home Team, Placeholder Peak Realty
Updated October 14, 2026

## Before Photos
1. Casey Mockwell opens the transaction file and sends the listing agreement for signatures.
2. Jamie walks the home with the seller and sets the photo date.
3. The seller prep list goes out the same day.

## Launch
4. Photos and floor plan come back within 48 hours.
5. Jamie writes the MLS description. Casey checks the MLS sheet against the listing agreement.
6. The coming soon sign goes up only after the listing agreement is signed.
7. Every listing ad and social post says "Brokered by Placeholder Peak Realty."

## After Launch
8. Seller update every Monday by email.
9. Open house the first weekend, if the seller agrees.
""",
    "PRACTICE Claude memory, written out Nov 9 2026.txt": """PRACTICE FILE: made-up example. Every name and number in it is made up.

What I asked, in a chat inside the Claude Project "My Real Estate Assistant" on November 9, 2026:
"Write out your memories of me verbatim, exactly as they appear in your memory."

What Claude wrote back:

Here is everything in my memory about you, word for word.

Work and role
- Jamie Testerson is a Realtor who leads the Testerson Home Team in Davis County, Utah.
- In March 2026, Jamie moved the team from Fakewood Realty Group to Placeholder Peak Realty.
- The team is Jamie, Pat Placeholder (buyer's agent) and Casey Mockwell (transaction coordinator since August 2026).
- Jordan Notreal left the team in August 2026.
- Jamie uses Follow Up Boss as the team's CRM.

Preferences
- Jamie likes long, detailed client emails that walk through every comp and every number.
- Jamie writes MLS descriptions under 900 characters.
- Jamie doesn't like exclamation points in client emails.

Goals
- Jamie's goal for the year is 30 closings.

Clients and current work
- Jamie is listing the Mockridge home on Sample Creek Lane in Kaysville. The seller, Alex Mockridge, prefers texts after 5 PM at 801-555-0147.
- Jamie is helping buyers Sam and Lee Exampleton look in Layton under $550,000.
""",
}

EVAL1 = {
    "Project instructions, Mockingdale Team Ops.txt": """PRACTICE FILE: made-up example. Copied from the "Set project instructions" box of the Claude Project "Mockingdale Team Ops" on November 9, 2026. Every name, login and number in it is made up.

You help me run The Mockingdale Group, a team of 9 agents in Mesa, Gilbert and Chandler, Arizona. I'm Avery Mockingdale, the team leader. Reese Exampleworth is our operations manager.

WEEKLY AGENT UPDATE
Send the weekly agent update on Mondays.
Use best practices.
Write agent updates as short paragraphs, no bullet points.
Be fun but professional.
Include the pipeline numbers from the Sisu dashboard screenshot I paste.

RECRUITING
When I paste a recruit's production, write a recruiting text to them right away.
Keep it tight.

SYSTEMS
Our CRM is Follow Up Boss. Admin login for automations: ops@mockingdalegroup.example, password Gilbert#Sunrise25
Taylor Fakeman handles every file from contract to close.

LISTING POSTS
Never mention schools in listing posts.
""",
    "Instructions for Claude, copied from Settings.txt": """PRACTICE FILE: made-up example. Copied from Settings > Your Claude > Instructions on November 9, 2026. Every name in it is made up.

I'm Avery Mockingdale. I lead a real estate team at Imaginary Oaks Realty.
Always answer in bullet points.
Keep it under 150 words.
""",
    "Knowledge, Lead Routing and Pond Rules Sep 2026.md": """PRACTICE FILE: made-up example. A knowledge file in the Claude Project "Mockingdale Team Ops." Every name in it is made up.

# Lead Routing and Pond Rules
The Mockingdale Group, Sample Summit Realty
Updated September 8, 2026

## Routing
- New online leads go to the agent on the round robin in Follow Up Boss.
- Sphere referrals go to the agent who knows the person.
- Text a new lead only when the lead form's texting box is checked.

## Pond
- A lead with no logged contact for 10 days goes to the pond.
- Reese Exampleworth approves every pond reassignment.

## Files
- Under-contract files go to Jules Sampleberg, our transaction coordinator.
""",
    "Memory topics, copied from Settings.txt": """PRACTICE FILE: made-up example. Copied from Settings > Your Claude > Manage (next to Your memory) > Topics on November 9, 2026, one topic at a time. Every name and number in it is made up.

Topic: Avery's team
- Avery Mockingdale leads The Mockingdale Group, 9 agents in Mesa, Gilbert and Chandler.
- The team moved from Imaginary Oaks Realty to Sample Summit Realty in May 2026.

Topic: Operations
- Reese Exampleworth is the operations manager.
- Taylor Fakeman stopped doing transaction coordination in July 2026. Jules Sampleberg is the new transaction coordinator.
- The weekly agent update now goes out on Thursdays, after the Wednesday team meeting.

Topic: Writing
- Avery wants agent updates to open with the week's wins.
- Avery likes a joke in agent updates now and then.

Topic: Recruiting
- Avery is recruiting Drew Pretendson from Pretend Peak Realty. Drew's cell is 480-555-0182 and personal email is drew.pretendson@example.com.

Topic: Clients
- The Fakeland closing on Example Mesa Drive is set for November 20, 2026.
""",
}

PLAN_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Mockingdale Group 2025 Goals and Team Plan</title>
<style>
  body { font-family: Georgia, serif; font-size: 12px; color: #222; margin: 0; }
  .practice { color: #a00; font-weight: bold; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 12px; }
  h1 { font-size: 22px; margin: 0; }
  .brokerage { font-size: 14px; color: #555; margin: 2px 0; }
  .doc { font-size: 15px; margin: 6px 0 2px; }
  .prepared { color: #666; margin-bottom: 14px; }
  h2 { font-size: 14px; border-bottom: 1px solid #bbb; padding-bottom: 2px; margin: 16px 0 6px; }
  ul { margin: 0; padding-left: 18px; }
  li { margin: 3px 0; }
</style>
</head>
<body>
<div class="practice">PRACTICE FILE: made-up example. A knowledge file in the Claude Project "Mockingdale Team Ops." Every name and number in it is made up.</div>
<h1>The Mockingdale Group</h1>
<div class="brokerage">Imaginary Oaks Realty</div>
<div class="doc">2025 Goals and Team Plan</div>
<div class="prepared">Prepared December 12, 2024 by Avery Mockingdale</div>

<h2>2025 Team Goals</h2>
<ul>
  <li>96 closings</li>
  <li>$1,150,000 team GCI</li>
  <li>Grow to 10 agents by the end of 2025</li>
  <li>25% of closings from the team's own lead generation</li>
</ul>

<h2>Team and Roles</h2>
<ul>
  <li>Avery Mockingdale: team leader</li>
  <li>Reese Exampleworth: operations manager</li>
  <li>Taylor Fakeman: transaction coordinator, every file from contract to close</li>
  <li>Agents: 9 (names on the roster tab)</li>
</ul>

<h2>Weekly Rhythm</h2>
<ul>
  <li>Wednesday 9:00 AM team meeting</li>
  <li>Monday 9:00 AM weekly agent update email</li>
  <li>Friday pipeline review with Reese</li>
</ul>

<h2>Earnest Money</h2>
<ul>
  <li>Agents send buyers the team trust account for earnest money: Example Desert Bank, routing 000111222, account 3344556677.</li>
</ul>

<h2>Lead Sources (2024 results)</h2>
<ul>
  <li>Sphere and past clients: 31 closings</li>
  <li>Online leads: 22 closings</li>
  <li>Open houses: 9 closings</li>
</ul>
</body>
</html>
"""

EVAL2 = {
    "Project instructions, Listing Writer.md": """PRACTICE FILE: made-up example. Copied from the "Set project instructions" box of the Claude Project "Listing Writer" on November 9, 2026. Every name and number in it is made up.

# Listing Writer

I'm Quinn Exampleberg, a listing agent with Pretend Pines Realty in St. George, Utah. Most of my sellers are in Washington County.

## Jobs
- When I paste a listing worksheet, write MLS public remarks under 1,000 characters, a headline and one Instagram caption.
- When I paste showing feedback, draft the weekly seller update email.
- Seller updates go out every Friday.

## How to write
- Write in a formal tone for all client emails.
- Use numerals for prices and square footage.
- Sign client emails: Quinn Exampleberg, Pretend Pines Realty

## My voice
QUICK CARD
Write as me. I'm Quinn, a listing agent in St. George who tells sellers the truth, kindly.
1. Lead with the one thing the seller needs to know.
2. Short sentences. One idea each.
3. Exact numbers: $489,000, not "under 500."
4. Name the next step and the day it happens.
5. No hype words: stunning, nestled, boasts, dream home.
6. At most one question, at the end.
7. Plain words over real estate jargon.
8. Never invent a number, a date or a buyer's comment.
Never: em dashes, exclamation points, emoji.
Facts: if I didn't give it to you, write [VERIFY] and ask.

## Rules
- Drafts only. Never send or post anything for me.
- Fair housing: describe the home, never the people who might live there. No schools, safety or "perfect for families."
- Only draft a text to a seller who told me texting is okay, and end marketing texts with "Reply STOP to opt out."
""",
    "Custom style, Quinn Casual.txt": """PRACTICE FILE: made-up example. Copied from the custom style "Quinn Casual" on November 9, 2026, by opening the style and copying its instructions.

Always write in a casual tone.
Use contractions, first names and short, friendly sentences, like a text to a neighbor.
Skip formal greetings like "Dear" and formal sign-offs like "Sincerely."
""",
    "Knowledge, Seller Update Template 2026.md": """PRACTICE FILE: made-up example. A knowledge file in the Claude Project "Listing Writer." Every name in it is made up.

# Weekly Seller Update Template
Pretend Pines Realty, updated August 3, 2026

Subject: [Address]: Your Week [Number] Update

[Seller First Name],

This week: [showings] showings and [online views] online views.

What buyers said: [two or three lines of feedback, as written].

What I suggest next: [one step, with the day].

Quinn Exampleberg, Pretend Pines Realty
""",
    "Claude memory, written out.txt": """PRACTICE FILE: made-up example. Every name and number in it is made up.

What I asked, in a chat inside the Claude Project "Listing Writer" on November 9, 2026:
"Write out your memories of me verbatim, exactly as they appear in your memory."

What Claude wrote back:

- Quinn Exampleberg is a listing agent with Pretend Pines Realty in St. George, Utah.
- Quinn's transaction coordinator is Rory Fakewell.
- Quinn sends seller updates on Fridays.
- Quinn likes MLS remarks that open with the view or the lot.
- Quinn uses Follow Up Boss.
- Quinn is listing the Sampleton home on Example Bluff Drive. The seller, Kit Sampleton, wants calls only, at 435-555-0193.
""",
}


def write(folder, files):
    folder.mkdir(parents=True, exist_ok=True)
    for name, text in files.items():
        (folder / name).write_text(text, encoding="utf-8")
        print("wrote", (folder / name).relative_to(SKILL))


def main():
    write(SKILL / "practice", PRACTICE)
    e1 = SKILL / "evals" / "files" / "eval-1-full-messy-workspace"
    write(e1, EVAL1)
    html = MAKE / "mockingdale-2025-plan.html"
    html.write_text(PLAN_HTML, encoding="utf-8")
    pdf = e1 / "Knowledge, Mockingdale 2025 Goals and Team Plan.pdf"
    subprocess.run(["node", str(MAKE / "html_to_pdf.cjs"), str(html), str(pdf), "PRACTICE FILE: made-up example"], check=True)
    print("wrote", pdf.relative_to(SKILL))
    write(SKILL / "evals" / "files" / "eval-2-style-conflict", EVAL2)


if __name__ == "__main__":
    main()
