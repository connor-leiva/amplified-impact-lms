# Analysis Code

Last verified: 2026-11-08. The Follow Up Boss column names, default stages and export behavior this code relies on come from Follow Up Boss's help center: Export Contacts to a Spreadsheet (https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet), Changing a Lead Stage (https://help.followupboss.com/hc/en-us/articles/360012456793-Changing-a-Lead-Stage) and Importing Contacts Overview (https://help.followupboss.com/hc/en-us/articles/4402323033751-Importing-Contacts-Overview). The day limits are this skill's defaults, explained in the health rules.

Run this code with Python 3 on the uploaded export. It uses only Python's standard library (plus openpyxl for an .xlsx file). Do not paste it into the conversation, and never print contact rows: the code keeps names, emails and phone numbers out of everything except the worklist file.

Usage:

    python3 dhc.py EXPORT.csv [--transactions CLOSED.csv] [--rules rules.json] [--as-of YYYY-MM-DD] [--out FOLDER]

It prints the full report and writes three files to FOLDER: health_report.md and health_report.json (counts and percentages only) and cleanup_worklist.csv (one row per record that needs work, the only file with names, emails and phone numbers).

```python
#!/usr/bin/env python3
# Database Health Check analysis (Amplified Impact). Standard library only.
#
# Reads one CRM contact export (CSV or XLSX; Follow Up Boss People export by default, other CRMs mapped
# by column name) and writes three files to --out:
#   health_report.md       counts and percentages only: no contact names, emails or phone numbers
#   health_report.json     the same numbers, for drafting
#   cleanup_worklist.csv   one row per record that needs work (the only file with names and phones)
#
# Usage:
#   python3 dhc.py EXPORT.csv [--transactions CLOSED.csv] [--rules rules.json] [--as-of YYYY-MM-DD] [--out DIR]
#
# rules.json is optional. Build it only from the team's own documents or the user's message, e.g.
#   {"stale_days": 60, "stage_classes": {"Warm": "active_lead"}, "past_client_tags": ["PC"],
#    "pond_after_days": 45, "columns": {"stage": "Lead Status"}}

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

DEFAULTS = {
    "stale_days": 90,             # active-stage contact with no communication for this long
    "past_client_days": 365,      # past client or sphere with no communication for this long
    "new_lead_days": 60,          # still in a new-lead stage this long after it was added
    "never_contacted_days": 30,   # added this long ago with no communication on record
    "nurture_quiet_days": 180,    # nurture contact with no communication for this long
    "back_on_site_days": 30,      # lead activity this recent while communication is older than this
    "recent_close_days": 365,     # a closed deal this recent should not sit in an active stage
    "archive_days": 730,          # unreachable and untouched this long: archive candidate
    "shared_key_limit": 5,        # an email or phone on more records than this is shared, not a duplicate
}

NULLS = {"", "n/a", "na", "none", "null", "nil", "-", "--", "unknown", "not provided", "no email", "no phone", "0"}

# ------------------------------------------------------------------ columns

def norm(h):
    h = str(h or "").replace("﻿", "").strip().lower()
    h = re.sub(r"[_\-:/.]+", " ", h)
    h = re.sub(r"[^a-z0-9#& ]", "", h)
    return re.sub(r"\s+", " ", h).strip()

SINGLE = {
    "id": ["id", "contact id", "person id", "lead id", "record id", "contactid", "crm id", "fub id", "client id", "customer id"],
    "name": ["name", "full name", "contact name", "lead name", "display name", "client name"],
    "first": ["first name", "firstname", "first", "given name"],
    "last": ["last name", "lastname", "last", "surname", "family name"],
    "stage": ["stage", "lead stage", "contact stage", "status", "lead status", "contact status", "pipeline stage", "lifecycle stage", "lead type stage"],
    "source": ["lead source", "source", "origin", "lead origin", "contact source", "source name"],
    "agent": ["assigned to", "assigned agent", "agent", "owner", "contact owner", "lead owner", "assigned user", "assigned", "agent name", "assignee"],
    "pond": ["pond", "lead pond", "assigned pond"],
    "created": ["date added", "created", "created date", "date created", "created at", "create date", "added", "date entered", "created on", "added on"],
    "last_comm": ["last communication", "last contacted", "last contact", "last contact date", "last touch", "last touched",
                  "last communication date", "date last contacted", "last outreach", "last contacted date", "last conversation"],
    "inactive": ["inactive"],
    "last_activity": ["last activity", "last activity date", "last website visit", "last visit", "last site visit",
                      "last engagement", "last web activity", "last seen"],
    "is_contacted": ["is contacted", "contacted"],
    "last_assigned": ["last assigned", "date assigned", "assigned date"],
    "tags": ["tags", "tag", "labels", "label", "groups", "lists"],
    "timeframe": ["timeframe", "time frame", "timeframe to move"],
    "deal_stage": ["deal stage", "deal status", "transaction status"],
    "deal_close": ["deal close date", "close date", "closing date", "closed date", "deal closed date"],
}
COMM_PARTS = ["last call", "last text", "last email", "last sent email", "last call made", "last text sent",
              "last email sent", "last received email", "last call received", "last text received"]
CONTENT = ["calls", "texts", "notes"]  # FUB all-columns export: recent calls, texts and notes (dates only are read)
EMAIL_RE = re.compile(r"^(?:(?:primary|secondary|work|personal|home|other|alternate|alt|business) )?e ?mail(?: address)?(?: \d+)?$")
PHONE_RE = re.compile(r"^(?:(?:primary|secondary|work|home|mobile|cell|other|business|alt|alternate|main) )?(?:phone|mobile|cell|telephone)(?: phone)?(?: number)?(?: \d+)?$")
CONSENT_RE = re.compile(r"(?:(?:sms|text|texting|txt|mobile)\b.*(?:consent|opt ?in|optin|permission|ok to|allowed))|(?:(?:consent|opt ?in|optin|permission)\b.*(?:sms|text|texting|txt))|tcpa")
TEXT_OUT_RE = re.compile(r"(?:(?:sms|text|texting|txt)\b.*(?:opt ?out|optout|unsubscrib|stop|blocked))|^dnd$|do not disturb|do not text")
EMAIL_OUT_RE = re.compile(r"(?:e ?mail\b.*(?:opt ?out|optout|unsubscrib))|^unsubscribed$|^email status$|do not email")
DNC_RE = re.compile(r"^(?:do not call|dnc|dnc status|national dnc|on dnc list)$")
SENSITIVE_RE = re.compile(r"ssn|social security|credit|income|salary|loan|account (?:number|#)|routing|birth|\bdob\b|\bage\b|marital|children|\bkids\b|religio|\brace\b|ethnic|gender|disab|veteran|nationality")
FUB_MARKERS = {"date added", "lead source", "assigned to", "is contacted", "last assigned", "email 1", "phone 1", "listing price"}


def map_columns(headers, overrides):
    n = [norm(h) for h in headers]
    cmap = {}
    used = set()
    for key, names in SINGLE.items():
        if key in overrides:
            want = overrides[key]
            idx = [i for i, h in enumerate(headers) if h == want or norm(h) == norm(want)]
            if idx:
                cmap[key] = idx[0]
                used.add(idx[0])
            continue
        for name in names:
            hit = [i for i, h in enumerate(n) if h == name and i not in used and not h.startswith("relationship")]
            if hit:
                cmap[key] = hit[0]
                used.add(hit[0])
                break
    multi = {"emails": [], "phones": [], "comm_parts": [], "content": [], "consent": [], "text_out": [],
             "email_out": [], "dnc": [], "sensitive": [], "relationship": []}
    for i, h in enumerate(n):
        if h.startswith("relationship"):
            multi["relationship"].append(i)
            continue
        if i in used:
            continue
        if h.endswith(" type") or h.endswith(" label"):
            continue
        if EMAIL_RE.match(h):
            multi["emails"].append(i)
        elif PHONE_RE.match(h):
            multi["phones"].append(i)
        elif h in COMM_PARTS:
            multi["comm_parts"].append(i)
        elif h in CONTENT:
            multi["content"].append(i)
        elif CONSENT_RE.search(h):
            multi["consent"].append(i)
        elif TEXT_OUT_RE.search(h):
            multi["text_out"].append(i)
        elif EMAIL_OUT_RE.search(h):
            multi["email_out"].append(i)
        elif DNC_RE.match(h):
            multi["dnc"].append(i)
        elif SENSITIVE_RE.search(h):
            multi["sensitive"].append(i)
    for key in ("emails", "phones", "consent"):
        if key in overrides:
            wanted = overrides[key] if isinstance(overrides[key], list) else [overrides[key]]
            multi[key] = [i for i, h in enumerate(headers) if h in wanted or norm(h) in {norm(w) for w in wanted}]
    is_fub = len(FUB_MARKERS & set(n)) >= 4
    return cmap, multi, is_fub

# ------------------------------------------------------------------ loading

def read_rows(path):
    if path.lower().endswith((".xlsx", ".xlsm")):
        import openpyxl
        wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        ws = wb.worksheets[0]
        rows = []
        for row in ws.iter_rows(values_only=True):
            rows.append(["" if v is None else (v if isinstance(v, (datetime, date)) else str(v)) for v in row])
        return rows
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    sample = text[:20000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    return list(csv.reader(io.StringIO(text), dialect))


def find_header(rows):
    known = set()
    for names in SINGLE.values():
        known.update(names)
    for i, row in enumerate(rows[:15]):
        cells = [norm(c) for c in row if str(c).strip()]
        hits = sum(1 for c in cells if c in known or EMAIL_RE.match(c) or PHONE_RE.match(c))
        if len(cells) >= 3 and hits >= 2:
            return i
    for i, row in enumerate(rows[:15]):
        if sum(1 for c in row if str(c).strip()) >= 3:
            return i
    return 0

# ------------------------------------------------------------------ values

MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}
DATE_PATTERNS = [
    re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})"),
    re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b"),
    re.compile(r"\b([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})\b"),
    re.compile(r"\b(\d{1,2})[ -]([A-Za-z]{3,9})[ -](\d{2,4})\b"),
]


def _mk(y, m, d):
    try:
        y = int(y)
        if y < 100:
            y += 2000
        return date(y, int(m), int(d))
    except (ValueError, TypeError):
        return None


def parse_date(v):
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v or "").strip()
    if not s or s.lower() in NULLS:
        return None
    m = DATE_PATTERNS[0].match(s)
    if m:
        return _mk(m.group(1), m.group(2), m.group(3))
    m = DATE_PATTERNS[1].match(s)
    if m:
        return _mk(m.group(3), m.group(1), m.group(2))
    m = DATE_PATTERNS[2].match(s)
    if m and m.group(1)[:3].lower() in MONTHS:
        return _mk(m.group(3), MONTHS[m.group(1)[:3].lower()], m.group(2))
    m = DATE_PATTERNS[3].match(s)
    if m and m.group(2)[:3].lower() in MONTHS:
        return _mk(m.group(3), MONTHS[m.group(2)[:3].lower()], m.group(1))
    return None


def latest_date_in_text(s, as_of):
    best = None
    s = str(s or "")
    for pat, order in ((DATE_PATTERNS[0], "ymd"), (DATE_PATTERNS[1], "mdy"), (DATE_PATTERNS[2], "Mdy"), (DATE_PATTERNS[3], "dMy")):
        for m in pat.finditer(s):
            g = m.groups()
            if order == "ymd":
                d = _mk(g[0], g[1], g[2])
            elif order == "mdy":
                d = _mk(g[2], g[0], g[1])
            elif order == "Mdy":
                d = _mk(g[2], MONTHS.get(g[0][:3].lower()), g[1]) if g[0][:3].lower() in MONTHS else None
            else:
                d = _mk(g[2], MONTHS.get(g[1][:3].lower()), g[0]) if g[1][:3].lower() in MONTHS else None
            if d and d <= as_of and (best is None or d > best):
                best = d
    return best


def truthy(v):
    s = str(v or "").strip().lower()
    if not s or s in {"no", "n", "false", "0", "none", "not given", "unknown", "declined", "revoked", "opted out", "opt out", "no consent"}:
        return False
    return True


def consent_value(v):
    s = str(v or "").strip().lower()
    if not s:
        return None
    if s in {"opted out", "opt out", "optout", "no consent", "not given", "revoked", "declined", "unsubscribed", "stop"}:
        return False
    tok = re.split(r"[\s\-:,;/]+", s)[0]
    if tok in {"no", "n", "false", "0", "declined", "revoked", "none"}:
        return False
    if tok in {"yes", "y", "true", "1", "opted", "optin", "consented", "granted", "given", "ok", "written", "signed"}:
        return True
    if s in {"opt in", "opted in"} or parse_date(s) or latest_date_in_text(s, date(2999, 1, 1)):
        return True
    return None

PLACEHOLDER_LOCAL = {"noemail", "no email", "none", "na", "n a", "test", "unknown", "noreply", "no reply", "donotreply",
                     "fake", "nobody", "asdf", "nomail", "no", "null", "xx", "xxx", "email", "notprovided"}
PLACEHOLDER_DOMAINS = {"example.com", "example.org", "example.net", "test.com", "none.com", "noemail.com", "nomail.com", "email.con", "gmail.con", "gmial.com", "gamil.com", "yahoo.con", "hotmial.com"}
EMAIL_SYNTAX = re.compile(r"^[a-z0-9._%+'\-]+@[a-z0-9\-]+(?:\.[a-z0-9\-]+)*\.[a-z]{2,}$")


def split_multi(v):
    return [p.strip() for p in re.split(r"[,;|\n]+", str(v or "")) if p.strip()]


def email_status(e):
    e = e.strip().lower()
    if not e or e in NULLS:
        return "missing"
    if not EMAIL_SYNTAX.match(e) or ".." in e:
        return "invalid"
    local, domain = e.split("@", 1)
    if re.sub(r"[^a-z]", "", local) in {re.sub(r"[^a-z]", "", p) for p in PLACEHOLDER_LOCAL} or domain in PLACEHOLDER_DOMAINS:
        return "invalid"
    return "ok"


def phone_digits(p):
    s = str(p or "").lower()
    s = re.split(r"(?:ext|x|#)", s)[0]
    d = re.sub(r"\D", "", s)
    if len(d) == 11 and d.startswith("1"):
        d = d[1:]
    return d


def phone_status(p):
    raw = str(p or "").strip().lower()
    if not raw or raw in NULLS:
        return "missing", ""
    d = phone_digits(raw)
    if len(d) != 10 or d[0] in "01" or d[3] in "01" or len(set(d)) == 1:
        return "invalid", d
    return "ok", d

# ------------------------------------------------------------------ stages and tags

DEFAULT_STAGES = {
    # Follow Up Boss default stages (help center, "Changing a Lead Stage")
    "lead": "new", "attempted contact": "active_lead", "spoke with customer": "active_lead",
    "appointment set": "active_lead", "met with customer": "active_lead", "showing homes": "active_client",
    "listing agreement": "active_client", "active listing": "active_client", "submitting offers": "active_client",
    "under contract": "active_client", "nurture": "nurture", "rejected": "inactive", "closed": "past_client",
    "trash": "inactive",
    # common custom stages
    "new": "new", "new lead": "new", "hot prospect": "active_lead", "prospect": "active_lead", "active client": "active_client",
    "pending": "active_client", "past client": "past_client", "past clients": "past_client", "sphere": "sphere", "soi": "sphere",
    "sphere of influence": "sphere", "unresponsive": "inactive", "dead": "inactive", "archived": "inactive", "do not contact": "inactive",
}
CLASS_LABEL = {
    "new": "New lead", "active_lead": "Active lead", "active_client": "Active client", "nurture": "Nurture",
    "past_client": "Past client", "sphere": "Sphere", "inactive": "Inactive (trash, rejected, dead)", "other": "Other (vendor, agent, partner)",
    "unknown": "Not recognized", "blank": "No stage",
}
ACTIVE = {"new", "active_lead", "active_client"}
GUESSES = [
    ("inactive", ["trash", "reject", "dead", "junk", "archiv", "lost", "not interested", "unresponsive", "do not", "bad lead", "spam"]),
    ("past_client", ["past client", "past customer", "former client", "closed", "sold", "post closing"]),
    ("sphere", ["sphere", "soi", "friend", "family"]),
    ("nurture", ["nurture", "long term", "cold", "watch", "drip", "later"]),
    ("active_client", ["contract", "pending", "escrow", "listing", "listed", "offer", "showing", "active client", "under agreement"]),
    ("active_lead", ["appoint", "met ", "spoke", "attempt", "prospect", "hot", "warm", "qualif", "engaged", "contacted", "working", "active"]),
    ("new", ["new", "lead", "unqualified", "inquiry", "fresh"]),
    ("other", ["vendor", "agent", "lender", "partner", "recruit", "builder"]),
]


def classify_stage(stage, team):
    s = norm(stage)
    if not s:
        return "blank", "none"
    for k, v in team.items():
        if norm(k) == s:
            return v, "team"
    if s in DEFAULT_STAGES:
        return DEFAULT_STAGES[s], "default"
    for cls, words in GUESSES:
        if any(w in s + " " for w in words):
            return cls, "guess"
    return "unknown", "none"


def tag_key(t):
    k = str(t).lower().replace("&", " and ")
    k = re.sub(r"[^a-z0-9]+", " ", k).strip()
    words = [w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w for w in k.split()]
    return "".join(words)

PAST_TAGS = {"pastclient", "pc", "closedclient", "formerclient", "pastcustomer", "pastbuyer", "pastseller"}
SPHERE_TAGS = {"sphere", "soi", "sphereofinfluence", "friendsandfamily", "friendandfamily"}


def tag_flags(tags, rules):
    keys = {tag_key(t) for t in tags}
    past = {tag_key(t) for t in rules.get("past_client_tags", [])} | PAST_TAGS
    sph = {tag_key(t) for t in rules.get("sphere_tags", [])} | SPHERE_TAGS
    ponds = {tag_key(t) for t in rules.get("pond_tags", [])}
    consent_tags = {tag_key(t) for t in rules.get("consent", {}).get("tags", [])} | {
        "textconsent", "smsconsent", "textok", "smsoptin", "textoptin", "consentsm", "consenttext", "textingconsent", "smsok"}
    f = {
        "past": bool(keys & past) or any("pastclient" in k for k in keys),
        "sphere": bool(keys & sph),
        "pond": bool(keys & ponds) or any(k.startswith("pond") for k in keys),
        "unsub": any("unsubscrib" in k for k in keys) or any("donotemail" in k for k in keys),
        "bounced": any("bounce" in k for k in keys),
        "dnc": any(k in ("dnc", "donotcall") or "donotcall" in k for k in keys),
        "no_text": any(k in ("donottext", "textoptout", "smsoptout", "optedout", "stop", "donotcontact") for k in keys),
        "consent": bool(keys & consent_tags),
        "import_tag": any(k.startswith("importedstage") or k.startswith("importedagent") for k in keys),
    }
    if any(k == "donotcontact" for k in keys):
        f["unsub"] = f["dnc"] = True
    return f

# ------------------------------------------------------------------ helpers

def lev(a, b, cap=2):
    if abs(len(a) - len(b)) > cap:
        return cap + 1
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        lo = cur[0]
        for j, cb in enumerate(b, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb))
            lo = min(lo, cur[j])
        if lo > cap:
            return cap + 1
        prev = cur
    return prev[-1]


class DSU:
    def __init__(self):
        self.p = {}

    def find(self, x):
        self.p.setdefault(x, x)
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[max(ra, rb)] = min(ra, rb)


def pct(n, d):
    return f"{(100.0 * n / d):.1f}%" if d else "0.0%"


def fmt(n):
    return f"{n:,}"


def clean_name(s):
    return re.sub(r"[^a-z ]", "", str(s or "").lower()).strip()

# ------------------------------------------------------------------ main analysis

def analyze(export, transactions=None, rules=None, as_of=None):
    rules = dict(rules or {})
    cfg = dict(DEFAULTS)
    for k in DEFAULTS:
        if k in rules:
            cfg[k] = int(rules[k])
    as_of = as_of or date.today()
    rows = read_rows(export)
    h = find_header(rows)
    headers = [str(c).strip() for c in rows[h]]
    data = [r for r in rows[h + 1:] if any(str(c).strip() for c in r)]
    first_data_row = h + 2  # spreadsheet row number of the first data row
    cmap, multi, is_fub = map_columns(headers, rules.get("columns", {}))
    team_stages = rules.get("stage_classes", {})

    def get(r, key):
        i = cmap.get(key)
        return r[i] if i is not None and i < len(r) else ""

    # where "last communication" comes from
    touch_source = None
    if "last_comm" in cmap:
        touch_source = f"column '{headers[cmap['last_comm']]}'"
    elif multi["comm_parts"]:
        touch_source = "latest of " + ", ".join(f"'{headers[i]}'" for i in multi["comm_parts"])
    elif "inactive" in cmap:
        touch_source = f"column '{headers[cmap['inactive']]}' (any update, not only communication)"
    elif multi["content"] and is_fub:
        touch_source = "latest date found in " + ", ".join(f"'{headers[i]}'" for i in multi["content"]) + " (approximate)"
    elif "last_activity" in cmap and not is_fub:
        touch_source = f"column '{headers[cmap['last_activity']]}' (your CRM's label; confirm it counts agent outreach)"
    lead_activity_col = "last_activity" in cmap and (is_fub or touch_source is None or "last_comm" in cmap or multi["comm_parts"])

    recs = []
    for k, r in enumerate(data):
        rec = {"row": first_data_row + k}
        rec["id"] = str(get(r, "id")).strip()
        first, last = str(get(r, "first")).strip(), str(get(r, "last")).strip()
        full = str(get(r, "name")).strip()
        if not (first or last) and full:
            parts = full.split()
            first, last = (parts[0], " ".join(parts[1:])) if len(parts) > 1 else (full, "")
        rec["first"], rec["last"] = first, last
        rec["name"] = full or " ".join(p for p in (first, last) if p)
        emails = []
        for i in multi["emails"]:
            if i < len(r):
                emails += split_multi(r[i])
        rec["emails_raw"] = emails
        rec["email_ok"] = [e.lower() for e in emails if email_status(e) == "ok"]
        rec["email_state"] = "ok" if rec["email_ok"] else ("invalid" if emails and any(email_status(e) == "invalid" for e in emails) else "missing")
        phones, ok_ph = [], []
        for i in multi["phones"]:
            if i < len(r):
                for p in split_multi(r[i]):
                    phones.append(p)
                    st, d = phone_status(p)
                    if st == "ok":
                        ok_ph.append(d)
        rec["phones_raw"] = phones
        rec["phone_ok"] = ok_ph
        rec["phone_state"] = "ok" if ok_ph else ("invalid" if phones else "missing")
        rec["stage"] = str(get(r, "stage")).strip()
        rec["cls"], rec["cls_how"] = classify_stage(rec["stage"], team_stages)
        src = str(get(r, "source")).strip()
        rec["source"] = src
        agent = str(get(r, "agent")).strip()
        if agent.lower() in {"unassigned", "none", "no agent", "n/a", "-"}:
            agent = ""
        rec["agent"] = agent
        rec["pond"] = str(get(r, "pond")).strip()
        rec["created"] = parse_date(get(r, "created"))
        tags = split_multi(get(r, "tags"))
        rec["tags"] = tags
        tf = tag_flags(tags, rules)
        rec["tf"] = tf
        if not rec["pond"] and tf["pond"]:
            rec["pond"] = "(pond tag)"
        # last communication
        t = None
        if "last_comm" in cmap:
            t = parse_date(get(r, "last_comm"))
        elif multi["comm_parts"]:
            ds = [parse_date(r[i]) for i in multi["comm_parts"] if i < len(r)]
            ds = [d for d in ds if d]
            t = max(ds) if ds else None
        elif "inactive" in cmap:
            t = parse_date(get(r, "inactive"))
        elif multi["content"] and is_fub:
            ds = [latest_date_in_text(r[i], as_of) for i in multi["content"] if i < len(r)]
            ds = [d for d in ds if d]
            t = max(ds) if ds else None
        elif touch_source and "last_activity" in cmap:
            t = parse_date(get(r, "last_activity"))
        rec["touch"] = t
        rec["activity"] = parse_date(get(r, "last_activity")) if lead_activity_col else None
        ic = str(get(r, "is_contacted")).strip().lower()
        rec["is_contacted"] = None if "is_contacted" not in cmap or ic == "" else ic in {"yes", "y", "true", "1", "contacted"}
        rec["deal_stage"] = str(get(r, "deal_stage")).strip()
        rec["deal_close"] = parse_date(get(r, "deal_close"))
        # consent and opt-outs
        cvals = [consent_value(r[i]) for i in multi["consent"] if i < len(r)]
        consent = True if any(v is True for v in cvals) else (False if any(v is False for v in cvals) else None)
        if tf["consent"]:
            consent = True if consent is not False else False
        rec["consent"] = consent
        rec["text_out"] = any(truthy(r[i]) for i in multi["text_out"] if i < len(r)) or tf["no_text"] or consent is False
        rec["email_out"] = any(truthy(r[i]) for i in multi["email_out"] if i < len(r)) or tf["unsub"]
        rec["dnc"] = any(truthy(r[i]) for i in multi["dnc"] if i < len(r)) or tf["dnc"]
        if any(norm(headers[i]) in ("dnd", "do not disturb") and i < len(r) and truthy(r[i]) for i in multi["text_out"]):
            rec["email_out"] = rec["dnc"] = True
        rec["bounced"] = tf["bounced"]
        recs.append(rec)

    total = len(recs)
    live = [x for x in recs if x["cls"] != "inactive"]
    days = lambda d: (as_of - d).days if d else None

    # ---------------- closed transactions (optional)
    tx_info = None
    if transactions:
        trows = read_rows(transactions)
        th = find_header(trows)
        thead = [str(c).strip() for c in trows[th]]
        tn = [norm(c) for c in thead]
        tdata = [r for r in trows[th + 1:] if any(str(c).strip() for c in r)]
        e_idx = [i for i, c in enumerate(tn) if "email" in c]
        p_idx = [i for i, c in enumerate(tn) if "phone" in c or "mobile" in c or c == "cell"]
        n_idx = [i for i, c in enumerate(tn) if c in ("client name", "client", "buyer name", "seller name", "name", "full name", "contact name", "client full name")]
        f_idx = [i for i, c in enumerate(tn) if c in ("client first name", "first name", "buyer first name", "seller first name")]
        l_idx = [i for i, c in enumerate(tn) if c in ("client last name", "last name", "buyer last name", "seller last name")]
        d_idx = [i for i, c in enumerate(tn) if c in ("close date", "closed date", "closing date", "settlement date", "date closed", "actual close date", "coe date")]
        s_idx = [i for i, c in enumerate(tn) if c in ("status", "transaction status", "deal status", "stage")]
        by_e, by_p, by_n = defaultdict(list), defaultdict(list), defaultdict(list)
        for x in recs:
            for e in x["email_ok"]:
                by_e[e].append(x)
            for p in x["phone_ok"]:
                by_p[p].append(x)
            nk = clean_name(x["first"] + " " + x["last"])
            if nk.strip():
                by_n[nk].append(x)
        closed_rows = matched = name_only = 0
        for r in tdata:
            st = " ".join(str(r[i]).lower() for i in s_idx if i < len(r))
            cd = None
            for i in d_idx:
                if i < len(r):
                    cd = parse_date(r[i]) or cd
            if s_idx and st and not any(w in st for w in ("closed", "sold", "settled", "complete", "funded")):
                continue
            if cd and cd > as_of:
                continue
            closed_rows += 1
            hits = set()
            for i in e_idx:
                if i < len(r):
                    for e in split_multi(r[i]):
                        for x in by_e.get(e.lower(), []):
                            hits.add(x["row"])
            for i in p_idx:
                if i < len(r):
                    st2, d = phone_status(r[i])
                    if st2 == "ok":
                        for x in by_p.get(d, []):
                            hits.add(x["row"])
            how = "email or phone"
            if not hits:
                names = []
                for i in n_idx:
                    if i < len(r):
                        names += [clean_name(nm) for nm in re.split(r"\s+(?:and|&)\s+|;|/", str(r[i])) if nm.strip()]
                if f_idx and l_idx:
                    names.append(clean_name(" ".join(str(r[i]) for i in f_idx[:1] + l_idx[:1] if i < len(r))))
                for nm in names:
                    for x in by_n.get(nm, []):
                        hits.add(x["row"])
                how = "name only"
            if hits:
                if how == "name only":
                    name_only += 1
                else:
                    matched += 1
            for x in recs:
                if x["row"] in hits:
                    x.setdefault("tx", []).append({"close": cd, "how": how})
        tx_info = {"file": os.path.basename(transactions), "closed_rows": closed_rows, "matched": matched, "name_only": name_only,
                   "unmatched": closed_rows - matched - name_only}

    for x in recs:
        txs = [t for t in x.get("tx", []) if t["how"] != "name only"]
        x["tx_close"] = max((t["close"] for t in txs if t["close"]), default=None) if txs else None
        x["tx_strong"] = bool(txs)
        x["past"] = x["cls"] == "past_client" or x["tf"]["past"] or x["tx_strong"]
        x["sphere"] = (x["cls"] == "sphere" or x["tf"]["sphere"]) and not x["past"]

    # ---------------- duplicates
    dsu = DSU()
    by_email, by_phone = defaultdict(list), defaultdict(list)
    for x in live:
        for e in set(x["email_ok"]):
            by_email[e].append(x["row"])
        for p in set(x["phone_ok"]):
            by_phone[p].append(x["row"])
    shared_keys = []
    for kind, idx in (("email", by_email), ("phone", by_phone)):
        for key, rws in idx.items():
            if len(rws) > cfg["shared_key_limit"]:
                shared_keys.append((kind, len(rws), rws))
                continue
            for a in rws[1:]:
                dsu.union(rws[0], a)
    groups = defaultdict(list)
    rowmap = {x["row"]: x for x in recs}
    for x in live:
        if x["row"] in dsu.p:
            groups[dsu.find(x["row"])].append(x)
    groups = {g: m for g, m in groups.items() if len(m) > 1}

    def same_person(a, b):
        fa, fb = clean_name(a["first"]), clean_name(b["first"])
        la, lb = clean_name(a["last"]), clean_name(b["last"])
        if not (fa or la) or not (fb or lb):
            return True
        last_ok = la == lb or not la or not lb or lev(la, lb, 1) <= 1
        first_ok = fa == fb or not fa or not fb or lev(fa, fb, 1) <= 1 or (len(min(fa, fb, key=len)) >= 3 and (fa.startswith(fb) or fb.startswith(fa)))
        return last_ok and first_ok

    dup_groups = []
    gid = 0
    for g, members in sorted(groups.items()):
        gid += 1
        kind = "merge"
        for i in range(len(members)):
            for j in range(i + 1, len(members)):
                if not same_person(members[i], members[j]):
                    la, lb = clean_name(members[i]["last"]), clean_name(members[j]["last"])
                    kind = "shared_same_last" if la == lb and kind != "shared_diff" else "shared_diff"
        def main_key(x):
            complete = len(x["email_ok"]) + len(x["phone_ok"]) + (1 if x["stage"] else 0) + (1 if x["agent"] else 0)
            return (x["touch"] or date(1900, 1, 1), complete, -(x["created"] or date(2999, 1, 1)).toordinal())
        main = max(members, key=main_key)
        for x in members:
            x["dup_group"] = f"G{gid}"
            x["dup_kind"] = kind
            x["dup_main"] = x is main
        dup_groups.append({"id": f"G{gid}", "kind": kind, "size": len(members), "rows": [x["row"] for x in members]})
    shared_rows = set()
    for kind, n, rws in shared_keys:
        shared_rows.update(rws)
    for r in shared_rows:
        rowmap[r]["shared_key"] = True

    # name-only possible duplicates (not already grouped)
    weak = DSU()
    blocks = defaultdict(list)
    for x in live:
        if "dup_group" in x:
            continue
        f, l = clean_name(x["first"]), clean_name(x["last"])
        if len(f) >= 2 and len(l) >= 2:
            blocks[(f[0], l[:2])].append((f + " " + l, x["row"]))
    for b, items in blocks.items():
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                if items[i][0] == items[j][0] or lev(items[i][0], items[j][0], 1) <= 1:
                    weak.union(items[i][1], items[j][1])
    weak_groups = defaultdict(list)
    for r in weak.p:
        weak_groups[weak.find(r)].append(r)
    weak_groups = [sorted(v) for v in weak_groups.values() if len(v) > 1]
    wid = 0
    for v in sorted(weak_groups):
        wid += 1
        for r in v:
            rowmap[r]["name_group"] = f"N{wid}"

    # ---------------- checks
    touch_ok = touch_source is not None
    for x in recs:
        d = days(x["touch"])
        x["no_touch"] = x["touch"] is None
        x["age"] = days(x["created"])
        x["stale"] = touch_ok and x["cls"] in ACTIVE and (x["no_touch"] or d > cfg["stale_days"])
        if x["is_contacted"] is not None:
            never = x["is_contacted"] is False
        else:
            never = touch_ok and x["no_touch"]
        x["never"] = never and x["cls"] not in ("inactive", "other") and (x["age"] is None or x["age"] > cfg["never_contacted_days"])
        x["parked_new_all"] = x["cls"] == "new" and x["age"] is not None and x["age"] > cfg["new_lead_days"]
        x["parked_new"] = x["parked_new_all"] and not x["never"] and not (touch_ok and x["no_touch"])
        x["quiet"] = x["stale"] and not x["no_touch"]
        x["ps_stale"] = touch_ok and (x["past"] or x["sphere"]) and x["cls"] != "inactive" and (x["no_touch"] or d > cfg["past_client_days"])
        closed_deal = bool(x["deal_close"] and x["deal_close"] <= as_of and re.search(r"closed|sold|won|complete", x["deal_stage"].lower())
                           and days(x["deal_close"]) <= cfg["recent_close_days"])
        recent_tx = bool(x["tx_close"] and days(x["tx_close"]) <= cfg["recent_close_days"])
        x["closed_in_active"] = x["cls"] in ACTIVE and (closed_deal or recent_tx)
        x["past_unlabeled"] = x["tx_strong"] and x["cls"] in ("new", "nurture", "unknown", "blank", "active_lead") and not x["closed_in_active"] and x["cls"] != "past_client"
        x["tag_mismatch"] = x["tf"]["past"] and x["cls"] in ("new", "nurture", "unknown", "blank") and not x["past_unlabeled"]
        x["no_stage"] = x["cls"] == "blank"
        x["unassigned"] = not x["agent"] and not x["pond"] and x["cls"] != "inactive"
        x["unreachable"] = x["email_state"] != "ok" and x["phone_state"] != "ok"
        x["archive"] = (x["unreachable"] and x["cls"] not in ("inactive", "active_client") and not x["past"] and not x["sphere"]
                        and touch_ok and (x["no_touch"] or d > cfg["archive_days"]) and (x["age"] is None or x["age"] > cfg["archive_days"] // 2))
        x["back_on_site"] = (x["activity"] is not None and days(x["activity"]) <= cfg["back_on_site_days"] and x["cls"] not in ("inactive", "other")
                             and touch_ok and (x["no_touch"] or d > cfg["back_on_site_days"]))
        pr = rules.get("pond_after_days")
        ps_ = {norm(v) for v in rules.get("pond_stages", [])}
        x["pond_candidate"] = bool(pr) and touch_ok and not x["pond"] and x["cls"] in ACTIVE and (norm(x["stage"]) in ps_ if ps_ else True) and (x["no_touch"] or d > int(pr))
        x["quiet_nurture"] = touch_ok and x["cls"] == "nurture" and (x["no_touch"] or d > cfg["nurture_quiet_days"])
        x["emailable"] = x["email_state"] == "ok" and not x["email_out"] and not x["bounced"]
        x["callable"] = x["phone_state"] == "ok" and not x["dnc"]
        x["textable"] = x["phone_state"] == "ok" and x["consent"] is True and not x["text_out"] and not x["dnc"]

    # ---------------- aggregates
    out = {"as_of": as_of.isoformat(), "file": os.path.basename(export), "records": total, "header_row": h + 1,
           "format": "Follow Up Boss People export" if is_fub else "Other CRM export (columns mapped by name)",
           "settings": cfg, "team_rules_used": sorted(k for k in rules if k not in ("columns",)) or []}
    colmap = []
    for key, label in (("id", "Record ID"), ("name", "Name"), ("first", "First name"), ("last", "Last name"), ("stage", "Stage"),
                       ("source", "Source"), ("agent", "Assigned agent"), ("pond", "Pond"), ("created", "Date added"),
                       ("last_comm", "Last communication"), ("last_activity", "Lead activity"), ("is_contacted", "Is contacted"),
                       ("tags", "Tags"), ("deal_stage", "Deal stage"), ("deal_close", "Deal close date"), ("timeframe", "Timeframe")):
        if key in cmap:
            colmap.append([label, headers[cmap[key]]])
    for key, label in (("emails", "Email columns"), ("phones", "Phone columns"), ("comm_parts", "Communication date columns"),
                       ("consent", "Text consent columns"), ("text_out", "Text opt-out columns"), ("email_out", "Email opt-out columns"),
                       ("dnc", "Do Not Call columns")):
        if multi[key]:
            colmap.append([label, ", ".join(headers[i] for i in multi[key])])
    out["columns_used"] = colmap
    out["touch_source"] = touch_source
    missing = []
    if "id" not in cmap:
        missing.append("No record ID column: the worklist identifies records by their row in this file, name and first email or phone.")
    if not touch_ok:
        missing.append("No last-communication date: the stale-lead, past-client, never-contacted and quiet-nurture checks could not run.")
    elif "approximate" in (touch_source or ""):
        missing.append("No last-communication column: dates were read from the calls, texts and notes columns, so treat those checks as approximate.")
    if "stage" not in cmap:
        missing.append("No stage column: stage checks could not run.")
    if "agent" not in cmap:
        missing.append("No assigned-agent column: agent breakdowns and unassigned checks could not run.")
    if "created" not in cmap:
        missing.append("No date-added column: age-based checks (new-lead stage, never contacted) used no age limit.")
    if not multi["consent"] and not any(x["tf"]["consent"] for x in recs):
        missing.append("No text consent field (column or tag): text drafts are withheld.")
    if not multi["emails"]:
        missing.append("No email column.")
    if not multi["phones"]:
        missing.append("No phone column.")
    if "last_activity" not in cmap:
        missing.append("No lead-activity column: the Back On The Site segment could not run.")
    if is_fub:
        missing.append("Follow Up Boss exports pond leads with the pond's lead agent as the assignment and leaves out the pond name, so pond leads count under that agent unless the pond name was added as a tag before export.")
    out["gaps"] = missing
    out["ignored_columns"] = [headers[i] for i in multi["sensitive"]]
    out["relationship_columns_ignored"] = len(multi["relationship"])

    st = Counter(x["stage"] or "(blank)" for x in recs)
    stage_rows = []
    for s, n in st.most_common():
        cls, how = classify_stage("" if s == "(blank)" else s, team_stages)
        stage_rows.append({"stage": s, "class": CLASS_LABEL[cls], "how": how, "count": n, "pct": pct(n, total)})
    out["stages"] = stage_rows
    out["stage_classes"] = {CLASS_LABEL[c]: n for c, n in Counter(x["cls"] for x in recs).most_common()}
    out["unrecognized_stages"] = [r["stage"] for r in stage_rows if r["class"] == CLASS_LABEL["unknown"]]
    out["guessed_stages"] = [r["stage"] for r in stage_rows if r["how"] == "guess"]

    srcs = Counter(x["source"] or "(blank)" for x in recs)
    out["sources"] = [{"source": s, "count": n, "pct": pct(n, total)} for s, n in srcs.most_common(15)]
    out["sources_other"] = total - sum(n for _, n in srcs.most_common(15))
    out["source_count"] = len(srcs)

    agents = defaultdict(lambda: Counter())
    for x in recs:
        a = x["agent"] or ("(pond)" if x["pond"] else "(unassigned)")
        c = agents[a]
        c["contacts"] += 1
        c["active"] += x["cls"] in ACTIVE
        c["stale"] += x["stale"]
        c["never"] += x["never"]
        c["ps_stale"] += x["ps_stale"]
        c["dupes"] += "dup_group" in x and x.get("dup_kind") == "merge"
    out["agents"] = [{"agent": a, "contacts": c["contacts"], "pct": pct(c["contacts"], total), "active_stage": c["active"],
                      "stale_active": c["stale"], "never_contacted": c["never"], "past_sphere_untouched": c["ps_stale"],
                      "in_merge_groups": c["dupes"]} for a, c in sorted(agents.items(), key=lambda kv: -kv[1]["contacts"])]

    em = Counter(x["email_state"] for x in recs)
    ph = Counter(x["phone_state"] for x in recs)
    out["contact_info"] = {
        "email_missing": em["missing"], "email_invalid": em["invalid"], "email_ok": em["ok"],
        "email_bounced_tag": sum(x["bounced"] for x in recs), "email_unsubscribed": sum(x["email_out"] for x in recs),
        "phone_missing": ph["missing"], "phone_invalid": ph["invalid"], "phone_ok": ph["ok"],
        "dnc": sum(x["dnc"] for x in recs), "text_opted_out": sum(x["text_out"] for x in recs),
        "unreachable": sum(x["unreachable"] for x in recs),
        "unreachable_live": sum(x["unreachable"] for x in live),
    }

    merge_groups = [g for g in dup_groups if g["kind"] == "merge"]
    out["duplicates"] = {
        "merge_groups": len(merge_groups), "merge_records": sum(g["size"] for g in merge_groups),
        "extra_records": sum(g["size"] - 1 for g in merge_groups),
        "shared_same_last_groups": sum(1 for g in dup_groups if g["kind"] == "shared_same_last"),
        "shared_same_last_records": sum(g["size"] for g in dup_groups if g["kind"] == "shared_same_last"),
        "shared_diff_groups": sum(1 for g in dup_groups if g["kind"] == "shared_diff"),
        "shared_diff_records": sum(g["size"] for g in dup_groups if g["kind"] == "shared_diff"),
        "shared_keys": [{"kind": k, "records": n} for k, n, _ in sorted(shared_keys, key=lambda t: -t[1])],
        "name_only_groups": len(weak_groups), "name_only_records": sum(len(v) for v in weak_groups),
    }

    def by(keyfn, items):
        c = Counter(keyfn(x) for x in items)
        return [{"name": k, "count": n} for k, n in c.most_common()]

    stale = [x for x in recs if x["stale"]]
    out["stale_active"] = None if not touch_ok else {
        "days": cfg["stale_days"], "active_stage_total": sum(1 for x in recs if x["cls"] in ACTIVE), "count": len(stale),
        "no_communication_on_record": sum(1 for x in stale if x["no_touch"]), "gone_quiet": sum(1 for x in stale if not x["no_touch"]),
        "by_stage": by(lambda x: x["stage"] or "(blank)", stale), "by_agent": by(lambda x: x["agent"] or ("(pond)" if x["pond"] else "(unassigned)"), stale)}
    never = [x for x in recs if x["never"]]
    out["never_contacted"] = {"days": cfg["never_contacted_days"], "basis": "Is Contacted column" if "is_contacted" in cmap else ("no communication on record" if touch_ok else "not available"),
                              "count": len(never), "by_agent": by(lambda x: x["agent"] or ("(pond)" if x["pond"] else "(unassigned)"), never),
                              "by_source": by(lambda x: x["source"] or "(blank)", never)[:8]}
    pcs = [x for x in recs if x["past"] and x["cls"] != "inactive"]
    sph = [x for x in recs if x["sphere"] and x["cls"] != "inactive"]
    out["past_sphere"] = {
        "days": cfg["past_client_days"], "past_clients": len(pcs), "sphere": len(sph),
        "past_from_stage": sum(1 for x in pcs if x["cls"] == "past_client"), "past_from_tag_only": sum(1 for x in pcs if x["cls"] != "past_client" and x["tf"]["past"]),
        "past_from_transactions_only": sum(1 for x in pcs if x["cls"] != "past_client" and not x["tf"]["past"] and x["tx_strong"]),
        "past_untouched": None if not touch_ok else sum(1 for x in pcs if x["ps_stale"]),
        "past_no_communication_on_record": None if not touch_ok else sum(1 for x in pcs if x["no_touch"]),
        "sphere_untouched": None if not touch_ok else sum(1 for x in sph if x["ps_stale"]),
        "sphere_no_communication_on_record": None if not touch_ok else sum(1 for x in sph if x["no_touch"]),
        "by_agent": by(lambda x: x["agent"] or ("(pond)" if x["pond"] else "(unassigned)"), [x for x in pcs + sph if x["ps_stale"]]),
        "past_stage_names": sorted({x["stage"] for x in pcs if x["cls"] == "past_client"}),
        "past_tags_seen": sorted({t for x in pcs for t in x["tags"] if tag_key(t) in PAST_TAGS or "pastclient" in tag_key(t) or tag_key(t) in {tag_key(v) for v in rules.get("past_client_tags", [])}}),
    }
    out["transactions"] = tx_info
    out["stage_problems"] = {
        "closed_deal_in_active_stage": sum(x["closed_in_active"] for x in recs),
        "closed_deal_in_active_stage_by_stage": by(lambda x: x["stage"], [x for x in recs if x["closed_in_active"]]),
        "past_client_not_labeled": sum(x["past_unlabeled"] for x in recs),
        "past_client_tag_wrong_stage": sum(x["tag_mismatch"] for x in recs),
        "no_stage": sum(x["no_stage"] for x in recs),
        "parked_in_new_lead_stage": sum(x["parked_new"] for x in recs), "new_lead_days": cfg["new_lead_days"],
        "in_new_lead_stage_past_limit_total": sum(x["parked_new_all"] for x in recs),
        "unrecognized_stage_records": sum(1 for x in recs if x["cls"] == "unknown"),
        "import_tags": sum(1 for x in recs if x["tf"]["import_tag"]),
    }
    unas = [x for x in recs if x["unassigned"]]
    out["pond_rule"] = None if not rules.get("pond_after_days") else {"days": int(rules["pond_after_days"]), "stages": rules.get("pond_stages", []), "candidates": sum(1 for x in recs if x["pond_candidate"])}
    out["unassigned"] = {"count": len(unas), "by_class": {CLASS_LABEL[c]: n for c, n in Counter(x["cls"] for x in unas).most_common()},
                         "pond_records": sum(1 for x in recs if x["pond"]), "pond_column": "pond" in cmap,
                         "pond_by_agent": by(lambda x: x["agent"] or "(no agent)", [x for x in recs if x["pond"]])[:8]}

    # tags
    tag_counts = Counter(t for x in recs for t in x["tags"])
    keyed = defaultdict(Counter)
    for t, n in tag_counts.items():
        keyed[tag_key(t)][t] += n
    keys = sorted(keyed)
    kd = DSU()
    long_keys = [k for k in keys if len(k) >= 6]
    by_len = defaultdict(list)
    for k in long_keys:
        by_len[len(k)].append(k)
    for k in long_keys:
        for L in (len(k), len(k) + 1):
            for k2 in by_len.get(L, []):
                if k2 > k and lev(k, k2, 1) <= 1 and not (k.isdigit() or k2.isdigit()):
                    kd.union(k, k2)
    merged = defaultdict(Counter)
    for k in keys:
        root = kd.find(k) if k in kd.p else k
        merged[root].update(keyed[k])
    tag_groups = [{"variants": [{"tag": t, "count": n} for t, n in c.most_common()], "total": sum(c.values())}
                  for c in merged.values() if len(c) > 1]
    tag_groups.sort(key=lambda g: -g["total"])
    out["tags"] = {"distinct": len(tag_counts), "records_with_tags": sum(1 for x in recs if x["tags"]),
                   "near_duplicate_groups": len(tag_groups), "near_duplicate_tags": sum(len(g["variants"]) for g in tag_groups),
                   "groups": tag_groups[:15], "used_once": sum(1 for n in tag_counts.values() if n == 1)}

    has_consent_field = bool(multi["consent"]) or any(x["tf"]["consent"] for x in recs)
    out["consent"] = {"field_found": has_consent_field,
                      "fields": [headers[i] for i in multi["consent"]] + (["consent tag"] if any(x["tf"]["consent"] for x in recs) else []),
                      "documented_yes": sum(1 for x in recs if x["consent"] is True),
                      "documented_no": sum(1 for x in recs if x["consent"] is False),
                      "blank": sum(1 for x in recs if x["consent"] is None),
                      "textable": sum(1 for x in recs if x["textable"])}

    # ---------------- segments (in priority order; a contact can match more than one)
    seg_defs = [
        ("back_on_site", "Back On The Site", lambda x: x["back_on_site"], "call list"),
        ("past_clients", "Past Clients, No Touch In 12+ Months", lambda x: x["ps_stale"] and x["past"], "call list"),
        ("sphere", "Sphere, No Touch In 12+ Months", lambda x: x["ps_stale"] and x["sphere"], "email campaign"),
        ("stalled", f"Stalled Pipeline, No Touch In {cfg['stale_days']}+ Days", lambda x: x["stale"] and not x["never"] and not x["closed_in_active"], "call list"),
        ("never", "Never-Worked Leads", lambda x: x["never"] and not x["past"] and not x["sphere"], "call list"),
        ("quiet_nurture", f"Quiet Nurture, No Touch In {cfg['nurture_quiet_days']}+ Days", lambda x: x["quiet_nurture"] and not x["past"] and not x["sphere"], "email campaign"),
    ]
    segs = []
    seen = set()
    for key, label, fn, move in seg_defs:
        mem = [x for x in recs if x["cls"] != "inactive" and fn(x)]
        if not mem:
            continue
        overlap = sum(1 for x in mem if x["row"] in seen)
        seen.update(x["row"] for x in mem)
        segs.append({"key": key, "name": label, "size": len(mem), "also_in_earlier_segment": overlap, "next_move": move,
                     "emailable": sum(x["emailable"] for x in mem), "callable": sum(x["callable"] for x in mem),
                     "textable": sum(x["textable"] for x in mem),
                     "no_communication_on_record": sum(x["no_touch"] for x in mem) if touch_ok else None,
                     "by_agent": by(lambda x: x["agent"] or ("(pond)" if x["pond"] else "(unassigned)"), mem)[:8],
                     "stages": by(lambda x: x["stage"] or "(blank)", mem)[:8],
                     "sources": by(lambda x: x["source"] or "(blank)", mem)[:5]})
    out["segments"] = segs[:6]

    # ---------------- worklist
    pond_rule = rules.get("pond_after_days")
    group_rows = {g["id"]: g["rows"] for g in dup_groups}
    name_rows = defaultdict(list)
    for r, x in rowmap.items():
        if x.get("name_group"):
            name_rows[x["name_group"]].append(r)
    work = []
    for x in recs:
        if x["cls"] == "inactive":
            continue
        issues = []
        if x.get("dup_group"):
            others = [r for r in group_rows[x["dup_group"]] if r != x["row"]]
            o = ", ".join(str(r) for r in others[:5])
            if x["dup_kind"] == "merge":
                issues.append((1, "Merge Candidate", f"Same email or phone and same name as row {o}" + ("; suggested main record (most recent communication, then most complete)" if x["dup_main"] else "")))
            elif x["dup_kind"] == "shared_same_last":
                issues.append((1, "Review Shared Contact Info", f"Shares an email or phone with row {o} under a different first name; keep separate, link as a relationship, or merge"))
            else:
                issues.append((1, "Review Shared Contact Info", f"Shares an email or phone with row {o} under a different name"))
        if x.get("shared_key"):
            issues.append((1, "Review Shared Contact Info", f"Email or phone appears on more than {cfg['shared_key_limit']} records (may be an office, lender or agent number)"))
        if x["closed_in_active"]:
            src = "a closed transaction in the uploaded file" if x["tx_close"] and days(x["tx_close"]) <= cfg["recent_close_days"] else "a closed deal in the export"
            issues.append((2, "Fix Stage", f"Matches {src} but stage is still {x['stage']}"))
        if x["past_unlabeled"]:
            issues.append((2, "Fix Stage", f"Matches a closed transaction but stage is {x['stage'] or 'blank'}; consider your past client stage"))
        if x["tag_mismatch"]:
            issues.append((2, "Fix Stage", f"Tagged as a past client but stage is {x['stage'] or 'blank'}"))
        if x["no_stage"]:
            issues.append((2, "Set Stage", "No stage"))
        if x["unassigned"]:
            issues.append((3, "Assign Agent", "No assigned agent or pond"))
        d = days(x["touch"])
        when = "no communication on record" if x["no_touch"] else f"last communication {d} days ago"
        if x["pond_candidate"] and not x["closed_in_active"]:
            issues.append((4, "Pond Candidate", f"Stage {x['stage']}, {when}; team rule: pond after {pond_rule} days"))
        elif x["stale"] and not x["closed_in_active"]:
            issues.append((4, "Agent Follow-Up Or Pond Decision", f"Active stage {x['stage']}, {when}"))
        if x["parked_new"]:
            issues.append((4, "Review New-Lead Stage", f"In stage {x['stage']} for {x['age']} days since added"))
        if x["archive"]:
            issues.append((6, "Archive Candidate", "No valid email or phone and no communication in " + (f"{days(x['touch'])} days" if x["touch"] else "the record")))
        else:
            if x["email_state"] == "invalid":
                issues.append((5, "Fix Invalid Email", "Email looks invalid or is a placeholder"))
            if x["phone_state"] == "invalid":
                issues.append((5, "Fix Invalid Phone", "Phone is not a valid 10-digit US number"))
            if x["email_state"] == "missing" and x["phone_state"] == "missing":
                issues.append((5, "Fill Missing Contact Info", "No email and no phone"))
            elif x["email_state"] == "missing":
                issues.append((5, "Fill Missing Email", "No email"))
            elif x["phone_state"] == "missing":
                issues.append((5, "Fill Missing Phone", "No phone"))
        if x["tf"]["import_tag"]:
            issues.append((5, "Clean Import Tag", "Has an Imported Stage or Imported Agent tag left from an import"))
        if x.get("name_group") and not x.get("dup_group"):
            others = [r for r in name_rows[x["name_group"]] if r != x["row"]]
            issues.append((7, "Review Possible Duplicate (Name Only)", "Same or nearly the same name as row " + ", ".join(str(r) for r in others[:5]) + ", different contact info"))
        if not issues:
            continue
        issues.sort(key=lambda t: t[0])
        p, action, reason = issues[0]
        rest = "; ".join(a for _, a, _ in issues[1:] if a != action)
        work.append({"Priority": p, "Row In Export": x["row"], "Record ID": x["id"], "Name": x["name"],
                     "Email": (x["emails_raw"] or [""])[0], "Phone": (x["phones_raw"] or [""])[0],
                     "Assigned Agent": x["agent"] or ("(pond)" if x["pond"] else ""), "Stage": x["stage"],
                     "Action": action, "Reason": reason, "Other Fixes": rest,
                     "Duplicate Group": x.get("dup_group") or x.get("name_group") or "",
                     "Suggested Main Record": ("Yes" if x.get("dup_main") else "No") if x.get("dup_kind") == "merge" else ""})
    work.sort(key=lambda w: (w["Priority"], w["Duplicate Group"] or "~", w["Assigned Agent"], w["Row In Export"]))
    out["worklist"] = {"rows": len(work), "by_action": dict(Counter(w["Action"] for w in work).most_common()),
                       "by_agent": dict(Counter(w["Assigned Agent"] or "(unassigned)" for w in work).most_common(12))}

    # ---------------- ranked problems and first cleanup
    # problems are defined so they do not double count: quiet (touched before) versus never contacted
    probs = [
        ("Likely duplicates (records in merge groups)", out["duplicates"]["merge_records"]),
        ("Stage problems (closed deals in active stages, no stage, contacted leads still in a new-lead stage, past clients not labeled)",
         len({x["row"] for x in recs if x["closed_in_active"] or x["no_stage"] or x["parked_new"] or x["past_unlabeled"] or x["tag_mismatch"]})),
        ("Unassigned contacts", out["unassigned"]["count"]),
        ("Missing or invalid email (not trash)", sum(1 for x in live if x["email_state"] != "ok")),
        ("Missing or invalid phone (not trash)", sum(1 for x in live if x["phone_state"] != "ok")),
    ]
    if touch_ok:
        probs += [
            (f"Active-stage contacts gone quiet: communication on record, none in {cfg['stale_days']}+ days", sum(1 for x in recs if x["quiet"])),
            (f"Past clients and sphere with no communication in {cfg['past_client_days']}+ days", sum(1 for x in pcs + sph if x["ps_stale"])),
        ]
    if out["never_contacted"]["basis"] != "not available":
        probs.append((f"Leads never contacted, added {cfg['never_contacted_days']}+ days ago", len(never)))
    probs = [p for p in probs if p[1] > 0]
    probs.sort(key=lambda p: -p[1])
    out["ranked_problems"] = [{"problem": p, "records": n, "pct": pct(n, total)} for p, n in probs]
    dup_share = out["duplicates"]["merge_records"] / total if total else 0
    if dup_share >= 0.01:
        why = ("Follow Up Boss keeps the main record's stage and assigned agent when it merges, so stage and assignment fixes made before merging can be lost." if is_fub
               else "A merge keeps one record's stage and owner, so stage and assignment fixes made before merging can be lost (check how your CRM merges).")
        first = ("Merge likely duplicates first", f"{pct(out['duplicates']['merge_records'], total)} of records sit in merge groups (rule: 1% or more). " + why)
    elif probs:
        first = (f"Start with: {probs[0][0]}", "Largest problem by records affected (duplicates are under the 1% rule).")
    else:
        first = ("No cleanup needed by these checks", "")
    out["first_cleanup"] = {"what": first[0], "why": first[1]}
    return out, work

# ------------------------------------------------------------------ report

def table(head, rows):
    s = "| " + " | ".join(head) + " |\n|" + "|".join("---" for _ in head) + "|\n"
    for r in rows:
        s += "| " + " | ".join(str(c) for c in r) + " |\n"
    return s


def report_md(o):
    T = o["records"]
    L = []
    a = L.append
    a(f"# Database Health Check: Analysis Output\n\nFile: {o['file']} | Format: {o['format']} | Records: {fmt(T)} | Header row: {o['header_row']} | As of: {o['as_of']}\n")
    s = o["settings"]
    a(f"Settings: active-stage stale after {s['stale_days']} days; past client and sphere after {s['past_client_days']} days; new-lead stage after {s['new_lead_days']} days; never contacted if added {s['never_contacted_days']}+ days ago; quiet nurture after {s['nurture_quiet_days']} days. Team rules used: {', '.join(o['team_rules_used']) or 'none (defaults)'}.\n")
    a("## Columns Used\n")
    a(table(["What", "Column in the file"], o["columns_used"]))
    a(f"\nLast communication taken from: {o['touch_source'] or 'not available'}\n")
    if o["gaps"]:
        a("\n## Gaps In This Export\n")
        for g in o["gaps"]:
            a(f"- {g}")
    if o["ignored_columns"]:
        a("\nColumns ignored for privacy: " + ", ".join(o["ignored_columns"]))
    if o["relationship_columns_ignored"]:
        a(f"\nRelationship columns ignored: {o['relationship_columns_ignored']}")
    a("\n## Contacts By Stage\n")
    a(table(["Stage", "Read as", "How", "Contacts", "%"], [[r["stage"], r["class"], r["how"], fmt(r["count"]), r["pct"]] for r in o["stages"]]))
    if o["unrecognized_stages"] or o["guessed_stages"]:
        a(f"\nStages to confirm with the team: guessed {o['guessed_stages'] or 'none'}; not recognized {o['unrecognized_stages'] or 'none'}")
    a("\n## Contacts By Source (Top 15)\n")
    a(table(["Source", "Contacts", "%"], [[r["source"], fmt(r["count"]), r["pct"]] for r in o["sources"]]))
    a(f"\nAll other sources: {fmt(o['sources_other'])} contacts across {o['source_count'] - len(o['sources'])} more source values.")
    a("\n## Contacts By Assigned Agent\n")
    a(table(["Agent", "Contacts", "%", "Active stage", f"Active, no touch {s['stale_days']}+ days", "Never contacted", "Past client or sphere, no touch 12+ months", "In merge groups"],
            [[r["agent"], fmt(r["contacts"]), r["pct"], fmt(r["active_stage"]), fmt(r["stale_active"]), fmt(r["never_contacted"]), fmt(r["past_sphere_untouched"]), fmt(r["in_merge_groups"])] for r in o["agents"]]))
    c = o["contact_info"]
    a("\n## Contact Info\n")
    a(table(["Check", "Contacts", "%"], [
        ["No email", fmt(c["email_missing"]), pct(c["email_missing"], T)], ["Email looks invalid or placeholder", fmt(c["email_invalid"]), pct(c["email_invalid"], T)],
        ["Bounced-email tag", fmt(c["email_bounced_tag"]), pct(c["email_bounced_tag"], T)], ["Unsubscribed from email (tag or column)", fmt(c["email_unsubscribed"]), pct(c["email_unsubscribed"], T)],
        ["No phone", fmt(c["phone_missing"]), pct(c["phone_missing"], T)], ["Phone not a valid 10-digit US number", fmt(c["phone_invalid"]), pct(c["phone_invalid"], T)],
        ["Do Not Call (tag or column)", fmt(c["dnc"]), pct(c["dnc"], T)], ["Opted out of texts (tag or column)", fmt(c["text_opted_out"]), pct(c["text_opted_out"], T)],
        ["No valid email and no valid phone", fmt(c["unreachable"]), pct(c["unreachable"], T)]]))
    d = o["duplicates"]
    a("\n## Likely Duplicates\n")
    a(table(["Group type", "Groups", "Records"], [
        ["Same email or phone, same or near-identical name (merge candidates)", fmt(d["merge_groups"]), fmt(d["merge_records"])],
        ["Same email or phone, different first name, same last name", fmt(d["shared_same_last_groups"]), fmt(d["shared_same_last_records"])],
        ["Same email or phone, different names", fmt(d["shared_diff_groups"]), fmt(d["shared_diff_records"])],
        ["Same or near-identical name only (review)", fmt(d["name_only_groups"]), fmt(d["name_only_records"])]]))
    a(f"\nRecords that would go away if every merge group were merged: {fmt(d['extra_records'])}.")
    if d["shared_keys"]:
        a("\nOne email or phone on many records (not treated as duplicates): " + "; ".join(f"a {k['kind']} on {k['records']} records" for k in d["shared_keys"][:8]))
    if o["stale_active"]:
        sa = o["stale_active"]
        a(f"\n## Active-Stage Contacts, No Communication In {sa['days']}+ Days\n")
        a(f"{fmt(sa['count'])} of {fmt(sa['active_stage_total'])} active-stage contacts ({pct(sa['count'], sa['active_stage_total'])}): {fmt(sa['gone_quiet'])} gone quiet (communication on record, none in {sa['days']}+ days) and {fmt(sa['no_communication_on_record'])} with no communication on record.\n")
        a(table(["Stage", "Contacts"], [[r["name"], fmt(r["count"])] for r in sa["by_stage"]]))
        a("\n" + table(["Agent", "Contacts"], [[r["name"], fmt(r["count"])] for r in sa["by_agent"]]))
    nc = o["never_contacted"]
    if nc["basis"] != "not available":
        a(f"\n## Never Contacted, Added {nc['days']}+ Days Ago\n\nBasis: {nc['basis']}. Contacts: {fmt(nc['count'])}.\n")
        a(table(["Agent", "Contacts"], [[r["name"], fmt(r["count"])] for r in nc["by_agent"]]))
        a("\n" + table(["Source", "Contacts"], [[r["name"], fmt(r["count"])] for r in nc["by_source"]]))
    ps = o["past_sphere"]
    a(f"\n## Past Clients And Sphere\n")
    rows = [["Past clients", fmt(ps["past_clients"]), "n/a" if ps["past_untouched"] is None else fmt(ps["past_untouched"]), "n/a" if ps["past_no_communication_on_record"] is None else fmt(ps["past_no_communication_on_record"])],
            ["Sphere", fmt(ps["sphere"]), "n/a" if ps["sphere_untouched"] is None else fmt(ps["sphere_untouched"]), "n/a" if ps["sphere_no_communication_on_record"] is None else fmt(ps["sphere_no_communication_on_record"])]]
    a(table(["Group", "Contacts", f"No communication in {ps['days']}+ days", "Of those, none on record"], rows))
    a(f"\nPast clients found by: stage {fmt(ps['past_from_stage'])}; tag only {fmt(ps['past_from_tag_only'])}; closed-transaction file only {fmt(ps['past_from_transactions_only'])}. Past client stages: {', '.join(ps['past_stage_names']) or 'none'}. Past client tags: {', '.join(ps['past_tags_seen']) or 'none'}.")
    if ps["by_agent"]:
        a("\n" + table(["Agent", "Past client or sphere, no touch"], [[r["name"], fmt(r["count"])] for r in ps["by_agent"]]))
    if o["transactions"]:
        t = o["transactions"]
        a(f"\nClosed-transaction file {t['file']}: {t['closed_rows']} closed rows; matched by email or phone {t['matched']}; name only {t['name_only']} (not used for fixes); not found in the export {t['unmatched']}.")
    sp = o["stage_problems"]
    a("\n## Stage Problems\n")
    a(table(["Check", "Contacts"], [
        ["Closed deal still in an active stage", fmt(sp["closed_deal_in_active_stage"])],
        ["Matches a closed transaction but not in a past client stage", fmt(sp["past_client_not_labeled"])],
        ["Tagged as a past client but in a new, nurture or blank stage", fmt(sp["past_client_tag_wrong_stage"])],
        ["No stage", fmt(sp["no_stage"])],
        [f"In a new-lead stage {sp['new_lead_days']}+ days after being added, with communication on record (stage not updated)", fmt(sp["parked_in_new_lead_stage"])],
        ["Stage not recognized (needs a team definition)", fmt(sp["unrecognized_stage_records"])],
        ["Imported Stage or Imported Agent tag left from an import", fmt(sp["import_tags"])]]))
    a(f"\nAll contacts in a new-lead stage {sp['new_lead_days']}+ days after being added: {fmt(sp['in_new_lead_stage_past_limit_total'])} (the ones never contacted are counted under Never Contacted).")
    if sp["closed_deal_in_active_stage_by_stage"]:
        a("\nClosed deals by current stage: " + "; ".join(f"{r['name']} {r['count']}" for r in sp["closed_deal_in_active_stage_by_stage"]))
    u = o["unassigned"]
    a(f"\n## Unassigned And Ponds\n\nUnassigned (no agent, no pond, not trash): {fmt(u['count'])}. Pond records found: {fmt(u['pond_records'])} ({'pond column' if u['pond_column'] else 'pond tags only'}).")
    if u["pond_by_agent"] and u["pond_records"]:
        a("\nPond records by assigned agent" + (" (Follow Up Boss shows the pond's lead agent here)" if o["format"].startswith("Follow") else "") + ": " + "; ".join(f"{r['name']} {r['count']}" for r in u["pond_by_agent"]))
    if o.get("pond_rule"):
        pr = o["pond_rule"]
        a(f"\nTeam pond rule: {', '.join(pr['stages']) or 'active stages'} with no communication in {pr['days']}+ days. Pond candidates now: {fmt(pr['candidates'])}.")
    if u["by_class"]:
        a("\nUnassigned by stage type: " + "; ".join(f"{k} {v}" for k, v in u["by_class"].items()))
    tg = o["tags"]
    a(f"\n## Tags\n\nDistinct tags: {fmt(tg['distinct'])}. Used on one contact only: {fmt(tg['used_once'])}. Near-duplicate groups: {fmt(tg['near_duplicate_groups'])} ({fmt(tg['near_duplicate_tags'])} tags).\n")
    if tg["groups"]:
        a(table(["Variants (contacts)", "Total"], [["; ".join(f"{v['tag']} ({v['count']})" for v in g["variants"]), fmt(g["total"])] for g in tg["groups"]]))
    cs = o["consent"]
    a(f"\n## Text Consent\n\nConsent field found: {'yes (' + ', '.join(cs['fields']) + ')' if cs['field_found'] else 'no'}. Documented yes: {fmt(cs['documented_yes'])}; documented no: {fmt(cs['documented_no'])}; blank: {fmt(cs['blank'])}. Textable (documented yes, valid phone, not opted out, not Do Not Call): {fmt(cs['textable'])}.")
    a("\n## Ranked Problems (Records Affected)\n")
    a(table(["#", "Problem", "Records", "% of database"], [[i + 1, p["problem"], fmt(p["records"]), p["pct"]] for i, p in enumerate(o["ranked_problems"])]))
    a(f"\nFirst cleanup: {o['first_cleanup']['what']}. {o['first_cleanup']['why']}")
    a("\n## Segment Candidates (Priority Order)\n")
    for sg in o["segments"]:
        a(f"### {sg['name']}\n")
        a(f"Size {fmt(sg['size'])} (also in an earlier segment: {fmt(sg['also_in_earlier_segment'])}). Emailable {fmt(sg['emailable'])}; callable {fmt(sg['callable'])}; textable with documented consent {fmt(sg['textable'])}. Suggested next move: {sg['next_move']}.")
        if sg["no_communication_on_record"] is not None:
            a(f"No communication on record: {fmt(sg['no_communication_on_record'])}.")
        a("By agent: " + "; ".join(f"{r['name']} {r['count']}" for r in sg["by_agent"]))
        a("Stages: " + "; ".join(f"{r['name']} {r['count']}" for r in sg["stages"]))
        a("Top sources: " + "; ".join(f"{r['name']} {r['count']}" for r in sg["sources"]) + "\n")
    w = o["worklist"]
    a(f"## Cleanup Worklist\n\nRows: {fmt(w['rows'])} (one per record that needs work; trash and rejected records left out).\n")
    a(table(["Action", "Records"], [[k, fmt(v)] for k, v in w["by_action"].items()]))
    a("\n" + table(["Assigned agent", "Worklist rows"], [[k, fmt(v)] for k, v in w["by_agent"].items()]))
    return "\n".join(L) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description="Database Health Check analysis")
    ap.add_argument("export")
    ap.add_argument("--transactions")
    ap.add_argument("--rules")
    ap.add_argument("--as-of")
    ap.add_argument("--out", default="health_check_output")
    a = ap.parse_args(argv)
    rules = json.load(open(a.rules)) if a.rules else {}
    as_of = datetime.strptime(a.as_of, "%Y-%m-%d").date() if a.as_of else None
    o, work = analyze(a.export, a.transactions, rules, as_of)
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, "health_report.json"), "w", encoding="utf-8") as f:
        json.dump(o, f, indent=1, default=str)
    md = report_md(o)
    with open(os.path.join(a.out, "health_report.md"), "w", encoding="utf-8") as f:
        f.write(md)
    cols = ["Priority", "Row In Export", "Record ID", "Name", "Email", "Phone", "Assigned Agent", "Stage", "Action", "Reason",
            "Other Fixes", "Duplicate Group", "Suggested Main Record"]
    with open(os.path.join(a.out, "cleanup_worklist.csv"), "w", encoding="utf-8-sig", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=cols)
        wr.writeheader()
        wr.writerows(work)
    print(md)
    print(f"Wrote {os.path.join(a.out, 'health_report.md')}, health_report.json and cleanup_worklist.csv ({len(work)} rows).")


if __name__ == "__main__":
    main()
```
