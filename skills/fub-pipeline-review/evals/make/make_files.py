"""Makes the practice files and the eval files for fub-pipeline-review. Everything here is made up.

python3 -I skills/fub-pipeline-review/evals/make/make_files.py

Writes:
  practice/PRACTICE FUB People Export 2026-11-10.csv           this week's People export (54 people, 5 agents)
  practice/PRACTICE FUB People Export 2026-11-03 Last Week.csv  last week's People export (52 people)
  practice/PRACTICE FUB Deals Report 2026-11-10.csv             a Deals report export (13 deals)
  evals/files/case1/  the same three files (eval 1 is the full practice set)
  evals/files/case2/kettlecorn-fub-people-export-2026-11-10.csv  a People export only, with odd rows (44 people, 4 agents)

The People exports follow the columns Follow Up Boss's help center lists for Export All Columns (Date Added, Name,
First Name, Last Name, Stage, Lead Source, Assigned To, Last Assigned, Is Contacted, Tags, Email 1, Phone 1,
Timeframe, Message, Notes, Deal Stage, Deal Close Date, Deal Price), cut to the ones a pipeline review touches, plus
Last Communication and Last Activity, which are People-view columns the help center does not list for the export.
The Deals report follows the Deals Report's columns (Name, Stage, Status, Entered Stage, Time in Stage, Close Date,
Price, Commission, Team). Dates are relative to an as-of date of 2026-11-10.
"""
import csv
from datetime import date, timedelta
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
PRACTICE = SKILL / "practice"
CASE1 = SKILL / "evals" / "files" / "case1"
CASE2 = SKILL / "evals" / "files" / "case2"
BANNER = "PRACTICE FILE: made-up example"
AS_OF = date(2026, 11, 10)
LAST = date(2026, 11, 3)

PEOPLE_HEAD = ["Date Added", "Name", "First Name", "Last Name", "Stage", "Lead Source", "Assigned To", "Last Assigned",
               "Is Contacted", "Tags", "Email 1", "Email 1 - Type", "Phone 1", "Phone 1 - Type", "Timeframe", "Message",
               "Notes", "Deal Stage", "Deal Close Date", "Deal Price", "Last Communication", "Last Activity"]
DEAL_HEAD = ["Name", "Stage", "Status", "Entered Stage", "Time in Stage", "Close Date", "Price", "Commission", "Team"]

A = {"JF": "Juniper Fogwhistle", "BC": "Barnaby Crumpet", "HT": "Hazel Tinkersnap", "OM": "Otis Marmaduke",
     "CP": "Clementine Puddleby"}

# name, agent, source, date added, stage last week (None: new this week), stage now, last communication now (MM-DD in
# 2026 or a full date), last activity, tags, timeframe
P = [
    ("Pemberton Quibblesworth", "JF", "Zillow", "2026-10-02", "Appointment Set", "Appointment Set", "10-21", "10-19", "Buyer, Zillow", "0-3 Months"),
    ("Tilda Fizzlebottom", "BC", "Realtor.com", "2026-09-15", "Met with Customer", "Met with Customer", "10-27", "10-25", "Buyer", "3-6 Months"),
    ("Rufus Puddingstone", "HT", "Open House", "2026-10-11", "Met with Customer", "Met with Customer", "", "", "Buyer, Open House", "0-3 Months"),
    ("Mabel Wobblesby", "OM", "Website", "2026-09-29", "Appointment Set", "Appointment Set", "11-06", "11-05", "Seller", "0-3 Months"),
    ("Ignatius Tumblewick", "CP", "Referral", "2026-10-14", "Spoke with Customer", "Appointment Set", "11-07", "", "Seller", "0-3 Months"),
    ("Posy Bumbershoot", "JF", "Sphere", "2026-08-20", "Met with Customer", "Met with Customer", "10-29", "", "Buyer", "0-3 Months"),
    ("Wendell Crumbleton", "BC", "Zillow", "2026-07-30", "Showing Homes", "Showing Homes", "10-24", "11-08", "Buyer, Zillow", "0-3 Months"),
    ("Delphine Fluffernutter", "OM", "Website", "2026-09-03", "Spoke with Customer", "Spoke with Customer", "10-30", "10-30", "Buyer", "3-6 Months"),
    ("Cosmo Gigglesworth", "CP", "Realtor.com", "2026-08-25", "Under Contract", "Under Contract", "10-31", "", "Buyer", "0-3 Months"),
    ("Henrietta Hobnob", "HT", "Zillow", "2026-10-05", "Attempted Contact", "Attempted Contact", "10-20", "11-09", "Hot, Buyer, Zillow", "0-3 Months"),
    ("Lysander Jellybean", "JF", "Facebook", "2026-09-22", "Spoke with Customer", "Spoke with Customer", "", "10-02", "Buyer", "6-12 Months"),
    ("Petunia Quillby", "BC", "Zillow", "2026-06-18", "Under Contract", "Under Contract", "11-07", "", "Buyer", "0-3 Months"),
    ("Ferdinand Rattlecap", "OM", "Sphere", "2026-05-12", "Under Contract", "Under Contract", "11-02", "", "Seller", "0-3 Months"),
    ("Ottoline Velveteen", "HT", "Referral", "2026-04-09", "Closed", "Closed", "10-16", "", "Buyer, Past Client", ""),
    ("Percival Scrumpkin", "CP", "Sphere", "2026-07-08", "Active Listing", "Active Listing", "11-04", "", "Seller", "0-3 Months"),
    ("Winifred Waffleton", "JF", "Realtor.com", "2026-06-02", "Under Contract", "Closed", "11-05", "", "Buyer, Past Client", ""),
    ("Archibald Custardbloom", "BC", "Referral", "2026-03-21", "Closed", "Closed", "10-09", "", "Seller, Past Client", ""),
    ("Clover Dewdrop", "HT", "Zillow", "2026-08-28", "Showing Homes", "Under Contract", "11-04", "", "Buyer, Zillow", "0-3 Months"),
    ("Bartholomew Lumpkin", "OM", "Website", "2026-08-15", "Active Listing", "Active Listing", "11-03", "", "Seller", "0-3 Months"),
    ("Thaddeus Pickwhistle", "BC", "Realtor.com", "2026-08-30", "Showing Homes", "Showing Homes", "11-05", "11-04", "Buyer", "0-3 Months"),
    ("Philippa Hufflington", "JF", "Sphere", "2026-07-19", "Under Contract", "Under Contract", "11-06", "", "Seller", "0-3 Months"),
    ("Ambrose Sprocketton", "CP", "Zillow", "2026-09-10", "Submitting Offers", "Submitting Offers", "11-05", "11-01", "Buyer, Zillow", "0-3 Months"),
    ("Esmeralda Inkwhistle", "HT", "Website", "2026-09-18", "Submitting Offers", "Submitting Offers", "11-06", "11-02", "Buyer", "0-3 Months"),
    ("Horatio Butterwick", "OM", "Sphere", "2026-10-08", "Listing Agreement", "Listing Agreement", "11-04", "", "Seller", "0-3 Months"),
    ("Lavender Doodlesack", "BC", "Open House", "2026-09-27", "Listing Agreement", "Listing Agreement", "11-09", "", "Seller", "0-3 Months"),
    ("Montgomery Elderwhistle", "OM", "Referral", "2026-08-22", "Listing Agreement", "Active Listing", "11-09", "", "Seller", "0-3 Months"),
    ("Primrose Noodleman", "BC", "Zillow", "2026-10-29", "Lead", "Attempted Contact", "11-05", "11-03", "Buyer, Zillow", ""),
    ("Cornelius Oatcrumble", "HT", "Website", "2026-10-24", "Lead", "Spoke with Customer", "11-08", "11-07", "Buyer", "3-6 Months"),
    ("Dorothea Gobbledy", "JF", "Facebook", "2026-08-14", "Spoke with Customer", "Nurture", "10-28", "", "Buyer", "12+ Months"),
    ("Fitzgerald Lollygag", "OM", "Facebook", "2026-10-01", "Attempted Contact", "Trash", "10-15", "", "", ""),
    ("Gwendolyn Mumblecrust", "CP", "Realtor.com", "2026-10-27", "Lead", "Attempted Contact", "11-04", "10-28", "Buyer", ""),
    ("Humphrey Nimblefoot", "JF", "Zillow", "2026-11-04", None, "Lead", "", "11-04", "Buyer, Zillow", ""),
    ("Imogen Oddsbody", "BC", "Website", "2026-11-06", None, "Lead", "11-06", "11-06", "Buyer", ""),
    ("Jasper Pumpernickel", "CP", "Realtor.com", "2026-11-08", None, "Attempted Contact", "11-08", "11-08", "Buyer", ""),
    ("Leopold Whiffletree", "HT", "Website", "2025-12-03", "Nurture", "Nurture", "09-12", "11-14", "Buyer", "12+ Months"),
    ("Millicent Twiddlesworth", "BC", "Website", "2026-10-28", "", "", "", "10-28", "", ""),
    ("Nigel Upplewick", "JF", "Zillow", "2026-10-18", "Lead", "Lead", "", "10-18", "Buyer, Zillow", ""),
    ("Octavia Yodelton", "HT", "Realtor.com", "2026-10-22", "Lead", "Lead", "", "10-23", "Buyer", ""),
    ("Peregrine Zigzagger", "OM", "Zillow", "2026-10-30", "Lead", "Lead", "10-31", "10-30", "Buyer, Zillow", ""),
    ("Quentin Butterwhisk", "CP", "Facebook", "2026-10-26", "Lead", "Lead", "", "", "Buyer", ""),
    ("Rosalind Frumple", "BC", "Zillow", "2026-09-08", "Attempted Contact", "Attempted Contact", "10-12", "", "Buyer, Zillow", ""),
    ("Sebastian Pinwheel", "JF", "Website", "2026-09-25", "Attempted Contact", "Attempted Contact", "10-19", "", "Buyer", ""),
    ("Theodora Wigglesby", "OM", "Realtor.com", "2026-08-19", "Attempted Contact", "Attempted Contact", "10-02", "", "Buyer", ""),
    ("Ulysses Crinklecut", "HT", "Sphere", "2026-07-14", "Spoke with Customer", "Spoke with Customer", "11-05", "", "Seller", "6-12 Months"),
    ("Violetta Muffinwhistle", "CP", "Zillow", "2026-08-31", "Showing Homes", "Showing Homes", "11-07", "11-06", "Buyer, Zillow", "0-3 Months"),
    ("Wilbur Snorkelby", "JF", "Zillow", "2025-11-20", "Nurture", "Nurture", "08-14", "", "Buyer", "12+ Months"),
    ("Xanthe Pebblecrumb", "BC", "Website", "2026-02-11", "Nurture", "Nurture", "07-22", "", "Buyer", "12+ Months"),
    ("Yorick Hobbleton", "HT", "Facebook", "2026-08-16", "Nurture", "Nurture", "09-30", "", "Buyer", "6-12 Months"),
    ("Zinnia Tufflewick", "OM", "Open House", "2026-05-09", "Nurture", "Nurture", "06-18", "", "Seller", "12+ Months"),
    ("Bertram Puddlejump", "CP", "Sphere", "2025-09-14", "Nurture", "Nurture", "10-10", "11-02", "Hot, Seller", "3-6 Months"),
    ("Calliope Whistlebrook", "JF", "Referral", "2025-06-30", "Closed", "Closed", "09-15", "", "Past Client", ""),
    ("Desmond Fernsnap", "BC", "Zillow", "2026-09-02", "Rejected", "Rejected", "09-20", "", "", ""),
    ("Eloise Bramblesnout", "HT", "Facebook", "2026-10-09", "Trash", "Trash", "", "", "", ""),
    ("Florian Tickleberry", "OM", "Realtor.com", "2026-09-12", "Spoke with Customer", "Spoke with Customer", "11-04", "11-03", "Buyer", "3-6 Months"),
]
GONE = [("Kipling Rumbleford", "OM", "Zillow", "2026-10-20", "Lead", "10-21", "10-20", "Buyer, Zillow", "")]

# Notes and messages that must never reach the output (a lender amount, a family detail).
NOTES = {
    "Pemberton Quibblesworth": ("I'd like to see 418 Gumdrop Way this weekend.", "Preapproved 450k with Sprocketwheel Lending. Prefers texts after 5."),
    "Tilda Fizzlebottom": ("", "Expecting a baby in March, wants a bigger place. Call 801-555-0177 after work."),
    "Wendell Crumbleton": ("Is 12 Jellyroll Dr still available?", ""),
    "Henrietta Hobnob": ("Can I tour 52 Nougat Ave?", "Credit score 702 per her."),
}

# deal name, stage, status, entered, close, price, team agent, person
DEALS = [
    ("Petunia Quillby, 418 Gumdrop Way", "Under Contract", "Current", "2026-09-28", "2026-11-06", "412500", "BC", "Petunia Quillby"),
    ("Ferdinand Rattlecap, 77 Marzipan Ct", "Pending", "Current", "2026-09-22", "2026-10-30", "538000", "OM", "Ferdinand Rattlecap"),
    ("Ottoline Velveteen, 9 Toffee Ln", "Closed", "Current", "2026-10-16", "", "365000", "HT", "Ottoline Velveteen"),
    ("Percival Scrumpkin, 14 Licorice Loop", "Listed", "Current", "2026-10-12", "", "489000", "CP", "Percival Scrumpkin"),
    ("Winifred Waffleton, 31 Butterscotch Bend", "Closed", "Current", "2026-11-05", "2026-11-05", "455000", "JF", "Winifred Waffleton"),
    ("Archibald Custardbloom, 6 Caramel Ct", "Closed", "Current", "2026-10-09", "2026-10-09", "610000", "BC", "Archibald Custardbloom"),
    ("Clover Dewdrop, 52 Nougat Ave", "Under Contract", "Current", "2026-11-04", "2026-12-04", "349000", "HT", "Clover Dewdrop"),
    ("Bartholomew Lumpkin, 880 Gumdrop Way", "Listed", "Current", "2026-10-01", "", "524900", "OM", "Bartholomew Lumpkin"),
    ("Thaddeus Pickwhistle, 12 Jellyroll Dr", "Fell Through", "Current", "2026-10-31", "2026-10-31", "289000", "BC", "Thaddeus Pickwhistle"),
    ("Philippa Hufflington, 4 Sugarplum Row", "Under Contract", "Current", "2026-10-19", "2026-11-18", "472000", "JF", "Philippa Hufflington"),
    ("Cosmo Gigglesworth, 203 Sherbet St", "Under Contract", "Current", "2026-10-26", "2026-11-20", "299900", "CP", "Cosmo Gigglesworth"),
    ("Posy Bumbershoot", "Buyer Agreement", "Current", "2026-10-22", "", "", "JF", "Posy Bumbershoot"),
    ("Calliope Whistlebrook, 19 Crumpet Ct", "Closed", "Archived", "2025-08-29", "2025-08-29", "398000", "JF", "Calliope Whistlebrook"),
]

DOMAINS = ["pigeonpost.test", "mailbox.test", "postbox.test", "letterbox.test"]
PHONE_FORMATS = ["({a}) 555-{n}", "{a}-555-{n}", "{a}.555.{n}", "+1 {a} 555 {n}"]
AREAS = ["801", "385", "435"]


def d(s):
    if not s:
        return None
    if len(s) == 5:
        return date(2026, int(s[:2]), int(s[3:]))
    return date.fromisoformat(s)


def stamp(dt, hh=14, mm=5):
    return f"{dt.isoformat()} {hh:02d}:{mm:02d}:00" if dt else ""


def contact(name, k):
    first, last = name.split()[0], name.split()[-1]
    email = f"{first.lower()}.{last.lower()}{100 + 7 * k}@{DOMAINS[k % 4]}"
    phone = PHONE_FORMATS[k % 4].format(a=AREAS[k % 3], n=f"01{(k * 13) % 100:02d}")
    return email, phone


def deal_cols(name, when):
    """Deal Stage, Deal Close Date and Deal Price for a person's current (not archived) deal, as of `when`."""
    for dn, st, status, ent, close, price, ag, person in DEALS:
        if person == name and status != "Archived" and d(ent) <= when:
            return st, stamp(d(close), 0, 0) if close else "", price
    if name == "Winifred Waffleton" and when == LAST:
        return "Under Contract", stamp(date(2026, 11, 5), 0, 0), "455000"
    return "", "", ""


def people_rows(when, rows, extra=()):
    out = []
    for k, (name, ag, src, added, s_last, s_now, comm, act, tags, tf) in enumerate(rows):
        if when == LAST and s_last is None:
            continue
        stage = s_now if when == AS_OF else s_last
        c, a = d(comm), d(act)
        if when == LAST:
            c = c if c and c <= LAST else (c - timedelta(days=9) if c and c - timedelta(days=9) >= d(added) else None)
            a = a if a and a <= LAST else None
        first, last = name.split()[0], name.split()[-1]
        email, phone = contact(name, k)
        msg, notes = NOTES.get(name, ("", ""))
        ds, dc, dp = deal_cols(name, when)
        out.append([stamp(d(added), 9 + k % 8, (k * 7) % 60), name, first, last, stage, src, A[ag], d(added).isoformat(),
                    "Yes" if c else "No", tags, email, "home", phone, "mobile", tf, msg, notes, ds, dc, dp,
                    stamp(c, 10 + k % 7, (k * 11) % 60), stamp(a, 8 + k % 9, (k * 5) % 60)])
    for k, (name, ag, src, added, s_last, comm, act, tags, tf) in enumerate(extra, start=len(rows)):
        email, phone = contact(name, k)
        out.append([stamp(d(added), 11, 15), name, name.split()[0], name.split()[-1], s_last, src, A[ag], d(added).isoformat(),
                    "Yes" if comm else "No", tags, email, "home", phone, "mobile", tf, "", "", "", "", "",
                    stamp(d(comm), 13, 20), stamp(d(act), 12, 40)])
    return out


def write_csv(path, head, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        f.write(BANNER + "\n")
        w = csv.writer(f)
        w.writerow(head)
        w.writerows(rows)


def deal_rows():
    out = []
    for dn, st, status, ent, close, price, ag, person in DEALS:
        days = (AS_OF - d(ent)).days
        comm = f"{round(int(price) * 0.03):d}" if price else ""
        out.append([dn, st, status, stamp(d(ent), 0, 0), f"{days} days", stamp(d(close), 0, 0) if close else "", price, comm, A[ag]])
    return out


# ------------------------------------------------------------------ case 2: People export only, with odd rows
B = {"FG": "Fennimore Gaddlesby", "RT": "Rosalie Tinkwhistle", "AP": "Augustin Pebbleworth", "MQ": "Marisa Quenchley"}
# name, agent, source, date added, stage, last communication, last activity, tags, deal stage, deal close, deal price
C2 = [
    ("Gertrude Fizzlewick", "AP", "Referral", "2026-03-02", "Past Client", "2026-10-01", "", "Past Client", "Closed", "", "402000"),
    ("Horace Mumbleton", "FG", "Website", "2025-10-11", "Nurture", "2026-08-30", "2026-12-02", "Buyer", "", "", ""),
    ("Ingrid Sockwhistle", "MQ", "Zillow", "2026-09-06", "Showing Homes", "2026-11-19", "2026-11-08", "Buyer, Zillow", "", "", ""),
    ("Jethro Puffington", "RT", "Zillow", "2026-11-12", "Lead", "", "", "Buyer, Zillow", "", "", ""),
    ("Kestrel Bumbleford", "AP", "Realtor.com", "2026-09-21", "Spoke with Customer", "31/10/2026", "2026-10-30", "Buyer", "", "", ""),
    ("Lucinda Wafflebury", "RT", "Sphere", "2026-06-15", "Pending", "2026-11-06", "", "Seller", "Under Contract", "2026-11-02", "375000"),
    ("Mortimer Quibbleton", "FG", "Zillow", "2026-09-30", "Appointment Set", "2026-10-22", "2026-10-21", "Buyer, Zillow", "", "", ""),
    ("Nettie Crumblewood", "MQ", "Open House", "2026-10-12", "Met with Customer", "", "", "Buyer, Open House", "", "", ""),
    ("Oswin Tumbledown", "AP", "Zillow", "2026-08-09", "Showing Homes", "2026-10-25", "2026-11-09", "Buyer, Zillow", "", "", ""),
    ("Prudence Fiddlewhip", "FG", "Website", "2026-08-27", "Spoke with Customer", "2026-10-29", "", "Seller", "", "", ""),
    ("Quincy Marbleton", "RT", "Realtor.com", "2026-10-03", "Attempted Contact", "2026-10-14", "2026-11-07", "Hot, Buyer", "", "", ""),
    ("Rowena Puddlefoot", "MQ", "Referral", "2026-07-21", "Pending", "2026-11-01", "", "Buyer", "Under Contract", "2026-11-24", "289500"),
    ("Silas Thimblewood", "AP", "Sphere", "2026-08-04", "Met with Customer", "2026-10-30", "", "Buyer", "Buyer Agreement", "", ""),
    ("Tabitha Nettlesworth", "FG", "Zillow", "2026-10-19", "Appointment Set", "2026-11-05", "2026-11-04", "Buyer, Zillow", "", "", ""),
    ("Ulric Bramblepatch", "RT", "Website", "2026-09-14", "Listing Agreement", "2026-11-04", "", "Seller", "", "", ""),
    ("Verity Gooseberry", "MQ", "Sphere", "2026-07-02", "Active Listing", "2026-11-09", "", "Seller", "Listed", "", "449000"),
    ("Wallace Crumpetsby", "AP", "Realtor.com", "2026-08-18", "Submitting Offers", "2026-11-06", "2026-11-05", "Buyer", "", "", ""),
    ("Yvette Plumpudding", "FG", "Open House", "2026-09-09", "Under Contract", "2026-11-08", "", "Buyer", "Under Contract", "2026-11-30", "342000"),
    ("Zebedee Kettlewhistle", "RT", "Zillow", "2026-10-25", "Lead", "", "2026-10-25", "Buyer, Zillow", "", "", ""),
    ("Agatha Wobbleworth", "MQ", "Website", "2026-10-30", "Lead", "2026-10-31", "2026-10-30", "Buyer", "", "", ""),
    ("Bram Tinselby", "AP", "Website", "2026-11-02", "Lead", "2026-11-03", "2026-11-02", "Buyer", "", "", ""),
    ("Cressida Fumbleton", "FG", "Zillow", "2026-11-07", "Lead", "", "2026-11-07", "Buyer, Zillow", "", "", ""),
    ("Dashiell Pottersby", "RT", "Realtor.com", "2026-10-16", "Attempted Contact", "2026-10-28", "", "Buyer", "", "", ""),
    ("Edwina Mufflewick", "MQ", "Zillow", "2026-09-27", "Attempted Contact", "2026-10-20", "", "Buyer, Zillow", "", "", ""),
    ("Fergus Gumbleton", "AP", "Website", "2026-08-12", "Attempted Contact", "2026-10-05", "", "Buyer", "", "", ""),
    ("Georgiana Pipwhistle", "FG", "Sphere", "2026-08-06", "Spoke with Customer", "2026-11-07", "", "Seller", "", "", ""),
    ("Hamish Bobbleton", "RT", "Open House", "2026-09-19", "Spoke with Customer", "2026-11-04", "", "Buyer", "", "", ""),
    ("Isolde Fernwobble", "MQ", "Realtor.com", "2026-08-23", "Nurture", "2026-10-01", "", "Buyer", "", "", ""),
    ("Jolyon Scufflebeck", "AP", "Zillow", "2026-08-15", "Nurture", "2026-09-18", "", "Buyer, Zillow", "", "", ""),
    ("Kezia Bumbleroot", "FG", "", "2026-09-02", "Nurture", "2026-09-25", "", "Buyer", "", "", ""),
    ("Lionel Crumbsworth", "RT", "Zillow", "2026-08-29", "Rejected", "2026-09-10", "", "", "", "", ""),
    ("Mirabel Toastwick", "MQ", "Website", "2026-10-04", "Trash", "", "", "", "", "", ""),
    ("Nathaniel Pebbleshoe", "AP", "Referral", "2025-12-12", "Closed", "2026-09-02", "", "Past Client", "Closed", "2026-05-29", "455000"),
    ("Odette Fizzlethorpe", "FG", "Sphere", "2025-08-20", "Past Client", "2026-07-15", "", "Past Client", "Closed", "2025-11-14", "398500"),
    ("Percy Wobblethwaite", "RT", "Referral", "2025-05-30", "Past Client", "2026-10-02", "", "Past Client", "Closed", "2025-09-12", "512000"),
    ("Rosamund Quillsby", "MQ", "Zillow", "2026-08-08", "Showing Homes", "2026-11-05", "2026-11-05", "Buyer, Zillow", "", "", ""),
    ("Sylvester Hufflepod", "AP", "Open House", "2026-10-21", "Appointment Set", "2026-11-06", "", "Seller", "", "", ""),
    ("Theodosia Crankwhistle", "FG", "Website", "2026-07-28", "Nurture", "2026-10-05", "2026-10-30", "Hot, Buyer", "", "", ""),
    ("Umberto Pinchbeck", "RT", "Zillow", "2026-10-08", "Attempted Contact", "2026-11-02", "", "Buyer, Zillow", "", "", ""),
    ("Valentina Sprigsworth", "MQ", "Realtor.com", "2026-08-21", "Pending", "2026-11-05", "", "Buyer", "Under Contract", "2026-12-08", "318000"),
    ("Winston Dabbleford", "AP", "", "2026-09-25", "Lead", "", "", "Buyer", "", "", ""),
    ("Xavier Gobblesworth", "FG", "Zillow", "2026-08-03", "Attempted Contact", "2026-10-11", "", "Buyer, Zillow", "", "", ""),
    ("Yolanda Twinklebury", "RT", "Website", "2026-10-10", "Met with Customer", "2026-11-04", "", "Seller", "", "", ""),
    ("Zara Puddlecrumb", "MQ", "Open House", "2026-10-26", "Lead", "2026-10-27", "2026-10-26", "Buyer", "", "", ""),
]
C2_NOTES = {
    "Mortimer Quibbleton": ("", "Relocating with his two kids, asked about the schools. Preapproved 400k, credit 720."),
    "Nettie Crumblewood": ("Signed in at 22 Fudge Ripple Ct.", "Cell 385-555-0142, prefers email."),
    "Quincy Marbleton": ("Want to see homes near Toffee Park.", ""),
}


def case2_rows():
    out = []
    for k, (name, ag, src, added, stage, comm, act, tags, ds, dc, dp) in enumerate(C2):
        email, phone = contact(name, k + 3)
        msg, notes = C2_NOTES.get(name, ("", ""))
        comm_cell = comm if "/" in comm else (stamp(date.fromisoformat(comm), 10 + k % 7, (k * 11) % 60) if comm else "")
        out.append([stamp(date.fromisoformat(added), 9 + k % 8, (k * 7) % 60), name, name.split()[0], name.split()[-1], stage, src,
                    B[ag], added, "Yes" if comm else "No", tags, email, "home", phone, "mobile", "", msg, notes, ds,
                    stamp(date.fromisoformat(dc), 0, 0) if dc else "", dp, comm_cell,
                    stamp(date.fromisoformat(act), 8 + k % 9, (k * 5) % 60) if act else ""])
    return out


def main():
    now = people_rows(AS_OF, P)
    last = people_rows(LAST, P, GONE)
    deals = deal_rows()
    for folder in (PRACTICE, CASE1):
        write_csv(folder / "PRACTICE FUB People Export 2026-11-10.csv", PEOPLE_HEAD, now)
        write_csv(folder / "PRACTICE FUB People Export 2026-11-03 Last Week.csv", PEOPLE_HEAD, last)
        write_csv(folder / "PRACTICE FUB Deals Report 2026-11-10.csv", DEAL_HEAD, deals)
    write_csv(CASE2 / "kettlecorn-fub-people-export-2026-11-10.csv", PEOPLE_HEAD, case2_rows())
    print(f"practice: {len(now)} people now, {len(last)} last week, {len(deals)} deals; case 2: {len(C2)} people")


if __name__ == "__main__":
    main()
