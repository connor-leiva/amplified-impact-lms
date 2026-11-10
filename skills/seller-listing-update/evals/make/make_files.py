"""Writes the made-up inputs for seller-listing-update: the practice set and the two eval cases.

Run from anywhere:  python3 skills/seller-listing-update/evals/make/make_files.py

Every person, brokerage, street and phone number here is made up (phone numbers use 555-01xx). Each file says so
on its first line, and the PDF says so at the top of every page. The shapes follow what a listing agent actually
has at the end of a week (checked 2026-11-10, sources in references/update-guide.md):
- A showing feedback export, one row per appointment: date, time, status, showing agent, brokerage, whether
  feedback came back, interest, price opinion, comments, and whether it was published to the homeowner.
  ShowingTime's own Listing Activity Report downloads as a PDF; a CSV like this comes from another service, a
  spreadsheet the agent keeps, or a copy of the report's Feedback Responses grid.
- A BrokerBay-style export with a 1 to 5 interest scale and a showing outside the week.
- A one-page listing stats printout with this week's and last week's portal and MLS numbers.
- A stats log where the Zillow numbers are Showcase totals since the listing went live (so each week's count is
  a subtraction), plus a rolling 30-day count from the Zillow listing page.
- The agent's own notes, typed on a phone.
"""
import csv
import io
import json
import subprocess
import tempfile
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
MAKE = Path(__file__).resolve().parent
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


def write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(MARK + "\n\n" + text.strip() + "\n", encoding="utf-8")


# --- Practice: Draper, Utah. The week of Monday, November 2 to Sunday, November 8, 2026 ---------------------

ST_HEADER = ["Listing Address", "MLS #", "Appointment Date", "Appointment Time", "Appointment Status", "Showing Agent",
             "Showing Agent Brokerage", "Showing Agent Phone", "Feedback Status", "Interest Level", "Price Opinion",
             "Comments", "Published To Homeowner"]
PA = "1427 E Sample Willow Dr, Draper, UT 84020"
PM = "2299001"
PRACTICE_ROWS = [
    [PA, PM, "11/02/2026", "5:30 PM", "Completed", "Avery Notreal", "Mock Canyon Realty", "(801) 555-0111", "Received",
     "Somewhat Interested", "About Right",
     "Loved the updated kitchen and how big the backyard is. The second bedroom felt small for them.", "No"],
    [PA, PM, "11/03/2026", "4:00 PM", "Completed", "Jordan Fakeley", "Sample Summit Homes", "(801) 555-0122", "Requested",
     "", "", "", "No"],
    [PA, PM, "11/04/2026", "6:15 PM", "Completed", "Casey Pretendson", "Fictional Valley Realty", "(385) 555-0133",
     "Received", "Not Interested", "Too High",
     "Clean and shows well. My buyers felt it's about $15,000 high next to what sold on Sample Birch Way. Road noise "
     "in the backyard was noticeable.", "No"],
    [PA, PM, "11/05/2026", "12:00 PM", "Cancelled By Showing Agent", "Riley Testerman", "Pretend Peak Properties",
     "(801) 555-0144", "", "", "", "", "No"],
    [PA, PM, "11/06/2026", "5:00 PM", "Completed", "Riley Testerman", "Pretend Peak Properties", "(801) 555-0144",
     "Received", "Very Interested", "About Right",
     "Buyers really liked the main floor layout and all the natural light. They may want a second look this weekend.",
     "No"],
    [PA, PM, "11/07/2026", "10:30 AM", "Completed", "Morgan Samplewood", "Mock Canyon Realty", "(801) 555-0155",
     "Received", "Somewhat Interested", "Too High",
     "My buyers have three little kids and loved that the street seems full of young families. They asked about the "
     "elementary school ratings too. Kitchen is great.", "No"],
    [PA, PM, "11/07/2026", "2:00 PM", "Completed", "Quinn Exampleford", "Sample Summit Homes", "(801) 555-0166",
     "Received", "Somewhat Interested", "No Opinion",
     "There's a water stain on the basement ceiling under the main floor bathroom. Otherwise they liked the finished "
     "basement.", "No"],
    [PA, PM, "11/08/2026", "1:00 PM", "Completed", "Drew Mockingbird", "Fictional Valley Realty", "(385) 555-0177",
     "Requested", "", "", "", "No"],
]

PRACTICE_NOTES = """
Weekly update notes: 1427 E Sample Willow Dr, Draper
Sellers: Pat and Lee Fakenham. Pat likes a quick text. Lee reads the email, so send both.
Week of Mon Nov 2 to Sun Nov 8. List price $574,900.

- Pat called Saturday and asked if the Zillow saves going down means something is wrong. Answer it in the update.
- Riley Testerman's buyers (the 11/6 showing) might want a second look. Nothing booked yet.
- Quinn's buyers saw a water stain on the basement ceiling. Need to ask Pat and Lee about it.

Next week:
- New twilight photos of the backyard Wednesday.
- Pricing check-in call with Pat and Lee Thursday the 12th at 6.
- Open house Sat Nov 14, 1 to 3.
"""

STATS_ROWS = [
    ("Zillow page views", "412", "538"),
    ("Zillow saves", "19", "27"),
    ("Realtor.com page views", "167", "201"),
    ("MLS listing views", "64", "59"),
    ("Showings (completed)", "7", "9"),
    ("Feedback received", "5", "6"),
    ("Days on market (MLS, as of Sunday)", "23", "16"),
]


def stats_html():
    rows = "".join(f"<tr><td>{m}</td><td class='n'>{a}</td><td class='n'>{b}</td></tr>" for m, a, b in STATS_ROWS)
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
body {{ font-family: Arial, sans-serif; font-size: 11pt; color: #222; }}
.stamp {{ color: #b00; font-weight: bold; font-size: 9pt; }}
h1 {{ font-size: 16pt; margin: 6px 0 2px; }}
.small {{ font-size: 9pt; color: #555; }}
table {{ border-collapse: collapse; width: 100%; margin-top: 14px; }}
th, td {{ border: 1px solid #bbb; padding: 7px 9px; text-align: left; }}
th {{ background: #eee; }}
td.n {{ text-align: right; }}
.facts td {{ border: none; padding: 2px 9px 2px 0; }}
</style></head><body>
<div class="stamp">PRACTICE FILE: made-up example</div>
<h1>Weekly Listing Stats</h1>
<p class="small">Example Listing Dashboard (fictional). Printed Monday, November 9, 2026. Weekly counts run Monday to Sunday.</p>
<table class="facts">
<tr><td><b>Listing</b></td><td>{PA}</td></tr>
<tr><td><b>MLS #</b></td><td>{PM}</td></tr>
<tr><td><b>List Price</b></td><td>$574,900</td></tr>
<tr><td><b>List Date</b></td><td>10/16/2026</td></tr>
<tr><td><b>Status</b></td><td>Active</td></tr>
<tr><td><b>Listing Agent</b></td><td>Dana Sampleford, Example Ridge Realty</td></tr>
</table>
<table>
<tr><th>Metric</th><th>This Week (Nov 2 to Nov 8)</th><th>Last Week (Oct 26 to Nov 1)</th></tr>
{rows}
</table>
<p class="small">Portal numbers as reported by each site for the dates shown. Showings and feedback from the showing service.</p>
</body></html>"""


# --- Eval 1: Meridian, Idaho (general mode). BrokerBay-style export, a stats log, notes ------------------------

BB_HEADER = ["Showing ID", "Date", "Start Time", "End Time", "Status", "Buyer's Agent", "Office", "Agent Phone",
             "Feedback Submitted", "Overall Interest (1-5)", "Price Feedback", "Feedback Comments"]
EVAL1_ROWS = [
    ["BB-40211", "10/31/2026", "3:00 PM", "3:30 PM", "Completed", "Taylor Notaclient", "Sample Snake River Realty",
     "208-555-0110", "Yes", "3", "Priced Right", "Nice home, good condition."],
    ["BB-40236", "11/02/2026", "4:30 PM", "5:00 PM", "Completed", "Kendall Fakerton", "Example Treasure Valley Homes",
     "208-555-0121", "Yes", "4", "Priced Right",
     "Great curb appeal and the backyard is a big plus. Smaller inside than the photos make it look."],
    ["BB-40240", "11/03/2026", "11:00 AM", "11:30 AM", "Declined By Seller", "Rowan Mockley", "Pretend Boise Realty",
     "208-555-0132", "No", "", "", ""],
    ["BB-40244", "11/03/2026", "5:15 PM", "5:45 PM", "Completed", "Sage Placeholder", "Sample Snake River Realty",
     "208-555-0143", "Yes", "2", "Too High",
     "Buyers thought it needs paint and new carpet for this price. Around 470 would make more sense to them."],
    ["BB-40251", "11/04/2026", "6:00 PM", "6:30 PM", "Completed", "Blake Exampleson", "Fictional Foothills Realty",
     "208-555-0154", "No", "", "", ""],
    ["BB-40258", "11/05/2026", "4:00 PM", "4:30 PM", "Completed", "Jamie Testford", "Example Treasure Valley Homes",
     "208-555-0165", "Yes", "3", "Priced Right",
     "They asked if the neighborhood is safe at night because they heard about car break-ins nearby. Liked the open "
     "kitchen."],
    ["BB-40263", "11/06/2026", "5:30 PM", "6:00 PM", "Completed", "Lee Pretendwell", "Pretend Boise Realty",
     "208-555-0176", "Yes", "5", "Priced Right",
     "Buyers loved it and might write an offer this week. They are waiting to hear back from their lender first."],
    ["BB-40270", "11/07/2026", "10:00 AM", "10:30 AM", "Completed", "Drew Samplestone", "Fictional Foothills Realty",
     "208-555-0187", "Yes", "3", "Too High",
     "Kitchen is dated compared to others they've seen around 480. The buyers are Muslim and wanted to know how far "
     "the nearest mosque is."],
    ["BB-40274", "11/07/2026", "1:00 PM", "1:30 PM", "Completed", "Casey Fakebrook", "Sample Snake River Realty",
     "208-555-0198", "No", "", "", ""],
    ["BB-40281", "11/08/2026", "2:00 PM", "2:30 PM", "Completed", "Quinn Mockwell", "Example Treasure Valley Homes",
     "208-555-0109", "Yes", "2", "", "Strong pet smell in the basement."],
]

LOG_HEADER = ["Date Recorded", "Source", "Metric", "Covers", "Value"]
LOG_ROWS = [
    ["10/25/2026", "Zillow Showcase", "Page views", "Since listed", "820"],
    ["10/25/2026", "Zillow Showcase", "Saves", "Since listed", "30"],
    ["11/01/2026", "Zillow Showcase", "Page views", "Since listed", "1284"],
    ["11/01/2026", "Zillow Showcase", "Saves", "Since listed", "41"],
    ["11/01/2026", "MLS", "Listing views", "Week (Mon to Sun)", "71"],
    ["11/08/2026", "Zillow Showcase", "Page views", "Since listed", "1702"],
    ["11/08/2026", "Zillow Showcase", "Saves", "Since listed", "55"],
    ["11/08/2026", "Zillow listing page", "Views", "Last 30 days", "1190"],
    ["11/08/2026", "Realtor.com", "Page views", "Week (Mon to Sun)", "143"],
    ["11/08/2026", "MLS", "Listing views", "Week (Mon to Sun)", "58"],
    ["11/08/2026", "MLS", "Days on market", "As of date", "31"],
]

EVAL1_NOTES = """
Fir St weekly notes (3318 W Example Fir St, Meridian ID). Week of Nov 2 to Nov 8.
Sellers: Sam and Jo Mockler. Jo prefers texts, Sam wants the email.
Sam said they like knowing which agents came through, so name the showing agents this time.
Last week: 6 showings, 4 sent feedback.
Jo asked if anyone said anything about the HOA.
My take: we need to be at 474,900 by the 20th or we lose the holiday buyers. Don't put that in, I'll talk to them myself.

Next week:
- Carpet cleaning in the basement Tuesday (the pet smell comment).
- Broker open Wednesday 10 to 12.
- New living room photos Thursday.
"""

# --- Eval 2: Lehi, Utah. Two showings, no feedback, no last-week numbers, a price question --------------------

EA = "2286 N Mockingbird Hollow Ln, Lehi, UT 84043"
EM = "2301877"
EVAL2_ROWS = [
    [EA, EM, "11/04/2026", "3:30 PM", "Completed", "Sky Notaname", "Sample Summit Homes", "(801) 555-0181", "Requested",
     "", "", "", "No"],
    [EA, EM, "11/07/2026", "11:00 AM", "Completed", "Lou Fakester", "Mock Canyon Realty", "(385) 555-0192", "Requested",
     "", "", "", "No"],
]

EVAL2_NOTES = """
Mockingbird Hollow update, week of Nov 2 to Nov 8
Sellers: Chris and Alex Fakerson. Email is best for both.
2 showings this week. Neither agent has sent feedback yet. I sent both a second request Monday.
Zillow listing page shows 96 views and 3 saves. Realtor.com 38 page views this week. MLS says 47 days on market.
Chris texted me Sunday: "Should we drop the price?"
Next week: I'll pull fresh comps and we'll sit down Friday to talk it through.
"""


def main():
    write_csv(PRACTICE / "PRACTICE Showing feedback export, 1427 E Sample Willow Dr, Nov 2 to Nov 8.csv",
              ST_HEADER, PRACTICE_ROWS)
    write_text(PRACTICE / "PRACTICE Agent notes, Sample Willow weekly update.txt", PRACTICE_NOTES)

    d1 = FILES / "eval-1-full-week-general-mode"
    write_csv(d1 / "Showings and feedback export, 3318 W Example Fir St.csv", BB_HEADER, EVAL1_ROWS)
    write_csv(d1 / "Listing stats log, 3318 W Example Fir St.csv", LOG_HEADER, LOG_ROWS)
    write_text(d1 / "Harper notes, Example Fir weekly update.txt", EVAL1_NOTES)

    d2 = FILES / "eval-2-thin-week-price-question"
    write_csv(d2 / "Showing feedback export, 2286 N Mockingbird Hollow Ln.csv", ST_HEADER, EVAL2_ROWS)
    write_text(d2 / "Morgan notes, Mockingbird Hollow update.txt", EVAL2_NOTES)

    with tempfile.TemporaryDirectory() as tmp:
        html = Path(tmp) / "stats.html"
        html.write_text(stats_html(), encoding="utf-8")
        pdf = PRACTICE / "PRACTICE Listing stats printout, 1427 E Sample Willow Dr, week of Nov 2.pdf"
        jobs = Path(tmp) / "pdfs.json"
        jobs.write_text(json.dumps([{"html": str(html), "pdf": str(pdf)}]), encoding="utf-8")
        subprocess.run(["node", str(MAKE / "html_to_pdf.cjs"), str(jobs)], check=True)
    print("wrote practice/ and evals/files/")


if __name__ == "__main__":
    main()
