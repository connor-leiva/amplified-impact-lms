"""Writes the made-up input files for due-diligence-review: the practice set and the three eval cases.

Every person, company, street and document here is invented. Each document is written as HTML into
HTML_DIR, with pdfs.json listing what to print, then html_to_pdf.cjs prints each one with the made-up
stamp on every page.

Usage (from anywhere):
  python3 make_files.py HTML_DIR
  node html_to_pdf.cjs HTML_DIR ../..        (the skill folder)
"""
import html
import json
import os
import sys

PRACTICE = "PRACTICE FILE: made-up example"
TEST = PRACTICE  # eval inputs carry the same stamp as the practice set

CSS = """
body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; line-height: 1.35; }
h1 { font-size: 16pt; margin: 0 0 6px 0; }
h2 { font-size: 12.5pt; margin: 14px 0 6px 0; border-bottom: 1px solid #888; padding-bottom: 2px; }
h3 { font-size: 10.5pt; margin: 10px 0 4px 0; }
p { margin: 4px 0 6px 0; }
table { border-collapse: collapse; width: 100%; margin: 6px 0; }
td, th { border: 1px solid #999; padding: 4px 6px; vertical-align: top; font-size: 9.5pt; text-align: left; }
th { background: #eee; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.small { font-size: 8.5pt; color: #333; }
.box { border: 1px solid #555; padding: 6px 8px; margin: 6px 0; }
.rating { font-weight: bold; white-space: nowrap; }
.form { font-family: 'Times New Roman', Times, serif; font-size: 9.5pt; }
.form h1 { text-align: center; font-size: 13pt; }
.fill { font-family: 'Courier New', monospace; font-weight: bold; color: #003; }
.center { text-align: center; }
.sig { font-family: 'Brush Script MT', cursive; font-size: 13pt; color: #123; }
"""

E = html.escape


def doc(title, pages, form=False):
    body = "".join(f'<div class="page">{p}</div>' for p in pages)
    cls = ' class="form"' if form else ""
    return f"<!doctype html><html><head><meta charset='utf-8'><title>{E(title)}</title><style>{CSS}</style></head><body{cls}>{body}</body></html>"


def f(v):
    return f'<span class="fill">{E(v)}</span>'


def box(checked):
    return "[X]" if checked else "[ &nbsp;]"


# ----------------------------------------------------------------------------------------------
# Utah REPC, December 4, 2024 form (abbreviated copy; wording of the sections shown follows the form)
# ----------------------------------------------------------------------------------------------

def repc2024(d):
    note = ('<p class="small center">Abbreviated made-up copy for practice and testing. Sections that do not bear on this '
            'example are left out. The wording of the sections shown follows the state-approved form.</p>')
    p1 = f"""
<h1>REAL ESTATE PURCHASE CONTRACT</h1>
{note}
<p class="center"><b>EARNEST MONEY DEPOSIT</b></p>
<p>On this {f(d['offer_date'])} ("Offer Reference Date") {f(d['buyer'])} ("Buyer") offers to purchase from {f(d['seller'])} ("Seller")
the Property described below and agrees to deliver no later than four (4) calendar days after Acceptance (as defined in Section 23), an
Earnest Money Deposit in the amount of {f(d['emd'])} in the form of {f('personal check')}.</p>
<p class="center"><b>OFFER TO PURCHASE</b></p>
<p>1. PROPERTY: {f(d['address'])} City of {f(d['city'])}, County of {f(d['county'])}, State of Utah, Zip {f(d['zip'])}
Tax ID No. {f(d['tax_id'])} (the "Property").</p>
<p>1.4 Water Service. The Purchase Price for the Property shall include all water rights/water shares, if any, that are the legal source for
Seller's current culinary water service and irrigation water service, if any, to the Property. ... The following water rights/water shares,
if applicable, are specifically excluded from this sale: {f(d.get('water_excluded', 'None'))}</p>
<p>2.1 Payment of Purchase Price. The Purchase Price for the Property is {f(d['price'])}.</p>
<table>
<tr><td style="width:24%">{f(d['emd'])}</td><td>(a) Earnest Money Deposit. Under certain conditions described in the REPC, this deposit may become totally non-refundable.</td></tr>
<tr><td>{f('$0')}</td><td>(b) Additional Earnest Money Deposit (see Section 8.4 if applicable)</td></tr>
<tr><td>{f(d['loan'])}</td><td>(c) New Loan. Buyer may apply for mortgage loan financing (the "Loan") on terms acceptable to Buyer. Loan type: {f(d['loan_type'])}</td></tr>
<tr><td>{f('$0')}</td><td>(d) Seller Financing (see attached Seller Financing Addendum)</td></tr>
<tr><td>{f(d['cash'])}</td><td>(e) Balance of Purchase Price in Cash at Settlement</td></tr>
<tr><td>{f(d['price'])}</td><td>PURCHASE PRICE. Total of lines (a) through (e)</td></tr>
</table>
<p>2.2 Sale of Buyer's Property. ... {box(False)} IS {box(True)} IS NOT conditioned upon the sale of real estate owned by Buyer.</p>
<p>3.3 Possession. Seller shall deliver physical possession of the Property to Buyer as follows: {box(True)} Upon Recording.</p>
<p>4.2 Special Assessments. Any assessments for capital improvements as approved by the homeowner's association ("HOA") (pursuant to HOA
governing documents) or as assessed by a municipality or special improvement district, prior to the Settlement Deadline shall be paid for by:
{box(d['sa'] == 'Seller')} Seller {box(d['sa'] == 'Buyer')} Buyer {box(d['sa'] == 'Split')} Split Equally Between Buyer and Seller {box(False)} Other.</p>
<p>4.3(c) HOA/Other Entity Fees Due Upon Change of Ownership. ... that change of ownership fee shall, at Settlement, be paid for by:
{box(d['cof'] == 'Seller')} Seller {box(d['cof'] == 'Buyer')} Buyer {box(d['cof'] == 'Split')} Split Equally Between Buyer and Seller {box(d['cof'] == 'Other')} Other (explain) {f(d.get('cof_other', ''))}</p>
"""
    p2 = f"""
<p>7. SELLER DISCLOSURES. No later than the Seller Disclosure Deadline referenced in Section 24(a), Seller shall provide to Buyer the following
documents in hard copy or electronic format which are collectively referred to as the "Seller Disclosures": (a) a written Seller property condition
disclosure for the Property, completed, signed and dated by Seller as provided in Section 10.3; (b) a Lead-Based Paint Disclosure &amp;
Acknowledgement (if Property built prior to 1978); (c) a Commitment for Title Insurance as referenced in Section 6.1; (d) a copy of any restrictive
covenants (CC&amp;Rs), rules and regulations affecting the Property; (e) a copy of the most recent minutes, budget and financial statement for the
homeowners' association, if any; ... (i) evidence of any water rights and/or water shares referenced in Section 1.4; (j) written notice of any claims
and/or conditions known to Seller relating to environmental problems and building or zoning code violations; ...</p>
<p>8.1 DUE DILIGENCE CONDITION. Buyer's obligation to purchase the Property: {box(True)} IS {box(False)} IS NOT conditioned upon Buyer's Due
Diligence as defined in this Section 8.1(a) below. This condition is referred to as the "Due Diligence Condition." If checked in the affirmative,
Sections 8.1(a) through 8.1(c) apply; otherwise they do not.</p>
<p>(b) Buyer's Right to Cancel or Resolve Objections. If Buyer determines, in Buyer's sole discretion, that the results of the Due Diligence are
unacceptable, Buyer may either: (i) no later than the Due Diligence Deadline referenced in Section 24(b), cancel the REPC by providing written
notice to Seller, whereupon the Earnest Money Deposit shall be released to Buyer without the requirement of further written authorization from
Seller; or (ii) no later than the Due Diligence Deadline referenced in Section 24(b), resolve in writing with Seller any objections Buyer has
arising from Buyer's Due Diligence.</p>
<p>(c) Failure to Cancel or Resolve Objections. If Buyer fails to cancel the REPC or fails to resolve in writing with Seller any objections Buyer
has arising from Buyer's Due Diligence, as provided in Section 8.1(b), Buyer shall be deemed to have waived the Due Diligence Condition, and except
as provided in Sections 8.2(a) and 8.3(b)(i), the Earnest Money Deposit shall become non-refundable.</p>
<p>8.2 APPRAISAL CONDITION. Buyer's obligation to purchase the Property: {box(True)} IS {box(False)} IS NOT conditioned upon the Property appraising
for not less than the Purchase Price.</p>
<p>8.3 FINANCING CONDITION. {box(False)} (a) No Financing Required. {box(True)} (b) Financing Required. ... (i) ... whereupon {f(d['fin_amt'])} of Buyer's
Earnest Money Deposit shall be released to Seller ...</p>
<p>9. ADDENDA. There {box(False)} ARE {box(True)} ARE NOT addenda to the REPC containing additional terms.</p>
<p>10.1 Home Warranty Plan. A one-year Home Warranty Plan {box(d['hw'])} WILL {box(not d['hw'])} WILL NOT be included in this transaction.
{('If included, the Home Warranty Plan shall be ordered by Buyer and shall be issued by a company selected by Buyer. The cost of the Home Warranty Plan shall not exceed ' + f(d['hw_amt']) + ' and shall be paid for at Settlement by Seller.') if d['hw'] else ''}</p>
<p>21. TIME IS OF THE ESSENCE. Time is of the essence regarding the dates set forth in the REPC. Extensions must be agreed to in writing by all
parties. Unless otherwise explicitly stated in the REPC: (a) performance under each Section of the REPC which references a date shall absolutely
be required by 5:00 PM Mountain Time on the stated date; and (b) the term "days" and "calendar days" shall mean calendar days and shall be counted
beginning on the day following the event which triggers the timing requirement (e.g. Acceptance).</p>
"""
    p3 = f"""
<p>24. CONTRACT DEADLINES. Buyer and Seller agree that the following deadlines shall apply to the REPC:</p>
<table>
<tr><td>(a) Seller Disclosure Deadline</td><td>{f(d['sdd'])}</td></tr>
<tr><td>(b) Due Diligence Deadline</td><td>{f(d['ddd'])}</td></tr>
<tr><td>(c) Financing &amp; Appraisal Deadline</td><td>{f(d['fad'])}</td></tr>
<tr><td>(d) Settlement Deadline</td><td>{f(d['setd'])}</td></tr>
</table>
<p>25. OFFER AND TIME FOR ACCEPTANCE. Buyer offers to purchase the Property on the above terms and conditions. If Seller does not accept this
offer by: {f('5:00')} PM Mountain Time on {f(d['offer_exp'])} (Date), this offer shall lapse; and the Brokerage shall return any Earnest Money Deposit to Buyer.</p>
<p><span class="sig">{E(d['buyer_sig'])}</span> &nbsp; {f(d['offer_date'])} (Buyer's Signature and Date)</p>
<p class="center"><b>ACCEPTANCE/COUNTEROFFER/REJECTION</b></p>
<p>CHECK ONE: {box(True)} ACCEPTANCE OF OFFER TO PURCHASE: Seller Accepts the foregoing offer on the terms and conditions specified above.
{box(False)} COUNTEROFFER {box(False)} REJECTION</p>
<p><span class="sig">{E(d['seller_sig'])}</span> &nbsp; {f(d['accept_date'])} {f(d['accept_time'])} (Seller's Signature, Date, Time)</p>
<p class="small">Buyer's Agent: {E(d['buyer_agent'])}. Seller's Agent: {E(d['seller_agent'])}.</p>
<p class="center small" style="margin-top:30px">THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL,<br>EFFECTIVE DECEMBER 4, 2024.</p>
"""
    return doc("REPC", [p1, p2, p3], form=True)


# ----------------------------------------------------------------------------------------------
# Utah REPC, November 1, 2026 form (abbreviated copy; wording of the sections shown follows the form)
# ----------------------------------------------------------------------------------------------

def repc2026(d):
    note = ('<p class="small center">Abbreviated made-up copy for practice and testing. Sections that do not bear on this '
            'example are left out. The wording of the sections shown follows the state-approved form.</p>')
    p1 = f"""
<h1>REAL ESTATE PURCHASE CONTRACT</h1>
{note}
<p>On this {f(d['offer_date'])} ("Offer Reference Date") {f(d['buyer'])} ("Buyer") offers to purchase from {f(d['seller'])} ("Seller") the
Property described below. PROPERTY: {f(d['address'])} City of {f(d['city'])}, County of {f(d['county'])}, State of Utah, Zip {f(d['zip'])}
Tax ID No. {f(d['tax_id'])} (the "Property").</p>
<p class="center"><b>OFFER TO PURCHASE</b></p>
<p>1. PURCHASE PRICE AND PAYMENT. The purchase price ("Purchase Price") for the Property is {f(d['price'])}.</p>
<table>
<tr><td style="width:24%">{f(d['emd'])}</td><td>(a) Earnest Money Deposit. Under certain conditions described in the REPC, this deposit may become totally non-refundable.</td></tr>
<tr><td>{f(d['loan'])}</td><td>(b) New Loan. ... [X] Conventional loan [ &nbsp;] FHA loan [ &nbsp;] VA loan [ &nbsp;] USDA loan.</td></tr>
<tr><td>{f('$0')}</td><td>(c) Seller Financing.</td></tr>
<tr><td>{f('$0')}</td><td>(d) Other.</td></tr>
<tr><td>{f(d['cash'])}</td><td>(e) Balance of Purchase Price in Cash at Settlement.</td></tr>
<tr><td>{f(d['price'])}</td><td>PURCHASE PRICE. Total of lines (a) through (e).</td></tr>
</table>
<p>2.2 Seller's Contribution to Closing Costs. Seller agrees to contribute at Settlement the amount of {f(d['scc'])} to be applied at Buyer's
discretion toward Buyer's Closing Costs as defined in Section 8.3(c), if applicable.</p>
<p>2.3 Home Warranty Plan. A home warranty plan {box(False)} WILL {box(True)} WILL NOT be included in this transaction.</p>
<p>3. BUYER CONDITIONS OF PURCHASE. If checked in the affirmative, the following Buyer's conditions of purchase apply:
(a) {box(True)} Due Diligence Condition (see Section 12.1) (b) {box(True)} Appraisal Condition (see Section 12.2) (c) {box(True)} Financing
Condition (see Section 12.3): (i) {box(True)} 50% of the Earnest Money Deposit ... (d) {box(False)} Subject to Sale of Buyer's Property Condition.</p>
<p>4. REPC DEADLINES. Buyer and Seller agree that the following deadlines shall apply to the REPC:</p>
<table>
<tr><td>(a) Seller Disclosure Deadline</td><td>{f(d['sdd'])}</td></tr>
<tr><td>(b) Due Diligence Deadline</td><td>{f(d['ddd'])}</td></tr>
<tr><td>(c) Appraisal Deadline</td><td>{f(d['apd'])}</td></tr>
<tr><td>(d) Financing Deadline</td><td>{f(d['find'])}</td></tr>
<tr><td>(e) Settlement Deadline</td><td>{f(d['setd'])}</td></tr>
<tr><td>(f) Possession</td><td>{box(True)} Upon Recording</td></tr>
</table>
<p>5. EARNEST MONEY DEPOSIT. No later than four (4) calendar days after Acceptance (as defined in Section 23), Buyer agrees to deliver an Earnest
Money Deposit ... to Buyer's Brokerage.</p>
<p>6. ADDENDA. There {box(False)} ARE {box(True)} ARE NOT addenda to the REPC containing additional terms.</p>
"""
    p2 = f"""
<p>8.2 Special Assessments. Any special assessment as approved, prior to the Settlement Deadline, by the homeowner's association ("HOA")
(pursuant to HOA governing documents), by a municipality, or by a special improvement district, shall be paid for by: {box(d['sa'] == 'Seller')} Seller
{box(d['sa'] == 'Buyer')} Buyer {box(d['sa'] == 'Split')} Split Equally Between Buyer and Seller {box(False)} Other (explain). The provisions of this
Section 8.2 shall survive Closing.</p>
<p>8.3(a) HOA/Other Entity Fees Due Upon Change of Ownership. ... Any HOA buyer setup fees or buyer administrative fees are Buyer's responsibility
and are not considered change of ownership fees. ... that change of ownership fee shall be paid for at Settlement by: {box(d['cof'] == 'Seller')} Seller
{box(d['cof'] == 'Buyer')} Buyer {box(d['cof'] == 'Split')} Split Equally Between Buyer and Seller {box(False)} Other (explain).</p>
<p>11. SELLER DISCLOSURES. No later than the Seller Disclosure Deadline referenced in Section 4(a), Seller shall provide to Buyer the following
documents ...: (a) a written Seller property condition disclosure for the Property ...; (c) a Commitment for Title Insurance ...; (d) a copy of any
restrictive covenants (CC&amp;Rs), bylaws, fee and fine schedules, rules and regulations affecting the Property, if any; (e) a copy of the most recent
minutes, budget, reserve analysis, and financial statement for the homeowners' association, if any; ...</p>
<p>12.1 Due Diligence Condition. Buyer's obligation to purchase the Property is conditioned upon Buyer's Due Diligence as defined in this Section
12.1(a) below and ONLY applies if checked in the affirmative in Section 3(a); otherwise Sections 12.1(a) through 12.1(c) do not apply.</p>
<p>(b) Buyer's Right to Cancel or Resolve Objections. If Buyer determines, in Buyer's sole discretion, that the results of the Due Diligence are
unacceptable, Buyer may either: (i) no later than the Due Diligence Deadline referenced in Section 4(b), cancel the REPC by providing written notice
to Seller, whereupon the Earnest Money Deposit shall be released to Buyer without the requirement of further written authorization from Seller; or
(ii) no later than the Due Diligence Deadline referenced in Section 4(b), resolve in writing with Seller any objections Buyer has arising from Buyer's
Due Diligence.</p>
<p>(c) Failure to Cancel or Resolve Objections. If Buyer fails to cancel the REPC or fails to resolve in writing with Seller any objections Buyer has
arising from Buyer's Due Diligence, as provided in Section 12.1(b), Buyer shall be deemed to have waived the Due Diligence Condition, and, except as
provided in Sections 12.2(a) and 12.3(a), the Earnest Money Deposit shall become non-refundable.</p>
<p>25. TIME IS OF THE ESSENCE. Time is of the essence regarding the dates set forth in the REPC. Any extension of the deadlines within the REPC
must be agreed to in writing by all parties. Unless otherwise explicitly stated in the REPC: (a) performance under each Section of the REPC which
references a date shall absolutely be required by 5:00 PM Mountain Time on the stated date; and (b) the term "days" and "calendar days" shall mean
calendar days and shall be counted beginning on the day following the event which triggers the timing requirement (e.g., Acceptance). Buyer and
Seller agree that if any dates for the Earnest Money delivery, Earnest Money Deposit or the Settlement Deadline referenced in this REPC fall on a
Saturday, Sunday, or legal holiday, performance shall be required on the next business day.</p>
"""
    p3 = f"""
<p>30. ACCEPTANCE DEADLINE. Buyer offers to purchase the Property on the above terms and conditions. If Seller does not accept this offer by:
{f('5:00')} [ &nbsp;] AM [X] PM Mountain Time on {f(d['offer_exp'])} (Date), this offer shall lapse.</p>
<p><span class="sig">{E(d['buyer_sig'])}</span> &nbsp; {f(d['offer_date'])} (Buyer's Signature and Date)</p>
<p class="center"><b>ACCEPTANCE/COUNTEROFFER/REJECTION</b></p>
<p>CHECK ONE: {box(True)} ACCEPTANCE OF OFFER TO PURCHASE: Seller Accepts the foregoing offer on the terms and conditions specified above.
{box(False)} COUNTEROFFER {box(False)} REJECTION</p>
<p><span class="sig">{E(d['seller_sig'])}</span> &nbsp; {f(d['accept_date'])} (Seller's Signature and Date)</p>
<p class="small">Buyer's Agent: {E(d['buyer_agent'])}. Seller's Agent: {E(d['seller_agent'])}.</p>
<p class="center small" style="margin-top:30px">THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL,<br>
EFFECTIVE NOVEMBER 1, 2026. AS OF JANUARY 1, 2027, IT WILL REPLACE AND SUPERSEDE THE PREVIOUSLY APPROVED VERSION OF THIS FORM.</p>
"""
    return doc("REPC", [p1, p2, p3], form=True)


# ----------------------------------------------------------------------------------------------
# Inspection report
# ----------------------------------------------------------------------------------------------

def inspection(d):
    cover = f"""
<h1>{E(d['company'])}</h1>
<p><b>Home Inspection Report</b></p>
<table>
<tr><th style="width:30%">Property</th><td>{E(d['address'])}</td></tr>
<tr><th>Client</th><td>{E(d['client'])}</td></tr>
<tr><th>Inspection date</th><td>{E(d['date'])}</td></tr>
<tr><th>Report date</th><td>{E(d['report_date'])}</td></tr>
<tr><th>Inspector</th><td>{E(d['inspector'])}</td></tr>
<tr><th>Property type</th><td>{E(d['type'])}</td></tr>
<tr><th>Year built (per listing)</th><td>{E(d['year'])}</td></tr>
<tr><th>Conditions</th><td>{E(d['conditions'])}</td></tr>
<tr><th>Present</th><td>{E(d['present'])}</td></tr>
</table>
<h2>How to Read This Report</h2>
<p>Each observation carries one rating:</p>
<ul>
<li><b>Safety:</b> a condition the inspector considers a safety hazard. Correct before occupancy.</li>
<li><b>Repair:</b> a defect that needs repair by a qualified or licensed contractor.</li>
<li><b>Further Evaluation:</b> the inspector recommends evaluation by a specialist in that trade.</li>
<li><b>Maintenance:</b> routine upkeep.</li>
<li><b>Monitor:</b> watch for change.</li>
<li><b>Informational:</b> a description or age note. Not a defect.</li>
</ul>
<p>The Summary lists the items the inspector marked for the summary. <b>It is not a substitute for reading the full report.</b> {E(d.get('cost_note', 'This report does not provide repair cost estimates.'))}</p>
<h2>Scope and Limitations</h2>
<p>This is a visual, non-invasive inspection of readily accessible systems and components on the date shown. It is not a code inspection,
does not predict future conditions, and does not test for radon, mold or other environmental hazards unless stated. Furniture, stored items
and finished surfaces limit what can be seen.</p>
"""
    summary = "<h2>Summary</h2>" + "".join(
        f"<h3>{E(h)}</h3><table><tr><th style='width:6%'>#</th><th>Item</th><th style='width:12%'>Rating</th><th style='width:9%'>Page</th></tr>"
        + "".join(f"<tr><td>{E(n)}</td><td>{E(t)}</td><td class='rating'>{E(r)}</td><td>{E(pg)}</td></tr>" for n, t, r, pg in rows)
        + "</table>" for h, rows in d['summary'])
    pages = [cover, summary]
    for pg in d['pages']:
        out = ""
        for sec in pg:
            out += f"<h2>{E(sec['title'])}</h2>"
            if sec.get('desc'):
                out += "<table>" + "".join(f"<tr><th style='width:30%'>{E(k)}</th><td>{E(v)}</td></tr>" for k, v in sec['desc']) + "</table>"
            for label, text, rating in sec.get('obs', []):
                out += f"<div class='box'><b>{E(label)}</b> <span class='rating'>[{E(rating)}]</span><br>{E(text)}</div>"
        pages.append(out)
    return doc("Inspection", pages)


def qa_form(title, sub, intro, sections, sign):
    pages = []
    first = True
    for chunk in sections:
        out = ""
        if first:
            out += f"<h1>{E(title)}</h1><p>{sub}</p><p class='small'>{E(intro)}</p>"
            first = False
        for heading, rows in chunk:
            out += f"<h2>{E(heading)}</h2><table><tr><th style='width:52%'>Question</th><th style='width:12%'>Answer</th><th>Seller's explanation</th></tr>"
            out += "".join(f"<tr><td>{E(q)}</td><td><b>{E(a)}</b></td><td>{E(x)}</td></tr>" for q, a, x in rows)
            out += "</table>"
        pages.append(out)
    pages[-1] += sign
    return doc(title, pages)


def simple_pages(title, pages):
    return doc(title, pages)


# ----------------------------------------------------------------------------------------------
# PRACTICE SET: 2468 Example Aspen Drive, Riverton, Utah (December 4, 2024 REPC)
# ----------------------------------------------------------------------------------------------

def practice():
    out = {}
    out["01 REPC 2468 Example Aspen Dr (signed).pdf"] = repc2024({
        'offer_date': 'October 27, 2026', 'buyer': 'Avery Samplewood and Jordan Samplewood', 'seller': 'Dana Practiceton',
        'emd': '$8,000', 'address': '2468 Example Aspen Drive', 'city': 'Riverton', 'county': 'Salt Lake', 'zip': '84065',
        'tax_id': '00-00-000-000 (made-up)', 'price': '$612,000', 'loan': '$489,600', 'loan_type': 'Conventional', 'cash': '$114,400',
        'sa': 'Seller', 'cof': 'Split', 'fin_amt': '$0', 'hw': True, 'hw_amt': '$650',
        'sdd': 'November 3, 2026', 'ddd': 'November 13, 2026', 'fad': 'November 24, 2026', 'setd': 'December 4, 2026',
        'offer_exp': 'October 28, 2026', 'buyer_sig': 'Avery Samplewood   Jordan Samplewood', 'seller_sig': 'Dana Practiceton',
        'accept_date': 'October 28, 2026', 'accept_time': '3:40 PM',
        'buyer_agent': 'the buyer\'s agent, Sample Summit Realty (made-up)', 'seller_agent': 'Kris Mockley, Example Peak Realty (made-up)',
    })
    out["02 Inspection Report 2468 Example Aspen Dr.pdf"] = inspection({
        'company': 'Practice Point Home Inspections (made-up)', 'address': '2468 Example Aspen Drive, Riverton, Utah 84065',
        'client': 'Avery and Jordan Samplewood', 'date': 'November 5, 2026', 'report_date': 'November 6, 2026',
        'inspector': 'Terry Example', 'type': 'Single-family, two stories with basement, attached two-car garage', 'year': '1996',
        'conditions': 'Clear, about 48 degrees F, dry ground', 'present': 'Buyers and buyer\'s agent for the last hour; home occupied by seller, furnished',
        'summary': [
            ('Safety and Major Concerns', [
                ('1', 'Water heater: the vent connector is separated at the draft hood and slopes downward toward the chimney. Spillage of exhaust was observed at the draft hood during a 5-minute draft test. Have a licensed plumber or HVAC contractor correct before use.', 'Safety', '7'),
                ('2', 'Roof: asphalt architectural shingles show widespread granule loss, cracked and lifted shingles on the south slope, and exposed nail heads. The roof appears to be near the end of its service life. Have a licensed roofing contractor evaluate.', 'Further Evaluation', '3'),
                ('3', 'Grading: soil at the northeast corner slopes toward the foundation. Efflorescence was observed on the basement foundation wall at the same corner. Regrade so soil slopes away and extend the downspout.', 'Repair', '4, 10'),
            ]),
            ('Repair and Maintenance', [
                ('4', 'Kitchen island receptacle is not GFCI protected.', 'Repair', '8'),
                ('5', 'Basement bathroom toilet is loose at the floor.', 'Repair', '10'),
                ('6', 'Furnace filter is dirty. Have the furnace serviced by an HVAC contractor.', 'Maintenance', '6'),
                ('7', 'Deck boards are weathered and several fasteners are loose.', 'Maintenance', '4'),
                ('8', 'Caulking at window trim on the south side is cracked.', 'Maintenance', '4'),
            ]),
        ],
        'pages': [
            [{'title': 'Roof', 'desc': [('Covering', 'Asphalt architectural shingles, one layer'), ('Method', 'Walked the roof where safe'), ('Age', 'Not determined by the inspector')],
              'obs': [('Shingles', 'Widespread granule loss on all slopes. On the south slope, about a dozen shingles are cracked or lifted, and nail heads are exposed in several rows. The roof appears to be near the end of its service life. Have a licensed roofing contractor evaluate the roof and give an opinion on repair or replacement.', 'Further Evaluation'),
                      ('Flashing', 'Step flashing at the garage wall and the plumbing vent boots appeared intact.', 'Informational'),
                      ('Gutters', 'Gutters are seamless aluminum. Minor debris in the rear gutter.', 'Maintenance')]}],
            [{'title': 'Exterior and Grounds', 'desc': [('Siding', 'Stucco and stone veneer'), ('Driveway', 'Concrete')],
              'obs': [('Grading, northeast corner', 'Soil slopes toward the foundation for about 8 feet along the east wall at the northeast corner. The downspout at this corner discharges at the foundation. See the efflorescence noted in the Basement section (page 10). Regrade so soil slopes away from the home and extend the downspout.', 'Repair'),
                      ('Deck', 'Composite rails are secure. Wood deck boards are weathered and several fasteners are loose. Refasten and seal.', 'Maintenance'),
                      ('Window trim caulking', 'Caulking at the window trim on the south side is cracked. Recaulk.', 'Maintenance'),
                      ('Driveway', 'Typical shrinkage cracks.', 'Informational')]}],
            [{'title': 'Garage', 'obs': [('Garage door and opener', 'Opener reversed on contact as intended. Photo eyes present.', 'Informational'), ('Fire door', 'Door between garage and house is self-closing.', 'Informational')]},
             {'title': 'Structure and Foundation', 'desc': [('Foundation', 'Poured concrete, partly concealed by basement finish')],
              'obs': [('Visible foundation', 'No significant cracking observed where visible. Finished walls in the basement limit the view.', 'Informational')]}],
            [{'title': 'Heating and Cooling', 'desc': [('Furnace', 'Gas forced air, data plate dated 2015'), ('Air conditioner', 'Split system, data plate dated 2015')],
              'obs': [('Furnace operation', 'Furnace responded to the thermostat and produced heat at the registers.', 'Informational'),
                      ('Filter', 'The filter is dirty. Replace it and have the furnace cleaned and serviced by an HVAC contractor.', 'Maintenance'),
                      ('Air conditioner', 'Not operated: outdoor temperature below the manufacturer\'s limit for testing.', 'Informational')]}],
            [{'title': 'Water Heater and Plumbing', 'desc': [('Water heater', 'Gas, 50 gallons, data plate dated 2009'), ('Supply piping', 'PEX'), ('Main shutoff', 'Basement mechanical room')],
              'obs': [('Water heater venting', 'The vent connector is separated at the draft hood and slopes downward toward the chimney. During a 5-minute draft test, exhaust spillage was observed at the draft hood. This can allow carbon monoxide into the home. Have a licensed plumber or HVAC contractor correct before use.', 'Safety'),
                      ('Water heater age', 'The water heater is 17 years old by its data plate. It produced hot water.', 'Informational'),
                      ('Supply and drains', 'No leaks observed at visible supply and drain lines.', 'Informational')]}],
            [{'title': 'Electrical', 'desc': [('Service', '200 amp, underground'), ('Panel', 'Main panel in garage'), ('Wiring', 'Copper, nonmetallic sheathed')],
              'obs': [('Panel', 'No defects observed at the main panel. Breakers labeled.', 'Informational'),
                      ('Kitchen island receptacle', 'The island receptacle is not GFCI protected. Have an electrician add GFCI protection.', 'Repair'),
                      ('Smoke and CO alarms', 'Smoke alarms present on each level. A CO alarm is present on the main level.', 'Informational')]}],
            [{'title': 'Attic and Insulation', 'desc': [('Access', 'Hall closet hatch, entered'), ('Insulation', 'Blown fiberglass, about 12 inches')],
              'obs': [('Bath exhaust duct', 'The exhaust fan duct from the upstairs hall bathroom ends in the attic insulation instead of venting to the exterior.', 'Repair'),
                      ('Roof sheathing', 'Dark staining on the underside of the roof sheathing over an area about 4 feet by 6 feet around the bath fan location. The sheathing was dry by moisture meter at the time of inspection. The inspector cannot determine the nature of the staining. Have a qualified contractor evaluate the sheathing and extend the fan duct to the exterior.', 'Further Evaluation')]}],
            [{'title': 'Interior and Basement', 'desc': [('Basement', 'Partly finished: family room and one bedroom; mechanical room and storage unfinished')],
              'obs': [('Basement foundation wall, northeast corner', 'White efflorescence on the exposed foundation wall in the unfinished storage area at the northeast corner. The area was dry at the time of inspection. Efflorescence shows that water has moved through the concrete at some time. See Grading (page 4).', 'Monitor'),
                      ('Basement bathroom toilet', 'The toilet is loose at the floor. Reset and secure it.', 'Repair'),
                      ('Basement bedroom window', 'Egress window and well present.', 'Informational'),
                      ('Interior doors', 'Closet door in the primary bedroom rubs at the top. Adjust.', 'Maintenance')]}],
            [{'title': 'Kitchen and Appliances', 'obs': [('Appliances', 'Range, dishwasher and disposal operated.', 'Informational')]},
             {'title': 'Closing Notes', 'obs': [('Radon', 'Radon testing is outside the scope of this inspection. See the separate radon report if one was ordered.', 'Informational'),
                                                ('Sewer lateral', 'The sewer lateral is outside the scope of this inspection. A sewer scope by a qualified contractor is available.', 'Informational')]}],
        ],
    })
    sign = "<p style='margin-top:14px'>Seller signature: <span class='sig'>Dana Practiceton</span> &nbsp; Date: October 30, 2026</p><p>Buyer acknowledgment of receipt: <span class='sig'>Avery Samplewood</span> &nbsp; November 2, 2026</p>"
    out["03 Seller Property Condition Disclosure.pdf"] = qa_form(
        "Seller's Property Condition Disclosure (made-up practice form)",
        "Property: 2468 Example Aspen Drive, Riverton, Utah 84065. Seller: Dana Practiceton.",
        "This made-up form follows the general shape of a residential seller disclosure. Answers are the seller's own, to the seller's actual knowledge.",
        [[('Roof', [('Approximate age of the roof?', 'Approx. 2004', 'Original roof as far as I know'),
                    ('Any past or present roof leaks?', 'No', ''),
                    ('Any roof repairs?', 'Yes', 'Replaced some shingles after a 2019 windstorm')]),
          ('Basement and Foundation', [('Any past or present water or moisture in the basement?', 'No', ''),
                                       ('Is the basement finished?', 'Yes', 'Partly finished in 2012: family room and bedroom'),
                                       ('Was a building permit obtained for the finish work?', "Don't know", 'I had it done; not sure if the contractor pulled a permit'),
                                       ('Any foundation repairs?', 'No', '')]),
          ('Heating, Cooling and Water Heater', [('Furnace year installed', '2015', 'Replaced 2015'),
                                                 ('Air conditioner year installed', '2015', ''),
                                                 ('Water heater year installed', '2009', ''),
                                                 ('Any known problems?', 'No', '')])],
         [('Plumbing and Sewer', [('Any past or present plumbing leaks?', 'No', ''),
                                  ('Any sewer backups or sewer line repairs?', 'No', '')]),
          ('Environmental', [('Has the home been tested for radon?', 'No', ''),
                             ('Is there a radon mitigation system?', 'No', ''),
                             ('Any known mold?', 'No', '')]),
          ('Water Service', [('Culinary (indoor) water source', 'City', 'City water'),
                             ('Secondary or irrigation water source', 'Pressurized irrigation', 'Example Valley Irrigation Company (made-up)'),
                             ('Any water shares or water rights that go with the home?', 'Yes', '1 share of Example Valley Irrigation Company stock. Certificate to be provided.')]),
          ('Lot, Easements and HOA', [('Any easements across the property?', 'Yes', 'Irrigation ditch easement along the back of the lot'),
                                      ('Any homeowners association?', 'No', ''),
                                      ('Any pending special assessments?', 'No', '')])]],
        sign)
    out["04 Radon Test Report.pdf"] = simple_pages("Radon", [f"""
<h1>Example Air Radon Testing (made-up)</h1>
<p><b>Radon Measurement Report</b></p>
<table>
<tr><th style="width:34%">Property</th><td>2468 Example Aspen Drive, Riverton, Utah 84065</td></tr>
<tr><th>Ordered by</th><td>Avery and Jordan Samplewood</td></tr>
<tr><th>Device</th><td>Continuous radon monitor, hourly readings</td></tr>
<tr><th>Location</th><td>Basement family room, lowest livable level, about 30 inches above the floor</td></tr>
<tr><th>Test start</th><td>November 4, 2026, 9:10 AM</td></tr>
<tr><th>Test end</th><td>November 6, 2026, 9:20 AM</td></tr>
<tr><th>Duration</th><td>48 hours</td></tr>
<tr><th>Closed-house conditions</th><td>Confirmed by the occupant's signed checklist</td></tr>
<tr><th><b>Average radon concentration</b></th><td><b>6.8 pCi/L</b></td></tr>
</table>
<h2>What This Result Means</h2>
<p>The EPA action level is 4 pCi/L. This result is above the action level. EPA recommends fixing a home when the radon level is 4 pCi/L or more.
For a real estate transaction, a mitigation system installed by a certified radon mitigation professional, followed by a post-mitigation test, is the
usual next step. This report does not give health advice.</p>
<h2>Hourly Readings (Summary)</h2>
<table><tr><th>Period</th><th>Average (pCi/L)</th></tr>
<tr><td>Hours 1 to 12</td><td>6.1</td></tr><tr><td>Hours 13 to 24</td><td>7.4</td></tr><tr><td>Hours 25 to 36</td><td>6.9</td></tr><tr><td>Hours 37 to 48</td><td>6.8</td></tr></table>
<p class="small">Tester: Casey Madeup. Certification number on file with the company. Device calibration current.</p>
"""])
    out["05 Title Commitment Schedule B.pdf"] = simple_pages("Title", [
        """
<h1>Make-Believe Title Insurance Agency (made-up)</h1>
<p><b>Commitment for Title Insurance</b>, Commitment No. MB-0000-PRACTICE</p>
<table>
<tr><th style="width:34%">Commitment date</th><td>October 30, 2026 at 8:00 AM</td></tr>
<tr><th>Proposed policy</th><td>ALTA Homeowner's Policy</td></tr>
<tr><th>Proposed insured</th><td>Avery Samplewood and Jordan Samplewood</td></tr>
<tr><th>Proposed amount</th><td>$612,000</td></tr>
<tr><th>Vested in</th><td>Dana Practiceton</td></tr>
<tr><th>Property</th><td>2468 Example Aspen Drive, Riverton, Utah 84065. Lot 41, Example Aspen Estates Subdivision (made-up), according to the official plat.</td></tr>
</table>
<h2>Schedule B, Part I: Requirements</h2>
<ol>
<li>Pay the agreed amount for the estate or interest to be insured, and pay premiums, fees and charges for the policy.</li>
<li>Record a warranty deed from Dana Practiceton to the proposed insured.</li>
<li>Payoff and release of the Deed of Trust recorded March 8, 2019 as Entry No. 0000001 (made-up), securing an original amount of $402,000, in favor of Pretend Mortgage Company (made-up), Loan No. 0000-PRACTICE-7781.</li>
<li>Payoff and release, or evidence of satisfaction, of the Deed of Trust recorded June 14, 2011 as Entry No. 0000002 (made-up), in favor of Sample Credit Union (made-up), securing a home equity line of credit. No release appears of record.</li>
<li>Provide the Company with a statement of no work performed on the property in the last 90 days, or lien waivers.</li>
</ol>
""",
        """
<h2>Schedule B, Part II: Exceptions</h2>
<ol>
<li>Rights or claims of parties in possession not shown by the public records.</li>
<li>Easements, liens or encumbrances not shown by the public records.</li>
<li>Any facts an accurate survey would disclose.</li>
<li>General property taxes for the year 2026, now a lien, not yet due and payable. Taxes for 2025 were paid.</li>
<li>Easement in favor of Example Valley Irrigation Company (made-up) for an irrigation ditch, 20 feet in width along the rear (south) lot line, recorded April 2, 1971 as Entry No. 0000003 (made-up).</li>
<li>A 10-foot public utility easement along the rear lot line, as shown on the recorded plat.</li>
<li>Covenants, conditions and restrictions of Example Aspen Estates Subdivision, recorded 1995 as Entry No. 0000004 (made-up). No homeowners association assessments are imposed by these covenants.</li>
<li>Water rights, claims or title to water, whether or not shown by the public records.</li>
</ol>
<p class="small">Wire fraud warning: Make-Believe Title will never change wiring instructions by email. Call your escrow officer at a number you already know before sending any funds.</p>
"""])
    return out


# ----------------------------------------------------------------------------------------------
# EVAL CASE 1: general mode (Idaho), clean report with two real issues
# ----------------------------------------------------------------------------------------------

def case1():
    out = {}
    out["case1/Purchase and Sale Agreement 915 Example Larch St.pdf"] = simple_pages("PSA", [
        """
<h1>Sample Residential Purchase and Sale Agreement</h1>
<p class="small">A made-up form written for testing. It is not a state form or any brokerage's form.</p>
<p><b>1. Parties and Property.</b> Buyer: Riley Testcase. Seller: Morgan Fakerson. Property: 915 Example Larch Street, Boise, Idaho 83706, with the
fixtures and improvements on it.</p>
<p><b>2. Agreement Date and Acceptance.</b> This Agreement was signed by Buyer on October 31, 2026. "Acceptance" occurs when the last party signs and
delivers this Agreement. Acceptance Date: November 2, 2026.</p>
<p><b>3. Purchase Price.</b> $389,500, paid as follows: earnest money of $5,000, a new conventional loan, and the balance in cash at closing.</p>
<p><b>4. Earnest Money.</b> Buyer shall deliver the earnest money to Pretend Peak Title &amp; Escrow (made-up) within 2 business days after Acceptance.</p>
<p><b>5. Time.</b> Time is of the essence. "Day" means a calendar day unless "business day" is stated. "Business day" means Monday through Friday,
excluding federal holidays. A time period begins on the day after the event that starts it and ends at 5:00 p.m. Mountain Time on its last day.</p>
<p><b>6. Financing.</b> This Agreement is conditioned on Buyer obtaining the loan described in Section 3. Buyer shall deliver written loan approval
or terminate by November 25, 2026.</p>
<p><b>7. Appraisal.</b> If the property appraises below the Purchase Price, Buyer may terminate by written notice by November 25, 2026, and the
earnest money is returned to Buyer.</p>
""",
        """
<p><b>8. Seller's Disclosure.</b> Seller shall deliver Seller's property disclosure statement to Buyer within 3 days after Acceptance.</p>
<p><b>9. Inspection Contingency.</b></p>
<p>9.1 <b>Inspection Period.</b> Buyer shall have 10 days after the Acceptance Date (the "Inspection Period") to complete any inspections Buyer
chooses, at Buyer's expense.</p>
<p>9.2 <b>Buyer's Notice.</b> Before the Inspection Period ends, Buyer may deliver to Seller either (a) written notice terminating this Agreement,
in which case the earnest money is returned to Buyer, or (b) a written request that Seller make repairs or other changes (a "Repair Request").</p>
<p>9.3 <b>Seller's Response.</b> Seller shall have 3 business days after receipt of a Repair Request (the "Seller Response Period") to respond in
writing, agreeing to all, some or none of the items.</p>
<p>9.4 <b>Buyer's Election.</b> If Seller does not agree in writing to every item in the Repair Request within the Seller Response Period, Buyer
may, within 2 business days after the Seller Response Period ends, either accept Seller's written response or terminate this Agreement by written
notice, in which case the earnest money is returned to Buyer. If Buyer gives no notice within those 2 business days, Buyer is deemed to have
accepted Seller's response.</p>
<p>9.5 <b>No Notice.</b> If Buyer delivers no notice under Section 9.2 before the Inspection Period ends, Buyer is deemed to have accepted the
condition of the Property, and this contingency is satisfied.</p>
<p>9.6 <b>Agreed Repairs.</b> Repairs Seller agrees to make shall be completed in a workmanlike manner by licensed contractors where a license is
required, with receipts delivered to Buyer at least 3 days before Closing.</p>
<p><b>10. Notices.</b> Notices must be in writing and are effective when received by the other party or that party's agent, by hand or email.</p>
<p><b>11. Closing.</b> Closing shall occur on or before December 4, 2026. Possession at recording.</p>
<p><b>12. Signatures.</b> Buyer: <span class="sig">Riley Testcase</span> October 31, 2026. Seller: <span class="sig">Morgan Fakerson</span> November 2, 2026.</p>
<p class="small">Buyer's agent: Sample Foothills Realty (made-up). Seller's agent: Jesse Notreal, Pretend Peak Realty (made-up).</p>
"""])
    out["case1/Inspection Report 915 Example Larch St.pdf"] = inspection({
        'company': 'Example Ridge Inspection Services (made-up)', 'address': '915 Example Larch Street, Boise, Idaho 83706',
        'client': 'Riley Testcase', 'date': 'November 5, 2026', 'report_date': 'November 5, 2026',
        'inspector': 'Sam Placeholder', 'type': 'Single-family, one story over a crawlspace, attached garage', 'year': '1994',
        'conditions': 'Overcast, about 45 degrees F', 'present': 'Buyer and buyer\'s agent; home vacant',
        'cost_note': 'No cost estimates are provided in this report.',
        'summary': [
            ('Summary of Significant Items', [
                ('1', 'Electrical panel: the 30-amp double-pole breaker serving the dryer circuit shows scorching, and the conductor insulation is melted at the breaker terminal. The conductors on this breaker appear to be 12 AWG, which is undersized for a 30-amp breaker. Have a licensed electrician evaluate and correct.', 'Safety', '5'),
                ('2', 'Crawlspace: active leak at the kitchen sink drain line in the crawlspace, with standing water on the vapor barrier below and elevated moisture readings at the subfloor. No visible microbial growth at the time of inspection. Have a licensed plumber repair the leak and evaluate the subfloor once dry.', 'Repair', '7'),
            ]),
            ('Maintenance and Minor Items', [
                ('3', 'Exterior receptacle at the rear patio is not GFCI protected.', 'Repair', '5'),
                ('4', 'Caulking at the hall bath tub surround is cracked.', 'Maintenance', '8'),
                ('5', 'Gutters hold debris; the downspout at the northwest corner is disconnected.', 'Maintenance', '3'),
                ('6', 'Furnace filter is dirty.', 'Maintenance', '6'),
                ('7', 'Weatherstripping at the front door is worn.', 'Maintenance', '3'),
                ('8', 'Bedroom 2 door sticks at the frame.', 'Maintenance', '8'),
            ]),
        ],
        'pages': [
            [{'title': 'Exterior and Grounds', 'desc': [('Siding', 'Fiber cement lap'), ('Driveway', 'Concrete')],
              'obs': [('Gutters and downspouts', 'Gutters hold leaf debris. The downspout at the northwest corner is disconnected and discharges at the foundation. Clean the gutters and reconnect the downspout.', 'Maintenance'),
                      ('Front door', 'Weatherstripping is worn; daylight visible at the latch side. Replace.', 'Maintenance'),
                      ('Driveway', 'Typical shrinkage cracks.', 'Informational'),
                      ('Grading', 'Soil generally slopes away from the foundation.', 'Informational')]}],
            [{'title': 'Roof', 'desc': [('Covering', 'Asphalt architectural shingles'), ('Method', 'Walked'), ('Age', 'Appears to be about 10 years old')],
              'obs': [('Shingles and flashing', 'Shingles lie flat with normal wear for their age. Flashing intact where visible.', 'Informational'),
                      ('Attic', 'Ventilation adequate; no staining observed at the sheathing.', 'Informational')]}],
            [{'title': 'Electrical', 'desc': [('Service', '200 amp, overhead'), ('Panel', 'Main panel in the garage'), ('Wiring', 'Copper, nonmetallic sheathed')],
              'obs': [('Dryer circuit breaker', 'The 30-amp double-pole breaker labeled "Dryer" shows scorching on its face and at the terminal, and the conductor insulation is melted at the terminal. The conductors appear to be 12 AWG, which is undersized for a 30-amp breaker. This is a fire hazard. Have a licensed electrician evaluate and correct before the dryer circuit is used.', 'Safety'),
                      ('Rear patio receptacle', 'The exterior receptacle at the rear patio is not GFCI protected. Have an electrician add GFCI protection.', 'Repair'),
                      ('Smoke and CO alarms', 'Smoke alarms present in each bedroom and the hall. CO alarm present in the hall.', 'Informational')]}],
            [{'title': 'Heating and Cooling', 'desc': [('Furnace', 'Gas forced air, data plate dated 2012'), ('Air conditioner', 'Split system, data plate dated 2012')],
              'obs': [('Furnace', 'Operated normally. Filter is dirty; replace.', 'Maintenance'),
                      ('Air conditioner', 'Not operated: outdoor temperature too low for testing.', 'Informational'),
                      ('Water heater', 'Gas, 40 gallons, data plate dated 2018. Operated; venting intact.', 'Informational')]}],
            [{'title': 'Crawlspace and Plumbing', 'desc': [('Access', 'Hatch in the hall closet, entered'), ('Vapor barrier', 'Plastic sheeting over soil'), ('Supply', 'Copper and PEX'), ('Drains', 'ABS')],
              'obs': [('Kitchen sink drain', 'Active leak at a joint in the kitchen sink drain line where it runs through the crawlspace. Water was dripping during the inspection while the sink drained. Standing water on the vapor barrier below, about 3 feet across. Moisture readings at the subfloor near the leak were elevated. No visible microbial growth at the time of inspection. Have a licensed plumber repair the leak, then have the subfloor evaluated once dry.', 'Repair'),
                      ('Foundation', 'Stem walls visible from the crawlspace showed no significant cracking.', 'Informational'),
                      ('Insulation', 'Fiberglass batts between floor joists; a few batts have fallen near the access.', 'Maintenance')]}],
            [{'title': 'Interior', 'obs': [('Hall bath tub surround', 'Caulking is cracked at the tub surround. Recaulk to prevent water entry.', 'Maintenance'),
                                           ('Bedroom 2 door', 'Door sticks at the frame. Adjust.', 'Maintenance'),
                                           ('Floors and walls', 'Typical wear. Minor nail pops in the living room ceiling.', 'Informational')]}],
            [{'title': 'Kitchen and Appliances', 'obs': [('Appliances', 'Range, dishwasher and disposal operated. Refrigerator present.', 'Informational')]},
             {'title': 'Closing Notes', 'obs': [('Scope', 'Radon, mold and sewer lateral testing are outside the scope of this inspection.', 'Informational')]}],
        ],
    })
    return out


# ----------------------------------------------------------------------------------------------
# EVAL CASE 2: Utah December 2024 REPC, summary leaves out a significant body finding, deadline tomorrow
# ----------------------------------------------------------------------------------------------

def case2():
    out = {}
    out["case2/REPC 3355 W Example Falcon Ct (signed).pdf"] = repc2024({
        'offer_date': 'October 24, 2026', 'buyer': 'Quinn Exampleson and Jordan Exampleson', 'seller': 'Pat Notreal',
        'emd': '$5,000', 'address': '3355 W Example Falcon Court', 'city': 'West Jordan', 'county': 'Salt Lake', 'zip': '84088',
        'tax_id': '00-00-000-001 (made-up)', 'price': '$529,900', 'loan': '$503,405', 'loan_type': 'Conventional', 'cash': '$21,495',
        'sa': 'Seller', 'cof': 'Seller', 'fin_amt': '$0', 'hw': False, 'hw_amt': '',
        'sdd': 'October 31, 2026', 'ddd': 'November 9, 2026', 'fad': 'November 20, 2026', 'setd': 'December 1, 2026',
        'offer_exp': 'October 25, 2026', 'buyer_sig': 'Quinn Exampleson   Jordan Exampleson', 'seller_sig': 'Pat Notreal',
        'accept_date': 'October 25, 2026', 'accept_time': '11:15 AM',
        'buyer_agent': 'the buyer\'s agent, Sample Canyon Realty (made-up)', 'seller_agent': 'Robin Fakely, Pretend Valley Realty (made-up)',
    })
    out["case2/Home Inspection Report 3355 W Example Falcon Ct.pdf"] = inspection({
        'company': 'Benchmark Example Home Inspections (made-up)', 'address': '3355 W Example Falcon Court, West Jordan, Utah 84088',
        'client': 'Quinn and Jordan Exampleson', 'date': 'November 5, 2026', 'report_date': 'November 6, 2026',
        'inspector': 'Lou Fictional', 'type': 'Single-family, split-level with basement, attached garage', 'year': '1984',
        'conditions': 'Sunny, about 52 degrees F', 'present': 'Buyers for the walkthrough; home occupied, furnished',
        'summary': [
            ('Summary of Concerns', [
                ('1', 'Furnace is due for service; the filter is very dirty. Have a licensed HVAC contractor clean and service the furnace.', 'Maintenance', '7'),
                ('2', 'GFCI protection is missing at the kitchen countertop receptacles left of the sink and at the garage receptacles.', 'Repair', '9'),
                ('3', 'Sealant at the chimney flashing is cracked. Reseal.', 'Maintenance', '4'),
                ('4', 'Downspout at the southwest corner discharges next to the foundation. Extend it.', 'Maintenance', '3'),
                ('5', 'Upstairs hall bath sink stopper does not operate.', 'Maintenance', '10'),
            ]),
        ],
        'pages': [
            [{'title': 'Exterior and Grounds', 'desc': [('Siding', 'Brick veneer and wood lap'), ('Driveway', 'Concrete')],
              'obs': [('Downspouts', 'The downspout at the southwest corner discharges next to the foundation. Add an extension to carry water at least several feet away.', 'Maintenance'),
                      ('Wood siding', 'Paint is weathered on the south side. Repaint as routine upkeep.', 'Maintenance'),
                      ('Grading', 'Generally slopes away from the home.', 'Informational')]}],
            [{'title': 'Roof and Chimney', 'desc': [('Covering', 'Asphalt three-tab shingles'), ('Method', 'Walked'), ('Chimney', 'Masonry')],
              'obs': [('Shingles', 'Normal wear. No active leaks observed in the attic.', 'Informational'),
                      ('Chimney flashing', 'Sealant at the chimney flashing is cracked. Reseal.', 'Maintenance')]}],
            [{'title': 'Structure and Foundation', 'desc': [('Foundation', 'Poured concrete')],
              'obs': [('Foundation walls', 'Minor vertical shrinkage cracks in the garage stem wall. Typical.', 'Informational')]}],
            [{'title': 'Basement', 'desc': [('Finish', 'Finished family room, bedroom and three-quarter bath')],
              'obs': [('Basement bedroom window well', 'The window well outside the basement bedroom is filled with leaves and soil, and no drain is visible. Water staining and white efflorescence on the foundation wall below the window, visible behind the bedroom closet access panel. The moisture meter reading at the drywall below the window was elevated at the time of inspection. Have a qualified contractor evaluate the window well drainage and the source of moisture.', 'Further Evaluation'),
                      ('Basement bathroom', 'Fixtures operated. Exhaust fan operated.', 'Informational')]}],
            [{'title': 'Heating and Cooling', 'desc': [('Furnace', 'Gas forced air, data plate dated 2010'), ('Air conditioner', 'Split system, data plate dated 2010')],
              'obs': [('Furnace', 'Furnace operated. The filter is very dirty. Have a licensed HVAC contractor clean and service the furnace.', 'Maintenance'),
                      ('Air conditioner', 'Not operated: outdoor temperature too low for testing.', 'Informational')]}],
            [{'title': 'Water Heater and Plumbing', 'desc': [('Water heater', 'Gas, 40 gallons, data plate dated 2016'), ('Supply', 'Copper'), ('Drains', 'ABS')],
              'obs': [('Water heater', 'Operated. Venting intact. Seismic straps present.', 'Informational'),
                      ('Supply and drains', 'No leaks observed at visible lines.', 'Informational')]}],
            [{'title': 'Electrical', 'desc': [('Service', '200 amp, overhead'), ('Panel', 'Federal Pacific Electric (FPE), Stab-Lok breakers, in the garage'), ('Wiring', 'Copper, nonmetallic sheathed')],
              'obs': [('Main panel', 'The panel is a Federal Pacific Electric (FPE) panel with Stab-Lok breakers. Scorching was observed on the 20-amp breaker serving the kitchen circuit and on the adjacent area of the bus bar. Several breakers did not seat firmly in the panel. This condition is a fire hazard. Have a licensed electrician evaluate and correct immediately.', 'Safety'),
                      ('Kitchen and garage receptacles', 'GFCI protection is missing at the kitchen countertop receptacles left of the sink and at the garage receptacles. Have an electrician add GFCI protection.', 'Repair'),
                      ('Smoke and CO alarms', 'Smoke alarms present on each level. CO alarm present near the bedrooms.', 'Informational')]}],
            [{'title': 'Interior and Bathrooms', 'obs': [('Upstairs hall bath', 'The sink stopper does not operate. Repair.', 'Maintenance'),
                                                         ('Windows', 'Several original windows have fogged glass between panes (failed seals).', 'Informational'),
                                                         ('Interior finishes', 'Typical wear.', 'Informational')]}],
            [{'title': 'Kitchen and Appliances', 'obs': [('Appliances', 'Range, dishwasher and microwave operated.', 'Informational')]},
             {'title': 'Closing Notes', 'obs': [('Scope', 'Radon and sewer lateral testing were not part of this inspection.', 'Informational')]}],
        ],
    })
    sign = "<p style='margin-top:14px'>Seller signature: <span class='sig'>Pat Notreal</span> &nbsp; Date: October 29, 2026</p>"
    out["case2/Seller Property Condition Disclosure 3355 W Example Falcon Ct.pdf"] = qa_form(
        "Seller's Property Condition Disclosure (made-up test form)",
        "Property: 3355 W Example Falcon Court, West Jordan, Utah 84088. Seller: Pat Notreal.",
        "This made-up form follows the general shape of a residential seller disclosure. Answers are the seller's own, to the seller's actual knowledge.",
        [[('Basement and Foundation', [('Any past or present water or moisture in the basement?', 'No', ''),
                                       ('Is the basement finished?', 'Yes', 'Finished before I bought the home in 2014'),
                                       ('Any foundation repairs?', 'No', '')]),
          ('Electrical', [('Any known problems with the electrical system?', 'No', ''),
                          ('Has the electrical panel been replaced?', "Don't know", ''),
                          ('Any breakers that trip often?', 'No', '')]),
          ('Heating, Cooling and Water Heater', [('Furnace year installed', '2010', ''),
                                                 ('Water heater year installed', '2016', ''),
                                                 ('Any known problems?', 'No', '')]),
          ('Roof', [('Any past or present roof leaks?', 'No', ''), ('Approximate age of the roof?', "Don't know", '')]),
          ('Environmental', [('Has the home been tested for radon?', 'No', ''), ('Any known mold?', 'No', '')]),
          ('HOA', [('Any homeowners association?', 'No', '')])]],
        sign)
    return out


# ----------------------------------------------------------------------------------------------
# EVAL CASE 3: Utah November 1, 2026 REPC, HOA packet with rental cap and a pending special assessment
# ----------------------------------------------------------------------------------------------

def case3():
    out = {}
    out["case3/REPC 77 Example Cove Ln Unit 14 (signed).pdf"] = repc2026({
        'offer_date': 'November 1, 2026', 'buyer': 'Morgan Testfield', 'seller': 'Jamie Pretendson',
        'emd': '$4,000', 'address': '77 Example Cove Lane, Unit 14', 'city': 'Lehi', 'county': 'Utah', 'zip': '84043',
        'tax_id': '00-000-0014 (made-up)', 'price': '$415,000', 'loan': '$394,250', 'cash': '$16,750', 'scc': '$0',
        'sa': 'Seller', 'cof': 'Buyer',
        'sdd': 'November 6, 2026', 'ddd': 'November 17, 2026', 'apd': 'November 24, 2026', 'find': 'December 1, 2026', 'setd': 'December 11, 2026',
        'offer_exp': 'November 2, 2026', 'buyer_sig': 'Morgan Testfield', 'seller_sig': 'Jamie Pretendson', 'accept_date': 'November 2, 2026',
        'buyer_agent': 'the buyer\'s agent, Sample Ridge Realty (made-up)', 'seller_agent': 'Drew Imaginary, Example Lake Realty (made-up)',
    })
    hoa_pages = [
        """
<h1>Pretend Property Management (made-up)</h1>
<p><b>Resale Certificate and Payoff Statement</b> for Example Cove Townhomes Owners Association (made-up)</p>
<table>
<tr><th style="width:40%">Unit</th><td>77 Example Cove Lane, Unit 14, Lehi, Utah 84043</td></tr>
<tr><th>Owner of record</th><td>Jamie Pretendson</td></tr>
<tr><th>Owner account number</th><td>ECT-0014-55817</td></tr>
<tr><th>Prepared</th><td>November 5, 2026</td></tr>
<tr><th>Regular assessment</th><td>$285 per month, due the 1st</td></tr>
<tr><th>What the assessment covers</th><td>Master insurance policy (building exteriors and common areas), water and sewer, trash, snow removal, landscaping, exterior maintenance and reserves</td></tr>
<tr><th>Account status</th><td>Paid through November 30, 2026</td></tr>
<tr><th>Special assessments currently levied</th><td>None</td></tr>
<tr><th>Proposed special assessments</th><td>See the board minutes enclosed</td></tr>
<tr><th>Reinvestment fee due at closing</th><td>$2,490 (0.6% of the sale price, per Declaration Section 9.6)</td></tr>
<tr><th>Buyer setup fee</th><td>$350</td></tr>
<tr><th>Pending litigation</th><td>None known</td></tr>
<tr><th>Rental status of this Unit</th><td>Owner occupied</td></tr>
</table>
<p class="small">Payment of the payoff amount must be made by the closing office. Never send funds based on emailed instructions; call our office at a number you already know.</p>
""",
        """
<h2>Declaration of Covenants, Conditions and Restrictions for Example Cove Townhomes (excerpt)</h2>
<p class="small">Declaration recorded May 2, 2005. Second Amendment recorded August 9, 2016 (adds Section 9.6), with a Notice of Reinvestment Fee Covenant recorded the same day. Excerpts only.</p>
<p><b>Article 2. Lots and Units.</b> The Project consists of 30 Lots, each improved with one attached townhome Unit, in five buildings (Buildings A to E), and the Common Area.</p>
<p><b>Section 9.1 Regular Assessments.</b> Each Owner shall pay regular assessments set by the Board in the annual budget.</p>
<p><b>Section 9.3 Special Assessments.</b> The Board may propose a special assessment for capital improvements or repairs that reserves do not cover. A special assessment above the amount the Board may levy alone requires approval by a majority of the Owners voting at a meeting called for that purpose.</p>
<p><b>Section 9.6 Reinvestment Fee.</b> Upon each transfer of a Lot, the transferee shall pay to the Association a reinvestment fee equal to 0.6% of the sale price, to be used for common area maintenance and reserves.</p>
<p><b>Section 10.2 Exterior Maintenance.</b> The Association maintains the roofs, siding, exterior paint, driveways and landscaping. Owners maintain everything inside their Units, including windows and doors.</p>
<p><b>Section 11.1 Insurance.</b> The Association insures the buildings' exterior structure and the Common Area under a master policy. Each Owner shall insure the interior of the Owner's Unit, its improvements and betterments, personal property and liability, and should ask an insurance agent about coverage for the master policy deductible.</p>
""",
        """
<h2>Third Amendment to the Declaration: Article 12, Leasing</h2>
<p class="small">Recorded April 12, 2023.</p>
<p><b>12.1 Rental Cap.</b> No more than six (6) of the thirty (30) Units, twenty percent (20%), may be leased at any one time.</p>
<p><b>12.2 Waitlist.</b> An Owner who wishes to lease shall notify the Board in writing. If six Units are already leased, the Owner shall be placed on a waitlist in the order the notices are received and may lease only when a rental slot opens.</p>
<p><b>12.3 Lease Term.</b> The initial term of any lease shall be at least twelve (12) months. No Unit may be rented for fewer than 30 consecutive days.</p>
<p><b>12.4 Lease Addendum.</b> The Owner and the tenant shall sign the Association's lease addendum.</p>
<p><b>12.5 Exemptions.</b> This Article does not apply to the exemptions required by Utah law, including an Owner on military deployment, a Unit occupied by the Owner's parent, child or sibling, and an Owner relocated by an employer for two years or less.</p>
<p><b>12.6 Existing Rentals.</b> An Owner leasing a Unit on the date this Amendment is recorded may continue to lease that Unit until the Unit is conveyed or the Owner occupies it.</p>
<h2>Rules and Regulations (excerpt)</h2>
<p>Pets: no more than two per Unit. Parking: two spaces per Unit; no RV, boat or trailer storage. Exterior changes need Board approval.</p>
""",
        """
<h2>2026 Annual Budget</h2>
<table>
<tr><th>Income</th><th>2026 Budget</th></tr>
<tr><td>Regular assessments (30 Units at $285 per month)</td><td>$102,600</td></tr>
<tr><th>Expenses</th><th></th></tr>
<tr><td>Master insurance premium</td><td>$31,400</td></tr>
<tr><td>Water and sewer</td><td>$18,000</td></tr>
<tr><td>Landscaping and snow removal</td><td>$14,500</td></tr>
<tr><td>Management</td><td>$9,000</td></tr>
<tr><td>Repairs and maintenance</td><td>$6,200</td></tr>
<tr><td>Administrative and legal</td><td>$2,000</td></tr>
<tr><td>Contribution to reserves</td><td>$21,500</td></tr>
<tr><td><b>Total expenses</b></td><td><b>$102,600</b></td></tr>
</table>
<p class="small">Note: the master insurance premium was $22,750 in 2025.</p>
""",
        """
<h2>Reserve Study Summary</h2>
<p class="small">Prepared by Make-Believe Reserve Consultants (made-up), dated March 14, 2024. Excerpt.</p>
<table>
<tr><th style="width:55%">Item</th><th>Figure</th></tr>
<tr><td>Recommended annual reserve contribution</td><td>$58,000</td></tr>
<tr><td>Reserve balance, December 31, 2025 (from the Association's financial statement)</td><td>$148,200</td></tr>
<tr><td>Percent funded (study's measure)</td><td>31%</td></tr>
<tr><td>Roofs, Buildings A to E: remaining useful life</td><td>0 to 2 years</td></tr>
<tr><td>Roofs, Buildings A to E: replacement cost estimate in the study</td><td>$310,000</td></tr>
<tr><td>Asphalt drive: remaining useful life</td><td>6 years</td></tr>
</table>
<p>The study recommends increasing contributions to the recommended level and planning for roof replacement within two years.</p>
""",
        """
<h2>Board Meeting Minutes, September 16, 2026</h2>
<p>Present: three of three Board members and the manager. Quorum confirmed.</p>
<ol>
<li><b>Roofs.</b> The manager presented two roof replacement bids for Buildings A to E. Reserves are not enough to cover the work. The Board asked the manager to prepare a special assessment proposal for the October meeting.</li>
<li><b>Rentals.</b> All six rental slots are filled. Four Owners are on the rental waitlist.</li>
<li><b>Insurance.</b> The manager reported the master policy renewal came in higher than budgeted for 2025.</li>
<li><b>Landscaping.</b> Fall cleanup scheduled.</li>
</ol>
""",
        """
<h2>Board Meeting Minutes, October 21, 2026</h2>
<p>Present: three of three Board members, the manager and five Owners. Quorum confirmed.</p>
<ol>
<li><b>Special assessment.</b> The Board voted to put a special assessment of $4,200 per Unit to a vote of the Owners at the annual meeting on December 15, 2026, to fund roof replacement for Buildings A to E together with reserves. If approved, it would be payable in two equal installments due February 1, 2027 and May 1, 2027.</li>
<li><b>Insurance.</b> The 2026 master policy premium is 38% higher than 2025. The manager will get quotes before the next renewal.</li>
<li><b>Rentals.</b> No change. Six Units leased; four Owners on the waitlist.</li>
<li><b>Owner comments.</b> Owners asked about the roof schedule. The Board said work would start in spring 2027 if the assessment is approved.</li>
</ol>
<p>Next meeting: annual meeting, December 15, 2026.</p>
""",
    ]
    out["case3/HOA Documents Example Cove Townhomes.pdf"] = simple_pages("HOA", hoa_pages)
    out["case3/Inspection Report 77 Example Cove Ln Unit 14.pdf"] = inspection({
        'company': 'Keystone Example Inspections (made-up)', 'address': '77 Example Cove Lane, Unit 14, Lehi, Utah 84043',
        'client': 'Morgan Testfield', 'date': 'November 6, 2026', 'report_date': 'November 6, 2026',
        'inspector': 'Alex Imaginary', 'type': 'Attached townhome, two stories, attached one-car garage', 'year': '2005',
        'conditions': 'Clear, about 50 degrees F', 'present': 'Buyer; unit occupied, furnished',
        'summary': [
            ('Summary', [
                ('1', 'No smoke alarm in bedroom 2. Install one.', 'Safety', '5'),
                ('2', 'Roof (HOA maintained), viewed from the ground: shingles show curling and granule loss on the south slope. Refer to the HOA.', 'Informational', '3'),
                ('3', 'Dishwasher drain line has no high loop.', 'Maintenance', '6'),
                ('4', 'Caulking at the kitchen backsplash is cracked.', 'Maintenance', '6'),
            ]),
        ],
        'pages': [
            [{'title': 'Exterior and Roof', 'desc': [('Responsibility', 'Exterior and roof are maintained by the HOA'), ('Roof covering', 'Asphalt shingles'), ('Method', 'Viewed from the ground with binoculars')],
              'obs': [('Roof', 'Shingles on the south slope show curling and granule loss. The roof is maintained by the HOA. Refer to the HOA for its condition and plans.', 'Informational'),
                      ('Siding', 'Fiber cement siding in serviceable condition.', 'Informational')]}],
            [{'title': 'Heating, Cooling and Water Heater', 'desc': [('Furnace', 'Gas forced air, data plate dated 2005'), ('Water heater', 'Gas, 40 gallons, data plate dated 2011')],
              'obs': [('Furnace', 'Operated normally. Filter clean.', 'Informational'),
                      ('Water heater', 'Operated; venting intact. At 15 years old it is in the typical later years of service for this type. Budget for replacement.', 'Informational')]}],
            [{'title': 'Electrical and Life Safety', 'desc': [('Panel', '125 amp, in garage')],
              'obs': [('Smoke alarms', 'No smoke alarm in bedroom 2. Smoke alarms present in bedroom 1 and the upstairs hall. Install a smoke alarm in bedroom 2.', 'Safety'),
                      ('CO alarm', 'CO alarm present in the upstairs hall.', 'Informational'),
                      ('Panel', 'No defects observed.', 'Informational')]}],
            [{'title': 'Interior and Kitchen', 'obs': [('Dishwasher', 'The drain line has no high loop or air gap. Add a high loop.', 'Maintenance'),
                                                       ('Kitchen backsplash', 'Caulking is cracked. Recaulk.', 'Maintenance'),
                                                       ('Floors and walls', 'Typical wear.', 'Informational')]}],
            [{'title': 'Limitations', 'obs': [('Attic', 'The attic is reached through a shared access controlled by the HOA and was not entered.', 'Informational'),
                                              ('Scope', 'Radon testing was not part of this inspection.', 'Informational')]}],
        ],
    })
    return out


def main():
    html_dir = sys.argv[1]
    os.makedirs(html_dir, exist_ok=True)
    jobs = []
    sets = [(practice(), "practice/", PRACTICE), (case1(), "evals/files/", TEST), (case2(), "evals/files/", TEST), (case3(), "evals/files/", TEST)]
    n = 0
    for docs, prefix, stamp in sets:
        for name, content in docs.items():
            n += 1
            h = f"doc{n:02d}.html"
            with open(os.path.join(html_dir, h), "w", encoding="utf-8") as fh:
                fh.write(content)
            base = os.path.splitext(os.path.basename(name))[0]
            jobs.append({"html": h, "pdf": prefix + name, "stamp": stamp, "footer": html.escape(base)})
    with open(os.path.join(html_dir, "pdfs.json"), "w", encoding="utf-8") as fh:
        json.dump(jobs, fh, indent=1)
    print(f"wrote {n} HTML files to {html_dir}")


if __name__ == "__main__":
    main()
