# Pipeline Code

Last verified: 2026-11-10. The Follow Up Boss columns this code reads (the People export's Date Added, Name, Stage, Lead Source, Assigned To, Tags, Deal Stage, Deal Close Date and Deal Price, the People-view columns Last Communication and Last Activity, and the Deals report's Name, Stage, Status, Entered Stage, Close Date, Price and Team) and Follow Up Boss's default stages are described, with their sources, in `fub-exports.md`. The rules for the four decision lists, aging, conversion and odd rows are in `review-rules.md`.

Run this code with Python 3 on the uploaded files. It uses Python's standard library, plus openpyxl for an .xlsx file. Do not paste it into the conversation. It never prints an email address or a phone number: it reads them only to match the same person in this week's and last week's exports.

Usage:

    python3 fubpr.py --people THIS_WEEK.csv [--deals DEALS.csv] [--last-week LAST_WEEK.csv] --as-of YYYY-MM-DD [--days 7] [--period-start YYYY-MM-DD] [--period-end YYYY-MM-DD] [--rules rules.json] [--out FOLDER]

It prints the data and writes pipeline_review.md (every table, with the arithmetic) and pipeline_review.json (the same, for drafting) to FOLDER.

What it does: finds each file's header row and columns by name (and shows which column it used for what); reads each stage as a Follow Up Boss default, a common custom stage or a guess, and says which; counts people by stage with how long since each was last communicated with; reads each deal's stage as open, closed or fell through; builds the four decision lists (deals past their expected close date, appointment-stage people with no next step in the export, hot or active people with nothing logged in more than the set number of days, and pipeline stages with no movement since last week); matches this week's export to last week's by ID, email, phone or name and lists every stage change; works out conversion by lead source and by agent for the period, each rate as numerator / denominator; counts each agent's records; writes the questions for each agent; and lists every odd row without fixing it.

```python
#!/usr/bin/env python3
# FUB Pipeline Review (Amplified Impact). Python 3 standard library, plus openpyxl for an .xlsx upload.
#
# Reads what a team leader downloads from Follow Up Boss for the weekly pipeline review: this week's People
# export, and when the team has them, a Deals report export and last week's People export. It only reads
# and counts. It never changes a stage, never fills or fixes a date, and never prints an email address or a
# phone number (they are read only to match the same person across files). Writes to --out:
#   pipeline_review.md    every table, with the arithmetic shown
#   pipeline_review.json  the same, for drafting
#
# Usage:
#   python3 fubpr.py --people FILE [--deals FILE] [--last-week FILE] [--as-of YYYY-MM-DD] [--days 7]
#                    [--period-start YYYY-MM-DD] [--period-end YYYY-MM-DD] [--rules rules.json] [--out DIR]
#
# rules.json is optional. Write it only from what the user said or what the run showed was misread:
#   {"stages": {"Hot Prospect": "spoke"}, "deal_stages": {"Clear to Close": "open"}, "hot_tags": ["Hot", "A Lead"],
#    "columns": {"people": {"agent": "Agent", "last_comm": "Last Communication"}, "deals": {"close": "Projected Close"}}}
# Stage classes: new, attempted, spoke, appointment, client, contract, closed, nurture, sphere, out, other.
# Deal stage classes: open, closed, lost.

import argparse
import csv
import io
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

NULLS = {"", "none", "null", "n/a", "na", "-", "--", "nan", "nat"}

PEOPLE_COLS = {
    "id": ["id", "person id", "contact id", "lead id", "record id", "fub id"],
    "name": ["name", "full name", "contact name", "lead name", "person"],
    "first": ["first name", "firstname", "first"],
    "last": ["last name", "lastname", "last"],
    "stage": ["stage", "lead stage", "contact stage", "status", "lead status"],
    "source": ["lead source", "source", "contact source", "origin"],
    "agent": ["assigned to", "agent", "assigned agent", "owner", "assigned user", "lead owner", "assigned"],
    "created": ["date added", "created", "created date", "date created", "created at", "added"],
    "last_comm": ["last communication", "last communication date", "last contacted", "last contact date", "last touch"],
    "last_activity": ["last activity", "last activity date", "last website visit", "last visit"],
    "tags": ["tags", "tag", "labels"],
    "deal_stage": ["deal stage"],
    "deal_close": ["deal close date"],
    "deal_price": ["deal price"],
}
DEAL_COLS = {
    "name": ["name", "deal name", "deal", "deal title", "title"],
    "pipeline": ["pipeline", "deal pipeline", "pipeline name"],
    "stage": ["stage", "deal stage", "stage name"],
    "status": ["status", "deal status"],
    "entered": ["entered stage", "stage entered", "date entered stage", "entered stage date", "entered"],
    "close": ["close date", "projected close date", "expected close date", "estimated close date", "closing date",
              "deal close date", "close"],
    "price": ["price", "deal price", "deal value", "value", "sale price"],
    "agents": ["team", "agents", "agent", "assigned to", "users", "user", "deal agents"],
    "people": ["people", "contacts", "contact", "person", "client", "clients", "contact name"],
}
EMAIL_RE = re.compile(r"^(?:(?:primary|secondary|work|personal|home|other) )?e ?mail(?: address)?(?: \d+)?$")
PHONE_RE = re.compile(r"^(?:(?:primary|secondary|work|home|mobile|cell|other) )?(?:phone|mobile|cell)(?: number)?(?: \d+)?$")

# Follow Up Boss's default stages (help center, "Changing a Lead Stage"), then common custom stages.
STAGE_ORDER = ["Lead", "Attempted Contact", "Spoke with Customer", "Appointment Set", "Met with Customer",
               "Showing Homes", "Listing Agreement", "Active Listing", "Submitting Offers", "Under Contract",
               "Closed", "Nurture", "Rejected", "Trash"]
FUB_STAGES = {
    "lead": "new", "attempted contact": "attempted", "spoke with customer": "spoke", "appointment set": "appointment",
    "met with customer": "appointment", "showing homes": "client", "listing agreement": "client",
    "active listing": "client", "submitting offers": "client", "under contract": "contract", "closed": "closed",
    "nurture": "nurture", "rejected": "out", "trash": "out",
}
COMMON_STAGES = {
    "new": "new", "new lead": "new", "pending": "contract", "past client": "closed", "past clients": "closed",
    "sphere": "sphere", "soi": "sphere", "hot prospect": "spoke", "active client": "client", "dead": "out",
    "archived": "out", "unresponsive": "nurture", "vendor": "other", "agent": "other",
}
GUESSES = [
    ("out", ["trash", "reject", "dead", "junk", "lost", "not interested", "do not", "spam"]),
    ("closed", ["closed", "past client", "sold", "post closing"]),
    ("sphere", ["sphere", "soi", "friend", "family"]),
    ("nurture", ["nurture", "long term", "cold", "drip", "later", "watch"]),
    ("contract", ["contract", "pending", "escrow", "under agreement"]),
    ("client", ["listing", "listed", "offer", "showing", "active client"]),
    ("appointment", ["appoint", "met ", "consult"]),
    ("spoke", ["spoke", "prospect", "hot", "warm", "qualif", "engaged", "contacted"]),
    ("attempted", ["attempt"]),
    ("new", ["new", "lead", "inquiry"]),
    ("other", ["vendor", "agent", "lender", "partner", "recruit"]),
]
CLASS_LABEL = {
    "new": "New lead", "attempted": "Attempted", "spoke": "Spoke", "appointment": "Appointment",
    "client": "Active client", "contract": "Under contract", "closed": "Closed", "nurture": "Nurture",
    "sphere": "Sphere", "out": "Out (rejected, trash)", "other": "Other", "unknown": "Not recognized", "blank": "No stage",
}
RANK = {"new": 1, "attempted": 2, "spoke": 3, "appointment": 4, "client": 5, "contract": 6, "closed": 7,
        "nurture": 8, "sphere": 9, "other": 10, "out": 11, "unknown": 12, "blank": 13}
ACTIVE = {"spoke", "appointment", "client", "contract"}
PIPELINE = {"new", "attempted", "spoke", "appointment", "client", "contract"}
REACHED = {
    "Spoke or further": {"spoke", "appointment", "client", "contract", "closed"},
    "Appointment or further": {"appointment", "client", "contract", "closed"},
    "Under contract or closed": {"contract", "closed"},
}
DEAL_CLOSED = ["closed", "sold", "funded", "paid", "won", "complete", "recorded"]
DEAL_LOST = ["fell through", "fall through", "lost", "cancel", "terminat", "dead", "withdrawn", "expired", "released"]


def norm(h):
    h = str(h or "").replace("﻿", "").strip().lower()
    h = re.sub(r"[_\-:/.]+", " ", h)
    h = re.sub(r"[^a-z0-9#& ]", "", h)
    return re.sub(r"\s+", " ", h).strip()


def map_columns(headers, synonyms, overrides):
    n = [norm(h) for h in headers]
    cmap, used = {}, set()
    for key, names in synonyms.items():
        if key in overrides:
            hit = [i for i, h in enumerate(headers) if h == overrides[key] or norm(h) == norm(overrides[key])]
            if hit:
                cmap[key] = hit[0]
                used.add(hit[0])
            continue
        for name in names:
            hit = [i for i, h in enumerate(n) if h == name and i not in used]
            if hit:
                cmap[key] = hit[0]
                used.add(hit[0])
                break
    emails = [i for i, h in enumerate(n) if i not in used and not h.endswith(" type") and EMAIL_RE.match(h)]
    phones = [i for i, h in enumerate(n) if i not in used and not h.endswith(" type") and PHONE_RE.match(h)]
    return cmap, emails, phones


def read_rows(path):
    if path.lower().endswith((".xlsx", ".xlsm")):
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        rows = []
        for row in wb.worksheets[0].iter_rows(values_only=True):
            rows.append(["" if v is None else (v if isinstance(v, (datetime, date)) else str(v)) for v in row])
        return rows
    raw = open(path, "rb").read()
    text = None
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    try:
        dialect = csv.Sniffer().sniff(text[:20000], delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    return list(csv.reader(io.StringIO(text), dialect))


def find_header(rows, synonyms):
    known = set()
    for names in synonyms.values():
        known.update(names)
    for i, row in enumerate(rows[:15]):
        cells = [norm(c) for c in row if str(c).strip()]
        if len(cells) >= 3 and sum(1 for c in cells if c in known) >= 3:
            return i
    return 0


MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}


def _mk(y, m, d):
    try:
        y = int(y)
        if y < 100:
            y += 2000
        return date(y, int(m), int(d))
    except (ValueError, TypeError):
        return None


def parse_date(v):
    """Returns (date or None, readable). An empty cell is (None, True); a cell that is not a date is (None, False)."""
    if isinstance(v, datetime):
        return v.date(), True
    if isinstance(v, date):
        return v, True
    s = str(v or "").strip()
    if s.lower() in NULLS:
        return None, True
    m = re.match(r"^(\d{4})-(\d{1,2})-(\d{1,2})", s)
    if m:
        d = _mk(*m.groups())
        return d, d is not None
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})\b", s)
    if m:
        d = _mk(m.group(3), m.group(1), m.group(2))
        return d, d is not None
    m = re.match(r"^([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})", s)
    if m and m.group(1)[:3].lower() in MONTHS:
        d = _mk(m.group(3), MONTHS[m.group(1)[:3].lower()], m.group(2))
        return d, d is not None
    return None, False


def us(d):
    return d.strftime("%m/%d/%Y") if d else ""


def days_text(as_of, d):
    n = (as_of - d).days
    return n, f"{us(as_of)} minus {us(d)} = {n} day{'s' if n != 1 else ''}"


def rate(n, d):
    if d == 0:
        return "n/a (0 people)"
    return f"{n} / {d} = {100.0 * n / d:.1f}%"


def cell(v):
    return str(v).replace("|", "/").replace("\n", " ").strip()


def table(head, rows):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    for r in rows:
        out.append("| " + " | ".join(cell(c) for c in r) + " |")
    return "\n".join(out)


def classify_stage(stage, team):
    s = norm(stage)
    if not s:
        return "blank", "no stage in the row"
    for k, v in team.items():
        if norm(k) == s:
            return v, "your rule (rules.json)"
    if s in FUB_STAGES:
        return FUB_STAGES[s], "Follow Up Boss default stage"
    if s in COMMON_STAGES:
        return COMMON_STAGES[s], "common custom stage: confirm"
    for cls, words in GUESSES:
        if any(w in s + " " for w in words):
            return cls, "read from the stage's name: confirm"
    return "unknown", "not recognized: confirm"


def classify_deal_stage(stage, team):
    s = norm(stage)
    for k, v in team.items():
        if norm(k) == s:
            return v, "your rule (rules.json)"
    if any(w in s for w in DEAL_LOST):
        return "lost", "a fell-through word in the name"
    if any(w in s for w in DEAL_CLOSED):
        return "closed", "a closed word in the name"
    return "open", "no closed or fell-through word: read as open"


def split_tags(v):
    return [t.strip() for t in re.split(r"[,;|]", str(v or "")) if t.strip()]


def is_hot(tags, hot_tags):
    for t in tags:
        words = norm(t).split()
        for h in hot_tags:
            hn = norm(h)
            if norm(t) == hn or (" " not in hn and hn in words):
                return t
    return None


def phone_digits(p):
    d = re.sub(r"\D", "", str(p or ""))
    if len(d) == 11 and d.startswith("1"):
        d = d[1:]
    return d if len(d) == 10 else ""


def name_key(s):
    return " ".join(re.findall(r"[a-z0-9']+", str(s or "").lower()))


def load_people(path, overrides, as_of, team_stages, hot_tags, label):
    rows = read_rows(path)
    h = find_header(rows, PEOPLE_COLS)
    headers = [str(x) for x in rows[h]]
    cmap, emails, phones = map_columns(headers, PEOPLE_COLS, overrides)
    people, odd = [], []
    fname = os.path.basename(path)
    for i in range(h + 1, len(rows)):
        r = rows[i]
        if not any(str(c).strip() for c in r):
            continue

        def get(k):
            j = cmap.get(k)
            return r[j] if j is not None and j < len(r) else ""

        rown = i + 1
        name = str(get("name") or "").strip() or (str(get("first") or "").strip() + " " + str(get("last") or "").strip()).strip()
        if not name:
            name = f"(no name, row {rown})"
        stage = str(get("stage") or "").strip()
        cls, how = classify_stage(stage, team_stages)
        p = {"row": rown, "name": name, "stage": stage, "class": cls, "source": str(get("source") or "").strip(),
             "agent": str(get("agent") or "").strip() or "Unassigned", "tags": split_tags(get("tags")),
             "id": str(get("id") or "").strip(),
             "emails": [str(r[j]).strip().lower() for j in emails if j < len(r) and "@" in str(r[j])],
             "phones": [x for x in (phone_digits(r[j]) for j in phones if j < len(r)) if x]}
        p["hot"] = is_hot(p["tags"], hot_tags)
        if not stage:
            odd.append({"file": fname, "row": rown, "name": name, "what": "no stage in the row",
                        "treated": "counted under (no stage); left out of the decision list"})
        for key, col in (("created", "created"), ("last_comm", "last_comm"), ("last_activity", "last_activity"),
                         ("deal_close", "deal_close")):
            raw = get(col)
            d, ok = parse_date(raw)
            p[key] = None
            p[key + "_raw"] = str(raw).strip()
            if not ok:
                odd.append({"file": fname, "row": rown, "name": name, "what": f"{headers[cmap[col]]} is not a date ({cell(raw)})",
                            "treated": "not used for aging or the decision list; check the record"})
                p[key + "_bad"] = cell(raw)
            elif d and as_of and d > as_of and key != "deal_close":
                odd.append({"file": fname, "row": rown, "name": name,
                            "what": f"{headers[cmap[col]]} {us(d)} is after the as-of date {us(as_of)}",
                            "treated": "left out of conversion; check the record" if key == "created"
                            else "not used for aging or the decision list; check the record"})
                p[key + "_future"] = us(d)
            else:
                p[key] = d
        p["deal_stage"] = str(get("deal_stage") or "").strip()
        p["deal_price"] = str(get("deal_price") or "").strip()
        p["stage_how"] = how
        people.append(p)
    used = {k: headers[v] for k, v in cmap.items()}
    if emails:
        used["emails (matching only, never shown)"] = ", ".join(headers[j] for j in emails)
    if phones:
        used["phones (matching only, never shown)"] = ", ".join(headers[j] for j in phones)
    return {"file": fname, "label": label, "header_row": h + 1, "rows": len(people), "columns": used,
            "people": people, "odd": odd, "has": set(cmap)}


def load_deals(path, overrides, as_of, team_deal_stages):
    rows = read_rows(path)
    h = find_header(rows, DEAL_COLS)
    headers = [str(x) for x in rows[h]]
    cmap, _, _ = map_columns(headers, DEAL_COLS, overrides)
    deals, odd = [], []
    fname = os.path.basename(path)
    for i in range(h + 1, len(rows)):
        r = rows[i]
        if not any(str(c).strip() for c in r):
            continue

        def get(k):
            j = cmap.get(k)
            return r[j] if j is not None and j < len(r) else ""

        rown = i + 1
        name = str(get("name") or "").strip() or f"(no deal name, row {rown})"
        stage = str(get("stage") or "").strip()
        cls, how = classify_deal_stage(stage, team_deal_stages)
        status = str(get("status") or "").strip()
        dl = {"row": rown, "name": name, "pipeline": str(get("pipeline") or "").strip(), "stage": stage, "class": cls,
              "how": how, "status": status, "archived": "archiv" in status.lower(),
              "price": str(get("price") or "").strip(), "agents": str(get("agents") or "").strip(),
              "people_raw": str(get("people") or "").strip()}
        for key in ("entered", "close"):
            raw = get(key)
            d, ok = parse_date(raw)
            dl[key] = None
            if not ok:
                odd.append({"file": fname, "row": rown, "name": name, "what": f"{headers[cmap[key]]} is not a date ({cell(raw)})",
                            "treated": "not used"})
            elif d and key == "entered" and d > as_of:
                odd.append({"file": fname, "row": rown, "name": name, "what": f"{headers[cmap[key]]} {us(d)} is after the as-of date {us(as_of)}",
                            "treated": "not used for days in stage"})
            else:
                dl[key] = d
        if cls == "closed" and not dl["archived"]:
            if dl["close"] is None and str(get("close") or "").strip().lower() in NULLS:
                odd.append({"file": fname, "row": rown, "name": name, "what": f"stage {stage} (read as closed) with no close date",
                            "treated": "left as is; not counted anywhere a close date is needed"})
            elif dl["close"] and dl["close"] > as_of:
                odd.append({"file": fname, "row": rown, "name": name,
                            "what": f"stage {stage} (read as closed) with a close date of {us(dl['close'])}, after the as-of date",
                            "treated": "left as is"})
        deals.append(dl)
    return {"file": fname, "header_row": h + 1, "rows": len(deals), "columns": {k: headers[v] for k, v in cmap.items()},
            "deals": deals, "odd": odd, "has": set(cmap)}


def match_weeks(now, last):
    """Pairs each person in this week's export with the same person in last week's: by ID, then email, then phone,
    then name, each only when it points to exactly one person not already paired."""
    idx = defaultdict(lambda: defaultdict(list))
    for j, p in enumerate(last):
        if p["id"]:
            idx["id"][p["id"]].append(j)
        for e in p["emails"]:
            idx["email"][e].append(j)
        for ph in p["phones"]:
            idx["phone"][ph].append(j)
        idx["name"][name_key(p["name"])].append(j)
    taken, pairs, how = set(), {}, Counter()
    for i, p in enumerate(now):
        cands = [("id", [p["id"]] if p["id"] else []), ("email", p["emails"]), ("phone", p["phones"]),
                 ("name", [name_key(p["name"])])]
        for kind, keys in cands:
            hit = None
            for k in keys:
                js = [j for j in idx[kind].get(k, []) if j not in taken]
                if len(js) == 1:
                    hit = js[0]
                    break
            if hit is not None:
                pairs[i] = hit
                taken.add(hit)
                how[kind] += 1
                break
    return pairs, taken, how


def analyze(args):
    rules = json.load(open(args.rules)) if args.rules else {}
    as_of = date.fromisoformat(args.as_of) if args.as_of else date.today()
    as_of_given = bool(args.as_of)
    n_days = args.days
    team_stages = rules.get("stages", {})
    team_deal_stages = rules.get("deal_stages", {})
    hot_tags = rules.get("hot_tags", ["Hot"])
    cols = rules.get("columns", {})
    pstart = date.fromisoformat(args.period_start) if args.period_start else as_of - timedelta(days=90)
    pend = date.fromisoformat(args.period_end) if args.period_end else as_of
    flags = []

    P = load_people(args.people, cols.get("people", {}), as_of, team_stages, hot_tags, "this week's People export")
    people = P["people"]
    L = load_people(args.last_week, cols.get("people", {}), as_of, team_stages, hot_tags, "last week's People export") if args.last_week else None
    D = load_deals(args.deals, cols.get("deals", {}), as_of, team_deal_stages) if args.deals else None
    odd = list(P["odd"]) + (list(D["odd"]) if D else [])

    if not as_of_given:
        flags.append(f"No as-of date was given, so every day count runs to today, {us(as_of)}. If the export was downloaded on another day, rerun with --as-of.")
    for k, label in (("stage", "Stage"), ("agent", "Assigned To"), ("source", "Lead Source"), ("created", "Date Added or Created")):
        if k not in P["has"]:
            flags.append(f"This week's People export has no {label} column: everything that needs it was skipped.")
    if "last_comm" not in P["has"]:
        flags.append("This week's People export has no Last Communication column, so aging and decision lists 2 and 3 were not run. "
                     "Turn the Last Communication column on in the People view and export again.")
    if "last_activity" not in P["has"]:
        flags.append("No Last Activity column: the lead's own activity is not shown next to any decision.")
    if (P["people"] and sum(1 for o in P["odd"] if "after the as-of date" in o["what"]) > 0.1 * len(P["people"])):
        flags.append("More than 1 in 10 rows have dates after the as-of date. The as-of date may be wrong: check it.")

    # ---------------- stage reading
    stage_counts = Counter(p["stage"] for p in people)
    reading = {}
    for p in people:
        reading.setdefault(p["stage"], (p["class"], p["stage_how"]))

    def stage_sort(s):
        if s in STAGE_ORDER:
            return (0, STAGE_ORDER.index(s), s)
        c = reading.get(s, ("unknown", ""))[0]
        return (1, RANK.get(c, 99), s or "~")

    stages_sorted = sorted(stage_counts, key=stage_sort)
    stage_reading = [{"stage": s or "(no stage)", "records": stage_counts[s], "read_as": CLASS_LABEL[reading[s][0]],
                      "how": reading[s][1]} for s in stages_sorted]
    to_confirm = [r for r in stage_reading if "confirm" in r["how"]]

    # ---------------- deals: from the Deals export, or the People export's deal columns
    deal_items = []
    deal_source = None
    person_deals = defaultdict(list)
    unmatched = []
    if D:
        deal_source = "deals"
        by_name = defaultdict(list)
        for i, p in enumerate(people):
            by_name[name_key(p["name"])].append(i)
        for dl in D["deals"]:
            hit = None
            if dl["people_raw"]:
                for part in re.split(r"[,;&]| and ", dl["people_raw"]):
                    js = by_name.get(name_key(part), [])
                    if len(js) == 1:
                        hit = js[0]
                        break
            if hit is None:
                dn = " " + name_key(dl["name"]) + " "
                js = [i for i, p in enumerate(people) if len(name_key(p["name"]).split()) >= 2 and " " + name_key(p["name"]) + " " in dn]
                if len(js) == 1:
                    hit = js[0]
            dl["person"] = hit
            if hit is not None:
                person_deals[hit].append(dl)
            elif not dl["archived"]:
                unmatched.append(dl["name"])
        deal_items = D["deals"]
        if unmatched:
            flags.append(f"{len(unmatched)} deal(s) were not matched to a person in the People export ({'; '.join(unmatched)}). "
                         "A person with a deal under another name can still show up in list 2.")
    elif "deal_stage" in P["has"]:
        deal_source = "people"
        for i, p in enumerate(people):
            if p["deal_stage"]:
                cls, how = classify_deal_stage(p["deal_stage"], team_deal_stages)
                dl = {"row": p["row"], "name": f"{p['name']}'s deal", "pipeline": "",
                      "stage": p["deal_stage"], "class": cls, "how": how, "status": "", "archived": False,
                      "price": p["deal_price"], "agents": p["agent"], "entered": None, "close": p["deal_close"], "person": i}
                if cls == "closed" and p["deal_close"] is None and p["deal_close_raw"].lower() in NULLS:
                    odd.append({"file": P["file"], "row": p["row"], "name": p["name"],
                                "what": f"Deal Stage {p['deal_stage']} (read as closed) with no Deal Close Date",
                                "treated": "left as is; not counted anywhere a close date is needed"})
                deal_items.append(dl)
                person_deals[i].append(dl)
        flags.append("No Deals export: list 1 used the People export's Deal Stage, Deal Close Date and Deal Price columns, "
                     "which hold one deal per person.")
    else:
        flags.append("No Deals export and no deal columns in the People export: list 1 (deals past their expected close date) was not run.")

    open_deals = [d for d in deal_items if d["class"] == "open" and not d["archived"]]
    no_close = [d for d in open_deals if d["close"] is None]

    # ---------------- last week
    movement = None
    pairs = {}
    if L:
        pairs, taken, how = match_weeks(people, L["people"])
        lw = L["people"]
        newest_now = max([p["created"] for p in people if p["created"]] or [None]) if people else None
        newest_last = max([p["created"] for p in lw if p["created"]] or [None]) if lw else None
        if newest_now and newest_last and newest_last > newest_now:
            flags.append("Last week's export has a newer Date Added than this week's. The two files may be swapped: check which is which.")
        changes, new, gone = [], [], []
        for i, p in enumerate(people):
            if i in pairs:
                q = lw[pairs[i]]
                if norm(q["stage"]) != norm(p["stage"]):
                    changes.append({"name": p["name"], "agent": p["agent"], "from": q["stage"] or "(no stage)", "to": p["stage"] or "(no stage)"})
            else:
                new.append({"name": p["name"], "agent": p["agent"], "stage": p["stage"] or "(no stage)", "created": us(p["created"])})
        for j, q in enumerate(lw):
            if j not in taken:
                gone.append({"name": q["name"], "agent": q["agent"], "stage": q["stage"] or "(no stage)"})
        last_counts = Counter(q["stage"] for q in lw)
        per_stage = []
        stuck = []
        all_stages = sorted(set(stage_counts) | set(last_counts), key=stage_sort)
        for s in all_stages:
            now_ids = [i for i, p in enumerate(people) if p["stage"] == s]
            entered = sum(1 for i in now_ids if i not in pairs or lw[pairs[i]]["stage"] != s)
            last_ids = [j for j, q in enumerate(lw) if q["stage"] == s]
            inv = {v: k for k, v in pairs.items()}
            left = sum(1 for j in last_ids if j not in inv or people[inv[j]]["stage"] != s)
            per_stage.append({"stage": s or "(no stage)", "last_week": last_counts[s], "now": stage_counts[s],
                              "entered": entered, "left": left})
            cls = classify_stage(s, team_stages)[0]
            if s and cls in PIPELINE and stage_counts[s] > 0 and entered == 0 and left == 0:
                stuck.append({"stage": s, "count": stage_counts[s], "people": [people[i]["name"] for i in now_ids],
                              "agents": sorted({people[i]["agent"] for i in now_ids}), "ids": now_ids})
        movement = {"file": L["file"], "matched": len(pairs), "matched_by": dict(how), "changes": changes, "new": new,
                    "gone": gone, "per_stage": per_stage, "stuck": stuck}
    else:
        flags.append("Last week's People export was not attached: what moved, and list 4 (stages with no movement), were not run. "
                     "Nothing in this review says anything moved.")

    # ---------------- aging per person
    for p in people:
        if p["last_comm"]:
            p["comm_days"], p["comm_math"] = days_text(as_of, p["last_comm"])
        else:
            p["comm_days"], p["comm_math"] = None, ""
        p["unusable"] = bool(p.get("last_comm_future") or p.get("last_comm_bad"))
        p["stale"] = "last_comm" in P["has"] and not p["unusable"] and (p["comm_days"] is None or p["comm_days"] > n_days)

    def comm_text(p):
        if p.get("last_comm_future"):
            return f"Last Communication {p['last_comm_future']} is after the as-of date (not used)"
        if p.get("last_comm_bad"):
            return f"Last Communication is not a date ({p['last_comm_bad']}; not used)"
        if p["last_comm"] is None:
            return "no communication logged"
        return f"last communication {us(p['last_comm'])}: {p['comm_math']}"

    def comm_short(p):
        if p["unusable"]:
            return "Last Communication can't be used"
        if p["last_comm"] is None:
            return "no communication logged"
        return f"last communication {us(p['last_comm'])}, {p['comm_days']} days ago"

    def activity_text(p):
        if p["last_activity"] and p["last_comm"] is None and not p["unusable"]:
            return f"the lead's own Last Activity is {us(p['last_activity'])}"
        if p["last_activity"] and p["last_comm"] and p["last_activity"] > p["last_comm"]:
            return f"the lead's own Last Activity is {us(p['last_activity'])}, after the last communication"
        return ""

    # ---------------- decision lists
    d1, d2, d3, d4 = [], [], [], []
    in_list = set()
    for dl in open_deals:
        if dl["close"] and dl["close"] < as_of:
            n, math = days_text(as_of, dl["close"])
            item = {"deal": dl["name"], "pipeline": dl["pipeline"], "stage": dl["stage"], "close": us(dl["close"]),
                    "days_past": n, "math": math, "price": dl["price"] or "(empty)", "agents": dl["agents"] or "(none listed)",
                    "row": dl["row"]}
            if dl.get("entered"):
                item["in_stage_days"], item["in_stage_math"] = days_text(as_of, dl["entered"])
                item["entered"] = us(dl["entered"])
            if dl.get("person") is not None:
                p = people[dl["person"]]
                item["person"] = p["name"]
                item["person_stage"] = p["stage"]
                item["person_comm"] = comm_text(p)
                item["person_comm_short"] = comm_short(p)
                item["agent"] = p["agent"]
                in_list.add(dl["person"])
            else:
                item["agent"] = (dl["agents"].split(",")[0].strip() if dl["agents"] else "Unassigned")
            d1.append(item)
    d1.sort(key=lambda x: -x["days_past"])
    ran_d23 = "last_comm" in P["has"]
    for i, p in enumerate(people):
        if not ran_d23 or i in in_list or not p["stale"]:
            continue
        if p["class"] == "appointment":
            has_deal = any(d["class"] == "open" and not d["archived"] for d in person_deals.get(i, []))
            same = None
            if L:
                same = i in pairs and L["people"][pairs[i]]["stage"] == p["stage"]
            if (deal_source is None or not has_deal) and (L is None or same):
                why = [comm_text(p)]
                why.append("no open deal in the export" if deal_source else "deal check not run (no deal data)")
                why.append("same stage as last week's export" if L else "movement check not run (no last week's export)")
                d2.append({"name": p["name"], "stage": p["stage"], "agent": p["agent"], "why": why, "days": p["comm_days"],
                           "short": comm_short(p),
                           "activity": activity_text(p), "row": p["row"]})
                in_list.add(i)
                continue
        if (p["class"] in ACTIVE) or (p["hot"] and p["class"] not in {"closed", "out", "blank", "unknown", "other"}):
            d3.append({"name": p["name"], "stage": p["stage"], "agent": p["agent"], "hot": p["hot"], "comm": comm_text(p),
                       "short": comm_short(p),
                       "days": p["comm_days"], "activity": activity_text(p), "row": p["row"],
                       "has_deal": bool(person_deals.get(i))})
            in_list.add(i)
    d2.sort(key=lambda x: -(x["days"] if x["days"] is not None else 10**6))
    d3.sort(key=lambda x: -(x["days"] if x["days"] is not None else 10**6))
    future_comm_active = [p["name"] for p in people if p["unusable"] and (p["class"] in ACTIVE or p["hot"])]
    if movement:
        for s in movement["stuck"]:
            d4.append({"stage": s["stage"], "count": s["count"], "people": s["people"], "agents": s["agents"],
                       "also_above": [people[i]["name"] for i in s["ids"] if i in in_list], "ids": s["ids"]})

    # ---------------- pipeline by stage
    by_stage = []
    for s in stages_sorted:
        grp = [p for p in people if p["stage"] == s]
        within = sum(1 for p in grp if p["comm_days"] is not None and p["comm_days"] <= n_days)
        over = sum(1 for p in grp if p["comm_days"] is not None and p["comm_days"] > n_days)
        none = sum(1 for p in grp if p["last_comm"] is None and not p["unusable"])
        dated = [p for p in grp if p["last_comm"]]
        oldest = ""
        if dated:
            o = min(dated, key=lambda p: (p["last_comm"], p["name"]))
            oldest = f"{o['name']}: {us(o['last_comm'])}, {o['comm_math']}"
        row = {"stage": s or "(no stage)", "read_as": CLASS_LABEL[reading[s][0]], "now": len(grp), "within": within,
               "over": over, "none": none, "unusable": sum(1 for p in grp if p["unusable"]), "oldest": oldest}
        if movement:
            ps = next(x for x in movement["per_stage"] if x["stage"] == (s or "(no stage)"))
            row["last_week"] = ps["last_week"]
        by_stage.append(row)
    if movement:
        for ps in movement["per_stage"]:
            if ps["now"] == 0:
                by_stage.append({"stage": ps["stage"], "read_as": CLASS_LABEL[classify_stage(ps["stage"], team_stages)[0]],
                                 "now": 0, "within": 0, "over": 0, "none": 0, "unusable": 0, "oldest": "", "last_week": ps["last_week"]})
    active_n = sum(1 for p in people if p["class"] in ACTIVE)
    pipeline_n = sum(1 for p in people if p["class"] in PIPELINE)

    deals_by_stage = []
    if deal_items and deal_source == "deals":
        groups = defaultdict(list)
        for d in deal_items:
            if not d["archived"]:
                groups[(d["pipeline"], d["stage"])].append(d)
        for (pl, st), grp in sorted(groups.items(), key=lambda kv: (kv[0][0], {"open": 0, "closed": 1, "lost": 2}[kv[1][0]["class"]], kv[0][1])):
            dated = [d for d in grp if d["entered"]]
            longest = ""
            if dated and grp[0]["class"] == "open":
                o = min(dated, key=lambda d: (d["entered"], d["name"]))
                longest = f"{o['name']}: entered {us(o['entered'])}, {days_text(as_of, o['entered'])[1]}"
            past = sum(1 for d in grp if d["class"] == "open" and d["close"] and d["close"] < as_of)
            deals_by_stage.append({"pipeline": pl, "stage": st, "read_as": grp[0]["class"], "how": grp[0]["how"],
                                   "deals": len(grp), "longest": longest, "past_close": past,
                                   "no_close": sum(1 for d in grp if d["class"] == "open" and d["close"] is None)})
    archived_n = sum(1 for d in deal_items if d["archived"])

    # ---------------- conversion for the period
    cohort = [p for p in people if p["created"] and pstart <= p["created"] <= pend]
    no_created = sum(1 for p in people if p["created"] is None)

    def conv(keyfn):
        groups = defaultdict(list)
        for p in cohort:
            groups[keyfn(p)].append(p)
        out = []
        for k in sorted(groups, key=lambda k: (-len(groups[k]), k)):
            grp = groups[k]
            row = {"key": k, "created": len(grp)}
            for label, classes in REACHED.items():
                n = sum(1 for p in grp if p["class"] in classes)
                row[label] = {"n": n, "d": len(grp), "text": rate(n, len(grp))}
            row["now_out"] = sum(1 for p in grp if p["class"] in {"nurture", "out"})
            out.append(row)
        tot = {"key": "All", "created": len(cohort)}
        for label, classes in REACHED.items():
            n = sum(1 for p in cohort if p["class"] in classes)
            tot[label] = {"n": n, "d": len(cohort), "text": rate(n, len(cohort))}
        tot["now_out"] = sum(1 for p in cohort if p["class"] in {"nurture", "out"})
        out.append(tot)
        return out

    by_source = conv(lambda p: p["source"] or "(no source)")
    by_agent_conv = conv(lambda p: p["agent"])

    # ---------------- by agent, whole export
    agents = sorted({p["agent"] for p in people}, key=lambda a: (a == "Unassigned", a))
    by_agent = []
    for a in agents:
        grp = [p for p in people if p["agent"] == a]
        idx = {i for i, p in enumerate(people) if p["agent"] == a}
        row = {"agent": a, "records": len(grp)}
        for c in ("new", "attempted", "spoke", "appointment", "client", "contract"):
            row[c] = sum(1 for p in grp if p["class"] == c)
        row["active"] = sum(1 for p in grp if p["class"] in ACTIVE)
        row["active_over"] = sum(1 for p in grp if p["class"] in ACTIVE and p["comm_days"] is not None and p["comm_days"] > n_days)
        row["active_none"] = sum(1 for p in grp if p["class"] in ACTIVE and p["last_comm"] is None and not p["unusable"])
        row["d1"] = sum(1 for x in d1 if x.get("agent") == a)
        row["d2"] = sum(1 for x in d2 if x["agent"] == a)
        row["d3"] = sum(1 for x in d3 if x["agent"] == a)
        row["d4"] = sum(1 for x in d4 for i in x["ids"] if i in idx)
        row["open_deals"] = sum(1 for i in idx for d in person_deals.get(i, []) if d["class"] == "open" and not d["archived"])
        by_agent.append(row)

    # ---------------- questions for each agent
    questions = defaultdict(list)
    for x in d1:
        q = (f"{x['deal']} ({x['stage']}, expected close {x['close']}, {x['days_past']} days past): "
             f"what is the new expected close date, and what is it waiting on?")
        questions[x["agent"]].append(q)
    for x in d2:
        questions[x["agent"]].append(f"{x['name']} ({x['stage']}, {x['short']}, no next step in the export): what is the next step, and when?")
    for x in d3:
        extra = f"; {x['activity']}" if x["activity"] else ""
        hot = f", tagged {x['hot']}" if x["hot"] else ""
        questions[x["agent"]].append(f"{x['name']} ({x['stage']}{hot}, {x['short']}{extra}): what is the plan for this week?")
    for x in d4:
        for a in x["agents"]:
            names = [people[i]["name"] for i in x["ids"] if people[i]["agent"] == a and i not in in_list]
            if not names:
                continue
            questions[a].append(f"{' and '.join(names)} ({x['stage']} in both weeks' exports; no one entered or left {x['stage']} this week): "
                                f"what is the next step, and when?")
    questions = {a: questions[a] for a in sorted(questions, key=lambda a: (a == "Unassigned", a))}

    odd.sort(key=lambda x: (x["file"] != P["file"], x["file"], x["row"]))
    return {
        "as_of": us(as_of), "as_of_given": as_of_given, "days": n_days, "period": [us(pstart), us(pend)],
        "period_given": bool(args.period_start or args.period_end),
        "hot_tags": hot_tags,
        "files": [{"what": P["label"], "file": P["file"], "rows": P["rows"], "header_row": P["header_row"], "columns": P["columns"]}]
                 + ([{"what": L["label"], "file": L["file"], "rows": L["rows"], "header_row": L["header_row"], "columns": L["columns"]}] if L else [])
                 + ([{"what": "Deals export", "file": D["file"], "rows": D["rows"], "header_row": D["header_row"], "columns": D["columns"]}] if D else []),
        "deal_source": deal_source, "flags": flags, "stage_reading": stage_reading, "to_confirm": to_confirm,
        "totals": {"records": len(people), "pipeline": pipeline_n, "active": active_n},
        "by_stage": by_stage, "deals_by_stage": deals_by_stage, "archived_deals": archived_n,
        "open_deals_no_close": [d["name"] for d in no_close],
        "movement": movement, "d1": d1, "d2": d2, "d3": d3, "d4": [{k: v for k, v in x.items() if k != "ids"} for x in d4],
        "future_comm_active": future_comm_active,
        "cohort": len(cohort), "no_created": no_created, "by_source": by_source, "by_agent_conv": by_agent_conv,
        "by_agent": by_agent, "questions": questions, "odd": odd,
        "ran": {"d1": deal_source is not None, "d2": ran_d23, "d3": ran_d23, "d4": movement is not None},
    }


def report_md(o):
    n = o["days"]
    out = [f"# Pipeline Review Data: As of {o['as_of']}", "",
           "Made by the review code. Every count, date and rate below comes from the files named here. "
           "No email address or phone number is shown anywhere.", ""]
    out += ["## Files Read", ""]
    for f in o["files"]:
        out.append(f"- **{f['what']}:** {f['file']}, {f['rows']} rows (header on row {f['header_row']}).")
        out.append("  Columns used: " + "; ".join(f"{k} = {v}" for k, v in f["columns"].items()) + ".")
    out += ["", "## Settings", "",
            f"- As of: {o['as_of']}" + ("" if o["as_of_given"] else " (today: no as-of date was given)") + ".",
            f"- Nothing logged in more than {n} days counts as stale (default 7 unless set).",
            f"- Conversion period: people with a Date Added from {o['period'][0]} through {o['period'][1]}"
            + (" (as given)." if o["period_given"] else " (the default: the 90 days ending on the as-of date)."),
            f"- Hot means a tag matching: {', '.join(o['hot_tags'])}.", ""]
    fl = [f"- {x}" for x in o["flags"]]
    if o["odd"]:
        fl.append(f"- {len(o['odd'])} odd row(s), listed under Odd Rows. None was fixed.")
    out += ["## Flags", ""] + (fl or ["- None."])
    out += ["", "## Stage Reading", "", table(["Stage", "Records", "Read as", "How read"],
                                              [[r["stage"], r["records"], r["read_as"], r["how"]] for r in o["stage_reading"]]), ""]
    t = o["totals"]
    out += ["## Pipeline by Stage", "",
            f"{t['records']} records; {t['pipeline']} in pipeline stages (new lead through under contract), {t['active']} of them active "
            f"(spoke, appointment, active client, under contract).", ""]
    bad = any(r["unusable"] for r in o["by_stage"])
    head = ["Stage", "Read as", "Now"] + (["Last week"] if o["movement"] else []) + \
           [f"Last communication within {n} days", f"More than {n} days", "None logged"] + \
           (["Date can't be used"] if bad else []) + ["Oldest last communication"]
    rows = []
    for r in o["by_stage"]:
        rows.append([r["stage"], r["read_as"], r["now"]] + ([r["last_week"]] if o["movement"] else []) +
                    [r["within"], r["over"], r["none"]] + ([r["unusable"]] if bad else []) + [r["oldest"]])
    out += [table(head, rows), ""]
    if o["deals_by_stage"]:
        has_pl = any(r["pipeline"] for r in o["deals_by_stage"])
        out += ["## Deals by Stage", "", table((["Pipeline"] if has_pl else []) + ["Stage", "Read as", "How read", "Deals", "Longest in stage (open deals)",
                                                "Past expected close date", "No close date"],
                                             [([r["pipeline"]] if has_pl else []) + [r["stage"], r["read_as"], r["how"], r["deals"], r["longest"],
                                               r["past_close"], r["no_close"]] for r in o["deals_by_stage"]]), ""]
        if not has_pl:
            out += ["The Deals export has no Pipeline column, so buyer and seller deals are counted together.", ""]
        if o["archived_deals"]:
            out.append(f"{o['archived_deals']} archived deal(s) left out of every check.")
            out.append("")
    if o["open_deals_no_close"]:
        out += [f"Open deals with no close date (list 1 can't check them): {'; '.join(o['open_deals_no_close'])}.", ""]
    m = o["movement"]
    out += ["## What Moved Since Last Week", ""]
    if not m:
        out += ["Not run: last week's People export was not attached.", ""]
    else:
        out += [f"Compared with {m['file']}: {m['matched']} people matched (" +
                ", ".join(f"{v} by {k}" for k, v in m["matched_by"].items()) + ").", ""]
        out += [f"### Stage Changes ({len(m['changes'])})", ""]
        out += [table(["Person", "Agent", "Last week", "This week"], [[c["name"], c["agent"], c["from"], c["to"]] for c in m["changes"]])
                if m["changes"] else "None.", ""]
        out += [f"### New in This Week's Export ({len(m['new'])})", ""]
        out += [table(["Person", "Agent", "Stage", "Date Added"], [[c["name"], c["agent"], c["stage"], c["created"]] for c in m["new"]])
                if m["new"] else "None.", ""]
        out += [f"### In Last Week's Export, Not in This Week's ({len(m['gone'])})", "",
                "Deleted, merged, moved out of view or outside the export's filter: the export doesn't say which.", ""]
        out += [table(["Person", "Agent last week", "Stage last week"], [[c["name"], c["agent"], c["stage"]] for c in m["gone"]])
                if m["gone"] else "None.", ""]
        out += ["### Stage Counts, Last Week and This Week", "",
                table(["Stage", "Last week", "This week", "Entered", "Left"],
                      [[p["stage"], p["last_week"], p["now"], p["entered"], p["left"]] for p in m["per_stage"]]), ""]
    out += ["## Needs a Decision This Week", ""]
    cnt = lambda k, unit: (f"{len(o[k])} {unit if len(o[k]) != 1 else unit.rstrip('s').replace('peopl', 'person')}" if o["ran"][k] else "not run")
    out += [f"List 1: {cnt('d1', 'deals')}. List 2: {cnt('d2', 'people')}. List 3: {cnt('d3', 'people')}. "
            f"List 4: {cnt('d4', 'stages')}.", ""]
    out += [f"### 1. Deals Past Their Expected Close Date ({len(o['d1'])})" if o["ran"]["d1"] else "### 1. Deals Past Their Expected Close Date", ""]
    if not o["ran"]["d1"]:
        out += ["Not run: no deal data.", ""]
    elif not o["d1"]:
        out += ["None.", ""]
    else:
        for x in o["d1"]:
            line = (f"- **{x['deal']}** (row {x['row']}; {x['stage']}{', ' + x['pipeline'] if x['pipeline'] else ''}; agent {x['agents']}): "
                    f"expected close {x['close']}, {x['days_past']} days past: {x['math']}.")
            if x.get("in_stage_days") is not None:
                line += f" In this stage since {x['entered']}: {x['in_stage_math']}."
            line += f" Price as exported: {x['price']}."
            if x.get("person"):
                line += f" Person: {x['person']}, {x['person_stage']}, {x['person_comm']}."
            out.append(line)
        out.append("")
    out += [f"### 2. Appointment Set, No Next Step in the Export ({len(o['d2'])})" if o["ran"]["d2"] else "### 2. Appointment Set, No Next Step in the Export", ""]
    if not o["ran"]["d2"]:
        out += ["Not run: no Last Communication column.", ""]
    elif not o["d2"]:
        out += ["None.", ""]
    else:
        for x in o["d2"]:
            out.append(f"- **{x['name']}** ({x['stage']}; agent {x['agent']}): " + "; ".join(x["why"]) +
                       (f"; {x['activity']}" if x["activity"] else "") + ".")
        out.append("")
    out += [f"### 3. Hot or Active, Nothing Logged in More Than {n} Days" + (f" ({len(o['d3'])})" if o["ran"]["d3"] else ""), ""]
    if not o["ran"]["d3"]:
        out += ["Not run: no Last Communication column.", ""]
    elif not o["d3"]:
        out += ["None.", ""]
    else:
        for x in o["d3"]:
            out.append(f"- **{x['name']}** ({x['stage']}{', tagged ' + x['hot'] if x['hot'] else ''}; agent {x['agent']}): {x['comm']}"
                       + (f"; {x['activity']}" if x["activity"] else "") + ".")
        out.append("")
    if o["future_comm_active"]:
        out += [f"Left out of lists 2 and 3 because their Last Communication can't be used (after the as-of date or not a date; see Odd Rows): {', '.join(o['future_comm_active'])}.", ""]
    out += ["### 4. Stages With No Movement Since Last Week" + (f" ({len(o['d4'])})" if o["ran"]["d4"] else ""), ""]
    if not o["ran"]["d4"]:
        out += ["Not run: last week's People export was not attached.", ""]
    elif not o["d4"]:
        out += ["None: every pipeline stage with people in it had someone enter or leave.", ""]
    else:
        for x in o["d4"]:
            also = f" (also above: {', '.join(x['also_above'])})" if x["also_above"] else ""
            out.append(f"- **{x['stage']}:** {x['count']} people, the same as last week, no one entered or left: {', '.join(x['people'])}{also}.")
        out.append("")
    out += [f"## Conversion by Lead Source", "",
            f"People with a Date Added from {o['period'][0]} through {o['period'][1]}: {o['cohort']}. Each rate is by the stage each person is in now.", ""]
    labels = list(REACHED)
    out += [table(["Lead source", "Added"] + labels + ["Now in Nurture, Rejected or Trash"],
                  [[r["key"], r["created"]] + [r[lb]["text"] for lb in labels] + [r["now_out"]] for r in o["by_source"]]), ""]
    few = [r["key"] for r in o["by_source"] if r["key"] != "All" and r["created"] < 5]
    if few:
        out += [f"Fewer than 5 people added in the period, too few to compare: {', '.join(few)}.", ""]
    out += ["## Conversion by Agent", "",
            table(["Agent", "Added"] + labels + ["Now in Nurture, Rejected or Trash"],
                  [[r["key"], r["created"]] + [r[lb]["text"] for lb in labels] + [r["now_out"]] for r in o["by_agent_conv"]]), ""]
    few = [r["key"] for r in o["by_agent_conv"] if r["key"] != "All" and r["created"] < 5]
    if few:
        out += [f"Fewer than 5 people added in the period, too few to compare: {', '.join(few)}.", ""]
    if o["no_created"]:
        out += [f"{o['no_created']} record(s) with no usable Date Added (empty, not a date, or after the as-of date) are left out of conversion.", ""]
    out += ["## By Agent (Whole Export)", "",
            table(["Agent", "Records", "New lead", "Attempted", "Spoke", "Appointment", "Active client", "Under contract",
                   "Active (spoke through under contract)", f"Active, more than {n} days", "Active, none logged", "Open deals", "List 1", "List 2", "List 3", "List 4 (people)"],
                  [[r["agent"], r["records"], r["new"], r["attempted"], r["spoke"], r["appointment"], r["client"], r["contract"],
                    r["active"], r["active_over"], r["active_none"], r["open_deals"], r["d1"], r["d2"], r["d3"], r["d4"]] for r in o["by_agent"]]), ""]
    out += ["## Questions for Each Agent", ""]
    if not o["questions"]:
        out += ["None: nothing is on the decision list.", ""]
    for a, qs in o["questions"].items():
        out.append(f"### {a}" + (" (for the team leader)" if a == "Unassigned" else ""))
        out.append("")
        out += [f"{k}. {q}" for k, q in enumerate(qs, 1)]
        out.append("")
    out += ["## Odd Rows (Flagged, Not Fixed)", ""]
    out += [table(["File", "Row", "Name", "What's odd", "How it was treated"],
                  [[x["file"], x["row"], x["name"], x["what"], x["treated"]] for x in o["odd"]]) if o["odd"] else "None.", ""]
    return "\n".join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description="FUB Pipeline Review")
    ap.add_argument("--people", required=True)
    ap.add_argument("--deals")
    ap.add_argument("--last-week")
    ap.add_argument("--as-of")
    ap.add_argument("--days", type=int, default=7)
    ap.add_argument("--period-start")
    ap.add_argument("--period-end")
    ap.add_argument("--rules")
    ap.add_argument("--out", default=".")
    args = ap.parse_args(argv)
    o = analyze(args)
    md = report_md(o)
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "pipeline_review.md"), "w", encoding="utf-8") as f:
        f.write(md + "\n")
    with open(os.path.join(args.out, "pipeline_review.json"), "w", encoding="utf-8") as f:
        json.dump(o, f, indent=1, default=str)
    print(md)


if __name__ == "__main__":
    main()
```
