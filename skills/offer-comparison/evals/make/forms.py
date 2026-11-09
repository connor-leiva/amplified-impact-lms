"""HTML builders for offer-comparison's made-up files: offers in the layout of both Utah REPCs (December 4,
2024 and November 1, 2026), their addenda, lender letters, proof of funds, a title net sheet, a buyer letter
and a generic non-Utah purchase agreement.

Every file is a list of pages. Each page carries its own form's footer ("Page 2 of 6", initials), so a page
can be left out to make a missing-page test, and the printer (html_to_pdf.cjs) only adds the practice stamp.
The printed text of each state form is shortened; section numbers, checkboxes and footers follow the form.
Every person, street, city, brokerage, lender, bank and title company here is made up.
"""
import html

H = html.escape

CSS = """
@page { size: Letter; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 8.6pt; line-height: 1.32; color: #111; margin: 0; }
.page { height: 9.45in; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; }
.page:last-child { page-break-after: auto; }
.content { flex: 1; }
.foot { font-size: 7.6pt; border-top: 1px solid #999; padding-top: 3px; display: flex; justify-content: space-between; }
.foot2 { font-size: 7.2pt; text-align: center; font-weight: bold; margin-top: 3px; }
h1 { font-size: 12pt; text-align: center; margin: 2px 0 2px; }
h2 { font-size: 9.6pt; text-align: center; margin: 6px 0 3px; }
.note { font-size: 7.4pt; text-align: center; font-style: italic; color: #444; margin-bottom: 4px; }
p { margin: 2px 0 3px; }
.ind { margin-left: 16px; }
.f { font-family: "Courier New", monospace; font-weight: bold; color: #123a8c; }
.sig { font-family: "Courier New", monospace; color: #123a8c; font-weight: bold; }
table.pay td { padding: 1px 6px 1px 0; vertical-align: top; }
table.grid { border-collapse: collapse; width: 100%; margin: 4px 0; }
table.grid td, table.grid th { border: 1px solid #888; padding: 3px 5px; text-align: left; vertical-align: top; }
.right { text-align: right; }
.sigline { margin-top: 10px; display: flex; gap: 24px; }
.sigline div { flex: 1; border-top: 1px solid #333; padding-top: 2px; font-size: 7.6pt; min-height: 12px; }
.lh { font-size: 13pt; font-weight: bold; color: #1d4e3a; }
.lsub { font-size: 7.8pt; color: #444; }
.photo { width: 3.2in; height: 2.1in; border: 1px solid #777; background: #d9d9d9; display: flex; align-items: center;
         justify-content: center; color: #555; font-size: 9pt; margin: 8px 0; }
"""


def f(x):
    """A filled-in blank."""
    return f'<span class="f">{H(str(x))}</span>' if x not in (None, "") else "______"


def cb(on):
    return "[X]" if on else "[ ]"


def money(n):
    if n is None or n == "":
        return ""
    if isinstance(n, str):
        return n
    return f"${n:,.0f}" if float(n).is_integer() else f"${n:,.2f}"


def doc(pages, title):
    body = "\n".join(pages)
    return f"<!doctype html><html><head><meta charset='utf-8'><title>{H(title)}</title><style>{CSS}</style></head><body>{body}</body></html>"


def page(content, foot_left, foot_right="", foot2=""):
    f2 = f'<div class="foot2">{foot2}</div>' if foot2 else ""
    return (f'<div class="page"><div class="content">{content}</div>'
            f'<div class="foot"><span>{foot_left}</span><span>{foot_right}</span></div>{f2}</div>')


# --- the December 4, 2024 REPC layout ----------------------------------------------------------------

def repc24(o):
    """o: dict of terms. Keys used below. Returns a list of 6 pages (with any in o['skip_pages'] left out)."""
    total = 6
    init = o["buyer_initials"]
    no_init = set(o.get("no_initials_pages", []))
    pages = []

    def foot(n):
        bi = "______" if n in no_init else f'<span class="sig">{H(init)}</span>'
        bd = "______" if n in no_init else f'<span class="sig">{H(o["initial_date"])}</span>'
        return (f"Page {n} of {total} pages", f"Buyer's Initials {bi} Date {bd} | Seller's Initials ______ Date ______")

    head = ('<h1>REAL ESTATE PURCHASE CONTRACT</h1><div class="note">Made-up practice file in the layout of the Utah REPC '
            '(form effective December 4, 2024), with shortened printed text. Not the state form.</div>')
    p1 = head + f"""
<h2>EARNEST MONEY DEPOSIT</h2>
<p>On this {f(o['ref_date'])} ("Offer Reference Date") {f(o['buyers'])} ("Buyer") offers to purchase from {f(o['sellers'])} ("Seller") the Property described below and agrees to deliver no later than four (4) calendar days after Acceptance (as defined in Section 23), an Earnest Money Deposit in the amount of {f(money(o['em']))} in the form of {f(o['em_form'])}. After Acceptance of the REPC by Buyer and Seller, and receipt of the Earnest Money by the Brokerage, the Brokerage shall have four (4) calendar days in which to deposit the Earnest Money into the Brokerage Real Estate Trust Account.</p>
<h2>OFFER TO PURCHASE</h2>
<p><b>1. PROPERTY:</b> {f(o['address'])} City of {f(o['city'])}, County of {f(o['county'])}, State of Utah, Zip {f(o['zip'])} Tax ID No. {f(o['tax_id'])} (the "Property").</p>
<p class="ind"><b>1.1 Included Items.</b> Unless excluded herein, this sale includes the fixtures and equipment the printed form lists (plumbing, heating and air conditioning fixtures and equipment, solar panels, ovens, ranges, dishwashers, water heaters, light fixtures, window coverings, garage door openers, security system, fencing and landscaping) if presently owned and in place on the Property.</p>
<p class="ind"><b>1.2 Other Included Items.</b> {cb('washers' in o['incl'])} washers {cb('dryers' in o['incl'])} dryers {cb('refrigerators' in o['incl'])} refrigerators {cb('microwave ovens' in o['incl'])} microwave ovens {cb(bool(o.get('incl_other')))} other (specify) {f(o.get('incl_other'))}. The above checked items shall be conveyed to Buyer under separate bill of sale with warranties as to title.</p>
<p class="ind"><b>1.3 Excluded Items.</b> The following items are excluded from this sale: {f(o.get('excl') or 'None')}</p>
<p class="ind"><b>1.4 Water Service.</b> The Purchase Price includes all water rights/water shares, if any, that are the legal source for Seller's current culinary and irrigation water service. Excluded water rights/water shares: {f(o.get('water_excl') or 'None')}</p>
<p><b>2. PURCHASE PRICE.</b></p>
<p class="ind"><b>2.1 Payment of Purchase Price.</b> The Purchase Price for the Property is {f(money(o['price']))}. Except as provided in this Section, the Purchase Price shall be paid as provided in Sections 2.1(a) through 2.1(e) below. Any amounts shown in Sections 2.1(c) and 2.1(e) may be adjusted as deemed necessary by Buyer and the Lender (the "Lender").</p>
<table class="pay ind">
<tr><td>{f(money(o['em']))}</td><td>(a) Earnest Money Deposit. Under certain conditions described in the REPC, this deposit may become totally non-refundable.</td></tr>
<tr><td>{f(money(o.get('add_em', 0)))}</td><td>(b) Additional Earnest Money Deposit (see Section 8.4 if applicable)</td></tr>
<tr><td>{f(money(o['loan']))}</td><td>(c) New Loan. Buyer may apply for mortgage loan financing (the "Loan") on terms acceptable to Buyer. If an FHA/VA loan applies, see attached FHA/VA Loan Addendum.</td></tr>
<tr><td>{f(money(o.get('seller_fin', 0)))}</td><td>(d) Seller Financing (see attached Seller Financing Addendum)</td></tr>
<tr><td>{f(money(o['cash']))}</td><td>(e) Balance of Purchase Price in Cash at Settlement</td></tr>
<tr><td>{f(money(o['price']))}</td><td><b>PURCHASE PRICE.</b> Total of lines (a) through (e)</td></tr>
</table>
<p class="ind"><b>2.2 Sale of Buyer's Property.</b> Buyer's ability to purchase the Property, to obtain the Loan referenced in Section 2.1(c) above, and/or any portion of the cash referenced in Section 2.1(e) above {cb(o['sale_cond'])} IS {cb(not o['sale_cond'])} IS NOT conditioned upon the sale of real estate owned by Buyer. If checked in the affirmative, the terms of the attached subject to sale of Buyer's property addendum apply.</p>
"""
    poss = o["possession"]
    p2 = f"""
<p><b>3. SETTLEMENT AND CLOSING.</b></p>
<p class="ind"><b>3.1 Settlement.</b> Settlement shall take place no later than the Settlement Deadline referenced in Section 24(d), or as otherwise mutually agreed by Buyer and Seller in writing.</p>
<p class="ind"><b>3.2 Closing.</b> "Closing" means that Settlement has been completed, the proceeds of any new Loan have been delivered to Seller or the escrow/closing office, and the Closing documents have been recorded ("Recording"), no later than four calendar days after Settlement.</p>
<p class="ind"><b>3.3 Possession.</b> Seller shall deliver physical possession of the Property to Buyer as follows: {cb(poss == 'recording')} Upon Recording; {cb(poss[0] == 'hours')} {f(poss[1] if poss[0] == 'hours' else '')} Hours after Recording; {cb(poss[0] == 'days')} {f(poss[1] if poss[0] == 'days' else '')} Calendar Days after Recording. Any contracted rental of the Property prior to or after Closing, between Buyer and Seller, shall be by separate written agreement.</p>
<p><b>4. PRORATIONS / ASSESSMENTS / OTHER PAYMENT OBLIGATIONS.</b></p>
<p class="ind"><b>4.1 Prorations.</b> All prorations, including HOA dues, property taxes for the current year, rents, and interest on assumed obligations, shall be made as of the Settlement Deadline referenced in Section 24(d), unless otherwise agreed to in writing by the parties.</p>
<p class="ind"><b>4.2 Special Assessments.</b> Assessments approved prior to the Settlement Deadline shall be paid for by: {cb(o['assess']=='Seller')} Seller {cb(o['assess']=='Buyer')} Buyer {cb(o['assess']=='Split')} Split Equally Between Buyer and Seller {cb(False)} Other.</p>
<p class="ind"><b>4.3 Fees/Costs/Payment Obligations.</b> (a) Escrow Fees. Unless otherwise agreed in writing, Seller and Buyer shall each pay their respective escrow/closing office fees. (b) Rental deposits and prepaid rents are paid or credited by Seller to Buyer at Settlement.</p>
<p class="ind">(c) HOA/Other Entity Fees Due Upon Change of Ownership (transfer fees, HOA reinvestment fees and similar "change of ownership fees") shall, at Settlement, be paid for by: {cb(o['transfer']=='Seller')} Seller {cb(o['transfer']=='Buyer')} Buyer {cb(o['transfer']=='Split')} Split Equally Between Buyer and Seller {cb(False)} Other. (d) Buyer is responsible for utilities after the Settlement Deadline.</p>
<p class="ind">(e) Real Estate Brokerage Compensation. Seller and Buyer agree that Seller shall contribute {f(o.get('comp_pct'))} % of the Purchase Price to Buyer's Brokerage or {f(money(o.get('comp_amt')))} to Buyer's Brokerage, if applicable ("Seller's Compensation Contribution"). If no amount is entered, then Seller has not agreed to compensate Buyer's Brokerage in the REPC. Buyer agrees that Seller's Compensation Contribution, combined with any other payment from Seller's Brokerage to Buyer's Brokerage, shall not exceed the amount agreed to between Buyer and Buyer's Brokerage in their written buyer-broker agreement.</p>
<p class="ind">(f) Sales Proceeds Withholding. The escrow/closing office is directed to withhold from Seller's proceeds at Closing sufficient funds to pay off Seller's mortgages, trust deeds, liens and real estate brokerage compensation.</p>
<p><b>5. CONFIRMATION OF AGENCY DISCLOSURE.</b> Buyer and Seller acknowledge prior written receipt of agency disclosure provided by their respective agent. Seller's Agent {f(o['seller_agent'])} represents {cb(True)} Seller {cb(False)} both Buyer and Seller as Limited Agent. Seller's Brokerage {f(o['seller_brokerage'])} represents {cb(True)} Seller. Buyer's Agent {f(o['buyer_agent'])} represents {cb(True)} Buyer {cb(False)} both Buyer and Seller as Limited Agent. Buyer's Brokerage {f(o['buyer_brokerage'])} represents {cb(True)} Buyer.</p>
"""
    p3 = f"""
<p><b>6. TITLE & TITLE INSURANCE.</b> Seller represents that Seller has fee title and will convey marketable title at Closing by general warranty deed. At Settlement, Seller agrees to pay for and cause to be issued in favor of Buyer the most current ALTA Homeowner's Policy of Title Insurance (summary of the printed section).</p>
<p><b>7. SELLER DISCLOSURES.</b> No later than the Seller Disclosure Deadline referenced in Section 24(a), Seller shall provide to Buyer the following documents in hard copy or electronic format, collectively referred to as the "Seller Disclosures": (a) a written Seller property condition disclosure, signed and dated by Seller; (b) a Lead-Based Paint Disclosure, if the Property was built prior to 1978; (c) a Commitment for Title Insurance; (d) a copy of any restrictive covenants (CC&Rs), rules and regulations; (e) a copy of the most recent minutes, budget and financial statement for the HOA, if any; (f) through (l) the other items the printed form lists.</p>
<p><b>8. BUYER'S CONDITIONS OF PURCHASE.</b></p>
<p class="ind"><b>8.1 DUE DILIGENCE CONDITION.</b> Buyer's obligation to purchase the Property: {cb(o['dd'])} IS {cb(not o['dd'])} IS NOT conditioned upon Buyer's Due Diligence as defined in this Section 8.1(a) below. This condition is referred to as the "Due Diligence Condition." If checked in the affirmative, Sections 8.1(a) through 8.1(c) apply; otherwise they do not.</p>
<p class="ind">(a) Due Diligence Items. Buyer's Due Diligence shall consist of Buyer's review and approval of the Seller Disclosures and any other tests, evaluations and verifications of the Property deemed necessary or appropriate by Buyer, paid for by Buyer.</p>
<p class="ind">(b) Buyer's Right to Cancel or Resolve Objections. If Buyer determines, in Buyer's sole discretion, that the results of the Due Diligence are unacceptable, Buyer may either: (i) no later than the Due Diligence Deadline referenced in Section 24(b), cancel the REPC by providing written notice to Seller, whereupon the Earnest Money Deposit shall be released to Buyer without the requirement of further written authorization from Seller; or (ii) no later than the Due Diligence Deadline referenced in Section 24(b), resolve in writing with Seller any objections Buyer has arising from Buyer's Due Diligence.</p>
<p class="ind">(c) Failure to Cancel or Resolve Objections. If Buyer fails to cancel the REPC or fails to resolve in writing with Seller any objections Buyer has arising from Buyer's Due Diligence, as provided in Section 8.1(b), Buyer shall be deemed to have waived the Due Diligence Condition, and except as provided in Sections 8.2(a) and 8.3(b)(i), the Earnest Money Deposit shall become non-refundable.</p>
"""
    fin = o["financing"]
    p4 = f"""
<p class="ind"><b>8.2 APPRAISAL CONDITION.</b> Buyer's obligation to purchase the Property: {cb(o['appraisal'])} IS {cb(not o['appraisal'])} IS NOT conditioned upon the Property appraising for not less than the Purchase Price. This condition is referred to as the "Appraisal Condition." If checked in the affirmative, Sections 8.2(a) and 8.2(b) apply; otherwise they do not.</p>
<p class="ind">(a) Buyer's Right to Cancel. If after completion of an appraisal by a licensed appraiser, Buyer receives written notice from the Lender or the appraiser that the Property has appraised for less than the Purchase Price (a "Notice of Appraised Value"), Buyer may cancel the REPC by providing written notice to Seller (with a copy of the Notice of Appraised Value) no later than the Financing &amp; Appraisal Deadline referenced in Section 24(c); whereupon the Earnest Money Deposit shall be released to Buyer. (b) Failure to Cancel. If the REPC is not cancelled as provided in this section 8.2, Buyer shall be deemed to have waived the Appraisal Condition.</p>
<p class="ind"><b>8.3 FINANCING CONDITION.</b> (Check Applicable Box)</p>
<p class="ind">(a) {cb(not fin)} No Financing Required. Buyer's obligation to purchase the Property IS NOT conditioned upon Buyer obtaining financing. If checked, Section 8.3(b) below does NOT apply.</p>
<p class="ind">(b) {cb(fin)} Financing Required. Buyer's obligation to purchase the Property IS conditioned upon Buyer obtaining the Loan referenced in Section 2.1(c). (i) Buyer's Right to Cancel Before the Financing &amp; Appraisal Deadline. If Buyer, in Buyer's sole discretion, is not satisfied with the terms and conditions of the Loan, Buyer may, after the Due Diligence Deadline referenced in Section 24(b), cancel the REPC by providing written notice to Seller no later than the Financing &amp; Appraisal Deadline referenced in Section 24(c); whereupon {f(money(o.get('fin_em_to_seller')))} of Buyer's Earnest Money Deposit shall be released to Seller, and the remainder shall be released to Buyer. (ii) and (iii): if the Loan proceeds have not been delivered after the Financing &amp; Appraisal Deadline, either party may cancel and all of Buyer's Earnest Money Deposit, or Deposits, shall be released to Seller as liquidated damages.</p>
<p class="ind"><b>8.4 ADDITIONAL EARNEST MONEY DEPOSIT.</b> No later than the Due Diligence Deadline, or the Financing &amp; Appraisal Deadline, whichever is later, Buyer: {cb(bool(o.get('add_em')))} WILL {cb(not o.get('add_em'))} WILL NOT deliver to the Buyer's Brokerage an Additional Earnest Money Deposit in the amount of {f(money(o.get('add_em')))}.</p>
<p><b>9. ADDENDA.</b> There {cb(bool(o['addenda24']))} ARE {cb(not o['addenda24'])} ARE NOT addenda to the REPC containing additional terms. If there are, the terms of the following addenda are incorporated into the REPC by this reference: {cb(bool(o.get('add_no')))} Addendum No. {f(o.get('add_no'))} {cb(False)} Seller Financing Addendum {cb(o.get('fha_addendum', False))} FHA/VA Loan Addendum {cb(bool(o.get('add_other')))} Other (specify) {f(o.get('add_other'))}.</p>
<p><b>10. HOME WARRANTY PLAN / AS-IS CONDITION OF PROPERTY.</b></p>
<p class="ind"><b>10.1 Home Warranty Plan.</b> A one-year Home Warranty Plan {cb(bool(o.get('hw')))} WILL {cb(not o.get('hw'))} WILL NOT be included in this transaction. If included, the Home Warranty Plan shall be ordered by {cb(bool(o.get('hw')))} Buyer {cb(False)} Seller and the cost shall not exceed {f(money(o.get('hw')))} and shall be paid for at Settlement by {cb(False)} Buyer {cb(bool(o.get('hw')))} Seller.</p>
<p class="ind"><b>10.2 Condition of Property/Buyer Acknowledgements.</b> Buyer is purchasing the Property in its "As-Is" condition without expressed or implied warranties of any kind, after an opportunity to inspect during Due Diligence. <b>10.3 Seller Acknowledgements.</b> Seller agrees to disclose known defects that materially affect value and cannot be discovered by a reasonable inspection, provide the Seller property condition disclosure, and deliver the Property in substantially the same condition, broom-clean.</p>
"""
    p5 = """
<p><b>11. FINAL PRE-SETTLEMENT WALK-THROUGH INSPECTION.</b> No earlier than seven (7) calendar days prior to Settlement, Buyer may conduct a final walk-through to confirm the Property is "as represented."</p>
<p><b>12. CHANGES DURING TRANSACTION.</b> Seller agrees that no changes in any leases, physical alterations, title changes or further financial encumbrances will be made without Buyer's written consent.</p>
<p><b>13. AUTHORITY OF SIGNERS.</b> Signers for entities and fiduciaries warrant their authority to sign.</p>
<p><b>14. COMPLETE CONTRACT.</b> The REPC together with its addenda, any attached exhibits, and Seller Disclosures constitutes the entire contract between the parties and may not be changed except by written agreement of the parties.</p>
<p><b>15. MEDIATION.</b> Disputes are submitted to mediation as the printed form provides.</p>
<p><b>16. DEFAULT.</b> 16.1 Buyer Default. If Buyer defaults, Seller may elect to retain the Earnest Money Deposit as liquidated damages, sue for specific performance, or return the deposit and pursue other remedies. 16.2 Seller Default. If Seller defaults, Buyer may cancel and receive the deposit plus an equal sum, sue for specific performance, or receive the deposit and pursue other remedies.</p>
<p><b>17. ATTORNEY FEES AND COSTS/GOVERNING LAW.</b> The prevailing party recovers costs and reasonable attorney fees. Utah law governs.</p>
<p><b>18. NOTICES.</b> All notices required under the REPC must be in writing, signed by the party giving notice, and received by the other party or that party's agent no later than the applicable date.</p>
<p><b>19. NO ASSIGNMENT.</b> The REPC may not be assigned by Buyer without Seller's prior written consent, except a Permissible Transfer as the printed form defines it.</p>
<p><b>20. INSURANCE &amp; RISK OF LOSS.</b> 20.1 As of Closing, Buyer is responsible for insurance. 20.2 If damage before Closing would cost more than ten percent (10%) of the Purchase Price to repair, either party may cancel and the deposit is returned to Buyer.</p>
<p><b>21. TIME IS OF THE ESSENCE.</b> Time is of the essence regarding the dates set forth in the REPC. Extensions must be agreed to in writing by all parties. Unless otherwise explicitly stated in the REPC: (a) performance under each Section of the REPC which references a date shall absolutely be required by 5:00 PM Mountain Time on the stated date; and (b) the term "days" and "calendar days" shall mean calendar days and shall be counted beginning on the day following the event which triggers the timing requirement (e.g. Acceptance).</p>
<p><b>22. ELECTRONIC TRANSMISSION AND COUNTERPARTS.</b> The REPC may be executed in counterparts; electronic signatures have the same effect as original signatures.</p>
"""
    sigs = "".join(f'<div>{s}</div>' for s in o["buyer_sigs"])
    p6 = f"""
<p><b>23. ACCEPTANCE.</b> "Acceptance" occurs only when all of the following have occurred: (a) Seller or Buyer has signed the offer or counteroffer where noted to indicate acceptance; and (b) Seller or Buyer or their agent has communicated to the other party or to the other party's agent that the offer or counteroffer has been signed as required.</p>
<p><b>24. CONTRACT DEADLINES.</b> Buyer and Seller agree that the following deadlines shall apply to the REPC:</p>
<table class="pay ind">
<tr><td>(a) Seller Disclosure Deadline</td><td>{f(o['d_sd'])} (Date)</td></tr>
<tr><td>(b) Due Diligence Deadline</td><td>{f(o['d_dd'])} (Date)</td></tr>
<tr><td>(c) Financing &amp; Appraisal Deadline</td><td>{f(o['d_fa'])} (Date)</td></tr>
<tr><td>(d) Settlement Deadline</td><td>{f(o['d_settle'])} (Date)</td></tr>
</table>
<p><b>25. OFFER AND TIME FOR ACCEPTANCE.</b> Buyer offers to purchase the Property on the above terms and conditions. If Seller does not accept this offer by: {f(o['accept_time'])} Mountain Time on {f(o['accept_date'])} (Date), this offer shall lapse; and the Brokerage shall return any Earnest Money Deposit to Buyer.</p>
<div class="sigline">{sigs}</div>
<div class="sigline"><div>(Buyer's Signature) (Date)</div><div>(Buyer's Signature) (Date)</div></div>
<h2>ACCEPTANCE/COUNTEROFFER/REJECTION</h2>
<p>CHECK ONE: [ ] ACCEPTANCE OF OFFER TO PURCHASE: Seller Accepts the foregoing offer on the terms and conditions specified above. [ ] COUNTEROFFER: Seller presents for Buyer's Acceptance the terms of Buyer's offer subject to the exceptions or modifications as specified by the attached ADDENDUM No. ____. [ ] REJECTION: Seller rejects the foregoing offer.</p>
<div class="sigline"><div>(Seller's Signature) (Date) (Time)</div><div>(Seller's Signature) (Date) (Time)</div></div>
"""
    footer_form = ("THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, "
                   "EFFECTIVE DECEMBER 4, 2024.")
    for n, content in enumerate([p1, p2, p3, p4, p5, p6], 1):
        if n in set(o.get("skip_pages", [])):
            continue
        l, r = foot(n)
        pages.append(page(content, l, r, footer_form if n == total else ""))
    return pages


# --- the November 1, 2026 REPC layout ----------------------------------------------------------------

def repc26(o):
    total = 7
    no_init = set(o.get("no_initials_pages", []))
    pages = []

    def foot(n):
        bi = "__________ __________" if n in no_init else f'<span class="sig">{H(o["buyer_initials"])}</span>'
        return (f"Page {n} of {total}", f"Buyer's Initials {bi} | Seller's Initials __________ __________")

    loan_types = o.get("loan_type", "")
    poss = o["possession"]
    pct = o.get("fin_pct")  # None = no box checked, 50 = 50% box, other = the blank
    head = ('<h1>REAL ESTATE PURCHASE CONTRACT</h1><div class="note">Made-up practice file in the layout of the Utah REPC '
            '(form effective November 1, 2026), with shortened printed text. Not the state form.</div>')
    p1 = head + f"""
<p>On this {f(o['ref_date'])} ("Offer Reference Date") {f(o['buyers'])} ("Buyer") offers to purchase from {f(o['sellers'])} ("Seller") the Property described below.
PROPERTY: {f(o['address'])} City of {f(o['city'])}, County of {f(o['county'])}, State of Utah, Zip {f(o['zip'])} Tax ID No. {f(o['tax_id'])} (the "Property").</p>
<h2>OFFER TO PURCHASE</h2>
<p><b>1. PURCHASE PRICE AND PAYMENT.</b> The purchase price ("Purchase Price") for the Property is {f(money(o['price']))}. Except as provided in this Section, the Purchase Price shall be paid as provided in Sections 1(a) through 1(e) below. Any amounts shown in Sections 1(b) through 1(e) may be adjusted as deemed necessary by Buyer and Buyer's Lender (the "Lender").</p>
<table class="pay ind">
<tr><td>{f(money(o['em']))}</td><td>(a) Earnest Money Deposit. Under certain conditions described in the REPC, this deposit may become totally non-refundable.</td></tr>
<tr><td>{f(money(o['loan']))}</td><td>(b) New Loan. Buyer may apply for mortgage loan financing (the "Loan") on terms acceptable to Buyer. If obtaining a Loan, Buyer indicates that Buyer may be applying for a (check applicable box[es]): {cb(loan_types=='Conventional')} Conventional loan {cb(loan_types=='FHA')} FHA loan {cb(loan_types=='VA')} VA loan {cb(loan_types=='USDA')} USDA loan. Only if Buyer and Seller agree to the FHA/VA Loan Addendum will Buyer be able to obtain an FHA/VA loan.</td></tr>
<tr><td>{f(money(o.get('seller_fin', 0)))}</td><td>(c) Seller Financing. (see attached Seller Financing Addendum)</td></tr>
<tr><td>{f(money(o.get('other', 0)))}</td><td>(d) Other. {f(o.get('other_desc'))} (e.g., Home Equity Line of Credit (HELOC), hard money loan, bridge loan, etc.)</td></tr>
<tr><td>{f(money(o['cash']))}</td><td>(e) Balance of Purchase Price in Cash at Settlement.</td></tr>
<tr><td>{f(money(o['price']))}</td><td><b>PURCHASE PRICE.</b> Total of lines (a) through (e).</td></tr>
</table>
<p><b>2. SELLER CONTRIBUTIONS.</b></p>
<p class="ind"><b>2.1 Real Estate Brokerage Compensation Amount.</b> Seller and Buyer agree that Seller shall contribute {f(o.get('comp_pct'))} % of the gross Purchase Price to Buyer's Brokerage and {f(money(o.get('comp_amt')))} to Buyer's Brokerage, if applicable ("Seller's Compensation Contribution").</p>
<p class="ind"><b>2.2 Seller's Contribution to Closing Costs.</b> Seller agrees to contribute at Settlement the amount of {f(money(o.get('concession')))} to be applied at Buyer's discretion toward Buyer's Closing Costs as defined in Section 8.3(c), if applicable.</p>
<p class="ind"><b>2.3 Home Warranty Plan.</b> A home warranty plan {cb(bool(o.get('hw')))} WILL {cb(not o.get('hw'))} WILL NOT be included in this transaction. If a home warranty plan is included, Seller agrees to pay for a home warranty plan selected and ordered by Buyer not to exceed {f(money(o.get('hw')))} at Settlement.</p>
<p><b>3. BUYER CONDITIONS OF PURCHASE.</b> If checked in the affirmative, the following Buyer's conditions of purchase apply:</p>
<p class="ind">(a) {cb(o['dd'])} Due Diligence Condition (see Section 12.1)<br>
(b) {cb(o['appraisal'])} Appraisal Condition (see Section 12.2)<br>
(c) {cb(o['financing'])} Financing Condition (see Section 12.3) (check applicable box):<br>
&nbsp;&nbsp;&nbsp;&nbsp;(i) {cb(pct == 50)} 50% of the Earnest Money Deposit; or {cb(pct not in (None, 50))} {f(pct if pct not in (None, 50) else '')} % of the Earnest Money Deposit described below shall be released to Seller if Buyer cancels the REPC in accordance with Section 12.3(a). If no box is checked, then the percentage shall be 50%.<br>
(d) {cb(bool(o.get('sale_addr')))} Subject to Sale of Buyer's Property Condition. Buyer's ability to purchase the Property is conditioned upon the use of any proceeds from the sale of real property currently owned by Buyer located at: {f(o.get('sale_addr'))}. If checked in the affirmative, Buyer shall include a subject to sale of Buyer's Property addendum. If no such addendum is attached, then this condition shall NOT apply.</p>
<p><b>4. REPC DEADLINES.</b> Buyer and Seller agree that the following deadlines shall apply to the REPC:</p>
<table class="pay ind">
<tr><td>(a) Seller Disclosure Deadline</td><td>{f(o['d_sd'])} (Date)</td></tr>
<tr><td>(b) Due Diligence Deadline</td><td>{f(o['d_dd'])} (Date)</td></tr>
<tr><td>(c) Appraisal Deadline</td><td>{f(o['d_appr'])} (Date)</td></tr>
<tr><td>(d) Financing Deadline</td><td>{f(o['d_fin'])} (Date)</td></tr>
<tr><td>(e) Settlement Deadline</td><td>{f(o['d_settle'])} (Date)</td></tr>
<tr><td>(f) Possession</td><td>{cb(poss == 'recording')} Upon Recording; {cb(poss[0] == 'hours')} {f(poss[1] if poss[0] == 'hours' else '')} Hours after Recording; {cb(poss[0] == 'days')} {f(poss[1] if poss[0] == 'days' else '')} Calendar Days after Recording.</td></tr>
</table>
"""
    title_em = o.get("em_title", False)
    p2 = f"""
<p><b>5. EARNEST MONEY DEPOSIT.</b> No later than four (4) calendar days after Acceptance (as defined in Section 23), Buyer agrees to deliver an Earnest Money Deposit ("Earnest Money Deposit") in the form of {f(o['em_form'])} to Buyer's Brokerage. Buyer's Brokerage then shall have four (4) calendar days in which to deposit the Earnest Money Deposit into Buyer's Brokerage Real Estate Trust Account or with a {cb(title_em)} Title Insurance Company. If depositing the Earnest Money Deposit with a Title Insurance Company, see attached Deposit of Earnest Money with Title Insurance Company Addendum. If the Earnest Money Deposit is not delivered or deposited within the timeframe described above, Seller may, in Seller's sole discretion, cancel the REPC and pursue any remedies available at law.</p>
<p><b>6. ADDENDA.</b> There {cb(bool(o['addenda26']))} ARE {cb(not o['addenda26'])} ARE NOT addenda to the REPC containing additional terms. If there are, the terms of the following addenda are incorporated into the REPC by this reference: {cb(bool(o['addenda26']))} Addendum/Addenda No[s]. {f(o['addenda26'])}.</p>
<p><b>7. INCLUDED ITEMS/WATER.</b></p>
<p class="ind"><b>7.1 Included Items.</b> Unless excluded herein, this sale includes the fixtures and equipment the printed form lists (plumbing, heating and air conditioning, solar panels, ovens, ranges, microwave ovens, dishwashers, water heaters, light fixtures, window coverings, garage door openers, fencing, sheds and landscaping) if presently owned and in place on the Property. <b>7.2 Home Automation Systems.</b> Smart home devices in place on the Property are included as the printed form provides.</p>
<p class="ind"><b>7.3 Other Included Items.</b> {cb('washers' in o['incl'])} washers {cb('dryers' in o['incl'])} dryers {cb('refrigerators' in o['incl'])} refrigerators {cb('ev' in o['incl'])} electric vehicle charging stations and associated equipment {cb(bool(o.get('incl_other')))} other (specify) {f(o.get('incl_other'))}. The items of any unchecked boxes above shall be excluded.</p>
<p class="ind"><b>7.4 Excluded Items.</b> The following items are excluded from this sale: {f(o.get('excl') or 'None')}</p>
<p class="ind"><b>7.5 Water Service.</b> The Purchase Price includes all water rights/water shares, if any, that are the legal source for Seller's current culinary, irrigation and secondary water service to the Property.</p>
<p><b>8. PRORATIONS / ASSESSMENTS / OTHER PAYMENT OBLIGATIONS.</b></p>
<p class="ind"><b>8.1 Prorations.</b> All prorations shall be made as of the Settlement Deadline referenced in Section 4(e), unless otherwise agreed to in writing by the parties.</p>
<p class="ind"><b>8.2 Special Assessments.</b> Any special assessment approved prior to the Settlement Deadline shall be paid for by: {cb(o['assess']=='Seller')} Seller {cb(o['assess']=='Buyer')} Buyer {cb(o['assess']=='Split')} Split Equally Between Buyer and Seller {cb(False)} Other.</p>
<p class="ind"><b>8.3 Fees/Costs/Payment Obligations.</b> (a) Change of ownership fees shall be paid for at Settlement by: {cb(o['transfer']=='Seller')} Seller {cb(o['transfer']=='Buyer')} Buyer {cb(o['transfer']=='Split')} Split Equally Between Buyer and Seller {cb(False)} Other.</p>
"""
    p3 = """
<p class="ind">(b) Real Estate Brokerage Compensation. This Section 8.3(b) is only applicable if an amount is entered in Section 2.1 above. If no amount is entered, then Seller has not agreed to compensate Buyer's Brokerage in the REPC. If Seller's Compensation Contribution exceeds the written buyer-broker agreement, the excess amount shall be returned to Seller.</p>
<p class="ind">(c) Seller's Contribution to Closing Costs. This Section 8.3(c) is only applicable if an amount is entered in Section 2.2 above. Seller agrees to contribute, at Settlement, the amount indicated in Section 2.2 to be applied at Buyer's discretion toward any or all of the following: (a) a permanent reduction, or temporary reduction, in the mortgage loan interest rate; (b) mortgage financing costs; (c) closing costs; and (d) Buyer's prepaid escrow funds ("Buyer's Closing Costs"). Any unused portion of Seller's contribution may, at Buyer's option, be applied to any costs or expenses permitted by Buyer's lender (if applicable), including a reduction in the Purchase Price.</p>
<p class="ind">(d) Escrow Fees. Unless otherwise agreed in writing, Seller and Buyer shall each pay their respective escrow/closing office fees. (e) Rental deposits and prepaid rents are credited to Buyer at Settlement. (f) Buyer is responsible for utilities after the Settlement Deadline. (g) Escrow is directed to withhold from Seller's proceeds funds to pay off Seller's mortgages, liens and brokerage compensation. (h) Buyer is not obligated to assume Seller's personal service agreements.</p>
<p><b>9. SETTLEMENT AND CLOSING.</b></p>
<p class="ind"><b>9.1 Settlement.</b> Settlement shall take place no later than the Settlement Deadline referenced in Section 4(e), or as otherwise mutually agreed by Buyer and Seller in writing.</p>
<p class="ind"><b>9.2 Closing.</b> "Closing" means Settlement has been completed, the proceeds of any new Loan have been delivered, and the Closing documents have been recorded ("Recording"), no later than four calendar days after Settlement.</p>
<p class="ind"><b>9.3 Possession.</b> Seller shall deliver physical possession of the Property to Buyer as indicated in Section 4(f). Any contracted rental of the Property between Buyer and Seller shall be by separate written agreement or addendum to the REPC. Unless modified in writing, Buyer and Seller agree that the holdover fee shall be $ ______ or $300 per day, whichever is greater.</p>
<p><b>10. TITLE &amp; TITLE INSURANCE.</b> Seller will convey marketable title by general warranty deed and pay for the ALTA Homeowner's Policy of Title Insurance for Buyer (summary of the printed section).</p>
<p><b>11. SELLER DISCLOSURES.</b> No later than the Seller Disclosure Deadline referenced in Section 4(a), Seller shall provide to Buyer the Seller Disclosures the printed form lists (a written seller property condition disclosure, a Commitment for Title Insurance, HOA documents, leases, water rights evidence and the other listed items).</p>
"""
    p4 = """
<p><b>12. BUYER'S CONDITIONS OF PURCHASE.</b></p>
<p class="ind"><b>12.1 Due Diligence Condition.</b> Buyer's obligation to purchase the Property is conditioned upon Buyer's Due Diligence and ONLY applies if checked in the affirmative in Section 3(a). (b) Buyer's Right to Cancel or Resolve Objections. If Buyer determines, in Buyer's sole discretion, that the results of the Due Diligence are unacceptable, Buyer may either: (i) no later than the Due Diligence Deadline referenced in Section 4(b), cancel the REPC by providing written notice to Seller, whereupon the Earnest Money Deposit shall be released to Buyer without the requirement of further written authorization from Seller; or (ii) no later than the Due Diligence Deadline referenced in Section 4(b), resolve in writing with Seller any objections Buyer has arising from Buyer's Due Diligence. (c) Failure to Cancel or Resolve Objections. If Buyer fails to cancel the REPC or fails to resolve in writing with Seller any objections, Buyer shall be deemed to have waived the Due Diligence Condition, and, except as provided in Sections 12.2(a) and 12.3(a), the Earnest Money Deposit shall become non-refundable.</p>
<p class="ind"><b>12.2 Appraisal Condition.</b> Buyer's obligation to purchase the Property is conditioned upon the Property appraising for not less than the Purchase Price and ONLY applies if checked in the affirmative in Section 3(b). (a) Buyer's Right to Cancel. If after completion of an appraisal by a licensed appraiser, Buyer receives written notice from the Lender or the appraiser that the Property has appraised for less than the Purchase Price, Buyer may cancel the REPC by providing written notice to Seller, along with a complete copy of the appraisal, no later than the Appraisal Deadline referenced in Section 4(c); whereupon the Earnest Money Deposit shall be released to Buyer. (b) Failure to Cancel. If the REPC is not cancelled as provided in this Section 12.2, Buyer shall be deemed to have waived the Appraisal Condition.</p>
<p class="ind"><b>12.3 Financing Condition.</b> Buyer's obligation to purchase the Property is conditioned upon Buyer obtaining financing and ONLY applies if checked in the affirmative in Section 3(c). (a) Buyer's Right to Cancel Before the Financing Deadline. If Buyer, in Buyer's sole discretion, is not satisfied with the terms and conditions of the Loan, Buyer may, after the Due Diligence Deadline referenced in Section 4(b), if applicable, cancel the REPC by providing written notice to Seller no later than the Financing Deadline referenced in Section 4(d); whereupon the Earnest Money Deposit shall be released to Seller according to the percentage in Section 3(c)(i). The remainder of the Earnest Money Deposit shall be released to Buyer. (b) and (c): if the Loan proceeds have not been delivered after the Financing Deadline, either party may cancel and all of the Earnest Money Deposit shall be released to Seller as liquidated damages.</p>
<p><b>13. AS-IS CONDITION OF PROPERTY.</b> Buyer is purchasing the Property in its "As-Is" condition, after an opportunity to inspect during Due Diligence. Seller agrees to disclose known defects that materially affect value and cannot be discovered by a reasonable inspection, and to deliver the Property in substantially the same condition, broom-clean.</p>
<p><b>14. FINAL PRE-SETTLEMENT WALK-THROUGH INSPECTION.</b> No earlier than seven (7) calendar days prior to Settlement, Buyer may conduct a final walk-through inspection.</p>
"""
    p5 = """
<p><b>15. CHANGES DURING TRANSACTION.</b> No changes in leases, physical alterations, title changes or further encumbrances without Buyer's written consent.</p>
<p><b>16. AUTHORITY OF SIGNERS.</b> Signers for entities and fiduciaries warrant their authority to sign.</p>
<p><b>17. COMPLETE CONTRACT.</b> The REPC together with its addenda, any attached exhibits, and Seller Disclosures constitutes the entire contract between the parties and may not be changed except by written agreement of the parties.</p>
<p><b>18. MEDIATION.</b> Disputes are submitted to mediation as the printed form provides.</p>
<p><b>19. DEFAULT.</b> If Buyer defaults, Seller may elect to retain the Earnest Money Deposit as liquidated damages, sue for specific performance, or return the deposit and pursue other remedies. If Seller defaults, Buyer may cancel and receive the deposit plus an equal sum, sue for specific performance, or receive the deposit and pursue other remedies.</p>
<p><b>20. ATTORNEY FEES AND COSTS/GOVERNING LAW.</b> The prevailing party recovers costs and reasonable attorney fees. Utah law governs.</p>
<p><b>21. NO ASSIGNMENT.</b> The REPC may not be assigned by Buyer without Seller's prior written consent, except a Permissible Transfer as the printed form defines it.</p>
<p><b>22. NOTICES.</b> All notices required under the REPC must be: (a) in writing; (b) signed by the Buyer or Seller giving notice; and (c) Received by Buyer or Seller, their respective agent, or the branch broker or principal broker representing Buyer or Seller, no later than the applicable deadline. If delivered electronically, a notice, offer, or counteroffer is "Received" when it enters an information processing system (e.g., email server) that the recipient has designated or uses for that purpose.</p>
<p><b>23. ACCEPTANCE.</b> Acceptance occurs only when all of the following have occurred: (a) Buyer or Seller has signed the offer or counteroffer where noted to indicate acceptance; and (b) the offer or counteroffer has been Received by the other party, or the other party's respective agent, or by the other party's branch broker or principal broker, no later than the applicable date referenced in Section 30 or as noted in the counteroffer.</p>
<p><b>24. INSURANCE &amp; RISK OF LOSS.</b> As of Closing, Buyer is responsible for insurance. If damage before Closing would cost more than ten percent (10%) of the Purchase Price to repair, either party may cancel and the deposit is returned to Buyer.</p>
"""
    p6 = f"""
<p><b>25. TIME IS OF THE ESSENCE.</b> Time is of the essence regarding the dates set forth in the REPC. Any extension of the deadlines within the REPC must be agreed to in writing by all parties. Unless otherwise explicitly stated in the REPC: (a) performance under each Section of the REPC which references a date shall absolutely be required by 5:00 PM Mountain Time on the stated date; and (b) the term "days" and "calendar days" shall mean calendar days and shall be counted beginning on the day following the event which triggers the timing requirement (e.g., Acceptance). Buyer and Seller agree that if any dates for the Earnest Money delivery, Earnest Money Deposit or the Settlement Deadline referenced in this REPC fall on a Saturday, Sunday, or legal holiday, performance shall be required on the next business day.</p>
<p><b>26. SECTION 1031 TAX DEFERRED EXCHANGE.</b> Each party shall cooperate with the other party's exchange, at no cost or delay to that party.</p>
<p><b>27. ELECTRONIC TRANSMISSION AND COUNTERPARTS.</b> The REPC may be executed in counterparts; electronic signatures have the same effect as original signatures.</p>
<p><b>28. CONFIRMATION OF AGENCY DISCLOSURE.</b> Buyer and Seller acknowledge prior written receipt of agency disclosure provided by their respective agent. Seller's Agent(s) {f(o['seller_agent'])} represent(s) {cb(True)} Seller. Seller's Brokerage {f(o['seller_brokerage'])} represents {cb(True)} Seller. Buyer's Agent(s) {f(o['buyer_agent'])} represent(s) {cb(True)} Buyer. Buyer's Brokerage {f(o['buyer_brokerage'])} represents {cb(True)} Buyer.</p>
<p><b>29. DISCLOSURE OF INTEREST.</b> Buyer is: {cb(False)} a relative of a real estate broker or sales agent participating in this transaction; {cb(False)} a real estate broker or sales agent licensed in Utah.</p>
"""
    sigs = "".join(f'<div>{s}</div>' for s in o["buyer_sigs"])
    p7 = f"""
<p><b>30. ACCEPTANCE DEADLINE.</b> Buyer offers to purchase the Property on the above terms and conditions. If Seller does not accept this offer by: {f(o['accept_time'])} Mountain Time on {f(o['accept_date'])} (Date), this offer shall lapse.</p>
<div class="sigline">{sigs}</div>
<div class="sigline"><div>(Buyer's Signature) (Date)</div><div>(Buyer's Signature) (Date)</div></div>
<h2>ACCEPTANCE/COUNTEROFFER/REJECTION</h2>
<p>CHECK ONE: [ ] ACCEPTANCE OF OFFER TO PURCHASE: Seller Accepts the foregoing offer on the terms and conditions specified above. [ ] COUNTEROFFER: Seller presents for Buyer's Acceptance the terms of Buyer's offer subject to the exceptions or modifications specified in the attached ADDENDUM NO. ____. [ ] REJECTION: Seller rejects the foregoing offer.</p>
<div class="sigline"><div>(Seller's Signature) (Date)</div><div>(Seller's Signature) (Date)</div></div>
"""
    footer_form = ("THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, "
                   "EFFECTIVE NOVEMBER 1, 2026. AS OF JANUARY 1, 2027, IT WILL REPLACE AND SUPERSEDE THE PREVIOUSLY "
                   "APPROVED VERSION OF THIS FORM.")
    for n, content in enumerate([p1, p2, p3, p4, p5, p6, p7], 1):
        if n in set(o.get("skip_pages", [])):
            continue
        l, r = foot(n)
        pages.append(page(content, l, r, footer_form if n == total else ""))
    return pages


# --- addenda ------------------------------------------------------------------------------------------

def fha_addendum(o, version):
    """version '2020' (with Section 6 closing costs) or '2026' (no closing costs; Section 4 cancellation)."""
    dl = "Financing &amp; Appraisal Deadline" if version == "2020" else "Appraisal Deadline"
    sec4_extra = ("" if version == "2020" else
                  " In the event the appraisal required repairs exceed the amount in this Section 4 of this Addendum, Buyer shall not "
                  "be obligated to complete the purchase of the Property and shall have the right to cancel the REPC by providing written "
                  "notice to Seller no later than the Appraisal Deadline, whereupon the Earnest Money Deposit shall be released to Buyer.")
    sec6 = (f"<p>6. Seller shall contribute at Settlement an amount to be applied at Buyer's discretion to any or all of the following: (a) a permanent reduction, or temporary reduction, in the mortgage loan interest rate; (b) mortgage financing costs; and (c) Prepaids/Escrows (\"Closing Costs\"). The amount of Seller's contribution shall be {f(money(o.get('fha_cc')))}. Any unused portion of Seller's contribution may, at Buyer's option, be used to reduce the Purchase Price.</p>"
            if version == "2020" else "")
    eff = ("EFFECTIVE NOVEMBER 18, 2020. AS OF JANUARY 1, 2021, IT WILL REPLACE AND SUPERSEDE THE PREVIOUSLY APPROVED VERSION OF THIS FORM."
           if version == "2020" else
           "EFFECTIVE NOVEMBER 1, 2026, IT WILL REPLACE AND SUPERSEDE THE PREVIOUSLY APPROVED VERSION OF THIS FORM AS OF JANUARY 1, 2027.")
    sigs = "".join(f'<div>{s}</div>' for s in o["buyer_sigs"])
    content = f"""
<h1>FHA/VA LOAN ADDENDUM # {f(o['fha_no'])} TO REAL ESTATE PURCHASE CONTRACT</h1>
<div class="note">Made-up practice file in the layout of the Utah FHA/VA Loan Addendum ({'effective November 18, 2020' if version == '2020' else 'effective November 1, 2026'}), with shortened printed text. Not the state form.</div>
<p>THIS IS AN ADDENDUM to that REAL ESTATE PURCHASE CONTRACT (the "REPC") with an Offer Reference Date of {f(o['ref_date'])}, including all prior addenda and counteroffers, between {f(o['buyers'])} as Buyer, and {f(o['sellers'])} as Seller, regarding the Property located at {f(o['address'])}. The following terms are hereby incorporated as part of the REPC.</p>
<p>1. Buyer intends to occupy the Property as Buyer's primary residence.</p>
<p>2. Buyer is applying for (Check applicable box): {cb(o['loan_type']=='FHA')} an FHA loan; or {cb(o['loan_type']=='VA')} a VA loan.</p>
<p>3. Notwithstanding the {dl} (if applicable), Buyer SHALL NOT be obligated to complete the purchase of the Property or incur any penalty or forfeiture of the Earnest Money Deposit or other down payment, or otherwise be obligated to purchase the Property, if: (a) for a VA loan, the Purchase Price exceeds the reasonable value of the Property established by the VA; or (b) for an FHA loan, the Purchase Price exceeds the appraised value of the Property (excluding closing costs) established by the FHA appraisal. Buyer shall, however, have the right to complete the sale without regard to the amount of the appraised valuation.</p>
<p>4. Seller shall make any and all appraisal required repairs, provided that the cost does not exceed {f(money(o.get('fha_repairs')))}.{sec4_extra}</p>
<p>5. If required by applicable FHA or VA rules, Seller shall furnish Buyer with a current Pest Control Report. In the event of termite infestation, Seller shall eradicate the same and repair any damage at Seller's expense, provided that the cost does not exceed {f(money(o.get('fha_termite')))}. This amount is in addition to any amount indicated in Section 4.</p>
{sec6}
<p>{'7' if version == '2020' else '6'}. [APPLIES TO FHA ONLY] The undersigned certify that the terms of the REPC are true to the best of their knowledge and belief, and that any other agreement entered into by any of the parties has been fully disclosed and is attached to the REPC.</p>
<p>To the extent the terms of this ADDENDUM modify or conflict with any provisions of the REPC, including all prior addenda and counteroffers, these terms shall control. All other terms of the REPC shall remain the same. {cb(True)} Seller shall have until {f(o['accept_time'])} Mountain Time on {f(o['accept_date'])} to accept the terms of this ADDENDUM in accordance with the provisions of Section 23 of the REPC. Unless so accepted, the offer as set forth in this ADDENDUM shall lapse.</p>
<div class="sigline">{sigs}</div>
<div class="sigline"><div>Buyer Signature (Date) (Time)</div><div>Buyer Signature (Date) (Time)</div></div>
<div class="sigline"><div>Seller Signature (Date) (Time)</div><div>Seller Signature (Date) (Time)</div></div>
"""
    return [page(content, "Page 1 of 1", "", "THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, " + eff)]


def blank_addendum(o, number, terms, sigs, kind="ADDENDUM"):
    tl = "".join(f"<p>{i}. {t}</p>" for i, t in enumerate(terms, 1))
    s = "".join(f'<div>{x}</div>' for x in sigs)
    content = f"""
<h1>ADDENDUM NO. {f(number)} TO REAL ESTATE PURCHASE CONTRACT</h1>
<div class="note">Made-up practice file in the layout of the Utah Blank Addendum (effective January 1, 2020), with shortened printed text. Not the state form.</div>
<p>{cb(kind == 'ADDENDUM')} ADDENDUM {cb(kind == 'COUNTEROFFER')} COUNTEROFFER</p>
<p>THIS IS AN {f(kind)} to that REAL ESTATE PURCHASE CONTRACT (the "REPC") with an Offer Reference Date of {f(o['ref_date'])}, including all prior addenda and counteroffers, between {f(o['buyers'])} as Buyer, and {f(o['sellers'])} as Seller, regarding the Property located at {f(o['address'])}. The following terms are hereby incorporated as part of the REPC:</p>
{tl}
<p>BUYER AND SELLER AGREE THAT THE CONTRACT DEADLINES REFERENCED IN SECTION 24 OF THE REPC (CHECK APPLICABLE BOX): [X] REMAIN UNCHANGED [ ] ARE CHANGED AS FOLLOWS: ______</p>
<p>To the extent the terms of this ADDENDUM modify or conflict with any provisions of the REPC, including all prior addenda and counteroffers, these terms shall control. All other terms of the REPC, including all prior addenda and counteroffers, not modified by this ADDENDUM shall remain the same. [X] Seller [ ] Buyer shall have until {f(o['accept_time'])} Mountain Time on {f(o['accept_date'])} to accept the terms of this ADDENDUM in accordance with the provisions of Section 23 of the REPC. Unless so accepted, the offer as set forth in this ADDENDUM shall lapse.</p>
<div class="sigline">{s}</div>
<div class="sigline"><div>Buyer Signature (Date) (Time)</div><div>Buyer Signature (Date) (Time)</div></div>
<p>ACCEPTANCE/COUNTEROFFER/REJECTION. CHECK ONE: [ ] ACCEPTANCE [ ] COUNTEROFFER [ ] REJECTION</p>
<div class="sigline"><div>Seller Signature (Date) (Time)</div><div>Seller Signature (Date) (Time)</div></div>
"""
    return [page(content, "Page 1 of 1", "",
                 "THIS FORM APPROVED BY THE UTAH REAL ESTATE COMMISSION AND THE OFFICE OF THE UTAH ATTORNEY GENERAL, EFFECTIVE JANUARY 1, 2020.")]


def brokerage_addendum(title, form_id, brokerage, o, terms, sigs, number=None, ref_label="REPC", footer_note=""):
    """A buyer brokerage's own addendum (escalation, sale of buyer's property): not a state form."""
    tl = "".join(f"<p>{i}. {t}</p>" for i, t in enumerate(terms, 1))
    s = "".join(f'<div>{x}</div>' for x in sigs)
    num = f" No. {f(number)}" if number else ""
    content = f"""
<div class="lh">{H(brokerage)}</div><div class="lsub">Brokerage form {H(form_id)} (made-up brokerage)</div>
<h1>{H(title)}{num}</h1>
<p>This addendum is made part of the {ref_label} with an Offer Reference Date of {f(o['ref_date'])} between {f(o['buyers'])} ("Buyer") and {f(o['sellers'])} ("Seller") for the Property at {f(o['address'])}.</p>
{tl}
<p>Where this addendum conflicts with the {ref_label}, this addendum controls. All other terms remain the same.</p>
<div class="sigline">{s}</div>
<div class="sigline"><div>Buyer Signature (Date)</div><div>Buyer Signature (Date)</div></div>
<div class="sigline"><div>Seller Signature (Date)</div><div>Seller Signature (Date)</div></div>
"""
    return [page(content, f"{H(form_id)} Page 1 of 1", footer_note)]


def lender_letter(L):
    rows = "".join(f"<tr><th>{H(k)}</th><td>{v}</td></tr>" for k, v in L["rows"])
    conds = "".join(f"<li>{H(c)}</li>" for c in L.get("conditions", []))
    body = "".join(f"<p>{p}</p>" for p in L["body"])
    content = f"""
<div class="lh">{H(L['lender'])}</div><div class="lsub">{H(L['lender_sub'])}</div>
<p style="margin-top:14px">{H(L['date'])}</p>
<h1 style="text-align:left">{H(L['title'])}</h1>
<table class="grid">{rows}</table>
{body}
{'<p><b>Conditions:</b></p><ul>' + conds + '</ul>' if conds else ''}
<p style="margin-top:16px">{H(L['signer'])}<br>{H(L['signer_title'])}<br>{H(L.get('signer_contact', ''))}</p>
<p class="lsub" style="margin-top:10px">{H(L.get('fine', ''))}</p>
"""
    return [page(content, H(L["lender"]), "Page 1 of 1")]


def buyer_letter(B):
    paras = "".join(f"<p>{p}</p>" for p in B["paras"])
    content = f"""
<p style="margin-top:20px">{H(B['date'])}</p>
<h1 style="text-align:left">{H(B['title'])}</h1>
{paras}
<div class="photo">[Photo: {H(B['photo'])}]</div>
<p>{H(B['sign'])}</p>
"""
    return [page(content, "", "")]


def net_sheet(N):
    rows = "".join(
        f"<tr><td>{H(k)}</td><td>{H(basis)}</td><td class='right'>{money(v) if not isinstance(v, str) else H(v)}</td></tr>"
        for k, basis, v in N["lines"])
    content = f"""
<div class="lh">{H(N['company'])}</div><div class="lsub">{H(N['company_sub'])}</div>
<h1 style="text-align:left">Seller's Estimated Net Sheet</h1>
<table class="grid">{''.join(f"<tr><th>{H(k)}</th><td>{H(v)}</td></tr>" for k, v in N['head'])}</table>
<table class="grid"><tr><th>Item</th><th>Basis</th><th class="right">Amount</th></tr>
<tr><td><b>Sale price</b></td><td>Per offer terms above</td><td class="right"><b>{money(N['price'])}</b></td></tr>
{rows}
<tr><td><b>Total estimated seller charges</b></td><td></td><td class="right"><b>{money(N['total'])}</b></td></tr>
<tr><td><b>Estimated net proceeds to Seller</b></td><td></td><td class="right"><b>{money(N['net'])}</b></td></tr>
</table>
{''.join(f'<p class="lsub">{H(x)}</p>' for x in N['notes'])}
"""
    return [page(content, H(N["company"]), "Page 1 of 1")]
