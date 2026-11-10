"""Writes the made-up inputs for open-house-follow-up: the practice set and the two eval cases.

Run from anywhere:  python3 skills/open-house-follow-up/evals/make/make_files.py

Every person, brokerage, lender, street and email here is made up (emails use example.com, .net and .org; phone
numbers use 555-01xx). Each file says so on its first line. The shapes follow what an agent actually has after an
open house (checked 2026-11-10, sources in references/open-house-guide.md):
- A sign-in app export: one row per sign-in, with the questions on the sign-in form as columns.
- A Google Form used as a sign-in sheet: "Download responses (.csv)" gives a Timestamp column and each question's
  full wording as its column name, so the consent checkbox arrives as a long sentence.
- A paper sheet the agent typed up, with notes underneath.
- The agent's own notes, typed on a phone after the open house.
"""
import csv
import io
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
PRACTICE = SKILL / "practice"
FILES = SKILL / "evals" / "files"
MARK = "PRACTICE FILE: made-up example"


def write_csv(path, header, rows):
    buf = io.StringIO()
    buf.write(MARK + "\n")
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(header)
    w.writerows(rows)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(buf.getvalue(), encoding="utf-8")


def write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(MARK + "\n\n" + text.strip() + "\n", encoding="utf-8")


# --- Practice: a sign-in app export and the listing agent's notes (Sandy, Utah; Sunday, November 8, 2026) ---------

APP_HEADER = ["Property", "Sign-In Date", "Sign-In Time", "First Name", "Last Name", "Email", "Phone",
              "Working With An Agent?", "Agent Name", "Timeframe", "Consent To Text"]
P = "2468 Sample Aspen Ln"
D = "2026-11-08"
PRACTICE_ROWS = [
    [P, D, "1:04 PM", "Morgan", "Exampleton", "morgan.exampleton@example.com", "(801) 555-0142", "No", "", "0-3 Months", "Yes"],
    [P, D, "1:11 PM", "Quinn", "Placeholder", "quinn.placeholder@example.com", "(801) 555-0157", "Yes", "Taylor Samplewood", "3-6 Months", "Yes"],
    [P, D, "1:18 PM", "Sam", "Fictional", "sam.fictional@example.net", "(385) 555-0119", "No", "", "6-12 Months", "No"],
    [P, D, "1:26 PM", "Jordan", "Testwell", "jordan.testwell@example.org", "", "", "", "", ""],
    [P, D, "1:33 PM", "Casey", "Mockwood", "casey.mockwood@example.com", "(801) 555-0136", "No", "", "0-3 Months", "Yes"],
    [P, D, "1:41 PM", "Sage", "Sampleford", "sage.sampleford@example.com", "(801) 555-0164", "Yes", "Drew Fakeman", "3-6 Months", "No"],
    [P, D, "1:52 PM", "Jamie", "Pretendo", "jamie.pretendo@example.net", "(801) 555-0128", "No", "", "3-6 Months", "No"],
    [P, D, "2:06 PM", "Lee", "Samplesmith", "lee.samplesmith@example.com", "(801) 555-0175", "No", "", "Just Looking", "Yes"],
    [P, D, "2:19 PM", "Blake", "Fakington", "", "(385) 555-0181", "No", "", "0-3 Months", "No"],
    [P, D, "2:33 PM", "Kendall", "Mockingham", "kendall.mockingham@example.org", "", "No", "", "6-12 Months", "Yes"],
    [P, D, "2:47 PM", "Morgan", "Exampleton", "morgan.exampleton@example.com", "(801) 555-0142", "No", "", "0-3 Months", "Yes"],
]

PRACTICE_NOTES = """
Open house notes: 2468 Sample Aspen Ln, Sandy
Sun Nov 8, 1 to 3. Listed at $599,000. Sellers: Robin and Kerry Testcase.

Busy one. I counted about 12 groups, a couple didn't sign in.

General
- Everyone loved the kitchen island and the light in the front room.
- Backyard got a lot of comments, people liked the garden boxes.
- Two groups said the second bedroom is small.
- A few asked about the HOA fee and what it covers. Need to get that from Robin and Kerry.
- One person asked how old the furnace is. Don't know, ask sellers.
- One visitor said the price seemed high for the square footage.

People
- Morgan Exampleton: came back a second time with their sister. Loved the kitchen. Asked about the HOA fee and what it covers. Told Morgan I'd send it by Monday.
- Quinn Placeholder: has an agent, Taylor Samplewood. Asked how old the water heater is. Told Quinn I'd get it to Taylor.
- Sam Fictional: first open house, just starting. Liked the backyard. Asked how the buying process works. Offered to send my buyer guide.
- Jordan Testwell: quick walk through, didn't talk much.
- Casey Mockwood: nice young family, would be perfect for them, elementary is right around the corner. Wants a second look Tuesday evening. Asked about the roof, sellers said 2019.
- Sage Sampleford: working with Drew Fakeman. Said the second bedroom felt small.
- Jamie Pretendo: older couple, worried about the stairs to the main bedroom. Asked if it's a lot of families around here, I said I can't speak to that and pointed them to the city website. Liked the trail access out back.
- Lee Samplesmith: lives two streets over on Sample Birch Way. Curious. Asked what their place might be worth. Offered to send recent sales on their street this week.
- Blake Fakington: asked if the HOA allows an RV in the driveway.
- Kendall Mockingham: liked the garden boxes. Wants to know if the washer and dryer stay.

Me
- Promised Robin and Kerry a recap Sunday night.
- Honestly think we drop to 589 if nothing by next weekend.
"""

# --- Eval 1: a Google Form export and a teammate's notes (Mesa, Arizona; Tuesday, November 10, 2026, twilight) -----

FORM_HEADER = [
    "Timestamp", "Full name", "Email address", "Phone number", "Are you working with a real estate agent?",
    "If yes, who is your agent?", "When are you hoping to buy?",
    "Text me about this home and others like it. I agree to receive text messages from Harper Mockley, Example "
    "Desert Realty, at the number above. Consent is not a condition of purchase. Msg and data rates may apply. "
    "Reply STOP to opt out.",
]
EVAL1_ROWS = [
    ["11/10/2026 16:36:12", "Ellis Testington", "ellis.testington@example.com", "480-555-0143", "No", "", "1-3 months", "I agree"],
    ["11/10/2026 16:41:55", "Rowan Sampleberg", "rowan.sampleberg@example.net", "480-555-0152", "Yes", "Kim Notreal, Sample Sun Realty", "3-6 months", "I agree"],
    ["11/10/2026 16:50:03", "Parker Fakeworth", "parker.fakeworth@example.org", "602-555-0117", "Not yet", "", "6+ months", ""],
    ["11/10/2026 17:02:40", "Sydney Examplar", "sydney.examplar@example.com", "", "Yes", "my cousin", "Just looking", ""],
    ["11/10/2026 17:15:21", "Charlie Mockford", "charlie.mockford@example.com", "", "No", "", "1-3 months", "I agree"],
    ["11/10/2026 17:28:09", "Devon Placeholder-Smith", "devon.placeholdersmith@example.net", "480-555-0168", "No", "", "3-6 months", ""],
    ["11/10/2026 17:44:30", "Reese Fictionalis", "reese.fictionalis@example.com", "480-555-0129", "", "", "3-6 months", "I agree"],
    ["11/10/2026 18:10:47", "Rowan Sampleberg", "rowan.sampleberg@example.net", "480-555-0152", "Yes", "Kim Notreal", "3-6 months", "I agree"],
]

EVAL1_NOTES = """
Twilight open house for Jesse, 8135 E Placeholder Palm Dr, Mesa. Tue 11/10, 4:30 to 6:30.
Maybe 9 or 10 groups total.

Overall: pool was the big hit. Kitchen too. Couple people said the backyard is small past the pool. Two asked about the HOA fee. One guy said the price seems high compared to the one on Sample Mesa Ct that sold for 489.

Ellis Testington: young couple, baby on the way, perfect for them since the elementary is right there. Loved the pool, asked if it has a fence or a safety cover. Asked about the HOA fee. I said I'd send HOA docs tomorrow.
Rowan Sampleberg: has an agent, Kim. Asked if the sellers would leave the patio furniture.
Parker Fakeworth: just starting, renting now. Liked the open floor plan. Wants to know how much they'd need to get preapproved, I said I'd connect them with Sam Lendwell at Example Home Loans.
Sydney Examplar: said her cousin is an agent but they haven't signed anything. Asked if the sellers would carry financing.
Charlie Mockford: liked the kitchen, thinks the bedrooms are small. Wants a second showing Thursday after 5.
Devon Placeholder-Smith: said "a lot of Spanish-speaking families moving in" like it was a bad thing. I changed the subject. Asked about the age of the AC.
Reese Fictionalis: asked about the solar panels, are they leased and does the lease transfer. Told Reese I'd find out from Jesse by Friday.

Note to self: honestly Jesse should drop it 10k.
"""

# --- Eval 2: a paper sheet the agent typed up, with notes (Lehi, Utah; Saturday, November 7, 2026) -------------------

EVAL2_LIST = """
Open house Sat 11/7, 11 to 1, 975 Example Orchard Ct, Lehi
Sellers: Lane and Jo Pretenda

Sign-in sheet (typed from the paper one):
1. Pat Mockridge, pat.mockridge@example.com, 801-555-0171, buying in the spring
2. Sky Testerson, sky.testerson@example.net, 801-555-0186, has an agent: Morgan Fakeley, Sample Summit Homes
3. Lou Samplewright, lou.samplewright@example.com, 385-555-0188, just looking
4. Frankie Placeholder, frankie.placeholder@example.org, 801-555-0104
5. Dale Notaname, 801-555-0193 (no email)

My notes:
Five groups, all signed in. Everyone liked the big yard. Two thought the kitchen was dated. Pat asked about the sprinkler system, whether it's on a timer. Sky asked about the HOA. Frankie wants to see it again next week and asked if the sellers would consider a rent-back. Lou didn't say much. Dale asked if the basement is finished.
"""


def main():
    write_csv(PRACTICE / "PRACTICE Open House Sign-Ins, 2468 Sample Aspen Ln, 2026-11-08.csv", APP_HEADER, PRACTICE_ROWS)
    write_text(PRACTICE / "PRACTICE Open house notes, Sample Aspen, Sun Nov 8.txt", PRACTICE_NOTES)

    d1 = FILES / "eval-1-form-export-teammate-listing"
    write_csv(d1 / "Open House Sign-In, 8135 E Placeholder Palm (Responses).csv", FORM_HEADER, EVAL1_ROWS)
    write_text(d1 / "Harper notes, Placeholder Palm twilight open house.txt", EVAL1_NOTES)

    d2 = FILES / "eval-2-typed-list-no-consent"
    write_text(d2 / "Typed sign-in sheet and notes, 975 Example Orchard Ct.txt", EVAL2_LIST)
    print("wrote the practice set and the two eval cases")


if __name__ == "__main__":
    main()
