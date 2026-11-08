"""Build the made-up recruit lists, production pages and team documents for practice/ and evals/files/.

Everything here is invented. Agent names pair ordinary first names with storybook surnames, every
brokerage and MLS name contains "Example," emails end in .test and phone numbers use the 555-01xx
fiction range. File layouts follow what real exports look like (checked 2026-11-08):
- an MLS agent production report: report header lines, then one row per agent per office, with
  listing ("List") and buyer ("Sell") sides and volume, totals, and the prior 12 months
- a team's own tracker spreadsheet (a Google Sheets download), typed by hand
- a GoHighLevel opportunities export: standard opportunity fields (name, pipeline, stage, status,
  value, source, assigned, tags, IDs) plus custom fields a team would add; exact export headers
  were not confirmed, so the skill maps columns by meaning
- an MLS agent production detail page (PDF) with a closed-transaction list
- a team value proposition one-pager (PDF)

Usage: python3 -I evals/make/make_files.py
Rewrites practice/*, evals/files/case*/* and evals/make/planted/*.json. Needs openpyxl and Node
with Playwright (PATH=/opt/node24/bin:$PATH).
"""
import csv
import json
import random
import subprocess
from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font

SKILL = Path(__file__).resolve().parents[2]
MAKE = SKILL / "evals" / "make"
FILES = SKILL / "evals" / "files"
PRACTICE = SKILL / "practice"
PLANTED = MAKE / "planted"
PRACTICE_MARK = "PRACTICE FILE: made-up example"
TEST_MARK = "TEST FILE: made-up example"

FIRST = ["Ava", "Ben", "Cora", "Dev", "Elle", "Finn", "Gwen", "Hank", "Iris", "Jade", "Kip", "Lena", "Milo", "Nora",
         "Otto", "Pia", "Quin", "Rosa", "Sam", "Tess", "Uma", "Vic", "Wren", "Yara", "Zeke", "Arlo", "Bea", "Cal",
         "Dot", "Ezra", "Fay", "Gus", "Hattie", "Ike", "Juno", "Kit", "Lou", "Mae", "Ned", "Opal", "Pip", "Rhea",
         "Sid", "Tova", "Vera", "Walt", "Yuki", "Zora", "Abe", "Bo", "Cleo", "Dina", "Edie", "Flo", "Gil", "Hugo",
         "Ivy", "Jules", "Kenji", "Lars", "Mira", "Nico", "Ola", "Pax", "Remy", "Suki", "Theo", "Wes", "Zuri",
         "Amos", "Bianca", "Cyrus", "Delia", "Emil", "Freya", "Greer", "Hollis", "Imani", "Joss", "Kaia", "Leon",
         "Marta", "Nell", "Orrin", "Petra", "Rafe", "Selma", "Tobin", "Una", "Viggo", "Willa"]
PREFIX = ["Quill", "Thimble", "Kettle", "Bramble", "Pudding", "Marble", "Teacup", "Pepper", "Clover", "Dapple",
          "Nettle", "Juniper", "Pickle", "Sorrel", "Tansy", "Waffle", "Cobble", "Fiddle", "Gumdrop", "Hobnob",
          "Crumpet", "Saffron", "Tumble", "Biscuit", "Lantern", "Mitten", "Noodle", "Parsnip", "Quibble", "Ripple"]
SUFFIX = ["bottom", "pocket", "whistle", "sprocket", "button", "puddle", "muffin", "wobble", "toes", "snout",
          "nook", "fluff", "bloom", "noggin", "sprout", "hopper", "crumb", "dumple"]
OFFICES = ["Riverbend Example Realty", "Summit Example Properties", "Lakeshore Example Homes",
           "Copperleaf Example Real Estate", "Bluegate Example Realty Group", "Northfield Example Brokers",
           "Oakhaven Example Realty", "Pinecrest Example Homes", "Silverline Example Realty",
           "Harborview Example Partners", "Maplewood Example Realty", "Foxglove Example Realty",
           "Granite Example Home Group", "Willowmere Example Properties"]
DOMAINS = ["mailbox.test", "inbox.test", "postbox.test", "letterbox.test"]


class People:
    """Unique made-up names, emails and 555-01xx phones."""

    def __init__(self, rnd, areas):
        self.rnd = rnd
        self.used = set()
        self.phones = [f"{a}55501{n:02d}" for a in areas for n in range(100)]
        rnd.shuffle(self.phones)

    def name(self):
        while True:
            first = self.rnd.choice(FIRST)
            last = self.rnd.choice(PREFIX) + self.rnd.choice(SUFFIX)
            if (first, last) not in self.used and not any(l == last for _, l in self.used):
                self.used.add((first, last))
                return first, last

    def phone(self):
        return self.phones.pop()

    def email(self, first, last):
        return f"{first.lower()}.{last.lower()}@{self.rnd.choice(DOMAINS)}"


def fmt_phone(digits, style):
    a, b, c = digits[:3], digits[3:6], digits[6:]
    return [f"({a}) {b}-{c}", f"{a}.{b}.{c}", f"{a}-{b}-{c}", digits][style % 4]


def money(n):
    return f"${n:,.0f}"


def production(rnd, units, avg):
    """Listing and buyer sides and volumes for `units` closed sides around an average price."""
    lean = rnd.choice([0.25, 0.4, 0.5, 0.6, 0.75])
    list_sides = sum(1 for _ in range(units) if rnd.random() < lean)
    buy_sides = units - list_sides
    prices = [max(150000, round(rnd.gauss(avg, avg * 0.22) / 500) * 500) for _ in range(units)]
    return list_sides, sum(prices[:list_sides]), buy_sides, sum(prices[list_sides:])


def draw_units(rnd):
    r = rnd.random()
    if r < 0.05:
        return 0
    if r < 0.45:
        return rnd.randint(1, 5)
    if r < 0.72:
        return rnd.randint(6, 12)
    if r < 0.90:
        return rnd.randint(13, 24)
    return rnd.randint(25, 58)


def make_agent(rnd, people, office, avg_lo, avg_hi, units=None, prior=None):
    first, last = people.name()
    units = draw_units(rnd) if units is None else units
    avg = rnd.randint(avg_lo // 1000, avg_hi // 1000) * 1000
    ls, lv, bs, bv = production(rnd, units, avg)
    if prior is None:
        prior = max(0, round(units * rnd.uniform(0.7, 1.3)) + rnd.choice([-1, 0, 0, 1]))
    _, plv, _, pbv = production(rnd, prior, avg)
    return {"first": first, "last": last, "office": office, "phone": people.phone(), "email": people.email(first, last),
            "units": units, "list_sides": ls, "list_vol": lv, "buy_sides": bs, "buy_vol": bv,
            "prior_units": prior, "prior_vol": plv + pbv}


def mls_row(a, mls_id, office_id, office=None, part=None):
    """One MLS report row. `part` overrides the production numbers for a split-office agent."""
    p = part or a
    return [mls_id, f"{a['last']}, {a['first']}", office_id, office or a["office"], fmt_phone(a["phone"], 0),
            a["email"], p["list_sides"], money(p["list_vol"]), p["buy_sides"], money(p["buy_vol"]),
            p["list_sides"] + p["buy_sides"], money(p["list_vol"] + p["buy_vol"]), p["prior_units"],
            money(p["prior_vol"])]


MLS_HEADER = ["Agent MLS ID", "Agent Name", "Office MLS ID", "Office Name", "Agent Phone", "Agent Email",
              "List Sides", "List Volume", "Sell Sides", "Sell Volume", "Total Sides", "Total Volume",
              "Prior 12 Mo Total Sides", "Prior 12 Mo Total Volume"]


def write_csv(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows(rows)


def write_sheet(ws, mark, rows, widths=None):
    ws.append([mark])
    ws["A1"].font = Font(bold=True, color="AA0000")
    for r in rows:
        ws.append(r)
    for i, w in enumerate(widths or []):
        ws.column_dimensions[chr(65 + i)].width = w


def html_pdf(html, pdf_path, mark):
    tmp = MAKE / "_tmp.html"
    tmp.write_text(html, encoding="utf-8")
    subprocess.run(["node", str(MAKE / "html_to_pdf.cjs"), str(tmp), str(pdf_path), mark], check=True)
    tmp.unlink()


def split_office(rnd, a, new_office):
    """An agent who moved offices mid-period: two report rows that add up to the agent's totals."""
    first_part = max(1, a["units"] // 3)
    old = {"list_sides": min(a["list_sides"], first_part)}
    old["buy_sides"] = first_part - old["list_sides"]
    frac_l = old["list_sides"] / a["list_sides"] if a["list_sides"] else 0
    frac_b = old["buy_sides"] / a["buy_sides"] if a["buy_sides"] else 0
    old["list_vol"] = round(a["list_vol"] * frac_l / 500) * 500
    old["buy_vol"] = round(a["buy_vol"] * frac_b / 500) * 500
    old["prior_units"], old["prior_vol"] = a["prior_units"], a["prior_vol"]
    new = {"list_sides": a["list_sides"] - old["list_sides"], "buy_sides": a["buy_sides"] - old["buy_sides"],
           "list_vol": a["list_vol"] - old["list_vol"], "buy_vol": a["buy_vol"] - old["buy_vol"],
           "prior_units": 0, "prior_vol": 0}
    return old, new


# --- Case 1: a messy 200-row mix of an MLS report and a tracker, with a roster ----------------------

def case1():
    rnd = random.Random(1101)
    people = People(rnd, ["614", "740", "937", "330", "419", "513", "216", "567"])
    out = FILES / "case1"
    team_office = "Lanternbrook Example Realty"
    planted = {"team": "Cardinal Example Team", "brokerage": team_office}

    # 147 unique agents in the MLS report, 3 of them on the user's own team.
    agents = []
    for i in range(147):
        office = team_office if i in (5, 40, 90) else rnd.choice(OFFICES)
        units = None
        if i == 5:
            units = 41   # the team leader is a top producer; must be excluded as on the team
        a = make_agent(rnd, people, office, 260000, 620000, units=units)
        a["mls_id"] = f"TCX{20410 + i * 7}"
        a["office_id"] = f"OFC{100 + OFFICES.index(office)}" if office in OFFICES else "OFC999"
        agents.append(a)
    # Trend plants: new production, a big rise and a big fall.
    agents[12].update(prior_units=0, prior_vol=0)
    agents[13]["prior_units"] = max(0, agents[13]["units"] - 9)
    agents[14]["prior_units"] = agents[14]["units"] + 12
    for k in (13, 14):
        agents[k]["prior_vol"] = round(agents[k]["prior_units"] * 410000 / 500) * 500
    # Make sure index 13 has real production for a rise.
    if agents[13]["units"] < 12:
        a = make_agent(rnd, people, agents[13]["office"], 300000, 500000, units=18, prior=7)
        a["mls_id"], a["office_id"] = agents[13]["mls_id"], agents[13]["office_id"]
        agents[13] = a

    # Pick who the tracker will match before writing the report, so two of them can carry a long first
    # name in the MLS and a short one in the tracker.
    candidates = [i for i in range(len(agents)) if i not in (5, 40, 90, 20, 21, 33, 12, 13, 14)]
    rnd.shuffle(candidates)
    match_idx, same_name_idx = candidates[:30], candidates[30:32]
    for j, long_name, short in ((28, "Theodora", "Theo"), (29, "Nicolas", "Nico")):
        agents[match_idx[j]]["first"] = long_name
        agents[match_idx[j]]["short"] = short
        agents[match_idx[j]]["email"] = f"{long_name.lower()}.{agents[match_idx[j]]['last'].lower()}@inbox.test"

    rows = [[TEST_MARK], ["Agent Production Report", "Tri-County Example MLS", "Closed 11/01/2025 to 10/31/2026",
                          "All residential property types", "Generated 11/03/2026"], MLS_HEADER]
    split_ids, repeated_id = [], None
    for i, a in enumerate(agents):
        if i in (20, 21) and a["units"] >= 3:
            new_office = rnd.choice([o for o in OFFICES if o != a["office"]])
            old, new = split_office(rnd, a, new_office)
            rows.append(mls_row(a, a["mls_id"], a["office_id"], a["office"], old))
            new_id = f"OFC{100 + OFFICES.index(new_office)}"
            rows.append(mls_row(a, a["mls_id"], new_id, new_office, new))
            split_ids.append({"mls_id": a["mls_id"], "name": f"{a['first']} {a['last']}", "from": a["office"],
                              "to": new_office, "units": a["units"]})
            a["office"], a["office_id"] = new_office, new_id
        else:
            rows.append(mls_row(a, a["mls_id"], a["office_id"]))
        if i == 33:
            rows.append(mls_row(a, a["mls_id"], a["office_id"]))   # pasted twice
            repeated_id = a["mls_id"]
    body = rows[3:]
    rnd.shuffle(body)
    rows = rows[:3] + body
    write_csv(out / "mls-agent-production-report.csv", rows)
    planted["mls_rows"] = len(body)
    planted["mls_unique_ids"] = len(agents)
    planted["split_office"] = split_ids
    planted["repeated_row_id"] = repeated_id

    # Roster: the leader, a recruiting director, an appointment setter, and five agents (two in the MLS file).
    roster = [["Name", "Role", "Email", "Phone", "MLS ID"]]
    leader = agents[5]
    roster.append([f"{leader['first']} {leader['last']}", "Team Leader", leader["email"], fmt_phone(leader["phone"], 2), leader["mls_id"]])
    rd_first, rd_last = people.name()
    roster.append([f"{rd_first} {rd_last}", "Recruiting Director", people.email(rd_first, rd_last), fmt_phone(people.phone(), 2), ""])
    isa_first, isa_last = people.name()
    roster.append([f"{isa_first} {isa_last}", "Appointment Setter (ISA)", people.email(isa_first, isa_last), fmt_phone(people.phone(), 2), ""])
    for k in (40, 90):
        a = agents[k]
        roster.append([f"{a['first']} {a['last']}", "Buyer Agent", a["email"], fmt_phone(a["phone"], 2), a["mls_id"]])
    for _ in range(3):
        f, l = people.name()
        roster.append([f"{f} {l}", "Buyer Agent", people.email(f, l), fmt_phone(people.phone(), 2), ""])
    write_csv(out / "team-roster.csv", [[TEST_MARK]] + roster)
    planted["on_team_in_mls"] = [agents[k]["mls_id"] for k in (5, 40, 90)]
    planted["roster_roles"] = {"Team Leader": f"{leader['first']} {leader['last']}",
                               "Recruiting Director": f"{rd_first} {rd_last}",
                               "Appointment Setter (ISA)": f"{isa_first} {isa_last}"}

    # Tracker: 55 rows. 30 match MLS agents by different rules, 3 repeat rows, 2 same-name-other-person,
    # 20 tracker-only.
    trk = [["Name", "Brokerage", "Cell", "Email", "Approx Units", "Source", "Text OK?", "Last Touch", "Stage", "Notes"]]
    match = [agents[i] for i in match_idx]
    matched = {"email": [], "phone_last": [], "name_office": [], "variant_phone": []}
    consent_docs = ["Yes, opt-in form 2026-02-11", "Yes, signed opt-in 2026-03-02", "Yes, web form opt-in 2026-05-19",
                    "Yes, signed at career night 2026-04-23"]
    business_notes = ["Met at MLS class", "Asked about our listing coordinator", "Referred by our lender partner",
                      "Interested in team leads", "Wants to talk after Q1", "Coffee scheduled once, cancelled", ""]
    personal_notes = ["Has 3 kids, wants flexibility", "Recently widowed, may need income"]
    office_changed = []
    stop_rows = []
    trk_rows = []

    def touch():
        return (date(2026, 1, 5) + timedelta(days=rnd.randint(0, 290))).isoformat()

    for j, a in enumerate(match):
        rule = ["email", "phone_last", "name_office", "variant_phone"][0 if j < 15 else 1 if j < 23 else 2 if j < 28 else 3]
        first = a["first"]
        name = f"{first} {a['last']}"
        email, cell, brokerage = a["email"].upper() if j % 3 == 0 else a["email"], fmt_phone(a["phone"], j), a["office"]
        if rule == "email":
            cell = fmt_phone(people.phone(), j)        # a different cell than the MLS shows
        elif rule == "phone_last":
            email = people.email(first, a["last"]).replace("@", ".re@")
        elif rule == "name_office":
            email, cell = "", ""
            brokerage = a["office"].upper() + " LLC"
        else:
            name = f"{a['short']} {a['last']}"
            email = ""
        if j in (3, 9, 17, 20):   # tracker shows an older brokerage
            old = rnd.choice([o for o in OFFICES if o != a["office"]])
            brokerage = old
            office_changed.append({"mls_id": a["mls_id"], "name": f"{a['first']} {a['last']}", "tracker": old, "mls": a["office"]})
        matched[rule].append(a["mls_id"])
        text = ""
        if j in (0, 4, 8, 15, 19):
            text = consent_docs[j % 4]
        elif j in (1, 5, 16):
            text = rnd.choice(["yes", "Y", "Yes"])
        elif j in (2, 18):
            text = "STOP 2026-09-14" if j == 2 else "opted out"
            stop_rows.append(a["mls_id"])
        elif j % 4 == 3:
            text = "No"
        note = personal_notes[0] if j == 6 else rnd.choice(business_notes)
        trk_rows.append([name, brokerage, cell, email, rnd.choice(["", "~10", "8-10", "15?", "20ish", "5"]),
                         rnd.choice(["MLS report", "Career night", "Referral", "Instagram", "Open house"]), text,
                         touch(), rnd.choice(["Prospect", "Contacted", "Coffee booked", "Nurture"]), note])
    planted["tracker_matches"] = matched
    planted["office_changed_tracker"] = office_changed
    planted["opted_out_mls_ids"] = stop_rows

    # 20 tracker-only agents, one of them on Do Not Call, a few with consent.
    tracker_only = []
    for k in range(20):
        f, l = people.name()
        ph, em = people.phone(), people.email(f, l)
        text = ""
        if k in (0, 7):
            text = consent_docs[k % 4]
        elif k == 3:
            text = "DNC"
        elif k in (5, 11):
            text = "yes"
        note = personal_notes[1] if k == 9 else rnd.choice(business_notes)
        trk_rows.append([f"{f} {l}", rnd.choice(OFFICES), fmt_phone(ph, k), em, rnd.choice(["3", "12", "~6", "", "25+", "1-2"]),
                         rnd.choice(["Career night", "Referral", "Facebook group", "Open house"]), text, touch(),
                         rnd.choice(["Prospect", "Contacted", "Nurture"]), note])
        tracker_only.append({"name": f"{f} {l}", "email": em, "dnc": k == 3})
    planted["tracker_only"] = tracker_only

    # 2 rows with the same name as an MLS agent, but another office and other contacts: different people.
    same_name = []
    for a in [agents[i] for i in same_name_idx]:
        trk_rows.append([f"{a['first']} {a['last']}", rnd.choice([o for o in OFFICES if o != a["office"]]),
                         fmt_phone(people.phone(), 1), people.email(a["first"], a["last"]).replace("@", "2@"), "",
                         "Referral", "", touch(), "Prospect", ""])
        same_name.append({"name": f"{a['first']} {a['last']}", "mls_id": a["mls_id"]})
    planted["possible_duplicates"] = same_name

    # 3 repeated tracker rows (same email, different case and phone format).
    for r in rnd.sample(trk_rows[:15], 3):
        dup = list(r)
        dup[3] = (dup[3] or "").lower().strip() + " "
        dup[2] = dup[2].replace("(", "").replace(")", "").replace(" ", "-") if dup[2] else dup[2]
        dup[7] = touch()
        trk_rows.append(dup)
    planted["tracker_repeats"] = 3
    rnd.shuffle(trk_rows)
    planted["tracker_rows"] = len(trk_rows)
    planted["personal_notes"] = personal_notes

    wb = Workbook()
    ws = wb.active
    ws.title = "Recruits"
    write_sheet(ws, TEST_MARK, trk + trk_rows, [24, 30, 16, 34, 12, 14, 30, 12, 14, 36])
    wb.save(out / "recruit-tracker.xlsx")
    planted["total_rows"] = planted["mls_rows"] + planted["tracker_rows"]
    planted["expected_unique"] = len(agents) + 20 + 2
    (PLANTED / "case1.json").write_text(json.dumps(planted, indent=2))


# --- Case 2: one 30-side agent's MLS production detail (PDF) ---------------------------------------

STREETS = ["Juniper Hollow Ln", "Teacup Ridge Dr", "Marble Creek Ct", "Lantern Way", "Pepperbush Rd",
           "Thimble Park Ave", "Bramblewood Cir", "Kettle Pond Ln", "Saffron Hill Dr", "Clover Bend Way"]


def case2():
    rnd = random.Random(2202)
    out = FILES / "case2"
    out.mkdir(parents=True, exist_ok=True)
    closings = []
    start = date(2025, 11, 1)
    sides = ["Listing"] * 19 + ["Buyer"] * 11
    rnd.shuffle(sides)
    for i, side in enumerate(sides):
        d = start + timedelta(days=int(i * 364 / 30) + rnd.randint(0, 9))
        price = round(rnd.gauss(452000, 85000) / 500) * 500
        closings.append({"date": d, "address": f"{rnd.randint(120, 9800)} {rnd.choice(STREETS)}, Prairie Hollow",
                         "side": side, "price": price, "mls": f"PX{3100 + i * 13}"})
    closings.sort(key=lambda c: c["date"])
    prior = {"list": 14, "buy": 10, "volume": 9874500}
    total = sum(c["price"] for c in closings)
    lv = sum(c["price"] for c in closings if c["side"] == "Listing")
    bv = total - lv
    rows = "".join(f"<tr><td>{c['mls']}</td><td>{c['date'].strftime('%m/%d/%Y')}</td><td>{c['address']}</td>"
                   f"<td>{c['side']}</td><td style='text-align:right'>{money(c['price'])}</td></tr>" for c in closings)
    html = f"""<html><head><style>body{{font-family:Arial;font-size:11px}} table{{border-collapse:collapse;width:100%}}
td,th{{border:1px solid #bbb;padding:3px 5px}} th{{background:#e8eef5;text-align:left}} h1{{font-size:16px;margin:0}}
.box{{border:1px solid #889;padding:8px;margin:8px 0}}</style></head><body>
<p style="color:#a00;font-weight:bold">{TEST_MARK}</p>
<h1>Prairie Example MLS: Agent Production Detail</h1>
<p>Report run 11/04/2026. Closed residential sales, 11/01/2025 to 10/31/2026. Sides credited to the agent of record.</p>
<div class="box"><b>Agent:</b> Dana Thimblewhistle &nbsp; <b>Agent MLS ID:</b> PXA40918<br>
<b>Office:</b> Riverbend Example Realty (PXO221), 410 Juniper Hollow Ln, Prairie Hollow<br>
<b>Agent phone:</b> (316) 555-0148 &nbsp; <b>Agent email:</b> dana.thimblewhistle@mailbox.test</div>
<table><tr><th>Period</th><th>Listing Sides</th><th>Listing Volume</th><th>Buyer Sides</th><th>Buyer Volume</th><th>Total Sides</th><th>Total Volume</th></tr>
<tr><td>11/01/2025 to 10/31/2026</td><td>19</td><td>{money(lv)}</td><td>11</td><td>{money(bv)}</td><td>30</td><td>{money(total)}</td></tr>
<tr><td>11/01/2024 to 10/31/2025</td><td>{prior['list']}</td><td></td><td>{prior['buy']}</td><td></td><td>{prior['list'] + prior['buy']}</td><td>{money(prior['volume'])}</td></tr></table>
<h2 style="font-size:13px">Closed Transactions, 11/01/2025 to 10/31/2026</h2>
<table><tr><th>MLS #</th><th>Close Date</th><th>Address</th><th>Side</th><th>Sale Price</th></tr>{rows}
<tr><td colspan="4"><b>Total (30 sides)</b></td><td style='text-align:right'><b>{money(total)}</b></td></tr></table>
<p>Prior-period listing and buyer volume are not broken out in this report.</p>
</body></html>"""
    html_pdf(html, out / "agent-production-detail-thimblewhistle.pdf", TEST_MARK)
    prices = sorted(c["price"] for c in closings)
    planted = {"name": "Dana Thimblewhistle", "office": "Riverbend Example Realty", "units": 30, "list_sides": 19,
               "buy_sides": 11, "total_volume": total, "list_volume": lv, "buy_volume": bv,
               "avg_price": round(total / 30), "min_price": prices[0], "max_price": prices[-1],
               "prior_units": 24, "prior_volume": prior["volume"], "split": "80/20", "cap": 16000,
               "meeting": "Thursday, November 12, 2026 at 10 a.m."}
    (PLANTED / "case2.json").write_text(json.dumps(planted, indent=2))


# --- Case 3: a GoHighLevel pipeline export with a notes column full of personal details (Florida) ---

def case3():
    rnd = random.Random(3303)
    people = People(rnd, ["813", "727", "941", "239", "352", "863"])
    out = FILES / "case3"
    header = ["Opportunity Name", "Contact Name", "Phone", "Email", "Pipeline", "Stage", "Status",
              "Opportunity Value", "Source", "Assigned To", "Tags", "Created On", "Updated On", "Opportunity ID",
              "Contact ID", "Current Brokerage", "Closed Units 12 Mo", "Closed Volume 12 Mo", "Listing Sides 12 Mo",
              "Buyer Sides 12 Mo", "Production Source", "SMS Consent", "DND", "Recruiter Notes"]
    personal = {
        "Carla": "Going through a divorce, probably needs money",
        "Opal": "Pregnant, due in March, might slow down",
        "Hollis": "Turning 63, talking about retiring",
        "Marta": "Goes to my church, very devout",
        "Rafe": "Just finished chemo, health is better now",
        "Selma": "Husband just got transferred, may relocate",
        "Leon": "Moved here from Venezuela 5 years ago",
        "Willa": "Single mom of 3, needs flexible schedule",
        "Tobin": "Recently widowed",
        "Imani": "Newlywed, honeymoon in January",
    }
    business = ["Asked about listing coordinator", "Wants better lead flow", "Met at Realtor association event",
                "Interested in our ISA support", ""]
    stages = ["New Recruit Lead", "Contacted", "Coffee Scheduled", "Nurture"]
    assigned = ["Avery Pelicanfeather", "Jordan Seagrapebottom"]
    consent_docs = ["Yes, web form opt-in 2026-04-03", "Yes, signed opt-in at career night 2026-06-18",
                    "Yes, opt-in form 2026-08-27"]
    rows, truth = [], []
    units_plan = [31, 27, 22, 20, 19, 18, 15, 12, 11, 10, 10, 9, 8, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0,
                  24, 16, 13, 9, 7, 6, 5, 5, 4, 3, 2, 1, 14, 21, 6, 3, 2, 26]
    names_forced = list(personal.keys())
    for i, units in enumerate(units_plan):
        if i < len(names_forced):
            first = names_forced[i]
            last = rnd.choice(PREFIX) + rnd.choice(SUFFIX)
            while any(t["last"] == last for t in truth):
                last = rnd.choice(PREFIX) + rnd.choice(SUFFIX)
            people.used.add((first, last))
        else:
            first, last = people.name()
        avg = rnd.randint(330, 690) * 1000
        ls, lv, bs, bv = production(rnd, units, avg)
        ph, em = people.phone(), people.email(first, last)
        consent, dnd = "", "false"
        if i in (0, 3, 9, 14, 27, 39):
            consent = consent_docs[i % 3]
        elif i in (2, 11, 30):
            consent = "Yes"
        elif i in (6, 22):
            dnd = "true"
        note = personal.get(first) if i < len(names_forced) else rnd.choice(business)
        created = date(2026, 1, 10) + timedelta(days=rnd.randint(0, 250))
        updated = created + timedelta(days=rnd.randint(1, 60))
        rows.append([f"{first} {last} Recruit", f"{first} {last}", f"+1{ph}", em, "Agent Recruiting",
                     rnd.choice(stages), "open", "0", rnd.choice(["MLS report", "Referral", "Career night", "Instagram"]),
                     assigned[i % 2], "recruit" + (", dnd" if dnd == "true" else ""), created.isoformat(),
                     updated.isoformat(), f"opp_{rnd.randint(10**9, 10**10):x}", f"con_{rnd.randint(10**9, 10**10):x}",
                     rnd.choice(OFFICES), units, lv + bv, ls, bs, "MLS production report, closed 11/01/2025 to 10/31/2026",
                     consent, dnd, note])
        truth.append({"first": first, "last": last, "units": units, "email": em, "consent": consent, "dnd": dnd == "true"})
    # Two duplicate opportunities for the same contacts (an old lost one and a new open one).
    for k in (4, 15):
        dup = list(rows[k])
        dup[5], dup[6] = "Nurture", "lost"
        dup[13] = f"opp_{rnd.randint(10**9, 10**10):x}"
        dup[11] = "2025-09-02"
        dup[12] = "2025-12-15"
        dup[16], dup[17], dup[18], dup[19] = max(0, dup[16] - 3), "", "", ""
        dup[20] = "Old tracker estimate, 2025"
        rows.append(dup)
    rnd.shuffle(rows)
    write_csv(out / "ghl-agent-recruiting-opportunities.csv", [[TEST_MARK], header] + rows)
    tiers = {"A": 0, "B": 0, "C": 0, "D": 0}
    for t in truth:
        u = t["units"]
        tiers["A" if u >= 20 else "B" if u >= 10 else "C" if u >= 4 else "D"] += 1
    planted = {"rows": len(rows), "unique": len(truth), "duplicate_contacts": [truth[4]["email"], truth[15]["email"]],
               "tiers_all": tiers, "personal_note_names": names_forced,
               "personal_terms": ["divorce", "pregnan", "due in March", "63", "retir", "church", "devout", "chemo",
                                  "husband", "transferred", "Venezuela", "single mom", "widow", "newlywed",
                                  "honeymoon"],
               "documented_consent": [truth[i]["email"] for i in (0, 3, 9, 14, 27, 39)],
               "bare_yes": [truth[i]["email"] for i in (2, 11, 30)],
               "dnd": [truth[i]["email"] for i in (6, 22)], "truth": truth}
    (PLANTED / "case3.json").write_text(json.dumps(planted, indent=2))


# --- Practice: one workbook with two tabs, plus the team one-pager -----------------------------------

def practice():
    rnd = random.Random(4404)
    people = People(rnd, ["919", "984", "336", "704", "910"])
    team_office = "Marigold Example Realty"
    agents = []
    for i in range(68):
        office = team_office if i == 2 else rnd.choice(OFFICES)
        a = make_agent(rnd, people, office, 280000, 560000)
        a["mls_id"] = f"BSX{50120 + i * 11}"
        a["office_id"] = f"BO{300 + (OFFICES.index(office) if office in OFFICES else 99)}"
        agents.append(a)
    # The appointment candidate.
    m = make_agent(rnd, people, "Copperleaf Example Real Estate", 380000, 420000, units=22, prior=17)
    m["first"], m["last"] = "Marisol", "Quillpocket"
    m["email"] = "marisol.quillpocket@inbox.test"
    m["mls_id"], m["office_id"] = "BSX50999", f"BO{300 + OFFICES.index('Copperleaf Example Real Estate')}"
    prices = [round(rnd.gauss(405000, 60000) / 500) * 500 for _ in range(22)]
    m["list_sides"], m["list_vol"], m["buy_sides"], m["buy_vol"] = 14, sum(prices[:14]), 8, sum(prices[14:])
    agents.insert(17, m)
    mls = [["Agent Production Report", "Bayside Example MLS", "Closed 11/01/2025 to 10/31/2026",
            "All residential property types", "Generated 11/02/2026"], MLS_HEADER]
    body = []
    for i, a in enumerate(agents):
        if i == 30 and a["units"] >= 3:
            new_office = "Foxglove Example Realty" if a["office"] != "Foxglove Example Realty" else "Oakhaven Example Realty"
            old, new = split_office(rnd, a, new_office)
            body.append(mls_row(a, a["mls_id"], a["office_id"], a["office"], old))
            body.append(mls_row(a, a["mls_id"], f"BO{300 + OFFICES.index(new_office)}", new_office, new))
        else:
            body.append(mls_row(a, a["mls_id"], a["office_id"]))
    body.append(list(body[9]))   # pasted twice
    rnd.shuffle(body)
    ours = [["Name", "Brokerage", "Cell", "Email", "Approx Units", "Text OK?", "Last Touch", "Stage", "Notes"]]
    picks = [a for i, a in enumerate(agents) if i not in (2, 30)]
    rnd.shuffle(picks)
    picks = [m] + [p for p in picks if p is not m][:15]
    for j, a in enumerate(picks):
        email = a["email"] if j % 2 == 0 else ""
        cell = fmt_phone(a["phone"], j)
        text = {0: "Yes, signed opt-in 2026-05-14", 3: "Yes, opt-in form 2026-07-30", 5: "yes", 8: "STOP"}.get(j, "")
        note = {0: "Met at the October MLS update class", 4: "Has 2 kids in college, needs income"}.get(j, rnd.choice(
            ["Asked about our listing coordinator", "Referred by our lender partner", "", "Wants to talk in January"]))
        brokerage = a["office"] if j != 6 else next(o for o in ("Pinecrest Example Homes", "Granite Example Home Group") if o != a["office"])
        ours.append([f"{a['first']} {a['last']}", brokerage, cell, email, rnd.choice(["", "~10", "15ish", "20+", "5"]),
                     text, (date(2026, 2, 1) + timedelta(days=rnd.randint(0, 260))).isoformat(),
                     rnd.choice(["Prospect", "Contacted", "Coffee booked"]), note])
    for k in range(14):
        f, l = people.name()
        ours.append([f"{f} {l}", rnd.choice(OFFICES), fmt_phone(people.phone(), k), people.email(f, l),
                     rnd.choice(["3", "8", "~12", ""]), "Yes, signed opt-in 2026-06-02" if k == 4 else "",
                     (date(2026, 2, 1) + timedelta(days=rnd.randint(0, 260))).isoformat(),
                     rnd.choice(["Prospect", "Nurture"]), rnd.choice(["Career night", "Open house", ""])])
    ours.append(list(ours[3]))
    ours[-1][3] = (ours[-1][3] or "").upper()
    wb = Workbook()
    ws = wb.active
    ws.title = "MLS Export"
    write_sheet(ws, PRACTICE_MARK, mls + body, [12, 24, 12, 30, 16, 34, 9, 14, 9, 14, 10, 14, 12, 14])
    ws2 = wb.create_sheet("Our List")
    write_sheet(ws2, PRACTICE_MARK, ours, [24, 30, 16, 34, 12, 30, 12, 14, 36])
    PRACTICE.mkdir(parents=True, exist_ok=True)
    wb.save(PRACTICE / "PRACTICE Recruit List.xlsx")

    html = f"""<html><head><style>body{{font-family:Georgia,serif;font-size:11.5px;color:#222}} h1{{font-size:20px;margin:4px 0}}
h2{{font-size:13px;margin:10px 0 4px;color:#7a4b00}} table{{border-collapse:collapse;width:100%}} td,th{{border:1px solid #ccb;padding:4px 6px;vertical-align:top}}
th{{background:#fbf3e0}} .small{{font-size:9.5px;color:#555}}</style></head><body>
<p style="color:#a00;font-weight:bold;font-family:Arial">{PRACTICE_MARK}</p>
<h1>Why Agents Join the Harborlight Example Team</h1>
<p>Harborlight Example Team at Marigold Example Realty. Updated September 2026. Owner: Rowan Teacupbloom, Team Leader.</p>
<h2>What You Get, By Where You Are</h2>
<table><tr><th>Your last 12 months</th><th>What we add</th></tr>
<tr><td><b>Building (0 to 11 sides)</b></td><td>Team buyer leads after a 30-day training track. Weekly one-on-one coaching. A transaction coordinator on every deal. Shared showing assistant.</td></tr>
<tr><td><b>Growing (12 to 24 sides)</b></td><td>Everything above, plus a listing coordinator who handles photos, launch and listing paperwork. Your own marketing budget of $1,500 a year for your sphere. Priority on team listing leads in your area.</td></tr>
<tr><td><b>Established (25+ sides)</b></td><td>Everything above, plus an inside sales agent who books your buyer consults, and a path to lead a small pod of two buyer agents. You keep your own brand on your marketing, next to the team logo.</td></tr></table>
<h2>Splits, Cap and Fees</h2>
<p>Team-generated leads: 50/50. Your own leads and sphere: 80/20 to you. Team cap: $18,000 a year in team split; after cap, your own leads are 100% to you and team leads are 70/30. Transaction fee: $395 per closed side, paid at closing. Marigold Example Realty's brokerage fees are separate and set by the brokerage.</p>
<h2>How We Work</h2>
<p>One team meeting a week (Tuesday, 9:00 a.m., 45 minutes). No required floor time. You choose your own schedule. Your database stays yours if you leave.</p>
<h2>Results</h2>
<p>Agents who join Harborlight close 40% more transactions in their first year.</p>
<h2>Revenue Share</h2>
<p>Marigold Example Realty offers a revenue share program. Ask for the brokerage's official disclosure; we don't estimate what anyone will earn from it.</p>
<p class="small">Questions: Rowan Teacupbloom, Team Leader, rowan.teacupbloom@postbox.test. Harborlight Example Team, 77 Lantern Way, Suite 4, Seabright Example, NC.</p>
</body></html>"""
    html_pdf(html, PRACTICE / "PRACTICE Team Value Proposition.pdf", PRACTICE_MARK)
    planted = {"candidate": {"name": "Marisol Quillpocket", "units": 22, "list_sides": 14, "buy_sides": 8,
                             "volume": m["list_vol"] + m["buy_vol"], "prior_units": 17},
               "earnings_claim": "Agents who join Harborlight close 40% more transactions in their first year.",
               "personal_note": "Has 2 kids in college, needs income", "mls_rows": len(body), "our_rows": len(ours) - 1}
    (PLANTED / "practice.json").write_text(json.dumps(planted, indent=2))


if __name__ == "__main__":
    PLANTED.mkdir(parents=True, exist_ok=True)
    case1()
    case2()
    case3()
    practice()
    print("done")
