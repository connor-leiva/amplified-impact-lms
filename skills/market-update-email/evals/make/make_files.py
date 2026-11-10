"""Writes the made-up input files for market-update-email: the practice report (PDF via html_to_pdf.cjs)
and its CSV version, the eval 1 report (PDF) and the eval 2 stats export (CSV). Every MLS, county, city,
brokerage, council and person here is fictional. The figures are invented and describe no real market.

Usage (from anywhere):
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

MONTHS = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
          "2026-07", "2026-08", "2026-09", "2026-10"]
MONTH_NAMES = {"2025-10": "October 2025", "2025-11": "November 2025", "2025-12": "December 2025",
               "2026-01": "January 2026", "2026-02": "February 2026", "2026-03": "March 2026",
               "2026-04": "April 2026", "2026-05": "May 2026", "2026-06": "June 2026", "2026-07": "July 2026",
               "2026-08": "August 2026", "2026-09": "September 2026", "2026-10": "October 2026"}

# ---------------------------------------------------------------------------------------------------
# Practice: Example Peaks MLS (fictional), Sampleton County, Utah (a made-up county), October 2026.
# Monthly figures, October 2025 to October 2026, for two property types. The PDF's October rows are
# these; its 2026 year-to-date counts are the sums of January to October 2026 below.
# ---------------------------------------------------------------------------------------------------
PRACTICE = {
    "Single-Family": {
        "new": [412, 341, 268, 352, 398, 512, 561, 590, 548, 521, 492, 452, 446],
        "closed": [318, 287, 279, 214, 236, 298, 331, 362, 371, 356, 384, 345, 301],
        "median": [489000, 486000, 484500, 481000, 486500, 492000, 497500, 503000, 508000, 506500, 504000, 502000, 505000],
        "dom": [31, 35, 41, 46, 43, 36, 29, 26, 27, 30, 33, 35, 38],
        "inventory": [1046, 958, 842, 861, 903, 977, 1062, 1138, 1206, 1241, 1252, 1227, 1198],
        "ratio": [98.4, 98.0, 97.7, 97.5, 98.1, 98.6, 99.0, 99.1, 98.8, 98.4, 98.0, 97.8, 97.6],
        "ytd": {"new": (4610, None), "closed": (3240, None), "median": (482500, 497000), "dom": (27, 33), "ratio": (98.9, 98.2)},
    },
    "Townhome and Condo": {
        "new": [151, 122, 97, 141, 158, 189, 205, 214, 199, 191, 182, 173, 163],
        "closed": [118, 104, 99, 84, 91, 112, 121, 128, 131, 124, 118, 112, 109],
        "median": [362000, 360500, 357000, 355000, 358000, 361500, 364000, 366500, 365000, 363000, 361000, 359900, 358500],
        "dom": [29, 33, 39, 44, 42, 35, 30, 28, 29, 32, 35, 38, 41],
        "inventory": [402, 371, 333, 345, 362, 389, 421, 448, 471, 486, 497, 494, 488],
        "ratio": [98.1, 97.8, 97.4, 97.2, 97.6, 98.0, 98.3, 98.4, 98.1, 97.8, 97.5, 97.2, 97.0],
        "ytd": {"new": (1702, None), "closed": (1188, None), "median": (360000, 361250), "dom": (24, 34), "ratio": (98.6, 97.7)},
    },
}
for t in PRACTICE.values():  # 2026 year to date, January to October, from the monthly rows
    t["ytd"]["new"] = (t["ytd"]["new"][0], sum(t["new"][3:]))
    t["ytd"]["closed"] = (t["ytd"]["closed"][0], sum(t["closed"][3:]))
assert PRACTICE["Single-Family"]["ytd"]["new"][1] == 4872 and PRACTICE["Single-Family"]["ytd"]["closed"][1] == 3198
assert PRACTICE["Townhome and Condo"]["ytd"]["new"][1] == 1815 and PRACTICE["Townhome and Condo"]["ytd"]["closed"][1] == 1130

CITIES = [  # single-family, October 2025 and October 2026: closed sales, median sale price
    ("Testerville", 142, 131, 472000, 489900),
    ("Mockton", 98, 95, 455000, 468000),
    ("Example Springs", 72, 72, 561000, 574500),
    ("Fakeburg", 6, 3, 540000, 612000),
]
assert sum(c[1] for c in CITIES) == 318 and sum(c[2] for c in CITIES) == 301


def pct(a, b):
    """The report's percent change: from rounded figures, one decimal, with a sign and a space."""
    if a in (None, 0) or b is None:
        return "--"
    v = round((b - a) / a * 100, 1)
    if v == 0:
        return "0.0%"
    return ("+ " if v > 0 else "- ") + f"{abs(v):.1f}%"


def pts(a, b):
    v = round(b - a, 1)
    return ("+ " if v > 0 else "- " if v < 0 else "") + f"{abs(v):.1f} pts"


def money(n):
    return f"${n:,.0f}"


def n(v):
    return f"{v:,}"


CSS = """
body { font-family: Arial, Helvetica, sans-serif; color: #1b1b1b; font-size: 10.5pt; margin: 0; }
.stamp { color: #b00; font-weight: bold; text-align: center; font-size: 10pt; margin-bottom: 6px; }
h1 { font-size: 19pt; margin: 4px 0 0 0; color: #23415e; }
h2 { font-size: 13pt; margin: 18px 0 6px 0; color: #23415e; border-bottom: 2px solid #23415e; padding-bottom: 3px; }
.sub { color: #444; margin: 2px 0 10px 0; }
table { border-collapse: collapse; width: 100%; margin-top: 4px; }
th { background: #23415e; color: #fff; font-size: 9.5pt; padding: 5px 6px; text-align: right; }
th.l, td.l { text-align: left; }
td { border-bottom: 1px solid #ccd; padding: 5px 6px; text-align: right; font-size: 10pt; white-space: nowrap; }
td.l { white-space: normal; }
tr:nth-child(even) td { background: #f3f5f8; }
.box { border: 1px solid #9ab; background: #f7f9fb; padding: 10px 12px; margin-top: 14px; }
.foot { font-size: 8.5pt; color: #444; margin-top: 14px; line-height: 1.45; }
.brand { font-size: 9pt; color: #23415e; letter-spacing: 0.04em; text-transform: uppercase; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
"""


def page(html_name, pdf_path, title, pages, landscape=False):
    doc = [f"<!doctype html><html><head><meta charset='utf-8'><title>{title}</title><style>{CSS}</style></head><body>"]
    for p in pages:
        doc.append(f"<div class='page'><div class='stamp'>{STAMP}</div>{p}</div>")
    doc.append("</body></html>")
    with open(os.path.join(HTML, html_name), "w", encoding="utf-8") as f:
        f.write("".join(doc))
    PDFS.append({"html": html_name, "pdf": pdf_path, "landscape": landscape})


def practice_table(name):
    t = PRACTICE[name]
    y = t["ytd"]
    rows = [
        ("New Listings", n(t["new"][0]), n(t["new"][-1]), pct(t["new"][0], t["new"][-1]), n(y["new"][0]), n(y["new"][1]), pct(*y["new"])),
        ("Closed Sales", n(t["closed"][0]), n(t["closed"][-1]), pct(t["closed"][0], t["closed"][-1]), n(y["closed"][0]), n(y["closed"][1]), pct(*y["closed"])),
        ("Median Sale Price*", money(t["median"][0]), money(t["median"][-1]), pct(t["median"][0], t["median"][-1]), money(y["median"][0]), money(y["median"][1]), pct(*y["median"])),
        ("Median Days on Market", n(t["dom"][0]), n(t["dom"][-1]), pct(t["dom"][0], t["dom"][-1]), n(y["dom"][0]), n(y["dom"][1]), pct(*y["dom"])),
        ("Inventory (Active Listings at Month End)", n(t["inventory"][0]), n(t["inventory"][-1]), pct(t["inventory"][0], t["inventory"][-1]), "--", "--", "--"),
        ("List-to-Sale Ratio", f"{t['ratio'][0]:.1f}%", f"{t['ratio'][-1]:.1f}%", pts(t["ratio"][0], t["ratio"][-1]), f"{y['ratio'][0]:.1f}%", f"{y['ratio'][1]:.1f}%", pts(*y["ratio"])),
    ]
    head = "<tr><th class='l'>Key Metric</th><th>October 2025</th><th>October 2026</th><th>Change</th><th>YTD Thru 10-2025</th><th>YTD Thru 10-2026</th><th>Change</th></tr>"
    body = "".join("<tr>" + "".join((f"<td class='l'>{c}</td>" if i == 0 else f"<td>{c}</td>") for i, c in enumerate(r)) + "</tr>" for r in rows)
    return f"<table>{head}{body}</table>"


def make_practice():
    p1 = (
        "<div class='brand'>Example Peaks MLS (fictional)</div>"
        "<h1>Monthly Market Report: October 2026</h1>"
        "<div class='sub'>Sampleton County, Utah (a made-up county). Residential sales reported to Example Peaks MLS, October 1 to October 31, 2026, compared with October 1 to October 31, 2025.</div>"
        "<h2>Single-Family Homes</h2>" + practice_table("Single-Family") +
        "<h2>Townhomes and Condos</h2>" + practice_table("Townhome and Condo") +
        "<div class='foot'>* Median Sale Price does not account for seller concessions. Percent changes are calculated using rounded figures. "
        "YTD is year to date, January 1 through October 31. Data current as of November 6, 2026; figures may change as late sales are reported.</div>"
    )
    city_rows = "".join(
        f"<tr><td class='l'>{c}</td><td>{n(a)}</td><td>{n(b)}</td><td>{pct(a, b)}</td><td>{money(m1)}</td><td>{money(m2)}</td><td>{pct(m1, m2)}</td></tr>"
        for c, a, b, m1, m2 in CITIES
    )
    p2 = (
        "<div class='brand'>Example Peaks MLS (fictional)</div>"
        "<h1>October 2026: By City</h1>"
        "<div class='sub'>Single-family homes only. Sampleton County, Utah (a made-up county).</div>"
        "<table><tr><th class='l'>City</th><th>Closed Sales Oct 2025</th><th>Closed Sales Oct 2026</th><th>Change</th>"
        "<th>Median Sale Price Oct 2025</th><th>Median Sale Price Oct 2026</th><th>Change</th></tr>" + city_rows + "</table>"
        "<div class='box'><b>From the Example Peaks MLS Board</b><br>"
        "&ldquo;Inventory is building, and with rates expected to ease this winter, we expect buyers to return in force by spring. "
        "Sellers who list now will be ahead of the rush.&rdquo;<br>Pat Placeholder, Board President (fictional)</div>"
        "<h2>Definitions</h2>"
        "<div class='foot' style='margin-top:4px'>"
        "<b>New Listings:</b> properties newly listed during the month.<br>"
        "<b>Closed Sales:</b> sales that closed during the month.<br>"
        "<b>Median Sale Price:</b> the middle sale price of homes that closed during the month; half sold for more and half for less.<br>"
        "<b>Median Days on Market:</b> the middle number of days from listing to accepted contract, for homes that closed during the month.<br>"
        "<b>Inventory:</b> the number of active listings on the last day of the month.<br>"
        "<b>List-to-Sale Ratio:</b> the average, across homes that closed in the month, of each sale price divided by its final list price.<br>"
        "Small samples, such as a city with only a few sales, can produce large swings in percent change.</div>"
        "<div class='foot'>Source: Example Peaks MLS (fictional), for the periods October 1 to October 31, 2025 and October 1 to October 31, 2026. "
        "Report prepared November 6, 2026. Not every sale in the county is reported to the MLS. Information deemed reliable but not guaranteed.</div>"
    )
    page("practice-report.html", "practice/PRACTICE Sampleton County Market Report October 2026.pdf",
         "Example Peaks MLS Monthly Market Report October 2026", [p1, p2], landscape=True)

    path = os.path.join(SKILL, "practice", "PRACTICE Sampleton County Stats Export Oct 2025 to Oct 2026.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        f.write(STAMP + "\n")
        w = csv.writer(f)
        w.writerow(["Month", "MLS", "Area", "Property Type", "New Listings", "Closed Sales", "Median Sale Price",
                    "Median Days on Market", "Active Listings (Month End)", "List-to-Sale Ratio (%)"])
        for name, t in PRACTICE.items():
            for i, m in enumerate(MONTHS):
                w.writerow([m, "Example Peaks MLS", "Sampleton County, UT", name, t["new"][i], t["closed"][i],
                            t["median"][i], t["dom"][i], t["inventory"][i], f"{t['ratio'][i]:.1f}"])


# ---------------------------------------------------------------------------------------------------
# Eval 1: Example Desert MLS (fictional), Fakewood County, Arizona (a made-up county), October 2026.
# General mode. The report gives its own Months Supply (on 12 months of pendings) and Percent of
# Original List Price Received, a city with a tiny sample, a made-up national paragraph and a board
# quote with a forecast and school, safety and family claims.
# ---------------------------------------------------------------------------------------------------
E1 = [
    # metric, Oct 2025, Oct 2026, YTD 2025, YTD 2026, kind
    ("New Listings", 1284, 1352, 13906, 14512, "n"),
    ("Pending Sales", 1021, 968, 10744, 10488, "n"),
    ("Closed Sales", 1066, 1003, 10512, 10301, "n"),
    ("Median Days on Market", 44, 51, 41, 47, "n"),
    ("Median Sales Price*", 431000, 442500, 428000, 437000, "$"),
    ("Average Sales Price*", 512640, 519880, 508300, 515950, "$"),
    ("Percent of Original List Price Received", 96.2, 95.1, 96.9, 95.8, "%"),
    ("Inventory of Homes for Sale", 3290, 3812, None, None, "n"),
    ("Months Supply of Inventory", 3.0, 3.6, None, None, "x"),
]
E1_CITIES = [
    ("Mocktown", 402, 377, 418000, 429900),
    ("Sampleview", 311, 296, 455500, 461000),
    ("Example Butte", 2, 4, 395000, 545000),
    ("Fakewood (unincorporated)", 351, 326, 440000, 452000),
]
assert sum(c[1] for c in E1_CITIES) == 1066 and sum(c[2] for c in E1_CITIES) == 1003


def fmt(v, kind):
    if v is None:
        return "--"
    if kind == "$":
        return money(v)
    if kind == "%":
        return f"{v:.1f}%"
    if kind == "x":
        return f"{v:.1f}"
    return n(v)


def make_eval1():
    rows = "".join(
        f"<tr><td class='l'>{m}</td><td>{fmt(a, k)}</td><td>{fmt(b, k)}</td><td>{pct(a, b)}</td>"
        f"<td>{fmt(c, k)}</td><td>{fmt(d, k)}</td><td>{pct(c, d)}</td></tr>"
        for m, a, b, c, d, k in E1
    )
    p1 = (
        "<div class='brand'>Example Desert MLS (fictional)</div>"
        "<h1>Monthly Indicators: October 2026</h1>"
        "<div class='sub'>Fakewood County, Arizona (a made-up county). All residential property types.</div>"
        "<div class='box' style='margin-top:4px'><b>National Snapshot</b><br>"
        "U.S. existing-home sales rose 1.4% from September, according to the (made-up) National Housing Example Council, "
        "and the average 30-year fixed mortgage rate was 6.38% in October, according to the (made-up) Example Rate Survey.</div>"
        "<div class='box'><b>A Word From the Board Chair</b><br>"
        "&ldquo;Fakewood County&rsquo;s top-rated schools and safe, family-friendly neighborhoods keep drawing new residents. "
        "With rates expected to ease, we expect prices to climb another 5% in 2027, so sellers who list now will be glad they did.&rdquo;"
        "<br>Jordan Placeholder, Board Chair, Example Desert MLS (fictional)</div>"
        "<h2>Market Overview</h2>"
        "<table><tr><th class='l'>Key Metrics</th><th>10-2025</th><th>10-2026</th><th>% Change</th><th>YTD 2025</th><th>YTD 2026</th><th>% Change</th></tr>"
        + rows + "</table>"
        "<div class='foot'>* Does not account for seller concessions. Percent changes are calculated using rounded figures. "
        "Current as of November 7, 2026. All data from Example Desert MLS (fictional).</div>"
    )
    city_rows = "".join(
        f"<tr><td class='l'>{c}</td><td>{n(a)}</td><td>{n(b)}</td><td>{pct(a, b)}</td><td>{money(m1)}</td><td>{money(m2)}</td><td>{pct(m1, m2)}</td></tr>"
        for c, a, b, m1, m2 in E1_CITIES
    )
    p2 = (
        "<div class='brand'>Example Desert MLS (fictional)</div>"
        "<h1>Local Market Update by Area: October</h1>"
        "<div class='sub'>All residential property types. Fakewood County, Arizona (a made-up county).</div>"
        "<table><tr><th class='l'>Area</th><th>Closed Sales 10-2025</th><th>Closed Sales 10-2026</th><th>+/-</th>"
        "<th>Median Sales Price 10-2025</th><th>Median Sales Price 10-2026</th><th>+/-</th></tr>" + city_rows + "</table>"
        "<div class='foot'>Some figures are for one month of activity and can look extreme due to small sample size.</div>"
        "<h2>Definitions</h2>"
        "<div class='foot' style='margin-top:4px'>"
        "<b>Pending Sales:</b> listings that went under contract during the month.<br>"
        "<b>Median Days on Market:</b> the middle number of days from listing to contract, for homes that closed during the month.<br>"
        "<b>Percent of Original List Price Received:</b> the average of each closed sale&rsquo;s price divided by its original list price.<br>"
        "<b>Inventory of Homes for Sale:</b> active listings on the last day of the month.<br>"
        "<b>Months Supply of Inventory:</b> inventory at month end divided by the average monthly pending sales over the prior 12 months.</div>"
        "<div class='foot'>Current as of November 7, 2026. All data from Example Desert MLS (fictional) for the period October 1, 2026 through October 31, 2026, "
        "compared with October 1, 2025 through October 31, 2025. Information deemed reliable but not guaranteed.</div>"
    )
    page("eval1-report.html", "evals/files/eval-1-mls-report-pdf/Example Desert MLS Monthly Indicators October 2026.pdf",
         "Example Desert MLS Monthly Indicators October 2026", [p1, p2], landscape=True)


# ---------------------------------------------------------------------------------------------------
# Eval 2: Fakeland Regional MLS (fictional) stats export, Mockingbird Valley, Utah (made up), 13 months.
# No inventory column. The October 2025 row is corrupted: closed sales and median price are each about
# ten times every other month.
# ---------------------------------------------------------------------------------------------------
E2 = [
    # month, new listings, closed, median, average sale, average list (sold), median DOM
    ("2025-10", 164, 1262, 4710000, 498200, 507100, 34),
    ("2025-11", 131, 118, 466500, 489900, 499300, 38),
    ("2025-12", 98, 109, 459000, 482100, 492600, 44),
    ("2026-01", 122, 96, 452000, 476800, 488000, 49),
    ("2026-02", 149, 104, 461500, 484300, 494100, 45),
    ("2026-03", 188, 127, 470000, 493500, 501200, 36),
    ("2026-04", 201, 139, 478250, 502800, 509400, 29),
    ("2026-05", 214, 141, 486500, 511900, 518300, 26),
    ("2026-06", 196, 138, 484000, 509200, 516700, 27),
    ("2026-07", 183, 133, 481000, 505600, 513900, 30),
    ("2026-08", 170, 129, 479500, 503300, 512200, 31),
    ("2026-09", 158, 122, 474000, 491200, 498900, 35),
    ("2026-10", 167, 126, 476500, 487900, 496300, 39),
]


def make_eval2():
    path = os.path.join(SKILL, "evals", "files", "eval-2-csv-missing-metric-odd-row", "fakeland-mls-stats-export-mockingbird-valley.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        f.write(STAMP + "\n")
        w = csv.writer(f)
        w.writerow(["Month", "MLS", "Area", "Property Type", "New Listings", "Closed Sales", "Median Sale Price",
                    "Average Sale Price", "Average List Price (Sold)", "Median Days on Market"])
        for m, nl, cs, med, avg, avl, dom in E2:
            w.writerow([MONTH_NAMES[m], "Fakeland Regional MLS", "Mockingbird Valley, UT", "All Residential",
                        nl, cs, med, avg, avl, dom])


make_practice()
make_eval1()
make_eval2()
with open(os.path.join(HTML, "pdfs.json"), "w", encoding="utf-8") as f:
    json.dump(PDFS, f, indent=1)
print("wrote the CSVs and", len(PDFS), "HTML files; now run html_to_pdf.cjs")
