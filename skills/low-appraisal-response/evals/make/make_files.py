"""Writes the made-up input files for low-appraisal-response: the practice set and the three eval cases.

Every street, person, appraiser, lender, brokerage and MLS number here is fictional. Phone numbers use
the 555-01xx range reserved for fiction. CSVs are written directly; PDFs are written as HTML and printed
by html_to_pdf.cjs (Playwright's Chromium), which stamps "PRACTICE FILE: made-up example" on every page.

Usage:
  python3 make_files.py SKILL_DIR HTML_OUT_DIR
  node html_to_pdf.cjs HTML_OUT_DIR SKILL_DIR
"""
import csv
import json
import os
import sys

SKILL = sys.argv[1]
HTML = sys.argv[2]
os.makedirs(HTML, exist_ok=True)
STAMP = "PRACTICE FILE: made-up example"
PDFS = []

CSS = """
body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#111}
h1{font-size:13pt;margin:0 0 4px 0}
h2{font-size:10.5pt;background:#e8e8e8;padding:3px 5px;margin:10px 0 4px 0}
table{border-collapse:collapse;width:100%;margin:2px 0 6px 0}
td,th{border:1px solid #888;padding:2px 4px;vertical-align:top;font-size:8.5pt}
th{background:#f2f2f2;text-align:left}
.grid td,.grid th{font-size:7.4pt;padding:2px 3px}
.adj{text-align:right;white-space:nowrap}
.page{page-break-after:always}
.page:last-child{page-break-after:auto}
.small{font-size:7.5pt;color:#333}
.box{display:inline-block;width:31%;height:118px;border:1px solid #999;margin:4px 1%;text-align:center;
     vertical-align:top;font-size:8pt;background:#f7f7f7}
.box span{display:block;margin-top:50px}
.stampline{color:#b00;font-weight:bold;font-size:8pt}
.check{font-family:monospace}
"""


def page(body):
    return f'<div class="page"><div class="stampline">{STAMP}</div>{body}</div>'


def write_html(name, pdf_path, pages, title):
    html = (f"<!doctype html><html><head><meta charset='utf-8'><title>{title}</title><style>{CSS}</style>"
            f"</head><body>{''.join(page(p) for p in pages)}</body></html>")
    with open(os.path.join(HTML, name), "w", encoding="utf-8") as f:
        f.write(html)
    PDFS.append({"html": name, "pdf": pdf_path})


def money(n):
    return f"${n:,.0f}"


def adj(n):
    if n == 0:
        return "0"
    return ("+" if n > 0 else "-") + f"${abs(n):,.0f}"


def kv(rows, cols=2):
    """A table of label/value pairs, `cols` pairs per row."""
    out = "<table>"
    for i in range(0, len(rows), cols):
        out += "<tr>" + "".join(f"<th>{k}</th><td>{v}</td>" for k, v in rows[i:i + cols]) + "</tr>"
    return out + "</table>"


# --------------------------------------------------------------------------------------------------
# Appraisal reports
# --------------------------------------------------------------------------------------------------

GRID_LINES = [
    ("addr", "Address"),
    ("prox", "Proximity to Subject"),
    ("price", "Sale Price"),
    ("ppsf", "Sale Price / Gross Liv. Area"),
    ("src", "Data Source(s)"),
    ("conc", "Sale or Financing Concessions"),
    ("date", "Date of Sale / Time"),
    ("loc", "Location"),
    ("site", "Site"),
    ("view", "View"),
    ("design", "Design (Style)"),
    ("quality", "Quality of Construction"),
    ("age", "Actual Age (Year Built)"),
    ("cond", "Condition"),
    ("rooms", "Above Grade Room Count (Total / Bdrms / Baths)"),
    ("gla", "Gross Living Area (above grade)"),
    ("bsmt", "Basement & Finished Area Below Grade"),
    ("below", "Rooms Below Grade (Rec / Bdrms / Baths)"),
    ("heat", "Heating / Cooling"),
    ("garage", "Garage / Carport"),
    ("porch", "Porch / Patio / Deck"),
]


def comp_totals(c):
    adjs = [c["lines"].get(k, ("", 0))[1] for k, _ in GRID_LINES]
    net = sum(adjs)
    gross = sum(abs(a) for a in adjs)
    return net, gross, c["price"] + net


def grid_html(subject, comps):
    head = "<tr><th>Feature</th><th>Subject</th>" + "".join(
        f"<th colspan='2'>Comparable Sale {i + 1}</th>" for i in range(len(comps))) + "</tr>"
    rows = ""
    for key, label in GRID_LINES:
        rows += f"<tr><th>{label}</th><td>{subject.get(key, '')}</td>"
        for c in comps:
            if key == "price":
                rows += f"<td>{money(c['price'])}</td><td></td>"
                continue
            if key == "ppsf":
                rows += f"<td>${c['price'] / c['grid_gla']:,.2f} / sq ft</td><td></td>"
                continue
            desc, a = c["lines"].get(key, ("", 0))
            rows += f"<td>{desc}</td><td class='adj'>{adj(a) if key not in ('addr', 'prox', 'src') else ''}</td>"
        rows += "</tr>"
    rows += "<tr><th>Net Adjustment (Total)</th><td></td>"
    for c in comps:
        net, gross, _ = comp_totals(c)
        rows += f"<td>Net {net / c['price'] * 100:.1f}% / Gross {gross / c['price'] * 100:.1f}%</td><td class='adj'>{adj(net)}</td>"
    rows += "</tr><tr><th>Adjusted Sale Price of Comparable</th><td></td>"
    for c in comps:
        rows += f"<td></td><td class='adj'><b>{money(comp_totals(c)[2])}</b></td>"
    rows += "</tr>"
    return f"<table class='grid'>{head}{rows}</table>"


def appraisal(a):
    """Render one appraisal report from a dict. a['layout'] is 'legacy' or 'redesign'."""
    s = a["subject"]
    pages = []
    legacy = a["layout"] == "legacy"
    title = ("Uniform Residential Appraisal Report (legacy 1004-style layout, made-up practice file)" if legacy
             else "Uniform Residential Appraisal Report (redesigned URAR-style layout, made-up practice file)")

    # Page 1: summary, subject, contract, neighborhood
    summary = [
        ("File No.", a["file_no"]), ("Effective Date of Appraisal", a["effective"]),
        ("Property Address", s["address"]), ("City / State / Zip", s["csz"]),
        ("County", s["county"]), ("Assessor's Parcel #", s["apn"]),
        ("Legal Description", s["legal"]), ("Borrower", a["borrower"]),
        ("Owner of Public Record", a["owner"]), ("Occupant", "Owner"),
        ("Lender / Client", a["lender"]), ("Lender Address", a["lender_addr"]),
        ("Assignment Type", "Purchase Transaction"), ("Loan Program", a["program"]),
    ]
    if a.get("case_no"):
        summary.append((a["case_no"][0], a["case_no"][1]))
        summary.append(("Intended Use", "Mortgage finance transaction"))
    contract = [
        ("Contract Price", money(a["contract_price"])), ("Date of Contract", a["contract_date"]),
        ("Data Source(s) for Contract", a["contract_src"]), ("Seller is Owner of Public Record", "Yes"),
        ("Financial Assistance to Borrower", a["assistance"]), ("Contract Analysis", a["contract_note"]),
    ]
    p1 = f"<h1>{title}</h1>"
    if legacy:
        p1 += "<h2>Subject</h2>" + kv(summary) + "<h2>Contract</h2>" + kv(contract)
    else:
        p1 += ("<h2>Summary</h2>" + kv([("Opinion of Market Value", f"<b>{money(a['value'])}</b>"),
                                         ("Effective Date", a["effective"]),
                                         ("Condition of Appraisal", a["as_is"]),
                                         ("Contract Price", money(a["contract_price"]))])
               + "<h2>Assignment Information</h2>" + kv(summary) + "<h2>Sales Contract</h2>" + kv(contract))
    p1 += "<h2>Neighborhood</h2>" + kv(a["neighborhood"]) + f"<p>{a['nbhd_desc']}</p>"
    p1 += f"<p><b>Market Conditions:</b> {a['market']}</p>"
    pages.append(p1)

    # Page 2: site and improvements
    p2 = "<h2>Site</h2>" + kv(a["site"])
    if legacy:
        p2 += "<h2>Improvements</h2>" + kv(a["improvements"])
    else:
        p2 += "<h2>Dwelling: Exterior and Systems</h2>" + kv(a["improvements"])
        p2 += "<h2>Dwelling: Levels</h2><table><tr><th>Level</th><th>Grade</th><th>Finished Area</th>" \
              "<th>Unfinished Area</th><th>Rooms</th><th>Bedrooms</th><th>Baths</th></tr>"
        for lv in a["levels"]:
            p2 += "<tr>" + "".join(f"<td>{x}</td>" for x in lv) + "</tr>"
        p2 += "</table>"
    p2 += f"<p><b>Condition and updates:</b> {a['condition_text']}</p>"
    p2 += f"<p><b>Additional features:</b> {a['features']}</p>"
    pages.append(p2)

    # Page 3: sales comparison grid
    p3 = "<h2>Sales Comparison Approach</h2>"
    p3 += f"<p class='small'>{a['grid_note']}</p>"
    p3 += grid_html(a["grid_subject"], a["comps"])
    pages.append(p3)

    # Page 4: comments and reconciliation
    p4 = "<h2>Summary of Sales Comparison Approach</h2>" + "".join(f"<p>{x}</p>" for x in a["sca_comments"])
    p4 += "<h2>Prior Sales and Transfers</h2>" + f"<p>{a['prior_sales']}</p>"
    p4 += "<h2>Reconciliation</h2>" + "".join(f"<p>{x}</p>" for x in a["reconciliation"])
    p4 += kv([("Indicated Value by Sales Comparison Approach", money(a["value"])),
              ("Cost Approach", "Not developed"), ("Income Approach", "Not developed"),
              ("Opinion of Market Value", f"<b>{money(a['value'])}</b>"),
              ("As of (Effective Date)", a["effective"]), ("Condition of Appraisal", a["as_is"])])
    pages.append(p4)

    # Page 5: sketch and area calculations
    p5 = "<h2>Building Sketch and Area Calculations</h2>"
    p5 += "<p class='small'>Measured by the appraiser on the effective date under ANSI Z765-2021. Sketch drawing omitted from this made-up file; the area table is shown.</p>"
    p5 += "<table><tr><th>Area</th><th>Dimensions</th><th>Square Feet</th><th>Note</th></tr>"
    for r in a["sketch"]:
        p5 += "<tr>" + "".join(f"<td>{x}</td>" for x in r) + "</tr>"
    p5 += "</table>"
    p5 += kv(a["sketch_totals"], cols=1)
    pages.append(p5)

    # Page 6: subject photos
    p6 = "<h2>Subject Photo Addendum</h2>" + "".join(
        f"<div class='box'><span>[photo] {lbl}</span></div>" for lbl in a["photos"])
    pages.append(p6)

    # Page 7: comparable photos and location
    p7 = "<h2>Comparable Photo Page and Location Map</h2>" + "".join(
        f"<div class='box'><span>[photo] Comparable {i + 1}<br>{c['lines']['addr'][0]}</span></div>"
        for i, c in enumerate(a["comps"]))
    p7 += "<table><tr><th>Property</th><th>Proximity to Subject</th></tr>"
    p7 += f"<tr><td>Subject: {s['address']}</td><td>n/a</td></tr>"
    for i, c in enumerate(a["comps"]):
        p7 += f"<tr><td>Comparable {i + 1}: {c['lines']['addr'][0]}</td><td>{c['lines']['prox'][0]}</td></tr>"
    p7 += "</table>"
    pages.append(p7)

    # Page 8: certification
    p8 = "<h2>Appraiser's Certification (excerpt) and Signature</h2>"
    p8 += ("<p>I certify that, to the best of my knowledge and belief, I performed this appraisal in accordance with "
           "the requirements of the Uniform Standards of Professional Appraisal Practice, I personally inspected the "
           "interior and exterior of the subject property, and my opinion of market value is not based on any "
           "predetermined value or the amount of the loan. (Made-up excerpt for practice.)</p>")
    p8 += kv([("Appraiser", a["appraiser"]), ("Company", a["appraiser_co"]),
              ("State Certification #", a["license"]), ("State", a["license_state"]),
              ("Date of Signature and Report", a["report_date"]), ("Effective Date of Appraisal", a["effective"]),
              ("Appraised Value of Subject Property", money(a["value"])), ("Signature", "[signed electronically]")])
    pages.append(p8)

    write_html(a["html"], a["pdf"], pages, a["pdf"])
    return a


def comp(price, grid_gla, **lines):
    return {"price": price, "grid_gla": grid_gla, "lines": lines}


# --------------------------------------------------------------------------------------------------
# PRACTICE: 4127 W Practice Ridge Dr (Utah, conventional, December 4, 2024 REPC). Two comparables'
# basements counted as above-grade GLA; farther comps while closer sales closed before the effective date.
# --------------------------------------------------------------------------------------------------

P_SUBJ_GRID = {
    "addr": "4127 W Practice Ridge Dr, Example Springs, UT 84000", "prox": "", "price": "$640,000",
    "ppsf": "$390.24 / sq ft", "src": "Inspection; MLS #2290318", "conc": "", "date": "",
    "loc": "N; Res.", "site": "0.21 ac", "view": "N; Res.", "design": "DT1; Rambler",
    "quality": "Q4", "age": "17 (2009)", "cond": "C3", "rooms": "6 / 3 / 2.0", "gla": "1,640 sq ft",
    "bsmt": "1,600 sq ft / 1,480 sq ft fin.", "below": "1 / 2 / 1.0", "heat": "FAU / Central",
    "garage": "3-car att.", "porch": "Covered deck",
}
P_COMPS = [
    comp(598000, 1590,
         addr=("2288 W Example Meadow Ln, Example Springs", 0), prox=("1.62 miles NW", 0),
         src=("MLS #2286710; DOM 21", 0), conc=("None", 0), date=("s08/14/2026; c07/24/2026", 0),
         loc=("N; Res.", 0), site=("0.19 ac", 0), view=("N; Res.", 0), design=("DT1; Rambler", 0),
         quality=("Q4", 0), age=("20 (2006)", 0), cond=("C3", 0), rooms=("6 / 3 / 2.0", 0),
         gla=("1,590 sq ft", 2500), bsmt=("1,560 sq ft / 1,400 sq ft fin.", 2000), below=("1 / 2 / 1.0", 0),
         heat=("FAU / Central", 0), garage=("2-car att.", 10000), porch=("Covered deck", 0)),
    comp(655000, 3080,
         addr=("9814 S Sample Bend Dr, Example Springs", 0), prox=("2.38 miles SE", 0),
         src=("MLS #2284471; DOM 14", 0), conc=("None", 0), date=("s07/02/2026; c06/09/2026", 0),
         loc=("N; Res.", 0), site=("0.20 ac", 0), view=("N; Res.", 0), design=("DT1; Rambler", 0),
         quality=("Q4", 0), age=("14 (2012)", 0), cond=("C3", 0), rooms=("9 / 5 / 3.0", -5000),
         gla=("3,080 sq ft", -72000), bsmt=("0 sq ft", 37000), below=("None", 0),
         heat=("FAU / Central", 0), garage=("3-car att.", 0), porch=("Covered deck", 0)),
    comp(640000, 3150,
         addr=("7741 S Placeholder Hollow Way, Example Springs", 0), prox=("2.91 miles S", 0),
         src=("MLS #2280962; DOM 31", 0), conc=("None", 0), date=("s05/21/2026; c04/22/2026", 0),
         loc=("N; Res.", 0), site=("0.22 ac", 0), view=("N; Res.", 0), design=("DT1; Rambler", 0),
         quality=("Q4", 0), age=("15 (2011)", 0), cond=("C3", 0), rooms=("9 / 5 / 3.0", -5000),
         gla=("3,150 sq ft", -75500), bsmt=("0 sq ft", 37000), below=("None", 0),
         heat=("FAU / Central", 0), garage=("3-car att.", 0), porch=("Patio", 0)),
]
assert [comp_totals(c)[2] for c in P_COMPS] == [612500, 615000, 596500]

appraisal({
    "html": "practice-appraisal.html", "pdf": "practice/01 Appraisal Report - 4127 W Practice Ridge Dr.pdf",
    "layout": "legacy", "file_no": "PVS-26-1044", "effective": "10/27/2026", "report_date": "10/30/2026",
    "subject": {"address": "4127 W Practice Ridge Dr", "csz": "Example Springs, UT 84000", "county": "Sample County",
                "apn": "00-000-0041", "legal": "Lot 41, Practice Ridge Estates Phase 2"},
    "borrower": "Jordan Example; Casey Example", "owner": "Riley Sample; Morgan Sample",
    "lender": "Make-Believe Mortgage Co.", "lender_addr": "100 Pretend Plaza, Example Springs, UT 84000",
    "program": "Conventional", "contract_price": 640000, "contract_date": "10/07/2026",
    "contract_src": "Purchase contract and Addendum No. 1; MLS #2290318",
    "assistance": "Yes: $6,000 seller contribution toward buyer closing costs (Addendum No. 1)",
    "contract_note": "The contract was analyzed; list price $645,000, contract price $640,000. Arm's length.",
    "neighborhood": [("Location", "Suburban"), ("Built-Up", "Over 75%"), ("Growth", "Stable"),
                     ("Property Values", "Stable"), ("Demand / Supply", "In Balance"),
                     ("Marketing Time", "Under 3 months"), ("One-Unit Price Range", "$540,000 to $780,000"),
                     ("Present Land Use", "One-unit 85%, vacant 5%, commercial 10%")],
    "nbhd_desc": ("Neighborhood boundaries: 3600 West to the east, 4800 West to the west, Example Springs Parkway to "
                  "the north and 9000 South to the south. Established subdivisions of one-unit homes with access to "
                  "shopping and commuter routes."),
    "market": "Values have been stable over the prior 12 months. No time adjustments were warranted.",
    "site": [("Dimensions", "70 x 131 (irregular)"), ("Area", "0.21 ac (9,148 sq ft)"), ("Shape", "Rectangular"),
             ("View", "Residential"), ("Zoning", "R-1-8, legal"), ("Utilities", "Public water, sewer, power, gas"),
             ("FEMA Flood Zone", "X"), ("Adverse Site Conditions", "None observed")],
    "improvements": [("Units", "One"), ("Stories", "1"), ("Type", "Detached"), ("Design (Style)", "Rambler"),
                     ("Year Built", "2009"), ("Effective Age", "10 years"), ("Foundation", "Full basement"),
                     ("Basement Area", "1,600 sq ft"), ("Basement Finish", "93% (1,480 sq ft)"),
                     ("Exterior Walls", "Brick and stucco"), ("Roof", "Architectural shingle"),
                     ("Heating / Cooling", "FAU gas / central air"), ("Car Storage", "3-car attached garage"),
                     ("Above Grade: Rooms", "6"), ("Above Grade: Bedrooms", "3"), ("Above Grade: Baths", "2.0"),
                     ("Gross Living Area Above Grade", "1,640 sq ft"),
                     ("Below Grade", "Family room, 2 bedrooms, 1 full bath")],
    "condition_text": ("C3. Well maintained. Kitchen counters replaced 2022; interior paint 2024. Finished basement "
                       "with family room, two bedrooms and a full bath."),
    "features": "Covered rear deck, fenced yard, gas fireplace in basement family room.",
    "grid_note": "There are 9 comparable properties currently offered for sale in the subject neighborhood ranging in price "
                 "from $599,000 to $729,900. There are 14 comparable sales in the subject neighborhood within the past "
                 "twelve months ranging in sale price from $560,000 to $702,000.",
    "grid_subject": P_SUBJ_GRID, "comps": P_COMPS, "value": 612000, "as_is": "As is",
    "sca_comments": [
        "Comparable search: closed rambler sales in the subject's subdivision were limited in the six months before the "
        "effective date. The search was expanded to 3 miles and 6 months to find ramblers of similar total size.",
        "Adjustments: gross living area at $50 per square foot; finished basement area at $25 per square foot; full "
        "baths at $5,000; garage stalls at $10,000. Site differences under 0.05 acre were not adjusted. Values were "
        "stable, so no time adjustments were made.",
        "Comparables 2 and 3 are larger homes and were adjusted downward for gross living area and bath count. "
        "Comparable 1 required upward adjustment for its two-car garage.",
    ],
    "prior_sales": "No prior sales or transfers of the subject in the 3 years before the effective date, and none of the "
                   "comparables in the 12 months before their sale dates, per the MLS and Sample County records.",
    "reconciliation": [
        "The comparables indicate an adjusted range of $596,500 to $615,000. Most weight is given to Comparables 1 and 2, "
        "which have the most recent sale dates. The opinion of market value is $612,000.",
        "The appraised value is below the contract price of $640,000.",
    ],
    "sketch": [("Main level (above grade)", "41 x 40", "1,640", "Gross living area"),
               ("Basement (below grade)", "40 x 40", "1,600", "Finished 1,480; unfinished mechanical and storage 120"),
               ("Garage", "36 x 20", "720", "3-car attached"), ("Covered deck", "20 x 12", "240", "")],
    "sketch_totals": [("Gross Living Area (above grade)", "1,640 sq ft"), ("Basement total", "1,600 sq ft"),
                      ("Basement finished", "1,480 sq ft")],
    "photos": ["Front view", "Rear view", "Street scene", "Kitchen", "Living room", "Primary bedroom",
               "Basement family room", "Basement bedroom", "Basement bathroom"],
    "appraiser": "Avery Makebelieve", "appraiser_co": "Pretend Valuation Services",
    "license": "0000000-CR00 (made up)", "license_state": "UT",
})

# REPC excerpt (December 4, 2024 form) with Addendum No. 1
FOOTER_2024 = ("THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, "
               "EFFECTIVE DECEMBER 4, 2024.")
FOOTER_2026 = ("THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, "
               "EFFECTIVE NOVEMBER 1, 2026. AS OF JANUARY 1, 2027, IT WILL REPLACE AND SUPERSEDE THE PREVIOUSLY "
               "APPROVED VERSION OF THIS FORM.")
APPR_2024 = ("<b>8.2 APPRAISAL CONDITION.</b> Buyer's obligation to purchase the Property: <span class='check'>[X] IS [ ] IS NOT</span> "
             "conditioned upon the Property appraising for not less than the Purchase Price. This condition is referred "
             "to as the \"Appraisal Condition.\" If checked in the affirmative, Sections 8.2(a) and 8.2(b) apply; otherwise "
             "they do not. (a) Buyer's Right to Cancel. If after completion of an appraisal by a licensed appraiser, Buyer "
             "receives written notice from the Lender or the appraiser that the Property has appraised for less than the "
             "Purchase Price (a \"Notice of Appraised Value\"), Buyer may cancel the REPC by providing written notice to "
             "Seller (with a copy of the Notice of Appraised Value) no later than the Financing &amp; Appraisal Deadline "
             "referenced in Section 24(c); whereupon the Earnest Money Deposit shall be released to Buyer without the "
             "requirement of further written authorization from Seller. (b) Failure to Cancel. If the REPC is not "
             "cancelled as provided in this section 8.2, Buyer shall be deemed to have waived the Appraisal Condition, and "
             "except as provided in Sections 8.1(b) and 8.3(b)(i), the Earnest Money Deposit shall become non-refundable.")
TIME_2024 = ("<b>21. TIME IS OF THE ESSENCE.</b> Time is of the essence regarding the dates set forth in the REPC. Extensions "
             "must be agreed to in writing by all parties. Unless otherwise explicitly stated in the REPC: (a) performance "
             "under each Section of the REPC which references a date shall absolutely be required by 5:00 PM Mountain Time "
             "on the stated date; and (b) the term \"days\" and \"calendar days\" shall mean calendar days and shall be "
             "counted beginning on the day following the event which triggers the timing requirement (e.g. Acceptance). "
             "Performance dates and times referenced herein shall not be binding upon title companies, lenders, appraisers "
             "and others not parties to the REPC, except as otherwise agreed to in writing by such non-party.")


def repc_2024(html, pdf, d, extra_pages=()):
    p1 = ("<h1>REAL ESTATE PURCHASE CONTRACT (excerpt)</h1><p class='small'>Made-up practice excerpt of the Utah "
          "state-approved form. Only the sections used here are shown.</p>"
          f"<p>On this {d['ord']} (\"Offer Reference Date\") {d['buyer']} (\"Buyer\") offers to purchase from "
          f"{d['seller']} (\"Seller\") the Property described below.</p>"
          f"<p>PROPERTY: {d['address']}, City of {d['city']}, County of {d['county']}, State of Utah, Zip {d['zip']}.</p>"
          "<h2>2. PURCHASE PRICE</h2>"
          f"<p><b>2.1 Method of Payment.</b> The purchase price for the Property is <b>{money(d['price'])}</b>.</p>"
          + kv([("(a) Earnest Money Deposit", money(d["em"])), ("(b) Additional Earnest Money Deposit", "$0"),
                ("(c) New Loan", f"{money(d['loan'])} [X] {d['loan_type']}"), ("(d) Seller Financing", "$0"),
                ("(e) Balance of Purchase Price in Cash at Settlement", money(d["cash"])),
                ("PURCHASE PRICE", money(d["price"]))], cols=1)
          + "<p><b>2.2 Sale of Buyer's Property.</b> <span class='check'>[ ] IS [X] IS NOT</span> conditioned upon the sale of real estate owned by Buyer.</p>")
    p2 = ("<h2>8. BUYER'S CONDITIONS OF PURCHASE</h2>"
          "<p><b>8.1 DUE DILIGENCE CONDITION.</b> <span class='check'>[X] IS</span> (text omitted from this excerpt).</p>"
          f"<p>{APPR_2024}</p>"
          "<p><b>8.3 FINANCING CONDITION.</b> (b) <span class='check'>[X]</span> Financing Required. Buyer's obligation to "
          "purchase the Property IS conditioned upon Buyer obtaining the Loan referenced in Section 2.1(c). (i) If Buyer "
          "cancels under this Section after the Due Diligence Deadline and no later than the Financing &amp; Appraisal "
          f"Deadline, {money(d['fin_em'])} of Buyer's Earnest Money Deposit shall be released to Seller; the remainder to Buyer.</p>")
    p3 = (f"<p>{TIME_2024}</p><h2>24. CONTRACT DEADLINES</h2>"
          + kv([("(a) Seller Disclosure Deadline", d["sdd"]), ("(b) Due Diligence Deadline", d["ddd"]),
                ("(c) Financing &amp; Appraisal Deadline", d["fad"]), ("(d) Settlement Deadline", d["setd"])], cols=1)
          + f"<p><b>9. ADDENDA.</b> There <span class='check'>[X] ARE</span> addenda: {d['addenda']}.</p>"
          + "<h2>Signatures and Acceptance</h2>"
          + kv([("Buyer", f"{d['buyer']} (signed {d['ord']})"),
                ("ACCEPTANCE", f"[X] Seller accepts the foregoing offer. {d['seller']}, signed {d['acc']}, communicated {d['acc']}")], cols=1)
          + f"<p class='small'>{FOOTER_2024}</p>")
    write_html(html, pdf, [p1, p2, p3, *extra_pages], pdf)


P_ADD1 = ("<h1>ADDENDUM NO. 1 TO REAL ESTATE PURCHASE CONTRACT</h1><p class='small'>Made-up practice addendum.</p>"
          "<p>THIS IS AN [X] ADDENDUM to that REAL ESTATE PURCHASE CONTRACT with an Offer Reference Date of October 6, 2026, "
          "between Jordan Example and Casey Example as Buyer, and Riley Sample and Morgan Sample as Seller, regarding the "
          "Property located at 4127 W Practice Ridge Dr, Example Springs, UT 84000.</p>"
          "<p>1. Seller agrees to contribute $6,000 at Settlement toward Buyer's closing costs, prepaid items and/or "
          "discount points, as permitted by Buyer's lender.</p>"
          "<p>Seller shall have until 9:00 PM Mountain Time on October 7, 2026 to accept the terms of this ADDENDUM in "
          "accordance with the provisions of Section 23 of the REPC.</p>"
          + kv([("Buyer signatures", "Jordan Example, Casey Example, October 6, 2026"),
                ("ACCEPTANCE", "[X] Seller accepts. Riley Sample, Morgan Sample, October 7, 2026")], cols=1))

repc_2024("practice-repc.html", "practice/02 REPC and Addendum - 4127 W Practice Ridge Dr.pdf", {
    "ord": "October 6, 2026", "acc": "October 7, 2026", "buyer": "Jordan Example and Casey Example",
    "seller": "Riley Sample and Morgan Sample", "address": "4127 W Practice Ridge Dr", "city": "Example Springs",
    "county": "Sample County", "zip": "84000", "price": 640000, "em": 10000, "loan": 512000,
    "loan_type": "Conventional", "cash": 118000, "fin_em": 1000, "sdd": "October 13, 2026",
    "ddd": "October 24, 2026", "fad": "November 13, 2026", "setd": "November 24, 2026",
    "addenda": "Addendum No. 1 (seller contribution)",
}, extra_pages=[P_ADD1])

CMA_COLS = ["MLS #", "Status", "Address", "City", "State", "Zip", "Subdivision", "Distance (mi)", "Style",
            "Year Built", "List Price", "Sold Price", "Seller Concessions", "List Date", "Pending Date", "Sold Date",
            "DOM", "Beds Above Grade", "Beds Below Grade", "Baths Above Grade", "Baths Below Grade",
            "Above Grade SqFt", "Below Grade SqFt", "Below Grade Fin SqFt", "Total SqFt", "Garage Spaces",
            "Lot Acres", "Special Conditions", "Public Remarks", "Private Remarks"]


def write_csv(path, rows):
    full = os.path.join(SKILL, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", newline="", encoding="utf-8") as f:
        f.write(STAMP + "\n")
        w = csv.writer(f)
        w.writerow(CMA_COLS)
        for r in rows:
            assert len(r) == len(CMA_COLS), r
            w.writerow(r)


P_CMA = [
    ["2290318", "Pending", "4127 W Practice Ridge Dr", "Example Springs", "UT", "84000", "Practice Ridge Estates", "0.00",
     "Rambler", 2009, 645000, "", "", "2026-09-26", "2026-10-07", "", 11, 3, 2, 2, 1, 1640, 1600, 1480, 3240, 3, 0.21,
     "Standard", "Rambler with finished basement, three car garage, covered deck. Counters 2022.", "Subject. Buyer: Example."],
    ["2290101", "Sold", "4089 W Practice Ridge Dr", "Example Springs", "UT", "84000", "Practice Ridge Estates", "0.08",
     "Rambler", 2009, 649900, 645000, 5000, "2026-08-01", "2026-08-20", "2026-09-18", 19, 3, 2, 2, 1, 1620, 1600, 1500,
     3220, 3, 0.20, "Standard", "Rambler with finished basement, updated kitchen 2023, covered deck.",
     "Lockbox code 4417 on side door. Sellers relocating, motivated."],
    ["2290177", "Sold", "4210 W Sample Crest Cir", "Example Springs", "UT", "84000", "Practice Ridge Estates", "0.21",
     "Rambler", 2010, 655000, 652500, 0, "2026-09-05", "2026-09-14", "2026-10-09", 9, 3, 1, 2, 1, 1700, 1640, 1400,
     3340, 3, 0.22, "Standard", "Rambler, finished basement with theater room, three car garage.",
     "Call listing agent before showing."],
    ["2289954", "Sold", "3962 W Practice Ridge Dr", "Example Springs", "UT", "84000", "Practice Ridge Estates", "0.34",
     "Rambler", 2008, 634900, 628000, 3000, "2026-06-12", "2026-07-01", "2026-07-30", 19, 3, 2, 2, 1, 1580, 1580, 1580,
     3160, 2, 0.19, "Standard", "Fully finished basement, two car garage, corner lot.", ""],
    ["2291420", "Sold", "4155 W Example Knoll Ln", "Example Springs", "UT", "84000", "Practice Ridge Estates", "0.27",
     "Rambler", 2009, 655000, 650000, 0, "2026-09-22", "2026-10-04", "2026-11-03", 12, 3, 2, 2, 1, 1660, 1620, 1450,
     3280, 3, 0.21, "Standard", "Rambler, finished basement, new furnace 2025.", ""],
    ["2291002", "Pending", "4302 W Practice Ridge Dr", "Example Springs", "UT", "84000", "Practice Ridge Estates", "0.36",
     "Rambler", 2010, 659000, "", "", "2026-10-02", "2026-10-21", "", 19, 3, 2, 2, 1, 1650, 1610, 1500, 3260, 3, 0.20,
     "Standard", "Rambler with finished basement and mountain view.", ""],
    ["2291388", "Active", "4011 W Sample Crest Cir", "Example Springs", "UT", "84000", "Practice Ridge Estates", "0.18",
     "Rambler", 2009, 664900, "", "", "2026-10-24", "", "", 15, 3, 2, 2, 1, 1690, 1620, 1500, 3310, 3, 0.23,
     "Standard", "Rambler, finished basement, solar panels owned.", "Vacant. Go direct."],
    ["2288850", "Sold", "4378 W Practice Ridge Dr", "Example Springs", "UT", "84000", "Practice Ridge Estates", "0.30",
     "Two Story", 2011, 709900, 702000, 0, "2026-07-18", "2026-08-02", "2026-08-28", 15, 4, 1, 2.5, 1, 2450, 1200, 1100,
     3650, 3, 0.24, "Standard", "Two story with finished basement.", ""],
    ["2289031", "Sold", "3890 W Example Knoll Ln", "Example Springs", "UT", "84000", "Practice Ridge Estates", "0.41",
     "Rambler", 2008, 575000, 560000, 0, "2026-08-04", "2026-08-12", "2026-09-02", 8, 3, 1, 2, 1, 1600, 1560, 900,
     3160, 2, 0.20, "Bank Owned/REO", "Bank owned. Sold as-is; needs flooring and paint.", ""],
    ["2286710", "Sold", "2288 W Example Meadow Ln", "Example Springs", "UT", "84000", "Meadow Example Park", "1.62",
     "Rambler", 2006, 605000, 598000, 0, "2026-07-03", "2026-07-24", "2026-08-14", 21, 3, 2, 2, 1, 1590, 1560, 1400,
     3150, 2, 0.19, "Standard", "Rambler, finished basement, two car garage.", ""],
    ["2284471", "Sold", "9814 S Sample Bend Dr", "Example Springs", "UT", "84000", "Sample Bend", "2.38",
     "Rambler", 2012, 659000, 655000, 0, "2026-05-26", "2026-06-09", "2026-07-02", 14, 3, 2, 2, 1, 1560, 1520, 1450,
     3080, 3, 0.20, "Standard", "Rambler with finished basement and three car garage.", ""],
    ["2280962", "Sold", "7741 S Placeholder Hollow Way", "Example Springs", "UT", "84000", "Placeholder Hollow", "2.91",
     "Rambler", 2011, 649900, 640000, 0, "2026-03-22", "2026-04-22", "2026-05-21", 31, 3, 2, 2, 1, 1610, 1540, 1540,
     3150, 3, 0.22, "Standard", "Rambler, fully finished basement, three car garage.", ""],
]
write_csv("practice/03 CMA Export - 4127 W Practice Ridge Dr.csv", P_CMA)

# --------------------------------------------------------------------------------------------------
# CASE 1: 1586 E Example Orchard Ln (Utah, conventional, November 1, 2026 REPC, buyer side). The report's
# grid and levels table show the basement unfinished; its own sketch and photos show 980 sq ft finished.
# Appraisal Deadline November 10, 2026 (within 48 hours of November 8).
# --------------------------------------------------------------------------------------------------

C1_SUBJ_GRID = {
    "addr": "1586 E Example Orchard Ln, Sampleville, UT 84000", "price": "$575,000", "ppsf": "$263.76 / sq ft",
    "src": "Inspection; MLS #2290455", "loc": "N; Res.", "site": "0.17 ac", "view": "N; Res.",
    "design": "DT2; Two Story", "quality": "Q4", "age": "12 (2014)", "cond": "C3", "rooms": "8 / 4 / 2.5",
    "gla": "2,180 sq ft", "bsmt": "1,050 sq ft / 0 sq ft fin.", "below": "0 / 0 / 0.0", "heat": "FAU / Central",
    "garage": "2-car att.", "porch": "Patio",
}
C1_COMPS = [
    comp(574000, 2150,
         addr=("1702 E Sample Orchard Ct, Sampleville", 0), prox=("0.22 miles NE", 0), src=("MLS #2289340; DOM 12", 0),
         conc=("None", 0), date=("s09/02/2026; c08/10/2026", 0), loc=("N; Res.", 0), site=("0.16 ac", 0),
         view=("N; Res.", 0), design=("DT2; Two Story", 0), quality=("Q4", 0), age=("11 (2015)", 0), cond=("C3", 0),
         rooms=("8 / 4 / 2.5", 0), gla=("2,150 sq ft", 1650), bsmt=("1,000 sq ft / 900 sq ft fin.", -27000),
         below=("1 / 1 / 1.0", -7500), heat=("FAU / Central", 0), garage=("2-car att.", 0), porch=("Patio", 0)),
    comp(569900, 2200,
         addr=("1544 E Placeholder Grove Dr, Sampleville", 0), prox=("0.35 miles W", 0), src=("MLS #2288815; DOM 20", 0),
         conc=("None", 0), date=("s08/19/2026; c07/28/2026", 0), loc=("N; Res.", 0), site=("0.18 ac", 0),
         view=("N; Res.", 0), design=("DT2; Two Story", 0), quality=("Q4", 0), age=("13 (2013)", 0), cond=("C3", 0),
         rooms=("8 / 4 / 2.5", 0), gla=("2,200 sq ft", -1100), bsmt=("1,100 sq ft / 1,000 sq ft fin.", -30000),
         below=("1 / 1 / 1.0", -7500), heat=("FAU / Central", 0), garage=("2-car att.", 0), porch=("Patio", 0)),
    comp(566000, 2120,
         addr=("1820 E Example Orchard Ln, Sampleville", 0), prox=("0.41 miles E", 0), src=("MLS #2287102; DOM 25", 0),
         conc=("None", 0), date=("s07/11/2026; c06/15/2026", 0), loc=("N; Res.", 0), site=("0.17 ac", 0),
         view=("N; Res.", 0), design=("DT2; Two Story", 0), quality=("Q4", 0), age=("12 (2014)", 0), cond=("C3", 0),
         rooms=("8 / 4 / 2.5", 0), gla=("2,120 sq ft", 3300), bsmt=("1,000 sq ft / 850 sq ft fin.", -25500),
         below=("1 / 1 / 1.0", -7500), heat=("FAU / Central", 0), garage=("2-car att.", 0), porch=("Patio", 0)),
]
assert [comp_totals(c)[2] for c in C1_COMPS] == [541150, 531300, 536300]

appraisal({
    "html": "case1-appraisal.html",
    "pdf": "evals/files/case-1-missed-basement-finish/Appraisal Report - 1586 E Example Orchard Ln.pdf",
    "layout": "redesign", "file_no": "PAP-26-3187", "effective": "11/04/2026", "report_date": "11/06/2026",
    "subject": {"address": "1586 E Example Orchard Ln", "csz": "Sampleville, UT 84000", "county": "Sample County",
                "apn": "00-000-1586", "legal": "Lot 112, Example Orchard Subdivision Phase 4"},
    "borrower": "Taylor Example; Drew Example", "owner": "Quinn Sample",
    "lender": "Example Lending Group", "lender_addr": "200 Fictional Ave, Sampleville, UT 84000",
    "program": "Conventional", "contract_price": 575000, "contract_date": "11/02/2026",
    "contract_src": "Purchase contract; MLS #2290455", "assistance": "None",
    "contract_note": "The contract was analyzed; list price $579,900, contract price $575,000. Arm's length.",
    "neighborhood": [("Location", "Suburban"), ("Built-Up", "Over 75%"), ("Growth", "Stable"),
                     ("Property Values", "Stable"), ("Demand / Supply", "In Balance"),
                     ("Marketing Time", "Under 3 months"), ("One-Unit Price Range", "$480,000 to $690,000"),
                     ("Present Land Use", "One-unit 90%, multi-unit 5%, commercial 5%")],
    "nbhd_desc": "Neighborhood boundaries: 1200 East, 2200 East, Orchard Parkway and 3300 North. Subdivisions of one-unit "
                 "two story homes built 2008 to 2018, near shopping and the commuter rail station.",
    "market": "Stable values over the prior 12 months; no time adjustments.",
    "site": [("Area", "0.17 ac (7,405 sq ft)"), ("Shape", "Rectangular"), ("View", "Residential"),
             ("Zoning", "R-1-6, legal"), ("Utilities", "Public"), ("FEMA Flood Zone", "X")],
    "improvements": [("Units", "One"), ("Stories", "2"), ("Design (Style)", "Two Story"), ("Year Built", "2014"),
                     ("Foundation", "Full basement"), ("Exterior", "Stucco and stone"), ("Roof", "Architectural shingle"),
                     ("Heating / Cooling", "FAU gas / central air"), ("Car Storage", "2-car attached garage"),
                     ("Gross Living Area Above Grade", "2,180 sq ft")],
    "levels": [("Level 1", "Above grade", "1,090", "0", "4", "0", "0.5"),
               ("Level 2", "Above grade", "1,090", "0", "4", "4", "2.0"),
               ("Basement", "Below grade", "0", "1,050", "0", "0", "0.0")],
    "condition_text": "C3. Maintained; carpet replaced 2023. No deferred maintenance observed.",
    "features": "Fenced rear yard, patio, gas fireplace.",
    "grid_note": "All three sales are in the subject's market area and closed within four months of the effective date.",
    "grid_subject": C1_SUBJ_GRID, "comps": C1_COMPS, "value": 538000, "as_is": "As is",
    "sca_comments": [
        "All comparables are two story homes in the subject's subdivision or the adjoining phase.",
        "Adjustments: gross living area at $55 per square foot; finished basement area at $30 per square foot; rooms "
        "below grade (a bedroom and a bath) at $7,500. No time adjustments; values stable.",
        "Each comparable has a finished basement and was adjusted downward for basement finish and rooms below grade, "
        "as the subject basement is unfinished.",
    ],
    "prior_sales": "No prior sale of the subject within 3 years. No prior sales of the comparables within 12 months.",
    "reconciliation": ["Adjusted range $531,300 to $541,150. Equal weight given to all three. Opinion of market value "
                       "$538,000, below the contract price of $575,000."],
    "sketch": [("Level 1 (above grade)", "33 x 33", "1,090", "Gross living area"),
               ("Level 2 (above grade)", "33 x 33", "1,090", "Gross living area"),
               ("Basement finished (below grade)", "irregular", "980", "Family room, bedroom 5, bath 3"),
               ("Basement unfinished (below grade)", "7 x 10", "70", "Mechanical"),
               ("Garage", "22 x 22", "484", "2-car attached")],
    "sketch_totals": [("Gross Living Area (above grade)", "2,180 sq ft"), ("Basement total", "1,050 sq ft"),
                      ("Basement finished", "980 sq ft")],
    "photos": ["Front view", "Rear view", "Street scene", "Kitchen", "Living room", "Primary bedroom",
               "Basement family room", "Basement bedroom (bedroom 5)", "Basement bathroom (bath 3)"],
    "appraiser": "Rowan Fictional", "appraiser_co": "Pretend Appraisal Partners",
    "license": "0000000-CR01 (made up)", "license_state": "UT",
})

C1_MLS = [(
    "<h1>MLS Agent Full Detail Report</h1><p class='small'>Made-up MLS sheet for practice. Example MLS of Utah (fictional).</p>"
    + kv([("MLS #", "2290455"), ("Status", "Under Contract (11/02/2026)"), ("List Price", "$579,900"),
          ("Address", "1586 E Example Orchard Ln, Sampleville, UT 84000"), ("Subdivision", "Example Orchard Phase 4"),
          ("Style", "Two Story"), ("Year Built", "2014"), ("Lot Acres", "0.17"), ("Garage", "2 car attached"),
          ("Beds Total", "5 (4 above grade, 1 basement)"), ("Baths Total", "3.5 (2.5 above grade, 1 basement)"),
          ("Above Grade Finished SqFt", "2,180"), ("Below Grade SqFt", "1,050"), ("Below Grade Finished SqFt", "980"),
          ("Total Finished SqFt", "3,160"), ("Basement", "Full, 93% finished"), ("Heating / Cooling", "Gas forced air / central air"),
          ("HOA", "None"), ("Taxes (2025)", "$2,914")])
    + "<h2>Public Remarks</h2><p>Two story with a finished basement: family room, fifth bedroom and full bath, finished "
      "in 2021 with a permit. Fenced yard, patio and a two car garage.</p>"
    + "<h2>Agent Remarks (agent only)</h2><p>Lockbox code 2468 on back door. Seller prefers a 30 day close.</p>"
    + "<h2>Showing Instructions (agent only)</h2><p>Text listing agent at 801-555-0142 before showing.</p>"
    + "<h2>Room Detail</h2><table><tr><th>Level</th><th>Rooms</th></tr>"
      "<tr><td>Main</td><td>Living room, kitchen, dining, half bath, laundry</td></tr>"
      "<tr><td>Upper</td><td>Primary bedroom with bath, 3 bedrooms, full bath</td></tr>"
      "<tr><td>Basement</td><td>Family room, bedroom, full bath, mechanical</td></tr></table>"
)]
write_html("case1-mls.html", "evals/files/case-1-missed-basement-finish/MLS Agent Detail - 1586 E Example Orchard Ln.pdf",
           C1_MLS, "MLS Agent Detail")

APPR_2026 = ("<b>12.2 Appraisal Condition.</b> Buyer's obligation to purchase the Property is conditioned upon the Property "
             "appraising for not less than the Purchase Price as defined in this Section 12.2(a) below and ONLY applies if "
             "checked in the affirmative in Section 3(b); otherwise Section 12.2(a) through 12.2(b) do not apply. This "
             "condition is referred to as the \"Appraisal Condition.\" (a) Buyer's Right to Cancel. Seller agrees to "
             "cooperate with Buyer's appraisal. If after completion of an appraisal by a licensed appraiser, Buyer receives "
             "written notice from the Lender or the appraiser that the Property has appraised for less than the Purchase "
             "Price, Buyer may cancel the REPC by providing written notice to Seller, along with a complete copy of the "
             "appraisal, no later than the Appraisal Deadline referenced in Section 4(c); whereupon the Earnest Money Deposit "
             "shall be released to Buyer without the requirement of further written authorization from Seller. Buyer's "
             "cancellation under Section 12.2(a) is separate and distinct from Buyer's rights to cancel under other sections "
             "of the REPC. (b) Failure to Cancel. If the REPC is not cancelled as provided in this Section 12.2, Buyer shall "
             "be deemed to have waived the Appraisal Condition, and except as provided in Sections 12.1(b) and 12.3(a), the "
             "Earnest Money Deposit shall become non-refundable.")
TIME_2026 = ("<b>25. TIME IS OF THE ESSENCE.</b> Time is of the essence regarding the dates set forth in the REPC. Any extension "
             "of the deadlines within the REPC must be agreed to in writing by all parties. Unless otherwise explicitly stated "
             "in the REPC: (a) performance under each Section of the REPC which references a date shall absolutely be required "
             "by 5:00 PM Mountain Time on the stated date; and (b) the term \"days\" and \"calendar days\" shall mean calendar "
             "days and shall be counted beginning on the day following the event which triggers the timing requirement (e.g., "
             "Acceptance). Buyer and Seller agree that if any dates for the Earnest Money delivery, Earnest Money Deposit or the "
             "Settlement Deadline referenced in this REPC fall on a Saturday, Sunday, or legal holiday, performance shall be "
             "required on the next business day. Performance dates and times referenced herein shall not be binding upon title "
             "companies, lenders, appraisers and others not parties to the REPC, except as otherwise agreed to in writing by "
             "such non-party.")

C1_REPC = [
    ("<h1>REAL ESTATE PURCHASE CONTRACT (excerpt)</h1><p class='small'>Made-up practice excerpt of the Utah form. Only the "
     "sections used here are shown.</p><p>On this November 1, 2026 (\"Offer Reference Date\") Taylor Example and Drew "
     "Example (\"Buyer\") offers to purchase from Quinn Sample (\"Seller\") the Property described below.</p>"
     "<p>PROPERTY: 1586 E Example Orchard Ln, City of Sampleville, County of Sample County, State of Utah, Zip 84000.</p>"
     "<h2>1. PURCHASE PRICE AND PAYMENT</h2>"
     + kv([("(a) Earnest Money Deposit", "$8,000"),
           ("(b) New Loan", "$546,250 [X] Conventional loan [ ] FHA loan [ ] VA loan [ ] USDA loan"),
           ("(c) Seller Financing", "$0"), ("(d) Other", "$0"), ("(e) Balance of Purchase Price in Cash at Settlement", "$20,750"),
           ("PURCHASE PRICE", "$575,000")], cols=1)
     + "<h2>2. SELLER CONTRIBUTIONS</h2><p>2.2 Seller's Contribution to Closing Costs: $0.</p>"
     + "<h2>3. BUYER CONDITIONS OF PURCHASE</h2><p class='check'>(a) [X] Due Diligence Condition (see Section 12.1)<br>"
       "(b) [X] Appraisal Condition (see Section 12.2)<br>(c) [X] Financing Condition (see Section 12.3): (i) [X] 50% of the "
       "Earnest Money Deposit<br>(d) [ ] Subject to Sale of Buyer's Property Condition</p>"
     + "<h2>4. REPC DEADLINES</h2>"
     + kv([("(a) Seller Disclosure Deadline", "November 4, 2026"), ("(b) Due Diligence Deadline", "November 7, 2026"),
           ("(c) Appraisal Deadline", "November 10, 2026"), ("(d) Financing Deadline", "November 17, 2026"),
           ("(e) Settlement Deadline", "November 24, 2026"), ("(f) Possession", "[X] Upon Recording")], cols=1)),
    f"<h2>12. BUYER'S CONDITIONS OF PURCHASE</h2><p>12.1 Due Diligence Condition (text omitted from this excerpt).</p><p>{APPR_2026}</p>"
    f"<p>{TIME_2026}</p>"
    + "<h2>Acceptance</h2>" + kv([("Buyer", "Taylor Example, Drew Example, signed November 1, 2026"),
                                   ("ACCEPTANCE", "[X] Seller accepts. Quinn Sample, signed November 2, 2026; Received November 2, 2026")], cols=1)
    + f"<p class='small'>{FOOTER_2026}</p>",
]
write_html("case1-repc.html", "evals/files/case-1-missed-basement-finish/REPC - 1586 E Example Orchard Ln.pdf", C1_REPC, "REPC")

# --------------------------------------------------------------------------------------------------
# CASE 2: 2290 N Sample Willow Way (Utah, FHA, December 4, 2024 REPC, listing side). Comparables 2.14 to
# 3.42 miles away; the listing agent's CMA has three closer sales that closed before the effective date,
# one that closed after it, a pending, an active and an old short sale. The CMA carries agent-only notes.
# --------------------------------------------------------------------------------------------------

C2_SUBJ_GRID = {
    "addr": "2290 N Sample Willow Way, Sampleville, UT 84000", "price": "$689,000", "ppsf": "$287.08 / sq ft",
    "src": "Inspection; MLS #2289400", "loc": "N; Res.", "site": "0.25 ac", "view": "N; Res.",
    "design": "DT2; Two Story", "quality": "Q4", "age": "8 (2018)", "cond": "C2", "rooms": "8 / 4 / 2.5",
    "gla": "2,400 sq ft", "bsmt": "1,200 sq ft / 0 sq ft fin.", "below": "0 / 0 / 0.0", "heat": "FAU / Central",
    "garage": "3-car att.", "porch": "Patio",
}
C2_COMPS = [
    comp(648000, 2350,
         addr=("615 W Pretend Heights Dr, Sampleville", 0), prox=("2.14 miles SW", 0), src=("MLS #2289120; DOM 17", 0),
         conc=("None", 0), date=("s09/12/2026; c08/20/2026", 0), loc=("N; Res.", 0), site=("0.19 ac", 8000),
         view=("N; Res.", 0), design=("DT2; Two Story", 0), quality=("Q4", 0), age=("10 (2016)", 2000), cond=("C2", 0),
         rooms=("8 / 4 / 2.5", 0), gla=("2,350 sq ft", 3000), bsmt=("1,150 sq ft / 0 sq ft fin.", 0),
         below=("0 / 0 / 0.0", 0), heat=("FAU / Central", 0), garage=("3-car att.", 0), porch=("Patio", 0)),
    comp(671500, 2520,
         addr=("77 S Example Butte Rd, Pretendville", 0), prox=("3.42 miles S", 0), src=("MLS #2288644; DOM 22", 0),
         conc=("None", 0), date=("s08/28/2026; c08/01/2026", 0), loc=("N; Res.", 0), site=("0.24 ac", 0),
         view=("N; Res.", 0), design=("DT2; Two Story", 0), quality=("Q4", 0), age=("7 (2019)", -1000), cond=("C2", 0),
         rooms=("8 / 4 / 3.0", -2500), gla=("2,520 sq ft", -7200), bsmt=("1,260 sq ft / 0 sq ft fin.", 0),
         below=("0 / 0 / 0.0", 0), heat=("FAU / Central", 0), garage=("3-car att.", 0), porch=("Patio", 0)),
    comp(639900, 2300,
         addr=("1408 W Pretend Heights Dr, Sampleville", 0), prox=("2.31 miles SW", 0), src=("MLS #2286030; DOM 26", 0),
         conc=("$6,000 seller paid closing costs", -6000), date=("s06/30/2026; c06/04/2026", 0), loc=("N; Res.", 0),
         site=("0.17 ac", 10000), view=("N; Res.", 0), design=("DT2; Two Story", 0), quality=("Q4", 0),
         age=("11 (2015)", 3000), cond=("C2", 0), rooms=("8 / 4 / 2.5", 0), gla=("2,300 sq ft", 6000),
         bsmt=("1,100 sq ft / 0 sq ft fin.", 0), below=("0 / 0 / 0.0", 0), heat=("FAU / Central", 0),
         garage=("2-car att.", 10000), porch=("Patio", 0)),
]
assert [comp_totals(c)[2] for c in C2_COMPS] == [661000, 660800, 662900]

appraisal({
    "html": "case2-appraisal.html",
    "pdf": "evals/files/case-2-distant-comps-listing-side/Appraisal Report FHA - 2290 N Sample Willow Way.pdf",
    "layout": "legacy", "file_no": "EAC-26-0912", "effective": "10/30/2026", "report_date": "11/03/2026",
    "subject": {"address": "2290 N Sample Willow Way", "csz": "Sampleville, UT 84000", "county": "Sample County",
                "apn": "00-000-2290", "legal": "Lot 18, Willow Example Farms Plat B"},
    "borrower": "Sam Example; Alex Example", "owner": "Jamie Sample; Pat Sample",
    "lender": "Pretend Home Loans", "lender_addr": "300 Notreal Blvd, Sampleville, UT 84000",
    "program": "FHA", "case_no": ("FHA Case No.", "000-0000001 (made up)"),
    "contract_price": 689000, "contract_date": "10/10/2026",
    "contract_src": "Purchase contract and FHA/VA Loan Addendum; MLS #2289400",
    "assistance": "Yes: $8,000 seller contribution toward closing costs (FHA/VA Loan Addendum, Section 6)",
    "contract_note": "The contract was analyzed; list price $695,000, contract price $689,000. Arm's length.",
    "neighborhood": [("Location", "Suburban"), ("Built-Up", "25 to 75%"), ("Growth", "Stable"),
                     ("Property Values", "Stable"), ("Demand / Supply", "In Balance"),
                     ("Marketing Time", "Under 3 months"), ("One-Unit Price Range", "$560,000 to $820,000"),
                     ("Present Land Use", "One-unit 80%, vacant 15%, commercial 5%")],
    "nbhd_desc": "Neighborhood boundaries: 1800 North, 2800 North, 400 West and 1600 West. Newer subdivisions of one-unit "
                 "homes built 2014 to 2024.",
    "market": "Stable values; no time adjustments.",
    "site": [("Area", "0.25 ac (10,890 sq ft)"), ("Shape", "Rectangular"), ("View", "Residential"),
             ("Zoning", "R-1-10, legal"), ("Utilities", "Public; secondary water"), ("FEMA Flood Zone", "X")],
    "improvements": [("Units", "One"), ("Stories", "2"), ("Type", "Detached"), ("Design (Style)", "Two Story"),
                     ("Year Built", "2018"), ("Effective Age", "5 years"), ("Foundation", "Full basement"),
                     ("Basement Area", "1,200 sq ft"), ("Basement Finish", "0%"), ("Exterior Walls", "Stucco and stone"),
                     ("Roof", "Architectural shingle"), ("Heating / Cooling", "FAU gas / central air"),
                     ("Car Storage", "3-car attached garage"), ("Above Grade: Rooms", "8"), ("Above Grade: Bedrooms", "4"),
                     ("Above Grade: Baths", "2.5"), ("Gross Living Area Above Grade", "2,400 sq ft"),
                     ("Below Grade", "Unfinished")],
    "condition_text": "C2. Well maintained, no deferred maintenance. Quartz counters, LVP flooring on main level.",
    "features": "Covered patio, fenced yard, three car garage.",
    "grid_note": "There are 6 comparable properties currently offered for sale in the subject neighborhood ranging in price "
                 "from $679,000 to $749,900. There are 11 comparable sales in the subject neighborhood within the past "
                 "twelve months ranging in sale price from $618,000 to $735,000.",
    "grid_subject": C2_SUBJ_GRID, "comps": C2_COMPS, "value": 662000, "as_is": "As is",
    "sca_comments": [
        "Comparable search: sales within the subject's subdivision were limited; the search was expanded beyond the "
        "subdivision to two story homes of similar size and age in Pretend Heights and Pretendville.",
        "Adjustments: gross living area at $60 per square foot; garage stalls at $10,000; half baths at $2,500; age at "
        "$1,000 per year; site by comparison of lot sizes. Concessions above the market norm adjusted dollar for dollar.",
        "Location: Comparables 1 and 3 are in Pretend Heights and Comparable 2 is in Pretendville; no location adjustments "
        "were made.",
    ],
    "prior_sales": "No prior sales of the subject within 3 years. No prior sales of the comparables within 12 months.",
    "reconciliation": ["Adjusted range $660,800 to $662,900. Equal weight given. Opinion of market value $662,000, below the "
                       "contract price of $689,000. The property meets FHA minimum property requirements; no repairs required."],
    "sketch": [("Level 1 (above grade)", "40 x 30", "1,200", "Gross living area"),
               ("Level 2 (above grade)", "40 x 30", "1,200", "Gross living area"),
               ("Basement (below grade)", "40 x 30", "1,200", "Unfinished"), ("Garage", "33 x 22", "726", "3-car attached")],
    "sketch_totals": [("Gross Living Area (above grade)", "2,400 sq ft"), ("Basement total", "1,200 sq ft"),
                      ("Basement finished", "0 sq ft")],
    "photos": ["Front view", "Rear view", "Street scene", "Kitchen", "Living room", "Primary bedroom", "Bedroom",
               "Basement (unfinished)", "Garage"],
    "appraiser": "Morgan Notreal", "appraiser_co": "Example Appraisal Co.",
    "license": "0000000-CR02 (made up)", "license_state": "UT",
})

FHAVA_2020 = (
    "<h1>FHA/VA LOAN ADDENDUM # 1 TO REAL ESTATE PURCHASE CONTRACT</h1><p class='small'>Made-up practice copy of the Utah "
    "state-approved addendum.</p><p>THIS IS AN ADDENDUM to that REAL ESTATE PURCHASE CONTRACT (the \"REPC\") with an Offer "
    "Reference Date of October 9, 2026, including all prior addenda and counteroffers, between Sam Example and Alex Example as "
    "Buyer, and Jamie Sample and Pat Sample as Seller, regarding the Property located at 2290 N Sample Willow Way, Sampleville, "
    "UT 84000.</p><p>1. Buyer intends to occupy the Property as Buyer's primary residence.</p>"
    "<p class='check'>2. Buyer is applying for: [X] an FHA loan; or [ ] a VA loan.</p>"
    "<p>3. Notwithstanding the Financing &amp; Appraisal Deadline (if applicable), Buyer SHALL NOT be obligated to complete the "
    "purchase of the Property or incur any penalty or forfeiture of the Earnest Money Deposit or other down payment, or "
    "otherwise be obligated to purchase the Property, if: (a) for a VA loan, the Purchase Price exceeds the reasonable value of "
    "the Property established by the VA Certificate of Reasonable Value or VA appraisal; or (b) for an FHA loan, the Purchase "
    "Price exceeds the appraised value of the Property (excluding closing costs) established by the FHA appraisal. Buyer shall, "
    "however, have the right to complete the sale without regard to the amount of the appraised valuation made by the "
    "applicable FHA or the VA. The appraised valuation is used to determine the maximum loan that FHA will insure or VA will "
    "guarantee. Neither FHA nor the VA warrants the value or condition of the Property.</p>"
    "<p>4. Seller shall make any and all appraisal required repairs, provided that the cost does not exceed $1,500.</p>"
    "<p>6. Seller shall contribute at Settlement an amount to be applied at Buyer's discretion to any or all of the following: "
    "(a) a permanent reduction, or temporary reduction, in the mortgage loan interest rate; (b) mortgage financing costs; and "
    "(c) Prepaids/Escrows (\"Closing Costs\"). The amount of Seller's contribution shall be $8,000. Any unused portion of "
    "Seller's contribution may, at Buyer's option, be used to reduce the Purchase Price.</p>"
    "<p>7. [APPLIES TO FHA ONLY] The undersigned hereby certify that the terms of the REPC are true to the best of our knowledge "
    "and belief, and that any other agreement entered into by any of the parties has been fully disclosed and is attached to the REPC.</p>"
    + kv([("Buyer", "Sam Example, Alex Example, October 9, 2026"),
          ("ACCEPTANCE", "[X] Seller accepts. Jamie Sample, Pat Sample, October 10, 2026")], cols=1)
    + "<p class='small'>THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, "
      "EFFECTIVE NOVEMBER 18, 2020.</p>")

repc_2024("case2-repc.html",
          "evals/files/case-2-distant-comps-listing-side/REPC and FHA-VA Loan Addendum - 2290 N Sample Willow Way.pdf", {
              "ord": "October 9, 2026", "acc": "October 10, 2026", "buyer": "Sam Example and Alex Example",
              "seller": "Jamie Sample and Pat Sample", "address": "2290 N Sample Willow Way", "city": "Sampleville",
              "county": "Sample County", "zip": "84000", "price": 689000, "em": 5000, "loan": 664885,
              "loan_type": "FHA (see FHA/VA Loan Addendum No. 1)", "cash": 19115, "fin_em": 500,
              "sdd": "October 16, 2026", "ddd": "October 27, 2026", "fad": "November 16, 2026",
              "setd": "November 30, 2026", "addenda": "FHA/VA Loan Addendum No. 1",
          }, extra_pages=[FHAVA_2020])

C2_CMA_ROWS = [
    # mls, status, address, dist, style, yb, beds, baths, ag, bg, bgfin, gar, lot, lp, sp, conc, sold/pend date, special
    ("2289400", "Under Contract", "2290 N Sample Willow Way (subject)", "0.00", "Two Story", 2018, "4", "2.5", 2400, 1200, 0, 3,
     0.25, 695000, "", "", "UC 10/10/2026", "Standard"),
    ("2289875", "Sold", "2314 N Sample Willow Way", "0.05", "Two Story", 2018, "4", "2.5", 2380, 1200, 0, 3, 0.24, 699000,
     692000, 4000, "09/25/2026", "Standard"),
    ("2288290", "Sold", "2176 N Example Willow Ct", "0.19", "Two Story", 2017, "4", "2.5", 2450, 1220, 0, 3, 0.26, 699900,
     699900, 0, "08/08/2026", "Standard"),
    ("2290511", "Sold", "2402 N Sample Willow Way", "0.22", "Two Story", 2019, "5 (4 + 1 bsmt)", "3.5 (2.5 + 1 bsmt)", 2360,
     1180, 600, 3, 0.23, 715000, 705000, 5000, "10/16/2026", "Standard"),
    ("2291633", "Sold", "2255 N Example Willow Ct", "0.12", "Two Story", 2018, "4", "2.5", 2420, 1210, 0, 3, 0.25, 705000,
     701000, 0, "11/04/2026", "Standard"),
    ("2291790", "Pending", "2130 N Sample Willow Way", "0.15", "Two Story", 2017, "4", "2.5", 2410, 1200, 0, 3, 0.24, 699000,
     "", "", "Pend 10/28/2026", "Standard"),
    ("2291901", "Active", "2501 N Sample Willow Way", "0.30", "Two Story", 2020, "4", "3", 2520, 1260, 0, 3, 0.27, 719900,
     "", "", "Listed 10/30/2026", "Standard"),
    ("2284002", "Sold", "2288 N Example Willow Ct", "0.10", "Two Story", 2017, "4", "2.5", 2390, 1200, 0, 3, 0.24, 649900,
     618000, 0, "03/14/2026", "Short Sale"),
]
def cma_cell(i, x):
    if isinstance(x, int) and i in (13, 14, 15):
        return money(x)
    if isinstance(x, int) and i in (8, 9, 10):
        return f"{x:,}"
    return str(x)


rows_html = "".join("<tr>" + "".join(f"<td>{cma_cell(i, x)}</td>" for i, x in enumerate(r)) + "</tr>"
                    for r in C2_CMA_ROWS)
C2_CMA = [(
    "<h1>Comparative Market Analysis</h1><p class='small'>Made-up CMA report printed from a fictional CMA tool. Prepared by "
    "the listing agent, Placeholder Realty, November 6, 2026, for 2290 N Sample Willow Way, Sampleville, UT 84000 "
    "(Willow Example Farms). All sales below are in Willow Example Farms.</p>"
    "<p><b>Agent notes (not for distribution):</b> Sellers must close by 11/30 for their next purchase. Bottom line discussed "
    "with sellers: $675,000.</p>"
    "<h2>Sales and Listings, Willow Example Farms</h2>"
    "<table class='grid'><tr><th>MLS #</th><th>Status</th><th>Address</th><th>Dist (mi)</th><th>Style</th><th>Year</th>"
    "<th>Beds</th><th>Baths</th><th>Above Grade SqFt</th><th>Below Grade SqFt</th><th>Below Grade Fin SqFt</th><th>Garage</th>"
    "<th>Lot Ac</th><th>List Price</th><th>Sold Price</th><th>Seller Conc.</th><th>Date</th><th>Special Conditions</th></tr>"
    + rows_html + "</table>"
    "<h2>Summary of Closed Sales (this report)</h2><p>Five closed sales listed. Sold prices $618,000 to $705,000.</p>"
    "<h2>Public Remarks</h2><p>2314 N Sample Willow Way: same floor plan as the subject, unfinished basement, three car garage. "
    "2176 N Example Willow Ct: two story, unfinished basement, larger lot. 2402 N Sample Willow Way: partly finished "
    "basement with bedroom and bath. 2255 N Example Willow Ct: same builder and plan as subject. 2288 N Example Willow Ct: "
    "short sale, sold as-is.</p>"
)]
write_html("case2-cma.html", "evals/files/case-2-distant-comps-listing-side/CMA Report - 2290 N Sample Willow Way.pdf",
           C2_CMA, "CMA Report")

# --------------------------------------------------------------------------------------------------
# CASE 3: 3318 Placeholder Pine Ct, Exampleburg, Idaho (general mode, VA, buyer side). Well supported:
# close, recent, similar comparables; Tidewater followed; CMA has nothing better by the effective date.
# --------------------------------------------------------------------------------------------------

C3_SUBJ_GRID = {
    "addr": "3318 Placeholder Pine Ct, Exampleburg, ID 83000", "price": "$455,000", "ppsf": "$264.53 / sq ft",
    "src": "Inspection; MLS #98012345", "loc": "N; Res.", "site": "0.18 ac", "view": "N; Res.",
    "design": "DT1; Ranch", "quality": "Q4", "age": "22 (2004)", "cond": "C3", "rooms": "6 / 3 / 2.0",
    "gla": "1,720 sq ft", "bsmt": "None (crawlspace)", "below": "None", "heat": "FAU / Central",
    "garage": "2-car att.", "porch": "Patio",
}
C3_COMPS = [
    comp(438000, 1690,
         addr=("3341 Placeholder Pine Ct, Exampleburg", 0), prox=("0.06 miles N", 0), src=("MLS #98010877; DOM 15", 0),
         conc=("None", 0), date=("s09/09/2026; c08/18/2026", 0), loc=("N; Res.", 0), site=("0.17 ac", 0),
         view=("N; Res.", 0), design=("DT1; Ranch", 0), quality=("Q4", 0), age=("22 (2004)", 0), cond=("C3", 0),
         rooms=("6 / 3 / 2.0", 0), gla=("1,690 sq ft", 1500), bsmt=("None (crawlspace)", 0), below=("None", 0),
         heat=("FAU / Central", 0), garage=("2-car att.", 0), porch=("Patio", 0)),
    comp(446500, 1760,
         addr=("3412 Example Cedar Ln, Exampleburg", 0), prox=("0.21 miles E", 0), src=("MLS #98010412; DOM 19", 0),
         conc=("$3,000 seller paid closing costs", -3000), date=("s08/15/2026; c07/22/2026", 0), loc=("N; Res.", 0),
         site=("0.19 ac", 0), view=("N; Res.", 0), design=("DT1; Ranch", 0), quality=("Q4", 0), age=("21 (2005)", 0),
         cond=("C3", 0), rooms=("6 / 3 / 2.0", 0), gla=("1,760 sq ft", -2000), bsmt=("None (crawlspace)", 0),
         below=("None", 0), heat=("FAU / Central", 0), garage=("2-car att.", 0), porch=("Patio", 0)),
    comp(432000, 1700,
         addr=("3205 Sample Spruce Dr, Exampleburg", 0), prox=("0.38 miles SW", 0), src=("MLS #98009980; DOM 28", 0),
         conc=("None", 0), date=("s07/24/2026; c06/30/2026", 0), loc=("N; Res.", 0), site=("0.18 ac", 0),
         view=("N; Res.", 0), design=("DT1; Ranch", 0), quality=("Q4", 0), age=("23 (2003)", 0),
         cond=("C4; original kitchen and baths", 10000), rooms=("6 / 3 / 2.0", 0), gla=("1,700 sq ft", 1000),
         bsmt=("None (crawlspace)", 0), below=("None", 0), heat=("FAU / Central", 0), garage=("2-car att.", 0),
         porch=("Patio", 0)),
    comp(458000, 1740,
         addr=("3290 Placeholder Pine Ct, Exampleburg", 0), prox=("0.09 miles S", 0),
         src=("MLS #98011203; DOM 9; submitted under Tidewater", 0), conc=("None", 0), date=("s09/18/2026; c08/29/2026", 0),
         loc=("N; Res.", 0), site=("0.18 ac", 0), view=("N; Res.", 0), design=("DT1; Ranch", 0), quality=("Q4", 0),
         age=("22 (2004)", 0), cond=("C2; kitchen and baths remodeled 2025", -12000), rooms=("6 / 3 / 2.0", 0),
         gla=("1,740 sq ft", -1000), bsmt=("None (crawlspace)", 0), below=("None", 0), heat=("FAU / Central", 0),
         garage=("2-car att.", 0), porch=("Patio", 0)),
]
assert [comp_totals(c)[2] for c in C3_COMPS] == [439500, 441500, 443000, 445000]

appraisal({
    "html": "case3-appraisal.html",
    "pdf": "evals/files/case-3-well-supported-idaho-va/VA Appraisal Report - 3318 Placeholder Pine Ct.pdf",
    "layout": "legacy", "file_no": "NAL-26-5521", "effective": "10/28/2026", "report_date": "11/02/2026",
    "subject": {"address": "3318 Placeholder Pine Ct", "csz": "Exampleburg, ID 83000", "county": "Example County",
                "apn": "R0000033180", "legal": "Lot 7, Block 3, Placeholder Pines Subdivision"},
    "borrower": "Chris Example; Robin Example", "owner": "Dana Sample",
    "lender": "Sample Federal Home Lending", "lender_addr": "400 Imaginary St, Exampleburg, ID 83000",
    "program": "VA", "case_no": ("VA Case No.", "00-00-0-0000001 (made up)"),
    "contract_price": 455000, "contract_date": "10/14/2026",
    "contract_src": "Purchase agreement and VA addendum; MLS #98012345",
    "assistance": "Yes: $5,000 seller contribution toward closing costs",
    "contract_note": "The contract was analyzed; list price $459,900, contract price $455,000. Arm's length.",
    "neighborhood": [("Location", "Suburban"), ("Built-Up", "Over 75%"), ("Growth", "Stable"),
                     ("Property Values", "Stable"), ("Demand / Supply", "In Balance"),
                     ("Marketing Time", "Under 3 months"), ("One-Unit Price Range", "$390,000 to $520,000"),
                     ("Present Land Use", "One-unit 90%, multi-unit 5%, commercial 5%")],
    "nbhd_desc": "Neighborhood boundaries: Example Road, Pine Avenue, Cedar Parkway and the canal. Subdivisions of single "
                 "level and two story homes built 1998 to 2010.",
    "market": "Stable values; no time adjustments.",
    "site": [("Area", "0.18 ac (7,841 sq ft)"), ("Shape", "Rectangular"), ("View", "Residential"),
             ("Zoning", "R-4, legal"), ("Utilities", "Public"), ("FEMA Flood Zone", "X")],
    "improvements": [("Units", "One"), ("Stories", "1"), ("Type", "Detached"), ("Design (Style)", "Ranch"),
                     ("Year Built", "2004"), ("Effective Age", "12 years"), ("Foundation", "Crawlspace"),
                     ("Basement", "None"), ("Exterior Walls", "Fiber cement"), ("Roof", "Composition shingle, 2019"),
                     ("Heating / Cooling", "FAU gas / central air"), ("Car Storage", "2-car attached garage"),
                     ("Above Grade: Rooms", "6"), ("Above Grade: Bedrooms", "3"), ("Above Grade: Baths", "2.0"),
                     ("Gross Living Area Above Grade", "1,720 sq ft")],
    "condition_text": "C3. Maintained. Original kitchen cabinets with newer appliances; flooring replaced 2021.",
    "features": "Covered patio, vinyl fence, sprinkler system.",
    "grid_note": "There are 4 comparable properties currently offered for sale in the subject neighborhood ranging in price "
                 "from $449,900 to $489,000. There are 12 comparable sales in the subject neighborhood within the past "
                 "twelve months ranging in sale price from $412,000 to $472,500.",
    "grid_subject": C3_SUBJ_GRID, "comps": C3_COMPS, "value": 441000, "as_is": "As is",
    "sca_comments": [
        "All four comparables are single level ranch homes in the subject's subdivision or the adjoining one, within 0.38 "
        "miles, sold within 4 months of the effective date.",
        "Adjustments: gross living area at $50 per square foot; condition by paired sales in the subdivision (remodeled "
        "kitchen and baths versus original); concessions above the market norm dollar for dollar.",
        "Tidewater procedure: on 10/29/2026 the appraiser notified the lender (requester) that the value appeared to be "
        "below the sales price and allowed 2 business days for additional sales data. On 10/30/2026 two sales were submitted: "
        "3290 Placeholder Pine Ct (sold 09/18/2026, $458,000), considered and used as Comparable 4; and 1177 Example Aspen Dr "
        "(sold 10/02/2026, $472,500), considered and not used because it has 2,140 sq ft, a three car garage and a 0.31 acre "
        "lot, larger and superior to the subject. The submitted data did not change the opinion of value beyond the "
        "inclusion of Comparable 4.",
    ],
    "prior_sales": "No prior sales of the subject within 3 years. No prior sales of the comparables within 12 months.",
    "reconciliation": ["Adjusted range $439,500 to $445,000, a narrow range. Most weight to Comparables 1 and 2 (closest in "
                       "location and condition). Opinion of market value $441,000. The property meets VA minimum property "
                       "requirements."],
    "sketch": [("Main level (above grade)", "43 x 40", "1,720", "Gross living area"),
               ("Garage", "22 x 22", "484", "2-car attached"), ("Covered patio", "12 x 16", "192", "")],
    "sketch_totals": [("Gross Living Area (above grade)", "1,720 sq ft"), ("Basement", "None")],
    "photos": ["Front view", "Rear view", "Street scene", "Kitchen", "Living room", "Primary bedroom", "Bedroom",
               "Bathroom", "Garage"],
    "appraiser": "Jesse Imaginary", "appraiser_co": "Notreal Appraisal LLC",
    "license": "CRA-0000 (made up)", "license_state": "ID",
})

C3_PA = [
    ("<h1>RESIDENTIAL PURCHASE AGREEMENT (excerpt)</h1><p class='small'>Made-up practice purchase agreement (Example Form RPA-1, "
     "fictional). Only the sections used here are shown.</p>"
     + kv([("Buyer", "Chris Example and Robin Example"), ("Seller", "Dana Sample"),
           ("Property", "3318 Placeholder Pine Ct, Exampleburg, Example County, Idaho 83000"),
           ("Purchase Price", "$455,000"), ("Earnest Money", "$2,500"),
           ("Financing", "VA loan; see VA Addendum"), ("Seller Paid Closing Costs", "$5,000"),
           ("Date of Agreement / Acceptance", "October 14, 2026")], cols=1)
     + "<h2>7. Appraisal Contingency</h2><p>If the Property does not appraise at or above the Purchase Price, Buyer may "
       "terminate this Agreement by written notice delivered to Seller no later than the Appraisal Contingency Deadline, and "
       "the Earnest Money shall be returned to Buyer. If Buyer does not deliver written notice by that deadline, this "
       "contingency is waived. The parties may instead agree in writing to a new Purchase Price or other terms.</p>"
     + "<h2>Deadlines</h2>"
     + kv([("Inspection Contingency Deadline", "October 24, 2026, 5:00 PM local time"),
           ("Appraisal Contingency Deadline", "November 18, 2026, 5:00 PM local time"),
           ("Loan Approval Deadline", "November 25, 2026, 5:00 PM local time"),
           ("Closing Date", "December 4, 2026")], cols=1)
     + "<p>Time is of the essence. Deadlines falling on a weekend or holiday are not extended unless the parties agree in writing.</p>"),
    ("<h1>VA ADDENDUM TO PURCHASE AGREEMENT</h1><p class='small'>Made-up practice addendum.</p>"
     "<p>Property: 3318 Placeholder Pine Ct, Exampleburg, Idaho 83000. Buyer: Chris Example and Robin Example. Seller: Dana Sample.</p>"
     "<p>\"It is expressly agreed that, notwithstanding any other provisions of this contract, the purchaser shall not incur any "
     "penalty by forfeiture of earnest money or otherwise or be obligated to complete the purchase of the property described "
     "herein, if the contract purchase price or cost exceeds the reasonable value of the property established by the "
     "Department of Veterans Affairs. The purchaser shall, however, have the privilege and option of proceeding with the "
     "consummation of this contract without regard to the amount of the reasonable value established by the Department of "
     "Veterans Affairs.\"</p>"
     + kv([("Buyer signatures", "Chris Example, Robin Example, October 13, 2026"),
           ("Seller signature", "Dana Sample, October 14, 2026")], cols=1)
     + "<h2>VA Notice of Value (copy received from lender)</h2>"
     + kv([("Property", "3318 Placeholder Pine Ct, Exampleburg, ID 83000"), ("Estimated Reasonable Value", "$441,000"),
           ("NOV Date", "November 5, 2026"), ("Conditions", "None; no repairs required")], cols=1)),
]
write_html("case3-pa.html",
           "evals/files/case-3-well-supported-idaho-va/Purchase Agreement and VA Addendum - 3318 Placeholder Pine Ct.pdf",
           C3_PA, "Purchase Agreement")

C3_CMA = [
    ["98012345", "Pending", "3318 Placeholder Pine Ct", "Exampleburg", "ID", "83000", "Placeholder Pines", "0.00", "Ranch",
     2004, 459900, "", "", "2026-09-30", "2026-10-14", "", 14, 3, 0, 2, 0, 1720, 0, 0, 1720, 2, 0.18, "Standard",
     "Single level, newer flooring, covered patio.", "Subject."],
    ["98010877", "Sold", "3341 Placeholder Pine Ct", "Exampleburg", "ID", "83000", "Placeholder Pines", "0.06", "Ranch", 2004,
     442000, 438000, 0, "2026-08-03", "2026-08-18", "2026-09-09", 15, 3, 0, 2, 0, 1690, 0, 0, 1690, 2, 0.17, "Standard",
     "Single level, original kitchen, newer carpet.", ""],
    ["98010412", "Sold", "3412 Example Cedar Ln", "Exampleburg", "ID", "83000", "Cedar Example", "0.21", "Ranch", 2005, 449000,
     446500, 3000, "2026-07-03", "2026-07-22", "2026-08-15", 19, 3, 0, 2, 0, 1760, 0, 0, 1760, 2, 0.19, "Standard",
     "Single level on a quiet street, vaulted ceilings.", ""],
    ["98009980", "Sold", "3205 Sample Spruce Dr", "Exampleburg", "ID", "83000", "Placeholder Pines", "0.38", "Ranch", 2003,
     439900, 432000, 0, "2026-06-02", "2026-06-30", "2026-07-24", 28, 3, 0, 2, 0, 1700, 0, 0, 1700, 2, 0.18, "Standard",
     "Original condition, priced to reflect.", ""],
    ["98011203", "Sold", "3290 Placeholder Pine Ct", "Exampleburg", "ID", "83000", "Placeholder Pines", "0.09", "Ranch", 2004,
     459000, 458000, 0, "2026-08-20", "2026-08-29", "2026-09-18", 9, 3, 0, 2, 0, 1740, 0, 0, 1740, 2, 0.18, "Standard",
     "Remodeled kitchen and baths in 2025, quartz counters.", "Lockbox on garage side door, code 1357."],
    ["98011550", "Sold", "1177 Example Aspen Dr", "Exampleburg", "ID", "83000", "Aspen Example", "0.47", "Ranch", 2008, 479000,
     472500, 0, "2026-09-01", "2026-09-12", "2026-10-02", 11, 4, 0, 2.5, 0, 2140, 0, 0, 2140, 3, 0.31, "Standard",
     "Larger single level on an oversized lot, three car garage.", ""],
    ["98012890", "Sold", "3375 Placeholder Pine Ct", "Exampleburg", "ID", "83000", "Placeholder Pines", "0.07", "Ranch", 2004,
     455000, 452000, 0, "2026-10-01", "2026-10-09", "2026-11-03", 8, 3, 0, 2, 0, 1730, 0, 0, 1730, 2, 0.18, "Standard",
     "Single level, new roof 2024.", ""],
    ["98012777", "Pending", "3420 Example Cedar Ln", "Exampleburg", "ID", "83000", "Cedar Example", "0.24", "Ranch", 2005, 449900,
     "", "", "2026-10-10", "2026-10-26", "", 16, 3, 0, 2, 0, 1710, 0, 0, 1710, 2, 0.18, "Standard", "Single level, updated paint.", ""],
    ["98013010", "Active", "3360 Placeholder Pine Ct", "Exampleburg", "ID", "83000", "Placeholder Pines", "0.05", "Ranch", 2004,
     465000, "", "", "2026-10-20", "", "", 19, 3, 0, 2, 0, 1750, 0, 0, 1750, 2, 0.19, "Standard", "Single level, fresh paint and new flooring.", ""],
    ["98007455", "Sold", "3299 Sample Spruce Dr", "Exampleburg", "ID", "83000", "Placeholder Pines", "0.29", "Ranch", 2003, 432000,
     427000, 0, "2026-02-10", "2026-02-24", "2026-03-20", 14, 3, 0, 2, 0, 1680, 0, 0, 1680, 2, 0.17, "Standard",
     "Single level, original kitchen.", ""],
]
write_csv("evals/files/case-3-well-supported-idaho-va/CMA Export - 3318 Placeholder Pine Ct.csv", C3_CMA)

with open(os.path.join(HTML, "pdfs.json"), "w") as f:
    json.dump(PDFS, f, indent=1)
print(f"wrote {len(PDFS)} HTML files and 2 CSVs")
