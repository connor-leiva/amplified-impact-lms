"""Writes the made-up inputs for expired-fsbo-outreach: the practice set and the two eval cases.

Run from anywhere:  python3 skills/expired-fsbo-outreach/evals/make/make_files.py

Every person, brokerage, street, phone number and email here is made up (phones use 555-01xx, emails use
example.com, .net and .org, streets use words like Sample, Example, Placeholder, Fictional, Mockup and Test).
Each file says so on its first line. The shapes follow what an agent actually has (checked 2026-11-10, sources in
references/expired-fsbo-guide.md):
- An MLS export of expired listings, with the owner's name, mailing address and phone added from tax records or a
  data service, and a Do Not Call status column with the date it was checked (as data services and lead vendors
  add them).
- A lead vendor's FSBO export: the ad's date, source, asking price, features, the owner's phone and email, a DNC
  status and the ad text.
- An agent's own FSBO list, typed into a spreadsheet, with no Do Not Call information at all.
Days on market are worked out from the list date and the status date, so every row is consistent.
"""
import csv
import datetime as dt
import io
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
PRACTICE = SKILL / "practice"
FILES = SKILL / "evals" / "files"
MARK = "PRACTICE FILE: made-up example"


def write_csv(path, header, rows):
    buf = io.StringIO()
    buf.write(MARK + "\n")
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(header)
    w.writerows(rows)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(buf.getvalue(), encoding="utf-8")


def days(a, b):
    return (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days


def money(n):
    return f"{n:,}"


# --- Practice 1: an MLS expired export with tax-record and phone columns (Salt Lake County, Utah) ---------------

MLS_HEADER = ["MLS #", "Status", "Address", "City", "State", "Zip", "List Price", "Original List Price", "List Date",
              "Expiration Date", "Status Date", "Days on Market", "Beds", "Baths", "Sq Ft", "Year Built",
              "Listing Office", "Private Remarks", "Owner Name (Tax Record)", "Owner Mailing Address (Tax Record)",
              "Owner Phone", "Phone DNC Status", "DNC Checked"]

# (mls, status, address, city, zip, list, original, list date, expiration, status date, beds, baths, sqft, year,
#  office, private remarks, owner, mailing (None = the property), phone, dnc status, dnc checked)
PRACTICE_MLS = [
    ("2068412", "Expired", "1184 E Sample Ridge Dr", "Sandy", "84094", 589000, 615000, "2026-07-04", "2026-11-08", "2026-11-08", 4, 3, 2840, 1998,
     "Fictional Summit Homes", "Sellers relocating for work, motivated. Lockbox on side gate, code 4471.", "Robin and Casey Samplestone", None, "(801) 555-0141", "Clean", "2026-11-09"),
    ("2069120", "Withdrawn", "7720 S Placeholder Peak Ln", "Draper", "84020", 749000, 749000, "2026-08-15", "2027-02-15", "2026-10-28", 5, 4, 3900, 2011,
     "Example Valley Brokers", "", "Pat Fictionale", None, "(801) 555-0152", "Clean", "2026-11-09"),
    ("2067755", "Expired", "455 W Fictional Fork Rd", "Riverton", "84065", 474900, 474900, "2026-05-03", "2026-11-01", "2026-11-01", 3, 2, 1720, 1985,
     "Sample Crest Realty", "", "Sam Testerly", None, "(801) 555-0177", "DNC", "2026-11-09"),
    ("2070031", "Canceled", "2950 W Mockup Mesa Dr", "Herriman", "84096", 529000, 529000, "2026-09-20", "2027-03-20", "2026-11-02", 4, 3, 2400, 2017,
     "Sample Crest Realty", "", "Jesse Notaname", None, "(385) 555-0113", "Clean", "2026-11-09"),
    ("2066890", "Expired", "3321 S Mockup Meadow Dr", "West Jordan", "84088", 529000, 559000, "2026-08-03", "2026-11-05", "2026-11-05", 3, 3, 1980, 2004,
     "Example Valley Brokers", "Tenant occupied, 24 hour notice for showings.", "Example Holdings LLC", "1200 Example Office Pkwy Ste 100, Salt Lake City, UT 84101", "", "", ""),
    ("2068803", "Expired", "9087 S Testview Ct", "South Jordan", "84095", 699000, 725000, "2026-09-07", "2026-11-09", "2026-11-09", 5, 3, 3410, 2016,
     "Fictional Summit Homes", "", "Jamie Placeholder", None, "(385) 555-0122", "Clean", "2026-09-02"),
    ("2069444", "Withdrawn", "618 E Sample Spruce Ave", "Sandy", "84070", 459000, 479000, "2026-07-20", "2026-12-31", "2026-10-30", 3, 2, 1650, 1972,
     "Fictional Summit Homes", "", "Kendall Testwright", None, "(801) 555-0185", "Clean", "2026-11-09"),
    ("2065512", "Expired", "14562 S Example Willow Ln", "Herriman", "84096", 549900, 579900, "2026-05-10", "2026-10-15", "2026-10-15", 4, 3, 2600, 2012,
     "Sample Crest Realty", "Call owner before showing, dog in yard.", "Alex Mockford", None, "(801) 555-0163", "Clean", "2026-11-09"),
    ("2070212", "Expired", "1033 E Fakewood Cir", "Draper", "84020", 879000, 899000, "2026-06-01", "2026-11-30", "2026-11-04", 5, 4, 4300, 2006,
     "Example Valley Brokers", "", "Shawn Exemplar", None, "(801) 555-0196", "Clean", "2026-11-09"),
    ("2067301", "Canceled", "7342 S Placeholder Pond Dr", "West Jordan", "84084", 415000, 425000, "2026-08-25", "2027-02-25", "2026-11-03", 3, 2, 1500, 1981,
     "Sample Crest Realty", "", "Drew Fakerson", None, "(801) 555-0138", "DNC", "2026-11-09"),
    ("2068120", "Expired", "640 E Placeholder Pine Dr", "Draper", "84020", 615000, 650000, "2026-07-28", "2026-11-06", "2026-11-06", 4, 3, 3050, 2009,
     "Fictional Summit Homes", "", "Taylor and Morgan Fakeworth", None, "", "", ""),
    ("2069876", "Expired", "1450 W Fictional Hollow Dr", "West Jordan", "84088", 439000, 449000, "2026-07-06", "2026-11-03", "2026-11-03", 3, 2, 1540, 1979,
     "Sample Crest Realty", "", "Mockridge Family Trust", None, "(801) 555-0190", "Clean", "2026-11-09"),
    ("2066045", "Expired", "812 E Testcase Trl", "Sandy", "84094", 799000, 799000, "2026-09-23", "2026-11-07", "2026-11-07", 5, 4, 4120, 2019,
     "Example Valley Brokers", "Sellers divorcing, need a quick sale.", "Riley Notreal", None, "(801) 555-0108", "", ""),
]


def mls_rows(data):
    rows = []
    for (mls, status, addr, city, z, lp, op, ld, exp, sd, bd, ba, sf, yb, office, remarks, owner, mailing, phone, dnc, checked) in data:
        mail = mailing or f"{addr}, {city}, UT {z}"
        rows.append([mls, status, addr, city, "UT", z, money(lp), money(op), ld, exp, sd, days(ld, sd), bd, ba, money(sf), yb,
                     office, remarks, owner, mail, phone, dnc, checked])
    return rows


# --- Practice 2: a lead vendor's FSBO export (Salt Lake County, Utah) --------------------------------------------

FSBO_HEADER = ["Lead Type", "Lead Date", "Source", "Address", "City", "State", "Zip", "Asking Price", "Beds", "Baths",
               "Sq Ft", "Owner Name", "Phone", "Phone DNC Status", "DNC Checked", "Email", "Ad Text"]
PRACTICE_FSBO = [
    ["FSBO", "2026-11-06", "FSBO website", "3389 S Example Creek Rd", "Murray", "UT", "84107", "465,000", 3, 2, "1,650", "Drew Samplewright",
     "(801) 555-0115", "Clean", "2026-11-09", "drew.samplewright@example.com",
     "Updated kitchen, new roof in 2024, fenced yard and RV parking. Agents welcome to bring buyers."],
    ["FSBO", "2026-11-02", "Classified ad", "5521 S Fictional Fox Ln", "Taylorsville", "UT", "84129", "419,000", 3, 2, "1,380", "Quinn Mockley",
     "(801) 555-0186", "Clean", "2026-11-09", "", "Charming rambler on a quiet street. NO AGENTS PLEASE. Principals only."],
    ["FSBO", "2026-10-29", "FSBO website", "8840 S Sample Sage Dr", "West Jordan", "UT", "84088", "512,000", 4, 3, "2,300", "Morgan Testley",
     "(385) 555-0149", "DNC", "2026-11-09", "morgan.testley@example.net",
     "Finished basement with a second kitchen, three-car garage, owned solar panels."],
    ["FSBO", "2026-10-20", "Yard sign (team member's note)", "2716 E Example Elm St", "Holladay", "UT", "84117", "640,000", 4, 3, "", "Casey Fakington",
     "", "", "", "", "Sign in yard: For Sale By Owner, 4 bed 3 bath."],
    ["FSBO", "2026-11-04", "Classified ad", "1907 W Placeholder Plum Way", "Riverton", "UT", "84065", "489,000", 4, 2, "2,050", "Jordan Exampleby",
     "(801) 555-0132", "Clean", "2026-11-09", "",
     "Great family neighborhood, walk to the church and the elementary school. New carpet, central air, large corner lot."],
    ["FSBO", "2026-10-26", "FSBO website", "4410 S Mockup Maple Dr", "Millcreek", "UT", "84117", "575,000", 3, 2, "1,900", "Sage Fictionson",
     "(801) 555-0158", "Clean", "2026-11-09", "sage.fictionson@example.org",
     "Also listed on the MLS through Example Flat Fee Realty. Buyer agents welcome."],
    ["FSBO", "2026-11-08", "FSBO website", "6135 W Sample Sunset Dr", "West Valley City", "UT", "84128", "399,000", 3, 2, "1,450", "Lou Placeholder",
     "(385) 555-0170", "", "", "lou.placeholder@example.com", "Fresh paint, new water heater, two-car garage."],
]

# --- Eval 1: another MLS's expired export (Utah County, Utah), scrubbed by the agent this morning ---------------

E1_HEADER = ["ML#", "Status", "Address", "City", "Zip", "Price", "Original Price", "List Date", "Expiration Date",
             "Status Change Date", "CDOM", "Beds", "Baths", "Total SqFt", "Year Built", "Listing Office", "Owner (Tax)",
             "Owner Mailing (Tax)", "Owner Phone", "Phone Type", "On DNC"]
# (ml, status, address, city, zip, price, original, list date, expiration, status change, beds, baths, sqft, year,
#  office, owner, mailing (None = the property), phone, type, on dnc)
E1 = [
    ("2071180", "Expired", "1220 N Sample Summit Dr", "Orem", "84057", 529000, 549000, "2026-06-12", "2026-11-04", "2026-11-04", 4, 3, 2450, 1994,
     "Fictional Peak Realty", "Jordan Testerfield", None, "(801) 555-0111", "Mobile", "N"),
    ("2074450", "Active", "1220 N Sample Summit Dr", "Orem", "84057", 524900, 524900, "2026-11-09", "2027-05-09", "2026-11-09", 4, 3, 2450, 1994,
     "Fictional Peak Realty", "Jordan Testerfield", None, "(801) 555-0111", "Mobile", "N"),
    ("2071925", "Expired", "388 E Example Elk Way", "Provo", "84604", 465000, 489000, "2026-07-15", "2026-11-08", "2026-11-08", 3, 2, 1860, 1978,
     "Sample Valley Homes", "Casey Mockwell", None, "(801) 555-0124", "Landline", "N"),
    ("2072210", "Withdrawn", "77 S Placeholder Pass", "Lindon", "84042", 899000, 925000, "2026-08-01", "2027-01-31", "2026-10-27", 5, 5, 4800, 2013,
     "Example Mountain Realty", "Rowan Fictionelli", None, "(801) 555-0146", "Mobile", "Y"),
    ("2070877", "Expired", "2045 W Fakeview Dr", "Lehi", "84043", 612000, 640000, "2026-05-20", "2026-11-02", "2026-11-02", 5, 3, 3200, 2015,
     "Example Mountain Realty", "Sydney and Lane Samplewood", None, "(385) 555-0135", "Mobile", "Y"),
    ("2073301", "Canceled", "915 N Mockup Mill Rd", "American Fork", "84003", 499000, 499000, "2026-09-10", "2027-03-10", "2026-11-05", 4, 2, 2100, 1999,
     "Sample Valley Homes", "Blake Testington", None, "(801) 555-0157", "Landline", "N"),
    ("2071560", "Expired", "1675 S Fictional Falls Ln", "Pleasant Grove", "84062", 574900, 574900, "2026-07-01", "2026-11-09", "2026-11-09", 4, 3, 2700, 2001,
     "Fictional Peak Realty", "Parker Exampleman", None, "(801) 555-0147", "Mobile", ""),
    ("2072788", "Temporarily Off Market", "260 W Sample Sparrow St", "Orem", "84058", 435000, 445000, "2026-08-20", "2027-02-20", "2026-11-01", 3, 2, 1580, 1988,
     "Example Mountain Realty", "Reese Placeholden", None, "(801) 555-0162", "Landline", "N"),
    ("2069954", "Expired", "4120 N Example Cove Dr", "Provo", "84604", 749000, 799000, "2026-04-18", "2026-10-31", "2026-10-31", 5, 4, 4050, 2008,
     "Sample Valley Homes", "Fakeworth Living Trust", "2200 Example Plaza Dr Ste 300, Provo, UT 84604", "(801) 555-0158", "Landline", "N"),
    ("2072044", "Withdrawn", "33 E Testcase Ter", "Orem", "84057", 389000, 399000, "2026-09-01", "2026-12-31", "2026-11-06", 3, 2, 1420, 1975,
     "Fictional Peak Realty", "Ari Notarealname", None, "(801) 555-0173", "Mobile", "N"),
    ("2070390", "Expired", "980 S Placeholder Poplar Ave", "American Fork", "84003", 455000, 479000, "2026-05-05", "2026-10-05", "2026-10-05", 3, 2, 1640, 1996,
     "Example Mountain Realty", "Frankie Samplesmith", None, "(801) 555-0169", "Mobile", "N"),
    ("2071733", "Expired", "5512 W Example Meadowlark Ln", "Lehi", "84043", 539000, 559000, "2026-06-25", "2026-11-06", "2026-11-06", 4, 3, 2880, 2018,
     "Sample Valley Homes", "Dana Fictionberg", None, "", "", ""),
]


def e1_rows():
    rows = []
    for (ml, status, addr, city, z, p, op, ld, exp, sc, bd, ba, sf, yb, office, owner, mailing, phone, ptype, dnc) in E1:
        rows.append([ml, status, addr, city, z, money(p), money(op), ld, exp, sc, days(ld, sc), bd, ba, money(sf), yb, office,
                     owner, mailing or f"{addr}, {city}, UT {z}", phone, ptype, dnc])
    return rows


# --- Eval 2: an agent's own FSBO list, no Do Not Call information at all (Boise area, Idaho) --------------------

E2_HEADER = ["Address", "City", "Asking", "Owner", "Phone", "Where I Found It", "Ad Says", "Date Found"]
E2 = [
    ["2214 N Sample Sagebrush Ln", "Boise", "$419,000", "Lee Fakerton", "208-555-0114", "Yard sign and FSBO website",
     "3 bed 2 bath, new furnace 2025, big backyard with garden boxes. Call or text anytime!", "11/3/2026"],
    ["8870 W Example Quail Dr", "Meridian", "$535,000", "Morgan Notaperson", "208-555-0129", "Classified ad",
     "4 bed, 3 bath, 3-car garage, fully fenced. No agents please.", "11/5/2026"],
    ["1450 E Placeholder Pine Ct", "Eagle", "$689,000", "Kerry Sampleton", "208-555-0143", "FSBO website",
     "Single level, 4 bed, office, RV pad, mountain views. Ideal for retirees or a young family.", "10/28/2026"],
    ["615 S Mockup Maple Ave", "Nampa", "$349,900", "Jesse Testaroo", "", "Yard sign", "For sale by owner, 3 bed, 1 bath.", "11/7/2026"],
    ["3302 N Fictional Fir St", "Boise", "$455,000", "Rowan Placeholdt", "208-555-0161", "FSBO website",
     "Updated kitchen, quartz counters, new roof 2023. Open house Saturday 1 to 3.", "11/6/2026"],
    ["72 E Example Elm Way", "Kuna", "$389,000", "Pat Exemplary", "208-555-0172", "Classified ad",
     "Motivated seller, must sell fast, divorce. 3 bed 2 bath, shop in back.", "10/22/2026"],
    ["4980 W Sample Swallow St", "Meridian", "$472,500", "Sky Mockingbird", "208-555-0188", "FSBO website",
     "Corner lot, finished bonus room, close to the greenbelt.", "11/1/2026"],
]


def main():
    write_csv(PRACTICE / "PRACTICE MLS expired export, Salt Lake County, 2026-11-10.csv", MLS_HEADER, mls_rows(PRACTICE_MLS))
    write_csv(PRACTICE / "PRACTICE FSBO leads export, Salt Lake County, 2026-11-10.csv", FSBO_HEADER, PRACTICE_FSBO)
    write_csv(FILES / "eval-1-expired-export-scrubbed" / "Expireds export 11-10-2026.csv", E1_HEADER, e1_rows())
    write_csv(FILES / "eval-2-fsbo-list-no-dnc" / "FSBO list - Sheet1.csv", E2_HEADER, E2)
    print("wrote practice/ (2 files) and evals/files/ (2 cases)")


if __name__ == "__main__":
    main()
