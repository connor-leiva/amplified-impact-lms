"""What the skill's Run step should decide for each case, row by row, worked out from the files with the rules in
references/expired-fsbo-guide.md. The runs used it as the code step (read, decide, sort, price change); grading
compares each output with it.

python3 skills/expired-fsbo-outreach/evals/make/expected_rows.py <case-id>     (practice, eval-1-..., eval-2-...)

Prints, for each list: the solicitable rows in sort order with their channels and why, then the held-out and
skipped rows with the reason. Writes nothing.
"""
import csv
import datetime as dt
import re
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
TODAY = dt.date(2026, 11, 10)

CASES = {
    "practice": {
        "files": ["practice/PRACTICE MLS expired export, Salt Lake County, 2026-11-10.csv",
                  "practice/PRACTICE FSBO leads export, Salt Lake County, 2026-11-10.csv"],
        "agent_scrubbed": False,
    },
    "eval-1-expired-export-scrubbed": {
        "files": ["evals/files/eval-1-expired-export-scrubbed/Expireds export 11-10-2026.csv"],
        "agent_scrubbed": True,
    },
    "eval-2-fsbo-list-no-dnc": {
        "files": ["evals/files/eval-2-fsbo-list-no-dnc/FSBO list - Sheet1.csv"],
        "agent_scrubbed": False,
    },
}

NOT_DNC = {"clean", "n", "no", "not dnc", "not on dnc"}
IS_DNC = {"dnc", "y", "yes", "on dnc"}
NO_AGENTS = re.compile(r"no agents|no realtors|no brokers|no solicit|principals only|agents need not", re.I)
LISTED = re.compile(r"listed on the mls|flat fee|limited service|listed with", re.I)
HELD_STATUS = {
    "withdrawn": "Withdrawn: may still be under a listing agreement (Article 16, SOP 16-4)",
    "canceled": "Canceled: held until you confirm no agreement is in effect",
    "cancelled": "Canceled: held until you confirm no agreement is in effect",
    "temporarily off market": "Temporarily Off Market: may still be under a listing agreement",
    "active - no show": "Active - No Show: a listing agreement is in effect",
    "off market": "Off Market: may still be under a listing agreement",
    "active": "Active: listed now",
}


def read(path):
    lines = (SKILL / path).read_text(encoding="utf-8").splitlines()
    if lines and lines[0].startswith("PRACTICE FILE"):
        lines = lines[1:]
    return list(csv.DictReader(lines))


def pick(row, *names):
    for n in names:
        if n in row and row[n] is not None:
            return row[n].strip()
    return ""


def num(s):
    s = re.sub(r"[$,]", "", s or "")
    return int(float(s)) if s else None


def date(s):
    s = (s or "").strip()
    if not s:
        return None
    if "/" in s:
        m, d, y = s.split("/")
        return dt.date(int(y), int(m), int(d))
    return dt.date.fromisoformat(s)


def call_decision(row, scrubbed):
    phone = pick(row, "Owner Phone", "Phone")
    dnc = pick(row, "Phone DNC Status", "On DNC").lower()
    has_col = any(k in row for k in ("Phone DNC Status", "On DNC"))
    checked = date(pick(row, "DNC Checked"))
    if not phone:
        return False, "no phone"
    if dnc in IS_DNC:
        return False, "marked DNC"
    if not has_col and not scrubbed:
        return False, "no DNC information in the list"
    if dnc in NOT_DNC:
        if checked and (TODAY - checked).days > 31:
            return False, f"DNC check {(TODAY - checked).days} days old: rescrub first"
        return True, "marked not on DNC" + (" (agent scrubbed today)" if scrubbed else f", checked {checked}")
    return False, "DNC status blank"


def main():
    case = CASES[sys.argv[1]]
    for path in case["files"]:
        rows = read(path)
        print(f"== {path} ({len(rows)} rows)")
        active_addresses = {pick(r, "Address") for r in rows if pick(r, "Status").lower() in ("active", "coming soon", "under contract")}
        sol, held = [], []
        for i, r in enumerate(rows, 1):
            status = pick(r, "Status", "Lead Type") or ("FSBO" if "Ad Says" in r else "")
            addr = pick(r, "Address")
            ad = pick(r, "Ad Text", "Ad Says")
            if status.upper() == "FSBO":
                if NO_AGENTS.search(ad):
                    held.append((i, addr, "SKIPPED: no agents: " + NO_AGENTS.search(ad).group(0)))
                    continue
                if LISTED.search(ad):
                    held.append((i, addr, "HELD OUT: ad says listed with a brokerage"))
                    continue
                kind = "FSBO"
                key = date(pick(r, "Lead Date", "Date Found"))
            elif status.lower() == "expired":
                exp = date(pick(r, "Expiration Date"))
                if exp and exp > TODAY:
                    held.append((i, addr, f"HELD OUT: Expired but expiration date {exp} is after today"))
                    continue
                if addr in active_addresses:
                    held.append((i, addr, "HELD OUT: relisted (same address is Active)"))
                    continue
                kind = "EXPIRED"
                key = exp
            else:
                held.append((i, addr, "HELD OUT: " + HELD_STATUS.get(status.lower(), status or "blank status")))
                continue
            call, why = call_decision(r, case["agent_scrubbed"])
            email = pick(r, "Email")
            prop = f"{addr}, {pick(r, 'City')}"
            mailing = pick(r, "Owner Mailing Address (Tax Record)", "Owner Mailing (Tax)")
            knock = kind == "FSBO" or not mailing or mailing.startswith(addr)
            dom = num(pick(r, "Days on Market", "CDOM"))
            price, orig = num(pick(r, "List Price", "Price", "Asking", "Asking Price")), num(pick(r, "Original List Price", "Original Price"))
            sol.append(dict(row=i, kind=kind, addr=prop, owner=pick(r, "Owner Name (Tax Record)", "Owner (Tax)", "Owner Name", "Owner"),
                            key=key, dom=dom, price=price, orig=orig, change=(orig - price) if (orig and price) else None,
                            call=call, why=why, email=bool(email), knock=knock))
        exp_rows = sorted([s for s in sol if s["kind"] == "EXPIRED"], key=lambda s: (-s["key"].toordinal(), -(s["dom"] or 0)))
        fsbo_rows = sorted([s for s in sol if s["kind"] == "FSBO"], key=lambda s: (s["key"].toordinal(), s["price"] or 0))
        for s in exp_rows + fsbo_rows:
            old = s["kind"] == "EXPIRED" and (TODAY - s["key"]).days > 30
            ch = ["EMAIL" if s["email"] else "LETTER"] + (["CALL"] if s["call"] else []) + (["KNOCK"] if s["knock"] else [])
            print(f"  row {s['row']:>2} {s['kind']:<7} {s['key']} ({s['key'].strftime('%A')}) {s['addr']:<42} {s['owner']:<30} "
                  f"DOM {s['dom']} price {s['orig']} to {s['price']} change {s['change']} | {' '.join(ch)} | call: {s['why']}"
                  + ("  [over 30 days: recheck relist]" if old else ""))
        for i, a, why in held:
            print(f"  row {i:>2} {a:<42} {why}")


if __name__ == "__main__":
    main()
