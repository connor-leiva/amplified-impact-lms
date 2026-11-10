"""Writes the made-up practice and eval files for listing-appointment-prep.

Usage: python3 make_files.py HTML_DIR SKILL_DIR
Writes one HTML file per PDF into HTML_DIR plus HTML_DIR/pdfs.json (for html_to_pdf.cjs), and writes the text
and Markdown files (first-call notes, marketing menus) straight into SKILL_DIR. Every person, street, parcel,
brokerage, title company, lender, MLS number and phone number here is made up. Phone numbers use the 555-01xx
range set aside for fiction. The cities are real so Utah mode and general mode apply; the streets are not.
"""
import html
import json
import os
import sys

STAMP = "PRACTICE FILE: made-up example"


def esc(s):
    return html.escape(str(s))


CSS = """
body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #111; }
.stamp { color: #b00; font-weight: bold; text-align: center; border: 2px solid #b00; padding: 3px; margin-bottom: 8px; }
h1 { font-size: 14pt; margin: 2px 0 0 0; } .sub { color: #333; margin-bottom: 8px; }
h2 { font-size: 10.5pt; background: #2d4a3e; color: #fff; padding: 3px 6px; margin: 9px 0 3px 0; }
table { border-collapse: collapse; width: 100%; margin: 3px 0 6px 0; }
th, td { border: 1px solid #bbb; padding: 3px 6px; vertical-align: top; text-align: left; }
th { background: #eef3f0; width: 36%; }
.grid th { width: auto; background: #dfe9e4; }
.hand { font-family: "Comic Sans MS", "Segoe Print", cursive; color: #123c8c; }
.brk { page-break-before: always; }
.note { font-size: 8.5pt; color: #444; margin-top: 6px; }
.agent { border: 2px solid #b26b00; padding: 4px 6px; margin-top: 6px; }
.agent h2 { background: #b26b00; }
.foot { font-size: 8pt; color: #555; border-top: 1px solid #999; margin-top: 10px; padding-top: 3px; }
"""


def page(body):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{body}</body></html>'


def rows(pairs, hand=False):
    cls = ' class="hand"' if hand else ""
    return "".join(f"<tr><th>{esc(k)}</th><td{cls}>{esc(v)}</td></tr>" for k, v in pairs)


def grid(head, body):
    h = "".join(f"<th>{esc(c)}</th>" for c in head)
    b = "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in r) + "</tr>" for r in body)
    return f'<table class="grid"><tr>{h}</tr>{b}</table>'


# --- seller questionnaire --------------------------------------------------------------------------

def questionnaire(d):
    p1 = f"""<div class="stamp">{STAMP}. Not a real seller, property or brokerage.</div>
<h1>Seller Questionnaire</h1>
<div class="sub">{esc(d['brokerage'])} &nbsp;|&nbsp; Agent: {esc(d['agent'])} &nbsp;|&nbsp; Returned {esc(d['returned'])}</div>
<h2>About You</h2><table>{rows(d['about'], hand=True)}</table>
<h2>Your Move</h2><table>{rows(d['move'], hand=True)}</table>
<div class="foot">Page 1 of the questionnaire. Answers are the seller's own words, not verified by the brokerage. {STAMP}.</div>"""
    p2 = f"""<div class="brk"></div><div class="stamp">{STAMP}. Not a real seller, property or brokerage.</div>
<h1>Seller Questionnaire: The Home</h1>
<div class="sub">{esc(d['address'])}</div>
<h2>The Home</h2><table>{rows(d['home'], hand=True)}</table>
<h2>Loans and Liens on the Home</h2><table>{rows(d['loans'], hand=True)}</table>
<h2>Anything Else</h2><table>{rows(d['else'], hand=True)}</table>
<div class="foot">Signed: <span class="hand">{esc(d['signed'])}</span>. Page 2 of the questionnaire. {STAMP}.</div>"""
    return page(p1 + p2)


# --- county record and prior MLS history -----------------------------------------------------------

def county_and_mls(d):
    p1 = f"""<div class="stamp">{STAMP}. Not a real parcel, owner or county record.</div>
<h1>{esc(d['county'])}: Parcel Detail</h1>
<div class="sub">Printed {esc(d['printed'])} from the county's public parcel search (made-up copy)</div>
<h2>Parcel</h2><table>{rows(d['parcel'])}</table>
<h2>Building</h2><table>{rows(d['building'])}</table>
<h2>Value and Tax (for tax purposes only)</h2><table>{rows(d['tax'])}</table>
<h2>Recorded Documents</h2><table>{rows(d['recorded'])}</table>
<div class="foot">{STAMP}. Assessor data is for tax purposes and may differ from other sources.</div>"""
    if not d.get("mls"):
        return page(p1)
    m = d["mls"]
    p2 = f"""<div class="brk"></div><div class="stamp">{STAMP}. Not a real MLS record.</div>
<h1>Prior MLS History: {esc(d['address'])}</h1>
<div class="sub">Printed {esc(d['printed'])} from the agent's MLS (made-up copy)</div>
{grid(m['head'], m['rows'])}
<h2>Listing Details, MLS# {esc(m['number'])} ({esc(m['year'])})</h2><table>{rows(m['details'])}</table>
<h2>Public Remarks ({esc(m['year'])})</h2><p>{esc(m['public'])}</p>
<div class="agent"><h2>Agent Only ({esc(m['year'])})</h2><table>{rows(m['agent_only'])}</table></div>
<div class="foot">{STAMP}. History from a prior listing describes the home as it was then.</div>"""
    return page(p1 + p2)


# --- title fee sheet -------------------------------------------------------------------------------

def fee_sheet(d):
    body = f"""<div class="stamp">{STAMP}. Not a real title company or rate.</div>
<h1>{esc(d['company'])}</h1>
<div class="sub">Seller Fee Sheet and Rate Card &nbsp;|&nbsp; {esc(d['area'])} &nbsp;|&nbsp; Effective {esc(d['effective'])}</div>
<h2>Owner's Policy (Standard Coverage), Seller Charge, by Sale Price</h2>
{grid(['Sale price', 'Premium'], d['rates'])}
<h2>Seller Settlement and Recording Charges</h2>
{grid(['Charge', 'Amount', 'How it applies'], d['fees'])}
<h2>Not on This Sheet</h2><ul>{''.join(f'<li>{esc(x)}</li>' for x in d['not_on'])}</ul>
<p class="note">{esc(d['contact'])}</p>
<div class="foot">Estimate only. Fees and rates may change. Your closing statement shows your actual charges. {STAMP}.</div>"""
    return page(body)


# --- the data --------------------------------------------------------------------------------------

PRACTICE_Q = {
    "brokerage": "Example Peak Realty",
    "agent": "Riley Sampleton",
    "returned": "11/10/2026",
    "address": "1739 E Practice Point Cir, Cottonwood Heights, UT 84121",
    "about": [
        ("Property address", "1739 E Practice Point Cir, Cottonwood Heights, UT 84121"),
        ("Owners (names as on title)", "Dana Practiceton and Lee Practiceton"),
        ("Best phone", "801-555-0147 (Dana)"),
        ("Email", "dana.practiceton@example.com"),
        ("Best way to reach you", "Text Dana"),
        ("What matters most to you in an agent?", "Honest about price. Good communication. Not pushy."),
    ],
    "move": [
        ("Why are you selling?", "Lee took a job in Boise. Starts February 1."),
        ("When do you need to move?", "By the end of January. We might rent in Boise first."),
        ("Is anyone else part of the decision?", "Lee's mom, Pat, helped with our down payment in 2016 and wants to be part of it. She's not on title."),
        ("Have you talked with other agents?", "Lee's cousin Morgan Fakely is an agent with Placeholder Homes. We haven't signed anything. We've also thought about listing it ourselves on Zillow first."),
        ("Where are you moving?", "Boise, Idaho"),
    ],
    "home": [
        ("Year you bought it", "2016"),
        ("HOA?", "None"),
        ("About how many square feet?", "About 3,300"),
        ("Bedrooms / bathrooms", "5 bed / 3.5 bath"),
        ("Updates (what and what year)", "Kitchen remodel 2021 (quartz counters, new cabinets, gas range). Roof replaced 2023. Furnace 2019. Water heater: not sure."),
        ("Anything that needs repair?", "Dishwasher leaks a little. Garage door opener is loud. Basement bathroom fan doesn't work."),
        ("What do you love about the home?", "Backs to the Example Creek open space trail. Big trees. Theater room in the basement. Quiet cul-de-sac. The elementary school is top rated, it's perfect for a young family."),
        ("Pets", "One dog (Biscuit)"),
        ("Showings", "2 hours notice for the dog. No showings before 10 AM on weekends."),
        ("Staying with the home / going with you", "Theater projector and screen stay. Garage fridge goes."),
    ],
    "loans": [
        ("Mortgage lender", "Example Home Loans"),
        ("Loan number", "4471-0098-2213"),
        ("About how much do you owe?", "$318,000"),
        ("Second mortgage or HELOC?", "Yes. Sample Valley Credit Union HELOC, about $24,500"),
    ],
    "else": [
        ("Anything else we should know?", "We want to know our bottom line before we sign anything."),
    ],
    "signed": "Dana Practiceton, 11/10/2026",
}

PRACTICE_COUNTY = {
    "county": "Salt Lake County Assessor",
    "printed": "11/10/2026",
    "address": "1739 E Practice Point Cir",
    "parcel": [
        ("Parcel number", "22-99-418-007"),
        ("Owner", "PRACTICETON, DANA & LEE (JT)"),
        ("Property address", "1739 E PRACTICE POINT CIR, COTTONWOOD HEIGHTS"),
        ("Property type", "Single Family Residence"),
        ("Lot size", "0.24 acres"),
    ],
    "building": [
        ("Year built", "1994"),
        ("Style", "Two Story"),
        ("Exterior", "Brick / Stucco"),
        ("Above grade finished area", "2,140 sq ft"),
        ("Basement area", "1,050 sq ft"),
        ("Basement finished area", "900 sq ft"),
        ("Total finished area (above grade + finished basement)", "3,040 sq ft"),
        ("Bedrooms", "5"),
        ("Bathrooms", "3 full, 1 half"),
        ("Garage", "Attached, 2 car (520 sq ft)"),
        ("Heating / cooling", "Forced air, gas / Central air"),
    ],
    "tax": [
        ("2026 market value (assessor)", "$702,400"),
        ("2026 property tax", "$4,318.62, due 11/30/2026"),
    ],
    "recorded": [
        ("Last deed", "Warranty Deed, recorded 06/10/2016"),
        ("Recorded liens shown", "Deed of Trust 06/10/2016; Deed of Trust (line of credit) 03/22/2022"),
    ],
    "mls": {
        "number": "1450001",
        "year": "2016",
        "head": ["MLS#", "Status", "List date", "List price", "Under contract", "Sold date", "Sold price", "Days on market"],
        "rows": [["1450001", "Sold", "05/02/2016", "$459,900", "05/09/2016", "06/10/2016", "$462,000", "7"]],
        "details": [
            ("Beds / baths", "5 / 4 (3 full, 1 half)"),
            ("Total square feet", "3,090"),
            ("Basement", "Full, 90% finished"),
            ("Year built", "1994"),
            ("Lot", "0.24 acres"),
            ("Garage", "2 car attached"),
        ],
        "public": "Two-story home on a quiet cul-de-sac backing to the open space trail. Finished basement with a family room and a bedroom. Two-car garage. Mature trees.",
        "agent_only": [
            ("Agent remarks", "Lockbox on side door. Seller relocating; call listing agent for showings."),
            ("Listing brokerage (2016)", "Sample Ridge Realty"),
        ],
    },
}

PRACTICE_FEES = {
    "company": "Sample Summit Title",
    "area": "Salt Lake County",
    "effective": "October 1, 2026",
    "rates": [
        ["$650,001 to $700,000", "$2,016.00"],
        ["$700,001 to $750,000", "$2,120.00"],
        ["$750,001 to $800,000", "$2,224.00"],
        ["$800,001 to $850,000", "$2,328.00"],
    ],
    "fees": [
        ["Escrow and settlement fee, seller's portion", "$450.00", "Once per sale"],
        ["Deed preparation", "$125.00", "Once per sale"],
        ["Lien release tracking (reconveyance)", "$65.00", "Per loan or line of credit paid off"],
        ["Recording fee, release document", "$40.00", "Per release document recorded"],
        ["Payoff delivery (courier or overnight)", "$35.00", "Per payoff"],
    ],
    "not_on": [
        "Property tax, HOA and utility prorations: calculated for your closing date.",
        "Loan payoffs: from your lender's payoff statement, which we order.",
        "Real estate commissions and any seller concessions: from your listing agreement and purchase contract.",
    ],
    "contact": "Questions: Jamie Notreal, escrow officer, 801-555-0188.",
}

EVAL1_Q = {
    "brokerage": "Example Summit Homes Team at Sample Crest Realty",
    "agent": "Avery Mockley",
    "returned": "11/9/2026",
    "address": "5482 S Example Elm Dr, Murray, UT 84107",
    "about": [
        ("Property address", "5482 S Example Elm Dr, Murray, UT 84107"),
        ("Owners (names as on title)", "Pat Fakerson and Chris Fakerson"),
        ("Best phone", "801-555-0163 (Pat)"),
        ("Best way to reach you", "Call Pat after 4 PM. Chris works nights."),
        ("What matters most to you in an agent?", "Someone who shows up. We've never used a team and don't want to be handed off."),
    ],
    "move": [
        ("Why are you selling?", "Downsizing. We want a smaller place with no stairs near our daughter in St. George."),
        ("When do you need to move?", "No hard date. We'd like to list in January after the holidays, or maybe spring."),
        ("Is anyone else part of the decision?", "No, just us."),
        ("Have you talked with other agents?", "No. We thought about a flat-fee listing service."),
        ("Where are you moving?", "St. George"),
    ],
    "home": [
        ("Year you bought it", "2009"),
        ("HOA?", "No"),
        ("About how many square feet?", "About 2,600"),
        ("Bedrooms / bathrooms", "5 bed / 3 bath"),
        ("Updates (what and what year)", "Roof 2018. Furnace and AC 2012. Sewer line replaced 2024. Original windows on the north side."),
        ("Anything that needs repair?", "Carpet in the basement is worn. Two north windows have broken seals."),
        ("What do you love about the home?", "The big garden and the fruit trees. RV pad by the garage. Quiet street."),
        ("Pets", "None"),
        ("Showings", "No open houses, please (privacy, Chris sleeps days). Showings after 2 PM."),
        ("Staying with the home / going with you", "Garden shed stays. Washer and dryer go."),
    ],
    "loans": [
        ("Mortgage lender", "Example Federal Savings"),
        ("About how much do you owe?", "About $142,000"),
        ("Second mortgage or HELOC?", "No"),
        ("Where should sale proceeds go?", "Sample Bank, checking account ending 4410"),
    ],
    "else": [
        ("Anything else we should know?", "We'd rather give a $5,000 carpet credit than replace the basement carpet ourselves."),
    ],
    "signed": "Pat Fakerson, 11/9/2026",
}

EVAL1_COUNTY = {
    "county": "Salt Lake County Assessor",
    "printed": "11/9/2026",
    "address": "5482 S Example Elm Dr",
    "parcel": [
        ("Parcel number", "21-99-276-031"),
        ("Owner", "FAKERSON, PAT & CHRIS (JT); SAMPLEWOOD, TERRY (TIC 1/3)"),
        ("Property address", "5482 S EXAMPLE ELM DR, MURRAY"),
        ("Property type", "Single Family Residence"),
        ("Lot size", "0.17 acres"),
    ],
    "building": [
        ("Year built", "1972"),
        ("Style", "Rambler / Ranch"),
        ("Exterior", "Brick"),
        ("Above grade finished area", "1,380 sq ft"),
        ("Basement area", "1,380 sq ft"),
        ("Basement finished area", "1,100 sq ft"),
        ("Total finished area (above grade + finished basement)", "2,480 sq ft"),
        ("Bedrooms", "5"),
        ("Bathrooms", "2 full, 1 three-quarter"),
        ("Garage", "Attached, 2 car (484 sq ft)"),
        ("Heating / cooling", "Forced air, gas / Central air"),
    ],
    "tax": [
        ("2026 market value (assessor)", "$458,900"),
        ("2026 property tax", "$2,611.40, due 11/30/2026"),
    ],
    "recorded": [
        ("Last deeds", "Warranty Deed recorded 08/14/2009; Quitclaim Deed (1/3 interest to Terry Samplewood) recorded 02/03/2021"),
        ("Recorded liens shown", "Deed of Trust 08/14/2009"),
    ],
    "mls": {
        "number": "0870044",
        "year": "2009",
        "head": ["MLS#", "Status", "List date", "List price", "Under contract", "Sold date", "Sold price", "Days on market"],
        "rows": [["0870044", "Sold", "06/01/2009", "$219,900", "07/16/2009", "08/14/2009", "$214,500", "45"]],
        "details": [
            ("Beds / baths", "5 / 3"),
            ("Total square feet", "2,500"),
            ("Basement", "Full, mostly finished"),
            ("Year built", "1972"),
            ("Lot", "0.17 acres"),
            ("Garage", "2 car attached, RV pad"),
        ],
        "public": "Brick rambler with a full basement, RV pad and a large garden area. Close to shopping and the freeway.",
        "agent_only": [
            ("Agent remarks", "Vacant. Combo lockbox on front door, code at listing office."),
            ("Listing brokerage (2009)", "Example Old Mill Realty"),
        ],
    },
}

EVAL1_FEES = {
    "company": "Example Canyon Title",
    "area": "Salt Lake County",
    "effective": "September 15, 2026",
    "rates": [
        ["$400,001 to $450,000", "$1,512.00"],
        ["$450,001 to $500,000", "$1,598.00"],
        ["$500,001 to $550,000", "$1,684.00"],
        ["$550,001 to $600,000", "$1,770.00"],
    ],
    "fees": [
        ["Settlement fee, seller", "$395.00", "Once per sale"],
        ["Reconveyance fee", "$50.00", "Per deed of trust paid off"],
        ["Recording, release of lien", "$40.00", "Per release"],
        ["Overnight payoff delivery", "$30.00", "Per payoff"],
    ],
    "not_on": [
        "Prorations (property taxes, utilities): figured for the closing date.",
        "Payoffs: from the lender's payoff statement.",
        "Commissions, concessions and credits: from your agreements.",
    ],
    "contact": "Escrow questions: Sam Placeholder, 801-555-0172.",
}

EVAL2_COUNTY = {
    "county": "Ada County Assessor",
    "printed": "11/10/2026",
    "address": "3318 W Sample Sage St",
    "parcel": [
        ("Parcel number", "R9999041120"),
        ("Owner", "TESTCASE, JAMIE"),
        ("Property address", "3318 W SAMPLE SAGE ST, MERIDIAN ID 83646"),
        ("Property type", "Residential, single family"),
        ("Lot size", "0.16 acres"),
        ("Subdivision", "Example Sage Ridge Sub No 2"),
    ],
    "building": [
        ("Year built", "2006"),
        ("Style", "Two Story"),
        ("Finished area", "2,214 sq ft"),
        ("Bedrooms", "4"),
        ("Bathrooms", "2.5"),
        ("Garage", "Attached, 3 car"),
    ],
    "tax": [
        ("2026 assessed value", "$441,300"),
    ],
    "recorded": [
        ("Last deed", "Warranty Deed recorded 04/22/2019"),
    ],
}


PRACTICE_MENU = """PRACTICE FILE: made-up example. Not a real agent, brokerage, vendor or client.

# Riley Sampleton, Example Peak Realty: My Listing Marketing Menu

Updated October 2026. This is what I actually offer.

## Every Listing Gets

1. Professional photos by Sample Lens Media (HDR, 35 to 45 images), shot within 3 days of signing.
2. A floor plan with room measurements, from the same photo visit.
3. A Matterport 3D tour.
4. A staging consult: one hour with Example Staging Co., included. Full staging is available; the seller pays the stager directly from the stager's own quote.
5. The MLS listing on UtahRealEstate.com.
6. Two open houses in the first two weekends, only with the seller's OK.
7. Just Listed postcards to the 250 nearest neighbors.
8. Instagram and Facebook posts, plus a paid boost with a $150 budget that I pay.
9. Showings through my showing service: you approve every request by text.
10. A seller update every Monday: showings, feedback and online views.

## Add-Ons When the Home Fits

11. Drone photos and video: lots of 0.2 acres or more, or homes that back open space or have a view.
12. Twilight photos: homes with a view or strong outdoor lighting.
13. Pre-listing inspection: the seller pays the inspector directly, usually $450 to $600 with the inspectors I use.
14. HOA document packet: condos and HOA communities.
15. A property website at the home's own address.
16. Targeted Facebook ads to young families and move-up buyers.

## My Fee and Terms

- Listing fee: 2.5% of the sale price, paid to Example Peak Realty at closing. It's negotiable, like every fee.
- Buyer's agent: you decide whether to offer anything to a buyer's brokerage, and how much. I'll show you the options and the numbers.
- Listing term: 6 months.
- Cancellation: you can cancel anytime before an offer is accepted, with a written request. You'd owe only the marketing costs I've already paid, up to $500.

## My Numbers

From my UtahRealEstate.com agent production report, January 1 to October 31, 2026:
- 11 listings sold
- Average days on market: 19
- Average sale price to final list price: 99.1%

## What Clients Said (shared with their written OK)

- "Riley told us the truth about our house and had a plan for every week." (Casey and Sam Exampleman, Sandy, 2026)
- "We never had to chase Riley for an update." (Jo Testerly, Holladay, 2025)
"""

PRACTICE_NOTES = """PRACTICE FILE: made-up example. Not a real client, property or brokerage.

Follow Up Boss note, copied from the contact's timeline (Notes tab)
Contact: Dana Practiceton
Created by: Riley Sampleton | Mon, Nov 9, 2026, 4:12 PM

First call with Dana, about 18 minutes. Referred by past client Sam Exampleman.

- Selling 1739 E Practice Point Cir, Cottonwood Heights. Lee took a job in Boise, starts Feb 1. Want to be moved by the end of January, might rent in Boise first.
- Dana is leaning toward waiting till spring "when it's busier." Lee wants to list now so they're not paying for two places.
- Dana: "Zillow says 812." Thinks it's worth at least 800. Told her we'd go over price with my CMA at the appointment.
- Lee's cousin Morgan is an agent at Placeholder Homes and offered to list it "for cheap." Nothing signed. They've also talked about trying it on their own first.
- Dana asked what my commission is. Said "I know it's usually 6%." Told her I'd go over it in person.
- They owe about $318K on the mortgage plus a HELOC around $24.5K (her numbers).
- Want to net "around 300 if we can" for the down payment in Boise.
- Dog named Biscuit, needs notice for showings.
- Kitchen remodel 2021, new roof 2023.
- Dana said the schools here are a big selling point and it's perfect for a young family.
- APPT: Thursday 6:30 PM at the house. Dana and Lee both. Lee's mom Pat may join on FaceTime ("she has opinions"). Lee said they have about an hour.
- Sending the seller questionnaire tonight.
"""

EVAL1_MENU = """PRACTICE FILE: made-up example. Not a real team, brokerage, vendor or client.

# Example Summit Homes Team at Sample Crest Realty: Listing Plan

Six agents, one listing coordinator. Your agent stays your agent from the first meeting to closing.

## Every Listing

- Professional photos by Sample Lens Media, 30 or more images.
- A video walkthrough with your agent on camera.
- A 3D tour.
- The MLS listing on UtahRealEstate.com.
- Social posts on the team's Instagram and Facebook.
- Open houses every weekend for the first month.
- A weekly update by email every Friday.
- A staging consult with the team's listing coordinator.

## When the Home Fits

- Drone photos: lots of 0.25 acres or more, or homes with views.
- Pre-listing inspection: seller pays the inspector.
- Moving help: free use of the team's moving truck for moves within 50 miles.

## Team Numbers

Example Summit Homes Team production report, January 1 to September 30, 2026:
- 38 listings closed
- Median days to contract: 12
"""

EVAL1_NOTES = """PRACTICE FILE: made-up example. Not a real client, property or brokerage.

Follow Up Boss note, copied from the contact's timeline (Notes tab)
Contact: Pat Fakerson
Created by: Avery Mockley | Mon, Nov 9, 2026, 11:05 AM

Call with Pat, about 20 minutes. Came in from the team's website.

- 5482 S Example Elm Dr, Murray. Pat and Chris want to downsize to something with no stairs near their daughter in St. George.
- Pat asked what we'd list at. Said a neighbor told her "at least 525." Told her I'd bring a CMA.
- Chris asked "what's your commission? Our neighbor's agent charged 5%."
- Pat is worried about getting locked into a long contract. Asked if a team means they'd get handed to a junior agent.
- Pat said the neighborhood is changing, lots of renters and Spanish-speaking families now, and they want out before values drop.
- They might wait for spring. Pat said "nothing sells in January anyway."
- Owe about $142K, no second.
- Basement carpet is worn. Would rather give a credit than replace it.
- APPT set: Wednesday 5:30 PM at the house, both Pat and Chris. Pat said they have 45 minutes.
"""

EVAL2_NOTES = """PRACTICE FILE: made-up example. Not a real client, property or brokerage.

Follow Up Boss note, copied from the contact's timeline (Notes tab)
Contact: Jamie Testcase
Created by: Jordan Exampleby | Tue, Nov 10, 2026, 9:40 AM

First call, about 15 minutes. Sign call from my listing on Sample Sage St.

- Jamie owns 3318 W Sample Sage St, Meridian. Relocating to Spokane for work, starts in March. Wants to list in January.
- She will ask what my commission is. Said her neighbor told her "everyone charges 5 or 6 percent, or less now after the lawsuit."
- Asked if she should list at 499 like the house on the corner. Told her we'd do price with my CMA at the appointment.
- She wants to know what she'd net after everything.
- Owes about $205,000 (her number). She read me her loan number to save time: 0092-7731-55. HOA is Example Sage Ridge, $210 a quarter.
- Told her I do pro photos and a 3D tour on every listing.
- She said the new elementary school opening nearby is the best in the district, so families will love it.
- She works from home and has a cat. Wants showings with an hour's notice.
- APPT: Friday 10 AM at the house.
"""


def main():
    html_dir, skill_dir = sys.argv[1], sys.argv[2]
    os.makedirs(html_dir, exist_ok=True)
    pdfs = []

    def add(name, content, pdf):
        with open(os.path.join(html_dir, name), "w", encoding="utf-8") as f:
            f.write(content)
        pdfs.append({"html": name, "pdf": pdf})

    def text(rel, content):
        path = os.path.join(skill_dir, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    # Practice set (the page's practice files and the sample).
    add("p-q.html", questionnaire(PRACTICE_Q), "practice/PRACTICE Seller Questionnaire, Practiceton, 1739 E Practice Point Cir.pdf")
    add("p-c.html", county_and_mls(PRACTICE_COUNTY), "practice/PRACTICE County Record and MLS History, 1739 E Practice Point Cir.pdf")
    add("p-f.html", fee_sheet(PRACTICE_FEES), "practice/PRACTICE Title Fee Sheet, Sample Summit Title.pdf")
    text("practice/PRACTICE Marketing Menu, Riley Sampleton.md", PRACTICE_MENU)
    text("practice/PRACTICE First-call notes, Practiceton (FUB note).txt", PRACTICE_NOTES)

    # Eval 1: the full set, a team, two price scenarios.
    e1 = "evals/files/eval-1-full-set-two-prices/"
    add("e1-q.html", questionnaire(EVAL1_Q), e1 + "Seller Questionnaire, Fakerson, 5482 S Example Elm Dr.pdf")
    add("e1-c.html", county_and_mls(EVAL1_COUNTY), e1 + "County Record and MLS History, 5482 S Example Elm Dr.pdf")
    add("e1-f.html", fee_sheet(EVAL1_FEES), e1 + "Seller Fee Sheet, Example Canyon Title.pdf")
    text(e1 + "Team Listing Plan, Example Summit Homes Team.md", EVAL1_MENU)
    text(e1 + "FUB note, Pat Fakerson first call.txt", EVAL1_NOTES)

    # Eval 2: no menu, no fee sheet, general mode (Idaho).
    e2 = "evals/files/eval-2-no-menu-no-fee-sheet/"
    add("e2-c.html", county_and_mls(EVAL2_COUNTY), e2 + "Ada County parcel detail, 3318 W Sample Sage St.pdf")
    text(e2 + "FUB note, Jamie Testcase first call.txt", EVAL2_NOTES)

    with open(os.path.join(html_dir, "pdfs.json"), "w", encoding="utf-8") as f:
        json.dump(pdfs, f, indent=1)
    print(f"wrote {len(pdfs)} HTML pages for PDFs and the text files")


if __name__ == "__main__":
    main()
