"""Writes the made-up listing worksheets, MLS input sheet, county record and seller notes for
listing-description-writer's practice files and evals.

Usage: python3 make_files.py HTML_DIR SKILL_DIR
Writes one HTML file per PDF into HTML_DIR plus HTML_DIR/pdfs.json (for html_to_pdf.cjs), and writes the
text files (seller notes, feature list, seller email) straight into SKILL_DIR. Every person, street,
brokerage, school, parcel number, code and phone number here is made up. Phone numbers use the 555-01xx
range set aside for fiction. The cities are real so Utah mode applies; the streets are not.
"""
import html
import json
import os
import sys

STAMP = "PRACTICE FILE: made-up example"


def esc(s):
    return html.escape(str(s))


CSS = """
body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #111; }
.stamp { color: #b00; font-weight: bold; text-align: center; border: 2px solid #b00; padding: 3px; margin-bottom: 6px; }
h1 { font-size: 13pt; margin: 2px 0 0 0; } .sub { color: #333; margin-bottom: 6px; }
h2 { font-size: 10pt; background: #1f3b57; color: #fff; padding: 2px 5px; margin: 7px 0 2px 0; }
table { border-collapse: collapse; width: 100%; margin: 3px 0 6px 0; }
th, td { border: 1px solid #bbb; padding: 2px 5px; vertical-align: top; text-align: left; }
th { background: #eef2f6; width: 32%; }
.lv th, .lv td { width: auto; text-align: center; }
.lv th { background: #dfe7ef; }
.box { border: 1px solid #999; padding: 6px; min-height: 22px; margin-bottom: 6px; }
.note { font-size: 8.5pt; color: #444; }
.agent { border: 2px solid #b26b00; padding: 4px 6px; margin-top: 6px; }
.agent h2 { background: #b26b00; }
.letter p { margin: 0 0 8px 0; line-height: 1.45; font-size: 10.5pt; }
.brk { page-break-before: always; }
.foot { font-size: 8pt; color: #555; border-top: 1px solid #999; margin-top: 8px; padding-top: 3px; }
"""


def rows(pairs):
    return "".join(f"<tr><th>{esc(k)}</th><td>{esc(v)}</td></tr>" for k, v in pairs)


def levels_table(levels, total):
    head = "<tr><th>Level</th><th>Sq. Ft.</th><th>Finished</th><th>Bedrooms</th><th>Full Baths</th><th>3/4 Baths</th><th>1/2 Baths</th><th>Other Rooms</th></tr>"
    body = "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in lv) + "</tr>" for lv in levels)
    tot = "<tr>" + "".join(f"<td><b>{esc(c)}</b></td>" for c in total) + "</tr>"
    return f'<table class="lv">{head}{body}{tot}</table>'


def worksheet(d):
    """A brokerage's own listing input worksheet: page 1 the public fields, page 2 the agent-only fields,
    and (when given) a last page with the seller's notes typed from the seller questionnaire."""
    notes = ""
    if d.get("seller_notes"):
        paras = "".join(f"<p>{esc(p)}</p>" for p in d["seller_notes"])
        notes = f"""<div class="brk"></div>
<div class="stamp">{STAMP}. Not a real listing, seller or brokerage.</div>
<h1>Seller's Notes</h1>
<div class="sub">From the seller questionnaire, typed as the sellers wrote it. {esc(d['address'])}</div>
<div class="letter">{paras}</div>
<div class="foot">Seller questionnaire returned {esc(d['notes_date'])}. Seller's own words, not verified by the brokerage. {STAMP}.</div>"""
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="stamp">{STAMP}. Not a real listing, seller or brokerage.</div>
<h1>Listing Input Worksheet</h1>
<div class="sub">{esc(d['brokerage'])} &nbsp;|&nbsp; Listing agent: {esc(d['agent'])} &nbsp;|&nbsp; MLS: {esc(d['mls'])}</div>
<h2>Property</h2>
<table>{rows(d['property'])}</table>
<h2>Rooms by Level</h2>
{levels_table(d['levels'], d['total'])}
<h2>Features</h2>
<table>{rows(d['features'])}</table>
<h2>Updates (year, from the Seller's Property Condition Disclosure)</h2>
<table>{rows(d['updates'])}</table>
<h2>HOA, Taxes and Schools</h2>
<table>{rows(d['hoa_tax'])}</table>
<h2>Marketing</h2>
<table>{rows(d['marketing'])}</table>
<div class="brk"></div>
<div class="stamp">{STAMP}. Not a real listing, seller or brokerage.</div>
<div class="agent"><h2>Agent-Only Fields (Agent Remarks, Showing, Owner): do not publish</h2>
<table>{rows(d['agent_only'])}</table></div>
<div class="foot">Worksheet prepared {esc(d['prepared'])} for MLS entry. Square footage from the listing agent's measurement; buyer to verify. {STAMP}.</div>
{notes}
</body></html>"""


def mls_input(d):
    """A printout of an MLS input screen, a different layout: one long run of labeled fields."""
    sections = "".join(f"<h2>{esc(title)}</h2><table>{rows(pairs)}</table>" for title, pairs in d["sections"])
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="stamp">{STAMP}. Not a real listing, MLS printout or person.</div>
<h1>Listing Input: Residential (Draft, Not Submitted)</h1>
<div class="sub">Printed from the listing input screen, {esc(d['printed'])}. {esc(d['address'])}</div>
{levels_table(d['levels'], d['total'])}
{sections}
<div class="foot">Draft listing input, printed for review before submission. Fields marked member-only are not shown to the public. {STAMP}.</div>
</body></html>"""


def county(d):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="stamp">{STAMP}. Not a real county record, parcel or owner.</div>
<h1>{esc(d['office'])}</h1>
<div class="sub">Parcel Detail Report, printed {esc(d['printed'])}</div>
<h2>Parcel</h2><table>{rows(d['parcel'])}</table>
<h2>Residential Building</h2><table>{rows(d['building'])}</table>
<h2>Valuation</h2><table>{rows(d['value'])}</table>
<div class="foot">Data as recorded by the assessor's office for tax purposes; it may not reflect recent improvements. {STAMP}.</div>
</body></html>"""


# --- Practice: a Sandy rambler, sellers' notes with two fair housing problems and one unsupported claim ---

PRACTICE = dict(
    brokerage="Example Peak Realty (made-up)",
    agent="Riley Sampleton",
    mls="UtahRealEstate.com",
    address="1184 E Example Aspen Way, Sandy, UT 84092",
    prepared="Monday, November 9, 2026",
    notes_date="Sunday, November 8, 2026",
    property=[
        ("Address", "1184 E Example Aspen Way, Sandy, UT 84092"),
        ("County / Parcel", "Salt Lake / 28-12-345-678 (made-up)"),
        ("List Price", "$639,900"),
        ("Property Type / Style", "Single Family / Rambler"),
        ("Year Built", "1987"),
        ("Lot Size", "0.21 acres"),
        ("Exterior", "Brick and vinyl"),
    ],
    levels=[
        ("Main", "1,410", "100%", "2", "1", "1", "0", "Living room (vaulted ceiling), kitchen, dining, laundry"),
        ("Basement", "1,380", "90%", "2", "0", "1", "0", "Family room (gas fireplace), storage"),
    ],
    total=("Total", "2,790", "", "4", "1", "2", "0", ""),
    features=[
        ("Garage / Parking", "2-car attached garage; RV parking (side yard, gated)"),
        ("Heating / Cooling", "Gas forced air / Central air"),
        ("Roof", "Asphalt shingle. Year: not provided on the seller disclosure"),
        ("Flooring", "LVP on the main level; carpet in the basement bedrooms"),
        ("Kitchen", "Quartz counters; gas range; pantry cabinet"),
        ("Outdoor", "Covered patio; fully fenced backyard; back gate to the Example Creek Trail (public trail); garden boxes"),
        ("Water / Sewer / Irrigation", "City culinary water / Public sewer / Automatic sprinklers, front and back"),
        ("Inclusions", "Refrigerator, washer, dryer, garden boxes, basement TV wall mount"),
        ("Exclusions", "Living room curtains"),
    ],
    updates=[
        ("Kitchen counters, quartz", "2022"),
        ("LVP flooring, main level", "2022"),
        ("Water heater", "2020"),
    ],
    hoa_tax=[
        ("HOA", "None"),
        ("Taxes", "$3,212 (2025)"),
        ("Schools (MLS lookup)", "Example Canyon Elementary; Sample Ridge Middle; Placeholder High (Example School District, made-up)"),
    ],
    marketing=[
        ("Coming Soon sign", "Goes up Friday, November 13, 2026"),
        ("Photos", "Tuesday, November 17, 2026"),
        ("MLS go-live", "Thursday, November 19, 2026"),
        ("Public Remarks character limit", "______ (confirm in MLS)"),
        ("Agent's headline idea", "Family-Friendly Rambler Near Great Schools!"),
        ("Public Remarks", "[to be written]"),
    ],
    agent_only=[
        ("Agent Remarks (member-only)", "Sellers relocating to Denver for work; prefer closing after 12/15/2026. Pre-inspection report available on request. Call listing agent with questions."),
        ("Showing Instructions", "ShowingTime, 2-hour notice. Dog in backyard kennel during showings. SentriLock on front door, code 3317."),
        ("Occupancy", "Owner occupied"),
        ("Owners", "Jordan and Avery Notreal (made-up), 801-555-0142"),
        ("Listing Agent Contact", "Riley Sampleton, 801-555-0108, riley@example.com"),
        ("Seller Concessions", "None offered at this time"),
    ],
    seller_notes=[
        "What we love about our home:",
        "We've been here 11 years and we're sad to go. New roof in 2021, so no worries there for a long time.",
        "Perfect for a young family, there are kids all over this street.",
        "The kitchen counters and the floors on the main level were redone in 2022, and the water heater in 2020. Our favorite spot is the basement family room with the gas fireplace in the winter.",
        "Easy walk to the church on the corner, and the back gate opens right onto the Example Creek Trail.",
        "We put in the garden boxes and they stay. The covered patio is where we eat dinner all summer. The RV parking on the side is gated.",
        "Jordan and Avery",
    ],
)

# --- Eval 2: a downtown condo, seller's email with fair housing problems and a planned HOA amenity ---

CONDO = dict(
    brokerage="Example Peak Realty (made-up)",
    agent="Jamie Placeholder",
    mls="UtahRealEstate.com",
    address="455 S Placeholder St, Unit 708, Salt Lake City, UT 84111",
    prepared="Tuesday, November 10, 2026",
    property=[
        ("Address", "455 S Placeholder St, Unit 708, Salt Lake City, UT 84111"),
        ("County / Parcel", "Salt Lake / 16-06-000-708 (made-up)"),
        ("List Price", "$389,000"),
        ("Property Type / Style", "Condo / Mid-rise, 9 floors"),
        ("Unit Floor", "7"),
        ("Year Built", "2008"),
        ("View", "City"),
    ],
    levels=[
        ("Main (one level)", "1,048", "100%", "2", "1", "1", "0", "Open kitchen and living room, in-unit laundry, west-facing balcony"),
    ],
    total=("Total", "1,048", "", "2", "1", "1", "0", ""),
    features=[
        ("Parking", "1 deeded stall in the secured garage"),
        ("Storage", "1 storage unit"),
        ("Heating / Cooling", "Forced air / Central air"),
        ("Kitchen", "Granite counters; stainless steel appliances"),
        ("Flooring", "Engineered wood in the living areas; carpet in the bedrooms"),
        ("Building", "Elevator; secured entry; fitness room; bike room"),
        ("Nearby (agent-measured)", "Example Line light rail station, 0.3 mi (measured by the listing agent on a map, 11/2026)"),
        ("Pets", "Allowed per HOA rules, 2 pets max"),
        ("Inclusions", "Refrigerator, washer, dryer"),
    ],
    updates=[
        ("Engineered wood flooring", "2021"),
        ("Dishwasher", "2023"),
    ],
    hoa_tax=[
        ("HOA Dues", "$385 per month"),
        ("HOA Covers", "Water, sewer, trash, building insurance, exterior maintenance, elevator, snow removal"),
        ("HOA Amenities", "Fitness room, bike room, secured entry, elevator"),
        ("Rental Restrictions", "Yes, per the CC&Rs (see HOA documents)"),
        ("Taxes", "$2,480 (2025)"),
        ("Schools (MLS lookup)", "Example Avenue Elementary; Sample Park Middle; Placeholder West High (Example City District, made-up)"),
    ],
    marketing=[
        ("MLS go-live", "Monday, November 16, 2026"),
        ("Public Remarks character limit", "______ (confirm in MLS)"),
        ("Public Remarks", "[to be written]"),
    ],
    agent_only=[
        ("Agent Remarks (member-only)", "Tenant in place through 1/31/2027 (lease available to qualified buyers). 24-hour notice required. Seller motivated (divorce), prefers a quick close."),
        ("Showing Instructions", "Call tenant Sam Fakeperson, 801-555-0144, 24 hours ahead. Lockbox on the parking garage gate, code 2468. Unit key in lockbox."),
        ("Occupancy", "Tenant occupied"),
        ("Owner", "Lee Examplewood (made-up)"),
        ("Listing Agent Contact", "Jamie Placeholder, 801-555-0163, jamie@example.com"),
    ],
)

CONDO_EMAIL = """PRACTICE FILE: made-up example. Not a real seller, building or brokerage.

From: Lee Examplewood <lee@example.com>
To: Jamie Placeholder <jamie@example.com>
Date: Monday, November 9, 2026, 7:42 PM
Subject: Notes for the condo listing

Hi Jamie,

Here's what I'd want people to know about 708:

- It's a great building for empty nesters or young professionals. No kids running in the halls, it's mostly adults.
- Very safe neighborhood, I never worried walking home at night.
- Walking distance to the Example Line station. I took the train to work every day.
- The HOA just approved a rooftop deck with a hot tub, it's going in this spring.
- I redid the floors in 2021 and the dishwasher is new (2023).
- Two pets are allowed, and the fitness room is on the 2nd floor.

Thanks!
Lee
"""

# --- Eval 1: a Lehi two-story, a normal listing with a county record that disagrees on the basement ---

LEHI_INPUT = dict(
    printed="Tuesday, November 10, 2026",
    address="3466 N Placeholder Bend Dr, Lehi, UT 84043",
    levels=[
        ("Upper", "1,290", "100%", "4", "2", "0", "0", "Primary suite (soaking tub, walk-in closet)"),
        ("Main", "1,240", "100%", "0", "0", "0", "1", "Great room, kitchen, office, laundry"),
        ("Basement", "1,220", "100%", "1", "0", "1", "0", "Family room"),
    ],
    total=("Total", "3,750", "", "5", "2", "1", "1", ""),
    sections=[
        ("Listing", [
            ("Address", "3466 N Placeholder Bend Dr, Lehi, UT 84043"),
            ("County / Subdivision", "Utah / Example Fields Phase 3 (made-up)"),
            ("List Price", "$739,000"),
            ("Planned Status", "Active, effective 11/20/2026"),
            ("Type / Style", "Single Family / Two Story"),
            ("Year Built", "2016"),
            ("Acres", "0.18"),
        ]),
        ("Interior and Systems", [
            ("Kitchen", "Quartz counters; gas range; island; walk-in pantry"),
            ("Flooring", "LVP on the main level; carpet on the upper level and in the basement"),
            ("Heating / Cooling", "Forced air, gas / Central air"),
            ("Solar", "Owned, 7.2 kW (no lease)"),
            ("Water Softener", "Yes, included"),
        ]),
        ("Exterior and Lot", [
            ("Exterior", "Stucco and stone"),
            ("Garage", "3-car attached, tandem"),
            ("Fencing", "Vinyl, full"),
            ("Patio", "Concrete patio; gas line stubbed for a grill"),
            ("Irrigation", "Automatic sprinklers; secondary water (pressurized irrigation)"),
        ]),
        ("HOA and Taxes", [
            ("HOA Dues", "$45 per month"),
            ("HOA Covers", "Common area landscaping; community park"),
            ("HOA Amenities", "Park, playground, pavilion"),
            ("Taxes", "$3,940 (2025)"),
        ]),
        ("Schools (district lookup)", [
            ("Elementary / Middle / High", "Example Fields Elementary / Sample Hollow Middle / Placeholder Peak High (made-up)"),
        ]),
        ("Remarks", [
            ("Public Remarks", "[blank]"),
            ("Agent Remarks (member-only)", "Vacant as of 11/20. Sellers relocating to Boise, prefer a 30-day close. Offers reviewed Monday 11/23 at 5 PM; send to listing agent."),
        ]),
        ("Showing (member-only)", [
            ("Showing Service", "ShowingTime. Go and show after 11/20."),
            ("Lockbox", "Supra on the front door, code 5530"),
            ("Occupancy", "Vacant (as of 11/20)"),
        ]),
        ("Listing Office (member-only)", [
            ("Listing Agent", "Morgan Exampleton, 801-555-0177"),
            ("Listing Office", "Sample Summit Realty (made-up)"),
            ("Owner of Record", "Casey and Drew Fakeham (made-up)"),
        ]),
    ],
)

LEHI_COUNTY = dict(
    office="Example County Assessor (made-up), Utah County data format",
    printed="Monday, November 9, 2026",
    parcel=[
        ("Parcel Number", "54:321:0099 (made-up)"),
        ("Situs Address", "3466 N Placeholder Bend Dr, Lehi"),
        ("Owner", "Fakeham, Casey and Drew (made-up)"),
        ("Acreage", "0.18"),
        ("Subdivision", "Example Fields Phase 3, Lot 99"),
    ],
    building=[
        ("Year Built", "2016"),
        ("Style", "Two story"),
        ("Above Grade Sq. Ft.", "2,530"),
        ("Basement Sq. Ft.", "1,220"),
        ("Basement Finished Sq. Ft.", "900"),
        ("Bedrooms / Bathrooms", "5 / 4 (2 full, 1 three-quarter, 1 half)"),
        ("Garage", "Attached, 3 car"),
    ],
    value=[
        ("Market Value (2026)", "$702,300"),
        ("Tax Year 2025 Taxes", "$3,940"),
    ],
)

LEHI_FEATURES = """PRACTICE FILE: made-up example. Not a real seller or home.

Things we want buyers to know (Casey and Drew)

- Owned solar, 7.2 kW, paid off in 2023, so no lease to transfer
- New carpet upstairs in 2025
- Vinyl fence all the way around, put in 2019
- Water softener stays
- Gas line stubbed for a BBQ on the patio
- About 5 minutes to I-15
- The walk-in pantry is huge
"""


def main():
    html_dir, skill_dir = sys.argv[1], sys.argv[2]
    os.makedirs(html_dir, exist_ok=True)
    pdfs = []

    def page(name, body, pdf):
        with open(os.path.join(html_dir, name), "w", encoding="utf-8") as f:
            f.write(body)
        pdfs.append({"html": name, "pdf": pdf})

    def text(rel, body):
        path = os.path.join(skill_dir, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(body)
        print("wrote", rel)

    page("practice.html", worksheet(PRACTICE), "practice/Listing Worksheet, 1184 E Example Aspen Way (practice).pdf")
    page("condo.html", worksheet(CONDO), "evals/files/eval-2-condo-seller-notes/Listing Worksheet - 455 S Placeholder St Unit 708.pdf")
    text("evals/files/eval-2-condo-seller-notes/Email from seller - notes for the listing.txt", CONDO_EMAIL)
    page("lehi-input.html", mls_input(LEHI_INPUT), "evals/files/eval-1-single-family/MLS Input Draft - 3466 N Placeholder Bend Dr Lehi.pdf")
    page("lehi-county.html", county(LEHI_COUNTY), "evals/files/eval-1-single-family/County Parcel Record - 3466 N Placeholder Bend Dr.pdf")
    text("evals/files/eval-1-single-family/Seller feature list - Placeholder Bend.txt", LEHI_FEATURES)

    with open(os.path.join(html_dir, "pdfs.json"), "w", encoding="utf-8") as f:
        json.dump(pdfs, f, indent=2)
    print("wrote", len(pdfs), "HTML pages and pdfs.json")


if __name__ == "__main__":
    main()
