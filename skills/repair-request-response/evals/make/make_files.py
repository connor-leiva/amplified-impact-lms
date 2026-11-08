"""Builds the made-up practice and eval files for repair-request-response.

Usage: python3 make_files.py SKILL_DIR HTML_DIR
Writes one HTML file per PDF into HTML_DIR and a pdfs.json list. Then run
html_to_pdf.cjs HTML_DIR SKILL_DIR to print them into practice/ and evals/files/,
and check_pages.py SKILL_DIR to confirm every cited item lands on its page.

Every person, street, city, brokerage, inspector, contractor, bank and number here is made up.
The REPC and Blank Addendum wording follows the Utah state-approved forms (public), condensed.
"""
import json
import os
import sys

STAMP = "PRACTICE FILE: made-up example"
SKILL_DIR, HTML_DIR = sys.argv[1], sys.argv[2]
PDFS = []
PAGE_MAP = {}  # pdf path -> {item id: expected page}

CSS = (
    "body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.38;margin:0;color:#1d1d1d}"
    ".stamp{font-weight:bold;color:#b00;font-size:9pt;margin-bottom:6px}"
    ".page{page-break-after:always}.page:last-child{page-break-after:auto}"
    "h1{font-size:16pt;margin:2px 0 4px}h2{font-size:12.5pt;margin:10px 0 6px;border-bottom:1.5px solid #555;padding-bottom:2px}"
    "h3{font-size:10.5pt;margin:10px 0 3px}"
    ".bar{font-size:8.5pt;color:#444;border-bottom:1px solid #bbb;padding-bottom:3px;margin-bottom:8px}"
    "table{border-collapse:collapse;width:100%;font-size:9pt;margin:5px 0}"
    "td,th{border:1px solid #888;padding:3px 5px;vertical-align:top;text-align:left}th{background:#eee}"
    "p{margin:4px 0}.tag{font-weight:bold;font-size:8.5pt;padding:1px 4px;border:1px solid #333;margin-right:4px}"
    ".SAFETY{background:#f6c9c9}.REPAIR{background:#f8e2b8}.MAINTENANCE{background:#dfe9f7}"
    ".MONITOR{background:#e6e6e6}.INFO{background:#e6e6e6}.NOT{background:#eee}"
    ".form{font-family:'Times New Roman',serif;font-size:10.5pt}.form h1{text-align:center;font-size:13pt}"
    ".small{font-size:8.5pt;color:#333}.foot{font-size:8pt;text-align:center;margin-top:14px;font-weight:bold}"
    ".box{border:1px solid #444;padding:6px 8px;margin:6px 0}.sig{margin-top:6px}"
    ".fill{font-family:'Courier New',monospace;font-weight:bold;color:#123d7a}"
)


def f(text):
    """A filled-in blank on a form."""
    return f"<span class='fill'>{text}</span>"


def write(rel, body_pages, form=False, page_map=None):
    cls = " class='form'" if form else ""
    pages = "".join(f"<div class='page'><div class='stamp'>{STAMP}</div>{p}</div>" for p in body_pages)
    html = f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body{cls}>{pages}</body></html>"
    name = rel.replace("/", "__").replace(" ", "_").replace(".pdf", ".html")
    with open(os.path.join(HTML_DIR, name), "w", encoding="utf-8") as fh:
        fh.write(html)
    PDFS.append({"html": name, "pdf": rel})
    if page_map:
        PAGE_MAP[rel] = page_map


# --- inspection reports ---------------------------------------------------------------------------

def finding(fid, tag, title, text):
    label = {"NOT": "NOT INSPECTED"}.get(tag, tag)
    return f"<h3>{fid} {title} <span class='tag {tag}'>{label}</span></h3><p>{text}</p>"


def report(rel, co, meta, summary, sections, limitations):
    """sections: list of (number, title, [(id, tag, title, text)]). Each section is one page."""
    bar = f"<div class='bar'>{co['name']} | Report {meta['report_no']} | {meta['address']} | Inspected {meta['date']}</div>"
    cover = [bar, f"<h1>Home Inspection Report</h1>",
             "<table>" + "".join(f"<tr><th style='width:30%'>{k}</th><td>{v}</td></tr>" for k, v in meta["rows"]) + "</table>",
             f"<p class='small'>{co['name']}, {co['addr']}. Inspector: {co['inspector']}. "
             "Ratings used in this report: SAFETY (a condition that could cause injury; correct promptly), REPAIR (a defect "
             "that needs correction by a qualified professional), MAINTENANCE (routine upkeep), MONITOR (aging or a condition to "
             "watch; no repair needed now), INFO (for your information), NOT INSPECTED.</p>",
             "<h2>Summary of Key Findings</h2>",
             "<p class='small'>This summary lists the items the inspector considered most significant. It is not the full report. "
             "Read every section.</p>",
             "<table><tr><th>Item</th><th>Rating</th><th>Finding</th><th>Page</th></tr>" +
             "".join(f"<tr><td>{i}</td><td>{r}</td><td>{t}</td><td>{p}</td></tr>" for i, r, t, p in summary) + "</table>"]
    pages = ["".join(cover)]
    page_map = {}
    for n, (num, title, items) in enumerate(sections, start=2):
        body = [bar, f"<h2>Section {num}: {title}</h2>"]
        for fid, tag, ftitle, text in items:
            body.append(finding(fid, tag, ftitle, text))
            page_map[fid] = n
        pages.append("".join(body))
    pages.append(bar + "<h2>Scope and Limitations</h2>" + "".join(f"<p>{x}</p>" for x in limitations))
    write(rel, pages, page_map=page_map)


LIMITS = [
    "This is a visual, non-invasive inspection of readily accessible systems and components on the date shown. It is not a "
    "code inspection, an engineering evaluation or a warranty. Concealed conditions, conditions behind finished surfaces, "
    "and conditions that appear only in certain weather may not be found.",
    "Cost information is not part of this report. Obtain estimates from licensed contractors in the relevant trade.",
    "Items rated SAFETY or REPAIR should be evaluated and corrected by licensed professionals before closing.",
    "This report is prepared for the client named on page 1 and is not intended for any other party.",
]


# --- forms ----------------------------------------------------------------------------------------

def blank_addendum(rel, no, kind, ref_date, buyer, seller, prop, terms_html, who, until_time, until_date, signer, signed_at):
    add_box = "[X]" if kind == "ADDENDUM" else "[ ]"
    ctr_box = "[X]" if kind == "COUNTEROFFER" else "[ ]"
    who_s = "[X] Seller [ ] Buyer" if who == "Seller" else "[ ] Seller [X] Buyer"
    page = (
        f"<h1>ADDENDUM NO. {f(no)}<br>TO<br>REAL ESTATE PURCHASE CONTRACT</h1>"
        f"<p>THIS IS AN {add_box} ADDENDUM {ctr_box} COUNTEROFFER to that REAL ESTATE PURCHASE CONTRACT (the \"REPC\") with an "
        f"Offer Reference Date of {f(ref_date)}, including all prior addenda and counteroffers, between {f(buyer)} as Buyer, and "
        f"{f(seller)} as Seller, regarding the Property located at {f(prop)}. The following terms are hereby incorporated as part "
        f"of the REPC:</p><div class='box'>{terms_html}</div>"
        "<p>To the extent the terms of this ADDENDUM modify or conflict with any provisions of the REPC, including all prior addenda "
        "and counteroffers, these terms shall control. All other terms of the REPC, including all prior addenda and counteroffers, not "
        f"modified by this ADDENDUM shall remain the same. {who_s} shall have until {f(until_time)} Mountain Time on {f(until_date)} "
        "(Date), to accept the terms of this ADDENDUM in accordance with the provisions of Section 23 of the REPC. Unless so accepted, "
        "the offer as set forth in this ADDENDUM shall lapse.</p>"
        f"<p class='sig'>[X] Buyer [ ] Seller Signature: {f(signer)} &nbsp; (Date) (Time): {f(signed_at)}</p>"
        "<h3 style='text-align:center'>ACCEPTANCE/COUNTEROFFER/REJECTION</h3>"
        "<p>CHECK ONE:<br>[ ] ACCEPTANCE: [ ] Seller [ ] Buyer hereby accepts the terms of this ADDENDUM.<br>"
        "[ ] COUNTEROFFER: [ ] Seller [ ] Buyer presents as a counteroffer the terms of attached ADDENDUM NO. ____.<br>"
        "[ ] REJECTION: [ ] Seller [ ] Buyer rejects the foregoing ADDENDUM.</p>"
        "<p>(Signature) ____________ (Date) ______ (Time) ______</p>"
        "<p class='foot'>THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, "
        "EFFECTIVE JANUARY 1, 2020. IT REPLACES AND SUPERSEDES ALL PREVIOUSLY APPROVED VERSIONS OF THIS FORM.</p>"
    )
    write(rel, [page], form=True)


def items_html(intro, items, outro=""):
    return f"<p>{intro}</p><ol>" + "".join(f"<li>{i}</li>" for i in items) + f"</ol><p>{outro}</p>"


CONDENSED = ("<p class='small'><i>Condensed practice copy. Sections not shown are the standard form text, unchanged, "
             "and contain no filled-in terms.</i></p>")


def repc_2024(rel, d):
    p1 = (
        "<h1>REAL ESTATE PURCHASE CONTRACT</h1>" + CONDENSED +
        "<p class='small'>This is a legally binding Real Estate Purchase Contract (\"REPC\"). Utah law requires real estate licensees "
        "to use this form. Buyer and Seller, however, may agree to alter or delete its provisions or to use a different form. If you "
        "desire legal or tax advice, consult your attorney or tax advisor.</p>"
        "<h3>EARNEST MONEY DEPOSIT</h3>"
        f"<p>On this {f(d['ref_day'])} day of {f(d['ref_month'])}, 20{f(d['ref_yy'])} (\"Offer Reference Date\") {f(d['buyer'])} "
        f"(\"Buyer\") offers to purchase from {f(d['seller'])} (\"Seller\") the Property described below and agrees to deliver no later "
        "than four (4) calendar days after Acceptance (as defined in Section 23), an Earnest Money Deposit in the amount of "
        f"${f(d['emd'])} in the form of {f('cashier&#39;s check')}.</p>"
        "<h3>OFFER TO PURCHASE</h3>"
        f"<p>1. PROPERTY: {f(d['street'])} City of {f(d['city'])}, County of {f(d['county'])}, State of Utah, Zip {f('84999')} "
        f"Tax ID No. {f(d['tax_id'])} (the \"Property\").</p>"
        "<p>2. PURCHASE PRICE.<br>2.1 Payment of Purchase Price. The Purchase Price for the Property is "
        f"${f(d['price'])}. Except as provided in this Section, the Purchase Price shall be paid as provided in Sections 2.1(a) "
        "through 2.1(e) below.</p><table>"
        f"<tr><td>${f(d['emd'])}</td><td>(a) Earnest Money Deposit. Under certain conditions described in the REPC, this deposit may become totally non-refundable.</td></tr>"
        f"<tr><td>${f('0')}</td><td>(b) Additional Earnest Money Deposit (see Section 8.4 if applicable)</td></tr>"
        f"<tr><td>${f(d['loan'])}</td><td>(c) New Loan. Buyer may apply for mortgage loan financing (the \"Loan\") on terms acceptable to Buyer. Type: {f(d['loan_type'])}</td></tr>"
        f"<tr><td>${f('0')}</td><td>(d) Seller Financing (see attached Seller Financing Addendum)</td></tr>"
        f"<tr><td>${f(d['cash'])}</td><td>(e) Balance of Purchase Price in Cash at Settlement</td></tr>"
        f"<tr><td>${f(d['price'])}</td><td>PURCHASE PRICE. Total of lines (a) through (e)</td></tr></table>"
        "<p>2.2 Sale of Buyer's Property. ... [ ] IS [X] IS NOT conditioned upon the sale of real estate owned by Buyer.</p>"
        f"<p>3.3 Possession. Seller shall deliver physical possession of the Property to Buyer as follows: [X] Upon Recording.</p>"
    )
    p2 = (
        "<p>8. BUYER'S CONDITIONS OF PURCHASE.</p>"
        "<p>8.1 DUE DILIGENCE CONDITION. Buyer's obligation to purchase the Property: [X] IS [ ] IS NOT conditioned upon Buyer's Due "
        "Diligence as defined in this Section 8.1(a) below. This condition is referred to as the \"Due Diligence Condition.\" If checked "
        "in the affirmative, Sections 8.1(a) through 8.1(c) apply; otherwise they do not.</p>"
        "<p>(a) Due Diligence Items. Buyer's Due Diligence shall consist of Buyer's review and approval of the contents of the Seller "
        "Disclosures referenced in Section 7, and any other tests, evaluations and verifications of the Property deemed necessary or "
        "appropriate by Buyer, such as: the physical condition of the Property; ... the condition of the roof, walls, and foundation; the "
        "condition of the plumbing, electrical, mechanical, heating and air conditioning systems and fixtures; ... Unless otherwise "
        "provided in the REPC, all of Buyer's Due Diligence shall be paid for by Buyer and shall be conducted by individuals or entities "
        "of Buyer's choice.</p>"
        "<p>(b) Buyer's Right to Cancel or Resolve Objections. If Buyer determines, in Buyer's sole discretion, that the results of the "
        "Due Diligence are unacceptable, Buyer may either: (i) no later than the Due Diligence Deadline referenced in Section 24(b), "
        "cancel the REPC by providing written notice to Seller, whereupon the Earnest Money Deposit shall be released to Buyer without "
        "the requirement of further written authorization from Seller; or (ii) no later than the Due Diligence Deadline referenced in "
        "Section 24(b), resolve in writing with Seller any objections Buyer has arising from Buyer's Due Diligence.</p>"
        "<p>(c) Failure to Cancel or Resolve Objections. If Buyer fails to cancel the REPC or fails to resolve in writing with Seller any "
        "objections Buyer has arising from Buyer's Due Diligence, as provided in Section 8.1(b), Buyer shall be deemed to have waived the "
        "Due Diligence Condition, and except as provided in Sections 8.2(a) and 8.3(b)(i), the Earnest Money Deposit shall become "
        "non-refundable.</p>"
        "<p>8.2 APPRAISAL CONDITION. Buyer's obligation to purchase the Property: [X] IS [ ] IS NOT conditioned upon the Property "
        "appraising for not less than the Purchase Price.</p>"
        "<p>8.3 FINANCING CONDITION. [ ] (a) No Financing Required. [X] (b) Financing Required. ... (i) ... whereupon "
        f"${f(d['fin_amt'])} of Buyer's Earnest Money Deposit shall be released to Seller ...</p>"
        "<p>8.4 ADDITIONAL EARNEST MONEY DEPOSIT. Buyer: [ ] WILL [X] WILL NOT deliver an Additional Earnest Money Deposit.</p>"
        "<p>9. ADDENDA. There [ ] ARE [X] ARE NOT addenda to the REPC containing additional terms.</p>"
        "<p>10.1 Home Warranty Plan. A one-year Home Warranty Plan [ ] WILL [X] WILL NOT be included in this transaction.</p>"
        "<p>10.2 Condition of Property/Buyer Acknowledgements. Buyer acknowledges and agrees that in reference to the physical "
        "condition of the Property: (a) Buyer is purchasing the Property in its \"As-Is\" condition without expressed or implied "
        "warranties of any kind; (b) Buyer shall have, during Buyer's Due Diligence as referenced in Section 8.1, an opportunity to "
        "completely inspect and evaluate the condition of the Property; and (c) if based on the Buyer's Due Diligence, Buyer elects to "
        "proceed with the purchase of the Property, Buyer is relying wholly on Buyer's own judgment and that of any contractors or "
        "inspectors engaged by Buyer to review, evaluate and inspect the Property.</p>"
        "<p>10.3 Condition of Property/Seller Acknowledgements. Seller acknowledges and agrees that in reference to the physical "
        "condition of the Property, Seller agrees to: (a) disclose in writing to Buyer defects in the Property known to Seller that "
        "materially affect the value of the Property that cannot be discovered by a reasonable inspection by an ordinary prudent Buyer; "
        "(b) carefully review, complete, and provide to Buyer a written Seller property condition disclosure as stated in Section 7(a); "
        "(c) deliver the Property to Buyer in substantially the same general condition as it was on the date of Acceptance, ordinary "
        "wear and tear excepted; ...</p>"
        "<p>11 FINAL PRE-SETTLEMENT WALK-THROUGH INSPECTION. No earlier than seven (7) calendar days prior to Settlement, and upon "
        "reasonable notice and at a reasonable time, Buyer may conduct a final pre-Settlement walk-through inspection of the Property to "
        "determine only that the Property is \"as represented,\" meaning that the items referenced in Sections 1.1, 1.2 and 8.1(b)(ii) "
        "(\"the items\") are respectively present, repaired or corrected as agreed.</p>"
    )
    p3 = (
        "<p>21. TIME IS OF THE ESSENCE. Time is of the essence regarding the dates set forth in the REPC. Extensions must be agreed to in "
        "writing by all parties. Unless otherwise explicitly stated in the REPC: (a) performance under each Section of the REPC which "
        "references a date shall absolutely be required by 5:00 PM Mountain Time on the stated date; and (b) the term \"days\" and "
        "\"calendar days\" shall mean calendar days and shall be counted beginning on the day following the event which triggers the "
        "timing requirement (e.g. Acceptance).</p>"
        "<p>23. ACCEPTANCE. \"Acceptance\" occurs only when all of the following have occurred: (a) Seller or Buyer has signed the offer "
        "or counteroffer where noted to indicate acceptance; and (b) Seller or Buyer or their agent has communicated to the other party "
        "or to the other party's agent that the offer or counteroffer has been signed as required.</p>"
        "<p>24. CONTRACT DEADLINES. Buyer and Seller agree that the following deadlines shall apply to the REPC:</p><table>"
        f"<tr><td>(a) Seller Disclosure Deadline</td><td>{f(d['sdd'])} (Date)</td></tr>"
        f"<tr><td>(b) Due Diligence Deadline</td><td>{f(d['ddd'])} (Date)</td></tr>"
        f"<tr><td>(c) Financing &amp; Appraisal Deadline</td><td>{f(d['fad'])} (Date)</td></tr>"
        f"<tr><td>(d) Settlement Deadline</td><td>{f(d['settle'])} (Date)</td></tr></table>"
        "<p>25. OFFER AND TIME FOR ACCEPTANCE. Buyer offers to purchase the Property on the above terms and conditions. If Seller does "
        f"not accept this offer by: {f(d['offer_exp'])} Mountain Time, this offer shall lapse.</p>"
        f"<p class='sig'>(Buyer's Signature) {f(d['buyer'])} (Date) {f(d['ref_full'])}</p>"
        "<h3 style='text-align:center'>ACCEPTANCE/COUNTEROFFER/REJECTION</h3>"
        "<p>CHECK ONE:<br>[X] ACCEPTANCE OF OFFER TO PURCHASE: Seller Accepts the foregoing offer on the terms and conditions specified "
        "above.<br>[ ] COUNTEROFFER ...<br>[ ] REJECTION ...</p>"
        f"<p class='sig'>(Seller's Signature) {f(d['seller'])} (Date) {f(d['acc_date'])} (Time) {f(d['acc_time'])}</p>"
        "<p class='foot'>THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, "
        "EFFECTIVE DECEMBER 4, 2024.</p>"
    )
    write(rel, [p1, p2, p3], form=True)


def repc_2026(rel, d):
    p1 = (
        "<h1>REAL ESTATE PURCHASE CONTRACT</h1>" + CONDENSED +
        "<p class='small'>This is a legally binding Real Estate Purchase Contract (\"REPC\"). Utah law normally requires real estate "
        "licensees to use this form. If legal counsel for a buyer, seller, lessor, or lessee has prepared legal forms, a real estate "
        "licensee may instead choose to use those legal forms. If you desire legal or tax advice, consult your attorney or tax advisor.</p>"
        f"<p>On this {f(d['ref_full'])} (\"Offer Reference Date\") {f(d['buyer'])} (\"Buyer\") offers to purchase from {f(d['seller'])} "
        f"(\"Seller\") the Property described below. PROPERTY: {f(d['street'])} City of {f(d['city'])}, County of {f(d['county'])}, "
        f"State of Utah, Zip {f('84999')} Tax ID No. {f(d['tax_id'])} (the \"Property\").</p>"
        "<h3>OFFER TO PURCHASE</h3>"
        f"<p>1. PURCHASE PRICE AND PAYMENT. The purchase price (\"Purchase Price\") for the Property is ${f(d['price'])}.</p><table>"
        f"<tr><td>${f(d['emd'])}</td><td>(a) Earnest Money Deposit. Under certain conditions described in the REPC, this deposit may become totally non-refundable.</td></tr>"
        f"<tr><td>${f(d['loan'])}</td><td>(b) New Loan. ... Buyer may be applying for a: [X] Conventional loan [ ] FHA loan [ ] VA loan [ ] USDA loan.</td></tr>"
        f"<tr><td>${f('0')}</td><td>(c) Seller Financing.</td></tr><tr><td>${f('0')}</td><td>(d) Other.</td></tr>"
        f"<tr><td>${f(d['cash'])}</td><td>(e) Balance of Purchase Price in Cash at Settlement.</td></tr>"
        f"<tr><td>${f(d['price'])}</td><td>PURCHASE PRICE. Total of lines (a) through (e).</td></tr></table>"
        "<p>2. SELLER CONTRIBUTIONS.<br>2.1 Real Estate Brokerage Compensation Amount. Seller and Buyer agree that Seller shall "
        "contribute ____% of the gross Purchase Price to Buyer's Brokerage and $________ to Buyer's Brokerage, if applicable.<br>"
        f"2.2 Seller's Contribution to Closing Costs. Seller agrees to contribute at Settlement the amount of ${f(d['seller_contrib'])} "
        "to be applied at Buyer's discretion toward Buyer's Closing Costs as defined in Section 8.3(c), if applicable.<br>"
        "2.3 Home Warranty Plan. (check applicable box): A home warranty plan [ ] WILL [X] WILL NOT be included in this transaction.</p>"
        "<p>3. BUYER CONDITIONS OF PURCHASE. If checked in the affirmative, the following Buyer's conditions of purchase apply:<br>"
        "(a) [X] Due Diligence Condition (see Section 12.1)<br>(b) [X] Appraisal Condition (see Section 12.2)<br>"
        "(c) [X] Financing Condition (see Section 12.3): (i) [X] 50% of the Earnest Money Deposit ...<br>"
        "(d) [ ] Subject to Sale of Buyer's Property Condition.</p>"
        "<p>4. REPC DEADLINES. Buyer and Seller agree that the following deadlines shall apply to the REPC:</p><table>"
        f"<tr><td>(a) Seller Disclosure Deadline</td><td>{f(d['sdd'])} (Date)</td></tr>"
        f"<tr><td>(b) Due Diligence Deadline</td><td>{f(d['ddd'])} (Date)</td></tr>"
        f"<tr><td>(c) Appraisal Deadline</td><td>{f(d['apd'])} (Date)</td></tr>"
        f"<tr><td>(d) Financing Deadline</td><td>{f(d['fid'])} (Date)</td></tr>"
        f"<tr><td>(e) Settlement Deadline</td><td>{f(d['settle'])} (Date)</td></tr>"
        "<tr><td>(f) Possession</td><td>[X] Upon Recording</td></tr></table>"
        "<p>6. ADDENDA. There [ ] ARE [X] ARE NOT addenda to the REPC containing additional terms.</p>"
    )
    p2 = (
        "<p>8.3 (c) Seller's Contribution to Closing Costs. This Section 8.3(c) is only applicable if an amount is entered in Section 2.2 "
        "above. Seller agrees to contribute, at Settlement, the amount indicated in Section 2.2 to be applied at Buyer's discretion toward "
        "any or all of the following: (a) a permanent reduction, or temporary reduction, in the mortgage loan interest rate; (b) mortgage "
        "financing costs; (c) closing costs; and (d) Buyer's prepaid escrow funds (\"Buyer's Closing Costs\"). Any unused portion of "
        "Seller's contribution may, at Buyer's option, be applied to any costs or expenses permitted by Buyer's lender (if applicable), "
        "including a reduction in the Purchase Price.</p>"
        "<p>12. BUYER'S CONDITIONS OF PURCHASE.<br>12.1 Due Diligence Condition. Buyer's obligation to purchase the Property is "
        "conditioned upon Buyer's Due Diligence as defined in this Section 12.1(a) below and ONLY applies if checked in the affirmative "
        "in Section 3(a); otherwise Sections 12.1(a) through 12.1(c) do not apply.</p>"
        "<p>(a) Due Diligence Items. Buyer's Due Diligence shall consist of Buyer's review and approval of the contents of the Seller "
        "Disclosures referenced in Section 11, and any other tests, evaluations and verifications of the Property deemed necessary or "
        "appropriate by Buyer, including, but not limited to: the physical condition of the Property; ... the condition of the roof, "
        "walls, and foundation; the condition of the plumbing, electrical, mechanical, heating and air conditioning systems and fixtures; "
        "...</p>"
        "<p>(b) Buyer's Right to Cancel or Resolve Objections. If Buyer determines, in Buyer's sole discretion, that the results of the "
        "Due Diligence are unacceptable, Buyer may either: (i) no later than the Due Diligence Deadline referenced in Section 4(b), cancel "
        "the REPC by providing written notice to Seller, whereupon the Earnest Money Deposit shall be released to Buyer without the "
        "requirement of further written authorization from Seller; or (ii) no later than the Due Diligence Deadline referenced in "
        "Section 4(b), resolve in writing with Seller any objections Buyer has arising from Buyer's Due Diligence.</p>"
        "<p>(c) Failure to Cancel or Resolve Objections. If Buyer fails to cancel the REPC or fails to resolve in writing with Seller any "
        "objections Buyer has arising from Buyer's Due Diligence, as provided in Section 12.1(b), Buyer shall be deemed to have waived the "
        "Due Diligence Condition, and, except as provided in Sections 12.2(a) and 12.3(a), the Earnest Money Deposit shall become "
        "non-refundable.</p>"
        "<p>13.1 Condition of Property/Buyer Acknowledgements. Buyer acknowledges and agrees that in reference to the physical condition "
        "of the Property: (a) Buyer is purchasing the Property in its \"As-Is\" condition without expressed or implied warranties of any "
        "kind; (b) Buyer shall have, during Buyer's Due Diligence as referenced in Section 12.1, an opportunity to completely inspect and "
        "evaluate the condition of the Property; ...</p>"
        "<p>13.2 Condition of Property/Seller Acknowledgements. ... Seller agrees to: (a) disclose in writing to Buyer defects in the "
        "Property known to Seller that materially affect the value of the Property that cannot be discovered by a reasonable inspection "
        "by an ordinary prudent Buyer; ...</p>"
        "<p>14. FINAL PRE-SETTLEMENT WALK-THROUGH INSPECTION. No earlier than seven (7) calendar days prior to Settlement ... Buyer may "
        "conduct a final pre-Settlement walk-through inspection of the Property to determine only that the Property is \"as "
        "represented,\" meaning that the items referenced in Sections 7.1, 7.2, 7.3 and 12.1(b)(ii) (\"the items\") are respectively "
        "present, repaired or corrected as agreed.</p>"
        "<p>15.1 Alterations/Improvements to the Property. No substantial alterations or improvements to the Property shall be made or "
        "undertaken without prior written consent of Buyer.</p>"
    )
    p3 = (
        "<p>23. ACCEPTANCE. Acceptance occurs only when all of the following have occurred: (a) Buyer or Seller has signed the offer or "
        "counteroffer where noted to indicate acceptance; and (b) the offer or counteroffer has been Received by the other party, or the "
        "other party's respective agent, or by the other party's branch broker or principal broker, no later than the applicable date "
        "referenced in Section 30 or as noted in the counteroffer.</p>"
        "<p>25. TIME IS OF THE ESSENCE. Time is of the essence regarding the dates set forth in the REPC. Any extension of the deadlines "
        "within the REPC must be agreed to in writing by all parties. Unless otherwise explicitly stated in the REPC: (a) performance under "
        "each Section of the REPC which references a date shall absolutely be required by 5:00 PM Mountain Time on the stated date; and "
        "(b) the term \"days\" and \"calendar days\" shall mean calendar days and shall be counted beginning on the day following the event "
        "which triggers the timing requirement (e.g., Acceptance). Buyer and Seller agree that if any dates for the Earnest Money delivery, "
        "Earnest Money Deposit or the Settlement Deadline referenced in this REPC fall on a Saturday, Sunday, or legal holiday, "
        "performance shall be required on the next business day.</p>"
        f"<p>30. ACCEPTANCE DEADLINE. ... If Seller does not accept this offer by: {f(d['offer_exp'])} Mountain Time, this offer shall lapse.</p>"
        f"<p class='sig'>(Buyer's Signature) {f(d['buyer'])} (Date) {f(d['ref_full'])}</p>"
        "<h3 style='text-align:center'>ACCEPTANCE/COUNTEROFFER/REJECTION</h3>"
        "<p>CHECK ONE:<br>[X] ACCEPTANCE OF OFFER TO PURCHASE: Seller Accepts the foregoing offer on the terms and conditions specified "
        "above.<br>[ ] COUNTEROFFER ...<br>[ ] REJECTION ...</p>"
        f"<p class='sig'>(Seller's Signature) {f(d['seller'])} (Date) {f(d['acc_date'])}</p>"
        "<p class='foot'>THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, "
        "EFFECTIVE NOVEMBER 1, 2026. AS OF JANUARY 1, 2027, IT WILL REPLACE AND SUPERSEDE THE PREVIOUSLY APPROVED VERSION OF THIS FORM.</p>"
    )
    write(rel, [p1, p2, p3], form=True)


def disclosure(rel, title_rows, sections, sign_html, page_map):
    """sections: list of pages; each page is a list of (heading, [(qid, question, answer, explanation)])."""
    pages = []
    for n, page in enumerate(sections, start=1):
        body = []
        if n == 1:
            body.append("<h1>Seller's Property Condition Disclosure</h1>"
                        "<p class='small'>Made-up practice form for training. Not a state or association form.</p><table>" +
                        "".join(f"<tr><th style='width:30%'>{k}</th><td>{v}</td></tr>" for k, v in title_rows) + "</table>"
                        "<p class='small'>Seller answers to the best of Seller's actual knowledge. This disclosure is not a warranty and is "
                        "not a substitute for inspections. Answers: Yes, No, or Unknown.</p>")
        for heading, qs in page:
            body.append(f"<h2>{heading}</h2><table><tr><th style='width:7%'>#</th><th>Question</th><th style='width:9%'>Answer</th>"
                        "<th style='width:38%'>Seller's explanation</th></tr>" +
                        "".join(f"<tr><td>{q}</td><td>{t}</td><td>{a}</td><td>{e}</td></tr>" for q, t, a, e in qs) + "</table>")
        if n == len(sections):
            body.append(sign_html)
        pages.append("".join(body))
    write(rel, pages, page_map=page_map)


def bid(rel, co, meta_rows, intro, lines, total_html, terms):
    page = (
        f"<h1>{co['name']}</h1><p class='small'>{co['addr']} | Utah contractor license no. {co['lic']} (made-up)</p>"
        "<h2>Proposal and Estimate</h2><table>" +
        "".join(f"<tr><th style='width:28%'>{k}</th><td>{v}</td></tr>" for k, v in meta_rows) + "</table>"
        f"<p>{intro}</p><table><tr><th>Line</th><th>Scope of work</th><th style='width:16%'>Price</th></tr>" +
        "".join(f"<tr><td>{a}</td><td>{b}</td><td>{c}</td></tr>" for a, b, c in lines) + "</table>" + total_html +
        "<h3>Terms</h3><ul>" + "".join(f"<li>{t}</li>" for t in terms) + "</ul>"
        "<p class='sig'>Accepted by Owner: ______________________ Date: __________</p>"
    )
    write(rel, [page])


# ==================================================================================================
# PRACTICE: 2215 W Example Hollow Ln, Practiceburg (timing priority, one roofing bid)
# ==================================================================================================
P = "practice/"
P_PROP = "2215 W Example Hollow Ln, Practiceburg, Utah 84999"

report(
    P + "02 Inspection Report - 2215 W Example Hollow Ln.pdf",
    {"name": "Example Ember Home Inspections", "addr": "100 Pretend Plaza, Practiceburg, UT", "inspector": "Dakota Pretendo"},
    {"report_no": "EEHI-26-1102", "address": "2215 W Example Hollow Ln", "date": "November 2, 2026",
     "rows": [("Property", P_PROP), ("Client", "Blake Samplesworth"), ("Client's agent", "Reese Fakeworth, Imaginary Peaks Realty"),
              ("Inspection date", "November 2, 2026, 9:00 AM to 12:15 PM"), ("Weather", "Clear, 41 F; dry for the prior 72 hours"),
              ("Home", "Two-story, finished basement, attached two-car garage; year built 2003 (per listing); occupied and furnished"),
              ("Utilities", "On at time of inspection")]},
    [("3.2", "REPAIR", "Lifted and creased shingles on north slope; two shingles missing near ridge", "3"),
     ("4.2", "SAFETY", "Deck stair guardrail loose at bottom post", "4"),
     ("4.3", "SAFETY", "Garage door did not reverse on contact test", "4"),
     ("5.3", "MONITOR", "Efflorescence on east basement foundation wall below window well; dry at inspection", "5"),
     ("8.3", "SAFETY", "Water heater relief valve has no discharge pipe", "8")],
    [
        ("2", "Grounds and Drainage", [
            ("2.1", "INFO", "Grading", "Soil generally slopes away from the foundation on the north, south and west sides."),
            ("2.2", "INFO", "Driveway and walks", "Concrete driveway with typical shrinkage cracks. No trip hazards noted."),
            ("2.3", "MAINTENANCE", "East window well",
             "The east basement window well has no cover. Leaves and soil debris cover the window well drain at the bottom of the well. "
             "Clean the window well and keep the drain clear. A window well cover is recommended. See 5.3."),
        ]),
        ("3", "Roof", [
            ("3.1", "INFO", "Roof covering", "Architectural asphalt shingles. Approximate age 15 years based on the seller's disclosure "
             "and the condition observed. Inspected by drone and from the eaves."),
            ("3.2", "REPAIR", "Damaged and missing shingles",
             "Several shingles on the north slope are lifted and creased, consistent with wind damage. Two shingles are missing near "
             "the ridge, exposing the underlayment. No active leaks were observed in the attic (see 9.1). Recommend evaluation and "
             "repair by a licensed roofing contractor. The remainder of the roof covering appeared serviceable for its age."),
            ("3.3", "INFO", "Flashing and vents", "Flashings at the chimney chase and plumbing vents appeared intact."),
        ]),
        ("4", "Exterior, Deck and Garage", [
            ("4.1", "INFO", "Siding and trim", "Fiber cement siding in serviceable condition."),
            ("4.2", "SAFETY", "Deck stair guardrail",
             "The guardrail on the deck stairs is loose at the bottom post and moves more than 2 inches when pushed. Fall hazard. "
             "Recommend a qualified contractor secure the post and guardrail."),
            ("4.3", "SAFETY", "Garage door auto-reverse",
             "The overhead garage door did not reverse when it contacted a 1.5-inch board placed on the floor. The photo-eye sensors "
             "did reverse the door. Entrapment hazard. Recommend adjustment or repair by a garage door technician."),
        ]),
        ("5", "Structure and Basement", [
            ("5.1", "INFO", "Foundation", "Poured concrete foundation. No significant cracks or displacement observed where visible."),
            ("5.2", "INFO", "Basement", "Basement is finished. Wall and floor coverings limit the view of the foundation."),
            ("5.3", "MONITOR", "East wall efflorescence",
             "White mineral deposits (efflorescence) about 3 feet wide on the exposed foundation wall in the storage closet below the "
             "east window well. Moisture meter readings were dry at the time of inspection. Efflorescence indicates moisture has moved "
             "through the wall in the past. Recommend monitoring, keeping the window well and its drain clear, and a window well "
             "cover (see 2.3)."),
        ]),
        ("6", "Electrical", [
            ("6.1", "INFO", "Service and panel", "200 amp service. Main panel in garage. No deficiencies observed in the panel."),
            ("6.2", "INFO", "Receptacles and GFCI", "Tested receptacles and GFCI devices responded correctly."),
            ("6.3", "INFO", "Smoke and CO alarms", "Smoke alarms present in bedrooms and hallways. CO alarm present on each level."),
        ]),
        ("7", "Heating and Cooling", [
            ("7.1", "INFO", "Furnace", "Gas forced-air furnace, manufactured 2019 per data plate. Operated normally."),
            ("7.2", "INFO", "Air conditioning", "Condenser manufactured 2019. Not operated: outdoor temperature below 60 F."),
            ("7.3", "MAINTENANCE", "Filter", "Filter is dirty. Replace."),
        ]),
        ("8", "Plumbing and Water Heater", [
            ("8.1", "INFO", "Supply and drains", "PEX supply lines; PVC drains. No leaks observed."),
            ("8.2", "INFO", "Water heater", "50-gallon gas water heater manufactured 2016 per data plate. Operating."),
            ("8.3", "SAFETY", "Relief valve discharge",
             "The temperature and pressure relief valve has no discharge pipe attached. If the valve opens, scalding water would "
             "discharge at head height. Recommend a licensed plumber install a discharge pipe."),
        ]),
        ("9", "Attic and Insulation", [
            ("9.1", "INFO", "Roof structure", "No water stains or active leaks observed on the roof deck from the attic."),
            ("9.2", "REPAIR", "Rodent evidence",
             "Rodent droppings observed near the attic hatch and along the north eave. No live activity observed. Recommend "
             "evaluation by a licensed pest control operator and sealing of entry points."),
            ("9.3", "INFO", "Insulation", "Blown-in insulation, approximately 12 inches deep."),
        ]),
        ("10", "Interior", [
            ("10.1", "INFO", "Basement family room carpet",
             "Carpet in the basement family room is stained in an area about 4 by 6 feet near the east wall. The carpet was dry at "
             "the time of inspection."),
            ("10.2", "INFO", "Windows and doors", "Windows and interior doors operated normally where tested."),
        ]),
    ],
    LIMITS,
)

disclosure(
    P + "03 Seller Property Condition Disclosure - 2215 W Example Hollow Ln.pdf",
    [("Property", P_PROP), ("Seller", "Toni Practiceton and Sam Practiceton"), ("Year built", "2003"),
     ("Seller has owned since", "2012"), ("Seller occupies the property", "Yes")],
    [
        [("1. Roof", [("1a", "Approximate age of roof covering", "", "Replaced in 2011 by the prior owner."),
                      ("1b", "Any past or present roof leaks?", "No", ""),
                      ("1c", "Any roof repairs during your ownership?", "No", "")]),
         ("2. Water and Moisture", [
             ("2a", "Any past or present water leakage or moisture in the basement or crawl space?", "Yes",
              "In April 2021, during a heavy rain, the east basement window well filled with water and some water came in under the "
              "window into the storage closet. We cleaned out the window well drain and regraded the soil on the east side in May "
              "2021. No water has come in since."),
             ("2b", "Any flooding, standing water or drainage problems on the lot?", "No", ""),
             ("2c", "Any mold or mold remediation?", "No", "")])],
        [("3. Systems", [("3a", "Any problems with heating or air conditioning?", "No", "Furnace and AC replaced 2019."),
                         ("3b", "Any problems with plumbing or the water heater?", "No", "Water heater installed 2016."),
                         ("3c", "Any problems with electrical systems?", "No", ""),
                         ("3d", "Any problems with the garage door or opener?", "No", "")]),
         ("4. Other", [("4a", "Any known pests, rodents or wood-destroying insects?", "No", ""),
                       ("4b", "Has the property been tested for radon?", "No", ""),
                       ("4c", "Any additions or remodeling during your ownership?", "Yes", "Basement finished in 2014 with a permit.")])],
    ],
    "<h2>Signatures</h2><p>Seller certifies the answers are true to the best of Seller's actual knowledge.</p>"
    "<p class='sig'>Seller: <span class='fill'>Toni Practiceton</span> Date: <span class='fill'>October 20, 2026</span></p>"
    "<p class='sig'>Seller: <span class='fill'>Sam Practiceton</span> Date: <span class='fill'>October 20, 2026</span></p>"
    "<p class='sig'>Buyer acknowledges receipt: <span class='fill'>Blake Samplesworth</span> Date: <span class='fill'>October 21, 2026</span></p>",
    {"2a": 1, "4a": 2},
)

blank_addendum(
    P + "01 Buyer Repair Addendum No 2 - 2215 W Example Hollow Ln.pdf",
    "2", "ADDENDUM", "October 14, 2026", "Blake Samplesworth", "Toni Practiceton and Sam Practiceton", P_PROP,
    items_html(
        "Under Section 8.1(b)(ii) of the REPC, Buyer objects to the following items in the Example Ember Home Inspections report "
        "EEHI-26-1102 dated November 2, 2026, and requests that Seller resolve them as follows. All work to be completed, with paid "
        "invoices delivered to Buyer, no later than five calendar days before the Settlement Deadline.",
        ["Roof (page 3, item 3.2): Seller to have a licensed roofing contractor replace the roof covering.",
         "Deck stair guardrail (page 4, item 4.2): Seller to have a qualified contractor secure the guardrail and post.",
         "Garage door (page 4, item 4.3): Seller to have a garage door technician repair the door so it reverses on contact.",
         "Basement moisture (page 5, item 5.3): Seller to have a licensed foundation contractor evaluate the east foundation wall "
         "and install waterproofing as the contractor recommends.",
         "Water heater (page 8, item 8.3): Seller to have a licensed plumber install a discharge pipe on the relief valve.",
         "Basement carpet (page 10, item 10.1): Seller to replace the basement family room carpet."],
        "Buyer reserves the right to confirm completed work at the final pre-Settlement walk-through."),
    "Seller", "5:00 PM", "November 11, 2026", "Blake Samplesworth", "November 7, 2026, 11:30 AM",
)

bid(
    P + "04 Roofing Bid - Pretend Shingle Roofing.pdf",
    {"name": "Pretend Shingle Roofing Co.", "addr": "77 Makebelieve Way, Practiceburg, UT", "lic": "EX-5005"},
    [("Prepared for", "Toni and Sam Practiceton"), ("Property", P_PROP), ("Date", "November 7, 2026"),
     ("Estimator", "Lane Notarealname"), ("Basis", "Site visit November 6, 2026, and inspection report item 3.2")],
    "We inspected the roof from the surface on November 6, 2026. The north slope has wind-lifted and creased shingles and two "
    "shingles are missing near the ridge. The rest of the roof covering is in serviceable condition. Two options:",
    [("Option 1", "Repair: replace approximately 12 lifted or creased shingles on the north slope, replace 2 missing shingles near "
                  "the ridge with matching architectural shingles, seal exposed nail heads. Photos of completed work provided.", "$1,240.00"),
     ("Option 2", "Full replacement: tear off and replace the roof covering (29 squares) with architectural shingles, new underlayment, "
                  "drip edge and ridge vent. Includes permit and disposal.", "$16,800.00")],
    "<p><b>Choose one option.</b> Option 1 includes a 2-year workmanship warranty on the repaired area. Option 2 includes a 10-year "
    "workmanship warranty.</p>",
    ["Earliest start date: November 30, 2026, weather permitting. Option 1 takes one day; Option 2 takes three days.",
     "This proposal is valid until December 7, 2026.",
     "Payment: 50% deposit at signing, balance on completion. Deposit by ACH to Example Community Bank (made-up), routing "
     "000000000, account 0000123456 (made-up numbers for practice).",
     "Hidden damage to roof decking found during work is billed at $95.00 per sheet with the owner's approval."],
)

# ==================================================================================================
# EVAL 1: 3340 S Example Crest Dr, Sampleton (radon and furnace safety; December 4, 2024 REPC; two bids)
# ==================================================================================================
E1 = "evals/files/eval-1-reasonable-list/"
E1_PROP = "3340 S Example Crest Dr, Sampleton, Utah 84999"

repc_2024(E1 + "REPC - 3340 S Example Crest Dr.pdf", {
    "ref_day": "24th", "ref_month": "October", "ref_yy": "26", "ref_full": "October 24, 2026",
    "buyer": "Jamie Exampleson", "seller": "Casey Placeholder and Robin Placeholder", "emd": "5,000",
    "street": "3340 S Example Crest Dr", "city": "Sampleton", "county": "Mock", "tax_id": "00-000-0000 (made-up)",
    "price": "512,000", "loan": "486,400", "loan_type": "Conventional", "cash": "20,600", "fin_amt": "1,000",
    "sdd": "October 29, 2026", "ddd": "November 12, 2026", "fad": "November 20, 2026", "settle": "December 4, 2026",
    "offer_exp": "9:00 PM on October 25, 2026", "acc_date": "October 25, 2026", "acc_time": "2:40 PM",
})

report(
    E1 + "Inspection Report - 3340 S Example Crest Dr.pdf",
    {"name": "Sample Sparrow Home Inspections", "addr": "12 Fakewood Ave, Sampleton, UT", "inspector": "Avery Sampleton"},
    {"report_no": "SSHI-26-1031", "address": "3340 S Example Crest Dr", "date": "October 31, 2026",
     "rows": [("Property", E1_PROP), ("Client", "Jamie Exampleson"), ("Client's agent", "Drew Sampleman, Mock Ridge Real Estate"),
              ("Inspection date", "October 31, 2026, 10:00 AM to 1:30 PM"), ("Weather", "Overcast, 38 F"),
              ("Home", "Two-story with finished basement; year built 1998 (per listing); about 2,640 finished square feet; occupied"),
              ("Utilities", "On at time of inspection"),
              ("Radon test", "Continuous monitor, October 31, 2026 10:05 AM to November 2, 2026 10:15 AM (see Section 9)")]},
    [("7.2", "SAFETY", "Furnace: cracked heat exchanger; carbon monoxide at supply register; furnace shut off", "7"),
     ("9.1", "SAFETY", "Radon average 6.2 pCi/L, above the EPA action level of 4 pCi/L", "9"),
     ("3.3", "REPAIR", "Northeast downspout discharges against the foundation", "3"),
     ("8.3", "MAINTENANCE", "Water heater sediment noise; flush tank", "8")],
    [
        ("2", "Roof", [
            ("2.1", "INFO", "Roof covering", "Architectural asphalt shingles, estimated 8 to 10 years old. No damage observed."),
            ("2.2", "INFO", "Flashing", "Flashings appeared intact."),
            ("2.3", "MAINTENANCE", "Gutters", "Leaves and debris in the rear gutters. Clean."),
        ]),
        ("3", "Exterior and Grading", [
            ("3.1", "INFO", "Siding", "Fiber cement siding in serviceable condition."),
            ("3.2", "INFO", "Deck", "Composite deck, guardrails secure."),
            ("3.3", "REPAIR", "Downspout", "The northeast downspout discharges directly against the foundation. Add an extension to "
             "carry water at least 4 to 6 feet from the foundation."),
            ("3.4", "INFO", "Driveway", "Minor shrinkage cracks, typical."),
        ]),
        ("4", "Garage", [
            ("4.1", "INFO", "Overhead door", "Auto-reverse and photo-eye sensors responded correctly."),
            ("4.2", "INFO", "Fire door", "Door to the house is self-closing."),
        ]),
        ("5", "Structure and Basement", [
            ("5.1", "INFO", "Foundation", "Poured concrete. Minor vertical shrinkage cracks where visible; no displacement."),
            ("5.2", "INFO", "Basement", "Finished basement. No moisture observed at the time of inspection."),
        ]),
        ("6", "Electrical", [
            ("6.1", "INFO", "Service and panel", "200 amp service; no deficiencies observed in the panel."),
            ("6.2", "INFO", "GFCI", "GFCI protection present and working in kitchen, baths, garage and exterior."),
            ("6.3", "MAINTENANCE", "Cover plate", "One receptacle cover plate missing in the basement storage room. Replace."),
        ]),
        ("7", "Heating and Cooling", [
            ("7.1", "INFO", "Furnace", "Gas forced-air furnace, manufactured 1998 per the data plate (28 years old)."),
            ("7.2", "SAFETY", "Heat exchanger and carbon monoxide",
             "A crack is visible with an inspection camera at the rear of the primary heat exchanger. The burner flame wavered when the "
             "blower started. Carbon monoxide measured 42 ppm at the supply register in the basement family room during operation; "
             "ambient readings were 0 ppm before start-up. The inspector shut the furnace off at the service switch and notified the "
             "listing agent. Do not operate the furnace until it is evaluated. Recommend immediate evaluation and repair or "
             "replacement by a licensed HVAC contractor."),
            ("7.3", "INFO", "Air conditioning", "Condenser manufactured 2015. Not operated: outdoor temperature below 60 F."),
            ("7.4", "INFO", "CO alarms", "CO alarm present in the upstairs hallway and on the main level."),
        ]),
        ("8", "Plumbing", [
            ("8.1", "INFO", "Supply and drains", "PEX supply; ABS drains. No leaks observed."),
            ("8.2", "INFO", "Water heater", "50-gallon gas water heater manufactured 2014. Relief valve and discharge pipe present."),
            ("8.3", "MAINTENANCE", "Sediment", "Popping noise during heating indicates sediment. Flush the tank."),
        ]),
        ("9", "Radon Test", [
            ("9.1", "SAFETY", "Radon result",
             "Continuous radon monitor placed in the basement family room (lowest livable level) from October 31, 2026 at 10:05 AM "
             "to November 2, 2026 at 10:15 AM (48 hours). Closed-house conditions were confirmed with the occupant. Average radon "
             "level: 6.2 pCi/L. Hourly readings ranged from 3.9 to 8.8 pCi/L. The EPA recommends fixing a home at 4 pCi/L or above. "
             "Recommend mitigation by a certified radon mitigation professional, followed by a post-mitigation test."),
        ]),
        ("10", "Interior", [
            ("10.1", "INFO", "Windows", "Windows operated normally where tested."),
            ("10.2", "INFO", "Kitchen", "Range, dishwasher and disposal operated."),
        ]),
    ],
    LIMITS,
)

blank_addendum(
    E1 + "Buyer Objection Addendum No 1 - 3340 S Example Crest Dr.pdf",
    "1", "ADDENDUM", "October 24, 2026", "Jamie Exampleson", "Casey Placeholder and Robin Placeholder", E1_PROP,
    items_html(
        "Under Section 8.1(b)(ii) of the REPC, Buyer objects to the following items in the Sample Sparrow Home Inspections report "
        "SSHI-26-1031 dated October 31, 2026, and requests that Seller resolve them as follows:",
        ["Radon (page 9, item 9.1; average 6.2 pCi/L): Seller to have a certified radon mitigation professional install a radon "
         "mitigation system and provide Buyer a post-mitigation test showing a radon level below 4.0 pCi/L no later than five "
         "calendar days before the Settlement Deadline.",
         "Furnace (page 7, item 7.2): Seller to have a licensed HVAC contractor evaluate the furnace and repair or replace it so it "
         "operates safely, and provide Buyer the contractor's written report and paid invoices no later than five calendar days "
         "before the Settlement Deadline."],
        "Buyer reserves the right to confirm completed work at the final pre-Settlement walk-through."),
    "Seller", "5:00 PM", "November 10, 2026", "Jamie Exampleson", "November 6, 2026, 4:15 PM",
)

bid(
    E1 + "Bid - Pretend Peak Radon.pdf",
    {"name": "Pretend Peak Radon, LLC", "addr": "5 Notreal Rd, Sampleton, UT", "lic": "EX-1001"},
    [("Prepared for", "Casey and Robin Placeholder"), ("Property", E1_PROP), ("Date", "November 7, 2026"),
     ("Mitigator", "Sky Fakerson, NRPP mitigation certification EX-RM-0001 (made-up)"), ("Basis", "Site visit November 7, 2026; test result 6.2 pCi/L")],
    "Sub-slab depressurization system sized for the basement slab.",
    [("1", "Install one suction point in the basement storage room, PVC pipe routed through the garage to above the roof line, "
           "radon fan in the garage attic, U-tube manometer, system labels.", "$1,450.00"),
     ("2", "Post-mitigation test: 48-hour continuous monitor, started at least 24 hours after the system is running. Included.", "$0.00")],
    "<p><b>Total: $1,450.00.</b> Guarantee: post-mitigation result below 4.0 pCi/L, or we add a suction point at no charge.</p>",
    ["Installation within 5 business days of approval; test results 3 days after the test ends.",
     "Valid for 30 days from the date above.", "Payment due on completion by check or card.", "5-year warranty on the radon fan."],
)

bid(
    E1 + "Bid - Make-Believe Heating and Air.pdf",
    {"name": "Make-Believe Heating &amp; Air, Inc.", "addr": "300 Pretend Pkwy, Sampleton, UT", "lic": "EX-2002"},
    [("Prepared for", "Casey and Robin Placeholder"), ("Property", E1_PROP), ("Date", "November 7, 2026"),
     ("Technician", "Robin Notaname"), ("Basis", "Service call November 7, 2026; inspection report item 7.2")],
    "We confirmed a crack in the primary heat exchanger of the 1998 gas furnace. The furnace is tagged out of service and must not "
    "be operated until repaired. Two options:",
    [("Option A", "Replace the primary heat exchanger assembly, then start-up, combustion analysis and carbon monoxide test. Part "
                  "lead time 7 to 10 business days from approval. 1-year labor warranty; the manufacturer's parts warranty has expired.",
      "$2,380.00"),
     ("Option B", "Replace the furnace with a new 80,000 BTU gas furnace. Includes permit, haul-away, start-up, combustion analysis "
                  "and carbon monoxide test. Installed within 3 business days of approval. 10-year parts warranty with manufacturer "
                  "registration; 2-year labor warranty.", "$4,960.00")],
    "<p><b>Choose one option.</b> Given the furnace's age, we recommend Option B.</p>",
    ["Valid for 15 days from the date above.", "Payment: 50% deposit at approval, balance on completion.",
     "Space heaters are not provided."],
)

# ==================================================================================================
# EVAL 2: 781 N Sample Orchard Way, Fictionville (kitchen-sink list; November 1, 2026 REPC; one electrician bid)
# ==================================================================================================
E2 = "evals/files/eval-2-kitchen-sink/"
E2_PROP = "781 N Sample Orchard Way, Fictionville, Utah 84999"

repc_2026(E2 + "REPC - 781 N Sample Orchard Way.pdf", {
    "ref_full": "October 22, 2026", "buyer": "Quinn Exampleton", "seller": "Pat Testwell and Jordan Testwell",
    "street": "781 N Sample Orchard Way", "city": "Fictionville", "county": "Mock", "tax_id": "00-000-0001 (made-up)",
    "price": "468,500", "emd": "4,000", "loan": "444,600", "cash": "19,900", "seller_contrib": "3,000",
    "sdd": "October 29, 2026", "ddd": "November 10, 2026", "apd": "November 19, 2026", "fid": "November 24, 2026",
    "settle": "December 8, 2026", "offer_exp": "8:00 PM on October 23, 2026", "acc_date": "October 23, 2026, 6:10 PM",
})

report(
    E2 + "Inspection Report - 781 N Sample Orchard Way.pdf",
    {"name": "Make-Believe Home Inspection Co.", "addr": "9 Imaginary Ct, Fictionville, UT", "inspector": "Rowan Placeholder"},
    {"report_no": "MBHI-1031-26", "address": "781 N Sample Orchard Way", "date": "October 31, 2026",
     "rows": [("Property", E2_PROP), ("Client", "Quinn Exampleton"), ("Client's agent", "Harper Demo, Pretend Pines Realty"),
              ("Inspection date", "October 31, 2026, 1:00 PM to 4:00 PM"), ("Weather", "Sunny, 52 F"),
              ("Home", "Rambler with partly finished basement and attached garage; year built 1984 (per listing); vacant"),
              ("Utilities", "On at time of inspection")]},
    [("5.4", "SAFETY", "Basement stairway has no handrail", "5"),
     ("6.3", "SAFETY", "Double-tapped breaker in main panel", "6"),
     ("6.4", "SAFETY", "Kitchen countertop receptacles not GFCI protected (safety upgrade)", "6"),
     ("9.2", "SAFETY", "Foil dryer exhaust duct", "9"),
     ("3.1", "MONITOR", "Roof covering in last third of its service life; no leaks", "3"),
     ("8.2", "MONITOR", "Water heater 14 years old; operating", "8")],
    [
        ("2", "Grounds and Drainage", [
            ("2.1", "INFO", "Grading", "Soil slopes away from the foundation."),
            ("2.2", "INFO", "Driveway", "Settlement cracks in the concrete driveway, typical for age. No trip hazards noted. Cosmetic."),
            ("2.3", "NOT", "Irrigation", "The sprinkler system was winterized (blown out) before the inspection, per the listing "
             "agent. Not tested. Ask the seller about its operation."),
            ("2.4", "MAINTENANCE", "Fence gate", "Side yard gate sags and drags. Adjust hinges."),
        ]),
        ("3", "Roof", [
            ("3.1", "MONITOR", "Roof covering",
             "Three-tab asphalt shingles, about 22 years old per the seller. Granule loss and slight curling consistent with age. No "
             "missing shingles. No active leaks observed in the attic. The roof is in the last third of its typical service life. "
             "Budget for replacement."),
            ("3.2", "INFO", "Flashing", "Chimney and vent flashings sealed and intact."),
            ("3.3", "INFO", "Gutters", "Gutters and downspouts intact."),
        ]),
        ("4", "Exterior and Windows", [
            ("4.1", "INFO", "Siding", "Brick and vinyl siding in serviceable condition."),
            ("4.2", "INFO", "Window seals",
             "Failed seals at three insulated glass units (living room picture window and two bedroom windows) cause fogging between "
             "the panes. Cosmetic and efficiency concern; windows operate normally."),
            ("4.3", "MAINTENANCE", "Caulking", "Exterior caulking at window trim is cracked. Re-caulk."),
        ]),
        ("5", "Structure, Basement and Garage", [
            ("5.1", "INFO", "Foundation", "Poured concrete; no significant cracks or displacement observed."),
            ("5.2", "MONITOR", "Garage slab", "Hairline shrinkage cracks in the garage floor slab, typical. No displacement or "
             "height difference. No action needed other than monitoring."),
            ("5.3", "INFO", "Basement", "Basement is partly finished. No moisture observed."),
            ("5.4", "SAFETY", "Basement stair handrail", "The basement stairway (6 risers) has no handrail. Fall hazard. Recommend "
             "a qualified contractor install a graspable handrail."),
        ]),
        ("6", "Electrical", [
            ("6.1", "INFO", "Service and panel", "150 amp service; main panel in garage."),
            ("6.2", "INFO", "Wiring", "Copper branch wiring."),
            ("6.3", "SAFETY", "Double tap", "Two circuits are connected to breaker 14, which is not rated for two conductors (double "
             "tap). Recommend a licensed electrician correct."),
            ("6.4", "SAFETY", "Kitchen GFCI", "The four kitchen countertop receptacles are not GFCI protected. GFCI protection may "
             "not have been required when the home was built. Recommend upgrading for safety."),
            ("6.5", "MAINTENANCE", "Cover plates", "Two receptacle cover plates missing (basement storage and garage). Replace."),
        ]),
        ("7", "Heating and Cooling", [
            ("7.1", "MAINTENANCE", "Furnace", "Gas forced-air furnace, manufactured 2009. Operated normally. Filter is dirty. "
             "Recommend cleaning and service by a licensed HVAC contractor as routine maintenance."),
            ("7.2", "INFO", "Air conditioning", "Condenser manufactured 2009. Operated; temperature split 17 F, within normal range."),
        ]),
        ("8", "Plumbing and Water Heater", [
            ("8.1", "INFO", "Supply and drains", "Copper supply; ABS drains. No leaks observed."),
            ("8.2", "MONITOR", "Water heater", "40-gallon gas water heater manufactured 2012 (14 years old). Operating, no leaks. "
             "Near or past typical service life. Budget for replacement."),
            ("8.3", "MAINTENANCE", "Kitchen faucet", "Kitchen faucet drips. Repair or replace cartridge."),
        ]),
        ("9", "Laundry and Kitchen", [
            ("9.1", "INFO", "Appliances", "Range, dishwasher and disposal operated."),
            ("9.2", "SAFETY", "Dryer exhaust", "The dryer exhausts through a flexible foil duct behind the dryer. Fire safety concern. "
             "Recommend replacing with rigid or semi-rigid metal duct."),
        ]),
        ("10", "Interior", [
            ("10.1", "INFO", "Floor coverings", "Carpet wear in the hallway and family room, typical of age."),
            ("10.2", "INFO", "Doors", "Interior doors operate normally."),
            ("10.3", "INFO", "Smoke alarms", "Smoke alarms present in bedrooms and hallway."),
        ]),
    ],
    LIMITS,
)

blank_addendum(
    E2 + "Buyer Repair Addendum No 1 - 781 N Sample Orchard Way.pdf",
    "1", "ADDENDUM", "October 22, 2026", "Quinn Exampleton", "Pat Testwell and Jordan Testwell", E2_PROP,
    items_html(
        "Under Section 12.1(b)(ii) of the REPC, Buyer objects to the following items from the Make-Believe Home Inspection Co. report "
        "MBHI-1031-26 dated October 31, 2026. Seller to complete each item using licensed contractors and deliver paid invoices to Buyer "
        "no later than five calendar days before the Settlement Deadline:",
        ["Roof (page 3, item 3.1): replace the roof with new architectural shingles.",
         "Electrical panel (page 6, item 6.3): correct the double-tapped breaker.",
         "Kitchen receptacles (page 6, item 6.4): install GFCI protection at the kitchen countertop receptacles.",
         "Cover plates (page 6, item 6.5): replace the missing cover plates.",
         "Water heater (page 8, item 8.2): replace the water heater.",
         "Basement stairs (page 4, item 5.4): install a handrail at the basement stairway.",
         "Dryer exhaust (page 9, item 9.2): replace the dryer duct with rigid metal duct.",
         "Driveway (page 2, item 2.2): repair or resurface the cracked driveway.",
         "Windows (page 4, item 4.2): replace the three fogged insulated glass units.",
         "Sprinklers (page 2, item 2.3): repair sprinkler zone 3, which is not operating.",
         "Garage (page 5, item 5.2): have a licensed foundation contractor repair the foundation crack in the garage.",
         "Carpets: professionally clean all carpets before Settlement.",
         "Home warranty: Seller to provide a one-year home warranty at Settlement.",
         "Furnace and air conditioning (page 7, item 7.1): clean and service the furnace and air conditioner."]),
    "Seller", "5:00 PM", "November 9, 2026", "Quinn Exampleton", "November 7, 2026, 10:20 AM",
)

bid(
    E2 + "Bid - Sample Spark Electric.pdf",
    {"name": "Sample Spark Electric, LLC", "addr": "44 Notreal St, Fictionville, UT", "lic": "EX-3003"},
    [("Prepared for", "Pat and Jordan Testwell"), ("Property", E2_PROP), ("Date", "November 7, 2026"),
     ("Electrician", "Jules Madeupname, licensed master electrician"), ("Basis", "Site visit November 7, 2026; inspection items 6.3 to 6.5")],
    "Itemized proposal. Each line may be approved separately.",
    [("1", "Correct the double tap at breaker 14 by separating the two circuits onto their own breakers.", "$285.00"),
     ("2", "Install GFCI protection for the four kitchen countertop receptacles (two GFCI devices protecting downstream receptacles).", "$295.00"),
     ("3", "Replace two missing receptacle cover plates (basement storage, garage).", "$60.00")],
    "<p><b>Total for all three lines: $640.00.</b></p>",
    ["Work scheduled within 7 days of approval; all three lines take about 2 hours.", "Valid for 30 days from the date above.",
     "Payment due on completion.", "1-year workmanship warranty."],
)

# ==================================================================================================
# EVAL 3: 59 E Placeholder Pines Ct, Mockton (sewer already disclosed; no REPC; one sewer bid)
# ==================================================================================================
E3 = "evals/files/eval-3-already-disclosed/"
E3_PROP = "59 E Placeholder Pines Ct, Mockton, Utah 84999"

report(
    E3 + "Inspection and Sewer Scope Report - 59 E Placeholder Pines Ct.pdf",
    {"name": "Pretend Valley Inspections", "addr": "8 Fictitious Way, Mockton, UT", "inspector": "Sage Notaperson"},
    {"report_no": "PVI-2610-28", "address": "59 E Placeholder Pines Ct", "date": "October 28, 2026",
     "rows": [("Property", E3_PROP), ("Client", "Kai Exampleman"), ("Client's agent", "Jesse Notreal, Fictional Fork Realty"),
              ("Inspection date", "October 28, 2026, 9:30 AM to 1:00 PM; sewer scope 1:00 PM to 1:45 PM"),
              ("Weather", "Light rain overnight; cloudy, 46 F"),
              ("Home", "Two-story with basement; year built 1979 (per listing); occupied"), ("Utilities", "On")]},
    [("8.1 to 8.3", "REPAIR", "Sewer lateral: roots at 38 and 52 feet, offset joint at 52 feet, belly from 61 to 68 feet", "8"),
     ("2.2", "REPAIR", "Cracked plumbing vent boot; active leak below at upstairs hall bath ceiling (see 9.2)", "2"),
     ("5.2", "SAFETY", "Smoke alarms missing in two bedrooms", "5"),
     ("6.2", "MONITOR", "Air conditioner 23 years old; operating", "6")],
    [
        ("2", "Roof", [
            ("2.1", "INFO", "Roof covering", "Asphalt shingles, about 12 years old per the listing. Serviceable."),
            ("2.2", "REPAIR", "Plumbing vent boot", "The rubber boot on the plumbing vent above the upstairs hall bathroom is cracked. "
             "Water staining and elevated moisture readings below this vent (see 9.2) indicate an active leak. Recommend repair by a "
             "licensed roofing contractor."),
            ("2.3", "INFO", "Gutters", "Gutters and downspouts intact."),
        ]),
        ("3", "Exterior", [
            ("3.1", "INFO", "Siding", "Wood siding; paint weathered on the south side. Maintenance."),
            ("3.2", "INFO", "Window wells", "Window wells have covers."),
        ]),
        ("4", "Structure and Basement", [
            ("4.1", "INFO", "Foundation", "Poured concrete; no significant cracks observed."),
            ("4.2", "INFO", "Basement", "Finished basement. No moisture observed."),
        ]),
        ("5", "Electrical and Life Safety", [
            ("5.1", "INFO", "Panel", "200 amp panel; no deficiencies observed."),
            ("5.2", "SAFETY", "Smoke alarms", "No smoke alarms in two of the three upstairs bedrooms. Recommend installing smoke alarms "
             "in each sleeping room."),
        ]),
        ("6", "Heating and Cooling", [
            ("6.1", "INFO", "Furnace", "Gas furnace manufactured 2018. Operated normally."),
            ("6.2", "MONITOR", "Air conditioning", "Condenser manufactured 2003 (23 years old). Operated; temperature split 18 F. "
             "Beyond typical service life. Budget for replacement."),
        ]),
        ("7", "Plumbing", [
            ("7.1", "INFO", "Supply", "Copper supply lines. No leaks observed."),
            ("7.2", "INFO", "Water heater", "Gas water heater manufactured 2020. Operating."),
            ("7.3", "INFO", "Sewer cleanout", "Two-way cleanout in the front yard, used for the sewer scope (Section 8)."),
        ]),
        ("8", "Sewer Scope", [
            ("8.0", "INFO", "Method", "Camera inspection of the sewer lateral from the front yard cleanout toward the city main, 74 "
             "feet. Clay pipe to about 70 feet, then PVC at the connection near the main. Video provided to the client."),
            ("8.1", "REPAIR", "Root intrusion", "Fine roots at the joints at 38 feet and 52 feet. Cut root ends visible, consistent "
             "with past cleaning."),
            ("8.2", "REPAIR", "Offset joint", "Offset joint at 52 feet, about 3/4 inch, with roots entering at the offset."),
            ("8.3", "REPAIR", "Belly", "Belly (sag) from 61 to 68 feet holding standing water to about 30% of the pipe diameter."),
            ("8.4", "INFO", "Recommendation", "Recommend evaluation and repair by a licensed plumbing or sewer contractor."),
        ]),
        ("9", "Interior", [
            ("9.1", "INFO", "Floors and walls", "Typical wear."),
            ("9.2", "REPAIR", "Ceiling stain", "Water stain about 10 by 14 inches on the upstairs hall bathroom ceiling, below the "
             "plumbing vent (see 2.2). Moisture meter readings were elevated (wet) at the time of inspection. Repair the roof leak, then "
             "repair the ceiling."),
        ]),
    ],
    LIMITS,
)

disclosure(
    E3 + "Seller Property Condition Disclosure - 59 E Placeholder Pines Ct.pdf",
    [("Property", E3_PROP), ("Seller", "Lee Samplewood and Dana Samplewood"), ("Year built", "1979"),
     ("Seller has owned since", "2009"), ("Seller occupies the property", "Yes")],
    [
        [("1. Roof", [("1a", "Approximate age of roof covering", "", "Replaced in 2014."),
                      ("1b", "Any past or present roof leaks?", "No", ""),
                      ("1c", "Any roof repairs during your ownership?", "No", "")]),
         ("2. Water and Moisture", [("2a", "Any past or present water leakage or moisture in the basement?", "No", ""),
                                    ("2b", "Any past or present water stains on ceilings?", "No", "")])],
        [("3. Plumbing and Sewer", [
            ("3a", "Any problems with the water supply lines?", "No", ""),
            ("3b", "Any past or present problems with the sewer line or septic system?", "Yes",
             "Tree roots in the sewer line. After a slow drain in the basement, the line was cleared (hydro-jetted) by Example "
             "Rooter in March 2024. No backups since. We recommend periodic cleaning."),
            ("3c", "Connected to public sewer?", "Yes", "")]),
         ("4. Systems", [("4a", "Any problems with heating or air conditioning?", "No", "Air conditioner installed 2003; works."),
                         ("4b", "Any problems with electrical systems?", "No", "")])],
    ],
    "<h2>Signatures</h2><p>Seller certifies the answers are true to the best of Seller's actual knowledge.</p>"
    "<p class='sig'>Seller: <span class='fill'>Lee Samplewood</span> Date: <span class='fill'>September 18, 2026</span></p>"
    "<p class='sig'>Seller: <span class='fill'>Dana Samplewood</span> Date: <span class='fill'>September 18, 2026</span></p>"
    "<p class='sig'>Buyer acknowledges receipt: <span class='fill'>Kai Exampleman</span> Date: <span class='fill'>October 19, 2026</span></p>",
    {"3b": 2, "1b": 1},
)

blank_addendum(
    E3 + "Buyer Repair Addendum No 1 - 59 E Placeholder Pines Ct.pdf",
    "1", "ADDENDUM", "October 20, 2026", "Kai Exampleman", "Lee Samplewood and Dana Samplewood", E3_PROP,
    items_html(
        "Buyer objects to the following items in the Pretend Valley Inspections report PVI-2610-28 dated October 28, 2026, and "
        "requests that Seller resolve them as follows, with paid invoices delivered to Buyer no later than five calendar days before "
        "the Settlement Deadline:",
        ["Sewer lateral (page 8, items 8.1 to 8.3): Seller to have a licensed plumbing contractor replace the sewer lateral from the "
         "house to the city main.",
         "Roof leak (page 2, item 2.2 and page 9, item 9.2): Seller to have a licensed roofing contractor repair the plumbing vent "
         "flashing and have the bathroom ceiling repaired.",
         "Smoke alarms (page 5, item 5.2): Seller to install smoke alarms in the two bedrooms that lack them.",
         "Air conditioner (page 6, item 6.2): Seller to replace the air conditioner condenser."]),
    "Seller", "5:00 PM", "November 9, 2026", "Kai Exampleman", "November 5, 2026, 3:05 PM",
)

bid(
    E3 + "Bid - Placeholder Pipe and Drain.pdf",
    {"name": "Placeholder Pipe &amp; Drain, Inc.", "addr": "61 Imaginary Ln, Mockton, UT", "lic": "EX-4004"},
    [("Prepared for", "Lee and Dana Samplewood"), ("Property", E3_PROP), ("Date", "November 6, 2026"),
     ("Estimator", "Toby Unreal, licensed plumbing contractor"), ("Basis", "Review of the October 28, 2026 sewer scope video")],
    "We reviewed the sewer scope video. Three options:",
    [("Option A", "Excavate at 52 feet; replace about 6 feet of pipe at the offset joint; cut roots at 38 feet. Does not correct the "
                  "belly at 61 to 68 feet.", "$3,850.00"),
     ("Option B", "Option A plus excavate and replace the pipe from 61 to 68 feet to correct the belly.", "$6,400.00"),
     ("Option C", "Replace the full lateral, about 74 feet from the cleanout to the city main, with new PVC. Includes permit, city "
                  "connection inspection and lawn restoration (no hardscape).", "$11,600.00")],
    "<p><b>Choose one option.</b> Prices include a post-repair camera inspection.</p>",
    ["Scheduling: 2 to 3 weeks from approval, subject to the city permit and weather.", "Valid for 30 days from the date above.",
     "Payment: 30% deposit at approval, balance on completion.", "2-year workmanship warranty on new pipe."],
)

with open(os.path.join(HTML_DIR, "pdfs.json"), "w") as fh:
    json.dump(PDFS, fh, indent=1)
with open(os.path.join(HTML_DIR, "page_map.json"), "w") as fh:
    json.dump(PAGE_MAP, fh, indent=1)
print(f"wrote {len(PDFS)} HTML files to {HTML_DIR}")
