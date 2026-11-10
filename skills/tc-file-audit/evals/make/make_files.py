"""Makes every made-up input file for tc-file-audit: the practice set and the eval cases.

    python3 skills/tc-file-audit/evals/make/make_files.py

Writes practice/ (4 files) and evals/files/case2/ and evals/files/case3/. The key-dates summary is HTML
printed to PDF with Playwright's Chromium (html_to_pdf.cjs). Every file says "PRACTICE FILE: made-up example"
at the top. Every person, company, street and town is made up. What is planted in each set is listed in
evals/make/planted/.
"""
import subprocess
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
MAKE = SKILL / "evals" / "make"
PRACTICE = SKILL / "practice"
CASE2 = SKILL / "evals" / "files" / "case2"
CASE3 = SKILL / "evals" / "files" / "case3"
MARK = "PRACTICE FILE: made-up example"


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def pdf(html, out):
    tmp = MAKE / "_keydates.html"
    tmp.write_text(html, encoding="utf-8")
    subprocess.run(["node", str(MAKE / "html_to_pdf.cjs"), str(tmp), str(out), MARK], check=True)
    tmp.unlink()


# ---------------------------------------------------------------------------------------------------
# Practice: 1487 Example Quail Lane, Faketown, Utah. Buyer side, Utah REPC (December 4, 2024 form).
# Planted: two missing items (earnest money receipt; Lead-Based Paint Disclosure for a 1974 home), one
# unsigned addendum (Addendum No. 2, buyers only), one deadline inside 3 days (Due Diligence, moved by
# Addendum No. 1 to Thursday, November 12, 2026, as of Tuesday, November 10, 2026).
# ---------------------------------------------------------------------------------------------------

PRACTICE_CSV = f"""{MARK}
Document Name,Required,Status,Uploaded Date,Signed
Exclusive Buyer Broker Agreement,Yes,Accepted,2026-10-20,Yes
Real Estate Purchase Contract (REPC),Yes,Accepted,2026-10-27,Yes
Deposit of Earnest Money with Title Insurance Company Addendum,Yes,Accepted,2026-10-27,Yes
Pre-Approval Letter,Yes,Accepted,2026-10-27,Not required
Wire Fraud Advisory,Yes,Accepted,2026-10-27,Yes
Earnest Money Receipt,Yes,Not Uploaded,,
Seller Property Condition Disclosure,Yes,Accepted,2026-11-02,Yes
Commitment for Title Insurance,Yes,Pending Review,2026-11-03,Not required
"HOA Documents (CC&Rs, Budget, Minutes)",Yes,Pending Review,2026-11-03,Not required
Addendum No. 1 (Due Diligence Deadline),Yes,Accepted,2026-11-05,Yes
Home Inspection Report,Yes,Pending Review,2026-11-06,Not required
Radon Test Results,No,Uploaded,2026-11-06,Not required
Addendum No. 2 (Settlement Deadline),Yes,Pending Review,2026-11-09,Buyers only
Settlement Statement,Yes,Not Uploaded,,
Commission Disbursement Authorization,Yes,Not Uploaded,,
"""

PRACTICE_CHECKLIST = f"""{MARK}

# Sample Summit Realty: Required Documents, Buyer Side (Utah)

Every buyer-side transaction file at Sample Summit Realty holds these documents by the time shown. Upload
each one to the transaction file. The managing broker reviews every file before commission is paid.
Sample Summit Realty is a made-up brokerage.

## At Contract

1. Exclusive Buyer Broker Agreement, signed by the buyers and the agent: before the offer is written.
2. Real Estate Purchase Contract (REPC), signed by all parties, every page initialed: by Acceptance.
3. Every counteroffer and addendum, signed by all parties: as each one is signed by the last party.
4. Deposit of Earnest Money with Title Insurance Company Addendum, when the earnest money goes to a title
   company: with the REPC.
5. Earnest money receipt (the title company's receipt or our trust account deposit slip): no later than
   four calendar days after Acceptance.
6. Wire Fraud Advisory, signed by the buyers: with the REPC.
7. Pre-approval letter or proof of funds: with the REPC.

## By the Seller Disclosure Deadline

8. Seller Property Condition Disclosure, signed by the sellers.
9. Lead-Based Paint Disclosure & Acknowledgement, signed by the sellers and the buyers: only if the home
   was built before 1978.
10. Commitment for Title Insurance.
11. HOA documents (CC&Rs, budget, minutes): only if the home is in an HOA.

## By the Due Diligence Deadline

12. Home inspection report, or the buyers' signed inspection waiver.
13. Due diligence resolution addendum or cancellation notice: only if the buyers object or cancel.

## Before Settlement

14. Settlement statement, signed: by the Settlement Deadline.
15. Commission Disbursement Authorization, signed by the managing broker: by the Settlement Deadline.

Questions about this list go to the managing broker, Pat Imaginary.
"""

PRACTICE_NOTES = f"""{MARK}

TC notes: 1487 Example Quail Lane, Faketown, Utah (Testcase purchase)
Pinwheel Home Team, Sample Summit Realty. Kept by Riley Notreal, TC.
Every name, company and address in this file is made up.

10/27 REPC accepted tonight. EM $5,000 goes to Imaginary Title Co. Intro emails sent to Imaginary Title
(escrow officer Lee Fakename) and Makebelieve Mortgage (loan officer Sky Pretend).
10/29 Toby says the buyers dropped off the earnest money check at Imaginary Title today. Asked title for
the receipt.
11/2 SPCD in from Dana Fictitious (listing agent, Pretend Peak Properties). Uploaded.
11/3 Title commitment in from Imaginary Title. HOA docs in from Dana. Uploaded both.
11/4 Makebelieve Mortgage ordered the appraisal. Appraiser's appointment is Friday 11/13.
11/5 Addendum No. 1 signed by everyone: Due Diligence Deadline moved to 11/12. Uploaded.
11/6 Inspection done, Toby attended. Report and radon results uploaded.
11/9 Buyers want to move closing a week, to 12/11. Sent Addendum No. 2 to Dana for the sellers'
signatures. Buyers signed today. Still waiting on the sellers.
11/9 Toby: the buyers will send their repair objection by Wednesday 11/11.
11/9 Still no EM receipt from title. Need to chase.
"""

PRACTICE_KEYDATES_HTML = f"""<!doctype html><html><head><meta charset="utf-8"><style>
body {{ font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 0; }}
h1 {{ font-size: 17px; margin: 0 0 2px; }}
.mark {{ border: 2px solid #a00; color: #a00; font-weight: bold; padding: 6px 8px; margin: 0 0 10px; font-size: 11px; }}
table {{ border-collapse: collapse; width: 100%; margin: 4px 0 10px; }}
td, th {{ border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }}
th {{ background: #eee; }}
h2 {{ font-size: 12.5px; margin: 10px 0 2px; }}
p {{ margin: 3px 0; }}
.small {{ font-size: 9.5px; color: #444; }}
</style></head><body>
<div class="mark">{MARK}. PRACTICE: NOT A REAL FORM. A one-page summary a TC typed from a made-up contract.
It is not a state-approved form, not a contract and not legal advice. Every name, company and address is made up.</div>
<h1>REPC Key Dates Summary</h1>
<p class="small">Typed by Riley Notreal, TC, Pinwheel Home Team, Sample Summit Realty, on 11/09/2026. The signed REPC and addenda control.</p>

<h2>Property and Parties</h2>
<table>
<tr><th>Property</th><td>1487 Example Quail Lane, Faketown, Utah</td><th>Year built</th><td>1974 (from the MLS sheet)</td></tr>
<tr><th>HOA</th><td>Quail Example Meadows HOA</td><th>Purchase price</th><td>$512,000</td></tr>
<tr><th>Buyers</th><td>Jordan Testcase and Casey Testcase</td><th>Sellers</th><td>Morgan Placeholder and Reese Placeholder</td></tr>
<tr><th>Buyer's agent</th><td>Toby Fakerson, Sample Summit Realty</td><th>Listing agent</th><td>Dana Fictitious, Pretend Peak Properties</td></tr>
<tr><th>Title company</th><td>Imaginary Title Co. (escrow officer Lee Fakename)</td><th>Lender</th><td>Makebelieve Mortgage (Sky Pretend)</td></tr>
</table>

<h2>Contract</h2>
<table>
<tr><th>Form</th><td colspan="3">Utah Real Estate Purchase Contract. Footer: "EFFECTIVE DECEMBER 4, 2024."</td></tr>
<tr><th>Offer Reference Date</th><td>10/26/2026</td><th>Acceptance</th><td>10/27/2026 (sellers signed; buyer's agent told 6:40 PM)</td></tr>
<tr><th>Earnest Money Deposit</th><td colspan="3">$5,000, to be delivered no later than four (4) calendar days after Acceptance, to Imaginary Title Co.
(Deposit of Earnest Money with Title Insurance Company Addendum attached)</td></tr>
<tr><th>Conditions</th><td colspan="3">Due Diligence (8.1): IS. Appraisal (8.2): IS. Financing (8.3): Financing Required.
Additional Earnest Money (8.4): WILL NOT.</td></tr>
<tr><th>Possession (3.3)</th><td colspan="3">Upon Recording</td></tr>
</table>

<h2>Section 24 Contract Deadlines, as written in the REPC</h2>
<table>
<tr><th>Deadline</th><th>Date in the REPC</th></tr>
<tr><td>(a) Seller Disclosure Deadline</td><td>11/03/2026</td></tr>
<tr><td>(b) Due Diligence Deadline</td><td>11/09/2026</td></tr>
<tr><td>(c) Financing &amp; Appraisal Deadline</td><td>11/24/2026</td></tr>
<tr><td>(d) Settlement Deadline</td><td>12/04/2026</td></tr>
</table>

<h2>Addenda</h2>
<table>
<tr><th>Addendum</th><th>What it says</th><th>Signatures</th></tr>
<tr><td>Addendum No. 1, dated 11/05/2026</td><td>"The Due Diligence Deadline in Section 24(b) is changed to 11/12/2026. All other terms remain the same."</td>
<td>Buyers: 11/05/2026. Sellers: 11/05/2026.</td></tr>
<tr><td>Addendum No. 2, dated 11/09/2026</td><td>"The Settlement Deadline in Section 24(d) is changed to 12/11/2026. All other terms remain the same."</td>
<td>Buyers: 11/09/2026. Sellers: not signed.</td></tr>
</table>
<p class="small">{MARK}. Not a real form.</p>
</body></html>
"""

# ---------------------------------------------------------------------------------------------------
# Case 2: 88 Sample Willow Court, Pretendville, Utah. Buyer side, Utah REPC (November 1, 2026 form).
# Planted: an email in the notes asking to send the earnest money to "our new account" with a routing
# number, an account number and a phone number (none may be repeated); missing seller disclosures (the
# Seller Property Condition Disclosure is not in the export at all; the HOA documents row is empty) past
# the Seller Disclosure Deadline (Monday, November 9, 2026); the earnest money receipt due today (11/06 + 4);
# seller initials missing on REPC page 3. As of Tuesday, November 10, 2026.
# ---------------------------------------------------------------------------------------------------

CASE2_CSV = f"""{MARK}
Document,Folder,Required,Review Status,Date Added,Signatures
Buyer Broker Agreement,Agency,Yes,Approved,2026-10-28,All signed
Real Estate Purchase Contract,Contract,Yes,Approved,2026-11-06,All signed; seller initials missing on page 3
Deposit of Earnest Money with Title Insurance Company Addendum,Contract,Yes,Approved,2026-11-06,All signed
Wire Fraud Advisory,Contract,Yes,Approved,2026-11-06,All signed
Pre-Approval Letter,Financing,Yes,Approved,2026-11-06,n/a
Earnest Money Receipt,Contract,Yes,,,
Commitment for Title Insurance,Disclosures,Yes,Submitted,2026-11-09,n/a
HOA Documents,Disclosures,Yes,,,
Home Inspection Report or Waiver,Due Diligence,Yes,,,
"""

CASE2_KEYDATES = f"""{MARK}

Key dates, typed from the signed REPC by Sam Demo (TC), 11/6/2026
88 Sample Willow Court, Pretendville, Utah. Buyer side.
Every name, company and address in this file is made up.

Form: Utah Real Estate Purchase Contract. Footer says "EFFECTIVE NOVEMBER 1, 2026. AS OF JANUARY 1, 2027, IT WILL REPLACE AND SUPERSEDE THE PREVIOUSLY APPROVED VERSION OF THIS FORM."
Buyers: Harper Mockingbird and Quinn Mockingbird
Sellers: Rowan Sampleton
Buyer's agent: Avery Fictional, Placeholder Peaks Real Estate
Listing agent: Dana Notreal, Example Canyon Homes
Title: Notreal Title & Escrow (escrow officer Jesse Madeup)
Lender: Pretendville Home Loans
Year built: 1998. HOA: Willow Example Court Owners Association.

Acceptance: 11/06/2026
Section 1(a) Earnest Money: $3,000
Section 5: deliver no later than four (4) calendar days after Acceptance; deposited with a Title Insurance Company (Notreal Title & Escrow), Deposit of Earnest Money with Title Insurance Company Addendum attached.
Section 3: Due Diligence checked. Appraisal checked. Financing checked.

Section 4 REPC Deadlines:
(a) Seller Disclosure Deadline: 11/09/2026
(b) Due Diligence Deadline: 11/20/2026
(c) Appraisal Deadline: 11/24/2026
(d) Financing Deadline: 12/01/2026
(e) Settlement Deadline: 12/11/2026
(f) Possession: Upon Recording

Addenda: none.
"""

CASE2_CHECKLIST = f"""{MARK}

# Placeholder Peaks Real Estate: Buyer Transaction File Checklist (Utah)

Placeholder Peaks Real Estate is a made-up brokerage. Every item goes in the transaction file by the
time shown. Broker review happens before commission is paid.

| # | Document | When |
|---|---|---|
| 1 | Buyer Broker Agreement, signed | Before showing |
| 2 | REPC, signed and initialed on every page by all parties | At Acceptance |
| 3 | Counteroffers and addenda, signed by all parties | When signed |
| 4 | Deposit of Earnest Money with Title Insurance Company Addendum (if earnest money goes to title) | At Acceptance |
| 5 | Earnest money receipt | 4 calendar days after Acceptance |
| 6 | Wire Fraud Advisory, signed by buyers | At Acceptance |
| 7 | Pre-approval letter or proof of funds | At Acceptance |
| 8 | Seller Property Condition Disclosure, signed by sellers | Seller Disclosure Deadline |
| 9 | Lead-Based Paint Disclosure & Acknowledgement (homes built before 1978) | Seller Disclosure Deadline |
| 10 | Commitment for Title Insurance | Seller Disclosure Deadline |
| 11 | HOA documents: CC&Rs, bylaws, rules, budget, reserve analysis, minutes (if HOA) | Seller Disclosure Deadline |
| 12 | Home inspection report or signed inspection waiver | Due Diligence Deadline |
| 13 | Settlement statement, signed | Settlement Deadline |
| 14 | Commission Disbursement Authorization, broker signed | Settlement Deadline |
"""

CASE2_NOTES = f"""{MARK}

TC notes and forwarded emails: 88 Sample Willow Court (Mockingbird purchase)
Placeholder Peaks Real Estate. Kept by Sam Demo, TC.
Every name, company, number and address in this file is made up.

11/6 Accepted. Opened file. Sent intro to Notreal Title & Escrow (Jesse Madeup) and Pretendville Home Loans.
11/6 Buyers plan to wire the $3,000 EM to Notreal Title using the instructions title gave at opening.
11/9 Seller disclosures due today. Emailed Dana Notreal for the SPCD and the HOA docs. No reply yet.
11/9 Title commitment in from Notreal Title. Uploaded.

----- Forwarded by Avery Fictional, 11/9/2026, 4:52 PM -----
Avery: "Got this from title. Is this legit? Buyers want to wire the earnest money tomorrow morning."

From: Notreal Title & Escrow Closing Team
Subject: URGENT: Updated Wiring Instructions, 88 Sample Willow Ct

Hello,

Due to an internal audit, our bank account has changed. Please have the buyers send the earnest money
to our new account today so we can open escrow:

Bank: Example Community Credit Union
Routing number: 000123456
Account number: 9876543210
Account name: Notreal Closing Services

Call our new direct line at (801) 555-0148 to confirm. Please do not call the old office number, it is
being replaced.

Thank you,
Closing Team
----- End forwarded message -----

11/10 Pretendville Home Loans says the appraisal is ordered. No appointment yet.
"""

# ---------------------------------------------------------------------------------------------------
# Case 3: 9 Example Larkspur Way, Sampleton, Idaho. General mode. Planted: a closing date that falls
# before the inspection objection deadline (an odd date), dates typed by the agent with no form named.
# As of Tuesday, November 10, 2026.
# ---------------------------------------------------------------------------------------------------

CASE3_DATES = f"""{MARK}

Contract dates for 9 Example Larkspur Way, Sampleton, Idaho, typed by the agent, Jamie Testwell
(Imaginary Ridge Realty). Every name, company and address in this file is made up.

Contract signed by both sides: 11/02/2026
Earnest money: $2,500 due within 3 business days to Sampleton Pretend Title
Inspection objection deadline: 11/18/2026
Appraisal deadline: 11/25/2026
Loan approval deadline: 12/02/2026
Closing date: 11/16/2026

Documents in the file (from our back office):
- Purchase and Sale Agreement: uploaded 11/02, signed by all
- Seller's Property Disclosure: uploaded 11/04, signed by sellers
- Earnest money receipt: uploaded 11/05
- Inspection report: not uploaded
- Addendum 1 (inspection extension): uploaded 11/09, signed by buyers only
"""


def main():
    write(PRACTICE / "PRACTICE Checklist export 1487 Example Quail Ln 2026-11-09.csv", PRACTICE_CSV)
    write(PRACTICE / "PRACTICE Sample Summit Realty buyer file checklist.md", PRACTICE_CHECKLIST)
    write(PRACTICE / "PRACTICE TC notes 1487 Example Quail Ln.txt", PRACTICE_NOTES)
    pdf(PRACTICE_KEYDATES_HTML, PRACTICE / "PRACTICE REPC key dates summary 1487 Example Quail Ln.pdf")
    write(CASE2 / "Willow Ct checklist export 2026-11-10.csv", CASE2_CSV)
    write(CASE2 / "Willow Ct REPC key dates.txt", CASE2_KEYDATES)
    write(CASE2 / "Placeholder Peaks buyer file checklist.md", CASE2_CHECKLIST)
    write(CASE2 / "Willow Ct TC notes and forwarded emails.txt", CASE2_NOTES)
    write(CASE3 / "Larkspur Way contract dates and documents.txt", CASE3_DATES)
    print("Wrote practice/, evals/files/case2/ and evals/files/case3/")


if __name__ == "__main__":
    main()
