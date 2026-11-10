"""Writes the made-up inputs for speed-to-lead-reply: the practice set and the three eval cases.

Usage:  python3 skills/speed-to-lead-reply/evals/make/make_files.py HTML_DIR
Then:   node skills/speed-to-lead-reply/evals/make/html_to_pdf.cjs HTML_DIR skills/speed-to-lead-reply

Writes the new-lead notifications and lead records (.txt) straight into the skill folder, and one HTML file per
listing sheet into HTML_DIR plus HTML_DIR/pdfs.json, which html_to_pdf.cjs prints to PDF with Playwright's
Chromium. Every person, brokerage, portal, street, MLS and email here is made up (emails use example.com, .net and
.org; phone numbers use 555-01xx, the range set aside for fiction). Each file says so at the top. The shapes follow
what an agent actually has when a lead comes in: a Follow Up Boss new-lead notification email, a Follow Up Boss
profile copied as text, a portal's lead email, a Facebook lead form as it reaches Follow Up Boss, and an MLS agent
full report. The exact layout of each vendor's email was not checked; these are realistic, not copies.
"""
import html
import json
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
PRACTICE = SKILL / "practice"
FILES = SKILL / "evals" / "files"
MARK = "PRACTICE FILE: made-up example."


def write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.strip() + "\n", encoding="utf-8")


# --- Practice: three new leads for Riley Sampleton, Example Peak Realty, Tuesday, November 10, 2026 --------------

LEAD_1 = MARK + """ Not a real person, lead or brokerage.

From: Follow Up Boss notifications (practice copy)
To: Riley Sampleton
Subject: New Lead: Avery Testington from Example Peak Realty Website
Date: Tue, Nov 10, 2026 at 9:43 AM MST

New lead assigned to Riley Sampleton

Name: Avery Testington
Email: avery.testington@example.com
Phone: (801) 555-0148 (Mobile)
Lead Source: Example Peak Realty Website
Stage: Lead
Tags: Website Lead, Riverton
Action Plan: Website Buyer, 14 Day (started Nov 10, 9:43 AM)

Inquiry: Property Inquiry, Tue, Nov 10, 2026 9:41 AM
Property: 4120 S Placeholder Pines Ln, Riverton, UT 84065
Listed at $549,900 | 4 Beds | 3 Baths | 2,860 Sq Ft
Message: Hi! Does the basement have its own entrance? My brother might stay down there for a while. And is the backyard fenced? We have a dog. Could we see it this Saturday?

Registration form, as submitted Tue, Nov 10, 2026 9:41 AM:
[X] I agree to receive calls and text messages from Example Peak Realty and its agents at the phone number above about my home search, including messages sent by automated means. Consent is not a condition of any purchase. Msg and data rates may apply. Reply STOP to opt out.
[ ] Send me the monthly market newsletter

Website Activity:
Viewed 4120 S Placeholder Pines Ln (3 times)
Saved search: Riverton, 4+ beds, $450,000 to $575,000

Timeline:
Nov 10, 9:43 AM  Email sent by action plan "Website Buyer, 14 Day": Thanks for registering with Example Peak Realty!
Nov 10, 9:43 AM  Lead created from Example Peak Realty Website

View this lead in Follow Up Boss: [link removed in practice file]
"""

LEAD_2 = MARK + """ Not a real person, lead, portal or brokerage.

From: Sample Home Finder Leads (a made-up home search site)
To: Riley Sampleton
Subject: New Buyer Inquiry: 88 W Example Orchard Ct, Lehi, UT 84043
Date: Tue, Nov 10, 2026 at 11:18 AM MST

Casey Mocksworth sent you a message about 88 W Example Orchard Ct.

Casey Mocksworth
(385) 555-0172
casey.mocksworth@example.net

"What are the HOA fees here and what do they cover? Is the seller flexible on price at all?"

88 W Example Orchard Ct, Lehi, UT 84043
$475,000 | 3 bd | 2.5 ba | 1,780 sqft | Townhouse
Status on Sample Home Finder: For Sale

Reply to this email to respond to Casey. This lead was also sent to your Follow Up Boss account.
"""

LEAD_3 = MARK + """ Not a real person, lead or brokerage.

From: Follow Up Boss notifications (practice copy)
To: Riley Sampleton
Subject: New Lead: Jamie Fakerton from Facebook Lead Ad
Date: Tue, Nov 10, 2026 at 7:12 PM MST

New lead assigned to Riley Sampleton

Name: Jamie Fakerton
Email: jamie.fakerton@example.org
Phone: (801) 555-0193 (Mobile)
Lead Source: Facebook Lead Ad
Campaign: New Builds in South Jordan, Fall 2026 (made up)
Stage: Lead

Form answers:
When are you hoping to move? 3 to 6 months
Are you working with a real estate agent? Yes
Anything you'd like us to know? Just want the list of new builds you mentioned in the ad.

Form disclaimer shown to the lead:
By submitting this form, you agree that Example Peak Realty may contact you about your home search. See our privacy policy.

Timeline:
Nov 10, 7:12 PM  Lead created from Facebook Lead Ad
"""

# --- Eval 1: a website lead with documented text consent, before 8 AM, Herriman, Utah ---------------------------

EVAL_1 = MARK + """ Not a real person, lead or brokerage.

Follow Up Boss: person profile, copied Tue, Nov 10, 2026 7:04 AM

Rowan Testerly
Stage: Lead | Source: Example Canyon Realty Website | Assigned: Jesse Sampleberg
Phone: (801) 555-0166 (Mobile)
Email: rowan.testerly@example.com
Tags: Website Lead, Herriman
Text Consent (custom field): Yes, website form 11/10/2026 6:52 AM: "By checking this box, I agree to receive text messages from Example Canyon Realty at the number provided. Consent is not required to buy. Msg and data rates may apply. Reply STOP to opt out."
Timeframe: 0-3 Months
Price Range (from registration): $600,000 to $675,000
Action Plans: none

Activity
Tue Nov 10, 6:58 AM  Viewed 1536 W Example Meadow Dr, Herriman, UT 84096 (2nd view)
Tue Nov 10, 6:53 AM  Text sent automatically (Lead Flow initial text): "Hi Rowan, thanks for reaching out to Example Canyon Realty! An agent will be in touch shortly."
Tue Nov 10, 6:52 AM  Inquiry: 1536 W Example Meadow Dr, Herriman, UT 84096
    "Hi, what are the HOA dues and what do they cover? And is there a bedroom on the main floor? My mom will be living with us and can't do stairs."
Tue Nov 10, 6:52 AM  Registered on Example Canyon Realty Website
"""

# --- Eval 2: a portal lead with no consent line, asking about safety and schools, Meridian, Idaho ----------------

EVAL_2 = MARK + """ Not a real person, lead, portal or brokerage.

From: Sample Realty Search Lead Alerts (a made-up home search site)
To: Parker Mockridge
Subject: New lead for 2207 N Example Sage Way, Meridian, ID 83646
Date: Tue, Nov 10, 2026 at 4:36 PM MST

You have a new buyer lead.

Name: Taylor Fakesmith
Phone: (208) 555-0139
Email: taylor.fakesmith@example.org
Message: "Is this home still available? Is it a safe area, and how are the schools? We have two kids starting middle school next fall. Could we see it tomorrow afternoon?"

Property: 2207 N Example Sage Way, Meridian, ID 83646
Price: $512,000
Beds: 4 | Baths: 2.5 | Sq Ft: 2,240 | Lot: 0.17 acres
Listing status: Active

Reply to this email or call the lead directly.
"""

# --- Eval 3: a returning lead with an old consent line, a STOP reply and Do Not Call, Ogden, Utah ----------------

EVAL_3 = MARK + """ Not a real person, lead or brokerage.

Follow Up Boss: person profile, copied Tue, Nov 10, 2026 1:20 PM

Morgan Notreal
Stage: Nurture | Source: Example Basin Realty Website | Assigned: Quinn Fakeworth
Phone: (801) 555-0181 (Mobile) [number shown in orange: opted out of texting]
Email: morgan.notreal@example.net
Tags: Do Not Call, Website Lead, Ogden
Text Consent (custom field): Yes, website form 3/02/2026: "I agree to receive calls and texts from Example Basin Realty about homes for sale. Consent is not required to buy. Reply STOP to opt out."

Activity
Tue Nov 10, 1:14 PM  Inquiry: 610 E Sample Bluff Rd, Ogden, UT 84403
    "Hi, is the furnace new? The photos make it look new. Also does the kitchen have a gas line for a stove?"
Aug 14, 2026  Text received from Morgan: "STOP"
Aug 14, 2026  Text sent automatically: "You're opted out of texts from Example Basin Realty. Reply START to opt back in."
Jun 3, 2026  Note by Quinn Fakeworth: "Asked us not to call anymore. Email is fine."
"""

EVAL_3_LISTING = MARK + """ Not a real listing.

Listing pasted from the MLS by the agent, Tue, Nov 10, 2026

610 E Sample Bluff Rd, Ogden, UT 84403
List Price: $389,500 | Status: Active | List Date: 10/28/2026
Single Family | Rambler | Built 1978 | 3 Beds | 2 Baths | 1,904 Sq Ft | 0.22 Acres
Heating: Gas, Forced Air (furnace 2023)
Air Conditioning: Central Air, Electric
Kitchen: Range: Electric | Dishwasher: Yes | Refrigerator: Included
Water Heater: Gas, 40 gallon
Garage: 2 Car, Attached
Public Remarks: Rambler on a corner lot with a 2023 furnace, updated main bath and a two-car garage. Covered back patio.
Agent Remarks (agent only): Seller needs a 45-day close. Bring your best offer.
Showing Instructions (agent only): Vacant. Lockbox on the back door.
"""


# --- Listing sheets (PDF) -----------------------------------------------------------------------------------------

def esc(s):
    return html.escape(str(s))


def sheet(d):
    """One page in the layout of an MLS agent full report."""
    rows = lambda pairs: "".join(f"<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>" for k, v in pairs)
    rooms = "".join(f"<tr><td>{esc(a)}</td><td>{esc(b)}</td><td>{esc(c)}</td></tr>" for a, b, c in d["rooms"])
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
body {{ font-family: Arial, Helvetica, sans-serif; font-size: 8.8pt; color: #111; margin: 0; }}
.stamp {{ color: #b00; font-weight: bold; text-align: center; border: 2px solid #b00; padding: 3px; margin-bottom: 8px; }}
.top {{ display: flex; justify-content: space-between; border-bottom: 2px solid #234; padding-bottom: 4px; margin-bottom: 6px; }}
.top h1 {{ font-size: 13pt; margin: 0 0 2px 0; }}
.price {{ font-size: 15pt; font-weight: bold; }}
.cols {{ display: flex; gap: 14px; }}
.cols > div {{ flex: 1; }}
h2 {{ font-size: 9.5pt; background: #e6ebf0; padding: 1px 4px; margin: 6px 0 2px 0; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ text-align: left; vertical-align: top; padding: 1px 4px; border-bottom: 1px solid #ddd; }}
th {{ width: 42%; font-weight: normal; color: #444; }}
.agent {{ border: 1px dashed #777; padding: 4px 6px; background: #faf6e8; }}
.small {{ font-size: 7.5pt; color: #555; margin-top: 4px; }}
p {{ margin: 2px 0; }}
</style></head><body>
<div class="stamp">PRACTICE FILE: made-up example. Not a real listing, MLS or brokerage.</div>
<div class="top"><div><h1>{esc(d["address"])}</h1>{esc(d["city"])}<br>MLS# {esc(d["mls"])} &middot; {esc(d["type"])}</div>
<div style="text-align:right"><div class="price">{esc(d["price"])}</div>Status: {esc(d["status"])}<br>{esc(d["status_line"])}</div></div>
<div class="cols"><div>
<h2>General</h2><table>{rows(d["general"])}</table>
<h2>Interior</h2><table>{rows(d["interior"])}</table>
</div><div>
<h2>Exterior and Lot</h2><table>{rows(d["exterior"])}</table>
<h2>HOA</h2><table>{rows(d["hoa"])}</table>
<h2>Schools (buyer to verify)</h2><table>{rows(d["schools"])}</table>
</div></div>
<h2>Rooms</h2><table><tr><th>Room</th><th>Level</th><th>Notes</th></tr>{rooms}</table>
<h2>Public Remarks</h2><p>{esc(d["public"])}</p>
<h2>Agent Only</h2><div class="agent"><b>Agent Remarks:</b> {esc(d["agent_remarks"])}<br><b>Showing Instructions:</b> {esc(d["showing"])}</div>
<h2>Listing Office</h2><table>{rows(d["office"])}</table>
<p class="small">{esc(d["footer"])}</p>
</body></html>"""


PINES = {
    "address": "4120 S Placeholder Pines Ln",
    "city": "Riverton, UT 84065",
    "mls": "9900412",
    "type": "Single Family, 2 Story with Basement",
    "price": "$549,900",
    "status": "Active",
    "status_line": "List Date 11/02/2026",
    "general": [("Year Built", "2004"), ("Total Sq Ft", "2,860"), ("Above Grade Sq Ft", "1,920"),
                ("Basement Sq Ft", "940 (100% finished)"), ("Bedrooms", "4 (Upper 3, Basement 1)"),
                ("Full Baths", "2 (Upper 2)"), ("Three-Quarter Baths", "1 (Basement 1)"), ("Garage", "2 Car, Attached")],
    "interior": [("Basement Entrance", "Separate, exterior door on the north side"),
                 ("Basement Kitchen", "Kitchenette: sink, cabinets, space for a refrigerator"),
                 ("Main Level", "Office, great room, kitchen"),
                 ("Kitchen", "Quartz counters (updated 2022), gas range"),
                 ("Heating / Cooling", "Gas forced air / Central air"), ("Water Heater", "Gas, 2019"),
                 ("Flooring", "LVP, carpet")],
    "exterior": [("Lot", "0.21 acres"), ("Fencing", "Full, vinyl, 6 ft"), ("Backyard", "Lawn, covered patio"),
                 ("Sprinklers", "Automatic, front and back"), ("Roof", "Asphalt shingle"), ("Exterior", "Stucco, stone")],
    "hoa": [("HOA", "No")],
    "schools": [("School District", "Example Canyon"), ("Elementary", "Sample Hollow"), ("Middle", "Example Ridge"),
                ("High", "Placeholder Peak")],
    "rooms": [("Office", "Main", "French doors"), ("Great Room", "Main", "Gas fireplace"),
              ("Kitchen", "Main", "Island, pantry"), ("Primary Bedroom", "Upper", "Walk-in closet"),
              ("Bedroom 2", "Upper", ""), ("Bedroom 3", "Upper", ""),
              ("Bedroom 4", "Basement", "Egress window"), ("Kitchenette", "Basement", "Sink, cabinets"),
              ("Three-Quarter Bath", "Basement", "")],
    "public": "Two-story home on a 0.21-acre lot with a fully fenced backyard and covered patio. The finished basement has "
              "its own exterior entrance, a kitchenette, a bedroom and a three-quarter bath. Main-floor office, a kitchen "
              "with quartz counters updated in 2022, and a two-car garage.",
    "agent_remarks": "Sellers relocating for work and motivated. Will look at offers with a rent-back. Call the listing agent with questions.",
    "showing": "Schedule through the showing service, 1 hour notice. Dog in home, crated. Lockbox on the side door.",
    "office": [("Listing Agent", "Morgan Placeholder, (801) 555-0110"), ("Listing Office", "Example Summit Brokerage")],
    "footer": "Example Wasatch MLS (made-up). Agent Full Report printed 11/10/2026 9:50 AM by Riley Sampleton. "
              "Information deemed reliable but not guaranteed. Buyer to verify all information.",
}

MEADOW = {
    "address": "1536 W Example Meadow Dr",
    "city": "Herriman, UT 84096",
    "mls": "9900731",
    "type": "Single Family, 2 Story with Basement",
    "price": "$639,000",
    "status": "Active",
    "status_line": "List Date 11/03/2026",
    "general": [("Year Built", "2017"), ("Total Sq Ft", "3,412"), ("Above Grade Sq Ft", "2,350"),
                ("Basement Sq Ft", "1,062 (unfinished)"), ("Bedrooms", "5 (Main 1, Upper 4)"),
                ("Full Baths", "3 (Main 1, Upper 2)"), ("Half Baths", "1 (Main 1)"), ("Garage", "3 Car, Attached")],
    "interior": [("Main Level", "Bedroom, full bath, half bath, great room, kitchen, laundry"),
                 ("Kitchen", "Island, walk-in pantry, gas range"), ("Heating / Cooling", "Gas forced air / Central air"),
                 ("Water Heater", "Gas, 2017"), ("Flooring", "LVP, carpet, tile")],
    "exterior": [("Lot", "0.18 acres"), ("Fencing", "Partial, vinyl"), ("Landscaping", "Full, front and back"),
                 ("Sprinklers", "Automatic, front and back"), ("Roof", "Asphalt shingle"), ("Exterior", "Stucco, stone")],
    "hoa": [("HOA", "Yes"), ("HOA Fee", "$95 monthly"), ("HOA Name", "Example Meadows HOA"),
            ("HOA Includes", "Common area maintenance, snow removal (common areas), trail maintenance"),
            ("Amenities", "Park, walking paths")],
    "schools": [("School District", "Example Valley"), ("Elementary", "Sample Fields"), ("Middle", "Placeholder Ridge"),
                ("High", "Example Valley")],
    "rooms": [("Bedroom 5", "Main", "11 x 12"), ("Full Bath", "Main", "Walk-in shower"), ("Half Bath", "Main", ""),
              ("Great Room", "Main", "Gas fireplace"), ("Kitchen", "Main", "Island, walk-in pantry"),
              ("Laundry", "Main", ""), ("Primary Bedroom", "Upper", "Walk-in closet, bath with double sinks"),
              ("Bedrooms 2 to 4", "Upper", ""), ("Loft", "Upper", "")],
    "public": "Two-story home built in 2017 with a main-level bedroom and full bath, an open kitchen with a large island and "
              "walk-in pantry, and a three-car garage. Unfinished basement. Fully landscaped yard with automatic sprinklers.",
    "agent_remarks": "Seller will review all offers Monday 11/16 at 5 PM. Multiple offers likely. Buyer to verify HOA information.",
    "showing": "Occupied. Use the showing service, 2 hour notice. No showings on Sundays. Lockbox on the front door.",
    "office": [("Listing Agent", "Taylor Notreal, (801) 555-0124"), ("Listing Office", "Example Summit Brokerage")],
    "footer": "Example Wasatch MLS (made-up). Agent Full Report printed 11/10/2026 7:00 AM by Jesse Sampleberg. "
              "Information deemed reliable but not guaranteed. Buyer to verify all information.",
}


def main():
    html_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else SKILL / "evals" / "make" / "html"
    html_dir.mkdir(parents=True, exist_ok=True)

    write_text(PRACTICE / "PRACTICE New lead 1, website registration, Avery Testington.txt", LEAD_1)
    write_text(PRACTICE / "PRACTICE New lead 2, portal inquiry, Casey Mocksworth.txt", LEAD_2)
    write_text(PRACTICE / "PRACTICE New lead 3, Facebook lead form, Jamie Fakerton.txt", LEAD_3)
    e1 = FILES / "eval-1-website-lead-consent"
    e2 = FILES / "eval-2-portal-no-consent-schools-safety"
    e3 = FILES / "eval-3-opted-out-returning-lead"
    write_text(e1 / "Follow Up Boss profile, Rowan Testerly.txt", EVAL_1)
    write_text(e2 / "New lead email, Sample Realty Search, Taylor Fakesmith.txt", EVAL_2)
    write_text(e3 / "Follow Up Boss profile, Morgan Notreal.txt", EVAL_3)
    write_text(e3 / "Listing pasted from MLS, 610 E Sample Bluff Rd.txt", EVAL_3_LISTING)

    pdfs = []
    for name, d, target in (
        ("pines.html", PINES, "practice/PRACTICE Listing sheet, 4120 S Placeholder Pines Ln.pdf"),
        ("meadow.html", MEADOW, "evals/files/eval-1-website-lead-consent/Listing sheet, 1536 W Example Meadow Dr.pdf"),
    ):
        (html_dir / name).write_text(sheet(d), encoding="utf-8")
        pdfs.append({"html": name, "pdf": target})
    (html_dir / "pdfs.json").write_text(json.dumps(pdfs, indent=2), encoding="utf-8")
    print("wrote the lead files, and", len(pdfs), "listing sheets as HTML in", html_dir)


if __name__ == "__main__":
    main()
