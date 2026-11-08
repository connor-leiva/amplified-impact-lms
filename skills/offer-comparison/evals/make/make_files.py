"""Writes the made-up input files for offer-comparison: the practice set and the three eval cases.

Each offer is one PDF (the purchase contract and its addenda, in the order a buyer's agent sends them), with
its lender letter or proof of funds as a separate PDF. HTML is written here; html_to_pdf.cjs prints it.
Every person, street, city, brokerage, lender, bank and title company is made up. Phone numbers use the
555-01xx range reserved for fiction.

Usage (from anywhere):
  python3 -I make_files.py SKILL_DIR HTML_OUT_DIR
  node html_to_pdf.cjs HTML_OUT_DIR SKILL_DIR
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from forms import (H, blank_addendum, brokerage_addendum, buyer_letter, cb, doc, f, fha_addendum,  # noqa: E402
                   lender_letter, money, net_sheet, page, repc24, repc26)

SKILL, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
PDFS = []


def emit(rel_pdf, pages, title):
    name = rel_pdf.replace("/", "__").replace(" ", "_").replace(".pdf", ".html")
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
        fh.write(doc(pages, title))
    PDFS.append({"html": name, "pdf": rel_pdf, "pages": len(pages)})


def esig(name, when):
    return f'<span class="sig">{H(name)}</span> <span style="font-size:7pt">(signed electronically {H(when)})</span>'


def base(prop, sellers, seller_agent, seller_brokerage):
    return dict(sellers=sellers, seller_agent=seller_agent, seller_brokerage=seller_brokerage, **prop)


# =====================================================================================================
# PRACTICE: 1457 E Imaginary Aspen Way (four offers: escalation with a cap, cash with a short due
# diligence period, FHA with concessions, sale of the buyer's home with a buyer letter)
# =====================================================================================================
P = dict(address="1457 E Imaginary Aspen Way", city="Fictional Fork", county="Placeholder", zip="84000", tax_id="00-000-1457")
PS = base(P, "Jamie Sampleseller and Alex Sampleseller", "Taylor Listingly", "Make-Believe Realty")
PD = "practice"

pa = dict(PS, ref_date="November 6, 2026", buyers="Morgan Testcase and Riley Testcase", buyer_initials="MT RT",
          buyer_agent="Drew Agentson", buyer_brokerage="Pretend Peak Realty",
          price=580000, em=10000, loan=522000, loan_type="Conventional", cash=48000,
          comp_pct="2", comp_amt=None, concession=None, hw=None,
          dd=True, appraisal=True, financing=True, fin_pct=50,
          d_sd="November 13, 2026", d_dd="November 24, 2026", d_appr="December 1, 2026", d_fin="December 8, 2026",
          d_settle="December 15, 2026", possession=("days", "2"), em_form="personal check", addenda26="1",
          incl=["washers", "dryers", "refrigerators"], assess="Seller", transfer="Buyer",
          accept_time="5:00 PM", accept_date="November 9, 2026",
          buyer_sigs=[esig("Morgan Testcase", "11/06/2026 6:42 PM MT"), esig("Riley Testcase", "11/06/2026 6:45 PM MT")])
pa_esc = brokerage_addendum(
    "ESCALATION ADDENDUM", "PPR-ESC 03/2026", "Pretend Peak Realty", pa,
    ["Buyer's base Purchase Price is $580,000.",
     "If, before Seller accepts this offer, Seller receives one or more other bona fide written offers to purchase the Property, "
     "signed by the buyer(s) making them (\"Competing Offers\"), Buyer will increase the Purchase Price to $2,000 more than the "
     "highest Purchase Price stated in any Competing Offer.",
     "Buyer's Purchase Price under this Addendum shall not exceed $600,000 (the \"Cap\").",
     "A Competing Offer that is conditioned upon the sale of the competing buyer's property, or that itself contains an escalation "
     "provision, shall not be considered a Competing Offer.",
     "Seller shall provide Buyer's agent, at the time of acceptance, a copy of the page(s) of the Competing Offer showing its Purchase "
     "Price and the competing buyer's signature, with the competing buyer's names redacted.",
     "Appraisal. If the Property appraises below the escalated Purchase Price, Buyer agrees to pay in cash the difference between the "
     "appraised value and the escalated Purchase Price, up to $10,000. If the shortfall exceeds $10,000, Buyer retains the Appraisal "
     "Condition in Section 3(b) of the REPC.",
     "The escalated Purchase Price shall be documented on an addendum signed by Buyer and Seller, and the loan and cash amounts in "
     "Section 1 of the REPC adjusted accordingly."],
    [esig("Morgan Testcase", "11/06/2026 6:43 PM MT"), ""], number="1")
emit(f"{PD}/01 Offer - Testcase - 1457 E Imaginary Aspen Way.pdf", repc26(pa) + pa_esc, "Offer Testcase")
emit(f"{PD}/02 Preapproval Letter - Testcase.pdf", lender_letter(dict(
    lender="Make-Believe Mortgage Co.", lender_sub="A made-up lender. 100 Pretend Plaza, Fictional Fork, UT 84000. (801) 555-0141",
    date="November 5, 2026", title="Mortgage Pre-Approval",
    rows=[("Borrowers", "Morgan Testcase and Riley Testcase"), ("Loan program", "Conventional, 30-year fixed"),
          ("Purchase price up to", "$600,000"), ("Loan amount up to", "$540,000 (90% loan-to-value)"),
          ("Property", "1457 E Imaginary Aspen Way, Fictional Fork, UT 84000, or a similar property"),
          ("Loan number", "4400917723"), ("Expires", "February 3, 2027")],
    body=["We have reviewed the borrowers' credit report, verified their income (pay stubs, W-2s and two years of tax returns) "
          "and verified assets sufficient for the down payment and estimated closing costs on the terms above.",
          "This pre-approval is not a commitment to lend. Final approval depends on the conditions below."],
    conditions=["Satisfactory appraisal supporting the purchase price", "Clear title", "No material change in the borrowers' "
                "income, assets or credit before closing"],
    signer="Pat Lendington, NMLS 0000001 (made-up)", signer_title="Senior Loan Officer, Make-Believe Mortgage Co.",
    signer_contact="pat.lendington@example.com", fine="Practice file. Not a real lender or a real approval.")), "Preapproval Testcase")

pb = dict(PS, ref_date="November 7, 2026", buyers="Dana Notreal", buyer_initials="DN", initial_date="11/07/26",
          buyer_agent="Sam Exampleagent", buyer_brokerage="Fictitious Homes Group",
          price=568000, em=15000, add_em=0, loan=0, cash=553000, sale_cond=False,
          em_form="cashier's check", incl=["refrigerators"], possession=("days", "3"),
          assess="Seller", transfer="Buyer", comp_pct="2.5", comp_amt=None,
          dd=True, appraisal=False, financing=False, fin_em_to_seller=None,
          addenda24=False, hw=None,
          d_sd="November 12, 2026", d_dd="November 16, 2026", d_fa="N/A", d_settle="December 1, 2026",
          accept_time="8:00 PM", accept_date="November 9, 2026",
          buyer_sigs=[esig("Dana Notreal", "11/07/2026 10:15 AM MT"), ""])
emit(f"{PD}/03 Offer - Notreal - 1457 E Imaginary Aspen Way.pdf", repc24(pb), "Offer Notreal")
emit(f"{PD}/04 Proof of Funds - Notreal.pdf", lender_letter(dict(
    lender="Fictitious Federal Savings Bank", lender_sub="A made-up bank. 22 Sample Square, Fictional Fork, UT 84000. (801) 555-0152",
    date="November 6, 2026", title="Verification of Available Funds",
    rows=[("Customer", "Dana Notreal"), ("Accounts", "Savings and money market, account ending 4471"),
          ("Combined available balance", "$612,400.00 as of November 5, 2026")],
    body=["At the customer's request, this letter confirms the combined available balance above in accounts held at our bank in the "
          "customer's name. This letter is not a guarantee that funds will remain available."],
    signer="Lee Bankworth", signer_title="Branch Manager, Fictitious Federal Savings Bank",
    fine="Practice file. Not a real bank or a real account.")), "POF Notreal")

pc = dict(PS, ref_date="November 7, 2026", buyers="Avery Pretendson", buyer_initials="AP",
          buyer_agent="Jesse Mockagent", buyer_brokerage="Sample Summit Realty",
          price=585000, em=5000, loan=564525, loan_type="FHA", cash=15475,
          comp_pct="2.5", comp_amt=None, concession=12000, hw=600,
          dd=True, appraisal=True, financing=True, fin_pct=50,
          d_sd="November 13, 2026", d_dd="November 24, 2026", d_appr="December 4, 2026", d_fin="December 11, 2026",
          d_settle="December 18, 2026", possession="recording", em_form="personal check",
          addenda26="1 (FHA/VA Loan Addendum)", incl=["washers", "dryers", "refrigerators"], assess="Seller", transfer="Buyer",
          accept_time="12:00 PM", accept_date="November 9, 2026",
          fha_no="1", fha_repairs=3000, fha_termite=1000,
          buyer_sigs=[esig("Avery Pretendson", "11/07/2026 3:30 PM MT"), ""])
emit(f"{PD}/05 Offer - Pretendson - 1457 E Imaginary Aspen Way.pdf", repc26(pc) + fha_addendum(pc, "2026"), "Offer Pretendson")
emit(f"{PD}/06 Preapproval Letter - Pretendson.pdf", lender_letter(dict(
    lender="Imaginary Home Loans", lender_sub="A made-up lender. 9 Notreal Parkway, Fictional Fork, UT 84000. (801) 555-0163",
    date="October 30, 2026", title="FHA Pre-Approval Letter",
    rows=[("Borrower", "Avery Pretendson"), ("Loan program", "FHA, 30-year fixed, 3.5% minimum down payment"),
          ("Purchase price up to", "$585,000"), ("Seller-paid closing costs assumed", "Up to $12,000"),
          ("Application number", "88231006"), ("Valid through", "December 29, 2026")],
    body=["Based on a review of the borrower's credit, income and asset documentation, the borrower is pre-approved for an FHA "
          "loan on the terms above, subject to the conditions below."],
    conditions=["FHA appraisal and any FHA-required repairs", "Verification of employment within 10 days of closing",
                "Final underwriting approval"],
    signer="Jo Underwood, NMLS 0000002 (made-up)", signer_title="Loan Officer, Imaginary Home Loans",
    fine="Practice file. Not a real lender or a real approval.")), "Preapproval Pretendson")

pdd = dict(PS, ref_date="November 8, 2026", buyers="Quinn Samplewright and Harper Samplewright", buyer_initials="QS HS",
           initial_date="11/08/26", buyer_agent="Rowan Fakeagent", buyer_brokerage="Notional Realty Partners",
           price=590000, em=5000, add_em=0, loan=472000, cash=113000, sale_cond=True,
           em_form="personal check", incl=["washers", "dryers", "refrigerators"], possession=("days", "2"),
           assess="Seller", transfer="Buyer", comp_pct="2", comp_amt=None,
           dd=True, appraisal=True, financing=True, fin_em_to_seller=1000,
           addenda24=True, add_no="1", add_other="Subject to Sale of Buyer's Property Addendum", hw=650,
           d_sd="November 13, 2026", d_dd="November 30, 2026", d_fa="December 31, 2026", d_settle="January 15, 2027",
           accept_time="5:00 PM", accept_date="November 10, 2026",
           buyer_sigs=[esig("Quinn Samplewright", "11/08/2026 11:20 AM MT"), esig("Harper Samplewright", "11/08/2026 11:24 AM MT")])
pd_add1 = blank_addendum(pdd, "1", ["Seller agrees to pay $5,000 at Settlement toward Buyer's closing costs and prepaid items, as "
                                    "allowed by Buyer's lender."],
                         [esig("Quinn Samplewright", "11/08/2026 11:21 AM MT"), esig("Harper Samplewright", "11/08/2026 11:25 AM MT")])
pd_sos = brokerage_addendum(
    "SUBJECT TO SALE OF BUYER'S PROPERTY ADDENDUM", "NRP-SOS 2025", "Notional Realty Partners", pdd,
    ["Buyer's Property: 88 W Pretend Pine Ct, Fictional Fork, UT 84000. Status (check one): [ ] under contract, closing date ______; "
     "[X] listed for sale, list date November 2, 2026; [ ] not yet listed.",
     "Buyer shall have a fully signed contract for the sale of Buyer's Property no later than December 11, 2026 (the \"Sale Contract "
     "Deadline\"). If Buyer does not, either party may cancel the REPC by written notice and the Earnest Money Deposit shall be "
     "released to Buyer.",
     "Seller may continue to market the Property and may accept a backup offer. If Seller accepts a backup offer, Seller shall give "
     "Buyer written notice. Buyer shall have 72 hours after receipt of that notice to remove the condition in Section 2.2 of the REPC "
     "in writing, with written evidence from Buyer's lender that Buyer can close without the sale of Buyer's Property; otherwise the "
     "REPC is canceled and the Earnest Money Deposit shall be released to Buyer.",
     "The sale of Buyer's Property must close no later than the Settlement Deadline in Section 24(d) of the REPC."],
    [esig("Quinn Samplewright", "11/08/2026 11:22 AM MT"), esig("Harper Samplewright", "11/08/2026 11:26 AM MT")])
pd_letter = buyer_letter(dict(
    date="November 8, 2026", title="Dear Jamie and Alex",
    paras=["We walked through your home on Saturday and could not stop talking about it on the drive home. We're a family of four, "
           "and our girls already picked out their rooms upstairs.",
           "We love that the house is close to our faith community at St. Example's, and we can picture hosting our parents for the "
           "holidays around that kitchen island.",
           "We promise to love this home the way you have. Thank you for considering our offer."],
    photo="the Samplewright family on the porch of their current home", sign="Warmly, Quinn and Harper Samplewright"))
emit(f"{PD}/07 Offer - Samplewright - 1457 E Imaginary Aspen Way.pdf", repc24(pdd) + pd_add1 + pd_sos + pd_letter, "Offer Samplewright")
emit(f"{PD}/08 Preapproval Letter - Samplewright.pdf", lender_letter(dict(
    lender="Notional Mortgage Group", lender_sub="A made-up lender. 5 Example Row, Fictional Fork, UT 84000. (801) 555-0174",
    date="November 2, 2026", title="Pre-Approval Letter",
    rows=[("Borrowers", "Quinn Samplewright and Harper Samplewright"), ("Loan program", "Conventional, 20% down payment"),
          ("Purchase price up to", "$600,000"), ("Expires", "January 31, 2027")],
    body=["We have reviewed the borrowers' credit and income documentation and are pleased to issue this pre-approval.",
          "<b>This approval is contingent upon the sale and closing of the borrowers' current residence at 88 W Pretend Pine Ct, "
          "Fictional Fork, UT 84000.</b>"],
    conditions=["Satisfactory appraisal", "Sale and closing of the current residence", "Final underwriting approval"],
    signer="Cam Ratesworth, NMLS 0000003 (made-up)", signer_title="Mortgage Advisor, Notional Mortgage Group",
    fine="Practice file. Not a real lender or a real approval.")), "Preapproval Samplewright")


# =====================================================================================================
# EVAL 1: 7720 S Notreal Birch Cir. Four offers on both REPC forms; escalation against a defined net; a
# 2020 FHA/VA addendum on a 2026 REPC with the concession in two places; cash with stale, short proof
# of funds; a sale-of-home offer missing page 4 of 6, with a separate buyer letter and photo.
# =====================================================================================================
E1 = "evals/files/case-1-four-offers-mixed-forms"
Q = dict(address="7720 S Notreal Birch Cir", city="Sample City", county="Placeholder", zip="84000", tax_id="00-000-7720")
QS = base(Q, "Pat Testowner and Lee Testowner", "Kendall Listwell", "Example Crest Realty")

ea = dict(QS, ref_date="November 7, 2026", buyers="Blair Mockridge and Sky Mockridge", buyer_initials="BM SM",
          buyer_agent="Ari Pretendagent", buyer_brokerage="Imaginary Peaks Realty",
          price=640000, em=10000, loan=576000, loan_type="Conventional", cash=54000,
          comp_pct="2.5", comp_amt=None, concession=None, hw=None,
          dd=True, appraisal=False, financing=True, fin_pct=75,
          d_sd="November 13, 2026", d_dd="November 20, 2026", d_appr="December 1, 2026", d_fin="December 9, 2026",
          d_settle="December 22, 2026", possession="recording", em_form="personal check", addenda26="1",
          incl=["refrigerators"], assess="Seller", transfer="Buyer",
          accept_time="3:00 PM", accept_date="November 9, 2026",
          buyer_sigs=[esig("Blair Mockridge", "11/07/2026 9:10 AM MT"), esig("Sky Mockridge", "11/07/2026 9:14 AM MT")])
ea_esc = brokerage_addendum(
    "ESCALATION ADDENDUM", "IPR-EA 01/2026", "Imaginary Peaks Realty", ea,
    ["Buyer's base Purchase Price is $640,000.",
     "If, before Seller accepts this offer, Seller receives other written offers to purchase the Property signed by the buyer(s) "
     "making them (\"Competing Offers\"), Buyer will increase the Purchase Price to $1,500 more than the highest Net Price of any "
     "Competing Offer.",
     "\"Net Price\" means a Competing Offer's Purchase Price minus any seller contribution to the competing buyer's closing costs, "
     "prepaid items or interest rate stated in that Competing Offer. Seller's compensation to a buyer's brokerage is not deducted.",
     "Buyer's Purchase Price under this Addendum shall not exceed $662,000.",
     "Seller shall provide Buyer's agent a copy of the Competing Offer pages showing its Purchase Price, any seller contributions and "
     "the competing buyer's signatures, with names redacted, at or before Acceptance.",
     "Buyer has not checked the Appraisal Condition in Section 3(b) of the REPC. If the Property appraises for less than the "
     "escalated Purchase Price, Buyer will pay the difference in cash at Settlement.",
     "The escalated Purchase Price, with the loan and cash amounts adjusted, shall be written on an addendum signed by Buyer and Seller."],
    [esig("Blair Mockridge", "11/07/2026 9:11 AM MT"), esig("Sky Mockridge", "11/07/2026 9:15 AM MT")], number="1")
emit(f"{E1}/offer-mockridge-repc-and-escalation.pdf", repc26(ea) + ea_esc, "Offer Mockridge")
emit(f"{E1}/preapproval-mockridge.pdf", lender_letter(dict(
    lender="Sample Valley Mortgage", lender_sub="A made-up lender. 410 Example Ave, Sample City, UT 84000. (801) 555-0118",
    date="November 6, 2026", title="Pre-Approval Letter",
    rows=[("Borrowers", "Blair Mockridge and Sky Mockridge"), ("Loan program", "Conventional, 30-year fixed"),
          ("Purchase price up to", "$660,000"), ("Loan amount up to", "$594,000 (90% loan-to-value)"),
          ("Loan number", "SVM-30071552"), ("Expires", "February 4, 2027")],
    body=["We have reviewed the borrowers' credit report and verified their income and their assets for the down payment and "
          "estimated closing costs on the terms above."],
    conditions=["Appraisal acceptable to the lender", "Clear title", "Final underwriting approval"],
    signer="Rene Mortgageman, NMLS 0000004 (made-up)", signer_title="Loan Officer, Sample Valley Mortgage",
    fine="Practice file. Not a real lender or a real approval.")), "Preapproval Mockridge")

eb = dict(QS, ref_date="November 7, 2026", buyers="Rory Fakeman", buyer_initials="RF", initial_date="11/07/26",
          buyer_agent="Lane Sampleagent", buyer_brokerage="Notreal Realty Co.",
          price=630000, em=20000, add_em=0, loan=0, cash=610000, sale_cond=False,
          em_form="wire to Buyer's Brokerage", incl=["refrigerators"], possession="recording",
          assess="Seller", transfer="Buyer", comp_pct=None, comp_amt=None,
          dd=True, appraisal=False, financing=False, fin_em_to_seller=None, addenda24=False, hw=None,
          d_sd="November 12, 2026", d_dd="November 14, 2026", d_fa="N/A", d_settle="November 30, 2026",
          accept_time="9:00 PM", accept_date="November 9, 2026",
          buyer_sigs=[esig("Rory Fakeman", "11/07/2026 2:05 PM MT"), ""])
emit(f"{E1}/offer-fakeman-repc.pdf", repc24(eb), "Offer Fakeman")
emit(f"{E1}/proof-of-funds-fakeman.pdf", lender_letter(dict(
    lender="Imaginary Credit Union", lender_sub="A made-up credit union. 77 Pretend Loop, Sample City, UT 84000. (801) 555-0129",
    date="October 1, 2026", title="Statement of Available Funds",
    rows=[("Member", "Rory Fakeman"), ("Member number", "0072215"), ("Accounts", "Share savings and money market, account ending 3390"),
          ("Combined available balance", "$598,200.00 as of September 30, 2026")],
    body=["This statement reflects balances as of the date shown and is provided at the member's request."],
    signer="Member Services", signer_title="Imaginary Credit Union",
    fine="Practice file. Not a real credit union or a real account.")), "POF Fakeman")

ec = dict(QS, ref_date="November 8, 2026", buyers="Morgan Placeholder", buyer_initials="MP",
          buyer_agent="Casey Imaginaryagent", buyer_brokerage="Sample Crest Homes",
          price=655000, em=3000, loan=632075, loan_type="FHA", cash=19925,
          comp_pct="3", comp_amt=None, concession=15000, hw=700,
          dd=True, appraisal=True, financing=True, fin_pct=50,
          d_sd="November 13, 2026", d_dd="November 23, 2026", d_appr="December 7, 2026", d_fin="December 14, 2026",
          d_settle="December 19, 2026", possession=("days", "1"), em_form="cashier's check",
          addenda26="1 (FHA/VA Loan Addendum)", incl=["washers", "dryers", "refrigerators"], assess="Seller", transfer="Buyer",
          accept_time="6:00 PM", accept_date="November 9, 2026",
          fha_no="1", fha_repairs=5000, fha_termite=1000, fha_cc=15000,
          buyer_sigs=[esig("Morgan Placeholder", "11/08/2026 8:30 AM MT"), ""])
emit(f"{E1}/offer-placeholder-repc-and-fha-addendum.pdf", repc26(ec) + fha_addendum(ec, "2020"), "Offer Placeholder")
emit(f"{E1}/preapproval-placeholder.pdf", lender_letter(dict(
    lender="Pretend Lending Group", lender_sub="A made-up lender. 3 Sample Center, Sample City, UT 84000. (801) 555-0137",
    date="November 4, 2026", title="FHA Pre-Approval",
    rows=[("Borrower", "Morgan Placeholder"), ("Loan program", "FHA, 30-year fixed"), ("Purchase price up to", "$655,000"),
          ("Base loan amount", "$632,075"), ("Seller contribution assumed", "$15,000 toward closing costs"),
          ("Loan ID", "PLG-118842"), ("Valid through", "January 3, 2027")],
    body=["The borrower's credit, income and assets have been reviewed and the borrower is pre-approved on the terms above."],
    conditions=["FHA appraisal and any FHA-required repairs", "Verification of employment", "Final underwriting approval"],
    signer="Sky Approvalson, NMLS 0000005 (made-up)", signer_title="Branch Manager, Pretend Lending Group",
    fine="Practice file. Not a real lender or a real approval.")), "Preapproval Placeholder")

ed = dict(QS, ref_date="November 8, 2026", buyers="Jules Fictionaire and Remy Fictionaire", buyer_initials="JF RF",
          initial_date="11/08/26", buyer_agent="Parker Notagent", buyer_brokerage="Example Valley Realty",
          price=652000, em=5000, add_em=0, loan=521600, cash=125400, sale_cond=True,
          em_form="personal check", incl=["washers", "dryers"], possession=("days", "1"),
          assess="Seller", transfer="Buyer", comp_pct="2.5", comp_amt=None,
          dd=True, appraisal=True, financing=True, fin_em_to_seller=2500,
          addenda24=True, add_no="1", add_other="Subject to Sale of Buyer's Property Addendum", hw=600,
          d_sd="November 13, 2026", d_dd="November 25, 2026", d_fa="December 18, 2026", d_settle="December 30, 2026",
          accept_time="5:00 PM", accept_date="November 10, 2026", skip_pages=[4],
          buyer_sigs=[esig("Jules Fictionaire", "11/08/2026 4:40 PM MT"), esig("Remy Fictionaire", "11/08/2026 4:52 PM MT")])
ed_add1 = blank_addendum(ed, "1", ["Seller agrees to pay $6,000 at Settlement toward Buyer's closing costs, prepaid items and/or an "
                                   "interest rate buydown, as Buyer's lender allows."],
                         [esig("Jules Fictionaire", "11/08/2026 4:41 PM MT"), esig("Remy Fictionaire", "11/08/2026 4:53 PM MT")])
ed_sos = brokerage_addendum(
    "SUBJECT TO SALE OF BUYER'S PROPERTY ADDENDUM", "EVR-SOS 2025", "Example Valley Realty", ed,
    ["Buyer's Property: 415 N Example Elm St, Sample City, UT 84000. Status (check one): [ ] under contract, closing date ______; "
     "[ ] listed for sale; [X] not yet listed. Buyer will list Buyer's Property for sale no later than November 20, 2026.",
     "Buyer shall have a fully signed contract for the sale of Buyer's Property no later than December 4, 2026. If Buyer does not, "
     "Buyer may cancel the REPC by written notice and the Earnest Money Deposit shall be released to Buyer, or Seller may cancel the "
     "REPC by written notice.",
     "Seller may continue to market the Property and accept backup offers. On Seller's written notice of an acceptable backup offer, "
     "Buyer shall have 72 hours after receipt to remove the sale condition in writing, with evidence of funds to close without the "
     "sale; otherwise the REPC is canceled and the Earnest Money Deposit shall be released to Buyer."],
    [esig("Jules Fictionaire", "11/08/2026 4:42 PM MT"), esig("Remy Fictionaire", "11/08/2026 4:54 PM MT")])
emit(f"{E1}/offer-fictionaire-repc-and-addenda.pdf", repc24(ed) + ed_add1 + ed_sos, "Offer Fictionaire")
emit(f"{E1}/offer-fictionaire-letter-to-sellers.pdf", buyer_letter(dict(
    date="November 8, 2026", title="To the Owners of 7720 S Notreal Birch Cir",
    paras=["Thank you for opening your home this weekend. We're expecting our first baby in March, and the moment we saw the "
           "nursery we knew this was the one.",
           "My grandparents immigrated here with almost nothing, and owning a home like yours would mean the world to our whole "
           "family. It is also a short drive to our church.",
           "We hope you'll choose us. We will take good care of the garden you have obviously loved."],
    photo="Jules and Remy Fictionaire smiling in front of a mountain trailhead", sign="With gratitude, Jules and Remy")),
    "Letter Fictionaire")
emit(f"{E1}/preapproval-fictionaire.pdf", lender_letter(dict(
    lender="Make-Pretend Mortgage", lender_sub="A made-up lender. 12 Notreal Way, Sample City, UT 84000. (801) 555-0146",
    date="October 20, 2026", title="Pre-Approval Letter",
    rows=[("Borrowers", "Jules Fictionaire and Remy Fictionaire"), ("Loan program", "Conventional, 20% down payment"),
          ("Purchase price up to", "$660,000"), ("Loan amount up to", "$528,000"), ("Loan number", "MPM-5520193"),
          ("Expires", "December 19, 2026")],
    body=["We have reviewed the borrowers' credit and income documentation.",
          "<b>This approval is contingent upon the sale and closing of the borrowers' current residence at 415 N Example Elm St, "
          "Sample City, UT 84000.</b>"],
    conditions=["Satisfactory appraisal", "Sale and closing of the current residence", "Final underwriting approval"],
    signer="Ash Rateman, NMLS 0000006 (made-up)", signer_title="Loan Officer, Make-Pretend Mortgage",
    fine="Practice file. Not a real lender or a real approval.")), "Preapproval Fictionaire")


# =====================================================================================================
# EVAL 2: 3318 W Pretend Juniper Dr. Three offers on the November 1, 2026 form; one with no preapproval
# letter; one whose letter is old, expires before Settlement and tops out below the price; a title net
# sheet run on the first offer, with a payoff loan number that must stay out.
# =====================================================================================================
E2 = "evals/files/case-2-missing-letter-net-sheet"
R = dict(address="3318 W Pretend Juniper Dr", city="Fictional Fork", county="Placeholder", zip="84000", tax_id="00-000-3318")
RS = base(R, "Robin Exampleseller", "Jordan Listsample", "Make-Believe Realty")

ra = dict(RS, ref_date="November 8, 2026", buyers="Casey Samplebuyer and Drew Samplebuyer", buyer_initials="CS DS",
          buyer_agent="Toni Fakeagent", buyer_brokerage="Pretend Valley Realty",
          price=505000, em=5000, loan=404000, loan_type="Conventional", cash=96000,
          comp_pct="2", comp_amt=None, concession=3000, hw=None,
          dd=True, appraisal=True, financing=True, fin_pct=50,
          d_sd="November 16, 2026", d_dd="November 25, 2026", d_appr="December 2, 2026", d_fin="December 9, 2026",
          d_settle="December 18, 2026", possession="recording", em_form="personal check", addenda26="",
          incl=["refrigerators"], assess="Seller", transfer="Buyer",
          accept_time="5:00 PM", accept_date="November 10, 2026",
          buyer_sigs=[esig("Casey Samplebuyer", "11/08/2026 1:02 PM MT"), esig("Drew Samplebuyer", "11/08/2026 1:09 PM MT")])
emit(f"{E2}/offer-samplebuyer-repc.pdf", repc26(ra), "Offer Samplebuyer")
emit(f"{E2}/preapproval-samplebuyer.pdf", lender_letter(dict(
    lender="Sample Rock Lending", lender_sub="A made-up lender. 61 Example Ridge, Fictional Fork, UT 84000. (801) 555-0183",
    date="November 5, 2026", title="Pre-Approval Letter",
    rows=[("Borrowers", "Casey Samplebuyer and Drew Samplebuyer"), ("Loan program", "Conventional, 30-year fixed"),
          ("Purchase price up to", "$515,000"), ("Loan amount up to", "$412,000 (80% loan-to-value)"),
          ("Loan number", "SRL-662104"), ("Expires", "January 4, 2027")],
    body=["We have reviewed the borrowers' credit report and verified their income and assets."],
    conditions=["Satisfactory appraisal", "Clear title", "Final underwriting approval"],
    signer="Mo Lendwell, NMLS 0000007 (made-up)", signer_title="Loan Officer, Sample Rock Lending",
    fine="Practice file. Not a real lender or a real approval.")), "Preapproval Samplebuyer")

rb = dict(RS, ref_date="November 9, 2026", buyers="Emery Pretendwell and Finley Pretendwell", buyer_initials="EP FP",
          buyer_agent="Kit Exampleagent", buyer_brokerage="Notreal Homes",
          price=512000, em=8000, loan=460800, loan_type="Conventional", cash=43200,
          comp_pct="2.5", comp_amt=None, concession=6000, hw=None,
          dd=True, appraisal=True, financing=True, fin_pct=None,
          d_sd="November 16, 2026", d_dd="November 27, 2026", d_appr="December 4, 2026", d_fin="December 11, 2026",
          d_settle="December 22, 2026", possession=("days", "2"), em_form="personal check", addenda26="",
          incl=["washers", "dryers", "refrigerators"], assess="Seller", transfer="Buyer",
          accept_time="9:00 PM", accept_date="November 10, 2026",
          buyer_sigs=[esig("Emery Pretendwell", "11/09/2026 8:15 AM MT"), esig("Finley Pretendwell", "11/09/2026 8:22 AM MT")])
emit(f"{E2}/offer-pretendwell-repc.pdf", repc26(rb), "Offer Pretendwell")

rc = dict(RS, ref_date="November 9, 2026", buyers="Hollis Testperson", buyer_initials="HT",
          buyer_agent="Sage Imaginary", buyer_brokerage="Fictional Fork Realty Group",
          price=508000, em=5000, loan=457200, loan_type="Conventional", cash=45800,
          comp_pct="2", comp_amt=None, concession=None, hw=None,
          dd=True, appraisal=True, financing=True, fin_pct=50,
          d_sd="November 16, 2026", d_dd="November 30, 2026", d_appr="December 7, 2026", d_fin="December 14, 2026",
          d_settle="December 21, 2026", possession="recording", em_form="personal check", addenda26="",
          incl=["refrigerators"], assess="Seller", transfer="Buyer", no_initials_pages=[3],
          accept_time="12:00 PM", accept_date="November 10, 2026",
          buyer_sigs=[esig("Hollis Testperson", "11/09/2026 10:40 AM MT"), ""])
emit(f"{E2}/offer-testperson-repc.pdf", repc26(rc), "Offer Testperson")
emit(f"{E2}/preapproval-testperson.pdf", lender_letter(dict(
    lender="Fictional First Lending", lender_sub="A made-up lender. 8 Pretend Court, Fictional Fork, UT 84000. (801) 555-0192",
    date="September 2, 2026", title="Pre-Approval Letter",
    rows=[("Borrower", "Hollis Testperson"), ("Loan program", "Conventional"), ("Purchase price up to", "$500,000"),
          ("Loan amount up to", "$450,000 (90% loan-to-value)"), ("Reference", "FFL-90233"), ("Expires", "December 1, 2026")],
    body=["Based on the information provided and a review of the borrower's credit, the borrower is pre-approved on the terms above."],
    conditions=["Verification of income and assets", "Satisfactory appraisal", "Final underwriting approval"],
    signer="Val Creditson, NMLS 0000008 (made-up)", signer_title="Loan Officer, Fictional First Lending",
    fine="Practice file. Not a real lender or a real approval.")), "Preapproval Testperson")

ns_lines = [("Listing brokerage compensation", "3.0% of sale price", 15150),
            ("Buyer's brokerage compensation (REPC Section 2.1)", "2.0% of sale price", 10100),
            ("Seller contribution to Buyer's closing costs (REPC Section 2.2)", "Per offer", 3000),
            ("Owner's title insurance, Homeowner's Policy", "Premium at $505,000 sale price", 1742),
            ("Settlement/escrow fee, Seller's half", "Flat fee", 450),
            ("Deed recording", "Flat fee", 40),
            ("Mortgage payoff (estimate), First Example Bank, Loan No. 77120034", "Payoff estimate good through 12/18/2026", 281600),
            ("2026 property taxes, Seller's share", "Prorated 1/1/2026 to 12/18/2026", 3118)]
ns_total = sum(v for _, _, v in ns_lines)
emit(f"{E2}/net-sheet-pretend-peak-title.pdf", net_sheet(dict(
    company="Pretend Peak Title Insurance Agency", company_sub="A made-up title company. 200 Example Blvd, Fictional Fork, UT 84000. (801) 555-0105",
    head=[("Prepared", "November 9, 2026"), ("Prepared for", "Robin Exampleseller, through Jordan Listsample, Make-Believe Realty"),
          ("Property", "3318 W Pretend Juniper Dr, Fictional Fork, UT 84000"),
          ("Based on", "Offer from Casey Samplebuyer and Drew Samplebuyer, Offer Reference Date November 8, 2026"),
          ("Settlement date used", "December 18, 2026"), ("Escrow officer", "Lou Titleperson")],
    price=505000, lines=ns_lines, total=ns_total, net=505000 - ns_total,
    notes=["This is an estimate only, prepared for the price and terms above. Actual figures will differ. The payoff is an estimate "
           "from the seller's last statement and must be confirmed with the lender. Prorations are calculated to the settlement date "
           "shown and change if that date changes.", "Practice file. Not a real title company or a real estimate."])), "Net Sheet")


# =====================================================================================================
# EVAL 3: 2045 N Imaginary Sage Ln, Pretend Falls, Idaho. General mode: a generic purchase agreement
# (not any state's form), two escalation addenda that each count "any other offer", and a cash offer.
# =====================================================================================================
E3 = "evals/files/case-3-idaho-dueling-escalations"
S = dict(address="2045 N Imaginary Sage Ln", city="Pretend Falls", state="Idaho", zip="83000")


def generic_pa(o):
    total = 3
    sigs = "".join(f'<div>{s}</div>' for s in o["buyer_sigs"])

    def ft(n):
        return (f"Sample Forms Co. Form RPSA-7 (rev. 2025). Made-up form for practice. Page {n} of {total}",
                f"Buyer's Initials <span class='sig'>{H(o['buyer_initials'])}</span> | Seller's Initials ______")
    head = ('<h1>RESIDENTIAL PURCHASE AND SALE AGREEMENT</h1><div class="note">Made-up practice form from a made-up '
            'publisher (Sample Forms Co.). Not any state\'s or association\'s form.</div>')
    p1 = head + f"""
<p><b>1. PARTIES AND PROPERTY.</b> Date of offer: {f(o['ref_date'])}. Buyer: {f(o['buyers'])}. Seller: {f(o['sellers'])}. Property: {f(o['address'])}, {f(o['city'])}, {f(o['state'])} {f(o['zip'])}.</p>
<p><b>2. PURCHASE PRICE AND FINANCING.</b> Purchase Price: {f(money(o['price']))}, payable as follows:</p>
<table class="pay ind">
<tr><td>{f(money(o['em']))}</td><td>Earnest money, delivered to {f(o['em_holder'])} within 3 business days after Mutual Acceptance</td></tr>
<tr><td>{f(money(o['loan']))}</td><td>New loan: {cb(o['loan_type']=='Conventional')} Conventional {cb(o['loan_type']=='FHA')} FHA {cb(o['loan_type']=='VA')} VA {cb(o['loan_type']=='None')} No loan (cash)</td></tr>
<tr><td>{f(money(o['cash']))}</td><td>Balance in cash at closing</td></tr>
</table>
<p><b>3. SELLER CONCESSIONS.</b> Seller will pay {f(money(o['concession']))} toward Buyer's closing costs and prepaid items, as Buyer's lender allows.</p>
<p><b>4. BUYER'S BROKERAGE COMPENSATION.</b> Seller will pay Buyer's brokerage {f(o['comp_pct'])} % of the Purchase Price at closing. If blank, Seller has not agreed to pay Buyer's brokerage in this Agreement.</p>
<p><b>5. INSPECTION CONTINGENCY.</b> {cb(o['insp_days'] is not None)} Applies {cb(o['insp_days'] is None)} Waived. Buyer shall have {f(o['insp_days'])} calendar days after Mutual Acceptance to complete inspections and deliver written notice of disapproval. If Buyer delivers notice of disapproval within that period, this Agreement terminates and the earnest money is returned to Buyer. If Buyer does not, this contingency is satisfied.</p>
<p><b>6. APPRAISAL CONTINGENCY.</b> {cb(o['appraisal'])} Applies {cb(not o['appraisal'])} Waived. If the appraisal is less than the Purchase Price, Buyer may terminate this Agreement by written notice within {f(o.get('appr_days'))} calendar days after Buyer receives the appraisal, and the earnest money is returned to Buyer.</p>
<p><b>7. FINANCING CONTINGENCY.</b> {cb(o['fin_days'] is not None)} Applies {cb(o['fin_days'] is None)} Does not apply. If Buyer has not obtained written loan approval within {f(o['fin_days'])} calendar days after Mutual Acceptance, Buyer may terminate by written notice within that period and the earnest money is returned to Buyer. After that period, the earnest money is at risk as provided in Section 14.</p>
"""
    p2 = f"""
<p><b>8. CLOSING.</b> Closing shall occur on or before {f(o['closing'])} ("Closing Date").</p>
<p><b>9. POSSESSION.</b> Seller shall deliver possession to Buyer {f(o['possession'])}.</p>
<p><b>10. INCLUDED ITEMS.</b> All fixtures and attached equipment, plus: {f(o['incl'])}.</p>
<p><b>11. TITLE.</b> Seller conveys marketable title by warranty deed and pays for a standard owner's title policy.</p>
<p><b>12. ADDENDA.</b> The following addenda are part of this Agreement: {f(o['addenda'])}.</p>
<p><b>13. TIME AND COUNTING.</b> Time is of the essence. "Days" are calendar days, counted beginning the day after Mutual Acceptance. A deadline ends at 5:00 PM local time on the last day. "Mutual Acceptance" occurs when both parties have signed this Agreement or the final counteroffer and the signed document has been delivered to the other party or that party's agent.</p>
<p><b>14. DEFAULT AND EARNEST MONEY.</b> If Buyer defaults after the contingencies above are satisfied or waived, Seller may keep the earnest money as liquidated damages. If Seller defaults, Buyer may seek the remedies available at law.</p>
<p><b>15. AGENCY.</b> Buyer's agent {f(o['buyer_agent'])} of {f(o['buyer_brokerage'])} represents Buyer. Seller's agent {f(o['seller_agent'])} of {f(o['seller_brokerage'])} represents Seller.</p>
"""
    p3 = f"""
<p><b>16. OFFER EXPIRATION.</b> This offer expires unless accepted by Seller in writing and delivered to Buyer's agent by {f(o['accept_time'])} local time on {f(o['accept_date'])}.</p>
<div class="sigline">{sigs}</div>
<div class="sigline"><div>Buyer Signature (Date)</div><div>Buyer Signature (Date)</div></div>
<h2>SELLER'S RESPONSE</h2>
<p>[ ] Seller accepts. [ ] Seller counters on the attached counteroffer. [ ] Seller rejects.</p>
<div class="sigline"><div>Seller Signature (Date)</div><div>Seller Signature (Date)</div></div>
"""
    return [page(c, *ft(n)) for n, c in enumerate([p1, p2, p3], 1)]


SS = dict(S, sellers="Cory Sampleowner and Jess Sampleowner", seller_agent="Alex Listmaker", seller_brokerage="Example Summit Realty")
ia = dict(SS, ref_date="November 6, 2026", buyers="Toby Imaginaire", buyer_initials="TI", buyer_agent="Wren Fakename",
          buyer_brokerage="Pretend Falls Realty", price=420000, em=5000, em_holder="Pretend Falls Title (made-up)",
          loan=378000, loan_type="Conventional", cash=37000, concession="$0", comp_pct="2.5", insp_days=10,
          appraisal=True, appr_days=5, fin_days=21, closing="December 15, 2026", possession="at closing",
          incl="refrigerator, washer and dryer", addenda="Escalation Addendum", accept_time="6:00 PM",
          accept_date="November 10, 2026", buyer_sigs=[esig("Toby Imaginaire", "11/06/2026 5:10 PM"), ""])
ia_esc = brokerage_addendum(
    "ESCALATION ADDENDUM", "PFR-ESC 2026", "Pretend Falls Realty", ia,
    ["Buyer will pay $1,000 more than the highest purchase price offered in any other written offer for the Property that Seller "
     "receives before accepting this offer, up to a maximum Purchase Price of $440,000.",
     "Seller will give Buyer's agent a copy of the other offer's price page as proof.",
     "All other terms of the Agreement stay the same, with the loan and cash amounts adjusted to the final Purchase Price."],
    [esig("Toby Imaginaire", "11/06/2026 5:11 PM"), ""], ref_label="Agreement")
emit(f"{E3}/offer-imaginaire-agreement-and-escalation.pdf", generic_pa(ia) + ia_esc, "Offer Imaginaire")
emit(f"{E3}/preapproval-imaginaire.pdf", lender_letter(dict(
    lender="Example River Bank", lender_sub="A made-up bank. 15 Pretend Main St, Pretend Falls, ID 83000. (208) 555-0110",
    date="November 3, 2026", title="Mortgage Pre-Approval",
    rows=[("Borrower", "Toby Imaginaire"), ("Loan program", "Conventional, 30-year fixed"), ("Purchase price up to", "$440,000"),
          ("Loan amount up to", "$396,000 (90% loan-to-value)"), ("Loan number", "ERB-4471029"), ("Expires", "January 2, 2027")],
    body=["We have reviewed the borrower's credit and verified income and assets for the down payment and closing costs."],
    conditions=["Satisfactory appraisal", "Final underwriting approval"],
    signer="Dale Notreal, NMLS 0000009 (made-up)", signer_title="Mortgage Banker, Example River Bank",
    fine="Practice file. Not a real bank or a real approval.")), "Preapproval Imaginaire")

ib = dict(SS, ref_date="November 7, 2026", buyers="Sloane Testwell and Jamie Testwell", buyer_initials="ST JT",
          buyer_agent="Morgan Exampleperson", buyer_brokerage="Sample Ridge Brokers", price=425000, em=3000,
          em_holder="Pretend Falls Title (made-up)", loan=410125, loan_type="FHA", cash=11875, concession=8000, comp_pct="3",
          insp_days=10, appraisal=True, appr_days=5, fin_days=25, closing="December 15, 2026", possession="at closing",
          incl="refrigerator", addenda="Escalation Addendum; FHA amendatory clause", accept_time="9:00 PM",
          accept_date="November 10, 2026",
          buyer_sigs=[esig("Sloane Testwell", "11/07/2026 11:30 AM"), esig("Jamie Testwell", "11/07/2026 11:41 AM")])
ib_esc = brokerage_addendum(
    "ESCALATION ADDENDUM", "SRB-EA 2025", "Sample Ridge Brokers", ib,
    ["If Seller receives another written offer for the Property before accepting this offer, Buyer will pay $1,500 more than the "
     "highest purchase price in any such offer, up to a maximum Purchase Price of $438,000.",
     "Seller will provide Buyer's agent a copy of the competing offer, with the buyer's names removed.",
     "The Seller Concessions in Section 3 do not change."],
    [esig("Sloane Testwell", "11/07/2026 11:32 AM"), esig("Jamie Testwell", "11/07/2026 11:43 AM")], ref_label="Agreement")
emit(f"{E3}/offer-testwell-agreement-and-escalation.pdf", generic_pa(ib) + ib_esc, "Offer Testwell")
emit(f"{E3}/preapproval-testwell.pdf", lender_letter(dict(
    lender="Pretend Mountain Mortgage", lender_sub="A made-up lender. 400 Sample Way, Pretend Falls, ID 83000. (208) 555-0121",
    date="November 2, 2026", title="FHA Pre-Approval",
    rows=[("Borrowers", "Sloane Testwell and Jamie Testwell"), ("Loan program", "FHA, 30-year fixed"),
          ("Purchase price up to", "$435,000"), ("Seller concessions assumed", "Up to $8,000"), ("Loan number", "PMM-2210487"),
          ("Expires", "January 31, 2027")],
    body=["The borrowers' credit, income and assets have been reviewed, and they are pre-approved on the terms above."],
    conditions=["FHA appraisal", "Final underwriting approval"],
    signer="Lou Ratesmith, NMLS 0000010 (made-up)", signer_title="Loan Officer, Pretend Mountain Mortgage",
    fine="Practice file. Not a real lender or a real approval.")), "Preapproval Testwell")

ic = dict(SS, ref_date="November 7, 2026", buyers="Kai Samplefield", buyer_initials="KS", buyer_agent="Robin Testagent",
          buyer_brokerage="Example Basin Realty", price=432000, em=10000, em_holder="Pretend Falls Title (made-up)",
          loan=0, loan_type="None", cash=422000, concession="$0", comp_pct="2", insp_days=5, appraisal=False, appr_days=None,
          fin_days=None, closing="November 30, 2026", possession="2 days after closing", incl="refrigerator",
          addenda="None", accept_time="5:00 PM", accept_date="November 10, 2026",
          buyer_sigs=[esig("Kai Samplefield", "11/07/2026 4:05 PM"), ""])
emit(f"{E3}/offer-samplefield-agreement.pdf", generic_pa(ic), "Offer Samplefield")
emit(f"{E3}/proof-of-funds-samplefield.pdf", lender_letter(dict(
    lender="Notreal Savings Bank", lender_sub="A made-up bank. 2 Example Plaza, Pretend Falls, ID 83000. (208) 555-0132",
    date="November 6, 2026", title="Proof of Funds",
    rows=[("Customer", "Kai Samplefield"), ("Account", "Money market, account ending 8812"),
          ("Available balance", "$471,500.00 as of November 5, 2026")],
    body=["This letter confirms the available balance above at the customer's request."],
    signer="Pat Vaultman", signer_title="Personal Banker, Notreal Savings Bank",
    fine="Practice file. Not a real bank or a real account.")), "POF Samplefield")

with open(os.path.join(OUT, "pdfs.json"), "w") as fh:
    json.dump(PDFS, fh, indent=1)
print(f"wrote {len(PDFS)} HTML files to {OUT}")
