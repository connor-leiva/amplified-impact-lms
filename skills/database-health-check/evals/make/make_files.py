"""Build the made-up CRM exports for practice/ and evals/files/.

Everything here is invented: contact names pair ordinary first names with storybook surnames,
emails end in .test, phone numbers use the 555-01xx fiction range, and the agents, team, pond and
brokerage are made up. The files follow the column layout Follow Up Boss's help center lists for an
"Export All Columns" People export (checked 2026-11-08), plus the Last Communication and Last
Activity view columns, and a custom field where a team records text consent.

Usage: python3 -I evals/make/make_files.py   (rewrites practice/*.csv, evals/files/*, evals/make/planted/*.json)
"""
import csv
import json
import random
import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
AS_OF = date(2026, 11, 8)
PRACTICE_MARK = "PRACTICE FILE: made-up example"
TEST_MARK = "TEST FILE: made-up example"

FIRST = ["Ava", "Ben", "Cora", "Dev", "Elle", "Finn", "Gwen", "Hank", "Iris", "Jade", "Kip", "Lena", "Milo", "Nora", "Otto",
         "Pia", "Quin", "Rosa", "Sam", "Tess", "Uma", "Vic", "Wren", "Xavi", "Yara", "Zeke", "Arlo", "Bea", "Cal", "Dot",
         "Ezra", "Fay", "Gus", "Hattie", "Ike", "Juno", "Kit", "Lou", "Mae", "Ned", "Opal", "Pip", "Rhea", "Sid", "Tova",
         "Ugo", "Vera", "Walt", "Yuki", "Zora", "Abe", "Bo", "Cleo", "Dina", "Edie", "Flo", "Gil", "Hugo", "Ivy", "Jules",
         "Kenji", "Lars", "Mira", "Nico", "Ola", "Pax", "Remy", "Suki", "Theo", "Ursa", "Vik", "Wes", "Yosef", "Zuri",
         "Amos", "Bianca", "Cyrus", "Delia", "Emil", "Freya"]
VARIANT = {"Jon": "John", "Kate": "Katie", "Ann": "Anne", "Eric": "Erik", "Sara": "Sarah", "Alan": "Allan",
           "Lena": "Lina", "Milo": "Mylo", "Nora": "Norah", "Theo": "Teo", "Remy": "Remi", "Cleo": "Clio"}
FIRST += [k for k in VARIANT if k not in FIRST]
PREFIX = ["Apple", "Bumble", "Cobble", "Dandy", "Elder", "Feather", "Gum", "Holly", "Ink", "June", "Kettle", "Lemon",
          "Moon", "Nut", "Pudding", "Quibble", "Rumble", "Snicker", "Thistle", "Umbrella", "Velvet", "Wobble", "Yarn",
          "Zipper", "Acorn", "Biscuit", "Cinder", "Doodle", "Fiddle", "Giggle", "Honey", "Jelly", "Kazoo", "Lolly",
          "Marmalade", "Noodle", "Pancake", "Quack", "Sprinkle", "Tumble", "Waffle", "Bramble", "Crumpet", "Dewdrop",
          "Fizzle", "Gooseberry", "Hobnob", "Jamboree", "Kerfuffle", "Lantern", "Muffin", "Pebble", "Quill", "Rhubarb",
          "Teacup", "Wiggle", "Button", "Toffee", "Pickle", "Custard"]
SUFFIX = ["whistle", "bottom", "puff", "snout", "hopper", "toes", "pocket", "sprout", "wiggle", "bean", "doodle", "nook",
          "sock", "button", "tumble", "waddle", "pickle", "crumb", "fluff", "bloom", "noggin", "kettle", "sprocket", "dumple",
          "giggle"]
LAST = [p + x for p in PREFIX for x in SUFFIX if p.lower() != x]
CITIES = [("Puddleford", "AZ", "85001"), ("Thistle Falls", "AZ", "85002"), ("Lanternbrook", "AZ", "85003"),
          ("Gumdrop Hollow", "AZ", "85004"), ("Fernwhistle", "AZ", "85005"), ("Marmalade Springs", "AZ", "85006")]
STREETS = ["Marmalade Ln", "Teacup Way", "Biscuit Ct", "Lantern Loop", "Pebble Path", "Dewdrop Dr", "Muffin Row",
           "Kazoo Ave", "Pinwheel St", "Crumpet Cir"]
AREA = ["201", "205", "206", "209", "210", "212", "213", "214", "215", "216", "217", "218", "219", "224", "225", "228",
        "229", "231", "234", "239", "240", "248", "251", "252", "253", "254", "256", "260", "262", "267", "269", "270",
        "276", "281", "301", "302", "303", "304", "305", "307", "308", "309", "310", "312", "313", "314", "315", "316",
        "317", "318", "319", "320", "321", "323", "325", "330", "331", "334", "336", "337", "339", "347", "351", "352",
        "360", "361", "385", "386", "401", "402", "404", "405", "406", "407", "408", "409", "410", "412", "413", "414",
        "415", "417", "419", "423", "424", "425", "430", "432", "434", "435", "440", "442", "443", "458", "469", "470",
        "475", "478", "479", "480", "484", "501", "502", "503", "504", "505", "507", "508", "509", "510", "512", "513"]
DOMAINS = ["mailbox.test", "inbox.test", "postbox.test", "letterbox.test", "pigeonpost.test"]


class Phones:
    def __init__(self, rnd):
        self.pool = [f"{a}55501{n:02d}" for a in AREA for n in range(100)]
        rnd.shuffle(self.pool)
        self.i = 0

    def next(self):
        self.i += 1
        return self.pool[self.i - 1]


def fmt_phone(d, style):
    if style == "paren":
        return f"({d[:3]}) {d[3:6]}-{d[6:]}"
    if style == "dot":
        return f"{d[:3]}.{d[3:6]}.{d[6:]}"
    if style == "plus":
        return f"+1 {d[:3]} {d[3:6]} {d[6:]}"
    return f"{d[:3]}-{d[3:6]}-{d[6:]}"


def rdate(rnd, start, end):
    span = (end - start).days
    return start + timedelta(days=rnd.randint(0, max(span, 0)))


def wpick(rnd, table):
    items, weights = zip(*table)
    return rnd.choices(items, weights=weights, k=1)[0]


# ------------------------------------------------------------------ Follow Up Boss style export

FUB_STAGES = [("Lead", 15), ("Attempted Contact", 9), ("Spoke with Customer", 5), ("Appointment Set", 2),
              ("Met with Customer", 2), ("Showing Homes", 2), ("Listing Agreement", 1), ("Active Listing", 1),
              ("Submitting Offers", 1), ("Under Contract", 2), ("Nurture", 24), ("Closed", 5), ("Past Client", 4),
              ("Sphere", 9), ("Rejected", 3), ("Trash", 6), ("Vendor", 1)]
ACTIVE = {"Lead", "Attempted Contact", "Spoke with Customer", "Appointment Set", "Met with Customer", "Showing Homes",
          "Listing Agreement", "Active Listing", "Submitting Offers", "Under Contract"}
SOURCES = [("Zillow", 18), ("Realtor.com", 9), ("Website", 14), ("Facebook", 8), ("Open House", 7), ("Referral", 8),
           ("Sphere", 9), ("Import", 10), ("Sign Call", 3), ("Homes.com", 4), ("Past Client", 4), ("", 3), ("Google PPC", 3)]
FUB_HEADERS = ["Date Added", "Name", "First Name", "Last Name", "Stage", "Lead Source", "Assigned To", "Last Assigned",
               "Is Contacted", "Listing Price", "Tags", "Email 1", "Email 1 - Type", "Email 2", "Email 2 - Type", "Timeframe",
               "Phone 1", "Phone 1 - Type", "Phone 2", "Phone 2 - Type", "Address 1 - Street", "Address 1 - City",
               "Address 1 - State", "Address 1 - Zip", "Address 1 - Country", "Address 1 - Type", "Property Address",
               "Property City", "Property State", "Property Post Code", "Property MLS #", "Property Price", "Property Beds",
               "Property Baths", "Property Area", "Property Lot", "Message", "Description", "Notes", "Calls", "Texts",
               "Background", "Deal Stage", "Deal Close Date", "Deal Price", "Campaign Source", "Campaign Medium",
               "Campaign Term", "Campaign Content", "Campaign Name"]


def make_fub(n, seed, agents, pond, consent=True, activity=True, birthday=False, mark=PRACTICE_MARK, scale=1.0,
             transactions=False):
    rnd = random.Random(seed)
    phones = Phones(rnd)
    planted = {"records": n}
    recs = []
    base_n = n
    k_merge = int(130 * scale)
    k_triple = int(6 * scale)
    k_household = int(25 * scale)
    k_shared = 8 if scale >= 0.5 else 7
    base_n -= k_merge + k_triple * 2 + k_household + k_shared
    used_names = set()
    for i in range(base_n):
        first, last = rnd.choice(FIRST), rnd.choice(LAST)
        stage = wpick(rnd, FUB_STAGES)
        created = rdate(rnd, date(2019, 2, 1), date(2026, 10, 31))
        if rnd.random() < 0.35:
            created = rdate(rnd, date(2025, 11, 1), date(2026, 10, 31))
        src = wpick(rnd, SOURCES)
        if stage == "Sphere":
            src = rnd.choice(["Sphere", "Referral", "Import", "Sphere"])
        if stage in ("Closed", "Past Client"):
            src = rnd.choice(["Referral", "Zillow", "Website", "Sphere", "Open House", "Past Client", "Import"])
        agent = wpick(rnd, agents)
        tags = []
        # last communication by stage
        r = rnd.random()
        if stage in ACTIVE:
            if stage == "Lead":
                lc = None if r < 0.45 else (rdate(rnd, created, AS_OF) if r < 0.75 else rdate(rnd, max(created, AS_OF - timedelta(days=60)), AS_OF))
            elif r < 0.30:
                lc = rdate(rnd, max(created, date(2023, 1, 1)), AS_OF - timedelta(days=91))
            else:
                lc = rdate(rnd, max(created, AS_OF - timedelta(days=80)), AS_OF)
        elif stage == "Nurture":
            lc = None if r < 0.12 else rdate(rnd, created, AS_OF)
        elif stage in ("Closed", "Past Client", "Sphere"):
            lc = None if r < 0.08 else (rdate(rnd, max(created, date(2021, 1, 1)), AS_OF - timedelta(days=366)) if r < 0.55 else rdate(rnd, max(created, AS_OF - timedelta(days=360)), AS_OF))
        else:
            lc = None if r < 0.3 else rdate(rnd, created, AS_OF)
        if lc and lc < created:
            lc = created
        la = None
        if activity and src in ("Zillow", "Realtor.com", "Website", "Homes.com", "Facebook", "Google PPC"):
            la = rdate(rnd, created, AS_OF)
            if rnd.random() < 0.08:
                la = rdate(rnd, AS_OF - timedelta(days=25), AS_OF)
        # emails
        e1 = f"{first.lower()}.{last.lower()}{rnd.randint(1, 999)}@{rnd.choice(DOMAINS)}"
        x = rnd.random()
        if x < 0.08:
            e1 = ""
        elif x < 0.095:
            e1 = rnd.choice([f"noemail@{rnd.choice(DOMAINS)}", f"{last.lower()}@", f"{first.lower()}..{last.lower()}@{rnd.choice(DOMAINS)}",
                             "none", f"{first.lower()}{last.lower()}{rnd.choice(DOMAINS)}"])
        e2 = f"{first.lower()}{rnd.randint(10, 99)}@{rnd.choice(DOMAINS)}" if e1 and rnd.random() < 0.12 else ""
        p1 = fmt_phone(phones.next(), rnd.choice(["paren", "dash", "paren", "dot"]))
        y = rnd.random()
        if y < 0.10:
            p1 = ""
        elif y < 0.12:
            p1 = rnd.choice(["555-0147", "(801) 555-01", "000-000-0000", "1234", f"555 01{rnd.randint(10, 99)}"])
        p2 = fmt_phone(phones.next(), "paren") if p1 and rnd.random() < 0.08 else ""
        if stage in ("Closed", "Past Client"):
            tags.append(rnd.choice(["Past Client", "Past Client", "past client", "Past Clients", "PastClient"]))
        if stage == "Sphere" and rnd.random() < 0.6:
            tags.append(rnd.choice(["Sphere", "Sphere", "SOI", "sphere"]))
        if stage == "Sphere" and rnd.random() < 0.3:
            tags.append("Holiday Card List")
        if src == "Open House" or rnd.random() < 0.04:
            tags.append(rnd.choice(["Open House", "Open House", "open house", "Openhouse", "Open-House"]))
        if rnd.random() < 0.25 and stage not in ("Sphere",):
            tags.append(rnd.choice(["Buyer", "Buyer", "buyer", "Buyers", "Seller", "Seller", "Sellers", "seller"]))
        if rnd.random() < 0.03:
            tags.append("Unsubscribed")
        if e1 and rnd.random() < 0.015:
            tags.append("Bounced Email")
        if rnd.random() < 0.02:
            tags.append(rnd.choice(["Do Not Call", "DNC"]))
        if src == "Import" and rnd.random() < 0.08:
            tags.append(rnd.choice(["Imported Stage: Warm", "Imported Stage: Hot", "Imported Agent: Former Agent"]))
        if src in ("Zillow", "Realtor.com", "Website") and rnd.random() < 0.3:
            tags.append(rnd.choice([CITIES[0][0], CITIES[1][0], CITIES[2][2], CITIES[3][2]]))
        if rnd.random() < 0.02:
            tags.append(rnd.choice(["Investor", "investor", "Investors"]))
        if rnd.random() < 0.01:
            tags.append(rnd.choice(["VIP", "vip", "Relo", "Relocation", "Relocating"]))
        assigned = agent
        if pond and stage in ("Lead", "Attempted Contact", "Nurture") and rnd.random() < 0.07:
            tags.append(pond[1])
            assigned = pond[0]
        if stage not in ("Trash", "Rejected") and rnd.random() < 0.015:
            assigned = ""
        cons = ""
        if consent and p1:
            c = rnd.random()
            if c < 0.30:
                cons = f"Yes - {rnd.choice(['website form', 'open house sign-in', 'signed buyer form'])} {rdate(rnd, created, AS_OF).isoformat()}"
            elif c < 0.33:
                cons = "No"
        deal_stage = deal_close = deal_price = ""
        if stage in ("Closed", "Past Client") and rnd.random() < 0.6:
            deal_stage, deal_close = "Closed", rdate(rnd, max(created, date(2019, 6, 1)), AS_OF - timedelta(days=30)).isoformat()
            deal_price = str(rnd.randrange(310000, 890000, 5000))
        if stage == "Under Contract":
            deal_stage, deal_close = "Under Contract", rdate(rnd, AS_OF + timedelta(days=5), AS_OF + timedelta(days=45)).isoformat()
            deal_price = str(rnd.randrange(310000, 890000, 5000))
        city = rnd.choice(CITIES)
        rec = {
            "Date Added": f"{created.isoformat()} {rnd.randint(7, 20):02d}:{rnd.randint(0, 59):02d}:00",
            "Name": f"{first} {last}", "First Name": first, "Last Name": last, "Stage": stage, "Lead Source": src,
            "Assigned To": assigned, "Last Assigned": (created + timedelta(days=rnd.randint(0, 3))).isoformat() if assigned else "",
            "Is Contacted": "Yes" if lc else "No", "Listing Price": "", "Tags": ", ".join(dict.fromkeys(tags)),
            "Email 1": e1, "Email 1 - Type": "home" if e1 else "", "Email 2": e2, "Email 2 - Type": "work" if e2 else "",
            "Timeframe": rnd.choice(["", "", "0-3 Months", "3-6 Months", "6-12 Months", "12+ Months", "No Plans"]) if stage in ACTIVE | {"Nurture"} else "",
            "Phone 1": p1, "Phone 1 - Type": rnd.choice(["mobile", "mobile", "home", ""]) if p1 else "", "Phone 2": p2,
            "Phone 2 - Type": "work" if p2 else "",
            "Address 1 - Street": f"{rnd.randint(100, 9899)} {rnd.choice(STREETS)}" if rnd.random() < 0.4 else "",
            "Address 1 - City": city[0], "Address 1 - State": city[1], "Address 1 - Zip": city[2], "Address 1 - Country": "US",
            "Address 1 - Type": "home",
            "Property Address": f"{rnd.randint(100, 9899)} {rnd.choice(STREETS)}" if src in ("Zillow", "Realtor.com", "Homes.com") else "",
            "Property City": city[0] if src in ("Zillow", "Realtor.com", "Homes.com") else "",
            "Property State": city[1] if src in ("Zillow", "Realtor.com", "Homes.com") else "",
            "Property Post Code": city[2] if src in ("Zillow", "Realtor.com", "Homes.com") else "",
            "Property MLS #": "", "Property Price": "", "Property Beds": "", "Property Baths": "", "Property Area": "", "Property Lot": "",
            "Message": "Is this home still available?" if src in ("Zillow", "Realtor.com") else "",
            "Description": "", "Notes": f"{lc.isoformat()} Checked in about timing." if lc and rnd.random() < 0.5 else "",
            "Calls": f"{lc.isoformat()} Outgoing call, 2 min" if lc and rnd.random() < 0.5 else "",
            "Texts": f"{lc.isoformat()} Outgoing text" if lc and rnd.random() < 0.3 else "",
            "Background": "", "Deal Stage": deal_stage, "Deal Close Date": deal_close, "Deal Price": deal_price,
            "Campaign Source": "", "Campaign Medium": "", "Campaign Term": "", "Campaign Content": "", "Campaign Name": "",
            "Last Communication": f"{lc.isoformat()} {rnd.randint(8, 19):02d}:{rnd.randint(0, 59):02d}:00" if lc else "",
            "Last Activity": f"{la.isoformat()} {rnd.randint(0, 23):02d}:{rnd.randint(0, 59):02d}:00" if la else "",
        }
        if consent:
            rec["Text Consent"] = cons
        if birthday:
            rec["Birthday"] = rdate(rnd, date(1950, 1, 1), date(2000, 12, 31)).strftime("%m/%d/%Y") if rnd.random() < 0.2 else ""
        recs.append(rec)

    # closed deals left in active stages (the export's own deal columns)
    k_closed_active = max(3, int(22 * scale))
    act = [r for r in recs if r["Stage"] in ("Under Contract", "Active Listing", "Submitting Offers", "Showing Homes")]
    rnd.shuffle(act)
    for r in act[:k_closed_active]:
        r["Deal Stage"] = "Closed"
        r["Deal Close Date"] = rdate(rnd, AS_OF - timedelta(days=300), AS_OF - timedelta(days=20)).isoformat()
        r["Deal Price"] = str(rnd.randrange(310000, 890000, 5000))
    planted["closed_deal_in_active_stage_from_deal_columns"] = min(k_closed_active, len(act))

    live = [r for r in recs if r["Stage"] not in ("Trash", "Rejected")]
    # merge duplicates: same email or same phone, same or near-identical name
    dups = []
    picks = rnd.sample(live, k_merge + k_triple)
    for j, base in enumerate(picks):
        copies = 2 if j >= k_merge else 1
        for c in range(copies):
            d = dict(base)
            mode = rnd.choice(["email", "email", "phone", "phone_variant", "email_case"])
            if mode in ("phone", "phone_variant") and not base["Phone 1"] or (mode.startswith("email") and not base["Email 1"]):
                mode = "email" if base["Email 1"] else "phone"
            created = rdate(rnd, date(2020, 1, 1), AS_OF - timedelta(days=5))
            d["Date Added"] = f"{created.isoformat()} 09:15:00"
            d["Lead Source"] = wpick(rnd, SOURCES)
            d["Assigned To"] = wpick(rnd, agents) if rnd.random() < 0.5 else base["Assigned To"]
            d["Stage"] = rnd.choice(["Lead", "Nurture", "Attempted Contact", base["Stage"]])
            d["Last Communication"] = "" if rnd.random() < 0.6 else base["Last Communication"]
            d["Is Contacted"] = "Yes" if d["Last Communication"] else "No"
            d["Tags"] = ""
            d["Deal Stage"] = d["Deal Close Date"] = d["Deal Price"] = ""
            if mode == "email":
                d["Phone 1"] = "" if rnd.random() < 0.5 else fmt_phone(phones.next(), "dash")
            elif mode == "email_case":
                d["Email 1"] = base["Email 1"].upper()
                d["Phone 1"] = ""
            elif mode == "phone":
                d["Email 1"] = "" if rnd.random() < 0.5 else f"{base['First Name'].lower()}{rnd.randint(100, 999)}@{rnd.choice(DOMAINS)}"
                d["Phone 1"] = fmt_phone(''.join(ch for ch in base["Phone 1"] if ch.isdigit())[-10:], "dot") if any(ch.isdigit() for ch in base["Phone 1"]) else base["Phone 1"]
            else:
                fn = base["First Name"]
                d["First Name"] = VARIANT.get(fn) or {v: k for k, v in VARIANT.items()}.get(fn) or fn
                d["Email 1"] = ""
            d["Email 2"] = ""
            d["Name"] = f"{d['First Name']} {d['Last Name']}"
            if consent:
                d["Text Consent"] = ""
            dups.append(d)
    planted["merge_groups"] = k_merge + k_triple
    planted["merge_extra_records"] = k_merge + 2 * k_triple
    # shared contact info: same phone, same last name, different first name
    hh = rnd.sample([r for r in live if r["Phone 1"] and any(ch.isdigit() for ch in r["Phone 1"]) and r not in picks], k_household)
    for base in hh:
        d = dict(base)
        other = rnd.choice([f for f in FIRST if f != base["First Name"] and f not in VARIANT and f not in VARIANT.values()])
        d["First Name"], d["Name"] = other, f"{other} {base['Last Name']}"
        d["Email 1"] = f"{other.lower()}.{base['Last Name'].lower()}{rnd.randint(1, 99)}@{rnd.choice(DOMAINS)}"
        d["Email 2"] = ""
        d["Tags"] = ""
        d["Deal Stage"] = d["Deal Close Date"] = d["Deal Price"] = ""
        if consent:
            d["Text Consent"] = ""
        dups.append(d)
    planted["shared_same_last_groups"] = k_household
    # one phone number shared by many records (a lender's office line typed into contacts)
    office = phones.next()
    for s in range(k_shared):
        first, last = rnd.choice(FIRST), rnd.choice(LAST)
        created = rdate(rnd, date(2022, 1, 1), AS_OF - timedelta(days=40))
        d = dict(recs[0])
        d.update({"Date Added": f"{created.isoformat()} 10:00:00", "Name": f"{first} {last}", "First Name": first, "Last Name": last,
                  "Stage": rnd.choice(["Lead", "Nurture"]), "Lead Source": "Referral", "Assigned To": wpick(rnd, agents),
                  "Tags": "", "Email 1": f"{first.lower()}.{last.lower()}@{rnd.choice(DOMAINS)}", "Email 2": "",
                  "Phone 1": fmt_phone(office, "paren"), "Phone 2": "", "Last Communication": "", "Is Contacted": "No",
                  "Deal Stage": "", "Deal Close Date": "", "Deal Price": "", "Last Activity": ""})
        if consent:
            d["Text Consent"] = ""
        dups.append(d)
    planted["shared_phone_records"] = k_shared
    recs += dups
    rnd.shuffle(recs)
    assert len(recs) == n, (len(recs), n)
    headers = FUB_HEADERS + ["Last Communication", "Last Activity"] + (["Text Consent"] if consent else []) + (["Birthday"] if birthday else [])
    if not activity:
        headers.remove("Last Activity")
    planted["stage_counts"] = {}
    for r in recs:
        planted["stage_counts"][r["Stage"]] = planted["stage_counts"].get(r["Stage"], 0) + 1
    tx = None
    if transactions:
        tx = make_transactions(rnd, recs, agents)
        planted["transactions"] = tx[1]
        tx = tx[0]
    return headers, recs, planted, tx


def make_transactions(rnd, recs, agents):
    rows = []
    stats = {"past_matched": 0, "nurture_or_lead_matched": 0, "recent_in_active": 0, "not_in_crm": 0, "name_only": 0, "excluded_status": 0}
    tid = 4100

    def add(name, email, phone, close, status, agent):
        nonlocal tid
        tid += 1
        rows.append({"Transaction ID": f"TX-{tid}", "Client Name": name, "Client Email": email, "Client Phone": phone,
                     "Side": rnd.choice(["Buyer", "Seller"]), "Property Address": f"{rnd.randint(100, 9899)} {rnd.choice(STREETS)}, {rnd.choice(CITIES)[0]}",
                     "Close Date": close.strftime("%m/%d/%Y") if close else "", "Status": status, "Agent": agent})

    past = [r for r in recs if r["Stage"] in ("Closed", "Past Client") and (r["Email 1"] or r["Phone 1"])]
    for r in rnd.sample(past, min(120, len(past))):
        close = date.fromisoformat(r["Deal Close Date"]) if r["Deal Close Date"] else rdate(rnd, date(2019, 6, 1), AS_OF - timedelta(days=60))
        add(r["Name"], r["Email 1"] if "@" in r["Email 1"] else "", r["Phone 1"], close, "Closed", r["Assigned To"])
        stats["past_matched"] += 1
    mid = [r for r in recs if r["Stage"] in ("Nurture", "Lead") and "@" in r["Email 1"] and r["Email 1"].count("@") == 1 and ".test" in r["Email 1"]]
    for r in rnd.sample(mid, 18):
        add(r["Name"], r["Email 1"], "", rdate(rnd, date(2020, 1, 1), AS_OF - timedelta(days=400)), "Closed", r["Assigned To"])
        stats["nurture_or_lead_matched"] += 1
    act = [r for r in recs if r["Stage"] in ("Attempted Contact", "Spoke with Customer", "Met with Customer", "Showing Homes", "Submitting Offers")
           and r["Deal Stage"] != "Closed" and "@" in r["Email 1"] and ".test" in r["Email 1"]]
    for r in rnd.sample(act, 9):
        add(r["Name"], r["Email 1"], r["Phone 1"], rdate(rnd, AS_OF - timedelta(days=200), AS_OF - timedelta(days=15)), "Closed", r["Assigned To"])
        stats["recent_in_active"] += 1
    for k in range(14):
        first, last = rnd.choice(FIRST), rnd.choice(LAST) + "kins"
        add(f"{first} {last}", f"{first.lower()}.{last.lower()}@{rnd.choice(DOMAINS)}", "", rdate(rnd, date(2021, 1, 1), AS_OF - timedelta(days=30)), "Closed", wpick(rnd, agents))
        stats["not_in_crm"] += 1
    others = [r for r in recs if r["Stage"] in ("Nurture", "Sphere") and r["Last Name"] and r["First Name"]]
    for r in rnd.sample(others, 6):
        add(r["Name"], f"{r['First Name'].lower()}.alt{rnd.randint(1, 9)}@{rnd.choice(DOMAINS)}", "", rdate(rnd, date(2020, 1, 1), AS_OF - timedelta(days=500)), "Closed", r["Assigned To"])
        stats["name_only"] += 1
    for k in range(4):
        first, last = rnd.choice(FIRST), rnd.choice(LAST)
        add(f"{first} {last}", "", "", rdate(rnd, AS_OF + timedelta(days=5), AS_OF + timedelta(days=40)), "Pending", wpick(rnd, agents))
        add(f"{first} {last}", "", "", None, "Cancelled", wpick(rnd, agents))
        stats["excluded_status"] += 2
    rnd.shuffle(rows)
    return rows, stats


def write_csv(path, headers, rows, mark):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        if mark:
            f.write(mark + "\n")
        w = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)


# ------------------------------------------------------------------ another CRM (different column names)

def make_other(n, seed):
    rnd = random.Random(seed)
    phones = Phones(rnd)
    agents = [("Pell Mossgrove", 22), ("Sunny Larkfield", 20), ("Booker Quillfeather", 18), ("Marigold Tumbletoes", 16),
              ("Fennick Oddsworth", 14), ("", 4)]
    statuses = [("New", 14), ("Warm", 9), ("Hot", 3), ("Appointment Booked", 2), ("Active Buyer", 4), ("Active Seller", 2),
                ("In Escrow", 2), ("Long-Term Nurture", 22), ("Past Client", 8), ("SOI", 12), ("Closed Lost", 5),
                ("Do Not Contact", 2), ("Investor", 3), ("", 6)]
    sources = [("Zillow", 15), ("Website", 18), ("Open House", 9), ("Referral", 12), ("SOI", 10), ("Facebook Ads", 10),
               ("Sign Call", 4), ("Import", 12), ("", 6), ("Realtor.com", 4)]
    rows = []
    cid = 70000
    planted = {"records": n}
    k_dup = 40
    k_hh = 10
    for i in range(n - k_dup - k_hh):
        cid += 1
        first, last = rnd.choice(FIRST), rnd.choice(LAST)
        st = wpick(rnd, statuses)
        created = rdate(rnd, date(2020, 3, 1), date(2026, 10, 30))
        r = rnd.random()
        if st in ("New", "Warm", "Hot", "Appointment Booked", "Active Buyer", "Active Seller", "In Escrow", ""):
            lc = None if r < 0.3 else (rdate(rnd, created, AS_OF - timedelta(days=61)) if r < 0.6 else rdate(rnd, max(created, AS_OF - timedelta(days=55)), AS_OF))
        elif st in ("Past Client", "SOI"):
            lc = None if r < 0.1 else (rdate(rnd, max(created, date(2021, 1, 1)), AS_OF - timedelta(days=370)) if r < 0.5 else rdate(rnd, max(created, AS_OF - timedelta(days=300)), AS_OF))
        else:
            lc = None if r < 0.2 else rdate(rnd, created, AS_OF)
        if lc and lc < created:
            lc = created
        src = wpick(rnd, sources)
        visit = rdate(rnd, created, AS_OF) if src in ("Zillow", "Website", "Facebook Ads", "Realtor.com") and rnd.random() < 0.7 else None
        if visit and rnd.random() < 0.1:
            visit = rdate(rnd, AS_OF - timedelta(days=20), AS_OF)
        e1 = f"{first.lower()}{last.lower()}{rnd.randint(1, 99)}@{rnd.choice(DOMAINS)}" if rnd.random() > 0.07 else ""
        if e1 and rnd.random() < 0.02:
            e1 = rnd.choice(["n/a", f"{first.lower()}@@{rnd.choice(DOMAINS)}", f"noemail@{rnd.choice(DOMAINS)}"])
        e2 = f"{first.lower()}.{last.lower()}@{rnd.choice(DOMAINS)}" if rnd.random() < 0.1 else ""
        m = fmt_phone(phones.next(), rnd.choice(["dot", "plus", "dash", "paren"])) if rnd.random() > 0.12 else ""
        if m and rnd.random() < 0.02:
            m = rnd.choice(["555.0148", "N/A", "(000) 000-0000"])
        hp = fmt_phone(phones.next(), "dash") if rnd.random() < 0.06 else ""
        labels = []
        if st == "Past Client" or (st == "Long-Term Nurture" and rnd.random() < 0.04):
            labels.append(rnd.choice(["Closed Client", "Closed Client", "closed client", "Closed Clients"]))
        if st == "SOI" and rnd.random() < 0.5:
            labels.append(rnd.choice(["SOI", "Sphere"]))
        if rnd.random() < 0.2:
            labels.append(rnd.choice(["First-Time Buyer", "First Time Buyer", "first time buyer", "Move-Up Seller", "Move Up Seller"]))
        if rnd.random() < 0.05:
            labels.append(rnd.choice(["Shared Pool", "Shared Pool"]))
        sms = ""
        if m and rnd.random() < 0.35:
            sms = "Y " + rdate(rnd, created, AS_OF).strftime("%m/%d/%Y")
        elif m and rnd.random() < 0.04:
            sms = "N"
        rows.append({"Contact ID": f"BC-{cid}", "Full Name": f"{first} {last}", "Primary Email": e1, "Secondary Email": e2,
                     "Mobile Phone": m, "Home Phone": hp, "Lead Status": st, "Lead Source": src, "Owner": wpick(rnd, agents),
                     "Created Date": created.strftime("%m/%d/%Y"), "Last Contacted": lc.strftime("%m/%d/%Y") if lc else "",
                     "Last Website Visit": visit.strftime("%m/%d/%Y") if visit else "", "Labels": "; ".join(dict.fromkeys(labels)),
                     "SMS Opt-In": sms, "Email Opt-Out": "Yes" if rnd.random() < 0.03 else "", "Notes Count": str(rnd.randint(0, 14))})
    base = [r for r in rows if r["Primary Email"] and "@" in r["Primary Email"] and r["Lead Status"] not in ("Closed Lost", "Do Not Contact")]
    for b in rnd.sample(base, k_dup):
        cid += 1
        d = dict(b)
        d["Contact ID"] = f"BC-{cid}"
        d["Mobile Phone"] = "" if rnd.random() < 0.6 else fmt_phone(phones.next(), "dot")
        d["Owner"] = wpick(rnd, agents)
        d["Lead Status"] = rnd.choice(["New", "Long-Term Nurture", b["Lead Status"]])
        d["Last Contacted"] = ""
        d["Labels"] = ""
        d["SMS Opt-In"] = ""
        rows.append(d)
    hhb = [r for r in rows if r["Mobile Phone"] and r["Mobile Phone"][-1].isdigit() and r["Lead Status"] not in ("Closed Lost", "Do Not Contact")]
    for b in rnd.sample(hhb, k_hh):
        cid += 1
        d = dict(b)
        other = rnd.choice([f for f in FIRST if f != b["Full Name"].split()[0] and f not in VARIANT and f not in VARIANT.values()])
        d["Contact ID"] = f"BC-{cid}"
        d["Full Name"] = f"{other} {b['Full Name'].split()[1]}"
        d["Primary Email"] = f"{other.lower()}{rnd.randint(1, 99)}@{rnd.choice(DOMAINS)}"
        d["Secondary Email"] = ""
        d["SMS Opt-In"] = ""
        rows.append(d)
    rnd.shuffle(rows)
    planted["merge_groups_planted"] = k_dup
    planted["shared_same_last_groups"] = k_hh
    headers = ["Contact ID", "Full Name", "Primary Email", "Secondary Email", "Mobile Phone", "Home Phone", "Lead Status", "Lead Source",
               "Owner", "Created Date", "Last Contacted", "Last Website Visit", "Labels", "SMS Opt-In", "Email Opt-Out", "Notes Count"]
    planted["status_counts"] = {}
    for r in rows:
        planted["status_counts"][r["Lead Status"] or "(blank)"] = planted["status_counts"].get(r["Lead Status"] or "(blank)", 0) + 1
    return headers, rows, planted


RULES_HTML = """<!doctype html><html><head><meta charset="utf-8"><style>
body{font-family:Georgia,serif;margin:48px;color:#222;font-size:13px;line-height:1.5}h1{font-size:20px}h2{font-size:15px;margin-top:22px}
.mark{font-family:Arial;font-weight:bold;color:#a00;border:2px solid #a00;padding:6px 10px;display:inline-block;margin-bottom:14px}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top}
</style></head><body>
<div class="mark">TEST FILE: made-up example</div>
<h1>Brightwater Collective: CRM Rules For Agents And Ops</h1>
<p>Owner: Ops Lead (Fennick Oddsworth). Last updated 09/15/2026. Brightwater Collective is a made-up team at Make-Believe Realty.</p>
<h2>1. Lead Status Definitions</h2>
<table><tr><th>Status</th><th>Means</th></tr>
<tr><td>New</td><td>Came in, nobody has talked to them yet.</td></tr>
<tr><td>Warm</td><td>We've had a real conversation and they plan to move within 12 months.</td></tr>
<tr><td>Hot</td><td>Plans to move within 90 days.</td></tr>
<tr><td>Appointment Booked</td><td>A buyer consult or listing appointment is on the calendar.</td></tr>
<tr><td>Active Buyer / Active Seller</td><td>Signed agreement; we are showing or listed.</td></tr>
<tr><td>In Escrow</td><td>Under contract.</td></tr>
<tr><td>Long-Term Nurture</td><td>More than 12 months out, or went quiet.</td></tr>
<tr><td>Past Client</td><td>We closed a deal with them. Also tag them Closed Client.</td></tr>
<tr><td>SOI</td><td>Friends, family and people we know personally.</td></tr>
<tr><td>Closed Lost / Do Not Contact</td><td>Stop working. Do not market to Do Not Contact.</td></tr></table>
<h2>2. Follow-Up Standard</h2>
<p>Every lead in New, Warm, Hot, Appointment Booked, Active Buyer, Active Seller or In Escrow gets a real touch (call, text or personal email) at least every 60 days. Anything longer counts as stale on our team.</p>
<h2>3. The Shared Pool</h2>
<p>If a New or Warm lead has had no contact for 45 days, ops moves it to the Shared Pool (label: Shared Pool) and any agent may claim it.</p>
<h2>4. Past Clients And SOI</h2>
<p>Past clients and SOI get a personal touch at least once a year. A past client is anyone in Past Client status or with the Closed Client label.</p>
<h2>5. Texting</h2>
<p>We only text people who opted in. Ops records it in the SMS Opt-In field as Y plus the date, or N if they declined.</p>
</body></html>"""


def make_pdf(html, out):
    tmp = out.with_suffix(".html")
    tmp.write_text(html, encoding="utf-8")
    js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
          f"await p.goto('file://{tmp}');await p.pdf({{path:'{out}',format:'Letter',margin:{{top:'0.5in',bottom:'0.5in',left:'0.5in',right:'0.5in'}}}});await b.close();}})();")
    subprocess.run(["node", "-e", js], check=True)
    tmp.unlink()


def main():
    files = SKILL / "evals" / "files"
    planted_dir = SKILL / "evals" / "make" / "planted"
    planted_dir.mkdir(parents=True, exist_ok=True)
    agents8 = [("Juniper Quickfoot", 16), ("Barnaby Larkspur", 15), ("Odessa Fernwhistle", 14), ("Rufus Tumbleweed", 12),
               ("Marisol Pinecone", 11), ("Calloway Brightwater", 10), ("Hazel Thimbleberry", 9), ("Desmond Puddlejump", 8)]
    pond = ("Desmond Puddlejump", "Pond: Lantern Lake")

    # practice: about 500 rows
    h, rows, planted, _ = make_fub(500, 11, agents8[:5], ("Rufus Tumbleweed", "Pond: Lantern Lake"), consent=True, activity=True,
                                   scale=0.1)
    write_csv(SKILL / "practice" / "PRACTICE-followupboss-people-export.csv", h, rows, PRACTICE_MARK)
    (planted_dir / "practice.json").write_text(json.dumps(planted, indent=1))

    # case 1: 5,000-row Follow Up Boss export plus a closed-transactions file
    h, rows, planted, tx = make_fub(5000, 101, agents8, pond, consent=True, activity=True, birthday=True, scale=1.0, transactions=True)
    write_csv(files / "fub-people-export-5000.csv", h, rows, TEST_MARK)
    write_csv(files / "closed-transactions-2019-2026.csv", list(tx[0].keys()), tx, TEST_MARK)
    (planted_dir / "case1.json").write_text(json.dumps(planted, indent=1))

    # case 2: another CRM's export with different column names, plus the team's rules document
    h, rows, planted = make_other(1200, 202)
    with open(files / "brightwater-crm-contacts.csv", "w", newline="", encoding="utf-8") as f:
        f.write(TEST_MARK + "\n")
        f.write("Brightwater Collective contact export, generated 11/08/2026\n")
        w = csv.DictWriter(f, fieldnames=h)
        w.writeheader()
        w.writerows(rows)
    make_pdf(RULES_HTML, files / "brightwater-crm-rules.pdf")
    (planted_dir / "case2.json").write_text(json.dumps(planted, indent=1))

    # case 3: Follow Up Boss export with no consent field and no lead-activity column
    agents4 = [("Ivo Saltmarsh", 30), ("Clementine Rook", 28), ("Pascal Wickerby", 24), ("Delphine Ashgrove", 18)]
    h, rows, planted, _ = make_fub(800, 303, agents4, None, consent=False, activity=False, scale=0.16)
    write_csv(files / "fub-people-export-no-consent.csv", h, rows, TEST_MARK)
    (planted_dir / "case3.json").write_text(json.dumps(planted, indent=1))
    print("done")


if __name__ == "__main__":
    main()
