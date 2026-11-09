"""Builds the made-up practice and eval files for new-construction-review.

Usage: python3 make_files.py SKILL_DIR HTML_DIR
Writes one HTML file per PDF into HTML_DIR, plus pdfs.json. Then run
  node html_to_pdf.cjs HTML_DIR SKILL_DIR
to print each one to PDF in practice/ or evals/files/.

Every builder, lender, title company, district, street, city, county, person and arbitration service
here is made up. The builder contracts are invented forms in the shape builders use (their own
counsel-prepared agreement plus addenda and exhibits), not any real builder's contract.
"""
import json
import os
import sys

SKILL_DIR, HTML_DIR = sys.argv[1], sys.argv[2]
os.makedirs(HTML_DIR, exist_ok=True)
PDFS = []

CSS = (
    "body{font-family:Georgia,'Times New Roman',serif;font-size:9.7pt;line-height:1.4;margin:0;color:#111}"
    "h1{font-size:14pt;text-align:center;margin:0 0 2px;letter-spacing:.4px}"
    "h2{font-size:10.5pt;margin:10px 0 3px;text-transform:uppercase}"
    ".sub{font-size:9pt;text-align:center;margin:0 0 8px;color:#333}"
    ".note{font-size:8.2pt;color:#555;text-align:center;margin:0 0 8px;font-style:italic}"
    "p{margin:4px 0}.ind{margin-left:20px}"
    ".f{font-family:'Courier New',monospace;font-weight:bold;border-bottom:1px solid #333;padding:0 3px}"
    ".caps{text-transform:uppercase;font-weight:bold}"
    "table.t{width:100%;border-collapse:collapse;margin:6px 0}table.t td,table.t th{border:1px solid #555;padding:3px 6px;font-size:9pt;text-align:left}"
    "table.t th{background:#eee}td.r{text-align:right}"
    "table.sig{width:100%;margin:10px 0;border-collapse:collapse}table.sig td{padding:14px 6px 2px;font-size:8.6pt;vertical-align:bottom;border-bottom:1px solid #333;width:50%}"
    ".box{border:1px solid #333;padding:6px 8px;margin:8px 0}"
    ".footer{font-size:7.8pt;text-align:center;margin-top:12px;color:#444}"
    ".pb{page-break-before:always}"
    ".plat{font-family:Arial,Helvetica,sans-serif;font-size:9pt}"
)


def f(v):
    return f"<span class='f'>{v}</span>"


def write(rel, stamp, body, footer_note):
    html = f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{body}</body></html>"
    name = rel.replace("/", "__").replace(".pdf", ".html").replace(" ", "_")
    with open(os.path.join(HTML_DIR, name), "w", encoding="utf-8") as fh:
        fh.write(html)
    PDFS.append({"html": name, "pdf": rel, "stamp": stamp, "footer": footer_note})


def sections(items):
    """items: list of (heading, [paragraphs]) or ('PAGEBREAK', None)."""
    out = []
    for head, paras in items:
        if head == "PAGEBREAK":
            out.append("<div class='pb'></div>")
            continue
        out.append(f"<h2>{head}</h2>")
        for p in paras:
            out.append(f"<p class='ind'>{p}</p>" if p.startswith("(") or p[:4].strip().replace(".", "").isdigit() else f"<p>{p}</p>")
    return "".join(out)


def sig_block(left, right):
    return "<table class='sig'><tr>" + "".join(f"<td>{x}</td>" for x in (left, right)) + "</tr></table>"


P_STAMP = "PRACTICE FILE: made-up example"
E_STAMP = "TEST FILE: made-up example"

# =============================================================================================
# PRACTICE: Lot 47, Make-Believe Meadows Phase 2, Sampleton, Example County, Utah
# Placeholder Peak Homes, LLC (builder); Sample Summit Home Loans, LLC (affiliated lender);
# Pretend Peak Title Agency (affiliated closing agent)
# =============================================================================================

def practice_pa():
    b = ["<h1>NEW HOME PURCHASE AGREEMENT</h1>",
         "<p class='sub'>PLACEHOLDER PEAK HOMES, LLC &nbsp;|&nbsp; Make-Believe Meadows Phase 2 &nbsp;|&nbsp; Sampleton, Utah</p>",
         "<p class='note'>Made-up builder form for practice. Not a real builder, contract or community.</p>"]
    b.append("<div class='box'>"
             f"<p><b>Seller:</b> {f('Placeholder Peak Homes, LLC')}, a Utah limited liability company</p>"
             f"<p><b>Buyer:</b> {f('Casey Practiceton and Morgan Practiceton')}</p>"
             f"<p><b>Lot:</b> {f('Lot 47')}, Make-Believe Meadows Phase 2, City of Sampleton, Example County, Utah. "
             f"Address to be assigned (expected: {f('1187 W Pretend Ridge Way, Sampleton, UT 84000')}).</p>"
             f"<p><b>Plan:</b> {f('The Juniper, Elevation B')}</p>"
             f"<p><b>Contract Date:</b> the date Seller signs this Agreement: {f('__________')}</p>"
             f"<p><b>Lot Reservation:</b> Seller will hold Lot 47 for Buyer until {f('5:00 PM Mountain Time on November 13, 2026')}. "
             "If Buyer has not signed this Agreement and paid the Earnest Money by then, the lot may be released to other buyers.</p>"
             "</div>")
    b.append(sections([
        ("1. Purchase Price", [
            "<table class='t'><tr><th>Item</th><th>Amount</th></tr>"
            "<tr><td>Base Price (The Juniper, Elevation B)</td><td class='r'>$512,900</td></tr>"
            "<tr><td>Lot Premium (Lot 47)</td><td class='r'>$18,000</td></tr>"
            "<tr><td>Options and Upgrades (Exhibit B)</td><td class='r'>$41,350</td></tr>"
            "<tr><td><b>Total Purchase Price</b></td><td class='r'><b>$572,250</b></td></tr></table>",
            "The Purchase Price changes only by a written change order or addendum signed by Seller.",
        ]),
        ("2. Deposits", [
            "2.1 <b>Earnest Money.</b> Buyer shall pay Earnest Money of $10,000 to Seller when Buyer signs this Agreement.",
            "2.2 <b>Option Deposit.</b> Buyer shall pay an Option Deposit equal to twenty-five percent (25%) of the Options and Upgrades price, $10,337.50, "
            "at Buyer's Design Studio Selection Appointment, which must occur within twenty-one (21) days after the Contract Date.",
            "2.3 <b>Change Order Payments.</b> Buyer shall pay one hundred percent (100%) of the price of any change order when the change order is signed.",
            "2.4 <b>Handling of Deposits.</b> The Earnest Money, Option Deposit and Change Order Payments (together, \"Deposits\") are paid directly to Seller. "
            "They are not held in escrow or in a trust account, are not segregated from Seller's other funds, and may be used by Seller for any purpose, "
            "including construction of the Home. Deposits are credited to the Purchase Price at Closing.",
            "2.5 <b>Refunds.</b> Buyer may cancel this Agreement by written notice to Seller within three (3) calendar days after the Contract Date and receive "
            "a refund of the Earnest Money less a $500 cancellation fee. <span class='caps'>After that, the Earnest Money is non-refundable</span> except as provided "
            "in Section 5.3 (loan denial) and Section 14.2 (Seller default). <span class='caps'>The Option Deposit and all Change Order Payments are non-refundable "
            "when paid</span>, except on Seller default.",
        ]),
        ("3. Construction and Completion", [
            "3.1 Seller will build the Home according to Seller's plans and specifications for the Plan. Seller may substitute materials, products or brands "
            "of equal or better quality in Seller's judgment. Models, renderings, floor plans and brochures are illustrations only and may show features not included in the Purchase Price.",
            "3.2 <b>Estimated Completion.</b> Seller estimates that the Home will be complete in the second quarter of 2027. This is an estimate only and is not a guarantee.",
            "3.3 <b>Delays.</b> Seller may extend the estimated completion for weather, labor or material shortages, governmental or utility delays, or any other cause "
            "beyond Seller's reasonable control. Seller shall in all events complete the Home within twenty-four (24) months after the Contract Date. If Seller does not, "
            "Buyer's sole remedy is to cancel this Agreement and receive a refund of all Deposits. Seller is not liable for rent, storage, moving, interest rate lock "
            "extension or any other cost caused by delay.",
            "3.4 <b>Notice of Completion.</b> Seller will notify Buyer in writing when a certificate of occupancy is issued (\"Notice of Completion\"). Closing shall occur "
            "within ten (10) calendar days after the Notice of Completion.",
        ]),
        ("4. Selections and Change Orders", [
            "4.1 Buyer's selections are made at the Design Studio Selection Appointment and become final at the end of that appointment (\"Design Cut-Off\").",
            "4.2 After Design Cut-Off, Seller may accept or refuse any requested change in its sole discretion. Each accepted change carries a change order fee of $350 "
            "in addition to the price of the change.",
        ]),
        ("5. Financing and Appraisal", [
            "5.1 Buyer shall submit a complete mortgage loan application within five (5) calendar days after the Contract Date and deliver to Seller written loan "
            "approval (not a prequalification) within thirty (30) calendar days after the Contract Date. Buyer's lender must be acceptable to Seller.",
            "5.2 Seller offers an incentive to buyers who finance with Seller's preferred lender. See the Preferred Lender Incentive Addendum.",
            "5.3 If, after diligent application, Buyer's loan is denied in writing within thirty (30) calendar days after the Contract Date, Buyer may cancel this Agreement "
            "by written notice with a copy of the denial and receive a refund of the Earnest Money. The Option Deposit and Change Order Payments are not refunded.",
            "5.4 If Buyer does not deliver written loan approval within thirty (30) calendar days after the Contract Date, Seller may cancel this Agreement and retain all Deposits.",
            "5.5 <b>Appraisal.</b> This Agreement is not contingent on an appraisal. If the appraised value is less than the Purchase Price, Buyer shall pay the difference in cash at Closing.",
        ]),
        ("6. Inspections", [
            "6.1 Buyer may have the Home inspected twice, at Buyer's expense: once after rough-in and before insulation and drywall (\"Pre-Drywall Inspection\") and once "
            "after the Notice of Completion and before the New Home Orientation (\"Final Inspection\").",
            "6.2 Each inspection must be performed by a home inspector who carries general liability insurance of at least $1,000,000 naming Seller as an additional "
            "insured, scheduled with Seller's Construction Manager at least five (5) business days in advance, during business hours, with Seller's representative present.",
            "6.3 Inspection reports are for Buyer's information. Seller will correct items that Seller determines, in its sole discretion, do not meet Seller's "
            "Construction Standards or the standards of the Limited Warranty. An inspection does not give Buyer a right to cancel this Agreement or to delay Closing.",
        ]),
        ("7. New Home Orientation", [
            "7.1 Seller will conduct a New Home Orientation with Buyer three (3) to seven (7) days before Closing and record any items needing completion or correction on a punch list.",
            "7.2 Seller will complete punch list items within sixty (60) days after Closing. Punch list items are not a condition of Closing, and no funds will be held back at Closing for them.",
        ]),
        ("8. Limited Warranty", [
            "8.1 Seller provides its Limited Warranty as described in the Placeholder Peak Homes Homeowner Warranty Guide, which Seller will deliver at Closing: "
            "one (1) year for workmanship and materials; two (2) years for plumbing, electrical and heating and cooling distribution systems; and ten (10) years for "
            "structural elements, through Sample Structural Warranty Company. Appliances and consumer products are covered only by their manufacturers' warranties.",
            "8.2 <span class='caps'>The Limited Warranty is given in lieu of all other warranties, express or implied, including any implied warranty of habitability, "
            "merchantability, fitness for a particular purpose, or good and workmanlike construction, all of which Buyer waives.</span>",
            "8.3 Warranty claims must be submitted in writing through Seller's online warranty portal.",
        ]),
        ("9. Dispute Resolution", [
            "9.1 Any claim or dispute arising out of or relating to this Agreement, the Home, the Lot, the Limited Warranty or the construction of the Home shall be resolved "
            "by binding arbitration before a single arbitrator administered by Example Arbitration Services under its construction rules, held in Example County, Utah.",
            "9.2 <span class='caps'>Buyer and Seller each waive the right to a trial by jury and the right to bring or participate in a class or representative action.</span>",
            "9.3 Each party pays its own attorney fees. The parties split the arbitration fees equally. Any demand for arbitration must be filed within one (1) year after "
            "Buyer knew or should have known of the claim. This Section 9 survives Closing.",
        ]),
        ("10. Homeowners Association", [
            "10.1 The Lot is subject to the Declaration of Covenants, Conditions and Restrictions for Make-Believe Meadows (the \"CC&amp;Rs\") and the Make-Believe Meadows "
            "Homeowners Association (the \"Association\"). The current Association assessment is $95 per month.",
            "10.2 At Closing, Buyer shall pay a Working Capital Contribution of $600 to the Association.",
            "10.3 Seller, as Declarant, controls the Association's board until the earlier of the date ninety percent (90%) of the lots have been conveyed to owners or "
            "December 31, 2032 (CC&amp;Rs Article 4).",
            "10.4 Buyer shall install rear yard landscaping within twelve (12) months after Closing, as required by the CC&amp;Rs. Buyer acknowledges receipt of the CC&amp;Rs.",
        ]),
        ("11. Special District", [
            "11.1 The Lot is located within the Make-Believe Meadows Public Infrastructure District No. 1 (the \"District\"), which may levy a property tax on the Lot. "
            "Buyer is responsible for all District taxes and fees after Closing. See the recorded plat.",
        ]),
        ("12. Title and Closing", [
            "12.1 Seller will convey the Lot and Home by special warranty deed and will pay for a standard owner's policy of title insurance.",
            "12.2 Closing will be held at Pretend Peak Title Agency, Seller's designated closing agent. Buyer pays for the lender's policy of title insurance, Buyer's share "
            "of the escrow fee, and all loan costs. Property taxes are prorated as of Closing based on the most recent tax notice.",
            "12.3 Wiring instructions will be provided only by Pretend Peak Title Agency. Seller and its sales staff will never send wiring instructions by email.",
        ]),
        ("13. Buyer's Broker", [
            "13.1 Seller will pay a cooperating broker who (a) accompanies Buyer on Buyer's first visit to Seller's sales center and (b) registers Buyer on Seller's Broker "
            "Registration Form at that first visit, a fee of two and one-half percent (2.5%) of the Base Price (excluding the Lot Premium and Options and Upgrades), paid at Closing.",
            "13.2 No fee is paid if Buyer first visited the sales center or a model without the broker, if the Broker Registration Form was not signed at the first visit, "
            "or if this Agreement is cancelled. The fee will not exceed the amount stated in Buyer's written agreement with the broker.",
        ]),
        ("14. Default", [
            "14.1 <b>Buyer default.</b> If Buyer defaults, Seller may cancel this Agreement and retain all Deposits as liquidated damages.",
            "14.2 <b>Seller default.</b> If Seller defaults, Buyer's sole remedy is to cancel this Agreement and receive a refund of all Deposits paid. "
            "Buyer waives specific performance and any claim for damages.",
        ]),
        ("15. Risk of Loss", [
            "Seller bears the risk of loss until Closing. If the Home is damaged before Closing, Seller may repair it and extend completion, or cancel this Agreement and refund all Deposits.",
        ]),
        ("16. General", [
            "16.1 Buyer may not assign or record this Agreement.",
            "16.2 \"Days\" means calendar days unless business days are stated. Notices must be in writing and may be sent by email to the addresses on the signature page.",
            "16.3 If an addendum conflicts with this Agreement, the addendum controls.",
            "16.4 <b>Entire Agreement.</b> This Agreement, with its exhibits and addenda, is the entire agreement between Buyer and Seller. No sales representative or agent "
            "has authority to make any promise or representation not contained in this Agreement, and Buyer is not relying on any oral statement.",
        ]),
    ]))
    b.append(sig_block("Buyer: ______________________ Date: ________", "Buyer: ______________________ Date: ________"))
    b.append(sig_block("Seller: Placeholder Peak Homes, LLC<br>By: ______________________ (Authorized Agent)", "Date Seller signs (Contract Date): ____________"))
    b.append("<div class='pb'></div><h2>Exhibit A: Lot</h2><p>Lot 47, Make-Believe Meadows Phase 2, according to the official plat recorded in the office of the Example County Recorder as Entry No. 900047-2026.</p>")
    b.append("<h2>Exhibit B: Options and Upgrades</h2><table class='t'><tr><th>Option</th><th>Price</th></tr>"
             "<tr><td>Gourmet kitchen package</td><td class='r'>$14,200</td></tr>"
             "<tr><td>Upgraded flooring, main level</td><td class='r'>$9,400</td></tr>"
             "<tr><td>9-foot basement foundation walls</td><td class='r'>$6,800</td></tr>"
             "<tr><td>Covered rear patio</td><td class='r'>$5,950</td></tr>"
             "<tr><td>Window blinds package</td><td class='r'>$2,900</td></tr>"
             "<tr><td>Tankless water heater</td><td class='r'>$2,100</td></tr>"
             "<tr><td><b>Total Options and Upgrades</b></td><td class='r'><b>$41,350</b></td></tr>"
             "<tr><td>Option Deposit due at Design Studio Selection Appointment (25%)</td><td class='r'>$10,337.50</td></tr></table>"
             "<p>Design studio selections made at the appointment are added by change order and priced at that time.</p>")
    b.append("<p class='footer'>PLACEHOLDER PEAK HOMES FORM PPH-PA REV. 08/2026 (MADE-UP FORM)</p>")
    return "".join(b)


def practice_incentive():
    b = ["<h1>PREFERRED LENDER INCENTIVE ADDENDUM</h1>",
         "<p class='sub'>to the New Home Purchase Agreement for Lot 47, Make-Believe Meadows Phase 2 (the \"Agreement\")</p>",
         "<p class='note'>Made-up addendum for practice. Not a real builder, lender or title company.</p>",
         f"<p>Seller: {f('Placeholder Peak Homes, LLC')} &nbsp; Buyer: {f('Casey Practiceton and Morgan Practiceton')}</p>"]
    b.append(sections([
        ("1. Incentive", [
            "Seller will contribute up to $17,500 at Closing (the \"Incentive\") toward Buyer's closing costs, prepaid items, and/or the cost of a permanent or temporary "
            "interest rate buydown, if every condition in Section 2 is met.",
        ]),
        ("2. Conditions", [
            "(a) Buyer obtains the mortgage loan for this purchase from Sample Summit Home Loans, LLC (\"Preferred Lender\").",
            "(b) Buyer submits a complete loan application to Preferred Lender within five (5) calendar days after the Contract Date.",
            "(c) Buyer does not change lenders after applying with Preferred Lender.",
            "(d) Closing occurs within ten (10) calendar days after Seller's Notice of Completion, as the Agreement requires.",
            "(e) Escrow and closing are handled by Pretend Peak Title Agency.",
        ]),
        ("3. If a Condition Is Not Met", [
            "If Buyer uses a lender other than Preferred Lender, or any condition in Section 2 is not met, the Incentive is $0, and the Purchase Price and all other terms of the Agreement are unchanged.",
        ]),
        ("4. Loan Program Limits", [
            "The amount of the Incentive that may be applied is limited by the requirements of Buyer's loan program. Any portion that cannot be applied is forfeited and will not be "
            "paid to Buyer in cash, credited to the Purchase Price, or applied to options or upgrades.",
        ]),
        ("5. Relationships", [
            "Preferred Lender and Pretend Peak Title Agency are affiliates of Seller. See the Affiliated Business Arrangement Disclosure Statement provided by Seller. "
            "Buyer is not required to use Preferred Lender or Pretend Peak Title Agency to purchase the Home.",
        ]),
        ("6. Offer Period", [
            "This Incentive is available only for Agreements signed by Buyer on or before November 13, 2026.",
        ]),
        ("7. Conflicts", [
            "If this Addendum conflicts with the Agreement, this Addendum controls. All other terms of the Agreement remain the same.",
        ]),
    ]))
    b.append(sig_block("Buyer: ______________________ Date: ________", "Buyer: ______________________ Date: ________"))
    b.append(sig_block("Seller: Placeholder Peak Homes, LLC<br>By: ______________________", "Date: ____________"))
    b.append("<p class='footer'>PLACEHOLDER PEAK HOMES FORM PPH-PLI 09/2026 (MADE-UP FORM)</p>")
    return "".join(b)


def practice_plat():
    b = ["<div class='plat'><h1>FINAL PLAT: MAKE-BELIEVE MEADOWS PHASE 2</h1>",
         "<p class='sub'>Located in the City of Sampleton, Example County, Utah &nbsp;|&nbsp; Sheet 1 of 3 (General Notes, excerpt)</p>",
         "<p class='note'>Made-up plat excerpt for practice. Not a real subdivision, district or recording.</p>",
         "<div class='box'><p>Recorded in the office of the Example County Recorder on March 18, 2026 as Entry No. 900047-2026.</p>"
         "<p>Owner and developer: Placeholder Peak Homes, LLC. Surveyor: Imaginary Line Surveying.</p></div>",
         "<h2>General Notes</h2>"]
    notes = [
        "Public utility easements (PUE): 10 feet along all front lot lines and 7 feet along all side and rear lot lines, unless shown otherwise.",
        "Lots 44 through 49 back onto the Example Irrigation Company canal. A 20-foot canal maintenance easement runs along the rear of these lots. No fence, structure or landscaping that blocks access to the canal is allowed within the easement.",
        "Geotechnical: A geotechnical report by Imaginary Soils Engineering dated January 9, 2026 is on file with the City of Sampleton. Lots 45 through 49 contain collapsible soils and require foundations designed according to that report.",
        "Public Infrastructure District: All lots in this plat are within the boundaries of the Make-Believe Meadows Public Infrastructure District No. 1. The District may levy a property tax to finance and repay public infrastructure, at a rate not to exceed 0.015 per dollar of taxable value. A notice of the District's boundaries and maximum rate was recorded on February 2, 2026 as Entry No. 900012-2026.",
        "Culinary water and pressurized irrigation (secondary water) are provided by the City of Sampleton. Each lot's secondary water connection is metered.",
        "Drainage: Lots 46 through 48 have a 5-foot drainage swale along the east side lot line. Owners must keep the swale clear and may not regrade it.",
        "All lots are subject to the Declaration of Covenants, Conditions and Restrictions for Make-Believe Meadows, recorded as Entry No. 900013-2026, and to the Make-Believe Meadows Homeowners Association.",
        "Lot areas: Lot 45, 0.17 acres; Lot 46, 0.18 acres; Lot 47, 0.18 acres; Lot 48, 0.19 acres; Lot 49, 0.21 acres.",
    ]
    b.append("".join(f"<p class='ind'>{i}. {n}</p>" for i, n in enumerate(notes, 1)))
    b.append("<h2>City Approval</h2><p>Approved by the City of Sampleton Planning Commission on December 10, 2025 and accepted by the City Council on January 13, 2026.</p>")
    b.append("<p class='footer'>EXCERPT PREPARED FOR PRACTICE (MADE-UP)</p></div>")
    return "".join(b)


write("practice/01 New Home Purchase Agreement - Lot 47 Make-Believe Meadows.pdf", P_STAMP, practice_pa(), "Buyer's Initials ____ ____ | Placeholder Peak Homes, LLC")
write("practice/02 Preferred Lender Incentive Addendum - Lot 47.pdf", P_STAMP, practice_incentive(), "Buyer's Initials ____ ____ | Placeholder Peak Homes, LLC")
write("practice/03 Final Plat Notes - Make-Believe Meadows Phase 2.pdf", P_STAMP, practice_plat(), "Example County Recorder Entry No. 900047-2026 (made-up)")

# =============================================================================================
# EVAL 1: Lot 112, Pretend Pines, Utah. Nonrefundable deposits, binding arbitration, no outside date.
# Notreal Ridge Builders, Inc.
# =============================================================================================

E1 = "evals/files/case-1-nonrefundable-deposits-arbitration"


def e1_reservation():
    b = ["<h1>LOT RESERVATION AGREEMENT</h1>",
         "<p class='sub'>NOTREAL RIDGE BUILDERS, INC. &nbsp;|&nbsp; Pretend Pines &nbsp;|&nbsp; Example County, Utah</p>",
         "<p class='note'>Made-up form for testing. Not a real builder or community.</p>"]
    b.append(sections([
        ("Reservation", [
            f"Notreal Ridge Builders, Inc. (\"Builder\") reserves {f('Lot 112, Pretend Pines')} for {f('Avery Testcase')} (\"Buyer\"). Buyer paid a reservation fee of $2,500 on October 30, 2026.",
            "The reservation fee is non-refundable. If Buyer signs Builder's Purchase and Sale Agreement for Lot 112, the reservation fee is credited toward the Earnest Money.",
            f"This reservation expires at {f('12:00 PM Mountain Time on November 10, 2026')}. Builder may release the lot to other buyers if Buyer has not signed the Purchase and Sale Agreement and paid the amounts due at signing by then.",
        ]),
    ]))
    b.append(sig_block("Buyer: <i>Avery Testcase</i> &nbsp; 10/30/2026", "Builder: <i>Pat Fakesales</i>, Sales Consultant &nbsp; 10/30/2026"))
    b.append("<p class='footer'>NOTREAL RIDGE BUILDERS FORM LR-1 (MADE-UP FORM)</p>")
    return "".join(b)


def e1_psa():
    b = ["<h1>PURCHASE AND SALE AGREEMENT</h1>",
         "<p class='sub'>NOTREAL RIDGE BUILDERS, INC. &nbsp;|&nbsp; Pretend Pines &nbsp;|&nbsp; Example County, Utah</p>",
         "<p class='note'>Made-up builder form for testing. Not a real builder, contract or community.</p>"]
    b.append("<div class='box'>"
             f"<p><b>Seller:</b> {f('Notreal Ridge Builders, Inc.')} &nbsp; <b>Buyer:</b> {f('Avery Testcase')}</p>"
             f"<p><b>Property:</b> {f('Lot 112, Pretend Pines')}, Example County, Utah, with a home of the {f('Aspenmock')} plan to be built on it.</p>"
             f"<p><b>Contract Date:</b> the date both parties have signed: {f('__________')}</p></div>")
    b.append(sections([
        ("1. Price", [
            "<table class='t'><tr><th>Item</th><th>Amount</th></tr>"
            "<tr><td>Base Price (Aspenmock plan)</td><td class='r'>$599,000</td></tr>"
            "<tr><td>Lot Premium</td><td class='r'>$12,500</td></tr>"
            "<tr><td>Structural Options (Exhibit 1)</td><td class='r'>$22,400</td></tr>"
            "<tr><td><b>Purchase Price</b></td><td class='r'><b>$633,900</b></td></tr></table>",
            "Design Center selections are not included in the Purchase Price. They are added by change order after the Design Center appointment.",
            "1.2 <b>Cost Adjustment.</b> If Closing occurs more than two hundred seventy (270) days after the Contract Date for any reason other than Buyer's delay, Seller may "
            "increase the Base Price by up to four percent (4%) to reflect documented increases in the cost of materials and labor, by written notice to Buyer.",
        ]),
        ("2. Deposits", [
            "The deposits, their due dates and when they become non-refundable are set out in the Deposit Schedule and Design Center Addendum. "
            "All deposits are paid to Seller and may be used by Seller in the construction of the Home.",
        ]),
        ("3. Construction and Completion", [
            "3.1 Seller anticipates completing the Home nine (9) to twelve (12) months after the building permit is issued. Completion dates are estimates only.",
            "3.2 Seller may extend completion for Force Majeure, including weather, labor or material shortages, governmental action, utility delays and any other cause beyond "
            "Seller's control, without limit. <span class='caps'>Seller shall have no liability to Buyer for any delay.</span>",
            "3.3 Seller may cancel this Agreement before construction starts if Seller cannot obtain a building permit on terms acceptable to Seller, and will then refund deposits paid, without interest.",
            "3.4 Closing shall occur within seven (7) days after Seller notifies Buyer that a certificate of occupancy has been issued.",
        ]),
        ("4. Inspections", [
            "4.1 <span class='caps'>Buyer may not conduct or permit inspections of the Home during construction.</span> Buyer may attend one Seller-led \"Frame Walk\" when Seller schedules it.",
            "4.2 After Seller's notice that a certificate of occupancy has been issued and before the Orientation, Buyer may have one inspection by a third-party inspector at Buyer's cost.",
            "4.3 Seller will address items that do not meet Seller's Construction Standards, which control over any inspector's opinion. Inspection results do not allow Buyer to cancel or delay Closing.",
        ]),
        ("5. Orientation and Punch List", [
            "Seller will hold an Orientation before Closing. Seller will complete punch list items within ninety (90) days after Closing.",
        ]),
        ("6. Financing and Appraisal", [
            "6.1 <span class='caps'>This Agreement is not contingent on financing.</span> Buyer represents that Buyer has the means to close. Buyer shall apply for any loan within seven (7) days after the Contract Date and keep Seller informed of its status.",
            "6.2 <span class='caps'>This Agreement is not contingent on an appraisal.</span>",
        ]),
        ("7. Warranty", [
            "7.1 Seller provides its One-Year Limited Warranty, and ten (10) years of structural coverage through Example Structural Guarantee Co., as described in Seller's Warranty Booklet.",
            "7.2 <span class='caps'>The Limited Warranty is in lieu of all other warranties. Buyer waives all implied warranties, including the implied warranties of habitability and workmanlike construction.</span>",
            "7.3 <b>Time to Bring Claims.</b> Any claim against Seller of any kind, including a warranty claim, must be brought within one (1) year after Closing, regardless of when it is discovered.",
        ]),
        ("8. Disputes", [
            "8.1 Any dispute arising out of this Agreement, the Property or the Home shall be decided by binding arbitration before a single arbitrator selected by Seller from the panel of "
            "Example Arbitration Services. The arbitration will be held in Example County, Utah. Buyer pays the filing fee.",
            "8.2 <span class='caps'>Buyer waives the right to a jury trial and to participate in any class action.</span>",
        ]),
        ("9. Homeowners Association", [
            "The Property is subject to the CC&amp;Rs of the Pretend Pines Owners Association. Current dues are $140 per month. At Closing, Buyer pays a reinvestment fee of one-half of one percent (0.5%) of the Purchase Price to the Association.",
        ]),
        ("10. Buyer's Broker", [
            "Seller pays a cooperating broker two percent (2%) of the Base Price at Closing if the broker registered Buyer with Seller before or at Buyer's first visit to the community. No fee is paid on a cancelled sale.",
        ]),
        ("11. Default", [
            "11.1 If Buyer defaults, Seller may cancel and retain all deposits, Structural Option payments and Design Center payments as liquidated damages.",
            "11.2 If Seller defaults, Buyer's sole remedy is the return of deposits paid, without interest.",
        ]),
        ("12. General", [
            "12.1 This Agreement, the Deposit Schedule and Design Center Addendum, and Exhibit 1 are the entire agreement. <span class='caps'>No statement by Seller's sales associates "
            "is binding on Seller unless it is written into this Agreement or an addendum signed by Seller's officer.</span>",
            "12.2 Buyer may not assign this Agreement. Days are calendar days.",
        ]),
    ]))
    b.append(sig_block("Buyer: ______________________ Date: ________", "Seller: Notreal Ridge Builders, Inc. By: __________ Date: ________"))
    b.append("<h2>Exhibit 1: Structural Options</h2><table class='t'><tr><th>Option</th><th>Price</th></tr>"
             "<tr><td>Three-car garage</td><td class='r'>$11,900</td></tr>"
             "<tr><td>Walkout basement</td><td class='r'>$7,600</td></tr>"
             "<tr><td>Extended covered deck</td><td class='r'>$2,900</td></tr>"
             "<tr><td><b>Total Structural Options</b></td><td class='r'><b>$22,400</b></td></tr></table>")
    b.append("<p class='footer'>NOTREAL RIDGE BUILDERS FORM PSA-UT 2026 (MADE-UP FORM)</p>")
    return "".join(b)


def e1_deposits():
    b = ["<h1>DEPOSIT SCHEDULE AND DESIGN CENTER ADDENDUM</h1>",
         "<p class='sub'>to the Purchase and Sale Agreement for Lot 112, Pretend Pines</p>",
         "<p class='note'>Made-up addendum for testing.</p>"]
    b.append("<table class='t'><tr><th>Payment</th><th>Amount</th><th>When due</th><th>Refundable?</th></tr>"
             "<tr><td>Earnest Money</td><td class='r'>$25,000 (the $2,500 reservation fee already paid is credited, so $22,500 is due at signing)</td><td>At signing</td><td>Non-refundable upon Seller's acceptance, except Seller default</td></tr>"
             "<tr><td>Structural Options payment</td><td class='r'>$22,400 (100% of Exhibit 1)</td><td>At signing</td><td>Non-refundable when paid</td></tr>"
             "<tr><td>Second Deposit</td><td class='r'>$15,000</td><td>Within five (5) days after Seller's notice that the frame inspection has passed</td><td>Non-refundable when paid</td></tr>"
             "<tr><td>Design Center payment</td><td class='r'>50% of the Design Center selections total</td><td>At the Design Center appointment, within thirty (30) days after the Contract Date</td><td>Non-refundable when paid</td></tr>"
             "</table>")
    b.append("<p>All deposits and payments are made to Seller, are credited to the Purchase Price at Closing, and may be used by Seller for construction of the Home. "
             "Design Center selections are final when the Design Center appointment ends. Changes after that are at Seller's discretion, with a $500 fee per change.</p>")
    b.append("<p>If this Addendum conflicts with the Purchase and Sale Agreement, this Addendum controls.</p>")
    b.append(sig_block("Buyer: ______________________ Date: ________", "Seller: Notreal Ridge Builders, Inc. By: __________"))
    b.append("<p class='footer'>NOTREAL RIDGE BUILDERS FORM DS-2 (MADE-UP FORM)</p>")
    return "".join(b)


write(f"{E1}/Lot Reservation Agreement - Lot 112 Pretend Pines.pdf", E_STAMP, e1_reservation(), "Notreal Ridge Builders, Inc.")
write(f"{E1}/Purchase and Sale Agreement - Lot 112 Pretend Pines.pdf", E_STAMP, e1_psa(), "Buyer's Initials ____ | Notreal Ridge Builders, Inc.")
write(f"{E1}/Deposit Schedule and Design Center Addendum - Lot 112.pdf", E_STAMP, e1_deposits(), "Buyer's Initials ____ | Notreal Ridge Builders, Inc.")

# =============================================================================================
# EVAL 2: 2214 S Imaginary Aspen Ln, Utah. Quick move-in, incentive tied to the builder's lender
# and title company, Affiliated Business Arrangement Disclosure (unsigned).
# Sample Crest Homes, LLC; Sample Crest Mortgage, LLC; Make-Believe Title Insurance Agency, LLC
# =============================================================================================

E2 = "evals/files/case-2-lender-tied-incentive"


def e2_pa():
    b = ["<h1>HOME PURCHASE AGREEMENT (COMPLETED HOME)</h1>",
         "<p class='sub'>SAMPLE CREST HOMES, LLC &nbsp;|&nbsp; Imaginary Aspen Village &nbsp;|&nbsp; Fictional Fork, Utah</p>",
         "<p class='note'>Made-up builder form for testing. Not a real builder, lender or title company.</p>"]
    b.append("<div class='box'>"
             f"<p><b>Seller:</b> {f('Sample Crest Homes, LLC')} &nbsp; <b>Buyer:</b> {f('Jordan Evalson and Riley Evalson')}</p>"
             f"<p><b>Property:</b> {f('2214 S Imaginary Aspen Ln, Fictional Fork, UT 84000')} (Lot 18, Imaginary Aspen Village), a completed home. Certificate of occupancy issued {f('October 22, 2026')}.</p>"
             f"<p><b>Contract Date:</b> the date Seller signs: {f('__________')}</p></div>")
    b.append(sections([
        ("1. Purchase Price", ["The Purchase Price is $489,900, including all improvements and the options installed in the Home as listed on Exhibit A."]),
        ("2. Earnest Money", [
            "2.1 Buyer shall deliver Earnest Money of $5,000 to Make-Believe Title Insurance Agency, LLC within two (2) days after the Contract Date, to be held in escrow.",
            "2.2 The Earnest Money is refundable to Buyer only (a) on cancellation during the Review Period under Section 4, (b) on loan denial under Section 5.3, (c) on cancellation for a low appraisal under Section 5.4, or (d) on Seller default. Otherwise it is non-refundable.",
        ]),
        ("3. Closing", ["Closing shall occur on or before December 18, 2026 at the offices of Make-Believe Title Insurance Agency, LLC."]),
        ("4. Review Period and Inspection", [
            "4.1 Buyer has five (5) calendar days after the Contract Date (the \"Review Period\") to inspect the Home with an inspector of Buyer's choice and review the HOA documents.",
            "4.2 Buyer may cancel for any reason by written notice before the Review Period ends and receive the Earnest Money back. Seller will consider repair requests but is not required to make any repairs.",
        ]),
        ("5. Financing and Appraisal", [
            "5.1 Buyer shall apply for a mortgage loan within three (3) calendar days after the Contract Date.",
            "5.2 Buyer shall deliver written loan approval by December 4, 2026 (the \"Loan Approval Date\").",
            "5.3 If Buyer's loan is denied in writing on or before the Loan Approval Date, Buyer may cancel and receive the Earnest Money back.",
            "5.4 If the appraised value is less than the Purchase Price, Buyer may cancel by written notice on or before the Loan Approval Date and receive the Earnest Money back, "
            "unless Seller agrees in writing within three (3) days after Buyer's notice to reduce the Purchase Price to the appraised value.",
            "5.5 Seller's incentives, if any, are described in the Flex Incentive Addendum.",
        ]),
        ("6. Walk-Through", ["Buyer may do a final walk-through within three (3) days before Closing. Seller will complete agreed items within thirty (30) days after Closing."]),
        ("7. Warranty", [
            "Seller provides a limited warranty (one year workmanship, two years systems, ten years structural) as described in the Homeowner Warranty Guide attached as Exhibit C. "
            "The limited warranty is in lieu of all implied warranties.",
        ]),
        ("8. Disputes", [
            "Any dispute shall first be submitted to mediation. If mediation does not resolve it within sixty (60) days, it shall be decided by binding arbitration in Example County, Utah. Each party pays its own attorney fees.",
        ]),
        ("9. Title Insurance and Escrow", [
            "9.1 Make-Believe Title Insurance Agency, LLC, an affiliate of Seller, will provide escrow and closing services and will issue the owner's and lender's policies of title insurance.",
            "9.2 Seller pays for the standard owner's policy. Buyer pays for the lender's policy, any endorsements, and Buyer's share of the escrow fee.",
        ]),
        ("10. HOA", ["The Home is subject to the Imaginary Aspen Village HOA. Dues are $78 per month. Buyer pays a $350 transfer and setup fee at Closing."]),
        ("11. Buyer's Broker", ["Seller pays a cooperating broker who registered Buyer at Buyer's first visit 2% of the Purchase Price at Closing, not to exceed the amount in Buyer's written agreement with the broker."]),
        ("12. Default", [
            "If Buyer defaults, Seller keeps the Earnest Money as liquidated damages. If Seller defaults, Buyer may cancel and receive the Earnest Money back or seek specific performance.",
        ]),
        ("13. Entire Agreement", ["This Agreement and its addenda and exhibits are the entire agreement. If an addendum conflicts with this Agreement, the addendum controls."]),
    ]))
    b.append(sig_block("Buyer: ______________________ Date: ________", "Buyer: ______________________ Date: ________"))
    b.append(sig_block("Seller: Sample Crest Homes, LLC By: __________", "Date Seller signs (Contract Date): ________"))
    b.append("<h2>Exhibit A: Installed Options</h2><p>Quartz kitchen counters; luxury vinyl plank main level; 2-car garage with 8-foot doors; covered patio; refrigerator, range, dishwasher and microwave.</p>")
    b.append("<p>Exhibit C (Homeowner Warranty Guide) is provided separately.</p>")
    b.append("<p class='footer'>SAMPLE CREST HOMES FORM SCH-QMI 2026 (MADE-UP FORM)</p>")
    return "".join(b)


def e2_incentive():
    b = ["<h1>FLEX INCENTIVE ADDENDUM</h1>",
         "<p class='sub'>to the Home Purchase Agreement for 2214 S Imaginary Aspen Ln, Fictional Fork, UT 84000</p>",
         "<p class='note'>Made-up addendum for testing.</p>"]
    b.append(sections([
        ("1. Flex Incentive", [
            "Seller will contribute $20,000 at Closing (the \"Flex Incentive\") toward Buyer's closing costs, prepaid items, and/or a permanent or temporary interest rate buydown if all of these conditions are met:",
            "(a) Buyer finances the purchase with Sample Crest Mortgage, LLC;",
            "(b) Buyer applies with Sample Crest Mortgage, LLC within three (3) calendar days after the Contract Date;",
            "(c) Closing occurs on or before December 18, 2026; and",
            "(d) Buyer uses Make-Believe Title Insurance Agency, LLC for title and escrow.",
        ]),
        ("2. Standard Incentive", [
            "If Buyer finances with any other lender, or pays cash, Seller will instead contribute $5,000 toward Buyer's closing costs (the \"Standard Incentive\") if Closing occurs on or before December 18, 2026.",
        ]),
        ("3. Limits", [
            "3.1 Any part of an incentive that Buyer's loan program does not allow is forfeited. No incentive is paid in cash or applied to the Purchase Price.",
            "3.2 If Closing is delayed past December 18, 2026 for any reason other than Seller's delay, the Flex Incentive and the Standard Incentive are both void.",
        ]),
        ("4. Choice of Lender", ["Buyer is not required to use Sample Crest Mortgage, LLC to purchase the Home."]),
        ("5. Conflicts", ["If this Addendum conflicts with the Home Purchase Agreement, this Addendum controls."]),
    ]))
    b.append(sig_block("Buyer: ______________________ Date: ________", "Seller: Sample Crest Homes, LLC By: __________"))
    b.append("<p class='footer'>SAMPLE CREST HOMES FORM SCH-FLEX 10/2026 (MADE-UP FORM)</p>")
    return "".join(b)


def e2_afba():
    b = ["<h1>AFFILIATED BUSINESS ARRANGEMENT DISCLOSURE STATEMENT</h1>",
         "<p class='note'>Made-up disclosure for testing. Not a real builder, lender or title company.</p>"]
    b.append(f"<p>To: {f('Jordan Evalson and Riley Evalson')} &nbsp; From: {f('Sample Crest Homes, LLC')}</p>"
             f"<p>Property: {f('2214 S Imaginary Aspen Ln, Fictional Fork, UT 84000')} &nbsp; Date: {f('November 2, 2026')}</p>")
    b.append("<p>This is to give you notice that Sample Crest Homes, LLC has a business relationship with Sample Crest Mortgage, LLC and Make-Believe Title Insurance Agency, LLC. "
             "Sample Crest Homes, LLC owns 100% of Sample Crest Mortgage, LLC and 51% of Make-Believe Title Insurance Agency, LLC. Because of this relationship, this referral "
             "may provide Sample Crest Homes, LLC a financial or other benefit.</p>")
    b.append("<p>Set forth below is the estimated charge or range of charges for the settlement services listed. You are NOT required to use the listed provider(s) as a condition "
             "for purchase of the subject property. THERE ARE FREQUENTLY OTHER SETTLEMENT SERVICE PROVIDERS AVAILABLE WITH SIMILAR SERVICES. YOU ARE FREE TO SHOP AROUND TO "
             "DETERMINE THAT YOU ARE RECEIVING THE BEST SERVICES AND THE BEST RATE FOR THESE SERVICES.</p>")
    b.append("<table class='t'><tr><th>Provider and settlement service</th><th>Charge or range of charges</th></tr>"
             "<tr><td>Sample Crest Mortgage, LLC: loan origination charge</td><td>0% to 1% of the loan amount</td></tr>"
             "<tr><td>Sample Crest Mortgage, LLC: appraisal</td><td>$650 to $800</td></tr>"
             "<tr><td>Sample Crest Mortgage, LLC: credit report</td><td>$65</td></tr>"
             "<tr><td>Make-Believe Title Insurance Agency, LLC: lender's title policy</td><td>$900 to $1,400, depending on loan amount</td></tr>"
             "<tr><td>Make-Believe Title Insurance Agency, LLC: escrow fee, Buyer's share</td><td>$450 to $600</td></tr></table>")
    b.append("<h2>Acknowledgment</h2><p>I/we have read this disclosure form, and understand that Sample Crest Homes, LLC is referring me/us to purchase the above-described settlement "
             "service(s) and may receive a financial or other benefit as the result of this referral.</p>")
    b.append(sig_block("Signature: ______________________ Date: ________", "Signature: ______________________ Date: ________"))
    return "".join(b)


write(f"{E2}/Home Purchase Agreement - 2214 S Imaginary Aspen Ln.pdf", E_STAMP, e2_pa(), "Buyer's Initials ____ ____ | Sample Crest Homes, LLC")
write(f"{E2}/Flex Incentive Addendum - 2214 S Imaginary Aspen Ln.pdf", E_STAMP, e2_incentive(), "Buyer's Initials ____ ____ | Sample Crest Homes, LLC")
write(f"{E2}/Affiliated Business Arrangement Disclosure - Sample Crest.pdf", E_STAMP, e2_afba(), "Sample Crest Homes, LLC")

# =============================================================================================
# EVAL 3: Lot 9, Block 3, Imaginary Creek Filing 4, Colorado. General mode, metropolitan district.
# Fictional Front Range Homes, Inc.
# =============================================================================================

E3 = "evals/files/case-3-special-district-general-mode"


def e3_pa():
    b = ["<h1>NEW HOME PURCHASE CONTRACT</h1>",
         "<p class='sub'>FICTIONAL FRONT RANGE HOMES, INC. &nbsp;|&nbsp; Imaginary Creek Filing 4 &nbsp;|&nbsp; Example County, Colorado</p>",
         "<p class='note'>Made-up builder form for testing. Not a real builder, district or community.</p>"]
    b.append("<div class='box'>"
             f"<p><b>Seller:</b> {f('Fictional Front Range Homes, Inc.')} &nbsp; <b>Buyer:</b> {f('Sam Generalcase')}</p>"
             f"<p><b>Property:</b> {f('Lot 9, Block 3, Imaginary Creek Filing 4')}, Example County, Colorado, with a {f('Ridgemock')} plan home to be built.</p>"
             f"<p><b>Contract Date:</b> the date both parties sign: {f('__________')}</p></div>")
    b.append(sections([
        ("1. Price", [
            "<table class='t'><tr><th>Item</th><th>Amount</th></tr>"
            "<tr><td>Base Price</td><td class='r'>$574,000</td></tr>"
            "<tr><td>Lot Premium</td><td class='r'>$9,500</td></tr>"
            "<tr><td>Options (Exhibit B)</td><td class='r'>$15,000</td></tr>"
            "<tr><td><b>Purchase Price</b></td><td class='r'><b>$598,500</b></td></tr></table>",
        ]),
        ("2. Deposits", [
            "2.1 Earnest Money of $12,000 is due within three (3) days after the Contract Date and is held in escrow by Placeholder Title of Colorado.",
            "2.2 An Options Deposit of $15,000 (100% of Options) is due at signing, is paid to Seller, and is non-refundable except on Seller default.",
            "2.3 The Earnest Money is refundable on cancellation under Section 5 (inspection), Section 6 (financing or appraisal) or Seller default, and is otherwise non-refundable.",
        ]),
        ("3. Completion", [
            "Estimated completion is March 2027. Seller may extend for delays beyond its control, but Seller shall complete the Home within twenty-four (24) months after the Contract Date. "
            "If Seller does not, Buyer may cancel and receive all deposits back.",
        ]),
        ("4. Closing", ["Closing shall occur within fourteen (14) days after Seller's notice that a certificate of occupancy has been issued."]),
        ("5. Inspections", [
            "Buyer may hire a third-party inspector for a pre-drywall inspection and a final inspection, each with three (3) business days' notice to Seller. "
            "Within five (5) days after each inspection, Buyer may deliver a written list of items; Seller will correct items that do not meet the building code or Seller's specifications. "
            "Buyer may cancel and receive the Earnest Money back if Seller refuses to correct a building code item.",
        ]),
        ("6. Financing and Appraisal", [
            "6.1 Buyer shall apply for a loan within seven (7) days after the Contract Date. If Buyer gives written notice of loan denial by the Loan Objection Deadline, twenty-one (21) days after the Contract Date, Buyer may cancel and receive the Earnest Money back.",
            "6.2 If the appraised value is less than the Purchase Price, Buyer may cancel within five (5) days after receiving the appraisal and receive the Earnest Money back.",
        ]),
        ("7. Warranty", ["Seller provides a 1-2-10 limited warranty as described in the Warranty Guide (Exhibit C, provided separately)."]),
        ("8. Disputes", [
            "Disputes shall first go to mediation. Any dispute not resolved by mediation within forty-five (45) days shall be decided by binding arbitration in Example County, Colorado. "
            "The parties waive a jury trial.",
        ]),
        ("9. Homeowners Association", ["The Property is subject to the Imaginary Creek Community Association. Dues are $60 per month."]),
        ("10. Metropolitan District", [
            "The Property is located within Imaginary Creek Metropolitan District No. 2. See the Special District Public Disclosure, attached as Exhibit D. Buyer acknowledges receipt of Exhibit D.",
        ]),
        ("11. Buyer's Broker", ["Seller pays a cooperating broker 2.5% of the Base Price at Closing if the broker registered Buyer before Buyer's first visit."]),
        ("12. Default", [
            "If Buyer defaults, Seller keeps the Earnest Money and the Options Deposit as liquidated damages. If Seller defaults, Buyer may cancel and receive all deposits back, or seek specific performance.",
        ]),
        ("13. Entire Agreement", ["This Contract and its exhibits are the entire agreement. Oral statements are not binding."]),
    ]))
    b.append(sig_block("Buyer: ______________________ Date: ________", "Seller: Fictional Front Range Homes, Inc. By: __________"))
    b.append("<h2>Exhibit B: Options</h2><table class='t'><tr><th>Option</th><th>Price</th></tr>"
             "<tr><td>Finished basement rec room</td><td class='r'>$11,000</td></tr><tr><td>Air conditioning</td><td class='r'>$4,000</td></tr>"
             "<tr><td><b>Total</b></td><td class='r'><b>$15,000</b></td></tr></table>")
    b.append("<p class='footer'>FICTIONAL FRONT RANGE HOMES FORM NHPC-CO 2026 (MADE-UP FORM)</p>")
    return "".join(b)


def e3_district():
    b = ["<h1>SPECIAL DISTRICT PUBLIC DISCLOSURE</h1>",
         "<p class='sub'>Exhibit D &nbsp;|&nbsp; Imaginary Creek Metropolitan District No. 2</p>",
         "<p class='note'>Made-up disclosure for testing. Not a real district, county or bond issue.</p>"]
    b.append("<p>The property described below is located within Imaginary Creek Metropolitan District No. 2 (the \"District\"). The District may impose property taxes (a mill levy) "
             "and fees on property within its boundaries to pay for public improvements and services.</p>")
    b.append(f"<p>Property: {f('Lot 9, Block 3, Imaginary Creek Filing 4, Example County, Colorado')}</p>")
    b.append("<table class='t'><tr><th>Item</th><th>As stated by the District</th></tr>"
             "<tr><td>Maximum authorized mill levy, debt service</td><td>55.000 mills</td></tr>"
             "<tr><td>Maximum authorized mill levy, operations</td><td>10.000 mills</td></tr>"
             "<tr><td>2026 certified mill levy</td><td>50.000 mills debt service + 8.000 mills operations = 58.000 mills</td></tr>"
             "<tr><td>Total debt authorized by voters</td><td>$45,000,000</td></tr>"
             "<tr><td>Bonds outstanding</td><td>$28,400,000, final maturity December 1, 2056</td></tr>"
             "<tr><td>Facilities fee</td><td>$1,500 per lot, paid at the first sale of each lot to a homeowner</td></tr>"
             "<tr><td>District services fee</td><td>$45 per month (landscaping and covenant enforcement)</td></tr></table>")
    b.append("<p><b>Example:</b> A home with an assessed value of $40,000 would pay $2,320 per year in District property taxes at the 2026 certified mill levy "
             "(58.000 mills x $40,000 / 1,000). This example is for illustration only. Your assessed value and the District's mill levy may differ and may change each year. "
             "The District may raise its mill levy up to the maximums above.</p>")
    b.append("<p>District taxes appear on the county property tax bill and are in addition to taxes levied by the county, city, school district and other taxing entities. "
             "For current information, contact the District's manager, Example District Management, or the Example County Treasurer.</p>")
    b.append(sig_block("Buyer acknowledges receipt: ______________________ Date: ________", "Seller: Fictional Front Range Homes, Inc."))
    return "".join(b)


write(f"{E3}/New Home Purchase Contract - Lot 9 Imaginary Creek Filing 4.pdf", E_STAMP, e3_pa(), "Buyer's Initials ____ | Fictional Front Range Homes, Inc.")
write(f"{E3}/Exhibit D Special District Public Disclosure - Imaginary Creek Metro District 2.pdf", E_STAMP, e3_district(), "Fictional Front Range Homes, Inc.")

with open(os.path.join(HTML_DIR, "pdfs.json"), "w", encoding="utf-8") as fh:
    json.dump(PDFS, fh, indent=1)
print(f"wrote {len(PDFS)} HTML files to {HTML_DIR}")
