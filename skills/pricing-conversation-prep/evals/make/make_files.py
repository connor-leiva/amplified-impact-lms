"""Writes the made-up input files for pricing-conversation-prep: the practice CMA (CSV now, PDF via
html_to_pdf.cjs) and the three eval cases. Every street, person, brokerage, MLS and showing service here
is fictional. Phone numbers use the 555-01xx range reserved for fiction.

Usage (from anywhere):
  python3 make_files.py SKILL_DIR HTML_OUT_DIR
  node html_to_pdf.cjs HTML_OUT_DIR SKILL_DIR
"""
import csv
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


def num(n):
    return "" if n in (None, "") else f"{n:,}"


def listing(mls, status, addr, sub, style, yb, beds, baths, ag, bg, bgfin, gar, lot, list_date,
            olp, lp, pending=None, sold=None, sp=None, conc=None, off=None, hoa=0, remarks="",
            agent="", showing="", special="Standard", city="Sampleville", state="UT", zip_="84000"):
    return dict(mls=mls, status=status, addr=addr, city=city, state=state, zip=zip_, sub=sub, style=style,
                yb=yb, beds=beds, baths=baths, ag=ag, bg=bg, bgfin=bgfin, gar=gar, lot=lot,
                list_date=list_date, olp=olp, lp=lp, pending=pending, sold=sold, sp=sp, conc=conc,
                off=off, hoa=hoa, remarks=remarks, agent=agent, showing=showing, special=special)


def dom(x, asof):
    if x["pending"]:
        return days(x["list_date"], x["pending"])
    if x["off"]:
        return days(x["list_date"], x["off"])
    return days(x["list_date"], asof)


UTAH_COLS = ["MLS #", "Status", "Address", "City", "State", "Zip", "Subdivision", "Style", "Year Built",
             "List Price", "Original List Price", "Sold Price", "Seller Concessions", "List Date",
             "Pending Date", "Sold Date", "Off Market Date", "DOM", "CDOM", "Beds", "Baths",
             "Above Grade Fin SqFt", "Below Grade SqFt", "Below Grade Fin SqFt", "Total Fin SqFt",
             "Garage Spaces", "Lot Acres", "HOA Fee (Monthly)", "Special Conditions", "Public Remarks",
             "Agent Remarks", "Showing Instructions"]


def utah_row(x, asof):
    t = dom(x, asof)
    return [x["mls"], x["status"], x["addr"], x["city"], x["state"], x["zip"], x["sub"], x["style"], x["yb"],
            x["lp"], x["olp"], x["sp"] or "", "" if x["sp"] is None else (x["conc"] or 0), x["list_date"],
            x["pending"] or "", x["sold"] or "", x["off"] or "", t, t, x["beds"], x["baths"], x["ag"], x["bg"],
            x["bgfin"], x["ag"] + x["bgfin"], x["gar"], f"{x['lot']:.2f}", x["hoa"], x["special"],
            x["remarks"], x["agent"], x["showing"]]


def write_csv(path, cols, rows):
    full = os.path.join(SKILL, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", newline="", encoding="utf-8") as f:
        f.write(STAMP + "\n")
        w = csv.writer(f)
        w.writerow(cols)
        w.writerows(rows)
    print("wrote", path)


CSS = """
body{font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;color:#222}
h1{font-size:17pt;margin:0 0 4px} h2{font-size:12.5pt;margin:16px 0 6px;border-bottom:2px solid #355;}
h3{font-size:10.5pt;margin:12px 0 4px}
.stamp{color:#b00;font-weight:bold;font-size:10pt;margin-bottom:8px}
table{border-collapse:collapse;width:100%;margin:4px 0 10px} th,td{border:1px solid #999;padding:3px 4px;vertical-align:top}
th{background:#e3eaea;text-align:left;font-size:8.5pt} td{font-size:8.5pt}
.kv td:first-child{width:36%;background:#f4f6f6;font-weight:bold}
.small{font-size:8pt;color:#555} .pb{page-break-before:always}
.box{border:1px solid #355;padding:6px 8px;margin:6px 0;background:#f8fafa}
"""


def page(title, body):
    return f"<!doctype html><html><head><meta charset='utf-8'><title>{title}</title><style>{CSS}</style></head><body><div class='stamp'>{STAMP}</div>{body}</body></html>"


def save_html(name, html, pdf_rel):
    with open(os.path.join(HTML, name), "w", encoding="utf-8") as f:
        f.write(html)
    PDFS.append({"html": name, "pdf": pdf_rel})


def grid(rows, asof, sold=True):
    head = ("<tr><th>MLS #</th><th>Address</th><th>Style / Yr</th><th>Bd / Ba</th><th>Above Grade Fin</th>"
            "<th>Bsmt Total / Fin</th><th>Gar</th><th>Lot Ac</th><th>Orig List</th><th>List</th>"
            + ("<th>Sold Price</th><th>Concess.</th><th>Sold Date</th>" if sold else "<th>Status Date</th>")
            + "<th>DOM</th></tr>")
    out = []
    for x in rows:
        t = dom(x, asof)
        tail = (f"<td>{money(x['sp'])}</td><td>{money(x['conc'] or 0)}</td><td>{x['sold']}</td>" if sold else
                f"<td>{x['pending'] or x['off'] or 'Active since ' + x['list_date']}</td>")
        out.append(f"<tr><td>{x['mls']}</td><td>{x['addr']}</td><td>{x['style']} / {x['yb']}</td><td>{x['beds']} / {x['baths']}</td>"
                   f"<td>{num(x['ag'])}</td><td>{num(x['bg'])} / {num(x['bgfin'])}</td><td>{x['gar']}</td><td>{x['lot']:.2f}</td>"
                   f"<td>{money(x['olp'])}</td><td>{money(x['lp'])}</td>{tail}<td>{t}</td></tr>")
    return "<table>" + head + "".join(out) + "</table>"


def summary(groups, asof):
    rows = []
    for label, xs in groups:
        if not xs:
            continue
        prices = [x["sp"] if x["sp"] else x["lp"] for x in xs]
        tot = [x["ag"] + x["bgfin"] for x in xs]
        avg = sum(prices) / len(prices)
        ppsf = sum(p / s for p, s in zip(prices, tot)) / len(xs)
        rows.append(f"<tr><td>{label}</td><td>{len(xs)}</td><td>{money(min(prices))}</td><td>{money(max(prices))}</td>"
                    f"<td>{money(round(avg))}</td><td>${ppsf:,.2f}</td><td>{round(sum(dom(x, asof) for x in xs) / len(xs))}</td></tr>")
    return ("<table><tr><th>Status</th><th>Count</th><th>Low</th><th>High</th><th>Average Price</th>"
            "<th>Avg Price / Total Fin SqFt</th><th>Avg DOM</th></tr>" + "".join(rows) + "</table>"
            "<p class='small'>Sold rows use the sold price; all other statuses use the current list price. "
            "Averages are not adjusted for differences between properties.</p>")


def remarks_table(rows):
    out = "".join(f"<tr><td>{x['mls']}</td><td>{x['addr']}</td><td>{x['remarks']}</td></tr>" for x in rows)
    return "<table><tr><th>MLS #</th><th>Address</th><th>Public Remarks</th></tr>" + out + "</table>"


def subject_table(s):
    rows = "".join(f"<tr><td>{k}</td><td>{v}</td></tr>" for k, v in s)
    return f"<table class='kv'>{rows}</table>"


def cma_report(fname, pdf_rel, asof_long, asof, prepared_for, prepared_by, criteria, subject_kv, solds,
               pendings, actives, expireds):
    body = (f"<h1>Comparative Market Analysis</h1><p><b>Prepared for:</b> {prepared_for}<br>"
            f"<b>Prepared by:</b> {prepared_by}<br><b>Date:</b> {asof_long}<br><b>Source:</b> Example MLS (fictional) CMA Report</p>"
            f"<div class='box'><b>Search criteria:</b> {criteria}</div>"
            f"<h2>Subject Property</h2>{subject_table(subject_kv)}"
            f"<h2>CMA Summary</h2>{summary([('Sold', solds), ('Pending', pendings), ('Active', actives), ('Expired', expireds)], asof)}"
            f"<h2 class='pb'>Sold Comparables</h2>{grid(solds, asof)}"
            f"<h2>Pending Comparables</h2>{grid(pendings, asof, sold=False)}"
            f"<h2>Active Comparables</h2>{grid(actives, asof, sold=False)}"
            f"<h2>Expired Comparables</h2>{grid(expireds, asof, sold=False)}"
            f"<h2 class='pb'>Comparable Remarks</h2>{remarks_table(solds + pendings + actives + expireds)}"
            "<p class='small'>DOM is days from list date to pending date (or to the expiration date, or to the report "
            "date for actives). This CMA is the agent's opinion of a likely price range, not an appraisal. "
            "Information not guaranteed.</p>")
    save_html(fname, page("CMA", body), pdf_rel)


# ---------------------------------------------------------------- practice (Utah, new listing) ---------
P_ASOF = "2026-11-05"
p_sub = "Juniper Example Park"
practice = [
    listing("2210555", "Sold", "1510 W Juniper Example Dr", p_sub, "Two Story", 2005, 5, 3.5, 2150, 1020, 1020, 2, 0.18,
            "2026-08-20", 609900, 594900, pending="2026-09-25", sold="2026-10-17", sp=589000, conc=7500,
            remarks="Finished basement, original kitchen, mature trees, fenced yard.",
            agent="Lockbox on garage keypad, code 7720. Seller already bought in another state.",
            showing="Appointment through Example Showings app."),
    listing("2207431", "Sold", "1433 W Juniper Example Dr", p_sub, "Two Story", 2007, 4, 2.5, 2240, 1060, 0, 2, 0.20,
            "2026-07-28", 575000, 575000, pending="2026-08-11", sold="2026-08-29", sp=572000, conc=0,
            remarks="Unfinished basement ready for your ideas. Newer furnace.",
            agent="Tenant occupied, 24 hour notice. Tenant name Robin Placeholder 801-555-0118.",
            showing="Call tenant first."),
    listing("2205870", "Sold", "1376 W Cedar Sample Cir", p_sub, "Two Story", 2006, 5, 3.5, 2120, 1000, 950, 3, 0.21,
            "2026-06-11", 599900, 599900, pending="2026-06-16", sold="2026-07-11", sp=604500, conc=0,
            remarks="Remodeled kitchen 2023, three-car garage, finished basement.",
            agent="Multiple offers, sold over list. Combo box on front door 5512.",
            showing="Go and show."),
    listing("2208902", "Sold", "1602 W Cedar Sample Cir", p_sub, "Two Story", 2004, 6, 3.5, 2300, 1100, 1100, 2, 0.17,
            "2026-08-01", 619000, 609000, pending="2026-09-14", sold="2026-09-26", sp=598000, conc=4000,
            remarks="Six bedrooms, finished basement with second kitchenette, backs to walking trail.",
            agent="Seller divorcing, needs quick close.", showing="Appointment required."),
    listing("2204120", "Sold", "1455 W Maple Mock Way", p_sub, "Two Story", 2008, 5, 3, 2060, 980, 900, 2, 0.16,
            "2026-05-12", 579900, 579900, pending="2026-05-21", sold="2026-06-05", sp=579900, conc=3000,
            remarks="Finished basement, updated lighting, smaller yard.", agent="", showing="Go and show."),
    listing("2207750", "Sold", "1299 W Maple Mock Way", p_sub, "Rambler", 2003, 5, 3, 1650, 1650, 1600, 3, 0.24,
            "2026-07-10", 614900, 614900, pending="2026-07-22", sold="2026-08-14", sp=612000, conc=0,
            remarks="Rambler with main floor living, fully finished basement, three-car garage.",
            agent="Lockbox side door 9034.", showing="Go and show."),
    listing("2212040", "Pending", "1528 W Juniper Example Dr", p_sub, "Two Story", 2006, 5, 3.5, 2190, 1040, 1000, 2, 0.19,
            "2026-10-22", 599900, 599900, pending="2026-10-31",
            remarks="Finished basement, new carpet, original kitchen.", agent="Accepted offer, inspection due 11/12.",
            showing="No more showings."),
    listing("2209731", "Active", "1620 W Cedar Sample Cir", p_sub, "Two Story", 2005, 5, 3.5, 2210, 1050, 1050, 2, 0.18,
            "2026-09-19", 639900, 624900,
            remarks="Finished basement, new roof 2025, upgraded kitchen.",
            agent="Seller motivated, relocating Dec 1. Combo box on back door 3381.", showing="Appointment required."),
    listing("2211566", "Active", "1388 W Maple Mock Way", p_sub, "Two Story", 2009, 4, 2.5, 2100, 1000, 0, 2, 0.17,
            "2026-10-24", 584900, 584900, remarks="Unfinished basement, fresh paint.", agent="", showing="Go and show."),
    listing("2212900", "Active", "1477 W Juniper Example Dr", p_sub, "Two Story", 2007, 5, 3.5, 2250, 1080, 1000, 2, 0.19,
            "2026-11-02", 609000, 609000, remarks="Finished basement, updated kitchen 2024, covered patio.",
            agent="Offers reviewed Monday 5 PM.", showing="Appointment required."),
    listing("2201234", "Expired", "1340 W Cedar Sample Cir", p_sub, "Two Story", 2006, 5, 3.5, 2180, 1040, 1000, 2, 0.20,
            "2026-06-02", 649900, 634900, off="2026-09-30",
            remarks="Finished basement, upgraded flooring, large deck.", agent="Seller may relist in spring.",
            showing="Appointment required."),
]
write_csv("practice/pricing-practice-mls-export.csv", UTAH_COLS, [utah_row(x, P_ASOF) for x in practice])
sel = lambda st, xs: [x for x in xs if x["status"] == st]
p_solds = [x for x in practice if x["status"] == "Sold" and x["style"] == "Two Story"]
cma_report(
    "practice-cma.html", "practice/pricing-practice-cma-report.pdf", "November 5, 2026", P_ASOF,
    "Sam and Pat Pretendley", "Jordan Example, Example Peak Realty (fictional)",
    "Residential, Juniper Example Park and adjoining streets, two-story homes, 2,000 to 2,400 above-grade finished sq ft. "
    "Sold within the last 6 months (May 5, 2026 to November 5, 2026), plus Pending, Active and Expired. "
    "The full search, including one rambler sale, is in the MLS export.",
    [("Address", "1482 W Juniper Example Dr, Sampleville, UT 84000"), ("Subdivision", p_sub), ("Style / Year Built", "Two Story / 2006"),
     ("Bedrooms", "5 (4 above grade, 1 basement)"), ("Bathrooms", "3.5 (2.5 above grade, 1 basement)"),
     ("Above Grade Finished SqFt", "2,180"), ("Basement SqFt (Total / Finished)", "1,040 / 980"), ("Total Finished SqFt", "3,160"),
     ("Garage", "2 car attached"), ("Lot", "0.19 acres"), ("HOA", "None"),
     ("Agent notes", "Basement finished 2021. Roof replaced 2024. Original kitchen cabinets, new counters 2019. Backs to neighbors (interior lot).")],
    p_solds, sel("Pending", practice), sel("Active", practice), sel("Expired", practice))

# ---------------------------------------------------------------- case 1 (Utah, finished basement) -----
C1_ASOF = "2026-11-05"
so, mm = "Sample Orchard Estates", "Makebelieve Meadows"
case1 = [
    listing("2209101", "Sold", "1204 W Sample Orchard Ln", so, "Rambler", 1999, 3, 2, 1480, 0, 0, 2, 0.21,
            "2026-08-11", 495000, 495000, pending="2026-09-01", sold="2026-09-18", sp=489000, conc=0,
            remarks="Single-level living on a slab, new LVP flooring 2025, fenced yard. No basement.",
            agent="Lockbox on front door, code 2291. Seller relocating out of state.", showing="Go and show."),
    listing("2205544", "Sold", "1157 W Sample Orchard Ln", so, "Rambler", 1998, 3, 2, 1420, 0, 0, 2, 0.20,
            "2026-05-28", 489900, 479900, pending="2026-07-01", sold="2026-07-30", sp=476500, conc=5000,
            remarks="Rambler on crawl space, original kitchen, newer roof (2021).", agent="Call listing agent before showing.",
            showing="Appointment required."),
    listing("2206870", "Sold", "1311 W Fictional Fox Way", so, "Two Story", 2001, 4, 2.5, 2050, 0, 0, 2, 0.19,
            "2026-07-08", 599000, 589000, pending="2026-08-06", sold="2026-08-22", sp=585000, conc=8000,
            remarks="Four bedrooms up plus loft, updated baths, slab foundation.", agent="Seller paid buyer closing costs.",
            showing="Go and show."),
    listing("2203312", "Sold", "1290 W Fictional Fox Way", so, "Two Story", 2000, 4, 2.5, 2210, 0, 0, 3, 0.23,
            "2026-05-02", 615000, 615000, pending="2026-05-11", sold="2026-06-12", sp=612000, conc=0,
            remarks="Three-car garage, RV parking, remodeled kitchen 2024.", agent="Two offers.", showing="Go and show."),
    listing("2210233", "Sold", "1175 W Pretend Plum Ct", so, "Rambler", 1997, 3, 2, 1510, 0, 0, 2, 0.25,
            "2026-08-04", 509900, 499900, pending="2026-09-14", sold="2026-10-03", sp=497500, conc=3000,
            remarks="Corner lot, original kitchen, new water heater. Crawl space.", agent="", showing="Appointment required."),
    listing("2191478", "Sold", "842 W Makebelieve Meadow Dr", mm, "Rambler", 1996, 5, 3, 1440, 1440, 1380, 2, 0.22,
            "2026-02-20", 554900, 554900, pending="2026-03-10", sold="2026-03-27", sp=552000, conc=6000,
            remarks="Fully finished basement with 2 bedrooms, bath and family room. Updated kitchen 2020.",
            agent="Lockbox code 6610.", showing="Go and show."),
    listing("2184002", "Sold", "905 W Makebelieve Meadow Dr", mm, "Rambler", 1995, 5, 3, 1390, 1390, 1300, 2, 0.20,
            "2025-10-21", 539900, 539900, pending="2025-11-17", sold="2025-12-15", sp=538000, conc=0,
            remarks="Finished basement, original kitchen, large backyard.", agent="", showing="Go and show."),
    listing("2211890", "Pending", "1222 W Sample Orchard Ln", so, "Rambler", 1999, 3, 2, 1460, 0, 0, 2, 0.21,
            "2026-10-14", 499900, 499900, pending="2026-10-26",
            remarks="Updated kitchen 2023, slab foundation, covered patio.", agent="Cash offer, closing 11/20.",
            showing="No more showings."),
    listing("2209877", "Active", "1338 W Fictional Fox Way", so, "Two Story", 2002, 4, 2.5, 2100, 0, 0, 2, 0.20,
            "2026-09-28", 614900, 599900, remarks="Four bedrooms up, new carpet, slab foundation.",
            agent="Seller will look at all offers.", showing="Appointment required."),
    listing("2208455", "Active", "877 W Makebelieve Meadow Dr", mm, "Rambler", 1996, 5, 3, 1420, 1420, 1350, 2, 0.21,
            "2026-09-14", 579900, 564900, remarks="Finished basement with second family room, updated kitchen.",
            agent="Gate code 4402.", showing="Appointment required."),
    listing("2212301", "Active", "1250 W Pretend Plum Ct", so, "Rambler", 1998, 3, 2, 1500, 0, 0, 2, 0.22,
            "2026-10-30", 514900, 514900, remarks="Remodeled kitchen and baths, crawl space.", agent="", showing="Go and show."),
    listing("2200981", "Expired", "1360 W Sample Orchard Ln", so, "Two Story", 2001, 4, 2.5, 1980, 0, 0, 2, 0.21,
            "2026-04-01", 649900, 629900, off="2026-06-30", remarks="Four bedrooms, bonus room, slab foundation.",
            agent="", showing="Appointment required."),
    listing("2198330", "Expired", "921 W Makebelieve Meadow Dr", mm, "Rambler", 1997, 5, 3, 1460, 1460, 1400, 2, 0.22,
            "2026-04-17", 619900, 619900, off="2026-08-15", remarks="Finished basement, theater room, RV pad.",
            agent="Seller firm on price.", showing="Appointment required."),
]
c1 = "evals/files/case-1-finished-basement/"
write_csv(c1 + "mls-export-1186-w-sample-orchard-ln.csv", UTAH_COLS, [utah_row(x, C1_ASOF) for x in case1])
cma_report(
    "case1-cma.html", c1 + "cma-report-1186-w-sample-orchard-ln.pdf", "November 5, 2026", C1_ASOF,
    "Dana and Lee Pretendson", "Riley Example, Pretend Peak Realty (fictional)",
    "Residential, Sample Orchard Estates, sold within 180 days (May 9, 2026 to November 5, 2026), plus Pending, Active and "
    "Expired. No home in Sample Orchard Estates has a basement, so the agent added finished-basement ramblers from "
    "Makebelieve Meadows (about 0.8 miles east): two sold within the last 12 months, one active and one expired.",
    [("Address", "1186 W Sample Orchard Ln, Sampleville, UT 84000"), ("Subdivision", so), ("Style / Year Built", "Rambler / 1998"),
     ("Bedrooms", "5 (3 above grade, 2 basement)"), ("Bathrooms", "3 (2 above grade, 1 basement)"),
     ("Above Grade Finished SqFt", "1,450"), ("Basement SqFt (Total / Finished)", "1,450 / 1,400"), ("Total Finished SqFt", "2,850"),
     ("Garage", "2 car attached"), ("Lot", "0.22 acres"), ("HOA", "None"),
     ("Agent notes", "Only home on the street with a basement (built as a model). Kitchen remodel 2022, new furnace 2023.")],
    sel("Sold", case1), sel("Pending", case1), sel("Active", case1), sel("Expired", case1))

# ---------------------------------------------------------------- case 2 (Utah, price reduction) -------
C2_ASOF = "2026-11-08"
pp = "Practice Pine Ridge"
kw = dict(city="Example Heights", hoa=45)
case2 = [
    listing("2214450", "Active", "3472 S Practice Pine Dr", pp, "Two Story", 2012, 5, 3.5, 2380, 1150, 1100, 3, 0.18,
            "2026-09-24", 689900, 689900,
            remarks="Open main floor, quartz kitchen, finished basement with theater room, three-car garage. Backs to Example Parkway with a vinyl privacy fence.",
            agent="Lockbox on side gate, code 4417. Sellers prefer 24-hour notice. Call Kim Mockridge at 801-555-0143 with questions.",
            showing="Use Example Showings app. Remove shoes.", **kw),
    listing("2206120", "Sold", "3518 S Practice Pine Dr", pp, "Two Story", 2013, 5, 3.5, 2350, 1150, 1050, 3, 0.17,
            "2026-07-21", 675000, 665000, pending="2026-08-14", sold="2026-08-28", sp=662000, conc=6000,
            remarks="Backs to open space, finished basement, new carpet.", agent="", showing="Go and show.", **kw),
    listing("2204511", "Sold", "3390 S Sample Spruce Ln", pp, "Two Story", 2011, 4, 2.5, 2410, 1200, 0, 3, 0.19,
            "2026-06-29", 649000, 649000, pending="2026-07-07", sold="2026-07-31", sp=649000, conc=0,
            remarks="Unfinished basement ready for your ideas. Interior lot.", agent="Lockbox front door 1180.",
            showing="Go and show.", **kw),
    listing("2203987", "Sold", "3455 S Practice Pine Dr", pp, "Two Story", 2012, 5, 3.5, 2300, 1100, 1100, 2, 0.18,
            "2026-05-27", 669900, 669900, pending="2026-06-07", sold="2026-06-26", sp=668500, conc=0,
            remarks="Interior lot, finished basement, updated kitchen.", agent="", showing="Go and show.", **kw),
    listing("2209012", "Sold", "3602 S Sample Spruce Ln", pp, "Two Story", 2014, 5, 3.5, 2420, 1180, 1120, 3, 0.20,
            "2026-08-30", 699900, 674900, pending="2026-10-06", sold="2026-10-21", sp=665000, conc=5000,
            remarks="Cul-de-sac, finished basement, owned solar panels.", agent="Two price reductions before contract.",
            showing="Appointment required.", **kw),
    listing("2211420", "Sold", "3376 S Pretend Poplar Way", pp, "Two Story", 2010, 5, 3, 2290, 1100, 1100, 2, 0.17,
            "2026-09-29", 659900, 659900, pending="2026-10-14", sold="2026-10-30", sp=655000, conc=4000,
            remarks="Fresh paint, new carpet, finished basement.", agent="", showing="Go and show.", **kw),
    listing("2210877", "Pending", "3527 S Practice Pine Dr", pp, "Two Story", 2013, 5, 3.5, 2360, 1150, 1100, 3, 0.18,
            "2026-09-25", 684900, 674900, pending="2026-10-28",
            remarks="Backs to Example Parkway, finished basement, three-car garage.", agent="FHA buyer.",
            showing="No more showings.", **kw),
    listing("2209660", "Active", "3611 S Sample Spruce Ln", pp, "Two Story", 2015, 5, 3.5, 2450, 1180, 1150, 3, 0.19,
            "2026-09-17", 699900, 679900, remarks="Newest home in the neighborhood, finished basement, cul-de-sac.",
            agent="Second price change 10/30. Seller open to concessions.", showing="Appointment required.", **kw),
    listing("2213004", "Active", "3420 S Pretend Poplar Way", pp, "Two Story", 2011, 4, 2.5, 2330, 1100, 0, 2, 0.17,
            "2026-10-20", 649900, 649900, remarks="Unfinished basement, new LVP flooring.", agent="", showing="Go and show.", **kw),
    listing("2214980", "Active", "3299 S Sample Spruce Ln", pp, "Two Story", 2013, 5, 3.5, 2280, 1120, 1080, 2, 0.18,
            "2026-11-04", 669000, 669000, remarks="Finished basement, upgraded lighting, interior lot.", agent="",
            showing="Go and show.", **kw),
    listing("2201550", "Expired", "3488 S Practice Pine Dr", pp, "Two Story", 2012, 5, 3.5, 2400, 1150, 1100, 3, 0.18,
            "2026-06-12", 699000, 699000, off="2026-09-10", remarks="Backs to Example Parkway, finished basement.",
            agent="", showing="Appointment required.", **kw),
]
c2 = "evals/files/case-2-price-reduction/"
write_csv(c2 + "comps-export-3472-s-practice-pine-dr.csv", UTAH_COLS, [utah_row(x, C2_ASOF) for x in case2])
s = case2[0]
mls_sheet = (
    "<h1>Agent Full Report</h1><p class='small'>Example MLS (fictional). Printed November 8, 2026.</p>"
    + subject_table([
        ("MLS #", s["mls"]), ("Status", "Active"), ("Address", "3472 S Practice Pine Dr, Example Heights, UT 84000"),
        ("Subdivision", pp), ("List Price", "$689,900"), ("Original List Price", "$689,900"), ("List Date", "09/24/2026"),
        ("Days on Market / Cumulative DOM", "45 / 45"), ("Price Changes", "None"), ("Style / Year Built", "Two Story / 2012"),
        ("Bedrooms", "5 (4 above grade, 1 basement)"), ("Bathrooms", "3.5 (2.5 above grade, 1 basement)"),
        ("Above Grade Finished SqFt", "2,380"), ("Basement SqFt (Total / Finished)", "1,150 / 1,100"),
        ("Total Finished SqFt", "3,480"), ("Garage", "3 car attached"), ("Lot", "0.18 acres, fenced, backs to Example Parkway"),
        ("HOA", "$45 per month (common area, snow removal on main roads)"), ("Heating / Cooling", "Forced air gas, central air (2012)"),
        ("Roof", "Asphalt shingle (2012)"), ("Owner", "Kim Mockridge and Avery Mockridge"),
        ("Public Remarks", s["remarks"]), ("Agent Remarks", s["agent"]), ("Showing Instructions", s["showing"]),
        ("Listing Agent", "Casey Example, Pretend Peak Realty (fictional), 801-555-0190"),
    ]))
save_html("case2-mls.html", page("MLS Sheet", mls_sheet), c2 + "mls-sheet-3472-s-practice-pine-dr.pdf")

showings = [
    ("09/27/2026", "Morgan Testwell, Fakeview Realty, 801-555-0172", "3", "Too high", "Nice home but buyers felt it was priced above the Practice Pine homes that sold this summer."),
    ("09/28/2026", "Jesse Sampleton, Mock Mountain Homes, 801-555-0164", "4", "About right", "Loved the kitchen and the basement theater room. Buyers are writing on a different home."),
    ("10/03/2026", "Alex Notreal, Fakeview Realty, 801-555-0177", "2", "Too high", "Road noise from Example Parkway in the backyard was a concern at this price."),
    ("10/05/2026", "Taylor Placeholder, Example Key Realty, 801-555-0151", "3", "Too high", "Buyers want to be under $670k for this size."),
    ("10/11/2026", "Jordan Imaginary, Mock Mountain Homes, 801-555-0166", "", "", "No feedback received."),
    ("10/12/2026", "Sam Fictive, Pretendwell Properties, 801-555-0139", "2", "Too high", "Buyers want a better school district."),
    ("10/18/2026", "Riley Nobody, Example Key Realty, 801-555-0157", "3", "About right", "Clean and well kept. Buyers chose a home with a bigger yard."),
    ("10/25/2026", "Drew Madeup, Fakeview Realty, 801-555-0170", "2", "Too high", "Compared to 3602 Sample Spruce, which they think sold lower, this felt high."),
    ("10/26/2026", "Casey Sample, Pretendwell Properties, 801-555-0133", "", "", "No feedback received."),
    ("11/01/2026", "Quinn Testcase, Mock Mountain Homes, 801-555-0162", "1", "Too high", "Buyers didn't feel comfortable with the type of families in the neighborhood."),
    ("11/05/2026", "Avery Fakename, Example Key Realty, 801-555-0145", "", "", "No feedback received."),
]
rows = "".join(f"<tr><td>{a}</td><td>{b}</td><td>Completed</td><td>{c}</td><td>{e}</td><td>{f}</td></tr>" for a, b, c, e, f in showings)
weekly = [("Sep 24 to Sep 30", 2), ("Oct 1 to Oct 7", 2), ("Oct 8 to Oct 14", 2), ("Oct 15 to Oct 21", 1),
          ("Oct 22 to Oct 28", 2), ("Oct 29 to Nov 4", 1), ("Nov 5 to Nov 8", 1)]
activity = (
    "<h1>Listing Activity Report</h1><p class='small'>Example Showings (fictional showing service). Agent version: "
    "includes showing agent details and unpublished feedback. Generated November 8, 2026.</p>"
    + subject_table([("Listing", "3472 S Practice Pine Dr, Example Heights, UT 84000 (MLS 2214450)"), ("List Price", "$689,900"),
                     ("Report Period", "09/24/2026 to 11/08/2026"), ("Showing Requests", "13"), ("Completed Showings", "11"),
                     ("Denied or Cancelled", "2 (one denied for a seller conflict on 10/04, one cancelled by the buyer's agent on 10/20)"),
                     ("Feedback Received", "8 of 11")])
    + "<h2>Appointments Per Week</h2><table><tr><th>Week</th><th>Completed Showings</th></tr>"
    + "".join(f"<tr><td>{w}</td><td>{n}</td></tr>" for w, n in weekly) + "</table>"
    + "<h2>Feedback at a Glance</h2><table><tr><th>Price Opinion</th><th>Responses</th></tr>"
      "<tr><td>Too high</td><td>6</td></tr><tr><td>About right</td><td>2</td></tr><tr><td>Too low</td><td>0</td></tr></table>"
    + "<h2 class='pb'>Feedback Responses</h2><table><tr><th>Date</th><th>Showing Agent</th><th>Status</th>"
      "<th>Interest (1 to 5)</th><th>Price Opinion</th><th>Comments</th></tr>" + rows + "</table>"
    + "<p class='small'>Feedback is the opinion of the showing agent and buyer. Publish to the homeowner version only after review.</p>")
save_html("case2-activity.html", page("Listing Activity Report", activity), c2 + "listing-activity-report-3472-s-practice-pine-dr.pdf")

# ---------------------------------------------------------------- case 3 (Colorado, thin comps) -------
C3_ASOF = "2026-11-06"
co = dict(city="Pretendville", state="CO", zip_="80000")
case3 = [
    listing("4471882", "Closed", "4522 Example Mesa Rd", "", "Ranch", 1965, 3, 2, 1580, 790, 500, 2, 1.10,
            "2026-07-28", None, 559000, pending="2026-08-30", sold="2026-09-12", sp=548000,
            remarks="Ranch on 1.1 acres, partly finished basement, detached two-car garage, well and septic.",
            agent="Septic inspection passed 8/2026.", **co),
    listing("4468015", "Closed", "3980 Pretend Butte Ln", "", "Ranch", 1971, 3, 2, 1720, 0, 0, 2, 0.80,
            "2026-05-14", None, 565000, pending="2026-06-04", sold="2026-06-30", sp=561000,
            remarks="Single-level ranch on a crawl space, attached garage, updated kitchen 2022, well and septic.", agent="", **co),
    listing("4459120", "Closed", "4105 Example Mesa Rd", "", "Ranch", 1958, 3, 2, 1500, 750, 750, 1, 0.70,
            "2025-11-24", None, 525000, pending="2026-01-27", sold="2026-02-20", sp=512000,
            remarks="Finished basement, original baths, one-car detached garage.", agent="Estate, sold as-is.", **co),
    listing("4455870", "Closed", "5120 Sample Sage Ct", "", "Ranch", 1968, 4, 2, 1690, 845, 0, 2, 1.00,
            "2025-09-29", None, 539000, pending="2025-11-15", sold="2025-12-05", sp=529000,
            remarks="Unfinished basement, attached garage, new well pump.", agent="", **co),
    listing("4454210", "Closed", "2875 Fictional Fence Rd", "", "Ranch", 1979, 3, 2, 1850, 0, 0, 3, 2.40,
            "2025-10-14", None, 695000, pending="2025-10-26", sold="2025-11-20", sp=689000,
            remarks="2.4 acres with a four-stall horse barn, arena and three-car detached shop.", agent="", **co),
    listing("4476330", "Active", "4630 Example Mesa Rd", "", "Ranch", 1960, 3, 2, 1610, 805, 400, 2, 0.90,
            "2026-09-09", None, 574900, remarks="Partly finished basement, detached garage, mountain view.",
            agent="Combo 1188 on the shed door. Seller works nights, call before 3 PM.", **co),
    listing("4478902", "Active", "3725 Pretend Butte Ln", "", "Ranch", 1975, 3, 2, 1700, 0, 0, 2, 1.50,
            "2026-10-15", None, 599000, remarks="Ranch on 1.5 acres, attached garage, new roof 2025.", agent="", **co),
    listing("4469930", "Expired", "4290 Example Mesa Rd", "", "Ranch", 1963, 3, 2, 1600, 800, 600, 2, 0.85,
            "2026-04-27", None, 589000, off="2026-07-31", remarks="Finished basement, detached garage, garden beds.",
            agent="Seller's attorney handling the estate.", **co),
]
FLEX_COLS = ["ML#", "Status", "Street Address", "City", "State", "Zip Code", "Property Type", "Style", "Year Built",
             "List Price", "Close Price", "Listing Contract Date", "Close Date", "Days On Market", "Bedrooms",
             "Baths Total", "Above Grade Finished Area", "Below Grade Total Area", "Below Grade Finished Area",
             "Lot Size Acres", "Garage Spaces", "Water Source", "Sewer", "Public Remarks", "Private Remarks"]
c3rows = []
for x in case3:
    c3rows.append([x["mls"], x["status"], x["addr"], x["city"], x["state"], x["zip"], "Residential", x["style"], x["yb"],
                   x["lp"], x["sp"] or "", x["list_date"], x["sold"] or "", dom(x, C3_ASOF), x["beds"], x["baths"], x["ag"],
                   x["bg"], x["bgfin"], f"{x['lot']:.2f}", x["gar"], "Well", "Septic", x["remarks"], x["agent"]])
c3 = "evals/files/case-3-thin-comps-colorado/"
write_csv(c3 + "comp-export-4410-example-mesa-rd.csv", FLEX_COLS, c3rows)
profile = (
    "<h1>Property Profile</h1><p class='small'>Pretend County Assessor (fictional), printed from the agent's MLS tax tab, November 6, 2026.</p>"
    + subject_table([
        ("Address", "4410 Example Mesa Rd, Pretendville, CO 80000"), ("Owner of Record", "Lane Sampleworth"),
        ("Property Type / Style", "Single Family / Ranch"), ("Year Built", "1962"), ("Above Grade Finished Area", "1,640 sq ft"),
        ("Basement Total / Finished", "820 / 600 sq ft"), ("Bedrooms", "3 (all above grade)"), ("Bathrooms", "2 (1 above grade, 1 basement)"),
        ("Garage", "Detached, 2 car"), ("Lot Size", "0.90 acres"), ("Water / Sewer", "Well / Septic"),
        ("Last Recorded Transfer", "Warranty deed, 06/14/1998"), ("Assessor Actual Value (2025)", "$498,300"),
    ])
    + "<p class='small'>Assessor values are for property tax purposes and are not a market valuation.</p>")
save_html("case3-profile.html", page("Property Profile", profile), c3 + "property-profile-4410-example-mesa-rd.pdf")

with open(os.path.join(HTML, "pdfs.json"), "w") as f:
    json.dump(PDFS, f, indent=1)
print("html written:", len(PDFS))
