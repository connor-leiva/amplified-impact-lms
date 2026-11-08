# List Code

Last verified: 2026-11-08. This file holds no state or industry facts. The export layouts it reads are described, with their sources, in `list-mode.md`; the merge, tier, signal, owner and consent rules it applies are the ones written there.

Run this code with Python 3 on the uploaded recruit files. It uses Python's standard library, plus openpyxl for an .xlsx workbook (it reads every sheet that has data). Don't paste it into the conversation.

What it does, in order: finds each file's header row and maps its columns by meaning; reads the period from the report's title lines; normalizes names, emails and phones; merges rows by MLS agent ID, then email, then phone plus last name, then name plus office (a phone or email on more than 3 people's rows is treated as an office line and never used to match); adds split-office production together and keeps repeated rows once; removes roster members; marks opt-outs Do not contact; tiers on trailing-twelve-month units (the team's tiers from config.json, or default percentile tiers); finds why-now signals; suggests owners; sorts text consent into four values; and counts notes that hold personal details by kind, by keyword only, without ever printing a note.

Usage:

    python3 recruits.py FILE [FILE ...] [--roster ROSTER] [--config config.json] --out FOLDER

It prints `summary.md` and writes three files to FOLDER: `organized-recruit-list.csv` (one row per unique agent, no notes), `summary.md` and `summary.json`.

config.json is optional. Write only what the user's files or message state:

    {"team_brokerage": "Example Realty",
     "tiers": [{"name": "A", "min": 20}, {"name": "B", "min": 10, "max": 19}, {"name": "C", "min": 0, "max": 9}],
     "tier_label": "Your tiers",
     "owners": {"A": ["Name"], "*": ["Name One", "Name Two"]},
     "columns": {"SOURCE": {"units": "Closed Units 12 Mo"}},
     "kinds": {"SOURCE": "production"},
     "period": "11/01/2025 to 10/31/2026",
     "skip": ["SOURCE"]}

- `tiers`: the team's own tier rules, or the levels of its offer document (then `tier_label` is "Your offer document's levels"). Leave it out for default tiers.
- `owners`: names the user gave for a tier, or `"*"` for every tier; several names split a tier by recruit last name. Owners already assigned in a file are kept.
- `columns` and `kinds`: fixes after reading the Columns Used section. SOURCE is the label printed there (a file name, or "file name [sheet]"). `kinds` is "production" (its units are used for tiers) or "list" (its units are shown as not used, unless a production source column names an MLS report).
- `period`: only when the files don't state it and the user did.

```python
#!/usr/bin/env python3
# Recruiting Prep, list mode (Amplified Impact). Python 3 standard library, plus openpyxl for .xlsx files.
#
# Merges one or more recruit files (an MLS agent production report, BrokerMetrics, a Sisu recruits download,
# a GoHighLevel opportunities export, a Follow Up Boss export, a team tracker), de-duplicates them, removes the
# team's own agents, tiers on trailing-twelve-month production, finds why-now signals, suggests owners, sorts
# text consent, and writes:
#   organized-recruit-list.csv   one row per unique agent (no notes column, no free text from notes)
#   summary.md                   the counts, merges, tiers, signals, owners and consent, for drafting
#   summary.json                 the same, as data
# It never prints or writes the text of a notes column. It never writes to a CRM.
#
# Usage:
#   python3 recruits.py FILE [FILE ...] [--roster ROSTER] [--config config.json] --out DIR
#
# config.json is optional. Build it only from the user's files or message:
#   {"team_brokerage": "Lanternbrook Example Realty",
#    "tiers": [{"name": "A", "min": 20}, {"name": "B", "min": 10, "max": 19}, {"name": "C", "min": 4, "max": 9},
#              {"name": "D", "min": 0, "max": 3}],
#    "tier_label": "Your tiers",                       (or "Your offer document's levels")
#    "owners": {"A": ["Name"], "*": ["Name One", "Name Two"]},   (tier name or "*" for every tier)
#    "columns": {"SOURCE": {"units": "Closed Units 12 Mo"}},       (SOURCE as printed under Columns Used)
#    "kinds": {"SOURCE": "production"},                              ("production" or "list")
#    "period": "11/01/2025 to 10/31/2026",
#    "skip": ["SOURCE"]}

import argparse
import csv
import json
import math
import os
import re
import sys
from collections import Counter, defaultdict

csv.field_size_limit(min(sys.maxsize, 2**31 - 1))

FIELDS = {
    "mls_id": ["agent mls id", "mls id", "mls agent id", "agent id", "member mls id", "member id", "agent mls",
               "mls member id", "list agent mls id"],
    "name": ["agent name", "name", "contact name", "full name", "agent", "agent full name", "recruit name",
             "member name", "recruit"],
    "first": ["first name", "first", "agent first name"],
    "last": ["last name", "last", "agent last name"],
    "office": ["office name", "office", "brokerage", "current brokerage", "company", "firm", "current office",
               "brokerage name", "current company"],
    "email": ["agent email", "email", "email 1", "e mail", "email address", "primary email", "agent email address"],
    "phone": ["agent phone", "phone", "cell", "cell phone", "mobile", "mobile phone", "phone 1", "primary phone",
              "direct phone", "agent cell", "agent mobile"],
    "units": ["total sides", "total units", "closed units", "closed units 12 mo", "units", "sides", "closed sides",
              "total transactions", "transactions", "ttm units", "ttm sides", "units 12 mo", "sides 12 mo",
              "closed sides 12 mo", "total closed units", "total closed sides", "closed transactions 12 mo",
              "units ttm", "sides ttm"],
    "list_sides": ["list sides", "listing sides", "listing units", "list units", "listing sides 12 mo",
                   "list sides 12 mo", "listing transactions"],
    "buy_sides": ["sell sides", "buyer sides", "selling sides", "buy sides", "buyer units", "sell units",
                  "buyer sides 12 mo", "sell sides 12 mo", "selling units", "buyer transactions"],
    "volume": ["total volume", "closed volume", "volume", "total sales volume", "closed volume 12 mo", "ttm volume",
               "total dollar volume", "sales volume", "volume 12 mo"],
    "list_vol": ["list volume", "listing volume", "listing volume 12 mo"],
    "buy_vol": ["sell volume", "buyer volume", "selling volume", "buyer volume 12 mo"],
    "prior_units": ["prior 12 mo total sides", "prior 12 mo units", "prior units", "prior sides",
                    "prior 12 mo sides", "previous 12 months units", "previous 12 months sides", "prior period units",
                    "prior period sides", "prior 12 mo total units"],
    "prior_volume": ["prior 12 mo total volume", "prior volume", "prior 12 mo volume", "previous 12 months volume"],
    "approx_units": ["approx units", "approximate units", "est units", "estimated units", "self reported units",
                     "units approx", "approx sides", "approx deals", "approx transactions", "est sides"],
    "text": ["text ok", "sms consent", "text consent", "texting consent", "sms opt in", "text opt in", "ok to text",
             "consent to text", "sms ok", "text permission"],
    "dnd": ["dnd", "do not contact", "do not call", "dnc", "opted out", "opt out", "unsubscribed",
            "email opt out", "dnd all"],
    "stage": ["stage", "pipeline stage", "recruit stage", "recruiting stage"],
    "status": ["status", "opportunity status", "recruit status"],
    "owner": ["assigned to", "owner", "recruiter", "assigned user", "assigned agent", "assigned"],
    "last_touch": ["last touch", "last contacted", "last contact", "last activity", "updated on",
                   "last communication", "last touched"],
    "notes": ["notes", "recruiter notes", "comments", "background", "note", "description", "recruiting notes"],
    "prod_source": ["production source", "units source", "source of production", "production data source"],
    "tags": ["tags", "tag"],
    "role": ["role", "title", "position", "team role"],
}
SYN = {}
for field, names in FIELDS.items():
    for n in names:
        SYN.setdefault(n, field)

OPT_OUT = re.compile(r"\bstop\b|opted out|opt out|\bunsub|\bdnc\b|\bdnd\b|do not call|do not contact|^true$|^yes$|^y$|^1$", re.I)
OPT_OUT_TEXT = re.compile(r"\bstop\b|opted out|opt out|\bunsub|\bdnc\b|\bdnd\b|do not call|do not contact", re.I)
NOT_TTM = re.compile(r"estimat|approx|self.?report|guess|\btracker\b", re.I)
TTM_OK = re.compile(r"\bmls\b|production report|brokermetrics|terradatum|trendgraphix|sisu", re.I)
DATE = r"(\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2})"
PERIOD = re.compile(DATE + r"\s*(?:to|through|thru|-)\s*" + DATE, re.I)
TOTAL_ROW = re.compile(r"^(grand )?totals?\b|^summary$|^count$", re.I)

# Kinds of personal detail, matched by keyword only, so notes are never read into the conversation.
PERSONAL = {
    "family or familial status": r"\bkids?\b|child|\bson\b|daughter|\bbaby\b|\bmom\b|\bdad\b|mother|father|husband|"
                                 r"wife|spouse|family|grandkid|grandchild|parent|pregnan|due in|maternity|expecting",
    "marital status": r"divorc|married|marriage|newlywed|widow|separated|single (mom|dad|parent)|honeymoon|engaged|fianc",
    "age": r"\bage\b|\baged\b|years old|\bretir|\bold\b|\byoung\b|\b[2-9]\d\b(?! ?(units|sides|deals|closings|%))|"
           r"born in \d|boomer|millennial|gen z",
    "health or disability": r"chemo|cancer|surgery|\bsick|illness|health|disab|diagnos|therapy|injur|hospital|"
                            r"recover|medical",
    "religion": r"church|devout|religio|mosque|synagogue|temple|faith|christian|muslim|jewish|mormon|\blds\b|"
                r"catholic|baptist|pray",
    "national origin or citizenship": r"venezuel|mexic|cuba|puerto ric|haiti|india\b|china|chinese|korea|vietnam|"
                                      r"philippin|immigra|citizen|\bvisa\b|accent|native|origin|ethnic|"
                                      r"from (another|a different) country",
    "race": r"\brace\b|black|white|hispanic|latin[oax]|asian",
    "sexual orientation or gender identity": r"\bgay\b|lesbian|transgender|\btrans\b|queer|partner is a (man|woman)",
    "personal finances": r"needs? (the )?money|needs? (more )?income|\bdebt|bankrupt|\bbroke\b|financial|"
                         r"behind on|struggling|money (trouble|problems)|may need income",
}
PERSONAL_RE = {k: re.compile(v, re.I) for k, v in PERSONAL.items()}


def norm_header(h):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", str(h or "").lower())).strip()


def read_rows(path):
    """Yield (label, rows) for a CSV or for every sheet with data in a workbook."""
    base = os.path.basename(path)
    if path.lower().endswith((".xlsx", ".xlsm")):
        import openpyxl
        wb = openpyxl.load_workbook(path, data_only=True, read_only=True)
        sheets = wb.worksheets
        for ws in sheets:
            rows = [["" if v is None else str(v).strip() for v in r] for r in ws.iter_rows(values_only=True)]
            if sum(1 for r in rows if any(c for c in r)) < 2:
                continue
            yield (f"{base} [{ws.title}]" if len(sheets) > 1 else base), rows
    else:
        with open(path, encoding="utf-8-sig", newline="") as f:
            text = f.read()
        dialect = csv.excel_tab if text.count("\t") > text.count(",") else csv.excel
        yield base, [[c.strip() for c in r] for r in csv.reader(text.splitlines(), dialect)]


def find_header(rows):
    best, best_i = 0, None
    for i, r in enumerate(rows[:20]):
        score = sum(1 for c in r if norm_header(c) in SYN)
        if score > best:
            best, best_i = score, i
    return best_i if best >= 2 else None


def num(v):
    s = re.sub(r"[$,\s]", "", str(v or ""))
    if s in ("", "-", "N/A", "n/a", "None"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def name_parts(n):
    n = (n or "").strip()
    if "," in n:
        last, first = n.split(",", 1)
        n = f"{first.strip()} {last.strip()}"
    return re.sub(r"\s+", " ", n).strip()


def norm_name(n):
    n = name_parts(n).lower()
    n = re.sub(r"\b(jr|sr|ii|iii|iv)\b\.?", " ", n)
    n = re.sub(r"[^a-z ]", "", n)
    return re.sub(r"\s+", " ", n).strip()


def norm_email(e):
    e = (e or "").strip().lower()
    return e if "@" in e else ""


def norm_phone(p):
    d = re.sub(r"\D", "", p or "")
    return d[-10:] if len(d) >= 10 else ""


def office_tokens(o):
    o = re.sub(r"[^a-z0-9 ]", " ", (o or "").lower())
    return frozenset(t for t in o.split() if t not in ("llc", "inc", "the", "co", "corp", "pllc", "ltd"))


def same_office(a, b):
    ta, tb = office_tokens(a), office_tokens(b)
    return bool(ta) and bool(tb) and (ta <= tb or tb <= ta)


def fmt_phone(d):
    return f"({d[:3]}) {d[3:6]}-{d[6:]}" if d else ""


def money(v):
    return f"${v:,.0f}" if v is not None else ""


def consent_status(text, opted_out):
    v = (text or "").strip()
    if opted_out:
        return "Opted out"
    if not v or re.match(r"^(no|n|false|0|none|unknown)$", v, re.I):
        return "No consent on record"
    if re.match(r"^(y|yes|true|x|1|ok|checked)\.?$", v, re.I):
        return "Consent noted, no record named"
    if re.match(r"^(y|yes|true|ok)\b", v, re.I) and (re.search(DATE, v) or re.search(r"form|signed|opt.?in|record|e.?sign", v, re.I)):
        return "Documented consent"
    if re.match(r"^(y|yes|true|ok)\b", v, re.I):
        return "Consent noted, no record named"
    return "No consent on record"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--roster")
    ap.add_argument("--config")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    cfg = json.load(open(a.config)) if a.config else {}
    os.makedirs(a.out, exist_ok=True)
    team_brokerage = cfg.get("team_brokerage", "")
    md = []
    warn = []

    # ---- read every source -------------------------------------------------------------------------------
    rows, sources = [], []
    for path in a.files:
        for label, raw in read_rows(path):
            if label in cfg.get("skip", []):
                continue
            h = find_header(raw)
            if h is None:
                warn.append(f"{label}: no header row recognized; map its columns in config.json (columns).")
                continue
            header = raw[h]
            colmap = {}
            for j, c in enumerate(header):
                f = SYN.get(norm_header(c))
                if f and f not in colmap:
                    colmap[f] = j
            for f, hname in cfg.get("columns", {}).get(label, {}).items():
                idx = [j for j, c in enumerate(header) if c.strip() == hname]
                if idx:
                    colmap[f] = idx[0]
                else:
                    warn.append(f"{label}: config column '{hname}' not found")
            titles = [" ".join(c for c in r if c) for r in raw[:h] if any(r)]
            title_text = " | ".join(titles)
            m = PERIOD.search(title_text)
            period = cfg.get("period") or (f"{m.group(1)} to {m.group(2)}" if m else "")
            kind = cfg.get("kinds", {}).get(label)
            if not kind:
                has_units = "units" in colmap
                looks_prod = bool(re.search(r"production|mls|brokermetrics|proficiency|roster", title_text, re.I))
                kind = "production" if has_units and ("mls_id" in colmap or looks_prod) else "list"
            src = {"label": label, "kind": kind, "header_row": h + 1, "titles": titles, "period": period,
                   "columns": {f: header[j] for f, j in sorted(colmap.items(), key=lambda x: x[1])},
                   "unmapped": [c for j, c in enumerate(header) if c and j not in colmap.values()],
                   "rows": 0, "skipped_total_rows": 0, "notes_rows": 0}
            sources.append(src)
            for i, r in enumerate(raw[h + 1:], start=h + 2):
                if not any(r):
                    continue
                g = lambda f: (r[colmap[f]] if f in colmap and colmap[f] < len(r) else "")
                nm = g("name") or " ".join(x for x in (g("first"), g("last")) if x)
                if TOTAL_ROW.match(nm.strip()) or (not nm.strip() and not g("email") and not g("phone") and not g("mls_id")):
                    src["skipped_total_rows"] += 1
                    continue
                src["rows"] += 1
                notes = g("notes")
                if notes.strip():
                    src["notes_rows"] += 1
                prod_src = g("prod_source")
                units = num(g("units"))
                ttm_ok = kind == "production"
                if kind == "list" and units is not None and prod_src:
                    ttm_ok = bool(TTM_OK.search(prod_src)) and not NOT_TTM.search(prod_src)
                if kind == "production" and prod_src and NOT_TTM.search(prod_src):
                    ttm_ok = False
                row_period = period
                if not row_period and prod_src:
                    pm = PERIOD.search(prod_src)
                    row_period = f"{pm.group(1)} to {pm.group(2)}" if pm else ""
                opted = bool(OPT_OUT.search(g("dnd").strip())) if g("dnd").strip() else False
                opted = opted or bool(OPT_OUT_TEXT.search(" ".join([g("text"), g("tags"), g("stage"), g("status")])))
                full = name_parts(nm)
                rows.append({
                    "src": label, "row": i, "kind": kind, "name": full, "n_name": norm_name(nm),
                    "last": norm_name(nm).split(" ")[-1] if norm_name(nm) else "",
                    "mls_id": g("mls_id").strip(), "office": g("office").strip(), "email": norm_email(g("email")),
                    "phone": norm_phone(g("phone")), "units": units if ttm_ok else None,
                    "units_not_used": units if (units is not None and not ttm_ok) else None,
                    "units_not_used_source": prod_src or ("self-reported list" if kind == "list" else ""),
                    "list_sides": num(g("list_sides")) if ttm_ok else None,
                    "buy_sides": num(g("buy_sides")) if ttm_ok else None,
                    "volume": num(g("volume")) if ttm_ok else None, "prior_units": num(g("prior_units")) if ttm_ok else None,
                    "approx": g("approx_units").strip(), "text": g("text").strip(), "opted": opted,
                    "stage": g("stage").strip(), "status": g("status").strip(), "owner": g("owner").strip(),
                    "last_touch": g("last_touch").strip(), "period": row_period if ttm_ok else "",
                    "personal": sorted(k for k, rx in PERSONAL_RE.items() if notes and rx.search(notes)),
                    "has_notes": bool(notes.strip()),
                })
            del raw

    # ---- shared office lines: never used for matching -----------------------------------------------------------
    names_by = {"phone": defaultdict(set), "email": defaultdict(set)}
    for r in rows:
        for k in ("phone", "email"):
            if r[k] and r["n_name"]:
                names_by[k][r[k]].add(r["n_name"])
    shared = {k: {v for v, ns in d.items() if len(ns) > 3} for k, d in names_by.items()}

    # ---- merge (union-find) in rule order --------------------------------------------------------------------
    parent = list(range(len(rows)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    rule_counts = Counter()
    pair_rule = {}
    RULES = [
        ("Same MLS agent ID", lambda r: r["mls_id"] or None),
        ("Same email", lambda r: r["email"] if r["email"] and r["email"] not in shared["email"] else None),
        ("Same phone and last name", lambda r: (r["phone"], r["last"]) if r["phone"] and r["last"] and r["phone"] not in shared["phone"] else None),
        ("Same name and office", lambda r: (r["n_name"], office_tokens(r["office"])) if r["n_name"] and office_tokens(r["office"]) else None),
    ]
    for rule, key in RULES:
        seen = {}
        for i, r in enumerate(rows):
            k = key(r)
            if k is None:
                continue
            if k in seen:
                x, y = find(seen[k]), find(i)
                if x != y:
                    parent[y] = x
                    rule_counts[rule] += 1
                    pair_rule[i] = rule
            else:
                seen[k] = i
    groups = defaultdict(list)
    for i in range(len(rows)):
        groups[find(i)].append(i)

    # ---- roster ------------------------------------------------------------------------------------------------
    roster = []
    if a.roster:
        for label, raw in read_rows(a.roster):
            h = find_header(raw)
            if h is None:
                warn.append(f"Roster {label}: no header row recognized")
                continue
            header = raw[h]
            cm = {}
            for j, c in enumerate(header):
                f = SYN.get(norm_header(c))
                if f and f not in cm:
                    cm[f] = j
            for r in raw[h + 1:]:
                if not any(r):
                    continue
                g = lambda f: (r[cm[f]] if f in cm and cm[f] < len(r) else "")
                nm = g("name") or " ".join(x for x in (g("first"), g("last")) if x)
                if not nm.strip():
                    continue
                roster.append({"name": name_parts(nm), "n_name": norm_name(nm), "role": g("role").strip(),
                               "email": norm_email(g("email")), "phone": norm_phone(g("phone")),
                               "mls_id": g("mls_id").strip()})

    # ---- one record per group ----------------------------------------------------------------------------------
    recs = []
    for gid, idxs in groups.items():
        g = [rows[i] for i in idxs]
        prod = [r for r in g if r["units"] is not None]
        sigs, uniq, repeated = set(), [], 0
        for r in prod:
            s = (r["mls_id"], office_tokens(r["office"]), r["units"], r["volume"], r["list_sides"], r["buy_sides"], r["prior_units"])
            if s in sigs:
                repeated += 1
                continue
            sigs.add(s)
            uniq.append(r)
        flags = []
        units = ls = bs = vol = prior = None
        office_change = None
        by_office = defaultdict(list)
        for r in uniq:
            by_office[office_tokens(r["office"])].append(r)
        mls_offices = []
        for r in uniq:
            if r["office"] and not any(same_office(r["office"], o) for o in mls_offices):
                mls_offices.append(r["office"])
        if uniq:
            if len(by_office) > 1 and all(len(v) == 1 for v in by_office.values()):
                tot = lambda k: sum((r[k] or 0) for r in uniq)
                units, ls, bs, vol, prior = tot("units"), tot("list_sides"), tot("buy_sides"), tot("volume"), tot("prior_units")
                olds = [r["office"] for r in uniq if (r["prior_units"] or 0) > 0]
                news = [r["office"] for r in uniq if not (r["prior_units"] or 0)]
                office_change = {"offices": mls_offices, "from": olds[0] if len(olds) == 1 else None,
                                 "to": news[0] if len(news) == 1 else None}
            else:
                if len(uniq) > 1:
                    flags.append("Two production rows with different numbers at the same office: the larger row is used; check it")
                best = max(uniq, key=lambda r: r["units"])
                units, ls, bs, vol, prior = best["units"], best["list_sides"], best["buy_sides"], best["volume"], best["prior_units"]
        own_first = sorted(g, key=lambda r: 0 if r["kind"] == "list" else 1)
        emails, phones = [], []
        for r in own_first:
            if r["email"] and r["email"] not in emails:
                emails.append(r["email"])
            if r["phone"] and r["phone"] not in phones:
                phones.append(r["phone"])
        names = [r["name"] for r in sorted(g, key=lambda r: (0 if r["kind"] == "production" else 1, -len(r["name"])))]
        lst = [r for r in g if r["kind"] == "list"]
        lst_sorted = sorted(lst, key=lambda r: r["last_touch"] or "", reverse=True)
        list_offices = []
        for r in lst:
            if r["office"] and not any(same_office(r["office"], o) for o in list_offices):
                list_offices.append(r["office"])
        order = ["Opted out", "Documented consent", "Consent noted, no record named", "No consent on record"]
        consents = [consent_status(r["text"], r["opted"]) for r in g]
        text_status = min(consents, key=order.index)
        rules = sorted({pair_rule[i] for i in idxs if i in pair_rule})
        not_used = [(r["src"], r["row"], r["units_not_used"], r["units_not_used_source"]) for r in g if r["units_not_used"] is not None]
        rec = {
            "rows": [(r["src"], r["row"]) for r in g], "name": names[0], "n_name": norm_name(names[0]),
            "mls_ids": sorted({r["mls_id"] for r in g if r["mls_id"]}), "office_mls": mls_offices,
            "office_list": list_offices, "units": units, "list_sides": ls, "buy_sides": bs, "volume": vol,
            "prior_units": prior, "office_change": office_change, "repeated": repeated, "flags": flags,
            "period": next((r["period"] for r in uniq if r["period"]), ""),
            "emails": emails, "phones": phones, "text_status": text_status,
            "stage": lst_sorted[0]["stage"] if lst_sorted else "", "status": lst_sorted[0]["status"] if lst_sorted else "",
            "last_touch": lst_sorted[0]["last_touch"] if lst_sorted else "",
            "owner_in_file": next((r["owner"] for r in lst_sorted if r["owner"]), ""),
            "approx": "; ".join(sorted({r["approx"] for r in g if r["approx"]})),
            "not_used": not_used, "rules": rules,
            "personal": sorted({k for r in g for k in r["personal"]}),
        }
        rec["on_team"] = None
        for mbr in roster:
            if (mbr["mls_id"] and mbr["mls_id"] in rec["mls_ids"]) or (mbr["email"] and mbr["email"] in emails) or \
               (mbr["phone"] and mbr["phone"] in phones and mbr["phone"] not in shared["phone"]) or \
               (mbr["n_name"] == rec["n_name"] and team_brokerage and any(same_office(o, team_brokerage) for o in mls_offices + list_offices)):
                rec["on_team"] = f"{mbr['name']} ({mbr['role']})" if mbr["role"] else mbr["name"]
        rec["own_brokerage"] = bool(team_brokerage) and any(same_office(o, team_brokerage) for o in mls_offices + list_offices)
        recs.append(rec)

    # ---- possible duplicates: same name, not merged -------------------------------------------------------------
    by_name = defaultdict(list)
    for r in recs:
        by_name[r["n_name"]].append(r)
    for lst in by_name.values():
        if len(lst) > 1:
            for r in lst:
                r["dup_of"] = [x for x in lst if x is not r]

    # ---- tiers -------------------------------------------------------------------------------------------------
    team_tiers = cfg.get("tiers")
    tier_label = cfg.get("tier_label", "Your tiers") if team_tiers else "Default tiers"
    workable = [r for r in recs if not r["on_team"] and r["text_status"] != "Opted out"]
    cuts = None
    if team_tiers:
        tier_names = [t["name"] for t in team_tiers]

        def tier_of(u):
            for t in team_tiers:
                if u >= t.get("min", 0) and (t.get("max") is None or u <= t["max"]):
                    return t["name"]
            return "Outside your tier rules"
    else:
        vals = sorted(r["units"] for r in workable if r["units"] and r["units"] >= 1)
        n = len(vals)
        if n >= 10:
            pct = lambda p: int(vals[max(1, math.ceil(p / 100 * n)) - 1])
            cuts = {"producing_agents": n, "p90": pct(90), "p75": pct(75), "p50": pct(50),
                    "rank90": max(1, math.ceil(0.9 * n)), "rank75": max(1, math.ceil(0.75 * n)), "rank50": max(1, math.ceil(0.5 * n))}
            tier_names = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"]

            def tier_of(u):
                if u < 1:
                    return "No closings in period"
                return "Tier 1" if u >= cuts["p90"] else "Tier 2" if u >= cuts["p75"] else "Tier 3" if u >= cuts["p50"] else "Tier 4"
        else:
            tier_names = ["Ranked (list too small for tiers)"]
            warn.append(f"Only {n} producing agents: too few for default tiers, so they are ranked by units instead.")

            def tier_of(u):
                return "Ranked (list too small for tiers)" if u >= 1 else "No closings in period"
    for r in recs:
        if r["on_team"]:
            r["tier"] = "On your team (removed)"
        elif r["text_status"] == "Opted out":
            r["tier"] = "Do not contact"
        elif r["units"] is None:
            r["tier"] = "Not tiered: no production data"
        else:
            r["tier"] = tier_of(r["units"])
    tier_order = tier_names + ["No closings in period", "Outside your tier rules", "Not tiered: no production data",
                               "Do not contact", "On your team (removed)"]

    # ---- why-now signals ---------------------------------------------------------------------------------------
    for r in recs:
        s = []
        oc = r["office_change"]
        if oc:
            t = f"Listed under two offices in the production report ({' and '.join(oc['offices'])})"
            if oc["from"] and oc["to"]:
                t += f"; all prior-period sides are under {oc['from']}, so the move looks like {oc['from']} to {oc['to']}"
            s.append(t)
        if r["office_list"] and r["office_mls"]:
            diff = [o for o in r["office_list"] if not any(same_office(o, m) for m in r["office_mls"])]
            if diff:
                s.append(f"Your list says {diff[0]} (last touch {r['last_touch'] or 'not dated'}); the production report shows {', '.join(r['office_mls'])}")
        u, p = r["units"], r["prior_units"]
        if u is not None and p is not None:
            if p == 0 and u > 0:
                s.append(f"New production: {u:.0f} this period, 0 in the prior 12 months")
            elif p > 0 and u - p >= 3 and (u - p) / p >= 0.25:
                s.append(f"Up: {u:.0f} against {p:.0f} in the prior 12 months")
            elif p > 0 and p - u >= 3 and (p - u) / p >= 0.25:
                s.append(f"Down: {u:.0f} against {p:.0f} in the prior 12 months")
        r["signals"] = s
        r["mix"] = ""
        if u and u >= 5 and r["list_sides"] is not None and r["buy_sides"] is not None:
            share = r["list_sides"] / u
            r["mix"] = "Listing heavy" if share >= 0.6 else "Buyer heavy" if share <= 0.4 else "Balanced"

    # ---- owners ------------------------------------------------------------------------------------------------
    cfg_owners = cfg.get("owners", {})
    by_role = defaultdict(list)
    for mbr in roster:
        role = mbr["role"].lower()
        if re.search(r"team lead|leader|owner|rainmaker|principal|managing", role):
            by_role["leader"].append(mbr["name"])
        elif re.search(r"recruit", role):
            by_role["recruiter"].append(mbr["name"])
        elif re.search(r"appointment|\bisa\b|inside sales", role):
            by_role["setter"].append(mbr["name"])
    lastname = lambda nm: nm.split(" ")[-1].lower() if nm else ""

    def pool_for(tier):
        if tier in cfg_owners:
            return cfg_owners[tier], "your assignment"
        if "*" in cfg_owners:
            return cfg_owners["*"], "your assignment"
        if not roster:
            return [], ""
        rank = tier_names.index(tier) if tier in tier_names else 99
        if rank == 0:
            prefs = ["leader", "recruiter", "setter"]
        elif rank == 1:
            prefs = ["recruiter", "leader", "setter"]
        else:
            prefs = ["setter", "recruiter", "leader"]
        for p in prefs:
            if by_role[p]:
                return sorted(by_role[p], key=lastname), "suggested from roster roles"
        return [], ""

    owner_basis = {}
    for t in tier_order:
        members = sorted([r for r in recs if r["tier"] == t and not r["owner_in_file"]], key=lambda r: (lastname(r["name"]), r["name"]))
        pool, basis = pool_for(t)
        owner_basis[t] = (pool, basis)
        for k, r in enumerate(members):
            if t in ("On your team (removed)", "Do not contact"):
                r["owner"] = ""
            elif pool:
                size = math.ceil(len(members) / len(pool))
                r["owner"] = pool[min(k // size, len(pool) - 1)]
            else:
                r["owner"] = "[Owner]"
    for r in recs:
        if r["owner_in_file"]:
            r["owner"] = r["owner_in_file"] if r["tier"] not in ("On your team (removed)", "Do not contact") else ""
            r["owner_kept"] = True

    # ---- order, IDs, CSV ---------------------------------------------------------------------------------------
    recs.sort(key=lambda r: (tier_order.index(r["tier"]) if r["tier"] in tier_order else 98,
                             -(r["units"] if r["units"] is not None else -1), r["name"]))
    for k, r in enumerate(recs, start=1):
        r["rid"] = f"R{k:03d}"
    cols = ["Recruit ID", "Name", "Office (Production Report)", "Brokerage (Your List)", "Sources", "Merge Rule",
            "TTM Units", "TTM Volume", "Listing Sides", "Buyer Sides", "Prior 12 Mo Units", "Period", "Outreach Tier",
            "Tier Basis", "Why Now", "Side Mix", "Suggested Owner", "Email", "Other Emails", "Phone", "Other Phones",
            "Text Status", "Contact Status", "Stage (Your List)", "Last Touch (Your List)", "Possible Duplicate Of",
            "Units Not Used (Source)", "Flags"]
    i0 = lambda v: "" if v is None else f"{v:.0f}"
    with open(os.path.join(a.out, "organized-recruit-list.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in recs:
            if r["on_team"]:
                continue
            notused = [x for x in [r["approx"] and f"{r['approx']} (self-reported)"] if x]
            notused += [f"{u:.0f} ({s})" for _, _, u, s in r["not_used"]]
            flags = list(r["flags"])
            if r["own_brokerage"]:
                flags.append("At your brokerage: check before any outreach")
            w.writerow([
                r["rid"], r["name"], "; ".join(r["office_mls"]), "; ".join(r["office_list"]),
                "; ".join(f"{s} row {n}" for s, n in r["rows"]), "; ".join(r["rules"]) or "Single row",
                i0(r["units"]), i0(r["volume"]), i0(r["list_sides"]), i0(r["buy_sides"]), i0(r["prior_units"]),
                r["period"], r["tier"], tier_label if r["units"] is not None and r["tier"] not in ("Do not contact",) else "",
                "; ".join(r["signals"]), r["mix"], r["owner"] + (" (already assigned)" if r.get("owner_kept") and r["owner"] else ""),
                r["emails"][0] if r["emails"] else "", "; ".join(r["emails"][1:]),
                fmt_phone(r["phones"][0]) if r["phones"] else "", "; ".join(fmt_phone(p) for p in r["phones"][1:]),
                r["text_status"], "Do not contact" if r["text_status"] == "Opted out" else ("Hold: at your brokerage" if r["own_brokerage"] else "OK to email"),
                r["stage"], r["last_touch"], "; ".join(x["rid"] for x in r.get("dup_of", [])), "; ".join(notused), "; ".join(flags),
            ])

    # ---- summary -----------------------------------------------------------------------------------------------
    S = {"sources": sources, "warnings": warn, "rows_in": sum(s["rows"] for s in sources), "unique": len(recs),
         "merges": dict(rule_counts), "shared_lines": {k: len(v) for k, v in shared.items()}, "cuts": cuts,
         "tier_label": tier_label, "tiers": {}, "signals": [], "owners": {}, "consent": {}}
    md.append("# Recruit List Summary\n")
    md.append("## Columns Used\n")
    for s in sources:
        md.append(f"**{s['label']}**: {s['kind']} file, header on row {s['header_row']}, {s['rows']} rows read"
                  + (f", {s['skipped_total_rows']} blank or total rows skipped" if s["skipped_total_rows"] else "")
                  + (f". Period: {s['period']}" if s["period"] else ". Period: not stated in the file"))
        if s["titles"]:
            md.append(f"- Title lines: {' / '.join(s['titles'])}")
        md.append("- Mapped: " + "; ".join(f"{k} = \"{v}\"" for k, v in s["columns"].items()))
        if s["unmapped"]:
            md.append("- Not used: " + "; ".join(f"\"{c}\"" for c in s["unmapped"]))
        md.append(f"- Rows with notes: {s['notes_rows']} (notes are never read into tiers, signals, drafts or the CSV)")
        md.append("")
    for x in warn:
        md.append(f"- WARNING: {x}")
    md.append("## Merge\n")
    md.append(f"Rows read: {S['rows_in']}. Merges: {sum(rule_counts.values())}. Unique agents: {len(recs)}.\n")
    md.append("| Merge rule | Merges |\n|---|---|")
    for rule, _ in RULES:
        md.append(f"| {rule} | {rule_counts.get(rule, 0)} |")
    if shared["phone"] or shared["email"]:
        md.append(f"\nShared lines not used for matching (on more than 3 people's rows): {len(shared['phone'])} phones, {len(shared['email'])} emails.")
    rep = [r for r in recs if r["repeated"]]
    spl = [r for r in recs if r["office_change"]]
    flg = [r for r in recs if r["flags"]]
    nu = [r for r in recs if r["not_used"]]
    md.append("")
    for r in rep:
        md.append(f"- Repeated production row kept once: {r['rid']} {r['name']} ({', '.join(r['mls_ids'])})")
    for r in spl:
        md.append(f"- Two offices in the production report, rows added together: {r['rid']} {r['name']} ({', '.join(r['mls_ids'])}), {r['units']:.0f} units across {' and '.join(r['office_change']['offices'])}")
    for r in flg:
        md.append(f"- {r['rid']} {r['name']}: {'; '.join(r['flags'])}")
    for r in nu:
        md.append(f"- Units not used for tiers: {r['rid']} {r['name']}: " + "; ".join(f"{u:.0f} from {s} row {n} ({src or 'no source named'})" for s, n, u, src in r["not_used"]))
    dups = [r for r in recs if r.get("dup_of")]
    if dups:
        md.append("\n**Possible duplicates (same name, no shared ID, email or phone; not merged):**")
        done = set()
        for r in dups:
            key = r["n_name"]
            if key in done:
                continue
            done.add(key)
            grp = [r] + r["dup_of"]
            md.append("- " + " / ".join(f"{x['rid']} {x['name']} ({', '.join(x['office_mls'] or x['office_list']) or 'no office'}; {', '.join(f'{s} row {n}' for s, n in x['rows'])})" for x in grp))
    team = [r for r in recs if r["on_team"]]
    if roster:
        md.append(f"\n**On your team, removed ({len(team)}):** " + ("; ".join(f"{r['on_team']}" for r in team) or "none found in these files"))
    opted = [r for r in recs if r["tier"] == "Do not contact"]
    md.append(f"\n**Opted out, kept in the CSV as Do not contact ({len(opted)}):** " + ("; ".join(f"{r['rid']} {r['name']}" for r in opted) or "none"))
    own = [r for r in recs if r["own_brokerage"] and not r["on_team"]]
    if own:
        md.append(f"\n**At your brokerage ({team_brokerage}) and not on your roster ({len(own)}), held from drafts:** " + "; ".join(f"{r['rid']} {r['name']}" for r in own))
    S.update({"repeated": [(r["rid"], r["name"], r["mls_ids"]) for r in rep],
              "office_splits": [(r["rid"], r["name"], r["mls_ids"], r["office_change"], r["units"]) for r in spl],
              "flags": [(r["rid"], r["name"], r["flags"]) for r in flg],
              "units_not_used": [(r["rid"], r["name"], r["not_used"]) for r in nu],
              "possible_duplicates": [(r["rid"], r["name"], [x["rid"] for x in r["dup_of"]]) for r in dups],
              "on_team": [r["on_team"] for r in team], "opted_out": [(r["rid"], r["name"]) for r in opted],
              "own_brokerage": [(r["rid"], r["name"]) for r in own]})

    md.append("\n## Tiers\n")
    if cuts:
        md.append(f"{tier_label} from this list's spread (nearest rank among {cuts['producing_agents']} agents with at least 1 unit, "
                  f"after removing your team and opted-out contacts): 90th percentile = rank {cuts['rank90']} = {cuts['p90']} units; "
                  f"75th = rank {cuts['rank75']} = {cuts['p75']}; 50th = rank {cuts['rank50']} = {cuts['p50']}.")
        md.append(f"Tier 1: {cuts['p90']} or more. Tier 2: {cuts['p75']} to {cuts['p90'] - 1}. Tier 3: {cuts['p50']} to {cuts['p75'] - 1}. Tier 4: 1 to {cuts['p50'] - 1}.\n")
    elif team_tiers:
        md.append(f"{tier_label}: " + "; ".join(f"{t['name']} = {t.get('min', 0)}" + (f" to {t['max']}" if t.get("max") is not None else " or more") for t in team_tiers) + "\n")
    md.append("| Tier | Agents | Units | Range | Volume | Listing / Buyer sides |\n|---|---|---|---|---|---|")
    for t in tier_order:
        m = [r for r in recs if r["tier"] == t]
        if not m:
            continue
        us = [r["units"] for r in m if r["units"] is not None]
        vol = sum(r["volume"] or 0 for r in m)
        l_ = sum(r["list_sides"] or 0 for r in m)
        b_ = sum(r["buy_sides"] or 0 for r in m)
        S["tiers"][t] = {"count": len(m), "units": sum(us) if us else None, "range": [min(us), max(us)] if us else None,
                         "volume": vol, "list": l_, "buy": b_,
                         "members": [(r["rid"], r["name"], r["units"], r["volume"], r["office_mls"] or r["office_list"], r["owner"], r["text_status"]) for r in m]}
        if t in ("Do not contact", "On your team (removed)") or not us:
            md.append(f"| {t} | {len(m)} | | | | |")
        elif sum(us) == 0:
            md.append(f"| {t} | {len(m)} | 0 | | | |")
        else:
            has_v = any(r["volume"] is not None for r in m)
            has_s = any(r["list_sides"] is not None for r in m)
            md.append(f"| {t} | {len(m)} | {sum(us):.0f} | {min(us):.0f} to {max(us):.0f} | {money(vol) if has_v else 'not in file'} | "
                      + (f"{l_:.0f} / {b_:.0f} |" if has_s else "not in file |"))
    for t in tier_names[:2]:
        m = [r for r in recs if r["tier"] == t]
        if not m:
            continue
        md.append(f"\n**{t}**\n\n| ID | Name | Office | Units | Volume | Side mix | Owner | Text status |\n|---|---|---|---|---|---|---|---|")
        for r in m:
            md.append(f"| {r['rid']} | {r['name']} | {', '.join(r['office_mls'] or r['office_list'])} | {i0(r['units'])} | {money(r['volume'])} | {r['mix']} | {r['owner']} | {r['text_status']} |")

    md.append("\n## Why Now\n\nDefault thresholds: up or down means a change of 25% or more and at least 3 units against the prior 12 months.\n")
    md.append("| ID | Name | Tier | Signal |\n|---|---|---|---|")
    for r in recs:
        if r["signals"] and not r["on_team"]:
            S["signals"].append((r["rid"], r["name"], r["tier"], r["signals"]))
            md.append(f"| {r['rid']} | {r['name']} | {r['tier']} | {'; '.join(r['signals'])} |")

    md.append("\n## Owners\n")
    md.append("| Tier | Agents | Owner | Basis |\n|---|---|---|---|")
    for t in tier_order:
        m = [r for r in recs if r["tier"] == t]
        if not m or t in ("On your team (removed)", "Do not contact"):
            continue
        c = Counter(r["owner"] for r in m)
        kept = sum(1 for r in m if r.get("owner_kept"))
        pool, basis = owner_basis.get(t, ([], ""))
        b = "already assigned in your file" if kept == len(m) else (basis or "no roster")
        if kept and kept < len(m):
            b += f"; {kept} already assigned in your file"
        S["owners"][t] = dict(c)
        md.append(f"| {t} | {len(m)} | {', '.join(f'{k} ({v})' for k, v in c.items())} | {b} |")

    md.append("\n## Text Consent\n")
    md.append("| Tier | Documented consent | Consent noted, no record named | No consent on record |\n|---|---|---|---|")
    for t in tier_order:
        m = [r for r in recs if r["tier"] == t and t not in ("On your team (removed)", "Do not contact")]
        if not m:
            continue
        doc = [r for r in m if r["text_status"] == "Documented consent" and not r["own_brokerage"]]
        noted = [r for r in m if r["text_status"] == "Consent noted, no record named"]
        none_ = [r for r in m if r["text_status"] == "No consent on record"]
        S["consent"][t] = {"documented": [(r["rid"], r["name"]) for r in doc], "noted": [(r["rid"], r["name"]) for r in noted], "none": len(none_)}
        md.append(f"| {t} | {len(doc)}: {', '.join(r['rid'] + ' ' + r['name'] for r in doc) or 'none'} | "
                  f"{len(noted)}: {', '.join(r['rid'] + ' ' + r['name'] for r in noted) or 'none'} | {len(none_)} |")

    md.append("\n## Notes Column\n")
    pr = [r for r in rows if r["personal"]]
    kinds = Counter(k for r in pr for k in r["personal"])
    notes_total = sum(s["notes_rows"] for s in sources)
    pa = [r for r in recs if r["personal"]]
    md.append(f"Rows with notes: {notes_total}. Rows whose notes match personal-detail keywords: {len(pr)}, for {len(pa)} agent{'s' if len(pa) != 1 else ''}"
              + (f" (kinds: {', '.join(f'{k} {v}' for k, v in sorted(kinds.items()))})" if pr else "")
              + ". Keyword matching can miss some, so the leader should review the notes column in the source file. Note text is never shown here.")
    S["notes"] = {"rows_with_notes": notes_total, "personal_rows": len(pr), "personal_agents": len(pa), "kinds": dict(kinds)}
    if any(r["approx"] for r in recs):
        md.append(f"\nSelf-reported units shown in the CSV but never used for tiers: {sum(1 for r in recs if r['approx'])} agents.")
    out = "\n".join(md) + "\n"
    open(os.path.join(a.out, "summary.md"), "w", encoding="utf-8").write(out)
    json.dump(S, open(os.path.join(a.out, "summary.json"), "w"), indent=1, default=str)
    print(out)


if __name__ == "__main__":
    main()
```
