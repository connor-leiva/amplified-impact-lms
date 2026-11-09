"""Builds the made-up practice and eval files for counter-explainer.

Usage: python3 make_files.py SKILL_DIR HTML_DIR
Writes one HTML file per PDF into HTML_DIR, plus pdfs.json. Then run
  node html_to_pdf.cjs HTML_DIR SKILL_DIR
to print each one to PDF in practice/ or evals/files/.

Every person, brokerage, street, city, lender and title company here is made up. The two REPC
layouts follow the section numbering of Utah's state-approved REPC (the form effective December 4,
2024, and the revised form effective November 1, 2026) with shortened boilerplate, so the skill has
to read section numbers and the footer from the file. The Idaho agreement is an invented form.
"""
import json
import os
import sys

SKILL_DIR, HTML_DIR = sys.argv[1], sys.argv[2]
os.makedirs(HTML_DIR, exist_ok=True)
PDFS = []

CSS = (
    "body{font-family:Arial,Helvetica,sans-serif;font-size:9.6pt;line-height:1.38;margin:0;color:#111}"
    "h1{font-size:14pt;text-align:center;margin:0 0 2px;letter-spacing:.5px}"
    "h2{font-size:10.5pt;text-align:center;margin:10px 0 4px}"
    ".note{font-size:8.4pt;color:#444;text-align:center;margin:0 0 8px}"
    "p{margin:4px 0}.ind{margin-left:22px}.ind2{margin-left:44px}"
    ".f{font-family:'Courier New',monospace;font-weight:bold;border-bottom:1px solid #333;padding:0 3px}"
    ".sig{font-family:'Brush Script MT','Segoe Script',cursive;font-size:13pt;border-bottom:1px solid #333;padding:0 6px}"
    "table.sig{width:100%;margin:8px 0;border-collapse:collapse}table.sig td{padding:4px 6px;font-size:8.6pt;vertical-align:bottom}"
    ".box{border:1px solid #333;padding:6px 8px;margin:8px 0}"
    ".footer{font-size:7.8pt;text-align:center;margin-top:14px;font-weight:bold}"
    ".pb{page-break-before:always}"
)


def f(v):
    return f"<span class='f'>{v}</span>"


def cb(on):
    return "[X]" if on else "[ ]"


def sig(name, date, time=None):
    t = f" {time}" if time else ""
    return f"<span class='sig'>{name}</span> <span class='f'>{date}{t}</span>"


def write(rel, stamp, body, footer_note):
    html = (
        f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{body}</body></html>"
    )
    name = rel.replace("/", "__").replace(".pdf", ".html")
    with open(os.path.join(HTML_DIR, name), "w", encoding="utf-8") as fh:
        fh.write(html)
    PDFS.append({"html": name, "pdf": rel, "stamp": stamp, "footer": footer_note})


# ---------------------------------------------------------------------------------------------
# Utah REPC, December 4, 2024 layout
# ---------------------------------------------------------------------------------------------

def repc_2024(d):
    b = []
    b.append("<h1>REAL ESTATE PURCHASE CONTRACT</h1>")
    b.append("<p class='note'>Made-up file in the layout of the Utah REPC (form effective December 4, 2024), with shortened printed text. Not the state form.</p>")
    b.append("<h2>EARNEST MONEY DEPOSIT</h2>")
    b.append(
        f"<p>On this {f(d['ord'])} (\"Offer Reference Date\") {f(d['buyer'])} (\"Buyer\") offers to purchase from "
        f"{f(d['seller'])} (\"Seller\") the Property described below and agrees to deliver no later than four (4) calendar days "
        f"after Acceptance (as defined in Section 23), an Earnest Money Deposit in the amount of {f(d['emd'])} in the form of "
        f"{f(d['emd_form'])}. After Acceptance of the REPC by Buyer and Seller, and receipt of the Earnest Money by the Brokerage, "
        "the Brokerage shall have four (4) calendar days in which to deposit the Earnest Money into the Brokerage Real Estate Trust Account.</p>"
    )
    b.append("<h2>OFFER TO PURCHASE</h2>")
    b.append(
        f"<p><b>1. PROPERTY:</b> {f(d['street'])} City of {f(d['city'])}, County of {f(d['county'])}, State of Utah, "
        f"Zip {f(d['zip'])} Tax ID No. {f(d['taxid'])} (the \"Property\").</p>"
    )
    b.append("<p class='ind'><b>1.1 Included Items.</b> Unless excluded herein, this sale includes the fixtures and equipment listed on the printed form (plumbing, heating and air conditioning fixtures, water heaters, light fixtures, window coverings, garage door openers, fencing, landscaping and the other items the form names), if presently owned and in place on the Property.</p>")
    oi = d["other_included"]
    b.append(
        f"<p class='ind'><b>1.2 Other Included Items.</b> {cb('washers' in oi)} washers {cb('dryers' in oi)} dryers "
        f"{cb('refrigerators' in oi)} refrigerators {cb('microwave ovens' in oi)} microwave ovens {cb(False)} other (specify) ______. "
        "The above checked items shall be conveyed to Buyer under separate bill of sale with warranties as to title.</p>"
    )
    b.append(f"<p class='ind'><b>1.3 Excluded Items.</b> The following items are excluded from this sale: {f(d['excluded'])}</p>")
    b.append(f"<p class='ind'><b>1.4 Water Service.</b> The Purchase Price includes all water rights/water shares, if any, that are the legal source for Seller's current culinary and irrigation water service. Excluded water rights/water shares: {f('None')}</p>")
    b.append("<p><b>2. PURCHASE PRICE.</b></p>")
    b.append(
        f"<p class='ind'><b>2.1 Payment of Purchase Price.</b> The Purchase Price for the Property is {f(d['price'])}. Except as provided in this Section, "
        "the Purchase Price shall be paid as provided in Sections 2.1(a) through 2.1(e) below. Any amounts shown in Sections 2.1(c) and 2.1(e) "
        "may be adjusted as deemed necessary by Buyer and the Lender (the \"Lender\").</p>"
    )
    for k, label in [("a", "(a) Earnest Money Deposit. Under certain conditions described in the REPC, this deposit may become totally non-refundable."),
                     ("b", "(b) Additional Earnest Money Deposit (see Section 8.4 if applicable)"),
                     ("c", "(c) New Loan. Buyer may apply for mortgage loan financing (the \"Loan\") on terms acceptable to Buyer. If an FHA/VA loan applies, see attached FHA/VA Loan Addendum."),
                     ("d", "(d) Seller Financing (see attached Seller Financing Addendum)"),
                     ("e", "(e) Balance of Purchase Price in Cash at Settlement")]:
        b.append(f"<p class='ind2'>{f(d['lines'][k])} {label}</p>")
    b.append(f"<p class='ind2'>{f(d['price'])} PURCHASE PRICE. Total of lines (a) through (e)</p>")
    b.append(f"<p class='ind'><b>2.2 Sale of Buyer's Property.</b> Buyer's ability to purchase the Property {cb(False)} IS {cb(True)} IS NOT conditioned upon the sale of real estate owned by Buyer.</p>")
    b.append("<p><b>3. SETTLEMENT AND CLOSING.</b></p>")
    b.append("<p class='ind'><b>3.1 Settlement.</b> Settlement shall take place no later than the Settlement Deadline referenced in Section 24(d), or as otherwise mutually agreed by Buyer and Seller in writing.</p>")
    b.append("<p class='ind'><b>3.2 Closing.</b> Closing means Settlement has been completed, the proceeds of any new Loan have been delivered, and the Closing documents have been recorded (\"Recording\"), no later than four calendar days after Settlement.</p>")
    p = d["possession"]
    b.append(f"<p class='ind'><b>3.3 Possession.</b> Seller shall deliver physical possession of the Property to Buyer as follows: {cb(p == 'recording')} Upon Recording; {cb(False)} ____ Hours after Recording; {cb(False)} ____ Calendar Days after Recording. Any contracted rental of the Property prior to or after Closing, between Buyer and Seller, shall be by separate written agreement.</p>")
    b.append("<p><b>4. PRORATIONS / ASSESSMENTS / OTHER PAYMENT OBLIGATIONS.</b></p>")
    b.append("<p class='ind'><b>4.1 Prorations.</b> All prorations, including HOA dues, property taxes for the current year, rents, and interest on assumed obligations, shall be made as of the Settlement Deadline referenced in Section 24(d), unless otherwise agreed to in writing by the parties.</p>")
    sa = d["special_assessments"]
    b.append(f"<p class='ind'><b>4.2 Special Assessments.</b> Assessments for capital improvements approved prior to the Settlement Deadline shall be paid for by: {cb(sa == 'Seller')} Seller {cb(sa == 'Buyer')} Buyer {cb(sa == 'Split')} Split Equally Between Buyer and Seller {cb(False)} Other.</p>")
    co = d["change_fee"]
    b.append("<p class='ind'><b>4.3 Fees/Costs/Payment Obligations.</b> (a) Each party pays its own escrow fees unless agreed otherwise in writing. (b) Rental deposits and prepaid rents are credited to Buyer at Settlement.</p>")
    b.append(f"<p class='ind'>(c) Change of ownership fees (transfer fees, HOA reinvestment fees and similar) shall, at Settlement, be paid for by: {cb(co == 'Seller')} Seller {cb(co == 'Buyer')} Buyer {cb(co == 'Split')} Split Equally Between Buyer and Seller {cb(False)} Other. (d) Buyer is responsible for utilities after the Settlement Deadline.</p>")
    b.append(f"<p class='ind'>(e) Real Estate Brokerage Compensation. Seller and Buyer agree that Seller shall contribute {f(d['comp_pct'])}% of the Purchase Price to Buyer's Brokerage or $______ to Buyer's Brokerage, if applicable (\"Seller's Compensation Contribution\"). The contribution, combined with any payment from Seller's Brokerage, shall not exceed the amount in Buyer's written buyer-broker agreement. (f) Escrow is directed to pay off Seller's mortgages, liens and brokerage compensation from Seller's proceeds.</p>")
    b.append(
        f"<p><b>5. CONFIRMATION OF AGENCY DISCLOSURE.</b> Seller's Agent {f(d['seller_agent'])} represents {cb(True)} Seller. "
        f"Seller's Brokerage {f(d['seller_brokerage'])} represents {cb(True)} Seller. Buyer's Agent {f(d['buyer_agent'])} represents {cb(True)} Buyer. "
        f"Buyer's Brokerage {f(d['buyer_brokerage'])} represents {cb(True)} Buyer.</p>"
    )
    b.append("<p><b>6. TITLE &amp; TITLE INSURANCE.</b> Seller will convey marketable title by general warranty deed and pay for a standard-coverage owner's policy of title insurance (summary of the printed section).</p>")
    b.append("<p><b>7. SELLER DISCLOSURES.</b> No later than the Seller Disclosure Deadline referenced in Section 24(a), Seller shall provide the Seller Disclosures listed on the printed form (property condition disclosure, title commitment, HOA documents, leases, water rights evidence and the others the form names).</p>")
    b.append("<p><b>8. BUYER'S CONDITIONS OF PURCHASE.</b></p>")
    b.append(
        f"<p class='ind'><b>8.1 DUE DILIGENCE CONDITION.</b> Buyer's obligation to purchase the Property {cb(True)} IS {cb(False)} IS NOT conditioned upon Buyer's Due Diligence. "
        "(b) If Buyer determines the results of the Due Diligence are unacceptable, Buyer may either: (i) no later than the Due Diligence Deadline referenced in Section 24(b), cancel the REPC by providing written notice to Seller, whereupon the Earnest Money Deposit shall be released to Buyer; or (ii) no later than the Due Diligence Deadline referenced in Section 24(b), resolve in writing with Seller any objections Buyer has. "
        "(c) If Buyer fails to cancel the REPC or fails to resolve in writing with Seller any objections, Buyer shall be deemed to have waived the Due Diligence Condition, and except as provided in Sections 8.2(a) and 8.3(b)(i), the Earnest Money Deposit shall become non-refundable.</p>"
    )
    b.append(
        f"<p class='ind'><b>8.2 APPRAISAL CONDITION.</b> Buyer's obligation to purchase the Property {cb(True)} IS {cb(False)} IS NOT conditioned upon the Property appraising for not less than the Purchase Price. "
        "(a) If Buyer receives a Notice of Appraised Value showing the Property appraised for less than the Purchase Price, Buyer may cancel by written notice to Seller no later than the Financing &amp; Appraisal Deadline referenced in Section 24(c), and the Earnest Money Deposit shall be released to Buyer. (b) If not cancelled, Buyer is deemed to have waived the Appraisal Condition.</p>"
    )
    b.append(
        f"<p class='ind'><b>8.3 FINANCING CONDITION.</b> (a) {cb(False)} No Financing Required. (b) {cb(True)} Financing Required. Buyer's obligation to purchase IS conditioned upon Buyer obtaining the Loan referenced in Section 2.1(c). "
        f"(i) If Buyer is not satisfied with the terms of the Loan, Buyer may, after the Due Diligence Deadline, cancel the REPC by written notice to Seller no later than the Financing &amp; Appraisal Deadline referenced in Section 24(c); whereupon {f(d['fin_release'])} of Buyer's Earnest Money Deposit shall be released to Seller, and the remainder shall be released to Buyer. "
        "(ii) and (iii) If after the Financing &amp; Appraisal Deadline the Loan proceeds have not been delivered as required under Section 3.2, either party may cancel, and all of Buyer's Deposits shall be released to Seller as liquidated damages.</p>"
    )
    b.append(f"<p class='ind'><b>8.4 ADDITIONAL EARNEST MONEY DEPOSIT.</b> Buyer {cb(False)} WILL {cb(True)} WILL NOT deliver an Additional Earnest Money Deposit in the amount of $______.</p>")
    b.append(f"<p><b>9. ADDENDA.</b> There {cb(False)} ARE {cb(True)} ARE NOT addenda to the REPC containing additional terms.</p>")
    b.append(f"<p><b>10. HOME WARRANTY PLAN / AS-IS CONDITION OF PROPERTY.</b> 10.1 A one-year Home Warranty Plan {cb(False)} WILL {cb(True)} WILL NOT be included in this transaction. 10.2 Buyer purchases the Property in its \"As-Is\" condition. 10.3 Seller will disclose known material defects and deliver the Property in substantially the same condition as at Acceptance, broom-clean.</p>")
    b.append("<p><b>11. FINAL PRE-SETTLEMENT WALK-THROUGH INSPECTION.</b> No earlier than seven (7) calendar days prior to Settlement, and upon reasonable notice and at a reasonable time, Buyer may conduct a final pre-Settlement walk-through inspection of the Property.</p>")
    b.append("<p><b>12 to 20.</b> Changes During Transaction; Authority of Signers; Complete Contract (the REPC cannot be changed except by written agreement of the parties); Mediation; Default; Attorney Fees; Notices; No Assignment; Insurance and Risk of Loss (summary of the printed sections).</p>")
    b.append("<p><b>21. TIME IS OF THE ESSENCE.</b> Time is of the essence regarding the dates set forth in the REPC. Extensions must be agreed to in writing by all parties. Performance under each Section which references a date shall absolutely be required by 5:00 PM Mountain Time on the stated date, and \"days\" and \"calendar days\" mean calendar days counted beginning on the day following the event which triggers the timing requirement.</p>")
    b.append("<p><b>22. ELECTRONIC TRANSMISSION AND COUNTERPARTS.</b> Electronic signatures have the same effect as original signatures.</p>")
    b.append("<p><b>23. ACCEPTANCE.</b> \"Acceptance\" occurs only when all of the following have occurred: (a) Seller or Buyer has signed the offer or counteroffer where noted to indicate acceptance; and (b) Seller or Buyer or their agent has communicated to the other party or to the other party's agent that the offer or counteroffer has been signed as required.</p>")
    dl = d["deadlines"]
    b.append("<p><b>24. CONTRACT DEADLINES.</b> Buyer and Seller agree that the following deadlines shall apply to the REPC:</p>")
    b.append(f"<p class='ind'>(a) Seller Disclosure Deadline {f(dl['a'])}<br>(b) Due Diligence Deadline {f(dl['b'])}<br>(c) Financing &amp; Appraisal Deadline {f(dl['c'])}<br>(d) Settlement Deadline {f(dl['d'])}</p>")
    b.append(f"<p><b>25. OFFER AND TIME FOR ACCEPTANCE.</b> Buyer offers to purchase the Property on the above terms and conditions. If Seller does not accept this offer by: {f(d['offer_expires'])} Mountain Time, this offer shall lapse; and the Brokerage shall return any Earnest Money Deposit to Buyer.</p>")
    b.append("<table class='sig'><tr>" + "".join(f"<td>{sig(n, dt, tm)}<br>(Buyer's Signature) (Date) (Time)</td>" for n, dt, tm in d["buyer_sigs"]) + "</tr></table>")
    b.append("<div class='box'><p style='text-align:center'><b>ACCEPTANCE/COUNTEROFFER/REJECTION</b></p><p>CHECK ONE:</p>")
    r = d["seller_response"]
    b.append(f"<p>{cb(r['type'] == 'accept')} ACCEPTANCE OF OFFER TO PURCHASE: Seller Accepts the foregoing offer on the terms and conditions specified above.</p>")
    b.append(f"<p>{cb(r['type'] == 'counter')} COUNTEROFFER: Seller presents for Buyer's Acceptance the terms of Buyer's offer subject to the exceptions or modifications as specified by the attached ADDENDUM No. {f(r.get('addendum', '____'))}</p>")
    b.append(f"<p>{cb(r['type'] == 'reject')} REJECTION: Seller rejects the foregoing offer.</p>")
    b.append("<table class='sig'><tr>" + "".join(f"<td>{sig(n, dt, tm)}<br>(Seller's Signature) (Date) (Time)</td>" for n, dt, tm in r["sigs"]) + "</tr></table></div>")
    b.append("<p class='footer'>THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, EFFECTIVE DECEMBER 4, 2024.</p>")
    return "".join(b)


# ---------------------------------------------------------------------------------------------
# Utah REPC, November 1, 2026 layout
# ---------------------------------------------------------------------------------------------

def repc_2026(d):
    b = []
    b.append("<h1>REAL ESTATE PURCHASE CONTRACT</h1>")
    b.append("<p class='note'>Made-up file in the layout of the revised Utah REPC (form effective November 1, 2026), with shortened printed text. Not the state form.</p>")
    b.append(
        f"<p>On this {f(d['ord'])} (\"Offer Reference Date\") {f(d['buyer'])} (\"Buyer\") offers to purchase from {f(d['seller'])} (\"Seller\") the Property described below. "
        f"PROPERTY: {f(d['street'])} City of {f(d['city'])}, County of {f(d['county'])}, State of Utah, Zip {f(d['zip'])} Tax ID No. {f(d['taxid'])} (the \"Property\").</p>"
    )
    b.append("<h2>OFFER TO PURCHASE</h2>")
    b.append(f"<p><b>1. PURCHASE PRICE AND PAYMENT.</b> The purchase price (\"Purchase Price\") for the Property is {f(d['price'])}. The Purchase Price shall be paid as provided in Sections 1(a) through 1(e) below. Any amounts shown in Sections 1(b) through 1(e) may be adjusted as deemed necessary by Buyer and Buyer's Lender (the \"Lender\").</p>")
    L = d["lines"]
    b.append(f"<p class='ind2'>{f(L['a'])} (a) Earnest Money Deposit. Under certain conditions described in the REPC, this deposit may become totally non-refundable.</p>")
    b.append(f"<p class='ind2'>{f(L['b'])} (b) New Loan. Buyer indicates that Buyer may be applying for a: {cb(True)} Conventional loan {cb(False)} FHA loan {cb(False)} VA loan {cb(False)} USDA loan.</p>")
    b.append(f"<p class='ind2'>{f(L['c'])} (c) Seller Financing. (see attached Seller Financing Addendum)</p>")
    b.append(f"<p class='ind2'>{f(L['d'])} (d) Other. ______</p>")
    b.append(f"<p class='ind2'>{f(L['e'])} (e) Balance of Purchase Price in Cash at Settlement.</p>")
    b.append(f"<p class='ind2'>{f(d['price'])} PURCHASE PRICE. Total of lines (a) through (e).</p>")
    b.append("<p><b>2. SELLER CONTRIBUTIONS.</b></p>")
    b.append(f"<p class='ind'><b>2.1 Real Estate Brokerage Compensation Amount.</b> Seller shall contribute {f(d['comp_pct'])}% of the gross Purchase Price to Buyer's Brokerage and $______ to Buyer's Brokerage, if applicable (\"Seller's Compensation Contribution\").</p>")
    b.append(f"<p class='ind'><b>2.2 Seller's Contribution to Closing Costs.</b> Seller agrees to contribute at Settlement the amount of {f(d['closing_costs'])} to be applied at Buyer's discretion toward Buyer's Closing Costs as defined in Section 8.3(c), if applicable.</p>")
    b.append(f"<p class='ind'><b>2.3 Home Warranty Plan.</b> A home warranty plan {cb(False)} WILL {cb(True)} WILL NOT be included in this transaction. If included, Seller agrees to pay for a home warranty plan selected and ordered by Buyer not to exceed $______ at Settlement.</p>")
    b.append("<p><b>3. BUYER CONDITIONS OF PURCHASE.</b> If checked in the affirmative, the following Buyer's conditions of purchase apply:</p>")
    b.append(f"<p class='ind'>(a) {cb(True)} Due Diligence Condition (see Section 12.1)<br>(b) {cb(True)} Appraisal Condition (see Section 12.2)<br>(c) {cb(True)} Financing Condition (see Section 12.3): (i) {cb(True)} 50% of the Earnest Money Deposit; or {cb(False)} ____% of the Earnest Money Deposit shall be released to Seller if Buyer cancels the REPC in accordance with Section 12.3(a). If no box is checked, then the percentage shall be 50%.<br>(d) {cb(False)} Subject to Sale of Buyer's Property Condition.</p>")
    dl = d["deadlines"]
    b.append("<p><b>4. REPC DEADLINES.</b> Buyer and Seller agree that the following deadlines shall apply to the REPC:</p>")
    b.append(f"<p class='ind'>(a) Seller Disclosure Deadline {f(dl['a'])}<br>(b) Due Diligence Deadline {f(dl['b'])}<br>(c) Appraisal Deadline {f(dl['c'])}<br>(d) Financing Deadline {f(dl['d'])}<br>(e) Settlement Deadline {f(dl['e'])}<br>(f) Possession: {cb(True)} Upon Recording; {cb(False)} ____ Hours after Recording; {cb(False)} ____ Calendar Days after Recording.</p>")
    b.append(f"<p><b>5. EARNEST MONEY DEPOSIT.</b> No later than four (4) calendar days after Acceptance (as defined in Section 23), Buyer agrees to deliver an Earnest Money Deposit in the form of {f(d['emd_form'])} to Buyer's Brokerage. Buyer's Brokerage then shall have four (4) calendar days in which to deposit it into Buyer's Brokerage Real Estate Trust Account or with a {cb(False)} Title Insurance Company. If it is not delivered or deposited within that timeframe, Seller may cancel the REPC.</p>")
    b.append(f"<p><b>6. ADDENDA.</b> There {cb(False)} ARE {cb(True)} ARE NOT addenda to the REPC containing additional terms.</p>")
    oi = d["other_included"]
    b.append("<p><b>7. INCLUDED ITEMS/WATER.</b> 7.1 Included Items and 7.2 Home Automation Systems: the fixtures, equipment and smart home devices listed on the printed form, if presently owned and in place.</p>")
    b.append(f"<p class='ind'><b>7.3 Other Included Items.</b> {cb('washers' in oi)} washers {cb('dryers' in oi)} dryers {cb('refrigerators' in oi)} refrigerators {cb(False)} electric vehicle charging stations {cb(False)} other (specify) ______. The items of any unchecked boxes above shall be excluded.</p>")
    b.append(f"<p class='ind'><b>7.4 Excluded Items.</b> {f(d['excluded'])} <b>7.5 Water Service.</b> All water rights/water shares that are the legal source for Seller's current water service are included.</p>")
    b.append("<p><b>8. PRORATIONS / ASSESSMENTS / OTHER PAYMENT OBLIGATIONS.</b> 8.1 Prorations are made as of the Settlement Deadline referenced in Section 4(e), unless otherwise agreed in writing.</p>")
    b.append(f"<p class='ind'>8.2 Special Assessments approved prior to the Settlement Deadline shall be paid for by: {cb(True)} Seller {cb(False)} Buyer {cb(False)} Split Equally {cb(False)} Other. 8.3(a) Change of ownership fees shall be paid at Settlement by: {cb(False)} Seller {cb(True)} Buyer {cb(False)} Split Equally {cb(False)} Other. 8.3(b) If Seller's Compensation Contribution exceeds the written buyer-broker agreement, the excess is returned to Seller. 8.3(c) Seller's Contribution to Closing Costs may be applied to a rate reduction, financing costs, closing costs and prepaid escrow funds.</p>")
    b.append("<p><b>9. SETTLEMENT AND CLOSING.</b> 9.1 Settlement shall take place no later than the Settlement Deadline referenced in Section 4(e). 9.2 Closing (Settlement, Loan funding and Recording) no later than four calendar days after Settlement. 9.3 Possession as indicated in Section 4(f). Unless modified in writing, the holdover fee shall be $______ or $300 per day, whichever is greater.</p>")
    b.append("<p><b>10. TITLE &amp; TITLE INSURANCE. 11. SELLER DISCLOSURES</b> (due by the Seller Disclosure Deadline in Section 4(a)) (summary of the printed sections).</p>")
    b.append("<p><b>12. BUYER'S CONDITIONS OF PURCHASE.</b></p>")
    b.append("<p class='ind'><b>12.1 Due Diligence Condition.</b> (b) If Buyer determines the results of the Due Diligence are unacceptable, Buyer may either: (i) no later than the Due Diligence Deadline referenced in Section 4(b), cancel the REPC by providing written notice to Seller, whereupon the Earnest Money Deposit shall be released to Buyer; or (ii) no later than the Due Diligence Deadline referenced in Section 4(b), resolve in writing with Seller any objections Buyer has. (c) If Buyer fails to do either, Buyer shall be deemed to have waived the Due Diligence Condition, and, except as provided in Sections 12.2(a) and 12.3(a), the Earnest Money Deposit shall become non-refundable.</p>")
    b.append("<p class='ind'><b>12.2 Appraisal Condition.</b> (a) If the Property appraises for less than the Purchase Price, Buyer may cancel by written notice to Seller, along with a complete copy of the appraisal, no later than the Appraisal Deadline referenced in Section 4(c), and the Earnest Money Deposit shall be released to Buyer.</p>")
    b.append("<p class='ind'><b>12.3 Financing Condition.</b> (a) If Buyer is not satisfied with the terms and conditions of the Loan, Buyer may, after the Due Diligence Deadline, cancel the REPC by written notice to Seller no later than the Financing Deadline referenced in Section 4(d); whereupon the Earnest Money Deposit shall be released to Seller according to the percentage in Section 3(c)(i), and the remainder to Buyer. (b) and (c) After the Financing Deadline, if the Loan proceeds have not been delivered, either party may cancel and all of the Earnest Money Deposit is released to Seller as liquidated damages.</p>")
    b.append("<p><b>13 to 22.</b> As-Is Condition; Final Walk-Through (no earlier than seven (7) calendar days prior to Settlement); Changes During Transaction; Authority of Signers; Complete Contract; Mediation; Default; Attorney Fees; No Assignment; Notices (\"Received\" includes delivery to the email system the recipient uses) (summary of the printed sections).</p>")
    b.append("<p><b>23. ACCEPTANCE.</b> Acceptance occurs only when all of the following have occurred: (a) Buyer or Seller has signed the offer or counteroffer where noted to indicate acceptance; and (b) the offer or counteroffer has been Received by the other party, or the other party's respective agent, or by the other party's branch broker or principal broker, no later than the applicable date referenced in Section 30 or as noted in the counteroffer.</p>")
    b.append("<p><b>24. INSURANCE &amp; RISK OF LOSS.</b> (summary)</p>")
    b.append("<p><b>25. TIME IS OF THE ESSENCE.</b> Any extension of the deadlines must be agreed to in writing by all parties. Performance under each Section which references a date shall absolutely be required by 5:00 PM Mountain Time on the stated date, and days mean calendar days counted beginning on the day following the triggering event. If any dates for the Earnest Money delivery, Earnest Money Deposit or the Settlement Deadline fall on a Saturday, Sunday, or legal holiday, performance shall be required on the next business day.</p>")
    b.append(f"<p><b>26 to 29.</b> Section 1031 Exchange; Electronic Transmission; Confirmation of Agency Disclosure: Seller's Agent {f(d['seller_agent'])} ({f(d['seller_brokerage'])}) represents Seller; Buyer's Agent {f(d['buyer_agent'])} ({f(d['buyer_brokerage'])}) represents Buyer; Disclosure of Interest: none.</p>")
    b.append(f"<p><b>30. ACCEPTANCE DEADLINE.</b> Buyer offers to purchase the Property on the above terms and conditions. If Seller does not accept this offer by: {f(d['offer_expires'])} Mountain Time, this offer shall lapse.</p>")
    b.append("<table class='sig'><tr>" + "".join(f"<td>{sig(n, dt, tm)}<br>(Buyer's Signature) (Date)</td>" for n, dt, tm in d["buyer_sigs"]) + "</tr></table>")
    r = d["seller_response"]
    b.append("<div class='box'><p style='text-align:center'><b>ACCEPTANCE/COUNTEROFFER/REJECTION</b></p><p>CHECK ONE:</p>")
    b.append(f"<p>{cb(r['type'] == 'accept')} ACCEPTANCE OF OFFER TO PURCHASE: Seller Accepts the foregoing offer on the terms and conditions specified above.</p>")
    b.append(f"<p>{cb(r['type'] == 'counter')} COUNTEROFFER: Seller presents for Buyer's Acceptance the terms of Buyer's offer subject to the exceptions or modifications specified in the attached ADDENDUM NO. {f(r.get('addendum', '____'))}</p>")
    b.append(f"<p>{cb(r['type'] == 'reject')} REJECTION: Seller rejects the foregoing offer.</p>")
    b.append("<table class='sig'><tr>" + "".join(f"<td>{sig(n, dt, tm)}<br>(Seller's Signature) (Date)</td>" for n, dt, tm in r["sigs"]) + "</tr></table></div>")
    b.append("<p class='footer'>THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, EFFECTIVE NOVEMBER 1, 2026. AS OF JANUARY 1, 2027, IT WILL REPLACE AND SUPERSEDE THE PREVIOUSLY APPROVED VERSION OF THIS FORM.</p>")
    return "".join(b)


# ---------------------------------------------------------------------------------------------
# Utah Blank Addendum layout (effective January 1, 2020)
# ---------------------------------------------------------------------------------------------

def utah_addendum(a):
    b = []
    b.append(f"<h1>ADDENDUM NO. {f(a['no'])}<br>TO<br>REAL ESTATE PURCHASE CONTRACT</h1>")
    b.append("<p class='note'>Made-up file in the layout of the Utah Blank Addendum. Not the state form.</p>")
    b.append(
        f"<p>THIS IS AN {cb(a['kind'] == 'addendum')} ADDENDUM {cb(a['kind'] == 'counter')} COUNTEROFFER to that REAL ESTATE PURCHASE CONTRACT (the \"REPC\") with an Offer Reference Date of "
        f"{f(a['ord'])}, including all prior addenda and counteroffers, between {f(a['buyer'])} as Buyer, and {f(a['seller'])} as Seller, regarding the Property located at "
        f"{f(a['address'])}. The following terms are hereby incorporated as part of the REPC:</p>"
    )
    if a.get("lead"):
        b.append(f"<p class='ind'><b>{a['lead']}</b></p>")
    for i, t in enumerate(a["terms"], 1):
        b.append(f"<p class='ind'>{i}. {t}</p>")
    who = a["who_accepts"]
    b.append(
        "<p>To the extent the terms of this ADDENDUM modify or conflict with any provisions of the REPC, including all prior addenda and counteroffers, these terms shall control. "
        "All other terms of the REPC, including all prior addenda and counteroffers, not modified by this ADDENDUM shall remain the same. "
        f"{cb(who == 'Seller')} Seller {cb(who == 'Buyer')} Buyer shall have until {f(a['deadline_time'])} {cb(a['ampm'] == 'AM')} AM {cb(a['ampm'] == 'PM')} PM Mountain Time on {f(a['deadline_date'])} (Date), "
        "to accept the terms of this ADDENDUM in accordance with the provisions of Section 23 of the REPC. Unless so accepted, the offer as set forth in this ADDENDUM shall lapse.</p>"
    )
    b.append("<table class='sig'><tr>" + "".join(f"<td>{cb(r == 'Buyer')} Buyer {cb(r == 'Seller')} Seller Signature<br>{sig(n, dt, tm)}</td>" for r, n, dt, tm in a["signers"]) + "</tr></table>")
    resp = a.get("response", {"type": None, "sigs": []})
    rt = resp["type"]
    party = resp.get("party")
    b.append("<div class='box'><p style='text-align:center'><b>ACCEPTANCE/COUNTEROFFER/REJECTION</b></p><p>CHECK ONE:</p>")
    b.append(f"<p>{cb(rt == 'accept')} ACCEPTANCE: {cb(rt == 'accept' and party == 'Seller')} Seller {cb(rt == 'accept' and party == 'Buyer')} Buyer hereby accepts the terms of this ADDENDUM.</p>")
    b.append(f"<p>{cb(rt == 'counter')} COUNTEROFFER: {cb(rt == 'counter' and party == 'Seller')} Seller {cb(rt == 'counter' and party == 'Buyer')} Buyer presents as a counteroffer the terms of attached ADDENDUM NO. {f(resp.get('addendum', '____'))}.</p>")
    sigs = resp.get("sigs", [])
    if sigs:
        b.append("<table class='sig'><tr>" + "".join(f"<td>{sig(n, dt, tm)}<br>(Signature) (Date) (Time)</td>" for n, dt, tm in sigs) + "</tr></table>")
    else:
        b.append("<table class='sig'><tr><td>______________________<br>(Signature) (Date) (Time)</td><td>______________________<br>(Signature) (Date) (Time)</td></tr></table>")
    b.append(f"<p>{cb(rt == 'reject')} REJECTION: {cb(False)} Seller {cb(False)} Buyer rejects the foregoing ADDENDUM.</p>")
    b.append("<table class='sig'><tr><td>______________________<br>(Signature) (Date) (Time)</td><td>______________________<br>(Signature) (Date) (Time)</td></tr></table></div>")
    b.append("<p class='footer'>THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, EFFECTIVE JANUARY 1, 2020. IT REPLACES AND SUPERSEDES ALL PREVIOUSLY APPROVED VERSIONS OF THIS FORM.</p>")
    return "".join(b)


# ---------------------------------------------------------------------------------------------
# Practice: 1428 Sample Ridge Lane (December 4, 2024 layout, buyer's agent)
# ---------------------------------------------------------------------------------------------

P_STAMP = "PRACTICE FILE: made-up example"
p_common = dict(
    ord="October 28, 2026",
    buyer="Avery Testbuyer and Jordan Testbuyer",
    seller="Morgan Testseller",
    address="1428 Sample Ridge Lane, Exampleton, Utah 84000",
)
practice_repc = dict(
    p_common,
    emd="$5,000", emd_form="cashier's check",
    street="1428 Sample Ridge Lane", city="Exampleton", county="Placeholder", zip="84000", taxid="00-000-1428",
    other_included=["refrigerators"], excluded="Garage freezer.",
    price="$489,000", lines={"a": "$5,000", "b": "$0", "c": "$440,100", "d": "$0", "e": "$43,900"},
    possession="recording", special_assessments="Seller", change_fee="Buyer", comp_pct="2.5",
    seller_agent="Riley Sampleton", seller_brokerage="Pretend Summit Homes",
    buyer_agent="Casey Practiceagent", buyer_brokerage="Example Peak Realty",
    fin_release="$1,000",
    deadlines={"a": "November 4, 2026", "b": "November 20, 2026", "c": "December 4, 2026", "d": "December 11, 2026"},
    offer_expires="5:00 PM on October 30, 2026",
    buyer_sigs=[("Avery Testbuyer", "10/28/2026", None), ("Jordan Testbuyer", "10/28/2026", None)],
    seller_response={"type": "counter", "addendum": "1", "sigs": [("Morgan Testseller", "10/30/2026", "3:40 PM")]},
)
write("practice/01 REPC 1428 Sample Ridge Lane.pdf", P_STAMP, repc_2024(practice_repc), "Buyer's Initials AT JT | Seller's Initials MT")

write("practice/02 Addendum No. 1 Seller Counteroffer.pdf", P_STAMP, utah_addendum(dict(
    p_common, no="1", kind="counter",
    terms=[
        "The Purchase Price in Section 2.1 is changed to $495,000.",
        "The Due Diligence Deadline in Section 24(b) is changed to November 17, 2026.",
        "Section 1.3 Excluded Items: add the family room television. The wall mounting bracket stays with the Property.",
    ],
    who_accepts="Buyer", deadline_time="8:00", ampm="PM", deadline_date="October 31, 2026",
    signers=[("Seller", "Morgan Testseller", "10/30/2026", "3:40 PM")],
    response={"type": "accept", "party": "Buyer", "sigs": [("Avery Testbuyer", "10/31/2026", "10:12 AM"), ("Jordan Testbuyer", "10/31/2026", "10:20 AM")]},
)), "Buyer's Initials AT JT | Seller's Initials MT")

write("practice/03 Addendum No. 2 Home Warranty and Washer Dryer.pdf", P_STAMP, utah_addendum(dict(
    p_common, no="2", kind="addendum",
    lead="Home warranty and laundry appliances.",
    terms=[
        "Section 10.1: a one-year Home Warranty Plan WILL be included. Buyer orders it from a company Buyer selects. Cost not to exceed $600, paid by Seller at Settlement.",
        "Section 1.2: the washer and dryer in the laundry room are included in the sale and will be conveyed by bill of sale.",
        "Buyer will schedule the final walk-through through the listing agent with at least 24 hours' notice.",
        "To fit Seller's move, the date in Section 24(d) is changed to December 4, 2026.",
        "All other terms remain the same.",
    ],
    who_accepts="Buyer", deadline_time="5:00", ampm="PM", deadline_date="November 10, 2026",
    signers=[("Seller", "Morgan Testseller", "11/07/2026", "11:05 AM")],
)), "Buyer's Initials ____ ____ | Seller's Initials MT")

# ---------------------------------------------------------------------------------------------
# Eval 1: 2207 Placeholder Pines Drive (December 4, 2024 layout, listing agent, second counter)
# ---------------------------------------------------------------------------------------------

E_STAMP = "TEST FILE: made-up example"
e1 = dict(
    ord="November 2, 2026", buyer="Quinn Fakebuyer", seller="Dana Mocksell and Lee Mocksell",
    address="2207 Placeholder Pines Drive, Sampleton, Utah 84000",
)
write("evals/files/eval-1-second-counter/REPC 2207 Placeholder Pines Drive.pdf", E_STAMP, repc_2024(dict(
    e1,
    emd="$10,000", emd_form="cashier's check",
    street="2207 Placeholder Pines Drive", city="Sampleton", county="Example", zip="84000", taxid="00-000-2207",
    other_included=["washers", "dryers", "refrigerators"], excluded="Dining room chandelier.",
    price="$612,000", lines={"a": "$10,000", "b": "$0", "c": "$581,400", "d": "$0", "e": "$20,600"},
    possession="recording", special_assessments="Seller", change_fee="Split", comp_pct="2",
    seller_agent="Harper Listwell", seller_brokerage="Pretend Summit Homes",
    buyer_agent="Sky Notreal", buyer_brokerage="Imaginary Peaks Realty",
    fin_release="$2,500",
    deadlines={"a": "November 9, 2026", "b": "November 24, 2026", "c": "December 8, 2026", "d": "December 18, 2026"},
    offer_expires="9:00 PM on November 3, 2026",
    buyer_sigs=[("Quinn Fakebuyer", "11/02/2026", None)],
    seller_response={"type": "counter", "addendum": "1", "sigs": [("Dana Mocksell", "11/03/2026", "7:15 PM"), ("Lee Mocksell", "11/03/2026", "7:22 PM")]},
)), "Buyer's Initials QF | Seller's Initials DM LM")

write("evals/files/eval-1-second-counter/Addendum No. 1 Seller Counteroffer.pdf", E_STAMP, utah_addendum(dict(
    e1, no="1", kind="counter",
    terms=[
        "The Purchase Price in Section 2.1 is changed to $625,000.",
        "The Due Diligence Deadline in Section 24(b) is changed to November 20, 2026.",
        "Section 3.3 Possession: 24 Hours after Recording.",
    ],
    who_accepts="Buyer", deadline_time="6:00", ampm="PM", deadline_date="November 6, 2026",
    signers=[("Seller", "Dana Mocksell", "11/03/2026", "7:15 PM"), ("Seller", "Lee Mocksell", "11/03/2026", "7:22 PM")],
    response={"type": "counter", "party": "Buyer", "addendum": "2", "sigs": [("Quinn Fakebuyer", "11/06/2026", "4:48 PM")]},
)), "Buyer's Initials QF | Seller's Initials DM LM")

write("evals/files/eval-1-second-counter/Addendum No. 2 Buyer Counteroffer.pdf", E_STAMP, utah_addendum(dict(
    e1, no="2", kind="counter",
    terms=[
        "The Purchase Price is $620,000.",
        "The Settlement Deadline in Section 24(d) is changed to January 8, 2027.",
        "Seller agrees to pay at Settlement up to $9,000 toward Buyer's closing costs and prepaid items, as allowed by Buyer's lender.",
        "All other terms of Addendum No. 1 remain the same.",
    ],
    who_accepts="Seller", deadline_time="8:00", ampm="PM", deadline_date="November 9, 2026",
    signers=[("Buyer", "Quinn Fakebuyer", "11/06/2026", "4:48 PM")],
)), "Buyer's Initials QF | Seller's Initials ____ ____")

# ---------------------------------------------------------------------------------------------
# Eval 2: 77 Example Court (November 1, 2026 layout, buyer's agent, hidden Due Diligence change)
# ---------------------------------------------------------------------------------------------

e2 = dict(
    ord="November 2, 2026", buyer="Sam Testcase and Alex Testcase", seller="Jamie Fauxseller",
    address="77 Example Court, Fakeview, Utah 84000",
)
write("evals/files/eval-2-hidden-due-diligence/REPC 77 Example Court.pdf", E_STAMP, repc_2026(dict(
    e2,
    street="77 Example Court", city="Fakeview", county="Sample", zip="84000", taxid="00-000-0077",
    price="$455,000", lines={"a": "$7,500", "b": "$409,500", "c": "$0", "d": "$0", "e": "$38,000"},
    comp_pct="2.5", closing_costs="$0", emd_form="cashier's check",
    deadlines={"a": "November 9, 2026", "b": "November 20, 2026", "c": "December 4, 2026", "d": "December 8, 2026", "e": "December 15, 2026"},
    other_included=["washers", "dryers"], excluded="None.",
    seller_agent="Taylor Mockagent", seller_brokerage="Pretend Summit Homes",
    buyer_agent="Robin Draftagent", buyer_brokerage="Example Peak Realty",
    offer_expires="9:00 PM on November 3, 2026",
    buyer_sigs=[("Sam Testcase", "11/02/2026", None), ("Alex Testcase", "11/02/2026", None)],
    seller_response={"type": "counter", "addendum": "1", "sigs": [("Jamie Fauxseller", "11/03/2026", "6:20 PM")]},
)), "Buyer's Initials ST AT | Seller's Initials JF")

write("evals/files/eval-2-hidden-due-diligence/Addendum No. 1 Seller Counteroffer.pdf", E_STAMP, utah_addendum(dict(
    e2, no="1", kind="counter",
    terms=[
        "The Purchase Price in Section 1 is changed to $462,000.",
        "Section 4(f) Possession: 48 Hours after Recording.",
    ],
    who_accepts="Buyer", deadline_time="5:00", ampm="PM", deadline_date="November 4, 2026",
    signers=[("Seller", "Jamie Fauxseller", "11/03/2026", "6:20 PM")],
    response={"type": "accept", "party": "Buyer", "sigs": [("Sam Testcase", "11/04/2026", "11:02 AM"), ("Alex Testcase", "11/04/2026", "11:09 AM")]},
)), "Buyer's Initials ST AT | Seller's Initials JF")

write("evals/files/eval-2-hidden-due-diligence/Addendum No. 2 Home Warranty and Refrigerator.pdf", E_STAMP, utah_addendum(dict(
    e2, no="2", kind="addendum",
    lead="Home warranty and refrigerator.",
    terms=[
        "Section 2.3: Seller will pay for a home warranty plan selected and ordered by Buyer, not to exceed $650 at Settlement.",
        "Section 7.3: the refrigerator in the kitchen is included in the sale.",
        "The date in Section 4(b) is changed to November 13, 2026.",
        "All other terms remain the same.",
    ],
    who_accepts="Buyer", deadline_time="5:00", ampm="PM", deadline_date="November 10, 2026",
    signers=[("Seller", "Jamie Fauxseller", "11/07/2026", "4:45 PM")],
)), "Buyer's Initials ____ ____ | Seller's Initials JF")

# ---------------------------------------------------------------------------------------------
# Eval 3: 3150 Fictional Fork Road, Idaho (invented form, general mode, conflicting addenda)
# ---------------------------------------------------------------------------------------------

def idaho_psa():
    b = []
    b.append("<h1>RESIDENTIAL PURCHASE AND SALE AGREEMENT</h1>")
    b.append("<p class='note'>Example Valley Association (made-up form). Not a real association or form.</p>")
    b.append(f"<p>Date: {f('October 24, 2026')}. Buyer: {f('Drew Pretendbuyer')}. Seller: {f('Kai Sampleseller and Noor Sampleseller')}.</p>")
    b.append(f"<p><b>1. PROPERTY.</b> {f('3150 Fictional Fork Road')}, City of {f('Sampleburg')}, County of {f('Example')}, State of Idaho, ZIP {f('83000')}, Parcel No. {f('RP000003150')}.</p>")
    b.append(f"<p><b>2. PURCHASE PRICE.</b> {f('$389,900')}, payable as follows: Earnest money {f('$4,000')}; New conventional loan {f('$370,405')}; Balance in cash at closing {f('$15,495')}.</p>")
    b.append(f"<p><b>3. EARNEST MONEY.</b> Delivered to and held by {f('Placeholder Title Company')} within three (3) business days after acceptance.</p>")
    b.append(f"<p><b>4. SELLER CONTRIBUTION.</b> Seller will pay {f('$0')} toward Buyer's closing costs and prepaid items.</p>")
    b.append(f"<p><b>5. INSPECTION CONTINGENCY.</b> Buyer has {f('10')} calendar days after acceptance to complete inspections and deliver to Seller written notice of objections or cancellation. Seller has three (3) calendar days after receiving objections to respond in writing. If the parties do not agree in writing, Buyer may cancel within two (2) calendar days after Seller's response period ends and the earnest money is returned to Buyer.</p>")
    b.append(f"<p><b>6. APPRAISAL AND LOAN.</b> This Agreement is contingent on the Property appraising at or above the Purchase Price and on Buyer's loan approval, each by {f('December 8, 2026')}. After that date, the earnest money is non-refundable except for Seller's default.</p>")
    b.append(f"<p><b>7. CLOSING.</b> Closing will occur on or before {f('December 18, 2026')} (the \"Closing Date\"). If the Closing Date falls on a Saturday, Sunday or legal holiday, closing will occur on the next business day.</p>")
    b.append(f"<p><b>8. POSSESSION.</b> Buyer receives possession {f('upon recording')}.</p>")
    b.append("<p><b>9. TIME.</b> Time is of the essence. \"Days\" means calendar days. Unless a time is stated, a deadline ends at 11:59 PM Mountain Time on its date.</p>")
    b.append("<p><b>10. ADDENDA AND COUNTEROFFERS.</b> Any addendum or counteroffer signed by Buyer and Seller becomes part of this Agreement. Where an addendum or counteroffer conflicts with this Agreement, the addendum or counteroffer controls.</p>")
    b.append("<p><b>11. ENTIRE AGREEMENT.</b> This Agreement, with its signed addenda and counteroffers, is the entire agreement. It may be changed only in a writing signed by Buyer and Seller.</p>")
    b.append(f"<p><b>12. AGENCY.</b> Buyer's agent {f('Morgan Draftwell')}, {f('Fictional Ridge Realty')}, represents Buyer. Seller's agent {f('Jesse Notlisted')}, {f('Imaginary Gate Realty')}, represents Seller. Lender: {f('Make-Believe Mortgage')}.</p>")
    b.append(f"<p><b>13. ACCEPTANCE.</b> This offer expires at {f('6:00 PM Mountain Time on October 25, 2026')} unless accepted by Seller's signature and delivery of the signed Agreement to Buyer or Buyer's agent.</p>")
    b.append("<table class='sig'><tr>" + f"<td>{sig('Drew Pretendbuyer', '10/24/2026', '2:15 PM')}<br>Buyer</td>" + "</tr></table>")
    b.append(f"<div class='box'><p><b>SELLER'S RESPONSE:</b> {cb(False)} Accepted {cb(True)} Countered: see Counteroffer #1 {cb(False)} Rejected</p>")
    b.append("<table class='sig'><tr>" + f"<td>{sig('Kai Sampleseller', '10/25/2026', '4:10 PM')}<br>Seller</td><td>{sig('Noor Sampleseller', '10/25/2026', '4:12 PM')}<br>Seller</td>" + "</tr></table></div>")
    b.append("<p class='footer'>EXAMPLE VALLEY ASSOCIATION FORM RPSA (MADE-UP) EDITION 2026.</p>")
    return "".join(b)


def idaho_doc(title, intro, terms, sigs, footer="EXAMPLE VALLEY ASSOCIATION ADDENDUM FORM (MADE-UP)"):
    b = [f"<h1>{title}</h1>", "<p class='note'>Example Valley Association (made-up form). Not a real association or form.</p>"]
    b.append(f"<p>{intro}</p>")
    for i, t in enumerate(terms, 1):
        b.append(f"<p class='ind'>{i}. {t}</p>")
    b.append("<p>In the event of a conflict between this document and the Agreement, this document controls. All other terms of the Agreement remain unchanged.</p>")
    b.append("<table class='sig'><tr>" + "".join(f"<td>{sig(n, dt, tm)}<br>{role}</td>" for role, n, dt, tm in sigs) + "</tr></table>")
    b.append(f"<p class='footer'>{footer}</p>")
    return "".join(b)


ID_INTRO = ("This document is part of the Residential Purchase and Sale Agreement dated October 24, 2026 between Drew Pretendbuyer (Buyer) and "
            "Kai Sampleseller and Noor Sampleseller (Seller) for 3150 Fictional Fork Road, Sampleburg, Idaho 83000 (the \"Agreement\").")
write("evals/files/eval-3-conflicting-addenda/Purchase and Sale Agreement 3150 Fictional Fork Road.pdf", E_STAMP, idaho_psa(), "Buyer's Initials DP | Seller's Initials KS NS")
write("evals/files/eval-3-conflicting-addenda/Counteroffer 1.pdf", E_STAMP, idaho_doc(
    "COUNTEROFFER #1", ID_INTRO + " Seller accepts the Agreement subject to the following:",
    ["The Purchase Price is $394,900.",
     "Seller will pay up to $4,000 toward Buyer's closing costs and prepaid items.",
     "This counteroffer expires at 8:00 PM Mountain Time on October 26, 2026 unless Buyer signs and delivers it to Seller or Seller's agent."],
    [("Seller", "Kai Sampleseller", "10/25/2026", "4:10 PM"), ("Seller", "Noor Sampleseller", "10/25/2026", "4:12 PM"), ("Buyer: Accepted", "Drew Pretendbuyer", "10/26/2026", "11:45 AM")],
), "Buyer's Initials DP | Seller's Initials KS NS")
write("evals/files/eval-3-conflicting-addenda/Addendum 2 Inspection Response.pdf", E_STAMP, idaho_doc(
    "ADDENDUM #2: INSPECTION RESPONSE", ID_INTRO,
    ["In lieu of the repairs listed in Buyer's Inspection Notice dated November 2, 2026, Seller will credit Buyer $2,500 at closing. This credit is in addition to Seller's closing cost contribution in Counteroffer #1.",
     "The Closing Date is changed to December 22, 2026."],
    [("Buyer", "Drew Pretendbuyer", "11/04/2026", "10:05 AM"), ("Seller", "Kai Sampleseller", "11/04/2026", "3:30 PM"), ("Seller", "Noor Sampleseller", "11/04/2026", "3:34 PM")],
), "Buyer's Initials DP | Seller's Initials KS NS")
write("evals/files/eval-3-conflicting-addenda/Addendum 3 Lender Request.pdf", E_STAMP, idaho_doc(
    "ADDENDUM #3", ID_INTRO + " At the request of Buyer's lender:",
    ["Seller's total contribution toward Buyer's closing costs, prepaid items and credits of any kind shall not exceed $4,000.",
     "The Closing Date remains December 18, 2026."],
    [("Buyer", "Drew Pretendbuyer", "11/06/2026", "9:12 AM"), ("Seller", "Kai Sampleseller", "11/07/2026", "2:40 PM"), ("Seller", "Noor Sampleseller", "11/07/2026", "2:44 PM")],
), "Buyer's Initials DP | Seller's Initials KS NS")

with open(os.path.join(HTML_DIR, "pdfs.json"), "w", encoding="utf-8") as fh:
    json.dump(PDFS, fh, indent=1)
print(f"wrote {len(PDFS)} HTML files to {HTML_DIR}")
