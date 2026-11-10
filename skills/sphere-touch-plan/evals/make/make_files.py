"""Build the made-up contact lists for practice/ and evals/files/.

Everything here is invented: people pair ordinary first names with storybook surnames, emails end in
.test, phone numbers use the 555-01xx fiction range, and the agent (Rowan Mockford), the brokerage
(Pretend Peak Realty), the towns and the streets are made up. Zip codes 84990 to 84999 and 83999 are
placeholders.

The Follow Up Boss file follows the columns Follow Up Boss's help center lists for an "Export All
Columns" People export (checked 2026-11-08 for database-health-check), cut to the ones a sphere list
uses, plus the Last Communication and Last Activity view columns and two custom fields a team adds
itself: Home Anniversary (a yearly date) and Text Consent. The spreadsheet is the kind an agent keeps in
Google Sheets: no stage, no tags, no consent column, US dates.

The lists are planted for the rules in references/touch-plan-guide.md as of Tuesday, November 10, 2026:
`expected_picks.py` works out who is due that week from the same files.

Usage: python3 -I evals/make/make_files.py   (rewrites practice/*.csv and evals/files/*)
"""
import csv
import io
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
MARK = "PRACTICE FILE: made-up example"

FUB_COLUMNS = [
    "Date Added", "Name", "First Name", "Last Name", "Stage", "Lead Source", "Assigned To", "Is Contacted", "Tags",
    "Email 1", "Email 1 - Type", "Phone 1", "Phone 1 - Type", "Address 1 - Street", "Address 1 - City",
    "Address 1 - State", "Address 1 - Zip", "Notes", "Deal Stage", "Deal Close Date", "Deal Price",
    "Last Communication", "Last Activity", "Home Anniversary", "Text Consent",
]

AGENT = "Rowan Mockford"
PS = ("Placeholder Springs", "UT", "84991")
EH = ("Example Hollow", "UT", "84992")
FF = ("Fictiona Falls", "UT", "84993")
MD = ("Mockingdale", "UT", "84994")

# (added, first, last, stage, source, tags, email?, phone, street, town, notes, deal stage, close date,
#  price, last communication, last activity, home anniversary, text consent)
PEOPLE = [
    # Past clients
    ("2023-06-10", "Ava", "Pennywhistle", "Past Client", "Referral", "Past Client, Buyer", True, "801-555-0101", "214 Marmalade Ln", PS,
     "2025-06-03: Said the raised garden boxes out back finally gave them tomatoes this year.", "Closed", "2023-11-14", "412000",
     "2025-06-03", "", "", "Yes - signed buyer form 2023-09-02"),
    ("2021-02-01", "Ben", "Thimblewick", "Past Client", "Import", "Past Client, Imported", True, "801-555-0102", "77 Biscuit Ct", EH,
     "2024-11-12: Finished the basement theater room. | 2025-12-18: His mom is moving in after hip surgery; may want a main-floor bedroom someday.",
     "", "", "", "2025-12-18", "", "2019-11-12", ""),
    ("2025-07-22", "Dev", "Quillfeather", "Past Client", "Zillow", "Past Client, Buyer, Do Not Text", True, "801-555-0103", "9 Lantern Loop", FF,
     "2025-12-01: Asked about refinancing if rates drop. | 2026-03-02: Waffles the corgi loves the fenced yard.", "Closed", "2025-11-13", "389500",
     "2026-03-02", "", "", "Yes - signed buyer form 2025-09-01"),
    ("2022-08-30", "Elle", "Marrowby", "Past Client", "Sphere", "Past Client, Buyer", True, "801-555-0104", "330 Dewdrop Dr", PS,
     "2026-02-10: Turned the garage into a pottery studio.", "Closed", "2022-11-16", "455000",
     "2026-08-19", "", "", "Revoked - replied STOP 2026-08-19"),
    ("2021-09-14", "Finn", "Oddlebury", "Past Client", "Open House", "Past Client, Buyer, Do Not Call, Unsubscribed", True, "801-555-0105", "61 Crumpet Cir", MD,
     "2024-05-01: Asked not to be contacted for now.", "Closed", "2021-11-11", "367000",
     "2024-05-01", "", "", ""),
    ("2024-07-15", "Opal", "Rindlestock", "Past Client", "Referral", "Past Client, Seller", True, "208-555-0106", "5 Sagebrush Pl", ("Boise", "ID", "83999"),
     "2024-11-15: Sold Teacup Way; moving to Boise.", "Closed", "2024-11-15", "498000",
     "2025-03-20", "", "", "Yes - signed listing form 2024-08-01"),
    ("2020-08-02", "Gus", "Hollowtree", "Closed", "Sphere", "Past Client, Buyer", True, "801-555-0107", "18 Kazoo Ave", EH,
     "2026-10-02: Asked for a roofer name; sent two.", "Closed", "2020-11-17", "301000",
     "2026-10-02", "", "", "Yes - signed buyer form 2020-09-30"),
    ("2026-02-11", "Iris", "Lumbergate", "Past Client", "Zillow", "Past Client, Buyer", True, "801-555-0108", "402 Kazoo Ave", EH,
     "2026-05-20: Closed on the new build.", "Closed", "2026-05-20", "520000",
     "2026-09-01", "", "", "Yes - signed buyer form 2026-03-15"),
    ("2026-04-03", "Jade", "Pocketridge", "Past Client", "Referral", "Past Client, Seller, Buyer", True, "801-555-0109", "27 Pinwheel St", FF,
     "", "Closed", "2026-09-30", "610000",
     "2026-10-15", "", "", ""),
    ("2017-12-04", "Kip", "Ferncastle", "Past Client", "Sphere", "Past Client, Buyer", True, "801-555-0110", "940 Muffin Row", MD,
     "2023-04-01: Coaches a youth soccer team on Saturdays.", "Closed", "2018-03-22", "245000",
     "2025-10-14", "", "", ""),
    ("2019-03-01", "Lena", "Wickersham", "Closed", "Referral", "Past Client, Buyer", True, "801-555-0111", "15 Teacup Way", PS,
     "2025-09-09: Training for a half marathon in the spring.", "Closed", "2019-06-14", "333000",
     "2025-09-09", "", "", "Yes - signed buyer form 2019-04-02"),
    ("2017-05-20", "Milo", "Grumbleton", "Past Client", "Sphere", "Past Client, Buyer", True, "801-555-0112", "88 Pebble Path", EH,
     "2024-12-02: Redid the kitchen backsplash himself. Going through a divorce; keeping the house.", "Closed", "2017-08-03", "289000",
     "2024-12-02", "2026-11-07", "", "Yes - verbal at closing"),
    ("2023-02-09", "Nora", "Puddingstone", "Past Client", "Referral", "Past Client, Buyer", True, "801-555-0113", "6 Lantern Loop", FF,
     "2026-11-03: Called to say hi; all good at the house.", "Closed", "2023-04-28", "398000",
     "2026-11-03", "", "", ""),
    ("2016-06-30", "Otto", "Brambleshaw", "Past Client", "Sphere", "Past Client, Buyer", True, "801-555-0114", "301 Dewdrop Dr", PS,
     "2026-04-20: Building a backyard pizza oven.", "Closed", "2016-10-05", "210000",
     "2026-04-20", "", "", "Yes - signed buyer form 2016-08-11"),
    ("2021-11-29", "Pia", "Snickerdoodle", "Past Client", "Sphere", "Past Client, Buyer", False, "801-555-0115", "52 Biscuit Ct", EH,
     "2025-07-07: Restoring a 1968 pickup in the garage.", "Closed", "2022-02-14", "274000",
     "", "", "", ""),
    ("2024-05-02", "Quin", "Marmaladew", "Past Client", "Zillow", "Past Client, Buyer", True, "801-555-0116", "73 Muffin Row", MD,
     "2026-05-05: Expecting twins in the fall.", "Closed", "2024-07-19", "356000",
     "2026-05-05", "", "", "No"),
    # Close sphere
    ("2022-01-15", "Gwen", "Tallowmere", "Sphere", "Sphere", "Sphere A", True, "801-555-0117", "12 Marmalade Ln", PS,
     "2026-10-30: Traveling in Lisbon until Nov 9. Wants a painter recommendation for her living room once she's back.", "", "", "",
     "2026-10-30", "", "", "Yes - signed sphere form 2024-02-11"),
    ("2025-08-14", "Hattie", "Brisklemore", "Sphere", "Sphere", "Sphere A", False, "801-555-0118", "7 Pinwheel St", FF,
     "2025-08-14: Met at the Fictiona Falls farmers market; sells honey from her backyard hives.", "", "", "",
     "", "", "", ""),
    ("2023-03-03", "Ike", "Moondrop", "Sphere", "Sphere", "Sphere A", True, "801-555-0119", "40 Crumpet Cir", MD,
     "2025-06-10: Thinking about a lake cabin someday.", "", "", "",
     "2025-06-10", "", "", ""),
    ("2022-10-10", "Juno", "Fiddlesworth", "Sphere", "Sphere", "Sphere A", True, "801-555-0120", "3 Kazoo Ave", EH,
     "2026-11-05: Coffee downtown; she referred a coworker.", "", "", "",
     "2026-11-05", "", "", "Yes - signed sphere form 2023-07-07"),
    ("2024-05-18", "Kit", "Lollibrand", "Sphere", "Neighbor", "Sphere A, Neighbor", True, "801-555-0121", "418 Pebble Path", EH,
     "2024-06-02: Grows dahlias; won a ribbon at the county fair. | 2025-01-20: Daughter starting kindergarten; tight on money since the layoff.", "", "", "",
     "2025-01-20", "", "", "Yes - signed sphere form 2025-01-09"),
    ("2023-09-09", "Lou", "Pinwhistle", "Sphere", "Sphere", "Sphere A", True, "801-555-0122", "65 Teacup Way", PS,
     "2026-02-01: Volunteers at the animal shelter on weekends.", "", "", "",
     "2026-02-01", "", "", ""),
    # Wider sphere
    ("2024-04-04", "Hank", "Brindlecomb", "Sphere", "Sphere", "Sphere B", True, "801-555-0123", "210 Muffin Row", MD,
     "2026-09-15: Might sell his rental on Juniper Ct next year. Follow up in November.", "", "", "",
     "2026-09-15", "", "", ""),
    ("2025-05-30", "Lars", "Thistlewood", "Sphere", "Former Coworker", "Sphere B", True, "801-555-0124", "19 Dewdrop Dr", PS,
     "2025-05-30: Former coworker from Example Logistics. Just bought a kayak.", "", "", "",
     "", "", "", "Yes - signed sphere form 2025-05-30"),
    ("2024-02-11", "Mae", "Crumbleford", "Sphere", "Neighbor", "Sphere B", True, "801-555-0125", "8 Pebble Path", EH,
     "2024-02-11: Runs the little book swap box on her corner.", "", "", "",
     "2024-02-11", "", "", ""),
    ("2023-10-04", "Ned", "Puddlefoot", "Sphere", "Open House", "Sphere B", True, "801-555-0126", "77 Lantern Loop", FF,
     "2024-01-05: Asked about adding a sunroom.", "", "", "",
     "2024-01-05", "", "", "Yes - open house sign-in 2023-10-04"),
    ("2025-04-04", "Pip", "Snowberry", "Sphere", "Sphere", "", True, "801-555-0127", "26 Crumpet Cir", MD,
     "2025-04-04: Plays bass in a cover band.", "", "", "",
     "2025-04-04", "", "", ""),
    ("2024-08-20", "Rhea", "Gumbleton", "Sphere", "Sphere", "Sphere B", True, "801-555-0128", "51 Kazoo Ave", EH,
     "2026-09-12: Asked about Medicare plans for her dad.", "", "", "",
     "2026-09-12", "", "", ""),
    ("2023-09-19", "Sid", "Tumblewaite", "Sphere", "Sphere", "Sphere B, Do Not Call", True, "801-555-0129", "14 Pinwheel St", FF,
     "2023-09-19: Big into fly fishing.", "", "", "",
     "2023-09-19", "", "", "Yes - signed sphere form 2024-11-30"),
    ("2025-10-20", "Tova", "Biscuitley", "Sphere", "Sphere", "Sphere B", True, "801-555-0130", "90 Marmalade Ln", PS,
     "2026-10-20: Asked for a plumber name.", "", "", "",
     "2026-10-20", "", "", ""),
    # Not part of a sphere plan
    ("2026-10-01", "Uma", "Wobblesby", "Lead", "Zillow", "Buyer", True, "801-555-0131", "", ("", "", ""),
     "", "", "", "", "2026-11-02", "2026-11-09", "", "Yes - website form 2026-10-01"),
    ("2026-08-12", "Vic", "Applethorn", "Under Contract", "Referral", "Buyer", True, "801-555-0132", "33 Muffin Row", MD,
     "2026-11-09: Inspection done; appraisal ordered.", "Under Contract", "2026-12-04", "435000", "2026-11-09", "", "", ""),
    ("2025-03-15", "Walt", "Nooksbury", "Nurture", "Open House", "Buyer", True, "801-555-0133", "", ("", "", ""),
     "", "", "", "", "2026-06-01", "", "", ""),
    ("2024-12-30", "Yara", "Toffeeton", "Trash", "Zillow", "", True, "801-555-0134", "", ("", "", ""),
     "", "", "", "", "2025-01-01", "", "", ""),
]


def fub_rows():
    rows = []
    for p in PEOPLE:
        (added, first, last, stage, source, tags, has_email, phone, street, town, notes, deal_stage, close, price,
         last_comm, last_act, anniv, consent) = p
        city, state, zipc = town
        email = f"{first.lower()}.{last.lower()}@example.test" if has_email else ""
        rows.append({
            "Date Added": f"{added} 10:00:00", "Name": f"{first} {last}", "First Name": first, "Last Name": last,
            "Stage": stage, "Lead Source": source, "Assigned To": AGENT, "Is Contacted": "Yes" if last_comm else "No",
            "Tags": tags, "Email 1": email, "Email 1 - Type": "home" if email else "", "Phone 1": phone,
            "Phone 1 - Type": "mobile", "Address 1 - Street": street, "Address 1 - City": city,
            "Address 1 - State": state, "Address 1 - Zip": zipc, "Notes": notes, "Deal Stage": deal_stage,
            "Deal Close Date": close, "Deal Price": price,
            "Last Communication": f"{last_comm} 17:30:00" if last_comm else "",
            "Last Activity": f"{last_act} 21:12:00" if last_act else "", "Home Anniversary": anniv, "Text Consent": consent,
        })
    return rows


SHEET_COLUMNS = ["Name", "Email", "Phone", "Mailing Address", "Relationship", "Closed", "Notes"]
SHEET = [
    ("Bea Cobblestone", True, "(801) 555-0141", "12 Kettle Ct, Mockingdale UT 84994", "Past client", "11/13/2020",
     "Bought the blue house on Kettle Ct. Loves her rescue greyhound, Noodle."),
    ("Cal Dimplewood", True, "(801) 555-0142", "5 Sprocket Way, Example Hollow UT 84992", "Past client", "11/16/2024",
     "Kitchen remodel planned for 2025."),
    ("Dot Fernwhistle", True, "(801) 555-0143", "220 Quill Ave, Fictiona Falls UT 84993", "Past client", "6/2/2018",
     "Retired last year; health has been rough."),
    ("Eli Quackenbush", True, "(801) 555-0144", "9 Thimble Ln, Placeholder Springs UT 84991", "Past client", "3/9/2021",
     "Started a woodworking business out of the garage."),
    ("Flo Marigoldt", True, "(801) 555-0145", "", "Close friend", "", "College roommate. Loves trivia nights."),
    ("Gil Honeycomb", True, "(801) 555-0146", "", "Close friend", "",
     "Asked me to check in after Thanksgiving about listing his condo."),
    ("Hal Sprocketson", True, "(801) 555-0147", "", "Friend", "", "Neighbor from the old street. Big college football fan."),
    ("Ivy Lanternfield", True, "(801) 555-0148", "", "Friend", "", "Met at spin class."),
    ("Jon Pebblebrook", True, "(801) 555-0149", "", "Coworker", "", "Former coworker; just got engaged."),
    ("Kay Mufflewick", True, "(801) 555-0150", "", "Friend", "", ""),
    ("Lu Wafflestone", True, "(801) 555-0151", "", "Neighbor", "",
     "Asked for a good electrician name in October. Follow up the week of Nov 9."),
    ("Mo Bramblecrest", True, "(801) 555-0152", "31 Kettle Ct, Mockingdale UT 84994", "Past client", "11/20/2019", ""),
]


def sheet_rows():
    out = []
    for name, has_email, phone, addr, rel, closed, notes in SHEET:
        first, last = name.split(" ", 1)
        out.append({"Name": name, "Email": f"{first.lower()}.{last.lower()}@example.test" if has_email else "",
                    "Phone": phone, "Mailing Address": addr, "Relationship": rel, "Closed": closed, "Notes": notes})
    return out


def write_csv(path, columns, rows):
    buf = io.StringIO()
    buf.write(MARK + "\n")
    w = csv.DictWriter(buf, fieldnames=columns, lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(buf.getvalue(), encoding="utf-8")
    print(f"wrote {path.relative_to(SKILL)} ({len(rows)} contacts)")


def main():
    fub = fub_rows()
    write_csv(SKILL / "practice" / "PRACTICE-followupboss-people-export.csv", FUB_COLUMNS, fub)
    write_csv(SKILL / "evals" / "files" / "eval-1-full-export" / "followupboss-people-export.csv", FUB_COLUMNS, fub)
    write_csv(SKILL / "evals" / "files" / "eval-2-no-consent-sheet" / "Sphere list - Sheet1.csv", SHEET_COLUMNS, sheet_rows())


if __name__ == "__main__":
    main()
