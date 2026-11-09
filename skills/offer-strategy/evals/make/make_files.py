"""Writes the made-up input files for offer-strategy: the practice set and the three eval cases.

Each set is an MLS agent sheet with status and price history (HTML now, PDF via html_to_pdf.cjs), a
comp export (CSV) and a lender letter (HTML now, PDF later). Every street, person, brokerage, lender,
MLS and showing service here is fictional. Phone numbers use the 555-01xx range reserved for fiction.

Usage (from anywhere):
  python3 -I make_files.py SKILL_DIR HTML_OUT_DIR
  node html_to_pdf.cjs HTML_OUT_DIR SKILL_DIR
"""
import csv
import html
import json
import os
import sys
from datetime import date

SKILL = sys.argv[1]
HTML = sys.argv[2]
os.makedirs(HTML, exist_ok=True)
STAMP = "PRACTICE FILE: made-up example"
PDFS = []


def d(s):
    return date.fromisoformat(s)


def days(a, b):
    return (d(b) - d(a)).days


def money(n):
    return "" if n in (None, "") else f"${n:,.0f}"


def mdy(s):
    x = d(s)
    return f"{x.month:02d}/{x.day:02d}/{x.year}"


def long_date(s):
    x = d(s)
    return f"{x.strftime('%B')} {x.day}, {x.year}"


def comp(mls, status, addr, style, yb, beds, baths, ag, bg, bgfin, gar, lot, list_date, olp, lp,
         pending=None, sold=None, sp=None, conc=None, off=None, special="Standard", remarks="",
         agent="", showing="", hoa=0):
    return dict(mls=mls, status=status, addr=addr, style=style, yb=yb, beds=beds, baths=baths, ag=ag,
                bg=bg, bgfin=bgfin, gar=gar, lot=lot, list_date=list_date, olp=olp, lp=lp,
                pending=pending, sold=sold, sp=sp, conc=conc, off=off, special=special,
                remarks=remarks, agent=agent, showing=showing, hoa=hoa)


def dom(x, asof):
    end = x["pending"] or x["off"] or asof
    return days(x["list_date"], end)


UTAH_COLS = ["MLS #", "Status", "Address", "City", "State", "Zip", "Style", "Year Built", "List Price",
             "Original List Price", "Sold Price", "Seller Concessions", "List Date", "Pending Date",
             "Sold Date", "Off Market Date", "DOM", "CDOM", "Beds", "Baths", "Above Grade Fin SqFt",
             "Below Grade SqFt", "Below Grade Fin SqFt", "Total Fin SqFt", "Garage Spaces", "Lot Acres",
             "HOA Fee (Monthly)", "Special Conditions", "Public Remarks", "Agent Remarks",
             "Showing Instructions"]


def write_utah_csv(path, rows, city, asof):
    full = os.path.join(SKILL, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", newline="", encoding="utf-8") as f:
        f.write(STAMP + "\n")
        w = csv.writer(f)
        w.writerow(UTAH_COLS)
        for x in rows:
            n = dom(x, asof)
            w.writerow([x["mls"], x["status"], x["addr"], city, "UT", "84000", x["style"], x["yb"], x["lp"],
                        x["olp"], x["sp"] or "", x["conc"] if x["conc"] is not None else "",
                        x["list_date"], x["pending"] or "", x["sold"] or "", x["off"] or "", n, n,
                        x["beds"], x["baths"], x["ag"], x["bg"], x["bgfin"], x["ag"] + x["bgfin"], x["gar"],
                        x["lot"], x["hoa"], x["special"], x["remarks"], x["agent"], x["showing"]])


IDAHO_COLS = ["Listing ID", "Status", "Street Address", "City", "State", "Postal Code", "Property Subtype",
              "Year Built", "Original List Price", "List Price", "Close Price", "Concessions Amount",
              "Listing Contract Date", "Pending Date", "Close Date", "CDOM", "Bedrooms Total",
              "Bathrooms Total", "Living Area SqFt", "Basement", "Garage Spaces", "Lot Size Acres",
              "Association Fee", "Special Listing Conditions", "Public Remarks", "Private Remarks"]


def write_idaho_csv(path, rows, city, asof):
    full = os.path.join(SKILL, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", newline="", encoding="utf-8") as f:
        f.write(STAMP + "\n")
        w = csv.writer(f)
        w.writerow(IDAHO_COLS)
        for x in rows:
            w.writerow([x["mls"], x["status"], x["addr"], city, "ID", "83000", x["style"], x["yb"], x["olp"],
                        x["lp"], x["sp"] or "", x["conc"] if x["conc"] is not None else "", x["list_date"],
                        x["pending"] or "", x["sold"] or "", dom(x, asof), x["beds"], x["baths"], x["ag"],
                        "None", x["gar"], x["lot"], x["hoa"], x["special"], x["remarks"], x["agent"]])


CSS = """
body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#111;margin:0}
h1{font-size:15pt;margin:0 0 2px 0} h2{font-size:12pt;margin:14px 0 6px 0;border-bottom:1px solid #999}
.sub{color:#444;font-size:9pt;margin-bottom:8px}
table{border-collapse:collapse;width:100%} td,th{border:1px solid #bbb;padding:4px 6px;vertical-align:top;text-align:left}
th{background:#eee} td.k{width:32%;background:#f6f6f6;font-weight:bold}
.stamp{color:#b00;font-weight:bold;text-align:center;margin-bottom:6px}
.letter p{margin:0 0 9px 0;line-height:1.35}
.small{font-size:8.5pt;color:#444}
"""


def page(title, body):
    return (f"<!doctype html><html><head><meta charset='utf-8'><title>{html.escape(title)}</title>"
            f"<style>{CSS}</style></head><body><div class='stamp'>{STAMP}</div>{body}</body></html>")


def add_pdf(name, title, body, out):
    with open(os.path.join(HTML, name), "w", encoding="utf-8") as f:
        f.write(page(title, body))
    PDFS.append({"html": name, "pdf": out})


def kv(rows):
    return "<table>" + "".join(f"<tr><td class='k'>{html.escape(k)}</td><td>{html.escape(str(v))}</td></tr>"
                               for k, v in rows) + "</table>"


def history_table(events, cols=("Date", "Event", "Old Value", "New Value", "DOM")):
    head = "".join(f"<th>{c}</th>" for c in cols)
    body = "".join("<tr>" + "".join(f"<td>{html.escape(str(c))}</td>" for c in e) + "</tr>" for e in events)
    return f"<table><tr>{head}</tr>{body}</table>"


def utah_sheet(name, out, s, city, asof, history, extra):
    n = days(s["list_date"], asof)
    rows = [
        ("MLS #", s["mls"]), ("Status", s["status"]), ("Address", f"{s['addr']}, {city}, UT 84000"),
        ("List Price", money(s["lp"])), ("Original List Price", money(s["olp"])),
        ("List Date", mdy(s["list_date"])), ("Days on Market / Cumulative DOM", f"{n} / {n}"),
        ("Style / Year Built", f"{s['style']} / {s['yb']}"),
        ("Bedrooms", extra["beds"]), ("Bathrooms", extra["baths"]),
        ("Above Grade Finished SqFt", f"{s['ag']:,}"),
        ("Basement SqFt (Total / Finished)", f"{s['bg']:,} / {s['bgfin']:,}"),
        ("Total Finished SqFt", f"{s['ag'] + s['bgfin']:,}"),
        ("Garage", extra["garage"]), ("Lot", extra["lot"]), ("HOA", extra["hoa"]),
        ("Taxes", extra["taxes"]), ("Water", extra["water"]),
        ("Heating / Cooling", extra["hvac"]), ("Roof", extra["roof"]),
        ("Owner", extra["owner"]), ("Occupancy", extra["occupancy"]),
        ("Public Remarks", s["remarks"]), ("Agent Remarks", s["agent"]),
        ("Showing Instructions", s["showing"]), ("Listing Agent", extra["la"]),
    ]
    body = (f"<h1>Agent Full Report</h1><div class='sub'>Example MLS (fictional). Printed {long_date(asof)}.</div>"
            + kv(rows)
            + "<h2>Property Activity Report (History)</h2>"
              "<div class='sub'>Changes to this listing on Example MLS, by Tax ID. Example MLS (fictional).</div>"
            + history_table(history))
    add_pdf(name, f"Agent Full Report {s['addr']}", body, out)


def letter(name, out, lender, addr_lines, date_s, salutation, paras, signer):
    body = (f"<div class='letter'><h1>{html.escape(lender)}</h1><div class='sub'>"
            + "<br>".join(html.escape(a) for a in addr_lines) + "</div>"
            f"<p>{long_date(date_s)}</p><p>{html.escape(salutation)}</p>"
            + "".join(f"<p>{p}</p>" for p in paras)
            + "<p>Sincerely,</p><p>" + "<br>".join(html.escape(x) for x in signer) + "</p></div>")
    add_pdf(name, lender, body, out)


# ---------------------------------------------------------------------------------------------------
# PRACTICE: 2286 E Pretend Poppy Ln, Fictional Fork, UT (Balanced; November 1, 2026 REPC; conventional)
# ---------------------------------------------------------------------------------------------------
ASOF = "2026-11-08"
city = "Fictional Fork"
subj = comp("2290101", "Active", "2286 E Pretend Poppy Ln", "Two Story", 2004, 4, 3.5, 2010, 1000, 850, 2,
            0.18, "2026-10-16", 579900, 569900, hoa=45,
            remarks="Updated kitchen (2021) with quartz counters, new roof (2023), finished basement with family "
                    "room and bedroom, fenced yard. Seller offering $5,000 toward buyer's closing costs with an "
                    "acceptable offer.",
            agent="Lockbox on front door, code 6142. Seller relocating for work; prefers settlement after "
                  "December 1 and 3 days possession after recording. Call listing agent Pat Fakerson at "
                  "801-555-0188 with questions.",
            showing="Book through Example Showings app. 1 hour notice.")
practice_comps = [
    comp("2288140", "Sold", "2310 E Pretend Poppy Ln", "Two Story", 2003, 4, 3.5, 1980, 1000, 900, 2, 0.17,
         "2026-08-28", 569900, 564900, pending="2026-09-10", sold="2026-10-02", sp=560000, conc=4000, hoa=45,
         remarks="Finished basement, updated baths, fenced yard.",
         agent="Lockbox on garage keypad, code 1186. Seller already moved.", showing="Go and show."),
    comp("2285512", "Sold", "2195 E Sample Sage Dr", "Two Story", 2006, 4, 3.5, 2080, 1040, 1040, 3, 0.20,
         "2026-07-30", 574900, 574900, pending="2026-08-14", sold="2026-09-12", sp=571000, conc=0, hoa=45,
         remarks="Three-car garage, fully finished basement, upgraded kitchen.",
         agent="Seller needs a quick close. Call LA first.", showing="Appointment through Example Showings app."),
    comp("2284471", "Sold", "2041 E Example Aster Way", "Two Story", 2001, 4, 3, 1920, 980, 0, 2, 0.16,
         "2026-07-10", 559900, 549900, pending="2026-08-02", sold="2026-08-22", sp=545000, conc=6000, hoa=45,
         remarks="Unfinished basement ready for your ideas. Original kitchen.",
         agent="Lockbox code 5520.", showing="Go and show."),
    comp("2281937", "Sold", "2402 E Pretend Poppy Ln", "Two Story", 2004, 4, 3.5, 2010, 1000, 850, 2, 0.18,
         "2026-05-15", 552000, 552000, pending="2026-05-22", sold="2026-06-20", sp=556500, conc=0, hoa=45,
         remarks="Same floor plan as several homes on the street. Finished basement, original kitchen.",
         agent="Multiple offers received.", showing="Appointment through Example Showings app."),
    comp("2289305", "Sold", "1988 E Sample Sage Dr", "Two Story", 2008, 5, 3.5, 2150, 1050, 1000, 2, 0.19,
         "2026-09-18", 589900, 579900, pending="2026-10-03", sold="2026-10-20", sp=572500, conc=5000, hoa=45,
         remarks="Five bedrooms, finished basement, newer flooring.",
         agent="Tenant occupied until 10/15. Code 8813.", showing="24 hour notice to tenant."),
    comp("2276220", "Sold", "2277 E Make Believe Ct", "Two Story", 2003, 4, 3.5, 1990, 1000, 850, 2, 0.17,
         "2026-02-10", 545000, 539900, pending="2026-02-24", sold="2026-03-14", sp=538000, conc=3000, hoa=45,
         remarks="Finished basement, cul-de-sac lot.", agent="", showing="Go and show."),
    comp("2287790", "Sold", "2129 E Example Aster Way", "Two Story", 2002, 4, 3.5, 1990, 1000, 850, 2, 0.17,
         "2026-06-01", 515000, 509000, pending="2026-08-30", sold="2026-09-30", sp=499000, conc=0, hoa=45,
         special="Short Sale", remarks="Short sale, subject to lender approval. Sold as-is.",
         agent="Lender approval received 8/28.", showing="Go and show."),
    comp("2290688", "Pending", "2350 E Sample Sage Dr", "Two Story", 2005, 4, 3.5, 2040, 1000, 950, 2, 0.18,
         "2026-10-20", 574900, 574900, pending="2026-11-01", hoa=45,
         remarks="Finished basement, updated kitchen, new carpet.", agent="Accepted offer 11/1.",
         showing="No more showings."),
    comp("2289961", "Active", "2077 E Example Aster Way", "Two Story", 2002, 4, 3, 1940, 960, 700, 2, 0.16,
         "2026-10-05", 565000, 559900, hoa=45,
         remarks="Partially finished basement, original kitchen, new furnace.", agent="Lockbox code 4407.",
         showing="Go and show."),
    comp("2290455", "Active", "2422 E Pretend Poppy Ln", "Two Story", 2007, 5, 3.5, 2200, 1100, 1100, 3, 0.21,
         "2026-10-24", 589900, 589900, hoa=45,
         remarks="Five bedrooms, three-car garage, fully finished basement, remodeled kitchen.",
         agent="Seller is a licensed agent.", showing="Appointment through Example Showings app."),
    comp("2283016", "Expired", "1950 E Sample Sage Dr", "Two Story", 2004, 4, 3.5, 2010, 1000, 850, 2, 0.18,
         "2026-06-30", 615000, 599000, off="2026-09-30", hoa=45,
         remarks="Finished basement, original kitchen.", agent="", showing="Go and show."),
]
write_utah_csv("practice/02 CMA Export - 2286 E Pretend Poppy Ln.csv", [subj] + practice_comps, city, ASOF)
utah_sheet("practice-mls.html", "practice/01 MLS Agent Full Report - 2286 E Pretend Poppy Ln.pdf", subj, city, ASOF,
           [("10/16/2026", "New Listing", "", "$579,900", "1"),
            ("10/30/2026", "Price Change", "$579,900", "$569,900", "14")],
           dict(beds="4 (3 above grade, 1 basement)", baths="3.5 (2.5 above grade, 1 basement)",
                garage="2 car attached", lot="0.18 acres, fenced", hoa="$45 per month (common area)",
                taxes="$3,212 (2026)", water="Culinary: Fictional Fork City. Secondary: Pretend Canal Co. (pressurized)",
                hvac="Forced air gas furnace (2016), central air (2016)", roof="Asphalt shingle (2023)",
                owner="Lee Fakerson and Pat Fakerson", occupancy="Owner",
                la="Pat Fakerson, Make Believe Realty (fictional), 801-555-0188"))
letter("practice-letter.html", "practice/03 Preapproval Letter - Riley and Jordan Exampleton.pdf",
       "Pretendwell Home Lending (fictional)",
       ["4400 S Example Commerce Dr, Fictional Fork, UT 84000", "801-555-0123"],
       "2026-10-28", "To Whom It May Concern:",
       ["Riley Exampleton and Jordan Exampleton have been preapproved for a <b>Conventional 30-year fixed</b> "
        "mortgage for the purchase of a primary residence, with a purchase price up to <b>$575,000</b> and a "
        "down payment of <b>10%</b>.",
        "This preapproval is based on our review of the borrowers' credit report, income documentation and "
        "asset statements. Funds for the down payment and estimated closing costs have been verified.",
        "Final loan approval is subject to a satisfactory appraisal of the property, clear title, a fully "
        "executed purchase contract, and no material change in the borrowers' financial condition before "
        "closing.",
        "Timing: we typically need 14 calendar days from acceptance to receive the appraisal and 21 calendar "
        "days from acceptance for final loan approval.",
        "This letter is valid through <b>December 27, 2026</b>. It is not a commitment to lend."],
       ["Casey Notreal, Loan Officer", "Pretendwell Home Lending (fictional)", "NMLS ID: PRACTICE-0000",
        "801-555-0123"])

# ---------------------------------------------------------------------------------------------------
# CASE 1: 734 N Make Believe Ave, Pretend Springs, UT (Competitive; December 4, 2024 REPC; FHA)
# ---------------------------------------------------------------------------------------------------
city1 = "Pretend Springs"
c1 = "evals/files/case-1-hot-fha"
s1 = comp("2290877", "Active", "734 N Make Believe Ave", "Rambler", 1971, 5, 3, 1250, 1250, 1150, 2, 0.21,
          "2026-11-05", 499900, 499900,
          remarks="Rambler with a fully finished basement, new furnace and water heater (2024), updated main bath, "
                  "large fenced yard.",
          agent="Lockbox on back door, code 3390. Multiple offers expected. Seller prefers conventional or cash. "
                "Seller has a home under contract and needs to close by 12/18.",
          showing="Showings start 11/6. 30 minute maximum.")
comps1 = [
    comp("2287112", "Sold", "812 N Make Believe Ave", "Rambler", 1973, 5, 3, 1260, 1260, 1200, 2, 0.20,
         "2026-09-12", 489900, 489900, pending="2026-09-16", sold="2026-10-09", sp=498000, conc=6000,
         remarks="Finished basement, updated kitchen, two-car garage.", agent="Lockbox code 2071.",
         showing="Go and show."),
    comp("2286350", "Sold", "655 N Sample Birch St", "Rambler", 1969, 4, 2, 1210, 1210, 900, 2, 0.19,
         "2026-08-29", 479900, 479900, pending="2026-09-03", sold="2026-09-26", sp=485000, conc=0,
         remarks="Partly finished basement, original kitchen.", agent="Seller prefers cash.",
         showing="Appointment through Example Showings app."),
    comp("2288664", "Sold", "901 N Example Larch Dr", "Rambler", 1975, 4, 2, 1180, 1180, 600, 1, 0.18,
         "2026-09-30", 474900, 474900, pending="2026-10-06", sold="2026-10-24", sp=476000, conc=3000,
         remarks="One-car garage, partly finished basement.", agent="", showing="Go and show."),
    comp("2284019", "Sold", "702 N Make Believe Ave", "Rambler", 1972, 5, 3, 1250, 1250, 1100, 2, 0.21,
         "2026-07-18", 499900, 489000, pending="2026-07-30", sold="2026-08-15", sp=487500, conc=5000,
         remarks="Same floor plan as several homes on the street. Finished basement.", agent="Code 9902.",
         showing="Go and show."),
    comp("2282475", "Sold", "588 N Pretend Pine Ct", "Rambler", 1968, 4, 2, 1150, 1150, 1000, 2, 0.17,
         "2026-06-12", 469900, 469900, pending="2026-06-16", sold="2026-07-11", sp=472000, conc=0,
         remarks="Finished basement, cul-de-sac.", agent="", showing="Go and show."),
    comp("2286901", "Sold", "1015 N Fake Fir Ln", "Two Story", 1998, 5, 3.5, 2100, 1050, 1000, 3, 0.25,
         "2026-08-08", 569900, 564900, pending="2026-08-20", sold="2026-09-05", sp=562000, conc=0,
         remarks="Two-story with three-car garage.", agent="", showing="Go and show."),
    comp("2290512", "Pending", "760 N Sample Birch St", "Rambler", 1974, 5, 3, 1270, 1270, 1150, 2, 0.22,
         "2026-10-29", 494900, 494900, pending="2026-11-02",
         remarks="Finished basement, updated kitchen and baths.", agent="Accepted offer over list.",
         showing="No more showings."),
    comp("2289340", "Active", "999 N Example Larch Dr", "Rambler", 1966, 4, 2, 1190, 1190, 500, 1, 0.16,
         "2026-10-02", 489900, 479900,
         remarks="Partly finished basement, needs some updating.", agent="Lockbox code 6650.",
         showing="Go and show."),
]
write_utah_csv(f"{c1}/cma-export-734-n-make-believe-ave.csv", [s1] + comps1, city1, ASOF)
utah_sheet("case1-mls.html", f"{c1}/mls-sheet-734-n-make-believe-ave.pdf", s1, city1, ASOF,
           [("11/05/2026", "New Listing", "", "$499,900", "1")],
           dict(beds="5 (3 above grade, 2 basement)", baths="3 (2 above grade, 1 basement)",
                garage="2 car attached", lot="0.21 acres, fenced", hoa="None", taxes="$2,744 (2026)",
                water="Culinary: Pretend Springs City", hvac="Forced air gas furnace (2024), central air (2015)",
                roof="Asphalt shingle (2012)", owner="Robin Notaperson", occupancy="Owner",
                la="Drew Sampleman, Pretend Valley Realty (fictional), 801-555-0177"))
letter("case1-letter.html", f"{c1}/preapproval-testerly-fha.pdf", "Imaginary Valley Home Loans (fictional)",
       ["120 W Fake Main St, Pretend Springs, UT 84000", "801-555-0145"], "2026-11-02",
       "Re: Preapproval for Morgan Testerly and Sky Testerly",
       ["Morgan Testerly and Sky Testerly are preapproved for an <b>FHA 30-year fixed</b> loan to purchase a "
        "primary residence with a purchase price up to <b>$515,000</b>, with the FHA minimum down payment of "
        "<b>3.5%</b>.",
        "We have reviewed credit, income and assets. Verified assets are sufficient for the minimum down "
        "payment and estimated closing costs.",
        "Final approval is subject to an FHA appraisal that meets HUD minimum property requirements, clear "
        "title, a fully executed purchase contract with the FHA amendatory clause or FHA/VA Loan Addendum, and "
        "final underwriting.",
        "Timing: we order the appraisal within 3 business days of acceptance. FHA appraisals in this area have "
        "been returning in 10 to 14 days, and we can be ready to close 25 days from acceptance.",
        "This letter expires <b>January 31, 2027</b>. It is not a commitment to lend."],
       ["Jamie Notarealname, Loan Officer", "Imaginary Valley Home Loans (fictional)", "801-555-0145"])

# ---------------------------------------------------------------------------------------------------
# CASE 2: 5150 S Imaginary Elm Way, Fakerton, UT (Buyer Leverage; November 1, 2026 REPC; sale of home)
# ---------------------------------------------------------------------------------------------------
city2 = "Fakerton"
c2 = "evals/files/case-2-stale-2026-repc"
s2 = comp("2285004", "Active", "5150 S Imaginary Elm Way", "Two Story", 1998, 5, 3.5, 2450, 1150, 1100, 3, 0.24,
          "2026-09-09", 649900, 619900,
          remarks="Vacant and easy to show. Original kitchen, newer carpet, three-car garage, corner lot. Seller "
                  "will consider concessions.",
          agent="Vacant, go and show. Lockbox code 7714 on side door. Seller relocated out of state and is "
                "motivated, bring all offers.",
          showing="Go and show. Text listing agent after.")
comps2 = [
    comp("2286221", "Sold", "5210 S Imaginary Elm Way", "Two Story", 1999, 5, 3.5, 2420, 1150, 1150, 3, 0.22,
         "2026-08-20", 624900, 609900, pending="2026-09-28", sold="2026-10-17", sp=600000, conc=7500,
         remarks="Finished basement, original kitchen, three-car garage.", agent="Code 3141.",
         showing="Go and show."),
    comp("2285567", "Sold", "4988 S Pretend Hazel Dr", "Two Story", 1996, 5, 3, 2380, 1100, 900, 2, 0.20,
         "2026-08-01", 615000, 599900, pending="2026-09-08", sold="2026-09-30", sp=592000, conc=5000,
         remarks="Two-car garage, mostly finished basement.", agent="", showing="Go and show."),
    comp("2287300", "Sold", "5077 S Sample Walnut Ln", "Two Story", 2001, 5, 3.5, 2510, 1200, 1150, 3, 0.25,
         "2026-09-05", 614900, 614900, pending="2026-10-08", sold="2026-10-28", sp=605000, conc=0,
         remarks="Updated kitchen (2022), finished basement, three-car garage.", agent="Seller relocating.",
         showing="Appointment through Example Showings app."),
    comp("2283482", "Sold", "5302 S Example Linden Ct", "Two Story", 1997, 4, 3, 2300, 1100, 600, 2, 0.19,
         "2026-06-06", 599900, 589900, pending="2026-07-02", sold="2026-07-25", sp=585000, conc=4000,
         remarks="Partly finished basement, two-car garage.", agent="", showing="Go and show."),
    comp("2281904", "Sold", "5125 S Imaginary Elm Way", "Two Story", 1998, 5, 3.5, 2450, 1150, 1100, 3, 0.23,
         "2026-05-02", 610000, 610000, pending="2026-05-20", sold="2026-06-14", sp=610000, conc=0,
         remarks="Same floor plan. Updated kitchen and new roof (2025).", agent="", showing="Go and show."),
    comp("2287455", "Pending", "4901 S Pretend Hazel Dr", "Two Story", 1995, 5, 3, 2400, 1150, 1000, 3, 0.21,
         "2026-09-20", 619900, 604900, pending="2026-11-03",
         remarks="Finished basement, three-car garage.", agent="Accepted 11/3, buyer has 14 day DD.",
         showing="No more showings."),
    comp("2287811", "Active", "5266 S Sample Walnut Ln", "Two Story", 1998, 5, 3.5, 2440, 1150, 1100, 3, 0.21,
         "2026-09-25", 609900, 599900,
         remarks="Finished basement, three-car garage, original kitchen.", agent="Lockbox code 2468.",
         showing="Go and show."),
    comp("2288954", "Active", "5011 S Example Linden Ct", "Two Story", 2003, 5, 3.5, 2520, 1200, 1200, 3, 0.22,
         "2026-10-10", 625000, 614900,
         remarks="Remodeled kitchen, finished basement, three-car garage.", agent="",
         showing="Appointment through Example Showings app."),
    comp("2284390", "Expired", "5333 S Imaginary Elm Way", "Two Story", 1999, 5, 3.5, 2460, 1150, 1100, 3, 0.22,
         "2026-07-15", 645000, 629000, off="2026-10-15",
         remarks="Finished basement, three-car garage.", agent="", showing="Go and show."),
]
write_utah_csv(f"{c2}/comps-export-5150-s-imaginary-elm-way.csv", [s2] + comps2, city2, ASOF)
utah_sheet("case2-mls.html", f"{c2}/mls-sheet-5150-s-imaginary-elm-way.pdf", s2, city2, ASOF,
           [("09/09/2026", "New Listing", "", "$649,900", "1"),
            ("10/01/2026", "Price Change", "$649,900", "$629,900", "22"),
            ("10/22/2026", "Price Change", "$629,900", "$619,900", "43")],
           dict(beds="5 (4 above grade, 1 basement)", baths="3.5 (2.5 above grade, 1 basement)",
                garage="3 car attached", lot="0.24 acres, corner", hoa="None", taxes="$3,906 (2026)",
                water="Culinary: Fakerton City. Secondary: Imaginary Irrigation Co. (pressurized)",
                hvac="Forced air gas furnace (2013), central air (2013)", roof="Asphalt shingle (2010)",
                owner="Terry Notreal", occupancy="Vacant",
                la="Alex Fakename, Example Peak Realty (fictional), 801-555-0166"))
letter("case2-letter.html", f"{c2}/preapproval-mockwell.pdf", "Notarealtown Credit Union (fictional)",
       ["77 E Pretend Center St, Fakerton, UT 84000", "801-555-0133"], "2026-11-04",
       "Re: Mortgage Preapproval, Avery Mockwell and Quinn Mockwell",
       ["Avery Mockwell and Quinn Mockwell are preapproved for a <b>Conventional 30-year fixed</b> loan for a "
        "primary residence with a purchase price up to <b>$640,000</b> and a down payment of <b>20%</b>.",
        "This approval is <b>contingent upon the sale and closing of the borrowers' current residence at 88 W "
        "Sample Ct</b>. Proceeds from that sale are part of the verified funds for the down payment.",
        "We have reviewed credit, income and asset documentation. Final approval is subject to a satisfactory "
        "appraisal, clear title and final underwriting.",
        "Timing: we usually receive the appraisal within 12 days of acceptance and can issue final approval "
        "25 days after acceptance, assuming the current residence has closed.",
        "Valid through <b>January 15, 2027</b>. This is not a commitment to lend."],
       ["Jordan Sampleby, Mortgage Officer", "Notarealtown Credit Union (fictional)", "801-555-0133"])

# ---------------------------------------------------------------------------------------------------
# CASE 3: 1209 W Notreal Ridge Dr, Pretendburg, ID (general mode; appraisal waiver with thin reserves)
# ---------------------------------------------------------------------------------------------------
city3 = "Pretendburg"
c3 = "evals/files/case-3-idaho-appraisal-waiver"
s3 = comp("98120455", "Active", "1209 W Notreal Ridge Dr", "Single Family, One Story", 2015, 3, 2, 1640, 0, 0, 2,
          0.15, "2026-10-30", 474900, 474900, hoa=35,
          remarks="Single-level with open kitchen, covered patio, fully fenced. Near the Pretendburg greenbelt path.",
          agent="Multiple offers in hand. Garage code 2580 for showings. Seller would like a 30 day close.",
          showing="")
comps3 = [
    comp("98119876", "Closed", "1188 W Notreal Ridge Dr", "Single Family, One Story", 2016, 3, 2, 1620, 0, 0, 2,
         0.14, "2026-09-26", 464900, 464900, pending="2026-10-01", sold="2026-10-21", sp=468000, conc=0, hoa=35,
         remarks="Single-level, open plan, fenced.", agent="Multiple offers. Garage code 1357."),
    comp("98118802", "Closed", "1302 W Example Bluff Way", "Single Family, One Story", 2014, 3, 2, 1680, 0, 0, 2,
         0.16, "2026-08-21", 469900, 469900, pending="2026-08-28", sold="2026-09-18", sp=470000, conc=2500,
         hoa=35, remarks="Single-level, covered patio.", agent=""),
    comp("98117650", "Closed", "1255 W Notreal Ridge Dr", "Single Family, One Story", 2015, 3, 2, 1590, 0, 0, 2,
         0.15, "2026-07-31", 459900, 459900, pending="2026-08-10", sold="2026-08-29", sp=455000, conc=4000,
         hoa=35, remarks="Single-level, fenced, original finishes.", agent="Seller relocating."),
    comp("98119122", "Closed", "1420 W Sample Mesa Ln", "Single Family, One Story", 2012, 3, 2, 1540, 0, 0, 2,
         0.13, "2026-09-06", 449900, 449900, pending="2026-09-12", sold="2026-10-03", sp=452000, conc=0, hoa=35,
         remarks="Single-level on a smaller lot.", agent=""),
    comp("98120390", "Pending", "1340 W Example Bluff Way", "Single Family, One Story", 2016, 3, 2, 1650, 0, 0, 2,
         0.15, "2026-10-28", 472500, 472500, pending="2026-11-04", hoa=35,
         remarks="Single-level, upgraded flooring.", agent="Accepted offer 11/4."),
    comp("98120111", "Active", "1500 W Sample Mesa Ln", "Single Family, One Story", 2018, 3, 2.5, 1720, 0, 0, 3,
         0.17, "2026-10-20", 479900, 479900, hoa=35,
         remarks="Single-level with three-car garage and flex room.", agent="Lockbox code 9044."),
]
write_idaho_csv(f"{c3}/comps-1209-w-notreal-ridge-dr.csv", [s3] + comps3, city3, ASOF)
n3 = days(s3["list_date"], ASOF)
body3 = ("<h1>Agent Detail Report</h1><div class='sub'>Pretend Valley MLS (fictional). Printed November 8, 2026.</div>"
         + kv([("Listing ID", s3["mls"]), ("Status", "Active"),
               ("Address", "1209 W Notreal Ridge Dr, Pretendburg, ID 83000"),
               ("List Price", money(s3["lp"])), ("Original List Price", money(s3["olp"])),
               ("Listing Contract Date", mdy(s3["list_date"])), ("DOM / CDOM", f"{n3} / {n3}"),
               ("Property Subtype", "Single Family, One Story"), ("Year Built", 2015),
               ("Bedrooms / Bathrooms", "3 / 2"), ("Living Area SqFt", "1,640"), ("Basement", "None"),
               ("Garage", "2 car attached"), ("Lot", "0.15 acres, fenced"),
               ("Association Fee", "$35 per month (common area, greenbelt path)"),
               ("Taxes", "$2,318 (2025, with homeowner's exemption)"),
               ("Heating / Cooling", "Forced air gas, central air (2015)"),
               ("Public Remarks", s3["remarks"]), ("Private Remarks", s3["agent"]),
               ("Listing Agent", "Sam Notreal, Imaginary Plains Realty (fictional), 208-555-0110")])
         + "<h2>Listing History</h2>"
         + history_table([("10/30/2026", "New Listing", "", "$474,900", "1")]))
add_pdf("case3-mls.html", "Agent Detail Report 1209 W Notreal Ridge Dr", body3, f"{c3}/mls-sheet-1209-w-notreal-ridge-dr.pdf")
letter("case3-letter.html", f"{c3}/preapproval-samplewood.pdf", "Imaginary Plains Mortgage (fictional)",
       ["900 N Fake Capitol Blvd, Pretendburg, ID 83000", "208-555-0128"], "2026-11-02",
       "Re: Preapproval, Dakota Samplewood (Loan #: 7741009322)",
       ["Dakota Samplewood is preapproved for a <b>Conventional 30-year fixed</b> loan to purchase a primary "
        "residence with a purchase price up to <b>$490,000</b> and a down payment of <b>5%</b>.",
        "Verified assets: sufficient for the 5% down payment and estimated closing costs, with approximately "
        "<b>$3,800</b> remaining in reserves after closing.",
        "Final approval is subject to a satisfactory appraisal, clear title and final underwriting. The loan "
        "amount is based on the lower of the purchase price or the appraised value.",
        "This letter expires <b>December 2, 2026</b>. It is not a commitment to lend."],
       ["Riley Fakerly, Loan Officer", "Imaginary Plains Mortgage (fictional)", "208-555-0128"])

with open(os.path.join(HTML, "pdfs.json"), "w") as f:
    json.dump(PDFS, f, indent=1)
print("wrote", len(PDFS), "html files for PDF printing")
